import { DynamicTexture, NullEngine, Scene, StandardMaterial } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";

/**
 * The gradient ramp against a REAL 2D canvas.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM test/node-mesh-gradient.test.ts: a `DynamicTexture`
 * allocates its backing canvas through the engine, and a plain Node.js process has neither
 * `document` nor `OffscreenCanvas`. The default project therefore covers the texture wiring --
 * assignment, interning, the per-scene ceiling -- against a stand-in canvas. Those tests prove the
 * branch is taken and the memory bound holds; they cannot prove that a real
 * `createLinearGradient` / `createRadialGradient` call succeeds with the arguments this code
 * passes. That is what runs here. The final claim, that the ramp LOOKS like a gradient, is a
 * Chromatic screenshot review -- "it renders" is the whole claim of this change, and no unit test
 * can make it.
 *
 * THE DEFECT: `NodeMesh.createMaterial` handled only a hex string and `{colorType: "solid"}`, and
 * had no else branch, so a node styled with `{colorType: "gradient"}` was handed a StandardMaterial
 * with nothing assigned at all and rendered flat white. The schema accepted the value, so the
 * layer parsed, interned a style id and allocated a cached mesh -- full cost, zero pixels. That is
 * the product owner's "gradient color strips don't currently work".
 */
describe("NodeMesh gradient textures against a real canvas", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        meshCache = new MeshCache();
    });

    function materialFor(styleId: string, color: unknown, is2D = false): StandardMaterial {
        const mesh = NodeMesh.create(
            meshCache,
            { styleId, is2D, size: 2 },
            {
                shape: { type: "box", size: 2 },
                texture: { color: color as never },
            },
            scene,
        );
        const { material } = mesh;
        assert.instanceOf(material, StandardMaterial);
        return material;
    }

    const linear = { colorType: "gradient", direction: 90, colors: ["#FF0000", "#0000FF"] };
    const radial = { colorType: "radial-gradient", colors: ["#FF0000", "#0000FF"] };

    test("a linear gradient paints a square DynamicTexture with a live 2D context", () => {
        const mat = materialFor("grad-linear", linear);

        assert.instanceOf(mat.diffuseTexture, DynamicTexture);
        const texture = mat.diffuseTexture;

        // A square canvas, not a 1-pixel strip: direction 90 has no horizontal component, so a
        // strip would collapse the whole ramp into one row and render flat.
        const size = texture.getSize();
        assert.equal(size.width, size.height);
        assert.isAbove(size.width, 1);
        assert.isNotNull(texture.getContext());
    });

    test("a radial gradient paints a texture too", () => {
        const mat = materialFor("grad-radial", radial);

        assert.instanceOf(mat.diffuseTexture, DynamicTexture);
    });

    test("every direction round the compass paints without throwing", () => {
        // createLinearGradient rejects non-finite endpoints, and the endpoint maths is the part
        // most likely to produce them. Walk the whole range rather than trusting one direction.
        for (let direction = 0; direction <= 360; direction += 45) {
            const mat = materialFor(`grad-dir-${direction}`, { ...linear, direction });
            assert.instanceOf(mat.diffuseTexture, DynamicTexture, `direction ${direction} produced no texture`);
        }
    });

    test("a solid colour produces a diffuseColor and no texture", () => {
        const mat = materialFor("grad-solid", { colorType: "solid", value: "#FF0000" });

        assert.isNull(mat.diffuseTexture);
        assert.closeTo(mat.diffuseColor.r, 1, 0.001);
    });

    test("two style ids sharing one gradient value share ONE texture", () => {
        // The interning guarantee, restated here against real textures because it is what bounds
        // GPU memory: the ramp is keyed by gradient VALUE, never by style id.
        const a = materialFor("grad-a", linear);
        const b = materialFor("grad-b", { ...linear });

        assert.strictEqual(a.diffuseTexture, b.diffuseTexture);
    });

    test("a 2D gradient node paints the emissive channel, the only one 2D shows", () => {
        const mat = materialFor("grad-2d", linear, true);

        assert.isTrue(mat.disableLighting);
        assert.instanceOf(mat.emissiveTexture, DynamicTexture);
    });
});
