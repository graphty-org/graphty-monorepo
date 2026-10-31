/**
 * @file A DOT node's external label (`xlabel`) reaches the element's external label channels (issue #5263): its
 * words always, and the place a laid-out file stored (`xlp`) as an offset from the node's center, which centers the
 * label there in place of against the node's corner.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * Load a DOT document with its styles, letting the element choose the layout.
 * @param text - The document.
 * @returns The session.
 */
async function loadedDot(text: string): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ type: "dot", config: { data: text } }, { styles: "file", layout: "recommended" });
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    return session;
}

/**
 * What a node is drawn with on every channel.
 * @param session - The session.
 * @param node - The node.
 * @returns The channels.
 */
function merged(session: GraphSession, node: string): Record<string, unknown> {
    return session.styles.explain({ node }).merged;
}

describe("a DOT node's external label", () => {
    it("is drawn from its xlabel, against the node's corner when the file stores no place", async () => {
        const session = await loadedDot('graph { a [xlabel="outside \\N"]; b }');
        const a = merged(session, "a");
        assert.strictEqual(a["node.xlabel"], "outside a");
        assert.isUndefined(a["node.xlabelLocation"]);
        assert.isUndefined(merged(session, "b")["node.xlabel"]);
    });

    it("is centered where the file stored it, right and up of the node in DOT's points", async () => {
        const session = await loadedDot(
            'graph { a [pos="0,0!", xlabel="x", xlp="20,10"]; b [pos="100,0!", xlabel="y", xlp="80,-10"] }',
        );
        const a = merged(session, "a");
        const b = merged(session, "b");
        assert.strictEqual(a["node.xlabelLocation"], "center");
        const ax = a["node.xlabelOffsetX"] as number;
        const ay = a["node.xlabelOffsetY"] as number;
        // right and up (down negative), in proportion to what the file stored, mirrored for b
        assert.isAbove(ax, 0);
        assert.closeTo(ay, -ax / 2, 1e-6);
        assert.closeTo(b["node.xlabelOffsetX"] as number, -ax, 1e-6);
        assert.closeTo(b["node.xlabelOffsetY"] as number, -ay, 1e-6);
    });
});
