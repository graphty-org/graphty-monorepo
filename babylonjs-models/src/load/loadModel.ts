/**
 * @file Load a model's files into a Babylon.js asset container, under the request guard: the
 * simple path ({@link loadModel}: a URL, files or bytes in, a container out) and the step it ends
 * with ({@link loadModelFiles}: a checked file set in).
 *
 * Every file of the set becomes a `blob:` URL for the length of the load and is revoked after it.
 * The main file is named under a root of the load's own (./requestGuard.ts), so its references
 * resolve to names the guard maps to those `blob:` URLs, and anything else Babylon asks for
 * throws. A decoder (Draco, meshopt, KTX2) is imported only for a glTF that uses it.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { allowed } from "../decoders/config.js";
import type { BuiltInModelFormat, ModelFormat } from "../files/detect.js";
import { asciiFbxPictures } from "../files/fbxChecks.js";
import { IGNORED_EXTENSIONS, readGlb, withoutGltfPictures } from "../files/gltfChecks.js";
import { checkModelFiles, fetchModelSet, readModelFiles } from "../files/intake.js";
import { DEFAULT_MODEL_LIMITS } from "../files/limits.js";
import { isBinaryFbx } from "../files/readers/fbx.js";
import { ModelReadError } from "../files/readers/geometry.js";
import { isGltf1, readGlb1, upgradeGltf1 } from "../files/readers/gltf1.js";
import { ModelError } from "../files/references.js";
import { mtlMaterialsWithout, WHITE_PNG, withSkips } from "../files/textFormats.js";
import type {
    ModelFact,
    ModelFileOptions,
    ModelLimits,
    ModelProgressListener,
    ModelSource,
    ModelSummary,
} from "../files/types.js";
import { readUsdz } from "../files/usdChecks.js";
import { bvhFigure } from "./bvhFigure.js";
import { loadBabylonModel, type LoaderOptions, loadOwnModel, type ModelExtension, type OwnFormat } from "./loaders.js";
import { guardRequests, REFUSED } from "./requestGuard.js";
import { markWithoutPictures, takeOffByName, takeOffUsdPictures } from "./withoutPicture.js";

/** Which reader draws each built-in format: one of Babylon's loaders, or the element's own. */
const READERS: Readonly<Record<BuiltInModelFormat, ModelExtension | OwnFormat>> = {
    glb: ".glb",
    gltf: ".gltf",
    obj: ".obj",
    stl: "stl",
    ply: "ply",
    babylon: "babylon",
    fbx: ".fbx",
    usd: ".usd",
    usdz: ".usdz",
    bvh: ".bvh",
};

/**
 * Whether a format has a reader here.
 * @param format - A format.
 * @returns True when it has one.
 */
export function hasReader(format: string): format is BuiltInModelFormat {
    return Object.hasOwn(READERS, format);
}

/** A glTF's decoder extensions, and the module that registers each. */
const DECODER_EXTENSIONS: readonly (readonly [string, "draco" | "meshopt" | "ktx2"])[] = [
    ["KHR_draco_mesh_compression", "draco"],
    ["EXT_meshopt_compression", "meshopt"],
    ["KHR_meshopt_compression", "meshopt"],
    ["KHR_texture_basisu", "ktx2"],
];

/**
 * A URL as a problem may show it: without its query or fragment, at most 256 characters.
 * @param url - The URL.
 * @returns What to show.
 */
