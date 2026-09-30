/**
 * @file Max flow, min cut, bipartite matching and link prediction against the route they took before
 * they ran on the index-based ports: what the algorithms 2.x functions answered when handed the same
 * input the adapters read, the way the adapters used to hand it over.
 *
 * Those answers are recorded in `legacy-route.golden.json`, one per call, keyed by the test's full
 * name and the call's position in it; algorithms 3.0.0 removed the functions. The recording is
 * frozen: renaming a test, or changing a fixture or the random seeds below, breaks the lookup.
 */

import { readFileSync } from "node:fs";

import { stoerWagner } from "@graphty/algorithms";
import { assert, describe, expect, it } from "vitest";

import type { Algorithm } from "../../../src/algorithms/Algorithm";
import { BipartiteMatchingAlgorithm } from "../../../src/algorithms/BipartiteMatchingAlgorithm";
import { createScopedInput } from "../../../src/algorithms/input/ScopedInput";
import { LinkPredictionAlgorithm } from "../../../src/algorithms/LinkPredictionAlgorithm";
import { MaxFlowAlgorithm } from "../../../src/algorithms/MaxFlowAlgorithm";
import { MinCutAlgorithm } from "../../../src/algorithms/MinCutAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../../src/algorithms/results";
import type { Graph } from "../../../src/Graph";
import { createMockGraph, type MockGraphOpts } from "../../helpers/mockGraph";
import { referenceSnapshot } from "../../helpers/reference-snapshot";

type Edge = MockGraphOpts["edges"] extends (infer E)[] | undefined ? E : never;

/** A seeded generator, so a random fixture is the same graph on every run. */
function lcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

/**
 * A random graph over `n` nodes named n0.., with `m` edges and integer capacities, never a
 * self-loop and never both directions of one pair (the one case where the ports differ on purpose).
 */
function randomGraph(n: number, m: number, seed: number): MockGraphOpts {
    const rand = lcg(seed);
    const seen = new Set<string>();
    const edges: Edge[] = [];
    while (edges.length < m) {
        const a = Math.floor(rand() * n);
        const b = Math.floor(rand() * n);
        if (a === b || seen.has(`${a}|${b}`) || seen.has(`${b}|${a}`)) {
            continue;
        }

        seen.add(`${a}|${b}`);
        edges.push({
            srcId: `n${a}`,
            dstId: `n${b}`,
            capacity: 1 + Math.floor(rand() * 9),
            value: 1 + Math.floor(rand() * 5),
        });
    }

    return { nodes: Array.from({ length: n }, (_, i) => ({ id: `n${i}` })), edges };
}

/** A random two-sided graph: `l` left nodes l0.., `r` right nodes r0.., `m` distinct edges. */
function randomBipartite(l: number, r: number, m: number, seed: number): MockGraphOpts {
    const rand = lcg(seed);
    const seen = new Set<string>();
    const edges: Edge[] = [];
    while (edges.length < m) {
        const a = `l${Math.floor(rand() * l)}`;
        const b = `r${Math.floor(rand() * r)}`;
        if (!seen.has(`${a}|${b}`)) {
            seen.add(`${a}|${b}`);
            edges.push({ srcId: a, dstId: b });
        }
    }

    return {
        nodes: [
            ...Array.from({ length: l }, (_, i) => ({ id: `l${i}` })),
            ...Array.from({ length: r }, (_, i) => ({ id: `r${i}` })),
        ],
        edges,
    };
}

const CLRS: MockGraphOpts = {
    nodes: ["s", "v1", "v2", "v3", "v4", "t"].map((id) => ({ id })),
    edges: [
        { srcId: "s", dstId: "v1", capacity: 16 },
        { srcId: "s", dstId: "v2", capacity: 13 },
        { srcId: "v1", dstId: "v3", capacity: 12 },
        { srcId: "v2", dstId: "v1", capacity: 4 },
        { srcId: "v2", dstId: "v4", capacity: 14 },
        { srcId: "v3", dstId: "v2", capacity: 9 },
        { srcId: "v3", dstId: "t", capacity: 20 },
        { srcId: "v4", dstId: "v3", capacity: 7 },
        { srcId: "v4", dstId: "t", capacity: 4 },
    ],
};

/** Parallel edges, capacities that are not f32-exact, a `value` fallback and a record with neither. */
const MULTI: MockGraphOpts = {
    nodes: ["s", "a", "b", "t"].map((id) => ({ id })),
    edges: [
        { srcId: "s", dstId: "a", capacity: 0.1 },
        { srcId: "s", dstId: "a", capacity: 0.2 },
        { srcId: "s", dstId: "b", value: 0.7 },
        { srcId: "a", dstId: "t", capacity: 0.25 },
        { srcId: "b", dstId: "t" },
        { srcId: "a", dstId: "b", capacity: 0.3 },
    ],
};

