/**
 * What a style layer can say about a label.
 *
 * ITS OWN FILE BECAUSE TWO THINGS GROW HERE AT ONCE. The channel vocabulary in `types.ts` gains
 * channels; this interface gains fields; and the two are edited for different reasons by
 * different people. Splitting them is what lets a label field be added without touching the
 * channel union.
 *
 * NAMED FOR WHAT A READER SEES, NOT FOR WHAT THE CANVAS DOES. The renderer's own schema,
 * `RichTextStyle`, is fifty-nine fields of canvas vocabulary -- `textOutlineJoin`, `billboardMode`,
 * `resolution`, `autoSize` -- grown over years of drawing code. Publishing that shape as the
 * channel's value type would make every one of those names permanent public API. So this is a
 * closed vocabulary of the things a reader can point at on screen, and `StylePainter.richTextOf`
 * translates it into the renderer's spelling in one place.
 *
 * WHAT IS NOT HERE IS DELIBERATE. A field belongs here when `RichTextLabel` really draws it. The
 * renderer's `maxWidth` and `wrap` did not, and were published on this interface anyway until
 * 2.0: a consumer could write them, the painter dropped them on the floor, and the only record
 * was a sentence in a channel caveat. They are gone rather than kept as a promise nothing keeps.
 */

import { DEFAULT_LABEL_GRADIENT_COLORS, defaultRichTextLabelStyle } from "../config/RichTextStyle";
import type { LabelLookId } from "./label-looks";

/**
 * Where a label sits relative to the node or edge it belongs to: beyond a side or a corner of it, in its middle
 * (`center`), or inside a node against a side or in a corner (`inside-top`, `inside-top-right`, ...), as a group's
 * header label sits along its top. An edge's label has no inside: an `inside-` location draws it in the middle.
 */
export type LabelLocation =
    | "top"
    | "top-right"
    | "top-left"
    | "left"
    | "center"
    | "right"
    | "bottom"
    | "bottom-left"
    | "bottom-right"
    | "inside-top"
    | "inside-bottom"
    | "inside-left"
    | "inside-right"
    | "inside-top-left"
    | "inside-top-right"
    | "inside-bottom-left"
    | "inside-bottom-right"
    | "automatic";

/**
 * Which labels {@link LabelStyle.declutter} keeps first where two would overlap: the node with more
 * edges (`"degree"`, as `layoutBehavior.labels.declutter` does), or the larger label and then the
 * larger node (`"size"`).
 */
export type LabelDeclutterOrder = "degree" | "size";

/** How the words inside a label are lined up. */
export type LabelTextAlign = "left" | "center" | "right";

/** The shape of the panel behind a label, when it is painted as a gradient rather than a colour. */
export type LabelGradientType = "linear" | "radial";

/** Which way a label's background gradient runs. */
export type LabelGradientDirection = "vertical" | "horizontal" | "diagonal";

/** Which side of a label its speech-bubble pointer comes out of. */
export type LabelPointerDirection = "top" | "bottom" | "left" | "right" | "auto";

/** How a label moves, when it moves. */
export type LabelAnimation = "none" | "pulse" | "bounce" | "shake" | "glow" | "fill";

/** The badge drawn on a label, which replaces or decorates the words. */
export type LabelBadge =
    | "notification"
    | "label"
    | "label-success"
    | "label-warning"
    | "label-danger"
    | "count"
    | "icon"
    | "progress"
    | "dot";

/** Which side of a label's words its icon sits on. */
export type LabelIconPosition = "left" | "right";

/**
 * What a label's `sizePx` is measured in: `"world"` scales the label with the scene, so it grows
 * as the camera comes closer; `"screen"` keeps its letters `sizePx` CSS pixels tall at any zoom.
 */
export type LabelSizeMode = "world" | "screen";

/** How a label is drawn. */
export interface LabelStyle {
    /**
     * A named look this label starts from, such as `"card"`: one of `LABEL_LOOKS`.
     *
     * The look's fields are painted as if this layer wrote them, and every other field here wins
     * over the look's. Write the look plus only the fields that differ from it;
     * `labelLookChanges` lists which those are.
     * @since 3.26.0
     */
    look?: LabelLookId;

