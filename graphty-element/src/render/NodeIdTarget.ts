import { Constants } from "@babylonjs/core/Engines/constants.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import type { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector2 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { isRowBatch, isUnscaledRowBatch } from "../meshes/RowPullPlugin";

/**
 * @file The node ID target: what hover reads instead of picking (design/rendering/row-renderer.md 4.4).
 *
 * A render target the size of the canvas, drawn from the scene's camera with depth and no
 * antialiasing. A node batch writes row + 1 into each pixel it covers, as RGB; every other
 * pickable mesh drawn (labels, object rows, models) writes {@link OBJECT_TEXEL}, which tells the
 * reader to ask the mesh pick. Reading one pixel names the row under the pointer with no walk
 * over nodes. On WebGPU, whose reads answer frames later, the target is a float target and each
 * row's pixels also carry where the row was drawn -- its center and the radius it is picked within
 * -- so an answer says where its row stood in the frame it was read from, however far a running
 * layout has moved the row since. The target is redrawn only when a read finds it older than the
 * frame on screen,
 * and in each frame drawn while reads keep coming, so a hover that restyles its node does not
 * make the next move redraw.
 */

/** A read that landed on nothing. */
export const ID_NONE = -1;
/** A read that landed on a mesh that is not a batched row: the mesh pick answers. */
export const ID_OBJECT = -2;

/**
 * The least radius, in device pixels, a row is drawn with in the target. A row smaller than a pixel
 * may cover no pixel center at all; drawn this large, a pointer within it finds it in the pixel it is
 * in. Larger rows are drawn as they are.
 */
export const MIN_RADIUS_PX = 1.5;

/** The texel a non-batch mesh writes; rows go up to one less. */
const OBJECT_TEXEL = 0xffffff;

const VERTEX = `precision highp float;
attribute vec3 position;
#ifdef ROW_PULL
attribute float graphtyRow;
uniform highp sampler2D rowPosition;
#endif
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef ROW_PULL
uniform vec2 idPixels;
uniform float shapeRadius;
#endif
varying float vId;
#ifdef ID_FLOAT
// The row's center in clip space over w, and the radius it is picked within, in device pixels.
varying vec3 vPick;
#endif
void main(void) {
#ifdef ID_FLOAT
    vPick = vec3(0.0);
#endif
#include<instancesVertex>
#ifdef ROW_UNSCALED
    finalWorld = world;
#endif
    vec4 worldPos = finalWorld * vec4(position, 1.0);
#ifdef ROW_PULL
    int grRow = int(graphtyRow + 0.5);
    vec4 grPlace = graphtyRow < 0.0 ? vec4(0.0) : texelFetch(rowPosition, ivec2(grRow & 1023, grRow >> 10), 0);
    vec3 grOrigin = world[3].xyz;
    worldPos = vec4((worldPos.xyz - grOrigin) * grPlace.w + grOrigin + mat3(world) * grPlace.xyz, worldPos.w);
    vId = graphtyRow + 1.0;
    // A row under MIN_RADIUS_PX in radius is drawn that large around its center, so a pointer on it
    // finds it in the pixel it is in. shapeRadius is the batch's largest half-extent.
    vec3 grCenter = (finalWorld[3].xyz - grOrigin) * grPlace.w + grOrigin + mat3(world) * grPlace.xyz;
    vec4 grC = viewProjection * vec4(grCenter, 1.0);
    vec4 grX = viewProjection * vec4(grCenter + mat3(finalWorld)[0] * grPlace.w, 1.0);
    vec4 grY = viewProjection * vec4(grCenter + mat3(finalWorld)[1] * grPlace.w, 1.0);
    vec4 grV = viewProjection * worldPos;
    if (grC.w > 0.0 && grV.w > 0.0) {
        vec2 grNdc = grC.xy / grC.w;
        float grRadius = 0.5 * shapeRadius * max(length((grX.xy / grX.w - grNdc) * idPixels), length((grY.xy / grY.w - grNdc) * idPixels));
        if (grRadius > 0.0 && grRadius < MIN_RADIUS_PX) {
            grV.xy = (grNdc + (grV.xy / grV.w - grNdc) * (MIN_RADIUS_PX / grRadius)) * grV.w;
        }
#ifdef ID_FLOAT
        vPick = vec3(grNdc, grRadius > 0.0 ? max(grRadius, MIN_RADIUS_PX) : 0.0);
#endif
    }
    gl_Position = grV;
#else
    vId = 0.0;
    gl_Position = viewProjection * worldPos;
#endif
}
`;

