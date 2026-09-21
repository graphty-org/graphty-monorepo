import { describe, expect, it } from "vitest";

import { createFakeSession } from "../../../../test/fakeSession";
import type { ElementGraph, ElementNodeLike } from "../elementBridge";
import {
    LOG_X_RATIO_THRESHOLD,
    METRIC_DISTRIBUTION_MAX_BINS,
    metricDistribution,
    NODE_METRIC_DEFINITIONS,
    NODE_METRIC_IDS,
    type NodeMetricId,
    rankingFromDegreeResults,
    readNodeMetricResults,
    runNodeMetric,
} from "../nodeMetrics";
import type { DegreeResults } from "../runs";

/** A node the stub can write results onto. */
interface StubNode {
    /** The node's id. */
    id: number | string;
    /** Nested `algorithmResults.<namespace>.<type>.<name>`, written by the stub's runs. */
    algorithmResults?: Record<string, unknown>;
}

/** What a stub run writes, standing in for the real centrality algorithms. */
interface StubPlan {
    /** Which metric the stub's run writes. Defaults to degree. */
    readonly metric?: NodeMetricId;
    /** The metric's raw value per node id. A node missing here is left unmeasured. */
    readonly values?: Readonly<Record<string, number>>;
    /** Whether the stub writes the metric's *Pct field, as the real algorithms do. */
    readonly writeFraction?: boolean;
    /** Graph-level results the run publishes, e.g. PageRank's converged and iterations. */
    readonly graphLevel?: Readonly<Record<string, unknown>>;
    /** Whether the data manager reports graphResults at all. A cleared DataManager does not. */
    readonly omitGraphResults?: boolean;
}

/** The stub and the calls a test wants to see. */
interface Stub {
    /** The graph under test. */
    readonly graph: ElementGraph;
    /** Every (namespace, type) pair the caller ran, in order. */
    readonly runs: [string, string][];
    /** The third argument of every run, so a test can see that none was passed. */
    readonly runOptions: unknown[];
}

/**
 * Writes a nested value, the way the element's `deepSet` does.
 * @param root - the object to write into.
 * @param path - the keys to walk, creating objects as needed.
 * @param value - the value to set at the end of the path.
 */
function writePath(root: Record<string, unknown>, path: readonly string[], value: unknown): void {
    let current = root;
    for (let index = 0; index < path.length - 1; index++) {
        const key = path[index];
        const next = current[key];
        if (typeof next !== "object" || next === null) {
            current[key] = {};
        }

        current = current[key] as Record<string, unknown>;
    }

    current[path[path.length - 1]] = value;
}

/**
 * An element graph whose `runAlgorithm` writes exactly what the real degree, PageRank
 * and betweenness algorithms write -- the raw value and its normalised field per node
 * under `algorithmResults`, graph-level values under the data manager's `graphResults`.
 * @param ids - the node ids the graph holds.
 * @param plan - what a run should write.
 * @returns the stub.
 */
