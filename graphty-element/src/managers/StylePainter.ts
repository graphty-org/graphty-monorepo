import { cloneDeep, defaultsDeep, get } from "lodash";

import { BadgeStyleManager } from "../BadgeStyleManager";
import type { LabelBadge } from "../catalog/label-style";
import type { Channel, LabelStyle, Rgba } from "../catalog/types";
import {
    defaultEdgeStyle,
    defaultNodeStyle,
    EdgeStyle,
    type EdgeStyleConfig,
    NodeStyle,
    type NodeStyleConfig,
    RichTextStyle,
} from "../config";
import { asColorValue, CHANNEL_DESCRIPTORS, toColorValue } from "../session/styles/channels";
import type { SelectorTarget } from "../session/styles/predicate";
import type { ElementPaint, ResolvedStyle } from "../session/styles/repaint";

/**
 * What the renderer draws one node as, once the session's style stack has resolved it.
 *
 * THE COLOUR IS NOT IN THE STYLE. It is beside it, because the two halves go to two different
 * places: {@link NodePaint.style} builds the SOURCE mesh, which every node of the same shape and
 * size shares, and {@link NodePaint.color} is written into that node's own instance. Putting the
 * colour in the style would put it in the source mesh's material, and one material per colour is
 * one source mesh per colour -- fifty thousand of them for a continuous ramp.
 */
export interface NodePaint {
    /** Which source mesh this node is drawn from. */
    readonly meshKey: string;
    /** The style the source mesh, the label and the effects are built from. */
    readonly style: NodeStyleConfig;
    /** The colour to write into this node's instance, or null when no layer painted one. */
    readonly color: Rgba | null;
}

/**
 * What the renderer draws one edge as, once the session's style stack has resolved it.
 *
 * THE COLOUR IS IN THE STYLE HERE, and that is a fact about the edge renderer rather than a
 * disagreement with {@link NodePaint}. A bezier, a patterned line and a 2D solid line are built
 * per edge and are not instances of anything, and the one line that IS cached -- a 3D solid --
 * carries its colour in a `StandardMaterial` the cache keys. So an edge's colour keys its mesh
 * until the edge renderer grows a per-instance buffer of its own, and {@link EdgePaint.meshKey}
 * says so by carrying the colour.
 */
export interface EdgePaint {
    /** Which source mesh this edge is drawn from. */
    readonly meshKey: string;
    /** The style the line, the arrows and the label are built from. */
    readonly style: EdgeStyleConfig;
}

/** The colour a source mesh's material is built in when the instance carries the real one. */
const NEUTRAL_HEX = "#FFFFFF";

/** The node style every painted node is filled out from, parsed once. */
const NODE_BASE: NodeStyleConfig = NodeStyle.parse(defaultNodeStyle);

/** The edge style every painted edge is filled out from, parsed once. */
const EDGE_BASE: EdgeStyleConfig = EdgeStyle.parse(defaultEdgeStyle);

/** No elements were repainted, which is what an unbound painter drains. */
const NOTHING: readonly number[] = Object.freeze([]);

/**
 * Write one value at a dotted path, building the objects on the way.
 * @param bag - The style being built.
 * @param path - The dotted path the channel declares, such as `effect.outline.color`.
 * @param value - What to write there.
 */
function setAtPath(bag: Record<string, unknown>, path: string, value: unknown): void {
    const segments = path.split(".");
    let held = bag;

    for (let at = 0; at < segments.length - 1; at++) {
        const next = held[segments[at]];

        if (typeof next === "object" && next !== null) {
            held = next as Record<string, unknown>;
            continue;
        }

        const made: Record<string, unknown> = {};
        held[segments[at]] = made;
        held = made;
    }

    held[segments[segments.length - 1]] = value;
}

/**
 * The block a leaf belongs to: its dotted path with the last segment taken off.
 *
 * `label.text` is in `label`, and `arrowHead.text.text` is in `arrowHead.text`. That is the block
 * whose `enabled` flag switches the words on, and the only reason it is worth a function is that
 * getting it wrong is silent -- a flag written into a field that does not exist is merged into
 * the defaults rather than rejected, so the words resolve, the paint carries them, and nothing is
 * drawn.
 * @param path - The dotted path of a leaf.
 * @returns The path of the block holding it, or the empty string when the leaf is at the top.
 * @internal
 */
