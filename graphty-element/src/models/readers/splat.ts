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

import { dirOf } from "../../session/assets/references";
import { type Geometry, ModelReadError, splatRowsToSolids, toLeftHanded } from "./geometry";

/** Babylon's "reject" parse mode. */
const REJECT = 3;

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
            const dir = dirOf(main);
            const set = new Map<string, Uint8Array>();
            for (const [path, file] of files) {
                if (path.startsWith(dir)) {
                    set.set(path.slice(dir.length), file);
                }
            }
            // Babylon looks the main file up as `meta.json`, whatever it is called.
            set.set("meta.json", files.get(main) as Uint8Array);
            rows = (await ParseSogMeta(set, "", scene)).data;
        }
    } catch (error) {
        throw error instanceof ModelReadError ? error : new ModelReadError("splat");
    }

    const { geometry, drawn } = splatRowsToSolids(rows);
    return { geometry: toLeftHanded(geometry), drawn };
}
