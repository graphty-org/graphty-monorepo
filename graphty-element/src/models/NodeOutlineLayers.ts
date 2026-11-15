/**
 * @file The silhouette mark of a model node: its halo, outline or glow drawn as a band around the
 * model's real outline on screen, by Babylon's selection outline layer.
 *
 * A built-in shape marks itself with a copy of its own mesh, scaled out, or a ring that faces the
 * camera. Neither works for a model: a model node is one instance per merged part, a copy of one
 * part marks only that part (a large "X" over BrainStem, a second, misaligned tree over tree.obj),
 * and a ring is a circle whatever the model's shape. The selection outline layer draws only the
 * marked nodes into a mask and runs one screen-wide edge pass, so the band hugs every part of the
 * model, is per node, follows an animated model, and costs the same for one marked node or a
 * thousand.
 *
 * One layer per scene and distinct look (color and thickness), made on first mark and disposed
 * when it marks nothing. Each node carries one mark at a time. Reached only through the model
 * chunk (./chunk.ts), so a page that never draws a model never loads it.
 */

// The shaders the layer and the depth renderer it reads would otherwise import lazily: a bundler
// turns each into a separate file fetched at draw time (see src/meshes/bundledStandardShaders.ts).
import "@babylonjs/core/Shaders/selection.vertex.js";
import "@babylonjs/core/Shaders/selection.fragment.js";
import "@babylonjs/core/Shaders/glowMapMerge.vertex.js";
import "@babylonjs/core/Shaders/selectionOutline.fragment.js";
import "@babylonjs/core/Shaders/depth.vertex.js";
import "@babylonjs/core/Shaders/depth.fragment.js";
import "@babylonjs/core/ShadersWGSL/selection.vertex.js";
import "@babylonjs/core/ShadersWGSL/selection.fragment.js";
import "@babylonjs/core/ShadersWGSL/glowMapMerge.vertex.js";
import "@babylonjs/core/ShadersWGSL/selectionOutline.fragment.js";
import "@babylonjs/core/ShadersWGSL/depth.vertex.js";
import "@babylonjs/core/ShadersWGSL/depth.fragment.js";

import { SelectionOutlineLayer } from "@babylonjs/core/Layers/selectionOutlineLayer.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

/** How a mark is drawn. */
export interface ModelMarkLook {
    /** The band's color, `#rrggbb`. */
    readonly color: string;
    /** The band's width in pixels. */
    readonly thickness: number;
}

/** The instanced attribute the layer reads to tell marked instances apart. */
const SELECTION_ID = "instanceSelectionId";

/** One layer and the nodes it marks. */
interface Marked {
    readonly layer: SelectionOutlineLayer;
    readonly owners: Map<object, readonly AbstractMesh[]>;
}

/** Each scene's layers by look, and the look each node is marked with. */
interface SceneMarks {
    readonly layers: Map<string, Marked>;
    readonly looks: Map<object, string>;
}

const scenes = new WeakMap<Scene, SceneMarks>();

/**
 * A look as a key.
 * @param look - The look.
 * @returns The key.
 */
function keyOf(look: ModelMarkLook): string {
    return `${look.color.toLowerCase()}|${String(look.thickness)}`;
}

/**
 * Take a node's mark off its layer, and drop the layer when it marks nothing more.
 * @param marks - The scene's marks.
 * @param owner - The node.
 */
function unmark(marks: SceneMarks, owner: object): void {
    const key = marks.looks.get(owner);
    if (key === undefined) {
        return;
    }

    marks.looks.delete(owner);
    const marked = marks.layers.get(key);
    if (marked === undefined) {
        return;
    }

    const meshes = marked.owners.get(owner) ?? [];
    marked.owners.delete(owner);
    // The layer has no way to forget one mesh: it forgets all of them, and takes the rest back.
    marked.layer.clearSelection();
    for (const mesh of meshes) {
        if (!mesh.isDisposed()) {
            // Clearing deletes the attribute; an instance must still carry one to be drawn.
            mesh.instancedBuffers[SELECTION_ID] = 0;
        }
    }

    if (marked.owners.size === 0) {
        marked.layer.dispose();
        marks.layers.delete(key);
        return;
    }

    for (const others of marked.owners.values()) {
        marked.layer.addSelection(others.filter((mesh) => !mesh.isDisposed()));
    }
}

/**
 * Mark a model node with a silhouette band, change its mark, or take it off.
 * @param scene - The node's scene.
 * @param owner - The node, as a key.
 * @param meshes - Its model's instances, every part; marked as one unit.
 * @param look - The band, or null for no mark.
 */
export function markModelNode(
    scene: Scene,
    owner: object,
    meshes: readonly AbstractMesh[],
    look: ModelMarkLook | null,
): void {
    let marks = scenes.get(scene);
    if (marks === undefined) {
        if (look === null) {
            return;
        }

        marks = { layers: new Map(), looks: new Map() };
        scenes.set(scene, marks);
    }

    const key = look === null ? undefined : keyOf(look);
    const current = marks.looks.get(owner);
    if (current !== undefined && current === key) {
        const before = marks.layers.get(current)?.owners.get(owner) ?? [];
        if (before.length === meshes.length && before.every((mesh, i) => mesh === meshes[i])) {
            return;
        }
    }

    unmark(marks, owner);
    if (look === null || key === undefined || meshes.length === 0) {
        return;
    }

    let marked = marks.layers.get(key);
    if (marked === undefined) {
        const layer = new SelectionOutlineLayer(`graphty-model-mark-${key}`, scene, { mainTextureRatio: 1 });
        layer.outlineColor = Color3.FromHexString(look.color.slice(0, 7));
        layer.outlineThickness = look.thickness;
        marked = { layer, owners: new Map() };
        marks.layers.set(key, marked);
    }

    marked.owners.set(owner, [...meshes]);
    marks.looks.set(owner, key);
    marked.layer.addSelection([...meshes]);
}
