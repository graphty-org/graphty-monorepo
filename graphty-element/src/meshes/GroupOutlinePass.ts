/**
 * @file Group outlines (design/rendering/shader-styles.md sections 3.2, 4.2 and 5): one shape
 * around each group of the nodes carrying a use at the place `group`, drawn behind the graph,
 * nested when several
 * outlines stack.
 *
 * - **Form `"field"`** (metaball hulls): each member's kernel `(1 - d^2)^2`, of radius `reach` x
 *   its drawn radius, is splatted additively into one channel of a field target, four groups to a
 *   target, at most {@link FIELD_TARGETS} targets. The cost is members x kernel area, never
 *   pixels x members. The shader then reads the field and its gradient on the group's box.
 * - **Form `"sphere"`** (soap bubbles): one sphere per group, around its members' centroid.
 *
 * **Nesting.** Outlines are numbered bottom up (`GroupInput.depth`); a lower layer's
 * kernels and spheres are drawn larger, so a community layer's outline rings the outlines of a
 * subcommunity layer above it. Lower layers are drawn first.
 *
 * **Every frame drawn, nothing at rest.** The members' places are read before each frame the
 * scene draws, so the outlines follow a running layout; a graph drawn on demand that is not
 * moving draws no frame and the pass costs nothing.
 *
 * **Picking is on the CPU**, from the same kernels and spheres projected on screen: a point inside
 * a group's field contour or sphere picks `{ layer, group }`, the topmost layer first.
 *
 * Loaded with the shader runtime, never by a graph that names no shader.
 */

import {
    Buffer,
    Color4,
    Constants,
    EffectRenderer,
    Layer,
    type Matrix,
    Mesh,
    type Observer,
    type RenderTargetTexture,
    type Scene,
    ShaderMaterial,
    ShaderStore,
    type TransformNode,
    Vector3,
    VertexData,
    Viewport,
} from "@babylonjs/core";

import { fixedParamsOf, motionOf, type ShaderDescriptor, type ShaderParams } from "../catalog/shaders";
import type { NodeId } from "../catalog/types";
import { animatesEveryFrame } from "../managers/everyFrameAnimations";
import { QUALITY_LEVELS, type RenderTargetBudget, type ShaderGuard } from "../managers/ShaderGuard";
import type { HostShader } from "../session/shaders";
import type { GroupKey, GroupOutlineSet } from "../session/styles/StylesApi";
import {
    FIELD_SAMPLERS,
    FIELD_TARGETS,
    outlineProgram,
    SPLAT_ATTRIBUTES,
    splatProgram,
} from "../shaders/runtime/scenePrograms";
import type { ShaderRuntime } from "../shaders/runtime/ShaderRuntime";
import { uniformValueOf } from "../shaders/runtime/wrap";
import { BACKGROUND_LAYER, type BackgroundTint } from "./BackgroundPass";
import { type SceneEffect, sceneEffect, sceneTarget, setParams, targetBytes } from "./sceneShaderEffect";

/** The outline's name. */
export const OUTLINE_LAYER = "graphty-group-outline";

/** A outline kernel's radius when its shader names no `reach`, in member radii. */
export const DEFAULT_OUTLINE_REACH = 3;

/** How much larger each outline beneath the top one draws, per layer of nesting. */
export const NEST_STEP = 0.35;

/** A field target's size, as a fraction of the outline target's. */
const FIELD_SCALE = 0.5;

/** An 8-bit field stores a quarter of the summed kernel, so four overlaps fit before it clips. */
const BYTE_FIELD_SCALE = 0.25;

/** The summed kernel a point must reach to pick a field outline. */
export const PICK_FIELD = 0.5;

/** The camera mask nothing draws with but the field targets, so the main camera skips the splats. */
const SPLAT_MASK = 0x10000000;

/** Floats per splat: one end and the radius, the other end, the channel mask. */
const SPLAT_STRIDE = 12;

/**
 * A spanning-tree edge whose members are farther apart than this many kernel radii gets a
 * connector: closer, the two members' kernels alone sum past 1.1 at the midpoint, above any
 * outline level a hull draws at, so they already melt into one shape.
 */
const CONNECT_PAST = 1;

/** A square of two triangles, -1..1. */
const QUAD_POSITIONS = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
const QUAD_INDICES = [0, 1, 2, 0, 2, 3];

/** A member as the pass reads it before each frame. */
export interface OutlineMember {
    /** Its center in graph-root space. */
    readonly x: number;
    readonly y: number;
    readonly z: number;
    /** Its drawn radius, graph-root units. */
    readonly radius: number;
    /** Its resolved color, 0..1, alpha the opacity. */
    readonly color: readonly [number, number, number, number];
}

/** What the pass reads from its graph. */
export interface OutlineSources {
    /** The outlines the stack draws, bottom first. */
    readonly outlines: () => readonly GroupOutlineSet[];
    /** A drawn node's place, size and color; undefined for one not drawn. */
    readonly member: (id: NodeId) => OutlineMember | undefined;
    /** A outline shader the element may draw, or null (unknown, held, failed, off). */
    readonly shader: (id: string) => Promise<HostShader | null>;
}

/** What a pick on a group outline found. */
export interface GroupOutlinePick {
    readonly layer: string;
    readonly shader: string;
    readonly group: GroupKey;
}

