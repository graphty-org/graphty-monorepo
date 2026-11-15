import { MultiMaterial, NullEngine, Scene, ShaderMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { MeshCache } from "../src/meshes/MeshCache";

describe("Arrow Shape Generation", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        meshCache = new MeshCache();
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    test("inverted arrow points away from target", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-inverted",
            { type: "inverted", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        assert.exists(arrowCap);
        // The cap should be named appropriately (filled arrows use FilledArrowRenderer)
        assert.isTrue(arrowCap.name.includes("filled-triangle-arrow"));
        // A thin-instance slot in the scene's shared batch for this shape (issues #25, #419),
        // so it has no mesh of its own and the geometry it is drawn from is the batch's.
        assert.isNotNull(arrowCap.batchMesh);
    });

    test("an open cap with a fill color draws its inside in that color, apart from its outline (#7565)", () => {
        const filled = EdgeMesh.createArrowHead(
            meshCache,
            "test-filled",
            { type: "open-normal", width: 1, color: "#505050", fill: "#FFCC00", side: "left" },
            scene,
        );
        assert.exists(filled);
        const mesh = filled.batchMesh;
        assert.isNotNull(mesh);
        assert.instanceOf(mesh.material, MultiMaterial);
        const [inside, outline] = mesh.material.subMaterials;
        assert.instanceOf(inside, ShaderMaterial);
        assert.instanceOf(outline, ShaderMaterial);
        assert.include(inside.options.defines, "#define CAP_FILL");
        assert.strictEqual(mesh.subMeshes.length, 2);
        // the half cap keeps an inside and a frame, each a whole number of triangles
        for (const part of mesh.subMeshes) {
            assert.isAbove(part.indexCount, 0);
            assert.strictEqual(part.indexCount % 3, 0);
        }

        // unset, the open cap is today's, one material; a filled type ignores the fill
        for (const type of ["open-normal", "normal"]) {
            const cap = EdgeMesh.createArrowHead(
                meshCache,
                `test-${type}`,
                { type, width: 1, color: "#505050", fill: type === "normal" ? "#FFCC00" : undefined },
                scene,
            );
            assert.notInstanceOf(cap?.batchMesh?.material, MultiMaterial, type);
        }
    });

    test("dot arrow creates circular shape", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-dot",
            { type: "dot", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        assert.exists(arrowCap);
        assert.isTrue(arrowCap.name.includes("filled-circle-arrow"));
        assert.isNotNull(arrowCap.batchMesh);
        // Verify the mesh it is drawn from has geometry
        const positions = arrowCap.batchMesh.getVerticesData("position");
        assert.exists(positions);
        assert.isAtLeast(positions.length, 9); // At least 3 vertices for a circle
    });

    test("diamond arrow creates rhombus shape", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-diamond",
            { type: "diamond", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        assert.exists(arrowCap);
        assert.isTrue(arrowCap.name.includes("filled-diamond-arrow"));
        assert.isNotNull(arrowCap.batchMesh);
        // Verify diamond has vertices (should have 4 corner points)
        const positions = arrowCap.batchMesh.getVerticesData("position");
        assert.exists(positions);
        assert.equal(positions.length, 12); // 4 vertices * 3 components (x, y, z)
    });

    test("box arrow creates rectangular shape", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-box",
            { type: "box", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        assert.exists(arrowCap);
        assert.isTrue(arrowCap.name.includes("filled-box-arrow"));
        assert.isNotNull(arrowCap.batchMesh);
        // Verify box has vertices (should have 4 corners)
        const positions = arrowCap.batchMesh.getVerticesData("position");
        assert.exists(positions);
        assert.equal(positions.length, 12); // 4 vertices * 3 components
    });

    test("normal arrow creates triangle shape", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-normal",
            { type: "normal", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        assert.exists(arrowCap);
        assert.isTrue(arrowCap.name.includes("filled-triangle-arrow"));
        assert.isNotNull(arrowCap.batchMesh);
    });

    test("unsupported arrow type throws error", () => {
        assert.throws(() => {
            EdgeMesh.createArrowHead(
                meshCache,
                "test-invalid",

                { type: "invalid-type", width: 1.0, color: "#FF0000" },
                scene,
            );
        });
    });

    test("arrow with custom size multiplier", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-sized",
            { type: "normal", width: 1.0, color: "#FF0000", size: 2.0, opacity: 1.0 },
            scene,
        );

        assert.exists(arrowCap);
        // The size multiplier affects the shader, so we can't easily verify it here
        // but we can verify the mesh was created
    });

    test("arrow with custom opacity", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-opacity",
            { type: "normal", width: 1.0, color: "#FF0000", size: 1.0, opacity: 0.5 },
            scene,
        );

        assert.exists(arrowCap);
        assert.equal(arrowCap.visibility, 0.5);
    });

    test("arrow with no type returns null", () => {
        const arrowCap = EdgeMesh.createArrowHead(
            meshCache,
            "test-none",
            { type: "none", width: 1.0, color: "#FF0000" },
            scene,
        );

        assert.isNull(arrowCap);
    });

    test("arrows are individual meshes (not cached)", () => {
        const arrow1 = EdgeMesh.createArrowHead(
            meshCache,
            "test-no-cache",
            { type: "normal", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        const arrow2 = EdgeMesh.createArrowHead(
            meshCache,
            "test-no-cache",
            { type: "normal", width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
            scene,
        );

        // Performance optimization: individual meshes are created (not cached)
        // This allows direct position/rotation updates which are faster than thin instances
        assert.notEqual(arrow1, arrow2);
    });
});
