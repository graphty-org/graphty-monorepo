/**
 * @file `element.elementAt({ x, y })` answers what a click at that point would select. Each test
 * takes a grid of points across the element, asks `elementAt` at each, clicks it with the real
 * mouse, and compares the answer with the selection the click made, in 2D and in 3D. Edges are
 * found too: a click on one selects it, and a selected edge is drawn marked.
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
 * Read `elementAt` at a point, click there, and read what the click selected.
 *
 * No hover first: `elementAt` picks from the point it is given, not from where the mouse is, and
 * the click moves the mouse to the point itself. A hover per point doubled the driver round trips
 * and made the grid test take over a third of the test budget.
 * @param element - The element.
 * @param point - The point, in CSS pixels from the element's top-left corner.
 * @returns The id `elementAt` gave (or null) and the id the click selected (or null).
 */
async function answerAndClick(
    element: Graphty,
    point: { x: number; y: number },
): Promise<{ answered: string | number | null; selected: string | number | null }> {
    const hit = element.elementAt(point);

    // The points differ, so no two clicks in a row make a double-click. A copy: the browser driver
    // rescales a `position` in place to the test frame's zoom.
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
 * The pixels drawn in a one-pixel column across a point, top to bottom.
 * @param element - The element.
 * @param point - The point, in CSS pixels.
 * @returns Each pixel's red, green and blue, 0 to 255.
 */
async function columnAt(element: Graphty, point: { x: number; y: number }): Promise<number[][]> {
    const { graph } = element;
    await element.waitForStableFrame();
    graph.scene.render();
    const { engine } = graph;
    const half = 12;
    // readPixels counts rows from the bottom.
    const y = engine.getRenderHeight() - Math.round(point.y) - half;
    const pixels = (await engine.readPixels(Math.round(point.x), y, 1, half * 2)) as unknown as Uint8Array;
    const column: number[][] = [];
    for (let at = pixels.length - 4; at >= 0; at -= 4) {
        column.push([pixels[at], pixels[at + 1], pixels[at + 2]]);
    }

    return column;
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
    });

    it("names the edge drawn at an edge's midpoint, and a click there selects it", async () => {
        const element = await mounted(viewMode);
        const ab = edgeBetween(element, "a", "b");
        const b0 = edgeBetween(element, "b", 0);

        const mid = midpointOf(element, "a", "b");
        assert.deepStrictEqual(element.elementAt(mid), { kind: "edge", id: ab });
        assert.deepStrictEqual(
            element.elementAt({ x: mid.x, y: mid.y + 3 }),
            { kind: "edge", id: ab },
            "within a few pixels",
        );

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
    });

    it("shows the pointer cursor over a node and over a line, and not over empty canvas", async () => {
        const element = await mounted(viewMode);
        const canvas = element.graph.scene.getEngine().getInputElement();
        assert.isNotNull(canvas);
        const cursorAt = async (point: { x: number; y: number }): Promise<string> => {
            await userEvent.hover(element, { position: { ...point } });
            return canvas.style.cursor;
        };

        const mid = midpointOf(element, "a", "b");
        assert.strictEqual(await cursorAt({ x: 2, y: 2 }), "", "empty canvas");
        assert.strictEqual(await cursorAt(centerOf(element, "a")), "pointer", "a node");
        assert.strictEqual(await cursorAt({ x: mid.x, y: mid.y + 3 }), "pointer", "a few pixels off a line");
        assert.strictEqual(await cursorAt({ x: 2, y: 2 }), "", "back on empty canvas");
    });

    it("draws a selected edge with a solid band of the edge selection color behind the line", async () => {
        const element = await mounted(viewMode);
        const ab = edgeBetween(element, "a", "b");
        const mid = midpointOf(element, "a", "b");
        const { edgeColor, edgeOpacity } = element.session.config.selectionStyle;
        const band = [1, 3, 5].map((at) => Number.parseInt(edgeColor.slice(at, at + 2), 16));

        const before = await columnAt(element, mid);
        await element.graph.select({ edges: [ab] });
        const after = await columnAt(element, mid);

        // Across the line at its midpoint. Where the canvas showed, the band now does, at the edge
        // opacity (solid by default); where the line showed, the line still does in its own paint,
        // because the band is drawn behind it as a casing.
        const canvas = before[0];
        const want = canvas.map((channel, at) => channel * (1 - edgeOpacity) + band[at] * edgeOpacity);
        const isCanvas = (row: number): boolean =>
            before[row].every((channel, at) => Math.abs(channel - canvas[at]) <= 2);
        const banded = after.filter(
            (pixel, row) => isCanvas(row) && pixel.every((channel, at) => Math.abs(channel - want[at]) <= 8),
        );
        const lineRows = before.map((_, row) => row).filter((row) => !isCanvas(row));
        assert.isAtLeast(
            banded.length,
            4,
            `a band of ${String(want.map(Math.round))} beside the line; across it: ${JSON.stringify(after)}`,
        );
        assert.deepStrictEqual(
            after[lineRows[Math.floor(lineRows.length / 2)]],
            before[lineRows[Math.floor(lineRows.length / 2)]],
            "the line keeps its own paint down the middle",
        );

        await element.graph.select({ edges: [] });
        assert.deepStrictEqual(await columnAt(element, mid), before, "deselected, the edge is drawn plain again");
    });
});