/** One group as it was laid out for the last frame. */
interface PlacedGroup {
    readonly key: GroupKey;
    readonly index: number;
    readonly color: readonly [number, number, number, number];
    /** Field: its members' discs on screen, render pixels (x, y, r) per member. */
    readonly discs: Float32Array;
    /** Field: its connectors on screen, render pixels (x0, y0, x1, y1, r) per connector. */
    readonly bridges: Float32Array;
    /** Sphere: its sphere on screen, render pixels; field: its box's center and half size. */
    readonly circle: { readonly x: number; readonly y: number; readonly r: number };
    /** Its box on screen, render pixels: x0, y0, x1, y1 (y up from the bottom). */
    readonly box: readonly [number, number, number, number];
    /** Field: target x 4 + channel. */
    readonly slot: number;
}

/** One outline as it was laid out for the last frame. */
interface PlacedLayer {
    readonly layer: string;
    readonly shader: HostShader;
    readonly effect: SceneEffect;
    readonly params: ShaderParams | undefined;
    readonly sphere: boolean;
    readonly depth: number;
    readonly groups: readonly PlacedGroup[];
}

/** A field target and the splat mesh only it draws. */
interface FieldTarget {
    readonly texture: RenderTargetTexture;
    readonly mesh: Mesh;
    splats: Float32Array;
    buffer: Buffer | null;
    count: number;
    /** How many of the splats are members, the rest connectors. */
    members: number;
}

/** A group's spanning tree, kept until one of its members moves. */
interface GroupTree {
    /** The members' places it was built from: x, y, z per member. */
    readonly at: Float32Array;
    /** Its edges, two member indices each. */
    readonly edges: Uint32Array;
}

/** Scratch, so laying out a frame allocates no vectors. */
const scratch = new Vector3();
const projected = new Vector3();

/**
 * A group's box in the outline target's pixels, clamped to the target.
 * @param box - The box in canvas pixels: left, top, right, bottom.
 * @param toTarget - Target pixels per canvas pixel.
 * @param size - The target's size.
 * @param size.width - Its width in pixels.
 * @param size.height - Its height in pixels.
 * @returns Left, top, right and bottom, or null when nothing of the box is on the target.
 */
function pixelBox(
    box: readonly number[],
    toTarget: number,
    size: { width: number; height: number },
): [number, number, number, number] | null {
    const x0 = Math.max(0, Math.floor(box[0] * toTarget));
    const y0 = Math.max(0, Math.floor(box[1] * toTarget));
    const x1 = Math.min(size.width, Math.ceil(box[2] * toTarget));
    const y1 = Math.min(size.height, Math.ceil(box[3] * toTarget));
    return x1 <= x0 || y1 <= y0 ? null : [x0, y0, x1, y1];
}

/** The outlines of one scene. */
export class GroupOutlinePass {
    private readonly renderer: EffectRenderer;
    private readonly layer: Layer;
    private readonly observer: Observer<Scene>;
    /** Each shader by id: its resolution, then null (cannot draw) or the shader. */
    private readonly shaders = new Map<string, HostShader | null | "resolving">();
    /** Each compiled program by text hash and form. */
    private readonly effects = new Map<string, { effect: SceneEffect; ready: boolean | undefined }>();
    private readonly splatMaterial: ShaderMaterial;
    private readonly fields: FieldTarget[] = [];
    private target: { readonly texture: RenderTargetTexture; readonly release: () => void } | null = null;
    private fieldBytes: { readonly key: string; readonly release: () => void } | null = null;
    private groups: readonly GroupOutlineSet[] = [];
    /** Per outline, whether it shares the level of the layer beneath; see {@link levelJoins}. */
    private joins: readonly boolean[] = [];
    private stale = true;
    private placed: readonly PlacedLayer[] = [];
    private releaseMotion: (() => void) | null = null;
    private disposed = false;
    /** Each field group's spanning tree, by layer and group. */
    private trees = new Map<string, GroupTree>();
    /** How many frames drew outlines, for tests and tools. */
    draws = 0;
    /** How many spanning trees were built, for tests and tools: one per group whose members moved. */
    treesBuilt = 0;

    /**
     * Start drawing a scene's outlines.
     * @param scene - The scene.
     * @param sources - The graph's outlines, members and shaders.
     * @param runtime - The shader runtime, for the scene uniforms and motion claims.
     * @param guard - The frame guard, for the quality level and the target size.
     * @param budget - The scene's shader render-target budget.
     */
    constructor(
        private readonly scene: Scene,
        private readonly sources: OutlineSources,
        private readonly runtime: ShaderRuntime,
        private readonly guard: ShaderGuard,
        private readonly budget: RenderTargetBudget,
    ) {
        const engine = scene.getEngine();
        this.renderer = new EffectRenderer(engine);
        this.layer = new Layer(OUTLINE_LAYER, null, scene, true);
        this.layer.alphaBlendingMode = Constants.ALPHA_PREMULTIPLIED;
        this.layer.isEnabled = false;
        orderLayers(scene);

        const program = splatProgram();
        ShaderStore.ShadersStore.graphtyOutlineSplatVertexShader = program.vertex;
        ShaderStore.ShadersStore.graphtyOutlineSplatFragmentShader = program.fragment;
        this.splatMaterial = new ShaderMaterial(
            "graphty-outline-splat",
            scene,
            { vertex: "graphtyOutlineSplat", fragment: "graphtyOutlineSplat" },
            {
                attributes: [...program.attributes],
                uniforms: [...program.uniforms],
                needAlphaBlending: true,
            },
        );
        this.splatMaterial.backFaceCulling = false;
        this.splatMaterial.disableDepthWrite = true;
        this.splatMaterial.alphaMode = Constants.ALPHA_ONEONE_ONEONE;
        this.splatMaterial.onBindObservable.add(() => {
            this.splatMaterial.setFloat("graphty_scale", this.fieldSize().halfFloat ? 1 : BYTE_FIELD_SCALE);
        });

        this.observer = scene.onBeforeRenderObservable.add(() => {
            this.frame();
        });
    }

