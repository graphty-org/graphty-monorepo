import type { Engine } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { EventManager } from "../../src/managers/EventManager";
import { RenderManager } from "../../src/managers/RenderManager";

/**
 * The render loop must not draw a frame while the GPU is still drawing the one before it.
 *
 * Without that, the browser queues about twenty frames, and on a software GPU a frame of a few
 * hundred nodes costs 40 ms, so a still graph kept the GPU close to a second behind and a
 * screenshot waited behind every queued frame -- past 30 seconds on a loaded CI runner. Here the
 * GPU is made to look busy by answering every fence "unsignalled", which must stop the frames,
 * and answering normally again must resume them.
 */
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

    it("draws no frame while the last one is unfinished, and resumes once it is", async () => {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        manager = new RenderManager(canvas, {} as EventManager);
        const gl = (manager.engine as Engine)._gl;
        assert.isFunction(gl.fenceSync, "the browser project's Chromium has WebGL 2");

        let drawn = 0;
        manager.startRenderLoop(() => {
            drawn++;
        });
        await frames(5);
        assert.isAbove(drawn, 0, "the loop draws while the GPU keeps up");

        const real = gl.getSyncParameter.bind(gl);
        gl.getSyncParameter = (sync: WebGLSync, pname: GLenum): unknown =>
            pname === gl.SYNC_STATUS ? gl.UNSIGNALED : real(sync, pname);
        await frames(2);
        const held = drawn;
        await frames(10);
        assert.strictEqual(drawn, held, "no frame is drawn while the last frame's fence is unsignalled");

        gl.getSyncParameter = real;
        await frames(5);
        assert.isAbove(drawn, held, "drawing resumes once the GPU has finished the last frame");

        canvas.remove();
    });
});
