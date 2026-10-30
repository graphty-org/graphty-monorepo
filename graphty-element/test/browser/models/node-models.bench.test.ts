/**
 * @file What a thousand model nodes cost (design/rendering/node-models.md, section 8.2): picking
 * under a real pointer, and the main thread's frame time beside the same graph of icospheres.
 * Timing checks, so they run in the "browser-bench" project (Chromium) and not under coverage.
 *
 * The frame time is the main thread's cost of `scene.render()`: the cost instancing exists to keep
 * flat, and the same whatever the model's triangle count, because the whole graph is one instanced
 * draw call. Three things made that number noise on a CI runner, whose GPU is a software
 * rasterizer on the same few cores as the main thread:
 *
 * - The GPU's work. Timed back to back, the frames queue up behind a GPU still drawing the ones
 *   before and the main thread is charged for its CPU time (issue #4368). Drained before each
 *   frame, a model frame still costs the rasterizer about a second, so only 3 frames fit in the
 *   test's time, every one of them just after the scene was built.
 * - V8's state. Those first frames run Babylon's per-mesh loop before V8 has optimized it for the
 *   new scene's objects: the frame time falls from 2-4 ms to under 1 ms over the first 20 or so
 *   frames, by a different amount in each run, and a scene timed after another one meets code
 *   optimized for the other's objects (icosphere 3.20 ms, model 5.60 ms in full run 40950464075,
 *   model below icosphere in the runs around it; issue #4553).
 * - The frozen list. A graph standing still freezes Babylon's list of what it draws a frame or two
 *   after its stable frame, and a frozen frame skips the walk over every instance, so a graph timed
 *   frozen against one timed unfrozen compares two different frames.
 *
 * So the draw calls are no-ops while a graph is timed: the main thread does all of its own work and
 * the GPU none, and a frame costs milliseconds instead of a second. Both graphs stay mounted,
 * unfrozen, and take turns, {@link WARM_FRAMES} untimed frames each and then {@link FRAMES} timed
 * ones, so both are timed in the same state of V8's optimized code.
 */

import type { Engine } from "@babylonjs/core/Engines/engine";
import { assert, describe, it } from "vitest";

import { operationQueueOf } from "../../../src/Graph";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { hover } from "../../helpers/real-input";
import { drawnAsModel, mount, nextModelEvent } from "./helpers";

/** Nodes in each graph. */
const NODES = 1000;

/** Frames each graph renders untimed first, for V8 to optimize the render loop for its objects. */
const WARM_FRAMES = 500;

/** Frames timed per graph. */
const FRAMES = 21;

/** The WebGL calls that draw, which are no-ops while a graph is timed. */
const DRAWS = ["drawElementsInstanced", "drawArraysInstanced", "drawElements", "drawArrays"] as const;

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
 * Make an element's draw calls no-ops.
 * @param element - The element.
 * @returns What puts them back.
 */
function skipDraws(element: Awaited<ReturnType<typeof mount>>): () => void {
    const gl = (element.graph.scene.getEngine() as Engine)._gl;
    // Babylon binds its own on a WebGL 1 context; those are put back.
    const own = DRAWS.map((draw) => Object.getOwnPropertyDescriptor(gl, draw));
    const noDraw = (): void => undefined;
    for (const draw of DRAWS) {
        Object.defineProperty(gl, draw, { value: noDraw, configurable: true, writable: true });
    }

    return () => {
        DRAWS.forEach((draw, i) => {
            const before = own[i];
            if (before === undefined) {
                Reflect.deleteProperty(gl, draw);
            } else {
                Object.defineProperty(gl, draw, before);
            }
        });
    };
}

/**
 * The main thread's milliseconds per frame of each element: the median of {@link FRAMES} frames,
 * each started on an idle GPU, after {@link WARM_FRAMES} untimed ones, with every draw call a
 * no-op. The elements take turns, frame by frame, so each is timed in the same state of V8's
 * optimized code: timed one after the other, the second ran slower whichever it was.
 * @param elements - The elements.
 * @returns Milliseconds per frame, in the order of the elements.
 */
async function frameTimes(elements: readonly Awaited<ReturnType<typeof mount>>[]): Promise<number[]> {
    const restores = elements.map(skipDraws);
    for (const element of elements) {
        // Both graphs walk and upload every instance, as a frame does while anything moves: a
        // graph standing still freezes that list a frame or two after its stable frame, and one
        // graph timed frozen against the other unfrozen compares two different frames.
        element.graph.getUpdateManager().thawActiveMeshes();
    }

    try {
        for (let frame = 0; frame < WARM_FRAMES; frame++) {
            for (const element of elements) {
                element.graph.scene.render();
            }
        }

        const times = elements.map((): number[] => []);
        for (let frame = 0; frame < FRAMES; frame++) {
            for (const [i, element] of elements.entries()) {
                const { scene } = element.graph;
                // A pixel read waits for every frame drawn so far, the render loop's included.
                await scene.getEngine().readPixels(0, 0, 1, 1);
                const start = performance.now();
                scene.render();
                times[i].push(performance.now() - start);
            }
        }

        return times.map((list) => list.sort((a, b) => a - b)[Math.floor(FRAMES / 2)]);
    } finally {
        for (const restore of restores) {
            restore();
        }
    }
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
        // 2 x 50 x 20 = 2,000 triangles.
        const models = await thousand(sphereGlb(50, 20));
        assert.isTrue(drawnAsModel(models.graph, "n999"));
        const [icosphere, model] = await frameTimes([spheres, models]);
        console.log(`[model-bench] frame: icosphere ${icosphere.toFixed(2)} ms, model ${model.toFixed(2)} ms`);
        // The same frame rate within a quarter, and a millisecond for the timer's own noise.
        assert.isBelow(model, icosphere * 1.25 + 1, `model ${model.toFixed(2)} ms against ${icosphere.toFixed(2)} ms`);
    });
});
