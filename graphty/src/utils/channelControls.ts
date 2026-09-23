/**
 * What control the style inspector draws for each channel a layer can paint.
 *
 * A layer paints CHANNELS, and the set of them is closed: thirty-five names, each accepting one
 * kind of value. This table says which control a reader edits each one with, what it is called
 * on the surface, which group it sits in, and what the element draws when no layer sets it. It
 * is keyed by the element's own `Channel` union, so a channel added to or removed from the
 * element is a compile error here rather than a row that silently stops being drawn.
 *
 * WHAT THIS REPLACES. `utils/styleBridge.ts` and `utils/richTextStyleBridge.ts` were 1,243 lines
 * of translation in both directions between the editor's nested configuration objects and
 * graphty-element's 1.x `NodeStyle` / `EdgeStyle` schemas -- a shape map, a colour-mode map, an
 * arrow map, a nine-way-to-five-way attach position map, and a narrow reader per branch so an
 * unset value could be told from a set one. The channel vocabulary is flat and its values are
 * scalars, so a channel's value IS what the control edits and there is nothing to translate.
 *
 * WHAT THE ELEMENT DOES NOT PUBLISH, and what it costs here. `CHANNEL_DESCRIPTORS` in
 * `graphty-element/src/session/styles/channels.ts` already holds every fact below -- the plain
 * name, the accepted kind, the enum values, the bounds, and the caveat saying what the renderer
 * narrows -- and it is exported from no entry point of the package. So the shape of this table
 * is a second copy of a table the element owns, and it can drift from what the element can
 * actually draw with nothing able to catch it. `session.catalog` publishes the algorithms, the
 * formats, the layouts, the palettes and the scales; channels belong beside them.
 */

import { colorToHex, defaultEdgeStyle, defaultNodeStyle, MISSING_DATA_COLOR } from "@graphty/graphty-element/schema";
import type { Channel } from "@graphty/graphty-element/session";

import { ARROW_TYPE_OPTIONS, LINE_TYPE_OPTIONS, NODE_SHAPE_OPTIONS, type StyleOption } from "../constants/style-options";

/** Which control a channel is edited with. */
type ChannelControlKind = "color" | "number" | "text" | "boolean" | "enum" | "labelStyle" | "none";

/** Which group of the inspector a channel's row sits in. */
export type ChannelGroup = "Shape" | "Color" | "Effects" | "Text" | "Line" | "Arrows";

/** Everything the inspector needs in order to draw one channel's row. */
export interface ChannelControl {
    /** The word beside the control. Sentence case, no trailing punctuation. */
    readonly label: string;
    /** Which group the row sits in. */
    readonly group: ChannelGroup;
    /** Which control to draw. */
    readonly kind: ChannelControlKind;
    /** The value the element draws when no layer sets this channel. */
    readonly fallback?: string | number | boolean;
    /** The choices, for an enum channel. */
    readonly options?: readonly StyleOption[];
    /** The smallest value accepted, for a number channel. */
    readonly min?: number;
    /** The largest value accepted, for a number channel. */
    readonly max?: number;
    /** How far a stepper moves, for a number channel. */
    readonly step?: number;
    /** Why this channel cannot be set here, when it cannot. A control with one is disabled. */
    readonly unavailable?: string;
}

/**
 * A colour in the uppercase six-digit hex a swatch opens on.
 *
 * The element writes CSS colour names in its own defaults -- `defaultEdgeStyle.line.color` is
 * the literal string "darkgrey" -- and a colour input cannot open on a name.
 * @param color - a colour in any form the element accepts, or nothing.
 * @returns the colour as "#RRGGBB", or the element's missing-data colour when there is none.
 */
function hexOf(color: string | undefined): string {
    return (color === undefined ? undefined : colorToHex(color)) ?? MISSING_DATA_COLOR;
}

/**
 * The single hex the node colour control opens on: what the element paints a node no layer has
 * encoded.
 *
 * `texture.color` may be a bare string or an advanced object, and only the solid form has one
 * swatch to show: a gradient default yields the missing-data colour rather than an invented
 * pick out of the ramp.
 *
 * EXPORTED so that the canvas legend's Other row -- the chip standing for every category the
 * legend does not name -- is drawn in the colour those elements actually carry, read off the
 * element, rather than in a hex copied into the shell beside it. There were two such copies
 * before this, and a copy of an element constant is wrong from the moment the element changes
 * it, silently.
 * @returns the colour as "#RRGGBB".
 * @public
 */
export function defaultNodeHex(): string {
    const color = defaultNodeStyle.texture?.color;

    if (typeof color === "string") {
        return hexOf(color);
    }

    return color?.colorType === "solid" ? hexOf(color.value) : MISSING_DATA_COLOR;
}

/** The reason `node.marker` is drawn but cannot be set. */
const MARKER_REASON = "The element draws no marker yet";

/**
 * Every channel, with the control that edits it.
 *
 * Keyed by `Channel`, so the table cannot fall behind the union: adding a channel to the
 * element without adding a row here stops this file compiling.
 */
