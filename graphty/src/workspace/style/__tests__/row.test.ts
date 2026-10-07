import { CHANNEL_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { startingValue } from "../row";

describe("the value a line starts with", () => {
    it("is the element's own value for every channel a line can add, never an invented one", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            if (!descriptor.renderable || descriptor.accepts === "labelStyle" || descriptor.accepts === "nothing") {
                continue;
            }
            const value = startingValue(descriptor);
            const own = descriptor.default ?? descriptor.min ?? descriptor.values?.[0] ?? "";
            assert.deepEqual(value, own, descriptor.channel);
        }
    });

    it("starts a glow and an outline in the color the element draws them", () => {
        assert.equal(startingValue(CHANNEL_DESCRIPTORS["node.glow"]), CHANNEL_DESCRIPTORS["node.glow"].default);
        assert.notEqual(startingValue(CHANNEL_DESCRIPTORS["node.outline"]), "#000000");
    });
});
