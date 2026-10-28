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

import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/ShadersWGSL/default.vertex";
import "@babylonjs/core/ShadersWGSL/default.fragment";

import { type Material, type Scene, ShaderStore, StandardMaterial } from "@babylonjs/core";

/** The shaders StandardMaterial would otherwise import lazily, by ShaderStore key. */
const DEFAULT_SHADERS = ["defaultVertexShader", "defaultPixelShader"] as const;

/** The scenes whose materials of a class skip the lazy import, by the class's prototype. */
const pinnedScenes = new WeakMap<object, WeakSet<Scene>>();

/**
 * Whether both shader languages' default shaders are in the ShaderStore.
 * @returns True when no StandardMaterial needs to import them.
 */
function defaultShadersStored(): boolean {
    return DEFAULT_SHADERS.every((key) => key in ShaderStore.ShadersStore && key in ShaderStore.ShadersStoreWGSL);
}

/**
 * Make every material of `materialClass` in `scene` report its shaders as loaded from the moment
 * it is constructed, so Babylon never runs its lazy shader `import()` for it.
 *
 * Babylon keeps the flag in a private field, `_shadersLoaded`, that the class's constructor sets
 * to false and the first compile reads. Pinning it from `scene.onNewMaterialAddedObservable` is too
 * late: Babylon 8 announces a new material with `Tools.SetImmediate`, a later task, and a material
 * made in an update pass is compiled by the render that follows in the same task -- with the flag
 * still false, so it imported anyway and was not ready for that frame. So the flag is an accessor
 * on the class's prototype instead, which the constructor's write already goes through: it reads
 * true for a material of a pinned scene and keeps Babylon's own value for every other scene.
 * @param materialClass - The material class, whose prototype gets the accessor once.
 * @param scene - The scene whose materials are pinned.
 */
export function pinShadersLoaded(materialClass: { readonly prototype: Material }, scene: Scene): void {
    let scenes = pinnedScenes.get(materialClass.prototype);
    if (scenes === undefined) {
        const pinned = new WeakSet<Scene>();
        const own = new WeakMap<Material, boolean>();
        scenes = pinned;
        pinnedScenes.set(materialClass.prototype, pinned);
        Object.defineProperty(materialClass.prototype, "_shadersLoaded", {
            configurable: true,
            get(this: Material): boolean {
                return pinned.has(this.getScene()) || own.get(this) === true;
            },
            set(this: Material, value: boolean) {
                own.set(this, value);
            },
        });
    }
    scenes.add(scene);
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
