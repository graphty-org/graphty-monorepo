/**
 * Style panel v2's text things (design/ui/style-panel-v2/design.md, sections 7.1, 7.3 and 7.4): a
 * label, an external label and a tooltip each edit one label style channel field by field. This
 * table says where each field sits (the row's common lines, the pop-over's Main, the sub-groups
 * its "+" adds), which control it draws and the display name or glyph of an option where the
 * element's own name is not what the panel shows. What a field takes is read from graphty-element's
 * `LABEL_STYLE_DESCRIPTORS`; the channel that varies a field by data from its `labelFieldOf`.
 */

import {
    type Channel,
    channelsFor,
    LABEL_STYLE_DESCRIPTORS,
    labelFieldOf,
    type LabelStyleFieldDescriptor,
} from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";

import type { GLYPHS } from "../../glyphs";
import type { OptionName, Rule } from "./rubric";

/** A field of a label style. */
export type LabelField = keyof LabelStyle;

/** One unit of a Unit line: its name, the field holding the value in it, and what else it writes. */
interface LabelUnit {
    readonly name: string;
    readonly field: LabelField;
    /** Fields written with it, and taken off when another unit is picked (Screen's `sizeMode`). */
    readonly also?: Readonly<Partial<LabelStyle>>;
}

/** One line editing a label style field. */
export interface LabelLineSpec {
    readonly field: LabelField;
    /** Its name, when not the element's; null draws no name column. */
    readonly name?: string | null;
    /** Its rule, where the field's kind does not settle it. */
    readonly rule?: Rule;
    /** The second number of a pair, on the same line. */
    readonly pair?: LabelField;
    /** The letters in a pair's two fields' glyph slots. */
    readonly letters?: readonly [string, string];
    /** The in-field glyph of a number (a stroke width's weight). */
    readonly glyph?: keyof typeof GLYPHS;
    /** Fields standing for the same quantity in another unit: the line edits whichever is set. */
    readonly units?: readonly LabelField[];
    /** A Unit line: which unit's field holds the value; picking one moves it there. */
    readonly unit?: readonly LabelUnit[];
    /** A boolean modifying the line, drawn as a toggle in its modifier slot (R6). */
    readonly toggle?: LabelField;
    readonly toggleGlyph?: keyof typeof GLYPHS;
}

/** One sub-group of a label's pop-over. */
export interface LabelGroup {
    readonly name: string;
    /** The field that switches it on: adding the sub-group writes it true. */
    readonly on?: LabelField;
    readonly lines: readonly LabelLineSpec[];
}

/** A label style's rubric. */
interface LabelRubric {
    readonly common: readonly LabelLineSpec[];
    readonly main: readonly LabelLineSpec[];
    readonly groups: readonly LabelGroup[];
}

/** A text thing: the channel of its words and the label style channel it edits. */
export interface TextThing {
    readonly words: Channel;
    readonly style: Channel;
    /** A caption's distance from its end, a channel of its own on the Position sub-group's last line. */
    readonly distance?: Channel;
}

/**
 * Each kind's text things that edit a label style, by thing id (a node's Glyph and Record and an
 * edge's Record have channels of their own).
 */
export const TEXT_THINGS: Readonly<Record<"node" | "edge", Readonly<Record<string, TextThing>>>> = {
    node: {
        label: { words: "node.label", style: "node.labelStyle" },
        xlabel: { words: "node.xlabel", style: "node.xlabelStyle" },
        tooltip: { words: "node.tooltip", style: "node.tooltipStyle" },
    },
    edge: {
        label: { words: "edge.label", style: "edge.labelStyle" },
        xlabel: { words: "edge.xlabel", style: "edge.xlabelStyle" },
        targetCaption: {
            words: "edge.arrowHeadText",
            style: "edge.arrowHeadTextStyle",
            distance: "edge.arrowHeadTextDistance",
        },
        sourceCaption: {
            words: "edge.arrowTailText",
            style: "edge.arrowTailTextStyle",
            distance: "edge.arrowTailTextDistance",
        },
    },
};

/** A label's size: in graph units, in screen pixels, or as the letters' own size (design 5.2). */
const SIZE_UNIT: readonly LabelUnit[] = [
    { name: "Graph", field: "size" },
    { name: "Screen", field: "sizePx", also: { sizeMode: "screen" } },
    { name: "Letter", field: "letterSize" },
];

/** A label's padding: around the words, or of the whole box. */
const PADDING_UNIT: readonly LabelUnit[] = [
    { name: "Text", field: "padding" },
    { name: "Box", field: "boxPadding" },
];

/** An X | Y pair. */
const XY = ["X", "Y"] as const;

