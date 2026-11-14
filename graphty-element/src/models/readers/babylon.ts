/**
 * @file graphty-element's own `.babylon` reader: geometry and diffuse materials only.
 *
 * Reads `meshes[]` (positions, normals, uvs, indices and colors, inline or through `geometryId`
 * into `geometries.vertexData`), each mesh's position, rotation, rotation quaternion, scaling and
 * parent, and each material's `diffuse` color and `diffuseTexture.name`. Sounds, actions, physics,
 * cameras, lights, skeletons and animations are ignored. A file whose meshes load from other files
 * (`delayLoadingFile`) is refused. Babylon.js's own `.babylon` loader is never imported: it is
 * about 64 KB and pulls in three physics plugins.
 *
 * Babylon-free and DOM-free: the JSON is parsed by the caller with the strict glTF rules.
 */

import { type Geometry, ModelReadError } from "./geometry";

type Json = Record<string, unknown>;

/** One mesh of a `.babylon` file. */
interface BabylonMesh {
    readonly name: string;
    readonly geometry: Geometry;
    /** Index into {@link BabylonScene.materials}. */
    readonly material?: number;
    /** Index into {@link BabylonScene.meshes}. */
    readonly parent?: number;
    readonly position?: readonly number[];
    readonly rotation?: readonly number[];
    readonly rotationQuaternion?: readonly number[];
    readonly scaling?: readonly number[];
}

/** One material: a diffuse color, a diffuse picture, or both. */
interface BabylonMaterial {
    readonly color?: readonly [number, number, number];
    /** The picture's name, relative to the `.babylon` file. */
    readonly texture?: string;
    readonly alpha?: number;
}

