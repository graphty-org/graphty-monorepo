/**
 * Style panel v2's text things (design/ui/style-panel-v2/design.md, sections 7.1, 7.3 and 7.4): a
 * label, an external label and a tooltip each edit one label style channel field by field. This
 * table says where each field sits (the row's common lines, the pop-over's Main, the sub-groups
 * its "+" adds), which control it draws and the display name or glyph of an option where the
 * element's own name is not what the panel shows. What a field takes is read from graphty-element's
 * `LABEL_STYLE_DESCRIPTORS`; the channel that varies a field by data from its `textFieldOf`.
 */

import {
    type Channel,
    channelsFor,
    LABEL_STYLE_DESCRIPTORS,
    type LabelStyleFieldDescriptor,
    textFieldOf,
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
     * Drawn under the switch line above it, its name indented, so a short name ("Opacity" under Letter outline)
     * reads as that look's whether the switch is on or off.
     */
    readonly under?: true;
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
    /** R7t: the flags drawn as icon toggles after the line's own field, on one line (Bold, Italic, ...). */
    readonly toggles?: readonly LabelField[];
}

/** One group of a label's settings: an entry of its pop-over's "..." menu, under its heading (design "Input rules"). */
export interface LabelGroup {
    readonly name: string;
    /** The menu heading it is listed under. */
    readonly heading: string;
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

/** A width | height pair. */
const WH = ["W", "H"] as const;

/** Every label's rubric (design 7.3). */
export const LABEL_RUBRIC: LabelRubric = {
    common: [
        { field: "size", name: "Size", units: ["sizePx", "letterSize"] },
        { field: "color", name: "Color" },
    ],
    main: [
        { field: "enabled", name: "Show" },
        { field: "font", name: "Font", rule: "R13" },
        // Bold, Italic, Underline and Strikethrough as a text editor's toggles (owner, 2026-11-23); Bold writes the
        // weight, whose number is the Letters group's.
        { field: "weight", name: "Style", rule: "R7t", toggles: ["italic", "underline", "strikethrough"] },
        { field: "location", name: "Location", rule: "R2" },
    ],
    // Sixteen groups under four headings in the pop-over's "..." menu, each its own pop-over of at most 6 rows (owner's
    // input rules, 2026-11-24).
    groups: [
        {
            name: "Position",
            heading: "Placement",
            lines: [
                { field: "attachOffset", name: "Distance" },
                { field: "offsetX", name: "Offset", pair: "offsetY", letters: XY },
                { field: "onTop", name: "On top" },
                { field: "keepInView", name: "Keep in view" },
            ],
        },
        {
            name: "Alignment",
            heading: "Placement",
            lines: [
                { field: "box", name: "Box", rule: "R8f" },
                { field: "textAlign", name: "Align", rule: "R8" },
                { field: "shiftX", name: "Shift", pair: "shiftY", letters: XY },
                { field: "shiftOf", name: "Shift of", rule: "R8" },
                { field: "gapOf", name: "Gap of", rule: "R8" },
            ],
        },
        {
            name: "Hiding",
            heading: "Placement",
            lines: [
                { field: "minScreenSize", name: "Min size" },
                { field: "minNodeScreenSize", name: "Min node" },
                { field: "declutter", name: "Declutter", rule: "R8f" },
                { field: "depthFade", name: "Depth fade" },
                { field: "depthFadeNear", name: "Fade", pair: "depthFadeFar" },
            ],
        },
        {
            name: "Letters",
            heading: "Letters",
            lines: [
                { field: "size", name: "Unit", fullName: "Size unit", rule: "R8f", unit: SIZE_UNIT },
                // The number of the weight (Bold is the Style line's toggle).
                { field: "weight", name: "Weight", rule: "R5" },
                { field: "opacity", name: "Opacity" },
                { field: "lineHeight", name: "Line height" },
                { field: "rotation", name: "Rotation" },
                { field: "runAlign", name: "Run align", rule: "R8f" },
            ],
        },
        {
            // The letters' own stroke; the box's is Box stroke (ia-design: no look has two homes).
            name: "Letter outline",
            heading: "Letters",
            lines: [
                { field: "outline", name: "Letter outline" },
                { field: "outlineWidth", name: "Width", fullName: "Letter outline width", under: true },
                { field: "outlineOpacity", name: "Opacity", fullName: "Letter outline opacity", under: true },
            ],
        },
        {
            name: "Text shadow",
            heading: "Letters",
            lines: [
                { field: "shadow", name: "Text shadow" },
                { field: "shadowColor", name: "Color", fullName: "Text shadow color", under: true },
                { field: "shadowBlur", name: "Blur", fullName: "Text shadow blur", under: true },
                {
                    field: "shadowOffsetX",
                    name: "Offset",
                    fullName: "Text shadow offset",
                    under: true,
                    pair: "shadowOffsetY",
                    letters: XY,
                },
            ],
        },
        {
            name: "Wrap",
            heading: "Letters",
            lines: [
                { field: "wrapWidth", name: "Wrap", pair: "maxLines" },
                { field: "wrapAnywhere", name: "Break anywhere" },
                { field: "wrapEllipsis", name: "Cut long lines" },
                { field: "maxLinesEllipsis", name: "Ellipsis at max lines" },
            ],
        },
        {
            name: "Wrap spacing",
            heading: "Letters",
            lines: [
                { field: "keepBlankLines", name: "Keep blank lines" },
                { field: "wrapTrailingSpace", name: "Trailing space" },
                { field: "wrapSkipEndSpace", name: "Skip end space" },
                { field: "wrapSpaceCount", name: "Space count" },
            ],
        },
        {
            // Its Solid, Linear and Radial tab strip (LabelPopover.tsx) writes `gradient` and `gradientType`.
            name: "Background",
            heading: "Box",
            lines: [
                { field: "background", name: "Color", fullName: "Background color" },
                { field: "gradientColors", name: "Colors", fullName: "Gradient colors" },
                {
                    field: "gradientDirection",
                    name: "Direction",
                    fullName: "Gradient direction",
                    rule: "R8f",
                },
                { field: "backgroundOpacity", name: "Opacity", fullName: "Background opacity" },
                { field: "backgroundShape", name: "Shape", rule: "R8" },
                { field: "cornerRadius", name: "Corners" },
            ],
        },
        {
            name: "Box size",
            heading: "Box",
            lines: [
                { field: "lineBox", name: "Line box", rule: "R8f" },
                { field: "padding", name: "Padding", units: ["boxPadding"] },
                { field: "padding", name: "Unit", fullName: "Padding unit", rule: "R8", unit: PADDING_UNIT },
                // Margin is the space outside the stroke.
                {
                    field: "marginTop",
                    name: "Margin",
                    sides: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
                },
            ],
        },
        {
            name: "Box stroke",
            heading: "Box",
            lines: [
                { field: "borderWidth", name: "Width", fullName: "Box stroke width" },
                { field: "borderColor", name: "Color", fullName: "Box stroke color" },
                { field: "borderOpacity", name: "Opacity", fullName: "Box stroke opacity" },
                { field: "borderAlign", name: "Align", fullName: "Box stroke align", rule: "R8" },
                { field: "borderStyle", name: "Style", fullName: "Box stroke style", rule: "R8" },
            ],
        },
        {
            name: "Box shadow",
            heading: "Box",
            lines: [
                { field: "panelShadow", name: "Box shadow" },
                { field: "panelShadowColor", name: "Color", fullName: "Box shadow color", under: true },
                { field: "panelShadowBlur", name: "Blur", fullName: "Box shadow blur", under: true },
                {
                    field: "panelShadowOffsetX",
                    name: "Offset",
                    fullName: "Box shadow offset",
                    under: true,
                    pair: "panelShadowOffsetY",
                    letters: XY,
                },
            ],
        },
        {
            name: "Callout",
            heading: "Extras",
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
            heading: "Extras",
            lines: [
                { field: "badge", name: "Badge", rule: "R9" },
                { field: "progress", name: "Progress" },
                { field: "maxNumber", name: "Max number" },
                { field: "overflowSuffix", name: "Suffix", rule: "R14" },
                { field: "smartOverflow", name: "Shorten large numbers" },
            ],
        },
        {
            name: "Icon and image",
            heading: "Extras",
            lines: [
                { field: "icon", name: "Icon", fullName: "Icon beside text", rule: "R14" },
                { field: "iconPosition", name: "Icon side", rule: "R8" },
                // A picture in the label beside or behind its words (yEd's label icon), its size and where it sits.
                { field: "image", name: "Image", fullName: "Label image", rule: "R16" },
                { field: "imageWidth", name: "Image size", pair: "imageHeight", letters: WH },
                { field: "imageOffsetX", name: "Image offset", pair: "imageOffsetY", letters: XY },
            ],
        },
        {
            name: "Animation and clicks",
            heading: "Extras",
            lines: [
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
        // Every option pictured, Auto too: an option set is all glyphs or all words (E674, E418).
        top: { name: "Up", glyph: "pointUp" },
        bottom: { name: "Down", glyph: "pointDown" },
        left: { name: "Left", glyph: "pointLeft" },
        right: { name: "Right", glyph: "pointRight" },
        auto: { name: "Auto", glyph: "pointAuto" },
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
    // Unset, only the layout's own declutter hides labels: "Off", which picking unsets (no empty line).
    declutter: { degree: { name: "Degree" }, size: { name: "Size" }, "": { name: "Off" } },
    backgroundShape: { rectangle: { name: "Box" }, circle: { name: "Circle" } },
    borderStyle: { solid: { name: "Solid" }, double: { name: "Double" } },
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
        ...(line.toggles ?? []),
        ...(line.pair === undefined ? [] : [line.pair]),
        ...(line.sides?.filter((side) => side !== line.field) ?? []),
        ...(line.units ?? []),
        ...(line.unit ?? []).flatMap((unit) => [unit.field, ...(Object.keys(unit.also ?? {}) as LabelField[])]),
    ];
}

/** The label group whose tab strip is Solid, Linear or Radial. */
export const BACKGROUND = "Background";

/** The Background group's tabs: a single color, or a gradient of either kind (`gradientType`). */
export const BACKGROUND_TABS = [
    { value: "solid", name: "Solid" },
    { value: "linear", name: "Linear" },
    { value: "radial", name: "Radial" },
] as const;

/**
 * Every field a group's lines edit, and the Background group's gradient fields its tab strip writes.
 * @param group - the group.
 * @returns the fields.
 */
export function labelGroupFields(group: LabelGroup): readonly LabelField[] {
    return [
        ...(group.name === BACKGROUND ? (["gradient", "gradientType"] as const) : []),
        ...group.lines.flatMap((line) => labelLineFields(line)),
    ];
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
 * (`node.labelColor` for `node.labelStyle`'s color), from graphty-element's `textFieldOf`.
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
                const found = textFieldOf(channel);
                return found?.into === style ? [[found.field, channel] as const] : [];
            }),
        );
        FLATS.set(style, fields);
    }
    return fields.get(field);
}

