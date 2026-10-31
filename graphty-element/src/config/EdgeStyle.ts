import { z } from "zod";

import { EDGE_CONSTANTS } from "../constants/meshConstants";
import { ColorStyle } from "./common";
import { RichTextStyle } from "./RichTextStyle";

/**
 * Every arrow the edge renderer can draw at the head or tail of an edge, in schema order.
 * Read `EdgeArrowTypes.options` for the list, e.g. to build a picker.
 */
export const EdgeArrowTypes = z.enum([
    // https://graphviz.org/docs/attr-types/arrowType/
    // https://manual.cytoscape.org/en/stable/Styles.html#available-shapes-and-line-styles
    "normal",
    "inverted",
    "dot",
    "sphere-dot",
    "open-dot",
    "none",
    "tee",
    "open-normal",
    "diamond",
    "open-diamond",
    "crow",
    "box",
    "half-open",
    "vee",
    // a half disc, its flat side at the tip (Cytoscape HALF_CIRCLE), and its round side alone
    // (OPEN_HALF_CIRCLE, vis-network inv_curve); the arc turned to bulge at the tip (vis curve)
    "half-circle",
    "open-half-circle",
    "curve",
    // https://js.cytoscape.org/#style/edge-arrow
    "triangle-tee",
    "triangle-cross",
    "circle-triangle",
    // half-open reflected across its line, its one arm on the line's other side (Cytoscape
    // HALF_BOTTOM, where half-open is HALF_TOP)
    "half-open-flipped",
    // a box's outline (Cytoscape OPEN_SQUARE, Cytoscape.js a hollow square)
    "open-box",
    // the arrow's `image`, a picture standing on the line (vis-network arrows type "image")
    "image",
    // a delta with a bar across the line behind it, filled and outlined (Cytoscape CROSS_DELTA,
    // CROSS_OPEN_DELTA)
    "cross-delta",
    "open-cross-delta",
    // the inverted triangle's outline (Graphviz oinv, invempty)
    "open-inverted",
]);

const ArrowStyle = z.strictObject({
    type: EdgeArrowTypes.default("normal").optional(),
    /** 0 draws no cap, and the line runs as it would with none (EdgeMesh.createArrowHead). */
    size: z.number().nonnegative().default(1).optional(),
    /**
     * How wide the cap is drawn across its line, as a multiple of its type's own width: unset or 1
     * keeps the type's proportions, 0.5 draws it half as wide for the same length. Programs differ
     * here (Cytoscape's delta is half as wide as it is long, Graphviz's normal 0.7), so a file's
     * arrows keep their shape through this.
     */
    width: z.number().nonnegative().optional(),
    /**
     * Draw only the half of the cap on one side of its line, cut along the line: `left` or `right`
     * looking along the line toward the cap's tip (Graphviz's `l` and `r` arrow modifiers: `lcrow`,
     * `rdiamond`). Unset, the whole cap.
     */
    side: z.enum(["left", "right"]).optional(),
    /**
     * Where along the line the cap is drawn, as a fraction of the line measured from the cap's own
     * end: unset or 0 at the end, 0.5 at the middle. Above 0 the line runs on to its node and the
     * cap sits on it, pointing the way the line goes at that end.
     */
    position: z.number().min(0).max(1).optional(),
    /**
     * How far from its node the cap is drawn, as a multiple of the cap's own length along its line; the line stops
     * there too, leaving the gap empty (Cytoscape desktop draws its T bar four of its lengths off the node, its half
     * circles one). Unset or 0, the cap touches the node. A cap drawn part-way along (`position`) ignores it.
     */
    gap: z.number().nonnegative().optional(),
    /**
     * More caps drawn in a row behind this one, as Graphviz draws `boxdotnormal` and `lteeoldiamond`: cap types
     * separated by spaces, nearest this one first, each drawn from where the one before it ends, pointing the same way,
     * in this cap's colour and opacity; the line stops at the last. A type may be followed by `:left` or `:right` for
     * the half it keeps (as `side`), then `*` and its size (as `size`; unset, this cap's), then `x` and its width (as
     * `width`): `"dot normal"`, `"open-diamond:left*1.2x0.7"`. A word that is not a cap type draws nothing. Unset,
     * this cap alone. At most 8 are drawn; later ones are left out. A cap drawn part-way along (`position`) draws its
     * row there too.
     */
    stack: z.string().optional(),
    /**
     * The colour to draw the cap in, or unset to follow the line it caps.
     *
     * NO DEFAULT, DELIBERATELY, and the absence is load-bearing. `Edge` draws a cap with
     * `style.arrowHead?.color ?? style.line?.color ?? "#FFFFFF"`, so an unset colour is how an
     * arrow is told to follow its line -- and a default here fills one in whenever the arrow key
     * is present at all, which made that fallback unreachable for the head. With the head pinned
     * and the tail (optional, and absent from the element's defaults) unpinned, one magenta edge
     * with caps at both ends was drawn with a magenta tail and a grey head.
     */
    color: ColorStyle.optional(),
    opacity: z.number().min(0).max(1).default(1).optional(),
    /**
     * The picture an `image` cap draws, a URL or a data URL: stretched over the cap with its top
     * edge across the tip, as long along the line as the cap (`size`) and as wide across it as
     * the cap is long times `width`. A cap of another type ignores it; an `image` cap without one
     * draws nothing. Drawn flat, turned along its line, in 3D as in 2D.
     */
    image: z.string().optional(),
    text: RichTextStyle.optional(),
    /**
     * Where the caption (`text`) sits along the line: unset, beside the cap at this end; set,
     * centered on the line this far from where the line leaves this end's node, in scene units
     * (Cytoscape.js `source-text-offset`, `target-text-offset`).
     */
    textDistance: z.number().optional(),
});

