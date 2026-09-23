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

/** Where a label sits relative to the node or edge it belongs to. */
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
    | "automatic";

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

/** How a label is drawn. */
export interface LabelStyle {
    /**
     * Whether the label is drawn at all.
     *
     * Writing the words through `node.label` or `edge.label` switches a label on, so this is only
     * ever written to switch one back OFF while leaving its text resolved -- which is how a layer
     * hides labels on part of a graph without taking the words away from the layers under it.
     */
    enabled?: boolean;

    /** The typeface, as a CSS font family. */
    font?: string;
    /** How tall the letters are drawn on the label's own canvas. */
    sizePx?: number;
    /** How heavy the letters are. */
    weight?: number | "normal" | "bold";
    /** The colour of the letters. */
    color?: string;
    /** The gap between one line of text and the next, as a multiple of the font size. */
    lineHeight?: number;
    /** How the lines are lined up against each other. */
    textAlign?: LabelTextAlign;

    /** The colour of the panel behind the words. */
    background?: string;
    /** How much room there is between the words and the edge of that panel. */
    padding?: number;
    /** How far the panel's corners are rounded. */
    cornerRadius?: number;
    /** How thick a border is drawn around the panel; zero draws none. */
    borderWidth?: number;
    /** The colour of that border. */
    borderColor?: string;
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
    enabled: 0,
    font: 0,
    sizePx: 0,
    weight: 0,
    color: 0,
    lineHeight: 0,
    textAlign: 0,
    background: 0,
    padding: 0,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: 0,
    gradient: 0,
    gradientType: 0,
    gradientColors: 0,
    gradientDirection: 0,
    location: 0,
    attachOffset: 0,
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
    shadow: 0,
    shadowColor: 0,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    animation: 0,
    animationSpeed: 0,
    depthFade: 0,
    depthFadeNear: 0,
    depthFadeFar: 0,
    badge: 0,
    icon: 0,
    iconPosition: 0,
    progress: 0,
    smartOverflow: 0,
    maxNumber: 0,
    overflowSuffix: 0,
} satisfies Record<keyof LabelStyle, 0>) as (keyof LabelStyle)[];
