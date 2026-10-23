/**
 * A label is blended onto the picture once, from colors premultiplied by their alpha.
 *
 * Both used to be wrong, and both made text heavier than the program that wrote the file draws
 * it, the smaller it was drawn: the plane was double-sided, which is two coincident planes, so
 * every label was blended twice (its soft letter edges came out about twice as dark); and its
 * texture was uploaded with straight alpha, so the smaller mip levels averaged the black a canvas
 * keeps where it is see-through into the letters, and white words on a light background were
 * drawn as dark smudges.
 */

import { Camera, Constants, FreeCamera, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

describe("how a label is blended", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    test("the plane is one quad, drawn from both sides by the material, not two coincident quads", () => {
        const label = RichTextLabel.createLabel(scene, { text: "words" });
        const mesh = label.labelMesh;
        assert.isNotNull(mesh);
        assert.strictEqual(mesh.getTotalVertices(), 4);
        assert.strictEqual(mesh.getTotalIndices(), 6);
        assert.isFalse(mesh.material?.backFaceCulling);
    });

    test("the texture's colors are premultiplied and blended as such", () => {
        const label = RichTextLabel.createLabel(scene, { text: "words" });
        const material = label.labelMesh?.material;
        assert.strictEqual(material?.alphaMode, Constants.ALPHA_SRC_DSTONEMINUSSRCALPHA);
    });

    test("a depth fade scales the color with the alpha, as premultiplied colors need", () => {
        const label = RichTextLabel.createLabel(scene, {
            text: "far away",
            depthFadeEnabled: true,
            depthFadeNear: 1,
            depthFadeFar: 2,
        });
        scene.createDefaultCamera();
        scene.render();
        const material = label.labelMesh?.material as { alpha: number; emissiveColor: { r: number } } | undefined;
        assert.isDefined(material);
        assert.isBelow(material.alpha, 1);
        assert.closeTo(material.emissiveColor.r, material.alpha, 1e-9);
    });
});

describe("a label too small on screen", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.dispose();
    });

    /**
     * An orthographic camera looking down at the label, `span` scene units from top to bottom.
     * @param span - How tall the view is in scene units.
     * @returns The camera.
     */
    const orthographic = (span: number): FreeCamera => {
        const camera = new FreeCamera("top", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.orthoTop = span / 2;
        camera.orthoBottom = -span / 2;
        camera.orthoLeft = -span / 2;
        camera.orthoRight = span / 2;
        scene.activeCamera = camera;
        return camera;
    };

    test("is hidden below minScreenSize and shown again when the camera zooms in", () => {
        const label = RichTextLabel.createLabel(scene, { text: "words", minScreenSize: 6 });
        const mesh = label.labelMesh;
        assert.isNotNull(mesh);
        const height = scene.getEngine().getRenderHeight();

        // A one-unit line on a view thousands of units tall: well under a pixel.
        const camera = orthographic(height * 100);
        scene.render();
        assert.isBelow(label.screenFontPx(camera), 6);
        assert.strictEqual(mesh.visibility, 0);

        // Zoomed in until one unit is many pixels.
        orthographic(2);
        scene.render();
        assert.isAbove(label.screenFontPx(scene.activeCamera ?? camera), 6);
        assert.strictEqual(mesh.visibility, 1);
    });

    test("without minScreenSize, is drawn at any size", () => {
        const label = RichTextLabel.createLabel(scene, { text: "words" });
        orthographic(scene.getEngine().getRenderHeight() * 100);
        scene.render();
        assert.strictEqual(label.labelMesh?.visibility, 1);
    });
});
