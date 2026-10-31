import {
    AbstractMesh,
    type Camera,
    Color3,
    DynamicTexture,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Texture,
    TransformNode,
    Vector3,
} from "@babylonjs/core";

import { BadgeStyleManager } from "../BadgeStyleManager";
import { type RichTextStyleType } from "../config";
import { DEFAULT_LABEL_GRADIENT_COLORS } from "../config/RichTextStyle";
import { toColorValue } from "../session/styles/channels";
import { FrameRoster } from "./FrameRoster";
import {
    buildMaterial,
    deferLabelRelease,
    giveAlphaQuietly,
    PREMULTIPLIED_ALPHA_MODE,
    setUpQuietly,
    uploadPremultiplied,
} from "./LabelBatch";
import { closeGlyphRect, closeHitFractions, closeReserve, drawCloseGlyph, markCloseLabel } from "./labelClose";
import { fontFamilies, noteLabelFont } from "./labelFonts";
import { fitToScreen, type LabelPlacement, type PlacementBounds } from "./labelScreenFit";
import { type ContentArea as PointerContentArea, type PointerDirection, PointerRenderer } from "./PointerRenderer";
import { RichTextAnimator } from "./RichTextAnimator";
import { measureLine, RichTextParser, wrapLines } from "./RichTextParser";
import { RichTextRenderer } from "./RichTextRenderer";
import { pixelsPerUnit } from "./screenSize";

/** The depth-fading labels of each scene, behind one before-render observer; see {@link FrameRoster}. */
const depthFadeFrames = new FrameRoster();
/** The labels with a `minScreenSize`, each shown or hidden by its size on screen before every frame. */
const minScreenSizeFrames = new FrameRoster();

/** What a label hangs beside before it has been placed. */
const NO_BOUNDS: PlacementBounds = { min: Vector3.Zero(), max: Vector3.Zero(), z: 0 };

/**
 * The Babylon rendering group every label is drawn in: after the graph (group 0) and the glow
 * drawn at its end (`NodeEffects`), with group 0's depth kept, so a label still sorts by depth
 * with the nodes and edges in front of it but no glow is drawn over its words.
 */
const LABEL_RENDERING_GROUP = 1;

/** The Babylon rendering group a label drawn on top uses: after every other, depth cleared. */
export const ON_TOP_RENDERING_GROUP = 2;

/** The line height a label is drawn at when its style names none. */
const DEFAULT_LINE_HEIGHT = 1.2;

/** The most texture pixels a label gives one em of its font (see `_createTexture`). */
const LABEL_MAX_FONT_PX = 64;

/** The labels drawn in each scene, for {@link RichTextLabel.setCaptureScale}. */
const sceneLabels = new WeakMap<Scene, Set<RichTextLabel>>();

export type BadgeType =
    | "notification"
    | "label"
    | "label-success"
    | "label-warning"
    | "label-danger"
    | "count"
    | "icon"
    | "progress"
    | "dot"
    | undefined;
export type AttachPosition =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | InsidePosition;

/** A position inside the target, against a side or in a corner. */
type InsidePosition =
    | "inside-top"
    | "inside-bottom"
    | "inside-left"
    | "inside-right"
    | "inside-top-left"
    | "inside-top-right"
    | "inside-bottom-left"
    | "inside-bottom-right";

export interface RichTextStyle {
    font: string;
    size: number;
    weight: string;
    style: string;
    color: string;
    background: string | null;
    /** How far below the line's baseline this run is drawn, in canvas pixels (the markup's `shift`). */
    shift?: number;
}

export interface TextSegment {
    text: string;
    style: RichTextStyle;
}

interface PointerInfo {
    direction: string;
    width: number;
    height: number;
    offset: number;
    curve: boolean;
}

/**
 * The pointer options the speech-bubble paths take, from a label's pointer.
 * @param info - The label's pointer.
 * @returns The options.
 */
function pointerOptionsOf(info: PointerInfo): Parameters<PointerRenderer["createSpeechBubblePath"]>[3] {
    return {
        width: info.width,
        height: info.height,
        offset: info.offset,
        direction: info.direction as PointerDirection,
        curved: info.curve,
    };
}

interface Border {
    width: number;
    color: string | undefined;
    spacing: number;
}

interface ActualDimensions {
    width: number;
    height: number;
}

interface ContentArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Internal properties that are not part of the public RichTextStyleType API
interface InternalBadgeProperties {
    _badgeType?: BadgeType;
    _smartSizing?: boolean;
    _paddingRatio?: number;
    _removeText?: boolean;
    _progressBar?: boolean;
}

// Additional runtime properties that can be passed to RichTextLabel
interface RuntimeProperties {
    attachTo?: AbstractMesh | Vector3;
    /**
     * Draw over the whole graph instead of sorting by depth with it. A tooltip sets this; an
     * ordinary label does not, so a node or an edge nearer the camera passes in front of it.
     */
    onTop?: boolean;
    /**
     * Draw the text as its characters, every one of them, never as label markup (`<bold>`,
     * `<color='...'>`). Set for words a note supplied (design/notes 6.3).
     */
    plainText?: boolean;
    /**
     * A "center" label sits at the target's own origin rather than the middle of its bounding
     * box: a polygon node's corners need not surround its position evenly, and its label belongs
     * at the position, as Graphviz draws it.
     */
    centerAtOrigin?: boolean;
}

// RichTextLabelOptions extends the config schema with runtime properties
export type RichTextLabelOptions = Partial<RichTextStyleType> & InternalBadgeProperties & RuntimeProperties;

// Helper type to make all properties required except specific ones
type RequiredExceptOptional<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

// Resolved options with all properties defined
type ResolvedRichTextLabelOptions = RequiredExceptOptional<
    RichTextLabelOptions,
    | "badge"
    | "icon"
    | "progress"
    | "attachTo"
    | "onTop"
    | "pickable"
    | "plainText"
    | "centerAtOrigin"
    | "size"
    | "wrapWidth"
    | "letterSize"
    | "wrapTrailingSpace"
    | "wrapEllipsis"
    | "wrapAnywhere"
    | "wrapSpaceCount"
    | "runAlign"
    | "minScreenSize"
    | "minNodeScreenSize"
    | "declutter"
    | "rotation"
    | "textOpacity"
    | "backgroundOpacity"
    | "textOutlineOpacity"
    | "borderOpacity"
    | "boxPadding"
    | "offsetX"
    | "offsetY"
    | "shiftX"
    | "shiftY"
    | "_badgeType"
    | "_smartSizing"
    | "_paddingRatio"
    | "_removeText"
    | "_progressBar"
    | "enabled"
    | "textPath"
    | "location"
    | "borders"
    | "sizeMode"
    | "keepInView"
> & {
    badge: BadgeType;
    icon: string | undefined;
    progress: number | undefined;
    attachTo: AbstractMesh | Vector3 | undefined;
    _badgeType: BadgeType;
    _smartSizing: boolean | undefined;
    _paddingRatio: number | undefined;
    _removeText: boolean | undefined;
    _progressBar: boolean | undefined;
    borders: Border[];
};

/** The side a pointer comes out of for a label on each side of its target: the side facing it. */
const POINTER_AWAY_FROM: Partial<Record<AttachPosition, PointerDirection>> = {
    top: "bottom",
    "top-left": "bottom",
    "top-right": "bottom",
    bottom: "top",
    "bottom-left": "top",
    "bottom-right": "top",
    left: "right",
    right: "left",
};

/**
 * A colour with an opacity applied over its own alpha.
 * @param color - The colour, in any spelling the element accepts; anything else (a gradient) is kept.
 * @param opacity - The opacity, 0-1; unset or 1 leaves the colour as it is.
 * @returns The colour, as `#rrggbbaa` when an opacity below 1 changed it.
 */
function withOpacity<T>(color: T, opacity: number | undefined): T | string {
    if (opacity === undefined || opacity >= 1 || typeof color !== "string" || color === "transparent") {
        return color;
    }

    const value = toColorValue(color);
    return value === null ? color : (toColorValue({ ...value, a: value.a * Math.max(0, opacity) })?.hex ?? color);
}

/** Which side of a target's bounds, on one axis: before it, centered on it, or after it. */
type Side = -1 | 0 | 1;

/** Which side (x) and which end (y) of its target's bounds a label sits inside against, per inside position. */
const INSIDE: Record<InsidePosition, { x: Side; y: Side }> = {
    "inside-top-left": { x: -1, y: 1 },
    "inside-top": { x: 0, y: 1 },
    "inside-top-right": { x: 1, y: 1 },
    "inside-left": { x: -1, y: 0 },
    "inside-right": { x: 1, y: 0 },
    "inside-bottom-left": { x: -1, y: -1 },
    "inside-bottom": { x: 0, y: -1 },
    "inside-bottom-right": { x: 1, y: -1 },
};

/**
 * Where a label inside its target's bounds sits, measured from their centre: against the side
 * `side` names, the label's half and the offset in from it, or at the centre along an axis it names
 * no side of (and at the centre when the label is larger than the bounds).
 * @param side - The side.
 * @param half - Half the bounds' extent on this axis, in the label's units.
 * @param gap - The label's half extent on this axis plus the offset.
 * @returns The coordinate from the centre.
 */
function inward(side: Side, half: number, gap: number): number {
    return side * Math.max(0, half - gap);
}

/**
 * Place a label in front of its target, toward the camera (see `parentTo`), in the frame of the
 * pivot at the target's centre: in the middle, or inside against the side an inside position names.
 * The pivot undoes the target's stretch, so the bounds are measured as drawn and the label's own
 * size as it is.
 * @param at - The label's position, changed in place.
 * @param bounds - The target's bounds, in its own frame.
 * @param bounds.min - Their lower corner.
 * @param bounds.max - Their upper corner.
 * @param drawn - The target's stretch.
 * @param inside - The side and end it sits inside against, or null for the middle.
 * @param label - The label's size in world units and its offset from the side.
 * @param label.width - Its width.
 * @param label.height - Its height.
 * @param label.offset - Its gap from the side.
 */
function placeInFront(
    at: Vector3,
    bounds: { min: Vector3; max: Vector3 },
    drawn: Vector3,
    inside: { x: Side; y: Side } | null,
    label: { width: number; height: number; offset: number },
): void {
    at.z = -Vector3.Distance(bounds.min.multiply(drawn), bounds.max.multiply(drawn)) / 2;
    if (inside !== null) {
        at.x = inward(inside.x, ((bounds.max.x - bounds.min.x) * drawn.x) / 2, label.width / 2 + label.offset);
        at.y = inward(inside.y, ((bounds.max.y - bounds.min.y) * drawn.y) / 2, label.height / 2 + label.offset);
    }
}

