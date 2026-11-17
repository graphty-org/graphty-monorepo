/**
 * @file The shapes babylonjs-models reads, checks and reports: what a model source can be, what a
 * check found in it, and the limits that keep a page responsive. Babylon-free and DOM-free.
 */

import type { ModelFormat } from "./detect.js";

/** One parameter of a {@link ModelFact}: a plain value, or a list of them. */
export type ModelFactParam = string | number | boolean | null | readonly (string | number | boolean | null)[];

/**
 * Something a check or a load has to say, as a code and the values it is about -- never as words.
 *
 * `E_MODEL_*` codes say why a model was refused or could not be loaded; `W_MODEL_*` codes say what
 * is worth knowing about one that was accepted. Switch on `code`; treat an unknown code as
 * something to leave out, because new codes may be added in a minor release. Every parameter is a
 * plain value, so a fact survives `structuredClone` and `JSON.stringify`. A parameter taken from a
 * file (a file name, a material name) is the file's own text, cut to 256 characters: escape it
 * before putting it into HTML.
 */
export interface ModelFact {
    /** What kind of fact this is, such as `"E_MODEL_MISSING_FILE"`. */
    readonly code: string;
    /** The values the fact is about, by name. */
    readonly params: Readonly<Record<string, ModelFactParam>>;
}

/** A File, or anything shaped like one: a name and its bytes. No DOM type is named. */
export interface NamedBlob {
    readonly name: string;
    /** A file from a folder pick or drop carries its path inside the folder here. */
    readonly webkitRelativePath?: string;
    readonly size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
}

/** Where a model's files come from. */
export type ModelSource =
    /** A URL, fetched with no credentials. */
    | string
    /** A File. */
    | NamedBlob
    /** Several files: an array of Files, or a FileList (structurally). */
    | Iterable<NamedBlob>
    | ArrayLike<NamedBlob>
    /** The bytes of one file. */
    | ArrayBuffer
    | Uint8Array
    /** Files by path, and optionally which one is the model. */
    | {
          readonly files: ReadonlyMap<
              string,
              NamedBlob | { readonly size: number; arrayBuffer(): Promise<ArrayBuffer> } | Uint8Array
          >;
          readonly main?: string;
      };

/** What a caller may say about a file set when it is checked. */
export interface ModelFileOptions {
    /** The main file of a set, when it cannot be told (`E_MODEL_AMBIGUOUS`). */
    readonly main?: string;
    /** Force a format when the bytes are ambiguous. Default: detected. */
    readonly format?: ModelFormat;
    /**
     * Parts to load without: pictures and `.mtl` files the model names, by their path in the set.
     * A picture is loaded as plain white, so the material's own color still applies; an OBJ
     * without its `.mtl` loads with the default material. Default: none.
     */
    readonly skipped?: readonly string[];
}

/** What a part is to its model: the main file, a buffer, an `.mtl`, a picture, or a file nothing names. */
export type ModelPartRole = "model" | "geometry" | "materials" | "texture" | "other";

/**
 * Where a part stands: in the set as named, found by case or base name, missing, matched by more
 * than one file, loaded without, or a file of the set the model never names.
 */
export type ModelPartState = "found" | "substituted" | "missing" | "ambiguous" | "skipped" | "unused";

/** One file of a model, or one file it names. */
export interface ModelPart {
    /** The path as the model names it; for an `"unused"` file, its path in the set. */
    readonly name: string;
    readonly role: ModelPartRole;
    readonly state: ModelPartState;
    /** The set's file used for it, when found or substituted. */
    readonly file?: string;
}

/** What a model file draws: see {@link ModelSummary.geometry}. */
export type ModelGeometry = "mesh" | "points" | "splats";

/** How an STL or PLY file is stored: see {@link ModelSummary.encoding}. */
export type ModelEncoding = "ascii" | "binary" | "binaryBigEndian";

/**
 * A compression a glTF's data uses: Draco or meshopt geometry, KTX2 / Basis Universal, WebP or
 * AVIF pictures. See {@link ModelSummary.compression}.
 */
export type ModelCompression = "draco" | "meshopt" | "ktx2" | "webp" | "avif";

/** One picture a model's materials draw: see {@link ModelSummary.pictures}. */
export interface ModelPicture {
    readonly name: string;
    readonly materials: readonly string[];
}

