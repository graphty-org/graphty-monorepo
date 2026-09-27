/**
 * @file Per-frame shader uniforms belong to the scene that draws them (issue #45).
 *
 * The line, arrowhead and pattern renderers push a per-frame uniform into their shader
 * materials: the render resolution for solid lines, the camera position for arrowheads and
 * pattern elements. All three used to keep those materials in one static set shared by every
 * `<graphty-element>` on the page, with the per-frame observer registered once per page (arrows,
 * patterns) or once per scene switch (lines). With two elements on a page, the second element's
 * arrowheads billboarded towards the FIRST element's camera; an element created after the first
 * was disposed never received a camera position at all; and each scene's observer walked every
 * other scene's materials.
 *
 * Two NullEngine scenes of different sizes and with different cameras stand in for two elements.
 */
import { FreeCamera, NullEngine, Scene, type ShaderMaterial, Vector2, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { FilledArrowRenderer } from "../../src/meshes/FilledArrowRenderer";
import { MeshCache } from "../../src/meshes/MeshCache";
import type { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { PatternedLineRenderer } from "../../src/meshes/PatternedLineRenderer";

/** A ShaderMaterial's uniform caches, which is where `setVector2`/`setVector3` land. */
interface UniformCache {
    _vectors2: Record<string, Vector2 | undefined>;
    _vectors3: Record<string, Vector3 | undefined>;
}

/** Everything one stand-in element drew, so the tests can read its materials. */
interface Element {
    scene: Scene;
    line: ShaderMaterial;
    arrow: ShaderMaterial;
    pattern: ShaderMaterial;
    patternLine: PatternedLineMesh;
    dispose: () => void;
}

const scenes: Scene[] = [];

/**
 * Build a scene of the given size, looking from the given place, with one solid line, one
 * arrowhead and one dotted line in it.
 * @param width - Render width in pixels
 * @param height - Render height in pixels
 * @param eye - Where the scene's camera sits
 * @returns The scene and the three materials whose uniforms are under test
 */
function element(width: number, height: number, eye: Vector3): Element {
    const engine = new NullEngine({
        renderWidth: width,
        renderHeight: height,
        textureSize: 512,
        deterministicLockstep: false,
        lockstepMaxSteps: 1,
    });
    const scene = new Scene(engine);
    scenes.push(scene);
    const camera = new FreeCamera("camera", eye, scene);
    scene.activeCamera = camera;

    const lineMesh = CustomLineRenderer.create(
        { points: [new Vector3(0, 0, 0), new Vector3(1, 0, 0)], width: 4, color: "#ffffff" },
        scene,
    );
    const arrowMesh = EdgeMesh.createArrowHead(
        new MeshCache(),
        "arrow",
        { type: "normal", width: 1, color: "#ff0000" },
        scene,
    );
    assert.isNotNull(arrowMesh);
    const patternLine = PatternedLineRenderer.create(
        "dot",
        new Vector3(0, 0, 0),
        new Vector3(0, 0, 5),
        0.5,
        "#ffffff",
        1,
        scene,
    );

    return {
        scene,
        line: lineMesh.material as ShaderMaterial,
        arrow: arrowMesh.material as ShaderMaterial,
        pattern: patternLine.meshes[0].material as ShaderMaterial,
        patternLine,
        dispose: () => {
            lineMesh.dispose(false, true);
            arrowMesh.dispose();
            patternLine.dispose();
        },
    };
}

function resolutionOf(material: ShaderMaterial): Vector2 | undefined {
    return (material as unknown as UniformCache)._vectors2.resolution;
}

function cameraOf(material: ShaderMaterial): Vector3 | undefined {
    return (material as unknown as UniformCache)._vectors3.cameraPosition;
}

function assertVector(actual: Vector2 | Vector3 | undefined, expected: Vector2 | Vector3, message: string): void {
    assert.isDefined(actual, `${message}: never set`);
    assert.isTrue(
        actual.asArray().every((value, i) => Math.abs(value - expected.asArray()[i]) < 1e-9),
        message,
    );
}

afterEach(() => {
    for (const scene of scenes.splice(0)) {
        if (!scene.isDisposed) {
            scene.getEngine().dispose();
        }
    }
});

describe("per-frame shader uniforms are kept per scene", () => {
    test("each scene's materials hold that scene's resolution and camera, whichever rendered last", () => {
        const eyeA = new Vector3(0, 0, -10);
        const eyeB = new Vector3(0, 50, -99);
        const a = element(400, 400, eyeA);
        const b = element(1200, 300, eyeB);

        a.scene.render();
        b.scene.render();

        // B rendered last. Before the fix B's resolution observer wrote B's size into A's line too,
        // and only A's camera observer existed, so B's arrow and pattern faced A's camera.
        assertVector(resolutionOf(a.line), new Vector2(400, 400), "scene A's line after B rendered");
        assertVector(resolutionOf(b.line), new Vector2(1200, 300), "scene B's line");
        assertVector(cameraOf(a.arrow), eyeA, "scene A's arrowhead");
        assertVector(cameraOf(b.arrow), eyeB, "scene B's arrowhead");
        assertVector(cameraOf(a.pattern), eyeA, "scene A's pattern element");
        assertVector(cameraOf(b.pattern), eyeB, "scene B's pattern element");
    });

    test("a scene created after another is disposed still gets its uniforms", () => {
        const a = element(400, 400, new Vector3(0, 0, -10));
        a.scene.render();
        a.scene.getEngine().dispose();

        const eyeC = new Vector3(7, 8, -9);
        const c = element(640, 480, eyeC);
        c.scene.render();

        assertVector(resolutionOf(c.line), new Vector2(640, 480), "scene C's line");
        assertVector(cameraOf(c.arrow), eyeC, "scene C's arrowhead");
        assertVector(cameraOf(c.pattern), eyeC, "scene C's pattern element");
    });

    test("a new material has its uniforms before its scene first renders", () => {
        const a = element(800, 600, new Vector3(3, 2, -1));

        // The camera's own world position is not computed until the scene first renders, so only
        // the arrowhead's camera uniform being SET is asserted here; its value is checked above.
        assertVector(resolutionOf(a.line), new Vector2(800, 600), "the line's resolution at creation");
        assert.isDefined(cameraOf(a.arrow), "the arrowhead's camera at creation");
    });

    test("disposing everything a scene drew empties the per-frame walks", () => {
        const before = FilledArrowRenderer.getActiveMaterialCount();
        const a = element(400, 400, new Vector3(0, 0, -10));

        assert.isAbove(FilledArrowRenderer.getActiveMaterialCount(a.scene), 0, "nothing was registered");
        assert.isAbove(CustomLineRenderer.getActiveMaterialCount(a.scene), 0, "no line was registered");

        a.dispose();

        assert.equal(FilledArrowRenderer.getActiveMaterialCount(a.scene), 0, "arrowhead/pattern materials left behind");
        assert.equal(CustomLineRenderer.getActiveMaterialCount(a.scene), 0, "line materials left behind");
        assert.equal(FilledArrowRenderer.getActiveMaterialCount(), before);
    });

    test("disposing a scene drops its materials from every walk", () => {
        const a = element(400, 400, new Vector3(0, 0, -10));
        const b = element(400, 400, new Vector3(0, 0, -10));
        const withB = CustomLineRenderer.getActiveMaterialCount(b.scene);

        a.scene.getEngine().dispose();

        assert.equal(CustomLineRenderer.getActiveMaterialCount(a.scene), 0);
        assert.equal(FilledArrowRenderer.getActiveMaterialCount(a.scene), 0);
        assert.equal(CustomLineRenderer.getActiveMaterialCount(b.scene), withB, "scene B's lines were touched");
    });
});
