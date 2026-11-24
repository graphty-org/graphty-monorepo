/**
 * @file `session.fonts`: font files a reader uploaded, drawn by labels and saved with the project.
 *
 * The project holds each font's bytes in its `fonts` slice, keyed by family, and the style
 * document carries them (`StyleDocument.fonts`), so every save -- a project file, a style file,
 * autosave -- takes them along. Adding or removing one is an undoable step (`font.set`).
 *
 * Putting a face on the page is the slice's hook ({@link syncFontFaces}), so an undo, a redo and an
 * opened file all reach the page the same way as an add. Where the page has no `FontFace` (Node, a
 * worker) a font is recorded and saved but never drawn, with no error.
 *
 * Nothing here reaches Babylon.js or Lit; the DOM only through `globalThis.FontFace` and
 * `document.fonts`, each checked before use.
 */

import { sha256HexSync } from "@graphty/graph-io";

import type { FontFormat, StyleDocumentFont } from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import { fontAdded } from "../meshes/labelFonts";
import { toBase64 } from "./assets/projectMember";
import type { Dispatcher } from "./project/Dispatcher";
import type { CodedFact } from "./shared";
import { fontEntryBytes } from "./styles/carried";

export type { FontFormat } from "../catalog/types";

/** The largest font file `session.fonts.add` takes, in bytes: 10 MiB. */
export const FONT_BYTE_LIMIT = 10 * 1024 * 1024;

/** A font a session holds, drawn by labels and saved with the project. */
export interface FontRecord {
    /** The CSS family labels name it by (`node.labelFont`, a label look, `<font='...'>`). */
    readonly family: string;
    /** SHA-256 of the bytes, as 64 hex digits. */
    readonly sha256: string;
    /** What kind of font file it is, told from its first bytes. */
    readonly format: FontFormat;
    /** How many bytes the file is. */
    readonly byteLength: number;
}

/** What {@link FontsApi.add} takes besides the bytes. */
export interface FontAddOptions {
    /**
     * The family to hold it under. Default: a File's name without its ending, else
     * `"Font <first 8 digits of its sha256>"`.
     */
    readonly family?: string;
}

/** The bytes of a font file: raw, or a Blob or File (a File's name gives the default family). */
export type FontSource =
    Uint8Array | ArrayBuffer | { readonly name?: string; readonly size: number; arrayBuffer(): Promise<ArrayBuffer> };

/**
 * The fonts of the open project: uploaded font files labels can be drawn in.
 * @example
 * ```ts
 * const font = await graph.session.fonts.add(input.files[0]); // family "Outfit"
 * await graph.session.styles.add({ name: "Label font", target: "node", selector: { match: "everything" }, set: { "node.labelFont": font.family } });
 * ```
 */
export interface FontsApi {
    /**
     * Add a font from its bytes: TrueType, OpenType, WOFF or WOFF2. The same bytes under the same
     * family return the record already held. One undoable step.
     * @param source - The bytes, a Blob or a File.
     * @param options - The family to hold it under.
     * @returns The font.
     * @throws GraphtyError `E_FONT_TOO_LARGE` over {@link FONT_BYTE_LIMIT}; `E_FONT_PARSE` when the
     *   bytes are not a font the browser can read; `E_FONT_FAMILY_TAKEN` when another font holds
     *   the family (compared without case).
     */
    add(source: FontSource, options?: FontAddOptions): Promise<FontRecord>;
    /**
     * Every font, in the order added.
     * @returns The fonts.
     */
    list(): readonly FontRecord[];
    /**
     * Remove a font by family; labels drawn in it fall back. One undoable step; an unknown family
     * does nothing.
     * @param family - The family.
     * @returns Settles once the removal is recorded.
     */
    remove(family: string): Promise<void>;
}

/**
 * A font file's kind, from its first four bytes.
 * @param bytes - The file.
 * @returns The format, or null when the bytes are no font this reads.
 */
