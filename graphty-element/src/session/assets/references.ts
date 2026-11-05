/**
 * @file What every model check shares: the refusal a check throws, the reference allowlist, and
 * image sizes read from their headers.
 *
 * A reference inside a model (a glTF buffer or image `uri`, an OBJ `mtllib`, an MTL `map_*` file)
 * is valid only if, after percent-decoding once and normalizing the path, it is a key in the file
 * set, or a `data:` URL of an image or of plain bytes. Everything else -- `http(s):`, `//host`,
 * `blob:`, `file:`, a path that leaves the set with `..` -- is `E_MODEL_EXTERNAL_URL`
 * (design/rendering/node-models.md section 3.3).
 */

import type { CodedFact, CodedFactParam } from "../shared";

/** The longest string param taken from a file. */
export const MAX_PARAM_LENGTH = 256;

/** The largest texture side any GPU draws; a larger image is refused before it is decoded. */
export const MAX_IMAGE_SIDE = 16384;

/**
 * A string from a file, cut to 256 characters.
 * @param value - The string.
 * @returns At most 256 characters of it.
 */
export function cut(value: string): string {
    return value.length > MAX_PARAM_LENGTH ? value.slice(0, MAX_PARAM_LENGTH) : value;
}

/** Thrown by a check to reject the model with coded facts. Never leaves the assets module. */
export class Refusal extends Error {
    /** The first fact. */
    readonly fact: CodedFact;
    /** Every fact: several when a model is missing several parts. */
    readonly facts: readonly CodedFact[];
    /** The files fetched so far, for a model fetched by URL that is missing parts: the session holds them (design 12.4). */
    held?: { readonly given: Map<string, Uint8Array>; readonly main?: string };

    /**
     * A refusal carrying one coded fact, and any more found with it.
     * @param code - The `E_MODEL_*` code.
     * @param params - Its params.
     * @param more - Further facts, reported after the first.
     */
    constructor(code: string, params: Record<string, CodedFactParam>, more: readonly CodedFact[] = []) {
        super(code);
        this.fact = Object.freeze({ code, params: Object.freeze(params) });
        this.facts = Object.freeze([this.fact, ...more]);
    }
}

/**
 * Throw a refusal carrying several facts.
 * @param facts - The facts, at least one.
 */
export function refuseAll(facts: readonly CodedFact[]): never {
    const [first, ...more] = facts;
    throw new Refusal(first.code, { ...first.params }, more);
}

/**
 * Throw a refusal.
 * @param code - The `E_MODEL_*` code.
 * @param params - Its params.
 */
export function refuse(code: string, params: Record<string, CodedFactParam>): never {
    throw new Refusal(code, params);
}

/** What a reference resolved to: a file in the set, or the bytes of a `data:` URL. */
export type Resolved = {
    readonly path: string;
    readonly bytes: Uint8Array;
    /** `W_MODEL_PART_SUBSTITUTED`, when the path was found by case or base name. */
    readonly substituted?: CodedFact;
};

/** Media types a `data:` URL may carry. glTF exporters write `application/gltf-buffer` for buffers. */
const DATA_TYPES = /^(?:image\/[a-z0-9.+-]+|application\/octet-stream|application\/gltf-buffer)$/i;

/**
 * The directory part of a path, with its trailing slash.
 * @param path - A path in the set.
 * @returns "" for a file at the top.
 */
export function dirOf(path: string): string {
    return path.slice(0, path.lastIndexOf("/") + 1);
}

/**
 * Resolve "." and ".." in a slash-separated path.
 * @param path - The path.
 * @returns The normalized path, or undefined when ".." leaves the top.
 */
export function normalizePath(path: string): string | undefined {
    const out: string[] = [];
    for (const part of path.replaceAll("\\", "/").split("/")) {
        if (part === "" || part === ".") {
            continue;
        }

        if (part === "..") {
            if (out.length === 0) {
                return undefined;
            }

            out.pop();
            continue;
        }

        out.push(part);
    }

    return out.join("/");
}

/**
 * Whether a string starts like an address outside the file set.
 * @param ref - The reference.
 * @returns True for a scheme (`http:`, `blob:`), a network path or an absolute path.
 */
function looksExternal(ref: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//") || ref.startsWith("\\\\") || ref.startsWith("/");
}

/**
 * Whether a reference is a path on its author's own disk (`C:\Users\me\wood.png`,
 * `/home/me/wood.png`, `file:///C:/wood.png`), which only its base name can mean in a file set.
 * @param ref - The decoded reference.
 * @returns True for a drive path, a rooted path (not `//host`) or a `file:` URL.
 */
function isLocalAbsolute(ref: string): boolean {
    return /^[a-z]:[\\/]/i.test(ref) || /^file:/i.test(ref) || (ref.startsWith("/") && !ref.startsWith("//"));
}

/**
 * The last segment of a path, by either slash.
 * @param path - The path.
 * @returns Its base name.
 */