/**
 * The fields a label line's by-data link binds, each through its own channel (`node.labelColor` for `color`,
 * graphty-element's `textFieldOf`): the field it edits (or its first other unit with a channel), then its
 * pair's. A field with no channel of its own does not vary by data in graphty-element, and a Unit line edits no
 * value. Shared by the line and the style inventory test.
 * @param side - nodes or edges.
 * @param style - the text kind's label style channel.
 * @param line - the line.
 * @param editing - the field the line edits now, when one of its units holds the value.
 * @returns each field and its channel.
 */
export function linkedFields(
    side: "node" | "edge",
    style: Channel,
    line: LabelLineSpec,
    editing: LabelField = line.field,
): readonly { readonly field: LabelField; readonly channel: Channel }[] {
    if (line.unit !== undefined) {
        return [];
    }
    const units = [editing, ...[line.field, ...(line.units ?? [])].filter((each) => each !== editing)];
    // A font style line's toggles (Italic, ...) vary by data from its link too, each its own choice.
    return [...units, ...(line.toggles ?? []), ...(line.pair === undefined ? [] : [line.pair])].flatMap((field) => {
        const channel = flatOf(side, style, field);
        return channel === undefined ? [] : [{ field, channel }];
    });
}

/**
 * Every field of a text kind that varies by data from a line's by-data link: `linkedFields` over every line of
 * the label rubric.
 * @param side - nodes or edges.
 * @param style - the text kind's label style channel.
 * @returns the fields.
 */
export function varyingFields(side: "node" | "edge", style: Channel): ReadonlySet<LabelField> {
    const lines = [
        ...LABEL_RUBRIC.common,
        ...LABEL_RUBRIC.main,
        ...LABEL_RUBRIC.groups.flatMap((group) => group.lines),
    ];
    return new Set(lines.flatMap((line) => linkedFields(side, style, line).map(({ field }) => field)));
}
