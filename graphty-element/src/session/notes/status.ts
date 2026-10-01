/**
 * @file What a note's targets and cites point at now (design/notes/notes-design.md section 4),
 * worked out when read and never stored, so a target that comes back is found again with nothing
 * to repair. Synchronous: it reads the resident snapshot, the visibility masks, the kept sets and
 * the runs, and resolves nothing.
 *
 * Node ids compare by their text (`11` and `"11"` name the same node), except that when the graph
 * holds both, a target binds to the one of its own type. Edges bind by their stable identity
 * through the same binding the kept sets use.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeMember, NodeId, ResultId, SetId } from "../../catalog/types";
import { pairsOrdered } from "../../data/edgeIdentity";
import { bindEdgeMembers } from "../sets/resolve";
import type { Note, NoteCiteStatus, NoteStatus, NoteTarget, NoteTargetStatus } from "./types";

/** What a status reads of the session. */
export interface StatusSources {
    /** The resident snapshot. */
    snapshot(): GraphSnapshot;
    /** Whether a node row and an edge row are visible. */
    readonly visible: {
        node(row: number): boolean;
        edge(row: number): boolean;
    };
    /** A kept set's name, or undefined when the session holds no such set. */
    set(id: SetId): { readonly name: string } | undefined;
    /** A result: undefined when gone; else the token of its current finished run, if any. */
    result(id: ResultId): { readonly execution: string | undefined } | undefined;
}

/**
 * The number a node id's text spells exactly, so `"11"` finds node `11`.
 * @param text - The id.
 * @returns The number, or the text itself when it spells no number exactly.
 */
function numberOf(text: string): NodeId {
    const number = Number(text);
    return text !== "" && String(number) === text ? number : text;
}

/**
 * The row of a node, comparing ids by their text and preferring the id's own type.
 * @param snapshot - The snapshot.
 * @param id - The node id.
 * @returns The row, or -1 when the graph holds no such node.
 */
export function nodeRowOf(snapshot: GraphSnapshot, id: NodeId): number {
    let row = snapshot.ids.indexOf(id);
    if (row === INVALID_INDEX) {
        row = snapshot.ids.indexOf(typeof id === "number" ? String(id) : numberOf(id));
    }

    return row === INVALID_INDEX ? -1 : row;
}

/**
 * The rows a list of edges binds in a snapshot: their ends matched as node targets are, then
 * bound by stable identity.
 * @param snapshot - The snapshot.
 * @param members - The edges.
 * @returns One entry per edge: its row, or a negative number when it binds no single edge.
 */
export function edgeRowsOf(snapshot: GraphSnapshot, members: readonly EdgeMember[]): Int32Array {
    const end = (id: NodeId): NodeId => {
        const row = nodeRowOf(snapshot, id);
        return row < 0 ? id : snapshot.ids.idOf(row);
    };
    const bound = members.map((member) => ({ ...member, source: end(member.source), target: end(member.target) }));
    return bindEdgeMembers({}, bound, { snapshot });
}

/**
 * The text to show for a target. Display text, never markup.
 * @param target - The target.
 * @param snapshot - The snapshot, for whether edges are directed.
 * @param set - Reads a kept set's name.
 * @returns The label.
 */
function labelOf(target: NoteTarget, snapshot: GraphSnapshot, set: StatusSources["set"]): string {
    if ("graph" in target) {
        return "Graph";
    }

    if ("node" in target) {
        return String(target.node);
    }

    if ("edge" in target) {
        const arrow = pairsOrdered(snapshot) ? " -> " : " -- ";
        return `${String(target.edge.source)}${arrow}${String(target.edge.target)}`;
    }

    if ("set" in target) {
        return target.name ?? set(target.set)?.name ?? target.set;
    }

    if ("result" in target) {
        return target.result;
    }

    if ("item" in target) {
        return `${target.item.result}: ${target.item.key.field} ${String(target.item.key.value)}`;
    }

    return `Unsupported target (${Object.keys(target as object).join(", ")})`;
}

/**
 * What a note's targets and cites point at now.
 * @param note - The note.
 * @param sources - What the status reads.
 * @param source - Where the note came from, when it was opened from a file.
 * @returns The status, frozen.
 */
export function statusOf(note: Note, sources: StatusSources, source?: NoteStatus["source"]): NoteStatus {
    const snapshot = sources.snapshot();
    const edges = note.targets.flatMap((target) => ("edge" in target ? [target.edge] : []));
    const edgeRows = edgeRowsOf(snapshot, edges);
    let nextEdge = 0;
    const shown = (row: number, visible: (row: number) => boolean): NoteTargetStatus["state"] => {
        if (row < 0) {
            return "missing";
        }

        return visible(row) ? "present" : "filtered";
    };
    // Whether a result's current run is the one a note pinned, an earlier one, or the result is gone.
    const pinned = (result: ResultId, run: string): "same" | "earlier-run" | "missing" => {
        const held = sources.result(result);
        if (held === undefined) {
            return "missing";
        }

        return held.execution === run ? "same" : "earlier-run";
    };

    const targets = note.targets.map((target): NoteTargetStatus => {
        const label = labelOf(target, snapshot, (id) => sources.set(id));
        let state: NoteTargetStatus["state"];
        if ("graph" in target) {
            state = "present";
        } else if ("node" in target) {
            state = shown(nodeRowOf(snapshot, target.node), (row) => sources.visible.node(row));
        } else if ("edge" in target) {
            state = shown(edgeRows[nextEdge++], (row) => sources.visible.edge(row));
        } else if ("set" in target) {
            state = sources.set(target.set) === undefined ? "missing" : "present";
        } else if ("result" in target) {
            state = sources.result(target.result) === undefined ? "missing" : "present";
        } else if ("item" in target) {
            const run = pinned(target.item.result, target.item.run ?? "");
            state = run === "same" ? "present" : run;
        } else {
            state = "unsupported";
        }

        return Object.freeze({ state, label });
    });

    const cites = (note.cites ?? []).map((cite): NoteCiteStatus => {
        const run = pinned(cite.result, cite.run);
        return Object.freeze({ state: run === "same" ? "current" : run, label: cite.result });
    });

    return Object.freeze({
        targets: Object.freeze(targets),
        cites: Object.freeze(cites),
        ...(source === undefined ? {} : { source }),
    });
}
