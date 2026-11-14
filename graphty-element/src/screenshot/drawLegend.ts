import { formatNumber, type LegendBlock, type LegendSwatch } from "../session/styles/legend.js";
import { captureError } from "./captureError.js";
import type { ScreenshotLegendPosition, ScreenshotLegendSection } from "./types.js";

/** Sizes in canvas (CSS) pixels; every one is multiplied by the capture's scale. */
const PAD = 8;
const LINE = 16;
const GAP = 6;
const CHIP = 10;
const RAMP_WIDTH = 120;
const RAMP_HEIGHT = 8;
const FONT = "12px system-ui, sans-serif";
const BOLD = "600 12px system-ui, sans-serif";

/**
 * Measures the card: as wide as its widest line, as tall as its lines.
 * @param ctx - A 2D context to measure text with, at canvas scale.
 * @param sections - The key.
 * @returns The width inside the card's padding and the card's height, in canvas pixels.
 */
function measure(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    sections: readonly ScreenshotLegendSection[],
): { inner: number; height: number } {
    const width = (font: string, text: string): number => {
        ctx.font = font;
        return ctx.measureText(text).width;
    };
    let inner = RAMP_WIDTH;
    let height = PAD;
    for (const section of sections) {
        inner = Math.max(inner, width(BOLD, section.title));
        height += LINE;
        for (const row of section.rows ?? []) {
            const chip = row.color === undefined ? 0 : CHIP + GAP;
            const value = row.value === undefined ? 0 : GAP * 2 + width(FONT, row.value);
            inner = Math.max(inner, chip + width(FONT, row.label) + value);
            height += LINE;
        }
        if (section.ramp) {
            inner = Math.max(inner, width(FONT, section.ramp.min) + GAP * 2 + width(FONT, section.ramp.max));
            height += RAMP_HEIGHT + GAP + LINE;
        }
        if (section.note !== undefined) {
            inner = Math.max(inner, width(FONT, section.note));
            height += LINE;
        }
        height += GAP;
    }
    height += PAD - GAP;

    return { inner, height };
}

/**
 * Where the key {@link drawLegend} draws sits, with a gap of the card's own padding around it.
 * @param sections - The key.
 * @returns The card's right and bottom edges from the image's top left, in canvas (CSS) pixels.
 */
export function legendBox(sections: readonly ScreenshotLegendSection[]): { right: number; bottom: number } {
    const ctx = new OffscreenCanvas(1, 1).getContext("2d");
    if (!ctx) {
        return { right: 0, bottom: 0 };
    }

    const { inner, height } = measure(ctx, sections);

    return { right: PAD + inner + PAD * 2 + PAD, bottom: PAD + height + PAD };
}

/**
 * The element's own legend as the sections a capture draws: one per bound channel that paints
 * something, headed by the field's name, with a row per value or a ramp between the domain's ends.
 * Every word is the data's -- values, the names readers gave them, the field's name -- and none is
 * the element's.
 * @param blocks - `session.styles.legend()`.
 * @returns The sections; none when no block binds a value.
 */
export function legendSections(blocks: readonly LegendBlock[]): ScreenshotLegendSection[] {
    const sections: ScreenshotLegendSection[] = [];
    for (const block of blocks) {
        if (block.field === undefined || block.painted === 0) {
            continue;
        }

        const heading = block.field.technicalName;
        const { domain } = block;
        const shown = block.swatches.filter((swatch) => swatch.hidden !== true);
        const continuous = block.kind === "sequential" || block.kind === "diverging";
        if (continuous && domain !== undefined && domain.min !== domain.max) {
            const colors = shown.flatMap((swatch) => (swatch.color === undefined ? [] : [swatch.color]));
            sections.push({
                title: heading,
                ramp: {
                    min: formatNumber(domain.min),
                    max: formatNumber(domain.max),
                    ...(colors.length > 0 ? { colors } : {}),
                },
            });
            continue;
        }

        const hidden = block.overflow?.hidden;
        sections.push({
            title: heading,
            rows: shown.map((swatch) => ({
                label: swatchText(swatch),
                ...(swatch.color === undefined ? {} : { color: swatch.color }),
            })),
            ...(hidden === undefined ? {} : { note: `+${String(hidden)}` }),
        });
    }

    return sections;
}

/**
 * A row's text: the name a reader gave the value, else the value (or the range a row covers).
 * @param swatch - The row.
 * @returns Its text, with no words of the element's.
 */
function swatchText(swatch: LegendSwatch): string {
    if (swatch.name !== undefined) {
        return swatch.name;
    }
    if (swatch.role === "other") {
        return "...";
    }
    if (swatch.extent !== undefined && swatch.extent.min !== swatch.extent.max) {
        return `${formatNumber(swatch.extent.min)} - ${formatNumber(swatch.extent.max)}`;
    }

    return typeof swatch.value === "number" ? formatNumber(swatch.value) : String(swatch.value);
}