const FRAGMENT = `precision highp float;
varying float vId;
#ifdef ID_FLOAT
varying vec3 vPick;
#endif
void main(void) {
#if defined(ROW_PULL) && defined(ID_FLOAT)
    gl_FragColor = vec4(floor(vId + 0.5), vPick);
#elif defined(ROW_PULL)
    float id = floor(vId + 0.5);
    gl_FragColor = vec4(mod(id, 256.0), mod(floor(id / 256.0), 256.0), floor(id / 65536.0), 255.0) / 255.0;
#elif defined(ID_FLOAT)
    gl_FragColor = vec4(16777215.0, 0.0, 0.0, 0.0);
#else
    // A constant: interpolated, 16777215 can round to 16777216 and read as a row.
    gl_FragColor = vec4(1.0);
#endif
}
`;

/**
 * A render target that says when it really drew. Its readiness check notifies the same observers
 * a drawing does (before bind, before and after render, after unbind) while drawing nothing, so
 * no observer can tell the two apart.
 */
class IdTexture extends RenderTargetTexture {
    /** Called after each drawing, in a frame or not. */
    onDrawn: (() => void) | null = null;

    override render(useCameraPostProcess?: boolean, dumpForDebug?: boolean): void {
        // Drawn as a frame draws its targets: as intermediate rendering. Outside it -- a read
        // redrawing a stale target between frames -- the scene's effect layers (the node glow's
        // highlight layer) composite their glow into whatever is bound after each rendering
        // group, which here is this target, writing colors that name no row (#6121).
        const scene = this.getScene();
        const was = scene?._intermediateRendering ?? false;
        if (scene) {
            scene._intermediateRendering = true;
        }

        try {
            super.render(useCameraPostProcess, dumpForDebug);
        } finally {
            if (scene) {
                scene._intermediateRendering = was;
            }
        }

        this.onDrawn?.();
    }
}

/**
 * Where a row was drawn in the frame a read was answered from, in CSS pixels from the canvas's
 * top-left corner: its center, and the radius the target picks it within (at least
 * {@link MIN_RADIUS_PX} device pixels).
 */
export interface IdDrawn {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
}

/** A read's answer: the texel, and where its row was drawn when the target says so. */
export interface IdPick {
    /** The row, {@link ID_NONE} or {@link ID_OBJECT}. */
    readonly texel: number;
    /** Where the row was drawn; only a float target (WebGPU) says, and only for a row. */
    readonly drawn?: IdDrawn;
}

/** What the target asks of its graph. */
export interface NodeIdHost {
    /** The texture that places each row, as the batches read it. */
    positionTexture(): RawTexture;
    /** Draw a frame soon: the target is drawn inside one. */
    requestFrame(): void;
}

/** The ID target of one scene; see the file comment. */
export class NodeIdTarget {
    /** How many times the target was drawn, and how many pixels were read from it. */
    readonly counts = { draws: 0, reads: 0 };

    private readonly target: IdTexture;
    private readonly rowMaterial: ShaderMaterial;
    /** {@link rowMaterial} for a batch that sends no matrices, its rows all unscaled. */
    private readonly unscaledRowMaterial: ShaderMaterial;
    private readonly objectMaterial: ShaderMaterial;
    private readonly list: AbstractMesh[] = [];
    /** Whether the target is a float target whose rows also carry where they were drawn (WebGPU). */
    private readonly float: boolean;
    private readonly pixels = new Vector2();
    private readonly stops: (() => void)[] = [];
    /** The frame the target was last drawn in. */
    private drawnIn = -1;
    /** A read came since the last draw, so the next frame redraws it. */
    private inUse = false;
    /** Reads waiting for the target to be drawn. */
    private readonly waiting: (() => void)[] = [];
    private disposed = false;

