/**
 * A file's annotation arrow that leaves a text note starts at the edge of the note's measured box, and one that ends
 * at a node stops at the node's outline as it is drawn, as Cytoscape desktop draws them (issue #5231).
 */
import { NullEngine, Scene } from "@babylonjs/core";
import type { ArrowAnnotation, TextAnnotation } from "@graphty/graph-io/styles";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { AnnotationMeshes, type AnnotationMeshMetadata } from "../../src/meshes/AnnotationMeshes";

const TEXT: TextAnnotation = {
    kind: "text",
    id: "note",
    layer: "foreground",
    z: 0,
    rotation: 0,
    text: "GCN3 downregulated",
    at: { x: 0, y: 0 },
    anchor: "top-left",
    fontSize: 10,
    fontFamily: "Arial",
    bold: false,
    italic: false,
    color: "#000000",
    opacity: 1,
};

const ARROW: ArrowAnnotation = {
    kind: "arrow",
    id: "arrow",
    layer: "foreground",
    z: 1,
    // the reader's guess: the arrow's saved corner, inside the note
    from: { x: 5, y: -5 },
    to: { x: 200, y: -5 },
    color: "#000000",
    opacity: 1,
    width: 1,
    sourceArrow: "none",
    targetArrow: "none",
    sourceSize: 1,
    targetSize: 1,
    sourceColor: "#000000",
    targetColor: "#000000",
    sourceText: "note",
    toNode: true,
};

/** A node drawn at the arrow's end: 10 across with a border of 1. */
const node = { half: 5, at: { x: 200, y: -5 } };
const NODE = {
    getPosition: () => node.at,
    get drawnHalfExtents() {
        return { x: node.half, y: node.half };
    },
    borderReach: 1,
};

let engine: NullEngine;
let scene: Scene;
let meshes: AnnotationMeshes;

/**
 * The drawn arrow's box, in scene units.
 * @returns The box.
 */
function arrowBox(): AnnotationMeshMetadata["annotation"]["box"] {
    const mesh = scene.meshes.find((m) => (m.metadata as AnnotationMeshMetadata | null)?.annotation.kind === "arrow");
    assert.isDefined(mesh, "the arrow is drawn");
    return (mesh.metadata as AnnotationMeshMetadata).annotation.box;
}

/**
 * The note's width as the canvas measures it.
 * @returns The width.
 */
function noteWidth(): number {
    const ctx = document.createElement("canvas").getContext("2d");
    assert.isNotNull(ctx);
    ctx.font = "10px Arial, sans-serif";
    return ctx.measureText(TEXT.text).width;
}

describe("annotation arrow ends", () => {
    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        node.half = 5;
        node.at = { x: 200, y: -5 };
        meshes = new AnnotationMeshes(scene, undefined, () => [NODE]);
    });

    afterEach(() => {
        meshes.dispose();
        scene.dispose();
        engine.dispose();
    });

    it("starts at the edge of the note's measured box and stops at the node's outline", () => {
        meshes.update({ scale: 1, annotations: [TEXT, ARROW] });
        const box = arrowBox();
        // the note's box is 0..width across; the line toward the node leaves it at its right side
        assert.closeTo(box.x0, noteWidth(), 1e-6);
        // the node is 5 to its outline and 1 more to its border's outside
        assert.closeTo(box.x1, 194, 1e-6);
    });

    it("follows the node as it is drawn: a grown node, then no node at the end", () => {
        meshes.update({ scale: 2, annotations: [TEXT, ARROW] });
        node.at = { x: 400, y: -10 };
        // 5 file units at a scale of 2
        node.half = 10;
        meshes.refit();
        assert.closeTo(arrowBox().x1, (200 - 5.5) * 2, 1e-6);

        node.half = 20;
        meshes.refit();
        assert.closeTo(arrowBox().x1, (200 - 10.5) * 2, 1e-6);
        assert.lengthOf(
            scene.meshes.filter((m) => (m.metadata as AnnotationMeshMetadata | null)?.annotation.kind === "arrow"),
            1,
            "the arrow is redrawn, not drawn twice",
        );

        node.at = { x: 0, y: 0 };
        meshes.refit();
        assert.closeTo(arrowBox().x1, 400, 1e-6);
    });
});
