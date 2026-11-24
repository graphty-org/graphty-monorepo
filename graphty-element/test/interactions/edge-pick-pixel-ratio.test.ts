/**
 * @file At a pixel ratio other than 1 the middle of an edge is found as at ratio 1: a real pointer
 * resting there hovers it (the pointer cursor), a real click selects it, and `elementAt` names it, on
 * both render paths (issue #9917: the pick compared the CSS pointer at the ratio times its place).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, hover } from "../helpers/real-input";
import { applied, at, EMPTY, HEIGHT, WIDTH } from "./helpers/mounted-element";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with one edge a-b, on one render path, drawn at a pixel ratio of 2.
 * @param path - The render path.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(path: RenderPath, viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.pixelRatio = 2;
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 2);
    await element.waitForStableFrame();
    return element;
}

describe("an edge at a pixel ratio of 2", () => {
    for (const path of ["objects", "batched"] as const) {
        for (const viewMode of ["2d", "3d"] as const) {
            it(`is hovered, clicked and found by elementAt at its middle (${path}, ${viewMode})`, async () => {
                const element = await mounted(path, viewMode);
                assert.strictEqual(element.graph.canvas.width, WIDTH * 2, "the canvas is drawn at twice the CSS width");
                const a = at(element, "a");
                const b = at(element, "b");
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

                const hit = element.elementAt(mid);
                assert.isNotNull(hit, "elementAt finds something at the edge's middle");
                assert.strictEqual(hit.kind, "edge", "elementAt names the edge at its middle");

                const { canvas } = element.graph;
                await hover(element, EMPTY);
                await applied(element);
                assert.notStrictEqual(canvas.style.cursor, "pointer", "empty canvas is not hovered");
                await hover(element, mid);
                await applied(element);
                assert.strictEqual(canvas.style.cursor, "pointer", "the pointer resting on the edge hovers it");

                await click(element, mid);
                await applied(element);
                assert.deepStrictEqual([...element.session.selection.edges], [hit.id], "the click selected the edge");
                assert.isEmpty(element.session.selection.nodes, "and no node");
            });
        }
    }
});