/** Every label's rubric (design 7.3). */
export const LABEL_RUBRIC: LabelRubric = {
    common: [
        { field: "size", name: "Size", units: ["sizePx", "letterSize"] },
        { field: "color", name: null },
    ],
    main: [
        { field: "look", name: "Switch to", rule: "R9" },
        { field: "font", name: "Font", rule: "R13" },
        { field: "weight", name: "Weight", rule: "R5b", toggle: "italic", toggleGlyph: "italic" },
        { field: "textAlign", name: "Align", rule: "R8" },
        { field: "size", name: null, rule: "R8f", unit: SIZE_UNIT },
        { field: "location", name: "Location", rule: "R2" },
    ],
    groups: [
        {
            name: "Letters",
            lines: [
                { field: "lineHeight", name: "Line height" },
                { field: "rotation", name: "Rotation" },
                { field: "opacity", name: "Opacity" },
                { field: "runAlign", name: null, rule: "R8f" },
            ],
        },
        {
            name: "Background",
            lines: [
                { field: "background", name: null },
                { field: "backgroundOpacity", name: "Opacity" },
                { field: "cornerRadius", name: "Corners" },
                { field: "padding", name: "Padding", units: ["boxPadding"] },
                { field: "padding", name: "Unit", rule: "R8", unit: PADDING_UNIT },
            ],
        },
        {
            name: "Border",
            lines: [
                { field: "borderWidth", name: "Width", glyph: "weight" },
                { field: "borderColor", name: null },
                { field: "borderOpacity", name: "Opacity" },
                { field: "borderAlign", name: "Align", rule: "R8" },
                { field: "lineBox", name: null, rule: "R8f" },
            ],
        },
        {
            name: "Badge",
            lines: [
                { field: "badge", name: "Badge", rule: "R9" },
                { field: "icon", name: "Icon", rule: "R14" },
                { field: "iconPosition", name: "Icon side", rule: "R8" },
                { field: "progress", name: "Progress" },
                { field: "maxNumber", name: "Max number" },
                { field: "overflowSuffix", name: "Suffix", rule: "R14" },
                { field: "smartOverflow", name: "Shorten large numbers" },
            ],
        },
        {
            name: "Position",
            lines: [
                { field: "attachOffset", name: "Distance" },
                { field: "offsetX", name: "Offset", pair: "offsetY", letters: XY },
                { field: "box", name: null, rule: "R8f" },
                { field: "onTop", name: "On top" },
                { field: "shiftX", name: "Shift", pair: "shiftY", letters: XY },
                { field: "shiftOf", name: "Shift of", rule: "R8" },
                { field: "gapOf", name: "Gap of", rule: "R8" },
            ],
        },
        {
            name: "Pointer",
            on: "pointer",
            lines: [
                { field: "pointerDirection", name: null, rule: "R8f" },
                { field: "pointerWidth", name: "Size", pair: "pointerHeight", letters: ["W", "H"] },
                { field: "pointerOffset", name: "Offset" },
                { field: "pointerCurve", name: "Curved" },
            ],
        },
        {
            name: "Wrap",
            lines: [
                { field: "wrapWidth", name: "Wrap", pair: "maxLines" },
                { field: "wrapAnywhere", name: "Break anywhere" },
                { field: "wrapEllipsis", name: "Cut long lines" },
                { field: "maxLinesEllipsis", name: "Ellipsis at max lines" },
                { field: "keepBlankLines", name: "Keep blank lines" },
                { field: "wrapTrailingSpace", name: "Trailing space" },
                { field: "wrapSkipEndSpace", name: "Skip end space" },
                { field: "wrapSpaceCount", name: "Space count" },
            ],
        },
        {
            name: "Small",
            lines: [
                { field: "minScreenSize", name: "Min size" },
                { field: "declutter", name: "Declutter", rule: "R8" },
                { field: "minNodeScreenSize", name: "Min node" },
                { field: "keepInView", name: "Keep in view" },
            ],
        },
        {
            name: "Outline",
            lines: [
                { field: "outline", name: null },
                { field: "outlineWidth", name: "Width", glyph: "weight" },
                { field: "outlineOpacity", name: "Opacity" },
            ],
        },
        {
            name: "Text shadow",
            on: "shadow",
            lines: [
                { field: "shadowColor", name: null },
                { field: "shadowBlur", name: "Blur" },
                { field: "shadowOffsetX", name: "Offset", pair: "shadowOffsetY", letters: XY },
            ],
        },
        {
            name: "Box shadow",
            on: "panelShadow",
            lines: [
                { field: "panelShadowColor", name: null },
                { field: "panelShadowBlur", name: "Blur" },
                { field: "panelShadowOffsetX", name: "Offset", pair: "panelShadowOffsetY", letters: XY },
            ],
        },
        {
            name: "Motion",
            lines: [
                { field: "animation", name: "Animation", rule: "R9" },
                { field: "animationSpeed", name: "Speed" },
                { field: "pickable", name: "Pickable" },
                { field: "closeButton", name: "Close button" },
                { field: "depthFade", name: "Depth fade" },
                { field: "depthFadeNear", name: "Fade", pair: "depthFadeFar" },
            ],
        },
    ],
};

