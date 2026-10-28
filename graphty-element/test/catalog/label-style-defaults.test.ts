import { assert, describe, it } from "vitest";

import { LABEL_STYLE_DEFAULTS, LABEL_STYLE_FIELDS } from "../../src/catalog";

describe("LABEL_STYLE_DEFAULTS", () => {
    it("gives the values a label draws when nothing sets them, in the label vocabulary", () => {
        assert.equal(LABEL_STYLE_DEFAULTS.font, "Verdana");
        assert.equal(LABEL_STYLE_DEFAULTS.sizePx, 48);
        assert.equal(LABEL_STYLE_DEFAULTS.weight, "normal");
        assert.equal(LABEL_STYLE_DEFAULTS.marginTop, 5);
        assert.equal(LABEL_STYLE_DEFAULTS.lineHeight, 1.2);
        assert.equal(LABEL_STYLE_DEFAULTS.location, "top");
        assert.equal(LABEL_STYLE_DEFAULTS.sizeMode, "world");
        assert.isFalse(LABEL_STYLE_DEFAULTS.onTop);
    });

    it("names only label style fields, and never enabled", () => {
        for (const field of Object.keys(LABEL_STYLE_DEFAULTS)) {
            assert.include(LABEL_STYLE_FIELDS, field);
        }
        assert.isUndefined(LABEL_STYLE_DEFAULTS.enabled);
        assert.isTrue(Object.isFrozen(LABEL_STYLE_DEFAULTS));
    });
});
