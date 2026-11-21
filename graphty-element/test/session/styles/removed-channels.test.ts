/**
 * @file A document an earlier build wrote, with the removed halo and node outline channels, still
 * loads and draws: the halo as a ring (`node.outerBorder*`), the outline as a border.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { DEFAULT_SELECTION_STYLE } from "../../../src/config/GraphStyle";
import { edgeBandWidthAs, readRemovedChannels } from "../../../src/session/styles/channels";
import { makeSession } from "../helpers";

describe("removed channels in a saved layer", () => {
    it("reads the old Selected layer's halo as a ring and an outline as a border", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }]);
        const { session } = harness;
        await session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "Old selected",
                    target: "node",
                    selector: { match: "ids", nodes: ["a" as NodeId] },
                    set: { "node.haloColor": "#ff8800", "node.haloScale": 1.6, "node.haloOpacity": 0.5 },
                } as never,
                {
                    name: "Old outline",
                    target: "node",
                    selector: { match: "ids", nodes: ["b" as NodeId] },
                    set: { "node.outline": "#112233", "node.outlineWidth": 3 },
                } as never,
            ],
        });
        await session.styles.settled();

        const selected = session.styles.list().find((layer) => layer.name === "Old selected");
        const outline = session.styles.list().find((layer) => layer.name === "Old outline");
        assert.isDefined(selected);
        assert.isDefined(outline);
        assert.strictEqual(selected.enabled, true);
        assert.strictEqual(outline.enabled, true);

        const ring = session.styles.explain({ node: "a" as NodeId }).merged;
        assert.strictEqual((ring["node.outerBorderColor"] as { hex?: string }).hex?.toLowerCase(), "#ff8800");
        assert.closeTo(ring["node.outerBorderWidth"] as number, 0.3, 1e-9);
        assert.strictEqual(ring["node.outerBorderOpacity"], 0.5);

        const border = session.styles.explain({ node: "b" as NodeId }).merged;
        assert.strictEqual((border["node.borderColor"] as { hex?: string }).hex?.toLowerCase(), "#112233");
        assert.isAbove(border["node.borderWidth"] as number, 0);

        const checked = session.styles.validate({
            name: "Old outline",
            target: "node",
            selector: { match: "all" },
            set: { "node.outline": "#112233", "node.outlineWidth": 3 },
        } as never);
        assert.deepInclude(checked.warnings, {
            code: "W_CHANNEL_REMOVED",
            params: { channel: "node.outlineWidth", layer: "Old outline" },
        });
        session.dispose();
    });

    it("switches the ring on from node.halo alone in the old selection look, and off from node.halo: false", () => {
        const on = readRemovedChannels({ set: { "node.halo": true } }).spec.set as Record<string, unknown>;
        assert.deepEqual(on, {
            "node.outerBorderColor": DEFAULT_SELECTION_STYLE.color,
            "node.outerBorderWidth": (DEFAULT_SELECTION_STYLE.scale - 1) / 2,
            "node.outerBorderOpacity": DEFAULT_SELECTION_STYLE.opacity,
        });
        const off: unknown = readRemovedChannels({ set: { "node.halo": false } }).spec.set;
        assert.deepEqual(off, { "node.outerBorderWidth": 0 });
        const renamed = readRemovedChannels({ set: { "node.haloSize": 2 } }).spec.set as Record<string, unknown>;
        assert.strictEqual(renamed["node.outerBorderWidth"], 0.5);
    });

    it("keeps a current channel the layer also names, and leaves a layer with no removed channel as it is", () => {
        const both = readRemovedChannels({ set: { "node.haloColor": "#000000", "node.outerBorderColor": "#ffffff" } });
        assert.strictEqual((both.spec.set as Record<string, unknown>)["node.outerBorderColor"], "#ffffff");
        const plain = { set: { "node.color": "#ffffff" } };
        assert.strictEqual(readRemovedChannels(plain).spec, plain);
    });

    it("reads a bound halo color across and drops a bound halo scale", () => {
        const layer: { set?: Record<string, unknown>; encode?: Record<string, unknown> } = {
            encode: { "node.haloColor": { field: "kind" }, "node.haloScale": { field: "rank" } },
        };
        const read = readRemovedChannels(layer);
        assert.deepEqual(read.spec.encode, { "node.outerBorderColor": { field: "kind" } });
        assert.deepEqual(read.dropped, ["node.haloScale"]);
        assert.deepEqual(read.spec.set, { "node.outerBorderWidth": (DEFAULT_SELECTION_STYLE.scale - 1) / 2 });
    });

    it("reads a saved Selected row's edge band and an edge underlay as the edge's outline", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const { session } = harness;
        await session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "Old selected edges",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.bandColor": "#0077bb", "edge.bandWidth": 2.5, "edge.bandOpacity": 1 },
                } as never,
            ],
        });
        await session.styles.settled();
        const layer = session.styles.list().find((entry) => entry.name === "Old selected edges");
        assert.isDefined(layer);
        assert.strictEqual(layer.enabled, true);
        const [edge] = session.data.edges();
        const { merged } = session.styles.explain({ edge: edge.id });
        assert.strictEqual((merged["edge.outlineColor"] as { hex?: string }).hex?.toLowerCase(), "#0077bb");
        // the band was 2.5 times twice the line's width across, whatever that width
        assert.strictEqual(merged["edge.outlineScale"], 5);
        assert.strictEqual(merged["edge.outlineWidth"], 0);
        assert.strictEqual(merged["edge.outlineOpacity"], 1);
        session.dispose();

        const underlay = readRemovedChannels({
            set: { "edge.underlayColor": "#00ff00", "edge.underlayOpacity": 0.5, "edge.underlayPadding": 6 },
        }).spec.set as Record<string, unknown>;
        // twice its padding across, whatever the line's width
        assert.deepEqual(underlay, {
            "edge.outlineScale": 0,
            "edge.outlineWidth": 12,
            "edge.outlineColor": "#00ff00",
            "edge.outlineOpacity": 0.5,
        });
    });

    it("gives a bound band color with no band width the band's default width as the outline's", () => {
        const encode: Record<string, unknown> = { "edge.bandColor": { field: "kind", scale: "category" } };
        const read = readRemovedChannels({ set: {}, encode }).spec;
        assert.deepEqual(read.encode, { "edge.outlineColor": { field: "kind", scale: "category" } });
        // unset, the band drew the selection look's scale: twice that, in the line's widths
        assert.deepEqual(read.set, {
            "edge.outlineScale": 2 * DEFAULT_SELECTION_STYLE.edgeScale,
            "edge.outlineWidth": 0,
        });
    });
    it("keeps a layer's own outline width beside a bound band color", () => {
        const encode: Record<string, unknown> = { "edge.bandColor": { field: "kind", scale: "category" } };
        const read = readRemovedChannels({ set: { "edge.outlineWidth": 3 }, encode }).spec;
        assert.deepEqual(read.set, {
            "edge.outlineScale": 2 * DEFAULT_SELECTION_STYLE.edgeScale,
            "edge.outlineWidth": 3,
        });
    });
});

describe("edgeBandWidthAs", () => {
    it("reads an overlay's padding as an outline of scale 0 twice as wide, and back", () => {
        assert.deepEqual(edgeBandWidthAs("outline", { "edge.overlayPadding": 4 }), {
            "edge.outlineScale": 0,
            "edge.outlineWidth": 8,
        });
        assert.deepEqual(edgeBandWidthAs("overlay", { "edge.outlineScale": 0, "edge.outlineWidth": 8 }), {
            "edge.overlayPadding": 4,
        });
    });

    it("reads an outline that follows the line as an overlay given the line's width", () => {
        // unset scale (1): the line's 16 plus 2 is 18 across, 9 either side of its middle
        assert.deepEqual(edgeBandWidthAs("overlay", { "edge.outlineWidth": 2 }, 16), { "edge.overlayPadding": 9 });
        assert.deepEqual(edgeBandWidthAs("overlay", { "edge.outlineScale": 5 }, 4), { "edge.overlayPadding": 10 });
        assert.isUndefined(edgeBandWidthAs("overlay", {}, 16));
    });

    it("has no reading for an outline that follows the line, or an overlay with no padding", () => {
        assert.isUndefined(edgeBandWidthAs("overlay", { "edge.outlineScale": 1, "edge.outlineWidth": 8 }));
        assert.isUndefined(edgeBandWidthAs("overlay", { "edge.outlineWidth": 8 }));
        assert.isUndefined(edgeBandWidthAs("outline", {}));
    });
});