    /**
     * Whether the label is drawn at all.
     *
     * Writing the words through `node.label` or `edge.label` switches a label on. Written
     * `false`, this switches one back OFF while leaving its text resolved -- which is how a layer
     * hides labels on part of a graph without taking the words away from the layers under it.
     *
     * Written `true` on `node.labelStyle` with no `node.label` anywhere in the stack, it switches
     * node labels on with the element's own words, which are each node's id. A layer that only
     * wants labels on never has to name an attribute to draw.
     */
    enabled?: boolean;

    /** The typeface, as a CSS font family. */
    font?: string;
    /**
     * How tall the letters are drawn on the label's own canvas; with `sizeMode: "screen"`, how
     * tall they are on screen, in CSS pixels.
     */
    sizePx?: number;
    /** What `sizePx` is measured in. The default, `"world"`, scales the label with the scene. */
    sizeMode?: LabelSizeMode;
    /**
     * How tall one line of the label is drawn in the scene, in the same units as a node's `size`:
     * `size: 1` beside a node of size 1 draws a line as tall as the node. Unset, a line is
     * `sizePx / 48` tall, so the letters' canvas size also sets their size in the scene. Set,
     * `sizePx` only sets how sharply the letters are drawn.
     */
    size?: number;
    /**
     * How tall the letters are drawn in the scene -- one font size, an em -- in the same units as a
     * node's `size`, whatever the font's own line height. Set, it decides the label's size in the
     * scene over `size`, and `sizePx` only sets how sharply the letters are drawn.
     */
    letterSize?: number;
    /** How heavy the letters are. */
    weight?: number | "normal" | "bold";
    /** The colour of the letters. */
    color?: string;
    /** Whether the letters are drawn italic. */
    italic?: boolean;
    /**
     * How wide one line may be drawn before its words wrap onto the next, in the units of `size`
     * (the scene's). Unset, a line is as long as its words.
     */
    wrapWidth?: number;
    /**
     * Whether a space after each word counts toward `wrapWidth`, the last word's too: a line keeps a
     * word only while the word and a space after it still fit, as Cytoscape desktop measures a line.
     * Unset or false, only the words count, as a browser wraps text.
     */
    wrapTrailingSpace?: boolean;
    /**
     * Whether a line wider than `wrapWidth` is cut to fit, with an ellipsis after the letters kept, in place of
     * wrapping onto more lines (Cytoscape.js `text-wrap: ellipsis`). Unset or false, it wraps.
     */
    wrapEllipsis?: boolean;
    /**
     * Whether a line may break between any two letters, filling each line to `wrapWidth`, not only at the spaces
     * between words (Cytoscape.js `text-overflow-wrap: anywhere`). Unset or false, only at spaces.
     */
    wrapAnywhere?: boolean;
    /**
     * How many blanks one blank between two words counts as when a line is measured against `wrapWidth`; the
     * blank is still drawn once (vis-network counts three). Unset, one.
     */
    wrapSpaceCount?: number;
    /**
     * The most lines the label draws, a whole number from 1. A label with more lines -- its own, or
     * the ones `wrapWidth` breaks it into -- keeps the first ones and ends the last one kept in an
     * ellipsis. Unset, every line is drawn.
     * @since 3.38.0
     */
    maxLines?: number;
    /**
     * Whether a blank line before or between lines of words is drawn one line of the label's font tall, as a text
     * layout sets it (yEd draws "\nCS" two lines tall). Unset or false, a blank line takes no height. A blank line
     * after the last words takes none either way.
     */
    keepBlankLines?: boolean;
    /**
     * Where runs of different sizes in one line of label markup meet: their alphabetic baselines ("baseline"), their
     * hanging baselines, so their tops line up ("hanging", as vis-network draws a label below a node), or their middles
     * ("middle"). Unset, their alphabetic baselines.
     */
    runAlign?: "baseline" | "hanging" | "middle";
    /**
     * How far the label is turned, in degrees clockwise as the reader sees it, about its own center.
     * Unset or 0, it reads level.
     */
    rotation?: number;
    /** The gap between one line of text and the next, as a multiple of the font size. */
    lineHeight?: number;
    /**
     * The label is not drawn while its letters are drawn smaller than this many pixels on screen,
     * as a program that hides labels too small to read does. Decided again whenever the camera
     * moves. Unset or 0, the label is drawn at any size.
     */
    minScreenSize?: number;
    /**
     * Hides this node label where its words would overlap a label kept before it, the way
     * `layoutBehavior.labels.declutter` hides every node label, but for the labels this style
     * reaches only. The value says which label is kept first: a selected node's always, then
     * the node with more edges (`"degree"`) or the larger label and then the larger node
     * (`"size"`). Unset, only `layoutBehavior.labels.declutter` hides labels. Node labels only.
     */
    declutter?: LabelDeclutterOrder;
    /**
     * This node label is not drawn while its node is drawn smaller than this many pixels across on
     * screen (the smaller of its width and height), as sigma.js hides the label of a node drawn
     * under its `labelRenderedSizeThreshold`. Decided again whenever the camera moves. Unset or 0,
     * the node's size never hides its label. Node labels only.
     */
    minNodeScreenSize?: number;
    /** How the lines are lined up against each other. */
    textAlign?: LabelTextAlign;

