/**
 * A Graph value's definition kept valid when the Calculate pop-over switches what it walks (edges, neighbors or
 * members): only the definition is edited here; graphty-element does the walking.
 */

import type { GraphMeasure, WalkPath } from "@graphty/graphty-element/catalog";

import { pruned } from "./dataEntries";

/**
 * Whether a walk path is read on the edge walked.
 * @param graph - the value it belongs to.
 * @param walk - the path.
 * @returns whether it is.
 */
function onEdge(graph: GraphMeasure, walk: WalkPath | undefined): boolean {
    return walk !== undefined && (walk.on ?? (graph.over === "edges" ? "edge" : "node")) === "edge";
}

/**
 * The value walking over nodes: an edge's own paths and a direction group are left out, since a node walk has none.
 * @param graph - the value walking edges.
 * @param over - "neighbors" or "members".
 * @returns the value.
 */
function offEdges(graph: GraphMeasure, over: GraphMeasure["over"]): GraphMeasure {
    const of = onEdge(graph, graph.of) ? undefined : graph.of;
    const whereGone = graph.where !== undefined && (graph.whereOn ?? "edge") === "edge";
    const by = graph.groupBy;
    const byGone = by !== undefined && (by.by === "direction" || onEdge(graph, by));
    return pruned({
        ...graph,
        over,
        measure: of === undefined ? "count" : graph.measure,
        of: of === undefined ? undefined : { path: of.path },
        where: whereGone ? undefined : graph.where,
        whereOn: undefined,
        groupBy: byGone || by === undefined || by.by === "direction" ? undefined : pruned({ ...by, on: undefined }),
    });
}

/**
 * The value walking edges: a node walk's paths are read on the node at the other end.
 * @param graph - the value walking nodes.
 * @returns the value.
 */
function ontoEdges(graph: GraphMeasure): GraphMeasure {
    const by = graph.groupBy;
    return pruned({
        ...graph,
        over: "edges",
        of: graph.of === undefined ? undefined : { path: graph.of.path, on: "node" },
        whereOn: graph.where === undefined ? undefined : "node",
        groupBy: by === undefined || by.by === "direction" ? by : { ...by, on: "node" },
    });
}

/**
 * A Graph value kept valid after what it walks changes: see the file header. Hops stay only over neighbors and a
 * direction leaves members.
 * @param graph - the value.
 * @param over - what it walks now.
 * @returns the value.
 */
export function walkingOver(graph: GraphMeasure, over: GraphMeasure["over"]): GraphMeasure {
    let next: GraphMeasure = { ...graph, over };
    if (graph.over === "edges" && over !== "edges") {
        next = offEdges(graph, over);
    } else if (graph.over !== "edges" && over === "edges") {
        next = ontoEdges(graph);
    }
    return pruned({
        ...next,
        hops: over === "neighbors" ? next.hops : undefined,
        direction: over === "members" ? undefined : next.direction,
    });
}
