import { Mesh, NullEngine, Scene, StandardMaterial } from "@babylonjs/core";
import { afterAll, assert, beforeAll, beforeEach, describe, test } from "vitest";

import { NodeShapes } from "../src/config/NodeStyle";
import { MeshCache } from "../src/meshes/MeshCache";
import { NodeMesh } from "../src/meshes/NodeMesh";

/**
 * Two guarantees are pinned here, and they are the two halves of the same defect class: the
 * element's zod schema accepting more than its renderer draws.
 *
 * 1. THE SHAPE VOCABULARY. `NodeShapes` is the single source of truth for what shapes exist, and
 *    the graphty app now derives its shape picker from it. If a member of the enum has no
 *    registered creator in `NodeMesh`, that dropdown entry produces a thrown
 *    `unknown shape: <type>` and a node that never appears. The loop below makes that a test
 *    failure instead. It also pins "torus", which `NodeMesh` has always been able to build and
 *    which the enum omitted -- the omission was the whole reason the app substituted
 *    "torus-knot" for it.
 *
 * 2. GRADIENT COLOUR. `createMaterial` used to leave a StandardMaterial completely unstyled for a
 *    gradient colour, so a gradient node rendered flat white. These tests run in the default
 *    (Node.js) project where there is no 2D canvas, so `DynamicTexture` cannot be allocated --
 *    which is exactly the fallback path worth pinning here: a gradient must still produce a
 *    COLOUR, taken from its first stop. The texture-based tests, which need a real canvas, live in
 *    test/browser/node-mesh-gradient.test.ts.
 */
describe("NodeMesh shape vocabulary", () => {
    let shapeScene: Scene;

    beforeEach(() => {
        shapeScene = new Scene(new NullEngine());
    });

    test("every NodeShapes member has a registered shape creator", () => {
        for (const shape of NodeShapes.options) {
            const mesh = NodeMesh.createMeshWithoutCache(
                { styleId: "t", is2D: false, size: 2 },
                { shape: { type: shape, size: 2 } },
                shapeScene,
            );
            assert.instanceOf(mesh, Mesh, `no mesh creator registered for shape "${shape}"`);
        }
    });

    test("NodeShapes includes torus, which NodeMesh has always been able to build", () => {
        assert.include(NodeShapes.options, "torus");

        const mesh = NodeMesh.createMeshWithoutCache(
            { styleId: "t", is2D: false, size: 2 },
            { shape: { type: "torus", size: 2 } },
            shapeScene,
        );
        assert.equal(mesh.name, "torus");
    });

    test("NodeShapes does not offer plane or disc, which the element cannot honestly build", () => {
        assert.notInclude(NodeShapes.options, "plane");
        assert.notInclude(NodeShapes.options, "disc");
    });
});