const NUMERIC: MockGraphOpts = {
    nodes: [0, 1, 2, 3, 4, 5].map((id) => ({ id })),
    edges: [
        { srcId: 0, dstId: 1, capacity: 3, value: 3 },
        { srcId: 0, dstId: 2, capacity: 2, value: 2 },
        { srcId: 1, dstId: 2, capacity: 4, value: 4 },
        { srcId: 2, dstId: 3, capacity: 1, value: 1 },
        { srcId: 3, dstId: 4, capacity: 5, value: 5 },
        { srcId: 3, dstId: 5, capacity: 2, value: 2 },
        { srcId: 4, dstId: 5, capacity: 3, value: 3 },
    ],
};

const FLOW_FIXTURES: { name: string; data: MockGraphOpts; source?: string | number; sink?: string | number }[] = [
    { name: "the textbook network", data: CLRS },
    { name: "parallel edges and fractional capacities", data: MULTI },
    { name: "numeric ids", data: NUMERIC, source: 0, sink: 5 },
    { name: "random 12 nodes, 30 edges", data: randomGraph(12, 30, 7), source: "n0", sink: "n11" },
    { name: "random 25 nodes, 80 edges", data: randomGraph(25, 80, 99), source: "n3", sink: "n17" },
    { name: "a sink with no path to it", data: randomGraph(10, 12, 5) },
];

async function compute(algorithm: Algorithm): Promise<AlgorithmOutput> {
    const output = await (algorithm as unknown as { compute: MaxFlowAlgorithm["compute"] }).compute(
        detachedRunContext(),
    );
    assert.ok(output);
    return output;
}

function byId(
    rows: readonly { id: unknown; values: Record<string, unknown> }[] | undefined,
): Map<string, Record<string, unknown>> {
    return new Map((rows ?? []).map((row) => [String(row.id), row.values]));
}

function dataManager(graph: Graph): Parameters<typeof createScopedInput>[0] & {
    edges: Map<string, Record<string, unknown>>;
} {
    return graph.getDataManager() as never;
}

/** What algorithms 2.x answered, as recorded. */
const RECORDED = JSON.parse(readFileSync(new URL("./legacy-route.golden.json", import.meta.url), "utf8")) as Record<
    string,
    unknown
>;
const CALLS = new Map<string, number>();

/**
 * The next recorded answer of the running test.
 * @returns The answer, with its maps and sets as arrays of entries and of members.
 */
function recorded(): unknown {
    const name = expect.getState().currentTestName ?? "";
    const call = CALLS.get(name) ?? 0;
    CALLS.set(name, call + 1);
    const value = RECORDED[`${name}#${String(call)}`];
    assert.isDefined(value, `a recorded answer for ${name}, call ${String(call)}`);
    return value;
}

/**
 * What the max-flow adapter published before the port: `fordFulkerson` over a directed graph of
 * the summed capacities (the flow on each declared edge, its capacity, and each node's net flow).
 * @returns The recorded answer
 */
function legacyMaxFlow(): {
    maxFlow: number;
    edges: Map<string, { value: number; capacity: number }>;
    net: Map<string, number>;
} {
    const r = recorded() as {
        maxFlow: number;
        edges: [string, { value: number; capacity: number }][];
        net: [string, number][];
    };
    return { maxFlow: r.maxFlow, edges: new Map(r.edges), net: new Map(r.net) };
}

describe("max-flow equals the legacy route", () => {
    for (const { name, data, source, sink } of FLOW_FIXTURES) {
        it(name, async () => {
            const graph = await createMockGraph(data);
            const options = source === undefined ? {} : { source, sink };
            const output = await compute(new MaxFlowAlgorithm(graph, options));
            const expected = legacyMaxFlow();

            assert.strictEqual(output.graph?.maxFlow, expected.maxFlow, "the flow value");
            const edges = byId(output.edges);
            for (const [id, values] of expected.edges) {
                assert.closeTo(edges.get(id)?.value as number, values.value, 1e-12, `flow on edge ${id}`);
                assert.strictEqual(edges.get(id)?.capacity, values.capacity, `capacity of edge ${id}`);
            }

            for (const [id, values] of byId(output.nodes)) {
                assert.closeTo(values.netFlow as number, expected.net.get(id) ?? 0, 1e-12, `net flow at ${id}`);
            }
        });
    }

    it("reports the net flow of two opposite edges, where legacy booked each push on the edge it ran along", async () => {
        const graph = await createMockGraph({
            nodes: ["s", "a", "b", "t"].map((id) => ({ id })),
            edges: [
                { srcId: "s", dstId: "a", capacity: 3 },
                { srcId: "s", dstId: "b", capacity: 1 },
                { srcId: "a", dstId: "b", capacity: 3 },
                { srcId: "b", dstId: "a", capacity: 1 },
                { srcId: "a", dstId: "t", capacity: 1 },
                { srcId: "b", dstId: "t", capacity: 3 },
            ],
        });
        const output = await compute(new MaxFlowAlgorithm(graph, { source: "s", sink: "t" }));

        assert.strictEqual(output.graph?.maxFlow, legacyMaxFlow().maxFlow);
        for (const values of byId(output.edges).values()) {
            assert.isAtMost(values.value as number, values.capacity as number, "no edge carries more than it can hold");
        }
    });
});