function blockOf(path: string): string {
    return path.split(".").slice(0, -1).join(".");
}

/**
 * Which rich-text key each label field is written to, where the only difference is the name.
 *
 * A TABLE RATHER THAN A LADDER OF IFS, because the ladder is what rotted. Each `if` had to be
 * written by hand, so the seven that existed when channels were introduced stayed seven while
 * `RichTextLabel` went on drawing margins, pointers, badges, shadows and depth fade that no
 * layer could ask for -- and seventeen stories were deleted rather than migrated because of it.
 * The fields that are NOT a plain rename are handled beneath this, and every one of them is
 * covered by a case in `test/session/styles/label-style.test.ts`.
 */
const RICH_TEXT_KEYS = {
    enabled: "enabled",
    font: "font",
    sizePx: "fontSize",
    color: "textColor",
    lineHeight: "lineHeight",
    textAlign: "textAlign",
    background: "backgroundColor",
    padding: "backgroundPadding",
    cornerRadius: "cornerRadius",
    borderWidth: "borderWidth",
    borderColor: "borderColor",
    gradient: "backgroundGradient",
    gradientType: "backgroundGradientType",
    gradientDirection: "backgroundGradientDirection",
    location: "location",
    attachOffset: "attachOffset",
    marginTop: "marginTop",
    marginBottom: "marginBottom",
    marginLeft: "marginLeft",
    marginRight: "marginRight",
    pointer: "pointer",
    pointerDirection: "pointerDirection",
    pointerWidth: "pointerWidth",
    pointerHeight: "pointerHeight",
    pointerOffset: "pointerOffset",
    pointerCurve: "pointerCurve",
    outlineWidth: "textOutlineWidth",
    shadow: "textShadow",
    shadowColor: "textShadowColor",
    shadowBlur: "textShadowBlur",
    shadowOffsetX: "textShadowOffsetX",
    shadowOffsetY: "textShadowOffsetY",
    animation: "animation",
    animationSpeed: "animationSpeed",
    depthFade: "depthFadeEnabled",
    depthFadeNear: "depthFadeNear",
    depthFadeFar: "depthFadeFar",
    badge: "badge",
    icon: "icon",
    iconPosition: "iconPosition",
    progress: "progress",
    smartOverflow: "smartOverflow",
    maxNumber: "maxNumber",
    overflowSuffix: "overflowSuffix",
} as const satisfies Partial<Record<keyof LabelStyle, string>>;

/** Every key the renderer's own label schema holds, which is what may be written into it. */
const RICH_TEXT_FIELDS: ReadonlySet<string> = new Set(Object.keys(RichTextStyle.shape));

/**
 * The appearance a badge brings with it, as rich-text keys.
 *
 * WHY THE PAINTER APPLIES THIS AND NOT THE RENDERER. A badge is a whole look -- a notification is
 * a red pill in bold white lettering -- and `RichTextLabel` does declare all of it. It merges
 * those declarations UNDER whatever the caller passed, so that a caller who names a colour keeps
 * it, which is right. What defeats it is that the caller here is never a person: a painted label
 * arrives as a fully filled-in style, every optional field already carrying the schema's own
 * default, so the merge finds a value for every key a badge wanted to set and the badge changes
 * nothing at all. Asking for a badge produced a label in plain black Verdana, in this version and
 * in 1.x, and the story that was supposed to show one asserted nothing and so never said so.
 *
 * Applied here, against the layer's own writes rather than against a filled-in style, a badge
 * fills in what the layer did not ask for -- which is what it was always meant to do.
 * @param badge - The badge the layer asked for.
 * @returns Its appearance, in the renderer's spelling, with its private bookkeeping left out.
 */
