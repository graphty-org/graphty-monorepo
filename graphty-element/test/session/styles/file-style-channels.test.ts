import { assert, describe, it } from "vitest";

import { isChannel } from "../../../src/session/styles/channels";
import { fileStyleChannels } from "../../../src/session/styles/fileStyles/translate";

describe("fileStyleChannels", () => {
    it("lists real channels once each, from the property plans and the passes", () => {
        const channels = fileStyleChannels();
        assert.strictEqual(new Set(channels).size, channels.length);
        assert.deepEqual(
            channels.filter((channel) => !isChannel(channel)),
            [],
        );
        for (const expected of [
            "node.color",
            "node.borderOpacity",
            "node.size",
            "edge.width",
            "edge.labelBackgroundShape",
        ]) {
            assert.include(channels, expected);
        }
        assert.isAbove(channels.length, 250);
    });
});