    /** Read the outlines again before the next frame: the stack, the data or a run changed. */
    invalidate(): void {
        this.stale = true;
        this.requestFrame();
    }

    /**
     * Resolve a shader again: its status changed (approved, failed, turned off).
     * @param id - The shader's id.
     */
    forget(id: string): void {
        this.shaders.delete(id);
        this.invalidate();
    }

    /**
     * The outline under a point, the topmost layer first.
     * @param x - CSS pixels from the canvas's left edge.
     * @param y - CSS pixels from the canvas's top edge.
     * @returns The layer and group, or null.
     */
    pick(x: number, y: number): GroupOutlinePick | null {
        const engine = this.scene.getEngine();
        const scaling = engine.getHardwareScalingLevel();
        const px = x / scaling;
        const py = engine.getRenderHeight() - y / scaling;
        for (let i = this.placed.length - 1; i >= 0; i--) {
            const placed = this.placed[i];
            let best: { key: GroupKey; score: number } | null = null;
            for (const group of placed.groups) {
                const score = placed.sphere ? sphereScore(group, px, py) : fieldAt(group.discs, px, py, group.bridges);
                if (score >= (placed.sphere ? 0 : PICK_FIELD) && (best === null || score > best.score)) {
                    best = { key: group.key, score };
                }
            }

            if (best !== null) {
                return { layer: placed.layer, shader: placed.shader.id, group: best.key };
            }
        }

        return null;
    }

    /**
     * What the pass drew last, for tests and tools.
     * @returns Per outline drawn: its layer, its shader, its groups' keys and its depth.
     */
    drawn(): readonly {
        readonly layer: string;
        readonly shader: string;
        readonly depth: number;
        readonly groups: readonly GroupKey[];
    }[] {
        return this.placed.map((placed) => ({
            layer: placed.layer,
            shader: placed.shader.id,
            depth: placed.depth,
            groups: placed.groups.map((group) => group.key),
        }));
    }

    /**
     * How many member kernels the last frame splatted into the field targets, for tests and tools:
     * a field outline costs one kernel per member, never a pass over the members per pixel.
     * @returns The count.
     */
    splats(): number {
        return this.fields.reduce((sum, field) => sum + field.members, 0);
    }

    /**
     * How many connectors the last frame splatted, for tests and tools: one per spanning-tree edge
     * whose members' kernels alone would leave a gap.
     * @returns The count.
     */
    connectors(): number {
        return this.fields.reduce((sum, field) => sum + field.count - field.members, 0);
    }

    /**
     * One field group's field as the GPU holds it, for tests and tools: what its shader reads.
     * @param layer - The layer.
     * @param key - The group's key.
     * @returns The field's size, its values per texel (rows from the bottom) and the members'
     * centers in texels; null for a group not drawn last frame or not drawn from a field.
     */
    async fieldOf(
        layer: string,
        key: GroupKey,
    ): Promise<{ width: number; height: number; values: Float32Array; centers: Float32Array } | null> {
        const group = this.placed.find((placed) => placed.layer === layer)?.groups.find((each) => each.key === key);
        const field = group === undefined || group.slot < 0 ? undefined : this.fields[Math.floor(group.slot / 4)];
        if (group === undefined || field === undefined) {
            return null;
        }

        const { width, height } = field.texture.getSize();
        field.texture.render();
        const data = await field.texture.readPixels();
        if (data === null) {
            return null;
        }

        // An 8-bit field holds a quarter of the sum; a half-float one is read back as floats.
        const scale = data instanceof Uint8Array ? 1 / (255 * BYTE_FIELD_SCALE) : 1;
        const texels = data as Uint8Array | Float32Array;
        const values = new Float32Array(width * height);
        for (let i = 0; i < values.length; i++) {
            values[i] = texels[i * 4 + (group.slot % 4)] * scale;
        }

        const toField = width / this.scene.getEngine().getRenderWidth();
        const centers = new Float32Array((group.discs.length / 3) * 2);
        for (let i = 0; i < centers.length / 2; i++) {
            centers[i * 2] = group.discs[i * 3] * toField;
            centers[i * 2 + 1] = group.discs[i * 3 + 1] * toField;
        }

        return { width, height, values, centers };
    }

    /**
     * The largest groups drawn last frame, largest first, for a background that tints by them.
     * @param count - How many.
     * @returns Each group's place on the canvas and its members' mean color.
     */
    tints(count: number): BackgroundTint[] {
        const engine = this.scene.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        return this.placed
            .flatMap((placed) => placed.groups)
            .sort((a, b) => b.discs.length - a.discs.length)
            .slice(0, count)
            .map(({ box, color }) => ({
                x: (box[0] + box[2]) / width - 1,
                y: (box[1] + box[3]) / height - 1,
                // The group's half extent, widened so the gas glows around it.
                radius: (Math.max(box[2] - box[0], box[3] - box[1]) / height) * 1.5,
                color: [color[0], color[1], color[2]],
            }));
    }

    /**
     * The shaders drawn, of any origin, for the frame guard and the flashing check.
     * @returns Whether a heavy shader draws, and the moving ones' hashes.
     */
    guardedDrawn(): { readonly heavy: boolean; readonly moving: readonly string[] } {
        const drawn = this.placed.filter((placed) => placed.groups.length > 0);
        return {
            heavy: drawn.some((placed) => placed.shader.heavy === true),
            moving: drawn.filter((placed) => movesWith(placed)).map((placed) => placed.shader.hash),
        };
    }

