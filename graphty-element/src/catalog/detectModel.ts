/**
 * @file Deciding whether a file is a 3D model, and which kind, from its name and first bytes.
 *
 * Published from `./catalog` beside `detectFormat`, so a drop target asks the element "is this a
 * model or graph data" instead of sniffing bytes itself. Bytes decide; the extension only breaks
 * ties and names formats whose bytes say nothing (design/rendering/node-models.md section 5).
 *
 * Babylon-free and DOM-free: it reads a `Uint8Array`.
 */

/** A loader id. The element's own are {@link BuiltInModelFormat}; extensions may add more. */
export type ModelFormat = string; // NOSONAR(S6564): published, documented name for the open union of model format ids

/** The model formats graphty-element reads itself. */
export type BuiltInModelFormat = "glb" | "gltf" | "obj" | "stl" | "ply" | "splat" | "spz" | "sog" | "babylon";

/** The built-in formats, best first: the order a main file is chosen in. */
export const BUILT_IN_MODEL_FORMATS: readonly BuiltInModelFormat[] = Object.freeze([
    "glb",
    "gltf",
    "obj",
    "stl",
    "ply",
    "babylon",
    "spz",
    "sog",
    "splat",
]);

/** What {@link detectModelFormat} is given: a file name, its first bytes, or both. */
export interface ModelDetectionInput {
    /** The file name, with its extension. */
    readonly filename?: string;
    /** The first bytes of the file; 1 KB is plenty. The whole file makes binary STL exact. */
    readonly head?: Uint8Array;
}

/** The answer of {@link detectModelFormat}. */
export interface ModelDetection {
    /**
     * The format: a {@link BuiltInModelFormat}, `"zip"` for an archive that may hold a model, or a
     * recognized format graphty-element cannot load (`"fbx"`, `"usdz"`, `"usd"`, `"dae"`, `"3mf"`,
     * `"blend"`, `"bvh"`).
     */
    readonly format: ModelFormat;
    /** Whether graphty-element can load it. */
    readonly supported: boolean;
}

/** Recognized formats graphty-element does not load, by extension. */
const UNSUPPORTED_EXTENSIONS: Readonly<Record<string, string>> = {
    fbx: "fbx",
    usdz: "usdz",
    usd: "usd",
    usda: "usd",
    usdc: "usd",
    dae: "dae",
    "3mf": "3mf",
    blend: "blend",
    bvh: "bvh",
};

const BUILT_IN_EXTENSIONS: Readonly<Record<string, BuiltInModelFormat>> = {
    glb: "glb",
    gltf: "gltf",
    obj: "obj",
    stl: "stl",
    ply: "ply",
    splat: "splat",
    spz: "spz",
    sog: "sog",
    babylon: "babylon",
};

/**
 * The lower-cased extension of a file name, without the dot.
 * @param filename - The name.
 * @returns The extension, or "" when there is none.
 */
function extensionOf(filename: string | undefined): string {
    if (filename === undefined) {
        return "";
    }

    const base = filename.slice(filename.lastIndexOf("/") + 1);
    const dot = base.lastIndexOf(".");
    return dot <= 0 ? "" : base.slice(dot + 1).toLowerCase();
}

/**
 * Whether the bytes start with the given ASCII text.
 * @param bytes - The bytes.
 * @param text - ASCII text.
 * @param offset - Where to look.
 * @returns True on a match.
 */
function startsWithAscii(bytes: Uint8Array, text: string, offset = 0): boolean {
    if (bytes.length < offset + text.length) {
        return false;
    }

    for (let i = 0; i < text.length; i++) {
        if (bytes[offset + i] !== text.codePointAt(i)) {
            return false;
        }
    }

    return true;
}

/**
 * Whether the bytes are a zip archive (a local file header first).
 * @param bytes - The bytes.
 * @returns True for `PK\x03\x04`.
 */
