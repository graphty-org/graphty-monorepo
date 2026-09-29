/**
 * @file Bipartite matching, Girvan-Newman, Leiden, link prediction, max flow and min cut reach
 * their algorithm through the dispatcher `accelerated()` returns, as every other adapter with a
 * dispatcher member does.
 *
 * No accelerator implements any of the six, so the dispatcher runs the same CPU port the adapters
 * used to call themselves and the answers do not change (the per-algorithm suites hold those). What
 * is checked here is the route: the dispatcher member is the one called, the run says its numbers
 * are double precision, and `acceleration="required"` treats them as it treats every capability
 * the element never hands to a device -- the controller is not asked, and the CPU port answers.
 */

import * as algorithms from "@graphty/algorithms";
import { assert, beforeEach, describe, it, vi } from "vitest";

import { BipartiteMatchingAlgorithm } from "../../src/algorithms/BipartiteMatchingAlgorithm";
import { GirvanNewmanAlgorithm } from "../../src/algorithms/GirvanNewmanAlgorithm";
import { LeidenAlgorithm } from "../../src/algorithms/LeidenAlgorithm";
import { LinkPredictionAlgorithm } from "../../src/algorithms/LinkPredictionAlgorithm";
import { MaxFlowAlgorithm } from "../../src/algorithms/MaxFlowAlgorithm";
import { MinCutAlgorithm } from "../../src/algorithms/MinCutAlgorithm";
import { type AlgorithmOutput, detachedRunContext } from "../../src/algorithms/results";
import type { Graph } from "../../src/Graph";
import { createMockGraph, type MockGraphOpts } from "../helpers/mockGraph";

/** The dispatcher members called since the last reset, in call order. */
const reached: string[] = [];

vi.mock("@graphty/algorithms", async (importOriginal) => {
    const actual = await importOriginal<typeof algorithms>();
    return {
        ...actual,
        accelerated: (accelerator: Parameters<typeof actual.accelerated>[0]) =>
            new Proxy(actual.accelerated(accelerator), {
                get(target, member, receiver): unknown {
                    const value: unknown = Reflect.get(target, member, receiver);
                    if (typeof value !== "function" || typeof member !== "string") {
                        return value;
                    }

                    return (...args: unknown[]): unknown => {
                        reached.push(member);
                        return (value as (...a: unknown[]) => unknown).apply(target, args);
                    };
                },
            }),
    };
});

/** A square: two sides, two unjoined pairs that share neighbours, and a cut of two. */
const SQUARE: MockGraphOpts = {
    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    edges: [
        { srcId: "A", dstId: "B", weight: 1 },
        { srcId: "B", dstId: "C", weight: 1 },
        { srcId: "C", dstId: "D", weight: 1 },
        { srcId: "D", dstId: "A", weight: 1 },
    ],
};

/** Each adapter, the options that make it run, and the dispatcher member it must reach. */
const CASES: {
    name: string;
    member: string;
    make: (graph: Graph) => { compute: (c: ReturnType<typeof detachedRunContext>) => Promise<AlgorithmOutput | null> };
}[] = [
    {
        name: "bipartite matching",
        member: "maximumBipartiteMatching",
        make: (g) => new BipartiteMatchingAlgorithm(g),
    },
    { name: "girvan-newman", member: "girvanNewman", make: (g) => new GirvanNewmanAlgorithm(g) },
    { name: "leiden", member: "leiden", make: (g) => new LeidenAlgorithm(g) },
    {
        name: "link prediction, adamic-adar",
        member: "adamicAdarPrediction",
        make: (g) => new LinkPredictionAlgorithm(g, { method: "adamic-adar" }),
    },
    {
        name: "link prediction, common neighbours",
        member: "commonNeighborsPrediction",
        make: (g) => new LinkPredictionAlgorithm(g, { method: "common-neighbors" }),
    },
    { name: "max flow", member: "maxFlow", make: (g) => new MaxFlowAlgorithm(g, { source: "A", sink: "C" }) },
    {
        name: "min cut, source and sink",
        member: "minSTCut",
        make: (g) => new MinCutAlgorithm(g, { source: "A", sink: "C" }),
    },
    { name: "min cut, stoer-wagner", member: "stoerWagner", make: (g) => new MinCutAlgorithm(g) },
    {
        name: "min cut, karger",
        member: "kargerMinCut",
        make: (g) => new MinCutAlgorithm(g, { useKarger: true, kargerIterations: 20 }),
    },
];

describe("the adapters whose algorithm no accelerator implements run through the dispatcher", () => {
    beforeEach(() => {
        reached.length = 0;
    });

    for (const { name, member, make } of CASES) {
        it(`${name} calls the dispatcher's ${member} and says its numbers are double precision`, async () => {
            const graph = await createMockGraph(SQUARE);
            const output = await make(graph).compute(detachedRunContext());

            assert.isNotNull(output);
            assert.deepStrictEqual(reached, [member]);
            assert.strictEqual(output.caveats.precision, "f64");
        });

        it(`${name} under acceleration required, with no accelerator, runs on the CPU port as every capability the element never hands over does`, async () => {
            const graph = await createMockGraph(SQUARE);
            graph.acceleration.setPolicy("required");
            const output = await make(graph).compute(detachedRunContext());

            assert.isNotNull(output);
            assert.deepStrictEqual(reached, [member]);
            assert.strictEqual(output.caveats.precision, "f64");
        });
    }
});