    /** Release every target, mesh, program and observer. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.scene.onBeforeRenderObservable.remove(this.observer);
        this.releaseMotion?.();
        this.releaseMotion = null;
        for (const { effect } of this.effects.values()) {
            effect.dispose();
        }

        this.effects.clear();
        this.dropTargets();
        this.splatMaterial.dispose();
        this.layer.dispose();
        this.renderer.dispose();
    }

    /**
     * Whether an outline is on its way: the outlines are to be read again, or a shader they use is
     * still resolving or compiling. Until then no group is laid out, so the frame on screen has
     * neither the outline nor a background tinted by it.
     * @returns True while one is on its way.
     */
    get pending(): boolean {
        return (
            this.stale ||
            [...this.shaders.values()].includes("resolving") ||
            [...this.effects.values()].some((entry) => entry.ready === undefined)
        );
    }

    /** Ask a graph drawn on demand for one frame. */
    private requestFrame(): void {
        const release = animatesEveryFrame(this.scene);
        this.scene.onAfterRenderObservable.addOnce(release);
    }

    /**
     * A shader by id once resolved, starting its resolution the first time.
     * @param id - The id.
     * @returns The shader, or null while it cannot draw.
     */
    private shaderOf(id: string): HostShader | null {
        const known = this.shaders.get(id);
        if (known === undefined) {
            this.shaders.set(id, "resolving");
            void this.sources.shader(id).then(
                (shader) => {
                    if (this.shaders.get(id) === "resolving") {
                        this.shaders.set(id, shader?.registration.descriptor.target === "group" ? shader : null);
                        this.requestFrame();
                    }
                },
                () => {
                    this.shaders.set(id, null);
                },
            );
            return null;
        }

        return known === "resolving" ? null : known;
    }

    /**
     * A shader's compiled program, compiling it the first time.
     * @param shader - The shader.
     * @returns The program once compiled, else null.
     */
    private effectOf(shader: HostShader): SceneEffect | null {
        const { descriptor, glsl } = shader.registration;
        const key = `${shader.hash}|${descriptor.form ?? "field"}`;
        const known = this.effects.get(key);
        if (known !== undefined) {
            return known.ready === true ? known.effect : null;
        }

        const effect = sceneEffect(
            this.scene.getEngine(),
            `graphtyOutline${shader.hash.slice(0, 24)}${descriptor.form === "sphere" ? "s" : "f"}`,
            outlineProgram(descriptor, glsl),
        );
        const entry: { effect: SceneEffect; ready: boolean | undefined } = { effect, ready: undefined };
        this.effects.set(key, entry);
        void effect.ready.then((ok) => {
            entry.ready = ok;
            this.runtime.noteDrawn([shader.hash]);
            this.requestFrame();
        });
        return null;
    }

    /** Before each frame: lay the groups out, splat the fields and draw the outlines. */
    private frame(): void {
        if (this.stale) {
            this.stale = false;
            this.groups = this.sources.outlines();
            this.joins = levelJoins(this.groups);
        }

        const camera = this.scene.activeCamera;
        const placed = camera === null ? [] : this.layOut();
        this.placed = placed;
        this.follow();
        const drawsAny = placed.some((layer) => layer.groups.length > 0);
        const target = drawsAny ? this.sizedTargets() : null;
        this.layer.isEnabled = target !== null;
        if (target === null) {
            return;
        }

        for (const field of this.fields) {
            if (field.count > 0) {
                field.texture.render();
            }
        }

        this.composite(target, placed);
        this.draws++;
    }

    /** Hold a motion claim while a drawn outline loops with a speed that is not 0. */
    private follow(): void {
        const moves = this.placed.some((placed) => placed.groups.length > 0 && movesWith(placed));
        if (moves && this.releaseMotion === null) {
            this.releaseMotion = this.runtime.uniforms.claimMotion();
        } else if (!moves && this.releaseMotion !== null) {
            this.releaseMotion();
            this.releaseMotion = null;
        }
    }

