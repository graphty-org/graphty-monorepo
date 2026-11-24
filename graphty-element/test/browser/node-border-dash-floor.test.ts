/**
 * @file A dashed or dotted node border keeps its pattern a pixel per border width at least, however thin the border
 * is drawn (issue #9762): a half-pixel dashed border draws dashes three pixels long, not three half-pixels, so it
 * still reads as dashed, while a border wide enough is drawn as its width gives.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { PATTERN_UNIT_FLOOR_PX } from "../../src/meshes/shapeOutlines";
import type { Node } from "../../src/Node";
import { Projector, readNode } from "../fidelity/drawn-scene";

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

/**
 * One ellipse node with a patterned border, drawn in 2D.
 * @param style - the border's line style
 * @param width - the border's width
 * @returns the node
 */
async function bordered(style: string, width: number): Promise<Node> {
    element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    document.body.appendChild(element);
    await element.updateComplete;
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "bordered",
        target: "node",
        selector: { match: "ids", nodes: ["n"] },
        set: {
            "node.shape": "ellipse",
            "node.size": 6,
            "node.borderWidth": width,
            "node.borderColor": "#0000ff",
            "node.borderStyle": style,
        },
    });
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const node = element.graph.getDataManager().nodes.get("n");
    assert.isDefined(node);
    return node;
}

/**
 * The ring's drawn width, and its pieces' lengths and the gaps between them, in render pixels.
 * @param node - the node
 * @returns the width, the pieces and the gaps
 */
function measured(node: Node): { width: number; dashes: number[]; gaps: number[] } {
    const { border } = readNode(node, new Projector(node.mesh.getScene()), []);
    const pattern = border?.dashPx;
    assert.exists(pattern, "the ring is cut into pieces");
    return {
        width: border?.widthPx ?? 0,
        dashes: pattern.filter((_, i) => i % 2 === 0),
        gaps: pattern.filter((_, i) => i % 2 === 1),
    };
}

/** A pattern fitted round a ring stretches or shrinks a little to close on itself; this much is allowed. */
const FIT = 0.85;

describe("a thin patterned node border keeps a pattern a reader can see (#9762)", () => {
    it("draws a hairline dashed border's dashes and gaps at least the floor in pixels", async () => {
        const node = await bordered("dashed", 0.01);
        const { width, dashes, gaps } = measured(node);
        assert.isBelow(width, PATTERN_UNIT_FLOOR_PX, "the border is drawn thinner than the floor");
        assert.isAtLeast(Math.min(...dashes), 3 * PATTERN_UNIT_FLOOR_PX * FIT, "each dash three pixels or more");
        assert.isAtLeast(Math.min(...gaps), 2 * PATTERN_UNIT_FLOOR_PX * FIT, "each gap two pixels or more");
    });

    it("draws a hairline dotted border's dots and gaps a pixel at least", async () => {
        const node = await bordered("dotted", 0.01);
        const { dashes, gaps } = measured(node);
        assert.isAtLeast(Math.min(...dashes), PATTERN_UNIT_FLOOR_PX * FIT, "each dot a pixel or more");
        assert.isAtLeast(Math.min(...gaps), PATTERN_UNIT_FLOOR_PX * FIT, "each gap a pixel or more");
    });

    it("keeps the floor when the camera zooms out", async () => {
        const node = await bordered("dashed", 0.01);
        const before = measured(node);
        assert.exists(element);
        // farther out: half the zoom, so the ring is drawn half as wide
        const { graph } = element;
        await graph.setCameraZoom((graph.getCameraState().zoom ?? 1) / 2);
        await element.waitForStableFrame();
        const after = measured(node);
        assert.isBelow(after.width, before.width, "the ring is drawn thinner after the zoom");
        assert.isAtLeast(Math.min(...after.dashes), 3 * PATTERN_UNIT_FLOOR_PX * FIT, "each dash still three pixels");
    });

    it("draws a wide dashed border's dashes three of its widths long, as before", async () => {
        const node = await bordered("dashed", 0.5);
        const { width, dashes } = measured(node);
        assert.isAbove(width, 3 * PATTERN_UNIT_FLOOR_PX, "the border is wide on screen");
        const median = [...dashes].sort((a, b) => a - b)[Math.floor(dashes.length / 2)];
        assert.approximately(median, 3 * width, 3 * width * (1 - FIT), "a dash is three widths long");
    });
});
