/**
 * @file Node shader uses drawn by place on a real canvas (design/rendering/shader-studio
 * decisions-v2.md sections 1, 5 and 6): `around` draws nothing inside the node's outline, `behind`
 * is covered by the node in its middle, `over` draws nothing outside the outline, `replace` hides
 * the node's mesh and keeps it as the pick proxy, every place returns straight alpha, a minimum
 * size holds the square's width on a small node, two uses of one shader both draw, `off` removes a
 * lower layer's use, a shape above a `replace` draws, and a `group` use outlines the nodes still
 * carrying it. Pixels are read from the canvas; clicks and the wheel are real input
 * (test/helpers/real-input.ts).
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import type { RenderManager } from "../../../src/managers/RenderManager";
import type { GroupOutlinePass } from "../../../src/meshes/GroupOutlinePass";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { groupOutlinesOf } from "../../../src/session/styles/StylesApi";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point, wheel } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** A pixel: r, g, b, a. */
type Pixel = readonly [number, number, number, number];

const cleanups: (() => void)[] = [];

beforeAll(() => {
    // A solid red square at whichever square-drawn place a use puts it, two radii out.
    defineShader({
        id: "t/red",
        place: "around",
        reach: 2,
        glsl: "vec4 shade(NodeInput n) { return vec4(1.0, 0.0, 0.0, 1.0); }",
    });
    // Half-transparent red, straight alpha.
    defineShader({
        id: "t/half",
        place: "around",
        reach: 2,
        glsl: "vec4 shade(NodeInput n) { return vec4(1.0, 0.0, 0.0, 0.5); }",
    });
    // Draws nothing at all: in place of the node it leaves the background.
    defineShader({ id: "t/clear", place: "replace", glsl: "vec4 shade(NodeInput n) { return vec4(0.0); }" });
    // A solid square with a minimum size, one radius out.
    defineShader({
        id: "t/box",
        place: "around",
        reach: 1,
        minSize: 40,
        glsl: "vec4 shade(NodeInput n) { return vec4(1.0, 0.0, 0.0, 1.0); }",
    });
    // A thin ring at a radius the use sets.
    defineShader({
        id: "t/ring",
        place: "around",
        reach: 3,
        params: { at: { default: 1.5, min: 1, max: 3 } },
        glsl: `vec4 shade(NodeInput n) {
            float ring = 1.0 - step(0.12, abs(length(n.uv) - at));
            return vec4(1.0, 0.0, 0.0, ring);
        }`,
    });
    // A group outline: red where the members' field is above its middle.
    defineShader({
        id: "t/hull",
        glsl: "vec4 shade(GroupInput g) { return vec4(1.0, 0.0, 0.0, step(0.5, g.field)); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element drawing in 2D, with nodes at fixed places, on a white canvas.
 * @param nodes - The nodes.
 * @returns The element.
 */
async function mounted(nodes: readonly { id: string; x: number; y: number }[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    // Two far corner nodes the layers never match, so the camera frames the nodes under test at a
    // size that leaves room around them.
    await element.session.data.addNodes([
        ...nodes.map(({ id, x, y }) => ({ id, subject: true, position: { x, y, z: 0 } })),
        { id: "corner-1", position: { x: -12, y: -9, z: 0 } },
        { id: "corner-2", position: { x: 12, y: 9, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "Blue",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2050ff" },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    // The camera frames the nodes after the style pass, so read where nodes are drawn only once
    // the picture is final.
    await element.waitForStableFrame();
    return element;
}

/**
 * Add a layer over every node under test (or the ones named) and wait for the repaint.
 * @param element - The element.
 * @param name - The layer's name.
 * @param set - What it writes.
 * @param nodes - The nodes it matches; absent, every node.
 * @returns The layer's id.
 */
async function layer(
    element: Graphty,
    name: string,
    set: LayerSpec["set"],
    nodes?: readonly string[],
): Promise<string> {
    const added = await element.session.styles.add({
        name,
        target: "node",
        selector: nodes === undefined ? { match: "has", path: "data.subject" } : { match: "ids", nodes: [...nodes] },
        set,
    });
    await operationQueueOf(element.graph).waitForCompletion();
    return added.id;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * How many slots the element's node shader batches hold, in all.
 * @param element - The element.
 * @returns The count.
 */
function slots(element: Graphty): number {
    const drawing = NodeShaderDrawing.peek(element.graph.getScene());
    return drawing === undefined ? 0 : [...drawing.stats().slots.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * Read pixels of the canvas at points in CSS pixels, after the next frames.
 * @param element - The element.
 * @param points - The points.
 * @returns One pixel per point.
 */
async function pixelsAt(element: Graphty, points: readonly Point[]): Promise<Pixel[]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const out: Pixel[] = [];
    for (const point of points) {
        const x = Math.round(point.x * scale);
        const y = Math.round(engine.getRenderHeight() - point.y * scale);
        const read = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
        out.push([read[0], read[1], read[2], read[3]]);
    }

    return out;
}

/**
 * Read one row of the canvas through a point, in CSS pixels, as one pixel per render pixel.
 * @param element - The element.
 * @param y - The row, CSS pixels from the top.
 * @returns The row's pixels and how many render pixels make a CSS pixel.
 */
async function rowAt(element: Graphty, y: number): Promise<{ row: Pixel[]; scale: number }> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const width = engine.getRenderWidth();
    const read = (await engine.readPixels(
        0,
        Math.round(engine.getRenderHeight() - y * scale),
        width,
        1,
    )) as unknown as Uint8Array;
    const row: Pixel[] = [];
    for (let x = 0; x < width; x++) {
        row.push([read[x * 4], read[x * 4 + 1], read[x * 4 + 2], read[x * 4 + 3]]);
    }

    return { row, scale };
}

/**
 * How wide the red in a row spans, from its first red pixel to its last, in CSS pixels: a square
 * around a node is red on both sides of it.
 * @param row - The row.
 * @param scale - Render pixels per CSS pixel.
 * @returns The width, 0 when nothing is red.
 */
function redWidth(row: readonly Pixel[], scale: number): number {
    const first = row.findIndex((pixel) => isRed(pixel));
    const last = row.length - 1 - [...row].reverse().findIndex((pixel) => isRed(pixel));
    return first < 0 ? 0 : (last - first + 1) / scale;
}

/**
 * Whether a pixel is (near) pure red.
 * @param pixel - The pixel.
 * @returns True when it is.
 */
function isRed(pixel: Pixel): boolean {
    return pixel[0] > 230 && pixel[1] < 30 && pixel[2] < 30;
}

/**
 * Whether two pixels agree within a tolerance per color channel.
 * @param a - One.
 * @param b - The other.
 * @param tolerance - Per channel.
 * @returns True when they do.
 */
function near(a: Pixel, b: Pixel, tolerance = 4): boolean {
    return [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) <= tolerance);
}

/**
 * The node's center on screen and points along +x at multiples of its drawn radius.
 * @param element - The element.
 * @param id - The node.
 * @param radii - The multiples.
 * @returns The center, then one point per multiple.
 */
function along(element: Graphty, id: string, radii: readonly number[]): { center: Point; points: Point[]; px: number } {
    const node = element.graph.getNode(id);
    assert.isDefined(node, `the graph holds ${id}`);
    const at = node.mesh.getAbsolutePosition();
    const radius = node.roundRadius ?? node.size / 2;
    const center = element.worldToScreen(at);
    const edge = element.worldToScreen(at.add(new Vector3(radius, 0, 0)));
    const px = edge.x - center.x;
    return { center, points: radii.map((k) => ({ x: center.x + px * k, y: center.y })), px };
}

describe("node shader places", () => {
    it("around draws no pixel inside the node's disc, and fills the square outside it", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        const { points } = along(element, "a", [0, 0.5, 0.85, 1.5]);
        const before = await pixelsAt(element, points);
        await layer(element, "Around", { "node.shaders": [{ shader: "t/red" }] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        const after = await pixelsAt(element, points);
        for (let i = 0; i < 3; i++) {
            assert.isTrue(near(after[i], before[i]), `inside the disc at ${String(i)}: ${after[i].join(",")}`);
        }

        assert.isTrue(isRed(after[3]), `outside the disc it draws: ${after[3].join(",")}`);
    });

    it("behind is covered by the opaque node in its middle and visible past its edge", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        const { points } = along(element, "a", [0, 0.5, 1.5]);
        const before = await pixelsAt(element, points);
        await layer(element, "Behind", { "node.shaders": [{ shader: "t/red", place: "behind" }] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        const after = await pixelsAt(element, points);
        assert.isTrue(near(after[0], before[0]), `the node covers the middle: ${after[0].join(",")}`);
        assert.isTrue(near(after[1], before[1]), `the node covers the middle: ${after[1].join(",")}`);
        assert.isTrue(isRed(after[2]), `past the node's edge it shows: ${after[2].join(",")}`);
    });

    it("over draws nothing outside the disc, and over the node inside it", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        const { points } = along(element, "a", [0, 0.5, 1.2, 1.8]);
        const before = await pixelsAt(element, points);
        await layer(element, "Over", { "node.shaders": [{ shader: "t/red", place: "over" }] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        const after = await pixelsAt(element, points);
        assert.isTrue(isRed(after[0]) && isRed(after[1]), `inside: ${after[0].join(",")} ${after[1].join(",")}`);
        assert.isTrue(near(after[2], before[2]), `outside: ${after[2].join(",")}`);
        assert.isTrue(near(after[3], before[3]), `outside: ${after[3].join(",")}`);
    });

    it("replace leaves no mesh pixels, and a real click at the node still selects it", async () => {
        const element = await mounted([
            { id: "a", x: -3, y: 0 },
            { id: "b", x: 3, y: 0 },
        ]);
        const { center, points } = along(element, "b", [0, 0.5]);
        const background = (await pixelsAt(element, [{ x: center.x, y: 5 }]))[0];
        const drawn = await pixelsAt(element, points);
        assert.isFalse(near(drawn[0], background), "the node is drawn before");
        await layer(element, "Instead", { "node.shaders": [{ shader: "t/clear" }] });
        await until(element, "both squares are drawn", () => slots(element) === 2);
        for (const pixel of await pixelsAt(element, points)) {
            assert.isTrue(near(pixel, background), `no mesh pixel is left: ${pixel.join(",")}`);
        }

        await click(element, center);
        await drawnFrames(element.graph.getScene(), 3);
        assert.strictEqual(element.getSelectedNode()?.id, "b", "the hidden mesh is the pick proxy");
    });

    it("blends straight alpha the same way at over and at around", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        const { points } = along(element, "a", [0.4, 1.5]);
        const before = await pixelsAt(element, points);
        const over = await layer(element, "Over", { "node.shaders": [{ shader: "t/half", place: "over" }] });
        await until(element, "the over square is drawn", () => slots(element) === 1);
        const inside = (await pixelsAt(element, points))[0];
        await element.session.styles.remove(over);
        await layer(element, "Around", { "node.shaders": [{ shader: "t/half" }] });
        await until(element, "the around square is drawn", () => slots(element) === 1);
        const outside = (await pixelsAt(element, points))[1];
        const expected = (under: Pixel): Pixel => [
            Math.round(0.5 * 255 + 0.5 * under[0]),
            Math.round(0.5 * under[1]),
            Math.round(0.5 * under[2]),
            255,
        ];
        assert.isTrue(near(inside, expected(before[0]), 6), `over: ${inside.join(",")} on ${before[0].join(",")}`);
        assert.isTrue(near(outside, expected(before[1]), 6), `around: ${outside.join(",")} on ${before[1].join(",")}`);
    });

    it("draws two uses of one shader with different parameters", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        await layer(element, "Rings", {
            "node.shaders": [
                { shader: "t/ring", params: { at: 1.4 } },
                { shader: "t/ring", params: { at: 2.4 } },
            ],
        });
        await until(element, "both rings are drawn", () => slots(element) === 2);
        const { points } = along(element, "a", [1.4, 1.9, 2.4]);
        const [inner, between, outer] = await pixelsAt(element, points);
        assert.isTrue(isRed(inner), `the first ring: ${inner.join(",")}`);
        assert.isFalse(isRed(between), `between them: ${between.join(",")}`);
        assert.isTrue(isRed(outer), `the second ring: ${outer.join(",")}`);
    });

    it("removes a lower layer's use with off on a higher layer", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        const { points } = along(element, "a", [1.5]);
        const before = await pixelsAt(element, points);
        await layer(element, "Around", { "node.shaders": [{ shader: "t/red" }] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        assert.isTrue(isRed((await pixelsAt(element, points))[0]));
        await layer(element, "Off", { "node.shaders": [{ shader: "t/red", off: true }] });
        await until(element, "the square is gone", () => slots(element) === 0);
        assert.isTrue(near((await pixelsAt(element, points))[0], before[0]), "drawn as before");
    });

    it("draws a shape on a higher layer over a replace on a lower one", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        const { center, points } = along(element, "a", [0]);
        const background = (await pixelsAt(element, [{ x: center.x, y: 5 }]))[0];
        await layer(element, "Instead", { "node.shaders": [{ shader: "t/clear" }] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        assert.isTrue(near((await pixelsAt(element, points))[0], background), "the node is hidden");
        await layer(element, "Boxes", { "node.shape": "box" });
        await until(element, "the square is gone", () => slots(element) === 0);
        const [pixel] = await pixelsAt(element, points);
        assert.isFalse(near(pixel, background), `the box is drawn: ${pixel.join(",")}`);
    });
});

describe("a use's minimum size", () => {
    it("holds the square at least minSize wide after a real wheel zoom-out to a 12 px node", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        await layer(element, "Box", { "node.shaders": [{ shader: "t/box" }] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        const { center } = along(element, "a", []);
        for (let i = 0; i < 40 && along(element, "a", []).px > 12; i++) {
            await wheel(element, center, 240);
            await drawnFrames(element.graph.getScene(), 2);
        }

        const { px, center: now } = along(element, "a", []);
        assert.isAtMost(px, 12, "the node's radius is at most 12 px on screen");
        assert.isAbove(px, 0.5);
        const { row, scale } = await rowAt(element, now.y);
        assert.isAtLeast(redWidth(row, scale), 39, "the square is at least 40 px wide");
    });

    it("draws a 40 px square on a selected 2 px node, and nothing with minSize 0", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }]);
        // Zoomed out with the wheel until the node's radius is about a pixel.
        for (let i = 0; i < 60 && along(element, "a", []).px > 1.2; i++) {
            await wheel(element, along(element, "a", []).center, 240);
            await drawnFrames(element.graph.getScene(), 2);
        }

        const { px } = along(element, "a", []);
        assert.isBelow(px, 3, `the node is under 3 px on screen (${String(px)})`);
        const selected = await element.session.styles.add({
            name: "Selected",
            target: "node",
            selector: { match: "state", state: "selected" },
            set: { "node.shaders": [{ shader: "t/box" }] },
        });
        await element.session.selection.apply({ nodes: ["a"] });
        await until(element, "the square is drawn", () => slots(element) === 1);
        const { center } = along(element, "a", []);
        const sized = await rowAt(element, center.y);
        const width = redWidth(sized.row, sized.scale);
        assert.isAtLeast(width, 39, `a 40 px square (${String(width)})`);
        assert.isAtMost(width, 42, `a 40 px square (${String(width)})`);

        await element.session.styles.update(selected.id, {
            set: { "node.shaders": [{ shader: "t/box", params: { minSize: 0 } }] },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        const skipped = await rowAt(element, center.y);
        assert.strictEqual(redWidth(skipped.row, skipped.scale), 0, "under 3 px with no minimum size, nothing draws");
    });
});

describe("a group use", () => {
    /**
     * The element's group outline pass.
     * @param element - The element.
     * @returns The pass, or null.
     */
    function passOf(element: Graphty): GroupOutlinePass | null {
        return (element.graph as unknown as { renderManager: RenderManager }).renderManager.shaderPasses().outline;
    }

    it("draws one outline around the nodes carrying it, and again around the rest after off", async () => {
        // Seven close together, and three far to the right that the outline reaches out to.
        const nodes = Array.from({ length: 10 }, (_, i) =>
            i < 7
                ? { id: `n${String(i)}`, x: (i % 4) * 1.5 - 6, y: i < 4 ? 0 : 1.5 }
                : { id: `n${String(i)}`, x: 2 + (i - 7) * 2, y: 0 },
        );
        const element = await mounted(nodes);
        const outlined = await layer(element, "Hull", { "node.shaders": [{ shader: "t/hull" }] });
        await until(element, "the outline is drawn", () => (passOf(element)?.drawn().length ?? 0) === 1);
        const sets = groupOutlinesOf(element.session.styles);
        assert.lengthOf(sets, 1);
        assert.lengthOf(sets[0].groups, 1, "one outline");
        assert.lengthOf(sets[0].groups[0].members, 10, "around all ten");
        const gone = ["n7", "n8", "n9"];
        const at = (id: string): Point => along(element, id, []).center;
        const scaling = element.graph.engine.getHardwareScalingLevel();
        const picked = (id: string): string | undefined =>
            passOf(element)?.pick(at(id).x / scaling, at(id).y / scaling)?.layer;
        await drawnFrames(element.graph.getScene(), 2);
        for (const id of gone) {
            assert.strictEqual(picked(id), outlined, `${id} is inside the outline`);
        }

        await layer(element, "Not these", { "node.shaders": [{ shader: "t/hull", off: true }] }, gone);
        await until(
            element,
            "the outline is drawn around the other seven",
            () => groupOutlinesOf(element.session.styles)[0]?.groups[0]?.members.length === 7,
        );
        await drawnFrames(element.graph.getScene(), 3);
        assert.lengthOf(passOf(element)?.drawn() ?? [], 1, "still one outline");
        for (const id of gone) {
            assert.isUndefined(picked(id), `${id} is outside the outline now`);
        }

        assert.strictEqual(picked("n0"), outlined, "the rest stay inside");
    });
});
