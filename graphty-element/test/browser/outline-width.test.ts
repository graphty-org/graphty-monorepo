/**
 * @file Outline width: `node.outlineWidth` per style layer, and `layoutBehavior.node.outlineWidth`,
 * the width of every outline whose layer sets none, which widens such rings whether they are drawn
 * already or are made later.
 */

import "../../src/graphty-element";

import { Mesh, VertexBuffer } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

/**
 * A graph of one outlined node.
 * @returns The element.
 */
async function outlined(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "Outlined",
        target: "node",
        selector: { match: "everything" },
        set: { "node.outline": "#ff0000" },
    });
    await element.session.styles.settled();
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * How far the outline ring reaches, as the scene holds its geometry: the largest radius of the
 * ring source mesh's vertices. The outline is a ring mesh around the node (e8546ecf5f), and its
 * width is the band between the ring's inner and outer radius.
 * @param element - The element.
 * @param color - The ring's color, which starts its source mesh's name.
 * @returns The ring's inner and outer radius.
 */
function ring(element: Graphty, color = "#ff0000"): [number, number] {
    const source = element.graph.scene.meshes.find(
        (mesh): mesh is Mesh =>
            mesh instanceof Mesh && mesh.name.toLowerCase().startsWith(`graphty-node-outline-${color}`),
    );
    assert.isDefined(source, "an outlined node drew an outline ring");
    const positions = source?.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const radii: number[] = [];
    for (let at = 0; at < positions.length; at += 3) {
        radii.push(Math.hypot(positions[at], positions[at + 1]));
    }

    return [Math.min(...radii), Math.max(...radii)];
}

describe("the graph's outline width", () => {
    let element: Graphty | undefined;

    afterEach(() => {
        element?.remove();
        element = undefined;
    });

    it("widens every outline when it is set, and returns to the renderer's own when cleared", async () => {
        element = await outlined();
        const [inner, outer] = ring(element);

        element.layoutBehavior = { node: { outlineWidth: 2 } };
        const [wideInner, wideOuter] = ring(element);
        assert.closeTo(wideInner, inner, 1e-6, "the ring still starts at the node");
        assert.closeTo(wideOuter - wideInner, (outer - inner) * 2, 1e-6, "the band is twice as wide");

        element.layoutBehavior = { node: { outlineWidth: undefined } };
        const [backInner, backOuter] = ring(element);
        assert.closeTo(backInner, inner, 1e-6);
        assert.closeTo(backOuter, outer, 1e-6, "and back to the renderer's own width");
    });

    it("draws each layer's outline at the width the layer sets, and the graph's width only where none is set", async () => {
        element = await outlined();
        const [inner, outer] = ring(element);
        await element.session.data.addNodes([{ id: "b", position: { x: 2, y: 0, z: 0 } }]);
        await element.session.styles.add({
            name: "Wide blue",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.outline": "#0000ff", "node.outlineWidth": 3 },
        });
        await element.session.styles.settled();
        await operationQueueOf(element.graph).waitForCompletion();

        const [blueInner, blueOuter] = ring(element, "#0000ff");
        assert.closeTo(blueInner, inner, 1e-6, "the wide ring still starts at the node");
        assert.closeTo(blueOuter - blueInner, (outer - inner) * 3, 1e-6, "the layer's width: three times as wide");
        const [redInner, redOuter] = ring(element);
        assert.closeTo(redOuter - redInner, outer - inner, 1e-6, "the other layer's ring keeps its width");

        element.layoutBehavior = { node: { outlineWidth: 2 } };
        const [, redWide] = ring(element);
        assert.closeTo(redWide - inner, (outer - inner) * 2, 1e-6, "the graph's width reaches a ring with none");
        const [, blueStill] = ring(element, "#0000ff");
        assert.closeTo(blueStill, blueOuter, 1e-6, "and not one whose layer sets its own");
    });
});
