/**
 * @file The caveat and partial-cause codes, their parameters, and the English the deprecated
 * `Caveats.notes` and `Caveats.partialReason` are worded from (#866).
 */

import { assert, describe, it } from "vitest";

import { declaredCaveats } from "../../../src/algorithms/results/types";
import { caveat, caveatSentence, noted, partialSentence } from "../../../src/session/runs/caveatFacts";

describe("a caveat fact", () => {
    it("words the scope it ran over as before", () => {
        assert.strictEqual(
            caveatSentence(caveat("scope.whole-graph")),
            "Computed on the whole graph; values kept for the scope only.",
        );
        assert.strictEqual(
            caveatSentence(caveat("scope.induced-subgraph", { nodes: 4 })),
            "Computed on the induced subgraph of 4 nodes.",
        );
        assert.strictEqual(
            caveatSentence(caveat("scope.induced-subgraph", { nodes: 1 })),
            "Computed on the induced subgraph of 1 node.",
        );
        assert.strictEqual(
            caveatSentence(caveat("scope.subgraph", { nodes: 3, edges: 1 })),
            "Computed on the subgraph of 3 nodes and the 1 edge in scope.",
        );
    });

    it("words merged parallel edges and an empty input as before", () => {
        assert.strictEqual(
            caveatSentence(caveat("parallel-edges.merged", { count: 1, policy: "min" })),
            "1 parallel edge was merged, keeping the lowest weight, because this algorithm runs over a graph " +
                "that holds one edge per pair. Every member of a merged group carries the merged value.",
        );
        assert.strictEqual(
            caveatSentence(caveat("parallel-edges.merged", { count: 3, policy: "sum" })),
            "3 parallel edges were merged, with weights summed, because this algorithm runs over a graph " +
                "that holds one edge per pair. Every member of a merged group carries the merged value.",
        );
        assert.strictEqual(
            caveatSentence(caveat("input.empty")),
            "The graph had nothing for this algorithm to measure.",
        );
    });

    it("words a sampled run's cost caveats as before", () => {
        assert.strictEqual(
            caveatSentence(
                caveat("sampled.instead-of-exact", {
                    method: "brandes-sampled",
                    name: "Sampled betweenness",
                    sampleSize: 1200,
                    nodes: 250000,
                }),
            ),
            "Sampled rather than exact: Sampled betweenness over 1,200 of 250,000 nodes.",
        );
        assert.strictEqual(
            caveatSentence(caveat("sampled.exact-past-cap", { seconds: 12.3456, cap: 5 })),
            "An exact run was estimated at 12.3 s, past the 5 s cap, so the approximate method was used instead.",
        );
        assert.strictEqual(
            caveatSentence(caveat("sampled.still-past-cap", { seconds: 7.891, cap: 5 })),
            "The sampled run is itself estimated at 7.89 s, which is still past the cap.",
        );
    });

    it("is frozen with its parameters, and survives structuredClone", () => {
        const fact = caveat("route.found", { source: "A", target: 7 });

        assert.isTrue(Object.isFrozen(fact));
        assert.isTrue(Object.isFrozen(fact.params));
        assert.deepStrictEqual(structuredClone(fact), { code: "route.found", params: { source: "A", target: 7 } });
    });

    it("hands back facts and the notes worded from them, in one order", () => {
        const { facts, notes } = noted([caveat("weights.unread"), caveat("community.resolution", { resolution: 1.5 })]);

        assert.deepStrictEqual(
            facts.map((fact) => fact.code),
            ["weights.unread", "community.resolution"],
        );
        assert.deepStrictEqual(notes, ["Edge weights are not read.", "Resolution 1.5."]);
    });
});

describe("a partial cause", () => {
    it("words every cause as the partial reason read before", () => {
        assert.strictEqual(partialSentence({ code: "partial.iteration-cap", params: {} }), "iteration cap reached");
        assert.strictEqual(
            partialSentence({ code: "partial.time-box", params: { ms: 250 } }),
            "Stopped after the 250 ms time box and published what was computed.",
        );
        assert.strictEqual(
            partialSentence({ code: "partial.canceled", params: { reason: "The batch was undone.", runId: "b" } }),
            "The batch was undone.",
        );
        assert.strictEqual(
            partialSentence({ code: "partial.canceled", params: { reason: null, runId: "degree" } }),
            'Run "degree" was canceled.',
        );
        assert.strictEqual(
            partialSentence({ code: "partial.stopped", params: {} }),
            "Stopped before every element was measured.",
        );
        assert.strictEqual(
            partialSentence({ code: "partial.batch-incomplete", params: { completed: 2, total: 5 } }),
            "2 of 5 members finished.",
        );
    });
});

describe("declaredCaveats", () => {
    it("words notes from facts, then keeps an extension's own sentences after them", () => {
        const caveats = declaredCaveats({
            method: "mine",
            direction: "undirected",
            facts: [caveat("weights.unread")],
            notes: ["My own sentence."],
        });

        assert.deepStrictEqual(
            caveats.facts.map((fact) => fact.code),
            ["weights.unread"],
        );
        assert.deepStrictEqual(caveats.notes, ["Edge weights are not read.", "My own sentence."]);
    });

    it("gives a run that states no facts an empty list", () => {
        const caveats = declaredCaveats({ method: "mine", direction: "undirected" });

        assert.deepStrictEqual(caveats.facts, []);
        assert.deepStrictEqual(caveats.notes, []);
    });

    it("words the partial reason from the cause unless the run gave its own", () => {
        const caveats = declaredCaveats({
            method: "mine",
            direction: "undirected",
            partialCause: { code: "partial.iteration-cap", params: {} },
        });

        assert.strictEqual(caveats.partialReason, "iteration cap reached");
        assert.strictEqual(
            declaredCaveats({ method: "mine", direction: "undirected", partialReason: "Mine." }).partialReason,
            "Mine.",
        );
    });
});
