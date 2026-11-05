import { afterEach, assert, describe, it } from "vitest";

import { EventManager } from "../../src/managers/EventManager";
import { RenderManager } from "../../src/managers/RenderManager";

/**
 * A stepped play with `waitForRender` waits on `frameDrawn` before its next step, so the wait must
 * end on a drawn frame and also whenever no frame is coming, or the play would stop for good.
 */
describe("waiting for a drawn frame", () => {
    let manager: RenderManager | undefined;

    afterEach(() => {
        Reflect.deleteProperty(document, "hidden");
        manager?.dispose();
        manager = undefined;
    });

    const started = (): RenderManager => {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        const made = new RenderManager(canvas, new EventManager());
        manager = made;
        made.startRenderLoop(() => undefined);
        return made;
    };

    const listeners = (made: RenderManager): number =>
        made.scene.onAfterRenderObservable.observers.length + made.engine.onEndFrameObservable.observers.length;

    it("ends on a drawn frame, and leaves nothing listening before or after", async () => {
        const made = started();
        let drawn = 0;
        made.scene.onAfterRenderObservable.add(() => {
            drawn++;
        });
        const before = listeners(made);

        const wait = made.frameDrawn();
        assert.isAbove(listeners(made), before);
        await wait;
        assert.isAbove(drawn, 0);

        // Babylon takes an observer off in a task of its own, ahead of the next frame.
        await new Promise(requestAnimationFrame);
        assert.strictEqual(listeners(made), before);
    });

    it("ends under a held frame, one held before it and one held after", async () => {
        const made = started();
        const release = made.holdFrames();
        await made.frameDrawn();
        release();

        const wait = made.frameDrawn();
        const late = made.holdFrames();
        await wait;
        late();
    });

    it("ends while a load holds the draw", async () => {
        const made = started();
        made.drawHeld = () => true;
        await made.frameDrawn();
    });

    it("ends on a hidden page, hidden before it and hidden during it", async () => {
        const made = started();
        const wait = made.frameDrawn();
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
        await wait;
        await made.frameDrawn();
    });

    it("ends when the render loop stops, and with none running", async () => {
        const made = started();
        const wait = made.frameDrawn();
        made.stopRenderLoop();
        await wait;
        await made.frameDrawn();
    });

    it("ends when the GL context is lost", async () => {
        const made = started();
        const wait = made.frameDrawn();
        made.engine.getRenderingCanvas()?.dispatchEvent(new Event("webglcontextlost"));
        await wait;
        await made.frameDrawn();
    });
});
