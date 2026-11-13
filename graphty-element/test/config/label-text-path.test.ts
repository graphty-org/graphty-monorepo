/**
 * @file A label's `textPath` is checked when its style is set, and read the same way for a node and an edge (issue
 * #6845). A typo used to be swallowed on every element, which then drew its fallback (a node its id, an edge
 * nothing) with no error.
 */
import { assert, describe, it } from "vitest";

import { labelTextOf, richTextLabelOptions, RichTextStyle } from "../../src/config/RichTextStyle";

describe("a label's textPath", () => {
    it("is refused when it is not a JMESPath expression", () => {
        for (const bad of ["data.[", "name(", "a === 1"]) {
            assert.isFalse(RichTextStyle.safeParse({ textPath: bad }).success, bad);
        }
        assert.isTrue(RichTextStyle.safeParse({ textPath: "data.name" }).success);
    });

    it("reads the words from the element's data, or names none", () => {
        const data = { name: "alpha", count: 3 };
        assert.strictEqual(labelTextOf(data, { textPath: "name" }), "alpha");
        assert.strictEqual(labelTextOf(data, { textPath: "count" }), "3");
        assert.isUndefined(labelTextOf(data, { textPath: "missing" }));
        // a function given a value of the wrong type is this element having no value
        assert.isUndefined(labelTextOf(data, { textPath: "length(count)" }));
        assert.strictEqual(labelTextOf(data, { text: "own", textPath: "name" }), "own");
        assert.isUndefined(labelTextOf(data, undefined));
    });

    it("builds renderer options without the fields only the style reads", () => {
        const options = richTextLabelOptions(
            {
                enabled: true,
                textPath: "name",
                location: "top",
                backgroundColor: { colorType: "solid", value: "#123456" },
                borders: [{ width: 1, color: "#000000", spacing: 0 }],
            },
            { text: "alpha" },
        );
        assert.strictEqual(options.text, "alpha");
        assert.strictEqual(options.backgroundColor, "#123456");
        assert.deepStrictEqual(options.borders, [{ width: 1, color: "#000000", spacing: 0 }]);
        assert.notProperty(options, "textPath");
        assert.notProperty(options, "location");
        assert.notProperty(options, "enabled");
        assert.isUndefined(richTextLabelOptions({ backgroundColor: "transparent" }, {}).backgroundColor);
    });
});
