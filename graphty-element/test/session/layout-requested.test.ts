/**
 * @file The recommendation for a graph whose reader asked for a layout. The request is a neutral fact (a graphty
 * layout id and its options) that names no format or program, so a DOT file's request and the same request written by
 * hand give the same recommendation.
 */

import { requestedLayout } from "@graphty/graph-io";
import { assert, describe, it, vi } from "vitest";

import { GRAPHVIZ_NODE_BUDGETS } from "../../src/layout/graphviz/engines";
import { recommendLayout } from "../../src/session";
import { REQUESTED_LAYOUT_VALUE } from "../../src/session/commands/data";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { GraphStatistics } from "../../src/session/types";
import { makeSession } from "./helpers";

/**
 * The shape of a graph with these counts.
 * @param nodeCount - nodes
 * @param edgeCount - edges
 * @returns the statistics
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

const connected = sizeOnly(30, 40);

/** The request a DOT file with `rankdir=LR; splines=curved` makes, written by hand. */
const BY_HAND = {
    layout: "graphviz-dot",
    options: { attributes: { rankdir: "LR", splines: "curved" }, nodeSize: "label" },
    routedWhenPlaced: { edgeRoutes: "graphviz", graphvizAttributes: { splines: "curved" } },
};

describe("the recommendation for a requested layout", () => {
    const fromFile = requestedLayout("dot", { rankdir: "LR", splines: "curved", label: "not passed on" });

    it("is the same for a DOT file's request and the same request written by hand", () => {
        assert.isNotNull(fromFile);
        const file = recommendLayout(connected, { requested: fromFile ?? undefined, graphvizAvailable: true });
        const hand = recommendLayout(connected, { requested: BY_HAND, graphvizAvailable: true });

        assert.deepEqual(file, hand);
        assert.strictEqual(hand?.layout.id, "graphviz-dot");
        assert.strictEqual(hand?.fact.code, "recommend.requested-layout");
        assert.strictEqual(hand?.fact.params.layout, "graphviz-dot");
        assert.strictEqual(hand?.fact.params.nodeCount, 30);
        assert.deepEqual(hand?.options, BY_HAND.options);
        assert.isUndefined(hand?.reason, "no English sentence");
    });

    it("keeps placed nodes where they are with the request's routing, the same for both", () => {
        const file = recommendLayout(connected, {
            requested: fromFile ?? undefined,
            graphvizAvailable: true,
            placedNodes: 30,
        });
        const hand = recommendLayout(connected, { requested: BY_HAND, graphvizAvailable: true, placedNodes: 30 });

        assert.deepEqual(file, hand);
        assert.strictEqual(hand?.layout.id, "fixed");
        assert.strictEqual(hand?.fact.code, "recommend.fixed");
        assert.deepEqual(hand?.options, BY_HAND.routedWhenPlaced);
    });

    it("keeps placed nodes with no routing when the request asks for none or its layout cannot run", () => {
        const plain = recommendLayout(connected, {
            requested: { layout: "graphviz-neato", options: {} },
            graphvizAvailable: true,
            placedNodes: 30,
        });
        const missing = recommendLayout(connected, { requested: BY_HAND, placedNodes: 30 });

        assert.strictEqual(plain?.layout.id, "fixed");
        assert.isUndefined(plain?.options);
        assert.strictEqual(missing?.layout.id, "fixed");
        assert.isUndefined(missing?.options);
    });

    it("draws any registered layout a caller requests, with no package needed", () => {
        const advice = recommendLayout(connected, { requested: { layout: "circular", options: { radius: 5 } } });

        assert.strictEqual(advice?.layout.id, "circular");
        assert.strictEqual(advice?.fact.code, "recommend.requested-layout");
        assert.deepEqual(advice?.options, { radius: 5 });
    });

    it("says the requested layout is unavailable and takes the next rule's: package missing", () => {
        const advice = recommendLayout(connected, { requested: BY_HAND });

        assert.strictEqual(advice?.layout.id, "force");
        assert.strictEqual(advice?.fact.code, "recommend.requested-layout-unavailable");
        assert.strictEqual(advice?.fact.params.layout, "graphviz-dot");
        assert.strictEqual(advice?.fact.params.unavailable, "package");
    });

    it("says the requested layout is unavailable: not registered, or over its node budget", () => {
        const unknown = recommendLayout(connected, { requested: { layout: "no-such-layout", options: {} } });
        const large = recommendLayout(sizeOnly(GRAPHVIZ_NODE_BUDGETS.circo + 1, 600), {
            requested: { layout: "graphviz-circo", options: {} },
            graphvizAvailable: true,
        });

        assert.strictEqual(unknown?.layout.id, "force");
        assert.strictEqual(unknown?.fact.code, "recommend.requested-layout-unavailable");
        assert.strictEqual(unknown?.fact.params.unavailable, "layout");
        assert.strictEqual(large?.layout.id, "force");
        assert.strictEqual(large?.fact.code, "recommend.requested-layout-unavailable");
        assert.strictEqual(large?.fact.params.unavailable, "size");
    });

    it("never recommends a layout that needs a package on its own", () => {
        assert.strictEqual(recommendLayout(connected, { graphvizAvailable: true })?.layout.id, "force");
        assert.strictEqual(recommendLayout(sizeOnly(0, 0))?.layout.requires, undefined);
    });
});

describe("a DOT file loaded with layout recommended", () => {
    it("keeps the reader's request with the graph, naming no format or program", async () => {
        const { session } = makeSession();

        await session.data.import(
            { type: "dot", config: { data: "digraph { layout=neato; rankdir=LR; a -> b; b -> c; c -> a }" } },
            { layout: "recommended" },
        );
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });

        const { values } = dispatcherOf(session).state.graph;
        assert.deepEqual(values.get(REQUESTED_LAYOUT_VALUE), {
            layout: "graphviz-neato",
            options: { attributes: { rankdir: "LR" }, nodeSize: "label" },
            routedWhenPlaced: { edgeRoutes: "graphviz", graphvizAttributes: {} },
        });
        assert.isFalse(values.has("fileGraph"));
        assert.strictEqual(session.layout.id, "force", "Node has no Worker, so Graphviz is unavailable");
        session.dispose();
    });
});