export function isZip(bytes: Uint8Array): boolean {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/**
 * Up to the first 4 KB as Latin-1 text, which keeps every byte one character.
 * @param bytes - The bytes.
 * @returns The text.
 */
function headText(bytes: Uint8Array): string {
    const end = Math.min(bytes.length, 4096);
    let text = "";
    for (let i = 0; i < end; i++) {
        text += String.fromCodePoint(bytes[i]);
    }

    return text;
}

/** Binary magic numbers of recognized formats graphty-element does not load. */
const UNSUPPORTED_MAGIC: readonly (readonly [string, string])[] = [
    ["Kaydara FBX Binary", "fbx"],
    ["BLENDER", "blend"],
    ["PXR-USDC", "usd"],
    ["HIERARCHY", "bvh"],
];

/**
 * The answer for a file that starts `glTF`: a GLB, supported in version 1 (`KHR_binary_glTF`,
 * upgraded on reading) and version 2.
 * @param head - The first bytes.
 * @returns The detection.
 */
function glbDetection(head: Uint8Array): ModelDetection {
    const version = head.length >= 8 ? new DataView(head.buffer, head.byteOffset, 8).getUint32(4, true) : 2;
    return { format: "glb", supported: version === 1 || version === 2 };
}

/**
 * The answer for a zip archive, by its extension.
 * @param ext - The lower-cased extension.
 * @returns The detection, or undefined for a zip that is not a model kit.
 */
function zipDetection(ext: string): ModelDetection | undefined {
    if (ext === "usdz" || ext === "3mf") {
        return { format: ext, supported: false };
    }

    // A PlayCanvas SOG bundle: a zip of meta.json and the WebP pictures it names.
    if (ext === "sog") {
        return { format: "sog", supported: true };
    }

    // A zip with another extension (a Cytoscape session, an office file) is not a model kit.
    return ext === "" || ext === "zip" ? { format: "zip", supported: true } : undefined;
}

/**
 * The binary STL length rule: 80 header bytes, a triangle count, 50 bytes per triangle. Only for a
 * file that could be STL, since a glTF .bin can have that length by chance.
 * @param head - The first bytes (or the whole file).
 * @param ext - The lower-cased extension.
 * @returns True when the length matches.
 */
function isBinaryStl(head: Uint8Array, ext: string): boolean {
    if ((ext !== "" && ext !== "stl") || head.length < 84) {
        return false;
    }

    const count = new DataView(head.buffer, head.byteOffset, 84).getUint32(80, true);
    return head.length === 84 + 50 * count;
}

/**
 * The answer for text that starts `{`: a glTF, a .babylon, an unbundled SOG's `meta.json`, or
 * nothing.
 * @param text - The head as text.
 * @param ext - The lower-cased extension.
 * @returns The detection, or undefined.
 */
function jsonDetection(text: string, ext: string): ModelDetection | undefined {
    if (/"means"\s*:/.test(text) && /"quats"\s*:/.test(text)) {
        return { format: "sog", supported: true };
    }

    if (ext === "babylon" && /"producer"\s*:|"meshes"\s*:/.test(text)) {
        return { format: "babylon", supported: true };
    }

    // A glTF 1.0 file without an `asset` names its meshes by id.
    if (/"asset"\s*:/.test(text) || (ext === "gltf" && /"meshes"\s*:/.test(text))) {
        return { format: "gltf", supported: true };
    }

    return undefined;
}

/**
 * The format the head's text says, or undefined.
 * @param head - The first bytes (or the whole file).
 * @param ext - The lower-cased extension.
 * @returns The format, or undefined when the text says nothing.
 */
function formatFromText(head: Uint8Array, ext: string): ModelDetection | undefined {
    const text = headText(head);
    const trimmed = text.replace(/^\uFEFF?\s*/, "");
    if (/^solid\b/.test(trimmed) && /\bfacet\b/.test(text)) {
        return { format: "stl", supported: true };
    }

    if (trimmed.startsWith("{")) {
        return jsonDetection(text, ext);
    }

    if (/^(?:<\?xml[^>]*>\s*)?<COLLADA\b/.test(trimmed)) {
        return { format: "dae", supported: false };
    }

    if (trimmed.startsWith("; FBX")) {
        return { format: "fbx", supported: false };
    }

    if (trimmed.startsWith("#usda")) {
        return { format: "usd", supported: false };
    }

    if (/^v\s/m.test(text) && (/^f\s/m.test(text) || ext === "obj")) {
        return { format: "obj", supported: true };
    }

    return undefined;
}

/**
 * The format the bytes alone say, or undefined.
 * @param head - The first bytes (or the whole file).
 * @param ext - The lower-cased extension, which allows the binary STL length rule.
 * @returns The format, or undefined when the bytes say nothing.
 */
function formatFromBytes(head: Uint8Array, ext: string): ModelDetection | undefined {
    if (startsWithAscii(head, "glTF")) {
        return glbDetection(head);
    }

    for (const [magic, format] of UNSUPPORTED_MAGIC) {
        if (startsWithAscii(head, magic)) {
            return { format, supported: false };
        }
    }

    if (isZip(head)) {
        return zipDetection(ext);
    }

    if (startsWithAscii(head, "ply\n") || startsWithAscii(head, "ply\r\n")) {
        return { format: "ply", supported: true };
    }

    // Niantic's SPZ is gzip; its `NGSP` magic is inside, read by the scan after inflating.
    if (ext === "spz" && head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b) {
        return { format: "spz", supported: true };
    }

    if (isBinaryStl(head, ext)) {
        return { format: "stl", supported: true };
    }

    return formatFromText(head, ext);
}

/**
 * Whether a file is a 3D model, and which kind.
 *
 * Every drop target calls this before treating a file as graph data. Bytes come first: a GLB
 * starts `glTF`, a glTF is JSON with an `asset`, a binary STL is exactly 84 + 50 bytes per
 * triangle long, an ASCII STL starts `solid` and holds a `facet`, a PLY starts `ply`, an OBJ has
 * `v` and `f` lines, a zip starts `PK` (a `.sog` is a zip too), an SPZ is gzip named `.spz`, a BVH
 * starts `HIERARCHY`. With nothing in the bytes, the extension decides: a raw `.splat` is rows of
 * 32 bytes and nothing more.
 * @param input - The file name, the first bytes, or both.
 * @returns The format and whether it loads, or undefined when it is not a model file.
 * @example
 * ```ts
 * const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
 * const model = detectModelFormat({ filename: file.name, head });
 * if (model?.supported) await graph.session.assets.add(file);
 * ```
 */
export function detectModelFormat(input: ModelDetectionInput): ModelDetection | undefined {
    const ext = extensionOf(input.filename);
    if (input.head !== undefined && input.head.length > 0) {
        const found = formatFromBytes(input.head, ext);
        if (found !== undefined) {
            return found;
        }
    }

    // Formats whose bytes are not distinctive (a raw .splat) or a head too short to tell.
    if (ext in BUILT_IN_EXTENSIONS) {
        return { format: BUILT_IN_EXTENSIONS[ext], supported: true };
    }

    if (ext in UNSUPPORTED_EXTENSIONS) {
        return { format: UNSUPPORTED_EXTENSIONS[ext], supported: false };
    }

    if (ext === "zip" && input.head === undefined) {
        return { format: "zip", supported: true };
    }

    return undefined;
}

/** The picture formats an image asset may be. */
export type ImageFormat = "png" | "jpeg" | "webp";

/**
 * The picture format of a file, from its first bytes.
 * @param bytes - The file.
 * @returns The format, or undefined for anything else.
 */
export function imageFormatOf(bytes: Uint8Array): ImageFormat | undefined {
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return "png";
    }

    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return "jpeg";
    }

    return startsWithAscii(bytes, "RIFF") && startsWithAscii(bytes, "WEBP", 8) ? "webp" : undefined;
}

