import { GraphBuilder, type GraphSnapshot, isGraphSnapshot } from "@graphty/graph-format";

import type { Graph, Node } from "../types";

/** One undirected copy per directed snapshot, never two (graph-format design 14.3). */
const undirectedCache = new WeakMap<GraphSnapshot, GraphSnapshot>();

/**
 * The weight a legacy getEdgeData result stands for: null and undefined leave the edge unweighted (the same as no
 * getEdgeData at all), a string is coerced with Number() so a non-numeric string is NaN and the builder's own
 * E_INVALID_WEIGHT applies, a number passes through and anything else is NaN for the same reason.
 * @param raw - what getEdgeData returned
 * @returns the addEdge weight argument
 */
function legacyWeight(raw: unknown): number | undefined {
    if (raw === null || raw === undefined) {
        return undefined;
    }
    if (typeof raw === "number") {
        return raw;
    }
    return typeof raw === "string" ? Number(raw) : Number.NaN;
}

/**
 * The undirected snapshot of a layout input (graph-format design 14.3): a snapshot is returned as its undirected
 * derived graph (the input itself when already undirected); a legacy duck-typed graph is walked on every call,
 * never cached by object identity, because nothing tells a mutated object from an unchanged one; a node list
 * becomes an edgeless snapshot. A getEdgeData result of null or undefined leaves that edge
 * unweighted and a string is coerced with Number() (a non-numeric string is NaN, which the builder rejects).
 * @param G - the input
 * @param weightAttr - the edge attribute read through getEdgeData, or null for unweighted
 * @returns the undirected snapshot
 */
export function toLayoutSnapshot(G: Graph | Node[] | GraphSnapshot, weightAttr: string | null = null): GraphSnapshot {
    if (isGraphSnapshot(G)) {
        if (!G.directed) {
            return G;
        }
        // the format never caches derived graphs itself
        const cachedUndirected = undirectedCache.get(G);
        if (cachedUndirected !== undefined) {
            return cachedUndirected;
        }
        const undirected = G.toUndirected().snapshot;
        undirectedCache.set(G, undirected);
        return undirected;
    }
    // weighted "auto": the snapshot carries weights only when getEdgeData supplied some (an explicit 1 would
    // mark every edge weighted); addMissingNodes defaults to true; weightDtype f64 keeps a legacy double weight
    // that f32 cannot hold in the role-"weight" edge column, which Kamada-Kawai reads its distances from
    const builder = new GraphBuilder({ directed: false, weighted: "auto", weightDtype: "f64" });
    if (Array.isArray(G)) {
        builder.addNodes(G);
    } else {
        builder.addNodes(G.nodes());
        for (const [source, target] of G.edges()) {
            const raw =
                weightAttr !== null && G.getEdgeData !== undefined
                    ? G.getEdgeData(source, target, weightAttr)
                    : undefined;
            builder.addEdge(source, target, legacyWeight(raw));
        }
    }
    return builder.freeze();
}
