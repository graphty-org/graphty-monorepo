/**
 * @file `element.elementAt({ x, y })` answers what a click at that point would select. Each test
 * points the real mouse at a grid of points across the element, asks `elementAt`, clicks, and
 * compares the answer with the selection the click made, in 2D and in 3D. Edges are found too:
 * a click on one selects it, and a selected edge is drawn marked.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

// Inside the test frame's 414-pixel-wide viewport: a point outside it receives no click.
const WIDTH = 400;
const HEIGHT = 200;

// A numeric id 0 is falsy: it catches code that tests the id for truthiness.
const NODES = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: 6, y: 0, z: 0 } },
    { id: 0, position: { x: 3, y: 4, z: 0 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding three nodes at fixed places, drawn.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    const { graph } = element;
    await operationQueueOf(graph).waitForCompletion();
    await graph.addNodes(NODES);
    await graph.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: 0 },
    ]);
    await graph.setLayout("fixed", { dim: 3 });
    await graph.setViewMode(viewMode);
    await operationQueueOf(graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node's center is drawn, in CSS pixels from the element's top-left corner.
 * @param element - The element.
 * @param id - The node.
 * @returns The point.
 */
function centerOf(element: Graphty, id: string | number): { x: number; y: number } {
    const mesh = element.graph.getNodeMesh(String(id));
    assert.isNotNull(mesh, `node ${String(id)} has a mesh`);
    return element.worldToScreen(mesh.getAbsolutePosition());
}

/**
 * Point the mouse at a point, read `elementAt` there, click, and read what the click selected.
 * @param element - The element.
 * @param point - The point, in CSS pixels from the element's top-left corner.
 * @returns The id `elementAt` gave (or null) and the id the click selected (or null).
 */
async function answerAndClick(
    element: Graphty,
    point: { x: number; y: number },
): Promise<{ answered: string | number | null; selected: string | number | null }> {
    // Copies: the browser driver rescales a `position` in place to the test frame's zoom.
    await userEvent.hover(element, { position: { ...point } });
    const hit = element.elementAt(point);

    // The points differ, so no two clicks in a row make a double-click.
    await userEvent.click(element, { position: { ...point } });
    const { selection } = element.session;
    const selected = hit?.kind === "edge" ? (selection.edges[0] ?? null) : (element.getSelectedNode()?.id ?? null);
    if (hit?.kind === "edge") {
        assert.strictEqual(selection.nodes.length, 0, "an edge click selects no node");
    }

    return { answered: hit?.id ?? null, selected };
}

/**
 * The id of the edge between two nodes.
 * @param element - The element.
 * @param src - One end.
 * @param dst - The other.
 * @returns The edge's id.
 */
function edgeBetween(element: Graphty, src: string | number, dst: string | number): string {
    const edge = [...element.graph.getDataManager().edges.values()].find(
        (candidate) => candidate.srcId === src && candidate.dstId === dst,
    );
    assert.isDefined(edge, `an edge ${String(src)} -> ${String(dst)}`);
    return edge.id;
}

/**
 * The midpoint of two nodes' centers on screen.
 * @param element - The element.
 * @param src - One node.
 * @param dst - The other.
 * @returns The point.
 */
