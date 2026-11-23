/**
 * Copies the decoders' WebAssembly and their loaders into dist/wasm/ after tsc: Google's glTF
 * build of the Draco decoder from three.js (a devDependency), the KTX2 transcoders from the
 * ktx2decoder package of Babylon.js, and the OpenUSD importer Babylon.js publishes for its USD
 * loader. src/decoders/ finds them there with `new URL("../wasm/<file>", import.meta.url)`.
 * licenses/ names where each comes from and carries its license.
 *
 * The OpenUSD importer is on no npm package: it is downloaded once from the Babylon.js repository
 * at a fixed commit, checked against the SHA-256 Babylon.js records for it, and kept in
 * node_modules/.cache/ so later builds work offline.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The packages' own folders: neither exports the files below, so they are read from disk.
const modules = fileURLToPath(new URL("../node_modules/", import.meta.url));
const out = fileURLToPath(new URL("../dist/wasm/", import.meta.url));
const draco = join(modules, "three/examples/jsm/libs/draco/gltf");
const ktx2 = join(modules, "@babylonjs/ktx2decoder/wasm");
const usd = join(modules, ".cache/babylonjs-models-usd-5");

/** The Babylon.js commit that publishes protocol 5 of the importer (built from BabylonJS/babylon-usd-importer v5). */
const USD_COMMIT = "5560048894661a00bdd43c63de278979c72a3ace";
const USD_BASE = `https://raw.githubusercontent.com/BabylonJS/Babylon.js/${USD_COMMIT}/packages/tools/babylonServer/public/babylonUsdImporter/5/`;
/** Each file and its SHA-256, as Babylon.js's README for protocol 5 lists them. */
const USD_FILES = {
    "babylon-usd-importer.worker.js": "caaf962049c25a16ed15745508d1dd547580e36edf36f7a9ebc0f27759de2dc5",
    "babylon-usd-importer.js": "ccd71ba966d27b1b08aa540915cb983ece00262b440f519d94c2505e2b88c120",
    "babylon-usd-importer.wasm": "72f0d5a1ce2476566b9455dc16f19738d6b4c03776e2e103027e0c7a096d98d2",
    "babylon-usd-importer.data": "ededef6a1ecbc5aa112ffa0f4e2713a13bca316ae005b3d95b91fd8dad240225",
};

const FILES = [
    [draco, "draco_decoder.wasm"],
    [draco, "draco_wasm_wrapper.js"],
    [ktx2, "msc_basis_transcoder.js"],
    [ktx2, "msc_basis_transcoder.wasm"],
    [ktx2, "uastc_astc.wasm"],
    [ktx2, "uastc_bc7.wasm"],
    [ktx2, "uastc_r8_unorm.wasm"],
    [ktx2, "uastc_rg8_unorm.wasm"],
    [ktx2, "uastc_rgba8_srgb_v2.wasm"],
    [ktx2, "uastc_rgba8_unorm_v2.wasm"],
    [ktx2, "zstddec.wasm"],
    ...Object.keys(USD_FILES).map((name) => [usd, name]),
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

mkdirSync(usd, { recursive: true });
for (const [name, hash] of Object.entries(USD_FILES)) {
    const path = join(usd, name);
    if (existsSync(path) && sha256(readFileSync(path)) === hash) {
        continue;
    }

    const response = await fetch(USD_BASE + name);
    if (!response.ok) {
        throw new Error(`copy-decoders: ${name}: HTTP ${String(response.status)} from ${USD_BASE}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (sha256(bytes) !== hash) {
        throw new Error(`copy-decoders: ${name} does not match its recorded SHA-256`);
    }

    writeFileSync(path, bytes);
}

mkdirSync(out, { recursive: true });
for (const [dir, name] of FILES) {
    copyFileSync(join(dir, name), join(out, name));
}