function makeStub(ids: (number | string)[], plan: StubPlan = {}): Stub {
    const nodes: StubNode[] = ids.map((id) => ({ id }));
    const graphResults: Record<string, unknown> = {};
    const runs: [string, string][] = [];
    const runOptions: unknown[] = [];
    const definition = NODE_METRIC_DEFINITIONS[plan.metric ?? "degree"];

    /**
     * Writes the metric's per-node results, normalising the way the metric's own
     * algorithm does, then the graph-level results the plan asks for.
     */
    function runMetric(): void {
        const values = plan.values ?? {};
        const measured = Object.values(values);
        const maxValue = measured.length > 0 ? Math.max(...measured) : 0;
        const minValue = measured.length > 0 ? Math.min(...measured) : 0;
        const range = maxValue - minValue;

        for (const node of nodes) {
            const value = values[String(node.id)];
            if (value === undefined) {
                continue;
            }

            node.algorithmResults ??= {};
            writePath(node.algorithmResults, [definition.namespace, definition.type, definition.valueField], value);
            if (plan.writeFraction === false) {
                continue;
            }

            let fraction = 0;
            if (definition.normalisation === "max") {
                fraction = maxValue > 0 ? value / maxValue : 0;
            } else {
                fraction = range > 0 ? (value - minValue) / range : 0;
            }

            writePath(
                node.algorithmResults,
                [definition.namespace, definition.type, definition.fractionField],
                fraction,
            );
        }

        for (const [key, published] of Object.entries(plan.graphLevel ?? {})) {
            writePath(graphResults, [definition.namespace, definition.type, key], published);
        }
    }

    /* Through the SESSION, which is the door that returns the run's id: a style layer scopes
       itself to the run whose column it reads. The catalogue key and the 1.10 type are the
       same string for all three metrics, so the recorded pairs read as they did. */
    const session = createFakeSession();

    session.onStart((type) => {
        runs.push([definition.namespace, type]);
        runOptions.push(undefined);

        if (type === definition.type) {
            runMetric();
        }
    });

    const graph: ElementGraph = {
        runAlgorithm: () => Promise.resolve(),
        getNodes: () => nodes as readonly ElementNodeLike[],
        getDataManager: () => ({
            ...(plan.omitGraphResults === true ? {} : { graphResults }),
        }),
        getSession: () => session.session,
    };

    return { graph, runs, runOptions };
}

/**
 * The value span one banded bin's label names, e.g. "0.000001 to 0.0000018 score: 3 nodes"
 * -> 8e-7. A bin's label is the only place `metricDistribution` publishes its band edges,
 * and the last band's width over the first band's is the direct measure of whether the
 * bands are log-spaced: a linear layout gives exactly 1.
 * @param label - the bin's label.
 * @returns the span, or 0 when the label names a single value rather than a range.
 */
function bandSpan(label: string): number {
    const match = /^(\S+) to (\S+) /.exec(label);
    if (match === null) {
        return 0;
    }

    return Number(match[2].replace(/,/g, "")) - Number(match[1].replace(/,/g, ""));
}

describe("NODE_METRIC_DEFINITIONS", () => {
    it("addresses betweenness as graphty:betweenness, not betweenness-centrality", () => {
        expect(NODE_METRIC_DEFINITIONS.betweenness.namespace).toBe("graphty");
        expect(NODE_METRIC_DEFINITIONS.betweenness.type).toBe("betweenness");
    });

    it("pairs every plain name with its technical name (spec 6.3)", () => {
        expect(NODE_METRIC_IDS).toEqual(["degree", "pagerank", "betweenness"]);
        expect(NODE_METRIC_IDS.map((id) => NODE_METRIC_DEFINITIONS[id].plainName)).toEqual([
            "Most connected",
            "Influence",
            "Bridges",
        ]);
        expect(NODE_METRIC_IDS.map((id) => NODE_METRIC_DEFINITIONS[id].technicalName)).toEqual([
            "Degree centrality",
            "PageRank",
            "Betweenness centrality",
        ]);
    });

    it("records that the two max-normalised fields are not the min-max one", () => {
        expect(NODE_METRIC_DEFINITIONS.degree.normalisation).toBe("max");
        expect(NODE_METRIC_DEFINITIONS.pagerank.normalisation).toBe("max");
        expect(NODE_METRIC_DEFINITIONS.betweenness.normalisation).toBe("min-max");
        expect(NODE_METRIC_DEFINITIONS.degree.fractionField).toBe("degreePct");
        expect(NODE_METRIC_DEFINITIONS.pagerank.fractionField).toBe("rankPct");
        expect(NODE_METRIC_DEFINITIONS.betweenness.fractionField).toBe("scorePct");
    });
});

