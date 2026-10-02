/**
 * Node ids accepted wherever an algorithm takes a node or a set of nodes, and id-keyed views of the
 * results, so a caller holding element ids never writes index conversion code.
 */
import { fromEdgeArrays, GraphFormatError, makeMask, maskSet, maskTest } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { groupsById, pathIds, scoresById } from "../../../src/index.js";
import { accelerated } from "../../../src/indexed/accelerator.js";
import {
    adamicAdarScore,
    allPairsShortestPath,
    bellmanFord,
    betweennessCentrality,
    bidirectionalDijkstra,
    breadthFirstSearch,
    closenessCentrality,
    connectedComponents,
    depthFirstSearch,
    dijkstra,
    getTopCandidatesForNode,
    maxFlow,
    maximumBipartiteMatching,
    nodeClosenessCentrality,
    primMST,
} from "../../../src/indexed/index.js";
import { astar } from "../../../src/indexed/point-to-point.js";

// a - b - c - d, plus a separate e - f
const path = fromEdgeArrays({
    directed: false,
    ids: ["a", "b", "c", "d", "e", "f"],
    src: new Uint32Array([0, 1, 2, 4]),
    dst: new Uint32Array([1, 2, 3, 5]),
});
const id = (x: string): { id: string } => ({ id: x });

describe("node ids as single-node inputs", () => {
    it("traversals start and stop at a node id", () => {
        expect(pathIds(breadthFirstSearch(path, id("b")).order, path)).toEqual(["b", "a", "c", "d"]);
        expect(breadthFirstSearch(path, id("a"), { target: id("c") }).order[2]).toBe(2);
        expect(pathIds(depthFirstSearch(path, id("d"), { target: id("b") }).order, path)).toEqual(["d", "c", "b"]);
    });

    it("shortest paths take a source id and walk back from a target id", () => {
        const r = dijkstra(path, id("a"));
        expect(pathIds(r.pathTo(id("d")), path)).toEqual(["a", "b", "c", "d"]);
        expect(Array.from(r.pathEdges(id("c")))).toEqual([0, 1]);
        expect(pathIds(bellmanFord(path, id("d")).pathTo(id("a")), path)).toEqual(["d", "c", "b", "a"]);
        expect(pathIds(bidirectionalDijkstra(path, id("a"), id("d")).path, path)).toEqual(["a", "b", "c", "d"]);
        expect(pathIds(astar(path, id("a"), id("c"), () => 0).path, path)).toEqual(["a", "b", "c"]);
        const all = allPairsShortestPath(path, { paths: true });
        expect(pathIds(all.pathTo(id("b"), id("d")), path)).toEqual(["b", "c", "d"]);
    });

    it("flow, closeness, link prediction and Prim take node ids", () => {
        expect(maxFlow(path, id("a"), id("d")).maxFlow).toBe(1);
        expect(nodeClosenessCentrality(path, id("b"))).toBe(nodeClosenessCentrality(path, 1));
        expect(adamicAdarScore(path, id("a"), id("c"))).toBe(adamicAdarScore(path, 0, 2));
        expect(Array.from(getTopCandidatesForNode(path, id("a"), { candidates: { ids: ["c"] } }).targets)).toEqual([2]);
        expect(primMST(path, { start: id("e"), forest: true }).edges[0]).toBe(3);
    });

    it("the dispatcher resolves a node id before it reaches an accelerator", async () => {
        const seen: number[] = [];
        const d = accelerated({
            sssp: (s, source) => {
                seen.push(source);
                return Promise.resolve(dijkstra(s, source));
            },
        });
        const r = await d.sssp(path, id("c"));
        expect(seen).toEqual([2]);
        expect(pathIds(r.pathTo(id("a")), path)).toEqual(["c", "b", "a"]);
        expect(pathIds((await d.breadthFirstSearch(path, id("e"))).order, path)).toEqual(["e", "f"]);
    });

    it("an unknown id throws E_UNKNOWN_NODE", () => {
        expect(() => dijkstra(path, id("zz"))).toThrow(GraphFormatError);
        expect(() => breadthFirstSearch(path, id("zz"))).toThrow(/zz|not/);
    });
});

describe("one NodeSet input: indices, a mask, or ids", () => {
    it("sampled betweenness and closeness accept every form alike", () => {
        const mask = makeMask(6);
        maskSet(mask, 1, true);
        maskSet(mask, 2, true);
        const byIndex = betweennessCentrality(path, { sources: [1, 2] }).scores;
        expect(betweennessCentrality(path, { sources: { ids: ["b", "c"] } }).scores).toEqual(byIndex);
        expect(betweennessCentrality(path, { sources: { mask } }).scores).toEqual(byIndex);
        expect(betweennessCentrality(path, { sources: new Uint32Array([1, 2]) }).scores).toEqual(byIndex);
        expect(closenessCentrality(path, { sources: { ids: ["b", "c"] } }).scores).toEqual(
            closenessCentrality(path, { sources: [1, 2] }).scores,
        );
    });

    it("matching sides accept ids and plain index arrays, and still read a bare Uint32Array as a mask", () => {
        const left = makeMask(6);
        maskSet(left, 0, true);
        maskSet(left, 2, true);
        const right = makeMask(6);
        maskSet(right, 1, true);
        maskSet(right, 3, true);
        const byMask = maximumBipartiteMatching(path, { left, right });
        expect(maximumBipartiteMatching(path, { left: { ids: ["a", "c"] }, right: [1, 3] })).toEqual(byMask);
        expect(byMask.size).toBe(2);
        expect(maskTest(left, 0)).toBe(true);
    });
});

describe("id-keyed result views", () => {
    it("scoresById keys a score vector or a scores result by node id", () => {
        const r = betweennessCentrality(path);
        const byId = scoresById(r, path);
        expect(byId.get("b")).toBe(r.scores[1]);
        expect(scoresById(r.scores, path).get("c")).toBe(r.scores[2]);
    });

    it("groupsById lists each partition group as node ids", () => {
        expect(groupsById(connectedComponents(path), path)).toEqual([
            ["a", "b", "c", "d"],
            ["e", "f"],
        ]);
    });
});
