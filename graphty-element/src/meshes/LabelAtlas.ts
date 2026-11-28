/**
 * @file One draw for every label drawn from its own canvas (issue #10230).
 *
 * A label is a plane with its own material and texture, so 10,000 labeled nodes put 10,000 meshes
 * in Babylon's transparent pass: sorted and drawn one at a time, about 100 ms of every frame, and
 * every input waited for those frames. Here a label shrunk for its size on screen (see
 * LabelTexture) is copied into one texture array, and one thin-instanced mesh draws every such
 * label, each instance at its plane's world matrix, in the order Babylon would have drawn the
 * planes: farthest first.
 *
 * The plane stays, as the glyph draw keeps it (GlyphLabels): it places, declutters, hides and picks
 * the label, and its layer mask of 0 keeps it out of the frame. What it would have drawn is drawn
 * through a StandardMaterial set up as the label's own, so the picture is the same; only where the
 * color is read from differs: the label's region of the array, read as the label's own texture is
 * (bilinear, no mip levels, clamped to its edge).
 */

// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings. See EdgeLineBatch.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";
// Installs createRawTexture2DArray on the engine.
import "@babylonjs/core/Engines/Extensions/engine.rawTexture.js";

import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine.js";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import type { ICanvas } from "@babylonjs/core/Engines/ICanvas.js";
import type { ThinEngine } from "@babylonjs/core/Engines/thinEngine.js";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase.js";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { RawTexture2DArray } from "@babylonjs/core/Materials/Textures/rawTexture2DArray.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { VertexBuffer } from "@babylonjs/core/Meshes/buffer.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import type { Observer } from "@babylonjs/core/Misc/observable.js";
import type { RenderingGroupInfo } from "@babylonjs/core/Rendering/renderingManager.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { PREMULTIPLIED_ALPHA_MODE } from "./LabelBatch";

/** The name of a scene's one label draw. */
const LABEL_ATLAS_NAME = "labelAtlas";

/** Whether a new scene draws its shrunk labels from an atlas; tests turn it off to draw the same labels on their own planes. */
export const labelAtlasEnabled = { value: true };

/** The rendering group labels are drawn in (RichTextLabel's LABEL_RENDERING_GROUP). */
const LABEL_GROUP = 1;

/**
 * Drawn before every label plane still drawn on its own (their `alphaIndex` is Babylon's default,
 * `Number.MAX_VALUE`) and after every annotation: those are the planes drawn whole, which are the
 * labels nearest the camera, so the array's labels behind them are drawn first, as before.
 */
const ATLAS_ALPHA_INDEX = 1e308;

/** The side of one layer of the array, in texels. */
const SIDE = 2048;
/** The side of a page: a square of a layer holding the slots of one size. */
const PAGE = 512;
/** Pages in one layer. */
const PAGES_PER_LAYER = (SIDE / PAGE) ** 2;
/** The most layers the array grows to: 1 GB of texels, about what 10,000 whole label textures take. */
const MAX_LAYERS = 64;

/** A label's place in the array: a power-of-two box, so a freed one fits the next label of its size. */
interface Slot {
    readonly page: Page;
    readonly index: number;
    readonly layer: number;
    readonly x: number;
    readonly y: number;
}

/** A page given to one slot size, and its free slots. */
interface Page {
    readonly layer: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly free: number[];
    used: number;
}

/** A label drawn from the array: its plane, the canvas it was last given and where that is. */
interface Entry {
    readonly mesh: Mesh;
    canvas: ICanvas;
    width: number;
    height: number;
    slot: Slot;
    /** The plane's position buffer its size was read from: a resized plane gets a new one (RichTextLabel's `spanTarget`). */
    positions: VertexBuffer | null;
    /** The plane's width and height, as its vertices hold them. */
    sizeX: number;
    sizeY: number;
}

/**
 * The next power of two at or above a size.
 * @param size - The size, at least 1.
 * @returns The power of two.
 */
function pow2(size: number): number {
    return 2 ** Math.ceil(Math.log2(Math.max(1, size)));
}

/** Hands out slots of power-of-two sizes from pages of the layers, and takes them back. */
class Packer {
    /** Pages not given to any size. */
    private readonly spare: { layer: number; x: number; y: number }[] = [];
    /** By slot size, the pages with a free slot. */
    private readonly open = new Map<string, Set<Page>>();
    layers = 0;

