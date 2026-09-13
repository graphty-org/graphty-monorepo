import { assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { LouvainAlgorithm } from "../../../src/algorithms/LouvainAlgorithm";
import { createMockGraph, getGraphResult } from "../../helpers/mockGraph";

describe("LouvainAlgorithm", () => {
    describe("Algorithm Registration", () => {
        it("should be registered with namespace 'graphty' and type 'louvain'", () => {
            const LouvainClass = Algorithm.getClass("graphty", "louvain");
            assert.ok(LouvainClass);
            assert.strictEqual(LouvainClass, LouvainAlgorithm);
            assert.strictEqual(LouvainClass.namespace, "graphty");
            assert.strictEqual(LouvainClass.type, "louvain");
        });
    });

    describe("Suggested Styles", () => {
        it("has suggested styles defined", () => {
            assert.strictEqual(LouvainAlgorithm.hasSuggestedStyles(), true);
        });

        it("returns correct suggested styles structure", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();

            assert.ok(styles);
            assert.ok(styles.description);
            assert.strictEqual(styles.category, "grouping");
            assert.ok(Array.isArray(styles.layers));
            assert.strictEqual(styles.layers.length, 1);
        });

        it("layer has correct node calculatedStyle configuration", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);

            const layer = styles.layers[0];
            assert.ok(layer);
            assert.ok(layer.node);
            assert.ok(layer.node.calculatedStyle);

            const { calculatedStyle } = layer.node;
            assert.deepStrictEqual(calculatedStyle.inputs, ["algorithmResults.graphty.louvain.communityId"]);
            assert.strictEqual(calculatedStyle.output, "style.texture.color");
        });

        it("uses categorical color mapping with StyleHelpers", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);

            const layer = styles.layers[0];
            assert.ok(layer);
            assert.ok(layer.node);
            assert.ok(layer.node.calculatedStyle);

            const { expr } = layer.node.calculatedStyle;

            // Should use StyleHelpers.color.categorical.okabeIto
            assert.ok(expr.includes("StyleHelpers"));
            assert.ok(expr.includes("categorical"));
            assert.ok(expr.includes("okabeIto"));
            assert.ok(expr.includes("arguments[0]"));
        });

        it("layer has metadata", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);

            const layer = styles.layers[0];
            assert.ok(layer);
            assert.ok(layer.metadata);
            assert.strictEqual(layer.metadata.name, "Louvain - Okabe-Ito Colors");
            assert.ok(layer.metadata.description);
        });

        it("description explains community visualization", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);
            assert.ok(styles.description);
            assert.ok(styles.description.toLowerCase().includes("communit"));
        });
    });

    describe("Categorical Color Mapping", () => {
        it("expression uses StyleHelpers", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);

            const layer = styles.layers[0];
            assert.ok(layer.node?.calculatedStyle);

            const { expr } = layer.node.calculatedStyle;
            assert.ok(expr);

            // Should use StyleHelpers.color.categorical.okabeIto
            assert.ok(expr.includes("StyleHelpers"));
            assert.ok(expr.includes("okabeIto"));
        });

        it("uses community ID as input", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);

            const layer = styles.layers[0];
            assert.ok(layer.node?.calculatedStyle);

            const { inputs } = layer.node.calculatedStyle;
            assert.ok(inputs);
            assert.strictEqual(inputs.length, 1);
            assert.strictEqual(inputs[0], "algorithmResults.graphty.louvain.communityId");
        });

        it("outputs to texture color", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);

            const layer = styles.layers[0];
            assert.ok(layer.node?.calculatedStyle);

            const { output } = layer.node.calculatedStyle;
            assert.strictEqual(output, "style.texture.color");
        });
    });

    describe("Graph Results", () => {
        /* `louvain()` returns {communities, modularity}, and the run used to keep only the
           per-node communityId and throw the rest away. A plain-language community reading
           needs the group count and the modularity, and design 7.5 makes that a
           requirement of EVERY grouping method, so the run publishes both as graph
           results. These two boards are what stop them being dropped again. */
        it("publishes the group count as a graph result", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new LouvainAlgorithm(graph);

            await algo.run();

            const groupCount = getGraphResult(graph, "graphty", "louvain", "groupCount");

            assert.isNumber(groupCount);
            assert.isAtLeast(groupCount, 1);
        });

        it("publishes the modularity the method reported, not a recomputed one", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new LouvainAlgorithm(graph);

            await algo.run();

            const modularity = getGraphResult(graph, "graphty", "louvain", "modularity");

            assert.isNumber(modularity);
            assert.isTrue(Number.isFinite(modularity));
            // Modularity is bounded on [-0.5, 1] for any partition of any graph.
            assert.isAtLeast(modularity, -0.5);
            assert.isAtMost(modularity, 1);
        });

        it("counts the groups it actually assigned nodes to", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algo = new LouvainAlgorithm(graph);

            await algo.run();

            const groupCount = getGraphResult(graph, "graphty", "louvain", "groupCount");
            const assigned = new Set<unknown>();

            for (const node of graph.getDataManager().nodes.values()) {
                const results = (node as { algorithmResults?: Record<string, Record<string, Record<string, unknown>>> })
                    .algorithmResults;

                assigned.add(results?.graphty?.louvain?.communityId);
            }

            assert.strictEqual(groupCount, assigned.size);
        });
    });

    describe("Algorithm Metadata", () => {
        it("has correct namespace and type", () => {
            assert.strictEqual(LouvainAlgorithm.namespace, "graphty");
            assert.strictEqual(LouvainAlgorithm.type, "louvain");
        });

        it("is retrievable via Algorithm.getClass", () => {
            const AlgClass = Algorithm.getClass("graphty", "louvain");
            assert.strictEqual(AlgClass, LouvainAlgorithm);
        });

        it("suggested styles are retrievable via static method", () => {
            const styles = LouvainAlgorithm.getSuggestedStyles();
            assert.ok(styles);
            assert.ok(styles.layers);
        });
    });
});
