/**
 * @file Arrow caps are drawn in bulk: one mesh per appearance, one thin instance per edge end
 * (issues #25 and #419).
 *
 * Every cap used to be its own Babylon `Mesh` with its own `ShaderMaterial`, so N capped edges
 * cost N meshes, N materials and N draw calls -- and, because building a material walks every
 * mesh in the scene (issue #27), loading N caps cost O(N^2). Batching them as `InstancedMesh`es
 * fixed the draw calls and the materials and left a scene object per cap. Now each scene keeps
 * one mesh per appearance and a cap is a THIN instance of it: sixteen floats in that mesh's
 * matrix buffer, plus the direction, size and colour the billboard shader reads per instance.
 * Nothing per cap is added to the scene at all.
 */
import {
    Camera,
    Color3,
    FreeCamera,
    InstancedMesh,
    Mesh,
    NullEngine,
    Quaternion,
    Scene,
    ShaderMaterial,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { ArrowCap } from "../../src/meshes/ArrowCapBatch";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";

let scene: Scene;

function head(type: string, extra: { color?: string; size?: number; opacity?: number } = {}): ArrowCap {
    const cap = EdgeMesh.createArrowHead(
        new MeshCache(),
        "arrow",
        { type, width: 1, color: extra.color ?? "#ff0000", size: extra.size, opacity: extra.opacity },
        scene,
    );
    assert.isNotNull(cap, `a "${type}" arrowhead was not drawn at all`);
    return cap;
}

/** The meshes arrow caps are drawn FROM: the meshes of the scene's batches. */
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
        const heads: ArrowCap[] = [];
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
        assert.strictEqual(heads[0].batchMesh, heads[99].batchMesh);
    });

    test("a hundred heads add nothing to the scene but their one batch", () => {
        const before = scene.meshes.length;

        for (let i = 0; i < 100; i++) {
            head("normal", { size: 1 + i / 100 });
        }

        // THE POINT OF THE WHOLE EXERCISE. As instances the hundred heads were a hundred scene
        // objects; as thin instances they are rows in one mesh's buffers, so the scene grows by
        // the batch and by nothing else however many edges are capped.
        assert.equal(scene.meshes.length - before, 1);
    });

    test("each head carries its own direction, size and colour as instance data", () => {
        const red = head("normal", { color: "#ff0000", size: 2 });
        const blue = head("normal", { color: "#0000ff", size: 0.5 });

        red.place(Vector3.Zero(), new Vector3(0, 1, 0));
        blue.place(Vector3.Zero(), new Vector3(1, 0, 0));

        const drawnRed = red.drawnAppearance;
        const drawnBlue = blue.drawnAppearance;
        assert.isNotNull(drawnRed);
        assert.isNotNull(drawnBlue);

        assert.deepEqual(drawnRed.direction.asArray(), [0, 1, 0]);
        assert.deepEqual(drawnBlue.direction.asArray(), [1, 0, 0]);
        assert.equal(drawnRed.size, EdgeMesh.calculateArrowLength() * 2);
        assert.equal(drawnBlue.size, EdgeMesh.calculateArrowLength() * 0.5);
        assert.isTrue(drawnRed.colour.equals(new Color3(1, 0, 0)));
        assert.isTrue(drawnBlue.colour.equals(new Color3(0, 0, 1)));
    });

    test("a head keeps its own slot when the batch outgrows its first buffers", () => {
        // The buffers start at 32 slots and double. A head taken before the growth has to still
        // read back what was written into it, or an edge silently loses its cap on the frame a
        // graph crosses a power of two.
        const first = head("normal", { color: "#ff0000", size: 2 });
        first.place(new Vector3(1, 2, 3), new Vector3(0, 0, 1));

        for (let i = 0; i < 200; i++) {
            head("normal", { size: 1 });
        }

        assert.isTrue(first.position.equalsWithEpsilon(new Vector3(1, 2, 3), 1e-6));
        assert.deepEqual(first.drawnAppearance?.direction.asArray(), [0, 0, 1]);
        assert.equal(first.drawnAppearance?.size, EdgeMesh.calculateArrowLength() * 2);
    });

    test("a head the visibility mask hid draws again when it is placed again", () => {
        // Hiding collapses the slot's matrix to zeros, and a zero in its bottom right would drop
        // the batch mesh's own transform out of the shader's `world * slot` -- so placing the cap
        // again has to restore the whole matrix, not only the three numbers that moved.
        const cap = head("normal");
        cap.place(new Vector3(4, 5, 6), Vector3.Right());
        cap.setDrawn(false);

        assert.isTrue(cap.position.equalsWithEpsilon(Vector3.Zero(), 1e-9), "hiding did not collapse the slot");

        cap.place(new Vector3(4, 5, 6), Vector3.Right());

        assert.isTrue(cap.position.equalsWithEpsilon(new Vector3(4, 5, 6), 1e-6));
        assert.closeTo(cap.transform.m[15], 1, 1e-9, "the slot's matrix is degenerate");
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
        const material = head("normal").batchMesh?.material as ShaderMaterial;

        assert.isTrue(material.blockDirtyMechanism);
    });

    test("no mesh in the scene answers to an arrow's name; the caps carry it", () => {
        const first = head("normal");
        head("normal");

        // A cap has no mesh of its own, so the scene walk that used to count arrowheads by name
        // finds nothing -- deliberately, because the one mesh there is would otherwise be counted
        // as an arrowhead that no edge is drawing. The shape's name moved onto the cap, which is
        // where `Edge.drawnCaps` reads it and where the story assertions read it from.
        assert.lengthOf(
            scene.meshes.filter((mesh) => mesh.name.includes("arrow")),
            0,
        );
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
        assert.isFalse(third.isDisposed());
        assert.lengthOf(arrowSources(), 1);
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

        assert.isNotNull(there);
        assert.notStrictEqual(here.batchMesh, there.batchMesh);
        assert.strictEqual(there.batchMesh?.getScene(), otherScene);
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

        assert.strictEqual(a.batchMesh, b.batchMesh);
        assert.notStrictEqual(a.batchMesh, c.batchMesh);
        assert.instanceOf(a.batchMesh?.material, StandardMaterial);
        assert.isTrue(a.is2D);
        assert.equal(b.size, EdgeMesh.calculateArrowLength() * 3);

        // The quarter turn into the XY plane is composed into the slot when the cap is placed,
        // where it used to be a property of the cap's own mesh.
        a.place(Vector3.Zero(), Vector3.Right());
        const turn = new Quaternion();
        a.transform.decompose(undefined, turn, undefined);
        assert.closeTo(turn.toEulerAngles().x, Math.PI / 2, 1e-6);
    });

    test("3D sphere-dots of one colour share a mesh; size is the slot's own scale", () => {
        const small = head("sphere-dot", { color: "#ff00ff", size: 1 });
        const large = head("sphere-dot", { color: "#ff00ff", size: 4 });

        assert.strictEqual(small.batchMesh, large.batchMesh);
        assert.instanceOf(small.batchMesh?.material, StandardMaterial);
        assert.closeTo(large.size / small.size, 4, 1e-9);

        // And the scale really reaches the slot, rather than only being remembered on the cap.
        large.place(Vector3.Zero(), Vector3.Right());
        const scaling = new Vector3();
        large.transform.decompose(scaling, undefined, undefined);
        assert.closeTo(scaling.x, large.size, 1e-6);
    });
});