/** A cap drawn part-way along the line: an end cap's settings, with no caption. */
const MidArrowStyle = ArrowStyle.omit({ text: true, textDistance: true, gap: true, stack: true });

/**
 * Every line pattern the edge renderer can draw, in schema order.
 * Read `EdgeLineTypes.options` for the list, e.g. to build a picker.
 */
export const EdgeLineTypes = z.enum([
    // Phase 4: Instanced Mesh Line Patterns
    "solid", // CustomLineRenderer (continuous line)
    "dot", // Circle instances
    "star", // Star instances
    "box", // Square box instances (1:1 aspect ratio)
    "dash", // Elongated box instances (3:1 aspect ratio)
    "diamond", // Diamond instances
    "dash-dot", // Alternating boxes and circles
    "sinewave", // Repeating wave period meshes
    "zigzag", // Repeating zigzag period meshes
    "double", // Two thin parallel lines (Cytoscape desktop PARALLEL_LINES)
    "forward-slash", // Short strokes across the line leaning forward, "/" (Cytoscape FORWARD_SLASH)
    "backward-slash", // Short strokes across the line leaning back (Cytoscape BACKWARD_SLASH)
    "vertical-slash", // Short strokes straight across the line, "|" (Cytoscape VERTICAL_SLASH)
    "separate-arrow", // A row of small arrows, each with its own shaft (Cytoscape SEPARATE_ARROW)
    "contiguous-arrow", // A line with chevrons along it, pointing to the target (Cytoscape CONTIGUOUS_ARROW)
]);

/** The patterns an edge's outline band (`line.outline.type`) can be drawn in. */
export const EdgeOutlineTypes = z.enum(["solid", "dash", "dot", "dash-dot"]);

