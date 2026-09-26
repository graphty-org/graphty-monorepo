/**
 * @file Arrowheads are drawn in bulk: one hidden mesh per shape, one instance per edge (issue #25).
 *
 * Every arrowhead used to be its own Babylon `Mesh` with its own `ShaderMaterial`, so N
 * arrowheaded edges cost N meshes, N materials and N draw calls -- and, because building a
 * material walks every mesh in the scene (issue #27), loading N arrows cost O(N^2). Now each
 * scene keeps one hidden source mesh per arrow shape (and per material the shape needs), and an
 * edge's arrowhead is an instance of it. The per-edge direction, size and colour of a 3D head
 * are instance attributes, so a whole graph of heads is one draw call per shape.
 */
import {
    Camera,
    Color3,
    FreeCamera,
    InstancedMesh,
    Mesh,
    NullEngine,
    Scene,
    ShaderMaterial,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { FilledArrowRenderer } from "../../src/meshes/FilledArrowRenderer";
import { MeshCache } from "../../src/meshes/MeshCache";

let scene: Scene;

function head(type: string, extra: { color?: string; size?: number; opacity?: number } = {}): InstancedMesh {
    const mesh = EdgeMesh.createArrowHead(
        new MeshCache(),
        "arrow",
        { type, width: 1, color: extra.color ?? "#ff0000", size: extra.size, opacity: extra.opacity },
        scene,
    );
    assert.instanceOf(mesh, InstancedMesh, `a "${type}" arrowhead is not an instance of a shared mesh`);
    return mesh;
}

/** The meshes arrowheads are drawn FROM: the hidden source meshes of the scene's batches. */
function arrowSources(): Mesh[] {
    return scene.meshes.filter(
        (mesh): mesh is Mesh =>
            mesh instanceof Mesh && !(mesh instanceof InstancedMesh) && mesh.name.startsWith("cap-batch|"),
    );
}

beforeEach(() => {
    scene = new Scene(new NullEngine());
});

afterEach(() => {
    scene.getEngine().dispose();
});

describe("3D arrowheads share one mesh and one material per shape", () => {
    test("a hundred heads in a hundred colours and sizes are one source mesh and one material", () => {
        const heads: InstancedMesh[] = [];
        for (let i = 0; i < 100; i++) {
            const channel = (i * 2).toString(16).padStart(2, "0");
            heads.push(head("normal", { color: `#${channel}0000`, size: 1 + i / 100 }));
        }

        assert.lengthOf(arrowSources(), 1, "each head built its own mesh");
        assert.lengthOf(
            scene.materials.filter((material) => material instanceof ShaderMaterial),
            1,
            "each head built its own material",
        );
        assert.strictEqual(heads[0].sourceMesh, heads[99].sourceMesh);
    });

    test("each head carries its own direction, size and colour as instance data", () => {
        const red = head("normal", { color: "#ff0000", size: 2 });
        const blue = head("normal", { color: "#0000ff", size: 0.5 });

        FilledArrowRenderer.setLineDirection(red, new Vector3(0, 1, 0));

        assert.deepEqual((red.instancedBuffers.arrowDirection as Vector3).asArray(), [0, 1, 0]);
        assert.deepEqual((blue.instancedBuffers.arrowDirection as Vector3).asArray(), [1, 0, 0]);
        assert.equal(red.instancedBuffers.arrowSize, EdgeMesh.calculateArrowLength() * 2);
        assert.equal(blue.instancedBuffers.arrowSize, EdgeMesh.calculateArrowLength() * 0.5);
        assert.isTrue((red.instancedBuffers.arrowColor as Color3).equals(new Color3(1, 0, 0)));
        assert.isTrue((blue.instancedBuffers.arrowColor as Color3).equals(new Color3(0, 0, 1)));
    });

    test("different shapes, and translucent heads, get their own batch", () => {
        head("normal");
        head("normal");
        head("diamond");
        head("normal", { opacity: 0.5 });
        head("normal", { opacity: 0.5 });

        assert.lengthOf(arrowSources(), 3);
    });

    test("the shared arrowhead material skips Babylon's scene-wide dirty walk (issue #27)", () => {
        const material = head("normal").material as ShaderMaterial;

        assert.isTrue(material.blockDirtyMechanism);
    });

    test("only the heads, never their hidden source, answer to an arrow's name", () => {
        const first = head("normal");
        head("normal");

        const named = scene.meshes.filter((mesh) => mesh.name.includes("arrow"));
        assert.lengthOf(named, 2);
        assert.isTrue(named.every((mesh) => mesh instanceof InstancedMesh));
        assert.equal(first.name, "filled-triangle-arrow");
    });

    test("disposing the last head frees the shared mesh and its material", () => {
        const first = head("normal");
        const second = head("normal");

        first.dispose();
        assert.lengthOf(arrowSources(), 1, "the batch went while a head still used it");

        second.dispose();
        assert.lengthOf(arrowSources(), 0, "the batch outlived its last head");
        assert.lengthOf(
            scene.materials.filter((material) => material instanceof ShaderMaterial),
            0,
        );

        // And a head built afterwards gets a working batch again.
        const third = head("normal");
        assert.isFalse(third.sourceMesh.isDisposed());
    });

    test("two scenes never share a batch", () => {
        const here = head("normal");
        const otherScene = new Scene(scene.getEngine());
        const there = EdgeMesh.createArrowHead(
            new MeshCache(),
            "arrow",
            { type: "normal", width: 1, color: "#ff0000" },
            otherScene,
        );

        assert.instanceOf(there, InstancedMesh);
        assert.notStrictEqual(here.sourceMesh, there.sourceMesh);
        assert.strictEqual(there.getScene(), otherScene);
    });
});

describe("2D and sphere-dot arrowheads are batched by shape and colour", () => {
    test("2D heads of one shape and colour share a mesh and a StandardMaterial", () => {
        scene.metadata = { twoD: true };
        // EdgeMesh.is2DMode needs an orthographic camera as well as the twoD flag.
        const ortho = new FreeCamera("ortho", new Vector3(0, 0, -10), scene);
        ortho.mode = Camera.ORTHOGRAPHIC_CAMERA;
        scene.activeCamera = ortho;

        const a = head("diamond", { color: "#00ff00", size: 1 });
        const b = head("diamond", { color: "#00ff00", size: 3 });
        const c = head("diamond", { color: "#0000ff" });

        assert.strictEqual(a.sourceMesh, b.sourceMesh);
        assert.notStrictEqual(a.sourceMesh, c.sourceMesh);
        assert.instanceOf(a.material, StandardMaterial);
        assert.strictEqual(a.metadata?.is2D, true);
        assert.equal(a.rotation.x, Math.PI / 2);
        assert.equal(b.scaling.x, EdgeMesh.calculateArrowLength() * 3);
    });

    test("3D sphere-dots of one colour share a mesh; size is the instance's scale", () => {
        const small = head("sphere-dot", { color: "#ff00ff", size: 1 });
        const large = head("sphere-dot", { color: "#ff00ff", size: 4 });

        assert.strictEqual(small.sourceMesh, large.sourceMesh);
        assert.instanceOf(small.material, StandardMaterial);
        assert.closeTo(large.scaling.x / small.scaling.x, 4, 1e-9);
    });
});
