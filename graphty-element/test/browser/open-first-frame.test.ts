/**
 * @file A file opened into an element already drawn shows its nodes at their normal size on the
 * first frame that draws them, from the layout's first positions -- on both render paths (issue
 * #9280).
 *
 * The default force layout used to start every node within half a spring length of the middle,
 * the camera framed that small dense ball, and the first frames drew each node many times its
 * settled size until the layout had spread them. Read on the first frame that draws a node, from `nodeScreenPosition` and from its
 * pixels, and compared with the size each node is drawn at once the layout has settled.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

/** A small tree: enough nodes that a jumble round the origin and the spread-out drawing differ. */
const N = 40;
const IDS = Array.from({ length: N }, (_, i) => String(i));
const CSV = ["source,target", ...IDS.slice(1).map((id, i) => `${String(Math.floor(i / 3))},${id}`)].join("\n");

/**
 * How much bigger the median node may be drawn on the first frame than once settled. Perspective
 * draws a node by its depth, which the layout changes, and the camera keeps
 * reframing while the layout spreads, so the sizes differ somewhat; the small ball the layout used
 * to start from drew them about five times as large.
 */
const SIZE_RATIO = 2;

/**
 * The middle value.
 * @param values - The values, at least one.
 * @returns Their median.
 */
function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

afterEach(() => {
    document.body.replaceChildren();
});

describe.each([
    { path: "objects", seed: undefined, view: "3d" },
    { path: "batched", seed: undefined, view: "3d" },
    // The graphty app's force layout, seeded.
    { path: "batched", seed: 1, view: "3d" },
    { path: "objects", seed: undefined, view: "2d" },
    { path: "batched", seed: 1, view: "2d" },
] as const)("a file opened on the $path path in $view (seed $seed)", ({ path, seed, view }) => {
    it("draws its nodes at their settled size on the first frame that draws them", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.renderPath = path;
        if (seed !== undefined) {
            element.layoutConfig = { seed };
        }
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "400px";
        document.body.appendChild(element);
        await element.updateComplete;
        await element.setViewMode(view);
        await element.session.styles.add({
            name: "Node ink",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#2040ff" },
        });
        await element.waitForStableFrame();

        const { engine } = element.graph;
        const scene = element.graph.getScene();
        let first: Map<string, number | undefined> | undefined;
        let pixels: Promise<ArrayBufferView> | undefined;
        const observer = scene.onAfterRenderObservable.add(() => {
            if (first !== undefined) {
                return;
            }

            const drawn = new Map(IDS.map((id) => [id, element.nodeScreenPosition(id)?.radius]));
            if ([...drawn.values()].every((radius) => radius === undefined)) {
                return;
            }

            first = drawn;
            // Started inside the frame, so it reads this frame's buffer.
            pixels = engine.readPixels(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
        });
        try {
            // Opened as the graphty app opens a file: a CSV edge list, into the element as drawn.
            await element.session.data.import({ config: { file: new File([CSV], "transfers.csv") } });
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
        } finally {
            scene.onAfterRenderObservable.remove(observer);
        }

        assert.isDefined(first, "a frame drew the opened nodes");
        const settled = IDS.map((id) => element.nodeScreenPosition(id)?.radius);
        assert.isTrue(
            settled.every((radius) => radius !== undefined),
            "every node is drawn once settled",
        );
        const before = median([...first.values()].filter((radius) => radius !== undefined));
        const after = median(settled.filter((radius) => radius !== undefined));
        assert.isAtMost(
            before,
            after * SIZE_RATIO,
            `median node radius ${before.toFixed(1)} px on the first frame, ${after.toFixed(1)} px settled`,
        );

        // The ink agrees: a node drawn many times its size covers most of the canvas in blue.
        const frame = (await pixels) as Uint8Array;
        let blue = 0;
        for (let i = 0; i < frame.length; i += 4) {
            if (frame[i + 2] > frame[i] + 60 && frame[i + 2] > frame[i + 1] + 60) {
                blue++;
            }
        }
        assert.isBelow(blue / (frame.length / 4), 0.5, "node ink covers half the first frame");
    });
});