    /**
     * How opaque the words are, from 0 (not drawn) to 1, applied over their colour's own alpha.
     * Unset, 1.
     */
    opacity?: number;

    /** The colour of the panel behind the words. */
    background?: string;
    /**
     * How opaque that panel is, from 0 (not drawn) to 1, applied over its colour's own alpha.
     * Unset, 1.
     */
    backgroundOpacity?: number;
    /** How much room there is between the words and the edge of that panel. */
    padding?: number;
    /**
     * How far the panel (its background and border) reaches past the words' line box on every
     * side, in pixels of the label drawn at its own size; 0 puts the border against the words.
     * Set, it replaces the margins and `padding`. Unset, they decide.
     */
    boxPadding?: number;
    /** How far the panel's corners are rounded. */
    cornerRadius?: number;
    /** How thick a border is drawn around the panel; zero draws none. */
    borderWidth?: number;
    /** The colour of that border. */
    borderColor?: string;
    /**
     * How opaque that border is, from 0 (not drawn) to 1, applied over its colour's own alpha.
     * Unset, 1.
     */
    borderOpacity?: number;
    /** Whether the panel is filled with a gradient rather than a single colour. */
    gradient?: boolean;
    /** Whether that gradient runs in a line or out from the centre. */
    gradientType?: LabelGradientType;
    /** The colours the gradient runs through, in order. */
    gradientColors?: readonly string[];
    /** Which way a linear gradient runs. */
    gradientDirection?: LabelGradientDirection;

    /** Where the label sits relative to its node or edge. */
    location?: LabelLocation;
    /** How far from the node or edge it sits, in world units. */
    attachOffset?: number;
    /**
     * How far the label is moved to the right of where `location` puts it, in the units of `size`
     * (the scene's). Unset, 0.
     */
    offsetX?: number;
    /** How far the label is moved down from where `location` puts it, in the units of `size`. Unset, 0. */
    offsetY?: number;
    /**
     * How far the label is moved to the right of where `location` and `offsetX` put it, as a
     * fraction of its own width: -0.5 puts its right edge where its middle was. Measured along the
     * label's own axes, turned by `rotation`, so a turned label turns about the point the shift
     * pins. Unset, 0.
     */
    shiftX?: number;
    /** How far the label is moved down, as a fraction of its own height; see `shiftX`. Unset, 0. */
    shiftY?: number;
    /**
     * What `shiftX` and `shiftY` are fractions of: `"box"`, the label's whole box, the margins round its words
     * included, or `"words"`, its words alone, so a shift of 0.5 puts the words' own left edge where their middle
     * was, as a program that anchors a label's text draws it (Pajek's `text-anchor: start`). Unset, `"box"`. A label style merges field by field, so a layer that sets only `shiftX` over
     * one that set `shiftOf` (a file's style layer does, for Pajek) keeps that layer's `shiftOf`.
     */
    shiftOf?: "box" | "words";
    /**
     * What a label outside its node (`location` `top`, `bottom`, `left`, `right` or a corner) is placed against the
     * node by: `"box"`, the label's whole box, the margins round its words included, or `"words"`, its words' own font
     * box, so the bottom of a top label's words sits on the node's outline, as Cytoscape.js draws it. Unset, `"box"`.
     */
    gapOf?: "box" | "words";
    /**
     * What the label's box is sized to, and what becomes of a box larger than its target. `"words"`: the box is round
     * its words, and an `inside-*` label too large for its target is centered on that axis. `"words-at-side"`: the box
     * is round its words, and an `inside-*` label stays against the side it names however large it is, its far end
     * reaching past the target. `"target-width"`: as `"words-at-side"`, and the box is at least as wide as its target,
     * a band across it, with `textAlign` lining the words up inside it. A label with no box of a target to measure (on
     * an edge, or at a point) keeps the box round its words. Unset, `"words"`.
     */
    box?: "words" | "words-at-side" | "target-width";
    /**
     * Whether the panel is kept inside the canvas. One that would cross an edge first moves to
     * the other side of its node (right to left, top to bottom), then is moved in if it still
     * does not fit. Off by default.
     */
    keepInView?: boolean;
    /** Empty space above the panel. */
    marginTop?: number;
    /** Empty space below the panel. */
    marginBottom?: number;
    /** Empty space to the left of the panel. */
    marginLeft?: number;
    /** Empty space to the right of the panel. */
    marginRight?: number;