/** How far to the side (x) and up (y) of its target's bounds a label sits, per position. */
const SIDES: Record<Exclude<AttachPosition, InsidePosition>, { x: Side; y: Side }> = {
    "top-left": { x: -1, y: 1 },
    top: { x: 0, y: 1 },
    "top-right": { x: 1, y: 1 },
    left: { x: -1, y: 0 },
    center: { x: 0, y: 0 },
    right: { x: 1, y: 0 },
    "bottom-left": { x: -1, y: -1 },
    bottom: { x: 0, y: -1 },
    "bottom-right": { x: 1, y: -1 },
};

/**
 * Place a label beside its target's bounds: past the side `position` names, by half the label and
 * the offset, or centred on the bounds along an axis it names no side of.
 * @param at - The label's position, changed in place.
 * @param position - Which side of the target.
 * @param bounds - The target's bounds, in the frame `at` is in.
 * @param bounds.min - Their lower corner.
 * @param bounds.max - Their upper corner.
 * @param label - The label's size in world units.
 * @param label.width - Its width.
 * @param label.height - Its height.
 * @param offset - The gap between the bounds and the label.
 * @param stretch - The target's own scaling, which the label's gaps are divided by so they
 *     stay the label's own size on a stretched target.
 * @param stretch.x - Across.
 * @param stretch.y - Up.
 */
function placeBeside(
    at: Vector3,
    position: AttachPosition,
    bounds: { min: Vector3; max: Vector3 },
    label: { width: number; height: number },
    offset: number,
    stretch?: { x: number; y: number },
): void {
    if (Object.hasOwn(INSIDE, position)) {
        // A point has no inside: the label stays on it.
        return;
    }

    const sx = stretch?.x ?? 1;
    const sy = stretch?.y ?? 1;
    const side = Object.hasOwn(SIDES, position) ? SIDES[position as keyof typeof SIDES] : null;
    if (side === null) {
        at.y = bounds.max.y + (label.height / 2 + offset) / sy;
        return;
    }

    at.x = along(side.x, bounds.min.x, bounds.max.x, (label.width / 2 + offset) / sx);
    at.y = along(side.y, bounds.min.y, bounds.max.y, (label.height / 2 + offset) / sy);
}

/**
 * One coordinate of a label beside its target.
 * @param side - -1 before the bounds, 1 after them, 0 centred on them.
 * @param min - The bounds' lower edge.
 * @param max - Their upper edge.
 * @param gap - How far past the edge the label's centre sits.
 * @returns The coordinate.
 */
function along(side: Side, min: number, max: number, gap: number): number {
    if (side === 0) {
        return (min + max) / 2;
    }

    return side < 0 ? min - gap : max + gap;
}

/**
 * Rich text label with support for formatting, badges, animations, and speech bubble pointers
 */
export class RichTextLabel {
    private readonly scene: Scene;
    private readonly options: ResolvedRichTextLabelOptions;
    private mesh: Mesh | null = null;
    private texture: DynamicTexture | null = null;
    private material: StandardMaterial | null = null;
    private parsedContent: TextSegment[][] = [];
    private readonly actualDimensions: ActualDimensions = { width: 0, height: 0 };
    private contentArea: ContentArea = { x: 0, y: 0, width: 0, height: 0 };
    /** The size of the words alone, in the same units as `actualDimensions`. */
    private textSize = { width: 0, height: 0 };
    /**
     * How tall the plane is, in units of one line's height in the scene (`lineHeightInWorld`): 1
     * for one line at the default line height, more for each extra line or wider spacing (see
     * `_calculateDimensions`).
     */
    private heightInLines = 1;
    /** One line's canvas height (the line, its margins, padding and borders), as `heightInLines` measures it. */
    private oneLinePx = 0;
    private totalBorderWidth = 0;
    /** The room around the panel its drop shadow is drawn in, on every side; zero without one. */
    private shadowMargin = 0;
    private pointerInfo: PointerInfo | null = null;
    private _progressValue = 0;
    private readonly id: string;
    private originalPosition: Vector3 | null = null;
    /** A ring drawn around the target, as a multiple of its largest half-extent; null for none. */
    private ring: number | null = null;

    private readonly parser: RichTextParser;
    private readonly renderer: RichTextRenderer;
    private readonly animator: RichTextAnimator | null = null;
    private readonly pointerRenderer: PointerRenderer;
    /** Ends this label's depth fade; see {@link depthFadeFrames}. */
    private stopDepthFade: (() => void) | null = null;
    /** Ends this label's screen size check; see {@link minScreenSizeFrames}. */
    private stopMinScreenSize: (() => void) | null = null;
    /** Ends this label's screen sizing and keeping in view; see labelScreenFit. */
    private stopScreenFit: (() => void) | null = null;
    /** What the label hangs beside, in its parent's coordinates, once attached. */
    private placementBounds: PlacementBounds | null = null;
    /** What a "center" label hangs from: a point at its node's centre that faces the camera. */
    private centerPivot: TransformNode | null = null;
    /** Whether the label last undid a stretch of its target, so a target back at its own size resets it. */
    private undoesStretch = false;
    private animationStarted = false;
    /** Takes the plane off its scene's count of labels with a close button. */
    private unmarkClose: (() => void) | null = null;

    /** Set while {@link RichTextLabel.measureWords} builds a label that is only measured, never drawn. */
    private static measuring = false;

    /** How many times its usual texture pixels the label is drawn with, for a capture larger than the canvas. */
    private captureScale = 1;

    /**
     * Draw every label of a scene with as many texture pixels as a capture of `scale` output pixels per
     * canvas pixel shows it at, so its words stay as sharp as on screen; 1 puts every label back.
     *
     * Only a label the capture would magnify is redrawn, and only up to the pixels it covers in the
     * capture, so the extra texture memory is about the capture's own size, and only for its duration.
     * @param scene - The scene.
     * @param scale - Output pixels per canvas pixel.
     */
    static setCaptureScale(scene: Scene, scale: number): void {
        const camera = scene.activeCamera;
        for (const label of sceneLabels.get(scene) ?? []) {
            label.useCaptureScale(scale === 1 || camera === null ? 1 : label.captureScaleFor(camera, scale));
        }
    }

    /**
     * How big a label's words would be drawn, without drawing them: as wide as its widest line and
     * as tall as its lines at one font size each, in world units, by the same measurement a drawn
     * label makes, with its first line's ascent and descent (its ink above and below its baseline; the label's
     * words are drawn centered on their line, so their baseline sits half their difference below that middle). No
     * texture, material or mesh is made.
     * @param scene - Babylon.js scene
     * @param userOptions - Label configuration options
     * @returns The width, height, ascent and descent in world units
     */
    static measureWords(
        scene: Scene,
        userOptions: RichTextLabelOptions,
    ): { width: number; height: number; ascent: number; descent: number } {
        RichTextLabel.measuring = true;
        try {
            const label = new RichTextLabel(scene, { ...userOptions, attachTo: undefined, animation: "none" });
            const { width, height } = label.actualDimensions;
            if (width <= 0 || height <= 0) {
                return { width: 0, height: 0, ascent: 0, descent: 0 };
            }

            // One canvas pixel in the world, as `_createMesh` sizes the plane.
            const perPixel = (label.lineHeightInWorld() * label.heightInLines) / height;
            const lines = Math.max(1, label.parsedContent.length);
            const ctx = document.createElement("canvas").getContext("2d");
            const first = label.parsedContent.find((line) => line.length > 0);
            let ink = { ascent: 0, descent: 0 };
            if (ctx !== null && first !== undefined) {
                // measured with the glyphs it is drawn with, as `_calculateDimensions` measures
                ctx.textRendering = "geometricPrecision";
                ink = measureLine(ctx, first, label.options);
            }
            return {
                width: label.textSize.width * perPixel,
                height: lines * label.options.fontSize * perPixel,
                ascent: ink.ascent * perPixel,
                descent: ink.descent * perPixel,
            };
        } finally {
            RichTextLabel.measuring = false;
        }
    }

    /**
     * Whether this label draws any of its words in one of some font families: its own font, or one
     * a `<font>` tag in its words names.
     * @param families - Family names, as {@link fontFamilies} gives them.
     * @returns True when it does.
     * @internal
     */
    public usesFont(families: ReadonlySet<string>): boolean {
        const fonts = new Set([this.options.font]);
        for (const line of this.parsedContent) {
            for (const segment of line) {
                fonts.add(segment.style.font);
            }
        }

        return [...fonts].some((font) => fontFamilies(font).some((family) => families.has(family)));
    }

    /**
     * Factory method to create a rich text label
     * @param scene - Babylon.js scene
     * @param userOptions - Label configuration options
     * @returns A new RichTextLabel instance
     */
    static createLabel(scene: Scene, userOptions: RichTextLabelOptions): RichTextLabel {
        return new RichTextLabel(scene, userOptions);
    }

