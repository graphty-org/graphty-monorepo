/**
 * The model decoders are babylonjs-models' files, not graphty-element's: the library build leaves
 * babylonjs-models to the consumer's installer (it is a dependency), so no decoder file is written
 * beside graphty-element's chunks, and `./bundle`, one file, carries neither the Draco decoder nor
 * the KTX2 transcoders (vite.bundle.config.ts). babylonjs-models' own tests check that it ships
 * them. Build first (`npm run build`).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const DIST = fileURLToPath(new URL("../../dist", import.meta.url));
const CHUNKS = join(DIST, "chunks");
const DECODER_FILES = ["draco_decoder", "draco_wasm_wrapper", "msc_basis_transcoder", "uastc_", "zstddec"];

describe("model decoders in the package", () => {
    it("are not copied beside the library's chunks or ./bundle", () => {
        assert.isTrue(existsSync(CHUNKS), "run npm run build first");
        const files = [...readdirSync(CHUNKS), ...readdirSync(DIST)];
        for (const name of DECODER_FILES) {
            assert.isFalse(
                files.some((f) => f.startsWith(name)),
                `dist holds ${name}`,
            );
        }
    });

    it("are loaded through babylonjs-models, never from Babylon's CDN", () => {
        const chunks = readdirSync(CHUNKS).filter((f) => f.endsWith(".js"));
        const loading = chunks.filter((f) =>
            readFileSync(join(CHUNKS, f), "utf8").includes('import("babylonjs-models")'),
        );
        assert.isNotEmpty(loading, "a chunk imports babylonjs-models when a model first draws");
    });

    it("are left out of ./bundle", () => {
        const bundle = readFileSync(join(DIST, "graphty.bundle.js"), "utf8");
        assert.notInclude(bundle, "draco_decoder.wasm");
        assert.notInclude(bundle, "msc_basis_transcoder");
    });
});
