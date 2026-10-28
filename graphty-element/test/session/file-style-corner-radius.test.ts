/**
 * @file A corner radius a file gives is drawn as given (`node.exactCornerRadius`), as Cytoscape.js draws
 * `corner-radius`; the corner its program draws when the file gives none stays capped at a quarter of the
 * shorter side, as Cytoscape.js's own `auto` radius is.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const DOC = JSON.stringify({
    elements: {
        nodes: [
            { data: { id: "given" }, position: { x: 0, y: 0 } },
            { data: { id: "auto" }, position: { x: 100, y: 0 } },
            { data: { id: "triangle" }, position: { x: 200, y: 0 } },
        ],
        edges: [],
    },
    style: [
        { selector: "node", style: { width: 30, height: 30, shape: "round-rectangle" } },
        { selector: "#given", style: { "corner-radius": "14px" } },
        { selector: "#triangle", style: { shape: "round-triangle", "corner-radius": "8px" } },
    ],
});

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

describe("a file's corner radius", () => {
    it("is drawn as given where the file gives it, and capped where its program's default draws it", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: DOC } }, { styles: "file", layout: "recommended" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });

        assert.strictEqual(drawn(session, "given", "node.exactCornerRadius"), true);
        assert.strictEqual(drawn(session, "triangle", "node.exactCornerRadius"), true);
        assert.notStrictEqual(drawn(session, "auto", "node.exactCornerRadius"), true);
        // both radii in the same unit: 14 file px against Cytoscape.js's default cap of 8
        const given = drawn(session, "given", "node.cornerRadius") as number;
        const auto = drawn(session, "auto", "node.cornerRadius") as number;
        assert.approximately(given / auto, 14 / 8, 1e-6);
        session.dispose();
    });
});
