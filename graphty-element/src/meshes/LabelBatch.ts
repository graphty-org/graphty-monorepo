/**
 * @file Building and disposing labels at a cost that does not grow with the scene (issue #2762).
 *
 * Every label is a plane with its own `StandardMaterial` and `DynamicTexture`, and Babylon keeps
 * each of those in a scene-wide or engine-wide list it searches one item at a time: a new material
 * searches the engine's uniform buffers for the one it replaces, a material setter or a texture's
 * `hasAlpha` walks every mesh or every material to mark the ones using it, and disposing a label
 * takes its mesh, its material's uniform buffer and image-processing observer, its texture and its
 * texture's GPU texture out of five lists by `indexOf`. A frame that draws or removes a label on
 * every node did that once per label, so N labels cost about N x N.
 */
import {
    type AbstractMesh,
    type BaseTexture,
    Constants,
    type DynamicTexture,
    type ImageProcessingConfiguration,
    type InternalTexture,
    type Material,
    type Observer,
    type Scene,
    type StandardMaterial,
    type UniformBuffer,
} from "@babylonjs/core";

/** What one label owns in the scene: the three things its disposal hands back. */
export interface LabelResources {
    readonly mesh: AbstractMesh | null;
    readonly material: StandardMaterial | null;
    readonly texture: DynamicTexture | null;
}

/** The labels disposed while {@link disposeLabelsTogether} runs, released when it ends. */
let pending: LabelResources[] | null = null;

/**
 * Build a material without the search Babylon's `Material` constructor makes: it creates a
 * uniform buffer, disposes it again at once, and finds it in the engine's list of every uniform
 * buffer by `indexOf`, from the start, while it sits at the end. Built against an empty list, the
 * search is one step; what it added is then appended to the real list.
 * @param scene - The scene the material belongs to.
 * @param build - Constructs the material.
 * @returns The material.
 */
export function buildMaterial<T>(scene: Scene, build: () => T): T {
    const engine = scene.getEngine();
    const buffers = engine._uniformBuffers;
    engine._uniformBuffers = [];
    try {
        return build();
    } finally {
        const added = engine._uniformBuffers;
        engine._uniformBuffers = buffers;
        for (const buffer of added) {
            buffers.push(buffer);
        }
    }
}

/**
 * Set up a material nothing draws yet without marking anything dirty. Each define-changing
 * setter (a texture, `backFaceCulling`, `useAlphaFromDiffuseTexture`) walks every submesh of
 * every mesh in the scene for the ones drawn with this material; a brand-new material has none,
 * so the walk finds nothing. The mechanism is blocked while `setup` runs and then switched back on
 * without the `markDirty` that switching it on through the setter makes, which would walk the
 * scene once more for the same nothing. Every later change marks dirty as usual.
 * @param material - A material no mesh has drawn yet.
 * @param setup - Writes its properties.
 */
export function setUpQuietly(material: Material, setup: () => void): void {
    material.blockDirtyMechanism = true;
    try {
        setup();
    } finally {
        // Read through a plain shape: the field is private, and its setter is what walks.
        (material as unknown as { _blockDirtyMechanism: boolean })._blockDirtyMechanism = false;
    }
}

/**
 * Unfreeze the material of a mesh that is the only one drawing with it, marking only that mesh's
 * submeshes dirty. `Material.unfreeze` marks dirty by walking every submesh of every mesh in the
 * scene for the ones drawn with the material, whatever `blockDirtyMechanism` says, so unfreezing
 * one node's source material cost the size of the graph (issue #2894).
 * @param mesh - The one mesh drawn with `material`: a node's source mesh, whose instances draw
 * through it.
 * @param material - Its material.
 */
export function unfreezeFor(mesh: AbstractMesh, material: Material): void {
    const scene = mesh.getScene();
    const { meshes } = scene;
    scene.meshes = [mesh];
    try {
        material.unfreeze();
    } finally {
        scene.meshes = meshes;
    }
}

/**
 * Give a texture no material uses yet an alpha channel without the walk the `hasAlpha` setter
 * makes over every material in the scene, looking for the ones that use it.
 * @param scene - The texture's scene.
 * @param texture - A texture no material uses yet.
 */
export function giveAlphaQuietly(scene: Scene, texture: BaseTexture): void {
    const { materials } = scene;
    scene.materials = [];
    try {
        texture.hasAlpha = true;
    } finally {
        scene.materials = materials;
    }
}

/**
 * How a texture drawn on a 2D canvas with see-through parts (a label's words, an annotation) is
 * blended: COLOR = SRC + (1 - SRC_ALPHA) DEST, for a texture uploaded with its colors already
 * multiplied by their alpha ({@link uploadPremultiplied}).
 *
 * NOT `ALPHA_COMBINE` OVER A STRAIGHT-ALPHA UPLOAD. A canvas keeps no color where it is fully
 * see-through, so a straight-alpha upload holds black there, and the smaller mip levels a label
 * far from the camera is drawn from average that black into every letter's edge: white words on a
 * light background were drawn as dark smudges, and dark words a third heavier than the program
 * that wrote the file draws them. Averaged premultiplied, the edges keep the words' own color.
 */
export const PREMULTIPLIED_ALPHA_MODE = Constants.ALPHA_SRC_DSTONEMINUSSRCALPHA;