/** What a file is to a style layer: a 3D model (`node.model`) or a picture (`node.texture`). */
export type AssetKind = "model" | "image";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

/**
 * Whether a file is a 3D model or a picture, so a drop target routes it without reading formats
 * itself. Bytes decide: a PNG named `car.glb` is a picture. The extension decides only when no
 * bytes are given, or for a model format whose bytes say nothing (see {@link detectModelFormat}).
 * @param input - The file name, the first bytes, or both.
 * @returns `"model"`, `"image"`, or undefined for anything else (graph data, say).
 * @example
 * ```ts
 * const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
 * if (detectAssetKind({ filename: file.name, head }) === "image") {
 *     // a picture: node.texture
 * }
 * ```
 */
export function detectAssetKind(input: ModelDetectionInput): AssetKind | undefined {
    const { head } = input;
    const hasHead = head !== undefined && head.length > 0;
    if (hasHead && imageFormatOf(head) !== undefined) {
        return "image";
    }

    if (detectModelFormat(input) !== undefined) {
        return "model";
    }

    return !hasHead && IMAGE_EXTENSIONS.has(extensionOf(input.filename)) ? "image" : undefined;
}

/** The parts a model's files may come with, beyond its pictures: glTF buffers, OBJ materials, an unbundled SOG's meta.json. */
const PART_EXTENSIONS = ["bin", "mtl", "json"];

/** Pictures a model's files may name, beyond the ones an image asset may be. */
const PART_PICTURE_EXTENSIONS = ["tga", "bmp", "gif", "dds", "ktx2", "avif"];

const ASSET_FILE_EXTENSIONS: Readonly<Record<AssetKind, readonly string[]>> = Object.freeze({
    model: Object.freeze(
        [
            ...Object.keys(BUILT_IN_EXTENSIONS),
            ...PART_EXTENSIONS,
            "zip",
            ...IMAGE_EXTENSIONS,
            ...PART_PICTURE_EXTENSIONS,
        ].map((ext) => `.${ext}`),
    ),
    image: Object.freeze([...IMAGE_EXTENSIONS].map((ext) => `.${ext}`)),
});

/**
 * The file extensions graphty-element reads for a model or a picture, with the dot, for a file
 * chooser's `accept`: a picture's formats, or a model's with the parts it may come with (glTF
 * buffers, OBJ materials, its pictures) and a .zip holding them.
 * @param kind - `"model"` or `"image"`.
 * @returns The extensions, lower case.
 * @example
 * ```ts
 * input.accept = assetFileExtensions("model").join(",");
 * ```
 */
export function assetFileExtensions(kind: AssetKind): readonly string[] {
    return ASSET_FILE_EXTENSIONS[kind];
}
