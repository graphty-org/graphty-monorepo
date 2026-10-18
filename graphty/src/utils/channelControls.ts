/**
 * What control the style inspector draws for each channel a layer can paint.
 *
 * A layer paints CHANNELS, and the set of them is closed: forty-three names, each accepting one
 * kind of value. Everything about a channel's row that the element knows -- its short name, its
 * group, the control kind, the bounds, the accepted values, the value drawn when no layer sets
 * it and why it cannot be set -- is read from graphty-element's `CHANNEL_DESCRIPTORS`, published
 * from `@graphty/graphty-element/catalog`. What remains here is presentation the element has no
 * opinion about: the order rows are drawn in, a stepper's increment, and the icons an enum's
 * options are dressed with. `channelControls.test.ts` proves the enum options still match the
 * element's values.
 */

import { CHANNEL_DESCRIPTORS, type ChannelGroup, type ChannelValueKind } from "@graphty/graphty-element/catalog";
import { MISSING_DATA_COLOR } from "@graphty/graphty-element/schema";
import type { Channel } from "@graphty/graphty-element/session";

import {
    ARROW_TYPE_OPTIONS,
    BORDER_POSITION_OPTIONS,
    BORDER_STYLE_OPTIONS,
    LABEL_DECLUTTER_OPTIONS,
    LABEL_FIT_OPTIONS,
    LABEL_WEIGHT_OPTIONS,
    LINE_TYPE_OPTIONS,
    NODE_SHAPE_OPTIONS,
    NODE_SIZE_MODE_OPTIONS,
    type StyleOption,
} from "../constants/style-options";

export type { ChannelGroup } from "@graphty/graphty-element/catalog";

/** Which control a channel is edited with. */
type ChannelControlKind = "color" | "number" | "text" | "boolean" | "enum" | "labelStyle" | "none";

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
 * The colour the element paints a node no layer has encoded, read off the element's channel
 * descriptor.
 *
 * EXPORTED so that the canvas legend's Other row -- the chip standing for every category the
 * legend does not name -- is drawn in the colour those elements actually carry.
 * @returns the colour as "#RRGGBB", or the element's missing-data colour when the element's
 *     default is not one solid colour.
 * @public
 */
export function defaultNodeHex(): string {
    const color = CHANNEL_DESCRIPTORS["node.color"].default;

    return typeof color === "string" ? color : MISSING_DATA_COLOR;
}

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

/** The presentation the element has no opinion about: a stepper's increment, an enum's icons. */
interface ChannelUi {
    /** How far a stepper moves, for a number channel. */
    readonly step?: number;
    /** The choices, for an enum channel: the element's values dressed with a label and icon. */
    readonly options?: readonly StyleOption[];
    /** Not offered in a layer's rows: a value no reader would type in by hand. */
    readonly hidden?: true;
}