function shown(url: string): string {
    // An index search, not a `[?#].*$` regex: that one backtracks polynomially on many `?`s.
    const cut = url.search(/[?#]/);
    return (cut === -1 ? url : url.slice(0, cut)).slice(0, 256);
}

/** A glTF ready for Babylon's glTF 2.0 loader. */
interface GltfPrepared {
    readonly files: ReadonlyMap<string, Uint8Array>;
    readonly extension: ModelExtension;
    readonly used: readonly string[];
    readonly required: readonly string[];
    /** The names of the materials drawn see-through in place of transmission ({@link seeThrough}). */
    readonly seeThrough?: ReadonlySet<string>;
}

/**
 * Read a glTF's JSON, upgrading glTF 1.0 to 2.0: the upgraded JSON replaces the main file, which
 * is then read as a `.gltf`, and a GLB version 1's body is served beside it.
 * @param files - The file set.
 * @param main - The main file.
 * @param format - `glb` or `gltf`.
 * @param hidden - Pictures to draw without, by their summary names.
 * @param skipped - Parts loaded without, by their path in the set: a picture among them is drawn
 *     without too, so its part draws in its plain color rather than over a white stand-in.
 * @returns The set to load, the loader, and the extensions the file uses and requires.
 */
function prepareGltf(
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: "glb" | "gltf",
    hidden: ReadonlySet<string>,
    skipped: ReadonlySet<string> = new Set(),
): GltfPrepared {
    const bytes = files.get(main) as Uint8Array;
    const glbVersion = format === "glb" ? new DataView(bytes.buffer, bytes.byteOffset, 8).getUint32(4, true) : 0;
    let json: Record<string, unknown>;
    let body: Uint8Array | undefined;
    try {
        if (glbVersion === 1) {
            const glb1 = readGlb1(bytes);
            json = JSON.parse(glb1.text) as Record<string, unknown>;
            ({ body } = glb1);
        } else {
            const glb = format === "glb" ? readGlb(bytes) : undefined;
            json = JSON.parse(glb?.text ?? new TextDecoder().decode(bytes)) as Record<string, unknown>;
            body = glb?.bin;
        }
    } catch {
        throw new ModelError("E_MODEL_PARSE", { format });
    }

    const strings = (list: unknown): string[] =>
        Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
    const used = strings(json.extensionsUsed);
    const required = strings(json.extensionsRequired);
    if (!isGltf1(json)) {
        // An extension drawn without (the transmission family) is taken out of the file's lists, so
        // the loader draws those parts opaque rather than refusing the file or building the
        // scene-wide render target transmission needs.
        const stripped = [...used, ...required].some((name) => IGNORED_EXTENSIONS.has(name));
        const clear = stripped ? seeThrough(json) : new Set<string>();
        if (stripped) {
            json.extensionsRequired = required.filter((name) => !IGNORED_EXTENSIONS.has(name));
            json.extensionsUsed = used.filter((name) => !IGNORED_EXTENSIONS.has(name));
        }

        const plain = withoutClimbs(
            json,
            files,
            main,
            body,
            withoutGltfPictures(json, hidden, skipped, main) || stripped,
        );
        return {
            files: plain.files,
            extension: plain.extension ?? (READERS[format] as ModelExtension),
            used,
            required,
            seeThrough: clear,
        };
    }

    const slash = main.lastIndexOf("/");
    const bodyName = `${main.slice(slash + 1)}.body.bin`;
    const upgraded = new Map(files);
    upgraded.set(main, new TextEncoder().encode(JSON.stringify(upgradeGltf1(json, bodyName))));
    if (body !== undefined) {
        upgraded.set(main.slice(0, slash + 1) + bodyName, body);
    }

    return { files: upgraded, extension: ".gltf", used: [], required: [] };
}

/** The least opacity a transmissive material drawn without transmission keeps, so it is still seen. */
const TRANSMISSION_FLOOR = 0.2;

/**
 * Draw each transmissive material see-through: alpha blended, its opacity scaled by one minus its
 * transmission factor (with {@link TRANSMISSION_FLOOR}). Drawn opaque, a watch's glass would hide
 * its dial and hands.
 * @param json - The glTF's JSON, changed in place.
 * @returns The names of the materials made see-through.
 */
function seeThrough(json: Record<string, unknown>): Set<string> {
    const names = new Set<string>();
    const materials = Array.isArray(json.materials) ? (json.materials as unknown[]) : [];
    for (const material of materials) {
        if (
            typeof material === "object" &&
            material !== null &&
            blendTransmissive(material as Record<string, unknown>)
        ) {
            const { name } = material as { name?: unknown };
            names.add(typeof name === "string" ? name : "");
        }
    }

    return names;
}

/**
 * Make one transmissive material see-through ({@link seeThrough}), unless it is a solid volume.
 * @param entry - The glTF material, changed in place.
 * @returns Whether it was made see-through.
 */
function blendTransmissive(entry: Record<string, unknown>): boolean {
    const extensions = entry.extensions as Record<string, unknown> | undefined;
    const transmission = extensions?.KHR_materials_transmission as { transmissionFactor?: unknown } | undefined;
    const factor = typeof transmission?.transmissionFactor === "number" ? transmission.transmissionFactor : 0;
    // A volume with thickness is a solid body (in glTF, thickness 0 means thin-walled glass). Drawn
    // without its volume it is opaque, as an object with no transmission is: made see-through by
    // its transmission factor, the amber DragonAttenuation dragon was a white ghost at 20%.
    const volume = extensions?.KHR_materials_volume as { thicknessFactor?: unknown } | undefined;
    const solid = typeof volume?.thicknessFactor === "number" && volume.thicknessFactor > 0;
    if (factor <= 0 || solid) {
        return false;
    }

    const pbr = (
        typeof entry.pbrMetallicRoughness === "object" && entry.pbrMetallicRoughness !== null
            ? entry.pbrMetallicRoughness
            : {}
    ) as Record<string, unknown>;
    const base = Array.isArray(pbr.baseColorFactor) ? (pbr.baseColorFactor as number[]) : [1, 1, 1, 1];
    const alpha = typeof base[3] === "number" ? base[3] : 1;
    pbr.baseColorFactor = [base[0] ?? 1, base[1] ?? 1, base[2] ?? 1, alpha * Math.max(TRANSMISSION_FLOOR, 1 - factor)];
    entry.pbrMetallicRoughness = pbr;
    entry.alphaMode = "BLEND";
    return true;
}

/**
 * Keep a see-through material's reflections see-through too. Babylon draws a PBR material's
 * specular and environment reflections over its alpha by default, so a glossy glass at 20%
 * opacity still covered a watch's dial and hands with an opaque disc of reflected sky.
 * @param container - The loaded model.
 * @param names - The see-through materials' names.
 */
function clearReflections(container: AssetContainer, names: ReadonlySet<string>): void {
    for (const material of container.materials) {
        if (names.has(material.name) && material.alpha < 1 && "useRadianceOverAlpha" in material) {
            Object.assign(material, { useRadianceOverAlpha: false, useSpecularOverAlpha: false });
        }
    }
}

/**
 * Draw an OBJ's faces as faces. Babylon's OBJ loader turns an MTL material into a point cloud when
 * any mesh using it has no faces, and an OBJ's empty `o` or `g` line makes such a mesh: three.js's
 * male02 drew its whole suit as sparse dots. A material a faced mesh uses draws faces again.
 * @param container - The loaded OBJ.
 */
function facesNotPoints(container: AssetContainer): void {
    // ponytail: a faceless mesh with vertices sharing that material loses its points; give it its
    // own point material if an OBJ ever needs both.
    for (const mesh of container.meshes) {
        if (mesh.material?.pointsCloud === true && mesh.getTotalIndices() > 0) {
            mesh.material.pointsCloud = false;
        }
    }
}

/**
 * A glTF 2.0 whose `uri`s climb above its folder (`../textures/wood.png`), which Babylon's glTF
 * loader refuses to resolve, with each `..` percent-encoded: the loader then asks the request
 * guard for it, which decodes it to the key the intake held the file under (design 3.3). A GLB
 * is served as a `.gltf` beside its binary chunk, the way an upgraded glTF 1.0 is.
 * @param json - The glTF's JSON.
 * @param files - The file set.
 * @param main - The main file.
 * @param body - A GLB's binary chunk.
 * @param changedJson - Whether the JSON was changed already, so it is written out even with no climb.
 * @returns The set to load, and the loader when it changed.
 */
function withoutClimbs(
    json: Record<string, unknown>,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    body: Uint8Array | undefined,
    changedJson: boolean,
): { files: ReadonlyMap<string, Uint8Array>; extension?: ModelExtension } {
    const entries = ["buffers", "images"].flatMap((key) => {
        const list = json[key];
        return Array.isArray(list)
            ? list.filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
            : [];
    });
    const climbing = entries.filter((e) => typeof e.uri === "string" && !/^data:/i.test(e.uri) && e.uri.includes(".."));
    if (climbing.length === 0 && !changedJson) {
        return { files };
    }

    for (const entry of climbing) {
        entry.uri = String(entry.uri).replaceAll("..", "%2E%2E");
    }

    const slash = main.lastIndexOf("/");
    const changed = new Map(files);
    if (body !== undefined) {
        const bodyName = `${main.slice(slash + 1)}.body.bin`;
        const [first] = Array.isArray(json.buffers) ? (json.buffers as Record<string, unknown>[]) : [];
        if (typeof first === "object" && first.uri === undefined) {
            first.uri = encodeURIComponent(bodyName);
        }

        changed.set(main.slice(0, slash + 1) + bodyName, body);
    }

    changed.set(main, new TextEncoder().encode(JSON.stringify(json)));
    return { files: changed, ...(body === undefined ? {} : { extension: ".gltf" }) };
}

/**
 * Draw an FBX file's curves as thin tubes. Babylon's FBX loader makes a curve a line mesh, which a
 * renderer that draws models as solids (graphty-element) cannot show; a file of NURBS curves then
 * drew nothing. Each polyline becomes a tube 1/200 of the curves' extent thick, in the curve's color.
 * @param container - The loaded FBX.
 */
async function curvesAsTubes(container: AssetContainer): Promise<void> {
    const lines = container.meshes.filter((mesh) => mesh.getClassName() === "LinesMesh");
    if (lines.length === 0) {
        return;
    }

    const [{ CreateTube }, { StandardMaterial }, { Vector3 }] = await Promise.all([
        import("@babylonjs/core/Meshes/Builders/tubeBuilder.js"),
        import("@babylonjs/core/Materials/standardMaterial.js"),
        import("@babylonjs/core/Maths/math.vector.js"),
    ]);
    let extent = 0;
    for (const mesh of lines) {
        const { minimum, maximum } = mesh.getBoundingInfo();
        extent = Math.max(extent, maximum.subtract(minimum).length());
    }

    const radius = Math.max(extent, 1e-6) / 200;
    for (const mesh of lines) {
        const scene = mesh.getScene();
        const positions = mesh.getVerticesData("position") ?? [];
        const indices = mesh.getIndices() ?? [];
        const point = (i: number): InstanceType<typeof Vector3> =>
            new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        // The loader writes each polyline as consecutive segments: a break starts a new path.
        const paths: InstanceType<typeof Vector3>[][] = [];
        for (let i = 0; i + 1 < indices.length; i += 2) {
            const path = paths.at(-1);
            if (path !== undefined && i > 0 && indices[i] === indices[i - 1]) {
                path.push(point(indices[i + 1]));
            } else {
                paths.push([point(indices[i]), point(indices[i + 1])]);
            }
        }

        const material = new StandardMaterial(`${mesh.name} curve`, scene);
        material.diffuseColor = (mesh as unknown as { color: typeof material.diffuseColor }).color.clone();
        scene.removeMaterial(material);
        container.materials.push(material);
        for (const [n, path] of paths.entries()) {
            const tube = CreateTube(`${mesh.name} ${String(n)}`, { path, radius, tessellation: 8, cap: 3 }, scene);
            scene.removeMesh(tube);
            tube.parent = mesh.parent;
            tube.position.copyFrom(mesh.position);
            tube.rotation.copyFrom(mesh.rotation);
            tube.rotationQuaternion = mesh.rotationQuaternion?.clone() ?? null;
            tube.scaling.copyFrom(mesh.scaling);
            tube.material = material;
            container.meshes.push(tube);
        }

        for (const child of mesh.getChildren()) {
            (child as { parent: unknown }).parent = mesh.parent;
        }
        container.meshes.splice(container.meshes.indexOf(mesh), 1);
        mesh.dispose(true);
    }
}

/** The Draco module, when a load uses it. */
type DracoModule = typeof import("../decoders/draco.js");

/** A decoder that cannot be used: turned off by `configureDecoders`, left out of a build, or failed to load. */
type DecoderMissing = "missing" | "load";

/** Each decoder module, imported on first use. */
const DECODERS = {
    draco: () => import("../decoders/draco.js"),
    meshopt: () => import("../decoders/meshopt.js"),
    ktx2: () => import("../decoders/ktx2.js"),
    usd: () => import("../decoders/usd.js"),
} as const;

/**
 * Import one decoder module, unless it is turned off.
 * @param kind - The decoder.
 * @returns The module, or why there is none.
 */
async function importDecoder(kind: keyof typeof DECODERS): Promise<{ readonly available: boolean } | DecoderMissing> {
    if (!allowed(kind)) {
        return "missing";
    }

    try {
        const found = await DECODERS[kind]();
        return found.available ? found : "missing";
    } catch {
        return "load";
    }
}

/**
 * Import a decoder a glTF cannot be drawn without.
 * @param kind - The decoder.
 * @param named - What it decodes, named when it is turned off or left out: a glTF extension, or a format.
 * @returns The module.
 * @throws {ModelError} `E_MODEL_DECODER_UNAVAILABLE` when it is off, left out or failed to load.
 */
async function requireDecoder(
    kind: keyof typeof DECODERS,
    named: { readonly extension: string } | { readonly format: string },
): Promise<{ readonly available: boolean }> {
    const found = await importDecoder(kind);
    if (typeof found === "string") {
        throw new ModelError("E_MODEL_DECODER_UNAVAILABLE", {
            ...(found === "missing" ? named : {}),
            reason: found,
        });
    }

    return found;
}

/**
 * Load the decoder modules a glTF's extensions need.
 * @param used - The extensions it uses.
 * @param required - The extensions it requires. When the KTX2 decoder is off, left out or does not
 *     load, a glTF that only uses `KHR_texture_basisu` draws its fallback images instead.
 * @returns The Draco module when the glTF uses Draco, so the load can be counted.
 */
async function loadDecoders(used: readonly string[], required: readonly string[]): Promise<DracoModule | undefined> {
    const needed = new Set(DECODER_EXTENSIONS.filter(([name]) => used.includes(name)).map(([, kind]) => kind));
    const draco = needed.has("draco")
        ? ((await requireDecoder("draco", { extension: "KHR_draco_mesh_compression" })) as DracoModule)
        : undefined;
    if (needed.has("meshopt")) {
        await requireDecoder("meshopt", { extension: "EXT_meshopt_compression" });
    }

    if (needed.has("ktx2")) {
        const found = await importDecoder("ktx2");
        if (typeof found === "string" && required.includes("KHR_texture_basisu")) {
            throw new ModelError("E_MODEL_DECODER_UNAVAILABLE", { extension: "KHR_texture_basisu", reason: found });
        }
    }

    return draco;
}

/**
 * The coded fact a failed load is reported as.
 * @param error - What the load threw.
 * @param format - The model's format.
 * @returns The fact.
 */
function failureOf(error: unknown, format: string): ModelFact {
    if (error instanceof ModelError) {
        return error.fact;
    }

    if (error instanceof ModelReadError) {
        return { code: "E_MODEL_STRUCTURE", params: { rule: error.rule } };
    }

    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const text = error instanceof Error ? `${error.message} ${cause}` : String(error);
    const at = text.indexOf(REFUSED);
    if (at >= 0) {
        const url = text.slice(at + REFUSED.length).split(/\s/)[0] ?? "";
        return { code: "E_MODEL_EXTERNAL_URL", params: { url: shown(url) } };
    }

    if (text.includes("nothing is fetched from Babylon's CDN") || text.includes("USD worker")) {
        return { code: "E_MODEL_DECODER_UNAVAILABLE", params: { reason: "load" } };
    }

    const decoder = DECODER_EXTENSIONS.find(([name]) => text.includes(name));
    if (decoder !== undefined) {
        return { code: "E_MODEL_DECODER_UNAVAILABLE", params: { extension: decoder[0], reason: "decode" } };
    }

    return { code: "E_MODEL_PARSE", params: { format } };
}

/**
 * The loader options for a USD model: Babylon's USD loader reads no URL but its main file, so every
 * other file of the set (its sublayers, references, payloads and pictures) is handed to OpenUSD as
 * a virtual file under its path in the set, beside the main file under its own; and the worker and
 * its files are this package's own (src/decoders/usd.ts).
 * @param options - The caller's loader options.
 * @param files - The file set.
 * @param main - The main file's path.
 * @returns The options with the USD loader's own.
 * @throws {ModelError} `E_MODEL_DECODER_UNAVAILABLE` when the importer is off, left out or failed to load.
 */
async function withUsdFiles(
    options: LoadModelFilesOptions,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
): Promise<LoadModelFilesOptions> {
    const usd = (await requireDecoder("usd", { format: "usd" })) as typeof import("../decoders/usd.js");
    const others: Record<string, Uint8Array> = {};
    for (const [path, bytes] of files) {
        if (path !== main) {
            others[path] = bytes;
        }
    }

    const given = (options.pluginOptions?.usd ?? {}) as Record<string, unknown>;
    return {
        ...options,
        pluginOptions: {
            ...options.pluginOptions,
            usd: { ...given, ...usd.usdImporterUrls(), rootFileName: main, files: others, resolveByFileName: true },
        },
    };
}

/**
 * An ASCII FBX file with each backslash doubled. Babylon's ASCII FBX parser (still in 9.37) reads a
 * backslash in a string as an escape, which FBX does not have, so a Windows path that ends in one
 * (`"D:\"`, which Maya writes) swallowed its closing quote and the file failed to load; doubled,
 * each reads back as the one backslash the file wrote. Delete when Babylon reads strings verbatim.
 * @param files - The file set.
 * @param main - The FBX file's path.
 * @returns The set with the main file rewritten when it is ASCII.
 */
function withAsciiFbxBackslashes(
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
): ReadonlyMap<string, Uint8Array> {
    const bytes = files.get(main) as Uint8Array;
    if (isBinaryFbx(bytes) || !bytes.includes(0x5c)) {
        return files;
    }

    const doubled = new Uint8Array(bytes.length + bytes.reduce((n, b) => n + Number(b === 0x5c), 0));
    let at = 0;
    for (const b of bytes) {
        doubled[at++] = b;
        if (b === 0x5c) {
            doubled[at++] = b;
        }
    }

    return new Map(files).set(main, doubled);
}

/**
 * An FBX file's set as Babylon's loader reads it: an ASCII file's embedded pictures (which the
 * loader reads only from a binary file) put beside it as files, where the loader then looks for
 * them, and its backslashes doubled ({@link withAsciiFbxBackslashes}).
 * @param files - The set.
 * @param main - The FBX file's path.
 * @param hidden - Pictures drawn without: an embedded one is put there as a white picture.
 * @returns The set to load.
 */
function fbxFiles(
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    hidden: readonly string[],
): ReadonlyMap<string, Uint8Array> {
    const folder = main.slice(0, main.lastIndexOf("/") + 1);
    const pictures = asciiFbxPictures(files.get(main) as Uint8Array, DEFAULT_MODEL_LIMITS);
    const out = new Map(files);
    for (const [name, bytes] of pictures) {
        if (!out.has(folder + name)) {
            out.set(folder + name, hidden.includes(name) ? WHITE_PNG : bytes);
        }
    }

    return withAsciiFbxBackslashes(out, main);
}

/**
 * A USD model's set as OpenUSD reads it, as virtual files: a USDZ's entries unpacked (its first
 * is the root layer), and every picture drawn without swapped for a 1 x 1 white stand-in, taken
 * off once loaded. A picture OpenUSD cannot find is not a plain color: the parts whose material
 * reads it are not drawn at all (RoughnessTest.usdz without its roughness picture drew nothing).
 * @param files - The set.
 * @param main - The main file's path.
 * @param format - `usd` or `usdz`.
 * @param gone - Pictures drawn without, by path.
 * @returns The set to load and its root layer.
 */
function usdFiles(
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: "usd" | "usdz",
    gone: readonly string[],
): { files: ReadonlyMap<string, Uint8Array>; main: string } {
    let set = files;
    let root = main;
    if (format === "usdz") {
        set = readUsdz(files.get(main) as Uint8Array);
        [root] = set.keys();
    }

    const out = new Map(set);
    const left = new Set(gone.map((g) => g.toLowerCase()));
    for (const path of out.keys()) {
        if (path !== root && left.has(path.toLowerCase())) {
            out.set(path, WHITE_PNG);
        }
    }
    // A skipped picture is not in the set at all: its stand-in takes its place.
    for (const path of gone) {
        if (![...out.keys()].some((p) => p.toLowerCase() === path.toLowerCase())) {
            out.set(path, WHITE_PNG);
        }
    }

    return { files: out, main: root };
}

/**
 * What a format's loaded container still needs: an OBJ's faces drawn as faces, an FBX file's
 * curves as tubes and its embedded pictures drawn without taken off (they are named by their
 * file's base name, as the loader names them), a BVH file's skeleton drawn as a figure, a USD
 * model's stand-ins for its pictures drawn without taken off.
 * @param container - The loaded model.
 * @param format - Its format.
 * @param hidden - Pictures drawn without.
 * @param gone - Pictures drawn without and parts skipped, by path in the set.
 */
async function finish(
    container: AssetContainer,
    format: ModelFormat,
    hidden: readonly string[],
    gone: readonly string[],
): Promise<void> {
    if (format === "obj") {
        facesNotPoints(container);
    } else if (format === "fbx") {
        await curvesAsTubes(container);
        takeOffByName(container, hidden);
    } else if (format === "bvh") {
        bvhFigure(container);
    } else if (format === "usd" || format === "usdz") {
        takeOffUsdPictures(container, gone);
    }
}

/** Options for {@link loadModelFiles}. */
export interface LoadModelFilesOptions extends LoaderOptions {
    /**
     * Parts to load without, by their path in the set: a material that draws a skipped picture
     * (an OBJ's MTL line, a glTF's texture) draws without it, in its plain color. Default: none.
     */
    readonly skipped?: readonly string[];
    /**
     * Pictures to draw without, by their {@link ModelSummary.pictures} name: every material that
     * draws one loses it, so that part draws in its plain color (glTF, OBJ, `.babylon` and PLY).
     * Default: none.
     */
    readonly withoutPictures?: readonly string[];
}

/**
 * Load a checked model's files into a container that is not in the scene yet. Every file the
 * model names must be in `files`: nothing is fetched, and a reference to anything else is refused.
 * @param scene - The scene the container belongs to.
 * @param files - The file set, by path.
 * @param main - The main file's path in `files`.
 * @param format - Its format, as `detectModelFormat` or a check names it.
 * @param options - Parts to load without, Babylon's plugin options, and whether to keep the file's
 *     cameras and lights.
 * @returns The container. Add it to the scene with `container.addAllToScene()`.
 * @throws {ModelError} With `E_MODEL_FORMAT_UNSUPPORTED`, `E_MODEL_EXTERNAL_URL`, `E_MODEL_STRUCTURE`,
 *     `E_MODEL_DECODER_UNAVAILABLE` or `E_MODEL_PARSE`.
 */
export async function loadModelFiles(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: ModelFormat,
    options: LoadModelFilesOptions = {},
): Promise<AssetContainer> {
    if (!hasReader(format)) {
        throw new ModelError("E_MODEL_FORMAT_UNSUPPORTED", { format, fileName: main });
    }

    const skipped = options.skipped ?? [];
    const hidden = options.withoutPictures ?? [];
    // An OBJ's MTL lines naming a picture drawn without are dropped below: its materials by name.
    const lostPicture = format === "obj" ? mtlMaterialsWithout(files, [...skipped, ...hidden]) : new Set<string>();
    if (skipped.length > 0) {
        files = withSkips(files, skipped, format === "obj");
    }

    if (format === "obj" && hidden.length > 0) {
        // An OBJ's pictures are named by their paths: their MTL lines are dropped, as a skip's are.
        files = withSkips(files, hidden, true);
    }

    if (format === "fbx") {
        files = fbxFiles(files, main, hidden);
    } else if (format === "usd" || format === "usdz") {
        ({ files, main } = usdFiles(files, main, format, [...skipped, ...hidden]));
    }

    let reader = READERS[format];
    let draco: DracoModule | undefined;
    let clear: ReadonlySet<string> = new Set();
    if (format === "glb" || format === "gltf") {
        const prepared = prepareGltf(files, main, format, new Set(hidden), new Set(skipped));
        ({ files } = prepared);
        clear = prepared.seeThrough ?? clear;
        reader = prepared.extension;
        draco = await loadDecoders(prepared.used, prepared.required);
    }

    const urls = new Map<string, string>();
    for (const [path, bytes] of files) {
        urls.set(path, URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>])));
    }

    const { root, release } = guardRequests(urls);
    let decoderFailed = false;
    draco?.dracoLoadStarted();
    try {
        const slash = main.lastIndexOf("/");
        const folder = root + main.slice(0, slash + 1);
        if (!reader.startsWith(".")) {
            const own = await loadOwnModel(scene, files, main, reader as OwnFormat, folder, new Set(hidden));
            // Their pictures are named by their paths in the set: taken off once loaded, as a skip's are.
            markWithoutPictures(own, root, [...skipped, ...hidden], lostPicture);
            return own;
        }

        const container = await loadBabylonModel(
            scene,
            folder,
            main.slice(slash + 1),
            reader as ModelExtension,
            format === "usd" || format === "usdz" ? await withUsdFiles(options, files, main) : options,
        );
        clearReflections(container, clear);
        await finish(container, format, hidden, [...skipped, ...hidden]);
        markWithoutPictures(container, root, format === "fbx" ? [...skipped, ...hidden] : skipped, lostPicture);
        return container;
    } catch (error) {
        const fact = failureOf(error, format);
        // Only a decoder that failed to load is dropped: a damaged file ("decode") or a KTX2
        // failure leaves the Draco decoder working.
        decoderFailed =
            fact.code === "E_MODEL_DECODER_UNAVAILABLE" &&
            fact.params.reason === "load" &&
            fact.params.extension === undefined;
        throw new ModelError(fact.code, { ...fact.params });
    } finally {
        draco?.dracoLoadEnded(decoderFailed);
        release();
        for (const url of urls.values()) {
            URL.revokeObjectURL(url);
        }
    }
}

