import { ArcRotateCamera, Engine, Scene, ShaderMaterial, StandardMaterial, Vector3 } from "@babylonjs/core";
import { assert, test } from "vitest";

import { PatternedLineRenderer } from "../../src/meshes/PatternedLineRenderer";

// Setup helper
function createTestScene(): { scene: Scene; engine: Engine; cleanup: () => void } {
    const canvas = document.createElement("canvas");
    const engine = new Engine(canvas, false);
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
    scene.activeCamera = camera;

    const cleanup = (): void => {
        scene.dispose();
        engine.dispose();
    };

    return { scene, engine, cleanup };
}

test("a 2D pattern element is a slot drawn with a StandardMaterial, lying in the XY plane", () => {
    const { scene, cleanup } = createTestScene();

    try {
        const element = PatternedLineRenderer.createPatternElement(
            "diamond",
            0.1,
            "#ff0000",
            1.0,
            scene,
            undefined,
            true,
        );
        element.place(new Vector3(1, 2, 0), Vector3.Right());

        assert(element.batchMesh?.material instanceof StandardMaterial, "Expected StandardMaterial for 2D mode");
        assert.strictEqual(element.batchMesh.metadata?.is2D, true, "Expected is2D metadata to be true");

        // The shape is built in the XZ plane; its slot turns it a quarter turn about X into XY, as
        // the per-element mesh's own rotation did.
        const up = Vector3.TransformNormal(new Vector3(0, 0, 1), element.transform).normalize();
        assert.closeTo(Math.abs(up.y), 1, 1e-6, "the shape's Z axis lies along world Y");
        assert.isTrue(element.position.equalsWithEpsilon(new Vector3(1, 2, 0), 1e-6), "placed where asked");
    } finally {
        cleanup();
    }
});

test("a 3D pattern element is a slot drawn by the billboard shader", () => {
    const { scene, cleanup } = createTestScene();

    try {
        const element = PatternedLineRenderer.createPatternElement(
            "diamond",
            0.1,
            "#ff0000",
            1.0,
            scene,
            undefined,
            false,
        );

        assert(element.batchMesh?.material instanceof ShaderMaterial, "Expected ShaderMaterial for 3D mode");
        assert.strictEqual(element.batchMesh.metadata?.is2D, undefined, "Expected no is2D metadata in 3D mode");
        assert.isNotNull(element.drawnAppearance, "direction, size and colour are the slot's own");
    } finally {
        cleanup();
    }
});

test("a pattern element is drawn in 3D by default", () => {
    const { scene, cleanup } = createTestScene();

    try {
        const element = PatternedLineRenderer.createPatternElement("diamond", 0.1, "#ff0000", 1.0, scene);

        assert(element.batchMesh?.material instanceof ShaderMaterial, "Expected ShaderMaterial for default (3D) mode");
    } finally {
        cleanup();
    }
});

test("every discrete pattern builds a 2D element", () => {
    const { scene, cleanup } = createTestScene();

    try {
        for (const pattern of ["dot", "star", "diamond", "box", "dash"] as const) {
            const element = PatternedLineRenderer.createPatternElement(
                pattern,
                0.1,
                "#ff0000",
                1.0,
                scene,
                undefined,
                true,
            );

            assert(element.batchMesh?.material instanceof StandardMaterial, `Expected StandardMaterial for ${pattern}`);
            assert.strictEqual(element.batchMesh.metadata?.is2D, true, `Expected is2D metadata for ${pattern}`);
        }
    } finally {
        cleanup();
    }
});

test("a shape override picks the alternating pattern's other shape", () => {
    const { scene, cleanup } = createTestScene();

    try {
        const dash = PatternedLineRenderer.createPatternElement("dash-dot", 0.1, "#ff0000", 1.0, scene, "box", true);
        const dot = PatternedLineRenderer.createPatternElement("dash-dot", 0.1, "#ff0000", 1.0, scene, "circle", true);

        assert.notStrictEqual(dash.batchMesh, dot.batchMesh, "the two shapes of a dash-dot line are two batches");
        assert.strictEqual(dot.name, "pattern-dash-dot-circle");
    } finally {
        cleanup();
    }
});

// Issue #444: every element used to be a mesh with a material of its own. Elements of one shape
// now share one batch -- in 3D whatever their colour or width, since the billboard shader reads
// both per slot; in 2D the colour is the material's, so it splits the batch.
test("elements of one shape share one batch, and 2D splits it only by what its material holds", () => {
    const { scene, cleanup } = createTestScene();

    try {
        const meshesBefore = scene.meshes.length;
        const red = PatternedLineRenderer.createPatternElement("dot", 0.1, "#ff0000", 1.0, scene);
        const blue = PatternedLineRenderer.createPatternElement("dot", 0.3, "#0000ff", 1.0, scene);
        assert.strictEqual(red.batchMesh, blue.batchMesh, "3D: one batch for every colour and width");
        assert.strictEqual(scene.meshes.length, meshesBefore + 1, "and it is one scene object");

        const red2D = PatternedLineRenderer.createPatternElement("dot", 0.1, "#ff0000", 1.0, scene, undefined, true);
        const wide2D = PatternedLineRenderer.createPatternElement("dot", 0.3, "#ff0000", 1.0, scene, undefined, true);
        const blue2D = PatternedLineRenderer.createPatternElement("dot", 0.1, "#0000ff", 1.0, scene, undefined, true);
        assert.strictEqual(red2D.batchMesh, wide2D.batchMesh, "2D: the width is the slot's scale");
        assert.notStrictEqual(red2D.batchMesh, blue2D.batchMesh, "2D: the colour is the material's");

        for (const element of [red, blue, red2D, wide2D, blue2D]) {
            element.dispose();
        }

        assert.strictEqual(scene.meshes.length, meshesBefore, "the last element takes its batch with it");
    } finally {
        cleanup();
    }
});

test("only the last segment of a connected pattern is clipped, however its length changes", () => {
    const { scene, cleanup } = createTestScene();

    try {
        for (const pattern of ["zigzag", "sinewave"] as const) {
            const line = PatternedLineRenderer.create(
                pattern,
                Vector3.Zero(),
                new Vector3(1, 0, 0),
                0.1,
                "#ff0000",
                1.0,
                scene,
                false,
            );

            // Grow and shrink through lengths whose remainders clip the last segment, so a segment
            // clipped while it was last is no longer last on the next length.
            for (const length of [1.1, 3.3, 7.4, 2.2, 0.9, 5.05]) {
                line.update(Vector3.Zero(), new Vector3(length, 0, 0));

                const clips = line.elements.map((element) => element.drawnAppearance?.clip);
                assert.isAbove(clips.length, 1, `${pattern} at ${String(length)} draws several segments`);
                clips.slice(0, -1).forEach((clip, i) => {
                    assert.strictEqual(clip, -1, `${pattern} at ${String(length)}: segment ${String(i)} is whole`);
                });
            }

            line.dispose();
        }
    } finally {
        cleanup();
    }
});
