/**
 * @file `layoutBehavior.node.outlineWidth`: one width for every outline, set on the graph, which
 * widens the one outline pass whether it exists already or is made later.
 */

import "../../src/graphty-element";

import type { HighlightLayer } from "@babylonjs/core";
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
 * The outline pass's stroke size, as the scene holds it.
 * @param element - The element.
 * @returns Its horizontal and vertical blur sizes.
 */
function stroke(element: Graphty): [number, number] {
    const layer = element.graph.scene.metadata?.highlightLayer as HighlightLayer | undefined;
    assert.isDefined(layer, "an outlined node made the outline pass");
    return [layer?.blurHorizontalSize ?? Number.NaN, layer?.blurVerticalSize ?? Number.NaN];
}

describe("the graph's outline width", () => {
    let element: Graphty | undefined;

    afterEach(() => {
        element?.remove();
        element = undefined;
    });

    it("widens every outline when it is set, and returns to the renderer's own when cleared", async () => {
        element = await outlined();
        const own = stroke(element);

        element.layoutBehavior = { node: { outlineWidth: 2 } };
        assert.deepStrictEqual(stroke(element), [own[0] * 2, own[1] * 2]);

        element.layoutBehavior = { node: { outlineWidth: undefined } };
        assert.deepStrictEqual(stroke(element), own);
    });
});
