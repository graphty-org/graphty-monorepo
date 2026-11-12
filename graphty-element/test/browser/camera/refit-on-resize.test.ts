/**
 * @file `camera.refitOnResize`: a canvas resize frames the graph the same whenever it lands (issue #5097).
 *
 * A fit reads the canvas size when it lands, and a resize before the picture is final owes the fit
 * again (owed-fit-reads-late-inputs.test.ts). A resize after that point moved nothing, so a page whose
 * panel opens beside the canvas drew one picture when the panel opened early and another when it
 * opened late. That stays the default; `refitOnResize` frames again on every resize while the
 * camera is where a fit left it, and never moves a camera the reader placed.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { wheel } from "../../helpers/real-input";

const WIDTH = 640;
const HEIGHT = 480;
/** The canvas once a 200 px panel opens beside it. */
const NARROW = 440;

type Mode = "2d" | "3d";

/**
 * A ring whose framing a narrower canvas changes. The 3D camera keeps its vertical field of view
 * across a resize, so a wide ring is cut off at the sides; the 2D camera keeps its half-width, so a
 * tall ring is drawn smaller.
 * @param mode - The view mode.
 * @returns The nodes.
 */
function ring(mode: Mode): { id: string; position: { x: number; y: number; z: number } }[] {
    const [rx, ry] = mode === "3d" ? [30, 10] : [10, 30];
    return Array.from({ length: 16 }, (_, i) => ({
        id: `n${String(i)}`,
        position: { x: rx * Math.cos((i / 16) * Math.PI * 2), y: ry * Math.sin((i / 16) * Math.PI * 2), z: 0 },
    }));
}

/** The ids every ring has. */
const NODES = ring("2d");
type Drawn = Record<string, { x: number; y: number }>;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Mount an element at the wide size, empty and drawn.
 * @param mode - The view mode.
 * @param refitOnResize - The option under test; undefined leaves the default.
 * @returns The element and its container.
 */
async function mount(mode: Mode, refitOnResize?: boolean): Promise<{ element: Graphty; container: HTMLDivElement }> {
    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    cleanups.push(() => {
        container.remove();
    });
    const element = document.createElement("graphty-element");
    container.appendChild(element);
    if (refitOnResize !== undefined) {
        element.layoutBehavior = { camera: { refitOnResize } };
    }

    await element.setViewMode(mode);
    await element.waitForStableFrame();
    return { element, container };
}

/**
 * Open the panel: the canvas narrows, and the element is told, as its ResizeObserver tells it.
 * @param element - The element.
 * @param container - Its box.
 */
function narrow(element: Graphty, container: HTMLDivElement): void {
    container.style.width = `${String(NARROW)}px`;
    element.graph.resize();
}

/**
 * Load the graph and draw it, narrowing the canvas as the first fit lands, before the picture is final.
 * @param mode - The view mode.
 * @param refitOnResize - The option under test.
 * @returns The element.
 */
async function resizedBeforeFinal(mode: Mode, refitOnResize?: boolean): Promise<Graphty> {
    const { element, container } = await mount(mode, refitOnResize);
    let resized = false;
    const off = element.graph.on("zoom-to-fit-complete", () => {
        if (!resized) {
            resized = true;
            narrow(element, container);
        }
    });
    try {
        await element.graph.addNodes(ring(mode));
        await element.graph.setLayout("fixed", { dim: mode === "2d" ? 2 : 3 });
        await element.waitForStableFrame();
    } finally {
        off();
    }

    assert.isTrue(resized, "the canvas narrowed as the fit landed");
    return element;
}

/**
 * Load the graph, draw its final picture, and narrow the canvas after it.
 * @param mode - The view mode.
 * @param refitOnResize - The option under test.
 * @param beforeResize - Run once the picture is final, before the canvas narrows.
 * @returns The element.
 */
async function resizedAfterFinal(
    mode: Mode,
    refitOnResize?: boolean,
    beforeResize?: (element: Graphty) => Promise<void>,
): Promise<Graphty> {
    const { element, container } = await mount(mode, refitOnResize);
    await element.graph.addNodes(ring(mode));
    await element.graph.setLayout("fixed", { dim: mode === "2d" ? 2 : 3 });
    await element.waitForStableFrame();
    await beforeResize?.(element);
    narrow(element, container);
    await element.waitForStableFrame();
    return element;
}

/**
 * Where every node is drawn.
 * @param element - The element.
 * @returns Screen positions by node id.
 */
function drawn(element: Graphty): Drawn {
    const out: Drawn = {};
    for (const { id } of NODES) {
        const at = element.nodeScreenPosition(id);
        assert.isDefined(at, id);
        out[id] = { x: at.x, y: at.y };
    }

    return out;
}

/**
 * The largest distance, in CSS pixels, between where two pictures draw the same node.
 * @param a - One picture.
 * @param b - The other.
 * @returns The distance.
 */
function farthest(a: Drawn, b: Drawn): number {
    return Math.max(...NODES.map(({ id }) => Math.hypot(a[id].x - b[id].x, a[id].y - b[id].y)));
}

describe("camera.refitOnResize", () => {
    for (const mode of ["2d", "3d"] as const) {
        it(`on, a resize before or after the picture is final draws the same framing (${mode})`, async () => {
            const before = drawn(await resizedBeforeFinal(mode, true));
            const after = drawn(await resizedAfterFinal(mode, true));
            assert.isAtMost(farthest(before, after), 1, "the same framing whenever the canvas narrowed");
            for (const { id } of NODES) {
                assert.isAtLeast(after[id].x, 0, `${id} is inside the narrowed canvas`);
                assert.isAtMost(after[id].x, NARROW, `${id} is inside the narrowed canvas`);
            }
        });

        it(`off by default, a resize after the picture is final keeps the camera (${mode})`, async () => {
            const before = drawn(await resizedBeforeFinal(mode));
            const after = drawn(await resizedAfterFinal(mode));
            assert.isAbove(farthest(before, after), 1, "the late resize was not framed again");
        });
    }

    it("on, never moves a camera the reader placed", async () => {
        let fits = 0;
        let off = (): void => undefined;
        const element = await resizedAfterFinal("3d", true, async (el) => {
            await wheel(el, { x: WIDTH / 2, y: HEIGHT / 2 }, -400);
            await el.waitForStableFrame();
            assert.isTrue(el.cameraPlaced, "the reader's wheel placed the camera");
            off = el.graph.on("zoom-to-fit-complete", () => {
                fits++;
            });
        });
        off();
        // The wheel's own glide may still be moving the camera, so the fits are counted, not the camera read.
        assert.strictEqual(fits, 0, "the resize did not frame the graph again");
        assert.isTrue(element.cameraPlaced, "the camera is still the reader's");
    });
});