function midpointOf(element: Graphty, src: string | number, dst: string | number): { x: number; y: number } {
    const a = centerOf(element, src);
    const b = centerOf(element, dst);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * WCAG relative luminance of one pixel.
 * @param rgb - The pixel's channels, 0 to 255.
 * @returns The luminance, 0 to 1.
 */
function luminanceOf(rgb: readonly number[]): number {
    const [r, g, b] = rgb.map((byte) => {
        const c = byte / 255;
        return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The contrast ratio of two luminances.
 * @param a - One.
 * @param b - The other.
 * @returns The ratio.
 */
function ratio(a: number, b: number): number {
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * The darkest pixel drawn in a small square around a point: on the light canvas, the line's color.
 * @param element - The element.
 * @param point - The point, in CSS pixels.
 * @returns Its luminance.
 */
async function darkestNear(element: Graphty, point: { x: number; y: number }): Promise<number> {
    const { graph } = element;
    await element.waitForStableFrame();
    graph.scene.render();
    const { engine } = graph;
    const half = 3;
    // readPixels counts rows from the bottom.
    const x = Math.round(point.x) - half;
    const y = engine.getRenderHeight() - Math.round(point.y) - half;
    const pixels = (await engine.readPixels(x, y, half * 2, half * 2)) as unknown as Uint8Array;
    let darkest = 1;
    for (let at = 0; at < pixels.length; at += 4) {
        darkest = Math.min(darkest, luminanceOf([pixels[at], pixels[at + 1], pixels[at + 2]]));
    }

    return darkest;
}

describe.each(["2d", "3d"] as const)("elementAt in %s", (viewMode) => {
    it("names the node drawn at each node's center, with its id as loaded", async () => {
        const element = await mounted(viewMode);

        for (const { id } of NODES) {
            assert.deepStrictEqual(element.elementAt(centerOf(element, id)), { kind: "node", id });
        }

        assert.isNull(element.elementAt({ x: 2, y: 2 }), "the corner is empty canvas");
    });

    it("returns the node a click at the same point selects, across the whole element", async () => {
        const element = await mounted(viewMode);
        const points = NODES.map(({ id }) => centerOf(element, id));
        for (let y = 20; y < HEIGHT; y += 40) {
            for (let x = 20; x < WIDTH; x += 40) {
                points.push({ x, y });
            }
        }

        points.push(midpointOf(element, "a", "b"));

        let found = 0;
        let empty = 0;
        for (const point of points) {
            const { answered, selected } = await answerAndClick(element, point);
            assert.strictEqual(answered, selected, `at (${String(point.x)}, ${String(point.y)})`);
            if (answered === null) {
                empty++;
            } else {
                found++;
            }
        }

        assert.isAtLeast(found, NODES.length + 1, "some points landed on nodes and edges");
        assert.isAtLeast(empty, 1, "some points landed on empty canvas");
    }, 60_000);

    it("names the edge drawn at an edge's midpoint, and a click there selects it", async () => {
        const element = await mounted(viewMode);
        const ab = edgeBetween(element, "a", "b");
        const b0 = edgeBetween(element, "b", 0);

        const mid = midpointOf(element, "a", "b");
        assert.deepStrictEqual(element.elementAt(mid), { kind: "edge", id: ab });
        assert.deepStrictEqual(element.elementAt({ x: mid.x, y: mid.y + 3 }), { kind: "edge", id: ab }, "within a few pixels");

        await userEvent.click(element, { position: { ...mid } });
        assert.deepStrictEqual(element.session.selection.edges, [ab]);

        // Shift adds the second edge rather than replacing the first.
        const other = midpointOf(element, "b", 0);
        await userEvent.keyboard("{Shift>}");
        await userEvent.click(element, { position: { ...other } });
        await userEvent.keyboard("{/Shift}");
        assert.sameMembers([...element.session.selection.edges], [ab, b0]);

        // Empty canvas clears an edge-only selection.
        await userEvent.click(element, { position: { x: 2, y: 2 } });
        assert.strictEqual(element.session.selection.edges.length, 0);
    }, 60_000);

    it("draws a selected edge marked at 3:1 against the canvas and its unselected line", async () => {
        const element = await mounted(viewMode);
        const ab = edgeBetween(element, "a", "b");
        const mid = midpointOf(element, "a", "b");

        const canvas = await darkestNear(element, { x: 6, y: 6 });
        const plain = await darkestNear(element, mid);
        await element.graph.select({ edges: [ab] });
        const marked = await darkestNear(element, mid);

        assert.isAtLeast(ratio(marked, canvas), 3, `marked ${String(marked)} on canvas ${String(canvas)}`);
        assert.isAtLeast(ratio(marked, plain), 3, `marked ${String(marked)} against plain ${String(plain)}`);

        await element.graph.select({ edges: [] });
        assert.closeTo(await darkestNear(element, mid), plain, 0.01, "deselected, the edge is drawn plain again");
    }, 60_000);
});