    /**
     * Add layers' pages to the spare ones.
     * @param layers - The array's new number of layers.
     */
    grow(layers: number): void {
        for (let layer = this.layers; layer < layers; layer++) {
            for (let p = 0; p < PAGES_PER_LAYER; p++) {
                this.spare.push({ layer, x: (p % (SIDE / PAGE)) * PAGE, y: Math.floor(p / (SIDE / PAGE)) * PAGE });
            }
        }
        this.layers = layers;
    }

    /**
     * A slot for a canvas of this size.
     * @param width - Its width, at most a page.
     * @param height - Its height, at most a page.
     * @returns The slot, or null when every page is taken.
     */
    take(width: number, height: number): Slot | null {
        const w = pow2(width);
        const h = pow2(height);
        const key = `${w}x${h}`;
        let pages = this.open.get(key);
        if (pages === undefined) {
            pages = new Set();
            this.open.set(key, pages);
        }
        let page: Page | undefined = pages.values().next().value;
        if (page === undefined) {
            const at = this.spare.pop();
            if (at === undefined) {
                return null;
            }
            const count = (PAGE / w) * (PAGE / h);
            page = {
                ...at,
                width: w,
                height: h,
                used: 0,
                free: Array.from({ length: count }, (_, i) => count - 1 - i),
            };
            pages.add(page);
        }
        const index = page.free.pop() as number;
        page.used++;
        if (page.free.length === 0) {
            pages.delete(page);
        }
        const across = PAGE / w;
        return {
            page,
            index,
            layer: page.layer,
            x: page.x + (index % across) * w,
            y: page.y + Math.floor(index / across) * h,
        };
    }

    /**
     * Take a slot back; a page left empty goes back to the spare ones.
     * @param slot - The slot.
     */
    give(slot: Slot): void {
        const { page } = slot;
        const pages = this.open.get(`${page.width}x${page.height}`);
        page.free.push(slot.index);
        page.used--;
        if (page.used === 0) {
            pages?.delete(page);
            this.spare.push({ layer: page.layer, x: page.x, y: page.y });
        } else {
            pages?.add(page);
        }
    }
}

/**
 * Reads a label's color from its region of the array instead of from a texture of its own, as its own texture is
 * read: bilinear on its one level (Babylon's BILINEAR_SAMPLINGMODE has no mip levels), clamped to its edge.
 */
class LabelAtlasPlugin extends MaterialPluginBase {
    constructor(material: StandardMaterial) {
        super(material, "GraphtyLabelAtlas", 300, { GRAPHTY_LABEL_ATLAS: true });
        this._enable(true);
    }

    override getClassName(): string {
        return "GraphtyLabelAtlas";
    }

    override isCompatible(shaderLanguage: ShaderLanguage): boolean {
        return shaderLanguage === ShaderLanguage.GLSL;
    }

    override getAttributes(attributes: string[]): void {
        attributes.push("labelBox", "labelLayer");
    }

    override getCustomCode(shaderType: string): Record<string, string> | null {
        if (shaderType === "vertex") {
            return {
                CUSTOM_VERTEX_DEFINITIONS: `attribute vec4 labelBox;
attribute float labelLayer;
flat varying vec4 vLabelBox;
flat varying float vLabelLayer;`,
                CUSTOM_VERTEX_MAIN_BEGIN: "vLabelBox = labelBox;\nvLabelLayer = labelLayer;",
            };
        }
        return {
            "!uniform sampler2D diffuseSampler;": "uniform highp sampler2DArray diffuseSampler;",
            CUSTOM_FRAGMENT_DEFINITIONS: `flat varying vec4 vLabelBox;
flat varying float vLabelLayer;
vec4 labelAtlasSample(vec2 uv) {
    vec2 at = clamp(vLabelBox.xy + uv * vLabelBox.zw, vLabelBox.xy + 0.5, vLabelBox.xy + vLabelBox.zw - 0.5);
    return texture(diffuseSampler, vec3(at / ${SIDE.toFixed(1)}, vLabelLayer));
}`,
            "!baseColor=TEXRD\\(diffuseSampler,vDiffuseUV\\+uvOffset\\);":
                "baseColor=labelAtlasSample(vDiffuseUV+uvOffset);",
        };
    }
}

/**
 * The WebGL 2 context of an engine that has one.
 * @param engine - The engine.
 * @returns Its context; null for WebGPU, WebGL 1 and the null engine.
 */
function webgl2Of(engine: AbstractEngine): WebGL2RenderingContext | null {
    if (engine.isWebGPU || typeof WebGL2RenderingContext === "undefined") {
        return null;
    }
    const gl = (engine as unknown as { _gl?: unknown })._gl;
    return gl instanceof WebGL2RenderingContext ? gl : null;
}

