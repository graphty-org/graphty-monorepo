/**
 * The decoders ship inside the package and nothing names Babylon's CDN for them: the build copies
 * the Draco decoder and the KTX2 transcoders into dist/wasm/, the decoder modules find them there
 * with `new URL("../wasm/<file>", import.meta.url)` (which a consumer's bundler copies into its
 * build), and their licenses are in licenses/. Build first (`npm run build`).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { configureDecoders, decoderFile } from "../src/decoders/config.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(ROOT, "dist");
const DECODER_FILES = [
    "draco_decoder.wasm",
    "draco_wasm_wrapper.js",
    "msc_basis_transcoder.js",
    "msc_basis_transcoder.wasm",
    "uastc_astc.wasm",
    "uastc_bc7.wasm",
    "uastc_r8_unorm.wasm",
    "uastc_rg8_unorm.wasm",
    "uastc_rgba8_srgb_v2.wasm",
    "uastc_rgba8_unorm_v2.wasm",
    "zstddec.wasm",
    "babylon-usd-importer.worker.js",
    "babylon-usd-importer.js",
    "babylon-usd-importer.wasm",
    "babylon-usd-importer.data",
];

describe("the decoders in the package", () => {
    it("are copied into dist/wasm", () => {
        assert.isTrue(existsSync(DIST), "run npm run build first");
        assert.sameMembers(readdirSync(join(DIST, "wasm")), DECODER_FILES);
    });

    it("are loaded from those files, never from Babylon's CDN", () => {
        for (const name of ["draco", "ktx2", "meshopt", "usd"]) {
            // The code, without the comments that say what Babylon would fetch by default.
            const code = readFileSync(join(DIST, "decoders", `${name}.js`), "utf8")
                .replaceAll(/\/\*[\s\S]*?\*\//g, "")
                .replaceAll(/^\s*\/\/.*$/gm, "");
            assert.notInclude(code, "babylonjs.com", name);
            assert.include(code, "export const available = true", name);
        }
        const named = ["draco", "ktx2", "usd"].flatMap((name) =>
            [
                ...readFileSync(join(DIST, "decoders", `${name}.js`), "utf8").matchAll(
                    /new URL\("\.\.\/wasm\/([\w.-]+)", import\.meta\.url\)/g,
                ),
            ].map((m) => m[1]),
        );
        assert.sameMembers(named, DECODER_FILES);
    });

    it("are declared side effects, so a bundler keeps their registrations", () => {
        // Each decoder configures Babylon and registers a glTF extension when imported, and
        // exports nothing else a caller uses: a build told it is pure empties it, and a compressed
        // model then fails to draw from the package while every test of the source passes.
        const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { sideEffects: string[] };
        for (const name of ["draco", "ktx2", "meshopt"]) {
            assert.include(manifest.sideEffects, `./dist/decoders/${name}.js`);
        }
        assert.include(manifest.sideEffects, "./dist/load/loaders.js");
    });

    it("carry their licenses in the published files", () => {
        const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { files: string[] };
        assert.include(manifest.files, "licenses/");
        for (const name of ["draco", "ktx2"]) {
            assert.isTrue(existsSync(join(ROOT, "licenses", name, "LICENSE.md")), name);
        }
        for (const name of [
            "README.md",
            "LICENSE-babylon-usd-importer.md",
            "LICENSE-openusd.txt",
            "LICENSE-onetbb.txt",
            "LICENSE-zlib.txt",
        ]) {
            assert.isTrue(existsSync(join(ROOT, "licenses", "openusd", name)), name);
        }
    });

    it("are found at a configured base URL instead, when a page serves them elsewhere", () => {
        const packaged = new URL("https://cdn.example/pkg/dist/wasm/zstddec.wasm");
        assert.strictEqual(decoderFile("zstddec.wasm", packaged), packaged.href);
        configureDecoders({ baseUrl: "https://static.example/decoders" });
        try {
            assert.strictEqual(decoderFile("zstddec.wasm", packaged), "https://static.example/decoders/zstddec.wasm");
        } finally {
            configureDecoders({ baseUrl: undefined });
        }
    });
});