function badgeAppearance(badge: LabelBadge): Record<string, unknown> {
    const declared = BadgeStyleManager.getBadgeStyle(badge) ?? {};
    const kept: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(declared)) {
        // The badge table also carries the renderer's own private bookkeeping -- `_smartSizing`,
        // `_paddingRatio` -- which is not part of the label schema and is applied by the renderer
        // itself. Only what the schema holds may be written into a style.
        if (RICH_TEXT_FIELDS.has(key) && value !== undefined) {
            kept[key] = value;
        }
    }

    return kept;
}

/**
 * Turn the label vocabulary into the rich-text block the label renderer reads.
 *
 * THE TWO SHAPES DISAGREE AND THE TRANSLATION LIVES HERE, once. {@link LabelStyle} is the closed
 * vocabulary a layer writes, named for what a reader sees, and `RichTextStyle` is the schema the
 * renderer has drawn from since before there were channels, named for what the canvas code does.
 * Mapping them in one place is what keeps the channel table honest: a channel that says it paints
 * a label really does, in every field the vocabulary publishes.
 *
 * THREE FIELDS ARE NOT A PLAIN RENAME. A weight is stringified, because the renderer takes the
 * CSS spelling and a reader may write the number. An outline COLOUR switches the outline on,
 * because a colour is the thing a reader points at and `textOutline: false` with a colour beside
 * it draws nothing. And the gradient colours are copied, because the list a layer holds is
 * frozen and the renderer's schema parses a mutable one.
 * @param style - The label style a layer painted.
 * @returns The rich-text fields it corresponds to.
 */
function richTextOf(style: LabelStyle): Record<string, unknown> {
    const text: Record<string, unknown> = {};
    const keys: Readonly<Record<string, string | undefined>> = RICH_TEXT_KEYS;

    for (const [field, value] of Object.entries(style)) {
        const key = keys[field];

        if (key !== undefined && value !== undefined) {
            text[key] = value;
        }
    }

    if (style.weight !== undefined) {
        text.fontWeight = String(style.weight);
    }

    if (style.outline !== undefined) {
        text.textOutline = true;
        text.textOutlineColor = style.outline;
    }

    if (style.gradientColors !== undefined) {
        text.backgroundGradientColors = [...style.gradientColors];
    }

    if (style.badge !== undefined) {
        // UNDER the layer's own writes, never over them: a layer that asks for a notification
        // badge in green gets a green one.
        for (const [key, value] of Object.entries(badgeAppearance(style.badge))) {
            text[key] ??= value;
        }
    }

    return text;
}

/**
 * Write one painted channel into the style being built.
 *
 * DERIVED FROM THE CHANNEL TABLE, never from a list written out here. Every channel declares
 * where its value lands in a parsed style, so a channel added to the table lands in the right
 * place without this file being edited -- which is the same reason the element's own base layers
 * are read out of the defaults rather than restated.
 * @param bag - The style being built.
 * @param channel - The channel the pass painted.
 * @param value - What it painted.
 */
function writeChannel(bag: Record<string, unknown>, channel: Channel, value: unknown): void {
    const descriptor = CHANNEL_DESCRIPTORS[channel];

    if (!descriptor.renderable) {
        return;
    }

    if (descriptor.accepts === "labelStyle") {
        // FIELD BY FIELD, never the block. `stylePath` is the whole label here, and writing the
        // block would clobber whatever the `node.label` channel put in `label.text`. The one leaf
        // both channels write is `enabled`, and which of them wins is settled by the order
        // {@link inWriteOrder} hands them over in rather than by which key the resolver happened
        // to fill first.
        for (const [field, setting] of Object.entries(richTextOf(value as LabelStyle))) {
            setAtPath(bag, `${descriptor.stylePath}.${field}`, setting);
        }

        return;
    }

    const color = asColorValue(value);
    setAtPath(bag, descriptor.stylePath, color === null ? value : color.hex);

    if (descriptor.accepts === "text") {
        // A label, a tooltip or an arrow caption is drawn only when it is switched on, and a
        // layer that wrote the words has switched it on. Without this the text is resolved,
        // kept, and never drawn. A label style that says `enabled: false` overrides this,
        // because it is written after.
        //
        // THE FLAG IS THE WORDS' OWN SIBLING, not the first segment of the path. Every text
        // channel published before the arrow captions landed its words two segments deep --
        // `label.text`, `tooltip.text` -- so the first segment and the leaf's parent were the
        // same block and the difference never showed. A caption's words are three deep,
        // `arrowHead.text.text`, and the first segment would switch on `arrowHead.enabled`,
        // which is not a field of an arrow style at all: the caption would be resolved, kept and
        // never drawn, and nothing would have said so.
        setAtPath(bag, `${blockOf(descriptor.stylePath)}.enabled`, true);
    }
}

