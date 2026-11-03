/**
 * @file Every StandardMaterial in the element's scene uses the shaders loaded with the element,
 * never a lazy `import()` at draw time.
 *
 * Babylon.js's StandardMaterial runs `import("../Shaders/default.vertex.js")` (and the fragment,
 * or their WGSL twins) the first time each material compiles, even when the shader is already in
 * the ShaderStore. A bundler turns that into a fetch of a separate chunk. When that fetch fails --
 * iPad Safari on a Vite dev server reports "Importing a module script failed", and a production
 * tab left open across a redeploy asks for a hashed chunk that no longer exists -- the material
 * never becomes ready and no node is drawn, with no error from the element.
 *
 * The side-effect imports below put both shader languages' default shaders in the ShaderStore with
 * the element itself, and {@link useBundledStandardShaders} marks each StandardMaterial created in
 * the scene as already loaded from the moment it is constructed, so Babylon skips the `import()`.
 */

import "@babylonjs/core/Shaders/default.vertex.js";
import "@babylonjs/core/Shaders/default.fragment.js";
import "@babylonjs/core/ShadersWGSL/default.vertex.js";
import "@babylonjs/core/ShadersWGSL/default.fragment.js";

import { type Scene, ShaderStore, StandardMaterial } from "@babylonjs/core";

import { pinShadersLoaded } from "./pinShadersLoaded";

/** The shaders StandardMaterial would otherwise import lazily, by ShaderStore key. */
const DEFAULT_SHADERS = ["defaultVertexShader", "defaultPixelShader"] as const;

/**
 * Whether both shader languages' default shaders are in the ShaderStore.
 * @returns True when no StandardMaterial needs to import them.
 */
function defaultShadersStored(): boolean {
    return DEFAULT_SHADERS.every((key) => key in ShaderStore.ShadersStore && key in ShaderStore.ShadersStoreWGSL);
}

/**
 * Make every StandardMaterial created in `scene` skip Babylon's lazy shader import.
 * @param scene - The scene whose materials are pinned.
 */
export function useBundledStandardShaders(scene: Scene): void {
    if (defaultShadersStored()) {
        pinShadersLoaded(StandardMaterial, scene);
    }
}
