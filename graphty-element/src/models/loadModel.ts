/**
 * @file Load one accepted model's files into a Babylon.js asset container, through babylonjs-models
 * (design/rendering/node-models.md, sections 3.3 and 3.4).
 *
 * babylonjs-models holds the loaders, the readers, the decoders and the request guard; the model
 * chunk (./chunk.ts) holds what graphty-element adds: the template builder, the neutral
 * environment and the PBR shader pin. Both are imported here on first use and never before, so a
 * page that never draws a model never downloads them.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { CodedFact } from "../session/shared";

/** The model chunk, as its one dynamic import resolves. */
export type ModelChunk = typeof import("./chunk");

let chunk: Promise<ModelChunk> | undefined;
let loaded: ModelChunk | null = null;

/**
 * The model chunk, imported once.
 * @returns The chunk's module.
 */
export function loadChunk(): Promise<ModelChunk> {
    chunk ??= import("./chunk").then((module) => {
        loaded = module;
        return module;
    });
    return chunk;
}

/**
 * The model chunk once it has loaded, for code that runs only after a model is drawn (a model
 * node's mark): no model is drawn before the chunk is in.
 * @returns The chunk's module, or null before it loaded.
 */
export function loadedChunk(): ModelChunk | null {
    return loaded;
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

/**
 * Load a model's files into a container that is not in the scene yet: glTF animations do not
 * start, vertex colors are read, and the file's cameras and lights are dropped.
 * @param scene - The scene.
 * @param files - The file set, by path relative to the main file's folder.
 * @param main - The main file's path.
 * @param format - Its detected format.
 * @param skipped - Parts drawn without: a picture is a 1 x 1 white PNG, and an OBJ's MTL lines naming it are dropped.
 * @param withoutPictures - Pictures drawn without, by their summary names: the parts that drew one draw plain.
 * @returns The container.
 * @throws {ModelLoadFailure} With `E_MODEL_FORMAT_UNSUPPORTED`, `E_MODEL_EXTERNAL_URL`, `E_MODEL_STRUCTURE`,
 *     `E_MODEL_DECODER_UNAVAILABLE` or `E_MODEL_PARSE`.
 */
export async function loadModel(
    scene: Scene,
    files: ReadonlyMap<string, Uint8Array>,
    main: string,
    format: string,
    skipped: readonly string[] = [],
    withoutPictures: readonly string[] = [],
): Promise<AssetContainer> {
    let models: typeof import("babylonjs-models");
    let own: ModelChunk;
    try {
        [models, own] = await Promise.all([import("babylonjs-models"), loadChunk()]);
    } catch {
        throw new ModelLoadFailure({ code: "E_MODEL_PARSE", params: { format } });
    }

    own.pinPbrShaders();
    try {
        return await models.loadModelFiles(scene, files, main, format, {
            ...own.LOAD_OPTIONS,
            skipped,
            withoutPictures,
        });
    } catch (error) {
        throw new ModelLoadFailure(
            error instanceof models.ModelError ? error.fact : { code: "E_MODEL_PARSE", params: { format } },
        );
    }
}
