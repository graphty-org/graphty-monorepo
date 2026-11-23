/**
 * @file Positions placed before the first frame stay placed, on every render path.
 *
 * Under renderPath "batched" a row has no `Node`, and a static layout (fixed, circular, every layout that computes
 * once) took the coordinates `positions.set` wrote only through each `Node`. So the layout kept the answer it had
 * computed before the set, and paid out its owed pre-steps on a later frame by publishing that answer over the set:
 * every node of the graphty app's Inspector stories was drawn at one point, and `positions.get` read back the origin
 * (issue #9162).
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = Array.from({ length: 11 }, (_, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}` }));
/** Two rows of six, as the Inspector stories place them. */
const PLACED = NODES.map((n, i) => ({ id: n.id, x: (i % 6) * 6 - 15, y: i < 6 ? 5 : -5 }));

/** objects; batched from construction; batched switched on once the element has drawn, as the graphty app does. */
const PATHS = ["objects", "batched", "switched"] as const;

const elements: Graphty[] = [];
afterEach(() => {
    for (const element of elements.splice(0)) {
        element.remove();
    }
});

/**
 * An element on a render path, with a 2D view and nothing drawn from data yet.
 * @param path - Which path.
 * @returns The element.
 */
async function elementOn(path: (typeof PATHS)[number]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    if (path === "batched") {
        element.renderPath = "batched";
    }

    element.style.display = "block";
    element.style.width = "600px";
    element.style.height = "400px";
    document.body.appendChild(element);
    elements.push(element);
    await element.updateComplete;
    if (path === "switched") {
        await element.waitForStableFrame();
        element.renderPath = "batched";
    }

    await element.session.layout.setDimension("2d");
    return element;
}

/**
 * Assert every node is stored where it was placed, and drawn apart from the others.
 * @param element - The element, at a stable frame.
 * @param path - For the messages.
 */
function assertPlaced(element: Graphty, path: string): void {
    for (const { id, x, y } of PLACED) {
        const stored = element.session.positions.get(id);
        assert.deepEqual(stored && { x: stored.x, y: stored.y }, { x, y }, `${path}: ${id} is stored where it was put`);
    }

    const drawn = new Set(
        NODES.map(({ id }) => {
            const at = element.nodeScreenPosition(id);
            return at ? `${String(Math.round(at.x))},${String(Math.round(at.y))}` : "none";
        }),
    );
    assert.strictEqual(drawn.size, NODES.length, `${path}: every node is drawn at a place of its own`);
}

describe("positions placed before the first frame", () => {
    for (const layout of ["fixed", "circular"] as const) {
        for (const path of PATHS) {
            it(`a ${layout} layout keeps them, ${path}`, async () => {
                const element = await elementOn(path);
                const { session } = element;
                await session.layout.set(layout);
                await session.data.addNodes(NODES);
                await session.data.addEdges(EDGES);
                await session.positions.set(PLACED);
                await element.waitForStableFrame();
                assertPlaced(element, path);
            });
        }
    }

    for (const path of PATHS) {
        it(`a project opened with a fixed layout keeps its saved arrangement, ${path}`, async () => {
            const from = await elementOn("objects");
            await from.session.layout.set("fixed");
            await from.session.data.addNodes(NODES);
            await from.session.data.addEdges(EDGES);
            await from.waitForStableFrame();
            await from.session.positions.set(PLACED);
            await from.waitForStableFrame();
            const { text } = await from.session.project.save();

            const to = await elementOn(path);
            await to.session.project.open(text, { discard: true });
            await to.waitForStableFrame();
            assertPlaced(to, path);
        });
    }
});
