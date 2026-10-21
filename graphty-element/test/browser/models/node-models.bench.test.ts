/**
 * @file What a thousand model nodes cost (design/rendering/node-models.md, section 8.2): picking
 * under a real pointer, and the main thread's frame time beside the same graph of icospheres.
 * Timing checks, so they run in the "browser-bench" project (Chromium) and not under coverage.
 *
 * The frame time is the main thread's cost of `scene.render()`, with one pixel read after the
 * frames so the GPU has finished them too. It is the cost instancing exists to keep flat, and
 * the one a software rasterizer on a CI runner measures the same way a real GPU would.
 */

import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { hover } from "../../helpers/real-input";
import { drawnAsModel, mount, nextModelEvent } from "./helpers";

/** Nodes in each graph. */
const NODES = 1000;

/** Frames timed per graph. */
const FRAMES = 30;

/**
 * A thousand nodes on a grid in front of the camera.
 * @returns The node records.
 */
function grid(): { id: string; position: { x: number; y: number; z: number } }[] {
    return Array.from({ length: NODES }, (_, i) => ({
        id: `n${String(i)}`,
        position: { x: (i % 40) * 2, y: Math.floor(i / 40) * 2, z: 0 },
    }));
}

/**
 * Mount a thousand nodes, as a model (the GLB given) or as the default icosphere.
 * @param model - The model's bytes, or null for icospheres.
 * @returns The element.
 */
async function thousand(model: Uint8Array | null): Promise<Awaited<ReturnType<typeof mount>>> {
    const element = await mount(800, 600);
    const { graph } = element;
    await graph.addNodes(grid());
    await graph.setLayout("fixed", { dim: 3 });
    if (model !== null) {
        const asset = await element.session.assets.add(model);
        const drawn = nextModelEvent(element, (change) => change.state === "drawn");
        await element.session.styles.add({
            name: "models",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": asset.id },
        });
        await drawn;
    }

    await operationQueueOf(graph).waitForCompletion();
    element.graph.zoomToFit();
    await element.waitForStableFrame();
    return element;
}

/**
 * The main thread's milliseconds per frame, over {@link FRAMES} frames.
 * @param element - The element.
 * @returns Milliseconds per frame.
 */
function frameTime(element: Awaited<ReturnType<typeof mount>>): number {
    const { scene } = element.graph;
    scene.render();
    const start = performance.now();
    for (let frame = 0; frame < FRAMES; frame++) {
        scene.render();
    }

    return (performance.now() - start) / FRAMES;
}

/**
 * Move the real pointer across the canvas and time every pick it causes.
 * @param element - The element.
 * @returns Milliseconds spent picking per move.
 */
async function pickingPerMove(element: Awaited<ReturnType<typeof mount>>): Promise<number> {
    const { scene, canvas } = element.graph;
    let spent = 0;
    let picks = 0;
    const pick = scene.pick.bind(scene);
    scene.pick = (...args: Parameters<typeof scene.pick>) => {
        const start = performance.now();
        try {
            return pick(...args);
        } finally {
            spent += performance.now() - start;
            picks++;
        }
    };

    const box = canvas.getBoundingClientRect();
    const moves = 20;
    for (let move = 0; move < moves; move++) {
        await hover(canvas, { x: (box.width * (move + 1)) / (moves + 1), y: box.height / 2 });
    }

    assert.isAbove(picks, 0, "the pointer moves were picked");
    return spent / moves;
}

describe("a thousand model nodes", () => {
    it("spends under 1 ms picking per pointer move", async () => {
        const icospheres = await thousand(null);
        const baseline = await pickingPerMove(icospheres);
        icospheres.remove();

        const element = await thousand(sphereGlb(12, 6));
        assert.isTrue(drawnAsModel(element.graph, "n0"));
        const spent = await pickingPerMove(element);
        console.log(
            `[model-bench] picking per move: icosphere ${baseline.toFixed(3)} ms, model ${spent.toFixed(3)} ms`,
        );
        assert.isBelow(spent, 1, `picking took ${spent.toFixed(3)} ms per move`);
    });

    it("draws 1,000 nodes of a 2,000-triangle model at the icosphere frame rate", async () => {
        const spheres = await thousand(null);
        const icosphere = frameTime(spheres);
        spheres.remove();

        // 2 x 50 x 20 = 2,000 triangles.
        const models = await thousand(sphereGlb(50, 20));
        assert.isTrue(drawnAsModel(models.graph, "n999"));
        const model = frameTime(models);
        console.log(`[model-bench] frame: icosphere ${icosphere.toFixed(2)} ms, model ${model.toFixed(2)} ms`);
        // The same frame rate within a quarter, and a millisecond for the timer's own noise.
        assert.isBelow(model, icosphere * 1.25 + 1, `model ${model.toFixed(2)} ms against ${icosphere.toFixed(2)} ms`);
    });
});
