import { z } from "zod/v4";

import { EDGE_CONSTANTS } from "../constants/meshConstants";
import { ColorStyle } from "./common";
import { RichTextStyle } from "./RichTextStyle";

const ArrowType = z.enum([
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
]);

const ArrowStyle = z.strictObject({
    type: ArrowType.default("normal").optional(),
    size: z.number().positive().default(1).optional(),
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
});

const LineType = z.enum([
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
    type: LineType.optional(),
    animationSpeed: z.number().min(0).optional(),
    width: z.number().positive().optional(),
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
     */
    patternCount: z.number().int().min(2).optional(),
    color: ColorStyle.optional(),
    opacity: z.number().min(0).max(1).optional(),
    bezier: z.boolean().optional(),
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