    /** Whether a speech-bubble pointer comes out of the panel. */
    pointer?: boolean;
    /** Which side it comes out of. */
    pointerDirection?: LabelPointerDirection;
    /** How wide the pointer is where it meets the panel. */
    pointerWidth?: number;
    /** How far the pointer reaches away from the panel. */
    pointerHeight?: number;
    /** How far along that side the pointer sits, from the middle. */
    pointerOffset?: number;
    /** Whether the pointer's sides are drawn as curves rather than straight lines. */
    pointerCurve?: boolean;

    /** The colour of an outline around each letter; writing one is what switches the outline on. */
    outline?: string;
    /** How thick that outline is drawn. */
    outlineWidth?: number;
    /**
     * How opaque that outline is, from 0 (not drawn) to 1, applied over its colour's own alpha.
     * Unset, 1.
     */
    outlineOpacity?: number;
    /** Whether the letters cast a shadow. */
    shadow?: boolean;
    /** The colour of that shadow. */
    shadowColor?: string;
    /** How far the shadow is blurred. */
    shadowBlur?: number;
    /** How far the shadow is thrown to the right. */
    shadowOffsetX?: number;
    /** How far the shadow is thrown downwards. */
    shadowOffsetY?: number;

    /**
     * Whether the panel casts a drop shadow. The label grows by the shadow's blur and offset, so
     * the shadow is never cut off; the panel stays where it was.
     */
    panelShadow?: boolean;
    /** The color of the panel's shadow. */
    panelShadowColor?: string;
    /** How far the panel's shadow is blurred, on the label's own canvas. */
    panelShadowBlur?: number;
    /** How far the panel's shadow is thrown to the right. */
    panelShadowOffsetX?: number;
    /** How far the panel's shadow is thrown downwards. */
    panelShadowOffsetY?: number;

    /** How the label moves. */
    animation?: LabelAnimation;
    /** How fast it moves, as a multiple of the animation's own speed. */
    animationSpeed?: number;

    /** Whether the label fades out as the camera moves away from it. */
    depthFade?: boolean;
    /** How close the camera has to be for the label to be drawn at full strength. */
    depthFadeNear?: number;
    /** How far away the camera has to be for the label to have faded out entirely. */
    depthFadeFar?: number;
    /**
     * Whether the label is drawn over the whole graph rather than sorted by depth with it.
     *
     * Off by default: a node or an edge nearer the camera passes in front of the label, as it
     * passes in front of any other node. On, nothing in the graph covers the label -- a name
     * behind a nearer sphere, or under a selected edge's band, stays whole.
     */
    onTop?: boolean;
    /**
     * Whether a click on a node's label counts as a click on that node.
     *
     * Off by default: the label takes the click and answers no node, so a click on a name
     * selects nothing and `elementAt` there returns nothing. On, a click, a hover, a drag and
     * `elementAt` on the label all answer the node it labels. An edge's label is not affected.
     */
    pickable?: boolean;

