/**
 * @file A model template's animation, baked into a texture its instances read: every node of the
 * model plays a clip on the GPU with no per-node clone, skeleton or animation group
 * (design/rendering/node-models.md).
 *
 * Each clip is sampled at {@link BAKE_FPS} frames a second. Every animated part of the file gets
 * "bones" in one table shared by the whole template: a skinned part its skeleton's bones, a part
 * moved by its scene node one bone of its own, and everything else bone 0, which never moves. For
 * every frame, each bone's matrix takes the part's stored vertices (in their own space, or bind
 * space for a skin) to where the template draws them at that moment -- turned upright and fitted
 * into the unit box -- and the frames are written into Babylon's baked vertex animation texture.
 * An instance picks its clip, speed and start through the `bakedVertexAnimationSettingsInstanced`
 * attribute; one clock per scene moves time on while any node plays, holding the scene's
 * every-frame claim, and letting it go when all are still.
 *
 * Morph targets (shape keys) are not baked: their parts hold their rest shape
 * (`W_MODEL_ANIMATION_PARTIAL`). A texture over {@link MAX_TEXTURE_BYTES} is sampled at fewer frames
 * a second (`W_MODEL_ANIMATION_REDUCED`).
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { BakedVertexAnimationManager } from "@babylonjs/core/BakedVertexAnimation/bakedVertexAnimationManager.js";
import { Bone } from "@babylonjs/core/Bones/bone.js";
import { Skeleton } from "@babylonjs/core/Bones/skeleton.js";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Matrix, type Quaternion, Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { MorphTarget } from "@babylonjs/core/Morph/morphTarget.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import type { CodedFact } from "../session/shared";

/** Frames a second each clip is sampled at. */
const BAKE_FPS = 30;

/** The largest animation texture a template makes; past it, fewer frames a second. */
const MAX_TEXTURE_BYTES = 16 * 1024 * 1024;

/** The instanced attribute Babylon's baked vertex animation reads. */
const SETTINGS = "bakedVertexAnimationSettingsInstanced";

/** A part of the template as the animation sees it. */
export interface AnimatedPart {
    /** Its vertices: fitted and baked at rest, replaced by its stored vertices and bones here. */
    data: VertexData;
    /** The file's mesh it came from, when it can move on its own (not a GPU-instanced copy). */
    readonly mesh?: Mesh;
    /** That mesh's vertices in its own space (bind space for a skin), with its skin weights. */
    readonly local?: VertexData;
}

/** What a template plays. */
export interface TemplateAnimation {
    /** Each clip's frames in the texture, by name, in the file's order. */
    readonly clips: ReadonlyMap<string, { readonly start: number; readonly end: number }>;
    /** Frames a second the clips were sampled at. */
    readonly fps: number;
    /** What is worth saying: `W_MODEL_ANIMATION_REDUCED`, `W_MODEL_ANIMATION_PARTIAL`. */
    readonly notes: readonly CodedFact[];
    /** Every part's corners over every frame, in the unit box: what the node is picked and culled by. */
    readonly bounds: { readonly min: Vector3; readonly max: Vector3 };
    /**
     * Have a node's instances play a clip.
     * @param owner - The node.
     * @param instances - Its instances of the template.
     * @param clip - The clip's name, or null for the first frame of the first clip.
     * @param speed - 1 plays at the file's speed; 0 holds the frame at `offset`.
     * @param offset - Seconds into the clip.
     */
    play(owner: object, instances: readonly AbstractMesh[], clip: string | null, speed: number, offset: number): void;
    /**
     * Forget a node: it no longer draws this template.
     * @param owner - The node.
     */
    stop(owner: object): void;
    /**
     * Give the template's meshes the texture and the bones the stored vertices are drawn with.
     * @param meshes - The merged meshes.
     */
    attach(meshes: readonly Mesh[]): void;
    dispose(): void;
}

/** A transform node's local pose, to put it back. */
type Pose = readonly [TransformNode, Vector3, Vector3, Quaternion | null, Vector3];

/**
 * The file's transform nodes and meshes, parents before children.
 * @param container - The loaded model.
 * @returns Them.
 */
function inOrder(container: AssetContainer): TransformNode[] {
    const nodes: TransformNode[] = [...container.transformNodes, ...container.meshes];
    const depth = (node: TransformNode): number => {
        let d = 0;
        for (let at = node.parent; at !== null; at = at.parent) {
            d++;
        }
        return d;
    };
    return nodes.sort((a, b) => depth(a) - depth(b));
}