/**
 * The order a pass's resolved channels are written to one style in.
 *
 * ONLY ONE PAIR OF CHANNELS OVERLAPS, and it overlaps on purpose. `node.label` writes the words
 * and switches the label on; `node.labelStyle` can switch it back off while leaving the words
 * where they are, which is how a layer hides labels on part of a graph without taking the text
 * away from the layers beneath it. Both land on `label.enabled`, so one of them has to be last.
 *
 * WITHOUT THIS IT WAS WHICHEVER THE RESOLVER FILLED FIRST -- the insertion order of a plain
 * object built by the repaint -- so the same two layers could switch a label off or leave it on
 * depending on the order they happened to be added in. Sorting here costs one pass over at most
 * a couple of dozen entries and makes the answer the same every time.
 * @param resolved - Everything the stack painted this element.
 * @returns The same entries, with the label styles last.
 */
function inWriteOrder(resolved: ResolvedStyle): [string, unknown][] {
    const last = (name: string): number => (CHANNEL_DESCRIPTORS[name as Channel]?.accepts === "labelStyle" ? 1 : 0);

    return Object.entries(resolved).sort(([left], [right]) => last(left) - last(right));
}

/**
 * Build one node's paint from the channels the pass resolved for it.
 * @param resolved - Everything the stack painted this node.
 * @param meshKey - The key the interner gave this node's geometry.
 * @returns The paint.
 */
function nodePaintOf(resolved: ResolvedStyle, meshKey: number): NodePaint {
    const bag: Record<string, unknown> = {};
    let color: Rgba | null = null;
    let opacity: number | undefined;

    for (const [name, value] of inWriteOrder(resolved)) {
        const channel = name as Channel;

        if (channel === "node.color") {
            const painted = asColorValue(value);
            color = painted === null ? null : { r: painted.r, g: painted.g, b: painted.b, a: painted.a };
            continue;
        }

        if (channel === "node.opacity") {
            opacity = typeof value === "number" ? value : undefined;
            continue;
        }

        writeChannel(bag, channel, value);
    }

    // The material is built neutral so that what shows is the instance's own colour. Opacity goes
    // in, because Babylon keeps `visibility` on the SOURCE mesh rather than on an instance -- so
    // an opacity encoding still mints one source mesh per distinct opacity, and the key below says
    // so. Moving it takes a per-instance alpha buffer in `NodeMesh`, which a colour does not.
    setAtPath(
        bag,
        "texture.color",
        opacity === undefined ? NEUTRAL_HEX : { colorType: "solid", value: NEUTRAL_HEX, opacity },
    );

    return {
        meshKey: opacity === undefined ? `s${String(meshKey)}` : `s${String(meshKey)}o${String(opacity)}`,
        style: defaultsDeep(bag, cloneDeep(NODE_BASE)) as NodeStyleConfig,
        color,
    };
}

/**
 * Build one edge's paint from the channels the pass resolved for it.
 * @param resolved - Everything the stack painted this edge.
 * @param meshKey - The key the interner gave this edge's geometry.
 * @returns The paint.
 */
