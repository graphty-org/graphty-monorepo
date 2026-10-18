import {
    AbstractMesh,
    Color3,
    Constants,
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
import { FrameRoster } from "./FrameRoster";
import { buildMaterial, deferLabelRelease, giveAlphaQuietly, setUpQuietly } from "./LabelBatch";
import { closeGlyphRect, closeHitFractions, closeReserve, drawCloseGlyph, markCloseLabel } from "./labelClose";
import { fitToScreen, placeBeside, type PlacementBounds } from "./labelScreenFit";
import { type ContentArea as PointerContentArea, type PointerDirection, PointerRenderer } from "./PointerRenderer";
import { RichTextAnimator } from "./RichTextAnimator";
import { measureLine, RichTextParser } from "./RichTextParser";
import { RichTextRenderer } from "./RichTextRenderer";

/** The depth-fading labels of each scene, behind one before-render observer; see {@link FrameRoster}. */
const depthFadeFrames = new FrameRoster();

/** What a label hangs beside before it has been placed. */
const NO_BOUNDS: PlacementBounds = { min: Vector3.Zero(), max: Vector3.Zero(), z: 0 };

/** The Babylon rendering group a label drawn on top uses: after nodes and edges (group 0). */
const ON_TOP_RENDERING_GROUP = 1;

/**
 * Whether a label's canvas is uploaded with premultiplied alpha.
 *
 * DARK CORNERS OTHERWISE (#3158). Uploaded straight, a pixel the panel only partly covers keeps
 * its full color while the transparent pixels around it are black, and the GPU's filtering and
 * mipmaps average the two: the panel's antialiased curves came out as dark ticks on a light
 * border. Straight edges lie on whole texels and have no such pixels. Premultiplied, a transparent
 * pixel contributes nothing to the average.
 */
const PREMULTIPLIED = true;

/** The line height a label is drawn at when its style names none. */
const DEFAULT_LINE_HEIGHT = 1.2;

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
    "top" | "bottom" | "left" | "right" | "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface RichTextStyle {
    font: string;
    size: number;
    weight: string;
    style: string;
    color: string;
    background: string | null;
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
    | "plainText"
    | "size"
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
    private totalBorderWidth = 0;
    /** The room around the panel its drop shadow is drawn in, on every side; zero without one. */
    private shadowMargin = 0;
    private pointerInfo: PointerInfo | null = null;
    private _progressValue = 0;
    private readonly id: string;
    private originalPosition: Vector3 | null = null;

    private readonly parser: RichTextParser;
    private readonly renderer: RichTextRenderer;
    private readonly animator: RichTextAnimator | null = null;
    private readonly pointerRenderer: PointerRenderer;
    /** Ends this label's depth fade; see {@link depthFadeFrames}. */
    private stopDepthFade: (() => void) | null = null;
    /** Ends this label's screen sizing and keeping in view; see labelScreenFit. */
    private stopScreenFit: (() => void) | null = null;
    /** What the label hangs beside, in its parent's coordinates, once attached. */
    private placementBounds: PlacementBounds | null = null;
    /** What a "center" label hangs from: a point at its node's centre that faces the camera. */
    private centerPivot: TransformNode | null = null;
    private animationStarted = false;
    /** Takes the plane off its scene's count of labels with a close button. */
    private unmarkClose: (() => void) | null = null;

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
            backgroundGradientColors: ["rgba(0, 0, 0, 0.8)", "rgba(50, 50, 50, 0.8)"],
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

        let finalOptions: ResolvedRichTextLabelOptions = { ...defaultOptions, ...userOptions };

        if (finalOptions.badge) {
            const badgeDefaults = BadgeStyleManager.getBadgeStyle(finalOptions.badge);
            if (badgeDefaults) {
                finalOptions = { ...finalOptions, ...badgeDefaults, ...userOptions };
            }
        }

        BadgeStyleManager.applyBadgeBehaviors(finalOptions, userOptions);

        if (finalOptions.borderWidth > 0 && finalOptions.borders.length === 0) {
            finalOptions.borders = [
                {
                    width: finalOptions.borderWidth,
                    color: finalOptions.borderColor,
                    spacing: 0,
                },
            ];
        }

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
        });

        this.pointerRenderer = new PointerRenderer();

        if (this.options.animation !== "none") {
            this.animator = new RichTextAnimator(this.scene, {
                animation: this.options.animation,
                animationSpeed: this.options.animationSpeed,
            });
        }

        this._create();
    }

    private _create(): void {
        this._parseRichText();
        this._calculateDimensions();
        this._createTexture();
        this._createMaterial();
        this._createMesh();

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

        const { maxWidth, totalHeight } = this.parser.measureText(this.parsedContent, tempCtx, {
            lineHeight: this.options.lineHeight,
            textOutline: this.options.textOutline,
            textOutlineWidth: this.options.textOutlineWidth,
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
        this.heightInLines = this._heightInLines(tempCtx, totalHeight);

        if (this.options.pointer) {
            this._calculatePointerDimensions();
            this._addPointerRoom();
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

    /**
     * How many single lines tall the label is, measured from its first line with words (a
     * blank line has no height of its own to measure).
     * @param ctx - A context to measure with.
     * @param totalHeight - The height of the text.
     * @returns The label's height in lines.
     */
    private _heightInLines(ctx: CanvasRenderingContext2D, totalHeight: number): number {
        const firstLine = this.parsedContent.find((line) => line.length > 0);
        if (firstLine === undefined) {
            return 1;
        }

        const { lineBox } = measureLine(ctx, firstLine, {
            lineHeight: DEFAULT_LINE_HEIGHT,
            textOutline: this.options.textOutline,
            textOutlineWidth: this.options.textOutlineWidth,
        });
        const oneLine = this.actualDimensions.height - totalHeight + lineBox;
        return oneLine > 0 ? this.actualDimensions.height / oneLine : 1;
    }

    /** Grow the canvas on the pointer's side by the pointer's height. */
    private _addPointerRoom(): void {
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

    private _createTexture(): void {
        const MAX_TEXTURE_SIZE = 4096;
        // A label sized for the screen draws one canvas unit per CSS pixel, so its texture needs
        // a texel per device pixel to stay sharp on a high-density screen.
        const density = this.options.sizeMode === "screen" ? Math.max(1, globalThis.devicePixelRatio || 1) : 1;

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
        this.texture.update(undefined, PREMULTIPLIED);
    }

    private _drawBackgroundWithBorders(ctx: CanvasRenderingContext2D): void {
        this._drawPanelShadow(ctx);

        const m = this.shadowMargin;
        const width = this.actualDimensions.width - m * 2;
        const height = this.actualDimensions.height - m * 2;
        const radius = this.options.cornerRadius;

        if (this.options.borders.length > 0) {
            let currentOffset = 0;

            for (let i = 0; i < this.options.borders.length; i++) {
                const border = this.options.borders[i];

                if (i > 0 && this.options.borders[i - 1].spacing > 0) {
                    currentOffset += this.options.borders[i - 1].spacing;
                }

                ctx.save();
                ctx.fillStyle = border.color ?? "rgba(255, 255, 255, 0.8)";

                const x = m + currentOffset;
                const y = m + currentOffset;
                const w = width - currentOffset * 2;
                const h = height - currentOffset * 2;
                const r = Math.max(0, radius - currentOffset);

                this._createRoundedRectPath(ctx, x, y, w, h, r);

                const innerOffset = currentOffset + border.width;
                if (i < this.options.borders.length - 1 || innerOffset < this.totalBorderWidth) {
                    let innerRadius: number;
                    if (radius > 0) {
                        const minRadius = Math.max(2, radius * 0.2);
                        innerRadius = Math.max(minRadius, radius - innerOffset);

                        if (i === this.options.borders.length - 1) {
                            const bgRadius = Math.max(minRadius, radius - this.totalBorderWidth);
                            if (innerRadius < bgRadius + 5) {
                                innerRadius = bgRadius;
                            }
                        }
                    } else {
                        innerRadius = 0;
                    }

                    this._createRoundedRectPath(
                        ctx,
                        m + innerOffset,
                        m + innerOffset,
                        width - innerOffset * 2,
                        height - innerOffset * 2,
                        innerRadius,
                    );
                }

                ctx.fill("evenodd");
                ctx.restore();

                currentOffset = innerOffset;
            }
        }

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

        if (this.options.borders.length > 0 && this.pointerInfo) {
            let currentOffset = 0;

            for (let i = 0; i < this.options.borders.length; i++) {
                const border = this.options.borders[i];

                if (i > 0 && this.options.borders[i - 1].spacing > 0) {
                    currentOffset += this.options.borders[i - 1].spacing;
                }

                ctx.save();
                ctx.fillStyle = border.color ?? "rgba(255, 255, 255, 0.8)";
                ctx.beginPath();

                const pointerArea: PointerContentArea = {
                    x: this.contentArea.x - this.totalBorderWidth + currentOffset,
                    y: this.contentArea.y - this.totalBorderWidth + currentOffset,
                    width: this.contentArea.width + (this.totalBorderWidth - currentOffset) * 2,
                    height: this.contentArea.height + (this.totalBorderWidth - currentOffset) * 2,
                };

                this.pointerRenderer.createSpeechBubblePath(ctx, pointerArea, Math.max(0, radius - currentOffset), {
                    width: this.pointerInfo.width,
                    height: this.pointerInfo.height,
                    offset: this.pointerInfo.offset,
                    direction: this.pointerInfo.direction as "top" | "bottom" | "left" | "right" | "auto",
                    curved: this.pointerInfo.curve,
                });

                const innerOffset = currentOffset + border.width;
                if (i < this.options.borders.length - 1 || innerOffset < this.totalBorderWidth) {
                    let innerRadius: number;
                    if (radius > 0) {
                        const minRadius = Math.max(2, radius * 0.2);
                        innerRadius = Math.max(minRadius, radius - innerOffset);

                        if (i === this.options.borders.length - 1) {
                            const bgRadius = Math.max(minRadius, radius - this.totalBorderWidth);
                            if (innerRadius < bgRadius + 5) {
                                innerRadius = bgRadius;
                            }
                        }
                    } else {
                        innerRadius = 0;
                    }

                    const innerX = this.contentArea.x - this.totalBorderWidth + innerOffset;
                    const innerY = this.contentArea.y - this.totalBorderWidth + innerOffset;
                    ctx.moveTo(innerX + innerRadius, innerY);

                    const innerPointerArea: PointerContentArea = {
                        x: innerX,
                        y: innerY,
                        width: this.contentArea.width + (this.totalBorderWidth - innerOffset) * 2,
                        height: this.contentArea.height + (this.totalBorderWidth - innerOffset) * 2,
                    };

                    this.pointerRenderer.createSpeechBubblePathCCW(ctx, innerPointerArea, innerRadius, {
                        width: this.pointerInfo.width,
                        height: this.pointerInfo.height,
                        offset: this.pointerInfo.offset,
                        direction: this.pointerInfo.direction as "top" | "bottom" | "left" | "right" | "auto",
                        curved: this.pointerInfo.curve,
                    });
                }

                ctx.fill("evenodd");
                ctx.restore();

                currentOffset = innerOffset;
            }
        }

        ctx.beginPath();
        if (this.pointerInfo) {
            this.pointerRenderer.createSpeechBubblePath(ctx, this.contentArea, radius, {
                width: this.pointerInfo.width,
                height: this.pointerInfo.height,
                offset: this.pointerInfo.offset,
                direction: this.pointerInfo.direction as PointerDirection,
                curved: this.pointerInfo.curve,
            });
        }

        ctx.closePath();

        this._fillBackground(ctx);

        if (this.options._progressBar) {
            this._drawProgressBar(ctx);
        }
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
        this.texture.update(undefined, PREMULTIPLIED);
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
        ctx.beginPath();
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
            // Only set emissiveColor if we're not using glow animation
            if (this.options.animation !== "glow") {
                material.emissiveColor = new Color3(1, 1, 1);
            } else {
                // Start with a neutral emissive for glow animation
                material.emissiveColor = new Color3(0.65, 0.65, 0.65);
            }

            material.backFaceCulling = false;
            material.useAlphaFromDiffuseTexture = true;
            // The texture holds premultiplied color (see PREMULTIPLIED), so it is blended as
            // COLOR = SRC + (1 - SRC_ALPHA) * DEST. ALPHA_PREMULTIPLIED would multiply by alpha a
            // second time in the shader.
            material.alphaMode = Constants.ALPHA_SRC_DSTONEMINUSSRCALPHA;
        });
    }

    /**
     * How tall one line of the label is in the scene: the style's `size`, in the units of a node's
     * size, or `fontSize / 48` when it names none.
     * @returns The height in world units.
     */
    private lineHeightInWorld(): number {
        return this.options.size ?? this.options.fontSize / 48;
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
                sideOrientation: Mesh.DOUBLESIDE,
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

        this.mesh.billboardMode = this.options.billboardMode;
        // A label sorts by depth with the nodes and edges it belongs to. A tooltip asks to be
        // drawn on top: group 1 is drawn after group 0 with the depth buffer cleared, so nothing
        // in the graph can cover what the reader pointed at.
        if (this.options.onTop === true) {
            this.mesh.renderingGroupId = ON_TOP_RENDERING_GROUP;
        }
    }

    private _attachToTarget(): void {
        const target = this.options.attachTo;
        const position = this.options.attachPosition;

        if (!this.mesh) {
            return;
        }

        let bounds: { min: Vector3; max: Vector3 };
        if (target instanceof Vector3) {
            this.dropPivot();
            bounds = { min: target.clone(), max: target.clone() };
        } else if (target && "getBoundingInfo" in target && target instanceof AbstractMesh) {
            const { boundingBox } = target.getBoundingInfo();
            bounds = { min: boundingBox.minimum, max: boundingBox.maximum };
        } else {
            this.dropPivot();
            this.mesh.position = new Vector3(this.options.position.x, this.options.position.y, this.options.position.z);
            this.placementBounds = this._pointBounds(this.mesh.position);
            return;
        }

        // Measured before a pointer is re-aimed below, as it always has been.
        const labelHeight = this.lineHeightInWorld() * this.heightInLines;
        const labelWidth = (this.actualDimensions.width / this.actualDimensions.height) * labelHeight;

        if (this.options.pointer && this.options.pointerDirection === "auto" && this.pointerInfo) {
            this.pointerInfo.direction = POINTER_AWAY_FROM[position] ?? "bottom";
            this._calculateDimensions();
            this._drawContent();
        }

        const inFront = position === "center" && !(target instanceof Vector3);
        const frontBounds = inFront ? bounds : null;
        const newPos = target instanceof Vector3 ? target.clone() : this.parentTo(target, frontBounds);
        if (inFront) {
            // In front of the node, toward the camera: see `parentTo`. The bounds move into the
            // pivot's frame, whose origin is the node's centre.
            const centre = bounds.min.add(bounds.max).scaleInPlace(0.5);
            this.placementBounds = {
                min: bounds.min.subtract(centre),
                max: bounds.max.subtract(centre),
                z: -Vector3.Distance(bounds.min, bounds.max) / 2,
            };
        } else {
            this.placementBounds = { min: bounds.min, max: bounds.max, z: newPos.z };
        }

        placeBeside(this.placementBounds, position, this.options.attachOffset, labelWidth, labelHeight, newPos);

        this.mesh.position = newPos;
        this.originalPosition ??= newPos.clone();

        if (this.animator) {
            this.animator.updateOriginalPosition(newPos);
        }
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
                return options.attachTo ? options.attachPosition : "center";
            },
            get offset() {
                return options.attachTo ? options.attachOffset : 0;
            },
        });
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
            mesh.billboardMode = this.options.billboardMode;
            return Vector3.Zero();
        }

        this.centerPivot ??= new TransformNode(`richTextPivot_${this.id}`, this.scene);
        this.centerPivot.parent = target;
        this.centerPivot.position = center.min.add(center.max).scaleInPlace(0.5);
        this.centerPivot.billboardMode = this.options.billboardMode;
        mesh.parent = this.centerPivot;
        mesh.billboardMode = Mesh.BILLBOARDMODE_NONE;
        return Vector3.Zero();
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

            // Premultiplied color fades with its alpha: the texture's level scales the color,
            // the material's alpha the coverage.
            this.material.alpha = fadeFactor;
            if (this.material.diffuseTexture) {
                this.material.diffuseTexture.level = fadeFactor;
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
        this.stopScreenFit?.();
        this.stopScreenFit = null;
        this.unmarkClose?.();

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
