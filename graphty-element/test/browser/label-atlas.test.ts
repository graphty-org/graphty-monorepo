/**
 * @file Labels drawn in one draw, whatever their number, and drawn as each label's own plane drew them (issue #10230).
 *
 * Each label was a plane with its own material and texture, so 10,000 labeled nodes put 10,000 meshes in Babylon's
 * transparent pass, sorted and drawn one by one: about 100 ms of every frame, which every input then waited for. A
 * label shrunk for its size on screen is now drawn from the scene's label atlas (meshes/LabelAtlas.ts).
 *
 * Counted: the meshes the label group draws, at two graph sizes. Read from the canvas: the same labels drawn by the
 * atlas and by their own planes (the atlas turned off), within one level in every channel.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { LabelAtlas, labelAtlasEnabled } from "../../src/meshes/LabelAtlas";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { assertSameFrame, type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    labelAtlasEnabled.value = true;
    renderPathDefault.value = "objects";
});

/** What one labeled graph drew. */
interface Drawn {
    /** Meshes drawn in the label group (rendering group 1) in the last frame. */
    labelDraws: number;
    /** Labels the atlas holds, and the instances it drew. */
    atlas: { labels: number; drawn: number };
    frame: CanvasFrame;
}

/**
 * Label every node of a grid, some as cards, and read what the frame drew.
 * @param count - Nodes.
 * @param spacing - Grid spacing: smaller draws smaller labels on screen.
 * @param atlas - Whether the atlas is on.
 * @returns What was drawn.
 */
async function labelGrid(count: number, spacing: number, atlas: boolean): Promise<Drawn> {
    labelAtlasEnabled.value = atlas;
    renderPathDefault.value = "objects";
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "480px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    try {
        await graph.init();
        await graph.addNodes(
            Array.from({ length: count }, (_, at) => ({
                id: `n${String(at)}`,
                // Rows at different depths, so labels overlap and their order matters.
                position: { x: (at % 20) * spacing, y: Math.floor(at / 20) * spacing, z: (at % 7) * spacing * 0.4 },
            })),
        );
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        const { styles } = graph.getSession();
        await styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "XRCC2 kinase", "node.labelStyle": { location: "top" } },
        });
        await styles.add({
            name: "cards",
            target: "node",
            selector: {
                match: "ids",
                nodes: Array.from({ length: Math.ceil(count / 3) }, (_, at) => `n${String(at * 3)}`),
            },
            set: { "node.labelStyle": { location: "top", background: "#203a80", color: "#ffffff", padding: 4 } },
        });
        const frame = await readCanvas(graph);
        const labelDraws = graph.scene.getActiveMeshes().data.filter((mesh) => mesh.renderingGroupId === 1).length;
        return { labelDraws, atlas: LabelAtlas.countsOf(graph.scene), frame };
    } finally {
        graph.dispose();
        container.remove();
    }
}

describe("the label atlas", () => {
    it("draws every shrunk label in one draw, however many there are", async () => {
        const small = await labelGrid(100, 3, true);
        const large = await labelGrid(400, 3, true);
        assert.strictEqual(small.atlas.labels, 100, "every label of 100 is in the atlas");
        assert.strictEqual(large.atlas.labels, 400, "every label of 400 is in the atlas");
        assert.strictEqual(small.labelDraws, 1, "100 labels: one draw in the label group");
        assert.strictEqual(large.labelDraws, 1, "400 labels: one draw in the label group");

        const off = await labelGrid(400, 3, false);
        assert.strictEqual(off.atlas.labels, 0);
        assert.strictEqual(off.labelDraws, 400, "without the atlas each label is a draw of its own");
    });

    for (const [name, count, spacing] of [
        ["small labels", 200, 3],
        ["labels at their fewest texels per em", 200, 12],
        ["a few large labels", 8, 3],
    ] as const) {
        it(`draws ${name} as their own planes drew them`, async () => {
            const atlas = await labelGrid(count, spacing, true);
            const own = await labelGrid(count, spacing, false);
            assert.isAbove(atlas.atlas.drawn, 0, "the atlas drew labels");
            assertSameFrame(atlas.frame, own.frame, "the atlas draws the labels' own pictures");
        });
    }
});
