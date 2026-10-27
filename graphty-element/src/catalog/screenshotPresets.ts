/**
 * @file The screenshot presets as plain data: what each preset sets when `captureScreenshot({
 * preset })` names it. The capture code reads this table, and the catalogue publishes it
 * (`session.catalog.screenshotPresets()`, and `SCREENSHOT_PRESET_DESCRIPTORS` from the `./catalog`
 * entry), so an export dialog can show what a preset sets without copying it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/** The id of a screenshot preset, as `captureScreenshot({ preset })` takes it. */
export type ScreenshotPresetId = "print" | "web-share" | "thumbnail" | "documentation";

/** One screenshot preset: its id and the capture options it sets. Frozen. */
export interface ScreenshotPreset {
    readonly id: ScreenshotPresetId;
    /** The image format. */
    readonly format: "png" | "jpeg" | "webp";
    /** The size as a multiple of the canvas; absent when `width` and `height` fix it. */
    readonly multiplier?: number;
    /** A fixed width in pixels. */
    readonly width?: number;
    /** A fixed height in pixels. */
    readonly height?: number;
    /** The JPEG or WebP quality, 0 to 1. */
    readonly quality?: number;
    /** Supersampled for a sharper image. */
    readonly enhanceQuality?: boolean;
    /** The background left transparent. */
    readonly transparentBackground?: boolean;
    /** Where the image goes by default. */
    readonly destination?: { readonly download?: boolean; readonly clipboard?: boolean };
}

const freeze = <T extends object>(value: T): Readonly<T> => Object.freeze(value);

/** Every screenshot preset the element ships, in the order a picker lists them. */
export const SCREENSHOT_PRESET_DESCRIPTORS: readonly ScreenshotPreset[] = freeze([
    freeze({ id: "web-share", format: "png", multiplier: 2, destination: freeze({ clipboard: true }) }),
    freeze({
        id: "print",
        format: "png",
        multiplier: 4,
        enhanceQuality: true,
        destination: freeze({ download: true }),
    }),
    freeze({ id: "thumbnail", format: "jpeg", width: 400, height: 300, quality: 0.85 }),
    freeze({
        id: "documentation",
        format: "png",
        multiplier: 2,
        transparentBackground: true,
        destination: freeze({ download: true }),
    }),
] satisfies ScreenshotPreset[]);