    /**
     * Start the target of a scene.
     * @param scene - The scene.
     * @param host - The graph.
     */
    constructor(
        private readonly scene: Scene,
        private readonly host: NodeIdHost,
    ) {
        const engine = scene.getEngine();
        this.float = engine.isWebGPU;
        this.target = new IdTexture(
            "graphty-node-ids",
            { width: engine.getRenderWidth(), height: engine.getRenderHeight() },
            scene,
            {
                generateMipMaps: false,
                generateDepthBuffer: true,
                type: this.float ? Constants.TEXTURETYPE_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                samples: 1,
            },
        );
        this.target.clearColor = new Color4(0, 0, 0, 0);
        this.target.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        const floatDefines = this.float ? ["#define ID_FLOAT"] : [];
        const rowDefines = ["#define ROW_PULL", `#define MIN_RADIUS_PX ${MIN_RADIUS_PX.toFixed(1)}`, ...floatDefines];
        this.rowMaterial = this.material("graphty-node-id-rows", rowDefines);
        this.unscaledRowMaterial = this.material("graphty-node-id-unscaled-rows", [
            ...rowDefines,
            "#define ROW_UNSCALED",
        ]);
        this.objectMaterial = this.material("graphty-node-id-objects", floatDefines);
        // What the scene chose to draw at its last evaluation: the batches and every visible mesh.
        // A hidden proxy is not among them, so the list is as long as what is on screen. Kept
        // here, because between frames the scene's own list is not.
        this.target.getCustomRenderList = () => this.list;
        this.stops.push(
            observe(scene.onAfterActiveMeshesEvaluationObservable, () => {
                const drawn = scene.getActiveMeshes();
                this.collect(drawn.data, drawn.length);
            }),
            observe(this.target.onBeforeRenderObservable, () => {
                const { width, height } = this.target.getSize();
                for (const material of [this.rowMaterial, this.unscaledRowMaterial]) {
                    material.setTexture("rowPosition", this.host.positionTexture());
                    material.setVector2("idPixels", this.pixels.set(width, height));
                }
            }),
            observe(scene.onBeforeRenderObservable, () => {
                this.fit();
                if (this.inUse || this.waiting.length > 0) {
                    this.target.resetRefreshCounter();
                }
            }),
            observe(scene.onAfterRenderObservable, () => {
                this.settle();
            }),
        );
        // Each batch's own size, which its source mesh was built at.
        for (const material of [this.rowMaterial, this.unscaledRowMaterial]) {
            material.onBindObservable.add((mesh) => {
                const { extendSize } = mesh.getRawBoundingInfo().boundingBox;
                mesh.subMeshes[0]?.effect?.setFloat("shapeRadius", Math.max(extendSize.x, extendSize.y, extendSize.z));
            });
        }
        this.target.onDrawn = () => {
            // Babylon skips a mesh whose material has not compiled and draws the rest: such a
            // drawing does not count, and the next read draws again.
            if (this.materialsReady()) {
                this.drawnIn = scene.getFrameId();
                this.inUse = false;
                this.counts.draws++;
            }
        };
        scene.customRenderTargets.push(this.target);
    }

    /**
     * What is drawn at a canvas point. On WebGL the answer is now: a stale target is redrawn on
     * the spot and one pixel read back. WebGPU reads back only asynchronously, so there a stale
     * target is drawn in the next frame and the answer follows it.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns The row, {@link ID_NONE} or {@link ID_OBJECT}, now or once read; null when the
     * target cannot answer yet, so the caller picks.
     */
    read(x: number, y: number): number | Promise<number> | null {
        const pick = this.pick(x, y);
        if (pick === null) {
            return null;
        }

        return pick instanceof Promise ? pick.then(({ texel }) => texel) : pick.texel;
    }

    /**
     * {@link NodeIdTarget.read}, with where the row was drawn in the frame the answer was read
     * from, when the target says so (on WebGPU).
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns The answer, now or once read; null when the target cannot answer yet.
     */
    pick(x: number, y: number): IdPick | Promise<IdPick> | null {
        if (this.disposed) {
            return null;
        }

        // A fresh target was drawn ready; only a stale one needs the walk over its meshes.
        const fresh = this.drawnIn === this.scene.getFrameId() && this.fits();
        if (!fresh && !this.ready()) {
            return null;
        }

        this.inUse = true;
        if (!this.scene.getEngine().isWebGPU) {
            if (!fresh) {
                this.fit();
                this.target.render();
            }

            return this.drawnIn === this.scene.getFrameId() ? this.pixel(x, y, true) : null;
        }

        if (fresh) {
            return this.pixel(x, y, false);
        }

        return new Promise<void>((resolve) => {
            this.waiting.push(resolve);
            this.host.requestFrame();
        }).then(() => this.pixel(x, y, false));
    }

