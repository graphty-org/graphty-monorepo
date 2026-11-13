import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { GirvanNewmanAlgorithm } from "../../../src/algorithms/GirvanNewmanAlgorithm";
import { LabelPropagationAlgorithm } from "../../../src/algorithms/LabelPropagationAlgorithm";
import { LeidenAlgorithm } from "../../../src/algorithms/LeidenAlgorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { OptionValidationError } from "../../../src/algorithms/types/OptionSchema";
import { createMockGraph, partitionOf } from "../../helpers/mockGraph";

describe("Community Detection Algorithm Options", () => {
    describe("PageRankAlgorithm", () => {
        describe("options schema", () => {
            it("has options defined", () => {
                assert.isTrue(PageRankAlgorithm.hasOptions());
            });

            it("has dampingFactor option", () => {
                const schema = PageRankAlgorithm.getOptionsSchema();
                assert.isDefined(schema.dampingFactor);
                assert.strictEqual(schema.dampingFactor.type, "number");
                assert.strictEqual(schema.dampingFactor.default, 0.85);
                assert.strictEqual(schema.dampingFactor.min, 0);
                assert.strictEqual(schema.dampingFactor.max, 1);
            });

            it("has maxIterations option", () => {
                const schema = PageRankAlgorithm.getOptionsSchema();
                assert.isDefined(schema.maxIterations);
                assert.strictEqual(schema.maxIterations.type, "integer");
                assert.strictEqual(schema.maxIterations.default, 100);
                assert.strictEqual(schema.maxIterations.min, 1);
                assert.strictEqual(schema.maxIterations.max, 1000);
                assert.isTrue(schema.maxIterations.advanced);
            });

            it("has tolerance option", () => {
                const schema = PageRankAlgorithm.getOptionsSchema();
                assert.isDefined(schema.tolerance);
                assert.strictEqual(schema.tolerance.type, "number");
                assert.strictEqual(schema.tolerance.default, 1e-6);
                assert.isTrue(schema.tolerance.advanced);
            });
        });

        describe("option defaults", () => {
            it("uses default options when none provided", async () => {
                const graph = await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }],
                    edges: [{ srcId: "A", dstId: "B" }],
                });
                const algo = new PageRankAlgorithm(graph);
                await algo.run();

                // The damping factor a run used is in the caveats' notes, which is where a
                // reader is told what the numbers mean.
                assert.ok(algo.result?.summary().caveats.notes.some((note: string) => note.includes("0.85")));
            });
        });

        describe("option validation", () => {
            it("accepts valid dampingFactor", async () => {
                const graph = await createMockGraph();
                assert.doesNotThrow(() => new PageRankAlgorithm(graph, { dampingFactor: 0.9 }));
            });

            it("rejects dampingFactor > 1", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new PageRankAlgorithm(graph, { dampingFactor: 1.5 }),
                    OptionValidationError,
                    "must be <= 1",
                );
            });

            it("rejects dampingFactor < 0", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new PageRankAlgorithm(graph, { dampingFactor: -0.1 }),
                    OptionValidationError,
                    "must be >= 0",
                );
            });

            it("rejects non-integer maxIterations", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new PageRankAlgorithm(graph, { maxIterations: 100.5 }),
                    OptionValidationError,
                    "must be an integer",
                );
            });

            it("rejects maxIterations < 1", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new PageRankAlgorithm(graph, { maxIterations: 0 }),
                    OptionValidationError,
                    "must be >= 1",
                );
            });
        });

        describe("custom options in run()", () => {
            it("uses custom dampingFactor", async () => {
                const graph = await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }],
                    edges: [{ srcId: "A", dstId: "B" }],
                });
                const algo = new PageRankAlgorithm(graph, { dampingFactor: 0.5 });
                await algo.run();

                assert.ok(algo.result?.summary().caveats.notes.some((note: string) => note.includes("0.5")));
            });
        });

        describe("registry integration", () => {
            it("can be retrieved from registry with options", () => {
                const AlgoClass = Algorithm.getClass("graphty", "pagerank");
                assert.isNotNull(AlgoClass);
                assert.isTrue(AlgoClass.hasOptions());
                assert.isDefined(AlgoClass.getOptionsSchema().dampingFactor);
            });
        });
    });

    describe("LouvainAlgorithm", () => {
        describe("options schema", () => {
            it("has options defined", () => {
                assert.isTrue(LouvainAlgorithm.hasOptions());
            });

            it("has resolution option", () => {
                const schema = LouvainAlgorithm.getOptionsSchema();
                assert.isDefined(schema.resolution);
                assert.strictEqual(schema.resolution.type, "number");
                assert.strictEqual(schema.resolution.default, 1.0);
                assert.strictEqual(schema.resolution.min, 0.1);
                assert.strictEqual(schema.resolution.max, 5.0);
            });

            it("has maxIterations option", () => {
                const schema = LouvainAlgorithm.getOptionsSchema();
                assert.isDefined(schema.maxIterations);
                assert.strictEqual(schema.maxIterations.type, "integer");
                assert.strictEqual(schema.maxIterations.default, 100);
                assert.isTrue(schema.maxIterations.advanced);
            });

            it("has tolerance option", () => {
                const schema = LouvainAlgorithm.getOptionsSchema();
                assert.isDefined(schema.tolerance);
                assert.strictEqual(schema.tolerance.type, "number");
                assert.strictEqual(schema.tolerance.default, 1e-6);
                assert.isTrue(schema.tolerance.advanced);
            });
        });

        describe("option validation", () => {
            it("accepts valid resolution", async () => {
                const graph = await createMockGraph();
                assert.doesNotThrow(() => new LouvainAlgorithm(graph, { resolution: 2.0 }));
            });

            it("rejects resolution < 0.1", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new LouvainAlgorithm(graph, { resolution: 0.05 }),
                    OptionValidationError,
                    "must be >= 0.1",
                );
            });

            it("rejects resolution > 5.0", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new LouvainAlgorithm(graph, { resolution: 6.0 }),
                    OptionValidationError,
                    "must be <= 5",
                );
            });
        });

        describe("custom options in run()", () => {
            it("uses custom resolution", async () => {
                const graph = await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [
                        { srcId: "A", dstId: "B" },
                        { srcId: "B", dstId: "C" },
                    ],
                });
                // At resolution 2 no merge pays for itself, so each node is its own community; at
                // 0.1 the whole path is one.
                const algo = new LouvainAlgorithm(graph, { resolution: 2.0 });
                await algo.run();
                assert.deepStrictEqual(partitionOf(algo, ["A", "B", "C"], "louvain"), [["A"], ["B"], ["C"]]);

                const coarse = new LouvainAlgorithm(graph, { resolution: 0.1 });
                await coarse.run();
                assert.deepStrictEqual(partitionOf(coarse, ["A", "B", "C"], "louvain"), [["A", "B", "C"]]);
            });
        });
    });

    describe("LeidenAlgorithm", () => {
        describe("options schema", () => {
            it("has options defined", () => {
                assert.isTrue(LeidenAlgorithm.hasOptions());
            });

            it("has resolution option", () => {
                const schema = LeidenAlgorithm.getOptionsSchema();
                assert.isDefined(schema.resolution);
                assert.strictEqual(schema.resolution.type, "number");
                assert.strictEqual(schema.resolution.default, 1.0);
            });

            it("has randomSeed option", () => {
                const schema = LeidenAlgorithm.getOptionsSchema();
                assert.isDefined(schema.randomSeed);
                assert.strictEqual(schema.randomSeed.type, "integer");
                assert.strictEqual(schema.randomSeed.default, 42);
                assert.isTrue(schema.randomSeed.advanced);
            });

            it("has maxIterations option", () => {
                const schema = LeidenAlgorithm.getOptionsSchema();
                assert.isDefined(schema.maxIterations);
                assert.strictEqual(schema.maxIterations.type, "integer");
                assert.strictEqual(schema.maxIterations.default, 100);
            });

            it("has threshold option", () => {
                const schema = LeidenAlgorithm.getOptionsSchema();
                assert.isDefined(schema.threshold);
                assert.strictEqual(schema.threshold.type, "number");
                assert.strictEqual(schema.threshold.default, 1e-6);
                assert.isTrue(schema.threshold.advanced);
            });
        });

        describe("option validation", () => {
            it("accepts valid randomSeed", async () => {
                const graph = await createMockGraph();
                assert.doesNotThrow(() => new LeidenAlgorithm(graph, { randomSeed: 123 }));
            });

            it("rejects negative randomSeed", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new LeidenAlgorithm(graph, { randomSeed: -1 }),
                    OptionValidationError,
                    "must be >= 0",
                );
            });
        });

        describe("custom options in run()", () => {
            it("uses custom options", async () => {
                const graph = await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [
                        { srcId: "A", dstId: "B" },
                        { srcId: "B", dstId: "C" },
                    ],
                });
                const algo = new LeidenAlgorithm(graph, { resolution: 1.5, maxIterations: 50 });
                await algo.run();
                assert.deepStrictEqual(partitionOf(algo, ["A", "B", "C"], "leiden"), [["A"], ["B", "C"]]);

                // At resolution 0.1 the whole path is one community.
                const coarse = new LeidenAlgorithm(graph, { resolution: 0.1, maxIterations: 50 });
                await coarse.run();
                assert.deepStrictEqual(partitionOf(coarse, ["A", "B", "C"], "leiden"), [["A", "B", "C"]]);
            });
        });
    });

    describe("LabelPropagationAlgorithm", () => {
        describe("options schema", () => {
            it("has options defined", () => {
                assert.isTrue(LabelPropagationAlgorithm.hasOptions());
            });

            it("has maxIterations option", () => {
                const schema = LabelPropagationAlgorithm.getOptionsSchema();
                assert.isDefined(schema.maxIterations);
                assert.strictEqual(schema.maxIterations.type, "integer");
                assert.strictEqual(schema.maxIterations.default, 100);
                assert.strictEqual(schema.maxIterations.min, 1);
                assert.strictEqual(schema.maxIterations.max, 500);
            });

            it("has randomSeed option", () => {
                const schema = LabelPropagationAlgorithm.getOptionsSchema();
                assert.isDefined(schema.randomSeed);
                assert.strictEqual(schema.randomSeed.type, "integer");
                // No seed by default: synchronous passes, the definition a GPU runs too.
                assert.strictEqual(schema.randomSeed.default, null);
                assert.isTrue(schema.randomSeed.advanced);
            });
        });

        describe("option validation", () => {
            it("accepts valid maxIterations", async () => {
                const graph = await createMockGraph();
                assert.doesNotThrow(() => new LabelPropagationAlgorithm(graph, { maxIterations: 200 }));
            });

            it("rejects maxIterations < 1", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new LabelPropagationAlgorithm(graph, { maxIterations: 0 }),
                    OptionValidationError,
                    "must be >= 1",
                );
            });

            it("rejects maxIterations > 500", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new LabelPropagationAlgorithm(graph, { maxIterations: 600 }),
                    OptionValidationError,
                    "must be <= 500",
                );
            });
        });

        describe("custom options in run()", () => {
            it("uses custom maxIterations", async () => {
                const graph = await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
                    edges: [
                        { srcId: "A", dstId: "B" },
                        { srcId: "B", dstId: "C" },
                    ],
                });
                // The path needs three passes to see its labels stay put twice; a cap of one stops
                // after the first.
                const algo = new LabelPropagationAlgorithm(graph, { maxIterations: 50 });
                await algo.run();
                assert.strictEqual(algo.result?.summary().caveats.iterations, 3);
                assert.deepStrictEqual(partitionOf(algo, ["A", "B", "C"], "label-propagation"), [["A", "B", "C"]]);

                const capped = new LabelPropagationAlgorithm(graph, { maxIterations: 1 });
                await capped.run();
                assert.strictEqual(capped.result?.summary().caveats.iterations, 1);
            });
        });
    });

    describe("GirvanNewmanAlgorithm", () => {
        describe("options schema", () => {
            it("has options defined", () => {
                assert.isTrue(GirvanNewmanAlgorithm.hasOptions());
            });

            it("has maxCommunities option", () => {
                const schema = GirvanNewmanAlgorithm.getOptionsSchema();
                assert.isDefined(schema.maxCommunities);
                assert.strictEqual(schema.maxCommunities.type, "integer");
                assert.strictEqual(schema.maxCommunities.default, 0);
                assert.strictEqual(schema.maxCommunities.min, 0);
                assert.strictEqual(schema.maxCommunities.max, 100);
            });

            it("has minCommunitySize option", () => {
                const schema = GirvanNewmanAlgorithm.getOptionsSchema();
                assert.isDefined(schema.minCommunitySize);
                assert.strictEqual(schema.minCommunitySize.type, "integer");
                assert.strictEqual(schema.minCommunitySize.default, 1);
                assert.strictEqual(schema.minCommunitySize.min, 1);
                assert.isTrue(schema.minCommunitySize.advanced);
            });
        });

        describe("option validation", () => {
            it("accepts maxCommunities = 0 (no limit)", async () => {
                const graph = await createMockGraph();
                assert.doesNotThrow(() => new GirvanNewmanAlgorithm(graph, { maxCommunities: 0 }));
            });

            it("accepts valid maxCommunities", async () => {
                const graph = await createMockGraph();
                assert.doesNotThrow(() => new GirvanNewmanAlgorithm(graph, { maxCommunities: 5 }));
            });

            it("rejects negative maxCommunities", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new GirvanNewmanAlgorithm(graph, { maxCommunities: -1 }),
                    OptionValidationError,
                    "must be >= 0",
                );
            });

            it("rejects minCommunitySize < 1", async () => {
                const graph = await createMockGraph();
                assert.throws(
                    () => new GirvanNewmanAlgorithm(graph, { minCommunitySize: 0 }),
                    OptionValidationError,
                    "must be >= 1",
                );
            });
        });

        describe("custom options in run()", () => {
            it("uses custom options", async () => {
                // A -- B -- C -- D: B-C carries the most shortest paths, so the first cut splits
                // the path in half.
                const graph = await createMockGraph({
                    nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
                    edges: [
                        { srcId: "A", dstId: "B" },
                        { srcId: "B", dstId: "C" },
                        { srcId: "C", dstId: "D" },
                    ],
                });
                const ids = ["A", "B", "C", "D"];
                const algo = new GirvanNewmanAlgorithm(graph, { maxCommunities: 2 });
                await algo.run();
                assert.deepStrictEqual(partitionOf(algo, ids, "girvan-newman"), [
                    ["A", "B"],
                    ["C", "D"],
                ]);

                // A cap of one keeps the path whole.
                const whole = new GirvanNewmanAlgorithm(graph, { maxCommunities: 1 });
                await whole.run();
                assert.deepStrictEqual(partitionOf(whole, ids, "girvan-newman"), [["A", "B", "C", "D"]]);
            });
        });
    });
});
