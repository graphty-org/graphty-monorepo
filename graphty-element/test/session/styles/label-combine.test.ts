/**
 * @file A label field written with `combine` meets the value beneath it.
 *
 * A label field (`node.labelSize`) is painted into its label style's column, which holds a label style, not a
 * number, so a `multiply` or `add` binding wrote its own value over what lay beneath: Selected's "label size x 1.5"
 * drew every selected label at 1.5 pixels.
 */
import { assert, describe, it } from "vitest";

import { LABEL_STYLE_DEFAULTS } from "../../../src/catalog/label-style";
import type { Channel } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";

/**
 * Repaint every layer and read one node's label style.
 * @param session - The session.
 * @param channel - The label style channel.
 * @returns What the first node is painted.
 */
async function labelStyleOf(session: GraphSession, channel: Channel): Promise<{ sizePx?: number } | undefined> {
    const element = session as ElementSession;
    await element.paint.repaintAll(element.styles.compiled(), {
        signal: new AbortController().signal,
        report: () => undefined,
    });
    return element.paint.styleOf("node", 0)[channel] as { sizePx?: number } | undefined;
}

describe("a label field with combine", () => {
    it("multiplies the size beneath: 20 times 1.5 is 30", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.styles.add({
            name: "beneath",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelStyle": { sizePx: 20 } },
        });
        const above = await session.styles.add({
            name: "above",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.labelSize": { value: 1.5, combine: "multiply" } },
        });
        assert.strictEqual((await labelStyleOf(session, "node.labelStyle"))?.sizePx, 30);

        await session.styles.update(above.id, { encode: { "node.labelSize": { value: 4, combine: "add" } } });
        assert.strictEqual((await labelStyleOf(session, "node.labelStyle"))?.sizePx, 24, "20 plus 4");
        session.dispose();
    });

    it("multiplies the drawn default when nothing beneath sets the size", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.styles.add({
            name: "above",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.labelSize": { value: 1.5, combine: "multiply" } },
        });
        const drawn = LABEL_STYLE_DEFAULTS.sizePx ?? Number.NaN;
        assert.isAbove(drawn, 1.5);
        assert.strictEqual((await labelStyleOf(session, "node.labelStyle"))?.sizePx, drawn * 1.5);
        session.dispose();
    });
});
