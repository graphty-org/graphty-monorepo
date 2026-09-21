import { assert, describe, it } from "vitest";

import { BetweennessCentralityAlgorithm } from "../../../src/algorithms/BetweennessCentralityAlgorithm";
import { ClosenessCentralityAlgorithm } from "../../../src/algorithms/ClosenessCentralityAlgorithm";
import { DegreeAlgorithm } from "../../../src/algorithms/DegreeAlgorithm";
import { EigenvectorCentralityAlgorithm } from "../../../src/algorithms/EigenvectorCentralityAlgorithm";
import { HITSAlgorithm } from "../../../src/algorithms/HITSAlgorithm";
import { KatzCentralityAlgorithm } from "../../../src/algorithms/KatzCentralityAlgorithm";
import type { MetricAlgorithm } from "../../../src/algorithms/metrics/MetricAlgorithm";
import { PageRankAlgorithm } from "../../../src/algorithms/PageRankAlgorithm";
import { BUILT_IN_ALGORITHMS } from "../../../src/catalog/algorithms";
import type { Graph } from "../../../src/Graph";
import { checkShapeContract, type RunResult } from "../../../src/session/results";
import { createMockGraph } from "../../helpers/mockGraph";

/** The seven metrics this file covers, with the catalogue key each one must agree with. */
const METRICS = [
    { key: "degree", make: (g: Graph): MetricAlgorithm => new DegreeAlgorithm(g) },
    { key: "betweenness", make: (g: Graph): MetricAlgorithm => new BetweennessCentralityAlgorithm(g) },
    { key: "closeness", make: (g: Graph): MetricAlgorithm => new ClosenessCentralityAlgorithm(g) },
    { key: "pagerank", make: (g: Graph): MetricAlgorithm => new PageRankAlgorithm(g) },
    { key: "eigenvector", make: (g: Graph): MetricAlgorithm => new EigenvectorCentralityAlgorithm(g) },
    { key: "katz", make: (g: Graph): MetricAlgorithm => new KatzCentralityAlgorithm(g) },
    { key: "hits", make: (g: Graph): MetricAlgorithm => new HITSAlgorithm(g) },
] as const;

/** Every graph-level field the node-metric shape promises. */
const GRAPH_FIELDS = ["min", "max", "median", "mean", "measured", "normalization", "tiedAtMin"] as const;

/**
 * Run one metric over the Les Miserables fixture and hand back what it published.
 * @param make - Builds the algorithm.
 * @returns The result.
 */
async function runMetric(make: (g: Graph) => MetricAlgorithm): Promise<RunResult> {
    const graph = await createMockGraph({ dataPath: "./data4.json" });
    const algorithm = make(graph);
    await algorithm.run();

    const { result } = algorithm;
    assert.isDefined(result, "a metric run over a non-empty graph publishes a result");

    return result;
}