export function fontFormatOf(bytes: Uint8Array): FontFormat | null {
    const tag = String.fromCodePoint(...bytes.subarray(0, 4));
    switch (tag) {
        case "wOF2":
            return "woff2";
        case "wOFF":
            return "woff";
        case "OTTO":
            return "otf";
        case "\u0000\u0001\u0000\u0000":
        case "true":
            return "ttf";
        default:
            return null;
    }
}

/**
 * A refusal from `session.fonts`.
 * @param code - The code.
 * @param message - What happened.
 * @param details - Its facts.
 * @returns The error.
 */
function fontError(
    code: "E_FONT_PARSE" | "E_FONT_TOO_LARGE" | "E_FONT_FAMILY_TAKEN",
    message: string,
    details: Readonly<Record<string, unknown>>,
): GraphtyError {
    return new GraphtyError({ code, message, source: "style", details });
}

/**
 * The refusal of a file over the limit.
 * @param byteLength - Its size.
 * @returns The error.
 */
function tooLarge(byteLength: number): GraphtyError {
    return fontError("E_FONT_TOO_LARGE", "The font file is larger than the limit.", {
        byteLength,
        limit: FONT_BYTE_LIMIT,
    });
}

/** The FontFace constructor, where the page has one. */
type FontFaceConstructor = new (family: string, source: Uint8Array) => FontFace;

/** The loaded face of each family and digest, so a font is parsed once per page. */
const faces = new Map<string, Promise<FontFace | null>>();

/**
 * The face of a font, loaded: null where the page has no `FontFace`. Rejects when the browser
 * cannot read the bytes.
 * @param family - The family.
 * @param sha256 - The bytes' digest.
 * @param bytes - Gives the bytes, asked only the first time.
 * @returns The face.
 */
function faceOf(family: string, sha256: string, bytes: () => Uint8Array | null): Promise<FontFace | null> {
    const key = `${sha256}\n${family}`;
    let face = faces.get(key);
    if (face === undefined) {
        const Face = (globalThis as { FontFace?: FontFaceConstructor }).FontFace;
        const data = Face === undefined ? null : bytes();
        face =
            Face === undefined || data === null
                ? Promise.resolve(null)
                : new Face(family, data).load().then((loaded) => loaded);
        face.catch(() => undefined);
        faces.set(key, face);
    }

    return face;
}

/**
 * The face of a held font, from its entry.
 * @param font - The entry.
 * @returns The face; null where the page has none.
 */
function entryFace(font: StyleDocumentFont): Promise<FontFace | null> {
    return faceOf(font.family, font.sha256, () => fontEntryBytes(font));
}

/**
 * The page's font set, where there is one.
 * @returns The set, or undefined with no document.
 */
function pageFonts(): FontFaceSet | undefined {
    return (globalThis as { document?: { fonts?: FontFaceSet } }).document?.fonts;
}

/**
 * Bring the page's faces from one `fonts` slice to another: the slice's hook. A face added is
 * loaded and on the page before the hook settles, so labels built after it draw in it; labels
 * already drawn in a family that came or went are rebuilt (`fontAdded`).
 * @param before - The fonts the page shows.
 * @param after - The fonts the project holds now.
 * @param families - The families that may have changed.
 * @returns Settles once every added face is on the page (or failed, and labels fall back).
 */
export async function syncFontFaces(
    before: ReadonlyMap<string, StyleDocumentFont>,
    after: ReadonlyMap<string, StyleDocumentFont>,
    families: Iterable<string>,
): Promise<void> {
    const set = pageFonts();
    await Promise.all(
        [...families].map(async (family) => {
            const was = before.get(family);
            const now = after.get(family);
            if (was === now) {
                return;
            }

            // ponytail: the page's font set is shared by every session on it, so removing a family
            // one session holds removes it for another holding the same bytes; count holders if two
            // sessions on one page ever share an uploaded font.
            const old = was === undefined ? null : await entryFace(was).catch(() => null);
            if (old !== null) {
                set?.delete(old);
            }

            const face = now === undefined ? null : await entryFace(now).catch(() => null);
            if (face !== null) {
                set?.add(face);
            }

            if (old !== null || face !== null) {
                fontAdded(family);
            }
        }),
    );
}