describe("NodeMesh gradient colour without a canvas", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
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

    test("a solid colour still paints diffuseColor and no texture", () => {
        const mat = materialFor("solid-1", { colorType: "solid", value: "#FF0000" });

        assert.isNull(mat.diffuseTexture);
        assert.closeTo(mat.diffuseColor.r, 1, 0.001);
        assert.closeTo(mat.diffuseColor.g, 0, 0.001);
        assert.closeTo(mat.diffuseColor.b, 0, 0.001);
    });

    test("a linear gradient falls back to its first stop when no canvas exists", () => {
        const mat = materialFor("grad-1", {
            colorType: "gradient",
            direction: 90,
            colors: ["#0000FF", "#00FF00"],
        });

        // The defect this replaces: NOTHING was assigned, so the node rendered at the raw
        // StandardMaterial default. A colour -- any colour from the gradient -- is the floor.
        assert.isNull(mat.diffuseTexture);
        assert.closeTo(mat.diffuseColor.r, 0, 0.001);
        assert.closeTo(mat.diffuseColor.g, 0, 0.001);
        assert.closeTo(mat.diffuseColor.b, 1, 0.001);
    });

    test("a radial gradient falls back to its first stop too", () => {
        const mat = materialFor("radial-1", {
            colorType: "radial-gradient",
            colors: ["#00FF00", "#FF0000"],
        });

        assert.isNull(mat.diffuseTexture);
        assert.closeTo(mat.diffuseColor.g, 1, 0.001);
    });

    test("a 2D gradient node lights its emissive channel, matching the 2D solid path", () => {
        const mat = materialFor("grad-2d", { colorType: "gradient", direction: 0, colors: ["#FF0000", "#0000FF"] }, true);

        assert.isTrue(mat.disableLighting);
        assert.closeTo(mat.emissiveColor.r, 1, 0.001);
    });

    test("a one-stop gradient is treated as the flat colour it actually is", () => {
        const mat = materialFor("grad-one", { colorType: "gradient", direction: 0, colors: ["#FF0000"] });

        // One stop cannot make a ramp, but it must still paint. Dropping it back to the unstyled
        // default would be the original defect in miniature.
        assert.isNull(mat.diffuseTexture);
        assert.closeTo(mat.diffuseColor.r, 1, 0.001);
    });

    test("a gradient with no stops at all leaves the material alone rather than throwing", () => {
        const mat = materialFor("grad-none", { colorType: "gradient", direction: 0, colors: [] });

        assert.isNull(mat.diffuseTexture);
    });
});

/**
 * A minimal 2D canvas stand-in, so the gradient TEXTURE path can be exercised in the default
 * (Node.js) project.
 *
 * WHY THIS EXISTS: Babylon allocates a `DynamicTexture`'s backing canvas through
 * `AbstractEngine._CreateCanvas`, which falls back to `OffscreenCanvas` when there is no
 * `document`. Node.js defines neither, so without a stand-in every gradient in this project takes
 * the flat first-stop fallback and the branch that actually assigns a texture is never executed.
 * The real ramp -- the pixels -- is verified in test/browser/node-mesh-gradient.test.ts against a
 * real canvas, and ultimately by a Chromatic screenshot, because "it renders" is the whole claim.
 * What THESE tests pin is the wiring that the memory bound depends on: that a gradient reaches
 * `diffuseTexture` at all, that equal gradients share ONE texture, and that the per-scene ceiling
 * engages instead of allocating without limit.
 *
 * The repository already sets this precedent in test/mesh-testing/test-setup.ts, which polyfills
 * OffscreenCanvas for the same reason.
 */
class StubGradient {
    readonly stops: { offset: number; color: string }[] = [];

    /**
     * Records a colour stop, standing in for CanvasGradient.addColorStop.
     * @param offset - Stop position from 0 to 1
     * @param color - Stop colour
     */
    addColorStop(offset: number, color: string): void {
        this.stops.push({ offset, color });
    }
}

class StubContext {
    fillStyle: string | StubGradient = "";
    readonly gradients: StubGradient[] = [];

    /**
     * Stands in for CanvasRenderingContext2D.createLinearGradient.
     * @returns A recording gradient
     */
    createLinearGradient(): StubGradient {
        const g = new StubGradient();
        this.gradients.push(g);
        return g;
    }

    /**
     * Stands in for CanvasRenderingContext2D.createRadialGradient.
     * @returns A recording gradient
     */
    createRadialGradient(): StubGradient {
        const g = new StubGradient();
        this.gradients.push(g);
        return g;
    }

    /**
     * Stands in for CanvasRenderingContext2D.fillRect.
     */
    fillRect(): void {
        // Nothing to paint into: these tests assert wiring, not pixels.
    }
}

class StubCanvas {
    width: number;
    height: number;

    /**
     * @param width - Canvas width in pixels
     * @param height - Canvas height in pixels
     */
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    /**
     * Stands in for HTMLCanvasElement.getContext.
     * @param contextType - Requested context type
     * @returns A recording 2D context, or null for anything else
     */
    getContext(contextType: string): StubContext | null {
        return contextType === "2d" ? new StubContext() : null;
    }
}