    /** A badge drawn in place of, or beside, the words. */
    badge?: LabelBadge;
    /** The glyph a badge draws when it is an icon badge. */
    icon?: string;
    /** Which side of the words that icon sits on. */
    iconPosition?: LabelIconPosition;
    /** How full a progress badge is drawn, from 0 to 1. */
    progress?: number;

    /**
     * Whether a number too large to show is shortened rather than drawn in full.
     *
     * With this on, a label reading a count above {@link LabelStyle.maxNumber} is drawn as that
     * maximum followed by {@link LabelStyle.overflowSuffix} -- `99+` rather than `1500`.
     */
    smartOverflow?: boolean;
    /** The largest number drawn in full before the suffix takes over. */
    maxNumber?: number;
    /** What is drawn after a shortened number. */
    overflowSuffix?: string;

    /**
     * Whether the panel draws an x in its top-right corner, in the label's text colour.
     *
     * A click on the x clears the selection, as a click on empty canvas does. A click anywhere
     * else on a label with this on does nothing: it does not reach the node or the background
     * behind the label. Off, a click on the label is a click on no node, as it always was.
     * @since 3.29.0
     */
    closeButton?: boolean;
}

/**
 * Every field {@link LabelStyle} publishes, as a list something can iterate.
 *
 * A SETTINGS PANEL AND A STORY CONTROL BOTH NEED THIS, and the only alternative is each of them
 * restating the field names -- which is how the Storybook controls came to offer seven fields
 * long after the vocabulary had more. The object below is `satisfies Record<keyof LabelStyle, 0>`
 * rather than a hand-written array, so adding a field to the interface without adding it here
 * fails to compile, and naming one that is not on the interface fails too.
 */
export const LABEL_STYLE_FIELDS: readonly (keyof LabelStyle)[] = Object.keys({
    look: 0,
    enabled: 0,
    font: 0,
    sizePx: 0,
    sizeMode: 0,
    size: 0,
    letterSize: 0,
    weight: 0,
    color: 0,
    italic: 0,
    wrapWidth: 0,
    wrapTrailingSpace: 0,
    wrapEllipsis: 0,
    wrapAnywhere: 0,
    wrapSpaceCount: 0,
    maxLines: 0,
    keepBlankLines: 0,
    runAlign: 0,
    rotation: 0,
    lineHeight: 0,
    minScreenSize: 0,
    declutter: 0,
    minNodeScreenSize: 0,
    onTop: 0,
    textAlign: 0,
    opacity: 0,
    background: 0,
    backgroundOpacity: 0,
    padding: 0,
    boxPadding: 0,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: 0,
    borderOpacity: 0,
    gradient: 0,
    gradientType: 0,
    gradientColors: 0,
    gradientDirection: 0,
    location: 0,
    attachOffset: 0,
    offsetX: 0,
    offsetY: 0,
    shiftX: 0,
    shiftY: 0,
    shiftOf: 0,
    gapOf: 0,
    box: 0,
    keepInView: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    pointer: 0,
    pointerDirection: 0,
    pointerWidth: 0,
    pointerHeight: 0,
    pointerOffset: 0,
    pointerCurve: 0,
    outline: 0,
    outlineWidth: 0,
    outlineOpacity: 0,
    shadow: 0,
    shadowColor: 0,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    panelShadow: 0,
    panelShadowColor: 0,
    panelShadowBlur: 0,
    panelShadowOffsetX: 0,
    panelShadowOffsetY: 0,
    animation: 0,
    animationSpeed: 0,
    depthFade: 0,
    depthFadeNear: 0,
    depthFadeFar: 0,
    pickable: 0,
    badge: 0,
    icon: 0,
    iconPosition: 0,
    progress: 0,
    smartOverflow: 0,
    maxNumber: 0,
    overflowSuffix: 0,
    closeButton: 0,
} satisfies Record<keyof LabelStyle, 0>) as (keyof LabelStyle)[];

/**
 * Which rich-text key each label field is written to, where the only difference is the name.
 *
 * A TABLE RATHER THAN A LADDER OF IFS, because the ladder is what rotted. Each `if` had to be
 * written by hand, so the seven that existed when channels were introduced stayed seven while
 * `RichTextLabel` went on drawing margins, pointers, badges, shadows and depth fade that no
 * layer could ask for -- and seventeen stories were deleted rather than migrated because of it.
 * The fields that are NOT a plain rename are handled beneath this, and every one of them is
 * covered by a case in `test/session/styles/label-style.test.ts`.
 * @internal
 */