    /**
     * Lay out every drawable outline for this frame: members' places on screen, each
     * group's box, sphere and field slot, and the splats of the field targets.
     * @returns The layers, bottom first.
     */
    private layOut(): PlacedLayer[] {
        const engine = this.scene.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const transform = this.scene.getTransformMatrix();
        const scaleY = Math.abs(this.scene.activeCamera?.getProjectionMatrix().m[5] ?? 1);
        const root = this.scene.getTransformNodeByName("graph-root") as TransformNode | null;
        const world = root?.getWorldMatrix();
        const rootScale = world === undefined ? 1 : Math.hypot(world.m[0], world.m[1], world.m[2]);

        // Sibling layers of one shader share a level, as the groups of one layer do (see levelJoins).
        let level = -1;
        let below = -2;
        const drawable = this.groups.flatMap((layer, i) => {
            const shader = this.shaderOf(layer.use.shader);
            const effect = shader === null ? null : this.effectOf(shader);
            if (shader === null || effect === null) {
                return [];
            }

            level += this.joins[i] && below === i - 1 ? 0 : 1;
            below = i;
            return [{ layer, shader, effect, depth: level, at: i }];
        });
        const top = level;
        for (const field of this.fields) {
            field.count = 0;
            field.members = 0;
        }

        const trees = new Map<string, GroupTree>();

        let slot = 0;
        const out: PlacedLayer[] = [];
        drawable.forEach(({ layer, shader, effect, depth, at }) => {
            const { descriptor } = shader.registration;
            const sphere = descriptor.form === "sphere";
            const nest = 1 + NEST_STEP * (top - depth);
            const reach = kernelReach(descriptor, fixedParamsOf(layer.use.params)) * nest;
            const groups: PlacedGroup[] = [];
            layer.groups.forEach((group, index) => {
                const members = group.members.flatMap((id) => {
                    const member = this.sources.member(id);
                    return member === undefined ? [] : [member];
                });
                if (members.length === 0 || (!sphere && slot >= FIELD_TARGETS * 4)) {
                    return;
                }

                const color: [number, number, number, number] = [0, 0, 0, 0];
                const discs = new Float32Array(members.length * 3);
                let cx = 0;
                let cy = 0;
                let cz = 0;
                members.forEach((member, i) => {
                    for (let c = 0; c < 4; c++) {
                        color[c] += member.color[c] / members.length;
                    }

                    cx += member.x / members.length;
                    cy += member.y / members.length;
                    cz += member.z / members.length;
                    const screen = this.toScreen(member, transform, world, width, height);
                    discs[i * 3] = screen.x;
                    discs[i * 3 + 1] = screen.y;
                    discs[i * 3 + 2] = (member.radius * rootScale * reach * scaleY * 0.5 * height) / screen.w;
                });

                if (sphere) {
                    let radius = 0;
                    for (const member of members) {
                        radius = Math.max(
                            radius,
                            Math.hypot(member.x - cx, member.y - cy, member.z - cz) +
                                member.radius * (1 + reach * 0.25),
                        );
                    }

                    radius *= nest;
                    const screen = this.toScreen({ x: cx, y: cy, z: cz }, transform, world, width, height);
                    const r = (radius * rootScale * scaleY * 0.5 * height) / screen.w;
                    groups.push({
                        key: group.key,
                        index,
                        color,
                        discs,
                        bridges: new Float32Array(0),
                        circle: { x: screen.x, y: screen.y, r },
                        box: [screen.x - r, screen.y - r, screen.x + r, screen.y + r],
                        slot: -1,
                    });
                    return;
                }

                const tree = this.treeOf(
                    `${layer.layer}\u0000${layer.use.shader}\u0000${String(at)}\u0000${String(group.key)}`,
                    members,
                    trees,
                );
                const { bridges, ends } = connectorsOf(tree.edges, members, discs, reach);
                let box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
                for (let i = 0; i < members.length; i++) {
                    const r = discs[i * 3 + 2];
                    box = [
                        Math.min(box[0], discs[i * 3] - r),
                        Math.min(box[1], discs[i * 3 + 1] - r),
                        Math.max(box[2], discs[i * 3] + r),
                        Math.max(box[3], discs[i * 3 + 1] + r),
                    ];
                }

                this.splat(slot, members, reach, ends);
                groups.push({
                    key: group.key,
                    index,
                    color,
                    discs,
                    bridges,
                    circle: { x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2, r: 0 },
                    box,
                    slot,
                });
                slot++;
            });
            out.push({
                layer: layer.layer,
                shader,
                effect,
                params: fixedParamsOf(layer.use.params),
                sphere,
                depth,
                groups,
            });
        });

        for (const field of this.fields) {
            this.upload(field);
        }

        this.trees = trees;
        return out;
    }

    /**
     * A group's spanning tree, built again only when one of its members moved.
     * @param key - The group's layer and key.
     * @param members - Its members.
     * @param next - The trees kept for the next frame.
     * @returns The tree.
     */
    private treeOf(key: string, members: readonly OutlineMember[], next: Map<string, GroupTree>): GroupTree {
        const known = this.trees.get(key);
        let same = known?.at.length === members.length * 3;
        for (let i = 0; same && i < members.length; i++) {
            const at = known?.at as Float32Array;
            const { x, y, z } = members[i];
            same = at[i * 3] === Math.fround(x) && at[i * 3 + 1] === Math.fround(y) && at[i * 3 + 2] === Math.fround(z);
        }

        let tree = known;
        if (tree === undefined || !same) {
            const at = new Float32Array(members.length * 3);
            members.forEach(({ x, y, z }, i) => {
                at.set([x, y, z], i * 3);
            });
            tree = { at, edges: spanningTree(at) };
            this.treesBuilt++;
        }

        next.set(key, tree);
        return tree;
    }

    /**
     * A point in graph-root space on screen.
     * @param at - The point.
     * @param at.x - X.
     * @param at.y - Y.
     * @param at.z - Z.
     * @param transform - The camera's view-projection.
     * @param world - The graph root's world matrix.
     * @param width - The drawing buffer's width.
     * @param height - Its height.
     * @returns Render pixels from the bottom-left corner, and the clip w.
     */
    private toScreen(
        at: { readonly x: number; readonly y: number; readonly z: number },
        transform: Matrix,
        world: Matrix | undefined,
        width: number,
        height: number,
    ): { x: number; y: number; w: number } {
        scratch.set(at.x, at.y, at.z);
        if (world !== undefined) {
            Vector3.TransformCoordinatesToRef(scratch, world, scratch);
        }

        const { m } = transform;
        const w = scratch.x * m[3] + scratch.y * m[7] + scratch.z * m[11] + m[15];
        Vector3.TransformCoordinatesToRef(scratch, transform, projected);
        return {
            x: (projected.x * 0.5 + 0.5) * width,
            y: (projected.y * 0.5 + 0.5) * height,
            w: Math.max(Math.abs(w), 1e-6),
        };
    }

