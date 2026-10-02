/**
 * @file What `select({ note, target? })` selects (design/notes/notes-design.md section 5.6): a
 * note's node and edge targets as snapshot rows, its set and item targets as scopes to resolve,
 * and how many targets were skipped because they are not in the graph.
 *
 * A filtered target is in the graph, so it is selected. A `{ graph }` or `{ result }` target names
 * no elements, so it selects nothing and is not skipped. An item from an earlier run selects what
 * that run held, as the run's captures kept it (design/sets 5.2).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { Scope } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { edgeRowsOf, nodeRowOf } from "./status";
import type { NoteStatus, NoteTarget } from "./types";

/** What a note's targets select. */
export interface NoteMembers {
    /** Node rows of the snapshot. */
    readonly nodeRows: readonly number[];
    /** Edge rows of the snapshot. */
    readonly edgeRows: readonly number[];
    /** Set and item targets, to resolve; `emptyIsSkipped` for an item from an earlier run. */
    readonly scopes: readonly { readonly scope: Scope; readonly emptyIsSkipped: boolean }[];
    /** Targets reading `missing` or `unsupported`. */
    readonly skipped: number;
}

/**
 * What a note's targets select.
 * @param targets - The note's targets.
 * @param status - The note's status, one entry per target.
 * @param snapshot - The snapshot the rows are of.
 * @param only - One target's position, or undefined for every target.
 * @returns The rows, the scopes and the skipped count.
 * @throws A `GraphtyError` coded `E_OPTION_RANGE` when `only` is not a position the note has.
 */
export function noteMembers(
    targets: readonly NoteTarget[],
    status: NoteStatus,
    snapshot: GraphSnapshot,
    only?: number,
): NoteMembers {
    if (only !== undefined && !(Number.isInteger(only) && only >= 0 && only < targets.length)) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `A note target's position is a whole number from 0 to ${String(targets.length - 1)}, not ${String(only)}.`,
            source: "run",
            details: { option: "target", value: only, min: 0, max: targets.length - 1 },
        });
    }

    const nodeRows: number[] = [];
    const edgeRows: number[] = [];
    const scopes: { scope: Scope; emptyIsSkipped: boolean }[] = [];
    let skipped = 0;
    const picked = targets.flatMap((target, index) =>
        only === undefined || only === index ? [{ target, state: status.targets[index].state }] : [],
    );
    // An unsupported target is never bound, not even in part.
    const isEdge = (target: NoteTarget, state: string): boolean => "edge" in target && state !== "unsupported";
    const edges = edgeRowsOf(
        snapshot,
        picked.flatMap(({ target, state }) => (isEdge(target, state) && "edge" in target ? [target.edge] : [])),
    );
    let nextEdge = 0;

    for (const { target, state } of picked) {
        // Every edge target takes its row from the batch bound above, skipped or not.
        const edgeRow = isEdge(target, state) ? edges[nextEdge++] : -1;
        if (state === "missing" || state === "unsupported") {
            skipped++;
        } else if ("node" in target) {
            nodeRows.push(nodeRowOf(snapshot, target.node));
        } else if ("edge" in target) {
            edgeRows.push(edgeRow);
        } else if ("set" in target) {
            scopes.push({ scope: { set: target.set }, emptyIsSkipped: false });
        } else if ("item" in target) {
            scopes.push({
                scope: { define: { kind: "rule", where: { kind: "item", item: target.item }, reading: "clipped" } },
                emptyIsSkipped: state === "earlier-run",
            });
        }
    }

    return { nodeRows, edgeRows, scopes, skipped };
}
