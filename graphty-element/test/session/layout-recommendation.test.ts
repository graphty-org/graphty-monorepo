/**
 * @file Which arrangement the element recommends for a graph, and the promise it must never
 * break: it may only name an arrangement the element can actually serve.
 *
 * The connected graph under test is the Les Miserables co-appearance network from the GEXF
 * corpus, parsed by the data source the element parses that format with.
 */

import { assert, describe, it } from "vitest";

import { LAYOUT_DESCRIPTORS } from "../../src/catalog/layouts";
import { DEFAULT_LIMITS, type LayoutRecommendation, recommendLayout } from "../../src/session";
import type { GraphStatistics } from "../../src/session/types";
import { type Harness, loadGexfCorpus, makeSession } from "./helpers";

/** The corpus file the connected cases load: 77 characters, 254 weighted co-appearances. */
const LES_MISERABLES = "lesmiserables.gexf";

/**
 * A session over the Les Miserables network.
 * @returns The harness, loaded.
 */
async function lesMiserables(): Promise<Harness> {
    const harness = makeSession();
    await loadGexfCorpus(harness, LES_MISERABLES);

    return harness;
}

/**
 * Check the promise every recommendation has to keep, whatever rule produced it.
 *
 * An arrangement the catalogue does not list cannot be set at all; one that declares a
 * structural input refuses without a root, a partition or an ordering nobody supplied, so
 * recommending it hands a consumer a name that throws.
 * @param advice - What was recommended.
 * @param statistics - The graph it was recommended for.
 */
function assertServable(advice: LayoutRecommendation | undefined, statistics: GraphStatistics): void {
    assert.isDefined(advice, "the shipped catalogue always serves something");

    const published = LAYOUT_DESCRIPTORS.find((descriptor) => descriptor.id === advice?.layout.id);

    assert.strictEqual(advice?.layout, published, "the recommendation is the catalogue's own descriptor");
    assert.deepStrictEqual(advice?.layout.structuralInputs, [], "nothing that needs a root or a partition");
    assert.isString(advice?.layout.engine);
    assert.isAbove((advice?.layout.engine ?? "").length, 0, "the engine name setLayout takes");
    assert.isAbove((advice?.reason ?? "").length, 0, "a sentence saying why");

    if (advice !== undefined && advice.layout.sizeRating !== "any") {
        assert.isAtMost(
            statistics.nodeCount,
            advice.layout.sizeRating,
            "never an arrangement the catalogue rates below this graph's size",
        );
    }
}

/**
 * The shape of a graph with these counts and nothing else worth saying about it.
 * @param nodeCount - Nodes.
 * @param edgeCount - Edges.
 * @returns The statistics.
 */
function sizeOnly(nodeCount: number, edgeCount: number): GraphStatistics {
    return {
        nodeCount,
        edgeCount,
        density: 0,
        directedness: "unknown",
        directednessSource: { by: "unsettled", statedBy: null },
        weighted: false,
        selfLoopCount: 0,
        repeatedEdgeCount: 0,
        degreeRange: [0, 0],
        meanDegree: 0,
        components: {
            count: 0,
            sizes: [],
            largestSize: 0,
            isolatedCount: 0,
            truncatedSizes: false,
            componentOf: () => undefined,
        },
    };
}

describe("which arrangement suits a graph", () => {
    it("recommends a force layout for an ordinary connected graph, and names the engine to set", async () => {
        const harness = await lesMiserables();
        const statistics = harness.session.data.statistics();

        const advice = recommendLayout(statistics, { placedNodes: harness.session.positions.placedCount });

        assertServable(advice, statistics);
        assert.strictEqual(advice?.layout.id, "force", "the public arrangement name");
        assert.strictEqual(advice?.layout.engine, "ngraph", "the engine name setLayout takes");
        harness.session.dispose();
    });

    it("keeps the coordinates a file arrived with rather than computing over the top of them", async () => {
        const harness = await lesMiserables();
        const statistics = harness.session.data.statistics();

        // Told that every node already carries a coordinate, which is what a file with a position
        // for each node leaves behind and what `positions.placedCount` reports after one.
        const advice = recommendLayout(statistics, { placedNodes: statistics.nodeCount });

        assertServable(advice, statistics);
        assert.strictEqual(advice?.layout.id, "fixed");
        assert.strictEqual(advice?.layout.engine, "fixed");
        harness.session.dispose();
    });

    it("does not keep the coordinates when only some nodes carry one", async () => {
        const harness = await lesMiserables();
        const statistics = harness.session.data.statistics();

        // One short of every node is not "the file placed the graph": a fixed layout would draw
        // the placed nodes and leave the rest at no coordinate at all.
        const advice = recommendLayout(statistics, { placedNodes: statistics.nodeCount - 1 });

        assertServable(advice, statistics);
        assert.notStrictEqual(advice?.layout.id, "fixed");
        harness.session.dispose();
    });

    it("puts an unconnected graph in a ring, because a force layout has nothing to pull on", () => {
        const statistics = sizeOnly(40, 0);

        const advice = recommendLayout(statistics);

        assertServable(advice, statistics);
        assert.strictEqual(advice?.layout.id, "circular");
        assert.strictEqual(advice?.layout.engine, "circular");
    });

    it("scatters a graph too large to settle, and takes the threshold from the caller when given one", () => {
        const large = sizeOnly(DEFAULT_LIMITS.largeGraphThreshold + 1, 5_000);

        const advice = recommendLayout(large);

        assertServable(advice, large);
        assert.strictEqual(advice?.layout.id, "random");
        assert.strictEqual(advice?.layout.engine, "random");

        // The same graph under a host that has measured a higher ceiling is not a large graph.
        const raised = recommendLayout(large, { largeGraphThreshold: DEFAULT_LIMITS.largeGraphThreshold * 100 });

        assertServable(raised, large);
        assert.strictEqual(raised?.layout.id, "force");
    });

    it("answers for a graph with nothing in it, rather than leaving a consumer to invent one", () => {
        const empty = makeSession();
        const statistics = empty.session.data.statistics();

        const advice = recommendLayout(statistics, { placedNodes: empty.session.positions.placedCount });

        assertServable(advice, statistics);
        assert.strictEqual(advice?.layout.id, "force", "an empty graph gets the element's own default arrangement");
        empty.session.dispose();
    });

    it("never names an arrangement the element cannot serve, whatever the graph looks like", () => {
        const shapes = [
            sizeOnly(0, 0),
            sizeOnly(1, 0),
            sizeOnly(2, 1),
            sizeOnly(500, 12_000),
            sizeOnly(2_001, 9_000),
            sizeOnly(50_000, 120_000),
            sizeOnly(5_000_000, 20_000_000),
        ];

        for (const statistics of shapes) {
            for (const placedNodes of [0, 1, statistics.nodeCount]) {
                assertServable(recommendLayout(statistics, { placedNodes }), statistics);
            }
        }
    });
});