/**
 * Whether the scene's list of active meshes is frozen: Babylon then recomputes no world matrix.
 * @param scene - The scene.
 * @returns Babylon's private flag.
 */
function activeMeshesFrozen(scene: Scene): boolean {
    return (scene as unknown as { _activeMeshesFrozen: boolean })._activeMeshesFrozen;
}

/** Every label of a scene drawn from the array, in one draw. */
export class LabelAtlas {
    private static readonly perScene = new WeakMap<Scene, LabelAtlas | null>();

    private readonly mesh: Mesh;
    private readonly material: StandardMaterial;
    private texture: RawTexture2DArray | null = null;
    private readonly packer = new Packer();
    private readonly entries = new Map<Mesh, Entry>();
    private matrices = new Float32Array(16 * 64);
    private boxes = new Float32Array(4 * 64);
    private layers = new Float32Array(64);
    private readonly shown: Entry[] = [];
    private readonly distances: number[] = [];
    private readonly order: number[] = [];
    /**
     * Whether a label was put, moved or dropped since the last frame's instances were written. While the scene's list
     * of active meshes is frozen nothing else can change them: whatever moves, hides, shows, adds or removes a mesh
     * thaws it first (UpdateManager's `settleActiveMeshFreeze`).
     */
    private changed = true;
    /** Instances written since the atlas was made, for tests: a still scene writes none. */
    private written = 0;
    /** Reads the label's region of the array; see {@link LabelAtlasPlugin}. */
    private readonly plugin: LabelAtlasPlugin;
    /** Stops listening to the scene and the engine. */
    private readonly stop: () => void;

    /**
     * The scene's draw, made on first use; null where it cannot be made (WebGPU, WebGL 1, no GPU),
     * where every label keeps drawing on its own.
     * @param scene - The scene.
     * @returns Its draw, or null.
     */
    static of(scene: Scene): LabelAtlas | null {
        let atlas = LabelAtlas.perScene.get(scene);
        if (atlas === undefined) {
            const gl = webgl2Of(scene.getEngine());
            atlas = gl === null || !labelAtlasEnabled.value ? null : new LabelAtlas(scene, gl);
            LabelAtlas.perScene.set(scene, atlas);
        }
        return atlas;
    }

    /**
     * Stop drawing a label from the array; nothing when it is not drawn from it.
     * @param scene - The label's scene.
     * @param mesh - Its plane.
     */
    static remove(scene: Scene, mesh: Mesh): void {
        const atlas = LabelAtlas.perScene.get(scene);
        if (!atlas) {
            return;
        }
        atlas.drop(mesh);
        // The draw goes with the last label it draws, as an edge batch goes with its last edge: a cleared graph leaves
        // nothing in the scene, and the next label makes a new one.
        if (atlas.entries.size === 0) {
            atlas.dispose();
        }
    }

    /**
     * How many labels are drawn from the array, how many instances the last frame drew, and how many instances have
     * been written in all.
     * @param scene - The scene.
     * @returns The counts; zero where there is no array.
     */
    static countsOf(scene: Scene): { labels: number; drawn: number; written: number } {
        const atlas = LabelAtlas.perScene.get(scene);
        return atlas
            ? { labels: atlas.entries.size, drawn: atlas.mesh.thinInstanceCount, written: atlas.written }
            : { labels: 0, drawn: 0, written: 0 };
    }

    private constructor(
        private readonly scene: Scene,
        private readonly gl: WebGL2RenderingContext,
    ) {
        this.mesh = MeshBuilder.CreatePlane(LABEL_ATLAS_NAME, { size: 1 }, scene);
        this.mesh.isPickable = false;
        this.mesh.alwaysSelectAsActiveMesh = true;
        this.mesh.doNotSyncBoundingInfo = true;
        this.mesh.renderingGroupId = LABEL_GROUP;
        this.mesh.alphaIndex = ATLAS_ALPHA_INDEX;
        this.material = this.buildMaterial();
        this.plugin = new LabelAtlasPlugin(this.material);
        this.mesh.material = this.material;
        this.mesh.thinInstanceSetBuffer("matrix", this.matrices, 16, false);
        this.mesh.thinInstanceSetBuffer("labelBox", this.boxes, 4, false);
        this.mesh.thinInstanceSetBuffer("labelLayer", this.layers, 1, false);
        this.mesh.thinInstanceCount = 1;
        this.grow(1);

        const engine = scene.getEngine();
        const frame: Observer<RenderingGroupInfo> = scene.onBeforeRenderingGroupObservable.add(() => {
            this.update();
        }, 1 << LABEL_GROUP);
        // A lost context loses what was copied in; Babylon gives the array back empty.
        const restored = engine.onContextRestoredObservable.add(() => {
            this.uploadAll();
        });
        const disposed = scene.onDisposeObservable.addOnce(() => {
            this.dispose();
        });
        this.stop = () => {
            scene.onBeforeRenderingGroupObservable.remove(frame);
            engine.onContextRestoredObservable.remove(restored);
            scene.onDisposeObservable.remove(disposed);
        };
    }

