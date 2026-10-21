/**
 * @file The shared bloom pass (design/rendering/shader-styles.md sections 1 and 5): one glow
 * layer per scene, allocated while any style layer names a shader that declares `bloom` (a
 * lantern, comets, fiber), whether or not such a shader is on screen, and released when none
 * does. Each batch drawing a bloom shader is drawn into it with its own material, blurred, and
 * added over the graph's own rendering group, so labels drawn after it stay sharp.
 *
 * The batches note their meshes here as they are built (`noteBloomMesh`), before or after the pass
 * exists; the pass takes every noted mesh when it is made.
 *
 * ponytail: the bloom map is not shared with the node glow (a highlight layer, not a glow layer);
 * share it if both on at once ever measures too costly on an iPad.
 */

import { type AbstractMesh, GlowLayer, type Mesh, type Observer, type Scene } from "@babylonjs/core";

import { QUALITY_LEVELS, type QualityLevel } from "../managers/ShaderGuard";

/** The glow layer's name. */
export const BLOOM_LAYER = "graphty-shader-bloom";

/** The bloom map's size as a fraction of the canvas, before the quality level's scale. */
const BLOOM_RATIO = 0.5;

/** The blur's kernel, in bloom-map texels, by quality level. */
const BLOOM_KERNEL = { low: 24, medium: 40, high: 64 } as const;

/** How bright the added bloom is. */
const BLOOM_INTENSITY = 1.2;

/**
 * The canvas luminance (0..1, Rec. 709) above which the bloom is not drawn: it is added light, so
 * on a light canvas it only washes the graph out.
 */
const LIGHT_CANVAS = 0.5;

/** The rendering group the bloom is added after: the graph's own, so labels stay over it. */
const GRAPH_RENDERING_GROUP = 0;

/** The meshes drawing a bloom shader, by scene. */
const BLOOM_MESHES = new WeakMap<Scene, Set<Mesh>>();

/** Each scene's pass. */
const PASSES = new WeakMap<Scene, BloomPass>();

/**
 * Note that a mesh draws a bloom shader, so the scene's bloom pass draws it.
 * @param scene - The scene.
 * @param mesh - The mesh; forgotten when it is disposed.
 */
export function noteBloomMesh(scene: Scene, mesh: Mesh): void {
    let meshes = BLOOM_MESHES.get(scene);
    if (meshes === undefined) {
        meshes = new Set();
        BLOOM_MESHES.set(scene, meshes);
    }

    meshes.add(mesh);
    mesh.onDisposeObservable.addOnce(() => {
        meshes.delete(mesh);
    });
    PASSES.get(scene)?.include(mesh);
}

/** The bloom pass of one scene. */
export class BloomPass {
    /** The glow layer: its textures are allocated as it is made. */
    readonly glow: GlowLayer;
    /** The meshes drawn into it. */
    private readonly included = new Set<Mesh>();
    /**
     * The bloom map's render list: exactly {@link included}. Without one the glow layer's target
     * walks every mesh of the scene each frame to find the few it draws.
     */
    private readonly renderList: AbstractMesh[] = [];
    private readonly canvasObserver: Observer<Scene>;
    private disposed = false;

    /**
     * Allocate a scene's bloom.
     * @param scene - The scene.
     * @param level - The shader quality level, which sizes the bloom map and its blur.
     */
    private constructor(
        private readonly scene: Scene,
        level: QualityLevel,
    ) {
        this.glow = new GlowLayer(BLOOM_LAYER, scene, {
            mainTextureRatio: BLOOM_RATIO * QUALITY_LEVELS[level].targetScale,
            blurKernelSize: BLOOM_KERNEL[level],
            renderingGroupId: GRAPH_RENDERING_GROUP,
            // With no bloom mesh yet, draw nothing rather than everything.
            excludeByDefault: true,
        });
        this.glow.intensity = BLOOM_INTENSITY;
        this.glow.mainTexture.renderList = this.renderList;
        for (const mesh of BLOOM_MESHES.get(scene) ?? []) {
            this.include(mesh);
        }

        this.followCanvas();
        this.canvasObserver = scene.onBeforeRenderObservable.add(() => {
            this.followCanvas();
        });
    }

    /** Draw the bloom only on a dark canvas. */
    private followCanvas(): void {
        const { r, g, b } = this.scene.clearColor;
        this.glow.isEnabled = 0.2126 * r + 0.7152 * g + 0.0722 * b <= LIGHT_CANVAS;
    }

    /**
     * The scene's bloom pass, allocated the first time.
     * @param scene - The scene.
     * @param level - The quality level it is allocated at.
     * @returns The pass.
     */
    static of(scene: Scene, level: QualityLevel): BloomPass {
        let pass = PASSES.get(scene);
        if (pass === undefined) {
            pass = new BloomPass(scene, level);
            PASSES.set(scene, pass);
        }

        return pass;
    }

    /**
     * The scene's bloom pass when one is allocated.
     * @param scene - The scene.
     * @returns The pass, or undefined.
     */
    static peek(scene: Scene): BloomPass | undefined {
        return PASSES.get(scene);
    }

    /**
     * Draw a mesh into the bloom with its own material.
     * @param mesh - The mesh.
     */
    include(mesh: Mesh): void {
        if (this.disposed || this.included.has(mesh)) {
            return;
        }

        this.included.add(mesh);
        this.renderList.push(mesh);
        this.glow.addIncludedOnlyMesh(mesh);
        this.glow.referenceMeshToUseItsOwnMaterial(mesh);
        mesh.onDisposeObservable.addOnce(() => {
            this.included.delete(mesh);
            const at = this.renderList.indexOf(mesh);
            if (at >= 0) {
                this.renderList.splice(at, 1);
            }
        });
    }

    /** Release the glow layer and its textures. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.scene.onBeforeRenderObservable.remove(this.canvasObserver);
        PASSES.delete(this.scene);
        this.glow.dispose();
    }
}
