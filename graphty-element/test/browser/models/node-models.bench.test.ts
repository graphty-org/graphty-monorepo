/**
 * @file What a thousand model nodes cost (design/rendering/node-models.md, section 8.2): the picking
 * work under a real pointer, and the main thread's frame time beside the same graph of icospheres.
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

import { Ray } from "@babylonjs/core/Culling/ray.js";
import type { Engine } from "@babylonjs/core/Engines/engine.js";
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

/** What the pointer moves cost in picking: the time, and the work counted. */
interface Picking {
    /** Milliseconds spent in `scene.pick` per move, logged only (see {@link picking}). */
    msPerMove: number;
    /** Calls to `scene.pick`. */
    picks: number;
    /** Bounding boxes a pick's ray was tested against. */
    boxes: number;
    /** Triangles a pick's ray was tested against. */
    triangles: number;
}

/**
 * Move the real pointer across the canvas, counting the picks it causes and the boxes and
 * triangles they test, and timing them.
 *
 * The test asserts on the counts, not the time. A move's picks take a few tenths of a millisecond,
 * read on a clock the page coarsens to 0.1 ms, and the first few run before V8 has optimized
 * them (1-3 ms each): a total that went from 0.4 ms to 0.8 ms per move for the icospheres, and to
 * 1.6 ms for the models, on a slow CI runner in full run 42345086610, with no change to picking
 * (issue #6067). What makes model picking cheap is that a model is tested by its box alone, never
 * by its triangles (design/rendering/node-models.md, section 3.8), and that is counted exactly.
 * @param element - The element.
 * @returns The picking's time and counted work.
 */
async function picking(element: Awaited<ReturnType<typeof mount>>): Promise<Picking> {
    const { scene, canvas } = element.graph;
    const counted: Picking = { msPerMove: 0, picks: 0, boxes: 0, triangles: 0 };
    const pick = scene.pick.bind(scene);
    scene.pick = (...args: Parameters<typeof scene.pick>) => {
        const start = performance.now();
        try {
            return pick(...args);
        } finally {
            counted.msPerMove += performance.now() - start;
            counted.picks++;
        }
    };

    const { intersectsBoxMinMax, intersectsTriangle } = Ray.prototype;
    Ray.prototype.intersectsBoxMinMax = function (this: Ray, ...args) {
        counted.boxes++;
        return intersectsBoxMinMax.apply(this, args);
    };
    Ray.prototype.intersectsTriangle = function (this: Ray, ...args) {
        counted.triangles++;
        return intersectsTriangle.apply(this, args);
    };

    const box = canvas.getBoundingClientRect();
    const moves = 20;
    try {
        for (let move = 0; move < moves; move++) {
            await hover(canvas, { x: (box.width * (move + 1)) / (moves + 1), y: box.height / 2 });
        }
    } finally {
        Ray.prototype.intersectsBoxMinMax = intersectsBoxMinMax;
        Ray.prototype.intersectsTriangle = intersectsTriangle;
    }

    counted.msPerMove /= moves;
    return counted;
}

describe("a thousand model nodes", () => {
    it("picks a model by its box alone, as many boxes as icospheres and no triangle", async () => {
        const icospheres = await thousand(null);
        const baseline = await picking(icospheres);
        icospheres.remove();

        const element = await thousand(sphereGlb(12, 6));
        assert.isTrue(drawnAsModel(element.graph, "n0"));
        const models = await picking(element);
        console.log(
            `[model-bench] picking per move: icosphere ${baseline.msPerMove.toFixed(3)} ms, ` +
                `model ${models.msPerMove.toFixed(3)} ms; picks ${String(baseline.picks)}/${String(models.picks)}, ` +
                `boxes ${String(baseline.boxes)}/${String(models.boxes)}, ` +
                `triangles ${String(baseline.triangles)}/${String(models.triangles)}`,
        );
        // The same pointer path over the same grid: the icospheres hit nodes and test their
        // triangles, so the counters are seen to count.
        assert.isAbove(baseline.picks, 0, "the pointer moves were picked");
        assert.isAbove(baseline.triangles, 0, "the icospheres' picks tested their triangles");
        assert.isAtMost(models.picks, baseline.picks, "a model graph picks no more often than an icosphere graph");
        assert.isAtMost(models.boxes, baseline.boxes, "a model pick tests no more boxes than an icosphere pick");
        assert.strictEqual(models.triangles, 0, "a model pick tests no triangle");
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
