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
    /** Its name, when not the element's. Every label line draws its name (E674). */
    readonly name?: string;
    /**
     * The whole name its controls are called by, where the short name it shows leans on the line above it
     * ("Color" under the Text shadow switch is "Text shadow color").
     */
    readonly fullName?: string;
    /**
     * The switch its look needs: setting the line writes it true while it is unset, so a Text shadow color
     * draws the shadow without its switch ticked first.
     */
    readonly needs?: LabelField;
    /** Its rule, where the field's kind does not settle it. */
    readonly rule?: Rule;
    /** The second number of a pair, on the same line. */
    readonly pair?: LabelField;
    /** The letters in a pair's two fields' glyph slots. */
    readonly letters?: readonly [string, string];
    /** Fields standing for the same quantity in another unit: the line edits whichever is set. */
    readonly units?: readonly LabelField[];
    /** A Unit line: which unit's field holds the value; picking one moves it there. */
    readonly unit?: readonly LabelUnit[];
    /** R6 sides: top, right, bottom and left; one number writes all four until its Separate sides line splits them. */
    readonly sides?: readonly [LabelField, LabelField, LabelField, LabelField];
}

/** One sub-group of a label's pop-over. */
export interface LabelGroup {
    readonly name: string;
    /** The field that switches it on: adding the sub-group writes it true. */
    readonly on?: LabelField;
    /** A divider follows it in the "+" menu: the next group is of a rarer tier (ia-design.md). */
    readonly divider?: true;
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
    /** The label list whose further labels are rows of their own beside this one (labelEntries.ts). */
    readonly list?: Channel;
}

/**
 * Each kind's text things that edit a label style, by thing id (a node's Glyph and Record and an
 * edge's Record have channels of their own).
 */
