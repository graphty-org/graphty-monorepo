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
import type { NoteEntry } from "../project/state";
import { bindEdgeMembers } from "../sets/resolve";
import { isSessionEdgeId, namesForeignSessionEdge, supportedCite, supportedTarget } from "./document";
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
 * Notes as they are saved (design/documents/notes.md, "Targets" rule 2). An edge target naming an
 * edge the session added by the id graphty-element made up for it is written as that edge's
 * position among the edges now between its two ends, counted in row order, which is how a load of
 * this graph counts it: so the note finds its edge once the graph is reopened. An edge that is gone
 * has no position and keeps its made-up id, which reads missing once opened. Every other note is
 * returned as it is held.
 * @param notes - The notes.
 * @param snapshot - The snapshot.
 * @returns The notes to write, in the same order.
 */
export function savedForms(notes: readonly Note[], snapshot: GraphSnapshot): Note[] {
    const minted: { readonly note: number; readonly target: number; readonly edge: EdgeMember }[] = [];
    notes.forEach((note, n) => {
        note.targets.forEach((target, t) => {
            if (
                "edge" in target &&
                supportedTarget(target) &&
                !namesForeignSessionEdge(target) &&
                isSessionEdgeId(target.edge.id)
            ) {
                minted.push({ note: n, target: t, edge: target.edge });
            }
        });
    });
    if (minted.length === 0) {
        return [...notes];
    }

    const rows = edgeRowsOf(
        snapshot,
        minted.map((entry) => entry.edge),
    );
    const ordered = pairsOrdered(snapshot);
    const pairOf = (row: number): string => {
        const s = snapshot.edgeSource(row);
        const t = snapshot.edgeTarget(row);
        return ordered || s <= t ? `${String(s)},${String(t)}` : `${String(t)},${String(s)}`;
    };
    // One pass over the edges for every pair a saved note names; rows ascend, so each list is in
    // row order.
    const peers = new Map<string, number[]>();
    for (const row of rows) {
        if (row >= 0) {
            peers.set(pairOf(row), []);
        }
    }

    for (let row = 0; row < snapshot.edgeCount; row++) {
        peers.get(pairOf(row))?.push(row);
    }

    const out = [...notes];
    const targets = new Map<number, NoteTarget[]>();
    minted.forEach((entry, k) => {
        const row = rows[k];
        const pair = row >= 0 ? peers.get(pairOf(row)) : undefined;
        if (pair === undefined) {
            return;
        }

        const list = targets.get(entry.note) ?? [...notes[entry.note].targets];
        targets.set(entry.note, list);
        const { source, target } = entry.edge;
        list[entry.target] = Object.freeze({
            edge: Object.freeze({ source, target, ordinal: pair.indexOf(row), among: pair.length }),
        });
    });
    for (const [n, list] of targets) {
        out[n] = Object.freeze({ ...notes[n], targets: Object.freeze(list) });
    }

    return out;
}

/**
 * The text to show for a target. Display text, never markup.
 * @param target - The target.
 * @param snapshot - The snapshot, for whether edges are directed.
 * @param set - Reads a kept set's name.
 * @returns The label.
 */
function labelOf(target: NoteTarget, snapshot: GraphSnapshot, set: StatusSources["set"]): string {
    if (!supportedTarget(target)) {
        return `Unsupported target (${Object.keys(target).join(", ")})`;
    }

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

    const { item } = target;
    return `${item.result}: ${item.key.field} ${String(item.key.value)}`;
}

/**
 * Whether a target names something only the file it came from can bind: a set, a result or an
 * item read from a file (design/documents/notes.md, "Binding" rule 3), or an edge a file named by
 * a session-made id (rule 2).
 * @param target - A supported target.
 * @param entry - The note's entry.
 * @returns True when it binds to nothing here.
 */
function unboundHere(target: NoteTarget, entry: Pick<NoteEntry, "unbound">): boolean {
    return (
        namesForeignSessionEdge(target) ||
        (entry.unbound?.targets === true && ("set" in target || "result" in target || "item" in target))
    );
}

/**
 * The targets of a note that name something in this session: of a form this release knows, and
 * not a set, result or item a file named.
 * @param entry - The note's entry.
 * @returns Those targets.
 */
export function boundTargets(entry: NoteEntry): NoteTarget[] {
    return entry.note.targets.filter((target) => supportedTarget(target) && !unboundHere(target, entry));
}

/**
 * The node and edge targets of a note this release knows, which bind in a snapshot.
 * @param note - The note.
 * @returns Per target: whether it is a node or edge target to bind.
 */
export function bindable(note: Note): boolean[] {
    return note.targets.map(
        (target) =>
            ("node" in target || "edge" in target) && supportedTarget(target) && !namesForeignSessionEdge(target),
    );
}

/**
 * What a note's targets and cites point at now.
 * @param entry - The note's entry: the record, where it came from, and whether a file named its
 *     sets, results and items.
 * @param sources - What the status reads.
 * @returns The status, frozen.
 */
export function statusOf(entry: NoteEntry, sources: StatusSources): NoteStatus {
    const { note, source } = entry;
    const snapshot = sources.snapshot();
    const binds = bindable(note);
    const edges = note.targets.flatMap((target, at) => (binds[at] && "edge" in target ? [target.edge] : []));
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
        if (!supportedTarget(target)) {
            state = "unsupported";
        } else if (unboundHere(target, entry)) {
            state = "missing";
        } else if ("graph" in target) {
            state = "present";
        } else if ("node" in target) {
            state = shown(nodeRowOf(snapshot, target.node), (row) => sources.visible.node(row));
        } else if ("edge" in target) {
            state = shown(edgeRows[nextEdge++], (row) => sources.visible.edge(row));
        } else if ("set" in target) {
            state = sources.set(target.set) === undefined ? "missing" : "present";
        } else if ("result" in target) {
            state = sources.result(target.result) === undefined ? "missing" : "present";
        } else {
            const run = pinned(target.item.result, target.item.run ?? "");
            state = run === "same" ? "present" : run;
        }

        return Object.freeze({ state, label });
    });

    const cites = (note.cites ?? []).map((cite): NoteCiteStatus => {
        if (!supportedCite(cite)) {
            return Object.freeze({ state: "unsupported", label: `Unsupported cite (${Object.keys(cite).join(", ")})` });
        }

        // A cite read from a file names a result that file carries, not one of this session's.
        const run = entry.unbound?.cites === true ? "missing" : pinned(cite.result, cite.run);
        return Object.freeze({ state: run === "same" ? "current" : run, label: cite.result });
    });

    return Object.freeze({
        targets: Object.freeze(targets),
        cites: Object.freeze(cites),
        ...(source === undefined ? {} : { source }),
    });
}
