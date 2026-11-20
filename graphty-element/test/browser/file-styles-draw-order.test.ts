/**
 * Overlapping nodes are drawn in the file's own order in 2D, as Cytoscape and Pajek draw them: a
 * node later in the file is on top; a `node.drawOrder` layer puts the node with the higher value on
 * top instead. Read off the drawn frame, at a point inside both nodes nearer the one that should be
 * hidden there, where its solid would otherwise show through.
 */
import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { Projector } from "../fidelity/drawn-scene";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

/** Two nodes of one size, the second overlapping the first by half its width: red, then blue. */
const DOC = JSON.stringify({
    elements: [
        { data: { id: "first" }, position: { x: 0, y: 0 } },
        { data: { id: "second" }, position: { x: 20, y: 0 } },
    ],
    style: [
        { selector: "node", style: { width: 40, height: 40, "background-color": "#ff0000" } },
        { selector: "#second", style: { "background-color": "#0000ff" } },
    ],
});

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Loads the two-node document in 2D with its styles, adds `layers` over them, and reads one pixel.
 * @param layers - Draw orders to set per node id, each as a layer of its own.
 * @param at - Where to read, as the fraction of the way from the first node's center to the second's.
 * @returns The pixel there.
 */
async function drawnAt(layers: Readonly<Record<string, number>>, at: number): Promise<Uint8Array> {
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
    for (const [id, order] of Object.entries(layers)) {
        await element.session.styles.add({
            name: `order ${id}`,
            target: "node",
            selector: { match: "ids", nodes: [id] },
            set: { "node.drawOrder": order },
        });
    }
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    const { graph } = element;
    const { nodes } = graph.getDataManager();
    const first = nodes.get("first")?.mesh.getAbsolutePosition();
    const second = nodes.get("second")?.mesh.getAbsolutePosition();
    assert.isDefined(first);
    assert.isDefined(second);
    if (first === undefined || second === undefined) {
        return new Uint8Array(4);
    }

    const probe = new Projector(graph.getScene()).point(Vector3.Lerp(first, second, at));
    graph.getScene().render();
    const { engine } = graph;
    const x = Math.round(probe.x);
    const y = engine.getRenderHeight() - 1 - Math.round(probe.y);
    return (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
}

describe("a file's drawing order in 2D", () => {
    test("draws the node later in the file on top where two overlap", async () => {
        // A third of the way from the first center to the second: inside both, nearer the first.
        const pixel = await drawnAt({}, 1 / 3);
        assert.isAbove(pixel[2], pixel[0], `blue over red: ${String([...pixel])}`);
    });

    test("draws the node with the higher node.drawOrder on top, whatever the file's order", async () => {
        // Two thirds of the way: inside both, nearer the second, which the file alone draws on top.
        const pixel = await drawnAt({ first: 90, second: 10 }, 2 / 3);
        assert.isAbove(pixel[0], pixel[2], `red over blue: ${String([...pixel])}`);
    });
});