describe("readNodeMetricResults", () => {
    it("ranks degree highest first, with the max, the min, the lower median and the tie count", async () => {
        const stub = makeStub(["a", "b", "c", "d"], { values: { a: 2, b: 9, c: 5, d: 5 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual(["b", "c", "d", "a"]);
        expect(ranking.byValueDescending.map((reading) => reading.label)).toEqual(["b", "c", "d", "a"]);
        expect(ranking.byValueDescending.map((reading) => reading.value)).toEqual([9, 5, 5, 2]);
        expect(ranking.nodeCount).toBe(4);
        expect(ranking.rankedCount).toBe(4);
        expect(ranking.maxValue).toBe(9);
        expect(ranking.minValue).toBe(2);
        expect(ranking.medianValue).toBe(5);
        expect(ranking.tiedAtMinimum).toBe(1);
        expect(ranking.maxFraction).toBe(1);
        expect(ranking.medianFraction).toBe(5 / 9);
        expect(ranking.minFraction).toBe(2 / 9);
    });

    it("takes the lower median on an even count, so a degree median is a degree some node has", async () => {
        const stub = makeStub(["a", "b", "c", "d"], { values: { a: 1, b: 2, c: 3, d: 4 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.medianValue).toBe(2);
    });

    it("counts the minimum's ties, which is what the Zero or near-zero line reads", async () => {
        const stub = makeStub(["a", "b", "c", "d", "e"], { values: { a: 9, b: 0, c: 0, d: 0, e: 4 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.minValue).toBe(0);
        expect(ranking.tiedAtMinimum).toBe(3);
    });

    it("skips a node the run did not measure rather than reading it as zero", async () => {
        const stub = makeStub(["a", "b", "unmeasured"], { values: { a: 3, b: 1 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.nodeCount).toBe(3);
        expect(ranking.rankedCount).toBe(2);
        expect(ranking.rankedCount).toBeLessThan(ranking.nodeCount);
        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual(["a", "b"]);
        expect(ranking.byValueDescending.some((reading) => reading.value === 0)).toBe(false);
        expect(ranking.minValue).toBe(1);
    });

    it("breaks ties by id, stably, over two calls", async () => {
        const stub = makeStub(["zeta", "alpha", "mid"], { values: { zeta: 4, alpha: 4, mid: 4 } });

        const first = await runNodeMetric(stub.graph, "degree");
        const second = readNodeMetricResults(stub.graph, "degree");

        expect(first.byValueDescending.map((reading) => reading.id)).toEqual(["alpha", "mid", "zeta"]);
        expect(second.byValueDescending.map((reading) => reading.id)).toEqual(["alpha", "mid", "zeta"]);
    });

    /*
     * The three boards below exist because every fixture in this file used to use STRING
     * ids, so the module could stringify a node id and no test would notice. graphty-
     * element's NodeIdType is `number | string`, and GMLDataSource parses /^-?\d+$/ with
     * parseInt, so Karate Club and College football -- two of the three shipped samples --
     * hold NUMBER ids. A ranking that printed them and threw the originals away handed the
     * shell a key that DataManager.nodes.get() could never match.
     */
    it("keeps the element's own numeric id and prints a label beside it", async () => {
        const stub = makeStub([1, 2, 10], { values: { 1: 2, 2: 9, 10: 5 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual([2, 10, 1]);
        expect(ranking.byValueDescending.every((reading) => typeof reading.id === "number")).toBe(true);
        expect(ranking.byValueDescending.map((reading) => reading.label)).toEqual(["2", "10", "1"]);
    });

    it("breaks a numeric tie by the printed id, the same rule the degree pass uses", async () => {
        const stub = makeStub([2, 10, 1], { values: { 1: 4, 2: 4, 10: 4 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual([1, 10, 2]);
        expect(ranking.byValueDescending.map((reading) => reading.label)).toEqual(["1", "10", "2"]);
    });

    it("keeps a mixed numeric and string id set exactly as the element holds it", async () => {
        const stub = makeStub([7, "b"], { values: { 7: 3, b: 1 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual([7, "b"]);
        expect(ranking.byValueDescending.map((reading) => typeof reading.id)).toEqual(["number", "string"]);
        expect(ranking.byValueDescending.map((reading) => reading.label)).toEqual(["7", "b"]);
    });

    it("derives a missing degree fraction as value over the maximum", async () => {
        const stub = makeStub(["a", "b", "c"], { values: { a: 10, b: 5, c: 4 }, writeFraction: false });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect(ranking.byValueDescending.map((reading) => reading.fraction)).toEqual([1, 0.5, 0.4]);
    });

    it("derives a missing betweenness fraction min-max, so the lowest is exactly 0 and the highest exactly 1", async () => {
        const stub = makeStub(["a", "b", "c"], {
            metric: "betweenness",
            values: { a: 10, b: 6, c: 2 },
            writeFraction: false,
        });

        const ranking = await runNodeMetric(stub.graph, "betweenness");

        expect(ranking.byValueDescending.map((reading) => reading.fraction)).toEqual([1, 0.5, 0]);
        expect(ranking.maxFraction).toBe(1);
        expect(ranking.minFraction).toBe(0);
    });

    it("derives every betweenness fraction as 0 rather than NaN when every score is equal", async () => {
        const stub = makeStub(["a", "b", "c"], {
            metric: "betweenness",
            values: { a: 4, b: 4, c: 4 },
            writeFraction: false,
        });

        const ranking = await runNodeMetric(stub.graph, "betweenness");

        expect(ranking.byValueDescending.map((reading) => reading.fraction)).toEqual([0, 0, 0]);
        expect(ranking.byValueDescending.every((reading) => Number.isFinite(reading.fraction))).toBe(true);
    });

    it("keeps the fraction the element published rather than deriving its own", async () => {
        const stub = makeStub(["a", "b"], { metric: "pagerank", values: { a: 0.4, b: 0.1 } });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect(ranking.byValueDescending.map((reading) => reading.fraction)).toEqual([1, 0.25]);
    });

    it("returns an empty ranking with zeroes for a graph with nothing measured", () => {
        const ranking = readNodeMetricResults(makeStub([]).graph, "degree");

        expect(ranking).toEqual({
            metric: "degree",
            byValueDescending: [],
            nodeCount: 0,
            rankedCount: 0,
            maxValue: 0,
            minValue: 0,
            medianValue: 0,
            maxFraction: 0,
            minFraction: 0,
            medianFraction: 0,
            tiedAtMinimum: 0,
        });
    });

    it("reads nothing at all before the metric has run", () => {
        const stub = makeStub(["a", "b"], { metric: "betweenness", values: { a: 1, b: 2 } });

        const ranking = readNodeMetricResults(stub.graph, "betweenness");

        expect(ranking.rankedCount).toBe(0);
        expect(ranking.nodeCount).toBe(2);
    });
});

describe("runNodeMetric", () => {
    it("runs graphty:betweenness by that exact registry string and passes no options", async () => {
        const stub = makeStub(["a", "b"], { metric: "betweenness", values: { a: 1, b: 2 } });

        await runNodeMetric(stub.graph, "betweenness");

        expect(stub.runs).toEqual([["graphty", "betweenness"]]);
        expect(stub.runs[0][1]).not.toBe("betweenness-centrality");
        expect(stub.runOptions).toEqual([undefined]);
    });

    it("runs graphty:pagerank and reads the ranking back", async () => {
        const stub = makeStub(["a", "b"], { metric: "pagerank", values: { a: 0.4, b: 0.1 } });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect(stub.runs).toEqual([["graphty", "pagerank"]]);
        expect(stub.runOptions).toEqual([undefined]);
        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual(["a", "b"]);
    });
});

/*
 * The element publishes `converged` and `iterations` at graph level for PageRank, and
 * only one of the two values `converged` can take is a measurement. pagerank.ts:144-148
 * returns a hard-coded `converged: true` with `iterations: maxIterations` for every graph
 * over 100 nodes (the delta path, which is the path `runNodeMetric` always takes because
 * it passes no options), while `converged: false` can only come from the standard power
 * iteration that actually compared maxDiff against tolerance. These boards used to assert
 * the opposite of what they now assert: they fed a stub publishing `converged: true,
 * iterations: 12`, watched the module carry both, and called that proof of a measurement.
 */
describe("PageRank convergence", () => {
    it("drops a published converged:true, which upstream hard-codes rather than measures", async () => {
        const stub = makeStub(["a", "b"], {
            metric: "pagerank",
            values: { a: 0.4, b: 0.1 },
            graphLevel: { converged: true, iterations: 12 },
        });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect("converged" in ranking).toBe(false);
        expect("iterations" in ranking).toBe(false);
        expect(ranking.rankedCount).toBe(2);
    });

    it("keeps a published converged:false, the one value only a real power iteration reports", async () => {
        const stub = makeStub(["a"], {
            metric: "pagerank",
            values: { a: 0.4 },
            graphLevel: { converged: false, iterations: 100 },
        });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect(ranking.converged).toBe(false);
        expect(ranking.iterations).toBe(100);
    });

    it("keeps the failure without an iteration count when the element published no number", async () => {
        const stub = makeStub(["a"], {
            metric: "pagerank",
            values: { a: 0.4 },
            graphLevel: { converged: false, iterations: "100" },
        });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect(ranking.converged).toBe(false);
        expect("iterations" in ranking).toBe(false);
    });

    it("carries neither field when the element published nothing at graph level", async () => {
        const stub = makeStub(["a", "b"], { metric: "pagerank", values: { a: 0.4, b: 0.1 } });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect("converged" in ranking).toBe(false);
        expect("iterations" in ranking).toBe(false);
    });

    it("carries neither field when the published flag is the wrong type", async () => {
        const stub = makeStub(["a"], {
            metric: "pagerank",
            values: { a: 0.4 },
            graphLevel: { converged: "no", iterations: 100 },
        });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect("converged" in ranking).toBe(false);
        expect("iterations" in ranking).toBe(false);
    });

    it("carries neither field when the data manager reports no graphResults at all", async () => {
        const stub = makeStub(["a"], {
            metric: "pagerank",
            values: { a: 0.4 },
            graphLevel: { converged: false, iterations: 9 },
            omitGraphResults: true,
        });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect(ranking.rankedCount).toBe(1);
        expect("converged" in ranking).toBe(false);
        expect("iterations" in ranking).toBe(false);
    });

    it("never carries convergence on a metric that does not publish it", async () => {
        const stub = makeStub(["a"], { values: { a: 3 }, graphLevel: { converged: false, iterations: 4 } });

        const ranking = await runNodeMetric(stub.graph, "degree");

        expect("converged" in ranking).toBe(false);
        expect("iterations" in ranking).toBe(false);
    });
});

describe("rankingFromDegreeResults", () => {
    const held: DegreeResults = {
        byDegreeDescending: [
            { id: "b", degree: 9, degreePct: 1 },
            { id: "c", degree: 5, degreePct: 5 / 9 },
            { id: "d", degree: 5, degreePct: 5 / 9 },
            { id: "a", degree: 2, degreePct: 2 / 9 },
        ],
        maxDegree: 9,
        degreesDescending: [9, 5, 5, 2],
    };

    it("reproduces the ranking readNodeMetricResults builds from the same numbers", async () => {
        const stub = makeStub(["a", "b", "c", "d"], { values: { a: 2, b: 9, c: 5, d: 5 } });

        const fromElement = await runNodeMetric(stub.graph, "degree");

        /* The run id is the one thing the two cannot share: one came from a run started here
           and the other from a pass the load already ran. Everything a reading is built from
           is identical, which is the claim this board makes. */
        const { runId, ...measured } = fromElement;

        expect(runId).toEqual(expect.any(String));
        expect(rankingFromDegreeResults(held, 4)).toEqual(measured);
    });

    it("runs nothing at all", () => {
        const stub = makeStub(["a", "b", "c", "d"], { values: { a: 2, b: 9, c: 5, d: 5 } });

        const ranking = rankingFromDegreeResults(held, 4);

        expect(stub.runs).toEqual([]);
        expect(readNodeMetricResults(stub.graph, "degree").rankedCount).toBe(0);
        expect(ranking.rankedCount).toBe(4);
    });

    /*
     * The board below is the one that used to say the opposite. It read "reports nodeCount
     * equal to rankedCount, because the held list has already dropped the unmeasured", and
     * that equality was true by construction rather than by measurement: nodeCount WAS the
     * held list's length. After an additive load -- a drop on the Data panel while a file
     * is loaded -- no dataset boundary is crossed, the degree pass never re-runs, and the
     * held list describes file A alone. The ranking then reported file A's count as the
     * whole graph, so `notMeasured` came out 0 and the legend claimed a ramp covering every
     * node while file B sat unstyled beneath it. The live count is now an argument the
     * caller has to supply, and the two counts are free to disagree.
     */
    it("reports the live node count, so a pass that no longer covers the graph says so", () => {
        const ranking = rankingFromDegreeResults(held, 25);

        expect(ranking.nodeCount).toBe(25);
        expect(ranking.rankedCount).toBe(4);
        expect(ranking.nodeCount - ranking.rankedCount).toBe(21);
        expect(ranking.metric).toBe("degree");
    });

    it("clamps a count smaller than the held list rather than reporting a negative remainder", () => {
        const ranking = rankingFromDegreeResults(held, 1);

        expect(ranking.nodeCount).toBe(4);
        expect(ranking.rankedCount).toBe(4);
    });

    /*
     * The held readings carry whatever id the degree pass recorded and this path passes it
     * straight through, printing a label beside it. `DegreeResults` still declares its ids
     * as strings, so the two fields are equal here; the moment that type widens to the
     * element's own `number | string`, this board is what says the raw id survives.
     */
    it("passes the held reading's own id through and prints a label beside it", () => {
        const ranking = rankingFromDegreeResults(held, 4);

        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual(["b", "c", "d", "a"]);
        expect(ranking.byValueDescending.map((reading) => reading.label)).toEqual(["b", "c", "d", "a"]);
    });

    it("returns an empty ranking for a pass that measured nothing", () => {
        const ranking = rankingFromDegreeResults({ byDegreeDescending: [], maxDegree: 0, degreesDescending: [] }, 0);

        expect(ranking.rankedCount).toBe(0);
        expect(ranking.maxValue).toBe(0);
        expect(ranking.tiedAtMinimum).toBe(0);
    });
});

describe("metricDistribution", () => {
    it("draws one readable bar per distinct value while they fit under the cap", async () => {
        const stub = makeStub(["a", "b", "c", "d", "e", "f", "g"], {
            values: { a: 1, b: 1, c: 2, d: 2, e: 3, f: 3, g: 3 },
        });

        const distribution = metricDistribution(await runNodeMetric(stub.graph, "degree"));

        expect(distribution.bins.map((bin) => bin.label)).toEqual([
            "1 links: 2 nodes",
            "2 links: 2 nodes",
            "3 links: 3 nodes",
        ]);
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(7);
        expect(distribution.axisMin).toBe("1");
        expect(distribution.axisMax).toBe("3");
        expect(distribution.caption).toBe("Most connected per node");
        expect(distribution.logX).toBe(false);
    });

    it("bands once there are more distinct values than the cap, and names each band's range", async () => {
        const values: Record<string, number> = {};
        const ids: string[] = [];
        for (let degree = 1; degree <= 50; degree++) {
            const id = `n${String(degree)}`;
            ids.push(id);
            values[id] = degree;
        }

        const ranking = await runNodeMetric(makeStub(ids, { values }).graph, "degree");
        const distribution = metricDistribution(ranking);

        expect(distribution.bins.length).toBeLessThanOrEqual(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins.length).toBeGreaterThan(1);
        expect(distribution.bins[0].label).toBe("1 to 3 links: 3 nodes");
        expect(distribution.bins[distribution.bins.length - 1].label).toBe("49 to 50 links: 2 nodes");
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(ranking.rankedCount);
        expect(distribution.axisMin).toBe("1");
        expect(distribution.axisMax).toBe("50");
        expect(distribution.logX).toBe(false);
        expect(distribution.caption).toBe("Most connected per node");
    });

    it("switches to log bands and says so in the caption when max over median passes the threshold", async () => {
        const values: Record<string, number> = {};
        const ids: string[] = [];
        for (let index = 0; index < 40; index++) {
            const id = `low-${String(index)}`;
            ids.push(id);
            values[id] = 1;
        }

        for (let degree = 2; degree <= 25; degree++) {
            const id = `mid-${String(degree)}`;
            ids.push(id);
            values[id] = degree;
        }

        ids.push("hub");
        values.hub = 5000;

        const ranking = await runNodeMetric(makeStub(ids, { values }).graph, "degree");
        const distribution = metricDistribution(ranking);

        expect(ranking.medianValue).toBe(1);
        expect(ranking.maxValue / ranking.medianValue).toBeGreaterThan(LOG_X_RATIO_THRESHOLD);
        expect(distribution.logX).toBe(true);
        expect(distribution.caption).toBe("Most connected per node (log scale)");
        expect(distribution.bins).toHaveLength(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins[0].label).toBe("1 links: 40 nodes");
        expect(distribution.bins[distribution.bins.length - 1].count).toBe(1);
        expect(distribution.bins[distribution.bins.length - 1].label).toContain("5,000 links");
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(ranking.rankedCount);
        expect(distribution.axisMax).toBe("5,000");
    });

    it("prints a score below 1 to two significant figures rather than to two decimal places", async () => {
        const stub = makeStub(["a", "b", "c"], {
            metric: "pagerank",
            values: { a: 0.5, b: 0.25, c: 0.0034 },
        });

        const distribution = metricDistribution(await runNodeMetric(stub.graph, "pagerank"));

        expect(distribution.bins.map((bin) => bin.label)).toEqual([
            "0.0034 score: 1 nodes",
            "0.25 score: 1 nodes",
            "0.5 score: 1 nodes",
        ]);
        expect(distribution.axisMin).toBe("0.0034");
        expect(distribution.axisMax).toBe("0.5");
        expect(distribution.caption).toBe("Influence per node");
    });

    it("bands a continuous metric and carries the band edges back into value space", async () => {
        const values: Record<string, number> = {};
        const ids: string[] = [];
        for (let index = 0; index < 60; index++) {
            const id = `n${String(index)}`;
            ids.push(id);
            values[id] = index / 60;
        }

        const ranking = await runNodeMetric(makeStub(ids, { metric: "betweenness", values }).graph, "betweenness");
        const distribution = metricDistribution(ranking);

        expect(distribution.bins).toHaveLength(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins.every((bin) => bin.label.includes(" to "))).toBe(true);
        expect(distribution.bins.every((bin) => bin.label.endsWith(" nodes"))).toBe(true);
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(ranking.rankedCount);
    });

    /*
     * The four boards below are the ones finding 13 was about. The banding used to run on
     * log10(value + 1), which is a genuine log axis only for values that reach past 1. Every
     * normalized PageRank score lies below 1 (the ranks sum to 1), so the shift made the
     * bands very nearly linear -- measured on real hub-and-spoke output, the last band came
     * out 1.009 to 1.336 times the width of the first, against 1690.9 for degree 1..5000 --
     * and 99%+ of the nodes piled into the first bar under a caption reading "(log scale)".
     * The board this replaced, "still draws one bin rather than NaN when the log transform
     * collapses a tiny spread", froze the extreme form of that defect as the expected
     * result: 21 values spanning six decades came back as ONE bar, because 1 + 1e-300 is
     * exactly 1 in float64.
     */
    it("spreads a six-decade sub-1 spread across log bands instead of collapsing it into one bar", async () => {
        const values: Record<string, number> = {};
        const ids: string[] = [];
        for (let index = 0; index <= 20; index++) {
            const id = `n${String(index)}`;
            ids.push(id);
            values[id] = 1e-300 * 2 ** index;
        }

        const ranking = await runNodeMetric(makeStub(ids, { metric: "pagerank", values }).graph, "pagerank");
        const distribution = metricDistribution(ranking);

        expect(distribution.logX).toBe(true);
        expect(distribution.bins).toHaveLength(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(ranking.rankedCount);
        expect(distribution.bins.every((bin) => Number.isFinite(bin.count))).toBe(true);
        expect(distribution.bins.filter((bin) => bin.count > 0).length).toBeGreaterThanOrEqual(10);
        expect(distribution.bins[0].count).toBeLessThan(ranking.rankedCount);
    });

    it("bands a whole sub-1 PageRank domain logarithmically rather than nearly linearly", async () => {
        /* Sixty scores spread evenly over five decades below 1 -- the shape a hub-and-spoke
           or taxonomy graph produces, and the shape the log rule exists for. */
        const values: Record<string, number> = {};
        const ids: string[] = [];
        for (let index = 0; index < 60; index++) {
            const id = `n${String(index)}`;
            ids.push(id);
            values[id] = 1e-6 * 10 ** ((5 * index) / 59);
        }

        const ranking = await runNodeMetric(makeStub(ids, { metric: "pagerank", values }).graph, "pagerank");
        const distribution = metricDistribution(ranking);

        expect(ranking.maxValue / ranking.medianValue).toBeGreaterThan(LOG_X_RATIO_THRESHOLD);
        expect(distribution.logX).toBe(true);
        expect(distribution.caption).toBe("Influence per node (log scale)");
        expect(distribution.bins).toHaveLength(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(ranking.rankedCount);

        /* The direct measure of whether the axis is logarithmic at all: the last band spans
           far more value than the first. Under log10(value + 1) over a domain below 1 that
           ratio was about 1.0 -- a linear chart wearing a log caption. */
        const firstBand = bandSpan(distribution.bins[0].label);
        const lastBand = bandSpan(distribution.bins[METRIC_DISTRIBUTION_MAX_BINS - 1].label);
        expect(firstBand).toBeGreaterThan(0);
        expect(lastBand / firstBand).toBeGreaterThan(1000);

        /* And the nodes are spread across the axis rather than heaped into bar one. */
        expect(distribution.bins.filter((bin) => bin.count > 0)).toHaveLength(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins[0].count).toBeLessThanOrEqual(5);
    });

    it("gives exact zeros a bin of their own, because a zero has no place on a log axis", async () => {
        const values: Record<string, number> = {};
        const ids: string[] = [];
        for (let index = 0; index < 5; index++) {
            const id = `isolated-${String(index)}`;
            ids.push(id);
            values[id] = 0;
        }

        for (let index = 0; index < 30; index++) {
            const id = `leaf-${String(index)}`;
            ids.push(id);
            values[id] = 1;
        }

        for (let degree = 2; degree <= 25; degree++) {
            const id = `mid-${String(degree)}`;
            ids.push(id);
            values[id] = degree;
        }

        ids.push("hub");
        values.hub = 5000;

        const ranking = await runNodeMetric(makeStub(ids, { values }).graph, "degree");
        const distribution = metricDistribution(ranking);

        expect(distribution.logX).toBe(true);
        expect(distribution.bins).toHaveLength(METRIC_DISTRIBUTION_MAX_BINS);
        expect(distribution.bins[0].label).toBe("0 links: 5 nodes");
        expect(distribution.bins[1].label).toBe("1 links: 30 nodes");
        expect(distribution.bins.reduce((total, bin) => total + bin.count, 0)).toBe(ranking.rankedCount);
        expect(distribution.axisMin).toBe("0");
        expect(distribution.axisMax).toBe("5,000");
    });

    it("does not caption a chart log when every value already has its own bar", async () => {
        const values: Record<string, number> = { hub: 200, mid: 3, second: 2 };
        const ids: string[] = ["hub", "mid", "second"];
        for (let index = 0; index < 10; index++) {
            const id = `leaf-${String(index)}`;
            ids.push(id);
            values[id] = 1;
        }

        const ranking = await runNodeMetric(makeStub(ids, { values }).graph, "degree");
        const distribution = metricDistribution(ranking);

        expect(ranking.maxValue / ranking.medianValue).toBeGreaterThan(LOG_X_RATIO_THRESHOLD);
        expect(distribution.bins).toHaveLength(4);
        expect(distribution.logX).toBe(false);
        expect(distribution.caption).toBe("Most connected per node");
    });

    it("draws no bar and claims no range for a ranking with nothing in it", () => {
        const distribution = metricDistribution(readNodeMetricResults(makeStub([]).graph, "degree"));

        expect(distribution.bins).toEqual([]);
        expect(distribution.axisMin).toBe("0");
        expect(distribution.axisMax).toBe("0");
        expect(distribution.logX).toBe(false);
        expect(distribution.caption).toBe("Most connected per node");
    });
});
