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
 * A part moved by morph targets (shape keys) gets a bone for each set of its vertices that move
 * alike, which carries them by the clip's blend of its targets, on top of the part's own movement.
 * A skinned part's shape keys, or more bones than a texture row holds, are not baked: those parts
 * hold their rest shape (`W_MODEL_ANIMATION_PARTIAL`). A texture over {@link MAX_TEXTURE_BYTES} is sampled at fewer frames
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
    vertices: VertexData;
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
    /** Every moving part's reach over every frame, in the unit box: what the node is picked and culled by. */
    readonly bounds: { readonly min: Vector3; readonly max: Vector3 };
    /**
     * The furthest any moving vertex is from the center in the pose drawn while no clip plays (the
     * first frame of the first clip): what the model is framed and its edges trimmed by. Not every
     * frame's reach, which for a clip that travels (a plane's flight path) is many times the model.
     */
    readonly radius: number;
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
 * target, a morph target's weight included.
 * @param group - The clip.
 * @param frame - The moment, in the clip's own frames.
 * @returns Whether the clip moves a morph target.
 */
function poseAt(group: AssetContainer["animationGroups"][number], frame: number): boolean {
    let morph = false;
    for (const { animation, target } of group.targetedAnimations) {
        morph ||= target instanceof MorphTarget;
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
    return container.animationGroups.map((group) => {
        const rate = group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
        const seconds = Math.max(0, (group.to - group.from) / rate);
        return {
            // The loader names an unnamed glTF clip `animation<index>`, as the model summary lists it.
            name: group.name,
            group,
            from: group.from,
            rate,
            frames: Math.floor(seconds * fps) + 1,
        };
    });
}

/** A part moved by its morph targets: its vertices that move alike share a bone. */
interface Morph {
    /** Each vertex's bone, counted from the part's first. */
    readonly boneOf: Uint32Array;
    /** One vertex of each bone, which moves as all of that bone's vertices do. */
    readonly first: readonly number[];
    /** Each target, and how far it moves each vertex at full weight. */
    readonly targets: readonly { readonly target: MorphTarget; readonly deltas: Float32Array }[];
}

/** Where each animated part's bones start in the shared table. */
interface BoneMap {
    readonly offsets: Map<AnimatedPart, number>;
    readonly count: number;
    /** The parts whose morph targets are baked. */
    readonly morphs: ReadonlyMap<AnimatedPart, Morph>;
}

/**
 * The movable parts with morph targets and no skin, each vertex given the bone of the vertices
 * every target moves alike (a vertex split at a seam moves with its twin; one no target moves
 * shares a bone with the others).
 * @param parts - The parts.
 * @returns Their morphs.
 */
function morphsOf(parts: readonly AnimatedPart[]): Map<AnimatedPart, Morph> {
    const out = new Map<AnimatedPart, Morph>();
    for (const part of parts) {
        const manager = part.mesh?.morphTargetManager ?? null;
        const base = part.local?.positions ?? null;
        const skinned = (part.mesh?.skeleton ?? null) !== null && (part.local?.matricesIndices ?? null) !== null;
        if (manager === null || manager.numTargets === 0 || base === null || skinned) {
            // ponytail: a skinned part's shape keys hold still; blend the skin into each vertex's bone if a file needs them.
            continue;
        }

        const targets = Array.from({ length: manager.numTargets }, (_, t) => {
            const target = manager.getTarget(t);
            // Babylon keeps a target's positions whole, not as offsets from the base.
            const positions = target.getPositions();
            const deltas = new Float32Array(base.length);
            if (positions !== null) {
                for (let k = 0; k < base.length; k++) {
                    deltas[k] = positions[k] - base[k];
                }
            }
            return { target, deltas };
        });
        const count = base.length / 3;
        const boneOf = new Uint32Array(count);
        const first: number[] = [];
        const keys = new Map<string, number>();
        for (let v = 0; v < count; v++) {
            const key = targets.map(({ deltas }) => deltas.subarray(v * 3, v * 3 + 3).join(",")).join(";");
            let bone = keys.get(key);
            if (bone === undefined) {
                bone = first.length;
                keys.set(key, bone);
                first.push(v);
            }
            boneOf[v] = bone;
        }
        out.set(part, { boneOf, first, targets });
    }

    return out;
}

/**
 * Give every movable part its bones: a skin its skeleton's (shared by the parts that share it), a
 * part with baked morph targets one for each set of its vertices that move alike, any other part
 * one of its own. Bone 0 never moves.
 * @param parts - The parts.
 * @param morphs - The parts whose morph targets are baked.
 * @returns Each part's first bone and the bone count.
 */
function mapBones(parts: readonly AnimatedPart[], morphs: ReadonlyMap<AnimatedPart, Morph>): BoneMap {
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
            count += morphs.get(part)?.first.length ?? 1;
        }
    }

    return { offsets, count, morphs };
}

