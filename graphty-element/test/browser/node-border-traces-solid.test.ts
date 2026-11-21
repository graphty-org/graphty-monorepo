/**
 * @file A solid node's border traces the solid's own silhouette from wherever the camera looks, in 2D and 3D, so no
 * corner of the fill pokes out past the ring (issue #9272: an icosahedron's border was drawn rotated against it).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const SIZE = 320;
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * One node of a shape, painted red with a thick blue border, drawn in an element of its own.
 * @param viewMode - The view mode.
 * @param shape - The node shape.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d", shape: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(SIZE)}px`;
    element.style.height = `${String(SIZE)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "probe",
        target: "node",
        selector: { match: "ids", nodes: ["n"] },
        set: {
            "node.shape": shape,
            "node.size": 4,
            "node.color": "#ff0000",
            "node.borderWidth": 0.3,
            "node.borderColor": "#0000ff",
        },
    });
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * The pixels of the fill that touch the background: a corner of the fill past its ring. With the ring on the fill's
 * silhouette, every edge pixel of the fill touches the ring instead.
 * @param element - The element.
 * @returns The count of such pixels, and of fill pixels in all.
 */
async function fillPastRing(element: Graphty): Promise<{ past: number; fill: number }> {
    await element.waitForStableFrame();
    element.graph.scene.render();
    const { engine } = element.graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const data = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    const at = (x: number, y: number): [number, number, number] => {
        const i = (y * width + x) * 4;

        return [data[i], data[i + 1], data[i + 2]];
    };
    const background = at(0, 0);
    const isFill = (x: number, y: number): boolean => {
        const [r, g, b] = at(x, y);

        return r - g > 32 && r - b > 32;
    };
    const isBackground = (x: number, y: number): boolean =>
        at(x, y).every((value, channel) => Math.abs(value - background[channel]) < 16);

    let past = 0;
    let fill = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (!isFill(x, y)) {
                continue;
            }
            fill++;
            if (isBackground(x + 1, y) || isBackground(x - 1, y) || isBackground(x, y + 1) || isBackground(x, y - 1)) {
                past++;
            }
        }
    }

    return { past, fill };
}

const SHAPES = [
    "icosahedron",
    "dodecahedron",
    "octahedron",
    "tetrahedron",
    "box",
    "triangular_prism",
    "cylinder",
    "cone",
] as const;

describe("a solid's border traces its silhouette (#9272)", () => {
    for (const shape of SHAPES) {
        it(`rings a ${shape} in 2D`, async () => {
            const element = await mounted("2d", shape);
            const { past, fill } = await fillPastRing(element);

            assert.isAbove(fill, 500, "the fill is drawn");
            assert.strictEqual(past, 0, `${shape}: fill pixels past the ring`);
        });

        it(`rings a ${shape} in 3D from the default camera and from two angles`, async () => {
            const element = await mounted("3d", shape);
            const views = [undefined, { x: 7, y: 5, z: -9 }, { x: -6, y: -8, z: 6 }];
            for (const position of views) {
                if (position !== undefined) {
                    await element.setCameraTarget({ x: 0, y: 0, z: 0 });
                    await element.setCameraPosition(position);
                }
                const { past, fill } = await fillPastRing(element);

                assert.isAbove(fill, 500, "the fill is drawn");
                assert.strictEqual(past, 0, `${shape} from ${JSON.stringify(position ?? "default")}: fill past ring`);
            }
        });
    }
});
