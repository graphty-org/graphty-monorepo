/**
 * @file The box behind a file's label is drawn as its program draws it: Cytoscape desktop rounds a
 * ROUND_RECTANGLE label box's corners (`node.labelCornerRadius`) and leaves a RECTANGLE's square, and
 * draws either round the words alone (no padding, lines one font tall).
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const att = (name: string, value: string): string => `<att name="${name}" value="${value}" type="string"/>`;
const box = (shape: string): string =>
    att("NODE_LABEL_BACKGROUND_SHAPE", shape) + att("NODE_LABEL_FONT_SIZE", "10") + att("NODE_LABEL", "Label");

const XGMML = `<?xml version="1.0"?>
<graph label="g" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">
<node id="round" label="round"><graphics x="0" y="0" w="30" h="30">${box("ROUND_RECTANGLE")}</graphics></node>
<node id="square" label="square"><graphics x="100" y="0" w="30" h="30">${box("RECTANGLE")}</graphics></node>
</graph>`;

/**
 * What a node is drawn with on a channel.
 * @param session - The session.
 * @param node - The node.
 * @param channel - The channel.
 * @returns The value.
 */
function drawn(session: GraphSession, node: string, channel: string): unknown {
    return (session.styles.explain({ node }).merged as Record<string, unknown>)[channel];
}

describe("a file's label box", () => {
    it("rounds a round rectangle's corners and draws the box round the words", async () => {
        const session = createGraphSession();
        await session.data.import(
            { type: "xgmml", config: { data: XGMML } },
            { styles: "file", layout: "recommended" },
        );
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });

        const round = drawn(session, "round", "node.labelStyle") as Record<string, number>;
        const square = drawn(session, "square", "node.labelStyle") as Record<string, number>;
        // an eighth of a one-line box 1.164 font sizes tall
        assert.approximately(round.cornerRadius / round.sizePx, 0.1455, 0.01);
        assert.isUndefined(square.cornerRadius);
        assert.deepEqual([square.boxPadding, square.lineHeight], [0, 1]);
        session.dispose();
    });
});
