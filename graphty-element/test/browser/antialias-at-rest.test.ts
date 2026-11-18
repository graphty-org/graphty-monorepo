/**
 * @file `antialias: "at-rest"`: while anything moves, frames are drawn as `antialias: false` draws
 * them (no multisampling, straight lines, 2D and 3D, on the lean program); once the scene is still, one frame
 * is drawn multisampled, the picture `antialias: true` draws, and held. The multisampled frame is
 * counted, not timed: it is drawn once, and the ticks after it draw nothing.
 */

import "../../src/graphty-element";

import { CreateScreenshotAsync } from "@babylonjs/core/Misc/screenshotTools.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf, renderManagerOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import type { Antialias } from "../../src/meshes/PulledLineBatch";
import type { CodedFact } from "../../src/session/shared";
import { drag, nextFrame } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";

const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const RENDERERS = ADAPTER === "" ? (["webgl"] as const) : (["webgl", "webgpu"] as const);

/** Ticks in a row the loop must rest on a frame before the picture counts as held. */
const RESTING_TICKS = 6;

/** Frames a still scene may draw before the wait gives up: it is not still. */
const MAX_DRAWS = 600;

const LEAN = "#define EDGE_PULLED_LEAN";

afterEach(() => {
    document.body.replaceChildren();
});

/** A grid of nodes at fixed places, the ring through them and two diagonals: thin straight lines. */
const NODES = Array.from({ length: 9 }, (_, id) => ({
    id,
    position: { x: (id % 3) * 1.4 - 1.4, y: Math.floor(id / 3) * 1.4 - 1.4, z: (id % 2) * 0.6 },
}));
const EDGES = [
    ...NODES.map((node) => ({ src: node.id, dst: (node.id + 1) % NODES.length })),
    { src: 0, dst: 8 },
    { src: 2, dst: 6 },
];

/** What one frame drawn by the loop was drawn with. */
interface FrameLog {
    /** Whether a straight line batch drew the lean program. */
    readonly lean: boolean;
    /** Whether the frame went through the pass with no multisampling. */
    readonly fast: boolean;
}

/**
 * The element's render loop.
 * @param element - The element.
 * @returns Its render manager.
 */
function loopOf(element: Graphty): RenderManager {
    return renderManagerOf(element.graph);
}

/**
 * Mount an element on renderPath "batched" with the graph loaded, its edges uncapped so every one is
 * a pulled straight line.
 * @param antialias - The element's `antialias`.
 * @param renderer - The renderer.
 * @param viewMode - The element's `viewMode`.
 * @returns The element and the log of every frame its loop draws from now on.
 */
async function loaded(
    antialias: Antialias,
    renderer: "webgl" | "webgpu" = "webgl",
    viewMode: "3d" | "2d" = "3d",
): Promise<{ element: Graphty; frames: FrameLog[] }> {
    const element = document.createElement("graphty-element");
    element.antialias = antialias;
    element.renderer = renderer;
    element.viewMode = viewMode;
    element.renderPath = "batched";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: viewMode === "2d" ? 2 : 3 });
    const ids = EDGES.map((edge) => edgeBetween(element.graph, edge.src, edge.dst)?.id);
    await element.session.styles.add({
        name: "uncapped",
        target: "edge",
        selector: { match: "ids", edges: ids },
        set: { "edge.arrowHead": "none" },
    } as never);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const frames: FrameLog[] = [];
    const scene = element.graph.getScene();
    scene.onBeforeRenderObservable.add(() => {
        const batches = [...element.graph.getMeshCache().pulledBatchMap.values()];
        const camera = scene.activeCamera;
        frames.push({
            lean: batches.some((batch) =>
                (batch.mesh.material as unknown as { options: { defines: string[] } }).options.defines.includes(LEAN),
            ),
            fast: (camera?._postProcesses ?? []).some((pass) => pass?.name === "antialias-at-rest"),
        });
    });
    return { element, frames };
}

/**
 * Wait until the loop has rested {@link RESTING_TICKS} ticks in a row on the frame it drew last.
 * @param element - The element.
 */
async function untilHeld(element: Graphty): Promise<void> {
    const { ticks } = loopOf(element);
    const firstDraw = ticks.drawn;
    let lastDraw = ticks.drawn;
    let restedSince = ticks.rested;
    while (ticks.rested - restedSince < RESTING_TICKS) {
        if (ticks.drawn - firstDraw > MAX_DRAWS) {
            throw new Error(`still drawing after ${String(MAX_DRAWS)} frames`);
        }

        await nextFrame();
        if (ticks.drawn !== lastDraw) {
            lastDraw = ticks.drawn;
            restedSince = ticks.rested;
        }
    }
}