/**
 * Load the faces of the fonts a document carries before its layers apply, so the first label built
 * in one already has it.
 * @param fonts - The document's fonts.
 * @returns A `W_FONT_NOT_LOADED` for each font the browser could not read; its labels fall back.
 */
export async function loadDocumentFonts(
    fonts: readonly StyleDocumentFont[] | undefined,
): Promise<CodedFact<"W_FONT_NOT_LOADED">[]> {
    const failed = await Promise.all(
        (fonts ?? []).map(async (font) => {
            try {
                await entryFace(font);
                return [];
            } catch {
                return [{ code: "W_FONT_NOT_LOADED" as const, params: { family: font.family } }];
            }
        }),
    );
    return failed.flat();
}

/**
 * A held font as a record: everything but its bytes.
 * @param font - The entry.
 * @returns The record.
 */
function recordOf(font: StyleDocumentFont): FontRecord {
    return Object.freeze({
        family: font.family,
        sha256: font.sha256,
        format: font.format,
        byteLength: font.byteLength,
    });
}

/**
 * The bytes of a source, and the name it came with.
 * @param source - The source.
 * @returns The bytes, and the File's name when it has one.
 */
async function bytesOf(source: FontSource): Promise<{ bytes: Uint8Array; name?: string }> {
    if (source instanceof Uint8Array) {
        return { bytes: source };
    }

    if (source instanceof ArrayBuffer) {
        return { bytes: new Uint8Array(source) };
    }

    if (source.size > FONT_BYTE_LIMIT) {
        throw tooLarge(source.size);
    }

    const bytes = new Uint8Array(await source.arrayBuffer());
    return typeof source.name === "string" ? { bytes, name: source.name } : { bytes };
}

/**
 * Build `session.fonts`.
 * @param dispatcher - The session's dispatcher: its state and the path every change takes.
 * @returns The API.
 */
export function createFontsApi(dispatcher: Dispatcher): FontsApi {
    const held = (): ReadonlyMap<string, StyleDocumentFont> => dispatcher.state.fonts;
    return {
        async add(source, options = {}) {
            // Taken now: a transaction's routing lasts only for the synchronous part of the call.
            const send = dispatcher.capturedDispatch();
            const { bytes, name } = await bytesOf(source);
            if (bytes.length > FONT_BYTE_LIMIT) {
                throw tooLarge(bytes.length);
            }

            const format = fontFormatOf(bytes);
            if (format === null) {
                throw fontError("E_FONT_PARSE", "The bytes are not a TrueType, OpenType, WOFF or WOFF2 font.", {
                    family: options.family ?? name ?? null,
                });
            }

            const sha256 = sha256HexSync(bytes);
            const stem = name?.replace(/\.[^.]*$/, "").trim();
            const family =
                options.family?.trim() || (stem === undefined || stem === "" ? `Font ${sha256.slice(0, 8)}` : stem);
            const taken = [...held().values()].find((font) => font.family.toLowerCase() === family.toLowerCase());
            if (taken !== undefined) {
                if (taken.family === family && taken.sha256 === sha256) {
                    return recordOf(taken);
                }

                throw fontError("E_FONT_FAMILY_TAKEN", `Another font holds the family ${family}.`, {
                    family: taken.family,
                });
            }

            try {
                await faceOf(family, sha256, () => bytes);
            } catch (error) {
                throw new GraphtyError({
                    code: "E_FONT_PARSE",
                    message: "The browser could not read the font.",
                    source: "style",
                    details: { family },
                    cause: error,
                });
            }

            const font: StyleDocumentFont = Object.freeze({
                family,
                sha256,
                format,
                byteLength: bytes.length,
                data: toBase64(bytes),
            });
            await send({ op: "font.set", family, font });
            return recordOf(font);
        },
        list() {
            return [...held().values()].map((font) => recordOf(font));
        },
        async remove(family) {
            const send = dispatcher.capturedDispatch();
            if (held().has(family)) {
                await send({ op: "font.set", family, font: null });
            }
        },
    };
}