export const RICH_TEXT_KEYS = {
    enabled: "enabled",
    font: "font",
    sizePx: "fontSize",
    sizeMode: "sizeMode",
    size: "size",
    letterSize: "letterSize",
    wrapWidth: "wrapWidth",
    wrapTrailingSpace: "wrapTrailingSpace",
    wrapEllipsis: "wrapEllipsis",
    wrapAnywhere: "wrapAnywhere",
    wrapSpaceCount: "wrapSpaceCount",
    maxLines: "maxLines",
    keepBlankLines: "keepBlankLines",
    runAlign: "runAlign",
    rotation: "rotation",
    color: "textColor",
    lineHeight: "lineHeight",
    minScreenSize: "minScreenSize",
    minNodeScreenSize: "minNodeScreenSize",
    declutter: "declutter",
    onTop: "onTop",
    textAlign: "textAlign",
    opacity: "textOpacity",
    background: "backgroundColor",
    backgroundOpacity: "backgroundOpacity",
    padding: "backgroundPadding",
    boxPadding: "boxPadding",
    cornerRadius: "cornerRadius",
    borderWidth: "borderWidth",
    borderColor: "borderColor",
    borderOpacity: "borderOpacity",
    gradient: "backgroundGradient",
    gradientType: "backgroundGradientType",
    gradientDirection: "backgroundGradientDirection",
    location: "location",
    attachOffset: "attachOffset",
    offsetX: "offsetX",
    offsetY: "offsetY",
    shiftX: "shiftX",
    shiftY: "shiftY",
    shiftOf: "shiftOf",
    gapOf: "gapOf",
    box: "box",
    keepInView: "keepInView",
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
    outlineOpacity: "textOutlineOpacity",
    shadow: "textShadow",
    shadowColor: "textShadowColor",
    shadowBlur: "textShadowBlur",
    shadowOffsetX: "textShadowOffsetX",
    shadowOffsetY: "textShadowOffsetY",
    panelShadow: "panelShadow",
    panelShadowColor: "panelShadowColor",
    panelShadowBlur: "panelShadowBlur",
    panelShadowOffsetX: "panelShadowOffsetX",
    panelShadowOffsetY: "panelShadowOffsetY",
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
    closeButton: "closeButton",
    pickable: "pickable",
} as const satisfies Partial<Record<keyof LabelStyle, string>>;

/**
 * What a label draws for each field no layer and no look sets: the element's own defaults, in the
 * label vocabulary. `enabled` is left out (a label with words is drawn whatever its default), and
 * so are the fields whose absence draws nothing (`background`, `outline`, `badge`, `icon`,
 * `progress`).
 *
 * An application shows these where a field is not set, so the reader sees the value that is
 * drawn rather than the word "Default".
 * @since 3.26.0
 * @example
 * ```ts
 * import { LABEL_STYLE_DEFAULTS } from "@graphty/graphty-element/catalog";
 * LABEL_STYLE_DEFAULTS.font; // "Verdana"
 * LABEL_STYLE_DEFAULTS.marginTop; // 5
 * ```
 */
export const LABEL_STYLE_DEFAULTS: Readonly<LabelStyle> = Object.freeze({
    ...(Object.fromEntries(
        Object.entries(RICH_TEXT_KEYS).flatMap(([field, key]) => {
            const value: unknown = (defaultRichTextLabelStyle as Record<string, unknown>)[key];
            return field === "enabled" || value === undefined ? [] : [[field, value]];
        }),
    ) as LabelStyle),
    weight: defaultRichTextLabelStyle.fontWeight === "bold" ? "bold" : "normal",
    sizeMode: "world",
    onTop: defaultRichTextLabelStyle.onTop ?? false,
    pickable: defaultRichTextLabelStyle.pickable ?? false,
    gradientColors: DEFAULT_LABEL_GRADIENT_COLORS,
});

/** What kind of value a label style field takes: what a control for it has to offer. */
export type LabelFieldValueKind = "color" | "colors" | "number" | "text" | "boolean" | "enum";

/**
 * One field of {@link LabelStyle}, described for a settings panel or a story control that draws a
 * control per field: what it is called, what it takes, and what is drawn while nothing sets it.
 * @since 3.38.0
 */