    /**
     * Add one group's members to its field target's splats.
     * @param slot - The group's slot: target x 4 + channel.
     * @param members - Its members.
     * @param reach - The kernel radius, in member radii.
     * @param ends - The connectors: the two members' indices of each.
     */
    private splat(slot: number, members: readonly OutlineMember[], reach: number, ends: readonly number[]): void {
        const field = this.fieldTarget(Math.floor(slot / 4));
        const channel = slot % 4;
        const needed = (field.count + members.length + ends.length / 2) * SPLAT_STRIDE;
        if (field.splats.length < needed) {
            const grown = new Float32Array(Math.max(needed, field.splats.length * 2));
            grown.set(field.splats);
            field.splats = grown;
            field.buffer?.dispose();
            field.buffer = null;
        }

        const put = (a: OutlineMember, b: OutlineMember, radius: number): void => {
            const at = field.count * SPLAT_STRIDE;
            field.splats.set([a.x, a.y, a.z, radius, b.x, b.y, b.z, 0, 0, 0, 0, 0], at);
            field.splats[at + 8 + channel] = 1;
            field.count++;
        };
        for (const member of members) {
            put(member, member, member.radius * reach);
        }

        field.members += members.length;
        for (let i = 0; i < ends.length; i += 2) {
            const a = members[ends[i]];
            const b = members[ends[i + 1]];
            put(a, b, Math.min(a.radius, b.radius) * reach);
        }
    }

    /**
     * A field target's splat mesh, made the first time.
     * @param index - The target's index.
     * @returns The target.
     */
    private fieldTarget(index: number): FieldTarget {
        let field = this.fields[index] as FieldTarget | undefined;
        if (field !== undefined) {
            return field;
        }

        const mesh = new Mesh(`graphty-outline-splat-${String(index)}`, this.scene);
        const quad = new VertexData();
        quad.positions = QUAD_POSITIONS;
        quad.indices = QUAD_INDICES;
        quad.applyToMesh(mesh);
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.layerMask = SPLAT_MASK;
        mesh.material = this.splatMaterial;
        const root = this.scene.getTransformNodeByName("graph-root");
        if (root) {
            mesh.parent = root;
        }

        const size = this.fieldSize();
        const texture = sceneTarget(this.scene, `graphty-outline-field-${String(index)}`, size.size, size.halfFloat);
        texture.renderList = [mesh];
        field = { texture, mesh, splats: new Float32Array(SPLAT_STRIDE * 8), buffer: null, count: 0, members: 0 };
        this.fields[index] = field;
        return field;
    }

    /**
     * Upload a field target's splats and set how many draw.
     * @param field - The target.
     */
    private upload(field: FieldTarget): void {
        if (field.buffer === null) {
            field.buffer = new Buffer(this.scene.getEngine(), field.splats, true, SPLAT_STRIDE, false, true);
            SPLAT_ATTRIBUTES.forEach((name, i) => {
                field.mesh.setVerticesBuffer(
                    (field.buffer as Buffer).createVertexBuffer(name, i * 4, 4, SPLAT_STRIDE, true),
                );
            });
        } else {
            field.buffer.update(field.splats);
        }

        field.mesh.forcedInstanceCount = field.count;
        field.mesh.setEnabled(field.count > 0);
    }

    /**
     * The field targets' size and texel type at the quality level now.
     * @returns The size and whether texels are 16-bit floats.
     */
    private fieldSize(): { size: { width: number; height: number }; halfFloat: boolean } {
        const engine = this.scene.getEngine();
        const target = this.guard.targetSize(engine.getRenderWidth(), engine.getRenderHeight());
        const halfFloat = QUALITY_LEVELS[this.guard.quality.level].halfFloat && engine.getCaps().textureHalfFloatRender;
        return {
            size: {
                width: Math.max(1, Math.round(target.width * FIELD_SCALE)),
                height: Math.max(1, Math.round(target.height * FIELD_SCALE)),
            },
            halfFloat,
        };
    }

    /**
     * The outline target and the field targets at the size the quality level asks for, remade
     * when that changed; null when the render-target budget has no room.
     * @returns The outline target.
     */
    private sizedTargets(): RenderTargetTexture | null {
        const engine = this.scene.getEngine();
        const size = this.guard.targetSize(engine.getRenderWidth(), engine.getRenderHeight());
        const field = this.fieldSize();
        const fieldKey = `${String(field.size.width)}x${String(field.size.height)}|${String(field.halfFloat)}|${String(this.fields.length)}`;
        for (const each of this.fields) {
            const held = each.texture.getSize();
            if (held.width !== field.size.width || held.height !== field.size.height) {
                each.texture.resize(field.size);
            }
        }

        if (this.fieldBytes?.key !== fieldKey) {
            this.fieldBytes?.release();
            this.fieldBytes = null;
            const release = this.budget.reserve(targetBytes(field.size, field.halfFloat) * this.fields.length);
            if (release === null) {
                return null;
            }

            this.fieldBytes = { key: fieldKey, release };
        }

        const held = this.target?.texture.getSize();
        if (this.target !== null && held?.width === size.width && held.height === size.height) {
            return this.target.texture;
        }

        if (this.target !== null) {
            this.layer.texture = null;
            this.target.texture.dispose();
            this.target.release();
            this.target = null;
        }

        const release = this.budget.reserve(targetBytes(size, false));
        if (release === null) {
            return null;
        }

        const texture = sceneTarget(this.scene, "graphty-outline-target", size, false);
        this.target = { texture, release };
        this.layer.texture = texture;
        return texture;
    }