/**
 * Every node's pose now.
 * @param nodes - The nodes.
 * @returns Their poses.
 */
function posesOf(nodes: readonly TransformNode[]): Pose[] {
    return nodes.map((node) => [
        node,
        node.position.clone(),
        node.rotation.clone(),
        node.rotationQuaternion?.clone() ?? null,
        node.scaling.clone(),
    ]);
}

/**
 * Put every node back in a pose.
 * @param poses - The poses.
 */
function restore(poses: readonly Pose[]): void {
    for (const [node, position, rotation, quaternion, scaling] of poses) {
        node.position.copyFrom(position);
        node.rotation.copyFrom(rotation);
        if (quaternion !== null) {
            node.rotationQuaternion?.copyFrom(quaternion);
        }
        node.scaling.copyFrom(scaling);
    }
}

/**
 * Pose every node of a clip at a moment: each of its animations evaluated and written to its
 * target, morph weights left alone.
 * @param group - The clip.
 * @param frame - The moment, in the clip's own frames.
 * @returns Whether the clip moves a morph target.
 */
function poseAt(group: AssetContainer["animationGroups"][number], frame: number): boolean {
    let morph = false;
    for (const { animation, target } of group.targetedAnimations) {
        if (target instanceof MorphTarget) {
            morph = true;
            continue;
        }

        const path = animation.targetPropertyPath;
        let owner = target as Record<string, unknown>;
        for (const key of path.slice(0, -1)) {
            owner = owner[key] as Record<string, unknown>;
        }

        const value: unknown = animation.evaluate(frame);
        const key = path.at(-1) ?? "";
        const current = owner[key] as { copyFrom?: (other: unknown) => void } | undefined;
        if (current?.copyFrom !== undefined && typeof value === "object" && value !== null) {
            current.copyFrom(value);
        } else {
            owner[key] = value;
        }
    }

    return morph;
}

/** One clip to sample. */
interface Sampled {
    readonly name: string;
    readonly group: AssetContainer["animationGroups"][number];
    readonly from: number;
    /** The clip's own frames a second. */
    readonly rate: number;
    readonly frames: number;
}

/**
 * The clips, each with how many frames it is sampled at.
 * @param container - The loaded model.
 * @param fps - Samples a second.
 * @returns The clips.
 */
function clipsOf(container: AssetContainer, fps: number): Sampled[] {
    return container.animationGroups.map((group, i) => {
        const rate = group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
        const seconds = Math.max(0, (group.to - group.from) / rate);
        return {
            name: group.name === "" ? `clip ${String(i + 1)}` : group.name,
            group,
            from: group.from,
            rate,
            frames: Math.floor(seconds * fps) + 1,
        };
    });
}

/** Where each animated part's bones start in the shared table. */
interface BoneMap {
    readonly offsets: Map<AnimatedPart, number>;
    readonly count: number;
}

/**
 * Give every movable part its bones: a skin its skeleton's (shared by the parts that share it),
 * any other part one of its own. Bone 0 never moves.
 * @param parts - The parts.
 * @returns Each part's first bone and the bone count.
 */
function mapBones(parts: readonly AnimatedPart[]): BoneMap {
    const offsets = new Map<AnimatedPart, number>();
    const skeletons = new Map<Skeleton, number>();
    let count = 1;
    for (const part of parts) {
        if (part.mesh === undefined || part.local === undefined) {
            continue;
        }

        const { skeleton } = part.mesh;
        if (skeleton !== null && part.local.matricesIndices !== null) {
            let offset = skeletons.get(skeleton);
            if (offset === undefined) {
                offset = count;
                skeletons.set(skeleton, offset);
                count += skeleton.bones.length;
            }
            offsets.set(part, offset);
        } else {
            offsets.set(part, count);
            count += 1;
        }
    }

    return { offsets, count };
}

/**
 * Write every bone's matrix for the moment the nodes are posed at.
 * @param parts - The parts.
 * @param bones - Their bones.
 * @param place - The orientation and fit every matrix ends with.
 * @param into - The texture data.
 * @param row - The frame's first float.
 * @param bounds - The corners seen so far, grown.
 * @param bounds.min - The low corner.
 * @param bounds.max - The high corner.
 */
