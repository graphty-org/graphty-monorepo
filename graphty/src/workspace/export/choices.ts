/**
 * The Export dialog's choices and what they turn into: the presets, the options handed to
 * graphty-element's `captureScreenshot` and `exportGraph`, and the file names. Plain data, no
 * React, so the rules are tested on their own.
 */

import type { ScreenshotOptions } from "@graphty/graphty-element";

/** An image format `captureScreenshot` writes. */
export type ImageFormat = NonNullable<ScreenshotOptions["format"]>;

/** An image size: a multiple of the canvas, or the thumbnail's fixed 400 x 300. */
export type ImageSize = "1x" | "2x" | "4x" | "400x300";

/** What the image is drawn against. */
type ImageBackground = "canvas" | "transparent";

/** The Image output's choices. */
export interface ImageChoices {
    readonly format: ImageFormat;
    readonly size: ImageSize;
    readonly background: ImageBackground;
    /** "current" for the reader's camera, else a camera id from `session.catalog.cameras()`. */
    readonly view: string;
}

/** The Data output's choices. */
export interface DataChoices {
    /** A format id from `session.catalog.formats()` that can be written. */
    readonly format: string;
    /** The table a CSV file holds. */
    readonly table: "nodes" | "edges";
}

/** One image preset (tier1-design.md section T13). */
interface ImagePreset {
    readonly id: string;
    readonly label: string;
    readonly choices: Omit<ImageChoices, "view">;
    /** Supersampling, for print. */
    readonly enhance?: boolean;
    /** JPEG quality. */
    readonly quality?: number;
}

/**
 * The presets. TEMPORARY copy of graphty-element's `SCREENSHOT_PRESETS`
 * (graphty-element/src/screenshot/presets.ts): the element does not publish its presets'
 * settings, so a dialog cannot show what a preset sets without copying them. Delete this table
 * once the element lists its presets (the gap is recorded with the Export dialog package).
 */
export const IMAGE_PRESETS: readonly ImagePreset[] = [
    { id: "web-share", label: "To share -- PNG, 2x", choices: { format: "png", size: "2x", background: "canvas" } },
    {
        id: "print",
        label: "For print -- PNG, 4x, sharper",
        choices: { format: "png", size: "4x", background: "canvas" },
        enhance: true,
    },
    {
        id: "thumbnail",
        label: "Thumbnail -- JPEG, 400 x 300",
        choices: { format: "jpeg", size: "400x300", background: "canvas" },
        quality: 0.85,
    },
    {
        id: "documentation",
        label: "For documentation -- PNG, 2x, transparent",
        choices: { format: "png", size: "2x", background: "transparent" },
    },
];

/** The label of the preset list's entry after any edit. */
export const CUSTOM = "Custom";

export const DEFAULT_IMAGE: ImageChoices = { ...IMAGE_PRESETS[0].choices, view: "current" };

/**
 * The preset these choices match.
 * @param choices - the image choices.
 * @returns the preset, or undefined for Custom.
 */
export function presetOf(choices: ImageChoices): ImagePreset | undefined {
    return IMAGE_PRESETS.find(
        ({ choices: preset }) =>
            preset.format === choices.format &&
            preset.size === choices.size &&
            preset.background === choices.background,
    );
}

/**
 * Why a background cannot be used with a format, or null when it can.
 * @param format - the image format.
 * @param background - the background.
 * @returns the reason, or null.
 */
export function backgroundRefusal(format: ImageFormat, background: ImageBackground): string | null {
    return background === "transparent" && format !== "png" ? "Only PNG keeps a transparent background" : null;
}

/**
 * The options for one capture.
 * @param choices - the image choices.
 * @param destination - where the element sends the image.
 * @param downloadFilename - the file name, for a download.
 * @returns the screenshot options.
 */
export function screenshotOptions(
    choices: ImageChoices,
    destination: NonNullable<ScreenshotOptions["destination"]>,
    downloadFilename?: string,
): ScreenshotOptions {
    const preset = presetOf(choices);
    return {
        format: choices.format,
        ...(choices.size === "400x300" ? { width: 400, height: 300 } : { multiplier: Number.parseInt(choices.size) }),
        transparentBackground: choices.background === "transparent",
        ...(preset?.enhance === true ? { enhanceQuality: true } : {}),
        ...(preset?.quality === undefined ? {} : { quality: preset.quality }),
        ...(choices.view === "current" ? {} : { camera: { preset: choices.view } }),
        destination,
        ...(downloadFilename === undefined ? {} : { downloadFilename }),
    };
}

/**
 * A name as a file name part: lower case, runs of anything but letters and digits as one "-".
 * @param name - the name.
 * @returns the part; "untitled" when nothing is left.
 */
export function slug(name: string): string {
    const part = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return part === "" ? "untitled" : part;
}

/**
 * A file name, `<project>_<what>.<ext>` (tier1-design.md section T13).
 * @param project - the project's name.
 * @param what - the view or the table.
 * @param extension - the extension, without its dot.
 * @returns the file name.
 */
export function fileName(project: string, what: string, extension: string): string {
    return `${slug(project)}_${slug(what)}.${extension}`;
}

/** The note every output's footer carries. */
export const SAVED_LOCALLY = "Saved to this computer only; nothing is uploaded.";

/** The extension of each image format. */
export const IMAGE_EXTENSIONS: Readonly<Record<ImageFormat, string>> = { png: "png", jpeg: "jpg", webp: "webp" };
