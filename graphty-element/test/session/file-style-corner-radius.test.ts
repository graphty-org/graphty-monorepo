/**
 * @file A corner radius a file gives is drawn as given (`node.exactCornerRadius`), as Cytoscape.js draws
 * `corner-radius`; the corner its program draws when the file gives none stays capped at a quarter of the
 * shorter side, as Cytoscape.js's own `auto` radius is, and Cytoscape desktop's is an eighth of it with no cap.
 */

import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { flatShapeOutline } from "../../src/meshes/shapeOutlines";

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

/**
 * The corner radius a node is drawn with, in the file's units: its outline's corners, as the mesh draws them.
 * @param session - The session.
 * @param node - The node.
 * @param fileWidth - The node's width in the file.
 * @returns The radius.
 */
function drawnRadius(session: GraphSession, node: string, fileWidth: number): number {
    const width = drawn(session, node, "node.width") as number;
    const height = drawn(session, node, "node.height") as number;
    const outline = flatShapeOutline(
        "round-rectangle",
        width,
        height,
        drawn(session, node, "node.cornerRadius") as number | undefined,
        undefined,
        true,
        drawn(session, node, "node.exactCornerRadius") === true,
        drawn(session, node, "node.cornerFraction") as number | undefined,
    );
    // the top side's straight run ends where its corner's arc starts, one radius in from the side
    const top = Math.max(...outline.map(([, y]) => y));
    const run = Math.max(...outline.filter(([, y]) => Math.abs(y - top) < 1e-9 * height).map(([x]) => x));
    return (width / 2 - run) * (fileWidth / width);
}

describe("a Cytoscape desktop file's rounded corners", () => {
    it("are an eighth of the shorter side with no cap, as Cytoscape 3.10.5 draws them", async () => {
        const sizes = [
            { id: 1, w: 120, h: 60 },
            { id: 2, w: 40, h: 20 },
            { id: 3, w: 513, h: 453 },
        ];
        const cx2 = JSON.stringify([
            { CXVersion: "2.0", hasFragments: false },
            { attributeDeclarations: [{ nodes: { w: { d: "double" }, h: { d: "double" } } }] },
            { nodes: sizes.map(({ id, w, h }) => ({ id, x: id * 600, y: 0, v: { w, h } })) },
            {
                visualProperties: [
                    {
                        default: { node: { NODE_SHAPE: "round-rectangle" } },
                        nodeMapping: {
                            NODE_WIDTH: { type: "PASSTHROUGH", definition: { attribute: "w", type: "double" } },
                            NODE_HEIGHT: { type: "PASSTHROUGH", definition: { attribute: "h", type: "double" } },
                        },
                    },
                ],
            },
            { status: [{ error: "", success: true }] },
        ]);
        const session = createGraphSession();
        await session.data.import({ type: "cx2", config: { data: cx2 } }, { styles: "file" });

        // Cytoscape 3.10.5's SVG export: 7.5 on 120 x 60, 2.5 on 40 x 20, 56.6 on 513 x 453
        assert.approximately(drawnRadius(session, "1", 120), 7.5, 1e-6);
        assert.approximately(drawnRadius(session, "2", 40), 2.5, 1e-6);
        assert.approximately(drawnRadius(session, "3", 513), 453 / 8, 1e-6);
        assert.approximately(drawnRadius(session, "3", 513), 56.6, 0.05);
        session.dispose();
    });
});
