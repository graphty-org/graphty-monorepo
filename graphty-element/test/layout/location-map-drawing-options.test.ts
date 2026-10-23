/**
 * The location map's `map` option only changes the picture under the graph: a new one is taken by
 * the engine as it stands, so the layout manager swaps the map without placing a node again. Any
 * other change, or none, still runs the layout.
 */

import { assert, describe, it } from "vitest";

import { LocationMapLayout } from "../../src/layout/LocationMapLayoutEngine";

describe("the location map's drawing options", () => {
    it("takes a new map as it stands", () => {
        const engine = new LocationMapLayout({ surface: "globe", dim: 3 });
        assert.isTrue(engine.takeDrawingOptions({ surface: "globe", map: { source: "openstreetmap" } }));
        assert.deepEqual(engine.config.map, { source: "openstreetmap" });
        assert.strictEqual(engine.config.dim, 3, "the view's dimension is kept");
    });

    it("asks for a new run when a placing option changes, or when nothing does", () => {
        const engine = new LocationMapLayout({ map: { source: "opentopomap" } });
        assert.isFalse(engine.takeDrawingOptions({ surface: "globe", map: { source: "openstreetmap" } }));
        assert.deepEqual(engine.config.map, { source: "opentopomap" }, "nothing taken");
        assert.isFalse(engine.takeDrawingOptions({ map: { source: "opentopomap" } }), "the same options run again");
        assert.isFalse(engine.takeDrawingOptions({ map: { source: 3 } }), "a map the schema refuses");
    });
});