    /** Release every target and its bytes. */
    private dropTargets(): void {
        for (const field of this.fields) {
            field.texture.dispose();
            field.mesh.dispose();
            field.buffer?.dispose();
        }

        this.fields.length = 0;
        this.fieldBytes?.release();
        this.fieldBytes = null;
        if (this.target !== null) {
            this.layer.texture = null;
            this.target.texture.dispose();
            this.target.release();
            this.target = null;
        }
    }

    /**
     * Bind the field targets to a program's field samplers, the first target standing in for any
     * missing. A sphere outline reads no field, so it binds none.
     * @param program - The program.
     * @param sphere - Whether the layer draws spheres rather than fields.
     */
    private bindFields(program: SceneEffect["wrapper"]["effect"], sphere: boolean): void {
        if (sphere) {
            return;
        }

        FIELD_SAMPLERS.forEach((name, i) => {
            const texture = (this.fields[i] ?? this.fields[0]) as FieldTarget | undefined;
            if (texture !== undefined) {
                program.setTexture(name, texture.texture);
            }
        });
    }

    /**
     * Draw every group into the outline target, lowest layer first, each premultiplied over what
     * is beneath it, on its own box.
     * @param target - The outline target.
     * @param placed - The layers laid out for this frame.
     */
    private composite(target: RenderTargetTexture, placed: readonly PlacedLayer[]): void {
        const engine = this.scene.getEngine();
        const wrapperTarget = target.renderTarget;
        if (wrapperTarget === null) {
            return;
        }

        const size = target.getSize();
        const width = engine.getRenderWidth();
        const toTarget = size.width / width;
        const field = this.fieldSize();
        engine.bindFramebuffer(wrapperTarget, undefined, undefined, undefined, true);
        engine.clear(new Color4(0, 0, 0, 0), true, false, false);
        this.renderer.saveStates();
        try {
            for (const layer of placed) {
                const { effect, shader } = layer;
                for (const group of layer.groups) {
                    const pixels = pixelBox(group.box, toTarget, size);
                    if (pixels === null) {
                        continue;
                    }

                    const [x0, y0, x1, y1] = pixels;

                    this.renderer.setViewport(
                        new Viewport(
                            x0 / size.width,
                            y0 / size.height,
                            (x1 - x0) / size.width,
                            (y1 - y0) / size.height,
                        ),
                    );
                    this.renderer.applyEffectWrapper(effect.wrapper);
                    engine.setAlphaMode(Constants.ALPHA_PREMULTIPLIED);
                    const program = effect.wrapper.effect;
                    this.runtime.uniforms.bindTo(program);
                    program.setFloat4("graphty_resolution", size.width, size.height, 1 / toTarget, 0);
                    program.setFloat4(
                        "graphty_fieldTexel",
                        1 / field.size.width,
                        1 / field.size.height,
                        width / field.size.width,
                        field.halfFloat ? 1 : 1 / BYTE_FIELD_SCALE,
                    );
                    program.setFloat4(
                        "graphty_sphere",
                        group.circle.x * toTarget,
                        group.circle.y * toTarget,
                        Math.max(group.circle.r * toTarget, 1e-3),
                        layer.sphere ? 1 : 0,
                    );
                    program.setFloat4("graphty_groupColor", ...group.color);
                    program.setFloat4("graphty_groupInfo", group.index, layer.depth, Math.max(group.slot, 0), 0);
                    program.setFloat("graphty_freeze", this.runtime.uniforms.frozenTime(shader.hash));
                    this.bindFields(program, layer.sphere);

                    setParams(program, shader.registration.descriptor.params, layer.params);
                    this.renderer.draw();
                }

                this.runtime.noteDrawn([shader.hash]);
            }
        } finally {
            this.renderer.restoreStates();
            engine.setAlphaMode(Constants.ALPHA_DISABLE);
            engine.unBindFramebuffer(wrapperTarget);
        }
    }
}

/**
 * Keep the scene's background layers in order: the background shader first, the outlines next,
 * every other layer after them.
 * @param scene - The scene.
 */
export function orderLayers(scene: Scene): void {
    const order = [BACKGROUND_LAYER, OUTLINE_LAYER];
    const rank = (name: string): number => (order.includes(name) ? order.indexOf(name) : order.length);
    scene.layers.sort((a, b) => rank(a.name) - rank(b.name));
}

/**
 * Per outline, whether it shares the level of the layer beneath it: it names the same
 * shader as that layer and none of its members is in that level already. So a folder of community
 * layers, each with its own outline of one shader, draws its outlines side by side at one size,
 * as one layer grouping by community would; a layer over a subset of a level's nodes (a
 * subcommunity) starts a level above it, which draws smaller, so the level beneath rings it.
 * @param layers - The outlines, bottom first.
 * @returns One flag per layer; the first is false.
 */
export function levelJoins(layers: readonly GroupOutlineSet[]): boolean[] {
    let level = new Set<NodeId>();
    return layers.map((layer, i) => {
        const members = layer.groups.flatMap((group) => group.members);
        const joins = i > 0 && layer.use.shader === layers[i - 1].use.shader && members.every((id) => !level.has(id));
        if (!joins) {
            level = new Set();
        }

        for (const id of members) {
            level.add(id);
        }

        return joins;
    });
}

/**
 * A field outline's kernel radius, in member radii: the value of the parameter its `reachParam`
 * names (clamped to that parameter's range), else its `reach`, else the default.
 * @param descriptor - The shader's catalog facts.
 * @param params - The layer's parameter values over the defaults.
 * @returns The radius.
 */