/**
 * What the min-cut adapter published before the port: `stoerWagner`, or `minSTCut` between the
 * source and the sink, over the undirected input (the cut value, the first side, and whether each
 * declared edge is in the cut).
 * @returns The recorded answer
 */
function legacyMinCut(): { cutValue: number; partition1: Set<string>; inCut: Map<string, boolean> } {
    const r = recorded() as { cutValue: number; partition1: string[]; inCut: [string, boolean][] };
    return { cutValue: r.cutValue, partition1: new Set(r.partition1), inCut: new Map(r.inCut) };
}

const CUT_FIXTURES: { name: string; data: MockGraphOpts; source?: string | number; sink?: string | number }[] = [
    { name: "the textbook network, global", data: CLRS },
    { name: "the textbook network, between s and t", data: CLRS, source: "s", sink: "t" },
    { name: "parallel edges, global", data: MULTI },
    { name: "parallel edges, between s and t", data: MULTI, source: "s", sink: "t" },
    { name: "numeric ids, global", data: NUMERIC },
    { name: "numeric ids, between 0 and 5", data: NUMERIC, source: 0, sink: 5 },
    { name: "random 20 nodes, 50 edges, global", data: randomGraph(20, 50, 11) },
    { name: "random 20 nodes, 50 edges, between n1 and n9", data: randomGraph(20, 50, 11), source: "n1", sink: "n9" },
];

describe("min-cut equals the legacy route", () => {
    for (const { name, data, source, sink } of CUT_FIXTURES) {
        it(name, async () => {
            const graph = await createMockGraph(data);
            const options = source === undefined ? {} : { source, sink };
            const output = await compute(new MinCutAlgorithm(graph, options));
            const expected = legacyMinCut();

            assert.strictEqual(output.graph?.cutValue, expected.cutValue, "the cut value");
            const edges = byId(output.edges);
            for (const [id, inCut] of expected.inCut) {
                assert.strictEqual(edges.get(id)?.in, inCut, `edge ${id} in the cut`);
            }

            for (const [id, values] of byId(output.nodes)) {
                assert.strictEqual(values.side, expected.partition1.has(id) ? "1" : "2", `side of ${id}`);
            }
        });
    }

    it("gives Karger's cut the same answer on every run", async () => {
        // Two six-node cliques joined by one edge, cut in a single contraction: different seeds
        // land on cuts of 1, 5, 8 or 9 edges, so runs agree only when the seed is fixed.
        const edges: Edge[] = [{ srcId: "a0", dstId: "b0" }];
        for (const side of ["a", "b"]) {
            for (let i = 0; i < 6; i++) {
                for (let j = i + 1; j < 6; j++) {
                    edges.push({ srcId: `${side}${i}`, dstId: `${side}${j}` });
                }
            }
        }

        const graph = await createMockGraph({ nodes: [], edges });
        const run = async () =>
            compute(new MinCutAlgorithm(graph, { useGlobalMinCut: true, useKarger: true, kargerIterations: 1 }));
        const first = await run();
        for (let k = 0; k < 10; k++) {
            const again = await run();
            assert.strictEqual(again.graph?.cutValue, first.graph?.cutValue, `run ${k} cut value`);
            assert.deepStrictEqual(again.edges, first.edges, `run ${k} cut edges`);
        }

        assert.isAtLeast(
            first.graph?.cutValue as number,
            stoerWagner(referenceSnapshot(graph.getDataManager(), "undirected")).cutValue,
            "no lighter than the exact cut",
        );
    });
});

