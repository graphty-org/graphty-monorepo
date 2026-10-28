/**
 * Overlapping nodes are drawn in the file's own order in 2D, as Cytoscape and Pajek draw them: a
 * node later in the file is on top. Read off the drawn frame, at a point inside both nodes that is
 * nearer the first node's centre, where the first node's solid would otherwise show through.
 */
import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { Projector } from "../fidelity/drawn-scene";

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

describe("a file's drawing order in 2D", () => {
    test("draws the node later in the file on top where two overlap", async () => {
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

        const { graph } = element;
        const { nodes } = graph.getDataManager();
        const first = nodes.get("first")?.mesh.getAbsolutePosition();
        const second = nodes.get("second")?.mesh.getAbsolutePosition();
        assert.isDefined(first);
        assert.isDefined(second);
        if (first === undefined || second === undefined) {
            return;
        }

        // A third of the way from the first centre to the second: inside both, nearer the first.
        const probe = new Projector(graph.getScene()).point(Vector3.Lerp(first, second, 1 / 3));
        graph.getScene().render();
        const { engine } = graph;
        const x = Math.round(probe.x);
        const y = engine.getRenderHeight() - 1 - Math.round(probe.y);
        const pixel = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;

        assert.isAbove(pixel[2], pixel[0], `blue over red at (${String(x)}, ${String(y)}): ${String([...pixel])}`);
    });
});
