/**
 * @file With `layoutBehavior.labels.declutter` on, no two node labels the element draws overlap on
 * screen -- on a dense graph of hundreds of labels, in 2D and in 3D (issue #9275) -- and a label
 * with no font set draws in a sans-serif face.
 *
 * The word rectangles are measured independently of the declutter pass: each drawn label's world
 * bounding box after the finished picture, projected through the scene's own transform, and cut
 * to the label's words (`textBounds`).
 */

import "../../src/graphty-element";

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";

const WIDTH = 640;
const HEIGHT = 480;
const COUNT = 300;

interface Rect {
    id: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
}

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * A seeded random number in [0, 1), so every run draws the same graph.
 * @param seed - The seed.
 * @returns The generator.
 */
function random(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

/**
 * Mount an element showing a dense labeled graph and wait for its finished picture.
 * @param mode - 2D or 3D.
 * @param look - A named label look to draw the labels in, or none.
 * @param declutter - Whether overlapping labels are hidden.
 * @returns The element.
 */
async function mount(mode: "2d" | "3d", look?: "card", declutter = true): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;

    const next = random(9275);
    const nodes = Array.from({ length: COUNT }, (_, i) => ({
        id: `ACC-${String(1000 + i)}`,
        label: `ACC-${String(1000 + i)}`,
        position: { x: (next() - 0.5) * 40, y: (next() - 0.5) * 30, z: mode === "3d" ? (next() - 0.5) * 20 : 0 },
    }));
    const edges = nodes.slice(1).map((node, i) => ({ src: nodes[Math.floor(next() * (i + 1))].id, dst: node.id }));

    element.layoutBehavior = { labels: { declutter }, rendering: { onDemand: true } };
    await element.setViewMode(mode);
    await element.addNodes(nodes);
    await element.addEdges(edges);
    element.layoutConfig = { dim: mode === "2d" ? 2 : 3 };
    element.layout = "fixed";
    await element.session.styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.label": { by: "data.label" } },
        ...(look === undefined ? {} : { set: { "node.labelStyle": { look, padding: 24 } } }),
    });
    await element.waitForStableFrame();
    return element;
}

/**
 * The screen rectangle of every node label the element draws, cut to its words.
 * @param element - The element.
 * @returns The rectangles.
 */
function drawnWords(element: Graphty): Rect[] {
    const g = element.graph;
    const camera = g.scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(g.engine.getRenderWidth(), g.engine.getRenderHeight());
    const transform = g.scene.getTransformMatrix();
    const rects: Rect[] = [];
    for (const node of g.getDataManager().nodes.values()) {
        const id = String(node.id);
        const { label } = node;
        const mesh = label?.labelMesh;
        if (!label || !mesh || element.labelOf(id)?.drawn !== true || !mesh.isVisible) {
            continue;
        }

        mesh.computeWorldMatrix(true);
        const xs: number[] = [];
        const ys: number[] = [];
        for (const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
            const p = Vector3.Project(corner, Matrix.Identity(), transform, viewport);
            xs.push(p.x);
            ys.push(p.y);
        }

        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const w = Math.max(...xs) - left;
        const h = Math.max(...ys) - top;
        // What is drawn: the panel behind the words when the label has one, else the words.
        const text = label.panel ?? label.textBounds;
        const rect = {
            id,
            left: left + text.left * w,
            right: left + text.right * w,
            top: top + text.top * h,
            bottom: top + text.bottom * h,
        };
        if (rect.right < 0 || rect.left > WIDTH || rect.bottom < 0 || rect.top > HEIGHT) {
            continue;
        }

        rects.push(rect);
    }

    return rects;
}

/**
 * The pairs of rectangles that overlap by more than a pixel each way.
 * @param rects - The rectangles.
 * @returns The overlapping pairs, by id.
 */
function overlapping(rects: Rect[]): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i];
            const b = rects[j];
            if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
                pairs.push(`${a.id}/${b.id}`);
            }
        }
    }

    return pairs;
}

describe("dense labels with declutter on (issue #9275)", () => {
    for (const mode of ["2d", "3d"] as const) {
        it(`draws no two node labels over each other in ${mode}`, async () => {
            const element = await mount(mode);
            const rects = drawnWords(element);

            assert.isAbove(rects.length, 10, "some labels are drawn");
            assert.isBelow(rects.length, COUNT, "a dense graph hides some");
            assert.deepEqual(overlapping(rects), [], "no two drawn labels overlap");
        });
    }

    for (const mode of ["2d", "3d"] as const) {
        it(`draws no two card labels' panels over each other in ${mode}`, async () => {
            const element = await mount(mode, "card");
            assert.isDefined(element.getNode("ACC-1000")?.label?.panel, "the card look draws a panel");
            const rects = drawnWords(element);

            assert.isAbove(rects.length, 10, "some labels are drawn");
            assert.deepEqual(overlapping(rects), [], "no two drawn panels overlap");
        });
    }

    it("paints no label more often for hiding overlapping ones (issue #9364)", async () => {
        // Every label's words are painted with fillText, on either render path.
        const { fillText } = CanvasRenderingContext2D.prototype;
        let painted = 0;
        CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, ...args) {
            if (args[0].startsWith("ACC-")) {
                painted++;
            }

            fillText.apply(this, args);
        };
        try {
            await mount("2d", undefined, false);
            const off = painted;
            mounted?.remove();
            painted = 0;
            await mount("2d");
            assert.isAbove(off, 0, "labels are painted");
            assert.isAtMost(painted, off, "declutter adds no label paints");
        } finally {
            CanvasRenderingContext2D.prototype.fillText = fillText;
        }
    });

    it("draws a label with no font set in a sans-serif face", async () => {
        const element = await mount("2d");
        const label = element.getNode("ACC-1000")?.label;
        assert.instanceOf(label, RichTextLabel);
        assert.match(label.textRuns[0][0].style.font, /,\s*sans-serif$/);
    });
});
