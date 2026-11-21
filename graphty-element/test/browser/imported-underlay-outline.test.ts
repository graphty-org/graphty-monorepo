/**
 * A Cytoscape.js edge underlay, loaded with the file's styles, is drawn as the edge's outline (`edge.outline*`): a band
 * in the underlay's color under the line, the line's own color down its middle, in the 2D view and in the 3D view
 * (E677: the underlay folds into the outline, which draws in both views). Read off the drawn frame, down a column of
 * pixels across the line's middle.
 */
import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { Projector } from "../fidelity/drawn-scene";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

/** Two nodes far apart, one gray line between them with a green underlay 12px either side of its middle. */
const DOC = JSON.stringify({
    elements: [
        { data: { id: "a" }, position: { x: 0, y: 0 } },
        { data: { id: "b" }, position: { x: 400, y: 0 } },
        { data: { id: "ab", source: "a", target: "b" } },
    ],
    style: [
        { selector: "node", style: { width: 10, height: 10, "background-color": "#ff0000" } },
        {
            selector: "edge",
            style: {
                width: 4,
                "line-color": "#808080",
                "underlay-opacity": 1,
                "underlay-color": "#00ff00",
                "underlay-padding": 12,
            },
        },
    ],
});

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/** A pixel is the underlay's green. */
const green = (r: number, g: number, b: number): boolean => g > 200 && r < 60 && b < 60;
/** A pixel is the line's gray. */
const gray = (r: number, g: number, b: number): boolean =>
    Math.abs(r - 128) < 30 && Math.abs(g - 128) < 30 && Math.abs(b - 128) < 30;

/**
 * The colors down the column of pixels through the line's middle, 80 render pixels above it to 80 below.
 * @param element - The element.
 * @returns Each pixel's r, g, b, the middle at index 80.
 */
async function columnAcrossTheLine(element: Graphty): Promise<[number, number, number][]> {
    const { graph } = element;
    const { nodes } = graph.getDataManager();
    const a = nodes.get("a")?.mesh.getAbsolutePosition();
    const b = nodes.get("b")?.mesh.getAbsolutePosition();
    assert(a && b, "both nodes are drawn");
    const middle = new Projector(graph.getScene()).point(Vector3.Lerp(a, b, 0.5));
    graph.getScene().render();
    const { engine } = graph;
    const x = Math.round(middle.x);
    const y = engine.getRenderHeight() - 1 - Math.round(middle.y);
    const read = (await engine.readPixels(x, y - 80, 1, 161)) as unknown as Uint8Array;
    // WebGL rows count up from the bottom: index 0 is the lowest
    return Array.from({ length: 161 }, (_, i) => [read[4 * i], read[4 * i + 1], read[4 * i + 2]]);
}

/**
 * Assert the column shows the line's gray in the middle with the underlay's green on both sides of it.
 * @param column - The pixels, the middle at index 80.
 * @param view - Which view, for the messages.
 */
function assertCased(column: [number, number, number][], view: string): void {
    const shown = JSON.stringify(column.filter((_, i) => i % 4 === 0));
    assert.isTrue(gray(...column[80]), `${view}: the line's own gray down its middle: ${shown}`);
    assert.isTrue(
        column.slice(0, 80).some((p) => green(...p)),
        `${view}: green on one side of the line: ${shown}`,
    );
    assert.isTrue(
        column.slice(81).some((p) => green(...p)),
        `${view}: green on the other side: ${shown}`,
    );
}

describe("a Cytoscape.js edge underlay", () => {
    test("is drawn as the edge's outline, under the line, in 2D and in 3D", async () => {
        const element = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:800px;height:600px";
        element.viewMode = "2d";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;
        await element.session.data.import(
            { type: "json", config: { data: DOC } },
            { styles: "file", layout: "recommended" },
        );
        await element.waitForSettled();
        await element.session.styles.settled();
        await element.waitForStableFrame();

        const edge = element.session.data.edges()[0];
        const merged = element.session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>;
        assert.strictEqual((merged["edge.outlineColor"] as { hex: string }).hex.slice(0, 7).toLowerCase(), "#00ff00");
        assertCased(await columnAcrossTheLine(element), "2D");

        await element.graph.setViewMode("3d");
        await element.waitForSettled();
        await element.waitForStableFrame();
        assertCased(await columnAcrossTheLine(element), "3D");
    });
});
