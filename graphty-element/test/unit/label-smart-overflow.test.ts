import { assert, describe, it } from "vitest";

import { BadgeStyleManager } from "../../src/BadgeStyleManager";
import type { RichTextLabelOptions } from "../../src/meshes/RichTextLabel";

/** Run a label's options through the behaviour pass every label goes through. */
function shortened(userOptions: RichTextLabelOptions): string | undefined {
    const options = { ...userOptions };
    BadgeStyleManager.applyBadgeBehaviors(options, userOptions);
    return options.text;
}

describe("smartOverflow", () => {
    // `LabelStyle.smartOverflow` is a published label field, documented as drawing a number over
    // `maxNumber` as `99+`. It used to take effect only on a count or notification badge.
    it("shortens a plain label that asks for it", () => {
        assert.strictEqual(shortened({ text: "150", smartOverflow: true, maxNumber: 99 }), "99+");
        assert.strictEqual(shortened({ text: "1500", smartOverflow: true, maxNumber: 99 }), "99+");
        assert.strictEqual(shortened({ text: "1000000", smartOverflow: true, maxNumber: 99 }), "99+");
        assert.strictEqual(
            shortened({ text: "150", smartOverflow: true, maxNumber: 99, overflowSuffix: "++" }),
            "99++",
        );
    });

    it("leaves a plain label alone when it does not ask, or is under the cap", () => {
        assert.strictEqual(shortened({ text: "150", maxNumber: 99 }), "150");
        assert.strictEqual(shortened({ text: "42", smartOverflow: true, maxNumber: 99 }), "42");
    });

    it("still shortens a count badge", () => {
        assert.strictEqual(
            shortened({
                text: "150",
                badge: "count",
                _badgeType: "count",
                smartOverflow: true,
                maxNumber: 99,
            }),
            "99+",
        );
    });

    it("caps every count above maxNumber with the suffix, however large", () => {
        assert.strictEqual(shortened({ text: "1500", smartOverflow: true }), "999+");
        assert.strictEqual(shortened({ text: "1500", smartOverflow: true, maxNumber: 9999 }), "1500");
        assert.strictEqual(
            shortened({ text: "25000", smartOverflow: true, maxNumber: 9999, overflowSuffix: " more" }),
            "9999 more",
        );
    });

    it("reads the text as one number and leaves anything but a whole number alone", () => {
        assert.strictEqual(shortened({ text: "1e5", smartOverflow: true, maxNumber: 99 }), "99+");
        assert.strictEqual(shortened({ text: "150.5", smartOverflow: true, maxNumber: 99 }), "150.5");
        assert.strictEqual(shortened({ text: "", smartOverflow: true, maxNumber: 99 }), "");
        assert.strictEqual(shortened({ text: "12abc", smartOverflow: true, maxNumber: 9 }), "12abc");
    });
});

describe("badge margins", () => {
    function margins(userOptions: RichTextLabelOptions): number[] {
        const options: RichTextLabelOptions = { fontSize: 10, _paddingRatio: 0.5, ...userOptions };
        BadgeStyleManager.applyBadgeBehaviors(options, userOptions);
        return [options.marginTop, options.marginRight, options.marginBottom, options.marginLeft].map(Number);
    }

    it("gives every unset side the badge padding", () => {
        assert.deepEqual(margins({}), [5, 5, 5, 5]);
    });

    it("keeps a side the caller set, including 0", () => {
        assert.deepEqual(margins({ marginTop: 0 }), [0, 5, 5, 5]);
        assert.deepEqual(margins({ marginLeft: 2, marginBottom: 0 }), [5, 5, 0, 2]);
    });
});