/**
 * Draws a key onto a captured image in one corner: a light card holding each section's title,
 * its rows (color chip, label, value at the right), its ramp and its note.
 * @param blob - The captured image.
 * @param sections - The key.
 * @param scale - Output pixels per canvas pixel, so the key is the size it would be on the canvas.
 * @param quality - Quality for a lossy format.
 * @param position - The corner the key sits in.
 * @returns The image with the key drawn on, in the captured image's format.
 */
export async function drawLegend(
    blob: Blob,
    sections: readonly ScreenshotLegendSection[],
    scale: number,
    quality: number,
    position: ScreenshotLegendPosition = "top-left",
): Promise<Blob> {
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw captureError("E_OUT_OF_MEMORY", "Failed to get 2D context for the legend", { of: "canvas" });
    }
    ctx.drawImage(image, 0, 0);
    image.close();
    ctx.scale(scale, scale);
    ctx.textBaseline = "middle";

    const { inner, height } = measure(ctx, sections);
    const cardWidth = inner + PAD * 2;
    const cardLeft = position.endsWith("left") ? PAD : canvas.width / scale - PAD - cardWidth;
    const cardTop = position.startsWith("top") ? PAD : canvas.height / scale - PAD - height;

    // The card, in its corner.
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardLeft, cardTop, cardWidth, height, 4);
    ctx.fill();
    ctx.stroke();

    const left = cardLeft + PAD;
    const right = left + inner;
    let y = cardTop + PAD;
    for (const section of sections) {
        ctx.font = BOLD;
        ctx.fillStyle = "#1a1a1a";
        ctx.textAlign = "left";
        ctx.fillText(section.title, left, y + LINE / 2);
        y += LINE;
        ctx.font = FONT;
        for (const row of section.rows ?? []) {
            drawRow(ctx, row, left, right, y + LINE / 2);
            y += LINE;
        }
        if (section.ramp) {
            drawRamp(ctx, section.ramp, left, right, y);
            y += RAMP_HEIGHT + GAP + LINE;
        }
        if (section.note !== undefined) {
            ctx.fillStyle = "#666666";
            ctx.textAlign = "left";
            ctx.fillText(section.note, left, y + LINE / 2);
            y += LINE;
        }
        y += GAP;
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (drawn) => {
                if (drawn) {
                    resolve(drawn);
                } else {
                    reject(captureError("E_CAPTURE_FAILED", "Failed to draw the legend", { media: "image" }));
                }
            },
            blob.type,
            quality,
        );
    });
}

type LegendRow = NonNullable<ScreenshotLegendSection["rows"]>[number];
type LegendRamp = NonNullable<ScreenshotLegendSection["ramp"]>;

/**
 * Draws one row of a key: its color chip, its label, and its value at the right.
 * @param ctx - The 2D context.
 * @param row - The row.
 * @param left - The card's inner left edge.
 * @param right - The card's inner right edge.
 * @param mid - The row's vertical middle.
 */
function drawRow(ctx: CanvasRenderingContext2D, row: LegendRow, left: number, right: number, mid: number): void {
    let x = left;
    if (row.color !== undefined) {
        ctx.fillStyle = row.color;
        ctx.fillRect(x, mid - CHIP / 2, CHIP, CHIP);
        x += CHIP + GAP;
    }
    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "left";
    ctx.fillText(row.label, x, mid);
    if (row.value !== undefined) {
        ctx.fillStyle = "#666666";
        ctx.textAlign = "right";
        ctx.fillText(row.value, right, mid);
    }
}

/**
 * Draws a key's ramp, a gradient of its colors or a size wedge, with its ends' labels under it.
 * @param ctx - The 2D context.
 * @param ramp - The ramp.
 * @param left - The card's inner left edge.
 * @param right - The card's inner right edge.
 * @param top - The ramp's top.
 */
function drawRamp(ctx: CanvasRenderingContext2D, ramp: LegendRamp, left: number, right: number, top: number): void {
    const colors = ramp.colors ?? [];
    if (colors.length > 0) {
        const gradient = ctx.createLinearGradient(left, 0, right, 0);
        colors.forEach((color, index) => {
            gradient.addColorStop(colors.length === 1 ? 0 : index / (colors.length - 1), color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(left, top, right - left, RAMP_HEIGHT);
    } else {
        // A size wedge: thin at the low end, full height at the high end.
        ctx.fillStyle = "#888888";
        ctx.beginPath();
        ctx.moveTo(left, top + RAMP_HEIGHT);
        ctx.lineTo(right, top);
        ctx.lineTo(right, top + RAMP_HEIGHT);
        ctx.closePath();
        ctx.fill();
    }
    const mid = top + RAMP_HEIGHT + GAP + LINE / 2;
    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = "left";
    ctx.fillText(ramp.min, left, mid);
    ctx.textAlign = "right";
    ctx.fillText(ramp.max, right, mid);
}
