/**
 * A file's group (compound) nodes are drawn behind what they hold in 2D, as yEd and Cytoscape draw
 * them: a Cytoscape.js compound loaded with its file styles hides none of its members, its box is
 * behind every edge, and an outer group is behind an inner one. Read off the drawn Babylon scene.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { readDrawn } from "../fidelity/drawn-scene";
import { occluders } from "../fidelity/extract-scene";

/** An outer compound holding an inner one holding two nodes, each drawn as a filled rectangle. */
const DOC = JSON.stringify({
    elements: [
        { data: { id: "outer" }, position: { x: 0, y: 0 } },
        { data: { id: "inner", parent: "outer" }, position: { x: 0, y: 0 } },
        { data: { id: "a", parent: "inner" }, position: { x: -20, y: 0 } },
        { data: { id: "b", parent: "inner" }, position: { x: 20, y: 0 } },
        { data: { id: "free" }, position: { x: 200, y: 0 } },
        { data: { id: "ab", source: "a", target: "b" } },
        { data: { id: "bfree", source: "b", target: "free" } },
    ],
    style: [
        { selector: "node", style: { shape: "rectangle", "background-color": "#ffcc00", width: 20, height: 20 } },
        { selector: "#inner", style: { "background-color": "#cccccc", width: 100, height: 60 } },
        { selector: "#outer", style: { "background-color": "#999999", width: 160, height: 120 } },
    ],
});

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

describe("a file's groups in 2D", () => {
    test("are drawn behind their members and every edge, an outer group behind an inner one", async () => {
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

        const drawn = readDrawn(element.graph);
        assert.deepEqual([...occluders(drawn.nodes)], [], "no node is hidden behind another");

        const near = (id: string): number => drawn.nodes.get(id)?.box.near ?? Number.NaN;
        assert.isAbove(near("inner"), near("a"));
        assert.isAbove(near("inner"), near("b"));
        assert.isAbove(near("outer"), near("inner"));

        // Edges are drawn on z = 0 and the 2D camera looks along +z: a group's front face behind
        // that plane leaves every edge across it in view.
        const { nodes } = element.graph.getDataManager();
        for (const id of ["inner", "outer"]) {
            const front = nodes.get(id)?.mesh.getBoundingInfo().boundingBox.minimumWorld.z ?? Number.NaN;
            assert.isAbove(front, 0, `${id} is behind the edges`);
        }
    });
});