function edgePaintOf(resolved: ResolvedStyle, meshKey: number): EdgePaint {
    const bag: Record<string, unknown> = {};

    for (const [name, value] of inWriteOrder(resolved)) {
        writeChannel(bag, name as Channel, value);
    }

    // See EdgePaint: the edge renderer has no per-instance state, so the two channels the interner
    // left out of the key have to go back into the renderer's own. Read in a fixed order rather
    // than as the loop above happens to meet them, or two edges painted alike would key two meshes
    // whenever their columns were filled in a different order.
    const color = asColorValue(resolved["edge.color"]);
    const opacity = resolved["edge.opacity"];
    const identity = `s${String(meshKey)}|${color?.hex ?? ""}|${opacity === undefined ? "" : String(opacity)}`;

    return { meshKey: identity, style: spellEdgeColours(defaultsDeep(bag, cloneDeep(EDGE_BASE)) as EdgeStyleConfig) };
}

/** The colour fields of an edge style, each a hex string when set. */
const EDGE_COLOUR_PATHS = ["line.color", "arrowHead.color", "arrowTail.color"] as const;

/**
 * Spell every colour of an edge style the way the engine spells a resolved one: lowercase hex.
 *
 * ONE SPELLING, WHOEVER WROTE THE COLOUR. A colour a layer resolved arrives as the engine's
 * lowercase hex; one nothing resolved is filled in from `defaultEdgeStyle`, whose grey the schema
 * parses to `#A9A9A9`. `Edge.paintFrom` decides whether a pass has to rebuild an edge by comparing
 * the pass's style with the one the edge was built from, and two spellings of one colour read as
 * two styles -- which, between the bootstrap paint and the first pass, rebuilt every edge of every
 * load once, and Babylon's dispose costs the size of the scene (issue #388). So both the bootstrap
 * paint and every resolved paint go through this.
 * @param style - The filled-out style; edited in place and returned.
 * @returns The same style.
 */
function spellEdgeColours(style: EdgeStyleConfig): EdgeStyleConfig {
    for (const path of EDGE_COLOUR_PATHS) {
        const raw: unknown = get(style, path);
        const painted = toColorValue(typeof raw === "string" ? raw : undefined);

        if (painted !== null) {
            setAtPath(style as unknown as Record<string, unknown>, path, painted.hex);
        }
    }

    return style;
}

/**
 * The paint a node or an edge is built from before the session has anything to say about it.
 *
 * WHY THIS EXISTS AT ALL. A Node is constructed, and only then does the store hand it the dense
 * row index the session's paint is addressed by -- so for the length of that gap there is no
 * index to ask the painter about, and a Node with no mesh is a Node that cannot be positioned,
 * picked or given an edge. The element's own defaults fill the gap, and the first repaint
 * replaces them.
 *
 * MODULE-LEVEL RATHER THAN A METHOD, because `GraphContext.getStylePainter` is optional: a
 * context built without a painter still has to be able to build a node, so the bootstrap cannot
 * be reached through one.
 *
 * NEUTRAL MATERIAL, COLOUR BESIDE IT -- the same split {@link nodePaintOf} produces, and for the
 * same reason. A bootstrap built straight from `NodeStyle.parse(defaultNodeStyle)` would put the
 * colour in the source mesh's material, which is a material the session's own neutral one can
 * never match, so the first repaint would rebuild every node's mesh rather than write one buffer
 * value per node.
 *
 * ITS KEY IS RESERVED AND MATCHES NOTHING THE SESSION MINTS. The interner's keys are `s0`, `s1`
 * and so on in the order a style was first seen, and they are session-local: a bootstrap that
 * borrowed `s0` would be handed back out of the mesh cache for whatever style the session
 * happened to intern first, which is the bootstrap's geometry drawn under another style's name.
 * The cost of a distinct key is one rebuild per element on the first repaint, paid once at load;
 * the cost of a collision is a graph drawn at the wrong size with nothing to see it.
 *
 * ONE OBJECT, SHARED BY EVERY ELEMENT. An edge asks what it looks like on nearly every frame, so
 * an allocation here would be one per edge per frame; and a copy held per element would be a
 * copy of the whole style schema for every element in the graph. The style table these replace
 * shared its objects the same way, and nothing on the drawing path writes to a resolved style --
 * every reader takes values out of it and builds a mesh, a material or a label from them.
 */
const BOOTSTRAP_MESH_KEY = "graphty-bootstrap";

/** The one node paint every unpainted node is drawn from, built on first use. */
let bootstrapNode: NodePaint | null = null;