export const TEXT_THINGS: Readonly<Record<"node" | "edge", Readonly<Record<string, TextThing>>>> = {
    node: {
        label: { words: "node.label", style: "node.labelStyle", list: "node.labels" },
        xlabel: { words: "node.xlabel", style: "node.xlabelStyle" },
        tooltip: { words: "node.tooltip", style: "node.tooltipStyle" },
    },
    edge: {
        label: { words: "edge.label", style: "edge.labelStyle", list: "edge.labels" },
        xlabel: { words: "edge.xlabel", style: "edge.xlabelStyle" },
        tooltip: { words: "edge.tooltip", style: "edge.tooltipStyle" },
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
        { field: "color", name: "Color" },
    ],
    main: [
        { field: "enabled", name: "Show" },
        { field: "font", name: "Font", rule: "R13" },
        { field: "weight", name: "Weight", rule: "R5b" },
        // Italic is a line of its own, as every other switch is: no glyph beside Weight (E674).
        { field: "italic", name: "Italic" },
        { field: "textAlign", name: "Align", rule: "R8" },
        { field: "location", name: "Location", rule: "R2" },
        { field: "size", name: "Unit", fullName: "Size unit", rule: "R8f", unit: SIZE_UNIT },
    ],
    // ia-design.md "Label settings groups": nine groups by how often files vary them, a divider between tiers.
    groups: [
        {
            name: "Position",
            divider: true,
            lines: [
                { field: "attachOffset", name: "Distance" },
                { field: "offsetX", name: "Offset", pair: "offsetY", letters: XY },
                { field: "box", name: "Box", rule: "R8f" },
                { field: "onTop", name: "On top" },
                { field: "shiftX", name: "Shift", pair: "shiftY", letters: XY },
                { field: "shiftOf", name: "Shift of", rule: "R8" },
                { field: "gapOf", name: "Gap of", rule: "R8" },
                { field: "keepInView", name: "Keep in view" },
            ],
        },
        {
            name: "Letters",
            lines: [
                { field: "opacity", name: "Opacity" },
                { field: "lineHeight", name: "Line height" },
                { field: "rotation", name: "Rotation" },
                { field: "runAlign", name: "Run align", rule: "R8f" },
                // The letters' own stroke; the box's is Box stroke (ia-design: no look has two homes).
                // Its Width and Opacity follow it and read as its, as the shadows' lines follow their switches.
                { field: "outline", name: "Letter outline" },
                { field: "outlineWidth", name: "Width", fullName: "Letter outline width" },
                { field: "outlineOpacity", name: "Opacity", fullName: "Letter outline opacity" },
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
            name: "Background",
            lines: [
                { field: "background", name: "Color", fullName: "Background color" },
                { field: "backgroundOpacity", name: "Opacity", fullName: "Background opacity" },
                { field: "backgroundShape", name: "Shape", rule: "R8" },
                { field: "cornerRadius", name: "Corners" },
                { field: "padding", name: "Padding", units: ["boxPadding"] },
                { field: "padding", name: "Unit", fullName: "Padding unit", rule: "R8", unit: PADDING_UNIT },
                // The lines under the Gradient switch read as its: "Kind" is the gradient's kind.
                { field: "gradient", name: "Gradient" },
                { field: "gradientType", name: "Kind", fullName: "Gradient kind", rule: "R8", needs: "gradient" },
                { field: "gradientColors", name: "Colors", fullName: "Gradient colors", needs: "gradient" },
                {
                    field: "gradientDirection",
                    name: "Direction",
                    fullName: "Gradient direction",
                    rule: "R8f",
                    needs: "gradient",
                },
            ],
        },
        {
            name: "Box stroke",
            divider: true,
            lines: [
                { field: "borderWidth", name: "Width", fullName: "Box stroke width" },
                { field: "borderColor", name: "Color", fullName: "Box stroke color" },
                { field: "borderOpacity", name: "Opacity", fullName: "Box stroke opacity" },
                { field: "borderAlign", name: "Align", fullName: "Box stroke align", rule: "R8" },
                { field: "lineBox", name: "Line box", rule: "R8f" },
                // Margin is the space outside the stroke, so it sits with it.
                {
                    field: "marginTop",
                    name: "Margin",
                    sides: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
                },
            ],
        },
        {
            name: "Label shadow",
            lines: [
                // Each look's switch leads its lines, which read as its (ia-design: "Text shadow ...", "Box shadow ...").
                { field: "shadow", name: "Text shadow" },
                { field: "shadowColor", name: "Color", fullName: "Text shadow color", needs: "shadow" },
                { field: "shadowBlur", name: "Blur", fullName: "Text shadow blur", needs: "shadow" },
                {
                    field: "shadowOffsetX",
                    name: "Offset",
                    fullName: "Text shadow offset",
                    pair: "shadowOffsetY",
                    letters: XY,
                    needs: "shadow",
                },
                { field: "panelShadow", name: "Box shadow" },
                { field: "panelShadowColor", name: "Color", fullName: "Box shadow color", needs: "panelShadow" },
                { field: "panelShadowBlur", name: "Blur", fullName: "Box shadow blur", needs: "panelShadow" },
                {
                    field: "panelShadowOffsetX",
                    name: "Offset",
                    fullName: "Box shadow offset",
                    pair: "panelShadowOffsetY",
                    letters: XY,
                    needs: "panelShadow",
                },
            ],
        },
        {
            name: "Callout",
            on: "pointer",
            lines: [
                { field: "pointer", name: "Pointer" },
                { field: "pointerDirection", name: "Direction", fullName: "Pointer direction", rule: "R8f" },
                {
                    field: "pointerWidth",
                    name: "Size",
                    fullName: "Pointer size",
                    pair: "pointerHeight",
                    letters: ["W", "H"],
                },
                { field: "pointerOffset", name: "Offset", fullName: "Pointer offset" },
                { field: "pointerCurve", name: "Curved" },
            ],
        },
        {
            name: "Badge",
            lines: [
                { field: "badge", name: "Badge", rule: "R9" },
                { field: "icon", name: "Icon", fullName: "Icon beside text", rule: "R14" },
                { field: "iconPosition", name: "Icon side", rule: "R8" },
                { field: "progress", name: "Progress" },
                { field: "maxNumber", name: "Max number" },
                { field: "overflowSuffix", name: "Suffix", rule: "R14" },
                { field: "smartOverflow", name: "Shorten large numbers" },
            ],
        },
        {
            name: "Behavior",
            lines: [
                { field: "minScreenSize", name: "Min size" },
                { field: "declutter", name: "Declutter", rule: "R8" },
                { field: "minNodeScreenSize", name: "Min node" },
                { field: "depthFade", name: "Depth fade" },
                { field: "depthFadeNear", name: "Fade", pair: "depthFadeFar" },
                { field: "animation", name: "Animation", rule: "R9" },
                { field: "animationSpeed", name: "Speed" },
                { field: "pickable", name: "Pickable" },
                { field: "closeButton", name: "Close button" },
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
    // "Ink", not "Glyphs": the Label row's Glyph kind is a different thing (E275).
    lineBox: { font: { name: "Font" }, size: { name: "Size" }, glyphs: { name: "Ink" } },
    runAlign: { baseline: { name: "Baseline" }, hanging: { name: "Hanging" }, middle: { name: "Middle" } },
    // Four segments fit the line only with short names: "Side" for Beside, "Band" for the words moved in the band.
    box: {
        words: { name: "Words" },
        "words-at-side": { name: "Side" },
        "target-width": { name: "Target" },
        "words-in-target": { name: "Band" },
    },
    shiftOf: { box: { name: "Box" }, words: { name: "Words" } },
    gapOf: { box: { name: "Box" }, words: { name: "Words" } },
    declutter: { degree: { name: "Degree" }, size: { name: "Size" } },
    backgroundShape: { rectangle: { name: "Box" }, circle: { name: "Circle" } },
    gradientType: { linear: { name: "Linear" }, radial: { name: "Radial" } },
    gradientDirection: { vertical: { name: "Down" }, horizontal: { name: "Across" }, diagonal: { name: "Diagonal" } },
    weight: { normal: { name: "Regular" }, bold: { name: "Bold" } },
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
 * Every field a line edits: its own, its pair's, its other units' and its units'
 * (with what they write besides).
 * @param line - the line.
 * @returns the fields.
 */
export function labelLineFields(line: LabelLineSpec): readonly LabelField[] {
    return [
        line.field,
        ...(line.pair === undefined ? [] : [line.pair]),
        ...(line.sides?.filter((side) => side !== line.field) ?? []),
        ...(line.units ?? []),
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

/** Every field the panel places somewhere: the rubric's, and the look, a kind in a text row's Switch to (E196). */
export const LABEL_COVERED: ReadonlySet<LabelField> = new Set<LabelField>([
    ...[...LABEL_RUBRIC.common, ...LABEL_RUBRIC.main].flatMap((line) => labelLineFields(line)),
    ...LABEL_RUBRIC.groups.flatMap((group) => labelGroupFields(group)),
    "look",
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
