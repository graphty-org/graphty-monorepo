/**
 * @file Gaussian splat files (`.splat`, `.spz`, `.sog`) read into small solids.
 *
 * Each format is decoded to the 32-byte splat rows Babylon.js's splat parsers produce, without
 * making a `GaussianSplattingMesh`: a raw `.splat` already is those rows, `.spz` goes through
 * Babylon's `ParseSpz` after an inflate of the element's own (fflate, already a dependency) and
 * `.sog` through `ParseSogMeta`, which decodes its WebP pictures with a canvas. Babylon's splat
 * loader is never used, so nothing loads fflate from unpkg.com. Reached only through the model
 * chunk.
 */

import type { Scene } from "@babylonjs/core/scene.js";
import { ParseSogMeta } from "@babylonjs/loaders/SPLAT/sog.js";
import { ParseSpz } from "@babylonjs/loaders/SPLAT/spz.js";
import { gunzipSync } from "fflate";

import { resolveReference } from "../../session/assets/references";
import { type Geometry, ModelReadError, splatRowsToSolids, toLeftHanded } from "./geometry";

/** Babylon's "reject" parse mode. */
const REJECT = 3;

/**
 * A SOG's pictures by the names its `meta.json` writes, each resolved the way the intake accepted
 * it (case, base name, or the key of a picture outside the folder, design 3.3), so Babylon finds
 * every one in the map and never requests a name it lacks.
 * @param files - The file set.
 * @param main - The `meta.json`'s path.
 * @returns The map Babylon's SOG parser reads, with the main file as `meta.json`.
 */
function sogFiles(files: ReadonlyMap<string, Uint8Array>, main: string): Map<string, Uint8Array> {
    const bytes = files.get(main) as Uint8Array;
    const meta = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, { files?: unknown } | undefined>;
    // Babylon looks the main file up as `meta.json`, whatever it is called.
    const set = new Map<string, Uint8Array>([["meta.json", bytes]]);
    for (const key of ["means", "scales", "quats", "sh0", "shN"]) {
        const names = meta[key]?.files;
        for (const name of Array.isArray(names) ? names : []) {
            if (typeof name === "string") {
                set.set(name, resolveReference(name, main, files).bytes);
            }
        }
    }

    return set;
}

/**
 * Read a splat file into solids.
 * @param scene - The scene (Babylon's parsers read its engine's limits for spherical harmonics).
 * @param files - The file set.
 * @param main - The main file: the `.splat`, the `.spz`, or the SOG's `meta.json`.
 * @param format - `splat`, `spz` or `sog`.
 * @returns The solids and how many splats they draw.
 * @throws {ModelReadError} `splat` for a damaged file.
 */
export async function readSplat(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: "splat" | "spz" | "sog",
): Promise<{ geometry: Geometry; drawn: number }> {
    const bytes = files.get(main) as Uint8Array;
    let rows: ArrayBuffer;
    try {
        if (format === "splat") {
            rows = bytes.slice().buffer;
        } else if (format === "spz") {
            const raw = gunzipSync(bytes);
            const parsed = await ParseSpz(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), scene, {});
            if ((parsed.mode as number) === REJECT) {
                throw new ModelReadError("splat");
            }
            rows = parsed.data;
        } else {
            rows = (await ParseSogMeta(sogFiles(files, main), "", scene)).data;
        }
    } catch (error) {
        throw error instanceof ModelReadError ? error : new ModelReadError("splat");
    }

    const { geometry, drawn } = splatRowsToSolids(rows);
    return { geometry: toLeftHanded(geometry), drawn };
}
