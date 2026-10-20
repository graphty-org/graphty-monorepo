/**
 * The Export dialog's choices and what they turn into: the options handed to graphty-element's
 * `captureScreenshot`, `captureAnimation` and `exportGraph`, and the file names. The screenshot
 * presets are the element's (`SCREENSHOT_PRESET_DESCRIPTORS`); only their names are the app's.
 * No React, so the rules are tested on their own.
 */

import type { AnimationOptions, ExportScope, ScreenshotOptions } from "@graphty/graphty-element";
import { SCREENSHOT_PRESET_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import type { ScreenshotPreset } from "@graphty/graphty-element/session";

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

/** Which records a data export writes: everything, or one of the element's export scopes. */
export type DataScope = "all" | "shown" | "selection" | `set:${string}`;

/** The Data output's choices. */
export interface DataChoices {
    /** A format id from `session.catalog.formats()` that can be written. */
    readonly format: string;
    /** The table a CSV file holds. */
    readonly table: "nodes" | "edges";
    readonly scope: DataScope;
    /** The columns written, by name or result path; undefined writes every column not hidden. */
    readonly columns?: readonly string[];
}

export const DEFAULT_DATA: DataChoices = { format: "csv", table: "nodes", scope: "all" };

/**
 * The element's export scope for a scope choice.
 * @param scope - the choice.
 * @returns the scope, or undefined for the whole graph.
 */
export function exportScope(scope: DataScope): ExportScope | undefined {
    if (scope === "all") {
        return undefined;
    }
    return scope.startsWith("set:") ? { set: scope.slice(4) } : (scope as "shown" | "selection");
}

/**
 * The options for one data export, for the preview and the save alike: always with the graph's
 * styles, so every format that can hold them gets them and the losses name what it cannot, and
 * with node ids a format cannot hold (text ids in GML) rewritten, each original kept in the file
 * for reading it back, so every graph can be saved in every format.
 * @param choices - the data choices.
 * @param columns - the columns to write; every one when undefined.
 * @returns the `exportGraph` options.
 */
export function dataExportOptions(
    choices: DataChoices,
    columns: readonly string[] | undefined = choices.columns,
): Readonly<Record<string, unknown>> {
    const scope = exportScope(choices.scope);
    return {
        styles: true,
        sanitizeIds: "mangle",
        ...(choices.format === "csv" ? { table: choices.table } : {}),
        ...(scope === undefined ? {} : { scope }),
        ...(columns === undefined ? {} : { columns }),
    };
}

/** The id of one of graphty-element's screenshot presets. */
type PresetId = ScreenshotPreset["id"];

/** The app's words for the element's screenshot presets; the settings are the element's. */
export const PRESET_LABELS: Readonly<Record<PresetId, string>> = {
    "web-share": "To share",
    print: "For print",
    thumbnail: "Thumbnail",
    documentation: "For documentation",
};

/**
 * The image choices a screenshot preset sets.
 * @param preset - one of `SCREENSHOT_PRESET_DESCRIPTORS`.
 * @returns its format, size and background.
 */
export function presetChoices(preset: ScreenshotPreset): Omit<ImageChoices, "view"> {
    return {
        format: preset.format,
        size: (preset.multiplier === undefined
            ? `${String(preset.width)}x${String(preset.height)}`
            : `${String(preset.multiplier)}x`) as ImageSize,
        background: preset.transparentBackground === true ? "transparent" : "canvas",
    };
}

/** The label of the preset list's entry after any edit. */
export const CUSTOM = "Custom";

export const DEFAULT_IMAGE: ImageChoices = {
    ...presetChoices(SCREENSHOT_PRESET_DESCRIPTORS[0]),
    view: "current",
};

/**
 * The element's preset these choices match.
 * @param choices - the image choices.
 * @returns the preset, or undefined for Custom.
 */
export function presetOf(choices: ImageChoices): ScreenshotPreset | undefined {
    return SCREENSHOT_PRESET_DESCRIPTORS.find((entry) => {
        const preset = presetChoices(entry);
        return (
            preset.format === choices.format && preset.size === choices.size && preset.background === choices.background
        );
    });
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
        ...(preset?.enhanceQuality === true ? { enhanceQuality: true } : {}),
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
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/(?:^-)|(?:-$)/g, "");
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

/** The extension of each image format. */
export const IMAGE_EXTENSIONS: Readonly<Record<ImageFormat, string>> = { png: "png", jpeg: "jpg", webp: "webp" };

/** The Video output's choices. */
export interface VideoChoices {
    /** Still: the reader's camera; tour: the camera flies through `stops`. */
    readonly camera: "still" | "tour";
    /** The views a tour visits, in order: camera view ids or saved view names. */
    readonly stops: readonly string[];
    /** Length in seconds. */
    readonly seconds: number;
    readonly fps: 30 | 60;
}

export const DEFAULT_VIDEO: VideoChoices = { camera: "tour", stops: [], seconds: 5, fps: 30 };

/**
 * The options for one recording.
 * @param choices - the video choices.
 * @param downloadFilename - the file name, for a download; none keeps the video as a blob.
 * @returns the `captureAnimation` options.
 */
export function animationOptions(choices: VideoChoices, downloadFilename?: string): AnimationOptions {
    return {
        duration: choices.seconds * 1000,
        fps: choices.fps,
        format: "auto",
        ...(choices.camera === "tour" ? { cameraMode: "animated", tour: choices.stops } : { cameraMode: "stationary" }),
        ...(downloadFilename === undefined ? {} : { download: true, downloadFilename }),
    };
}

/**
 * Hands the reader a file the page made (a data table, a style file, a recipe).
 * @param blob - the file's contents.
 * @param name - its name.
 */
export function saveBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

/** The outputs, in the dialog's list order. */
export type OutputId = "image" | "video" | "data" | "styles" | "recipe" | "project";

/** One file exported in this visit, which Recent lists and opens again with its choices. */
export interface RecentExport {
    readonly output: OutputId;
    readonly name: string;
    readonly choices?: ImageChoices | VideoChoices | DataChoices;
}