const LineStyle = z.strictObject({
    type: EdgeLineTypes.optional(),
    animationSpeed: z.number().min(0).optional(),
    /** 0 draws no line, unless `minScreenWidth` is set; the arrow caps and the label are still drawn (Edge.createLine). */
    width: z.number().nonnegative().optional(),
    /**
     * The fewest screen pixels wide the line is drawn, at any zoom: a line whose `width` comes to less
     * on screen, 0 included, is drawn this wide. Unset or 0, the line is drawn at its width alone.
     */
    minScreenWidth: z.number().nonnegative().optional(),
    /**
     * How many pattern elements (dots, dashes, ...) to draw along a patterned edge.
     *
     * Unset means "as many as the spacing rule asks for", which is the historical behaviour:
     * the elements sit one and a half element-widths apart, so a longer edge gets more of
     * them and a THINNER line gets more of them too. Each element is a real mesh with its
     * own draw call, so on a large graph at a small line width that count can reach tens of
     * thousands and the frame rate collapses. Set this to cap it: the elements are then
     * spread evenly over the edge whatever its length or width.
     *
     * It applies to the discrete patterns only (dot, star, box, dash, diamond, dash-dot).
     * Zigzag and sinewave are drawn as fixed-length connected segments that always tile the
     * whole edge, so they ignore it.
     *
     * This is a USER choice, deliberately. The renderer does not silently impose a ceiling,
     * because that would change how a graph looks to buy performance the caller never asked
     * for -- the same reason an algorithm's style layer never mutes another layer.
     *
     * A fraction is drawn rounded down (`discreteMeshCount`), which is what the channel accepts.
     */
    patternCount: z.number().min(2).optional(),
    /**
     * A sinewave or zigzag line's swing to either side of its path, in the line's own width units.
     * Set, the wave is drawn with this swing and `wavePeriod`, and `width` is the thickness of the
     * waving line itself; unset, the wave is drawn within `width`. Cytoscape desktop swings 10 px.
     */
    waveAmplitude: z.number().nonnegative().optional(),
    /**
     * How far along its path a sinewave or zigzag line runs before it repeats, in the line's own
     * width units; used with `waveAmplitude`, which it defaults to four times (as does 0). A sine wave is one
     * crest and one trough a period, each a quadratic arc, drawn as a band whose two edges run
     * `width` apart where it crosses its path and half that at its crests; a zigzag turns every
     * half period. Cytoscape desktop repeats every 20 px.
     */
    wavePeriod: z.number().nonnegative().optional(),
    color: ColorStyle.optional(),
    opacity: z.number().min(0).max(1).optional(),
    /**
     * A band drawn under the line along its whole length (Cytoscape.js `line-outline-*`,
     * vis-network `edges.background`): `width` is how much wider than the line it is, in the
     * line's own width units (half of it each side), `color` and `opacity` its paint, `type` its
     * own pattern: "solid" (the default), "dash", "dot" or "dash-dot" (vis-network's
     * `background.dashes`). No width draws none. Drawn under solid lines; a dotted or dashed line
     * drawn as separate pieces has none.
     */
    outline: z
        .strictObject({
            color: ColorStyle.optional(),
            width: z.number().nonnegative().optional(),
            opacity: z.number().min(0).max(1).optional(),
            type: EdgeOutlineTypes.optional(),
        })
        .optional(),
    /**
     * A band drawn beneath the line along its whole length, `padding` either side of the line's
     * middle (in the line's width units) whatever the line's own width, in `color` at `opacity`
     * (Cytoscape.js `underlay-*`). No opacity, or 0, draws none.
     */
    underlay: z
        .strictObject({
            color: ColorStyle.optional(),
            opacity: z.number().min(0).max(1).optional(),
            padding: z.number().nonnegative().optional(),
        })
        .optional(),
    /** The same band drawn over the line (Cytoscape.js `overlay-*`). */
    overlay: z
        .strictObject({
            color: ColorStyle.optional(),
            opacity: z.number().min(0).max(1).optional(),
            padding: z.number().nonnegative().optional(),
        })
        .optional(),
    /**
     * A gradient the line is painted in, over its `color` (Cytoscape.js `line-fill` with
     * `line-gradient-stop-colors` and `-positions`): `colors` are CSS colors separated by spaces,
     * `stops` where each sits as fractions from 0 to 1 separated by spaces (unset, or not one per
     * color: evenly spaced), and `kind` "linear" from the source end to the target end (the
     * default), "radial" out from the line's middle to both ends, or "none" for no gradient. Fewer
     * than two colors draw none.
     */
    gradient: z
        .strictObject({
            colors: z.string().optional(),
            stops: z.string().optional(),
            kind: z.enum(["linear", "radial", "none"]).optional(),
        })
        .optional(),
    bezier: z.boolean().optional(),
    /**
     * The points the line passes through between its two nodes, as `along,across` pairs separated
     * by spaces: `along` is the fraction of the way from the source node's center to the target's,
     * `across` the distance to the left of that line (y up) as a fraction of its length. Relative, so
     * the route keeps its shape wherever the layout puts the nodes. With `bezier` the corners are
     * rounded. A file's route (yEd bends) arrives here through its style layer. A self-loop has no
     * line between two centers, so its pairs are `x,y` around its node, as `sourcePort` is written;
     * a loop whose points all lie inside its node is drawn as the usual loop.
     */
    bends: z.string().optional(),
    /** The width at the target as a multiple of the width at the source; 1 draws no taper. */
    taper: z.number().min(0).max(4).optional(),
    /** How far the route's middle rises out of a flat layout's plane in the 3D view, world units. */
    lift: z.number().optional(),
    /**
     * How far apart, at their middle, neighboring curved edges between the same two nodes are drawn,
     * in the scene's units. Unset, they are two node radii apart (the larger node's), closer when the
     * nodes are close. A file's fanning distance (Cytoscape's) arrives here through its style layer.
     */
    fanSpacing: z.number().min(0).optional(),
    /**
     * Whether a curved edge is spread apart from the other curved edges joining the same two nodes
     * (unset or true, as Cytoscape fans a bundle), or drawn as its own curve, bowing to the left of
     * its direction whatever its siblings are (false, as Gephi draws every curved edge: two edges
     * joined either way round then bow apart into a lens). A file's rule arrives here through its
     * style layer.
     */
    fanned: z.boolean().optional(),
    /**
     * How a curved line (`bezier`) is drawn through its bends: unset or "corners", straight
     * through each bend with its corner rounded; "midpoints", one smooth curve that uses the bends
     * as its control points rather than passing through them, running from the middle of each
     * segment to the next, pulled toward the bend between them, and leaving each end along its
     * first and last segments (as Cytoscape desktop draws a curved edge through its handles, and
     * the loops it draws itself); "bezier", one Bezier curve whose control points are the bends
     * (one bend a quadratic curve, two a cubic), leaving each end toward the bend next to it (as
     * vis-network draws its smooth edges); "arc", an arc of the circle through both ends and its one
     * bend, the bend on the arc between them (as yEd draws an arc edge, saving the arc's apex as its
     * bend; with another number of bends, drawn as "corners"). A file's rule arrives here through its
     * style layer.
     */
    bendCurve: z.enum(["corners", "midpoints", "bezier", "arc"]).optional(),
    /**
     * The curve a curved line (`bezier`) is drawn as when it does not fan out of a bundle: unset,
     * the element's own bow; a number, an arc of the circle through both node centers whose radius
     * is this many times the distance between them (at least 0.5, a half circle), bowing to the
     * left of the line's direction and cut off where it leaves each node (as Gephi draws a curved
     * edge: its arc curveness 1.2 is a radius of 1 / 1.2). A file's rule arrives here through its
     * style layer.
     */
    arcRadius: z.number().min(0.5).optional(),
    /**
     * Draws a curved line (`bezier`) as one quadratic curve through a support point that a force
     * simulation places, under this force law: `"barnesHut"`, every node and every other support
     * point pushes it away by `supportRepulsion / d^2` and it is pulled toward the middle of the
     * nodes by a constant `supportCentralGravity`; `"forceAtlas2"`, pushed by `supportRepulsion / d`
     * and pulled by `supportCentralGravity * d`. Two springs of half `supportSpringLength`, of
     * stiffness `supportSpringConstant`, tie it to the edge's two nodes. The nodes stay where the
     * layout puts them and only the support points move, so an edge bows away from crowding and
     * edges between the same two nodes bow apart (as vis-network draws its "dynamic" smooth
     * edges: barnesHut and forceAtlas2Based are its solvers of those names). Unset, no support
     * point. A file's setting arrives here through its style layer.
     */
    supportModel: z.enum(["barnesHut", "forceAtlas2"]).optional(),
    /** The support point's springs, together, rest at this length (in `supportUnit`s; 95 when unset). */
    supportSpringLength: z.number().nonnegative().optional(),
    /** How hard the support point's springs pull per unit they are stretched (0.04 when unset). */
    supportSpringConstant: z.number().nonnegative().optional(),
    /** How hard nodes and other support points push the support point away (2000 when unset). */
    supportRepulsion: z.number().nonnegative().optional(),
    /** How hard the support point is pulled toward the middle of the nodes (0.3 when unset). */
    supportCentralGravity: z.number().nonnegative().optional(),
    /**
     * How many scene units one unit of the support's lengths and forces is (1 when unset or 0): a
     * file's constants keep their meaning however its lengths are scaled into the scene.
     */
    supportUnit: z.number().nonnegative().optional(),
    /**
     * What unit the support's lengths and forces are in: `"unit"` (when unset), `supportUnit`'s;
     * `"drawing"`, the drawing's own, the size at which the forces hold the drawn nodes in balance,
     * so a curve bows among nodes any layout placed as among nodes those forces placed themselves
     * (a file whose program lays its nodes out under the same forces, drawn by another layout).
     */
    supportScale: z.enum(["unit", "drawing"]).optional(),
    /**
     * The path the line takes between its nodes, whether or not it is curved: unset, the active
     * layout's choice (the `location-map` layout raises arcs over a flat map in 3D and draws
     * great-circle arcs on its globe; every other layout, and the 2D view, a straight line);
     * "straight", a straight line; "arc", a raised arc in the vertical plane through both ends,
     * bowed toward the viewer (-z); "great-circle", along the great circle about the scene's origin
     * between the two ends, lifted at its middle. A self-loop ignores it.
     */
    route: z.enum(["straight", "arc", "great-circle"]).optional(),
    /**
     * How high a raised route (`route` "arc" or "great-circle") rises at its middle, as a share of
     * the straight distance between its ends (across the map for an arc). Unset, 0.25 for an arc
     * and 0.1 for a great circle, which then rises at most a fifth of the globe's radius; 0 draws it
     * flat.
     */
    arcHeight: z.number().nonnegative().optional(),
    /**
     * How far from each of its nodes' outlines the line stops, in the scene's units, leaving that much empty between
     * the node and the line's end (and the arrow cap there, which moves out with it). Unset or 0, the line meets the
     * outline. A self-loop ignores it. A file's setting (Gephi's `edge.radius`) arrives here through its style layer.
     */
    nodeGap: z.number().nonnegative().optional(),
    /**
     * How far from its source node's outline the line stops, in place of `nodeGap` at that end (Cytoscape.js
     * `source-distance-from-node`). Unset, `nodeGap`.
     */
    sourceNodeGap: z.number().nonnegative().optional(),
    /** How far from its target node's outline the line stops, in place of `nodeGap` at that end; see `sourceNodeGap`. */
    targetNodeGap: z.number().nonnegative().optional(),
    /**
     * Where the line leaves its source node, when not where the line from the node's center crosses
     * its outline: `x,y` from the node's center as fractions of its half width and half height, y up
     * (`"1,0"` is the middle of its right side, `"0,1"` the middle of its top). Relative to the node's
     * size, so the point keeps its place on the node at any size. A file's port (yEd `sx sy`) arrives
     * here through its style layer.
     */
    sourcePort: z.string().optional(),
    /** Where the line meets its target node: written as `sourcePort` is. */
    targetPort: z.string().optional(),
});