export interface LabelStyleFieldDescriptor {
    /** The field's name in {@link LabelStyle}. */
    readonly field: keyof LabelStyle;
    /** The field's default name, for a reader. */
    readonly plainName: string;
    /** The kind of value it takes. `"colors"` is a list of colors. */
    readonly accepts: LabelFieldValueKind;
    /** Every value it takes, when `accepts` is `"enum"`. */
    readonly values?: readonly string[];
    /** The smallest number it takes, when it has one. */
    readonly min?: number;
    /** Whether `min` itself is refused, so a value must be above it. */
    readonly exclusiveMin?: boolean;
    /** The largest number it takes, when it has one. */
    readonly max?: number;
    /** Whether it takes whole numbers only. */
    readonly integer?: boolean;
    /** What is drawn while nothing sets it, as {@link LABEL_STYLE_DEFAULTS} says; absent when nothing is. */
    readonly default?: string | number | boolean | readonly string[];
}

type FieldRow = Omit<LabelStyleFieldDescriptor, "field" | "default">;

const num = (plainName: string, bounds: Partial<FieldRow> = {}): FieldRow => ({
    plainName,
    accepts: "number",
    ...bounds,
});
const flag = (plainName: string): FieldRow => ({ plainName, accepts: "boolean" });
const color = (plainName: string): FieldRow => ({ plainName, accepts: "color" });
const text = (plainName: string): FieldRow => ({ plainName, accepts: "text" });
const choice = (plainName: string, values: readonly string[]): FieldRow => ({ plainName, accepts: "enum", values });
const fraction = (plainName: string): FieldRow => num(plainName, { min: 0, max: 1 });

const SIDES = ["top", "bottom", "left", "right", "auto"] satisfies readonly LabelPointerDirection[];
const BOX_OR_WORDS = ["box", "words"] as const;