export function baseName(path: string): string {
    return path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
}

/** What tolerant matching found for one path. */
export type SetMatch =
    { readonly path: string; readonly substituted: boolean } | { readonly candidates: readonly string[] } | undefined;

/**
 * Order two strings by UTF-16 code units, as the default `sort` does.
 * @param a - One string.
 * @param b - The other.
 * @returns Negative, zero or positive.
 */
function byCodeUnits(a: string, b: string): number {
    return a < b ? -1 : Number(a > b);
}

/**
 * Find a path in a file set (design 12.5): as written, then in any case, then by base name in any
 * case anywhere in the set. The last two count only when exactly one file matches.
 * @param path - A normalized path.
 * @param files - The set.
 * @param baseOnly - Match by base name only (a path from the author's disk).
 * @returns The file, the candidates when several match, or undefined.
 */
export function matchInSet(path: string, files: ReadonlyMap<string, unknown>, baseOnly = false): SetMatch {
    if (!baseOnly && files.has(path)) {
        return { path, substituted: false };
    }

    const lower = path.toLowerCase();
    const steps: ((key: string) => boolean)[] = [
        (key) => key.toLowerCase() === lower,
        (key) => baseName(key).toLowerCase() === baseName(lower),
    ];
    for (const step of baseOnly ? steps.slice(1) : steps) {
        const found = [...files.keys()].filter(step);
        if (found.length === 1) {
            return { path: found[0], substituted: found[0] !== path };
        }

        if (found.length > 1) {
            found.sort(byCodeUnits);
            return { candidates: found };
        }
    }

    return undefined;
}

/**
 * Decode a `data:` URL's payload.
 * @param ref - The URL.
 * @returns The bytes, or undefined when it is malformed.
 */
function decodeDataUrl(ref: string): Uint8Array | undefined {
    const comma = ref.indexOf(",");
    if (comma < 0) {
        return undefined;
    }

    const header = ref.slice(5, comma);
    const payload = ref.slice(comma + 1);
    try {
        if (/;base64$/i.test(header)) {
            const binary = atob(payload);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.codePointAt(i) ?? 0;
            }

            return bytes;
        }

        return new TextEncoder().encode(decodeURIComponent(payload));
    } catch {
        return undefined;
    }
}

/** What a part is for a model: `geometry` (a glTF buffer), `materials` (an `.mtl`) or `texture`. */
export type PartRole = "geometry" | "materials" | "texture";

/**
 * What a part is to its model, by its name: an `.mtl` is `materials`, a picture `texture`, and
 * anything else `geometry`, which a model cannot be drawn without.
 * @param name - The part's name.
 * @returns Its role.
 */
export function roleOfName(name: string): PartRole {
    if (/\.mtl$/i.test(name)) {
        return "materials";
    }

    return /\.(?:png|jpe?g|webp|gif|bmp|tga|tiff?|ktx2?|dds|basis)$/i.test(name) ? "texture" : "geometry";
}

/** Where a reference sends a problem it does not throw: what tolerant matching substituted, and what is missing. */
export interface Findings {
    readonly warnings: CodedFact[];
    readonly missing: CodedFact[];
}

/**
 * Resolve a reference, recording a missing or ambiguous part and a substitution instead of
 * throwing.
 * @param ref - The reference as the file wrote it.
 * @param from - The path of the file that wrote it.
 * @param files - The file set.
 * @param role - What the part is for.
 * @param findings - Where problems and warnings go.
 * @returns The file, or undefined when it is missing or ambiguous.
 */
export function findReference(
    ref: string,
    from: string,
    files: ReadonlyMap<string, Uint8Array>,
    role: PartRole,
    findings: Findings,
): Resolved | undefined {
    try {
        const resolved = resolveReference(ref, from, files);
        const used = resolved.substituted;
        if (used !== undefined && !findings.warnings.some((w) => w.params.name === used.params.name)) {
            findings.warnings.push(used);
        }

        return resolved;
    } catch (error) {
        if (
            !(error instanceof Refusal) ||
            (error.fact.code !== "E_MODEL_MISSING_FILE" && error.fact.code !== "E_MODEL_PART_AMBIGUOUS")
        ) {
            throw error;
        }

        if (!findings.missing.some((m) => m.params.name === error.fact.params.name)) {
            findings.missing.push(
                error.fact.code === "E_MODEL_MISSING_FILE"
                    ? { code: error.fact.code, params: { ...error.fact.params, role, optional: role !== "geometry" } }
                    : error.fact,
            );
        }

        return undefined;
    }
}

/**
 * Check one reference against the allowlist and resolve it, tolerantly (design 12.5).
 * @param ref - The reference as the file wrote it.
 * @param from - The path of the file that wrote it.
 * @param files - The file set.
 * @returns The file or the data URL's bytes.
 * @throws Refusal `E_MODEL_EXTERNAL_URL` for anything outside the set, `E_MODEL_MISSING_FILE`
 *     for a path the set does not hold, `E_MODEL_PART_AMBIGUOUS` for one several files match.
 */
