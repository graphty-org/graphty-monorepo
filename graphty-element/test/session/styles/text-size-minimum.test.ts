/**
 * @file A text size under 1 is refused.
 *
 * `RichTextStyle.fontSize` takes a minimum of 1 (a label's plane is fontSize / 48 tall, so a
 * smaller size draws nothing a reader can see), and the text size channels take the same
 * minimum, so `styles.validate` refuses a layer that writes one instead of adding it.
 */

import { assert, describe, it } from "vitest";

import { RichTextStyle } from "../../../src/config/RichTextStyle";
import { makeSession } from "../helpers";

describe("a text size under 1", () => {
    it("fails to parse as a label, tooltip or caption style, where 1 parses", () => {
        assert.isFalse(RichTextStyle.safeParse({ fontSize: 0 }).success);
        assert.isFalse(RichTextStyle.safeParse({ fontSize: -1 }).success);
        assert.isTrue(RichTextStyle.safeParse({ fontSize: 1 }).success);
    });

    it("is refused by every text size channel, where 1 is accepted", () => {
        const { session } = makeSession();
        const sizes = [
            ["node", "node.labelSize"],
            ["node", "node.tooltipSize"],
            ["edge", "edge.labelSize"],
            ["edge", "edge.arrowHeadTextSize"],
            ["edge", "edge.arrowTailTextSize"],
        ] as const;

        for (const [target, channel] of sizes) {
            const at = (size: number): ReturnType<typeof session.styles.validate> =>
                session.styles.validate({
                    name: "tiny",
                    target,
                    selector: { match: "everything" },
                    set: { [channel]: size },
                });

            const refused = at(0.5);
            assert.isFalse(refused.ok, `${channel} at 0.5`);
            assert.deepStrictEqual(refused.warnings, [], `${channel}: refused, not warned`);
            assert.isTrue(at(1).ok, `${channel} at 1`);
        }
        session.dispose();
    });
});