/**
 * Upload what was drawn on a dynamic texture's canvas with its colors multiplied by their alpha;
 * draw it with {@link PREMULTIPLIED_ALPHA_MODE}.
 * @param texture - The texture.
 */
export function uploadPremultiplied(texture: DynamicTexture): void {
    texture.update(undefined, true);
}

/**
 * Hand a disposed label's resources to the batch {@link disposeLabelsTogether} is running, if one
 * is, to be released with every other label disposed in it.
 * @param resources - The label's mesh, material and texture.
 * @returns Whether a batch took them; when not, the caller disposes them itself.
 */
export function deferLabelRelease(resources: LabelResources): boolean {
    if (pending === null) {
        return false;
    }

    pending.push(resources);
    return true;
}

/**
 * Run some work that disposes many labels -- a repaint that takes a label off every node, or
 * rebuilds every labelled node -- and release everything those labels owned once it ends, in one
 * pass over each scene list instead of one search per label. Nothing outside the work sees a
 * disposed label: the work is synchronous and the release happens before this returns.
 * @param work - The work.
 * @returns What the work returns.
 */
export function disposeLabelsTogether<T>(work: () => T): T {
    if (pending !== null) {
        return work();
    }

    const batch: LabelResources[] = [];
    pending = batch;
    try {
        return work();
    } finally {
        pending = null;
        releaseTogether(batch);
    }
}

/**
 * Release the resources of many labels: take every one of them out of each list in one pass, then
 * dispose them with those lists set aside, so Babylon's own searches find nothing to walk.
 * @param batch - What the labels owned.
 */
function releaseTogether(batch: readonly LabelResources[]): void {
    const meshes = new Set<AbstractMesh>();
    const materials = new Set<StandardMaterial>();
    const textures = new Set<DynamicTexture>();
    let scene: Scene | undefined;
    for (const { mesh, material, texture } of batch) {
        if (mesh !== null && !mesh.isDisposed()) {
            meshes.add(mesh);
            scene ??= mesh.getScene();
        }

        if (material !== null) {
            materials.add(material);
            scene ??= material.getScene();
        }

        if (texture !== null) {
            textures.add(texture);
        }
    }

    if (scene === undefined || scene.isDisposed) {
        disposeAll(meshes, materials, textures);
        return;
    }

    const lists = sceneLists(scene, meshes, materials, textures);
    const setAside = lists.map(([list, doomed]) => {
        dropAll(list, doomed);
        return list.splice(0);
    });
    try {
        disposeAll(meshes, materials, textures);
    } finally {
        lists.forEach(([list], at) => {
            // Anything a disposal added goes after what was there.
            const added = list.splice(0);
            for (const item of setAside[at]) {
                list.push(item);
            }

            for (const item of added) {
                list.push(item);
            }
        });
    }
}

/**
 * Each scene and engine list a label's disposal searches, with what of the batch's sits in it.
 * @param scene - The scene.
 * @param meshes - The labels' meshes.
 * @param materials - The labels' materials.
 * @param textures - The labels' textures.
 * @returns Each list and the members of it the batch owns.
 */
function sceneLists(
    scene: Scene,
    meshes: ReadonlySet<AbstractMesh>,
    materials: ReadonlySet<StandardMaterial>,
    textures: ReadonlySet<DynamicTexture>,
): [unknown[], ReadonlySet<unknown>][] {
    const buffers = new Set<UniformBuffer>();
    const observers = new Set<Observer<ImageProcessingConfiguration>>();
    const images = new Set<ImageProcessingConfiguration>();
    for (const material of materials) {
        buffers.add(material._uniformBuffer);
        if (material._imageProcessingObserver !== null) {
            observers.add(material._imageProcessingObserver);
            images.add(material.imageProcessingConfiguration);
        }
    }

    const internals = new Set<InternalTexture>();
    for (const texture of textures) {
        const internal = texture.getInternalTexture();
        // Released only by its last owner; one a label shares is left alone.
        if (internal !== null && internal._references === 1) {
            internals.add(internal);
        }
    }

    const engine = scene.getEngine();
    return [
        [scene.meshes, meshes],
        [scene.textures, textures],
        [engine._uniformBuffers, buffers],
        [engine._internalTexturesCache, internals],
        ...[...images].map((image): [unknown[], ReadonlySet<unknown>] => [
            image.onUpdateParameters.observers,
            observers,
        ]),
    ];
}

/**
 * Dispose meshes, then materials, then textures, the order a label disposes its own.
 * @param meshes - The meshes.
 * @param materials - The materials.
 * @param textures - The textures.
 */
function disposeAll(
    meshes: ReadonlySet<AbstractMesh>,
    materials: ReadonlySet<StandardMaterial>,
    textures: ReadonlySet<DynamicTexture>,
): void {
    for (const mesh of meshes) {
        if (!mesh.isDisposed()) {
            mesh.dispose();
        }
    }

    for (const material of materials) {
        material.dispose();
    }

    for (const texture of textures) {
        texture.dispose();
    }
}

/**
 * Remove every member of a set from an array in place, keeping the order of what stays.
 * @param list - The array.
 * @param doomed - What to remove.
 */
function dropAll(list: unknown[], doomed: ReadonlySet<unknown>): void {
    let kept = 0;
    for (const item of list) {
        if (!doomed.has(item)) {
            list[kept++] = item;
        }
    }

    list.length = kept;
}
