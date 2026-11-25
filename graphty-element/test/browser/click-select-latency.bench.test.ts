/**
 * @file How long a real mouse click on a node takes to show its selection: from the press to
 * `selection:changed`, and to the second frame drawn after it, which is the first that can show
 * the halo. The budget is 300 ms for any graph under 100,000 nodes (issue #10116). Cases: the
 * graphty app's yEd Live sample (183 nodes, its file styles on), and square grids of nodes at
 * fixed places on both render paths.
 *
 * Runs in the `browser-bench` project (npx vitest run --project=browser-bench
 * test/browser/click-select-latency.bench.test.ts), never under coverage; set
 * GRAPHTY_BROWSER_GPU=nvidia (and GRAPHTY_EGL_LIB_DIR on a machine without a system libEGL) to time
 * the real GPU, where the largest grid is 99,000 nodes. Without a GPU, as in CI, the largest grid is
 * 10,000. Each case prints `[click-select-latency]` with the median and the worst of five clicks.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: each click selects the node clicked, and on the "objects"
 * path walks the meshes twice at most, for the arriving move and the press (`pickWork.meshPicks`), however many nodes there are. The
 * times are printed, not asserted: a timing assertion fails on a loaded machine for no defect.
 *
 * Measured on the development machine (i9-14900, RTX 4070 SUPER), 2026-11-25, press to second
 * frame. This file on the software renderer: yEd Live 100 ms; objects path 1,000 nodes 38-67 ms,
 * 10,000 nodes 169 ms; batched path 1,000 nodes 101-162 ms, 10,000 nodes 138 ms. A whole-canvas
 * script on the real GPU (1,200 by 900 pixels, every node in view): objects path 1,000 nodes
 * 31-56 ms, 10,000 nodes 50-190 ms, 99,000 nodes 389-592 ms, where one frame of 99,000 meshes
 * takes about 120 ms and the new halo thaws the frozen mesh list; batched path 99,000 nodes
 * 28-55 ms.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import yedLive from "../../../graph-io/test/corpus/programs/cheind__autoregressive__wavenet.graphml?raw";
import type { Graphty } from "../../index.js";
import { pickWork } from "../../src/render/PickService";
import { fileStylesOn } from "../helpers/file-styles-on";
import { click, hover } from "../helpers/real-input";

fileStylesOn();

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";
const SIZES = GPU ? [1_000, 10_000, 99_000] : [1_000, 10_000];
const CLICKS = 5;
/** Inside the test frame's 414-pixel-wide viewport, where the real pointer reaches. */
const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted, empty element.
 * @param renderPath - The render path.
 * @returns The element.
 */
async function mounted(renderPath: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = `display:block;width:${String(WIDTH)}px;height:${String(HEIGHT)}px`;
    element.viewMode = "2d";
    element.renderPath = renderPath;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    return element;
}

/**
 * Click several nodes with the real mouse and time each one.
 * @param element - The element, drawn.
 * @param name - The case, for the printed line.
 */
async function timeClicks(element: Graphty, name: string): Promise<void> {
    await element.waitForStableFrame();
    const ids = element.session.snapshot().ids.toArray();
    const onScreen: { id: string; x: number; y: number }[] = [];
    const step = Math.max(1, Math.floor(ids.length / 40));
    for (let row = 0; row < ids.length && onScreen.length < CLICKS; row += step) {
        const id = String(ids[row]);
        const at = element.nodeScreenPosition(id);
        if (at?.visible === true && at.x > 20 && at.y > 20 && at.x < WIDTH - 20 && at.y < HEIGHT - 20) {
            onScreen.push({ id, x: at.x, y: at.y });
        }
    }
    assert.isAbove(onScreen.length, 0, "some nodes are on screen to click");

    let pressed = 0;
    element.addEventListener("pointerdown", () => (pressed = performance.now()), { capture: true });
    const toEvent: number[] = [];
    const toPaint: number[] = [];
    for (const { id, x, y } of onScreen) {
        await hover(element, { x, y });
        await element.waitForStableFrame();
        const painted = new Promise<void>((resolve) => {
            const off = element.session.on("selection:changed", () => {
                off();
                toEvent.push(performance.now() - pressed);
                requestAnimationFrame(() =>
                    requestAnimationFrame(() => {
                        toPaint.push(performance.now() - pressed);
                        resolve();
                    }),
                );
            });
        });
        const picks = pickWork.meshPicks;
        await click(element, { x, y });
        await painted;
        assert.deepEqual([...element.session.selection.nodes], [id], `the click selected ${id}`);
        if (element.renderPath === "objects") {
            assert.isAtMost(pickWork.meshPicks - picks, 2, "the hover's walk and the press's, nothing more");
        }
    }

    const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    console.log(
        `[click-select-latency] ${name}: press to selection median ${median(toEvent).toFixed(0)} ms, ` +
            `worst ${Math.max(...toEvent).toFixed(0)} ms; press to second frame median ` +
            `${median(toPaint).toFixed(0)} ms, worst ${Math.max(...toPaint).toFixed(0)} ms (budget 300 ms)`,
    );
}

describe("a click on a node shows its selection", () => {
    it("on the yEd Live sample with its file styles", async () => {
        const element = await mounted("objects");
        await element.session.data.import(
            { type: "graphml", config: { data: yedLive } },
            { styles: "file", layout: "recommended" },
        );
        await element.waitForSettled();
        await element.session.styles.settled();
        await timeClicks(element, "yEd Live, 183 nodes");
    });

    for (const renderPath of ["objects", "batched"] as const) {
        for (const size of SIZES) {
            it(`on a grid of ${String(size)} nodes, ${renderPath} path`, async () => {
                const element = await mounted(renderPath);
                const side = Math.ceil(Math.sqrt(size));
                await element.session.data.addNodes(
                    Array.from({ length: size }, (_, at) => ({
                        id: `n${String(at)}`,
                        position: { x: (at % side) * 3, y: Math.floor(at / side) * 3, z: 0 },
                    })),
                );
                await element.graph.setLayout("fixed", { dim: 2 });
                await element.waitForSettled();
                // A 10 by 10 block in the middle fills the canvas, so each node is big enough to click;
                // every other node is still in the scene.
                const middle = Math.floor(side / 2) * side + Math.floor(side / 2);
                await element.zoomToNodes(
                    Array.from({ length: 100 }, (_, k) => `n${String(middle + Math.floor(k / 10) * side + (k % 10))}`),
                );
                await timeClicks(element, `grid of ${String(size)} nodes, ${renderPath}`);
            });
        }
    }
});