describe("metric results", () => {
    describe("the catalogue and the run agree", () => {
        for (const metric of METRICS) {
            it(`${metric.key} publishes exactly the fields the catalogue declares`, async () => {
                const declared = BUILT_IN_ALGORITHMS.find((entry) => entry.key === metric.key);
                assert.isDefined(declared, `the catalogue has an entry for ${metric.key}`);

                const result = await runMetric(metric.make);

                assert.strictEqual(result.shape, declared.shape);
                assert.deepStrictEqual(result.fields, declared.fields);
            });

            it(`${metric.key} keeps the node-metric shape contract`, async () => {
                const result = await runMetric(metric.make);
                const violations = checkShapeContract("node-metric", result.fields);

                assert.deepStrictEqual(
                    violations.map((violation) => violation.reason),
                    [],
                );
            });
        }
    });

    describe("the uniform fields are filled", () => {
        for (const metric of METRICS) {
            it(`${metric.key} gives every measured node a value, a rank and a percentile`, async () => {
                const result = await runMetric(metric.make);
                const ranking = result.ranking("value");

                assert.isAbove(ranking.length, 0);

                for (const entry of ranking) {
                    const record = result.node(entry.id);
                    assert.isDefined(record);
                    assert.isNumber(record.value);
                    assert.isNumber(record.rank);
                    assert.isNumber(record.percentile);
                    assert.isAtLeast(record.rank as number, 1);
                    assert.isAtLeast(record.percentile as number, 0);
                    assert.isAtMost(record.percentile as number, 1);
                }
            });

            it(`${metric.key} publishes every graph-level field the shape promises`, async () => {
                const result = await runMetric(metric.make);

                for (const field of GRAPH_FIELDS) {
                    assert.isDefined(result.graph[field], `${metric.key} publishes ${field}`);
                }

                assert.isNumber(result.graph.min);
                assert.isNumber(result.graph.max);
                assert.isNumber(result.graph.median);
                assert.isNumber(result.graph.mean);
                assert.isNumber(result.graph.measured);
                assert.isNumber(result.graph.tiedAtMin);
                assert.isString(result.graph.normalization);
            });
        }
    });

    describe("betweenness and closeness publish a range", () => {
        // 1.10 published no graph-level result for either, which is why the one consumer scanned
        // every node for a maximum of its own.
        it("betweenness publishes a minimum and a maximum", async () => {
            const result = await runMetric((g) => new BetweennessCentralityAlgorithm(g));

            assert.isNumber(result.graph.min);
            assert.isNumber(result.graph.max);
            assert.isAtLeast(result.graph.max as number, result.graph.min as number);
            assert.strictEqual(result.graph.max, result.column("value").max);
        });

        it("closeness publishes a minimum and a maximum", async () => {
            const result = await runMetric((g) => new ClosenessCentralityAlgorithm(g));

            assert.isNumber(result.graph.min);
            assert.isNumber(result.graph.max);
            assert.isAtLeast(result.graph.max as number, result.graph.min as number);
            assert.strictEqual(result.graph.max, result.column("value").max);
        });
    });

    describe("normalization is stated rather than encoded in a field name", () => {
        it("betweenness publishes raw counts", async () => {
            const result = await runMetric((g) => new BetweennessCentralityAlgorithm(g));
            assert.strictEqual(result.graph.normalization, "none");
        });

        it("closeness publishes raw scores", async () => {
            const result = await runMetric((g) => new ClosenessCentralityAlgorithm(g));
            assert.strictEqual(result.graph.normalization, "none");
        });

        it("pagerank publishes raw ranks", async () => {
            const result = await runMetric((g) => new PageRankAlgorithm(g));
            assert.strictEqual(result.graph.normalization, "none");
        });

        it("degree publishes raw counts", async () => {
            const result = await runMetric((g) => new DegreeAlgorithm(g));
            assert.strictEqual(result.graph.normalization, "none");
        });

        it("eigenvector states that its default scaling is min-max", async () => {
            const result = await runMetric((g) => new EigenvectorCentralityAlgorithm(g));
            assert.strictEqual(result.graph.normalization, "min-max");
        });

        it("eigenvector states that nothing scaled it when asked not to normalize", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algorithm = new EigenvectorCentralityAlgorithm(graph, { normalized: false });
            await algorithm.run();

            assert.strictEqual(algorithm.result?.graph.normalization, "none");
        });

        it("katz states that its default scaling is min-max", async () => {
            const result = await runMetric((g) => new KatzCentralityAlgorithm(g));
            assert.strictEqual(result.graph.normalization, "min-max");
        });
    });

    describe("caveats say what was measured", () => {
        it("pagerank reports the convergence it measured", async () => {
            const result = await runMetric((g) => new PageRankAlgorithm(g));
            const { caveats } = result.summary();

            // 77 nodes, so the exact power iteration ran and both figures are measurements.
            assert.strictEqual(caveats.method, "power-iteration");
            assert.isBoolean(caveats.converged);
            assert.isNumber(caveats.iterations);
        });

        it("pagerank says nothing about convergence when the delta method ran", async () => {
            // The delta method reports `iterations: maxIterations` and `converged: true` whatever
            // happened, so a run that took it cannot answer either question.
            const nodes = Array.from({ length: 150 }, (unused, index) => ({ id: `n${String(index)}` }));
            const edges = nodes.slice(1).map((node, index) => ({ srcId: nodes[index].id, dstId: node.id }));
            const graph = await createMockGraph({ nodes, edges });
            const algorithm = new PageRankAlgorithm(graph);
            await algorithm.run();

            const { result } = algorithm;
            assert.isDefined(result);

            const { caveats } = result.summary();
            assert.strictEqual(caveats.method, "delta-pagerank");
            assert.isUndefined(caveats.converged);
            assert.isUndefined(caveats.iterations);
        });

        it("the iterative metrics do not claim to have converged", async () => {
            for (const make of [
                (g: Graph): MetricAlgorithm => new EigenvectorCentralityAlgorithm(g),
                (g: Graph): MetricAlgorithm => new KatzCentralityAlgorithm(g),
                (g: Graph): MetricAlgorithm => new HITSAlgorithm(g),
            ]) {
                const result = await runMetric(make);
                assert.isUndefined(result.summary().caveats.converged);
            }
        });

        it("every metric names its method, its direction and its precision", async () => {
            for (const metric of METRICS) {
                const result = await runMetric(metric.make);
                const { caveats } = result.summary();

                assert.isNotEmpty(caveats.method, `${metric.key} names its method`);
                assert.oneOf(caveats.direction, ["directed", "undirected", "as-loaded"]);
                assert.strictEqual(caveats.precision, "f64");
                assert.isNotEmpty(caveats.notes, `${metric.key} says what qualifies its numbers`);
            }
        });

        it("pagerank names the weight attribute it read", async () => {
            const graph = await createMockGraph({ dataPath: "./data4.json" });
            const algorithm = new PageRankAlgorithm(graph, { weight: "weight" });
            await algorithm.run();

            assert.deepStrictEqual(algorithm.result?.summary().caveats.weight, {
                attribute: "weight",
                meaning: "strength",
            });
        });
    });

    describe("the result is what the graph is measured against", () => {
        it("counts the nodes and edges the run looked at", async () => {
            const result = await runMetric((g) => new DegreeAlgorithm(g));

            assert.strictEqual(result.measured.nodes, 77);
            assert.strictEqual(result.measured.edges, 254);
        });

        it("publishes nothing when there is nothing to measure", async () => {
            const graph = await createMockGraph();
            const algorithm = new DegreeAlgorithm(graph);
            await algorithm.run();

            assert.isUndefined(algorithm.result);
        });

        it("hits publishes the two halves beside their average", async () => {
            const result = await runMetric((g) => new HITSAlgorithm(g));
            const [top] = result.ranking("value", 1);
            const record = result.node(top.id);

            assert.isDefined(record);
            assert.isNumber(record.hub);
            assert.isNumber(record.authority);
            assert.approximately(record.value as number, ((record.hub as number) + (record.authority as number)) / 2, 1e-12);
        });

        it("degree publishes the two directions beside their total", async () => {
            const result = await runMetric((g) => new DegreeAlgorithm(g));
            const [top] = result.ranking("value", 1);
            const record = result.node(top.id);

            assert.isDefined(record);
            assert.strictEqual(record.value, (record.inDegree as number) + (record.outDegree as number));
        });
    });
});