/** Directions spread evenly over the sphere: the vertices furthest along each stand for a bone's. */
const DIRECTIONS: readonly Vector3[] = Array.from({ length: 64 }, (_, i) => {
    // A Fibonacci sphere: no two neighbours more than about 15 degrees apart, so the furthest of
    // these points is within 4% of the furthest vertex.
    const y = 1 - ((i + 0.5) * 2) / 64;
    const r = Math.sqrt(1 - y * y);
    const a = i * Math.PI * (3 - Math.sqrt(5));
    return new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
});

/**
 * For each bone of each movable part, the few vertices it moves that stand for all of them: the
 * furthest along each of {@link DIRECTIONS}, in the part's own (bind) space. A skinned vertex is
 * a weighted blend of where its bones put it, so it stays within what these points bound; a
 * whole-mesh box moved by every bone does not (a foot bone carries the body's box with it).
 * @param parts - The parts.
 * @param bones - Their bones.
 * @returns The points, per part, per bone.
 */
function extremesOf(parts: readonly AnimatedPart[], bones: BoneMap): Map<AnimatedPart, Vector3[][]> {
    const out = new Map<AnimatedPart, Vector3[][]>();
    for (const part of parts) {
        const positions = part.local?.positions ?? null;
        if (bones.offsets.has(part) && part.mesh !== undefined && part.local !== undefined && positions !== null) {
            const morph = bones.morphs.get(part);
            const moved = morph === undefined ? movedBy(part.local, part.mesh.skeleton) : groupsOf(morph);
            out.set(
                part,
                moved.map((list) => furthestOf(positions, list)),
            );
        }
    }

    return out;
}

/**
 * The vertices each bone moves: all of them on one bone for a part with no skin.
 * @param data - The part's own vertices, with its skin weights.
 * @param skeleton - Its skeleton, or null.
 * @returns The vertex indices, per bone.
 */
function movedBy(data: VertexData, skeleton: Skeleton | null): number[][] {
    const count = (data.positions?.length ?? 0) / 3;
    const skin = skeleton === null ? null : data.matricesIndices;
    if (skin === null || skeleton === null) {
        return [Array.from({ length: count }, (_, v) => v)];
    }

    const weights = data.matricesWeights;
    const moved: number[][] = skeleton.bones.map(() => []);
    for (let v = 0; v < count; v++) {
        for (let k = 0; k < 4; k++) {
            if ((weights?.[v * 4 + k] ?? 0) > 0) {
                moved[Math.floor(skin[v * 4 + k])]?.push(v);
            }
        }
    }

    return moved;
}

/**
 * The vertices each bone of a morph moves.
 * @param morph - The morph.
 * @returns The vertex indices, per bone.
 */
function groupsOf(morph: Morph): number[][] {
    const groups: number[][] = morph.first.map(() => []);
    for (const [v, bone] of morph.boneOf.entries()) {
        groups[bone].push(v);
    }

    return groups;
}

/**
 * Where a morph's bones move their vertices by its targets' weights now.
 * @param morph - The morph.
 * @param world - The part's own matrix, applied after.
 * @returns Each bone's matrix.
 */