/** The one edge paint every unpainted edge is drawn from, built on first use. */
let bootstrapEdge: EdgePaint | null = null;

/**
 * What a node looks like between its construction and the first repaint.
 *
 * Built on first use rather than at module load, because `defaultNodeStyle` is a mutable exported
 * object: a constant built when this module was first imported would freeze whatever it happened
 * to say then, which is the same reason the session builds its base layers per session.
 * @returns The element's own default node paint. The same object every call.
 */
export function bootstrapNodePaint(): NodePaint {
    if (bootstrapNode === null) {
        const style = cloneDeep(NODE_BASE);
        const painted = toColorValue(typeof style.texture?.color === "string" ? style.texture.color : undefined);

        setAtPath(style as unknown as Record<string, unknown>, "texture.color", NEUTRAL_HEX);

        bootstrapNode = {
            meshKey: BOOTSTRAP_MESH_KEY,
            style,
            color: painted === null ? null : { r: painted.r, g: painted.g, b: painted.b, a: painted.a },
        };
    }

    return bootstrapNode;
}

/**
 * What an edge looks like between its construction and the first repaint.
 *
 * The colour stays IN the style here, because the edge renderer has no per-instance state to
 * carry one. See {@link EdgePaint}.
 * @returns The element's own default edge paint. The same object every call.
 */
export function bootstrapEdgePaint(): EdgePaint {
    if (bootstrapEdge === null) {
        // Spelled as a resolved paint is (see spellEdgeColours), so the first pass finds the
        // placeholder deep-equal to what it hands an untouched edge and rebuilds nothing.
        bootstrapEdge = { meshKey: BOOTSTRAP_MESH_KEY, style: spellEdgeColours(cloneDeep(EDGE_BASE)) };
    }

    return bootstrapEdge;
}

/**
 * Who paints an element, and what they paint it.
 *
 * THE SESSION'S STYLE STACK IS THE ONLY ONE. There used to be two -- the jmespath layers a 1.x
 * style template carried, and the session's compiled stack -- and this class held the rule that
 * decided which of them drew a graph, because an element painted by both is painted by whichever
 * one wrote last. The template is gone, so the question is gone with it: {@link StylePainter.owns}
 * now asks only whether a session is bound at all, which is false for the moment between a graph
 * being built and its first style pass and for a graph constructed with no session behind it.
 *
 * What fills that moment is {@link bootstrapNodePaint} and {@link bootstrapEdgePaint}: the
 * element's own defaults, in the shape a session pass produces, so the first pass writes a colour
 * rather than rebuilding a graph.
 */
export class StylePainter {
    /** What the last pass painted, or null while no session is bound. */
    private paint: ElementPaint | null = null;

    /** The nodes whose paint the renderer has not applied yet. */
    private readonly pendingNodes = new Set<number>();

    /** The edges whose paint the renderer has not applied yet. */
    private readonly pendingEdges = new Set<number>();

    /** How to stop listening to the pass currently bound, or null when nothing is bound. */
    private stopListening: (() => void) | null = null;

    /**
     * Say where the renderer reads its paint from.
     *
     * SUBSCRIBING IS PART OF BINDING, and it is what makes the dirty set reliable. A pass's dirty
     * set is one scratch array that the next pass empties, so it can only be read at the moment
     * the pass ends -- which is what `ElementPaint.onPainted` announces. A caller that read it
     * after awaiting its own pass was reading it turns of the event loop later, by which time
     * another pass had begun and taken the set away; the whole-graph repaint a load ends with was
     * the pass that lost its set that way, leaving every node in the graph drawn from the
     * appearance the element gives a node it has not styled yet.
     *
     * Passing null unbinds it, which puts every element back on the element's own defaults.
     * @param paint - What the last style pass painted, or null.
     */
    bind(paint: ElementPaint | null): void {
        this.stopListening?.();
        this.stopListening = null;
        this.paint = paint;
        this.pendingNodes.clear();
        this.pendingEdges.clear();

        if (paint !== null) {
            this.stopListening = paint.onPainted(() => {
                this.markPainted();
            });
        }
    }

