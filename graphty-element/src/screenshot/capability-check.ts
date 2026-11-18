import { GraphtyError, type GraphtyErrorCode } from "../errors";
import type { CodedFact } from "../session/shared.js";
import { BROWSER_LIMITS, calculateDimensions } from "./dimensions.js";
import { resolvePreset } from "./presets.js";
import type { ScreenshotOptions } from "./types.js";

/**
 * Something a capture can make but might struggle with. Each code carries these `params`:
 *
 * - `W_LARGE_CAPTURE` -- the image is past 4K and may fail on devices with little memory:
 *   `{ width, height, megapixels }`.
 * - `W_HIGH_MEMORY` -- the capture needs over 100 MB of canvas memory: `{ memoryMB }`, rounded up.
 * @since 3.40.0
 */
export type ScreenshotWarningCode = "W_LARGE_CAPTURE" | "W_HIGH_MEMORY";

/**
 * Whether a capture with some options can be made, and what may go wrong with it. Every remark is
 * a code with its values, never a sentence: the application words it.
 */
export interface CapabilityCheck {
    supported: boolean;
    /**
     * Why the capture cannot be made, when it cannot: the `GraphtyError` code `captureScreenshot`
     * would throw with the same options, and that error's details as `params` (for example
     * `E_TOO_LARGE` with `{ of: "pixels", width, height, count, limit }`, `E_UNSUPPORTED` with
     * `{ reason: "format", format }`, or `E_BAD_COMMAND` with
     * `{ fields: ["transparentBackground", "format"], format }` for a transparent background in a
     * format other than PNG and WebP).
     */
    reason?: CodedFact<GraphtyErrorCode>;
    /** What may go wrong with a capture that can be made; absent when nothing may. */
    warnings?: CodedFact<ScreenshotWarningCode>[];
    estimatedMemoryMB: number;
    /**
     * The width of the image the capture would produce, in pixels: the canvas's device pixels
     * after `multiplier`, `width`, `height` and `preset`. Absent when the size itself is not
     * possible (`reason` says why).
     */
    width?: number;
    /** The height of the image the capture would produce, in pixels; absent with `width`. */
    height?: number;
}

/**
 * The refusal a dimension error stands for.
 * @param error - What `calculateDimensions` threw.
 * @returns The coded reason.
 */
function refusalOf(error: unknown): CodedFact<GraphtyErrorCode> {
    if (!(error instanceof GraphtyError)) {
        return { code: "E_OPTION_RANGE", params: { option: "size" } };
    }

    const params = Object.fromEntries(
        Object.entries(error.details).filter(([, value]) => typeof value === "number" || typeof value === "string"),
    ) as Record<string, number | string>;
    return { code: error.code, params };
}

/**
 * Checks if a screenshot can be captured with the given options.
 * Validates dimensions, format support, and provides warnings for large screenshots.
 * @param canvas - The HTML canvas element to capture
 * @param options - Screenshot configuration options
 * @returns Capability check result with support status, warnings, and memory estimate
 */
export async function canCaptureScreenshot(
    canvas: HTMLCanvasElement,
    options: ScreenshotOptions,
): Promise<CapabilityCheck> {
    let dims;
    let finalOptions = options;

    try {
        // A preset sets the size and format the capture uses, so the check reads them the same way.
        finalOptions = options.preset ? resolvePreset(options.preset, options) : options;
        dims = calculateDimensions(canvas, finalOptions);
    } catch (error) {
        return { supported: false, reason: refusalOf(error), estimatedMemoryMB: 0 };
    }

    const pixels = dims.width * dims.height;
    const memoryMB = (pixels * 4) / (1024 * 1024);

    // The same rule captureScreenshot applies: only PNG and WebP keep a transparent background.
    const format = finalOptions.format ?? "png";
    if (
        finalOptions.transparentBackground === true &&
        finalOptions.backgroundColor === undefined &&
        format !== "png" &&
        format !== "webp"
    ) {
        return {
            supported: false,
            reason: { code: "E_BAD_COMMAND", params: { fields: ["transparentBackground", "format"], format } },
            estimatedMemoryMB: memoryMB,
            width: dims.width,
            height: dims.height,
        };
    }

    if (finalOptions.format === "webp" && !(await supportsWebP())) {
        return {
            supported: false,
            reason: { code: "E_UNSUPPORTED", params: { reason: "format", format: "webp" } },
            estimatedMemoryMB: memoryMB,
            width: dims.width,
            height: dims.height,
        };
    }

    const warnings: CodedFact<ScreenshotWarningCode>[] = [];
    if (pixels >= BROWSER_LIMITS.WARN_PIXELS) {
        warnings.push({
            code: "W_LARGE_CAPTURE",
            params: { width: dims.width, height: dims.height, megapixels: Math.round(pixels / 1e5) / 10 },
        });
    }

    if (memoryMB > 100) {
        warnings.push({ code: "W_HIGH_MEMORY", params: { memoryMB: Math.ceil(memoryMB) } });
    }

    return {
        supported: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        estimatedMemoryMB: memoryMB,
        width: dims.width,
        height: dims.height,
    };
}

async function supportsWebP(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;

        canvas.toBlob((blob) => {
            resolve(blob !== null && blob.type === "image/webp");
        }, "image/webp");
    });
}