function morphMatrices(morph: Morph, world: Matrix): Matrix[] {
    return morph.first.map((v) => {
        let [x, y, z] = [0, 0, 0];
        for (const { target, deltas } of morph.targets) {
            x += target.influence * deltas[v * 3];
            y += target.influence * deltas[v * 3 + 1];
            z += target.influence * deltas[v * 3 + 2];
        }
        return Matrix.Translation(x, y, z).multiply(world);
    });
}

/**
 * The vertices furthest along each of {@link DIRECTIONS}, once each.
 * @param positions - The positions.
 * @param list - The vertices to choose from.
 * @returns Their points.
 */
function furthestOf(positions: ArrayLike<number>, list: readonly number[]): Vector3[] {
    const chosen = DIRECTIONS.map((dir) => {
        let best = -Infinity;
        let at = -1;
        for (const v of list) {
            const along = positions[v * 3] * dir.x + positions[v * 3 + 1] * dir.y + positions[v * 3 + 2] * dir.z;
            if (along > best) {
                best = along;
                at = v;
            }
        }
        return at;
    });
    return [...new Set(chosen.filter((v) => v >= 0))].map((v) => Vector3.FromArray(positions, v * 3));
}

/** The box and the radius about the center every frame's posed vertices reach. */
interface Reach {
    readonly min: Vector3;
    readonly max: Vector3;
    radius: number;
    /** The radius the first frame written reaches. */
    first?: number;
}

/**
 * A movable part's bones' matrices for the moment the nodes are posed at.
 * @param part - The part.
 * @param mesh - Its mesh.
 * @param bones - The bones.
 * @param place - The orientation and fit every matrix ends with.
 * @returns Its bones' matrices, in order.
 */
function boneMatrices(part: AnimatedPart, mesh: Mesh, bones: BoneMap, place: Matrix): Matrix[] {
    const world = mesh.computeWorldMatrix(true).multiply(place);
    const morph = bones.morphs.get(part);
    if (morph !== undefined) {
        return morphMatrices(morph, world);
    }

    const { skeleton } = mesh;
    if (skeleton === null || part.local?.matricesIndices === null) {
        return [world];
    }

    skeleton.prepare(true);
    const skin = skeleton.getTransformMatrices(mesh);
    return skeleton.bones.map((_, b) => Matrix.FromArray(skin, b * 16).multiply(world));
}

/**
 * Write every bone's matrix for the moment the nodes are posed at.
 * @param parts - The parts.
 * @param bones - Their bones.
 * @param place - The orientation and fit every matrix ends with.
 * @param into - The texture data.
 * @param row - The frame's first float.
 * @param bounds - The box and radius seen so far, grown.
 * @param extremes - The points standing for each bone's vertices ({@link extremesOf}).
 */
function writeFrame(
    parts: readonly AnimatedPart[],
    bones: BoneMap,
    place: Matrix,
    into: Float32Array,
    row: number,
    bounds: Reach,
    extremes: ReadonlyMap<AnimatedPart, Vector3[][]>,
): void {
    Matrix.IdentityReadOnly.copyToArray(into, row);
    const corner = new Vector3();
    for (const part of parts) {
        const offset = bones.offsets.get(part);
        if (offset === undefined || part.mesh === undefined) {
            continue;
        }

        const matrices = boneMatrices(part, part.mesh, bones, place);
        const points = extremes.get(part) ?? [];
        for (const [b, matrix] of matrices.entries()) {
            matrix.copyToArray(into, row + (offset + b) * 16);
            for (const point of points[b] ?? []) {
                Vector3.TransformCoordinatesToRef(point, matrix, corner);
                bounds.min.minimizeInPlace(corner);
                bounds.max.maximizeInPlace(corner);
                bounds.radius = Math.max(bounds.radius, corner.length());
            }
        }
    }

    // The bounds start empty, so after the first frame they are its reach alone.
    bounds.first ??= bounds.radius;
}

/**
 * Store each movable part's own vertices with its bones, and every other part on bone 0.
 * @param parts - The parts.
 * @param bones - Their bones.
 */