/** Options for {@link loadModel}. */
export interface LoadModelOptions extends LoadModelFilesOptions, Pick<ModelFileOptions, "main" | "format"> {
    /** The limits the files are checked against. Default: `DEFAULT_MODEL_LIMITS`. */
    readonly limits?: Partial<ModelLimits>;
    /** Stops a download. */
    readonly signal?: AbortSignal;
    /** Hears how far the files have been downloaded, read or unpacked. */
    readonly onProgress?: ModelProgressListener;
}

/** What {@link loadModel} loaded. */
export interface LoadedModel {
    /** The model, not yet in the scene: `container.addAllToScene()` adds it. */
    readonly container: AssetContainer;
    /** What the model holds, read from its files. */
    readonly summary: ModelSummary;
    /** What is worth knowing about it (`W_MODEL_*`). */
    readonly warnings: readonly ModelFact[];
    /** The files it was read from, by path (a zip's entries, or the URL's file and the files it names). */
    readonly files: ReadonlyMap<string, Uint8Array>;
    /** The main file's path in `files`. */
    readonly main: string;
    /** Its format. */
    readonly format: ModelFormat;
}

/**
 * Load a model into a container that is not in the scene yet: from a URL (with the files it names
 * beside it, fetched with no credentials), a File, several Files (a folder, or a model with its
 * parts), a `.zip`, or bytes. The files are checked against `limits` first, so a broken or
 * oversized model is refused before Babylon reads it.
 * @param scene - The scene the container belongs to.
 * @param source - The model.
 * @param options - Which file is the model, its format, parts to load without, limits, a signal,
 *     Babylon's plugin options and whether to keep the file's cameras and lights.
 * @returns The container, and what the checks found.
 * @throws {ModelError} With the `E_MODEL_*` code of the first problem; `facts` holds every one.
 */
