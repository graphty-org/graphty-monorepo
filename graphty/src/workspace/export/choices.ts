/**
 * The Export dialog's choices and what they turn into: the options handed to graphty-element's
 * `captureScreenshot`, `captureAnimation` and `exportGraph`, and the file names. The screenshot
 * presets are the element's (`SCREENSHOT_PRESET_DESCRIPTORS`); only their names are the app's.
 * No React, so the rules are tested on their own.
 */

import type {
    AnimationOptions,
    ExportResult,
    ExportScope,
    ScreenshotErrorCode,
    ScreenshotOptions,
} from "@graphty/graphty-element";
import {
    type FormatDescriptor,
    type OptionDescriptor,
    SCREENSHOT_PRESET_DESCRIPTORS,
} from "@graphty/graphty-element/catalog";
import type { GraphtyErrorCode, ScreenshotPreset } from "@graphty/graphty-element/session";

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

/**
 * Which records a data export writes: everything, or one of the element's export scopes (a kept
 * set by id, a loaded source by key).
 */
export type DataScope = "all" | "shown" | "selection" | `set:${string}` | `source:${string}`;

/** The Data output's choices. */
export interface DataChoices {
    /** A format id from `session.catalog.formats()` that can be written. */
    readonly format: string;
    /** One of the format's `exportVariants`, by id, when it has them. */
    readonly variant?: string;
    /** The key options' values, by option name; a row reads only its own options from here. */
    readonly values: Readonly<Record<string, unknown>>;
    readonly scope: DataScope;
    /** The columns written, by name or result path; undefined writes every column not hidden. */
    readonly columns?: readonly string[];
}

/** The node table as CSV; every other row starts on its options' own defaults. */
export const DEFAULT_DATA: DataChoices = { format: "csv", variant: "csv", values: { table: "nodes" }, scope: "all" };

/**
 * The element's export scope for a scope choice.
 * @param scope - the choice.
 * @returns the scope, or undefined for the whole graph.
 */
export function exportScope(scope: DataScope): ExportScope | undefined {
    if (scope === "all") {
        return undefined;
    }
    if (scope.startsWith("source:")) {
        return { kind: "source", sources: [scope.slice(7)] };
    }
    return scope.startsWith("set:") ? { set: scope.slice(4) } : (scope as "shown" | "selection");
}

/** One row of the Data output's Format list: a format, or one of its export variants. */
interface FormatRow {
    /** `<format>` or `<format>/<variant>`. */
    readonly id: string;
    readonly format: string;
    readonly variant?: string;
    readonly plainName: string;
    readonly extensions: readonly string[];
    /** The writer options the row fixes. */
    readonly preset: Readonly<Record<string, unknown>>;
    /** The writer options that apply to the row. */
    readonly options: readonly OptionDescriptor[];
}

/**
 * Whether a format's files hold no styles at all (`styles.write` "none", as CSV's): there the
 * `styles` option writes nothing -- a CSV is the same file with it on or off -- so its row leaves
 * the option out (tier 4, R14) and the export reports the layers as not written.
 * @param format - the format.
 * @returns true when its writer keeps no styles.
 */
export function writesNoStyles(format: FormatDescriptor | undefined): boolean {
    return (format?.styles?.write ?? "none") === "none";
}

/**
 * The Format list: one row per file type the element writes -- each format's export variants
 * when it has them, else the format -- Graphty JSON first, then catalog order. A format that
 * writes no styles offers no Include styles.
 * @param formats - `session.catalog.formats()`.
 * @returns the rows.
 */
export function formatRows(formats: readonly FormatDescriptor[]): FormatRow[] {
    return formats
        .filter((format) => format.canExport)
        .sort((a, b) => Number(b.id === "graphty") - Number(a.id === "graphty"))
        .flatMap((format) => {
            const own = (options: readonly OptionDescriptor[]): readonly OptionDescriptor[] =>
                writesNoStyles(format) ? options.filter((option) => option.name !== "styles") : options;
            return format.exportVariants === undefined
                ? [
                      {
                          id: format.id,
                          format: format.id,
                          plainName: format.plainName,
                          extensions: format.extensions,
                          preset: {},
                          options: own(format.writerOptions ?? []),
                      },
                  ]
                : format.exportVariants.map((variant) => ({
                      id: `${format.id}/${variant.id}`,
                      format: format.id,
                      variant: variant.id,
                      plainName: variant.plainName,
                      extensions: variant.extensions,
                      preset: variant.preset,
                      options: own(variant.options),
                  }));
        });
}

/**
 * The options a row shows under Format: the ones the element does not mark advanced (CSV's
 * Table, Neo4j's Tables).
 * @param row - the row.
 * @returns the key options.
 */
function keyOptions(row: FormatRow): readonly OptionDescriptor[] {
    return row.options.filter((option) => option.advanced !== true && option.type === "enum");
}

/**
 * The writer options for a row: the app's own defaults, its preset, each key option's value (the
 * first choice when none is set), then every other option of the row the reader set; the rest stay
 * the element's defaults. The app's one default of its own: a partition's group is written as its
 * rank by size (`groupRanks`), the "Group 2" the legend and the summaries name it by, so an
 * exported table joins the picture. Every export also asks for the graph's styles, so every
 * format that can hold them gets them and the losses name what it cannot, and rewrites node ids a
 * format cannot hold (text ids in GML), each original kept in the file for reading it back, so
 * every graph can be saved in every format.
 * @param row - the row.
 * @param values - the choices' values.
 * @returns the options for `exportGraph` / `downloadGraph`.
 */