    /** Take the draw out of the scene and release what it holds. */
    private dispose(): void {
        this.stop();
        LabelAtlas.perScene.delete(this.scene);
        this.mesh.dispose();
        this.material.dispose();
        this.texture?.dispose();
        this.texture = null;
    }

    /**
     * Draw a label from the array with what its canvas holds now.
     * @param mesh - The label's plane.
     * @param canvas - What its texture would upload: its canvas, at the size it is drawn at.
     * @returns False when it does not fit (larger than a page, or the array is full); the label then draws itself.
     */
    put(mesh: Mesh, canvas: ICanvas): boolean {
        const { width, height } = canvas;
        if (width > PAGE || height > PAGE || width < 1 || height < 1) {
            this.drop(mesh);
            return false;
        }
        let entry = this.entries.get(mesh);
        if (entry !== undefined && (pow2(width) !== entry.slot.page.width || pow2(height) !== entry.slot.page.height)) {
            this.drop(mesh);
            entry = undefined;
        }
        if (entry === undefined) {
            const slot = this.takeSlot(width, height);
            if (slot === null) {
                return false;
            }
            entry = { mesh, canvas, width, height, slot, positions: null, sizeX: 0, sizeY: 0 };
            this.entries.set(mesh, entry);
        }
        entry.canvas = canvas;
        entry.width = width;
        entry.height = height;
        this.upload(entry);
        this.changed = true;
        return true;
    }

    private takeSlot(width: number, height: number): Slot | null {
        const slot = this.packer.take(width, height);
        if (slot !== null || this.packer.layers >= MAX_LAYERS) {
            return slot;
        }
        this.grow(Math.min(MAX_LAYERS, this.packer.layers * 2));
        return this.packer.take(width, height);
    }

    private drop(mesh: Mesh): void {
        const entry = this.entries.get(mesh);
        if (entry !== undefined) {
            this.packer.give(entry.slot);
            this.entries.delete(mesh);
            this.changed = true;
        }
    }

    /**
     * Make the array this many layers deep, keeping every label where it was.
     * @param layers - The new depth.
     */
    private grow(layers: number): void {
        const old = this.texture;
        const texture = new RawTexture2DArray(
            null,
            SIDE,
            SIDE,
            layers,
            Constants.TEXTUREFORMAT_RGBA,
            this.scene,
            false,
            false,
            Texture.BILINEAR_SAMPLINGMODE,
            Constants.TEXTURETYPE_UNSIGNED_BYTE,
        );
        texture.name = "labelAtlasTexture";
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        texture.wrapR = Texture.CLAMP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 1;
        texture.hasAlpha = true;
        this.texture = texture;
        this.material.diffuseTexture = texture;
        old?.dispose();
        this.packer.grow(layers);
        this.uploadAll();
    }

    private uploadAll(): void {
        this.changed = true;
        for (const entry of this.entries.values()) {
            this.upload(entry);
        }
    }