    /** Stop drawing the target. */
    dispose(): void {
        this.disposed = true;
        for (const stop of this.stops) {
            stop();
        }

        const at = this.scene.customRenderTargets.indexOf(this.target);
        if (at >= 0) {
            this.scene.customRenderTargets.splice(at, 1);
        }

        this.target.dispose();
        this.rowMaterial.dispose();
        this.unscaledRowMaterial.dispose();
        this.objectMaterial.dispose();
        this.settle(true);
    }

    /**
     * One of the two materials.
     * @param name - Its name.
     * @param defines - Its defines.
     * @returns The material.
     */
    private material(name: string, defines: string[]): ShaderMaterial {
        const rows = defines.includes("#define ROW_PULL");
        const material = new ShaderMaterial(
            name,
            this.scene,
            { vertexSource: VERTEX, fragmentSource: FRAGMENT, spectorName: name },
            {
                attributes: rows ? ["position", "graphtyRow"] : ["position"],
                uniforms: rows ? ["world", "viewProjection", "idPixels", "shapeRadius"] : ["world", "viewProjection"],
                samplers: rows ? ["rowPosition"] : [],
                defines,
            },
        );
        // A pick tests every triangle, facing the camera or not.
        material.backFaceCulling = false;
        return material;
    }

    /**
     * Keep the meshes the target draws, each given its material for the target's pass.
     * @param drawn - What the scene draws.
     * @param length - How many of them.
     */
    private collect(drawn: readonly AbstractMesh[], length: number): void {
        const { list, target } = this;
        // The frame's drawing of the target came before this evaluation, from the last list: it
        // holds while the list is the same. A changed list, or a freeze evaluating outside a
        // frame, makes it stale.
        let kept = 0;
        let same = true;
        for (let i = 0; i < length; i++) {
            const mesh = drawn[i];
            if (isRowBatch(mesh)) {
                mesh.setMaterialForRenderPass(target.renderPassId, this.rowMaterialFor(mesh));
            } else if (mesh.isPickable) {
                const owner = mesh.isAnInstance ? (mesh as InstancedMesh).sourceMesh : mesh;
                owner.setMaterialForRenderPass(target.renderPassId, this.objectMaterial);
            } else {
                continue;
            }

            same &&= list[kept] === mesh;
            list[kept++] = mesh;
        }

        if (!same || kept !== list.length) {
            list.length = kept;
            this.drawnIn = -1;
        }
    }

    /**
     * The material a batch is drawn with in the target.
     * @param mesh - The batch.
     * @returns The material.
     */
    private rowMaterialFor(mesh: AbstractMesh): ShaderMaterial {
        return isUnscaledRowBatch(mesh) ? this.unscaledRowMaterial : this.rowMaterial;
    }

    /**
     * Whether both materials have compiled for the meshes they draw. Until then a read would see
     * an empty target.
     * @returns True once ready.
     */
    private ready(): boolean {
        return this.target.isReadyForRendering() && this.materialsReady();
    }

