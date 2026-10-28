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

/** A group with no position of its own around two members set far apart, every node bordered and labelled. */
const STRETCHED = JSON.stringify({
    elements: [
        { data: { id: "g" } },
        { data: { id: "a", parent: "g" }, position: { x: -300, y: 0 } },
        { data: { id: "b", parent: "g" }, position: { x: 300, y: 200 } },
        { data: { id: "ab", source: "a", target: "b" } },
    ],
    style: [
        {
            selector: "node",
            style: { shape: "rectangle", width: 20, height: 20, "border-width": 2, label: "data(id)" },
        },
    ],
});

/**
 * How far a node's border reaches past its fill across the view, and how tall its label is, in
 * the scene.
 * @param element - The element.
 * @param id - The node.
 * @returns The border's reach and the label's height.
 */
function drawnSizes(element: Graphty, id: string): { border: number; label: number } {
    const node = element.graph.getDataManager().nodes.get(id);
    assert.isDefined(node, id);
    const width = (mesh: {
        computeWorldMatrix(force: boolean): unknown;
        getBoundingInfo(): {
            boundingBox: { minimumWorld: { x: number; y: number }; maximumWorld: { x: number; y: number } };
        };
    }): { x: number; y: number } => {
        mesh.computeWorldMatrix(true);
        const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
        return { x: max.x - min.x, y: max.y - min.y };
    };
    // The drawn ring: a group keeps the cached border its ring replaced, hidden, beside it.
    const ring = node.mesh.getChildMeshes().find((mesh) => mesh.name.startsWith("node-border") && mesh.isEnabled());
    assert.isDefined(ring, `${id} has a border`);
    const label = node.label?.labelMesh;
    assert.isDefined(label ?? undefined, `${id} has a label`);
    return { border: (width(ring).x - width(node.mesh).x) / 2, label: label ? width(label).y : Number.NaN };
}

describe("a group stretched over its members' box", () => {
    test("keeps the border width and label size its style gives", async () => {
        const element = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:800px;height:600px";
        element.viewMode = "2d";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;
        await element.session.data.import(
            { type: "json", config: { data: STRETCHED } },
            { styles: "file", layout: "recommended" },
        );
        await element.waitForSettled();
        await element.session.styles.settled();
        await element.waitForStableFrame();

        const group = drawnSizes(element, "g");
        const member = drawnSizes(element, "a");
        assert.isAbove(member.border, 0);
        assert.closeTo(
            group.border,
            member.border,
            member.border * 0.05,
            "the group's border is as wide as a member's",
        );
        assert.closeTo(group.label, member.label, member.label * 0.05, "the group's label is as tall as a member's");
    });
});