/**
 * The canvas as the page shows it, read through a 2D canvas (the context preserves its drawing).
 * @param element - The element.
 * @returns RGBA bytes.
 */
function shown(element: Graphty): Uint8ClampedArray {
    const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(canvas, 0, 0);
    return context.getImageData(0, 0, copy.width, copy.height).data;
}

/**
 * Pixels differing by more than a level in any channel.
 * @param a - A picture.
 * @param b - A picture of the same size.
 * @returns How many.
 */
function differing(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
    assert.strictEqual(a.length, b.length, "same size");
    let over = 0;
    for (let i = 0; i < a.length; i += 4) {
        for (let c = 0; c < 4; c++) {
            if (Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0)) > 1) {
                over++;
                break;
            }
        }
    }

    return over;
}

/**
 * Drag node 4 with the mouse.
 * @param element - The element.
 * @param frames - The element's frame log.
 * @returns Where in the log the button went down: the mouse's move onto the node before it is
 *     a motion of its own, which may end in a held frame.
 */
async function dragNode(element: Graphty, frames: readonly FrameLog[]): Promise<number> {
    const node = element.graph.getNode(4);
    assert.isDefined(node);
    const from = element.worldToScreen(node.drawnWorldPosition);
    const { x } = node.drawnPosition;
    let down = -1;
    element.addEventListener(
        "pointerdown",
        () => {
            down = frames.length;
        },
        { once: true, capture: true },
    );
    await drag(element, from, { x: from.x + 40, y: from.y + 30 });
    assert.notEqual(node.drawnPosition.x, x, "the drag moved the node");
    assert.isAtLeast(down, 0, "the button went down on the element");
    return down;
}

/**
 * The picture a fresh element draws and holds.
 * @param antialias - Its `antialias`.
 * @returns The picture.
 */
async function heldPicture(antialias: Antialias): Promise<Uint8ClampedArray> {
    const { element } = await loaded(antialias);
    await untilHeld(element);
    const picture = shown(element);
    element.remove();
    return picture;
}