function rebind(parts: readonly AnimatedPart[], bones: BoneMap): void {
    for (const part of parts) {
        const offset = bones.offsets.get(part);
        const data = offset === undefined || part.local === undefined ? part.vertices : part.local;
        const count = (data.positions?.length ?? 0) / 3;
        const indices = new Array<number>(count * 4).fill(0);
        const weights = new Array<number>(count * 4).fill(0);
        const skinned =
            offset !== undefined &&
            (part.local?.matricesIndices ?? null) !== null &&
            (part.mesh?.skeleton ?? null) !== null;
        const morph = bones.morphs.get(part);
        for (let v = 0; v < count; v++) {
            if (skinned) {
                // ponytail: more than four influences (the extra weights) are dropped; renormalize if a file needs them.
                for (let k = 0; k < 4; k++) {
                    indices[v * 4 + k] = (data.matricesIndices?.[v * 4 + k] ?? 0) + offset;
                    weights[v * 4 + k] = data.matricesWeights?.[v * 4 + k] ?? 0;
                }
            } else {
                indices[v * 4] = (offset ?? 0) + (morph?.boneOf[v] ?? 0);
                weights[v * 4] = 1;
            }
        }

        data.matricesIndices = indices;
        data.matricesWeights = weights;
        data.matricesIndicesExtra = null;
        data.matricesWeightsExtra = null;
        part.vertices = data;
    }
}

/**
 * The parts' bones, with their morph targets baked while a frame's bones fit one texture row
 * (four texels each).
 * @param scene - The scene.
 * @param parts - The parts.
 * @returns The bones.
 */
function bonesFor(scene: Scene, parts: readonly AnimatedPart[]): BoneMap {
    const bones = mapBones(parts, morphsOf(parts));
    // ponytail: past the widest row, shape keys hold still; split a frame over rows if a file needs more.
    return bones.count * 4 > scene.getEngine().getCaps().maxTextureSize ? mapBones(parts, new Map()) : bones;
}

/**
 * The file's morph target weights now, to put back.
 * @param container - The loaded model.
 * @returns What puts them back.
 */
function weightsOf(container: AssetContainer): () => void {
    const targets = container.morphTargetManagers.flatMap((manager) =>
        Array.from({ length: manager.numTargets }, (_, t) => manager.getTarget(t)),
    );
    const weights = targets.map((target) => target.influence);
    return () => {
        for (const [t, target] of targets.entries()) {
            target.influence = weights[t];
        }
    };
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

    const bones = bonesFor(scene, parts);
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
    const restWeights = weightsOf(container);
    const restAll = (): void => {
        restore(rest);
        restWeights();
    };
    const bounds: Reach = {
        min: new Vector3(Infinity, Infinity, Infinity),
        max: new Vector3(-Infinity, -Infinity, -Infinity),
        radius: 0,
    };
    const extremes = extremesOf(parts, bones);
    const ranges = new Map<string, { start: number; end: number }>();
    let frame = 0;
    let morph = false;
    for (const clip of clips) {
        restAll();
        ranges.set(clip.name, { start: frame, end: frame + clip.frames - 1 });
        for (let k = 0; k < clip.frames; k++) {
            morph = poseAt(clip.group, clip.from + (k / fps) * clip.rate) || morph;
            for (const node of nodes) {
                node.computeWorldMatrix(true);
            }
            writeFrame(parts, bones, place, data, (frame + k) * floatsPerFrame, bounds, extremes);
        }
        frame += clip.frames;
    }

    restAll();
    // A clip moved a morph target some part could not bake.
    const unbaked = parts.some(
        (part) => (part.mesh?.morphTargetManager?.numTargets ?? 0) > 0 && !bones.morphs.has(part),
    );
    if (morph && unbaked) {
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
 * @param baked.bounds - The box and radius every frame reaches.
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
        bounds: Reach;
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
        new Bone(`bone-${String(b)}`, skeleton); // eslint-disable-line sonarjs/constructor-for-side-effects -- a Bone adds itself to the skeleton it is given
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
        bounds: { min: baked.bounds.min, max: baked.bounds.max },
        radius: baked.bounds.first ?? 0,
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
