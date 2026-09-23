import { CHANNEL_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { CHANNEL_CONTROLS } from "../channelControls";

/*
 * The inspector's channel table used to restate the element's drawable facts -- which control a
 * channel takes, its bounds, and the values an enum accepts -- and a copied fact is wrong from
 * the moment the element changes it, silently. The table now reads those facts from the element's
 * own `CHANNEL_DESCRIPTORS`. These tests are what make that safe: they fail if the two ever stop
 * agreeing, so a drift becomes a red test rather than a control that edits the wrong thing.
 */

const channels = Object.keys(CHANNEL_DESCRIPTORS) as Channel[];

/** How a control kind reads back to the element value kind it was drawn from. */
const KIND_FOR_ACCEPTS = {
    color: "color",
    number: "number",
    text: "text",
    boolean: "boolean",
    enum: "enum",
    labelStyle: "labelStyle",
    nothing: "none",
} as const;

describe("channelControls", () => {
    it("draws a control for every channel the element publishes, and no other", () => {
        expect(Object.keys(CHANNEL_CONTROLS).sort()).toEqual([...channels].sort());
    });

    it("draws the control kind the element's value kind calls for", () => {
        for (const channel of channels) {
            expect(CHANNEL_CONTROLS[channel].kind).toBe(KIND_FOR_ACCEPTS[CHANNEL_DESCRIPTORS[channel].accepts]);
        }
    });

    it("takes its numeric bounds from the element, not a copy", () => {
        for (const channel of channels) {
            expect(CHANNEL_CONTROLS[channel].min).toBe(CHANNEL_DESCRIPTORS[channel].min);
            expect(CHANNEL_CONTROLS[channel].max).toBe(CHANNEL_DESCRIPTORS[channel].max);
        }
    });

    it("offers exactly the enum values the element accepts", () => {
        for (const channel of channels) {
            const descriptor = CHANNEL_DESCRIPTORS[channel];
            if (descriptor.accepts !== "enum") {
                continue;
            }

            const offered = (CHANNEL_CONTROLS[channel].options ?? []).map((option) => option.value).sort();
            expect(offered).toEqual([...(descriptor.values ?? [])].sort());
        }
    });
});
