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
 * WHERE THE DRAWABLE FACTS COME FROM. The element owns them, in `CHANNEL_DESCRIPTORS`, now
 * published from `@graphty/graphty-element/catalog` beside the algorithm, format, layout, palette
 * and scale tables. This file reads the control kind, the numeric bounds and (for an enum) the
 * accepted values from there rather than restating them, so they cannot fall out of step with
 * what the element can actually draw. What remains below is presentation the element has no
 * opinion about -- a control's label, its inspector group, its stepper increment, the option
 * icons -- and `channelControls.test.ts` proves even the presentation's enum choices still match
 * the element's values.
 */

import { CHANNEL_DESCRIPTORS, type ChannelValueKind } from "@graphty/graphty-element/catalog";
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
 * The control the inspector draws for each kind of value the element accepts.
 *
 * The element names its value kinds; this is the only place that decides which Mantine control
 * edits each one, so a kind the element adds is a compile error here rather than a channel with
 * no editor. `nothing` is the element's kind for a channel it draws but cannot be set (the
 * marker), which the inspector shows as a disabled row.
 */
const CONTROL_KIND: Readonly<Record<ChannelValueKind, ChannelControlKind>> = {
    color: "color",
    number: "number",
    text: "text",
    boolean: "boolean",
    enum: "enum",
    labelStyle: "labelStyle",
    nothing: "none",
};

/**
 * The presentation facts for each channel -- the ones the element does not own.
 *
 * What a control is called, which group it sits in, how far a stepper moves, the value shown
 * when no layer has set it, and the option list a select draws with its labels and icons. The
 * DRAWABLE facts a reader could get wrong -- which control kind a channel takes, its numeric
 * bounds, and the values an enum accepts -- are NOT restated here: they come from
 * `CHANNEL_DESCRIPTORS`, so they cannot drift from what the element can actually draw. Keyed by
 * `Channel`, so adding or removing a channel in the element stops this file compiling.
 */
interface ChannelUi {
    /** The word beside the control. Sentence case, no trailing punctuation. */
    readonly label: string;
    /** Which group the row sits in. */
    readonly group: ChannelGroup;
    /** How far a stepper moves, for a number channel. Presentation, so it lives here. */
    readonly step?: number;
    /** The value the element draws when no layer sets this channel. */
    readonly fallback?: string | number | boolean;
    /** The choices, for an enum channel: the element's values dressed with a label and icon. */
    readonly options?: readonly StyleOption[];
    /** Why this channel cannot be set here, when it cannot. A control with one is disabled. */
    readonly unavailable?: string;
}

