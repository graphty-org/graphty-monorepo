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
        assert.strictEqual(shortened({ text: "1500", smartOverflow: true, maxNumber: 99 }), "1k");
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
            } as RichTextLabelOptions),
            "99+",
        );
    });
});