    /**
     * Whether a session's style stack is bound and therefore has something to say.
     * @returns True when a style pass has been bound to this painter.
     */
    get owns(): boolean {
        return this.paint !== null;
    }

    /**
     * Remember what the pass that just finished repainted, so the renderer can catch up.
     *
     * READ NOW, DRAWN LATER, AND THAT IS WHY IT IS COPIED. `lastPainted` is a view onto the
     * pass's own scratch array and the next pass overwrites it, but the renderer applies its half
     * on the next frame -- so the indices are taken here, at the announcement, and held until the
     * frame that draws them.
     *
     * CALLED FROM THE ANNOUNCEMENT, AND ONLY FROM THERE, which is the whole of why the copy is
     * sound: the pass that painted these elements is still the pass that owns the array. Called
     * anywhere else -- after awaiting a pass, on a later event, on the next frame -- it copies
     * whichever pass happens to own it by then.
     */
    markPainted(): void {
        const { paint } = this;

        if (paint === null) {
            return;
        }

        const nodes = paint.lastPainted("node");

        for (let at = 0; at < nodes.length; at++) {
            this.pendingNodes.add(nodes[at]);
        }

        const edges = paint.lastPainted("edge");

        for (let at = 0; at < edges.length; at++) {
            this.pendingEdges.add(edges[at]);
        }
    }

    /**
     * Whether anything is waiting to be drawn.
     * @returns True when a pass has painted something the renderer has not applied.
     */
    get hasPending(): boolean {
        return this.pendingNodes.size > 0 || this.pendingEdges.size > 0;
    }

    /**
     * Take the nodes waiting to be drawn.
     * @returns Their dense indices. The set is emptied.
     */
    takeNodes(): readonly number[] {
        if (this.pendingNodes.size === 0) {
            return NOTHING;
        }

        const taken = [...this.pendingNodes];
        this.pendingNodes.clear();

        return taken;
    }

    /**
     * Take the edges waiting to be drawn.
     * @returns Their dense indices. The set is emptied.
     */
    takeEdges(): readonly number[] {
        if (this.pendingEdges.size === 0) {
            return NOTHING;
        }

        const taken = [...this.pendingEdges];
        this.pendingEdges.clear();

        return taken;
    }

    /**
     * Put every element back in the queue, because the render objects have changed under it.
     *
     * A dataset load, a clear or a 2D/3D switch replaces the meshes the last pass's paint was
     * applied to, and an index the pass never touched is still an element that now needs drawing.
     * @param nodes - How many nodes the renderer holds.
     * @param edges - How many edges it holds.
     */
    invalidate(nodes: number, edges: number): void {
        for (let index = 0; index < nodes; index++) {
            this.pendingNodes.add(index);
        }

        for (let index = 0; index < edges; index++) {
            this.pendingEdges.add(index);
        }
    }

    /**
     * What one node is painted.
     * @param index - Its dense index.
     * @returns The paint, or null when nothing is bound or the index is not an element's.
     */
    nodePaint(index: number): NodePaint | null {
        const { paint } = this;

        if (paint === null || index < 0) {
            return null;
        }

        return nodePaintOf(paint.styleOf("node", index), paint.meshKeyOf("node", index));
    }

    /**
     * What one edge is painted.
     * @param index - Its dense index.
     * @returns The paint, or null when nothing is bound or the index is not an element's.
     */
    edgePaint(index: number): EdgePaint | null {
        const { paint } = this;

        if (paint === null || index < 0) {
            return null;
        }

        return edgePaintOf(paint.styleOf("edge", index), paint.meshKeyOf("edge", index));
    }

    /**
     * How many distinct source meshes one kind of element needs.
     *
     * The number the structural hash exists to keep small, read straight from the interner: it
     * must follow the distinct shapes and sizes in the picture and never the element count.
     * @param target - Nodes or edges.
     * @returns The count, or zero when nothing is bound.
     */
    meshCount(target: SelectorTarget): number {
        return this.paint?.meshCount(target) ?? 0;
    }
}
