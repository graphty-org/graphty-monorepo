/**
 * @file The checks and summary of a BVH motion capture file: its hierarchy and every frame of its
 * motion are read (./readers/bvh.ts), its joints are held to `maxJoints`, and its summary describes
 * the figure it is drawn as: one thin box per bone, skinned to the skeleton, with the motion as
 * its one clip. Babylon-free and DOM-free.
 */

import { BVH_CLIP, readBvh, TRIANGLES_PER_BONE } from "./readers/bvh.js";
import { ModelReadError } from "./readers/geometry.js";
import { refuse } from "./references.js";
import type { ModelFact, ModelLimits, ModelSummary } from "./types.js";

/**
 * Check a BVH file and summarize the figure it is drawn as.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @returns The summary and warnings.
 */
export function scanBvh(
    bytes: Uint8Array,
    limits: ModelLimits,
): { summary: ModelSummary; warnings: readonly ModelFact[] } {
    if (bytes.length > limits.maxTextBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: bytes.length, limit: limits.maxTextBytes });
    }

    let file: ReturnType<typeof readBvh>;
    try {
        file = readBvh(new TextDecoder().decode(bytes));
    } catch (error) {
        if (error instanceof ModelReadError) {
            refuse("E_MODEL_STRUCTURE", { rule: "bvh" });
        }
        throw error;
    }

    const { joints } = file;
    if (joints.length > limits.maxJoints) {
        refuse("E_MODEL_TOO_LARGE", { what: "count", item: "joints", found: joints.length, limit: limits.maxJoints });
    }

    // The rest pose: each joint at its parents' offsets added up.
    const at: [number, number, number][] = [];
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const joint of joints) {
        const base = joint.parent < 0 ? [0, 0, 0] : at[joint.parent];
        const point: [number, number, number] = [0, 1, 2].map((a) => base[a] + joint.offset[a]) as [
            number,
            number,
            number,
        ];
        at.push(point);
        for (let a = 0; a < 3; a++) {
            min[a] = Math.min(min[a], point[a]);
            max[a] = Math.max(max[a], point[a]);
        }
    }

    const bones = joints.filter((j) => j.parent >= 0).length;
    const triangles = bones * TRIANGLES_PER_BONE;
    if (triangles > limits.maxTriangles) {
        refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
    }

    const animations =
        file.frames > 1 ? [Object.freeze({ name: BVH_CLIP, seconds: (file.frames - 1) * file.frameTime })] : [];
    return {
        summary: Object.freeze({
            format: "bvh",
            triangles,
            meshes: 1,
            materials: Object.freeze([]),
            textures: 0,
            textureBytes: 0,
            bounds: Object.freeze({ min, max }),
            upAxis: "y",
            animations: Object.freeze(animations),
            pictures: Object.freeze([]),
            skinned: true,
            morphTargets: 0,
            transparent: false,
            extensionsRequired: Object.freeze([]),
            geometry: "mesh",
            encoding: "ascii",
        }),
        warnings: animations.length > 0 ? [{ code: "W_MODEL_HAS_ANIMATIONS", params: { clips: [BVH_CLIP] } }] : [],
    };
}
