/**
 * @file A solid's halo is drawn behind the flat rings round the node -- its border and outer border -- from any 3D
 * angle. The halo is a scaled copy of the solid that draws only its far side; on a tetrahedron or a torus seen in
 * perspective those far faces lie in front of the plane through the node's middle, where the rings are drawn, and
 * the halo painted over them (the border read a fifth of its width, the outer border went missing on a third of
 * the rays).
 */

import "../../src/graphty-element";

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { readFrame } from "../helpers/paint-assertions";

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

const BORDER = [120, 200, 0] as const;
const OUTER = [0, 160, 0] as const;
const toHex = (c: readonly number[]): string => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const near = (px: Uint8Array, at: number, c: readonly number[]): boolean =>
    Math.abs(px[at] - c[0]) + Math.abs(px[at + 1] - c[1]) + Math.abs(px[at + 2] - c[2]) < 40;

/**
 * Draw one node with a halo, a border and an outer border in 3D, and read on how many rays out of its middle each
 * ring shows.
 * @param shape - The solid.
 * @param from - The camera's position; it looks at the node.
 * @param extents - Its width and height, when not its size.
 * @returns The share of rays crossing the border's color and the outer border's.
 */
async function ringsSeen(
    shape: string,
    from: [number, number, number],
    extents: Record<string, number>,
): Promise<{ border: number; outer: number }> {
    element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    document.body.appendChild(element);
    await element.updateComplete;
    await element.session.styles.add({
        name: "ringed",
        target: "node",
        selector: { match: "ids", nodes: ["n"] },
        set: {
            "node.unlit": true,
            "node.color": "#ff0000",
            "node.shape": shape,
            "node.size": 1,
            "node.borderWidth": 0.3,
            "node.borderColor": toHex(BORDER),
            "node.outerBorderWidth": 0.2,
            "node.outerBorderOffset": 0.2,
            "node.outerBorderColor": toHex(OUTER),
            "node.haloColor": "#ffbe00",
            "node.haloOpacity": 1,
            "node.haloScale": 1.45,
            ...extents,
        },
    });
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.setCameraState(
        { position: { x: from[0], y: from[1], z: from[2] }, target: { x: 0, y: 0, z: 0 } },
        { animate: false },
    );
    await operationQueueOf(element.graph).waitForCompletion();
    const frame = await readFrame(element.graph);
    const { scene } = element.graph;
    const viewport = scene.activeCamera?.viewport.toGlobal(frame.width, frame.height);
    assert.exists(viewport);
    const mid = Vector3.Project(Vector3.Zero(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
    // the frame is bottom row first
    const [cx, cy] = [mid.x, frame.height - 1 - mid.y];

    const RAYS = 32;
    let [border, outer] = [0, 0];
    for (let ray = 0; ray < RAYS; ray++) {
        const angle = (2 * Math.PI * ray) / RAYS;
        let [sawBorder, sawOuter] = [false, false];
        for (let r = 0; r < Math.min(frame.width, frame.height) / 2; r++) {
            const x = Math.round(cx + r * Math.cos(angle));
            const y = Math.round(cy + r * Math.sin(angle));
            if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) {
                break;
            }
            const at = (y * frame.width + x) * 4;
            sawBorder ||= near(frame.pixels, at, BORDER);
            sawOuter ||= near(frame.pixels, at, OUTER);
        }
        border += sawBorder ? 1 : 0;
        outer += sawOuter ? 1 : 0;
    }
    return { border: border / RAYS, outer: outer / RAYS };
}

describe("a solid's halo is drawn behind its rings", () => {
    const wide = { "node.width": 1.6, "node.height": 1 };
    const views: [string, [number, number, number], Record<string, number>][] = [
        ["tetrahedron", [0, 0, -14], wide],
        ["tetrahedron", [9.9, 0, -9.9], {}],
        ["torus", [9.9, 0, -9.9], {}],
        ["torus", [0, 13.6, -3.4], wide],
        ["cone", [0, 9.9, -9.9], wide],
        ["box", [7, 7, -9.9], wide],
    ];
    for (const [shape, from, extents] of views) {
        const seenFrom = `${shape} seen from (${from.join(", ")})${"node.width" in extents ? ", wide" : ""}`;
        it(`shows a ${seenFrom}: its border and outer border round it on every side, through its halo`, async () => {
            const seen = await ringsSeen(shape, from, extents);
            assert.isAtLeast(seen.border, 0.9, `the border shows on ${String(seen.border)} of the rays`);
            assert.isAtLeast(seen.outer, 0.9, `the outer border shows on ${String(seen.outer)} of the rays`);
        });
    }
});