function writeFrame(
    parts: readonly AnimatedPart[],
    bones: BoneMap,
    place: Matrix,
    into: Float32Array,
    row: number,
    bounds: { min: Vector3; max: Vector3 },
): void {
    Matrix.IdentityReadOnly.copyToArray(into, row);
    const corner = new Vector3();
    for (const part of parts) {
        const offset = bones.offsets.get(part);
        if (offset === undefined || part.mesh === undefined) {
            continue;
        }

        const world = part.mesh.computeWorldMatrix(true).multiply(place);
        const { skeleton } = part.mesh;
        const matrices: Matrix[] = [];
        if (skeleton !== null && part.local?.matricesIndices !== null) {
            skeleton.prepare(true);
            const skin = skeleton.getTransformMatrices(part.mesh);
            for (let b = 0; b < skeleton.bones.length; b++) {
                matrices.push(Matrix.FromArray(skin, b * 16).multiply(world));
            }
        } else {
            matrices.push(world);
        }

        const box = part.mesh.getBoundingInfo().boundingBox;
        for (const [b, matrix] of matrices.entries()) {
            matrix.copyToArray(into, row + (offset + b) * 16);
            for (const point of box.vectors) {
                Vector3.TransformCoordinatesToRef(point, matrix, corner);
                bounds.min.minimizeInPlace(corner);
                bounds.max.maximizeInPlace(corner);
            }
        }
    }
}

/**
 * Store each movable part's own vertices with its bones, and every other part on bone 0.
 * @param parts - The parts.
 * @param bones - Their bones.
 */
function rebind(parts: readonly AnimatedPart[], bones: BoneMap): void {
    for (const part of parts) {
        const offset = bones.offsets.get(part);
        const data = offset === undefined || part.local === undefined ? part.data : part.local;
        const count = (data.positions?.length ?? 0) / 3;
        const indices = new Array<number>(count * 4).fill(0);
        const weights = new Array<number>(count * 4).fill(0);
        const skinned =
            offset !== undefined &&
            (part.local?.matricesIndices ?? null) !== null &&
            (part.mesh?.skeleton ?? null) !== null;
        for (let v = 0; v < count; v++) {
            if (skinned) {
                // ponytail: more than four influences (the extra weights) are dropped; renormalize if a file needs them.
                for (let k = 0; k < 4; k++) {
                    indices[v * 4 + k] = (data.matricesIndices?.[v * 4 + k] ?? 0) + offset;
                    weights[v * 4 + k] = data.matricesWeights?.[v * 4 + k] ?? 0;
                }
            } else {
                indices[v * 4] = offset ?? 0;
                weights[v * 4] = 1;
            }
        }

        data.matricesIndices = indices;
        data.matricesWeights = weights;
        data.matricesIndicesExtra = null;
        data.matricesWeightsExtra = null;
        part.data = data;
    }
}

/**
 * Bake a model's clips for its template, or null when it has none.
 * @param scene - The scene the template draws in.
 * @param container - The loaded model, at rest.
 * @param parts - The template's parts, fitted at rest; movable parts carry their own vertices.
 * @param place - The orientation then the fit, as the rest-pose parts were placed.
 * @param name - A name for the texture and skeleton.
 * @returns The animation.
 */
export function bakeAnimation(
    scene: Scene,
    container: AssetContainer,
    parts: AnimatedPart[],
    place: Matrix,
    name: string,
): TemplateAnimation | null {
    if (container.animationGroups.length === 0) {
        return null;
    }

    for (const group of container.animationGroups) {
        group.stop();
    }

    const bones = mapBones(parts);
    let fps = BAKE_FPS;
    const notes: CodedFact[] = [];
    const floatsPerFrame = bones.count * 16;
    const framesAt = (rate: number): number => clipsOf(container, rate).reduce((sum, clip) => sum + clip.frames, 0);
    if (framesAt(fps) * floatsPerFrame * 4 > MAX_TEXTURE_BYTES) {
        fps = Math.max(1, Math.floor((fps * MAX_TEXTURE_BYTES) / (framesAt(fps) * floatsPerFrame * 4)));
        while (fps > 1 && framesAt(fps) * floatsPerFrame * 4 > MAX_TEXTURE_BYTES) {
            fps--;
        }
    }

    const clips = clipsOf(container, fps);
    const total = clips.reduce((sum, clip) => sum + clip.frames, 0);
    if (fps < BAKE_FPS) {
        notes.push({ code: "W_MODEL_ANIMATION_REDUCED", params: { fps, clips: clips.map((c) => c.name) } });
    }

    const data = new Float32Array(floatsPerFrame * total);
    const nodes = inOrder(container);
    const rest = posesOf(nodes);
    const bounds = {
        min: new Vector3(Infinity, Infinity, Infinity),
        max: new Vector3(-Infinity, -Infinity, -Infinity),
    };
    const ranges = new Map<string, { start: number; end: number }>();
    let frame = 0;
    let morph = false;
    for (const clip of clips) {
        restore(rest);
        ranges.set(clip.name, { start: frame, end: frame + clip.frames - 1 });
        for (let k = 0; k < clip.frames; k++) {
            morph = poseAt(clip.group, clip.from + (k / fps) * clip.rate) || morph;
            for (const node of nodes) {
                node.computeWorldMatrix(true);
            }
            writeFrame(parts, bones, place, data, (frame + k) * floatsPerFrame, bounds);
        }
        frame += clip.frames;
    }

    restore(rest);
    if (morph) {
        notes.push({ code: "W_MODEL_ANIMATION_PARTIAL", params: { reason: "morph" } });
    }

    rebind(parts, bones);
    return animationFor(scene, name, { data, bones: bones.count, total, fps, ranges, notes, bounds });
}