export const CHANNEL_CONTROLS: Readonly<Record<Channel, ChannelControl>> = {
    "node.color": { label: "Color", group: "Color", kind: "color", fallback: defaultNodeHex() },
    "node.size": {
        label: "Size",
        group: "Shape",
        kind: "number",
        fallback: defaultNodeStyle.shape?.size ?? 1,
        min: 0,
        step: 0.1,
    },
    "node.shape": {
        label: "Type",
        group: "Shape",
        kind: "enum",
        fallback: defaultNodeStyle.shape?.type ?? "icosphere",
        options: NODE_SHAPE_OPTIONS,
    },
    "node.label": { label: "Label", group: "Text", kind: "text" },
    "node.labelStyle": { label: "Label style", group: "Text", kind: "labelStyle" },
    "node.tooltip": { label: "Tooltip", group: "Text", kind: "text" },
    "node.tooltipStyle": { label: "Tooltip style", group: "Text", kind: "labelStyle" },
    "node.opacity": { label: "Opacity", group: "Color", kind: "number", fallback: 1, min: 0, max: 1, step: 0.05 },
    "node.outline": { label: "Outline", group: "Effects", kind: "color" },
    "node.glow": { label: "Glow", group: "Effects", kind: "color" },
    "node.glowStrength": { label: "Glow strength", group: "Effects", kind: "number", min: 0, step: 0.1 },
    "node.wireframe": { label: "Wireframe", group: "Effects", kind: "boolean", fallback: false },
    "node.flat": { label: "Flat shaded", group: "Effects", kind: "boolean", fallback: false },
    "node.marker": { label: "Marker", group: "Effects", kind: "none", unavailable: MARKER_REASON },
    "edge.color": { label: "Color", group: "Line", kind: "color", fallback: hexOf(defaultEdgeStyle.line?.color) },
    "edge.width": {
        label: "Width",
        group: "Line",
        kind: "number",
        fallback: defaultEdgeStyle.line?.width ?? 1,
        min: 0,
        step: 0.5,
    },
    "edge.opacity": {
        label: "Opacity",
        group: "Line",
        kind: "number",
        fallback: defaultEdgeStyle.line?.opacity ?? 1,
        min: 0,
        max: 1,
        step: 0.05,
    },
    "edge.style": {
        label: "Line",
        group: "Line",
        kind: "enum",
        fallback: defaultEdgeStyle.line?.type ?? "solid",
        options: LINE_TYPE_OPTIONS,
    },
    "edge.curvature": { label: "Curved", group: "Line", kind: "boolean", fallback: false },
    "edge.arrowHead": {
        label: "Head",
        group: "Arrows",
        kind: "enum",
        fallback: defaultEdgeStyle.arrowHead?.type ?? "none",
        options: ARROW_TYPE_OPTIONS,
    },
    "edge.arrowHeadSize": {
        label: "Head size",
        group: "Arrows",
        kind: "number",
        fallback: defaultEdgeStyle.arrowHead?.size ?? 1,
        min: 0,
        step: 0.1,
    },
    "edge.arrowHeadColor": {
        label: "Head color",
        group: "Arrows",
        kind: "color",
        fallback: hexOf(defaultEdgeStyle.arrowHead?.color),
    },
    "edge.arrowHeadOpacity": {
        label: "Head opacity",
        group: "Arrows",
        kind: "number",
        fallback: defaultEdgeStyle.arrowHead?.opacity ?? 1,
        min: 0,
        max: 1,
        step: 0.05,
    },
    "edge.arrowHeadText": { label: "Head caption", group: "Arrows", kind: "text" },
    "edge.arrowHeadTextStyle": { label: "Head caption style", group: "Arrows", kind: "labelStyle" },
    "edge.arrowTail": { label: "Tail", group: "Arrows", kind: "enum", fallback: "none", options: ARROW_TYPE_OPTIONS },
    "edge.arrowTailSize": {
        label: "Tail size",
        group: "Arrows",
        kind: "number",
        fallback: defaultEdgeStyle.arrowTail?.size ?? 1,
        min: 0,
        step: 0.1,
    },
    "edge.arrowTailColor": {
        label: "Tail color",
        group: "Arrows",
        kind: "color",
        fallback: hexOf(defaultEdgeStyle.arrowTail?.color),
    },
    "edge.arrowTailOpacity": {
        label: "Tail opacity",
        group: "Arrows",
        kind: "number",
        fallback: defaultEdgeStyle.arrowTail?.opacity ?? 1,
        min: 0,
        max: 1,
        step: 0.05,
    },
    "edge.arrowTailText": { label: "Tail caption", group: "Arrows", kind: "text" },
    "edge.arrowTailTextStyle": { label: "Tail caption style", group: "Arrows", kind: "labelStyle" },
    "edge.patternCount": { label: "Pattern count", group: "Line", kind: "number", min: 2, step: 1 },
    "edge.animationSpeed": { label: "Animation", group: "Line", kind: "number", fallback: 0, min: 0, step: 0.1 },
    "edge.label": { label: "Label", group: "Text", kind: "text" },
    "edge.labelStyle": { label: "Label style", group: "Text", kind: "labelStyle" },
};

/** Every channel, in the order the inspector draws them. */
const CHANNEL_ORDER: readonly Channel[] = Object.keys(CHANNEL_CONTROLS) as Channel[];

/** The groups a node layer's rows are drawn in, in order. */
export const NODE_GROUPS: readonly ChannelGroup[] = ["Shape", "Color", "Effects", "Text"];

/** The groups an edge layer's rows are drawn in, in order. */
export const EDGE_GROUPS: readonly ChannelGroup[] = ["Line", "Arrows", "Text"];

/**
 * The channels of one group that belong to one kind of element.
 * @param target - whether the layer paints nodes or edges.
 * @param group - the group being drawn.
 * @returns the channels, in the order the table lists them.
 */
export function channelsIn(target: "node" | "edge", group: ChannelGroup): readonly Channel[] {
    return CHANNEL_ORDER.filter(
        (channel) => channel.startsWith(`${target}.`) && CHANNEL_CONTROLS[channel].group === group,
    );
}
