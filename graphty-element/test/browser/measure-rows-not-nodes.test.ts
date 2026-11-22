/**
 * @file Box selection (`nodesInRect`), framing (`fitToGraph`, zoom to fit), the SVG figure and the
 * 2D/3D switch read where a row drawn with no `Node` is from the row table on the `"batched"`
 * path, and build no `Node` for it (issue #8204). Each answers exactly what it answered when every
 * row had its `Node`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { CameraState } from "../../src/screenshot/types";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = Array.from({ length: 200 }, (_, id) => ({ id }));
const EDGES = NODES.slice(1).map(({ id }) => ({ source: id - 1, target: id }));

/**
 * A batched graph of 200 nodes on a chain, laid out at random with a fixed seed.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath("batched");
    await element.graph.setLayout("random", { dim: 3, seed: 7 });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * The `Node`s built so far.
 * @param element - The element.
 * @returns The count.
 */
function built(element: Graphty): number {
    return dataManagerInternals.nodesBuilt(element.graph.getDataManager());
}

/**
 * Build the `Node` of every row, as the old reads did, and wait for them to be drawn.
 * @param element - The element.
 */
async function buildEveryNode(element: Graphty): Promise<void> {
    dataManagerInternals.buildAll(element.graph.getDataManager());
    await element.waitForStableFrame();
    assert.strictEqual(built(element), NODES.length, "every row has its Node");
}

/**
 * Assert two camera states are the same, to a millionth.
 * @param actual - One.
 * @param expected - The other.
 * @param what - What they are.
 */
function sameCamera(actual: CameraState, expected: CameraState, what: string): void {
    const flat = (state: CameraState): [string, number][] =>
        Object.entries(state).flatMap(([key, value]): [string, number][] => {
            if (typeof value === "number") {
                return [[key, value]];
            }

            if (typeof value === "object" && value !== null) {
                return Object.entries<unknown>(value as Record<string, unknown>).flatMap(
                    ([axis, n]): [string, number][] => (typeof n === "number" ? [[`${key}.${axis}`, n]] : []),
                );
            }

            return [];
        });
    const want = new Map(flat(expected));
    for (const [key, value] of flat(actual)) {
        assert.closeTo(value, want.get(key) ?? Number.NaN, 1e-6, `${what}: ${key}`);
    }
}

describe("measuring rows drawn with no Node", () => {
    it("selects, frames and draws the same as with a Node per row, building none", async () => {
        const element = await mounted();
        assert.strictEqual(built(element), 0, "the load leaves every row with no Node");
        const { graph } = element;
        const rect = { x: 0, y: 0, width: 200, height: 150 };

        const inRect = element.nodesInRect(rect);
        const whole = graph.resolveCameraPreset("fitToGraph");
        const subset = graph.resolveCameraPreset("fitToGraph", { nodes: inRect.slice(0, 20) });
        const figure = await (await element.exportFigure()).blob.text();
        assert.strictEqual(built(element), 0, "no Node built to measure a row");
        assert.isAbove(inRect.length, 0, "the rectangle holds some nodes");
        assert.isBelow(inRect.length, NODES.length, "and not all of them");
        assert.strictEqual((figure.match(/<line /g) ?? []).length > 0, true, "the figure draws the edges");

        await buildEveryNode(element);
        assert.deepEqual(element.nodesInRect(rect), inRect, "the same selection");
        sameCamera(graph.resolveCameraPreset("fitToGraph"), whole, "the whole graph's frame");
        sameCamera(graph.resolveCameraPreset("fitToGraph", { nodes: inRect.slice(0, 20) }), subset, "a subset's frame");
        assert.strictEqual(await (await element.exportFigure()).blob.text(), figure, "the same figure");
    });

    it("switches to 2D and back with no Node built, framing as with a Node per row", async () => {
        const rows = await mounted();
        const objects = await mounted();
        await buildEveryNode(objects);

        for (const mode of ["2d", "3d"] as const) {
            await rows.setViewMode(mode);
            await objects.setViewMode(mode);
            await rows.waitForStableFrame();
            await objects.waitForStableFrame();
            assert.strictEqual(built(rows), 0, `no Node built switching to ${mode}`);
            assert.strictEqual(
                rows.graph.getNodeBatches()?.columnRowCount,
                NODES.length,
                `every row drawn again in ${mode}`,
            );
            sameCamera(rows.getCameraState(), objects.getCameraState(), `the ${mode} framing`);
            const all = { x: 0, y: 0, width: 400, height: 300 };
            assert.deepEqual(rows.nodesInRect(all), objects.nodesInRect(all), `the same nodes on screen in ${mode}`);
        }
    });
});