export function kernelReach(
    descriptor: Pick<ShaderDescriptor, "params" | "reach" | "reachParam">,
    params: ShaderParams | undefined,
): number {
    const named = descriptor.params.find((param) => param.name === descriptor.reachParam);
    if (named !== undefined) {
        const value = uniformValueOf(named, params?.[named.name])[0];
        const min = typeof named.min === "number" ? named.min : 0;
        const max = typeof named.max === "number" ? named.max : Infinity;
        return Math.max(Math.min(value, max), min, 1e-3);
    }

    return descriptor.reach ?? DEFAULT_OUTLINE_REACH;
}

/**
 * Whether a laid-out layer's shader moves by itself: it loops and its speed is not 0.
 * @param placed - The layer.
 * @returns True when it does.
 */
function movesWith(placed: PlacedLayer): boolean {
    const { motion, params } = placed.shader.registration.descriptor;
    const { loop } = motionOf(motion);
    if (loop === undefined) {
        return false;
    }

    const speed = params.find((param) => param.name === loop.speedParam);
    return speed === undefined || uniformValueOf(speed, placed.params?.[speed.name])[0] !== 0;
}

/**
 * The summed kernel of a group's discs and connectors at a point, as the field target holds it.
 * @param discs - x, y, r per member, render pixels.
 * @param px - The point's x.
 * @param py - Its y, from the bottom.
 * @param bridges - x0, y0, x1, y1, r per connector, render pixels.
 * @returns The field there.
 */
export function fieldAt(discs: Float32Array, px: number, py: number, bridges?: Float32Array): number {
    let sum = 0;
    const add = (d2: number): void => {
        if (d2 < 1) {
            sum += (1 - d2) * (1 - d2);
        }
    };
    for (let i = 0; i < discs.length; i += 3) {
        const r = discs[i + 2];
        add(((px - discs[i]) ** 2 + (py - discs[i + 1]) ** 2) / (r * r));
    }

    for (let i = 0; bridges !== undefined && i < bridges.length; i += 5) {
        const [x0, y0, x1, y1, r] = bridges.subarray(i, i + 5);
        const dx = x1 - x0;
        const dy = y1 - y0;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / Math.max(dx * dx + dy * dy, 1e-9)));
        add(((px - x0 - t * dx) ** 2 + (py - y0 - t * dy) ** 2) / (r * r));
    }

    return sum;
}

/**
 * A minimum spanning tree over points, by Prim's method on the complete graph of their distances.
 * @param at - x, y, z per point.
 * @returns Its edges, two point indices each: n - 1 edges for n points.
 */
export function spanningTree(at: Float32Array): Uint32Array {
    // ponytail: O(n^2), fine for a group drawn as one outline (it runs only when a member moved);
    // a k-d tree or a Delaunay graph if groups of many thousands move every frame.
    const n = at.length / 3;
    const edges = new Uint32Array(Math.max(0, n - 1) * 2);
    const best = new Float64Array(n).fill(Infinity);
    const from = new Uint32Array(n);
    const done = new Uint8Array(n);
    let current = 0;
    for (let added = 0; added < n - 1; added++) {
        done[current] = 1;
        let next = -1;
        for (let j = 0; j < n; j++) {
            if (done[j] === 1) {
                continue;
            }

            const d =
                (at[j * 3] - at[current * 3]) ** 2 +
                (at[j * 3 + 1] - at[current * 3 + 1]) ** 2 +
                (at[j * 3 + 2] - at[current * 3 + 2]) ** 2;
            if (d < best[j]) {
                best[j] = d;
                from[j] = current;
            }

            if (next < 0 || best[j] < best[next]) {
                next = j;
            }
        }

        edges[added * 2] = from[next];
        edges[added * 2 + 1] = next;
        current = next;
    }

    return edges;
}

/**
 * The connectors of a group: its spanning tree's edges whose members are too far apart for their
 * own kernels to meet.
 * @param edges - The tree's edges.
 * @param members - The members.
 * @param discs - Their discs on screen, x, y, r per member.
 * @param reach - The kernel radius, in member radii.
 * @returns Each connector on screen (x0, y0, x1, y1, r), and its two members' indices.
 */
function connectorsOf(
    edges: Uint32Array,
    members: readonly OutlineMember[],
    discs: Float32Array,
    reach: number,
): { bridges: Float32Array; ends: number[] } {
    const ends: number[] = [];
    const screen: number[] = [];
    for (let e = 0; e < edges.length; e += 2) {
        const i = edges[e];
        const j = edges[e + 1];
        const a = members[i];
        const b = members[j];
        const apart = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (apart > Math.min(a.radius, b.radius) * reach * CONNECT_PAST) {
            ends.push(i, j);
            screen.push(
                discs[i * 3],
                discs[i * 3 + 1],
                discs[j * 3],
                discs[j * 3 + 1],
                Math.min(discs[i * 3 + 2], discs[j * 3 + 2]),
            );
        }
    }

    return { bridges: new Float32Array(screen), ends };
}

/**
 * How far inside a group's sphere a point is: 1 at its center, 0 on its rim, below 0 outside.
 * @param group - The group.
 * @param px - The point's x.
 * @param py - Its y, from the bottom.
 * @returns The score.
 */
function sphereScore(group: PlacedGroup, px: number, py: number): number {
    const { x, y, r } = group.circle;
    return r <= 0 ? -1 : 1 - Math.hypot(px - x, py - y) / r;
}
