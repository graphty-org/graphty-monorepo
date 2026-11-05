/**
 * @file An edge effect that loops keeps the frames coming on a graph drawn on demand, from the
 * first load on and after it is hidden and shown again (design/rendering/shader-styles.md
 * section 5). Waits here are passive -- animation frames of the page, never a frame observer on the
 * scene, which would itself ask a graph drawn on demand for the frame and hide a lost claim.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../../src/Graph";
import { EdgeShaderDrawing } from "../../../src/meshes/EdgeShaderDrawing";
import { presetId } from "../../../stories/shaders/edgePresets";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/**
 * Wait for chances of the element's render loop to draw (a tick that drew or rested), asking the
 * scene for nothing: a frame observer would itself be something the loop draws for.
 * @param element - The element.
 * @param chances - How many.
 * @returns How many of them drew a frame.
 */
async function loopChances(element: Graphty, chances: number): Promise<number> {
    const { ticks } = (element.graph as unknown as { renderManager: { ticks: { drawn: number; rested: number } } })
        .renderManager;
    const start = ticks.drawn + ticks.rested;
    const drawnBefore = ticks.drawn;
    while (ticks.drawn + ticks.rested - start < chances) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    return ticks.drawn - drawnBefore;
}

/**
 * Wait passively until a condition holds; fail after a bound of page frames.
 * @param what - What is awaited.
 * @param holds - The condition.
 */
async function until(what: string, holds: () => boolean): Promise<void> {
    for (let i = 0; i < 600 && !holds(); i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    assert.isTrue(holds(), what);
}

/**
 * Whether the edge effect batches draw and claim frames now.
 * @param element - The element.
 * @returns The live slots and whether a claim is held.
 */
function effectState(element: Graphty): { live: number; moving: boolean } {
    const stats = EdgeShaderDrawing.peek(element.graph.getScene())?.stats();
    return {
        live: [...(stats?.slots.values() ?? [])].reduce((sum, count) => sum + count, 0),
        moving: stats?.moving ?? false,
    };
}

/**
 * A mounted element drawing on demand in 2D, two nodes and one edge carrying comets.
 * @returns The element and the effect layer's id.
 */
async function mounted(): Promise<{ element: Graphty; layer: string }> {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -6, y: 0, z: 0 } },
        { id: "b", position: { x: 6, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "Lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.width": 24 },
    });
    const layer = await element.session.styles.add({
        name: "Comets",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.shaders": [{ shader: presetId("comet-tracers") }] },
    });
    return { element, layer: layer.id };
}

/**
 * Assert the graph keeps drawing by itself: every chance the render loop has to draw, nobody else
 * asking, draws a frame.
 * @param element - The element.
 * @param what - What is checked.
 */
async function keepsDrawing(element: Graphty, what: string): Promise<void> {
    await until(`${what}: the effect claims frames`, () => effectState(element).moving);
    assert.strictEqual(await loopChances(element, 20), 20, `${what}: the loop draws frames by itself`);
}

describe("a looping edge effect on a graph drawn on demand", () => {
    it("moves from the first load on when the style comes before the data and a layout settles", async () => {
        const element = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:400px;height:300px";
        element.renderOnDemand = true;
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.session.styles.add({
            name: "Comets",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": 24, "edge.shaders": [{ shader: presetId("comet-tracers") }] },
        });
        await element.session.data.addNodes(Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` })));
        await element.session.data.addEdges(
            Array.from({ length: 11 }, (_, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}` })),
        );
        await until("the effect draws", () => effectState(element).live === 11);
        await element.graph.waitForStableFrame();
        await keepsDrawing(element, "first load after a layout");
    });

    it("moves from the first load on when the element is set up before it is attached", async () => {
        const element = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:400px;height:300px";
        const side = 10;
        element.nodeData = Array.from({ length: side * side }, (_, i) => ({
            id: `n${String(i)}`,
            position: { x: ((i % side) - side / 2) * 2, y: (Math.floor(i / side) - side / 2) * 2, z: 0 },
        }));
        element.edgeData = Array.from({ length: side * side - 1 }, (_, i) => ({
            src: `n${String(i)}`,
            dst: `n${String(i + 1)}`,
        }));
        void element.session.styles.add({
            name: "Edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": 1 },
        });
        void element.session.styles.add({
            name: "Comets",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.shaders": [{ shader: presetId("comet-tracers") }] },
        });
        element.layout = "fixed";
        element.layoutConfig = { dim: 3 };
        element.viewMode = "2d";
        element.renderOnDemand = true;
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await until("the effect draws", () => effectState(element).live > 0);
        await keepsDrawing(element, "set up before attached");
    });

    it("moves from the first load on", async () => {
        const { element } = await mounted();
        await until("the effect draws", () => effectState(element).live === 1);
        await keepsDrawing(element, "first load");
    });

    it("moves again after it is hidden and shown", async () => {
        const { element, layer } = await mounted();
        await until("the effect draws", () => effectState(element).live === 1);
        await keepsDrawing(element, "first load");
        const id = presetId("comet-tracers");
        await element.session.styles.update(layer, { set: { "edge.shaders": [] } });
        await until("hidden, the effect lets the frames rest", () => !effectState(element).moving);
        await element.session.styles.update(layer, { set: { "edge.shaders": [{ shader: id }] } });
        await until("shown again, the effect draws", () => effectState(element).live === 1);
        await keepsDrawing(element, "shown again");
    });
});
