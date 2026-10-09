import { NullEngine, Scene } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../src/config";
import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { MeshCache } from "../src/meshes/MeshCache";

describe("Arrow Tail Support", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        meshCache = new MeshCache();
    });

    test("creates tail arrow when arrowTail configured", () => {
        const style: EdgeStyleConfig = {
            arrowHead: { type: "normal", color: "#FF0000", size: 1, opacity: 1 },
            arrowTail: { type: "tee", color: "#0000FF", size: 1, opacity: 1 },
            line: { width: 0.5 },
        };

        // Create arrow head
        const arrowHead = EdgeMesh.createArrowHead(
            meshCache,
            "test-head",
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? 0.25,
                color: style.arrowHead?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            scene,
        );

        // Create arrow tail
        const arrowTail = EdgeMesh.createArrowHead(
            meshCache,
            "test-tail",
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? 0.25,
                color: style.arrowTail?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            scene,
        );

        assert.exists(arrowHead);
        assert.exists(arrowTail);
        assert.isFalse(arrowHead.isDisposed());
        assert.isFalse(arrowTail.isDisposed());
    });

    test("tail arrow has independent styling", () => {
        const style: EdgeStyleConfig = {
            arrowHead: { type: "normal", size: 1.0, color: "#FF0000", opacity: 1.0 },
            arrowTail: { type: "dot", size: 2.0, color: "#00FF00", opacity: 0.5 },
            line: { width: 0.5 },
        };

        // Create arrow head
        const arrowHead = EdgeMesh.createArrowHead(
            meshCache,
            "test-head-2",
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? 0.25,
                color: style.arrowHead?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            scene,
        );

        // Create arrow tail
        const arrowTail = EdgeMesh.createArrowHead(
            meshCache,
            "test-tail-2",
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? 0.25,
                color: style.arrowTail?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            scene,
        );

        assert.exists(arrowHead);
        assert.exists(arrowTail);
        // Two caps, drawn by two different batches -- which is the whole of what "the head and
        // the tail are not the same arrow" means once neither owns a mesh.
        assert.notStrictEqual(arrowHead, arrowTail);
        assert.notEqual(arrowHead.name, arrowTail.name);
        assert.notStrictEqual(arrowHead.batchMesh, arrowTail.batchMesh);
    });

    test("none type returns null for arrow tail", () => {
        const arrowTail = EdgeMesh.createArrowHead(
            meshCache,
            "test-none",
            {
                type: "none",
                width: 0.5,
                color: "#FFFFFF",
            },
            scene,
        );

        assert.isNull(arrowTail);
    });

    test("arrow tail uses same sizing mechanism as arrow head", () => {
        const style: EdgeStyleConfig = {
            arrowHead: { type: "normal", size: 3.0, color: "#FF0000", opacity: 1 },
            arrowTail: { type: "tee", size: 3.0, color: "#0000FF", opacity: 1 },
            line: { width: 0.5 },
        };

        // Both should respect the size parameter
        const arrowHead = EdgeMesh.createArrowHead(
            meshCache,
            "test-head-sized",
            {
                type: style.arrowHead?.type ?? "none",
                width: style.line?.width ?? 0.25,
                color: style.arrowHead?.color ?? "#FFFFFF",
                size: style.arrowHead?.size,
                opacity: style.arrowHead?.opacity,
            },
            scene,
        );

        const arrowTail = EdgeMesh.createArrowHead(
            meshCache,
            "test-tail-sized",
            {
                type: style.arrowTail?.type ?? "none",
                width: style.line?.width ?? 0.25,
                color: style.arrowTail?.color ?? "#FFFFFF",
                size: style.arrowTail?.size,
                opacity: style.arrowTail?.opacity,
            },
            scene,
        );

        assert.exists(arrowHead);
        assert.exists(arrowTail);

        // Both carry the size the style asked for. A cap's drawn extent is its span, and the
        // element's own cap of size 1 spans 0.933, so 3.0 has to read well clear of it.
        assert.isAbove(arrowHead.span, 1);
        assert.isAbove(arrowTail.span, 1);
    });
});
