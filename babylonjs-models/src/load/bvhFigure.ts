/**
 * @file A BVH motion capture file drawn as a figure. Babylon's BVH loader makes a skeleton whose
 * bones carry the motion, and nothing to draw: here every bone becomes a thin box from its
 * parent's joint to its own, skinned to the parent bone, in one mesh, and the bones' motion
 * becomes one animation group, {@link BVH_CLIP}.
 */

import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup.js";
import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";

import { BVH_CLIP } from "../files/readers/bvh.js";

/** A box's eight corners, as signs along the bone and its two sides, and its twelve triangles. */
const CORNERS: readonly (readonly [number, number, number])[] = [
    [0, -1, -1],
    [0, 1, -1],
    [0, 1, 1],
    [0, -1, 1],
    [1, -1, -1],
    [1, 1, -1],
    [1, 1, 1],
    [1, -1, 1],
];
const BOX = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
];

/**
 * Two directions square to a bone and to each other.
 * @param along - The bone's direction.
 * @returns The two sides.
 */
function sidesOf(along: Vector3): [Vector3, Vector3] {
    const helper = Math.abs(along.y) < 0.9 ? Vector3.Up() : Vector3.Right();
    const u = Vector3.Cross(along, helper).normalize();
    return [u, Vector3.Cross(along, u).normalize()];
}

/**
 * Draw a loaded BVH file as a figure with one clip.
 * @param container - The loaded BVH file: one skeleton, no meshes.
 */
export function bvhFigure(container: AssetContainer): void {
    const [skeleton] = container.skeletons;
    if (skeleton === undefined) {
        return;
    }

    const scene = skeleton.getScene();
    skeleton.returnToRest();
    skeleton.computeAbsoluteMatrices(true);
    const joint = (index: number): Vector3 => skeleton.bones[index].getAbsoluteMatrix().getTranslation();
    let height = 0;
    for (let b = 0; b < skeleton.bones.length; b++) {
        height = Math.max(height, joint(b).length());
    }

    const thickness = Math.max(height, 1e-6) / 60;
    const positions: number[] = [];
    const indices: number[] = [];
    const bones: number[] = [];
    for (const [b, bone] of skeleton.bones.entries()) {
        const parent = bone.getParent();
        if (parent === null) {
            continue;
        }
        const p = skeleton.bones.indexOf(parent);
        const [from, to] = [joint(p), joint(b)];
        const along = to.subtract(from);
        if (along.length() === 0) {
            continue;
        }
        const [u, v] = sidesOf(along.normalizeToNew());
        const base = positions.length / 3;
        for (const [t, su, sv] of CORNERS) {
            const at = from
                .add(along.scale(t))
                .add(u.scale(su * thickness))
                .add(v.scale(sv * thickness));
            positions.push(at.x, at.y, at.z);
            bones.push(p);
        }
        indices.push(...BOX.map((i) => base + i));
    }

    const figure = new Mesh(`${skeleton.name || "BVH"} figure`, scene);
    scene.removeMesh(figure);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    data.normals = normals;
    data.matricesIndices = bones.flatMap((b) => [b, 0, 0, 0]);
    data.matricesWeights = bones.flatMap(() => [1, 0, 0, 0]);
    data.applyToMesh(figure);
    figure.skeleton = skeleton;
    const material = new StandardMaterial("BVH figure", scene);
    scene.removeMaterial(material);
    figure.material = material;
    container.meshes.push(figure);
    container.materials.push(material);

    const group = new AnimationGroup(BVH_CLIP, scene);
    scene.removeAnimationGroup(group);
    for (const bone of skeleton.bones) {
        for (const animation of bone.animations) {
            group.addTargetedAnimation(animation, bone);
        }
    }
    if (group.targetedAnimations.length > 0) {
        group.normalize();
        container.animationGroups.push(group);
    } else {
        group.dispose();
    }
}
