/**
 * Every glTF extension Babylon.js's loader ships is either registered by babylonjs-models or left
 * out for a reason src/load/loaders.ts gives, so a Babylon.js upgrade that adds one makes this
 * test name it, and registering it or leaving it out is a decision.
 */

import "../src/load/loaders.js";
import "../src/decoders/draco.js";
import "../src/decoders/ktx2.js";
import "../src/decoders/meshopt.js";

import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { registeredGLTFExtensions } from "@babylonjs/loaders/glTF/2.0/glTFLoaderExtensionRegistry.js";
import { assert, describe, it } from "vitest";

/** Left out, each for the reason src/load/loaders.ts gives. */
const LEFT_OUT = [
    "KHR_gaussian_splatting",
    "KHR_gaussian_splatting_compression_spz",
    "KHR_materials_transmission",
    "KHR_materials_volume",
    "KHR_materials_dispersion",
    "KHR_materials_diffuse_transmission",
    "KHR_materials_volume_scatter",
    "EXT_lights_area",
    "EXT_lights_image_based",
    "KHR_interactivity",
    "KHR_node_hoverability",
    "KHR_node_selectability",
    "MSFT_audio_emitter",
    "MSFT_lod",
];

/**
 * The extensions Babylon.js's glTF 2.0 loader ships, one module each.
 * @returns Their names.
 */
function shipped(): string[] {
    const loader = createRequire(import.meta.url).resolve("@babylonjs/loaders/package.json");
    const folder = join(dirname(loader), "glTF/2.0/Extensions");
    return readdirSync(folder)
        .filter((file) => /^(?:KHR|EXT|MSFT)_\w+\.js$/.test(file))
        .map((file) => file.slice(0, -3));
}

describe("glTF extensions", () => {
    it("are each registered, or left out for a stated reason", () => {
        const all = shipped();
        assert.isAbove(all.length, 40, "Babylon's extensions were found");
        const neither = all.filter((name) => !registeredGLTFExtensions.has(name) && !LEFT_OUT.includes(name));
        assert.deepStrictEqual(neither, [], "registered by src/load/loaders.ts, or left out with a reason there");
        const both = LEFT_OUT.filter((name) => registeredGLTFExtensions.has(name));
        assert.deepStrictEqual(both, [], "left out, yet registered");
    });
});
