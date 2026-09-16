import { z } from "zod/v4";

import { AdvancedColorStyle, ColorStyle } from "./common";
import { RichTextStyle } from "./RichTextStyle";

/**
 * The single source of truth for the node shape vocabulary.
 *
 * WHY THIS IS EXPORTED, and what went wrong when it was not: this enum used to be an internal
 * detail of the zod schema. The graphty app therefore hand-copied the list into its own
 * `NODE_SHAPE_OPTIONS` table, and the two copies drifted. The editor ended up offering three
 * shapes -- "plane", "disc" and "torus" -- that this enum did not contain, and the app's write
 * bridge quietly substituted the nearest shape it could build ("plane" -> "box",
 * "disc" -> "geodesic", "torus" -> "torus-knot"). That is the product owner's report verbatim:
 * "there is no plane shape, and when selected a box shows up". A control that silently draws
 * something other than what it says is worse than a control that is absent, so the fix is
 * structural rather than cosmetic: this enum is now a public value export (see
 * src/config/index.ts and the package root index.ts) and the app DERIVES its picker from
 * `NodeShapes.options`. The two lists can no longer drift, because there is only one list.
 *
 * TWO INVARIANTS HANG OFF THIS ENUM. Break either one and nodes stop rendering:
 *
 * 1. `NodeMesh`'s static registration block (src/meshes/NodeMesh.ts) MUST register a shape
 *    creator for every member here. `NodeMesh.createMeshWithoutCache` throws
 *    `unknown shape: <type>` for anything unregistered, which surfaces as a node that never
 *    appears. test/node-mesh-gradient.test.ts asserts the whole enum is covered, so adding a
 *    member without a creator is a test failure rather than a runtime surprise.
 *
 * 2. The app's picker is generated from `NodeShapes.options`, so adding a member here adds an
 *    option to the dropdown and removing one removes it. Do not add a member speculatively.
 *
 * WHY "torus" IS HERE NOW: `NodeMesh` has always registered a working `torus` creator built on
 * `MeshBuilder.CreateTorus`; only this enum omitted it, which is the sole reason Torus was
 * being degraded to torus-knot. Adding the member widens the zod enum, which is backward
 * compatible -- every previously valid style still parses. Layers already saved with
 * "torus-knot" keep rendering a torus-knot; only a fresh pick of Torus gets the new shape.
 *
 * WHY "plane" AND "disc" ARE NOT HERE, and must not be added casually: `MeshBuilder.CreatePlane`
 * produces a zero-thickness, single-sided quad. `NodeMesh.create` caches ONE mesh per style id
 * and instances it, so a plane would need explicit double-sided orientation or half the graph's
 * nodes would vanish depending on camera side, and edge-on it vanishes for every camera
 * regardless. Worse, edge attachment is bounding-sphere and ray-intersection based (see Edge.ts),
 * and a ray misses a near-zero-thickness quad for most incident angles, so every edge touching a
 * plane node would fall back to centre-to-centre attachment. A node you cannot see, wired by
 * edges that do not touch it, is a bigger defect than a missing dropdown entry. If flat,
 * camera-facing nodes are wanted, the right feature is a billboarded quad with its own answer
 * for edge attachment -- a specced piece of work, not an enum entry.
 * @public
 */
export const NodeShapes = z.enum([
    "box",
    "sphere",
    "cylinder",
    "cone",
    "capsule",
    "torus",
    "torus-knot",
    "tetrahedron",
    "octahedron",
    "dodecahedron",
    "icosahedron",
    "rhombicuboctahedron",
    "triangular_prism",
    "pentagonal_prism",
    "hexagonal_prism",
    "square_pyramid",
    "pentagonal_pyramid",
    "triangular_dipyramid",
    "pentagonal_dipyramid",
    "elongated_square_dipyramid",
    "elongated_pentagonal_dipyramid",
    "elongated_pentagonal_cupola",
    "goldberg",
    "icosphere",
    "geodesic",
]);

export const NodeStyle = z.strictObject({
    shape: z
        .strictObject({
            size: z.number().positive().optional(),
            type: NodeShapes.optional(),
            // custom mesh https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/custom/custom
            // import mesh https://doc.babylonjs.com/typedoc/functions/BABYLON.ImportMeshAsync
        })
        .optional(),
    texture: z
        .strictObject({
            color: AdvancedColorStyle.or(ColorStyle).optional(),
            image: z.url().optional(),
            icon: z.string().optional(),
            // pieChart: z.string().or(z.null()).default(null), // https://manual.cytoscape.org/en/stable/Styles.html#using-graphics-in-styles
            // shader: z.url().or(z.null()).default(null), // https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/
            // bumpmap: z.url().or(z.null()).default(null), // https://doc.babylonjs.com/features/featuresDeepDive/materials/using/moreMaterials/#bump-map
            // refraction // https://forum.babylonjs.com/t/how-to-make-a-semi-transparent-glass-ball-with-a-through-hole-with-albedotexture/27357/24
            // reflection // https://doc.babylonjs.com/features/featuresDeepDive/materials/using/reflectionTexture/
        })
        .optional(),
    effect: z
        .strictObject({
            glow: z
                .strictObject({
                    // https://doc.babylonjs.com/features/featuresDeepDive/mesh/glowLayer
                    color: ColorStyle.optional(),
                    strength: z.number().positive().optional(),
                })
                .optional(),
            outline: z
                .strictObject({
                    // https://forum.babylonjs.com/t/how-to-get-the-perfect-outline/31711
                    color: ColorStyle.optional(),
                    width: z.number().positive().optional(),
                })
                .optional(),
            wireframe: z.boolean().optional(),
            flatShaded: z.boolean().optional(),
        })
        .optional(),
    label: RichTextStyle.prefault({ location: "top", textColor: "#000000" }).optional(),
    tooltip: RichTextStyle.prefault({
        location: "top-right",
        textColor: "#000000",
        backgroundColor: "#FFFFFF",
    }).optional(),
    enabled: z.boolean().default(true).optional(),
});

export type NodeStyleConfig = z.infer<typeof NodeStyle>;
export const defaultNodeStyle: NodeStyleConfig = {
    shape: {
        type: "icosphere",
        size: 1,
    },
    texture: {
        color: "#6366F1",
    },
    enabled: true,
};
