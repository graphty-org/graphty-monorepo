/**
 * @file `styles.counts(id).undrawn`: an end caption a layer wins on an edge whose end draws no
 * arrow draws nothing (a caption hangs from its arrow), and the counts say so as a fact rather than
 * leaving the caption silently missing.
 */

import { assert, describe, it } from "vitest";

import { makeSession } from "../helpers";

describe("styles.counts: end captions with no arrow to hang from", () => {
    it("reports a head caption on an undirected graph, and none once a head is drawn", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        const layer = await session.styles.add({
            name: "End",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHeadText": "End" },
        });

        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, [
            { code: "caption.noArrow", params: { channel: "edge.arrowHeadText", arrow: "edge.arrowHead", count: 2 } },
        ]);

        await session.styles.update(layer.id, { set: { "edge.arrowHeadText": "End", "edge.arrowHead": "normal" } });
        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, []);
        session.dispose();
    });

    it("draws a head caption on a directed graph, and reports a tail caption with no tail", async () => {
        const { session } = makeSession({ directed: true });
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        const layer = await session.styles.add({
            name: "Ends",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHeadText": "End", "edge.arrowTailText": "Start" },
        });

        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, [
            { code: "caption.noArrow", params: { channel: "edge.arrowTailText", arrow: "edge.arrowTail", count: 1 } },
        ]);
        session.dispose();
    });
});
