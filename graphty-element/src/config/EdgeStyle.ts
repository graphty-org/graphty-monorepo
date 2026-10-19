import { z } from "zod/v4";

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
     * Where along the line the cap is drawn, as a fraction of the line measured from the cap's own
     * end: unset or 0 at the end, 0.5 at the middle. Above 0 the line runs on to its node and the
     * cap sits on it, pointing the way the line goes at that end.
     */
    position: z.number().min(0).max(1).optional(),
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
    text: RichTextStyle.optional(),
    /**
     * Where the caption (`text`) sits along the line: unset, beside the cap at this end; set,
     * centered on the line this far from where the line leaves this end's node, in scene units
     * (Cytoscape.js `source-text-offset`, `target-text-offset`).
     */
    textDistance: z.number().optional(),
});

/** A cap drawn part-way along the line: an end cap's settings, with no caption. */
const MidArrowStyle = ArrowStyle.omit({ text: true, textDistance: true });

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
]);

const LineStyle = z.strictObject({
    type: EdgeLineTypes.optional(),
    animationSpeed: z.number().min(0).optional(),
    /** 0 draws no line; the arrow caps and the label are still drawn (Edge.createLine). */
    width: z.number().nonnegative().optional(),
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
    color: ColorStyle.optional(),
    opacity: z.number().min(0).max(1).optional(),
    /**
     * A band drawn under the line along its whole length (Cytoscape.js `line-outline-*`,
     * vis-network `edges.background`): `width` is how much wider than the line it is, in the
     * line's own width units (half of it each side), `color` and `opacity` its paint. No width
     * draws none. Drawn under solid lines; a dotted or dashed line drawn as separate pieces has none.
     */
    outline: z
        .strictObject({
            color: ColorStyle.optional(),
            width: z.number().nonnegative().optional(),
            opacity: z.number().min(0).max(1).optional(),
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
     * the loops it draws itself). A file's rule arrives here through its style layer.
     */
    bendCurve: z.enum(["corners", "midpoints"]).optional(),
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
    // NO COLOUR HERE EITHER. This object is parsed once into the base every painted edge is
    // filled out from, so a colour named here reaches every edge in the graph and no layer
    // beneath the arrow channels can be seen past it. Unset, a cap follows the line it caps.
    arrowHead: ArrowStyle.parse({
        type: "normal",
    }),
};
