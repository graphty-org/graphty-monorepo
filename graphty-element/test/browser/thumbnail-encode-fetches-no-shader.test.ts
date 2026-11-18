/**
 * @file A node thumbnail encodes without fetching a shader.
 *
 * Babylon.js encodes a captured picture on its own dump engine with the "postprocess" vertex
 * shader, looked up by name. Since Babylon.js 9 nothing on that import path registers the shader,
 * so a capture taken before some other module happened to load it fetched the name as a URL, got
 * the app's HTML page back, failed to compile and never resolved. The capture module registers it.
 */

import { ShaderStore } from "@babylonjs/core/Engines/shaderStore.js";
import { EncodeImageAsync } from "@babylonjs/core/Misc/dumpTools.js";
import { assert, describe, it } from "vitest";

import { ScreenshotCapture } from "../../src/screenshot/ScreenshotCapture";

describe("encoding a captured picture", () => {
    it("finds Babylon's postprocess vertex shader already registered", () => {
        assert.isDefined(ScreenshotCapture);
        assert.isString(ShaderStore.ShadersStore.postprocessVertexShader);
    });

    it("resolves to a PNG", async () => {
        const blob = await EncodeImageAsync(new Uint8Array(4 * 4 * 4).fill(255), 4, 4, "image/png");
        assert.strictEqual(blob.type, "image/png");
        assert.isAbove(blob.size, 0);
    });
});