/** Keyed by `Channel`, so adding or removing a channel in the element stops this file compiling. */
const CHANNEL_UI: Readonly<Record<Channel, ChannelUi>> = {
    "node.color": {},
    "node.size": { step: 0.1 },
    "node.sizeMode": { options: NODE_SIZE_MODE_OPTIONS },
    "node.shape": { options: NODE_SHAPE_OPTIONS },
    "node.label": {},
    "node.labelStyle": {},
    "node.labelColor": {},
    "node.labelSize": { step: 1 },
    "node.labelFont": {},
    "node.labelWeight": { options: LABEL_WEIGHT_OPTIONS },
    "node.labelItalic": {},
    "node.labelWrapWidth": { step: 0.5 },
    // a file's own label metrics: graph-io sets them so a label is drawn as its program drew it
    "node.labelLetterSize": { hidden: true },
    "node.labelWrapTrailingSpace": { hidden: true },
    "node.labelMinScreenSize": { step: 1 },
    "node.labelOnTop": {},
    "node.labelDeclutter": { options: LABEL_DECLUTTER_OPTIONS },
    "node.labelRotation": { step: 1 },
    "node.tooltip": {},
    "node.tooltipStyle": {},
    "node.opacity": { step: 0.05 },
    "node.outline": {},
    "node.glow": {},
    "node.glowStrength": { step: 0.1 },
    "node.wireframe": {},
    "node.flat": {},
    "node.marker": {},
    "node.width": { step: 0.1 },
    "node.height": { step: 0.1 },
    "node.depth": { step: 0.1 },
    "node.planar": {},
    "node.zIndex": { step: 1 },
    "node.drawOrder": { step: 1 },
    "node.borderColor": {},
    "node.borderWidth": { step: 0.05 },
    "node.borderScreenWidth": { step: 0.5 },
    "node.borderOpacity": { step: 0.05 },
    "node.borderStyle": { options: BORDER_STYLE_OPTIONS },
    "node.borderPosition": { options: BORDER_POSITION_OPTIONS },
    // a polygon's corner points, written by a file's import
    "node.shapePoints": { hidden: true },
    "node.gradientColor": {},
    "node.gradientDirection": { step: 15 },
    "node.cornerRadius": { step: 0.05 },
    "node.labelFit": { options: LABEL_FIT_OPTIONS },
    "node.labelPaddingX": { step: 0.05 },
    "node.labelPaddingY": { step: 0.05 },
    "node.labelFitSquare": {},
    "edge.color": {},
    "edge.width": { step: 0.5 },
    "edge.opacity": { step: 0.05 },
    "edge.style": { options: LINE_TYPE_OPTIONS },
    "edge.curvature": {},
    // A route is the numbers a file's drawing carries (yEd bends), not a value to type.
    "edge.bends": { hidden: true },
    "edge.fanSpacing": { step: 0.1 },
    "edge.fanned": {},
    // where a line meets its node, written by a file's import
    "edge.sourcePort": { hidden: true },
    "edge.targetPort": { hidden: true },
    "edge.arrowHead": { options: ARROW_TYPE_OPTIONS },
    "edge.arrowHeadSize": { step: 0.1 },
    "edge.arrowHeadWidth": { step: 0.1 },
    "edge.arrowHeadPosition": { step: 0.05 },
    "edge.arrowHeadColor": {},
    "edge.arrowHeadOpacity": { step: 0.05 },
    "edge.arrowHeadText": {},
    "edge.arrowHeadTextStyle": {},
    "edge.arrowTail": { options: ARROW_TYPE_OPTIONS },
    "edge.arrowTailSize": { step: 0.1 },
    "edge.arrowTailWidth": { step: 0.1 },
    "edge.arrowTailPosition": { step: 0.05 },
    "edge.arrowTailColor": {},
    "edge.arrowTailOpacity": { step: 0.05 },
    "edge.arrowTailText": {},
    "edge.arrowTailTextStyle": {},
    "edge.patternCount": { step: 1 },
    "edge.animationSpeed": { step: 0.1 },
    "edge.label": {},
    "edge.labelStyle": {},
    "edge.labelColor": {},
    "edge.labelSize": { step: 1 },
    "edge.labelFont": {},
    "edge.labelWeight": { options: LABEL_WEIGHT_OPTIONS },
    "edge.labelItalic": {},
    "edge.labelWrapWidth": { step: 0.5 },
    "edge.labelLetterSize": { hidden: true },
    "edge.labelWrapTrailingSpace": { hidden: true },
    "edge.labelMinScreenSize": { step: 1 },
    "edge.labelOnTop": {},
    "edge.labelRotation": { step: 1 },
};

/** Every channel, in the order the inspector draws them. */
const CHANNEL_ORDER: readonly Channel[] = Object.keys(CHANNEL_UI) as Channel[];

/**
 * Every channel, with the control that edits it.
 *
 * The step and the option icons come from `CHANNEL_UI` above; everything else comes from the
 * element's `CHANNEL_DESCRIPTORS`, so nothing here can drift from what the element draws.
 */
export const CHANNEL_CONTROLS: Readonly<Record<Channel, ChannelControl>> = Object.fromEntries(
    CHANNEL_ORDER.map((channel): [Channel, ChannelControl] => {
        const descriptor = CHANNEL_DESCRIPTORS[channel];
        const ui = CHANNEL_UI[channel];
        return [
            channel,
            {
                label: descriptor.shortName,
                group: descriptor.group,
                kind: CONTROL_KIND[descriptor.accepts],
                ...(descriptor.default !== undefined ? { fallback: descriptor.default } : {}),
                ...(ui.options !== undefined ? { options: ui.options } : {}),
                ...(descriptor.min !== undefined ? { min: descriptor.min } : {}),
                ...(descriptor.max !== undefined ? { max: descriptor.max } : {}),
                ...(ui.step !== undefined ? { step: ui.step } : {}),
                ...(descriptor.unsupportedReason !== undefined ? { unavailable: descriptor.unsupportedReason } : {}),
            },
        ];
    }),
) as Record<Channel, ChannelControl>;

/** The groups a node layer's rows are drawn in, in order. */
export const NODE_GROUPS: readonly ChannelGroup[] = ["shape", "color", "effects", "text"];

/** The groups an edge layer's rows are drawn in, in order. */
export const EDGE_GROUPS: readonly ChannelGroup[] = ["line", "arrows", "text"];

/**
 * The heading a group is drawn under.
 * @param group - the element's group.
 * @returns the group in sentence case, "Arrows" for "arrows".
 */
export function groupHeading(group: ChannelGroup): string {
    return group.charAt(0).toUpperCase() + group.slice(1);
}

/**
 * The channels of one group that belong to one kind of element.
 * @param target - whether the layer paints nodes or edges.
 * @param group - the group being drawn.
 * @returns the channels, in the order the table lists them.
 */
export function channelsIn(target: "node" | "edge", group: ChannelGroup): readonly Channel[] {
    return CHANNEL_ORDER.filter(
        (channel) =>
            channel.startsWith(`${target}.`) &&
            CHANNEL_CONTROLS[channel].group === group &&
            CHANNEL_UI[channel].hidden !== true,
    );
}