    /**
     * Creates a new rich text label
     * @param scene - Babylon.js scene
     * @param userOptions - Label configuration options
     */
    constructor(scene: Scene, userOptions: RichTextLabelOptions) {
        this.scene = scene;

        const defaultOptions: ResolvedRichTextLabelOptions = {
            text: "Label",
            position: { x: 0, y: 0, z: 0 },
            resolution: 512,
            autoSize: true,
            font: "Verdana",
            fontSize: 48,
            fontWeight: "normal",
            fontStyle: "normal",
            textColor: "black",
            textAlign: "center",
            lineHeight: DEFAULT_LINE_HEIGHT,
            backgroundColor: "transparent",
            backgroundGradient: false,
            backgroundGradientColors: [...DEFAULT_LABEL_GRADIENT_COLORS],
            backgroundGradientType: "linear",
            backgroundGradientDirection: "vertical",
            backgroundPadding: 0,
            marginTop: 5,
            marginBottom: 5,
            marginLeft: 5,
            marginRight: 5,
            borderWidth: 0,
            borderColor: "rgba(255, 255, 255, 0.8)",
            borders: [],
            cornerRadius: 0,
            animation: "none",
            animationSpeed: 1,
            billboardMode: Mesh.BILLBOARDMODE_ALL,
            textShadow: false,
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowBlur: 4,
            textShadowOffsetX: 2,
            textShadowOffsetY: 2,
            panelShadow: false,
            panelShadowColor: "rgba(0, 0, 0, 0.3)",
            panelShadowBlur: 16,
            panelShadowOffsetX: 0,
            panelShadowOffsetY: 6,
            textOutline: false,
            textOutlineColor: "black",
            textOutlineWidth: 2,
            textOutlineJoin: "round",
            pointer: false,
            pointerDirection: "bottom",
            pointerWidth: 20,
            pointerHeight: 15,
            pointerOffset: 0,
            pointerCurve: true,
            attachTo: undefined,
            attachPosition: "top",
            attachOffset: 0.5,
            depthFadeEnabled: false,
            depthFadeNear: 5,
            depthFadeFar: 20,
            badge: undefined,
            icon: undefined,
            iconPosition: "left",
            progress: undefined,
            smartOverflow: false,
            maxNumber: 999,
            overflowSuffix: "+",
            closeButton: false,
            _badgeType: undefined,
            _smartSizing: undefined,
            _paddingRatio: undefined,
            _removeText: undefined,
            _progressBar: undefined,
        };

        let finalOptions: ResolvedRichTextLabelOptions = {
            ...defaultOptions,
            ...userOptions,
            // A painted label passes the key with no colors; a gradient switched on then runs
            // through the default colors rather than none (which threw in the render loop).
            backgroundGradientColors: userOptions.backgroundGradientColors ?? defaultOptions.backgroundGradientColors,
        };

        if (finalOptions.badge) {
            const badgeDefaults = BadgeStyleManager.getBadgeStyle(finalOptions.badge);
            if (badgeDefaults) {
                finalOptions = {
                    ...finalOptions,
                    ...badgeDefaults,
                    ...userOptions,
                    backgroundGradientColors:
                        userOptions.backgroundGradientColors ?? finalOptions.backgroundGradientColors,
                };
            }
        }

        BadgeStyleManager.applyBadgeBehaviors(finalOptions, userOptions);

        // A box padding is the whole room between the words' line box and the panel's border.
        if (finalOptions.boxPadding !== undefined) {
            finalOptions.marginTop = finalOptions.boxPadding;
            finalOptions.marginBottom = finalOptions.boxPadding;
            finalOptions.marginLeft = finalOptions.boxPadding;
            finalOptions.marginRight = finalOptions.boxPadding;
            finalOptions.backgroundPadding = 0;
        }

        // An opacity of the border or of the outline is drawn as their colour's alpha.
        finalOptions.borderColor = withOpacity(finalOptions.borderColor, finalOptions.borderOpacity);
        finalOptions.textOutlineColor = withOpacity(finalOptions.textOutlineColor, finalOptions.textOutlineOpacity);

        if (finalOptions.borderWidth > 0 && finalOptions.borders.length === 0) {
            finalOptions.borders = [
                {
                    width: finalOptions.borderWidth,
                    color: finalOptions.borderColor,
                    spacing: 0,
                },
            ];
        }

        // An opacity of the words or of the panel is drawn as their colour's alpha.
        finalOptions.textColor = withOpacity(finalOptions.textColor, finalOptions.textOpacity);
        finalOptions.backgroundColor = withOpacity(finalOptions.backgroundColor, finalOptions.backgroundOpacity);

        // The x keeps the words clear of it by taking room from their right.
        if (finalOptions.closeButton) {
            finalOptions.marginRight += closeReserve(finalOptions.fontSize);
        }

        this.options = finalOptions;
        this.id = `richLabel_${Math.random().toString(36).substring(2, 11)}`;

        if (userOptions.progress !== undefined) {
            this._progressValue = Math.max(0, Math.min(1, userOptions.progress));
        }

        this.parser = new RichTextParser({
            font: this.options.font,
            size: this.options.fontSize,
            weight: this.options.fontWeight,
            style: this.options.fontStyle,
            color: this.options.textColor,
            background: null,
        });

        this.renderer = new RichTextRenderer({
            textAlignment: this.options.textAlign,
            marginLeft: this.options.marginLeft,
            marginRight: this.options.marginRight,
            marginTop: this.options.marginTop,
            marginBottom: this.options.marginBottom,
            backgroundPadding: this.options.backgroundPadding,
            lineHeight: this.options.lineHeight,
            textShadow: this.options.textShadow,
            textShadowColor: this.options.textShadowColor,
            textShadowBlur: this.options.textShadowBlur,
            textShadowOffsetX: this.options.textShadowOffsetX,
            textShadowOffsetY: this.options.textShadowOffsetY,
            textOutline: this.options.textOutline,
            textOutlineColor: this.options.textOutlineColor,
            textOutlineWidth: this.options.textOutlineWidth,
            textOutlineJoin: this.options.textOutlineJoin,
            runAlign: this.options.runAlign,
        });

        this.pointerRenderer = new PointerRenderer();

        if (this.options.animation !== "none") {
            this.animator = new RichTextAnimator(this.scene, {
                animation: this.options.animation,
                animationSpeed: this.options.animationSpeed,
            });
        }

        if (RichTextLabel.measuring) {
            this._parseRichText();
            this._calculateDimensions();
            return;
        }

        this._create();
    }

    private _create(): void {
        this._parseRichText();
        // A web font still loading draws in its fallback: load it, and the label is rebuilt when it lands.
        for (const { style } of this.parsedContent.flat()) {
            noteLabelFont(this.scene, `${style.style} ${style.weight}`, style.font);
        }

        this._calculateDimensions();
        this._createTexture();
        this._createMaterial();
        this._createMesh();
        let labels = sceneLabels.get(this.scene);
        if (labels === undefined) {
            labels = new Set();
            sceneLabels.set(this.scene, labels);
        }

        labels.add(this);

        if (this.options.attachTo) {
            this._attachToTarget();
        } else if (this.mesh) {
            this.mesh.position = new Vector3(this.options.position.x, this.options.position.y, this.options.position.z);
            this.originalPosition ??= this.mesh.position.clone();
            this.placementBounds = this._pointBounds(this.mesh.position);
        }

        if (this.options.depthFadeEnabled) {
            this._setupDepthFading();
        }

        if ((this.options.minScreenSize ?? 0) > 0 || (this.options.minNodeScreenSize ?? 0) > 0) {
            this.stopMinScreenSize = minScreenSizeFrames.join(this.scene, () => {
                const camera = this.scene.activeCamera;
                if (this.mesh && camera) {
                    // `visibility`, not `isVisible` or `setEnabled`: those are the declutter's and the
                    // visibility mask's switches, and a label hidden for its size is neither.
                    this.mesh.visibility = this.tooSmall(camera) ? 0 : 1;
                }
            });
        }

        if (this.options.sizeMode === "screen" || this.options.keepInView === true) {
            this._setupScreenFit();
        }

        // Don't start animations immediately - wait for startAnimation() to be called
        // This allows the layout to settle before animations begin
    }

    private _parseRichText(): void {
        this.parsedContent = this.parser.parse(this.options.text, this.options.plainText === true);
    }

    private _calculateDimensions(): void {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
            return;
        }
        // measured with the glyphs it is drawn with (see _drawContent)
        tempCtx.textRendering = "geometricPrecision";

        this.wrapToWidth(tempCtx);

        const { maxWidth, totalHeight } = this.parser.measureText(this.parsedContent, tempCtx, {
            lineHeight: this.options.lineHeight,
            textOutline: this.options.textOutline,
            textOutlineWidth: this.options.textOutlineWidth,
            runAlign: this.options.runAlign,
        });

        this.textSize = { width: maxWidth, height: totalHeight };
        const bgPadding = this.options.backgroundPadding * 2;

        this.totalBorderWidth = this._sumBorderWidth();

        const contentWidth = maxWidth + this.options.marginLeft + this.options.marginRight + bgPadding;
        const contentHeight = totalHeight + this.options.marginTop + this.options.marginBottom + bgPadding;

        this.contentArea = {
            x: this.totalBorderWidth,
            y: this.totalBorderWidth,
            width: contentWidth,
            height: contentHeight,
        };

        this.actualDimensions.width = contentWidth + this.totalBorderWidth * 2;
        this.actualDimensions.height = contentHeight + this.totalBorderWidth * 2;

        // LETTERS KEEP THEIR SIZE; THE LABEL GROWS. The plane is one line's height in the scene tall for
        // the canvas a single line at the default line height would need, and taller in proportion
        // to anything more. Without this a three-line label squeezed its canvas into one line's
        // height and drew its letters at a third of the size, and a line height of 2.5 shrank the
        // letters instead of spreading the lines.
        this.heightInLines = this.measureHeightInLines(tempCtx, totalHeight);

        if (this.options.pointer) {
            this._calculatePointerDimensions();
            this.makeRoomForPointer();
        }

        if (this.options._smartSizing) {
            const minDimension = this.actualDimensions.height;
            if (this.actualDimensions.width < minDimension) {
                const extraWidth = minDimension - this.actualDimensions.width;
                this.actualDimensions.width = minDimension;
                this.contentArea.x += extraWidth / 2;
            }
        }