/** What a model holds, read from its files without drawing it. */
export interface ModelSummary {
    readonly format: ModelFormat;
    /** Counted per use: a mesh used by three scene nodes counts three times. */
    readonly triangles: number;
    readonly meshes: number;
    /** Material names, each cut to 256 characters ("" for an unnamed one). */
    readonly materials: readonly string[];
    readonly textures: number;
    /** Decoded, as width x height x 4 x 4/3 (RGBA with mipmaps). */
    readonly textureBytes: number;
    /** As authored, from the vertex positions, before any node transform. */
    readonly bounds?: {
        readonly min: readonly [number, number, number];
        readonly max: readonly [number, number, number];
    };
    /**
     * The axis that points up in the file: fixed for glTF, assumed for the others (`"-y"` for
     * Gaussian splats, which store Y pointing down).
     */
    readonly upAxis: "y" | "z" | "-y" | "unknown";
    /** Each clip; an unnamed glTF clip is `animation<index>`, as Babylon's glTF loader names it. */
    readonly animations: readonly { readonly name: string; readonly seconds: number }[];
    /**
     * glTF, OBJ, `.babylon` and PLY: every picture the materials draw, and the materials that draw
     * it ("" for an unnamed one). A glTF picture, embedded or external, is named by its image's
     * name, else its `uri`, else `image<index>` (as Babylon's glTF loader names it); an OBJ's
     * `map_Kd`, a `.babylon` material's diffuse texture and a PLY's `TextureFile` by its path in
     * the set. Load with `withoutPictures` naming some to draw those parts without them. Empty for
     * the others, which draw no pictures.
     */
    readonly pictures: readonly ModelPicture[];
    readonly skinned: boolean;
    readonly morphTargets: number;
    readonly transparent: boolean;
    /** glTF only. */
    readonly extensionsRequired: readonly string[];
    /**
     * What the file draws: triangles (`mesh`), a point cloud (`points`) or Gaussian splats
     * (`splats`). Points and splats are drawn as small solids, one per point, and earn
     * `W_MODEL_POINTS_APPROXIMATED`. Absent for a picture.
     */
    readonly geometry?: ModelGeometry;
    /** Points or splats in the file, before thinning. Points and splats only. */
    readonly points?: number;
    /** STL and PLY: how the file is stored. */
    readonly encoding?: ModelEncoding;
    /** The file carries per-vertex or per-face colors, and they are drawn. */
    readonly vertexColors?: boolean;
    /** glTF only: the compression its data uses, from `extensionsUsed`. */
    readonly compression?: readonly ModelCompression[];
    /** glTF only: `"1.0"` for a glTF 1.0 file, upgraded to 2.0 on reading. */
    readonly gltfVersion?: "1.0" | "2.0";
    /** glTF only: every extension the file uses, beside `extensionsRequired`. */
    readonly extensionsUsed?: readonly string[];
}

/** The limits that keep a page responsive while it reads a model it did not make. */
export interface ModelLimits {
    /** Per model file or unzipped set. Default 32 MB. */
    readonly maxBytes: number;
    /** Per OBJ, ASCII STL or ASCII PLY file, which parse on the main thread. Default 8 MB. */
    readonly maxTextBytes: number;
    /** Per model, counted per use. Default 1,000,000. */
    readonly maxTriangles: number;
    /** Decoded texture bytes per model (a KTX2 picture counts 1 byte a pixel, others 4). Default 128 MB. */
    readonly maxTextureBytes: number;
    /** What every glTF accessor decodes to, together. Default 256 MB. */
    readonly maxDecodedBytes: number;
    /** Pixels per texture side; larger textures earn `W_MODEL_TEXTURES_REDUCED`. Default 2048. */
    readonly maxTextureSize: number;
    /**
     * A fetch that receives nothing for this many milliseconds is stopped; every chunk that arrives
     * starts the wait again, so a large file on a slow but steady connection still loads.
     * Default 30,000.
     */
    readonly fetchTimeoutMs: number;
}

/** How far a model's files have been read, as `onProgress` reports it. */
export interface ModelProgress {
    /** `"downloading"` a URL, `"reading"` files, `"unpacking"` a zip. */
    readonly stage: "downloading" | "reading" | "unpacking";
    /** Bytes read so far in this stage, across every file of the set. */
    readonly loaded: number;
    /**
     * Bytes there are in all, or null when not known in advance: a URL whose answer is compressed
     * on the way, or a model's parts, which are found only once the main file is read.
     */
    readonly total: number | null;
    /** The file being read, by its name in the set. */
    readonly part?: string;
}

/** Hears how far a model's files have been read. Called often: keep it cheap. */
export type ModelProgressListener = (progress: ModelProgress) => void;
