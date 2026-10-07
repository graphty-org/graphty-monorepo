/**
 * The Export dialog's choices and what they turn into: the presets, the options handed to
 * graphty-element's `captureScreenshot` and `exportGraph`, and the file names. Plain data, no
 * React, so the rules are tested on their own.
 */

import type { ExportResult, ScreenshotErrorCode, ScreenshotOptions } from "@graphty/graphty-element";
import type { FormatDescriptor, OptionDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphtyErrorCode } from "@graphty/graphty-element/session";

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
    /** One of the format's `exportVariants`, by id, when it has them. */
    readonly variant?: string;
    /** The key options' values, by option name; a row reads only its own options from here. */
    readonly values: Readonly<Record<string, unknown>>;
}

/** The project file, Graphty JSON; every other row starts on its options' own defaults. */
export const DEFAULT_DATA: DataChoices = { format: "graphty", values: {} };

/** One row of the Data output's Format list: a format, or one of its export variants. */
export interface FormatRow {
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
 * The Format list: one row per file type the element writes -- each format's export variants
 * when it has them, else the format -- Graphty JSON first, then catalog order.
 * @param formats - `session.catalog.formats()`.
 * @returns the rows.
 */
export function formatRows(formats: readonly FormatDescriptor[]): FormatRow[] {
    return formats
        .filter((format) => format.canExport)
        .sort((a, b) => Number(b.id === "graphty") - Number(a.id === "graphty"))
        .flatMap((format) =>
            format.exportVariants === undefined
                ? [
                      {
                          id: format.id,
                          format: format.id,
                          plainName: format.plainName,
                          extensions: format.extensions,
                          preset: {},
                          options: format.writerOptions ?? [],
                      },
                  ]
                : format.exportVariants.map((variant) => ({
                      id: `${format.id}/${variant.id}`,
                      format: format.id,
                      variant: variant.id,
                      plainName: variant.plainName,
                      extensions: variant.extensions,
                      preset: variant.preset,
                      options: variant.options,
                  })),
        );
}

/**
 * The options a row shows under Format: the ones the element does not mark advanced (CSV's
 * Table, Neo4j's Tables).
 * @param row - the row.
 * @returns the key options.
 */
export function keyOptions(row: FormatRow): readonly OptionDescriptor[] {
    return row.options.filter((option) => option.advanced !== true && option.type === "enum");
}

/**
 * The writer options for a row: its preset, each key option's value (the first choice when none
 * is set), then every other option of the row the reader set; the rest stay the element's
 * defaults.
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
    return { ...row.preset, ...set, ...chosen };
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
        // A picture shows the data, not what the reader happened to click.
        showSelection: false,
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

/** The note every output's footer carries. */
export const SAVED_LOCALLY = "Saved to this computer only; nothing is uploaded.";

/** The extension of each image format. */
export const IMAGE_EXTENSIONS: Readonly<Record<ImageFormat, string>> = { png: "png", jpeg: "jpg", webp: "webp" };