/** Every label style field's row, keyed so a field without one fails to compile. */
const FIELD_ROWS = {
    look: choice("Look", ["default", "card", "dark", "pill", "callout"] satisfies readonly LabelLookId[]),
    enabled: flag("Enabled"),
    font: text("Font"),
    sizePx: num("Font Size"),
    sizeMode: choice("Size Mode", ["world", "screen"] satisfies readonly LabelSizeMode[]),
    size: num("Size", { min: 0, exclusiveMin: true }),
    letterSize: num("Letter Size", { min: 0 }),
    weight: choice("Weight", ["normal", "bold"]),
    color: color("Color"),
    italic: flag("Italic"),
    wrapWidth: num("Wrap Width", { min: 0 }),
    wrapTrailingSpace: flag("Wrap Trailing Space"),
    wrapEllipsis: flag("Wrap Ellipsis"),
    wrapAnywhere: flag("Wrap Anywhere"),
    wrapSpaceCount: num("Wrap Space Count", { min: 0 }),
    maxLines: num("Max Lines", { min: 1, integer: true }),
    keepBlankLines: flag("Keep Blank Lines"),
    runAlign: choice("Run Align", ["baseline", "hanging", "middle"]),
    rotation: num("Rotation"),
    lineHeight: num("Line Height"),
    minScreenSize: num("Min Screen Size", { min: 0 }),
    declutter: choice("Declutter", ["degree", "size"] satisfies readonly LabelDeclutterOrder[]),
    minNodeScreenSize: num("Min Node Screen Size", { min: 0 }),
    textAlign: choice("Text Align", ["left", "center", "right"] satisfies readonly LabelTextAlign[]),
    opacity: fraction("Opacity"),
    background: color("Background"),
    backgroundOpacity: fraction("Background Opacity"),
    padding: num("Padding"),
    boxPadding: num("Box Padding", { min: 0 }),
    cornerRadius: num("Corner Radius"),
    borderWidth: num("Border Width"),
    borderColor: color("Border Color"),
    borderOpacity: fraction("Border Opacity"),
    gradient: flag("Gradient"),
    gradientType: choice("Gradient Type", ["linear", "radial"] satisfies readonly LabelGradientType[]),
    gradientColors: { plainName: "Gradient Colors", accepts: "colors" },
    gradientDirection: choice("Gradient Direction", [
        "vertical",
        "horizontal",
        "diagonal",
    ] satisfies readonly LabelGradientDirection[]),
    location: choice("Location", [
        "top",
        "top-right",
        "top-left",
        "left",
        "center",
        "right",
        "bottom",
        "bottom-left",
        "bottom-right",
        "inside-top",
        "inside-bottom",
        "inside-left",
        "inside-right",
        "inside-top-left",
        "inside-top-right",
        "inside-bottom-left",
        "inside-bottom-right",
        "automatic",
    ] satisfies readonly LabelLocation[]),
    attachOffset: num("Attach Offset"),
    offsetX: num("Offset X"),
    offsetY: num("Offset Y"),
    shiftX: num("Shift X"),
    shiftY: num("Shift Y"),
    shiftOf: choice("Shift Of", BOX_OR_WORDS),
    gapOf: choice("Gap Of", BOX_OR_WORDS),
    box: choice("Box", ["words", "words-at-side", "target-width"]),
    keepInView: flag("Keep In View"),
    marginTop: num("Margin Top"),
    marginBottom: num("Margin Bottom"),
    marginLeft: num("Margin Left"),
    marginRight: num("Margin Right"),
    pointer: flag("Pointer"),
    pointerDirection: choice("Pointer Direction", SIDES),
    pointerWidth: num("Pointer Width"),
    pointerHeight: num("Pointer Height"),
    pointerOffset: num("Pointer Offset"),
    pointerCurve: flag("Pointer Curve"),
    outline: color("Outline"),
    outlineWidth: num("Outline Width"),
    outlineOpacity: fraction("Outline Opacity"),
    shadow: flag("Shadow"),
    shadowColor: color("Shadow Color"),
    shadowBlur: num("Shadow Blur"),
    shadowOffsetX: num("Shadow Offset X"),
    shadowOffsetY: num("Shadow Offset Y"),
    panelShadow: flag("Panel Shadow"),
    panelShadowColor: color("Panel Shadow Color"),
    panelShadowBlur: num("Panel Shadow Blur", { min: 0 }),
    panelShadowOffsetX: num("Panel Shadow Offset X"),
    panelShadowOffsetY: num("Panel Shadow Offset Y"),
    animation: choice("Animation", [
        "none",
        "pulse",
        "bounce",
        "shake",
        "glow",
        "fill",
    ] satisfies readonly LabelAnimation[]),
    animationSpeed: num("Animation Speed"),
    depthFade: flag("Depth Fade"),
    depthFadeNear: num("Depth Fade Near"),
    depthFadeFar: num("Depth Fade Far"),
    onTop: flag("On Top"),
    pickable: flag("Pickable"),
    badge: choice("Badge", [
        "notification",
        "label",
        "label-success",
        "label-warning",
        "label-danger",
        "count",
        "icon",
        "progress",
        "dot",
    ] satisfies readonly LabelBadge[]),
    icon: text("Icon"),
    iconPosition: choice("Icon Position", ["left", "right"] satisfies readonly LabelIconPosition[]),
    progress: fraction("Progress"),
    smartOverflow: flag("Smart Overflow"),
    maxNumber: num("Max Number"),
    overflowSuffix: text("Overflow Suffix"),
    closeButton: flag("Close Button"),
} satisfies Record<keyof LabelStyle, FieldRow>;

/**
 * Every field of {@link LabelStyle}, described, in the order {@link LABEL_STYLE_FIELDS} lists them:
 * what a settings panel needs to draw a control for each without restating any of them.
 * @since 3.38.0
 * @example
 * ```ts
 * import { LABEL_STYLE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
 *
 * const wrap = LABEL_STYLE_DESCRIPTORS.find((d) => d.field === "maxLines");
 * wrap?.accepts; // "number"
 * wrap?.min; // 1
 * ```
 */
export const LABEL_STYLE_DESCRIPTORS: readonly LabelStyleFieldDescriptor[] = Object.freeze(
    LABEL_STYLE_FIELDS.map((field): LabelStyleFieldDescriptor => {
        const value = LABEL_STYLE_DEFAULTS[field];
        return Object.freeze({
            field,
            ...FIELD_ROWS[field],
            ...(value === undefined ? {} : { default: value }),
        });
    }),
);