    /**
     * Copy a label's canvas into its slot, as Babylon uploads a label's own texture: flipped, its
     * colors multiplied by their alpha. The rest of the slot is never read.
     * @param entry - The label.
     */
    private upload(entry: Entry): void {
        const internal = this.texture?.getInternalTexture();
        if (!internal) {
            return;
        }
        const { gl } = this;
        const engine = this.scene.getEngine() as unknown as ThinEngine;
        const { slot } = entry;
        const target = gl.TEXTURE_2D_ARRAY;
        engine._bindTextureDirectly(target, internal, true);
        engine._unpackFlipY(true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texSubImage3D(
            target,
            0,
            slot.x,
            slot.y,
            slot.layer,
            entry.width,
            entry.height,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            entry.canvas as unknown as TexImageSource,
        );
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        engine._bindTextureDirectly(target, null);
    }

    /** Before the label group is drawn: one instance per shown label, farthest first. */
    private update(): void {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        // Babylon computed every enabled plane's world matrix while it chose this frame's meshes
        // (before it read their layer mask), and computes none while the list is frozen, when nothing moves.
        const frozen = activeMeshesFrozen(this.scene);
        if (frozen && !this.changed) {
            // A still scene: the instances written last frame are this frame's.
            return;
        }
        this.changed = false;
        const eye = camera.globalPosition;
        const { shown, distances, order } = this;
        shown.length = 0;
        for (const entry of this.entries.values()) {
            const { mesh } = entry;
            if (mesh.isDisposed()) {
                this.drop(mesh);
                continue;
            }
            if (!mesh.isEnabled() || !mesh.isVisible || mesh.visibility <= 0) {
                continue;
            }
            const { m } = frozen ? mesh.getWorldMatrix() : mesh.computeWorldMatrix();
            const dx = m[12] - eye.x;
            const dy = m[13] - eye.y;
            const dz = m[14] - eye.z;
            distances[shown.length] = Math.hypot(dx, dy, dz);
            order[shown.length] = shown.length;
            shown.push(entry);
        }
        const count = shown.length;
        distances.length = count;
        order.length = count;
        // Back to front, ties in the order the labels came in: Babylon's transparent sort, which is stable.
        order.sort((a, b) => distances[b] - distances[a]);

        const room = Math.max(1, count);
        if (room > this.boxes.length / 4) {
            const size = Math.max(room, (this.boxes.length / 4) * 2);
            this.matrices = new Float32Array(size * 16);
            this.boxes = new Float32Array(size * 4);
            this.layers = new Float32Array(size);
            this.mesh.thinInstanceSetBuffer("matrix", this.matrices, 16, false);
            this.mesh.thinInstanceSetBuffer("labelBox", this.boxes, 4, false);
            this.mesh.thinInstanceSetBuffer("labelLayer", this.layers, 1, false);
        }
        for (let i = 0; i < count; i++) {
            this.write(i, shown[order[i]]);
        }
        this.written += count;
        if (count === 0) {
            // One instance that covers nothing: a thin-instanced mesh with none draws its plane once, untransformed.
            this.matrices.fill(0, 0, 16);
        }
        this.mesh.thinInstanceCount = room;
        this.mesh.thinInstanceBufferUpdated("matrix");
        this.mesh.thinInstanceBufferUpdated("labelBox");
        this.mesh.thinInstanceBufferUpdated("labelLayer");
    }

    /**
     * One instance: the plane's world matrix, scaled from the unit plane to the label's, and where its texels are.
     * @param i - The instance.
     * @param entry - The label.
     */
    private write(i: number, entry: Entry): void {
        const { mesh } = entry;
        const { m } = mesh.getWorldMatrix();
        // The plane's size, read again only when its vertices change: `getBoundingInfo` also rebuilds the plane's
        // world box, which nothing reads on a plane drawn from the array, and at 10,000 labels cost more than the draw.
        const positions = mesh.getVertexBuffer(VertexBuffer.PositionKind);
        if (positions !== entry.positions) {
            const half = mesh.getBoundingInfo().boundingBox.extendSize;
            entry.positions = positions;
            entry.sizeX = 2 * half.x;
            entry.sizeY = 2 * half.y;
        }
        const sx = entry.sizeX;
        const sy = entry.sizeY;
        const out = this.matrices;
        const at = i * 16;
        for (let c = 0; c < 4; c++) {
            out[at + c] = m[c] * sx;
            out[at + 4 + c] = m[4 + c] * sy;
            out[at + 8 + c] = m[8 + c];
            out[at + 12 + c] = m[12 + c];
        }
        const { slot } = entry;
        this.boxes[i * 4] = slot.x;
        this.boxes[i * 4 + 1] = slot.y;
        this.boxes[i * 4 + 2] = entry.width;
        this.boxes[i * 4 + 3] = entry.height;
        this.layers[i] = slot.layer;
    }

    /**
     * A label's own material (RichTextLabel's `_createMaterial`); the plugin makes it read the array.
     * @returns The material.
     */
    private buildMaterial(): StandardMaterial {
        const material = new StandardMaterial("labelAtlasMaterial", this.scene);
        material.specularColor = new Color3(0, 0, 0);
        material.stencil.enabled = true;
        material.stencil.mask = 0x00;
        material.diffuseColor = new Color3(0, 0, 0);
        material.emissiveColor = new Color3(1, 1, 1);
        material.backFaceCulling = false;
        material.useAlphaFromDiffuseTexture = true;
        material.alphaMode = PREMULTIPLIED_ALPHA_MODE;
        return material;
    }
}
