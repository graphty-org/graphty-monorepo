/**
 * @file The flag that tells Babylon.js a material's shaders are already loaded, pinned per scene.
 *
 * Kept apart from bundledStandardShaders.ts, with no run-time import at all, because the lazily
 * loaded models chunk (src/models/chunk.ts) uses it too: importing the Babylon.js barrel from that
 * chunk made the bundler run part of the loaders before the scene loader's own module had run, and
 * every Storybook failed to load ("Cannot set properties of undefined (setting '.gltf')").
 */

import type { Material, Scene } from "@babylonjs/core";

/** A Babylon material class, by the prototype its instances share. */
interface MaterialClass {
    readonly prototype: Material;
}

/** The scenes whose materials of a class skip the lazy import, by the class's prototype. */
const pinnedScenes = new WeakMap<object, WeakSet<Scene>>();

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
export function pinShadersLoaded(materialClass: MaterialClass, scene: Scene): void {
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