describe("NodeMesh gradient textures with a stand-in canvas", () => {
    const globalWithCanvas = globalThis as unknown as { OffscreenCanvas?: unknown };
    let scene: Scene;
    let meshCache: MeshCache;

    beforeAll(() => {
        globalWithCanvas.OffscreenCanvas = StubCanvas;
    });

    afterAll(() => {
        delete globalWithCanvas.OffscreenCanvas;
    });

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

    test("a linear gradient reaches diffuseTexture instead of leaving the material unstyled", () => {
        const mat = materialFor("tex-linear", linear);

        assert.isNotNull(mat.diffuseTexture);
    });

    test("a radial gradient produces a texture too", () => {
        const mat = materialFor("tex-radial", radial);

        assert.isNotNull(mat.diffuseTexture);
    });

    test("a solid colour produces a diffuseColor and NO texture", () => {
        const mat = materialFor("tex-solid", { colorType: "solid", value: "#FF0000" });

        assert.isNull(mat.diffuseTexture);
        assert.closeTo(mat.diffuseColor.r, 1, 0.001);
    });

    test("two style ids sharing one gradient value share ONE texture", () => {
        // This identity IS the memory bound. The ramp is interned by gradient VALUE, not by style
        // id, because Styles.styleToId mints a style id per distinct style VALUE and a
        // calculatedStyle produces a distinct value per node. Key the texture off the style id and
        // a per-node calculated gradient allocates one texture per node.
        const a = materialFor("tex-a", linear);
        const b = materialFor("tex-b", { ...linear });

        assert.isNotNull(a.diffuseTexture);
        assert.strictEqual(a.diffuseTexture, b.diffuseTexture);
    });

    test("two different gradients do NOT share a texture", () => {
        const a = materialFor("tex-c", linear);
        const b = materialFor("tex-d", { ...linear, direction: 0 });

        assert.notStrictEqual(a.diffuseTexture, b.diffuseTexture);
    });

    test("a linear and a radial gradient over the same stops are different ramps", () => {
        const a = materialFor("tex-e", { ...linear, direction: 0 });
        const b = materialFor("tex-f", radial);

        assert.notStrictEqual(a.diffuseTexture, b.diffuseTexture);
    });

    test("a 2D gradient node paints the emissive channel, the only one 2D shows", () => {
        const mat = materialFor("tex-2d", linear, true);

        assert.isTrue(mat.disableLighting);
        assert.isNotNull(mat.emissiveTexture);
    });

    test("past the per-scene ceiling a gradient falls back to a flat first stop", () => {
        // The ceiling is what makes a per-node calculated gradient survivable: unbounded distinct
        // gradients stop allocating and start approximating rather than exhausting GPU memory.
        let textured = 0;
        let fellBack = false;

        for (let i = 0; i < 64; i++) {
            const mat = materialFor(`tex-ceiling-${i}`, {
                colorType: "gradient",
                direction: i,
                colors: ["#FF0000", "#0000FF"],
            });

            if (mat.diffuseTexture) {
                textured++;
            } else {
                fellBack = true;
                assert.closeTo(mat.diffuseColor.r, 1, 0.001, "the fallback must still carry the first stop");
            }
        }

        assert.isTrue(fellBack, "the per-scene texture ceiling must engage");
        assert.isAtMost(textured, 32);
    });

    test("the ceiling is per scene, so a fresh scene starts with a fresh budget", () => {
        for (let i = 0; i < 40; i++) {
            materialFor(`tex-fill-${i}`, { colorType: "gradient", direction: i, colors: ["#FF0000", "#0000FF"] });
        }

        scene = new Scene(new NullEngine());
        meshCache = new MeshCache();
        const mat = materialFor("tex-fresh", linear);

        assert.isNotNull(mat.diffuseTexture);
    });
});
