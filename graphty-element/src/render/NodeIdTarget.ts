import {
    type AbstractMesh,
    Color4,
    Constants,
    type InstancedMesh,
    type Mesh,
    type RawTexture,
    RenderTargetTexture,
    type Scene,
    ShaderMaterial,
} from "@babylonjs/core";

import { isRowBatch } from "../meshes/RowPullPlugin";

/**
 * @file The node ID target: what hover reads instead of picking (design/rendering/row-renderer.md 4.4).
 *
 * A render target the size of the canvas, drawn from the scene's camera with depth and no
 * antialiasing. A node batch writes row + 1 into each pixel it covers, as RGB; every other
 * pickable mesh drawn (labels, object rows, models) writes {@link OBJECT_TEXEL}, which tells the
 * reader to ask the mesh pick. Reading one pixel names the row under the pointer with no walk
 * over nodes. The target is redrawn only when a read finds it older than the frame on screen,
 * and in each frame drawn while reads keep coming, so a hover that restyles its node does not
 * make the next move redraw.
 */

/** A read that landed on nothing. */
export const ID_NONE = -1;
/** A read that landed on a mesh that is not a batched row: the mesh pick answers. */
export const ID_OBJECT = -2;

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
varying float vId;
void main(void) {
#include<instancesVertex>
    vec4 worldPos = finalWorld * vec4(position, 1.0);
#ifdef ROW_PULL
    int grRow = int(graphtyRow + 0.5);
    vec4 grPlace = graphtyRow < 0.0 ? vec4(0.0) : texelFetch(rowPosition, ivec2(grRow & 1023, grRow >> 10), 0);
    vec3 grOrigin = world[3].xyz;
    worldPos = vec4((worldPos.xyz - grOrigin) * grPlace.w + grOrigin + mat3(world) * grPlace.xyz, worldPos.w);
    vId = graphtyRow + 1.0;
#else
    vId = ${OBJECT_TEXEL.toFixed(1)};
#endif
    gl_Position = viewProjection * worldPos;
}
`;

const FRAGMENT = `precision highp float;
varying float vId;
void main(void) {
    float id = floor(vId + 0.5);
    gl_FragColor = vec4(mod(id, 256.0), mod(floor(id / 256.0), 256.0), floor(id / 65536.0), 255.0) / 255.0;
}
`;

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

    private readonly target: RenderTargetTexture;
    private readonly rowMaterial: ShaderMaterial;
    private readonly objectMaterial: ShaderMaterial;
    private readonly list: AbstractMesh[] = [];
    private readonly texel = new Uint8Array(4);
    private readonly stops: (() => void)[] = [];
    /** The frame the target was last drawn in. */
    private drawnIn = -1;
    /** A read came since the last draw, so the next frame redraws it. */
    private inUse = false;
    /** Reads waiting for the target to be drawn. */
    private waiting: (() => void)[] = [];
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
        this.target = new RenderTargetTexture(
            "graphty-node-ids",
            { width: engine.getRenderWidth(), height: engine.getRenderHeight() },
            scene,
            {
                generateMipMaps: false,
                generateDepthBuffer: true,
                type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                samples: 1,
            },
        );
        this.target.clearColor = new Color4(0, 0, 0, 0);
        this.target.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        this.rowMaterial = this.material("graphty-node-id-rows", ["#define ROW_PULL"]);
        this.objectMaterial = this.material("graphty-node-id-objects", []);
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
                this.rowMaterial.setTexture("rowPosition", this.host.positionTexture());
            }),
            // After the drawing itself: the readiness check also notifies onAfterRenderObservable.
            observe(this.target.onAfterUnbindObservable, () => {
                // Babylon skips a mesh whose material has not compiled and draws the rest: such
                // a drawing does not count, and the next read draws again.
                if (!this.materialsReady()) {
                    return;
                }

                this.drawnIn = scene.getFrameId();
                this.inUse = false;
                this.counts.draws++;
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
        if (this.disposed || !this.ready()) {
            return null;
        }

        this.inUse = true;
        const fresh = this.drawnIn === this.scene.getFrameId() && this.fits();
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
        const material = new ShaderMaterial(
            name,
            this.scene,
            { vertexSource: VERTEX, fragmentSource: FRAGMENT, spectorName: name },
            {
                attributes: defines.length > 0 ? ["position", "graphtyRow"] : ["position"],
                uniforms: ["world", "viewProjection"],
                samplers: defines.length > 0 ? ["rowPosition"] : [],
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
        list.length = 0;
        // A freeze evaluates outside a frame, so a new list makes the target stale by itself.
        this.drawnIn = -1;

        for (let i = 0; i < length; i++) {
            const mesh = drawn[i];
            if (isRowBatch(mesh)) {
                mesh.setMaterialForRenderPass(target.renderPassId, this.rowMaterial);
            } else if (mesh.isPickable) {
                const owner = mesh.isAnInstance ? (mesh as InstancedMesh).sourceMesh : mesh;
                owner.setMaterialForRenderPass(target.renderPassId, this.objectMaterial);
            } else {
                continue;
            }

            list.push(mesh);
        }
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
            const material = batch ? this.rowMaterial : this.objectMaterial;
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
    private pixel(x: number, y: number, now: true): number;
    private pixel(x: number, y: number, now: false): Promise<number>;
    private pixel(x: number, y: number, now: boolean): number | Promise<number> {
        const engine = this.scene.getEngine();
        const scaling = engine.getHardwareScalingLevel();
        const { width, height } = this.target.getSize();
        const px = Math.floor(x / scaling);
        const row = Math.floor(y / scaling);
        const texture = this.target.getInternalTexture();
        if (this.disposed || texture === null || px < 0 || row < 0 || px >= width || row >= height) {
            return now ? ID_NONE : Promise.resolve(ID_NONE);
        }

        // A WebGL texture's first row is the bottom of the picture.
        const py = engine.isWebGPU ? row : height - 1 - row;
        this.counts.reads++;
        if (now) {
            engine._readTexturePixelsSync(texture, 1, 1, -1, 0, this.texel, true, false, px, py);
            return this.decode();
        }

        return engine._readTexturePixels(texture, 1, 1, -1, 0, this.texel, true, false, px, py).then(() => this.decode());
    }

    /**
     * What the pixel just read says.
     * @returns The row, {@link ID_NONE} or {@link ID_OBJECT}.
     */
    private decode(): number {
        const [r, g, b, a] = this.texel;
        const id = r + g * 256 + b * 65536;
        if (this.disposed || a === 0 || id === 0) {
            return ID_NONE;
        }

        return id === OBJECT_TEXEL ? ID_OBJECT : id - 1;
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
