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

/** Thrown by a check to reject the model with one coded fact. Never leaves the assets module. */
export class Refusal extends Error {
    readonly fact: CodedFact;

    /**
     * A refusal carrying one coded fact.
     * @param code - The `E_MODEL_*` code.
     * @param params - Its params.
     */
    constructor(code: string, params: Record<string, CodedFactParam>) {
        super(code);
        this.fact = Object.freeze({ code, params: Object.freeze(params) });
    }
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
export type Resolved = { readonly path: string; readonly bytes: Uint8Array };

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
    for (const part of path.replace(/\\/g, "/").split("/")) {
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
 * @returns True for a scheme (`http:`, `blob:`, `file:`), a network path or an absolute path.
 */
function looksExternal(ref: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//") || ref.startsWith("\\\\") || ref.startsWith("/");
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
                bytes[i] = binary.charCodeAt(i);
            }

            return bytes;
        }

        return new TextEncoder().encode(decodeURIComponent(payload));
    } catch {
        return undefined;
    }
}

/**
 * Check one reference against the allowlist and resolve it.
 * @param ref - The reference as the file wrote it.
 * @param from - The path of the file that wrote it.
 * @param files - The file set.
 * @returns The file or the data URL's bytes.
 * @throws Refusal `E_MODEL_EXTERNAL_URL` for anything outside the set, `E_MODEL_MISSING_FILE`
 *     for a path the set does not hold.
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

    if (looksExternal(ref) || looksExternal(decoded)) {
        refuse("E_MODEL_EXTERNAL_URL", { url: cut(ref) });
    }

    const path = normalizePath(dirOf(from) + decoded);
    if (path === undefined) {
        refuse("E_MODEL_EXTERNAL_URL", { url: cut(ref) });
    }

    const bytes = files.get(path);
    if (bytes === undefined) {
        refuse("E_MODEL_MISSING_FILE", { name: cut(path), referencedBy: cut(from) });
    }

    return { path, bytes };
}

/**
 * An image's width and height from its PNG, JPEG or WebP header, without decoding it.
 * @param bytes - The image file.
 * @returns The size, or undefined when the header is not one of those three.
 */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | undefined {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // PNG: the signature, then IHDR with width and height.
    if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(12) === 0x49484452) {
        return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    // JPEG: walk the segments to the first start-of-frame.
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
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

    // WebP: RIFF....WEBP, then VP8, VP8L or VP8X.
    if (bytes.length >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
        const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
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
