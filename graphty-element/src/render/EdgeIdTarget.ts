import { Constants } from "@babylonjs/core/Engines/constants.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import type { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { Edge } from "../Edge";

/**
 * @file The edge ID target: what an edge hover reads instead of measuring every edge on screen
 * (design/rendering/row-renderer.md 4.4).
 *
 * A render target the size of the canvas, with no depth and no antialiasing, as today's edge hit
 * ignores depth. Each straight edge is drawn into it as a one-pixel line between its two nodes'
 * places, read from the row table's position texture, writing its place in {@link EdgeIdTarget.edges}
 * plus one. A hover reads a window around the pointer as wide as the pick tolerance and hands the
 * edges it names, plus every edge the target cannot draw (a curve, a route, a loop, a group's
 * edge), to the exact distance test: no edge outside the window is put on screen. Moving nodes
 * moves the lines with no upload; the list of edges is rebuilt only when an edge is added,
 * removed, shown, hidden, restyled or changes between straight and bent ({@link edgeDrawChanges}).
 */

/**
 * How many times any edge's drawn line may have changed between straight and bent, been shown or
 * hidden, added or removed. The target rebuilds its list when this moved.
 * ponytail: one count for every graph, so one graph's change rebuilds another's list too; a count per scene if that shows up.
 */
export const edgeDrawChanges = { count: 0 };

