import { z } from "zod/v4";

import { AdvancedColorStyle, ColorStyle } from "./common";
import { RichTextStyle } from "./RichTextStyle";

/**
 * How a node's `shape.size` is read: as a scale on the common node extent, 1.5 units across the
 * view per unit of size for every shape ("scale", the default), or as the drawn shape's largest
 * width, height or depth, 1 unit per unit of size ("diameter").
 */
export const NodeSizeModes = z.enum(["scale", "diameter"]);

/**
 * How a node grows to hold its label, when `shape.labelFit` is set: "inside" fits the label's
 * padded box inside the node's outline, so an ellipse or a diamond reaches past the box's corners;
 * "bounds" makes the padded box the node's width and height, whatever its shape.
 */
export const NodeLabelFits = z.enum(["inside", "bounds"]);

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
 * always meets a wall and the shape is seen from both sides. The slab is thin in every view, so it
 * reads as a flat 2D shape (a plaque in a 3D view); `shape.depth` makes it deeper.
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
    // A polygon of any corners, given by `shape.points` (Graphviz's distorted and skewed polygons).
    "polygon",
    // Pajek's vertex shapes: a plus-shaped cross, a house, the man and woman figures of its
    // genealogies, and "none", a node with no body that draws only its label (Pajek's empty).
    "cross",
    "house",
    "man",
    "woman",
    "none",
]);

/**
 * The node shapes that are a 2D outline rather than a solid: the shapes graph files from 2D tools
 * name. Each is an outline extruded into a thin slab, so in 2D and 3D views alike the node reads
 * as the flat shape; `shape.depth` makes it deeper.
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
    "polygon",
    "cross",
    "house",
    "man",
    "woman",
    "none",
];

/** The line styles a node border is drawn in. @public */
export const NodeBorderStyles = z.enum(["solid", "dashed", "dotted", "double", "dash-dot"]);

/**
 * Where a node border sits against the node's size: wholly outside it (the default), centered on
 * it, half in and half out (an SVG or canvas stroke), or wholly inside it, so the node is no larger
 * than its size (Cytoscape desktop). @public
 */
export const NodeBorderPositions = z.enum(["outside", "center", "inside"]);

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
            // What the number measures depends on `sizeMode` below.
            size: z.number().nonnegative().optional(),
            // How `size` is read, in scene units. Leave it unset for "scale".
            // - "scale" (the default): every shape at one size covers the same extent across the
            //   view, the default icosphere's: 1.5 units per unit of size (NODE_EXTENT_PER_SIZE in
            //   NodeMesh).
            // - "diameter": `size` is the largest width, height or depth of the drawn shape, 1
            //   unit per unit of size, so a size-1 octahedron is 1 unit wide, like a size-1 sphere.
            //   `width`, `height`, `depth` and a border's width are read in the same units.
            sizeMode: NodeSizeModes.optional(),
            type: NodeShapes.optional(),
            // The drawn extent along x, y and z, in the units of `size`. Each one left unset keeps
            // the shape's own proportions at `size`.
            width: z.number().nonnegative().optional(),
            height: z.number().nonnegative().optional(),
            depth: z.number().nonnegative().optional(),
            // Draw the node thin along z, as a flat shape facing a 2D camera, even in a 3D view.
            planar: z.boolean().optional(),
            // Drawing order in a 2D view: below 0 draws the node behind every edge and every node
            // with a higher value (a group behind its members). 3D views ignore it.
            zIndex: z.number().min(-1000).max(0).optional(),
            // Which of two overlapping nodes at z-index 0 is drawn on top in a 2D view: the higher.
            // Set, a node is drawn in front of every edge and every node without one. 3D ignores it.
            drawOrder: z.number().min(0).max(100).optional(),
            // A round-rectangle's largest corner radius, in the units of `size`. Unset, the
            // corners are a quarter of the shorter side; set, they are never larger than that.
            cornerRadius: z.number().nonnegative().optional(),
            // A "polygon" node's corners, as `x,y` pairs separated by spaces: each relative to the
            // node's center as fractions of its half width and half height, y up ("0,1 1,-1 -1,-1"
            // is a triangle). The outline is stretched so its farthest corners reach the node's
            // sides. A node that grows to hold its label (`labelFit`) grows by as far as its corners
            // reach past 1, as Graphviz grows a distorted polygon. Other shapes ignore it.
            points: z.string().optional(),
            // Grow the node to hold its label (see NodeLabelFits): `width` and `height` (or `size`)
            // become its least size, and its label's box -- as wide as its widest line, as tall as
            // its lines at one font size each -- plus `labelPaddingX` on the left and right and
            // `labelPaddingY` above and below, in the units of `size`, decides the rest. With
            // `labelFitSquare` it stays as wide as it is tall. Unset, the node is the size it states.
            labelFit: NodeLabelFits.optional(),
            labelPaddingX: z.number().nonnegative().optional(),
            labelPaddingY: z.number().nonnegative().optional(),
            labelFitSquare: z.boolean().optional(),
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
            // Screen pixels, the same at every zoom (vis-network draws its borders so). Set, it is
            // drawn in place of `width`, and never wider than the node.
            screenWidth: z.number().nonnegative().optional(),
            // 0..1; 0 draws no border, as a width of 0 does.
            opacity: z.number().min(0).max(1).optional(),
            style: NodeBorderStyles.optional(),
            // Where the ring sits against the node's size. "outside" (unset): the fill is the size
            // and the ring is drawn beyond it. "center": the ring's middle runs along the size, so
            // the fill shrinks by the border's width. "inside": the ring's outer edge is the size,
            // so the fill shrinks by twice the border's width (to nothing, for a node no larger
            // than its border) and the ring by as much as it must.
            position: NodeBorderPositions.optional(),
        })
        .optional(),
    /**
     * A second ring drawn outside the border, `offset` beyond its outer edge (Cytoscape.js
     * `outline-*`): its color, its width and offset in the units of the border's width, its
     * opacity and its line style. No width, or an opacity of 0, draws none. Unlike
     * `effect.outline`, a highlight drawn over the node's rim, this is a ring of its own.
     */
    outerBorder: z
        .strictObject({
            color: ColorStyle.optional(),
            width: z.number().nonnegative().optional(),
            opacity: z.number().min(0).max(1).optional(),
            style: NodeBorderStyles.optional(),
            offset: z.number().optional(),
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
