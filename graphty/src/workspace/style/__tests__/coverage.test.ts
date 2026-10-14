import { CHANNELS, channelsFor, LABEL_STYLE_FIELDS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    CHANNEL_HOMES,
    DESIGN_PLACED,
    GRAPH_SETTING_HOMES,
    homeless,
    LABEL_FIELD_HOMES,
    NO_VARY,
    publishedGraphSettings,
} from "../coverage";
import { isPercent, SECTIONS, takesBinding } from "../words";

/** Every channel a section of the Style tab draws. */
const DRAWN = new Set<string>([...SECTIONS.node, ...SECTIONS.edge].flatMap((section) => section.channels));

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
        for (const channel of CHANNELS) {
            assert.strictEqual("place" in CHANNEL_HOMES[channel], DRAWN.has(channel), channel);
        }
    });

    it("offers every style the design places in the panel: none of them is 'not offered'", () => {
        const notOffered = [
            ...DESIGN_PLACED.channels.filter((channel) => "notOffered" in CHANNEL_HOMES[channel]),
            ...DESIGN_PLACED.labelFields.filter((field) => "notOffered" in LABEL_FIELD_HOMES[field]),
        ];
        assert.deepEqual(notOffered, []);
    });

    it("records why a drawn property has no vary glyph: yes-or-no properties and label looks, by decision", () => {
        const descriptors = [...channelsFor("node"), ...channelsFor("edge")].filter((d) => DRAWN.has(d.channel));
        const neither = descriptors.filter((d) => !takesBinding(d) && NO_VARY[d.channel] === undefined);
        assert.deepEqual(
            neither.map((d) => d.channel),
            [],
        );
        // A reason is never given for a property that does vary.
        assert.deepEqual(
            descriptors.filter((d) => takesBinding(d) && NO_VARY[d.channel] !== undefined).map((d) => d.channel),
            [],
        );
        for (const d of descriptors.filter((x) => x.accepts === "boolean")) {
            assert.isFalse(takesBinding(d), `${d.channel} is yes-or-no and has no vary by`);
        }
    });

    it("draws every opacity as a percent that varies by a value", () => {
        const opacities = [...channelsFor("node"), ...channelsFor("edge")].filter((d) => d.channel.endsWith("pacity"));
        assert.isAbove(opacities.length, 0);
        for (const d of opacities) {
            assert.isTrue(DRAWN.has(d.channel), `${d.channel} is in a section`);
            assert.isTrue(takesBinding(d), `${d.channel} varies by a value`);
            assert.isTrue(isPercent(d), `${d.channel} reads as a percent`);
        }
    });
});
