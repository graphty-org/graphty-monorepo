/**
 * Copies the decoders' WebAssembly and their loaders into dist/wasm/ after tsc: Google's glTF
 * build of the Draco decoder from three.js (a devDependency) and the KTX2 transcoders from
 * the ktx2decoder package of Babylon.js. src/decoders/ finds them there with `new URL("../wasm/<file>",
 * import.meta.url)`. licenses/ names where each comes from and carries its license.
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The packages' own folders: neither exports the files below, so they are read from disk.
const modules = fileURLToPath(new URL("../node_modules/", import.meta.url));
const out = fileURLToPath(new URL("../dist/wasm/", import.meta.url));
const draco = join(modules, "three/examples/jsm/libs/draco/gltf");
const ktx2 = join(modules, "@babylonjs/ktx2decoder/wasm");

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
];

mkdirSync(out, { recursive: true });
for (const [dir, name] of FILES) {
    copyFileSync(join(dir, name), join(out, name));
}
