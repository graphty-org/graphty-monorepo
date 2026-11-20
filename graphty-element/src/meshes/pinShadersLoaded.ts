/**
 * @file The flag that tells Babylon.js a material class's shaders are already loaded.
 *
 * Kept apart from bundledStandardShaders.ts, with no run-time import at all, because the lazily
 * loaded models chunk (src/models/chunk.ts) uses it too: importing the Babylon.js barrel from that
 * chunk made the bundler run part of the loaders before the scene loader's own module had run, and
 * every Storybook failed to load ("Cannot set properties of undefined (setting '.gltf')").
 */

/** One shader language's state in Babylon's loader. */
interface LoaderState {
    loaded: boolean;
}

/**
 * A Babylon material class as Babylon.js 9 builds it: one private static loader per class that
 * runs the shader `import()`s on the class's first compile in each language, and skips them once
 * it marks that language loaded.
 */
interface MaterialClass {
    readonly _ShaderLoader?: { readonly _webGL: LoaderState; readonly _webGPU: LoaderState };
}

/**
 * Make every material of `materialClass` report its shaders as loaded, so Babylon never runs its
 * lazy shader `import()` for it. Call it only once the shaders of both languages are in the
 * ShaderStore: the import Babylon skips would only have put them there.
 *
 * Babylon.js 9 keeps the flag per class, so a material made in an update pass and drawn by the
 * render that follows in the same task compiles at once; before, the class's first material
 * waited for the import, and a failed import (iPad Safari on a dev server, a chunk gone after a
 * redeploy) left it never ready. Babylon 8 kept the flag on each material, pinned there per scene
 * until this file was rewritten for 9. test/browser/node-shaders-load-up-front.test.ts fails if
 * Babylon moves the flag again.
 * @param materialClass - The material class (StandardMaterial, PBRMaterial).
 */
export function pinShadersLoaded(materialClass: object): void {
    const loader = (materialClass as MaterialClass)._ShaderLoader;
    if (loader !== undefined) {
        loader._webGL.loaded = true;
        loader._webGPU.loaded = true;
    }
}
