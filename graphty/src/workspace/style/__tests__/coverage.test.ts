import { CHANNELS, LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { CHANNEL_HOMES, GRAPH_SETTING_HOMES, homeless, LABEL_FIELD_HOMES, publishedGraphSettings } from "../coverage";
import { CORE_ROWS, LISTS } from "../words";

/** The label entry's channels (LabelSection.tsx draws them; a component file cannot export them). */
const LABEL_CHANNELS = [
    "node.label",
    "node.labelStyle",
    "node.labelSize",
    "edge.label",
    "edge.labelStyle",
    "edge.labelSize",
];

describe("every style has a home", () => {
    it("gives every channel graphty-element publishes a control or a reason", () => {
        assert.deepEqual(homeless(CHANNELS, CHANNEL_HOMES), []);
    });

    it("gives every label style field a control or a reason", () => {
        assert.deepEqual(homeless(LABEL_STYLE_FIELDS, LABEL_FIELD_HOMES), []);
    });

    it("gives every published graph setting a control or a reason", () => {
        const published = publishedGraphSettings();
        assert.isAbove(published.length, 0);
        assert.deepEqual(homeless(published, GRAPH_SETTING_HOMES), []);
    });

    it("names an entry the element adds and the map lacks", () => {
        assert.deepEqual(homeless([...CHANNELS, "node.sparkle"], CHANNEL_HOMES), ["node.sparkle"]);
    });

    it("places exactly the channels the Style tab draws, and gives the rest a reason", () => {
        const drawn = new Set<string>([
            ...LABEL_CHANNELS,
            ...[...CORE_ROWS.node, ...CORE_ROWS.edge].flatMap((row) => [...row.fields, ...row.settings]),
            ...[...LISTS.node, ...LISTS.edge].flatMap((list) => list.channels),
        ]);
        for (const channel of CHANNELS) {
            assert.strictEqual("place" in CHANNEL_HOMES[channel], drawn.has(channel), channel);
        }
    });
});
