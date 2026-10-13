import { CHANNELS, LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    CHANNEL_HOMES,
    DESIGN_PLACED,
    GRAPH_SETTING_HOMES,
    homeless,
    LABEL_FIELD_HOMES,
    publishedGraphSettings,
} from "../coverage";
import { CORE_ROWS, LISTS } from "../words";

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
        const fields = [
            ...[...CORE_ROWS.node, ...CORE_ROWS.edge].flatMap((row) => [...row.fields, ...row.settings]),
            ...[...LISTS.node, ...LISTS.edge].flatMap((list) => list.channels),
        ];
        const drawn = new Set<string>(fields);
        for (const channel of CHANNELS) {
            assert.strictEqual("place" in CHANNEL_HOMES[channel], drawn.has(channel), channel);
        }
    });

    it("offers every style the design places in the panel: none of them is 'not offered'", () => {
        const notOffered = [
            ...DESIGN_PLACED.channels.filter((channel) => "notOffered" in CHANNEL_HOMES[channel]),
            ...DESIGN_PLACED.labelFields.filter((field) => "notOffered" in LABEL_FIELD_HOMES[field]),
        ];
        assert.deepEqual(notOffered, []);
    });
});