const CHANNEL_UI: Readonly<Record<Channel, ChannelUi>> = {
    "node.color": { label: "Color", group: "Color", fallback: defaultNodeHex() },
    "node.size": { label: "Size", group: "Shape", fallback: defaultNodeStyle.shape?.size ?? 1, step: 0.1 },
    "node.shape": {
        label: "Type",
        group: "Shape",
        fallback: defaultNodeStyle.shape?.type ?? "icosphere",
        options: NODE_SHAPE_OPTIONS,
    },
    "node.label": { label: "Label", group: "Text" },
    "node.labelStyle": { label: "Label style", group: "Text" },
    "node.tooltip": { label: "Tooltip", group: "Text" },
    "node.tooltipStyle": { label: "Tooltip style", group: "Text" },
    "node.opacity": { label: "Opacity", group: "Color", fallback: 1, step: 0.05 },
    "node.outline": { label: "Outline", group: "Effects" },
    "node.glow": { label: "Glow", group: "Effects" },
    "node.glowStrength": { label: "Glow strength", group: "Effects", step: 0.1 },
    "node.wireframe": { label: "Wireframe", group: "Effects", fallback: false },
    "node.flat": { label: "Flat shaded", group: "Effects", fallback: false },
    "node.marker": { label: "Marker", group: "Effects", unavailable: MARKER_REASON },
    "edge.color": { label: "Color", group: "Line", fallback: hexOf(defaultEdgeStyle.line?.color) },
    "edge.width": { label: "Width", group: "Line", fallback: defaultEdgeStyle.line?.width ?? 1, step: 0.5 },
    "edge.opacity": { label: "Opacity", group: "Line", fallback: defaultEdgeStyle.line?.opacity ?? 1, step: 0.05 },
    "edge.style": {
        label: "Line",
        group: "Line",
        fallback: defaultEdgeStyle.line?.type ?? "solid",
        options: LINE_TYPE_OPTIONS,
    },
    "edge.curvature": { label: "Curved", group: "Line", fallback: false },
    "edge.arrowHead": {
        label: "Head",
        group: "Arrows",
        fallback: defaultEdgeStyle.arrowHead?.type ?? "none",
        options: ARROW_TYPE_OPTIONS,
    },
    "edge.arrowHeadSize": { label: "Head size", group: "Arrows", fallback: defaultEdgeStyle.arrowHead?.size ?? 1, step: 0.1 },
    "edge.arrowHeadColor": { label: "Head color", group: "Arrows", fallback: hexOf(defaultEdgeStyle.arrowHead?.color) },
    "edge.arrowHeadOpacity": {
        label: "Head opacity",
        group: "Arrows",
        fallback: defaultEdgeStyle.arrowHead?.opacity ?? 1,
        step: 0.05,
    },
    "edge.arrowHeadText": { label: "Head caption", group: "Arrows" },
    "edge.arrowHeadTextStyle": { label: "Head caption style", group: "Arrows" },
    "edge.arrowTail": { label: "Tail", group: "Arrows", fallback: "none", options: ARROW_TYPE_OPTIONS },
    "edge.arrowTailSize": { label: "Tail size", group: "Arrows", fallback: defaultEdgeStyle.arrowTail?.size ?? 1, step: 0.1 },
    "edge.arrowTailColor": { label: "Tail color", group: "Arrows", fallback: hexOf(defaultEdgeStyle.arrowTail?.color) },
    "edge.arrowTailOpacity": {
        label: "Tail opacity",
        group: "Arrows",
        fallback: defaultEdgeStyle.arrowTail?.opacity ?? 1,
        step: 0.05,
    },
    "edge.arrowTailText": { label: "Tail caption", group: "Arrows" },
    "edge.arrowTailTextStyle": { label: "Tail caption style", group: "Arrows" },
    "edge.patternCount": { label: "Pattern count", group: "Line", step: 1 },
    "edge.animationSpeed": { label: "Animation", group: "Line", fallback: 0, step: 0.1 },
    "edge.label": { label: "Label", group: "Text" },
    "edge.labelStyle": { label: "Label style", group: "Text" },
};

/** Every channel, in the order the inspector draws them. */
const CHANNEL_ORDER: readonly Channel[] = Object.keys(CHANNEL_UI) as Channel[];

/**
 * Every channel, with the control that edits it.
 *
 * The presentation comes from `CHANNEL_UI` above; the control kind, the numeric bounds and (for
 * an enum) that the option list is complete come from the element's `CHANNEL_DESCRIPTORS`. So a
 * bound or a value cannot drift from the element the way a hand-copied number would -- there is
 * one source for each drawable fact, and `channelControls.test.ts` proves the two halves agree.
 */
export const CHANNEL_CONTROLS: Readonly<Record<Channel, ChannelControl>> = Object.fromEntries(
    CHANNEL_ORDER.map((channel): [Channel, ChannelControl] => {
        const descriptor = CHANNEL_DESCRIPTORS[channel];
        const ui = CHANNEL_UI[channel];
        return [
            channel,
            {
                label: ui.label,
                group: ui.group,
                kind: CONTROL_KIND[descriptor.accepts],
                ...(ui.fallback !== undefined ? { fallback: ui.fallback } : {}),
                ...(ui.options !== undefined ? { options: ui.options } : {}),
                ...(descriptor.min !== undefined ? { min: descriptor.min } : {}),
                ...(descriptor.max !== undefined ? { max: descriptor.max } : {}),
                ...(ui.step !== undefined ? { step: ui.step } : {}),
                ...(ui.unavailable !== undefined ? { unavailable: ui.unavailable } : {}),
            },
        ];
    }),
) as Record<Channel, ChannelControl>;

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
