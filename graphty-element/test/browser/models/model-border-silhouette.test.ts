/**
 * @file A border on a model node follows the model's own silhouette, in 2D and 3D (issue #10376: the border round the
 * sample person was a hull of one part, so it stood off the person's sides and cut through its other parts).
 *
 * Measured along rays from the middle of the drawing at many angles: on each ray the farthest model pixel and the
 * nearest border pixel past it. A border that follows the silhouette starts within a few pixels of the model's edge on
 * every ray; one drawn round a different shape leaves a gap of background between them on some rays, or has the
 * model poking out past it.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { cleanups, drawnAsModel, mount, nextModelEvent, readFrame } from "./helpers";

/** Rays sampled round the middle. */
const RAYS = 180;
/** The most pixels of background a ray may cross between the model's edge and the border (antialiasing, sampling). */
const MAX_GAP = 3;

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * The sample person, painted red with a blue border, in an element of its own.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function person(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = await mount(400, 400);
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    const drawn = nextModelEvent(element, (c) => c.ref === "asset:sample/person" && c.state === "drawn");
    await element.session.styles.add({
        name: "probe",
        target: "node",
        selector: { match: "ids", nodes: ["n"] },
        set: {
            "node.model": "asset:sample/person",
            "node.modelTint": "replace",
            "node.unlit": true,
            "node.size": 4,
            "node.color": "#ff0000",
            "node.borderWidth": 0.2,
            "node.borderColor": "#0000ff",
        },
    });
    await drawn;
    await operationQueueOf(element.graph).waitForCompletion();
    assert.isTrue(drawnAsModel(element.graph, "n"), "the node draws the person");
    await element.waitForStableFrame();

    return element;
}

/**
 * Walk rays out from the middle of the model's pixels and measure, on each, the background between the model's
 * farthest pixel and the border.
 * @param element - The element.
 * @returns The worst gap in pixels, the rays with no border past the model, and the model's pixel count.
 */
async function measure(element: Graphty): Promise<{ worst: number; open: number; model: number }> {
    const { pixels, width, height } = await readFrame(element);
    const kind = (x: number, y: number): "model" | "border" | "background" => {
        const i = (y * width + x) * 4;
        const [r, g] = [pixels[i], pixels[i + 1]];
        // red and blue carry no green, the background does; an edge pixel the model shares with the border counts
        // as the model's
        if (g > 128) {
            return "background";
        }
        return r - g > 48 ? "model" : "border";
    };
    let [sx, sy, model] = [0, 0, 0];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (kind(x, y) === "model") {
                sx += x;
                sy += y;
                model++;
            }
        }
    }
    const [cx, cy] = [sx / Math.max(model, 1), sy / Math.max(model, 1)];
    let [worst, open] = [0, 0];
    for (let k = 0; k < RAYS; k++) {
        const a = (2 * Math.PI * k) / RAYS;
        let [last, border] = [-1, -1];
        for (let t = 0; ; t += 0.5) {
            const [x, y] = [Math.round(cx + t * Math.cos(a)), Math.round(cy + t * Math.sin(a))];
            if (x < 0 || y < 0 || x >= width || y >= height) {
                break;
            }
            const seen = kind(x, y);
            if (seen === "model") {
                last = t;
                border = -1;
            } else if (seen === "border" && border < 0) {
                border = t;
            }
        }
        if (last < 0) {
            continue;
        }
        if (border < 0) {
            open++;
        } else {
            worst = Math.max(worst, border - last);
        }
    }

    return { worst, open, model };
}

describe("a model node's border follows the model's silhouette (#10376)", () => {
    it("rings the sample person in 2D", async () => {
        const element = await person("2d");
        const { worst, open, model } = await measure(element);

        assert.isAbove(model, 500, "the person is drawn");
        assert.strictEqual(open, 0, "rays where the person reaches past its border");
        assert.isAtMost(worst, MAX_GAP, "pixels of background between the person and its border");
    });

    it("rings the sample person in 3D from the default camera and from two angles", async () => {
        const element = await person("3d");
        const views = [undefined, { x: 7, y: 3, z: -9 }, { x: -9, y: 2, z: 4 }];
        for (const position of views) {
            if (position !== undefined) {
                await element.setCameraTarget({ x: 0, y: 0, z: 0 });
                await element.setCameraPosition(position);
            }
            const { worst, open, model } = await measure(element);
            const from = JSON.stringify(position ?? "default");

            assert.isAbove(model, 500, `the person is drawn from ${from}`);
            assert.strictEqual(open, 0, `rays where the person reaches past its border, from ${from}`);
            assert.isAtMost(worst, MAX_GAP, `pixels of background between the person and its border, from ${from}`);
        }
    });
});
