/**
 * Crossing edges are drawn in the file's order in 2D, a later edge on top; a Cytoscape.js `z-index`
 * (read as `edge.drawOrder`) or an `edge.drawOrder` layer puts the edge with the higher value on top
 * instead. Read off the drawn frame where the two lines cross.
 */
import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { Projector } from "../fidelity/drawn-scene";

/**
 * Two wide lines crossing at the origin: red from left to right, then blue from top to bottom.
 * @param redStyle - Extra Cytoscape.js style for the red edge.
 * @returns The document.
 */
function doc(redStyle: Record<string, unknown> = {}): string {
    return JSON.stringify({
        elements: [
            { data: { id: "l" }, position: { x: -60, y: 0 } },
            { data: { id: "r" }, position: { x: 60, y: 0 } },
            { data: { id: "t" }, position: { x: 0, y: -60 } },
            { data: { id: "b" }, position: { x: 0, y: 60 } },
            { data: { id: "red", source: "l", target: "r" } },
            { data: { id: "blue", source: "t", target: "b" } },
        ],
        style: [
            { selector: "node", style: { width: 4, height: 4 } },
            { selector: "edge", style: { width: 12, "line-color": "#0000ff" } },
            { selector: "#red", style: { "line-color": "#ff0000", ...redStyle } },
        ],
    });
}

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/** How a test loads the document: with its file styles on the default path, or as plain lines pulled on "batched". */
type Load = "file" | "plain";

/** Each edge's color, by its source node's id, for a plain load. */
const PLAIN_COLORS: Readonly<Record<string, string>> = { l: "#ff0000", t: "#0000ff" };

/**
 * Loads a document in 2D, adds `layers` over it, and reads the pixel where the lines cross.
 * @param data - The document.
 * @param layers - Draw orders to set per edge, by its source node's id, each as a layer of its own.
 * @param load - With the file's styles, or as plain wide lines colored by layers on the "batched" path.
 * @param late - Add the draw orders only once the lines are drawn, so they restyle lines already in place.
 * @returns The pixel there.
 */
async function crossing(
    data: string,
    layers: Readonly<Record<string, number>> = {},
    load: Load = "file",
    late = false,
): Promise<Uint8Array> {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:800px;height:600px";
    element.viewMode = "2d";
    if (load === "plain") {
        element.renderPath = "batched";
    }
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await element.session.data.import(
        { type: "json", config: { data } },
        { styles: load === "file" ? "file" : "none", layout: "recommended" },
    );
    const { edges } = element.graph.getDataManager();
    const idOf = (source: string): string => {
        const edge = [...edges.values()].find((e) => e.srcId === source);
        assert.isDefined(edge);
        return edge?.id ?? "";
    };
    if (load === "plain") {
        for (const [source, color] of Object.entries(PLAIN_COLORS)) {
            await element.session.styles.add({
                name: `look ${source}`,
                target: "edge",
                selector: { match: "ids", edges: [idOf(source)] },
                set: { "edge.color": color, "edge.width": 12, "edge.arrowHead": "none" },
            });
        }
    }
    if (late) {
        await element.waitForSettled();
        await element.session.styles.settled();
        await element.waitForStableFrame();
    }
    for (const [source, order] of Object.entries(layers)) {
        await element.session.styles.add({
            name: `order ${source}`,
            target: "edge",
            selector: { match: "ids", edges: [idOf(source)] },
            set: { "edge.drawOrder": order },
        });
    }
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    const { graph } = element;
    if (load === "plain") {
        for (const { mesh } of edges.values()) {
            assert.include("name" in mesh ? mesh.name : "", "edge-pulled", 'a plain line on "batched" is pulled');
        }
    }

    const { nodes } = graph.getDataManager();
    const left = nodes.get("l")?.mesh.getAbsolutePosition();
    const right = nodes.get("r")?.mesh.getAbsolutePosition();
    assert.isDefined(left);
    assert.isDefined(right);
    if (left === undefined || right === undefined) {
        return new Uint8Array(4);
    }

    const probe = new Projector(graph.getScene()).point(Vector3.Lerp(left, right, 0.5));
    graph.getScene().render();
    const { engine } = graph;
    const x = Math.round(probe.x);
    const y = engine.getRenderHeight() - 1 - Math.round(probe.y);
    return (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
}

describe("edge draw order in 2D", () => {
    test("draws the edge later in the file on top where two cross", async () => {
        const pixel = await crossing(doc());
        assert.isAbove(pixel[2], pixel[0], `blue over red: ${String([...pixel])}`);
    });

    test("draws the edge with the higher Cytoscape.js z-index on top", async () => {
        const pixel = await crossing(doc({ "z-index": 5 }));
        assert.isAbove(pixel[0], pixel[2], `red over blue: ${String([...pixel])}`);
    });

    test("draws the edge with the higher edge.drawOrder on top", async () => {
        const pixel = await crossing(doc(), { l: 60, t: 20 });
        assert.isAbove(pixel[0], pixel[2], `red over blue: ${String([...pixel])}`);
    });

    test("draws a plain pulled line with the higher edge.drawOrder on top", async () => {
        const plain = await crossing(doc(), {}, "plain");
        assert.isAbove(plain[2], plain[0], `blue over red with no order: ${String([...plain])}`);
        mounted?.remove();
        const pixel = await crossing(doc(), { l: 60, t: 20 }, "plain");
        assert.isAbove(pixel[0], pixel[2], `red over blue: ${String([...pixel])}`);
    });

    test("moves a drawn plain pulled line on top when a layer later gives it the higher edge.drawOrder", async () => {
        const pixel = await crossing(doc(), { l: 60, t: 20 }, "plain", true);
        assert.isAbove(pixel[0], pixel[2], `red over blue: ${String([...pixel])}`);
    });
});
