/**
 * @file Load one accepted model's files into a Babylon.js asset container, under the request
 * guard (design/rendering/node-models.md, sections 3.3 and 3.4).
 *
 * Every file of the set becomes a `blob:` URL for the length of the load and is revoked after it.
 * The main file is named under a root of the load's own (requestGuard.ts), so its references resolve to names the guard
 * maps to those `blob:` URLs, and anything else Babylon asks for throws. The model chunk, which
 * carries the loaders and their shaders, is imported here on first use and never before.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { CodedFact } from "../session/shared";
import { guardRequests, REFUSED } from "./requestGuard";

/** The model chunk, as its one dynamic import resolves. */
export type ModelChunk = typeof import("./chunk");

let chunk: Promise<ModelChunk> | undefined;

/**
 * The model chunk, imported once.
 * @returns The chunk's module.
 */
export function loadChunk(): Promise<ModelChunk> {
    chunk ??= import("./chunk");
    return chunk;
}

/** Why a model could not be drawn, as the coded fact a reader is told. */
export class ModelLoadFailure extends Error {
    /**
     * Carry a coded fact.
     * @param fact - What went wrong.
     */
    constructor(readonly fact: CodedFact) {
        super(fact.code);
    }
}

/** The loader each drawable format is read by. PLY is checked on intake and not drawn yet. */
const EXTENSIONS: Readonly<Record<string, ".glb" | ".gltf" | ".obj" | ".stl">> = {
    glb: ".glb",
    gltf: ".gltf",
    obj: ".obj",
    stl: ".stl",
};

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

/**
 * Load a model's files into a container that is not in the scene yet.
 * @param scene - The scene.
 * @param files - The file set, by path relative to the main file's folder.
 * @param main - The main file's path.
 * @param format - Its detected format.
 * @param skipped - Parts drawn without: a picture is a 1 x 1 white PNG, and an OBJ's MTL lines naming it are dropped.
 * @returns The container.
 * @throws {ModelLoadFailure} With `E_MODEL_FORMAT_UNSUPPORTED`, `E_MODEL_EXTERNAL_URL` or `E_MODEL_PARSE`.
 */
export async function loadModel(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: string,
    skipped: readonly string[] = [],
): Promise<AssetContainer> {
    const extension = EXTENSIONS[format] as (typeof EXTENSIONS)[string] | undefined;
    if (extension === undefined) {
        throw new ModelLoadFailure({ code: "E_MODEL_FORMAT_UNSUPPORTED", params: { format, fileName: main } });
    }

    let module: ModelChunk;
    try {
        module = await loadChunk();
    } catch {
        throw new ModelLoadFailure({ code: "E_MODEL_PARSE", params: { format } });
    }

    if (skipped.length > 0) {
        files = (await import("../session/assets/textFormats")).withSkips(files, skipped, format === "obj");
    }

    const urls = new Map<string, string>();
    for (const [path, bytes] of files) {
        urls.set(path, URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>])));
    }

    const { root, release } = guardRequests(urls);
    try {
        const slash = main.lastIndexOf("/");
        return await module.loadModelFiles(scene, root + main.slice(0, slash + 1), main.slice(slash + 1), extension);
    } catch (error) {
        const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
        const text = error instanceof Error ? `${error.message} ${cause}` : String(error);
        const at = text.indexOf(REFUSED);
        if (at >= 0) {
            const url = text.slice(at + REFUSED.length).split(/\s/)[0] ?? "";
            throw new ModelLoadFailure({ code: "E_MODEL_EXTERNAL_URL", params: { url: shown(url) } });
        }

        throw new ModelLoadFailure({ code: "E_MODEL_PARSE", params: { format } });
    } finally {
        release();
        for (const url of urls.values()) {
            URL.revokeObjectURL(url);
        }
    }
}