export function writerOptions(row: FormatRow, values: DataChoices["values"]): Record<string, unknown> {
    const set = Object.fromEntries(
        row.options
            .filter((option) => values[option.name] !== undefined)
            .map((option) => [option.name, values[option.name]]),
    );
    const chosen = Object.fromEntries(
        keyOptions(row).map((option) => [
            option.name,
            values[option.name] ?? option.default ?? option.values?.[0]?.value,
        ]),
    );
    // Only where the row declares them: the project file (Graphty JSON) takes no options at all.
    const own = Object.fromEntries(
        Object.entries(APP_DEFAULTS).filter(([name]) => row.options.some((option) => option.name === name)),
    );
    return { ...own, ...row.preset, ...set, ...chosen };
}

/** The app's own writer defaults, each sent only to a row that declares it (see writerOptions). */
const APP_DEFAULTS: Readonly<Record<string, unknown>> = { styles: true, sanitizeIds: "mangle", groupRanks: true };

/**
 * The options for one data export, for the preview and the save alike: the row's writer options
 * (see writerOptions), then the scope and the columns written. The project file (Graphty JSON) is
 * the whole project, so it takes neither.
 * @param row - the format row.
 * @param choices - the data choices.
 * @param columns - the columns to write; every one when undefined.
 * @returns the `exportGraph` / `downloadGraph` options.
 */
export function dataExportOptions(
    row: FormatRow,
    choices: DataChoices,
    columns: readonly string[] | undefined = choices.columns,
): Record<string, unknown> {
    const options = writerOptions(row, choices.values);
    const scope = exportScope(choices.scope);
    if (row.format === "graphty") {
        return options;
    }
    return {
        ...options,
        ...(scope === undefined ? {} : { scope }),
        ...(columns === undefined ? {} : { columns }),
    };
}

/** The preview stops at this many lines or this many characters, whichever comes first. */
const PREVIEW_LINES = 6;
const PREVIEW_CHARS = 4096;

/**
 * The start of an export, read from its first chunks only: never the whole file.
 * @param result - the export.
 * @returns up to PREVIEW_LINES lines and PREVIEW_CHARS characters.
 */
export async function previewOf(result: ExportResult): Promise<string> {
    const decoder = new TextDecoder();
    let text = "";
    for await (const chunk of result.bytes) {
        text += decoder.decode(chunk, { stream: true });
        if (text.length >= PREVIEW_CHARS || text.split("\n").length > PREVIEW_LINES) {
            break;
        }
    }
    return text.slice(0, PREVIEW_CHARS).split("\n").slice(0, PREVIEW_LINES).join("\n");
}

/** What went wrong, in the app's words, for the codes an export or a capture fails with. */
const FAILURE_WORDS: Partial<Readonly<Record<GraphtyErrorCode | `${ScreenshotErrorCode}`, string>>> = {
    E_OUT_OF_MEMORY: "The browser ran out of memory.",
    E_TOO_LARGE: "The graph is too large for this format.",
    E_CAP_EXCEEDED: "The graph is too large for this format.",
    E_UNKNOWN_FORMAT: "This format is not available.",
    E_UNKNOWN_OPTION: "A setting is not one this format has.",
    E_OPTION_RANGE: "A setting is out of range.",
    E_UNSUPPORTED: "This browser cannot do this.",
    E_DISPOSED: "The graph was closed.",
    E_UNKNOWN_CAMERA: "This view is not available.",
    DIMENSION_TOO_LARGE: "The image is too large for this browser.",
    RESOLUTION_TOO_HIGH: "The image is too large for this browser.",
    CANVAS_ALLOCATION_FAILED: "The browser ran out of memory for an image this size.",
    INVALID_DIMENSIONS: "The image size is not valid.",
    UNSUPPORTED_FORMAT: "This browser cannot write this image format.",
    TRANSPARENT_REQUIRES_PNG: "Only PNG keeps a transparent background.",
    SCREENSHOT_CAPTURE_FAILED: "The drawing could not be captured.",
    ENGINE_NOT_CONFIGURED: "The drawing is not ready yet.",
};

/**
 * What went wrong, worded by the error's code; a code the app has no words for shows as itself.
 * @param error - what the element threw.
 * @returns the sentence.
 */
export function failureWords(error: unknown): string {
    const code =
        typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
            ? error.code
            : undefined;
    if (code === undefined) {
        return "Something went wrong.";
    }
    const words: Readonly<Record<string, string | undefined>> = FAILURE_WORDS;
    return words[code] ?? `Something went wrong (${code}).`;
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
 * The camera a view choice asks for. "Whole graph" frames every node from the angle on screen,
 * not from the element's fixed diagonal, so the picture is the drawing the reader turned.
 * @param view - a camera id from `session.catalog.cameras()`.
 * @returns the screenshot's camera option.
 */
function cameraOf(view: string): NonNullable<ScreenshotOptions["camera"]> {
    return view === "fitToGraph" ? { preset: view, params: { keepAngle: true } } : { preset: view };
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
        // A picture shows the data, not what the reader happened to click.
        showSelection: false,
        ...(preset?.enhanceQuality === true ? { enhanceQuality: true } : {}),
        ...(preset?.quality === undefined ? {} : { quality: preset.quality }),
        ...(choices.view === "current" ? {} : { camera: cameraOf(choices.view) }),
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
