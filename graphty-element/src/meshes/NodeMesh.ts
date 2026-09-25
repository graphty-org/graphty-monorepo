import {
    AbstractMesh,
    Color3,
    DynamicTexture,
    type ICanvasGradient,
    type ICanvasRenderingContext,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import { PolyhedronType, SHAPE_CONSTANTS } from "../constants/meshConstants";
import { shadeInstanceColors } from "./InstanceColorShading";
import type { MeshCache } from "./MeshCache";

interface NodeMeshOptions {
    styleId: string;
    is2D: boolean;
    size: number;
}

interface NodeMeshCreateOptions {
    shape?: NodeStyleConfig["shape"];
    texture?: NodeStyleConfig["texture"];
    effect?: NodeStyleConfig["effect"];
}

type ShapeCreator = (size: number, scene?: Scene) => Mesh;

/**
 * Width and height in pixels of the square canvas a gradient ramp is painted into.
 *
 * Square rather than a 1-pixel strip because a strip cannot carry a vertical ramp -- see
 * `NodeMesh.createGradientTexture`. 128 costs roughly 64 KB of GPU memory per distinct gradient
 * and is ample for a node-sized mesh; raising it multiplies the ceiling described on
 * MAX_GRADIENT_TEXTURES_PER_SCENE by the square of the change.
 */
/** The smallest size a node mesh is built at; a size of 0 draws this, never hidden. */
const MIN_NODE_SIZE = 1e-3;

const GRADIENT_TEXTURE_SIZE = 128;

/**
 * Hard ceiling on how many distinct gradient ramps may be allocated for one scene.
 *
 * This is the guard against the calculated-style hazard documented on
 * `NodeMesh.getGradientTexture`: a `calculatedStyle` expression produces a distinct style value,
 * and therefore a distinct material, per node, so a gradient computed per node would otherwise
 * allocate a texture per node. At 32 the worst case is about 2 MB, which is affordable; past the
 * ceiling the material falls back to the gradient's first stop as a flat colour rather than
 * allocating without bound.
 */
const MAX_GRADIENT_TEXTURES_PER_SCENE = 32;

/**
 * Gradient ramps interned per scene, keyed by the gradient VALUE rather than by style id.
 *
 * A WeakMap so the whole table is collected with the scene it belongs to -- textures never leak
 * between scenes, and a test that builds and drops a scene leaves nothing behind.
 */
const gradientTextureCache = new WeakMap<Scene, Map<string, DynamicTexture>>();

interface ColorObject {
    colorType: string;
    value?: string;
    colors?: string[];
    direction?: number;
    opacity?: number;
}

/**
 * A gradient colour normalised out of the `AdvancedColorStyle` discriminated union.
 *
 * `radial` distinguishes the two gradient members of that union. `direction` is meaningless for
 * the radial form and is pinned to 0 there so the cache key below stays canonical -- two radial
 * gradients that differ only in a stray direction must not intern as two textures.
 */
interface GradientColor {
    radial: boolean;
    colors: string[];
    direction: number;
}

/**
 * Factory class for creating node meshes with various shapes
 *
 * Supports multiple 3D shapes including primitives (box, sphere, cylinder),
 * polyhedra (tetrahedron, octahedron, etc.), and custom shapes. Handles
 * material creation, caching, and 2D/3D rendering modes.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Static factory class for node mesh creation
export class NodeMesh {
    private static shapeCreators = new Map<string, ShapeCreator>();

    static {
        NodeMesh.registerShapeCreator("box", (size) => NodeMesh.createBox(size));
        NodeMesh.registerShapeCreator("sphere", (size) => NodeMesh.createSphere(size));
        NodeMesh.registerShapeCreator("cylinder", (size, scene) => NodeMesh.createCylinder(size, scene));
        NodeMesh.registerShapeCreator("cone", (size, scene) => NodeMesh.createCone(size, scene));
        NodeMesh.registerShapeCreator("capsule", (size, scene) => NodeMesh.createCapsule(size, scene));
        NodeMesh.registerShapeCreator("torus", (size, scene) => NodeMesh.createTorus(size, scene));
        NodeMesh.registerShapeCreator("torus-knot", (size, scene) => NodeMesh.createTorusKnot(size, scene));

        NodeMesh.registerShapeCreator("tetrahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TETRAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("octahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.OCTAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("dodecahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.DODECAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("icosahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ICOSAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("rhombicuboctahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.RHOMBICUBOCTAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("triangular-prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal-prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("hexagonal-prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.HEXAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("square-pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.SQUARE_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal-pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("triangular-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated-square-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_SQUARE_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated-pentagonal-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated-pentagonal-cupola", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_CUPOLA, size, scene),
        );

        NodeMesh.registerShapeCreator("goldberg", (size, scene) => NodeMesh.createGoldberg(size, scene));
        NodeMesh.registerShapeCreator("icosphere", (size, scene) => NodeMesh.createIcoSphere(size, scene));
        NodeMesh.registerShapeCreator("geodesic", (size, scene) => NodeMesh.createGeodesic(size, scene));

        // Also register underscore versions for backward compatibility
        NodeMesh.registerShapeCreator("triangular_prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal_prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("hexagonal_prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.HEXAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("square_pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.SQUARE_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal_pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("triangular_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated_square_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_SQUARE_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated_pentagonal_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated_pentagonal_cupola", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_CUPOLA, size, scene),
        );
    }

    /**
     * Create a node mesh with caching
     * @param cache - Mesh cache for reusing geometry
     * @param options - Node mesh options including styleId and size
     * @param createOptions - Creation options for shape, texture, and effects
     * @param scene - Babylon.js scene
     * @returns Created or cached node mesh
     */
    static create(
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: NodeMeshCreateOptions,
        scene?: Scene,
    ): AbstractMesh {
        const cacheKey = `node-style-${options.styleId}-${options.is2D ? "2d" : "3d"}`;

        return cache.get(cacheKey, () => {
            const mesh = this.createMeshWithoutCache(options, createOptions, scene);
            const material = this.createMaterial(createOptions, options.is2D, scene);
            mesh.material = material;

            if (
                createOptions.texture?.color &&
                typeof createOptions.texture.color === "object" &&
                "opacity" in createOptions.texture.color
            ) {
                mesh.visibility = createOptions.texture.color.opacity ?? 1;
            }

            return mesh;
        });
    }

    /**
     * Create a node mesh without using cache
     * @param options - Node mesh options including styleId and size
     * @param createOptions - Creation options for shape, texture, and effects
     * @param scene - Babylon.js scene
     * @returns Created node mesh
     */
    static createMeshWithoutCache(options: NodeMeshOptions, createOptions: NodeMeshCreateOptions, scene?: Scene): Mesh {
        if (!createOptions.shape?.type) {
            throw new TypeError("shape with type required to create mesh");
        }

        const creator = this.shapeCreators.get(createOptions.shape.type);
        if (!creator) {
            throw new TypeError(`unknown shape: ${createOptions.shape.type}`);
        }

        // Babylon's MeshBuilder reads a size of 0 as "not set" and draws a 1-unit mesh, so a node
        // of size 0 used to draw larger than a node of size 0.01. Flooring here keeps size 0 the
        // smallest visible node for every shape creator, built-in or registered (#117).
        const size = Math.max(createOptions.shape.size ?? options.size, MIN_NODE_SIZE);
        return creator(size, scene);
    }

    /**
     * Builds the StandardMaterial for a node mesh.
     *
     * THE DEFECT THIS FIXES: `extractColor` answers only two of the three colour forms the zod
     * schema accepts -- a bare hex string and `{colorType: "solid"}`. For `"gradient"` and
     * `"radial-gradient"` it returns undefined, and this function used to read
     * `if (color3) { ... }` with NO else branch. The consequence was not a wrong gradient: the
     * StandardMaterial kept its stock colour, so a gradient node rendered flat white/grey with no
     * colour applied at all. That is the product owner's report, "gradient color strips don't
     * currently work", and it was made more galling by the fact that the schema accepted the
     * value (see config/common.ts `AdvancedColorStyle`), so `Styles.getNodeIdForStyle` interned a
     * fresh style id and `NodeMesh.create` allocated a whole cached mesh for it. The user paid the
     * full interning cost and got no pixels back. Every colour form the schema accepts must now
     * produce a visible colour, or the schema and the renderer have drifted again.
     *
     * HOW A GRADIENT IS PAINTED: a canvas-drawn ramp in a `DynamicTexture`, assigned to
     * `diffuseTexture` in 3D and to `emissiveTexture` in 2D (2D sets `disableLighting`, so only
     * the emissive channel is visible there -- the same reason the solid path assigns
     * `emissiveColor` rather than `diffuseColor` when `is2D`).
     *
     * THE TEXTURE IS ASSIGNED BEFORE `mat.freeze()`. A frozen material ignores later mutation, so
     * assigning a texture after the freeze is a silent no-op. Do not move the freeze up.
     *
     * KNOWN VISUAL DIFFERENCE, deliberately not papered over: the solid 3D path adds
     * `emissiveColor = color * 0.2` as a minimum-brightness floor for shadowed surfaces. The
     * gradient path cannot reuse that trick, because `emissiveTexture` and `diffuseTexture` would
     * be the same shared texture object and `Texture.level` is a property of the texture rather
     * than of the material -- dimming one would dim the other for every material sharing it. A
     * gradient node therefore reads darker on its unlit side than a solid node of the same hue.
     * That is a real difference in appearance, it needs a screenshot review rather than a unit
     * test, and the alternative (a second, pre-dimmed texture per gradient) doubles the GPU memory
     * discussed on `getGradientTexture`.
     * @param createOptions - Creation options carrying the texture colour and effects
     * @param is2D - Whether the scene is rendering in 2D mode
     * @param scene - Babylon.js scene, required to allocate a gradient texture
     * @returns The material to attach to the cached node mesh
     */
    private static createMaterial(
        createOptions: NodeMeshCreateOptions,
        is2D: boolean,
        scene?: Scene,
    ): StandardMaterial {
        const mat = new StandardMaterial("defaultMaterial", scene);

        const styleColor = createOptions.texture?.color;
        let color3 = this.extractColor(styleColor);
        const gradient = color3 ? undefined : this.extractGradient(styleColor);
        const gradientTexture = gradient ? this.getGradientTexture(gradient, scene) : undefined;

        if (gradient && !gradientTexture) {
            // The ramp could not be allocated -- no scene, no 2D canvas in this environment, or
            // the per-scene texture budget is spent. Fall back to the first stop so the node still
            // carries a colour. This mirrors what Node.ts already does for rich-text label
            // backgrounds, and it is strictly better than the old behaviour of drawing nothing:
            // a flat approximation of a gradient is legible, an unstyled default is not.
            const [firstStop] = gradient.colors;
            if (firstStop) {
                color3 = Color3.FromHexString(firstStop);
            }
        }

        if (gradientTexture) {
            if (is2D) {
                mat.disableLighting = true;
                mat.emissiveTexture = gradientTexture;
                mat.diffuseTexture = gradientTexture;
            } else {
                mat.diffuseTexture = gradientTexture;
            }
        } else if (color3) {
            if (is2D) {
                mat.disableLighting = true;
                mat.emissiveColor = color3;
            } else {
                mat.diffuseColor = color3;
                // Add emissive for minimum brightness on shadowed surfaces
                mat.emissiveColor = color3.scale(0.2);

                // THE COLOUR ABOVE IS USUALLY NEUTRAL WHITE, because nodes that differ only in
                // colour share this material and carry their own colour in a per-instance buffer
                // instead. Babylon multiplies that buffer in after it clamps the light term, which
                // flattens every surface lit past four fifths into one patch of unshaded colour --
                // so the plugin moves the multiply inside the clamp and the node looks round
                // again. On a material whose instances carry no colour it changes nothing.
                //
                // BEFORE freeze(): a frozen material stops re-evaluating its shader defines, and a
                // plugin is a define.
                shadeInstanceColors(mat);
            }
        }

        mat.wireframe = createOptions.effect?.wireframe ?? false;

        mat.freeze();
        return mat;
    }

    private static extractColor(color: unknown): Color3 | undefined {
        if (typeof color === "string") {
            return Color3.FromHexString(color === "##FFFFFF" ? "#FFFFFF" : color);
        }

        if (typeof color === "object" && color !== null) {
            const colorObj = color as ColorObject;
            if (colorObj.colorType === "solid" && colorObj.value) {
                return Color3.FromHexString(colorObj.value);
            }
        }

        return undefined;
    }

    /**
     * Normalises the two gradient members of `AdvancedColorStyle` into one shape.
     *
     * Kept separate from `extractColor` on purpose: `extractColor` answers "is there a single flat
     * colour here", and several callers rely on it returning undefined for a gradient. Widening it
     * to also mean "or a gradient" would change what undefined means at every call site.
     *
     * A gradient with a single stop is still returned. It cannot be PAINTED -- the stop offsets are
     * `i / (colors.length - 1)`, which is a division by zero for one stop, and a one-stop ramp is a
     * flat colour anyway -- so `getGradientTexture` refuses it and `createMaterial` falls back to
     * that one stop. Returning undefined here instead would send the node back to the unstyled
     * default, which is the exact defect this whole change removes.
     * @param color - The `texture.color` value taken straight off the parsed style
     * @returns The normalised gradient, or undefined if this is not a paintable gradient
     */
    private static extractGradient(color: unknown): GradientColor | undefined {
        if (typeof color !== "object" || color === null) {
            return undefined;
        }

        const colorObj = color as ColorObject;
        const isRadial = colorObj.colorType === "radial-gradient";
        if (colorObj.colorType !== "gradient" && !isRadial) {
            return undefined;
        }

        const colors = colorObj.colors?.filter((c): c is string => typeof c === "string") ?? [];
        if (colors.length === 0) {
            return undefined;
        }

        return {
            radial: isRadial,
            colors,
            // The radial form has no direction in the schema. Pin it to 0 so two radial gradients
            // that are equal in every meaningful way share one cache entry.
            direction: isRadial ? 0 : (colorObj.direction ?? 0),
        };
    }

    /**
     * Returns the ramp texture for a gradient, interning it so equal gradients share one texture.
     *
     * WHY INTERNING IS NOT OPTIONAL HERE -- the GPU-memory hazard this guards, spelled out because
     * it is easy to reintroduce: `Styles.styleToId` interns a style by DEEP VALUE EQUALITY, so it
     * mints one style id per distinct style VALUE, not one per node. For a gradient written into a
     * style layer by hand that is fine: every node matching the layer shares one style id, one
     * cached mesh, one material and therefore one texture. But a `calculatedStyle` expression
     * computes a style value per node (Node.update merges `styleUpdates` and re-interns), so an
     * expression that derives a gradient from node data yields a DISTINCT style value -- and
     * therefore a distinct style id, mesh and material -- for every node it touches. Keying the
     * texture off the style id would then allocate one texture per node, and at
     * GRADIENT_TEXTURE_SIZE squared RGBA that is roughly 64 KB each: a thousand-node graph would
     * burn 64 MB of GPU memory on ramps nobody can tell apart.
     *
     * The fix is two-layered, and both layers matter:
     *   1. The cache key is the gradient VALUE (form, direction, stops), not the style id. Two
     *      style ids that differ only in shape or size share one texture, and a per-node
     *      calculated gradient that happens to repeat a value shares one too.
     *   2. A hard ceiling of MAX_GRADIENT_TEXTURES_PER_SCENE. Beyond it this returns undefined and
     *      `createMaterial` falls back to the first stop as a flat colour. A graph with more than
     *      that many genuinely distinct gradients is a calculated gradient in disguise, and a flat
     *      approximation is a far better outcome than exhausting GPU memory. The ceiling is the
     *      reason this code does not need to know whether a gradient came from a calculated value:
     *      provenance is invisible here, but unbounded allocation is not.
     *
     * The cache is a WeakMap keyed by scene, so the entries die with the scene and never leak
     * across scenes or across tests. `MeshCache.clear()` disposes meshes only -- not materials and
     * not textures -- so a cached texture stays valid across a 2D/3D switch.
     * @param gradient - The normalised gradient to paint
     * @param scene - Babylon.js scene that will own the texture
     * @returns The shared texture, or undefined if one cannot or should not be allocated
     */
    private static getGradientTexture(gradient: GradientColor, scene?: Scene): DynamicTexture | undefined {
        // One stop cannot make a ramp: the stop offsets below are `i / (colors.length - 1)`, which
        // is NaN for a single stop and throws in `addColorStop`. The caller paints it flat.
        if (!scene || gradient.colors.length < 2) {
            return undefined;
        }

        const key = `${gradient.radial ? "radial" : "linear"}|${gradient.direction}|${gradient.colors.join(",")}`;

        let sceneCache = gradientTextureCache.get(scene);
        if (!sceneCache) {
            sceneCache = new Map<string, DynamicTexture>();
            gradientTextureCache.set(scene, sceneCache);
        }

        const cached = sceneCache.get(key);
        if (cached) {
            return cached;
        }

        if (sceneCache.size >= MAX_GRADIENT_TEXTURES_PER_SCENE) {
            return undefined;
        }

        const texture = this.createGradientTexture(gradient, scene, key);
        if (!texture) {
            return undefined;
        }

        sceneCache.set(key, texture);
        return texture;
    }

    /**
     * Paints a gradient ramp into a DynamicTexture.
     *
     * WHY THE CANVAS IS SQUARE RATHER THAN A 256x1 STRIP: a one-pixel-tall strip cannot represent
     * a gradient whose direction has any vertical component. At direction 90 the endpoint maths
     * below reduces to y1 = 0, y2 = 1, so the entire ramp is squeezed into a single row of pixels
     * and the node renders as one flat colour -- exactly the defect this whole change exists to
     * remove, reintroduced for half the directions. A square canvas costs more memory per texture,
     * which is why the count is capped in `getGradientTexture` rather than the size shaved here.
     *
     * The linear endpoint maths is deliberately identical to the rich-text label background
     * painter (see RichTextLabel's `_fillBackground`), so a gradient reads the same on a node as it
     * does behind a label. Keep them in step.
     *
     * Everything is wrapped in a try/catch because `DynamicTexture` allocates a 2D canvas through
     * the engine, and there is no canvas in a plain Node.js test process (Babylon falls back to
     * `OffscreenCanvas`, which Node does not define). Throwing there would take down node creation
     * for a style that the schema says is valid; returning undefined lets `createMaterial` paint
     * the first stop instead.
     * @param gradient - The normalised gradient to paint
     * @param scene - Babylon.js scene that will own the texture
     * @param key - The interning key, reused as the texture name so it is identifiable in the
     * Babylon inspector
     * @returns The painted texture, or undefined if no 2D canvas is available
     */
    private static createGradientTexture(
        gradient: GradientColor,
        scene: Scene,
        key: string,
    ): DynamicTexture | undefined {
        const size = GRADIENT_TEXTURE_SIZE;
        let texture: DynamicTexture | undefined;

        try {
            texture = new DynamicTexture(`node-gradient-${key}`, { width: size, height: size }, scene, false);
            const ctx = texture.getContext();

            const ramp = gradient.radial
                ? ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
                : this.createLinearRamp(ctx, gradient.direction, size);

            const { colors } = gradient;
            for (let i = 0; i < colors.length; i++) {
                ramp.addColorStop(i / (colors.length - 1), colors[i] ?? "transparent");
            }

            ctx.fillStyle = ramp;
            ctx.fillRect(0, 0, size, size);
            // Default invertY, matching RichTextLabel's texture updates, so a canvas painted with
            // a top-left origin ends up upright on the mesh and "direction 90" means the same
            // thing on a node as it does behind a label.
            texture.update();

            return texture;
        } catch {
            // No usable 2D canvas here. Dispose the half-built texture rather than leaving it
            // registered on the scene -- an undrawable texture that is never released would be a
            // slow leak on every repaint. The caller falls back to the first stop.
            texture?.dispose();
            return undefined;
        }
    }

    /**
     * Computes the two endpoints of a linear ramp across a square canvas for a direction in
     * degrees, and returns the canvas gradient.
     *
     * Lifted verbatim from the rich-text label background painter so node fills and label fills
     * agree on what "direction 45" means. Zero degrees runs left to right; the angle sweeps the
     * endpoints around the canvas centre.
     * @param ctx - The DynamicTexture's 2D context
     * @param direction - Gradient direction in degrees, 0 to 360
     * @param size - Width and height of the square canvas
     * @returns A canvas linear gradient with no stops added yet
     */
    private static createLinearRamp(
        ctx: ICanvasRenderingContext,
        direction: number,
        size: number,
    ): ICanvasGradient {
        const angle = (direction * Math.PI) / 180;
        const half = size / 2;
        const x1 = half - (Math.cos(angle) * size) / 2;
        const y1 = half - (Math.sin(angle) * size) / 2;
        const x2 = half + (Math.cos(angle) * size) / 2;
        const y2 = half + (Math.sin(angle) * size) / 2;

        return ctx.createLinearGradient(x1, y1, x2, y2);
    }

    /**
     * Register a custom shape creator function
     * @param type - Shape type identifier
     * @param creator - Function to create the mesh for this shape
     */
    static registerShapeCreator(type: string, creator: ShapeCreator): void {
        this.shapeCreators.set(type, creator);
    }

    private static createBox(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateBox("box", { size }, scene);
    }

    private static createSphere(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateSphere("sphere", { diameter: size }, scene);
    }

    private static createCylinder(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateCylinder(
            "cylinder",
            {
                height: actualSize * SHAPE_CONSTANTS.GOLDEN_RATIO,
                diameter: actualSize,
            },
            scene,
        );
    }

    private static createCone(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateCylinder(
            "cylinder",
            {
                height: actualSize * SHAPE_CONSTANTS.GOLDEN_RATIO,
                diameterTop: 0,
                diameterBottom: actualSize,
            },
            scene,
        );
    }

    private static createCapsule(_size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateCapsule("capsule", {}, scene);
    }

    private static createTorus(_size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateTorus("torus", {}, scene);
    }

    private static createTorusKnot(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateTorusKnot(
            "tk",
            {
                radius: actualSize * SHAPE_CONSTANTS.TORUSKNOT_RADIUS_MULTIPLIER,
                tube: actualSize * SHAPE_CONSTANTS.TORUSKNOT_TUBE_MULTIPLIER,
                radialSegments: SHAPE_CONSTANTS.TORUSKNOT_RADIAL_SEGMENTS,
            },
            scene,
        );
    }

    private static createPolyhedron(type: PolyhedronType, size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreatePolyhedron(
            "polyhedron",
            {
                size,
                type: type,
            },
            scene,
        );
    }

    private static createGoldberg(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateGoldberg(
            "goldberg",
            {
                size,
            },
            scene,
        );
    }

    private static createIcoSphere(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateIcoSphere(
            "icosphere",
            {
                radius: actualSize * SHAPE_CONSTANTS.ICOSPHERE_RADIUS_MULTIPLIER,
            },
            scene,
        );
    }

    private static createGeodesic(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateGeodesic(
            "geodesic",
            {
                size,
            },
            scene,
        );
    }
}
