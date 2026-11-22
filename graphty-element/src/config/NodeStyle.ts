import { z } from "zod";

import { AdvancedColorStyle, ColorStyle } from "./common";
import { RichTextStyle, TooltipTextStyle } from "./RichTextStyle";

/**
 * How a node's `shape.size` is read: as a multiplier of each shape's own geometry ("scale", the
 * default), as the drawn shape's largest width, height or depth, the same for every shape, 1 unit
 * per unit of size ("diameter"), or as the extent across the view, the same for every shape, 1.5
 * units per unit of size like the default icosphere ("uniform").
 */
export const NodeSizeModes = z.enum(["scale", "diameter", "uniform"]);

/**
 * How a node's drawn size follows the camera (`shape.sizeSpace`, the `node.sizeSpace` channel):
 * - "scene" (the default): plain perspective, a nearer node looks bigger and zooming in grows it.
 * - "pivot": drawn as if it stood at the depth of the point the camera turns about, so near and
 *   far nodes compare as their sizes; zooming still scales it. Only a 3D perspective view with the
 *   orbit camera; elsewhere it is drawn as "scene".
 * - "screen": a node of size `s` covers `s / L` of the view's height at any depth and zoom, where
 *   `L` is the running layout's `nodeScreenReference` (50 when the layout supplies none).
 * An XR session draws every node at its scene size, whatever this says.
 */
export const NodeSizeSpaces = z.enum(["scene", "pivot", "screen"]);

/** How a node's drawn size follows the camera: see {@link NodeSizeSpaces}. */
export type NodeSizeSpace = z.infer<typeof NodeSizeSpaces>;

/** The axis that points up in a model's file, or "detected" to read it from the format. */
export const NodeModelUpAxes = z.enum(["detected", "y", "z", "-y", "-z", "x", "-x"]);

/** How a model fills a node: keeping its proportions, or stretched to width, height and depth. */
export const NodeModelFits = z.enum(["contain", "stretch"]);

/** Where a model's pivot sits on the node: its bounding box's center, or the file's own origin. */
export const NodeModelCenters = z.enum(["bounds", "origin"]);

/**
 * How a node grows to hold its label, when `shape.labelFit` is set: "inside" fits the label's
 * padded box inside the node's outline, so an ellipse or a diamond reaches past the box's corners;
 * "bounds" makes the padded box the node's width and height, whatever its shape.
 * @experimental file-styles
 */
export const NodeLabelFits = z.enum(["inside", "bounds"]);

/**
 * How finely a round node shape is tessellated (`shape.detail`): "full" (the default) is the
 * shape's own mesh; "low" is an icosphere of one subdivision for a sphere, and 8 segments around
 * every other round shape; a number is the segment count (an icosphere's subdivisions). Shapes
 * already drawn with flat faces (box, the polyhedra, goldberg, geodesic, the flat shapes) ignore it.
 */
export const NodeMeshDetails = z.enum(["full", "low"]);

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
    // A rectangle with only its top two or bottom two corners rounded, the other two square
    // (yFiles' `corners`, Cytoscape.js bottom-round-rectangle); `shape.cornerRadius` and its kin
    // round them as they round a round-rectangle's.
    "top-round-rectangle",
    "bottom-round-rectangle",
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
    // Polygons with rounded corners (Cytoscape.js round-*), a tenth of the shorter side round and
    // never more than `shape.cornerRadius`; "round-polygon" rounds the corners of `shape.points`.
    "round-triangle",
    "round-diamond",
    "round-pentagon",
    "round-hexagon",
    "round-octagon",
    "round-polygon",
    // A box with shallow curved corners (Cytoscape.js barrel), and a cylinder seen from the side
    // (vis-network database, a flowchart's stored data).
    "barrel",
    "database",
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
    "top-round-rectangle",
    "bottom-round-rectangle",
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
    "round-triangle",
    "round-diamond",
    "round-pentagon",
    "round-hexagon",
    "round-octagon",
    "round-polygon",
    "barrel",
    "database",
];

/**
 * The line styles a node border is drawn in. Beside the dash patterns: a zigzag or a sine wave
 * running round the node, short strokes across the ring (leaning either way or straight), a ring of small
 * arrows chasing each other round it, or a bar of arrows joined head to tail (Cytoscape desktop's border line
 * types). @public
 * @experimental file-styles
 */
export const NodeBorderStyles = z.enum([
    "solid",
    "dashed",
    "dotted",
    "double",
    "dash-dot",
    "zigzag",
    "sinewave",
    "forward-slash",
    "backward-slash",
    "vertical-slash",
    "separate-arrow",
    "contiguous-arrow",
]);