/**
 * The option-name table for label style fields: every option of every segment line (R8, R8f),
 * the presets of the weight (R5b), and the look's and location's names where the panel's word is
 * not the element's. The widths test checks that its ids are the element's values.
 */
export const LABEL_OPTION_NAMES: Readonly<Partial<Record<LabelField, Readonly<Record<string, OptionName>>>>> = {
    textAlign: {
        left: { name: "Left", glyph: "alignLeft" },
        center: { name: "Center", glyph: "alignCenter" },
        right: { name: "Right", glyph: "alignRight" },
    },
    borderAlign: {
        outside: { name: "Outside", glyph: "borderOutside" },
        center: { name: "Center", glyph: "borderCenter" },
    },
    iconPosition: {
        left: { name: "Left", glyph: "arrowLeftToLine" },
        right: { name: "Right", glyph: "arrowRightToLine" },
    },
    pointerDirection: {
        top: { name: "Up", glyph: "pointUp" },
        bottom: { name: "Down", glyph: "pointDown" },
        left: { name: "Left", glyph: "pointLeft" },
        right: { name: "Right", glyph: "pointRight" },
        auto: { name: "Auto" },
    },
    lineBox: { font: { name: "Font" }, size: { name: "Size" }, glyphs: { name: "Glyphs" } },
    runAlign: { baseline: { name: "Baseline" }, hanging: { name: "Hanging" }, middle: { name: "Middle" } },
    box: { words: { name: "Words" }, "words-at-side": { name: "Beside" }, "target-width": { name: "Target" } },
    shiftOf: { box: { name: "Box" }, words: { name: "Words" } },
    gapOf: { box: { name: "Box" }, words: { name: "Words" } },
    declutter: { degree: { name: "Degree" }, size: { name: "Size" } },
    weight: { normal: { name: "Regular" }, bold: { name: "Bold" } },
    look: { default: { name: "Plain" } },
};

/** Every label style field's descriptor, by field. */
const DESCRIPTORS: ReadonlyMap<LabelField, LabelStyleFieldDescriptor> = new Map(
    LABEL_STYLE_DESCRIPTORS.map((descriptor) => [descriptor.field, descriptor]),
);

/**
 * A label style field's descriptor.
 * @param field - the field.
 * @returns its descriptor.
 */
export function labelFieldDescriptor(field: LabelField): LabelStyleFieldDescriptor | undefined {
    return DESCRIPTORS.get(field);
}

/**
 * Every field a line edits: its own, its pair's, its other units', its toggle's and its units'
 * (with what they write besides).
 * @param line - the line.
 * @returns the fields.
 */
export function labelLineFields(line: LabelLineSpec): readonly LabelField[] {
    return [
        line.field,
        ...(line.pair === undefined ? [] : [line.pair]),
        ...(line.units ?? []),
        ...(line.toggle === undefined ? [] : [line.toggle]),
        ...(line.unit ?? []).flatMap((unit) => [unit.field, ...(Object.keys(unit.also ?? {}) as LabelField[])]),
    ];
}

/**
 * Every field a sub-group's lines and its on field edit.
 * @param group - the sub-group.
 * @returns the fields.
 */
export function labelGroupFields(group: LabelGroup): readonly LabelField[] {
    return [...(group.on === undefined ? [] : [group.on]), ...group.lines.flatMap((line) => labelLineFields(line))];
}

/** Every field the rubric places somewhere. */
export const LABEL_COVERED: ReadonlySet<LabelField> = new Set([
    ...[...LABEL_RUBRIC.common, ...LABEL_RUBRIC.main].flatMap((line) => labelLineFields(line)),
    ...LABEL_RUBRIC.groups.flatMap((group) => labelGroupFields(group)),
]);

/** Each label style channel's field channels, by field, built once a side. */
const FLATS = new Map<Channel, ReadonlyMap<LabelField, Channel>>();

/**
 * The channel that writes one field of a label style on its own, and that a field varies through
 * (`node.labelColor` for `node.labelStyle`'s color), from graphty-element's `labelFieldOf`.
 * @param side - nodes or edges.
 * @param style - the label style channel.
 * @param field - the field.
 * @returns the channel, or undefined where the element has none.
 */
export function flatOf(side: "node" | "edge", style: Channel, field: LabelField): Channel | undefined {
    let fields = FLATS.get(style);
    if (fields === undefined) {
        fields = new Map(
            channelsFor(side).flatMap(({ channel }) => {
                const found = labelFieldOf(channel);
                return found?.into === style ? [[found.field, channel] as const] : [];
            }),
        );
        FLATS.set(style, fields);
    }
    return fields.get(field);
}