describe('antialias "at-rest"', () => {
    it("holds the picture antialias true draws", async () => {
        const smooth = await heldPicture(true);
        const hard = await heldPicture(false);
        const atRest = await heldPicture("at-rest");

        assert.isAbove(differing(smooth, hard), 0, "multisampling changes this picture");
        assert.strictEqual(differing(atRest, smooth), 0);
    });

    it("draws 2D straight lines with the lean program under antialias false: 6 vertices an edge", async () => {
        const { element } = await loaded(false, "webgl", "2d");
        const batches = [...element.graph.getMeshCache().pulledBatchMap.entries()];
        const flat = batches.filter(([key]) => key.endsWith("|2d"));
        assert.isAbove(flat.length, 0, `a 2D line batch: ${JSON.stringify(batches.map(([key]) => key))}`);
        for (const [key, batch] of flat) {
            assert.strictEqual(batch.drawnCount, EDGES.length, `${key}: pieces`);
            assert.strictEqual(batch.mesh.subMeshes[0].verticesCount, EDGES.length * 6, `${key}: vertices drawn`);
        }
    });

    const DRAGGED = [
        ...RENDERERS.map((renderer) => ({ renderer, viewMode: "3d" as const })),
        { renderer: "webgl" as const, viewMode: "2d" as const },
    ];
    for (const { renderer, viewMode } of DRAGGED) {
        it(`draws moving frames lean and unmultisampled, then one multisampled frame (${renderer}, ${viewMode})`, async () => {
            const { element, frames } = await loaded("at-rest", renderer, viewMode);
            await untilHeld(element);
            const { ticks } = loopOf(element);
            const down = await dragNode(element, frames);
            const smoothAtDown = ticks.smooth;
            await untilHeld(element);

            const drawn = frames.slice(down);
            assert.isAtLeast(drawn.length, 2, "the drag drew frames");
            const last = drawn.at(-1);
            assert.deepEqual(last, { lean: false, fast: false }, "the held frame is multisampled, joined");
            assert.deepEqual(
                drawn.slice(0, -1).filter((frame) => !frame.lean || !frame.fast),
                [],
                `every frame before it is fast and lean: ${JSON.stringify(drawn)}`,
            );
            assert.strictEqual(ticks.smooth - smoothAtDown, 1, "one multisampled frame after the release");

            // Resting: no tick draws again, multisampled or not.
            const drawnBefore = ticks.drawn;
            const restedBefore = ticks.rested;
            while (ticks.rested - restedBefore < RESTING_TICKS) {
                await nextFrame();
            }
            assert.strictEqual(ticks.drawn, drawnBefore, "the held frame is not drawn again");
        });
    }

    it("draws the multisampled frame again after a resize", async () => {
        const { element } = await loaded("at-rest");
        await untilHeld(element);
        const { ticks } = loopOf(element);
        const smoothBefore = ticks.smooth;

        element.style.width = "360px";
        await untilHeld(element);

        assert.strictEqual(ticks.smooth - smoothBefore, 1);
    });

    it("draws the multisampled frame again after the context is lost and restored", async () => {
        const { element } = await loaded("at-rest");
        await untilHeld(element);
        const { ticks } = loopOf(element);
        const smoothBefore = ticks.smooth;
        const picture = shown(element);
        const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
        const extension = canvas?.getContext("webgl2")?.getExtension("WEBGL_lose_context");
        assert.isDefined(extension);
        assert.isNotNull(extension);

        const lost = new Promise<void>((resolve) => {
            element.addEventListener("render-lost", () => {
                resolve();
            });
        });
        extension.loseContext();
        await lost;
        await element.restartRenderer();
        await untilHeld(element);

        assert.isAtLeast(ticks.smooth - smoothBefore, 1);
        assert.strictEqual(differing(shown(element), picture), 0, "the same picture as before the loss");
    });

    it("takes a screenshot of the multisampled picture, while moving too", async () => {
        const smooth = await heldPicture(true);
        const { element } = await loaded("at-rest");
        await untilHeld(element);
        // Something to draw: the screenshot's frame is drawn while the loop would draw fast.
        loopOf(element).requestFrame();
        // The test setup stands a 1x1 picture in for Babylon's capture; this one is the real thing.
        const real = await vi.importActual<typeof import("@babylonjs/core/Misc/screenshotTools.js")>(
            "@babylonjs/core/Misc/screenshotTools.js",
        );
        vi.mocked(CreateScreenshotAsync).mockImplementationOnce(real.CreateScreenshotAsync);
        const { blob } = await element.captureScreenshot();
        const bitmap = await createImageBitmap(blob);
        assert.strictEqual(
            `${String(bitmap.width)}x${String(bitmap.height)}`,
            "400x300",
            `a ${blob.type} of ${String(blob.size)} bytes`,
        );
        const copy = document.createElement("canvas");
        copy.width = bitmap.width;
        copy.height = bitmap.height;
        const context = copy.getContext("2d");
        assert.isNotNull(context);
        context.drawImage(bitmap, 0, 0);

        assert.strictEqual(differing(context.getImageData(0, 0, copy.width, copy.height).data, smooth), 0);
    });

    it("switches with true at any time on an element built with either, and says when it cannot", async () => {
        const { element, frames } = await loaded(true);
        const warnings: CodedFact[] = [];
        element.addEventListener("graphty-warning", (event) => warnings.push(event.detail));

        element.antialias = "at-rest";
        assert.strictEqual(element.antialias, "at-rest");
        await untilHeld(element);
        const down = await dragNode(element, frames);
        await untilHeld(element);
        assert.isTrue(
            frames.slice(down, -1).every((frame) => frame.lean && frame.fast),
            "moving frames are fast",
        );

        element.antialias = true;
        assert.isTrue(element.antialias);
        element.antialias = false;
        assert.isTrue(element.antialias, "false needs a new engine");
        assert.deepEqual(warnings, [{ code: "W_ANTIALIAS_LATE", params: { requested: false, active: true } }]);

        const built = (await loaded(false)).element;
        const late: CodedFact[] = [];
        built.addEventListener("graphty-warning", (event) => late.push(event.detail));
        built.antialias = "at-rest";
        assert.isFalse(built.antialias);
        assert.deepEqual(late, [{ code: "W_ANTIALIAS_LATE", params: { requested: "at-rest", active: false } }]);
    });

    it('is read from the attribute "at-rest"', async () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        host.innerHTML = '<graphty-element antialias="at-rest"></graphty-element>';
        const element = host.querySelector("graphty-element") as Graphty;
        await element.updateComplete;
        assert.strictEqual(element.antialias, "at-rest");
    });
});