        this._addShadowRoom();
    }

    /**
     * The width of every border plus the spacing between them.
     * @returns The total, in canvas pixels.
     */
    private _sumBorderWidth(): number {
        const { borders } = this.options;
        let total = 0;
        for (let i = 0; i < borders.length; i++) {
            total += borders[i].width;
            if (i < borders.length - 1 && borders[i].spacing > 0) {
                total += borders[i].spacing;
            }
        }

        return total;
    }

    /** Grow the canvas evenly on every side to make room for the panel's shadow. */
    private _addShadowRoom(): void {
        // ROOM FOR THE SHADOW, THE SAME ON EVERY SIDE, so the panel stays centered on the plane and
        // the shadow is not cut off at the canvas edge. The plane grows with it, in proportion, so
        // the letters keep their size.
        const { panelShadowBlur: blur, panelShadowOffsetX: dx, panelShadowOffsetY: dy } = this.options;
        this.shadowMargin = this.options.panelShadow ? Math.max(0, blur) + Math.max(Math.abs(dx), Math.abs(dy)) : 0;
        if (this.shadowMargin > 0) {
            const panelHeight = this.actualDimensions.height;
            this.actualDimensions.width += this.shadowMargin * 2;
            this.actualDimensions.height += this.shadowMargin * 2;
            this.contentArea.x += this.shadowMargin;
            this.contentArea.y += this.shadowMargin;
            this.heightInLines *= this.actualDimensions.height / panelHeight;
        }
    }

    /**
     * Grow the label to make room for its pointer, on the side the pointer points.
     */
    private makeRoomForPointer(): void {
        if (!this.pointerInfo) {
            return;
        }

        switch (this.pointerInfo.direction) {
            case "top":
                this.actualDimensions.height += this.options.pointerHeight;
                this.contentArea.y = this.totalBorderWidth + this.options.pointerHeight;
                break;
            case "bottom":
                this.actualDimensions.height += this.options.pointerHeight;
                break;
            case "left":
                this.actualDimensions.width += this.options.pointerHeight;
                this.contentArea.x = this.totalBorderWidth + this.options.pointerHeight;
                break;
            case "right":
                this.actualDimensions.width += this.options.pointerHeight;
                break;
            default:
                break;
        }
    }

    /**
     * How many lines tall the label's plane is, measured by its first line with words: one line's
     * plane is the canvas a single line at the default line height would need.
     * @param ctx - A canvas to measure on.
     * @param totalHeight - The text's whole height on the canvas.
     * @returns The plane's height in lines.
     */
    private measureHeightInLines(ctx: CanvasRenderingContext2D, totalHeight: number): number {
        // The first line WITH WORDS: a blank line has no height of its own to measure.
        const firstLine = this.parsedContent.find((line) => line.length > 0);
        if (firstLine === undefined) {
            return 1;
        }

        // Measured without the outline: an outline is drawn around the letters, so it grows the
        // label instead of shrinking the letters to make room for itself.
        const { lineBox } = measureLine(ctx, firstLine, {
            lineHeight: DEFAULT_LINE_HEIGHT,
            textOutline: false,
            textOutlineWidth: 0,
            runAlign: this.options.runAlign,
        });
        const oneLine = this.actualDimensions.height - totalHeight + lineBox;
        this.oneLinePx = oneLine;
        return oneLine > 0 ? this.actualDimensions.height / oneLine : 1;
    }

    private _calculatePointerDimensions(): void {
        let direction = this.options.pointerDirection;

        if (direction === "auto") {
            direction = "bottom";
        }

        this.pointerInfo = {
            direction: direction,
            width: this.options.pointerWidth,
            height: this.options.pointerHeight,
            offset: this.options.pointerOffset,
            curve: this.options.pointerCurve,
        };
    }

    /**
     * Texture pixels per pixel of the label's own canvas, before any capture scale.
     * @param screenDensity - Texture pixels per canvas pixel a screen-sized label needs.
     * @returns The density.
     */
    private texelsPerFontPx(screenDensity: number): number {
        return screenDensity * Math.min(1, LABEL_MAX_FONT_PX / this.options.fontSize);
    }

    /**
     * How many times its usual texture pixels this label needs in a capture of `scale` output pixels
     * per canvas pixel: enough for one texture pixel per output pixel, never more than `scale`.
     * @param camera - The camera the capture is drawn from.
     * @param scale - Output pixels per canvas pixel.
     * @returns The scale, 1 when the capture does not magnify the label.
     */
    private captureScaleFor(camera: Camera, scale: number): number {
        const screenDensity = this.options.sizeMode === "screen" ? Math.max(1, globalThis.devicePixelRatio || 1) : 1;
        const texelsPerEm = this.options.fontSize * this.texelsPerFontPx(screenDensity);
        const wanted = (this.screenFontPx(camera) * scale) / texelsPerEm;
        return wanted > 1 ? Math.min(scale, wanted) : 1;
    }

    /**
     * Redraw the label's texture at a capture scale, when it is not already drawn at it.
     * @param scale - How many times its usual texture pixels to draw it with.
     */
    private useCaptureScale(scale: number): void {
        if (scale === this.captureScale || this.material === null) {
            return;
        }

        this.captureScale = scale;
        const old = this.texture;
        this._createTexture();
        this.material.diffuseTexture = this.texture;
        old?.dispose();
    }

    private _createTexture(): void {
        const MAX_TEXTURE_SIZE = 4096;
        // A label sized for the screen draws one canvas unit per CSS pixel, so its texture needs
        // a texel per device pixel to stay sharp on a high-density screen.
        const screenDensity = this.options.sizeMode === "screen" ? Math.max(1, globalThis.devicePixelRatio || 1) : 1;

        // AT MOST LABEL_MAX_FONT_PX TEXTURE PIXELS PER EM. The plane's size in the scene comes from
        // the font size, not from the texture, so a label drawn very large in the scene (a file whose
        // labels are many times its nodes) needs no more pixels than one drawn at that cap: without
        // it a 1000 px font asked a 4096 x 1024 texture of every label, and a hundred such labels
        // took gigabytes of GPU memory and crashed the browser.
        const density = this.texelsPerFontPx(screenDensity) * this.captureScale;
        let textureWidth = this.options.autoSize
            ? Math.pow(2, Math.ceil(Math.log2(this.actualDimensions.width * density)))
            : this.options.resolution;

        const aspectRatio = this.actualDimensions.width / this.actualDimensions.height;
        let textureHeight = this.options.autoSize
            ? Math.pow(2, Math.ceil(Math.log2(this.actualDimensions.height * density)))
            : Math.floor(textureWidth / aspectRatio);

        if (textureWidth > MAX_TEXTURE_SIZE || textureHeight > MAX_TEXTURE_SIZE) {
            const scale = MAX_TEXTURE_SIZE / Math.max(textureWidth, textureHeight);
            textureWidth = Math.floor(textureWidth * scale);
            textureHeight = Math.floor(textureHeight * scale);
            // Only warn in non-test environments
            // Check if we're in a test environment by looking for vitest or testing context
            const isTest =
                typeof globalThis !== "undefined" &&
                ("__vitest_worker__" in globalThis ||
                    "__vitest_environment__" in globalThis ||
                    (typeof window !== "undefined" && window.location.href.includes("vitest")));

            if (!isTest) {
                console.warn(
                    `RichTextLabel: Texture size clamped to ${textureWidth}x${textureHeight} (max: ${MAX_TEXTURE_SIZE})`,
                );
            }
        }

        // RASTERISED ON THE CPU. Chromium draws an ordinary 2D canvas on the GPU, and on a
        // software GPU (SwiftShader: headless browsers, visual-review services) the antialiased
        // edge of large text differs by one alpha level at scattered pixels from one page load
        // to the next, so the same label drew a slightly different picture on every load.
        // `willReadFrequently` keeps the canvas on the CPU, which draws the same pixels every
        // time. A canvas has one context for life, so Babylon's own getContext("2d") gets this one.
        const canvas = this.scene.getEngine().createCanvas(textureWidth, textureHeight);
        canvas.getContext("2d", { willReadFrequently: true });
        this.texture = new DynamicTexture(`richTextTexture_${this.id}`, canvas, this.scene, true);

        // Nothing uses the texture yet; see LabelBatch (issue #2762).
        giveAlphaQuietly(this.scene, this.texture);
        this.texture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);

        this._drawContent();
    }

    private _drawContent(): void {
        if (!this.texture) {
            return;
        }

        const ctx = this.texture.getContext() as unknown as CanvasRenderingContext2D;
        const { width } = this.texture.getSize();
        const { height } = this.texture.getSize();

        ctx.clearRect(0, 0, width, height);
        // Chromium hints a font's glyphs or not by the device pixel ratio in force when it first
        // loaded that font, and keeps the loaded font for the page, so the same label drew one
        // pixel taller or shorter depending on what the page had drawn before (#3472).
        // geometricPrecision always draws unhinted glyphs, the same on every page.
        ctx.textRendering = "geometricPrecision";

        const scaleX = width / this.actualDimensions.width;
        const scaleY = height / this.actualDimensions.height;
        ctx.save();
        ctx.scale(scaleX, scaleY);

        if (this.options.pointer) {
            this._drawBackgroundWithPointer(ctx);
        } else {
            this._drawBackgroundWithBorders(ctx);
        }

        // Adjust content area for text if there's a progress bar
        let textArea = this.contentArea;
        if (this.options._progressBar) {
            const progressBarHeight = this.contentArea.height * 0.2;
            textArea = {
                x: this.contentArea.x,
                y: this.contentArea.y,
                width: this.contentArea.width,
                height: this.contentArea.height - progressBarHeight - this.options.marginBottom / 2,
            };
        }

        this.renderer.drawText(ctx, this.parsedContent, textArea);

        if (this.options.closeButton) {
            drawCloseGlyph(ctx, this.closeGlyph(), this.options.textColor);
        }

        ctx.restore();
        uploadPremultiplied(this.texture);
    }

    private _drawBackgroundWithBorders(ctx: CanvasRenderingContext2D): void {
        this._drawPanelShadow(ctx);

        const m = this.shadowMargin;
        const width = this.actualDimensions.width - m * 2;
        const height = this.actualDimensions.height - m * 2;
        const radius = this.options.cornerRadius;

        this._drawBorderRings(ctx, (offset, innerOffset, innerRadius) => {
            this._createRoundedRectPath(
                ctx,
                m + offset,
                m + offset,
                width - offset * 2,
                height - offset * 2,
                Math.max(0, radius - offset),
            );
            if (innerRadius !== undefined) {
                this._createRoundedRectPath(
                    ctx,
                    m + innerOffset,
                    m + innerOffset,
                    width - innerOffset * 2,
                    height - innerOffset * 2,
                    innerRadius,
                );
            }
        });

        ctx.beginPath();
        this._createRoundedRectPath(
            ctx,
            this.contentArea.x,
            this.contentArea.y,
            this.contentArea.width,
            this.contentArea.height,
            Math.max(0, radius - this.totalBorderWidth),
        );
        ctx.closePath();

        this._fillBackground(ctx);

        if (this.options._progressBar) {
            this._drawProgressBar(ctx);
        }
    }

    private _drawBackgroundWithPointer(ctx: CanvasRenderingContext2D): void {
        this._drawPanelShadow(ctx);

        const radius = this.options.cornerRadius;
        const pointer = this.pointerInfo === null ? null : pointerOptionsOf(this.pointerInfo);

        if (pointer !== null) {
            this._drawBorderRings(ctx, (offset, innerOffset, innerRadius) => {
                this.pointerRenderer.createSpeechBubblePath(
                    ctx,
                    this._pointerRingArea(offset),
                    Math.max(0, radius - offset),
                    pointer,
                );
                if (innerRadius !== undefined) {
                    const innerArea = this._pointerRingArea(innerOffset);
                    ctx.moveTo(innerArea.x + innerRadius, innerArea.y);
                    this.pointerRenderer.createSpeechBubblePathCCW(ctx, innerArea, innerRadius, pointer);
                }
            });
        }

        ctx.beginPath();
        if (pointer !== null) {
            this.pointerRenderer.createSpeechBubblePath(ctx, this.contentArea, radius, pointer);
        }

        ctx.closePath();

        this._fillBackground(ctx);

        if (this.options._progressBar) {
            this._drawProgressBar(ctx);
        }
    }

    /**
     * The area a pointer panel's border ring traces at an offset in from its outer edge.
     * @param offset - How far in from the outer edge.
     * @returns The area.
     */
    private _pointerRingArea(offset: number): PointerContentArea {
        return {
            x: this.contentArea.x - this.totalBorderWidth + offset,
            y: this.contentArea.y - this.totalBorderWidth + offset,
            width: this.contentArea.width + (this.totalBorderWidth - offset) * 2,
            height: this.contentArea.height + (this.totalBorderWidth - offset) * 2,
        };
    }

    /**
     * Fill each border ring, outermost first. The callback traces the ring's outer path and, when
     * the ring is hollow, its inner one; the ring is filled even-odd.
     * @param ctx - The canvas.
     * @param traceRing - Traces one ring: its outer offset, inner offset and, for a hollow ring, the
     * inner corner radius.
     */
    private _drawBorderRings(
        ctx: CanvasRenderingContext2D,
        traceRing: (offset: number, innerOffset: number, innerRadius: number | undefined) => void,
    ): void {
        const { borders } = this.options;
        let currentOffset = 0;
        for (let i = 0; i < borders.length; i++) {
            const border = borders[i];
            if (i > 0 && borders[i - 1].spacing > 0) {
                currentOffset += borders[i - 1].spacing;
            }

            ctx.save();
            ctx.fillStyle = border.color ?? "rgba(255, 255, 255, 0.8)";
            ctx.beginPath();

            const innerOffset = currentOffset + border.width;
            traceRing(currentOffset, innerOffset, this._innerRingRadius(i, innerOffset));

            ctx.fill("evenodd");
            ctx.restore();

            currentOffset = innerOffset;
        }
    }

    /**
     * The inner corner radius of a hollow border ring, or undefined for a solid one. The last ring
     * is left solid only where the background covers its middle; a background that lets the middle
     * show (none, or a translucent one) gets a hollow ring, as a stroked box is.
     * @param i - The ring's index, outermost first.
     * @param innerOffset - How far in from the outer edge the ring ends.
     * @returns The inner radius, or undefined when the ring is solid.
     */
    private _innerRingRadius(i: number, innerOffset: number): number | undefined {
        const last = i === this.options.borders.length - 1;
        if (last && innerOffset >= this.totalBorderWidth && !this._backgroundShowsThrough()) {
            return undefined;
        }

        const radius = this.options.cornerRadius;
        return radius > 0 ? this._roundedInnerRadius(radius, innerOffset, last) : 0;
    }

    /**
     * The inner corner radius of a hollow ring on a panel with rounded corners. The last ring's
     * meets the background's radius when the two would be close.
     * @param radius - The panel's corner radius, above 0.
     * @param innerOffset - How far in from the outer edge the ring ends.
     * @param last - Whether this is the innermost ring.
     * @returns The inner radius.
     */
    private _roundedInnerRadius(radius: number, innerOffset: number, last: boolean): number {
        const minRadius = Math.max(2, radius * 0.2);
        const innerRadius = Math.max(minRadius, radius - innerOffset);
        if (last) {
            const bgRadius = Math.max(minRadius, radius - this.totalBorderWidth);
            if (innerRadius < bgRadius + 5) {
                return bgRadius;
            }
        }

        return innerRadius;
    }

    /**
     * Whether the panel's background lets what lies under its middle show: none, transparent or
     * translucent. A gradient or a pattern fills the panel and is taken as covering it.
     * @returns true when the middle shows through
     */
    private _backgroundShowsThrough(): boolean {
        const bg: unknown = this.options.backgroundColor;
        if (bg === undefined || bg === null || bg === "" || bg === "transparent") {
            return true;
        }
        if (typeof bg !== "string") {
            return false;
        }
        const value = toColorValue(bg);
        return value !== null && value.a < 1;
    }

    /**
     * Draw the panel's drop shadow, and only the shadow: the panel's outline is filled far off the
     * canvas and its shadow thrown back onto it, so a see-through panel does not show a filled
     * shape through itself.
     * @param ctx - The label's canvas, already scaled to label units.
     */
    private _drawPanelShadow(ctx: CanvasRenderingContext2D): void {
        if (this.shadowMargin === 0) {
            return;
        }

        // Shadow blur and offset are in canvas pixels; the transform does not scale them.
        const { a: sx, d: sy } = ctx.getTransform();
        const away = this.actualDimensions.width * 2;

        ctx.save();
        ctx.shadowColor = this.options.panelShadowColor;
        ctx.shadowBlur = this.options.panelShadowBlur * Math.min(sx, sy);
        ctx.shadowOffsetX = (this.options.panelShadowOffsetX + away) * sx;
        ctx.shadowOffsetY = this.options.panelShadowOffsetY * sy;
        ctx.fillStyle = "black";
        this._tracePanelOutline(ctx, -away);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Trace the outside edge of the panel -- its outermost border, or the panel itself when it has
     * none -- as the current path.
     * @param ctx - The label's canvas.
     * @param dx - How far to the right to trace it.
     */
    private _tracePanelOutline(ctx: CanvasRenderingContext2D, dx: number): void {
        const border = this.totalBorderWidth;
        const radius = this.options.cornerRadius;
        if (this.options.pointer && this.pointerInfo) {
            ctx.beginPath();
            this.pointerRenderer.createSpeechBubblePath(
                ctx,
                {
                    x: this.contentArea.x - border + dx,
                    y: this.contentArea.y - border,
                    width: this.contentArea.width + border * 2,
                    height: this.contentArea.height + border * 2,
                },
                radius,
                {
                    width: this.pointerInfo.width,
                    height: this.pointerInfo.height,
                    offset: this.pointerInfo.offset,
                    direction: this.pointerInfo.direction as PointerDirection,
                    curved: this.pointerInfo.curve,
                },
            );
            ctx.closePath();
            return;
        }

        const m = this.shadowMargin;
        ctx.beginPath();
        if (this.options.borders.length > 0) {
            const { width, height } = this.actualDimensions;
            this._createRoundedRectPath(ctx, m + dx, m, width - m * 2, height - m * 2, radius);
            return;
        }

        const { x, y, width, height } = this.contentArea;
        this._createRoundedRectPath(ctx, x + dx, y, width, height, radius);
    }

    private _fillBackground(ctx: CanvasRenderingContext2D): void {
        // Handle AdvancedColorStyle
        const bgColor = this.options.backgroundColor;
        if (typeof bgColor === "object" && "colorType" in bgColor) {
            // Handle AdvancedColorStyle
            if (bgColor.colorType === "gradient") {
                const gradientX = this.contentArea.x;
                const gradientY = this.contentArea.y;
                const gradientWidth = this.contentArea.width;
                const gradientHeight = this.contentArea.height;

                // Create linear gradient based on direction
                const angle = (bgColor.direction * Math.PI) / 180;
                const x1 = gradientX + gradientWidth / 2 - (Math.cos(angle) * gradientWidth) / 2;
                const y1 = gradientY + gradientHeight / 2 - (Math.sin(angle) * gradientHeight) / 2;
                const x2 = gradientX + gradientWidth / 2 + (Math.cos(angle) * gradientWidth) / 2;
                const y2 = gradientY + gradientHeight / 2 + (Math.sin(angle) * gradientHeight) / 2;

                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

                const { colors } = bgColor;
                for (let i = 0; i < colors.length; i++) {
                    gradient.addColorStop(i / (colors.length - 1), colors[i] ?? "transparent");
                }
                ctx.fillStyle = gradient;
                ctx.fill();
                return;
            } else if (bgColor.colorType === "solid") {
                ctx.fillStyle = bgColor.value ?? "transparent";
                ctx.fill();
                return;
            }
        }

        // Handle legacy gradient properties
        if (this.options.backgroundGradient) {
            let gradient: CanvasGradient;

            // Use content area coordinates for gradient to ensure it's positioned correctly
            const gradientX = this.contentArea.x;
            const gradientY = this.contentArea.y;
            const gradientWidth = this.contentArea.width;
            const gradientHeight = this.contentArea.height;

            if (this.options.backgroundGradientType === "radial") {
                const centerX = gradientX + gradientWidth / 2;
                const centerY = gradientY + gradientHeight / 2;
                const radius = Math.max(gradientWidth, gradientHeight) / 2;
                gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            } else {
                switch (this.options.backgroundGradientDirection) {
                    case "horizontal":
                        gradient = ctx.createLinearGradient(gradientX, gradientY, gradientX + gradientWidth, gradientY);
                        break;
                    case "diagonal":
                        gradient = ctx.createLinearGradient(
                            gradientX,
                            gradientY,
                            gradientX + gradientWidth,
                            gradientY + gradientHeight,
                        );
                        break;
                    case "vertical":
                    default:
                        gradient = ctx.createLinearGradient(
                            gradientX,
                            gradientY,
                            gradientX,
                            gradientY + gradientHeight,
                        );
                        break;
                }
            }

            const colors = this.options.backgroundGradientColors;
            for (let i = 0; i < colors.length; i++) {
                gradient.addColorStop(i / (colors.length - 1), colors[i] ?? "transparent");
            }
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = typeof bgColor === "string" ? bgColor : "transparent";
        }

        ctx.fill();
    }

    private _drawProgressBar(ctx: CanvasRenderingContext2D): void {
        const progressBarHeight = this.contentArea.height * 0.2;
        const progressBarY =
            this.contentArea.y +
            this.contentArea.height -
            progressBarHeight -
            this.options.backgroundPadding -
            this.options.marginBottom / 2;
        const progressBarX = this.contentArea.x + this.options.backgroundPadding;
        const progressBarWidth = this.contentArea.width - this.options.backgroundPadding * 2;

        ctx.save();

        // Draw progress bar background
        ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        // Draw progress bar fill
        ctx.fillStyle = "rgba(0, 122, 255, 1)";
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * this._progressValue, progressBarHeight);

        ctx.restore();
    }

    private _updateProgressBarOnly(): void {
        if (!this.texture || !this.options._progressBar) {
            return;
        }

        const ctx = this.texture.getContext() as unknown as CanvasRenderingContext2D;
        const { width } = this.texture.getSize();
        const { height } = this.texture.getSize();

        const scaleX = width / this.actualDimensions.width;
        const scaleY = height / this.actualDimensions.height;

        // Calculate progress bar area
        const progressBarHeight = this.contentArea.height * 0.2;
        const progressBarY =
            this.contentArea.y +
            this.contentArea.height -
            progressBarHeight -
            this.options.backgroundPadding -
            this.options.marginBottom / 2;
        const progressBarX = this.contentArea.x + this.options.backgroundPadding;
        const progressBarWidth = this.contentArea.width - this.options.backgroundPadding * 2;

        // Clear only the progress bar area
        ctx.save();
        ctx.scale(scaleX, scaleY);

        // Clear the progress bar area by redrawing the background color
        const bgColor = this.options.backgroundColor;
        ctx.fillStyle = typeof bgColor === "string" ? bgColor : "transparent";
        ctx.fillRect(progressBarX - 1, progressBarY - 1, progressBarWidth + 2, progressBarHeight + 2);

        // Draw progress bar background
        ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        // Draw progress bar fill
        ctx.fillStyle = "rgba(0, 122, 255, 1)";
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth * this._progressValue, progressBarHeight);

        ctx.restore();
        uploadPremultiplied(this.texture);
    }

    private _createRoundedRectPath(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        wanted: number,
    ): void {
        // CLAMPED TO WHAT THE BOX CAN HOLD. A corner radius larger than half the box has no
        // meaning, and the path below does not degrade gracefully into one: `moveTo(x + r, y)`
        // followed by `lineTo(x + width - r, y)` runs backwards, and the quadratics close over a
        // shape that fills the corners it was asked to cut away. Every badge in the badge table
        // asks for 999 to mean "a pill", and every one of them was drawn as a square.
        const radius = Math.max(0, Math.min(wanted, width / 2, height / 2));

        // CIRCULAR ARCS, NOT QUADRATICS. A quadratic corner bulges towards the corner, and two of
        // them a border's width apart are not parallel: the ring between them was thicker along
        // the diagonal than along the edges (#3158).
        // No beginPath here: a caller cutting a hole adds a second rectangle to the same path.
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    private _createMaterial(): void {
        // Built and set up without the scene-wide searches and walks Babylon makes for a material
        // that nothing draws yet; see LabelBatch (issue #2762).
        const material = buildMaterial(
            this.scene,
            () => new StandardMaterial(`richTextMaterial_${this.id}`, this.scene),
        );
        this.material = material;
        setUpQuietly(material, () => {
            if (this.texture) {
                material.diffuseTexture = this.texture;
            }

            material.specularColor = new Color3(0, 0, 0);
            // A LABEL LEAVES THE STENCIL ALONE. A node's outline is a highlight layer, which paints
            // its blurred silhouette everywhere the stencil does not hold the outlined node's mark. A
            // label drawn over its node wrote the ordinary mark in its place, so the outline was
            // painted over the words in the outline's color: a centered label on an outlined node was
            // a black disc (issue #2323). With writes masked off, the node's mark stays under the label.
            material.stencil.enabled = true;
            material.stencil.mask = 0x00;
            // Only set emissiveColor if we're not using glow animation
            if (this.options.animation !== "glow") {
                // Lit by its emissive color alone, so a depth fade can scale the premultiplied
                // color with the alpha (see _setupDepthFading); at 1 it draws as before, since the
                // emissive white already saturated the light the diffuse color added.
                material.diffuseColor = new Color3(0, 0, 0);
                material.emissiveColor = new Color3(1, 1, 1);
            } else {
                // Start with a neutral emissive for glow animation
                material.emissiveColor = new Color3(0.65, 0.65, 0.65);
            }

            material.backFaceCulling = false;
            material.useAlphaFromDiffuseTexture = true;
            material.alphaMode = PREMULTIPLIED_ALPHA_MODE;
        });
    }

    /**
     * How tall one line of the label is in the scene: the style's `size`, in the units of a node's
     * size, or `fontSize / 48` when it names none.
     * @returns The height in world units.
     */
    /**
     * Break the label's lines where they run past its wrap width, at the spaces between words. The
     * width is in the scene, so it is turned into the canvas's pixels by one line's height in each.
     * A word longer than the width keeps a line of its own.
     * @param ctx - A canvas to measure on.
     */
    private wrapToWidth(ctx: CanvasRenderingContext2D): void {
        const { wrapWidth } = this.options;
        const first = this.parsedContent.find((line) => line.length > 0);
        if (wrapWidth === undefined || first === undefined) {
            return;
        }

        // Without the outline, as `measureHeightInLines` measures one line.
        const { lineBox } = measureLine(ctx, first, {
            lineHeight: DEFAULT_LINE_HEIGHT,
            textOutline: false,
            textOutlineWidth: 0,
            runAlign: this.options.runAlign,
        });
        // One line's plane is `lineHeightInWorld` tall for a canvas of the line, its margins, its
        // panel's padding and its borders (see `_calculateDimensions`).
        const { marginTop, marginBottom, backgroundPadding, borders } = this.options;
        const bordersPx = borders.reduce((sum, border) => sum + border.width + border.spacing, 0);
        const oneLinePx = lineBox + marginTop + marginBottom + 2 * backgroundPadding + 2 * bordersPx;
        const { letterSize, fontSize } = this.options;
        const widthPx =
            letterSize === undefined || letterSize <= 0
                ? (wrapWidth * oneLinePx) / this.lineHeightInWorld()
                : (wrapWidth * fontSize) / letterSize;
        const { wrapTrailingSpace, wrapEllipsis, wrapAnywhere, wrapSpaceCount } = this.options;
        this.parsedContent = wrapLines(ctx, this.parsedContent, widthPx, {
            trailingSpace: wrapTrailingSpace === true,
            ellipsis: wrapEllipsis === true,
            anywhere: wrapAnywhere === true,
            spaceCount: wrapSpaceCount,
        });
    }

    private lineHeightInWorld(): number {
        const { letterSize, fontSize } = this.options;
        if (letterSize !== undefined && letterSize > 0 && this.oneLinePx > 0) {
            // the letters are fontSize canvas pixels tall, so a line's canvas maps at that rate
            return (letterSize * this.oneLinePx) / fontSize;
        }
        return this.options.size ?? fontSize / 48;
    }

    private _createMesh(): void {
        const aspectRatio = this.actualDimensions.width / this.actualDimensions.height;
        const planeHeight = this.lineHeightInWorld() * this.heightInLines;
        const planeWidth = aspectRatio * planeHeight;

        this.mesh = MeshBuilder.CreatePlane(
            `richTextPlane_${this.id}`,
            {
                width: planeWidth,
                height: planeHeight,
                // ONE SIDE, seen from both: the material draws back faces too. A double-sided plane
                // is two planes in one place, and both were blended, so every label was drawn
                // twice and its letters' soft edges came out darker -- heavier text the smaller it
                // was drawn (about 1.4x the ink of the program that wrote the file at 10 px, 1.8x
                // at 2 px).
            },
            this.scene,
        );

        this.mesh.material = this.material;
        // A label with a close button is told apart from other labels by a click; see labelClose.
        // Every label plane is pickable, as Babylon makes it, so one without a button still
        // stops a click as it always has: a click on it reaches no node behind it.
        if (this.options.closeButton) {
            this.unmarkClose = markCloseLabel(this.mesh, () => this.closeBounds);
        }

        this.mesh.billboardMode = this.billboard();
        // Turned in its own plane, which faces the camera: clockwise on screen is a negative turn about z.
        this.mesh.rotation.z = (-(this.options.rotation ?? 0) * Math.PI) / 180;
        // A label sorts by depth with the nodes and edges it belongs to unless its style sets
        // `onTop` (a tooltip always does). Either way it is drawn after the graph's glows; on top,
        // also with the depth buffer cleared, so nothing in the graph can cover it.
        // ponytail: group 0's translucent nodes are drawn before every label now, so one in front
        // of a label hides it rather than tinting it; stop translucent nodes writing depth if that shows.
        this.scene.setRenderingAutoClearDepthStencil(LABEL_RENDERING_GROUP, false);
        this.mesh.renderingGroupId = this.options.onTop === true ? ON_TOP_RENDERING_GROUP : LABEL_RENDERING_GROUP;
    }

    /**
     * How far a label's offset and shift move it, right and down on screen: y is up in every frame here. The shift is
     * along the label's own turned axes, so a turned label turns about the point of its box the shift pins, as
     * Cytoscape desktop, Cytoscape.js and Pajek turn a label about its anchor (cx2-syn-mappings: a label pinned by its
     * left middle and turned 33.5 degrees hangs 7 px below its node's middle).
     * @param labelWidth - The label's width, in world units.
     * @param labelHeight - The label's height, in world units.
     * @returns The move, right and down.
     */
    private offsetAndShift(labelWidth: number, labelHeight: number): { x: number; y: number } {
        const { offsetX = 0, offsetY = 0, shiftX = 0, shiftY = 0 } = this.options;
        const turn = ((this.options.rotation ?? 0) * Math.PI) / 180;
        const [sx0, sy0] = [shiftX * labelWidth, shiftY * labelHeight];
        return {
            x: offsetX + sx0 * Math.cos(turn) - sy0 * Math.sin(turn),
            y: offsetY + sx0 * Math.sin(turn) + sy0 * Math.cos(turn),
        };
    }

    /**
     * Where a label beside its target goes when its offset moves it over the target (vis-network's font.vadjust, a
     * Cytoscape.js text margin into the node): in front of it, hung from the pivot a center label hangs from, since
     * beside, in the target's own frame, the target's mesh hides it.
     * @param target - The mesh the label is attached to.
     * @param newPos - Where the label is, beside the target.
     * @param bounds - The target's bounds.
     * @param bounds.min - Their lowest corner.
     * @param bounds.max - Their highest corner.
     * @param size - The label's size, in world units.
     * @param size.width - Its width.
     * @param size.height - Its height.
     * @returns Where the label goes: in front of the target when it is over it, else where it is.
     */
    private hungOverTarget(
        target: AbstractMesh,
        newPos: Vector3,
        bounds: { min: Vector3; max: Vector3 },
        size: { width: number; height: number },
    ): Vector3 {
        const mid = bounds.min.add(bounds.max).scaleInPlace(0.5);
        const overX = Math.abs(newPos.x - mid.x) < (size.width + bounds.max.x - bounds.min.x) / 2;
        const overY = Math.abs(newPos.y - mid.y) < (size.height + bounds.max.y - bounds.min.y) / 2;
        if (!overX || !overY) {
            return newPos;
        }

        this.parentTo(target, bounds);
        const hung = newPos.subtract(this.centerPivot?.position ?? mid);
        hung.z = -Vector3.Distance(bounds.min, bounds.max) / 2;
        return hung;
    }

    /**
     * The box a label is placed against: a point target's own point (the label then hangs from no pivot), or a mesh
     * target's bounding box.
     * @param target - What the label is attached to.
     * @returns The box, or null when the target is neither, and the label stands at its own position.
     */
    private targetBounds(target: RichTextLabelOptions["attachTo"]): { min: Vector3; max: Vector3 } | null {
        if (target instanceof Vector3) {
            this.dropPivot();
            return { min: target.clone(), max: target.clone() };
        }
        if (target && "getBoundingInfo" in target && target instanceof AbstractMesh) {
            const { boundingBox } = target.getBoundingInfo();
            return this.ringBounds({ min: boundingBox.minimum, max: boundingBox.maximum });
        }
        return null;
    }

    /**
     * Point a label's pointer away from where it is placed, when its direction is "auto", and redraw it.
     * @param position - Where the label is placed against its target.
     */
    private aimPointerAway(position: AttachPosition): void {
        if (this.options.pointer && this.options.pointerDirection === "auto" && this.pointerInfo) {
            this.pointerInfo.direction = POINTER_AWAY_FROM[position] ?? "bottom";
            this._calculateDimensions();
            this._drawContent();
        }
    }

    private _attachToTarget(): void {
        const target = this.options.attachTo;
        const position = this.options.attachPosition;

        if (!this.mesh) {
            return;
        }

        const bounds = this.targetBounds(target);
        if (bounds === null || target === undefined) {
            this.dropPivot();
            this.mesh.position = new Vector3(this.options.position.x, this.options.position.y, this.options.position.z);
            this.placementBounds = this._pointBounds(this.mesh.position);
            return;
        }

        // Measured before a pointer is re-aimed below, as it always has been.
        const labelHeight = this.lineHeightInWorld() * this.heightInLines;
        const labelWidth = (this.actualDimensions.width / this.actualDimensions.height) * labelHeight;

        this.aimPointerAway(position);

        const inside = Object.hasOwn(INSIDE, position) ? INSIDE[position as InsidePosition] : null;
        const inFront = (position === "center" || inside !== null) && !(target instanceof Vector3);
        const frontBounds = inFront ? bounds : null;
        let newPos = target instanceof Vector3 ? target.clone() : this.parentTo(target, frontBounds);
        // A target drawn stretched (a group over its members' box) leaves its label the size the
        // label's style gives: the label undoes the stretch and its gaps are measured in it.
        const stretch = target instanceof Vector3 ? null : this.undoStretchOf(target);

        if (inFront) {
            placeInFront(newPos, bounds, stretch ?? Vector3.OneReadOnly, inside, {
                width: labelWidth,
                height: labelHeight,
                offset: this.options.attachOffset,
            });
            // What a screen fit places it beside: the bounds in the pivot's frame, whose origin is
            // the node's centre.
            const centre = bounds.min.add(bounds.max).scaleInPlace(0.5);
            this.placementBounds = {
                min: bounds.min.subtract(centre),
                max: bounds.max.subtract(centre),
                z: -Vector3.Distance(bounds.min, bounds.max) / 2,
            };
        } else {
            placeBeside(
                newPos,
                position,
                bounds,
                { width: labelWidth, height: labelHeight },
                this.options.attachOffset,
                stretch ?? undefined,
            );
            this.placementBounds = { min: bounds.min, max: bounds.max, z: newPos.z };
        }

        const move = this.offsetAndShift(labelWidth, labelHeight);
        const moved = move.x !== 0 || move.y !== 0;
        if (moved) {
            // beside its target the label is in the target's own frame, whose stretch its gaps undo
            const undo = inFront ? null : stretch;
            newPos.x += move.x / ((undo?.x ?? 1) || 1);
            newPos.y -= move.y / ((undo?.y ?? 1) || 1);
        }

        if (moved && !inFront && target instanceof AbstractMesh && stretch === null) {
            newPos = this.hungOverTarget(target, newPos, bounds, { width: labelWidth, height: labelHeight });
        }

        this.mesh.position = newPos;
        this.originalPosition ??= newPos.clone();

        if (this.animator) {
            this.animator.updateOriginalPosition(newPos);
        }
    }

    /**
     * Keep the label clear of a ring drawn around what it is attached to -- a node's halo -- the
     * way it keeps clear of the target itself, and put it back beside the target when the ring
     * goes. The ring is a sphere around the target's centre whose radius is `scale` times the
     * target's largest half-extent.
     * @param scale - The ring's radius over the target's largest half-extent, or null for no ring.
     * @returns True when the label moved.
     */
    public setRing(scale: number | null): boolean {
        const next = scale !== null && scale > 1 ? scale : null;
        if (next === this.ring) {
            return false;
        }

        this.ring = next;
        this._attachToTarget();
        return true;
    }

    /**
     * How far a ring set by {@link RichTextLabel.setRing} reaches, over the target's largest
     * half-extent: 1 when there is no ring, so a radius times this is the reach either way.
     * @returns The ring's scale, or 1.
     */
    public get ringScale(): number {
        return this.ring ?? 1;
    }

    /**
     * The box a label is placed beside: the target's own, or the ring's around it when that is
     * larger.
     * @param bounds - The target's bounds.
     * @param bounds.min - Its lowest corner.
     * @param bounds.max - Its highest corner.
     * @returns The bounds to place beside.
     */
    private ringBounds(bounds: { min: Vector3; max: Vector3 }): { min: Vector3; max: Vector3 } {
        if (this.ring === null) {
            return bounds;
        }

        const centre = bounds.min.add(bounds.max).scaleInPlace(0.5);
        const half = bounds.max.subtract(bounds.min).scaleInPlace(0.5);
        const radius = Math.max(half.x, half.y, half.z) * this.ring;
        const reach = new Vector3(Math.max(half.x, radius), Math.max(half.y, radius), Math.max(half.z, radius));
        return { min: centre.subtract(reach), max: centre.add(reach) };
    }

    private _pointBounds(point: Vector3): PlacementBounds {
        return { min: point.clone(), max: point.clone(), z: point.z };
    }

    private _setupScreenFit(): void {
        const { mesh } = this;
        if (!mesh) {
            return;
        }

        const { options } = this;
        const size = (): ActualDimensions => this.actualDimensions;
        const lines = (): number => this.heightInLines;
        const lineHeight = (): number => this.lineHeightInWorld();
        const bounds = (): PlacementBounds => this.placementBounds ?? NO_BOUNDS;
        this.stopScreenFit = fitToScreen(this.scene, {
            mesh,
            get planeWidth() {
                return (size().width / size().height) * this.planeHeight;
            },
            get planeHeight() {
                return lineHeight() * lines();
            },
            // `fontSize` is `sizePx`, so one canvas unit is one CSS pixel and the letters are
            // `sizePx` CSS pixels tall.
            get screenHeight() {
                return options.sizeMode === "screen" ? size().height : undefined;
            },
            get keepInView() {
                return options.keepInView === true;
            },
            get bounds() {
                return bounds();
            },
            // A label with nothing to hang from sits exactly where it was put.
            get placement() {
                const at = options.attachPosition;
                // A label inside its target is fitted as a centred one.
                return options.attachTo && !Object.hasOwn(INSIDE, at) ? (at as LabelPlacement) : "center";
            },
            get offset() {
                return options.attachTo ? options.attachOffset : 0;
            },
        });
    }

    /**
     * Undo a target's stretch on the label, or reset an undo once the target is back at its own size.
     * @param target - The mesh the label belongs to.
     * @returns The target's stretch, or null when it is drawn at its own size.
     */
    private undoStretchOf(target: AbstractMesh): Vector3 | null {
        const scaled = target.scaling;
        const stretch = scaled.equals(Vector3.OneReadOnly) ? null : scaled;
        if (stretch !== null || this.undoesStretch) {
            const unstretched = this.centerPivot ?? this.mesh;
            const by = stretch ?? Vector3.OneReadOnly;
            unstretched?.scaling.set(1 / (by.x || 1), 1 / (by.y || 1), 1 / (by.z || 1));
            this.undoesStretch = stretch !== null;
        }

        return stretch;
    }

    /**
     * Parent the label to the mesh it is attached to.
     *
     * A "center" label sits in the middle of its node, which is inside the node's mesh, so the
     * mesh hid it. It hangs from a pivot at the node's centre instead, and the pivot, not the
     * label, turns to face the camera: in the pivot's frame the camera is always straight down
     * -z, so a label placed one bounding radius along -z is in front of the node from wherever it
     * is seen.
     * @param target - The mesh the label belongs to.
     * @param center - The mesh's bounds when the label sits at its centre, otherwise null.
     * @returns The origin of the frame the label is now positioned in.
     */
    private parentTo(target: AbstractMesh, center: { min: Vector3; max: Vector3 } | null): Vector3 {
        const mesh = this.mesh as Mesh;
        if (center === null) {
            this.dropPivot();
            mesh.parent = target;
            mesh.billboardMode = this.billboard();
            return Vector3.Zero();
        }

        this.centerPivot ??= new TransformNode(`richTextPivot_${this.id}`, this.scene);
        this.centerPivot.parent = target;
        this.centerPivot.position =
            this.options.centerAtOrigin === true ? Vector3.Zero() : center.min.add(center.max).scaleInPlace(0.5);
        this.centerPivot.billboardMode = this.billboard();
        mesh.parent = this.centerPivot;
        mesh.billboardMode = Mesh.BILLBOARDMODE_NONE;
        return Vector3.Zero();
    }

    /**
     * The billboard mode the label is drawn with. In the 2D view a label that faces the camera
     * keeps no upright of its own: it turns with the view, as the rest of the drawing does
     * (Graphviz's landscape turns its labels too).
     * @returns The mode.
     */
    private billboard(): number {
        const mode = this.options.billboardMode;
        return mode === Mesh.BILLBOARDMODE_ALL && this.scene.metadata?.twoD === true
            ? Mesh.BILLBOARDMODE_X | Mesh.BILLBOARDMODE_Y
            : mode;
    }

    /** Dispose the pivot a "center" label hung from, once the label no longer hangs from it. */
    private dropPivot(): void {
        this.centerPivot?.dispose();
        this.centerPivot = null;
    }

    private _setupDepthFading(): void {
        const cameraAt = new Vector3();

        this.stopDepthFade = depthFadeFrames.join(this.scene, () => {
            // READ EVERY FRAME: switching between 2D and 3D swaps the active camera.
            const camera = this.scene.activeCamera;
            if (!camera || !this.mesh || !this.material) {
                return;
            }

            // WHERE THE CAMERA REALLY IS. The 3D camera is parented to a pivot, so its `position`
            // is an offset from that pivot -- (0, 0, -distance) however the graph is centred or
            // turned. Measuring from that faded labels as if the camera sat near the origin, and
            // orbiting changed nothing. The world matrix carries the pivot.
            camera.getWorldMatrix().getTranslationToRef(cameraAt);

            // THE ABSOLUTE POSITION, NOT THE LOCAL ONE. A label's plane is PARENTED to the node
            // it belongs to, so `mesh.position` is its offset from that node -- the same small
            // vector on every label in the graph. Measuring the camera against that measured the
            // camera against the origin, so every label in the scene faded by exactly the same
            // amount however near or far its node was, which is the one thing depth fading is
            // for. Read back in a story: twenty labels, twenty identical alphas.
            const distance = Vector3.Distance(cameraAt, this.mesh.getAbsolutePosition());

            let fadeFactor: number;
            if (distance < this.options.depthFadeNear) {
                fadeFactor = 1;
            } else if (distance > this.options.depthFadeFar) {
                fadeFactor = 0;
            } else {
                const fadeRange = this.options.depthFadeFar - this.options.depthFadeNear;
                fadeFactor = 1 - (distance - this.options.depthFadeNear) / fadeRange;
            }

            // The texture's colors are premultiplied (PREMULTIPLIED_ALPHA_MODE), so the color
            // fades with the alpha; fading the alpha alone would let the background through
            // while the words kept their full color, which brightens instead of fading.
            this.material.alpha = fadeFactor;
            if (this.options.animation !== "glow") {
                this.material.emissiveColor.set(fadeFactor, fadeFactor, fadeFactor);
            }
        });
    }

    /**
     * Sets the label text and redraws the label
     * @param text - The new text content
     */
    public setText(text: string): void {
        const numericValue = Number(text);
        if (this.options.smartOverflow && !Number.isNaN(numericValue)) {
            const num = Number.parseInt(text, 10);
            if (num > this.options.maxNumber) {
                if (num >= 1000) {
                    this.options.text = `${Math.floor(num / 1000)}k`;
                } else {
                    this.options.text = `${this.options.maxNumber}${this.options.overflowSuffix}`;
                }
            } else {
                this.options.text = text;
            }
        } else {
            this.options.text = text;
        }

        this._parseRichText();
        this._calculateDimensions();
        this._drawContent();
    }

    /**
     * Sets the progress bar value
     * @param value - Progress value between 0 and 1
     */
    public setProgress(value: number): void {
        this._progressValue = Math.max(0, Math.min(1, value));
        this._drawContent();
    }

    /**
     * Place the label against its target again, after the target changed size or stretch.
     */
    public reattach(): void {
        this._attachToTarget();
    }

    /**
     * Attaches the label to a target mesh or position
     * @param target - The mesh or position to attach to
     * @param position - The attachment position relative to the target
     * @param offset - Distance offset from the target
     */
    public attachTo(target: AbstractMesh | Vector3, position: AttachPosition = "top", offset = 0.5): void {
        this.options.attachTo = target;
        this.options.attachPosition = position;
        this.options.attachOffset = offset;

        if (this.mesh?.parent && this.mesh.parent !== target) {
            this.mesh.parent = null;
        }

        this._attachToTarget();
    }

    /**
     * Starts the label animation (if configured)
     */
    public startAnimation(): void {
        if (this.animationStarted || !this.mesh || !this.material) {
            return;
        }

        this.animationStarted = true;

        // No animator (animation: "none"): nothing to start. `isVisible` is deliberately left
        // alone: it is LabelDeclutter's switch, and this runs on the layout settling, or on the
        // first frame that finds it at rest -- after the declutter pass on some loads and before it on others --
        // with nothing that makes the pass run again, so showing the label here re-drew labels
        // the pass had hidden, on some loads only.
        if (!this.animator) {
            if (this.material.diffuseTexture) {
                this.material.diffuseTexture.hasAlpha = true;
            }

            return;
        }

        // For fill animation, only redraw if progress bar is enabled
        const progressCallback = this.options._progressBar
            ? (value: number) => {
                  this._progressValue = value;
                  this._updateProgressBarOnly();
              }
            : undefined;

        this.animator.setupAnimation(this.mesh, this.material, progressCallback);
    }

    /**
     * Disposes the label and cleans up all resources
     */
    public dispose(): void {
        // Clean up scene callback first
        this.stopDepthFade?.();
        this.stopDepthFade = null;
        this.stopMinScreenSize?.();
        this.stopMinScreenSize = null;
        this.stopScreenFit?.();
        this.stopScreenFit = null;
        this.unmarkClose?.();
        sceneLabels.get(this.scene)?.delete(this);

        if (this.animator) {
            this.animator.dispose();
        }

        // A repaint that disposes many labels releases them all at once when it ends; see
        // LabelBatch (issue #2762).
        if (deferLabelRelease({ mesh: this.mesh, material: this.material, texture: this.texture })) {
            return;
        }

        if (this.mesh) {
            this.mesh.dispose();
        }

        this.dropPivot();

        if (this.material) {
            this.material.dispose();
        }

        if (this.texture) {
            this.texture.dispose();
        }
    }

    /**
     * How tall the letters are drawn on screen, in pixels: the font's size on the label's own
     * canvas, times the scene size of one canvas pixel, times the screen pixels of one scene unit
     * where the label is.
     * @param camera - The camera the frame is drawn from.
     * @returns The height, or 0 when the label has no plane or sits behind the camera.
     */
    public screenFontPx(camera: Camera): number {
        const { mesh } = this;
        if (!mesh || this.actualDimensions.height <= 0) {
            return 0;
        }

        const planeHeight = mesh.getBoundingInfo().boundingBox.extendSize.y * 2 * Math.abs(mesh.absoluteScaling.y);
        const perPixel = planeHeight / this.actualDimensions.height;
        return this.options.fontSize * perPixel * pixelsPerUnit(camera, mesh.getAbsolutePosition());
    }

    /**
     * Whether the label's style hides it at its current size on screen: its letters drawn smaller
     * than `minScreenSize` pixels, or the mesh it is attached to drawn smaller across than
     * `minNodeScreenSize` pixels.
     * @param camera - The camera the frame is drawn from.
     * @returns True when either is too small.
     */
    public tooSmall(camera: Camera): boolean {
        const min = this.options.minScreenSize ?? 0;
        if (min > 0 && this.screenFontPx(camera) < min) {
            return true;
        }

        const minTarget = this.options.minNodeScreenSize ?? 0;
        const target = this.options.attachTo;
        if (minTarget <= 0 || !(target instanceof AbstractMesh)) {
            return false;
        }

        const { extendSizeWorld, centerWorld } = target.getBoundingInfo().boundingBox;
        const across = 2 * Math.min(extendSizeWorld.x, extendSizeWorld.y);
        return across * pixelsPerUnit(camera, centerWorld) < minTarget;
    }

    /**
     * What the label's style asks of the label declutter (`LabelStyle.declutter`), if anything.
     * @returns The order its labels are kept in, or undefined.
     */
    public get declutterOrder(): "degree" | "size" | undefined {
        return this.options.declutter;
    }

    /**
     * Gets the label's mesh
     * @returns The Babylon.js mesh or null if not created
     */
    public get labelMesh(): Mesh | null {
        return this.mesh;
    }

    /**
     * The runs of text the label draws, one list per line, each with the style it is drawn in:
     * what the markup in its text came to, or the text whole when it is plain text.
     * @returns The runs.
     */
    public get textRuns(): readonly (readonly TextSegment[])[] {
        return this.parsedContent;
    }

    /**
     * Where the words sit on the label's plane, without its margins, padding, borders or pointer.
     *
     * Each edge is a fraction of the plane: `left`/`right` across it from its left edge, and
     * `top`/`bottom` down it from its top edge, so a label whose words fill it reads
     * `{ left: 0, right: 1, top: 0, bottom: 1 }`. Two labels whose planes overlap only in their
     * padding do not draw over each other's words; this is what tells them apart.
     * @returns The words' rectangle as fractions of the plane.
     */
    public get textBounds(): { left: number; right: number; top: number; bottom: number } {
        const { width, height } = this.actualDimensions;
        if (width <= 0 || height <= 0) {
            return { left: 0, right: 1, top: 0, bottom: 1 };
        }

        // The same arithmetic RichTextRenderer.drawText lays the widest line out with.
        const pad = this.options.backgroundPadding;
        const areaX = this.contentArea.x + this.options.marginLeft + pad;
        const areaWidth = this.contentArea.width - this.options.marginLeft - this.options.marginRight - pad * 2;
        let x = areaX + (areaWidth - this.textSize.width) / 2;
        if (this.options.textAlign === "left") {
            x = areaX;
        } else if (this.options.textAlign === "right") {
            x = areaX + areaWidth - this.textSize.width;
        }

        const y = this.contentArea.y + this.options.marginTop + pad;

        return {
            left: x / width,
            right: (x + this.textSize.width) / width,
            top: y / height,
            bottom: (y + this.textSize.height) / height,
        };
    }

    /**
     * The label's font size times its line count, as a fraction of the plane's height: how tall Cytoscape.js bounds
     * its words, where {@link textBounds} gives the line boxes they are drawn in.
     * @returns The fraction.
     */
    public get emHeight(): number {
        const { height } = this.actualDimensions;
        return height > 0 ? (this.options.fontSize * Math.max(1, this.parsedContent.length)) / height : 0;
    }

    /**
     * One pixel of the label's font as a fraction of the plane's height, in the units {@link emHeight} measures.
     * @returns The fraction.
     */
    public get pixelHeight(): number {
        const { height } = this.actualDimensions;
        return height > 0 ? 1 / height : 0;
    }

    /**
     * Where a click reaches the label's close button, as fractions of the plane (as
     * {@link textBounds} measures), or undefined when the label has none.
     * @returns The hit area.
     */
    public get closeBounds(): { left: number; right: number; top: number; bottom: number } | undefined {
        return this.options.closeButton ? closeHitFractions(this.closeGlyph(), this.actualDimensions) : undefined;
    }

    /**
     * The close button's box on the label's canvas.
     * @returns The box.
     */
    private closeGlyph(): ReturnType<typeof closeGlyphRect> {
        return closeGlyphRect(
            this.contentArea,
            this.options.fontSize,
            this.options.backgroundPadding,
            Math.max(0, this.options.cornerRadius - this.totalBorderWidth),
        );
    }

    /**
     * Gets the label's unique identifier
     * @returns The label ID
     */
    public get labelId(): string {
        return this.id;
    }
}
