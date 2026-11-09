/**
 * A file's text placed against a side of the drawn graph rather than at a point (a DOT graph's own label in a file that
 * stores no layout, issue #706) sits just outside the box the drawn nodes cover, and follows that box as the nodes move.
 */
import { NullEngine, Scene } from "@babylonjs/core";
import type { TextAnnotation } from "@graphty/graph-io/styles";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { AnnotationMeshes, type AnnotationMeshMetadata } from "../../src/meshes/AnnotationMeshes";

/** A title in a region 100 by 30 file units, centered above the drawing. */
const TITLE: TextAnnotation = {
    kind: "text",
    id: "graph-label-0-0",
    layer: "foreground",
    z: 0,
    rotation: 0,
    text: "Title",
    at: { x: 0, y: 0 },
    anchor: "center",
    fontSize: 14,
    fontFamily: "Arial",
    bold: false,
    italic: false,
    color: "#000000",
    opacity: 1,
    beside: { side: "top", align: "center", width: 100, height: 30 },
};

/** A drawn node: its center and half its size, in scene units. */
interface TestNode {
    at: { x: number; y: number };
    half: number;
}

let engine: NullEngine;
let scene: Scene;
let meshes: AnnotationMeshes;
let nodes: TestNode[];

/**
 * The drawn title's box, in scene units.
 * @returns The box.
 */
function titleBox(): AnnotationMeshMetadata["annotation"]["box"] {
    const mesh = scene.meshes.find((m) => (m.metadata as AnnotationMeshMetadata | null)?.annotation.kind === "text");
    assert.isDefined(mesh, "the title is drawn");
    return (mesh.metadata as AnnotationMeshMetadata).annotation.box;
}

/**
 * The middle of a box.
 * @param b - The box.
 * @returns Its center.
 */
function middle(b: AnnotationMeshMetadata["annotation"]["box"]): { x: number; y: number } {
    return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
}

describe("a text placed beside the drawing", () => {
    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        nodes = [
            { at: { x: -40, y: 10 }, half: 5 },
            { at: { x: 60, y: 50 }, half: 10 },
        ];
        meshes = new AnnotationMeshes(scene, undefined, () =>
            nodes.map((n) => ({
                getPosition: () => n.at,
                drawnHalfExtents: { x: n.half, y: n.half },
                borderReach: 0,
            })),
        );
    });

    afterEach(() => {
        meshes.dispose();
        scene.dispose();
        engine.dispose();
    });

    it("sits centered just above the box the nodes cover, and follows it", () => {
        meshes.update({ scale: 2, annotations: [TITLE] });
        meshes.refit();
        // the nodes cover x -45..70 and y 5..60; the region is 60 scene units tall at a scale of 2
        const c = middle(titleBox());
        assert.closeTo(c.x, 12.5, 1e-6);
        assert.closeTo(c.y, 60 + 30, 1e-6);

        nodes[1].at = { x: 160, y: 150 };
        meshes.refit();
        const moved = middle(titleBox());
        assert.closeTo(moved.x, 62.5, 1e-6);
        assert.closeTo(moved.y, 160 + 30, 1e-6);
        const mesh = scene.meshes.find(
            (m) => (m.metadata as AnnotationMeshMetadata | null)?.annotation.kind === "text",
        );
        assert.closeTo(mesh?.position.y ?? Number.NaN, moved.y, 1e-6, "the mesh moves with its box");
    });

    it("goes against the left end of the bottom side", () => {
        meshes.update({
            scale: 1,
            annotations: [{ ...TITLE, beside: { side: "bottom", align: "left", width: 100, height: 30 } }],
        });
        meshes.refit();
        const c = middle(titleBox());
        assert.closeTo(c.x, -45 + 50, 1e-6);
        assert.closeTo(c.y, 5 - 15, 1e-6);
    });
});
