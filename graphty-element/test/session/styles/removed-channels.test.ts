/**
 * @file A document an earlier build wrote, with the removed halo and node outline channels, still
 * loads and draws: the halo as a ring (`node.outerBorder*`), the outline as a border.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { DEFAULT_SELECTION_STYLE } from "../../../src/config/GraphStyle";
import { readRemovedChannels } from "../../../src/session/styles/channels";
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
        const read = readRemovedChannels({
            encode: { "node.haloColor": { field: "kind" }, "node.haloScale": { field: "rank" } },
        });
        assert.deepEqual(read.spec.encode as unknown, { "node.outerBorderColor": { field: "kind" } });
        assert.deepEqual(read.dropped, ["node.haloScale"]);
    });
});