describe("bipartite matching equals the legacy route", () => {
    const fixtures: { name: string; data: MockGraphOpts }[] = [
        {
            name: "a path",
            data: {
                nodes: [],
                edges: [
                    { srcId: "a", dstId: "x" },
                    { srcId: "b", dstId: "x" },
                    { srcId: "b", dstId: "y" },
                ],
            },
        },
        { name: "random 8 by 8, 20 edges", data: randomBipartite(8, 8, 20, 17) },
        { name: "random 15 by 10, 40 edges", data: randomBipartite(15, 10, 40, 23) },
        { name: "two components", data: randomBipartite(6, 6, 7, 5) },
    ];

    for (const { name, data } of fixtures) {
        it(name, async () => {
            const graph = await createMockGraph(data);
            const output = await compute(new BipartiteMatchingAlgorithm(graph));
            const dm = dataManager(graph);
            // bipartitePartition's two sides and the size of maximumBipartiteMatching between them.
            const recordedSides = recorded() as { left: unknown[]; right: unknown[]; size: number };
            const sides = { left: recordedSides.left, right: recordedSides.right };
            const expected = { size: recordedSides.size };

            const nodes = byId(output.nodes);
            for (const id of sides.left) {
                assert.strictEqual(nodes.get(String(id))?.side, "left", `${String(id)} is on the left`);
            }

            for (const id of sides.right) {
                assert.strictEqual(nodes.get(String(id))?.side, "right", `${String(id)} is on the right`);
            }

            // The size equals legacy; the pairing is checked to be one, since a maximum matching is
            // not unique.
            const paired = (output.edges ?? []).filter((edge) => edge.values.in === true);
            const ends = new Set<string>();
            for (const edge of paired) {
                const record = dm.edges.get(edge.id) as { srcId: unknown; dstId: unknown };
                for (const end of [String(record.srcId), String(record.dstId)]) {
                    assert.isFalse(ends.has(end), `${end} is paired once`);
                    ends.add(end);
                }
            }

            assert.strictEqual(paired.length, expected.size, "the matching size");
            const matched = [...nodes.values()].filter((values) => values.matched === true).length;
            assert.strictEqual(matched, 2 * expected.size, "both ends of every pair are matched");
        });
    }

    it("marks every declared edge between a pair, whichever way and however often it was declared", async () => {
        // l0 can only partner r0, which leaves l1 with r1, so the pairing is forced: l0 with r0
        // through a reciprocal pair and a parallel edge, l1 with r1 through an edge declared from
        // the right, and the l1-r0 edge left out.
        const graph = await createMockGraph({
            nodes: ["l0", "l1", "r0", "r1"].map((id) => ({ id })),
            edges: [
                { srcId: "l0", dstId: "r0" },
                { srcId: "r0", dstId: "l0" },
                { srcId: "r1", dstId: "l1" },
                { srcId: "l1", dstId: "r0" },
                { srcId: "l0", dstId: "r0" },
            ],
        });
        const output = await compute(new BipartiteMatchingAlgorithm(graph));
        const dm = dataManager(graph);

        const edges = byId(output.edges);
        assert.strictEqual(edges.size, 5);
        for (const [id, values] of edges) {
            const record = dm.edges.get(id) as { srcId: unknown; dstId: unknown };
            const ends = [String(record.srcId), String(record.dstId)].sort().join("-");
            assert.strictEqual(values.in, ends !== "l1-r0", `edge ${ends} in the pairing`);
        }

        assert.isTrue([...byId(output.nodes).values()].every((values) => values.matched === true));
    });

    it("pairs nothing in a graph without two sides", async () => {
        const graph = await createMockGraph({
            nodes: [],
            edges: [
                { srcId: "a", dstId: "b" },
                { srcId: "b", dstId: "c" },
                { srcId: "c", dstId: "a" },
            ],
        });
        const output = await compute(new BipartiteMatchingAlgorithm(graph));

        assert.strictEqual(output.graph?.bipartite, false);
        assert.isTrue((output.edges ?? []).every((edge) => edge.values.in === false));
    });
});

describe("link prediction equals the legacy route", () => {
    const methods = ["adamic-adar", "common-neighbors"] as const;
    const fixtures: { name: string; data: MockGraphOpts }[] = [
        { name: "random 20 nodes, 45 edges", data: randomGraph(20, 45, 41) },
        { name: "random 40 nodes, 70 edges", data: randomGraph(40, 70, 43) },
        { name: "numeric ids", data: NUMERIC },
    ];

    for (const { name, data } of fixtures) {
        for (const method of methods) {
            it(`${name}, ${method}`, async () => {
                const graph = await createMockGraph(data);
                const output = await compute(new LinkPredictionAlgorithm(graph, { method, topK: 25 }));
                // The 2.x prediction over the undirected input, each unordered pair once, the first 25.
                const expected = recorded() as { source: unknown; target: unknown; score: number }[];
                const pairs = output.graph?.pairs as { source: unknown; target: unknown; score: number }[];

                assert.strictEqual(pairs.length, expected.length);
                pairs.forEach((pair, k) => {
                    assert.strictEqual(pair.source, expected[k].source, `pair ${k} source`);
                    assert.strictEqual(pair.target, expected[k].target, `pair ${k} target`);
                    assert.closeTo(pair.score, expected[k].score, 1e-9, `pair ${k} score`);
                });
            });
        }
    }
});