/**
 * Everything a style layer can say about how one edge is drawn.
 *
 * TWO FIELDS WERE WITHDRAWN IN 2.0, and both were declared here and drawn by nothing.
 *
 * `tooltip` was a full rich-text block, published through 1.x as a channel and never drawn in
 * any released version: a tooltip appears on hover, and an edge cannot be hovered, because
 * `Edge.ts` sets `isPickable = false` in three places and `PatternedLineMesh` declares it false
 * as a field -- the same fact that leaves the element with no `edge-click` event. Keeping the
 * field would have gone on publishing sixty-two settings that reach no pixel.
 *
 * `enabled` was a switch superseded by the session's visibility mask, which is what decides
 * whether an edge is drawn. Nothing read it. Only the label block's own `enabled` is read, and
 * that one stays.
 *
 * Both removals are recorded in `WITHDRAWN_CAPABILITIES` in `src/catalog/unreachable.ts`, with
 * what a consumer who wrote either one should do instead. This object is strict, so a style
 * document that still carries either key is now a parse error rather than a silent no-op --
 * which is the point of removing them in a major rather than leaving them accepted and ignored.
 */
export const EdgeStyle = z.strictObject({
    arrowHead: ArrowStyle.optional(),
    arrowTail: ArrowStyle.optional(),
    /**
     * A cap drawn part-way along the line, pointing toward the target, besides any at the ends
     * (Cytoscape.js `mid-target-arrow-*`, vis-network `arrows.middle`). Its `position` is how far
     * back from the target end its tip sits, as a fraction of the line: unset, the middle.
     */
    arrowMiddleHead: MidArrowStyle.optional(),
    /** The same, pointing toward the source (Cytoscape.js `mid-source-arrow-*`); `position` from the source end. */
    arrowMiddleTail: MidArrowStyle.optional(),
    line: LineStyle.optional(),
    label: RichTextStyle.prefault({ location: "top" }).optional(),
    /**
     * A second label drawn beside the line's middle (Graphviz's `xlabel` on an edge that also has a label), switched
     * on by its words. It is drawn in the label's look -- font, size, color, outline -- and any field set here wins
     * over the label's. Unset `location`, it sits up and left of the line's middle, its lower right corner on it, or
     * centered where the layout placed it when the layout places one (a Graphviz layout's `xlp`).
     */
    xlabel: RichTextStyle.optional(),
    /**
     * A wider line drawn behind the edge's own, as a casing: the selection look, as a style.
     * Drawn only when it names a colour. `scale` is a multiple of twice the line's width; the
     * `edge.band*` channels write it.
     */
    band: z
        .strictObject({
            color: ColorStyle.optional(),
            scale: z.number().nonnegative().optional(),
            opacity: z.number().min(0).max(1).optional(),
        })
        .optional(),
    /**
     * False stops drawing the edge (its line, caps and words) and nothing else: it stays in the
     * graph, counted, selectable and measured. The `edge.visible` channel writes it.
     * @since 3.26.0
     */
    visible: z.boolean().optional(),
    // effects: glow // https://playground.babylonjs.com/#H1LRZ3#35
});

export type EdgeStyleConfig = z.infer<typeof EdgeStyle>;
export const defaultEdgeStyle: EdgeStyleConfig = {
    line: {
        type: "solid",
        animationSpeed: 0,
        width: EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
        color: "darkgrey",
    },
    // NO ARROWHEAD HERE. Whether an edge has a direction is a fact about the graph, not a
    // default look: the painter adds a `normal` head only when the graph is directed and no layer
    // set the head's type (`StylePainter` `EDGE_BASE_DIRECTED`). Named here, the element's own
    // base layer would write it to every edge and an undirected graph would draw arrows.
};
