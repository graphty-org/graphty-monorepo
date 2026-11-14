/**
 * The model decoders ship inside graphty-element and nothing names Babylon's CDN for them: the
 * library build writes the Draco decoder and the KTX2 transcoders beside the chunks that load
 * them, and `./bundle` beside itself; the decoder chunks reference those files and no
 * cdn.babylonjs.com address; THIRD-PARTY-LICENSES.txt carries their notices. Build first
 * (`npm run build`).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const DIST = fileURLToPath(new URL("../../dist", import.meta.url));
const CHUNKS = join(DIST, "chunks");
const DECODER_FILES = [
    "draco_decoder_gltf",
    "draco_wasm_wrapper_gltf",
    "msc_basis_transcoder",
    "uastc_astc",
    "uastc_bc7",
    "uastc_r8_unorm",
    "uastc_rg8_unorm",
    "uastc_rgba8_srgb_v2",
    "uastc_rgba8_unorm_v2",
    "zstddec",
];

describe("model decoders in the package", () => {
    it("are written beside the library's chunks and beside ./bundle", () => {
        assert.isTrue(existsSync(CHUNKS), "run npm run build first");
        const chunks = readdirSync(CHUNKS);
        const top = readdirSync(DIST);
        for (const name of DECODER_FILES) {
            assert.isTrue(
                chunks.some((f) => f.startsWith(`${name}-`)),
                `dist/chunks holds ${name}`,
            );
            assert.isTrue(
                top.some((f) => f.startsWith(`${name}.`)),
                `dist holds ${name} for ./bundle`,
            );
        }
    });

    it("are loaded from those files, never from Babylon's CDN", () => {
        const chunks = readdirSync(CHUNKS);
        for (const prefix of ["draco-", "meshopt-", "ktx2-"]) {
            const file = chunks.find((f) => f.startsWith(prefix) && f.endsWith(".js"));
            assert.isDefined(file, `a ${prefix} chunk`);
            const code = readFileSync(join(CHUNKS, file), "utf8");
            assert.notInclude(code, "babylonjs.com", file);
            if (prefix !== "meshopt-") {
                assert.match(code, /new URL\("[\w-]+\.(?:wasm|js)", import\.meta\.url\)/, file);
            }
        }
    });

    it("carry their notices in THIRD-PARTY-LICENSES.txt", () => {
        const text = readFileSync(join(DIST, "THIRD-PARTY-LICENSES.txt"), "utf8");
        assert.include(text, "src/models/decoders/vendor/draco");
        assert.include(text, "src/models/decoders/vendor/ktx2");
    });
});
