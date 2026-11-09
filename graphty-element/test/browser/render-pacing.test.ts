import "../../src/graphty-element";

import type { Engine } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { EventManager } from "../../src/managers/EventManager";
import { RenderManager } from "../../src/managers/RenderManager";

/**
 * The render loop must not draw a frame while the GPU is still drawing the one before it.
 *
 * Without that, the browser queues about twenty frames, and on a software GPU a frame of a few
 * hundred nodes costs 40 ms, so a still graph kept the GPU close to a second behind and a
 * screenshot waited behind every queued frame -- past 30 seconds on a loaded CI runner. Here the
 * GPU is made to look busy by answering every fence "unsignalled", which must stop the frames,
 * and answering normally again must resume them.
 *
 * The skipped ticks still passed, and the frame that follows must be told so: a layout keeps to
 * wall-clock pace from the frame time it is handed, and when that was only the last tick's
 * 16 ms the College football sample took twice as long to settle on a loaded CI runner.
 */
/**
 * Records a context's fences and whether a flush came straight after each.
 * @param gl - The context.
 * @returns How many fences, and how many were flushed at once, since the call.
 */
function recordFences(gl: WebGL2RenderingContext): () => { fences: number; flushed: number } {
    const calls: string[] = [];
    const fenceSync = gl.fenceSync.bind(gl);
    const flush = gl.flush.bind(gl);
    gl.fenceSync = (condition: GLenum, flags: GLbitfield): WebGLSync | null => {
        calls.push("fence");
        return fenceSync(condition, flags);
    };
    gl.flush = (): void => {
        calls.push("flush");
        flush();
    };
    return () => {
        const result = {
            fences: calls.filter((call) => call === "fence").length,
            flushed: calls.filter((call, i) => call === "fence" && calls[i + 1] === "flush").length,
        };
        calls.length = 0;
        return result;
    };
}

describe("render loop pacing", () => {
    let manager: RenderManager | undefined;

    afterEach(() => {
        manager?.dispose();
        manager = undefined;
    });

    const frames = (n: number): Promise<void> =>
        new Promise((resolve) => {
            const tick = (left: number): void => {
                if (left === 0) {
                    resolve();
                } else {
                    requestAnimationFrame(() => {
                        tick(left - 1);
                    });
                }
            };
            tick(n);
        });

    it("draws no frame while the last one is unfinished, and resumes with the time it skipped", async () => {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        manager = new RenderManager(canvas, new EventManager());
        const gl = (manager.engine as Engine)._gl;
        assert.isFunction(gl.fenceSync, "the browser project's Chromium has WebGL 2");

        // Every tick lasts TICK_MS, so the frame time the loop hands on is counted in ticks, not read
        // off the clock.
        const TICK_MS = 7;
        manager.engine.getDeltaTime = (): number => TICK_MS;
        let drawn = 0;
        const frameTimes: number[] = [];
        manager.startRenderLoop((frameMs) => {
            drawn++;
            frameTimes.push(frameMs);
        });
        await frames(5);
        assert.isAbove(drawn, 0, "the loop draws while the GPU keeps up");

        const real = gl.getSyncParameter.bind(gl);
        gl.getSyncParameter = (sync: WebGLSync, pname: GLenum): unknown =>
            pname === gl.SYNC_STATUS ? gl.UNSIGNALED : real(sync, pname);
        await frames(2);
        const held = drawn;
        const behindBefore = manager.ticks.gpuBehind;
        await frames(10);
        assert.strictEqual(drawn, held, "no frame is drawn while the last frame's fence is unsignalled");

        gl.getSyncParameter = real;
        const skipped = manager.ticks.gpuBehind - behindBefore;
        assert.isAbove(skipped, 0, "the loop kept ticking while it held the frame");
        await frames(5);
        assert.isAbove(drawn, held, "drawing resumes once the GPU has finished the last frame");
        assert.isAtLeast(
            frameTimes[held],
            (skipped + 1) * TICK_MS,
            "the first frame after the skip is handed the time of every tick it skipped",
        );

        canvas.remove();
    });
    /**
     * A fence the GPU has not been told about signals only when Chromium flushes on its own, about
     * every 18 ms, so a batched frame that takes 1 ms measured 18. Under renderPath "batched" the
     * loop flushes right after each frame's fence; under "objects" it stays as it was.
     */
    for (const flushes of [true, false]) {
        it(`${flushes ? "flushes" : "does not flush"} after each frame's fence when asked ${flushes ? "to" : "not to"}, and still keeps one frame in flight`, async () => {
            const canvas = document.createElement("canvas");
            document.body.appendChild(canvas);
            manager = new RenderManager(canvas, new EventManager(), { flushesFrameFence: () => flushes });
            const gl = (manager.engine as Engine)._gl;
            const fenced = recordFences(gl);
            let drawn = 0;
            manager.startRenderLoop(() => {
                drawn++;
            });
            await frames(5);

            const { fences, flushed } = fenced();
            assert.isAbove(fences, 0, "the loop fenced the frames it drew");
            assert.strictEqual(flushed, flushes ? fences : 0, "a flush follows each frame fence only when asked");

            const real = gl.getSyncParameter.bind(gl);
            gl.getSyncParameter = (sync: WebGLSync, pname: GLenum): unknown =>
                pname === gl.SYNC_STATUS ? gl.UNSIGNALED : real(sync, pname);
            await frames(2);
            const held = drawn;
            await frames(10);
            assert.strictEqual(drawn, held, "no frame is drawn while the last frame's fence is unsignalled");
            gl.getSyncParameter = real;

            canvas.remove();
        });
    }
    it("flushes the frame fence under renderPath batched only, following a live path change", async () => {
        const element = document.createElement("graphty-element");
        // Drawing every frame, so a still graph still fences frames to count.
        element.renderOnDemand = false;
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        try {
            await element.updateComplete;
            await operationQueueOf(element.graph).waitForCompletion();
            const { renderManager } = element.graph as unknown as { renderManager: RenderManager };
            const fenced = recordFences((renderManager.engine as Engine)._gl);

            await frames(5);
            const objects = fenced();
            assert.isAbove(objects.fences, 0, "the element's loop fenced its frames");
            assert.strictEqual(objects.flushed, 0, "objects: no flush after the frame fence");

            element.graph.setRenderPath("batched");
            await frames(2);
            fenced();
            await frames(5);
            const batched = fenced();
            assert.isAbove(batched.fences, 0, "the element's loop fenced its frames");
            assert.strictEqual(batched.flushed, batched.fences, "batched: a flush after every frame fence");
        } finally {
            element.remove();
        }
    });
});
