import "../../src/graphty-element";

import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { isGraphtyError } from "../../src/errors";
import { setDefaultFeatures } from "../../src/features/resolve";
import { EventManager } from "../../src/managers/EventManager";
import { RenderManager } from "../../src/managers/RenderManager";
import { takeCaughtErrors } from "../helpers/caught-errors";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

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

    const started = (
        config?: ConstructorParameters<typeof RenderManager>[2],
        update: () => void = () => undefined,
    ): RenderManager => {
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        const made = new RenderManager(canvas, new EventManager(), config);
        manager = made;
        made.startRenderLoop(update);
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

    it("ends when every frame throws", async () => {
        const made = started(undefined, () => {
            throw new Error("a frame that always throws");
        });
        await made.frameDrawn();
        await made.frameDrawn();
        made.stopRenderLoop();
        // The loop's catch reported them: this test asks that they do not stop the wait.
        assert.isNotEmpty(takeCaughtErrors());
    });

    it("ends when the render loop stops, and with none running", async () => {
        const made = started();
        const wait = made.frameDrawn();
        made.stopRenderLoop();
        await wait;
        await made.frameDrawn();
    });

    it("wakes a loop resting on a finished picture, and ends on the frame that draws", async () => {
        const made = started({ pictureIsFinal: () => true, drawsOnDemand: () => true });
        await vi.waitFor(() => {
            assert.isAbove(made.ticks.rested, 0);
        });
        const { drawn } = made.ticks;
        await made.frameDrawn();
        assert.isAbove(made.ticks.drawn, drawn);
    });

    it("ends when the GL context is lost", async () => {
        const made = started();
        const wait = made.frameDrawn();
        made.engine.getRenderingCanvas()?.dispatchEvent(new Event("webglcontextlost"));
        await wait;
        await made.frameDrawn();
    });
});

/** A stepped play with `waitForRender` on a real element: nothing that stops frames stops the play. */
describe("a play waiting for frames on a real element", () => {
    let mounted: Graphty | null = null;

    afterEach(() => {
        Reflect.deleteProperty(document, "hidden");
        setDefaultFeatures(["timeline"]);
        if (mounted?.session.time.playing === true) {
            mounted.session.time.pause();
        }

        mounted?.remove();
        mounted = null;
    });

    /**
     * An element holding an edge on the first and the last of 30 days.
     * @returns The element and its render manager.
     */
    async function loaded(): Promise<{ element: Graphty; manager: RenderManager }> {
        const made = document.createElement("graphty-element");
        made.style.width = "300px";
        made.style.height = "200px";
        made.style.display = "block";
        made.setAttribute("edge-time-path", "sent");
        document.body.appendChild(made);
        mounted = made;
        await made.updateComplete;
        await vi.waitFor(() => {
            assert.isTrue(made.graph.initialized, "the element initialised its graph");
        });
        await made.graph.setLayout("random");
        made.dataSource = "json";
        made.dataSourceConfig = {
            data: JSON.stringify({
                nodes: [{ id: "a" }, { id: "b" }],
                edges: [
                    { src: "a", dst: "b", sent: new Date(T0).toISOString() },
                    { src: "b", dst: "a", sent: new Date(T0 + 30 * DAY).toISOString() },
                ],
            }),
        };
        await made.waitForSettled();

        return { element: made, manager: Reflect.get(made.graph, "renderManager") as RenderManager };
    }

    /**
     * An element on a window between its two edges: the days there show the same nothing, so a step
     * leaves a finished picture finished.
     * @returns The element and its render manager.
     */
    async function element(): Promise<{ element: Graphty; manager: RenderManager }> {
        const made = await loaded();
        await made.element.session.time.ready;
        await made.element.session.time.window({ from: T0 + DAY, to: T0 + 2 * DAY, step: "day" });

        return made;
    }

    /**
     * Start a looping stepped play that waits for frames.
     * @param on - The element.
     */
    function play(on: Graphty): void {
        on.session.time.play({ motion: "steps", waitForRender: true, interval: 0, loop: true });
    }

    /**
     * Settles once the play has taken more steps.
     * @param on - The element.
     * @param count - How many.
     */
    async function steps(on: Graphty, count: number): Promise<void> {
        await new Promise<void>((resolve) => {
            let seen = 0;
            const off = on.session.on("time:step", () => {
                seen++;
                if (seen === count) {
                    off();
                    resolve();
                }
            });
        });
    }

    it("adds no listener to the render loop with the experiment off", async () => {
        setDefaultFeatures([]);
        const { element: made, manager } = await loaded();
        const asked = vi.spyOn(manager, "frameDrawn");
        const listening = (): number =>
            manager.scene.onAfterRenderObservable.observers.length +
            manager.engine.onEndFrameObservable.observers.length;
        const before = listening();

        let refused: unknown = null;
        try {
            play(made);
        } catch (error) {
            refused = error;
        }

        assert.isTrue(isGraphtyError(refused) && refused.code === "E_FEATURE_OFF");
        await new Promise(requestAnimationFrame);
        assert.strictEqual(asked.mock.calls.length, 0);
        assert.strictEqual(listening(), before);
    });

    it("asks the element's renderer for a frame before each step", async () => {
        const { element: made, manager } = await element();
        const asked = vi.spyOn(manager, "frameDrawn");
        play(made);
        await steps(made, 4);
        assert.isAtLeast(asked.mock.calls.length, 3);
    });

    it("goes on under a held frame", async () => {
        const { element: made, manager } = await element();
        play(made);
        await steps(made, 1);
        const release = manager.holdFrames();
        await steps(made, 4);
        release();
    });

    it("goes on when the page is hidden", async () => {
        const { element: made } = await element();
        play(made);
        await steps(made, 1);
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
        await steps(made, 4);
    });

    it("goes on when the render loop stops", async () => {
        const { element: made, manager } = await element();
        play(made);
        await steps(made, 1);
        manager.stopRenderLoop();
        await steps(made, 4);
    });

    it("goes on while the loop rests on a finished picture", async () => {
        const { element: made, manager } = await element();
        await made.setRenderSettings({ onDemand: true });
        await vi.waitFor(() => {
            assert.isAbove(manager.ticks.rested, 0);
        });
        play(made);
        await steps(made, 6);
    });
});
