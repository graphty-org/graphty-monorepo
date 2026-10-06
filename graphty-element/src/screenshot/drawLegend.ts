import { ScreenshotError, ScreenshotErrorCode } from "./ScreenshotError.js";
import type { ScreenshotLegendSection } from "./types.js";

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
 * Draws a key onto a captured image at its top left: a light card holding each section's title,
 * its rows (color chip, label, value at the right), its ramp and its note.
 * @param blob - The captured image.
 * @param sections - The key, in the caller's words.
 * @param scale - Output pixels per canvas pixel, so the key is the size it would be on the canvas.
 * @param quality - Quality for a lossy format.
 * @returns The image with the key drawn on, in the captured image's format.
 */
export async function drawLegend(
    blob: Blob,
    sections: readonly ScreenshotLegendSection[],
    scale: number,
    quality: number,
): Promise<Blob> {
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new ScreenshotError(
            "Failed to get 2D context for the legend",
            ScreenshotErrorCode.CANVAS_ALLOCATION_FAILED,
        );
    }
    ctx.drawImage(image, 0, 0);
    image.close();
    ctx.scale(scale, scale);
    ctx.textBaseline = "middle";

    // Measure: the card is as wide as its widest line.
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

    // The card, at the canvas legend's place.
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.strokeStyle = "#d0d0d0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(PAD, PAD, inner + PAD * 2, height, 4);
    ctx.fill();
    ctx.stroke();

    const left = PAD * 2;
    const right = left + inner;
    let y = PAD * 2;
    for (const section of sections) {
        ctx.font = BOLD;
        ctx.fillStyle = "#1a1a1a";
        ctx.textAlign = "left";
        ctx.fillText(section.title, left, y + LINE / 2);
        y += LINE;
        ctx.font = FONT;
        for (const row of section.rows ?? []) {
            const mid = y + LINE / 2;
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
            y += LINE;
        }
        if (section.ramp) {
            const top = y;
            const colors = section.ramp.colors ?? [];
            if (colors.length > 0) {
                const gradient = ctx.createLinearGradient(left, 0, right, 0);
                colors.forEach((color, index) => {
                    gradient.addColorStop(colors.length === 1 ? 0 : index / (colors.length - 1), color);
                });
                ctx.fillStyle = gradient;
                ctx.fillRect(left, top, inner, RAMP_HEIGHT);
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
            y += RAMP_HEIGHT + GAP;
            const mid = y + LINE / 2;
            ctx.fillStyle = "#1a1a1a";
            ctx.textAlign = "left";
            ctx.fillText(section.ramp.min, left, mid);
            ctx.textAlign = "right";
            ctx.fillText(section.ramp.max, right, mid);
            y += LINE;
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
                    reject(
                        new ScreenshotError("Failed to draw the legend", ScreenshotErrorCode.SCREENSHOT_CAPTURE_FAILED),
                    );
                }
            },
            blob.type,
            quality,
        );
    });
}
