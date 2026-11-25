/**
 * @file A new label's texture is uploaded once, at the pixels the label covers on screen (issue #10018).
 *
 * A label is drawn on a canvas at its font's own pixels and uploaded shrunk to its size on screen (issue #3239). The
 * first upload of a new label was its whole canvas: the size on screen was only worked out later, by the sweep that
 * fits labels a number of them per frame (labelTextureFit), which then uploaded it a second time, shrunk. Labeling
 * 50,000 nodes made full-size textures faster than the sweep shrank them: 5.7 GB of them, until the GPU ran out of
 * memory and the WebGL context was lost.
 *
 * Counted, on both render paths: the uploads of each label's texture, and the most texture bytes the labels held at
 * once, from the style call to the stable frame. Read from the scene: each label's uploaded texture against the
 * pixels its plane covers, and the two paths' pictures against each other.
 */

import { Matrix, type StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { LabelTexture } from "../../src/meshes/LabelTexture";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

/** Labeled nodes: more than one frame of the sweep checks (TEXTURE_FIT_CHECKS_PER_FRAME). */
const COUNT = 600;

/** The uploads of each label texture, and the bytes each holds on the GPU now. */
interface Uploads {
    count: Map<LabelTexture, number>;
    live: Map<LabelTexture, number>;
    peak: number;
}

const { update, dispose } = LabelTexture.prototype;

afterEach(() => {
    LabelTexture.prototype.update = update;
    LabelTexture.prototype.dispose = dispose;
    renderPathDefault.value = "objects";
});

/**
 * Count every label texture upload from now on, and the bytes label textures hold at once.
 * @returns The running counts.
 */
function countUploads(): Uploads {
    const uploads: Uploads = { count: new Map(), live: new Map(), peak: 0 };
    const total = (): number => [...uploads.live.values()].reduce((sum, bytes) => sum + bytes, 0);
    LabelTexture.prototype.update = function (this: LabelTexture, ...args: Parameters<LabelTexture["update"]>) {
        update.apply(this, args);
        const uploaded = this.getInternalTexture();
        uploads.count.set(this, (uploads.count.get(this) ?? 0) + 1);
        uploads.live.set(this, uploaded ? uploaded.width * uploaded.height * 4 : 0);
        uploads.peak = Math.max(uploads.peak, total());
    };
    LabelTexture.prototype.dispose = function (this: LabelTexture) {
        uploads.live.delete(this);
        dispose.call(this);
    };
    return uploads;
}

/**
 * Label every node of a grid on one render path.
 * @param path - The render path.
 * @returns What was uploaded, how many labels are fitted to their pixels on screen, the bytes they hold, and the
 * picture.
 */
async function labelGrid(
    path: "objects" | "batched",
): Promise<{ uploads: Uploads; fitted: number; bytes: number; frame: CanvasFrame }> {
    renderPathDefault.value = path;
    const container = document.createElement("div");
    container.style.width = "640px";
    container.style.height = "480px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    try {
        await graph.init();
        assert.strictEqual(graph.renderPath, path);
        await graph.addNodes(
            Array.from({ length: COUNT }, (_, at) => ({
                id: `n${String(at)}`,
                position: { x: (at % 30) * 3, y: Math.floor(at / 30) * 3, z: 0 },
            })),
        );
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const uploads = countUploads();
        await graph.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "XRCC2", "node.labelStyle": { location: "center" } },
        });
        await graph.waitForStableFrame();

        const { scene } = graph;
        const engine = scene.getEngine();
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        let fitted = 0;
        let bytes = 0;
        for (const node of graph.getNodes()) {
            const plane = node.label?.labelMesh;
            assert.exists(plane);
            plane.computeWorldMatrix(true);
            const ys = plane
                .getBoundingInfo()
                .boundingBox.vectorsWorld.map(
                    (corner) =>
                        Vector3.Project(corner, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport).y,
                );
            const uploaded = (plane.material as StandardMaterial).diffuseTexture?.getInternalTexture();
            assert.exists(uploaded);
            bytes += uploaded.width * uploaded.height * 4;
            const ratio = uploaded.height / (Math.max(...ys) - Math.min(...ys));
            if (ratio >= 0.85 && ratio <= 1.35) {
                fitted++;
            }
        }

        return { uploads, fitted, bytes, frame: await readCanvas(graph) };
    } finally {
        graph.dispose();
        container.remove();
    }
}

describe("a new label's texture", () => {
    it("is uploaded once, at the pixels it covers on screen, on both render paths", async () => {
        const frames: CanvasFrame[] = [];
        for (const path of ["objects", "batched"] as const) {
            const { uploads, fitted, bytes, frame } = await labelGrid(path);
            frames.push(frame);
            assert.strictEqual(fitted, COUNT, `${path}: every label is uploaded at about the pixels it covers`);
            assert.strictEqual(uploads.count.size, COUNT, `${path}: one texture per label`);
            const again = [...uploads.count.values()].filter((times) => times !== 1).length;
            assert.strictEqual(again, 0, `${path}: labels whose texture was uploaded more than once`);
            // Never more at once than the fitted textures the picture ends with.
            assert.isAtMost(uploads.peak, bytes, `${path}: the most label texture bytes held at once`);
        }

        const [objects, batched] = frames;
        assert.strictEqual(pixelsOverBar(objects, batched), 0, "the two paths draw the same labels");
    });
});