    /**
     * Whether each mesh's material has compiled for it.
     * @returns True when all have.
     */
    private materialsReady(): boolean {
        // The target's own check can pass before the instanced variant of a material has compiled, and
        // a mesh drawn with an unready effect draws nothing.
        for (const mesh of this.list) {
            const batch = isRowBatch(mesh);
            const owner = mesh.isAnInstance ? (mesh as InstancedMesh).sourceMesh : (mesh as Mesh);
            const material = batch ? this.rowMaterialFor(mesh) : this.objectMaterial;
            if (!material.isReady(mesh, batch || owner.hasInstances)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Whether the target is the size of the canvas.
     * @returns True when it is.
     */
    private fits(): boolean {
        const engine = this.scene.getEngine();
        const { width, height } = this.target.getSize();
        return width === engine.getRenderWidth() && height === engine.getRenderHeight();
    }

    /** Make the target the size of the canvas, before a frame draws it. */
    private fit(): void {
        if (!this.fits()) {
            const engine = this.scene.getEngine();
            this.target.resize({ width: engine.getRenderWidth(), height: engine.getRenderHeight() });
            this.drawnIn = -1;
        }
    }

    /**
     * After a frame: let the reads waiting for this frame's drawing go, or ask for another frame
     * when a mesh was not ready and the target was left undrawn.
     * @param all - Let every read go, drawn or not.
     */
    private settle(all = false): void {
        if (this.waiting.length === 0) {
            return;
        }

        if (all || this.drawnIn === this.scene.getFrameId()) {
            for (const resolve of this.waiting.splice(0)) {
                resolve();
            }
        } else {
            this.host.requestFrame();
        }
    }

    /**
     * Read one pixel of the target.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @param now - Read synchronously (WebGL only).
     * @returns What is drawn there.
     */
    private pixel(x: number, y: number, now: true): IdPick;
    private pixel(x: number, y: number, now: false): Promise<IdPick>;
    private pixel(x: number, y: number, now: boolean): IdPick | Promise<IdPick> {
        const engine = this.scene.getEngine();
        const scaling = engine.getHardwareScalingLevel();
        const { width, height } = this.target.getSize();
        const px = Math.floor(x / scaling);
        const row = Math.floor(y / scaling);
        const texture = this.target.getInternalTexture();
        if (this.disposed || texture === null || px < 0 || row < 0 || px >= width || row >= height) {
            const none: IdPick = { texel: ID_NONE };
            return now ? none : Promise.resolve(none);
        }

        // A render target's first row is the bottom of the picture on either engine: Babylon draws
        // into a target upside down on WebGPU (its invertY uniform) so that one samples as on WebGL.
        const py = height - 1 - row;
        this.counts.reads++;
        // Each read its own buffer: two reads in flight on WebGPU must not land in one.
        const texel = this.float ? new Float32Array(4) : new Uint8Array(4);
        if (now) {
            engine._readTexturePixelsSync(texture, 1, 1, -1, 0, texel, true, false, px, py);
            return this.decode(texel, width, height, scaling);
        }

        return engine
            ._readTexturePixels(texture, 1, 1, -1, 0, texel, true, false, px, py)
            .then(() => this.decode(texel, width, height, scaling));
    }

    /**
     * What a pixel read says.
     * @param texel - The pixel.
     * @param width - The target's width, in device pixels.
     * @param height - Its height.
     * @param scaling - Device pixels to CSS pixels.
     * @returns The row, {@link ID_NONE} or {@link ID_OBJECT}, and where a row was drawn.
     */
    private decode(texel: Uint8Array | Float32Array, width: number, height: number, scaling: number): IdPick {
        if (this.disposed) {
            return { texel: ID_NONE };
        }

        if (texel instanceof Float32Array) {
            const [id, ndcX, ndcY, radius] = texel;
            const whole = Math.round(id);
            if (whole <= 0) {
                return { texel: ID_NONE };
            }

            if (whole === OBJECT_TEXEL) {
                return { texel: ID_OBJECT };
            }

            // The center as worldToScreen places a point: x right, y down from the top-left corner.
            const drawn = {
                x: (ndcX + 1) * 0.5 * width * scaling,
                y: (1 - ndcY) * 0.5 * height * scaling,
                radius: radius * scaling,
            };
            return { texel: whole - 1, drawn };
        }

        const [r, g, b, a] = texel;
        const id = r + g * 256 + b * 65536;
        if (a === 0 || id === 0) {
            return { texel: ID_NONE };
        }

        return { texel: id === OBJECT_TEXEL ? ID_OBJECT : id - 1 };
    }
}

/**
 * Observe, and return how to stop.
 * @param observable - What to observe.
 * @param observable.add - Its add.
 * @param observable.remove - Its remove.
 * @param callback - What to run.
 * @returns The stop.
 */
function observe<T>(
    observable: { add(callback: (value: T) => void): unknown; remove(observer: never): boolean },
    callback: (value: T) => void,
): () => void {
    const observer = observable.add(callback);
    return () => {
        observable.remove(observer as never);
    };
}
