/**
 * `render-mode="on-demand"` draws nothing while the graph is at rest, and draws again on every
 * kind of change (issue #1813).
 *
 * The default loop draws a frame on every animation frame, so a graph nobody touches keeps the
 * page's main thread and the GPU busy for as long as it is on screen. On demand, the update pass
 * still runs each tick and asks for a frame only when it changed something; these tests count the
 * scene's renders to pin both halves: zero while idle, and at least one after a data edit, a
 * style edit, a camera move, a camera animation, a resize, a real drag and its inertia, and an explicit
 * request -- and back to zero after each.
 */
import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { drag, nextFrame } from "../helpers/real-input";

/** Animation frames with no render that count as the graph being at rest. */
const IDLE_TICKS = 30;

/** The most animation frames any wait here lets pass before failing. */
const MAX_TICKS = 1200;

let container: HTMLDivElement;

beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
});

afterEach(() => {
    container.remove();
});

/**
 * Stand an element up with three nodes and wait for its finished picture.
 * @param mode - The render mode, or undefined to leave the default.
 * @returns The element.
 */
async function mount(mode?: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    if (mode !== undefined) {
        element.setAttribute("render-mode", mode);
    }

    container.appendChild(element);
    await element.updateComplete;
    await element.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await element.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);
    await element.waitForSettled();
    await element.graph.waitForStableFrame();

    return element;
}

/**
 * Count the scene's renders over a number of animation frames.
 * @param element - The element whose scene is counted.
 * @param ticks - How many animation frames to watch.
 * @returns How many frames the scene drew.
 */
async function rendersOver(element: Graphty, ticks: number): Promise<number> {
    const scene = element.graph.getScene();
    let rendered = 0;
    const observer = scene.onAfterRenderObservable.add(() => {
        rendered++;
    });

    try {
        for (let tick = 0; tick < ticks; tick++) {
            await nextFrame();
        }
    } finally {
        scene.onAfterRenderObservable.remove(observer);
    }

    return rendered;
}

/**
 * Wait until the scene has gone {@link IDLE_TICKS} animation frames without drawing, or fail.
 * @param element - The element to watch.
 * @param after - What just happened, for the failure message.
 */
async function untilIdle(element: Graphty, after: string): Promise<void> {
    const scene = element.graph.getScene();
    let quiet = 0;
    let drew = false;
    const observer = scene.onAfterRenderObservable.add(() => {
        drew = true;
    });

    try {
        for (let tick = 0; tick < MAX_TICKS && quiet < IDLE_TICKS; tick++) {
            drew = false;
            await nextFrame();
            quiet = drew ? 0 : quiet + 1;
        }
    } finally {
        scene.onAfterRenderObservable.remove(observer);
    }

    assert.strictEqual(quiet, IDLE_TICKS, `the graph stopped drawing after ${after}`);
}

/**
 * Run a change and wait until the scene has drawn a frame since it started, or fail. Frames drawn
 * while the change runs count: a drag is drawn as it happens, not after.
 * @param element - The element to watch.
 * @param name - What the change is, for the failure message.
 * @param make - Makes the change.
 */
async function drawsAfter(element: Graphty, name: string, make: () => Promise<unknown>): Promise<void> {
    const scene = element.graph.getScene();
    let drew = false;
    const observer = scene.onAfterRenderObservable.add(() => {
        drew = true;
    });

    try {
        await make();
        for (let tick = 0; tick < MAX_TICKS && !drew; tick++) {
            await nextFrame();
        }
    } finally {
        scene.onAfterRenderObservable.remove(observer);
    }

    assert.isTrue(drew, `the graph drew a frame for ${name}`);
}

describe("the render mode", () => {
    it('is "continuous" by default and draws while the graph is at rest', async () => {
        const element = await mount();

        assert.strictEqual(element.renderMode, "continuous");
        assert.isAbove(await rendersOver(element, 10), 0, "a continuous graph at rest still draws");
    });

    it("ignores a value it does not know, keeping the mode it had", async () => {
        const element = await mount("on-demand");

        element.setAttribute("render-mode", "sometimes");
        await element.updateComplete;

        assert.strictEqual(element.renderMode, "on-demand");
    });

    it("draws nothing at rest on demand", async () => {
        const element = await mount("on-demand");

        assert.strictEqual(element.renderMode, "on-demand");
        await untilIdle(element, "the load");
        assert.strictEqual(await rendersOver(element, 60), 0, "an idle graph draws no frame in 60 ticks");
    });

    /** Each change an on-demand graph has to draw, and how to make it. */
    const changes: readonly { readonly name: string; readonly make: (element: Graphty) => Promise<unknown> }[] = [
        {
            name: "a data edit",
            make: async (element) => {
                await element.addNodes([{ id: "d" }]);
                await element.addEdges([{ src: "c", dst: "d" }]);
            },
        },
        {
            name: "a style edit",
            make: async (element) => {
                await element.session.styles.add({
                    name: "red nodes",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "#ff0000" },
                });
            },
        },
        {
            name: "a camera move",
            make: (element) =>
                element.setCameraState({ position: { x: 0, y: 0, z: 40 }, target: { x: 0, y: 0, z: 0 } }),
        },
        {
            name: "a camera animation",
            make: async (element) => {
                await element.setCameraState(
                    { position: { x: 0, y: 30, z: 30 }, target: { x: 0, y: 0, z: 0 } },
                    { animate: true, duration: 200 },
                );
            },
        },
        {
            name: "a resize",
            make: () => {
                container.style.width = "500px";
                return Promise.resolve();
            },
        },
        {
            name: "a drag that turns the camera, and its inertia",
            make: async (element) => {
                const { canvas } = element.graph;
                const box = canvas.getBoundingClientRect();
                await drag(
                    canvas,
                    { x: box.width / 4, y: box.height / 2 },
                    { x: (box.width * 3) / 4, y: box.height / 2 },
                );
            },
        },
        {
            name: "requestRender()",
            make: (element) => {
                element.requestRender();
                return Promise.resolve();
            },
        },
    ];

    for (const change of changes) {
        it(`draws again on demand after ${change.name}, then comes back to rest`, async () => {
            const element = await mount("on-demand");
            await untilIdle(element, "the load");

            await drawsAfter(element, change.name, () => change.make(element));
            await untilIdle(element, change.name);
        });
    }

    it("keeps drawing on demand while an edge animates, and rests once it stops", async () => {
        const element = await mount("on-demand");
        await untilIdle(element, "the load");

        const layer = await element.session.styles.add({
            name: "moving edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.animationSpeed": 1 },
        });

        assert.isAbove(await rendersOver(element, 30), 1, "an animated edge is drawn on frame after frame");

        await element.session.styles.remove(layer.id);
        await untilIdle(element, "the animation was taken off");
    });

    it("can be switched at any time: back to continuous draws every frame again", async () => {
        const element = await mount("on-demand");

        await untilIdle(element, "the load");
        element.renderMode = "continuous";
        await element.updateComplete;

        assert.strictEqual(element.getAttribute("render-mode"), "continuous", "the attribute reflects the mode");
        assert.isAbove(await rendersOver(element, 10), 0, "a continuous graph at rest draws again");
    });
});