const VERTEX = `precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 viewProjection;
uniform highp sampler2D rowPosition;
varying float vId;
void main(void) {
    // position.x is a node's row, position.y the edge's id.
    int grRow = int(position.x + 0.5);
    vec4 grPlace = texelFetch(rowPosition, ivec2(grRow & 1023, grRow >> 10), 0);
    vId = position.y;
    gl_Position = viewProjection * world * vec4(grPlace.xyz, 1.0);
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
export interface EdgeIdHost {
    /** The texture that places each row. */
    positionTexture(): RawTexture;
    /** The graph's edges, in the order the full walk takes them. */
    edges(): Iterable<Edge>;
    /** The node that places every row. */
    root(): TransformNode | null;
    /** Draw a frame soon: on WebGPU the target is drawn inside one. */
    requestFrame(): void;
}

/** The edge ID target of one scene; see the file comment. */
export class EdgeIdTarget {
    /** How many times the target was drawn, its list rebuilt, and windows read from it. */
    readonly counts = { draws: 0, rebuilds: 0, reads: 0 };
    /** The visible edges as of the last rebuild, in walk order. */
    edges: Edge[] = [];

    private readonly target: RenderTargetTexture;
    private readonly material: ShaderMaterial;
    private readonly mesh: Mesh;
    /** Where in {@link edges} the edges the target cannot draw are. */
    private loose: number[] = [];
    private builtAt = -1;
    private drawnIn = -1;
    private drawnRequested = false;
    /** The frame the lines were last rebuilt in. */
    private builtIn = -1;
    private readonly waiting: (() => void)[] = [];
    private pixels = new Uint8Array(0);
    private disposed = false;
    private readonly stops: (() => void)[] = [];

    /**
     * Start the target of a scene.
     * @param scene - The scene.
     * @param host - The graph.
     */
    constructor(
        private readonly scene: Scene,
        private readonly host: EdgeIdHost,
    ) {
        const engine = scene.getEngine();
        this.target = new RenderTargetTexture(
            "graphty-edge-ids",
            { width: engine.getRenderWidth(), height: engine.getRenderHeight() },
            scene,
            {
                generateMipMaps: false,
                generateDepthBuffer: false,
                type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
                samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                samples: 1,
            },
        );
        this.target.clearColor = new Color4(0, 0, 0, 0);
        this.target.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        this.material = new ShaderMaterial(
            "graphty-edge-ids",
            scene,
            { vertexSource: VERTEX, fragmentSource: FRAGMENT, spectorName: "graphty-edge-ids" },
            { attributes: ["position"], uniforms: ["world", "viewProjection"], samplers: ["rowPosition"] },
        );
        this.material.fillMode = Constants.MATERIAL_LineListDrawMode;
        this.material.backFaceCulling = false;
        this.material.disableDepthWrite = true;
        // The lines live only in the target: no camera of the scene draws a mesh of layer mask 0,
        // and a target with its own list does not check the mask.
        this.mesh = new Mesh("graphty-edge-ids", scene);
        this.mesh.layerMask = 0;
        this.mesh.isPickable = false;
        this.mesh.alwaysSelectAsActiveMesh = true;
        this.mesh.doNotSyncBoundingInfo = true;
        this.mesh.isUnIndexed = true;
        this.mesh.material = this.material;
        this.target.renderList = [this.mesh];
        this.stops.push(
            observe(this.target.onBeforeRenderObservable, () => {
                this.mesh.parent = this.host.root();
                this.mesh.computeWorldMatrix(true);
                this.material.setTexture("rowPosition", this.host.positionTexture());
            }),
            observe(scene.onBeforeRenderObservable, () => {
                if (this.drawnRequested) {
                    this.fit();
                    this.target.resetRefreshCounter();
                }
            }),
            // The target's own observer clears drawnRequested while the frame draws, so this one
            // settles on waiters alone.
            observe(scene.onAfterRenderObservable, () => {
                if (this.waiting.length > 0) {
                    this.settle();
                }
            }),
        );
        this.target.onAfterRenderObservable.add(() => {
            // On WebGPU the draw in the frame that replaced the lines' vertex buffer comes out
            // empty (measured on SwiftShader), so only a later frame's draw counts.
            if (this.material.isReady(this.mesh) && !(engine.isWebGPU && this.builtIn === scene.getFrameId())) {
                this.drawnIn = scene.getFrameId();
                this.drawnRequested = false;
                this.counts.draws++;
            }
        });
        scene.customRenderTargets.push(this.target);
    }

    /**
     * The edges the exact test must measure for a pointer at a canvas point: those drawn within
     * `radius` render pixels of it, and every edge the target cannot draw. On WebGL the answer is
     * now; WebGPU reads back only asynchronously, after the next frame draws a stale target.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @param radius - The window's half-width, in render pixels.
     * @returns The edges, in walk order, now or once read; null when the target cannot answer yet.
     */
    candidates(x: number, y: number, radius: number): Edge[] | Promise<Edge[]> | null {
        if (this.disposed) {
            return null;
        }

        if (this.builtAt !== edgeDrawChanges.count) {
            this.rebuild();
        }

        const fresh = this.drawnIn === this.scene.getFrameId() && this.fits();
        if (!fresh && !(this.target.isReadyForRendering() && this.material.isReady(this.mesh))) {
            return null;
        }

        if (!this.scene.getEngine().isWebGPU) {
            if (!fresh) {
                this.fit();
                this.target.render();
            }

            return this.drawnIn === this.scene.getFrameId() ? this.window(x, y, radius, true) : null;
        }

        if (fresh) {
            return this.window(x, y, radius, false);
        }

        return new Promise<void>((resolve) => {
            this.waiting.push(resolve);
            this.drawnRequested = true;
            this.host.requestFrame();
        }).then(() => this.window(x, y, radius, false));
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
        this.mesh.dispose();
        this.material.dispose();
        this.settle(true);
    }

    /** Take the visible edges again, and give each straight one its line. */
    private rebuild(): void {
        this.builtAt = edgeDrawChanges.count;
        this.builtIn = this.scene.getFrameId();
        this.counts.rebuilds++;
        const edges: Edge[] = [];
        const loose: number[] = [];
        const lines: number[] = [];
        for (const edge of this.host.edges()) {
            if (edge.isDisposed() || !edge.isRenderVisible()) {
                continue;
            }

            const id = edges.push(edge);
            const { srcNode, dstNode } = edge;
            if (srcNode === dstNode || srcNode.isDrawnAsGroup || dstNode.isDrawnAsGroup || edge.drawnCurve !== null) {
                loose.push(id - 1);
            } else {
                lines.push(srcNode.index, id, 0, dstNode.index, id, 0);
            }
        }

        this.edges = edges;
        this.loose = loose;
        // At least one line, so a graph of curves alone still draws (nothing) and reads as fresh.
        this.mesh.setVerticesData("position", lines.length > 0 ? lines : [0, 0, 0, 0, 0, 0], false);
        this.drawnIn = -1;
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

    /** Make the target the size of the canvas. */
    private fit(): void {
        if (!this.fits()) {
            const engine = this.scene.getEngine();
            this.target.resize({ width: engine.getRenderWidth(), height: engine.getRenderHeight() });
            this.drawnIn = -1;
        }
    }

    /**
     * After a frame: let the reads waiting for it go, or ask for another frame when the target was
     * left undrawn.
     * @param all - Let every read go, drawn or not.
     */
    private settle(all = false): void {
        if (all || this.drawnIn === this.scene.getFrameId()) {
            for (const resolve of this.waiting.splice(0)) {
                resolve();
            }
        } else {
            this.drawnRequested = true;
            this.host.requestFrame();
        }
    }

    /**
     * Read the window around a point, and name its edges with the ones the target cannot draw.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @param radius - The half-width, in render pixels.
     * @param now - Read synchronously (WebGL only).
     * @returns The edges, in walk order.
     */
    private window(x: number, y: number, radius: number, now: true): Edge[];
    private window(x: number, y: number, radius: number, now: false): Promise<Edge[]>;
    private window(x: number, y: number, radius: number, now: boolean): Edge[] | Promise<Edge[]> {
        const engine = this.scene.getEngine();
        const scaling = engine.getHardwareScalingLevel();
        const { width, height } = this.target.getSize();
        const cx = Math.floor(x / scaling);
        // A render target's first row is the bottom of the picture on either engine.
        const cy = height - 1 - Math.floor(y / scaling);
        const left = Math.max(0, cx - radius);
        const bottom = Math.max(0, cy - radius);
        const w = Math.min(width, cx + radius + 1) - left;
        const h = Math.min(height, cy + radius + 1) - bottom;
        const texture = this.target.getInternalTexture();
        if (this.disposed || texture === null || w <= 0 || h <= 0) {
            return now ? this.named(this.pixels, 0) : Promise.resolve(this.named(this.pixels, 0));
        }

        this.counts.reads++;
        if (now) {
            if (this.pixels.length < w * h * 4) {
                this.pixels = new Uint8Array(w * h * 4);
            }

            engine._readTexturePixelsSync(texture, w, h, -1, 0, this.pixels, true, false, left, bottom);
            return this.named(this.pixels, w * h);
        }

        // A buffer of its own, since a later move's read can land first. WebGPU copies rows padded
        // to 256 bytes into it, then packs them at its front.
        const pixels = new Uint8Array(h * Math.ceil((w * 4) / 256) * 256);
        return engine
            ._readTexturePixels(texture, w, h, -1, 0, pixels, true, false, left, bottom)
            .then(() => this.named(pixels, w * h));
    }

    /**
     * The edges the pixels just read name, with the loose ones, in walk order.
     * @param pixels - The pixels read.
     * @param count - How many pixels were read.
     * @returns The edges.
     */
    private named(pixels: Uint8Array, count: number): Edge[] {
        const at = new Set<number>(this.loose);
        for (let i = 0; i < count && !this.disposed; i++) {
            const id = pixels[i * 4] + pixels[i * 4 + 1] * 256 + pixels[i * 4 + 2] * 65536;
            if (pixels[i * 4 + 3] !== 0 && id > 0) {
                at.add(id - 1);
            }
        }

        return [...at].sort((a, b) => a - b).flatMap((i) => this.edges[i] ?? []);
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
