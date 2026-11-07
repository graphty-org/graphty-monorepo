/**
 * @file What a simple-tier graph view is built from: the current snapshot, and the one reader a
 * style selector reads values through.
 *
 * `node.attr(path)` promises to resolve a path "exactly as a style selector resolves it"
 * (design/extensions/simple-tier.md section 2.3 rule 3). The only way to keep that promise is to
 * read through the same code, so this builds the view's reader with `createSelectorSource` -- the
 * factory the session's style stack, query engine and selection all read through -- over the
 * session's own records and results. A `results.<run>.<field>` path therefore reads a finished
 * run's published values exactly as a style layer bound to it does.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { DerivedInput } from "../algorithms/input/derivedInputs";
import { edgeSpaceOf } from "../session/scope/spaces";
import { createSelectorSource } from "../session/styles/sources";
import type { GraphSession } from "../session/types";

/** Which kind of element a path is read on. */
export type ViewTarget = "node" | "edge";

/** Everything a graph view reads. */
export interface ViewSource {
    /** The graph, frozen: the view is built once over it and never follows a later freeze. */
    readonly snapshot: GraphSnapshot;
    /**
     * One node's value at a path.
     * @param row - The node's row in `snapshot`.
     * @param path - The path, as a style selector spells it.
     * @returns The value, or undefined when the node carries none.
     */
    nodeValue(row: number, path: string): unknown;
    /**
     * One edge's value at a path.
     * @param row - The edge's row in `snapshot`.
     * @param path - The path.
     * @returns The value, or undefined when the edge carries none.
     */
    edgeValue(row: number, path: string): unknown;
    /**
     * The attribute names one kind of element carries, for a refusal that lists them. Optional: a
     * refusal without it says only what was not found.
     * @param target - Nodes or edges.
     * @returns The names, in a stable order.
     */
    attributeNames?(target: ViewTarget): readonly string[];
}

/** Keys that are an element's identity or its endpoints rather than an attribute of it. */
const IDENTITY_KEYS: Readonly<Record<ViewTarget, ReadonlySet<string>>> = {
    node: new Set(["id"]),
    edge: new Set(["id", "source", "target"]),
};

/**
 * Each compact edge row's row in the graph it was derived from.
 * @param remap - Original row -> compact row, INVALID_INDEX for an edge left out.
 * @param size - How many edges the compact graph has.
 * @returns Compact row -> original row.
 */
function originsOf(remap: U32, size: number): U32 {
    const origin = new Uint32Array(size);
    for (let row = 0; row < remap.length; row++) {
        const target = remap[row];
        if (target !== INVALID_INDEX && target < size) {
            origin[target] = row;
        }
    }

    return origin;
}

/**
 * The view source over a session's graph as it stands now, or over a run's scope of it.
 * @param session - The session: an element's (`graph.getSession()`) or a headless one.
 * @param scope - The run's scope as its compact graph in declared orientation, with the maps back
 *   to the graph's rows; absent for the whole graph. Values are read on the graph's rows, so a
 *   path reads the same value whichever graph the view is over.
 * @returns The source, pinned to the current snapshot.
 */
export function viewSourceOf(session: GraphSession, scope?: DerivedInput): ViewSource {
    const whole = session.data.snapshot();
    const snapshot = scope?.snapshot ?? whole;
    const edgeIds = edgeSpaceOf(whole);
    const values = createSelectorSource({
        snapshot: () => whole,
        results: (runId) => session.results.get(runId),
        records: {
            nodeAttributes: (_row, id) => session.data.node(id),
            edgeAttributes: (row) => session.data.edge(edgeIds.idOf(row)),
        },
    });
    const nodeOrigin = scope?.nodeOrigin ?? null;
    const edgeRemap = scope?.edgeRemap ?? null;
    let edgeOrigin: U32 | null = null;
    const edgeRow = (row: number): number => {
        if (edgeRemap === null) {
            return row;
        }

        edgeOrigin ??= originsOf(edgeRemap, snapshot.edgeCount);
        return edgeOrigin[row];
    };

    return {
        snapshot,
        nodeValue: (row, path) => values.nodeValue(nodeOrigin === null ? row : nodeOrigin[row], path),
        edgeValue: (row, path) => values.edgeValue(edgeRow(row), path),
        attributeNames: (target) =>
            session.data
                .attributes()
                .filter((attribute) => attribute.kind === target && !IDENTITY_KEYS[target].has(attribute.name))
                .map((attribute) => attribute.name),
    };
}
