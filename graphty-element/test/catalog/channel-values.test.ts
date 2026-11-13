/**
 * @file `session.catalog.channelValues(channel)`: every value of an enum channel with a default name
 * and, where the element draws one, a picture.
 */

import { assert, describe, it } from "vitest";

import { channelsFor, EDGE_LINE_DESCRIPTORS } from "../../catalog";
import { createGraphSession } from "../../session";

describe("the values of an enum channel", () => {
    it("every enum channel names every value", () => {
        const s = createGraphSession({ features: ["file-styles"] });
        for (const target of ["node", "edge"] as const) {
            for (const descriptor of channelsFor(target)) {
                const values = s.catalog.channelValues(descriptor.channel);
                if (descriptor.accepts !== "enum") {
                    assert.deepEqual(values, [], descriptor.channel);
                    continue;
                }
                assert.deepEqual(
                    values.map((value) => value.id),
                    [...(descriptor.values ?? [])],
                    descriptor.channel,
                );
                for (const value of values) {
                    assert.isAbove(value.plainName.length, 0, `${descriptor.channel} ${value.id}`);
                    assert.notStrictEqual(value.plainName, value.id, `${descriptor.channel}: a name, not the id`);
                    assert.notMatch(value.plainName, /_|^-|[a-z][A-Z]/, `${descriptor.channel} ${value.id}: words`);
                }
            }
        }
        s.dispose();
    });

    it("a value the experiment adds is left out while it is off", () => {
        const on = createGraphSession({ features: ["file-styles"] });
        const off = createGraphSession({ features: [] });
        const onShapes = on.catalog.channelValues("node.shape").map((value) => value.id);
        const offShapes = off.catalog.channelValues("node.shape").map((value) => value.id);
        assert.isAbove(onShapes.length, offShapes.length);
        assert.deepEqual(
            offShapes,
            off.catalog
                .channels("node")
                .find((descriptor) => descriptor.channel === "node.shape")
                ?.values?.slice(),
        );
        for (const value of on.catalog.channelValues("node.shape")) {
            assert.isString(value.glyph, value.id);
        }
        on.dispose();
        off.dispose();
    });

    it("border patterns carry the line pattern pictures", () => {
        const s = createGraphSession({ features: ["file-styles"] });
        const line = new Map(EDGE_LINE_DESCRIPTORS.map((entry) => [entry.id as string, entry]));
        const border = s.catalog.channelValues("node.borderStyle");
        assert.strictEqual(border.find((value) => value.id === "dashed")?.glyph, line.get("dash")?.glyph);
        assert.strictEqual(border.find((value) => value.id === "dotted")?.plainName, line.get("dot")?.plainName);
        for (const value of [...border, ...s.catalog.channelValues("node.outerBorderStyle")]) {
            assert.isString(value.glyph, value.id);
        }
        for (const value of s.catalog.channelValues("edge.outlineStyle")) {
            assert.isString(value.glyph, value.id);
        }
        s.dispose();
    });
});
