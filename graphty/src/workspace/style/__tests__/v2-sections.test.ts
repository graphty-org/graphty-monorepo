/**
 * Style panel v2's value list sections (style/v2/valueSections.ts, design section 8): every value
 * graphty-element lists is in exactly one section, no section passes 12, and the counts match.
 */

import { channelDescriptor } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { VALUE_SECTIONS } from "../v2/valueSections";

describe("Style panel v2's value list sections", () => {
    for (const [channel, sections] of Object.entries(VALUE_SECTIONS)) {
        it(`${channel}: every value in one section, none over 12`, () => {
            const values = channelDescriptor(channel)?.values ?? [];
            assert.isAbove(values.length, 12, "only lists over 12 are sectioned");
            const listed = (sections ?? []).flatMap((section) => section.values);
            assert.equal(listed.length, values.length, "as many as the element lists");
            assert.sameMembers(listed, [...values]);
            for (const section of sections ?? []) {
                assert.isAtMost(section.values.length, 12, section.name);
            }
        });
    }
});
