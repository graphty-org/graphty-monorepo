import type { Scene, ShaderMaterial } from "@babylonjs/core";

/**
 * Called once per frame for one scene, with the shader materials that scene draws.
 */
type RefreshFn = (scene: Scene, materials: Iterable<ShaderMaterial>) => void;

/**
 * Shader materials grouped by the scene that draws them, each group refreshed by an observer on
 * its OWN scene, just before that scene renders.
 *
 * WHY THIS EXISTS -- the defect it repairs (issue #45): the line, arrowhead and pattern renderers
 * push per-frame uniforms (the render resolution, the camera position) into their shader
 * materials. Each kept those materials in one static set shared by every `<graphty-element>` on
 * the page, and registered its per-frame observer either once per page (on whichever scene came
 * first) or once per scene switch. So a second element's arrowheads billboarded towards the
 * FIRST element's camera, an element created after the first was disposed got no camera
 * position at all, and each scene's observer walked every other scene's materials.
 *
 * Here each scene gets its own set and its own observer, which reads that scene's own engine and
 * camera. A material leaves its set when it is disposed, and a scene's set and observer go when
 * the scene is disposed, so nothing outlives the element that drew it.
 */
export class PerSceneMaterials {
    private readonly scenes = new Map<Scene, Set<ShaderMaterial>>();

    /**
     * Track materials whose uniforms `refresh` writes once per frame.
     * @param refresh - Writes the per-frame uniforms of one scene's materials
     */
    constructor(private readonly refresh: RefreshFn) {}

    /**
     * Track a material under its own scene and give it its uniforms now, so it draws correctly
     * even on the first frame.
     * @param material - The shader material to keep refreshed
     */
    add(material: ShaderMaterial): void {
        const scene = material.getScene();
        const materials = this.materialsOf(scene);
        materials.add(material);
        material.onDisposeObservable.addOnce(() => materials.delete(material));
        this.refresh(scene, [material]);
    }

    /**
     * Stop refreshing a material. Disposing the material does this on its own.
     * @param material - The material to forget; an untracked material is a no-op
     */
    delete(material: ShaderMaterial): void {
        for (const materials of this.scenes.values()) {
            materials.delete(material);
        }
    }

    /**
     * Number of tracked materials.
     * @param scene - Count only this scene's materials; omit for every scene
     * @returns How many materials are refreshed each frame
     */
    count(scene?: Scene): number {
        if (scene) {
            return this.scenes.get(scene)?.size ?? 0;
        }

        let total = 0;
        for (const materials of this.scenes.values()) {
            total += materials.size;
        }

        return total;
    }

    private materialsOf(scene: Scene): Set<ShaderMaterial> {
        const existing = this.scenes.get(scene);
        if (existing) {
            return existing;
        }

        const materials = new Set<ShaderMaterial>();
        this.scenes.set(scene, materials);

        const observer = scene.onBeforeRenderObservable.add(() => {
            this.refresh(scene, materials);
        });
        scene.onDisposeObservable.addOnce(() => {
            scene.onBeforeRenderObservable.remove(observer);
            this.scenes.delete(scene);
        });

        return materials;
    }
}
