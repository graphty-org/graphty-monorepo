/**
 * @file Turn a picture the reader chose (a camera-roll photo, a file from disk) into a background
 * image the graph can draw: decoded by the browser, turned upright, scaled to fit a texture and
 * written as a `data:` address for `{ backgroundType: "skybox", data }`.
 *
 * A photo straight from a phone or tablet is often one the renderer cannot draw as it is: HEIC,
 * which only some browsers decode; a JPEG whose EXIF tag says it is turned on its side; or one
 * wider than the largest texture the device's GPU accepts. Handing the address over unchanged
 * drew nothing and said nothing (issue #6818).
 */

import type { CodedFact } from "./shared";

/** The default {@link PrepareBackgroundImageOptions.maxSize}. */
export const DEFAULT_BACKGROUND_IMAGE_SIZE = 4096;

/** How {@link prepareBackgroundImage} prepares a picture. */
export interface PrepareBackgroundImageOptions {
    /**
     * The longest side the picture is kept at, in pixels; a larger one is scaled down to it.
     * Default 4096: sharp across a full screen, and small enough that a tablet's GPU draws it. A
     * larger value keeps more detail and makes the project larger.
     */
    readonly maxSize?: number;
}

/** A picture {@link prepareBackgroundImage} could not use: `E_IMAGE_DECODE`. */
export type BackgroundImageProblem = CodedFact<"E_IMAGE_DECODE">;

/** What {@link prepareBackgroundImage} made of a picture. */
export type PreparedBackgroundImage =
    | {
          readonly ok: true;
          /** The picture as a `data:` address, for the `data` of a skybox background. */
          readonly data: string;
          /** Its size as kept, in pixels. */
          readonly width: number;
          readonly height: number;
          /** Whether it was scaled down to `maxSize`. */
          readonly scaled: boolean;
      }
    | { readonly ok: false; readonly problem: BackgroundImageProblem };

/**
 * Load a picture as the browser decodes it, through an `<img>`, so a format the browser can show
 * (HEIC in Safari, SVG) is read and EXIF orientation is applied.
 * @param file - The picture.
 * @returns The decoded image, or null when the browser cannot decode it.
 */
async function decoded(file: Blob): Promise<HTMLImageElement | null> {
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null;
    } catch {
        return null;
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Read a blob as a `data:` address.
 * @param blob - The bytes.
 * @returns The address.
 */
function dataUrlOf(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(typeof reader.result === "string" ? reader.result : "");
        });
        reader.addEventListener("error", () => {
            reject(reader.error ?? new Error("the picture could not be read"));
        });
        reader.readAsDataURL(blob);
    });
}

/**
 * Prepare a picture as the graph's background image. The browser decodes it, it is turned
 * upright by its EXIF orientation, scaled down so its longer side is at most `maxSize`, and
 * written again: as JPEG when it was a JPEG or a HEIC/HEIF photo, else as PNG, which keeps
 * transparency. A picture the browser cannot decode (HEIC in a browser without HEIC support, a
 * damaged file, a file that is not a picture) is not thrown: it comes back as `E_IMAGE_DECODE`,
 * with `params.format` (the file's media type, or "" when it has none) and `params.fileName`
 * (when the blob is a `File`).
 *
 * ```ts
 * const prepared = await prepareBackgroundImage(input.files[0]);
 * if (prepared.ok) {
 *     element.background = { backgroundType: "skybox", data: prepared.data };
 * } else {
 *     showProblem(prepared.problem); // { code: "E_IMAGE_DECODE", params: { format, fileName } }
 * }
 * ```
 * @param file - The picture, as a `File` or a `Blob`.
 * @param options - How large it may be kept.
 * @returns The prepared picture, or why it could not be used.
 * @since 3.39.0
 */
export async function prepareBackgroundImage(
    file: Blob,
    options: PrepareBackgroundImageOptions = {},
): Promise<PreparedBackgroundImage> {
    const maxSize = Math.max(1, Math.floor(options.maxSize ?? DEFAULT_BACKGROUND_IMAGE_SIZE));
    const failed = (): PreparedBackgroundImage => ({
        ok: false,
        problem: {
            code: "E_IMAGE_DECODE",
            params: { format: file.type, ...(file instanceof File ? { fileName: file.name } : {}) },
        },
    });
    const image = await decoded(file);
    if (image === null) {
        return failed();
    }

    const { naturalWidth, naturalHeight } = image;
    const scale = Math.min(1, maxSize / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context === null) {
        return failed();
    }

    context.drawImage(image, 0, 0, width, height);
    const photo = /^image\/(jpeg|heic|heif)$/i.test(file.type);
    const blob = await canvas.convertToBlob(photo ? { type: "image/jpeg", quality: 0.92 } : { type: "image/png" });
    return { ok: true, data: await dataUrlOf(blob), width, height, scaled: scale < 1 };
}