/**
 * The texture, the clock and the bookkeeping of a baked animation.
 * @param scene - The scene.
 * @param name - A name for the texture and skeleton.
 * @param baked - What was baked.
 * @param baked.data - The texture's floats.
 * @param baked.bones - Bones a frame.
 * @param baked.total - Frames in all.
 * @param baked.fps - Frames a second.
 * @param baked.ranges - Each clip's frames.
 * @param baked.notes - What is worth saying.
 * @param baked.bounds - Every corner over every frame.
 * @param baked.bounds.min - The low corner.
 * @param baked.bounds.max - The high corner.
 * @returns The animation.
 */
function animationFor(
    scene: Scene,
    name: string,
    baked: {
        data: Float32Array;
        bones: number;
        total: number;
        fps: number;
        ranges: Map<string, { start: number; end: number }>;
        notes: CodedFact[];
        bounds: { min: Vector3; max: Vector3 };
    },
): TemplateAnimation {
    const texture = RawTexture.CreateRGBATexture(
        baked.data,
        baked.bones * 4,
        baked.total,
        scene,
        false,
        false,
        Texture.NEAREST_NEAREST,
        Constants.TEXTURETYPE_FLOAT,
    );
    texture.name = `${name}-animation`;
    const manager = new BakedVertexAnimationManager(scene);
    manager.texture = texture;
    // The bones only make the shader read the texture: their own matrices are never used.
    const skeleton = new Skeleton(`${name}-bones`, `${name}-bones`, scene);
    for (let b = 0; b < baked.bones; b++) {
        new Bone(`bone-${String(b)}`, skeleton); // NOSONAR(S1848): a Bone adds itself to the skeleton it is given
    }

    const playing = new Set<object>();
    let release: (() => void) | null = null;
    const clock = scene.onBeforeRenderObservable.add(() => {
        if (playing.size > 0) {
            manager.time += scene.getEngine().getDeltaTime() / 1000;
        }
    });
    const [first] = baked.ranges.values();
    return {
        clips: baked.ranges,
        fps: baked.fps,
        notes: baked.notes,
        bounds: baked.bounds,
        play(owner, instances, clip, speed, offset) {
            const range = (clip === null ? undefined : baked.ranges.get(clip)) ?? first;
            const length = range.end - range.start + 1;
            const settings = new Vector4(
                range.start,
                range.end,
                ((Math.round(offset * baked.fps) % length) + length) % length,
                clip === null ? 0 : baked.fps * Math.max(0, speed),
            );
            for (const instance of instances) {
                if (instance instanceof InstancedMesh) {
                    instance.instancedBuffers[SETTINGS] = settings;
                }
            }

            if (clip !== null && speed > 0) {
                playing.add(owner);
            } else {
                playing.delete(owner);
            }

            if (playing.size > 0 && release === null) {
                release = animatesEveryFrame(scene);
            } else if (playing.size === 0 && release !== null) {
                release();
                release = null;
            }
        },
        stop(owner) {
            playing.delete(owner);
            if (playing.size === 0 && release !== null) {
                release();
                release = null;
            }
        },
        attach(meshes) {
            for (const mesh of meshes) {
                mesh.skeleton = skeleton;
                mesh.bakedVertexAnimationManager = manager;
                mesh.registerInstancedBuffer(SETTINGS, 4);
                mesh.instancedBuffers[SETTINGS] = new Vector4(first.start, first.start, 0, 0);
            }
        },
        dispose() {
            release?.();
            release = null;
            playing.clear();
            scene.onBeforeRenderObservable.remove(clock);
            manager.dispose(true);
            skeleton.dispose();
        },
    };
}
