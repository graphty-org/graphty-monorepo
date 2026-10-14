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
 * WHY "plane" AND "disc" ARE NOT HERE: `MeshBuilder.CreatePlane` produces a zero-thickness,
 * single-sided quad, which vanishes edge-on and which an edge's ray misses for most angles. Flat
 * shapes are therefore the FLAT_NODE_SHAPES below: a closed outline extruded into a slab, so a ray
 * always meets a wall and the shape is seen from both sides. In a 2D view, or with
 * `shape.planar`, the slab is thin and reads as a flat 2D shape; in a 3D view it is as deep as it
 * is wide.
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
    // The flat shapes of 2D tools (Cytoscape, yEd, Graphviz, Gephi). See FLAT_NODE_SHAPES.
    "rectangle",
    "round-rectangle",
    "ellipse",
    "diamond",
    "triangle",
    "pentagon",
    "hexagon",
    "octagon",
    "parallelogram",
    "trapezoid",
    "star",
    "vee",
]);

/**
 * The node shapes that are a 2D outline rather than a solid: the shapes graph files from 2D tools
 * name. Each is an outline extruded into a slab. In a 2D view, or when `shape.planar` is set, the
 * slab is thin and the node reads as the flat shape; otherwise it is as deep as it is wide.
 * @public
 */
export const FLAT_NODE_SHAPES: readonly z.infer<typeof NodeShapes>[] = [
    "rectangle",
    "round-rectangle",
    "ellipse",
    "diamond",
    "triangle",
    "pentagon",
    "hexagon",
    "octagon",
    "parallelogram",
    "trapezoid",
    "star",
    "vee",
];

/** The line styles a node border is drawn in. @public */
export const NodeBorderStyles = z.enum(["solid", "dashed", "dotted", "double"]);

/**
 * Everything a style layer can say about how one node is drawn.
 *
 * ONE FIELD WAS WITHDRAWN IN 2.0. `enabled` was a switch superseded by the session's visibility
 * mask -- the filters, the time window and the context flag are what decide whether a node is
 * drawn, and nothing ever read this. It was accepted and ignored for as long as it existed, so
 * a consumer who flipped it watched the node stay exactly where it was. Only the label block's
 * own `enabled` is read, and that one stays.
 *
 * The removal is recorded in `WITHDRAWN_CAPABILITIES` in `src/catalog/unreachable.ts`, with what
 * to reach for instead. This object is strict, so a style document that still carries the key is
 * now a parse error rather than a silent no-op -- which is the point of removing it in a major.
 */
export const NodeStyle = z.strictObject({
    shape: z
        .strictObject({
            // 0 is legal and draws the smallest visible node; hide a node with `visible: false`.
            // Every shape at one size covers the same extent across the view: the default
            // icosphere's, 1.5 units per unit of size (NODE_EXTENT_PER_SIZE in NodeMesh).
            size: z.number().nonnegative().optional(),
            type: NodeShapes.optional(),
            // The drawn extent along x, y and z, in the units of `size`. Each one left unset keeps
            // the shape's own proportions at `size`.
            width: z.number().nonnegative().optional(),
            height: z.number().nonnegative().optional(),
            depth: z.number().nonnegative().optional(),
            // Draw the node thin along z, as a flat shape facing a 2D camera, even in a 3D view.
            planar: z.boolean().optional(),
            // custom mesh https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/custom/custom
            // import mesh https://doc.babylonjs.com/typedoc/functions/BABYLON.ImportMeshAsync
        })
        .optional(),
    texture: z
        .strictObject({
            color: AdvancedColorStyle.or(ColorStyle).optional(),
            // A node texture from a URL used to be declared here, as a validated `z.url()`, and
            // was read by nothing in this version of the package or any earlier one. A schema
            // that accepts a URL and draws nothing with it is worse than one that refuses it: the
            // consumer is told their image was accepted. It comes back with a renderer and a
            // channel, together, or not at all.
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
                    // 0 draws no glow at all (NodeEffects.applyGlowEffect), the same as no colour.
                    strength: z.number().nonnegative().optional(),
                })
                .optional(),
            outline: z
                .strictObject({
                    // https://forum.babylonjs.com/t/how-to-get-the-perfect-outline/31711
                    //
                    // COLOUR ONLY, and it is a renderer limit rather than an oversight. The
                    // outline is drawn by Babylon's HighlightLayer, whose blur size belongs to
                    // the LAYER and not to a mesh, so every outline on screen is one width
                    // whatever a style asks for. A declared `width` was therefore accepted,
                    // validated and ignored; drawing per-mesh widths needs one highlight layer
                    // per width, which is a full-screen pass each.
                    color: ColorStyle.optional(),
                })
                .optional(),
            wireframe: z.boolean().optional(),
            flatShaded: z.boolean().optional(),
        })
        .optional(),
    // A ring drawn around the node's outline, outside its fill. The width is in the units of
    // `shape.size`, so it scales with the node and with zoom. No width (or 0) draws no border.
    border: z
        .strictObject({
            color: ColorStyle.optional(),
            width: z.number().nonnegative().optional(),
            style: NodeBorderStyles.optional(),
        })
        .optional(),
    label: RichTextStyle.prefault({ location: "top", textColor: "#000000" }).optional(),
    tooltip: RichTextStyle.prefault({
        location: "top-right",
        textColor: "#000000",
        backgroundColor: "#FFFFFF",
    }).optional(),
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
};