export function resolveReference(ref: string, from: string, files: ReadonlyMap<string, Uint8Array>): Resolved {
    if (/^data:/i.test(ref)) {
        const type = ref.slice(5, ref.search(/[;,]/) < 0 ? undefined : ref.search(/[;,]/));
        const bytes = DATA_TYPES.test(type) ? decodeDataUrl(ref) : undefined;
        if (bytes === undefined) {
            refuse("E_MODEL_EXTERNAL_URL", { url: cut(ref.slice(0, 64)) });
        }

        return { path: "", bytes };
    }

    let decoded: string;
    try {
        decoded = decodeURIComponent(ref);
    } catch {
        refuse("E_MODEL_EXTERNAL_URL", { url: cut(ref) });
    }

    // A path from the author's disk means only its base name; it is never requested as written.
    const local = isLocalAbsolute(decoded);
    if (!local && (looksExternal(ref) || looksExternal(decoded))) {
        refuse("E_MODEL_EXTERNAL_URL", { url: cut(ref) });
    }

    const path = local ? baseName(decoded) : normalizePath(dirOf(from) + decoded);
    if (path === undefined) {
        refuse("E_MODEL_EXTERNAL_URL", { url: cut(ref) });
    }

    const match = matchInSet(path, files, local);
    if (match === undefined) {
        refuse("E_MODEL_MISSING_FILE", { name: cut(path), referencedBy: cut(from) });
    }

    if ("candidates" in match) {
        refuse("E_MODEL_PART_AMBIGUOUS", {
            name: cut(path),
            referencedBy: cut(from),
            candidates: match.candidates.map(cut),
        });
    }

    return {
        path: match.path,
        bytes: files.get(match.path) as Uint8Array,
        ...(match.substituted
            ? {
                  substituted: {
                      code: "W_MODEL_PART_SUBSTITUTED",
                      params: { name: cut(path), used: cut(match.path), referencedBy: cut(from) },
                  },
              }
            : {}),
    };
}

/** An image's size in pixels. */
type ImageSize = { width: number; height: number };

/**
 * A JPEG's size: walk the segments to the first start-of-frame.
 * @param bytes - The image file, known to start with the JPEG marker.
 * @param view - A view of the same bytes.
 * @returns The size, or undefined when no frame header is found.
 */
function jpegSize(bytes: Uint8Array, view: DataView): ImageSize | undefined {
    let at = 2;
    while (at + 9 < bytes.length) {
        if (bytes[at] !== 0xff) {
            return undefined;
        }

        const marker = bytes[at + 1];
        const length = view.getUint16(at + 2);
        const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isFrame) {
            return { width: view.getUint16(at + 7), height: view.getUint16(at + 5) };
        }

        at += 2 + length;
    }

    return undefined;
}

/**
 * A WebP's size from its VP8, VP8L or VP8X chunk.
 * @param bytes - The image file, known to be RIFF....WEBP of at least 30 bytes.
 * @param view - A view of the same bytes.
 * @returns The size, or undefined for another chunk.
 */
function webpSize(bytes: Uint8Array, view: DataView): ImageSize | undefined {
    const chunk = String.fromCodePoint(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === "VP8 ") {
        return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }

    if (chunk === "VP8L") {
        const bits = view.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }

    if (chunk === "VP8X") {
        const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
        return { width, height };
    }

    return undefined;
}

/**
 * An image's width and height from its PNG, JPEG or WebP header, without decoding it.
 * @param bytes - The image file.
 * @returns The size, or undefined when the header is not one of those three.
 */
export function imageSize(bytes: Uint8Array): ImageSize | undefined {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // PNG: the signature, then IHDR with width and height.
    if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(12) === 0x49484452) {
        return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        return jpegSize(bytes, view);
    }

    // WebP: RIFF....WEBP, then VP8, VP8L or VP8X.
    if (bytes.length >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
        return webpSize(bytes, view);
    }

    return undefined;
}

/**
 * The decoded bytes an image will take on the GPU, refusing one that cannot be measured or is
 * larger than any GPU draws.
 * @param bytes - The image file.
 * @param name - What to call it in a refusal.
 * @returns `width x height x 4 x 4/3` (RGBA with mipmaps).
 */
export function textureBytesOf(bytes: Uint8Array, name: string): number {
    const size = imageSize(bytes);
    if (size === undefined) {
        refuse("E_MODEL_STRUCTURE", { rule: "image", name: cut(name) });
    }

    const side = Math.max(size.width, size.height);
    if (side > MAX_IMAGE_SIDE) {
        refuse("E_MODEL_TOO_LARGE", { what: "textureSize", found: side, limit: MAX_IMAGE_SIDE, name: cut(name) });
    }

    return Math.ceil((size.width * size.height * 4 * 4) / 3);
}