/** What a `.babylon` file draws. */
export interface BabylonScene {
    readonly meshes: BabylonMesh[];
    readonly materials: BabylonMaterial[];
}

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Json {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A numeric array field, or undefined.
 * @param value - The field.
 * @returns The numbers.
 */
function numbers(value: unknown): number[] | undefined {
    return Array.isArray(value) && value.every((v) => typeof v === "number") ? value : undefined;
}

/**
 * Colors as r, g, b, a per vertex, from three or four per vertex.
 * @param colors - The file's colors.
 * @param vertices - The vertex count.
 * @returns Four per vertex, or undefined.
 */
function rgba(colors: number[] | undefined, vertices: number): Float32Array | undefined {
    if (colors === undefined || vertices === 0) {
        return undefined;
    }

    if (colors.length === vertices * 4) {
        return Float32Array.from(colors);
    }

    if (colors.length !== vertices * 3) {
        return undefined;
    }

    const out = new Float32Array(vertices * 4);
    for (let i = 0; i < vertices; i++) {
        out.set(colors.slice(i * 3, i * 3 + 3), i * 4);
        out[i * 4 + 3] = 1;
    }

    return out;
}

/**
 * A mesh's vertex data, inline or shared through `geometryId`.
 * @param mesh - The mesh.
 * @param shared - `geometries.vertexData`, by id.
 * @returns The geometry, or undefined for a mesh with no triangles.
 */
function geometryOf(mesh: Json, shared: ReadonlyMap<string, Json>): Geometry | undefined {
    const source = typeof mesh.geometryId === "string" ? (shared.get(mesh.geometryId) ?? {}) : mesh;
    const positions = numbers(source.positions);
    const indices = numbers(source.indices);
    if (positions === undefined || positions.length < 9 || positions.length % 3 !== 0) {
        return undefined;
    }

    const vertices = positions.length / 3;
    const list = indices ?? Array.from({ length: vertices - (vertices % 3) }, (_, i) => i);
    if (list.length % 3 !== 0 || list.some((i) => !Number.isInteger(i) || i < 0 || i >= vertices)) {
        throw new ModelReadError("babylon");
    }

    const geometry: Geometry = { positions: Float32Array.from(positions), indices: Uint32Array.from(list) };
    const normals = numbers(source.normals);
    const uvs = numbers(source.uvs);
    const colors = rgba(numbers(source.colors), vertices);
    if (normals?.length === positions.length) {
        geometry.normals = Float32Array.from(normals);
    }
    if (uvs?.length === vertices * 2) {
        geometry.uvs = Float32Array.from(uvs);
    }
    if (colors !== undefined) {
        geometry.colors = colors;
    }

    return geometry;
}

/**
 * The materials, and their indices by id.
 * @param json - The file.
 * @returns The materials and the id map.
 */
function materialsOf(json: Json): { materials: BabylonMaterial[]; ids: Map<string, number> } {
    const list = Array.isArray(json.materials) ? json.materials.filter(isObject) : [];
    const ids = new Map<string, number>();
    const materials = list.map((m, i) => {
        if (typeof m.id === "string") {
            ids.set(m.id, i);
        }

        const diffuse = numbers(m.diffuse);
        const texture = isObject(m.diffuseTexture) ? m.diffuseTexture.name : undefined;
        return {
            ...(diffuse?.length === 3 ? { color: [diffuse[0], diffuse[1], diffuse[2]] as const } : {}),
            ...(typeof texture === "string" && texture !== "" ? { texture } : {}),
            ...(typeof m.alpha === "number" ? { alpha: m.alpha } : {}),
        };
    });
    return { materials, ids };
}

/**
 * The picture names a `.babylon` file's materials hold, for its parts list.
 * @param json - The parsed file.
 * @returns The names, each once.
 */
export function babylonTextureNames(json: Json): string[] {
    return [...new Set(materialsOf(json).materials.flatMap((m) => (m.texture === undefined ? [] : [m.texture])))];
}

/**
 * Read a parsed `.babylon` file.
 * @param json - The parsed file.
 * @returns Its meshes and materials.
 * @throws {ModelReadError} `delayLoad` for meshes in other files, `babylon` for a damaged mesh.
 */
export function readBabylon(json: Json): BabylonScene {
    const meshes = Array.isArray(json.meshes) ? json.meshes.filter(isObject) : [];
    if (meshes.some((m) => m.delayLoadingFile !== undefined && m.delayLoadingFile !== null)) {
        throw new ModelReadError("delayLoad");
    }

    const vertexData =
        isObject(json.geometries) && Array.isArray(json.geometries.vertexData) ? json.geometries.vertexData : [];
    const shared = new Map<string, Json>();
    for (const data of vertexData.filter(isObject)) {
        if (typeof data.id === "string") {
            shared.set(data.id, data);
        }
    }

    const { materials, ids } = materialsOf(json);
    const meshIds = new Map<string, number>();
    meshes.forEach((m, i) => {
        if (typeof m.id === "string") {
            meshIds.set(m.id, i);
        }
    });

    const out: BabylonMesh[] = [];
    meshes.forEach((m, i) => {
        // A mesh with no triangles (a parent transform) keeps its place, so children find it.
        const geometry = geometryOf(m, shared) ?? { positions: new Float32Array(0), indices: new Uint32Array(0) };
        const material = typeof m.materialId === "string" ? ids.get(m.materialId) : undefined;
        const parent = typeof m.parentId === "string" ? meshIds.get(m.parentId) : undefined;
        out.push({
            name: typeof m.name === "string" ? m.name : `mesh ${String(i)}`,
            geometry,
            ...(material === undefined ? {} : { material }),
            ...(parent === undefined || parent === i ? {} : { parent }),
            ...transformOf(m),
        });
    });

    return { meshes: out, materials };
}

/**
 * A mesh's own transform fields.
 * @param mesh - The mesh.
 * @returns The fields it has.
 */
function transformOf(mesh: Json): Pick<BabylonMesh, "position" | "rotation" | "rotationQuaternion" | "scaling"> {
    const pick = (key: string, length: number): readonly number[] | undefined => {
        const value = numbers(mesh[key]);
        return value?.length === length ? value : undefined;
    };
    const position = pick("position", 3);
    const rotation = pick("rotation", 3);
    const rotationQuaternion = pick("rotationQuaternion", 4);
    const scaling = pick("scaling", 3);
    return {
        ...(position === undefined ? {} : { position }),
        ...(rotation === undefined ? {} : { rotation }),
        ...(rotationQuaternion === undefined ? {} : { rotationQuaternion }),
        ...(scaling === undefined ? {} : { scaling }),
    };
}
