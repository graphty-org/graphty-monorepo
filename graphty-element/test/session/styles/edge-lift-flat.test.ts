/**
 * @file `edge.lift` rises out of a flat layout's plane, so it draws only for a flat layout in the
 * 3D view; anywhere else `styles.counts(id).undrawn` reports `edge.lift-needs-flat-layout` rather
 * than leaving the lift silently missing (design/rendering/shader-styles.md, package E5).
 */

import { assert, describe, it } from "vitest";

import { makeSession } from "../helpers";

describe("styles.counts: a lift with no flat layout to rise out of", () => {
    it("reports a lift in a 3D layout and in the 2D view, and none for a flat layout in 3D", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        const layer = await session.styles.add({
            name: "Arcs",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.lift": 1.5 },
        });
        const flat = [{ code: "edge.lift-needs-flat-layout" as const, params: { count: 2 } }];

        assert.strictEqual(session.layout.arrangedDimension, "3d");
        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, flat, "the default layout is 3D");

        await session.layout.set("force", { engine: "ngraph", options: { dim: 2 } });
        assert.strictEqual(session.layout.dimension, "3d");
        assert.strictEqual(session.layout.arrangedDimension, "2d");
        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, [], "a flat layout in 3D draws the lift");

        await session.layout.setDimension("2d");
        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, flat, "the 2D view draws no lift");

        await session.styles.update(layer.id, { set: { "edge.lift": 0 } });
        assert.deepStrictEqual(session.styles.counts(layer.id).undrawn, [], "no lift is nothing to report");
        session.dispose();
    });
});
