import { LAYOUT_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import { LAYOUT_SECTIONS, sectionOf } from "../methods";

describe("the Layout list's sections", () => {
    it("gives every family in the element's layout catalog a heading of its own", () => {
        const known = LAYOUT_SECTIONS.map((section) => section.family);
        for (const { id, family } of LAYOUT_DESCRIPTORS) {
            assert.include(known, family, `${id}'s family ${family} has no heading`);
        }
    });

    it("reads a family it does not know, as a plugin's, under Other", () => {
        assert.strictEqual(sectionOf("a-plugin-family"), "Other");
        assert.strictEqual(sectionOf("special"), "Other");
        assert.strictEqual(sectionOf("force"), "Force-directed");
    });
});
