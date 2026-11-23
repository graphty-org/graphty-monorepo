/**
 * @file All paths: every simple path between two nodes, on a graph whose answer is known, with its
 * length and count caps, and the suggested style painting only what is on a path.
 *
 * The graph: a diamond a-b-d, a-c-d with a chord b-c, a parallel edge a-b, and a node e off to the
 * side joined to a only.
 */

import { assert, describe, it } from "vitest";

import { edgeSpaceOf } from "../../src/session/scope/ScopeApi";
import { suggestStyles } from "../../src/session/styles/derive";
import { edgeBetween, type Harness, makeSession } from "../session/helpers";
import { builtInRuns } from "../session/sets/algorithms";

const NODES = ["a", "b", "c", "d", "e"];
const EDGES = [
    ["a", "b"],
    ["a", "b"],
    ["a", "c"],
    ["b", "c"],
    ["b", "d"],
    ["c", "d"],
    ["a", "e"],
] as const;

/**
 * A session over the graph, running built-in algorithms.
 * @param directed - Whether the graph is directed.
 * @returns The harness.
 */
function fixture(directed = false): Harness {
    let harness: Harness | null = null;
    const made = makeSession({ directed, runs: { execute: builtInRuns(() => harness as Harness) } });
    harness = made;
    made.add(
        NODES.map((id) => ({ id })),
        EDGES.map(([src, dst]) => ({ src, dst })),
    );
    return made;
}

/**
 * Run all paths from a to d.
 * @param h - The harness.
 * @param params - The caps.
 * @returns The run's result.
 */
function allPaths(h: Harness, params: Record<string, unknown> = {}): ReturnType<Harness["session"]["runs"]["start"]> {
    return h.session.runs.start("all-paths", { source: "a", target: "d", ...params }, { scope: "graph", style: false });
}

/**
 * The routes a result lists, as joined node ids, sorted.
 * @param graph - The result's graph facts.
 * @returns The routes.
 */
function routes(graph: Record<string, unknown>): string[] {
    return (graph.paths as { nodes: string[] }[]).map((row) => row.nodes.join("")).sort();
}

describe("all paths", () => {
    it("finds the four routes from a to d, each once despite the parallel edge", async () => {
        const result = await allPaths(fixture());

        assert.deepEqual(routes(result.graph), ["abcd", "abd", "acbd", "acd"]);
        assert.deepInclude({ ...result.graph }, { found: 4, complete: true, shortest: 2, longest: 3, count: 4 });
        assert.strictEqual(result.node("a")?.pathCount, 4);
        assert.strictEqual(result.node("b")?.pathCount, 3);
        assert.strictEqual(result.node("e")?.in, false);
    });

    it("marks only one of two parallel edges, and never an edge off every route", async () => {
        const h = fixture();
        const result = await allPaths(h);
        const snapshot = h.session.data.snapshot();
        const space = edgeSpaceOf(snapshot);
        const parallel = [0, 1].map((edge) => result.edge(space.idOf(edge))?.in);

        assert.sameMembers(parallel, [true, false]);
        assert.strictEqual(result.edge(edgeBetween(h, "a", "e"))?.in, false);
        assert.strictEqual(result.edge(edgeBetween(h, "b", "c"))?.pathCount, 2);
    });

    it("keeps only routes of at most maxLength edges", async () => {
        const result = await allPaths(fixture(), { maxLength: 2 });

        assert.deepEqual(routes(result.graph), ["abd", "acd"]);
        assert.isTrue(result.graph.complete);
        assert.strictEqual(result.node("c")?.pathCount, 1);
    });

    it("stops at maxPaths and says the list is not complete", async () => {
        const result = await allPaths(fixture(), { maxPaths: 2 });

        assert.strictEqual(result.graph.found, 2);
        assert.isFalse(result.graph.complete);
        assert.include(
            result.summary().caveats.facts.map((fact) => fact.code),
            "all-paths.capped",
        );
    });

    it("follows edge direction on a directed graph when asked, and crosses edges either way by default", async () => {
        const h = fixture(true);

        // b-c points from b to c, so a-c-b-d is no route going out.
        assert.deepEqual(routes((await allPaths(h, { direction: "out" })).graph), ["abcd", "abd", "acd"]);
        assert.deepEqual(routes((await allPaths(h)).graph), ["abcd", "abd", "acbd", "acd"]);
        // Against the edges from d back to a, every edge pointing the other way.
        const back = await h.session.runs.start(
            "all-paths",
            { source: "d", target: "a", direction: "in" },
            { scope: "graph", style: false },
        );
        assert.deepEqual(routes(back.graph), ["dba", "dca", "dcba"]);
    });

    it("suggests one mark scoped to the nodes and edges on a route", async () => {
        const h = fixture();
        await h.session.runs.start("all-paths", { source: "a", target: "d" }, { scope: "graph", style: false });
        const run = h.session.runs.list().at(-1);
        assert.isDefined(run);
        const suggestions = suggestStyles(run);

        assert.lengthOf(suggestions, 1);
        assert.strictEqual(suggestions[0].as, "mark");
        assert.deepInclude(suggestions[0].spec, { field: "in" });
        assert.lengthOf(suggestions[0].channels, 2);
    });
});