export async function loadModel(
    scene: Scene,
    source: ModelSource,
    options: LoadModelOptions = {},
): Promise<LoadedModel> {
    const limits: ModelLimits = { ...DEFAULT_MODEL_LIMITS, ...options.limits };
    let url: URL | undefined;
    if (typeof source === "string") {
        url = new URL(source, (globalThis as { location?: { href: string } }).location?.href);
    }

    const read =
        url === undefined
            ? await readModelFiles(source as Exclude<ModelSource, string>, limits, options.onProgress)
            : await fetchModelSet(url, limits, options.signal, undefined, options.onProgress);
    const main = options.main ?? read.main;
    const checked = await checkModelFiles(
        read.given,
        {
            ...(main === undefined ? {} : { main }),
            ...(options.format === undefined ? {} : { format: options.format }),
            ...(options.skipped === undefined ? {} : { skipped: options.skipped }),
        },
        limits,
        url?.href,
    );
    if (checked.kind === "image") {
        throw new ModelError("E_MODEL_FORMAT_UNSUPPORTED", {
            format: checked.format,
            fileName: checked.main,
            assetKind: "image",
        });
    }

    const container = await loadModelFiles(scene, checked.files, checked.main, checked.format, options);
    return {
        container,
        summary: checked.summary,
        warnings: checked.warnings,
        files: checked.files,
        main: checked.main,
        format: checked.format,
    };
}