/**
 * Where a node border sits against the node's size: wholly outside it (the default), centered on
 * it, half in and half out (an SVG or canvas stroke), or wholly inside it, so the node is no larger
 * than its size (Cytoscape desktop). @public
 * @experimental file-styles
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
    /**
     * The node's body: its shape, size, extents, drawing order, and the outline pieces, texts and model drawn as it.
     */
    shape: z
        .strictObject({
            /**
             * The node's size, at least 0. 0 is legal and draws the smallest visible node; hide a node with
             * `visible: false`. What the number measures depends on `sizeMode` below.
             */
            size: z.number().nonnegative().optional(),
            /**
             * How `size` is read, in scene units. Leave it unset for "scale".
             * - "scale" (the default): `size` multiplies the shape's own geometry, so each shape
             *   is drawn at its own largest extent: 1x size for sphere, box and capsule, 1.25x
             *   for torus-knot, 1.5x for icosphere, torus and goldberg, 1.6x for cylinder and cone,
             *   1.7x for geodesic, and 1.5x to 2.8x for the polyhedra. A node that sets `width`,
             *   `height`, `depth` or `planar`, and a flat shape, is drawn at the common node
             *   extent instead: 1.5 units across per unit (NODE_EXTENT_PER_SIZE in NodeMesh).
             * - "diameter": `size` is the largest width, height or depth of the drawn shape, 1
             *   unit per unit of size, so a size-1 octahedron is 1 unit wide, like a size-1 sphere.
             *   `width`, `height`, `depth` and a border's width are read in the same units.
             * - "uniform": every shape at one size covers the same extent across the view, the
             *   default icosphere's, 1.5 units per unit of size, as a graph file's node size means.
             *   Styles read from another program's file use it.
             */
            sizeMode: NodeSizeModes.optional(),
            /**
             * How the drawn size follows the camera: see `NodeSizeSpaces`. Unset, the graph-wide
             * `layoutBehavior.node.sizeSpace`, and "scene" when that is unset too.
             */
            sizeSpace: NodeSizeSpaces.optional(),
            /**
             * How finely a round shape is tessellated: "full" (the default), "low", or a segment count. See
             * `NodeMeshDetails`.
             */
            detail: NodeMeshDetails.or(z.number().int().min(1)).optional(),
            /** The shape drawn (see `NodeShapes`); the placeholder and fallback while `model` loads or fails. */
            type: NodeShapes.optional(),
            /**
             * The drawn extent along x, in the units of `size`. Each of `width`, `height` and `depth` left
             * unset keeps the shape's own proportions at `size`.
             */
            width: z.number().nonnegative().optional(),
            /** The drawn extent along y, in the units of `size`; unset keeps the shape's own proportions. */
            height: z.number().nonnegative().optional(),
            /** The drawn extent along z, in the units of `size`; unset keeps the shape's own proportions. */
            depth: z.number().nonnegative().optional(),
            /**
             * Read `width`, `height` and `depth` as multiples of `size`, so changing the size keeps
             * the stretch: width 2 at size 3 is drawn 6 wide. Unset or false reads them as extents.
             * A painted style carries the extents already multiplied, with this flag beside them.
             */
            relativeExtents: z.boolean().optional(),
            /** Draw the node thin along z, as a flat shape facing a 2D camera, even in a 3D view. */
            planar: z.boolean().optional(),
            /**
             * Drawing order in a 2D view: below 0 draws the node behind every edge and every node
             * with a higher value (a group behind its members). 3D views ignore it.
             */
            zIndex: z.number().min(-1000).max(0).optional(),
            /**
             * Which of two overlapping nodes at z-index 0 is drawn on top in a 2D view: the higher.
             * Set, a node is drawn in front of every edge and every node without one. 3D ignores it.
             */
            drawOrder: z.number().min(0).max(100).optional(),
            /**
             * A round-rectangle's largest corner radius, in the units of `size`. Unset, the
             * corners are a quarter of the shorter side; set, they are never larger than that.
             * The round-* polygons' corners are a tenth of the shorter side, never larger than it.
             */
            cornerRadius: z.number().nonnegative().optional(),
            /**
             * Draw `cornerRadius` as given, up to half the shorter side (a pill at half), rather
             * than capped at a quarter of it (round-rectangle) or a tenth (the round-* polygons),
             * as Cytoscape.js and vis-network draw a radius a file sets. Unset or false keeps the caps.
             */
            exactCornerRadius: z.boolean().optional(),
            /**
             * The share of the shorter side a round-rectangle's corners are rounded by when
             * `exactCornerRadius` is not set, never more than `cornerRadius`: unset, a quarter, as
             * Cytoscape.js rounds; Cytoscape desktop rounds an eighth, Graphviz a third. At most a half.
             */
            cornerFraction: z.number().min(0).max(0.5).optional(),
            /**
             * A "polygon" node's corners, as `x,y` pairs separated by spaces: each relative to the
             * node's center as fractions of its half width and half height, y up ("0,1 1,-1 -1,-1"
             * is a triangle). The outline is stretched so its farthest corners reach the node's
             * sides. A node that grows to hold its label (`labelFit`) grows by as far as its corners
             * reach past 1, as Graphviz grows a distorted polygon. Other shapes ignore it. A coordinate may
             * add a length in the units of `size` after its fraction, so a piece keeps its size whatever the
             * node's: "-1+24" is 24 in from the left side, "0+6" 6 above the middle (here, in `parts` and in
             * `lines`).
             */
            points: z.string().optional(),
            /**
             * Whether a "polygon" node's corners are stretched about its center until the farthest
             * on each axis reach its sides (unset or true), or drawn exactly where they say, as
             * fractions of its half width and half height (false): a regular polygon whose corners
             * lie on the ellipse inside the node's box stays that size, as OGDF draws its
             * triangles, pentagons, hexagons and octagons. Other shapes ignore it.
             */
            stretchPoints: z.boolean().optional(),
            /**
             * Turns a flat shape's outline this many degrees clockwise about the node's center, after
             * it is drawn at its width and height (Pajek's `phi` turns an ellipse 20 x 30 into a
             * tilted one). Its fill, border and the edges that end at it turn with it; its label does
             * not. Unset or 0, unturned. Solids ignore it.
             */
            rotation: z.number().optional(),
            /**
             * Further closed pieces of a flat node's body, beside its outline: polygons as `x,y` pairs
             * separated by spaces, one polygon after another separated by ";", each point relative to
             * the node's center as fractions of its half width and half height, y up, drawn where they
             * say (never stretched). Each is filled as the node is and outlined in its border's color
             * and width, centered on the polygon: a Graphviz `assembly` is two bars, a `noverhang` four.
             */
            parts: z.string().optional(),
            /**
             * Lines drawn over a flat node in its border's color, as `parts` gives polygons: open
             * polylines (one that ends where it starts is closed), centered on their points, `lineWidth`
             * wide (unset, the border's width): a Graphviz `promoter`'s baseline, a `box3d`'s edges.
             */
            lines: z.string().optional(),
            /** The width of each of `lines`, in the units of `size`; unset, the border's width. */
            lineWidth: z.number().nonnegative().optional(),
            /**
             * A wider line drawn under each of `lines`, down the same path, in its own color: `lineHaloWidth` wide
             * (unset or 0, none), as yFiles draws a bevel's line of 1 over a lighter one of 2.
             */
            lineHaloColor: ColorStyle.optional(),
            /** The width of the halo under each of `lines`, in the units of `size`; unset or 0 draws none. */
            lineHaloWidth: z.number().nonnegative().optional(),
            /**
             * Further texts drawn over a flat node in its label's font, size and color, each one line centered on its
             * point: a JSON list of `[x, y, text]`, the point relative to the node's center as fractions of its half
             * width and half height, y up, as `parts` places its corners (Graphviz's record fields:
             * `[[-0.66, 0, "a"], [0, 0, "b"], [0.66, 0, "c"]]`). A fourth item gives what differs from the label
             * (`{ "size": 0.2, "color": "#404040", "font": "Arial", "rotation": 45 }`, the size a share of the node's
             * height: a chart's item labels). Drawn whatever the label says, beside it.
             */
            texts: z.string().optional(),
            /**
             * The label laid out as a table of cells, as JSON (see the `node.labelTable` channel): drawn in place of
             * the label's own words, each cell's outline a line over the node and each line of its text centered in
             * its place; with `labelFit` the table is the label's box the node grows round.
             */
            labelTable: z.string().optional(),
            /**
             * Grow the node to hold its label (see NodeLabelFits): `width` and `height` (or `size`)
             * become its least size, and its label's box -- as wide as its widest line, as tall as
             * its lines at one font size each -- plus `labelPaddingX` on the left and right and
             * `labelPaddingY` above and below, in the units of `size`, decides the rest. With
             * `labelFitSquare` it stays as wide as it is tall. `labelFitQuantum` rounds the padded box up to a
             * multiple of it each way before the outline is fitted. Unset, the node is the size it states.
             */
            labelFit: NodeLabelFits.optional(),
            /** With `labelFit`, the room left and right of the label's box, in the units of `size`. */
            labelPaddingX: z.number().nonnegative().optional(),
            /** With `labelFit`, the room above and below the label's box, in the units of `size`. */
            labelPaddingY: z.number().nonnegative().optional(),
            /** With `labelFit`, keep the node as wide as it is tall. */
            labelFitSquare: z.boolean().optional(),
            /** With `labelFit`, round the padded box up to a multiple of this each way before the outline is fitted. */
            labelFitQuantum: z.number().nonnegative().optional(),
            /**
             * With `labelFit`, the node holds its picture (`image.src`) too: the picture's own pixels, each this
             * long in the units of `size`, padded by `labelFitImagePadding` on each side; the larger of the padded
             * label and the padded picture decides each way. The node is fitted again once the picture's size is
             * read. Unset, the picture does not size the node.
             */
            labelFitImage: z.number().nonnegative().optional(),
            /** With `labelFitImage`, the room on each side of the picture, in the units of `size`. */
            labelFitImagePadding: z.number().nonnegative().optional(),
            /**
             * The node takes its picture's (`image.src`) proportions: its box grows the longer way until the picture,
             * at its own proportions, covers its `width` and `height` (else `size`), as vis-network sizes an image
             * node. The node is fitted again once the picture's size is read; until then, and for a picture that
             * cannot be read, it keeps its own box. `labelFit` sizes the node instead when it is set.
             */
            imageAspect: z.boolean().optional(),
            /**
             * Draw the node as a loaded 3D model instead of `type`: an asset id ("asset:...") or a
             * URL. `type` stays the placeholder while it loads and the fallback when it fails
             * (design/rendering/node-models.md).
             */
            model: z.string().optional(),
            /** The axis that points up in the model's file; "detected" reads it from the format. */
            modelSourceUp: NodeModelUpAxes.optional(),
            /** A turn about the up axis after `modelSourceUp`, in degrees. */
            modelTurn: z.number().min(-360).max(360).optional(),
            /**
             * true multiplies the model's base color by the node color; "replace" paints it flat;
             * "untextured" paints flat only the parts with no picture and no vertex colors. A part
             * the file gives no material takes the node color whatever this says.
             */
            modelTint: z.union([z.boolean(), z.literal("replace"), z.literal("untextured")]).optional(),
            /** The clip the model plays, by its name in the file; "" (or unset) draws it still. */
            modelAnimation: z.string().optional(),
            /** How fast the clip plays: 1 is the file's speed, 0 holds the frame at modelAnimationOffset. */
            modelAnimationSpeed: z.number().min(0).max(16).optional(),
            /** Seconds into the clip the node starts at (with speed 0, the pose it holds). */
            modelAnimationOffset: z.number().min(0).optional(),
            /** Draw both faces of every triangle (true), only the front (false), or as the file says ("file"). */
            modelDoubleSided: z.union([z.boolean(), z.literal("file")]).optional(),
            /** "contain" keeps proportions; "stretch" fills width, height and depth separately. */
            modelFit: NodeModelFits.optional(),
            /** "bounds" centers the bounding box on the node; "origin" keeps the file's pivot. */
            modelCenter: NodeModelCenters.optional(),
            // custom mesh https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/custom/custom
            // import mesh https://doc.babylonjs.com/typedoc/functions/BABYLON.ImportMeshAsync
        })
        .optional(),
    /** What the node's surface is painted with: a color, an icon or an image. */
    texture: z
        .strictObject({
            /** The node's fill color: a CSS color, or a gradient or radial color style. */
            color: AdvancedColorStyle.or(ColorStyle).optional(),
            /**
             * `node.texture`: an image asset id or URL, drawn as a model's base color texture or a
             * built-in shape's surface (design/rendering/node-models.md section 2.8).
             */
            image: z.string().optional(),
            // pieChart: z.string().or(z.null()).default(null), // https://manual.cytoscape.org/en/stable/Styles.html#using-graphics-in-styles
            // shader: z.url().or(z.null()).default(null), // https://doc.babylonjs.com/features/featuresDeepDive/materials/shaders/
            // bumpmap: z.url().or(z.null()).default(null), // https://doc.babylonjs.com/features/featuresDeepDive/materials/using/moreMaterials/#bump-map
            // refraction // https://forum.babylonjs.com/t/how-to-make-a-semi-transparent-glass-ball-with-a-through-hole-with-albedotexture/27357/24
            // reflection // https://doc.babylonjs.com/features/featuresDeepDive/materials/using/reflectionTexture/
        })
        .optional(),
    /** Effects drawn on the node: glow, outline, the selection halo, wireframe, flat shading and unlit drawing. */
    effect: z
        .strictObject({
            /** A glow around the node. No color, or a strength of 0, draws none. */
            glow: z
                .strictObject({
                    // https://doc.babylonjs.com/features/featuresDeepDive/mesh/glowLayer
                    /** The glow's color. */
                    color: ColorStyle.optional(),
                    /** 0 draws no glow at all (NodeEffects.applyGlowEffect), the same as no color. */
                    strength: z.number().nonnegative().optional(),
                })
                .optional(),
            /** Draw the node's mesh as a wireframe. */
            wireframe: z.boolean().optional(),
            /** Shade each face of the node's mesh flat rather than smooth. */
            flatShaded: z.boolean().optional(),
            /** Drawn in the node's own color with no light or shade, as 2D draws every node. */
            unlit: z.boolean().optional(),
        })
        .optional(),
    /**
     * A ring drawn around the node's outline, outside its fill. The width is in the units of
     * `shape.size`, so it scales with the node and with zoom. No width (or 0) draws no border.
     */
    border: z
        .strictObject({
            /** The border's color. */
            color: ColorStyle.optional(),
            /** The border's width, in the units of `shape.size`, so it scales with the node and with zoom. */
            width: z.number().nonnegative().optional(),
            /**
             * Screen pixels, the same at every zoom (vis-network draws its borders so). Set, it is
             * drawn in place of `width`, and never wider than the node.
             */
            screenWidth: z.number().nonnegative().optional(),
            /** 0..1; 0 draws no border, as a width of 0 does. */
            opacity: z.number().min(0).max(1).optional(),
            /** The line style the border is drawn in (see `NodeBorderStyles`). */
            style: NodeBorderStyles.optional(),
            /**
             * Where the ring sits against the node's size. "outside" (unset): the fill is the size
             * and the ring is drawn beyond it. "center": the ring's middle runs along the size, so
             * the fill shrinks by the border's width. "inside": the ring's outer edge is the size,
             * so the fill shrinks by twice the border's width (to nothing, for a node no larger
             * than its border) and the ring by as much as it must.
             */
            position: NodeBorderPositions.optional(),
            /**
             * A zigzag or sinewave border's swing to either side of the ring's middle, in the units
             * of `width`. Set, the wave is drawn with this swing and `wavePeriod`, and `width` is the
             * thickness of the waving line; unset, the wave is drawn within the ring. A sine wave's
             * periods are each drawn straight from where they start along the outline (Cytoscape
             * desktop's), so on a small node they loop out past it.
             */
            waveAmplitude: z.number().nonnegative().optional(),
            /**
             * How far round the outline the wave runs before it repeats, in the units of `width`;
             * used with `waveAmplitude`, which it defaults to four times (as does 0).
             */
            wavePeriod: z.number().nonnegative().optional(),
        })
        .optional(),
    /**
     * A second ring drawn outside the border, `offset` beyond its outer edge (Cytoscape.js
     * `outline-*`): its color, its width and offset in the units of the border's width, its
     * opacity and its line style. `count` (default 1, a fraction rounded down) draws that many rings, each `offset` beyond
     * the one before (Graphviz's `peripheries`). No width, or an opacity of 0, draws none.
     */
    outerBorder: z
        .strictObject({
            /** The ring's color. */
            color: ColorStyle.optional(),
            /** The ring's width, in the units of the border's width. */
            width: z.number().nonnegative().optional(),
            /** The ring's opacity, 0..1; 0 draws none. */
            opacity: z.number().min(0).max(1).optional(),
            /** The line style the ring is drawn in (see `NodeBorderStyles`). */
            style: NodeBorderStyles.optional(),
            /** How far beyond the border's outer edge the ring is drawn, in the units of the border's width. */
            offset: z.number().optional(),
            /**
             * How many rings to draw, each `offset` beyond the one before; a fraction is rounded down. 1 by default.
             */
            count: z.number().min(1).optional(),
        })
        .optional(),
    /**
     * Strips `width` wide along the inside of the node's edge, in the units of the border's width: `lightColor` on its
     * left and top and `darkColor` on its bottom and right, so the node looks raised (yEd's 3D rectangle). They are cut
     * to the node's outline. No width draws none.
     */
    raisedBorder: z
        .strictObject({
            /** The strips' width, in the units of the border's width; no width draws none. */
            width: z.number().nonnegative().optional(),
            /** The color of the strips on the node's left and top. */
            lightColor: ColorStyle.optional(),
            /** The color of the strips on the node's bottom and right. */
            darkColor: ColorStyle.optional(),
        })
        .optional(),
    /**
     * A shadow drawn behind the node (yEd's drop shadow): the node's own shape in `color` at `opacity`, moved
     * `offsetX` right and `offsetY` down, its edge fading over `blur` on each side; lengths in the units of
     * `shape.size`. No opacity, or 0, draws none.
     */
    shadow: z
        .strictObject({
            /** The shadow's color. */
            color: ColorStyle.optional(),
            /** The shadow's opacity, 0..1; unset or 0 draws none. */
            opacity: z.number().min(0).max(1).optional(),
            /** How far the shadow's edge fades on each side, in the units of `shape.size`. */
            blur: z.number().nonnegative().optional(),
            /** How far right the shadow is moved, in the units of `shape.size`. */
            offsetX: z.number().optional(),
            /** How far down the shadow is moved, in the units of `shape.size`. */
            offsetY: z.number().optional(),
        })
        .optional(),
    /**
     * A filled shape drawn behind the node (Cytoscape.js `underlay-*`): `padding` beyond the node's
     * box on every side, in the units of `shape.size`, in `color` at `opacity`, as `shape` (unset,
     * the node's own) with `cornerRadius` for a rounded one. No opacity, or 0, draws none.
     */
    underlay: z
        .strictObject({
            /** The underlay's color. */
            color: ColorStyle.optional(),
            /** The underlay's opacity, 0..1; unset or 0 draws none. */
            opacity: z.number().min(0).max(1).optional(),
            /** How far the underlay reaches beyond the node's box on every side, in the units of `shape.size`. */
            padding: z.number().nonnegative().optional(),
            /** The underlay's shape; unset, the node's own. */
            shape: NodeShapes.optional(),
            /** The corner radius of a rounded underlay shape. */
            cornerRadius: z.number().nonnegative().optional(),
        })
        .optional(),
    /**
     * The same filled shape drawn over the node, its face and border (Cytoscape.js `overlay-*`).
     */
    overlay: z
        .strictObject({
            /** The overlay's color. */
            color: ColorStyle.optional(),
            /** The overlay's opacity, 0..1; unset or 0 draws none. */
            opacity: z.number().min(0).max(1).optional(),
            /** How far the overlay reaches beyond the node's box on every side, in the units of `shape.size`. */
            padding: z.number().nonnegative().optional(),
            /** The overlay's shape; unset, the node's own. */
            shape: NodeShapes.optional(),
            /** The corner radius of a rounded overlay shape. */
            cornerRadius: z.number().nonnegative().optional(),
        })
        .optional(),
    /**
     * A picture drawn over the node's face (Cytoscape.js `background-image`, vis-network's image
     * nodes, yEd's image nodes, Cytoscape's image custom graphics). `src` is its URL (a `data:`
     * URL too), and `fallback` the picture drawn when that one cannot be loaded. `fit` sizes it: "contain" (the default) keeps its proportions inside the node,
     * "cover" keeps them over the whole node, "fill" stretches it to the node, "none" draws it at
     * `width` x `height` (a side left unset keeps the picture's proportions to the one given, or with
     * `autoSize` "natural" is the picture's own pixels times `pixelSize`), or at its own pixels times
     * `pixelSize` each. `positionX` / `positionY` place it across the room the node leaves (0 the
     * left or top, 0.5 the middle, the default, 1 the right or bottom), `offsetX` / `offsetY` move
     * it (y down); lengths are in the units of `shape.size`. `repeat` tiles it ("repeat",
     * "repeat-x", "repeat-y"; "no-repeat" the default), `clip` "node" (the default) keeps it inside
     * the node's outline and "none" lets it reach past, `smoothing` false draws its pixels as
     * squares, and `opacity` is 0..1. A node with shape "none" and an image is drawn as the image.
     */
    image: z
        .strictObject({
            /** The picture's URL; a `data:` URL too. */
            src: z.string().optional(),
            /** The picture drawn when `src` cannot be loaded. */
            fallback: z.string().optional(),
            /** How the picture is sized: "contain" (the default), "cover", "fill" or "none". */
            fit: z.enum(["contain", "cover", "fill", "none"]).optional(),
            /** With `fit` "none", the picture's width, in the units of `shape.size`. */
            width: z.number().nonnegative().optional(),
            /** With `fit` "none", the picture's height, in the units of `shape.size`. */
            height: z.number().nonnegative().optional(),
            /**
             * The length of one of the picture's pixels, in the units of `shape.size`, when it is drawn at its own
             * pixels.
             */
            pixelSize: z.number().nonnegative().optional(),
            /**
             * With `fit` "none", how a side left unset is sized: "proportional" to the other, or "natural", the
             * picture's own pixels times `pixelSize`.
             */
            autoSize: z.enum(["proportional", "natural"]).optional(),
            /**
             * Where the picture sits across the room the node leaves: 0 the left, 0.5 the middle (the default), 1 the
             * right.
             */
            positionX: z.number().optional(),
            /**
             * Where the picture sits across the room the node leaves: 0 the top, 0.5 the middle (the default), 1 the
             * bottom.
             */
            positionY: z.number().optional(),
            /** How far right the picture is moved, in the units of `shape.size`. */
            offsetX: z.number().optional(),
            /** How far down the picture is moved, in the units of `shape.size`. */
            offsetY: z.number().optional(),
            /** How the picture is tiled: "no-repeat" (the default), "repeat", "repeat-x" or "repeat-y". */
            repeat: z.enum(["no-repeat", "repeat", "repeat-x", "repeat-y"]).optional(),
            /** "node" (the default) keeps the picture inside the node's outline; "none" lets it reach past. */
            clip: z.enum(["node", "none"]).optional(),
            /** False draws the picture's pixels as squares. */
            smoothing: z.boolean().optional(),
            /** The picture's opacity, 0..1. */
            opacity: z.number().min(0).max(1).optional(),
        })
        .optional(),
    /**
     * A pie chart drawn over the node's face (Cytoscape.js `pie-*`, Graphviz `style=wedged`,
     * Cytoscape's pie and ring charts): `colors` are CSS colors separated by spaces, one slice
     * each; `sizes` each slice's share of the turn as fractions separated by spaces (a slice with
     * none shares what the others leave; the slices stop at a full turn); `opacities` each
     * slice's, 0..1. The disc is `radius` (default 1) times half the node's shorter side, or the
     * ellipse filling the node with `fitBox`; `hole` cuts a hole that fraction of the radius out
     * of its middle (a ring); the slices run clockwise from `rotation` degrees clockwise from 12
     * o'clock (default 0). `offsetX` / `offsetY` move the pie's center from the node's (y down), in
     * the units of `shape.size`.
     */
    pie: z
        .strictObject({
            /** The slices' CSS colors, separated by spaces, one per slice. */
            colors: z.string().optional(),
            /**
             * Each slice's share of the turn, as fractions separated by spaces; a slice with none shares what the
             * others leave.
             */
            sizes: z.string().optional(),
            /** Each slice's opacity, 0..1, separated by spaces. */
            opacities: z.string().optional(),
            /** The disc's radius as a multiple of half the node's shorter side; 1 by default. */
            radius: z.number().nonnegative().optional(),
            /** The fraction of the radius cut out of the middle, making a ring; 0..1. */
            hole: z.number().min(0).max(1).optional(),
            /** Where the first slice starts, in degrees clockwise from 12 o'clock; 0 by default. */
            rotation: z.number().optional(),
            /** Draw the pie as the ellipse filling the node instead of a disc. */
            fitBox: z.boolean().optional(),
            /** How far right the pie's center is moved from the node's, in the units of `shape.size`. */
            offsetX: z.number().optional(),
            /** How far down the pie's center is moved from the node's, in the units of `shape.size`. */
            offsetY: z.number().optional(),
        })
        .optional(),
    /**
     * Bands of color drawn over the node's face, inside its outline (Cytoscape.js `stripe-*`,
     * Graphviz `style=striped`): `colors`, `sizes` and `opacities` as a pie's, the bands following
     * one another top to bottom (`direction` "down", the default) or left to right ("right"),
     * over a box `size` (default 1) times the node's, centered on it. `frame`, four fractions
     * "top right bottom left" (of the box's height and width), keeps only the rim that deep inside
     * the box's edges, so the bands frame what the node shows in the middle.
     */
    stripes: z
        .strictObject({
            /** The bands' CSS colors, separated by spaces, one per band. */
            colors: z.string().optional(),
            /** Each band's share of the box, as fractions separated by spaces. */
            sizes: z.string().optional(),
            /** Each band's opacity, 0..1, separated by spaces. */
            opacities: z.string().optional(),
            /**
             * Which way the bands follow one another: "down" (the default, top to bottom) or "right" (left to right).
             */
            direction: z.enum(["down", "right"]).optional(),
            /** The box the bands fill, as a multiple of the node's; 1 by default. */
            size: z.number().nonnegative().optional(),
            /** Four fractions "top right bottom left" of the box's height and width: only the rim that deep is kept. */
            frame: z.string().optional(),
        })
        .optional(),
    /**
     * A chart drawn over the node's face (Cytoscape's bar, line, box and heat map charts): `kind`
     * "bar" (the default) draws a bar per value side by side, "stacked-bar" one bar of the values
     * piled up, "line" a line through the values, "box" a box and whiskers (`values` are the low
     * whisker, the lower quartile, the median, the upper quartile and the high whisker), "cells" a
     * row of colored cells, one per value. `values` are numbers separated by spaces; `colors` CSS
     * colors separated by spaces, item i drawn in color i and the last color for the rest (a box's
     * whiskers in the first, its median in the second, else black). The plot is a box `size`
     * (default 1) times the node's (`width` and `height`, shares of the node's, give its sides
     * apart), centered on it or moved by `offsetX` / `offsetY` (in the units of `shape.size`, y
     * down); the values run along it from `min` (default the
     * smaller of 0 and the least value) to `max` (default the greatest), bottom to top, or left to
     * right with `horizontal`; the categories run along the other side, left to right or top to
     * bottom, each an equal share after `margin` (a share of the side, default 0) at each end and
     * `gap` (a share of the side, default 0) split between them. A bar runs from 0 (or the nearer
     * end of the range) to its value. `lineWidth` is a line's and a whisker's width, `borderWidth` /
     * `borderColor` a bar's and a box's outline, in the units of `shape.size`. `backgroundColor` at
     * `backgroundOpacity` (default 1) fills the plot box under the chart; unset, the plot has no fill.
     */
    chart: z
        .strictObject({
            /** The chart drawn: "bar" (the default), "stacked-bar", "line", "box" or "cells". */
            kind: z.enum(["bar", "stacked-bar", "line", "box", "cells"]).optional(),
            /** The values, as numbers separated by spaces; a box chart's are its five whisker and quartile values. */
            values: z.string().optional(),
            /** CSS colors separated by spaces: item i in color i, and the last color for the rest. */
            colors: z.string().optional(),
            /** The low end of the value range; unset, the smaller of 0 and the least value. */
            min: z.number().optional(),
            /** The high end of the value range; unset, the greatest value. */
            max: z.number().optional(),
            /** Run the values left to right rather than bottom to top. */
            horizontal: z.boolean().optional(),
            /** The plot box as a multiple of the node's size; 1 by default. */
            size: z.number().nonnegative().optional(),
            /** The plot box's width as a share of the node's, apart from its height. */
            width: z.number().nonnegative().optional(),
            /** The plot box's height as a share of the node's, apart from its width. */
            height: z.number().nonnegative().optional(),
            /** How far right the plot box is moved, in the units of `shape.size`. */
            offsetX: z.number().optional(),
            /** How far down the plot box is moved, in the units of `shape.size`. */
            offsetY: z.number().optional(),
            /** The share of the category side left empty at each end; 0 by default. */
            margin: z.number().optional(),
            /** The share of the category side split between the categories; 0..1, 0 by default. */
            gap: z.number().min(0).max(1).optional(),
            /** A line's and a whisker's width, in the units of `shape.size`. */
            lineWidth: z.number().nonnegative().optional(),
            /** The color of a bar's and a box's outline. */
            borderColor: ColorStyle.optional(),
            /** The width of a bar's and a box's outline, in the units of `shape.size`. */
            borderWidth: z.number().nonnegative().optional(),
            /** The color the plot box is filled with under the chart; unset, no fill. */
            backgroundColor: ColorStyle.optional(),
            /** The plot box fill's opacity, 0..1; 1 by default. */
            backgroundOpacity: z.number().min(0).max(1).optional(),
        })
        .optional(),
    /**
     * A character or a short text drawn over the node's face, centered on it (vis-network's icon
     * nodes, a font's icon glyph): `text` in the CSS font family `font` (unset, sans-serif) at
     * `size` (the font's size, in the units of `shape.size`; unset, the node's shorter side) and CSS
     * `weight` (unset, 400), in `color` (unset, black). A node with shape "none" and a glyph is
     * drawn as the glyph. No text draws none.
     */
    glyph: z
        .strictObject({
            /** The character or short text drawn; none draws no glyph. */
            text: z.string().optional(),
            /** The CSS font family; unset, sans-serif. */
            font: z.string().optional(),
            /** The font's size, in the units of `shape.size`; unset, the node's shorter side. */
            size: z.number().nonnegative().optional(),
            /** The CSS font weight, 1..1000; unset, 400. */
            weight: z.number().min(1).max(1000).optional(),
            /** The glyph's color; unset, black. */
            color: ColorStyle.optional(),
        })
        .optional(),
    /**
     * How a group drawn round its members -- a node other nodes name as their parent, with no box
     * of its own -- is sized (a Cytoscape.js compound parent). Its members' box, their labels in it
     * with `includeLabels`, is made at least `minWidth` by `minHeight` (the added width going
     * `minWidthBiasLeft` of it to the left, 0..1, and the added height `minHeightBiasTop` of it
     * upward; unset, half each way), then grown by `padding` on every side, or by `paddingRatio`
     * times the members' box's `paddingOf` side (`width`, `height`, their `average`, the `min` or
     * the `max` of the two; unset, `width`). Lengths are in the units of `shape.size`. Unset, a
     * group reaches its largest member's radius past its members.
     */
    group: z
        .strictObject({
            /** How far the group reaches past its members' box on every side, in the units of `shape.size`. */
            padding: z.number().nonnegative().optional(),
            /** Padding as a multiple of the members' box's `paddingOf` side, in place of `padding`. */
            paddingRatio: z.number().nonnegative().optional(),
            /** Which side `paddingRatio` multiplies: "width" (the default), "height", "average", "min" or "max". */
            paddingOf: z.enum(["width", "height", "average", "min", "max"]).optional(),
            /** The least width of the members' box, before padding, in the units of `shape.size`. */
            minWidth: z.number().nonnegative().optional(),
            /** The least height of the members' box, before padding, in the units of `shape.size`. */
            minHeight: z.number().nonnegative().optional(),
            /** The share, 0..1, of width added by `minWidth` that goes to the left; unset, half. */
            minWidthBiasLeft: z.number().min(0).max(1).optional(),
            /** The share, 0..1, of height added by `minHeight` that goes upward; unset, half. */
            minHeightBiasTop: z.number().min(0).max(1).optional(),
            /** Count the members' labels in the members' box. */
            includeLabels: z.boolean().optional(),
        })
        .optional(),
    /** The node's label: its words, font, colors, place and background. Unset fields default to the top, in black (light gray under a dark color scheme). */
    label: RichTextStyle.prefault({ location: "top", textColor: "#000000" }).optional(),
    /**
     * A second label drawn outside the node, beside it (Graphviz's `xlabel`), switched on by its words. It is drawn
     * in the label's look -- font, size, color, outline -- and any field set here wins over the label's. Unset
     * `location`, it sits against the node's top left corner outside it (its own lower right corner on the node's
     * box's upper left), or where the layout placed it when the layout places one (a Graphviz layout's `xlp`).
     */
    xlabel: RichTextStyle.optional(),
    /** The node's tooltip, in the label's style vocabulary. Unset fields default to the top right, black on white. */
    tooltip: TooltipTextStyle.optional(),
    /**
     * False stops drawing the node (its mesh and words) and nothing else: it stays in the graph,
     * counted, laid out, selectable and measured. The `node.visible` channel writes it.
     * @since 3.26.0
     */
    visible: z.boolean().optional(),
});

/** A node style as {@link NodeStyle} parses it: everything a style layer can say about how one node is drawn. */
export type NodeStyleConfig = z.infer<typeof NodeStyle>;
/** The element's default node style: an icosphere of size 1, colored #6366F1. */
export const defaultNodeStyle: NodeStyleConfig = {
    shape: {
        type: "icosphere",
        size: 1,
    },
    texture: {
        color: "#6366F1",
    },
};
