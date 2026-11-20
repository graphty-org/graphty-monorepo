import { Buffer, VertexBuffer } from "@babylonjs/core/Buffers/buffer.js";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import type { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix } from "@babylonjs/core/Maths/math.vector.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { Edge } from "../Edge";
import type { EdgeRowLines } from "../meshes/EdgeRowLines";

/**
 * @file The edge ID target: what an edge hover reads instead of measuring every edge on screen
 * (design/rendering/row-renderer.md 4.4).
 *
 * A render target the size of the canvas, with no depth and no antialiasing, as today's edge hit
 * ignores depth. Each straight edge is drawn into it as a one-pixel line between its two nodes'
 * places, read from the row table's position texture, writing its place in {@link EdgeIdTarget.edges}
 * plus one. An edge drawn with no `Edge` (a row line) is drawn by a second mesh that holds a line
 * for every edge row, at the row, naming the row plus one with a different alpha; a row with no
 * shown line draws off screen. A hover reads a window around the pointer as wide as the pick
 * tolerance and hands the edges it names, plus every edge the target cannot draw (a curve, a route,
 * a loop, a group's edge), to the exact distance test: no edge outside the window is put on screen.
 * Moving nodes moves the lines with no upload; the list of `Edge`s is rebuilt only when an `Edge` is
 * added, removed, shown, hidden, restyled or changes between straight and bent
 * ({@link edgeDrawChanges}), and a row line drawn, removed, hidden or shown rewrites only its own
 * row's two vertices (`EdgeRowLines.takeChanged`), so a selection or a restyle at a million edges
 * costs the target the rows it changed.
 *
 * On WebGPU a read comes back only after a frame, so a synchronous pick (`elementAt`) cannot wait for one. Once
 * anything has asked the target about an edge, it is drawn in each frame whose picture changed and read back whole
 * after it (one copy of the canvas's pixels, with no decoding), and a synchronous pick takes the edges near its point
 * from the newest such read: one drawn from the same rows, camera and lines, or else from the picture on screen
 * or the one before it, with a wider window to cover what moved since. The pick then costs a window of
 * pixels, whatever the edge count.
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
varying float vKind;
void main(void) {
    // position.x is a node's row, position.y the edge's id, position.z its kind: 1 an Edge's line, 2 a row
    // line, 0 a row with no shown line, put outside the clip box so it draws nothing.
    int grRow = int(position.x + 0.5);
    vec4 grPlace = texelFetch(rowPosition, ivec2(grRow & 1023, grRow >> 10), 0);
    vId = position.y;
    vKind = position.z;
    gl_Position = position.z < 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : viewProjection * world * vec4(grPlace.xyz, 1.0);
}
`;

/**
 * How much wider a window a synchronous pick on WebGPU reads from a whole read drawn up to a frame before what is on
 * screen than from one drawn from what is there now: the rows and the camera may have moved since.
 */
const STALE_WIDEN = 4;

/** The alpha a row line writes, to tell its id (an edge row) from an `Edge`'s (its place in the list). */
const ROW_ALPHA = 128;

/** Floats a row takes in the row lines' vertices: two vertices of (node row, id, kind). */
const ROW_FLOATS = 6;

/** What the target reads of the row lines (`EdgeRowLines`). */
export type IdRowLines = Pick<EdgeRowLines, "forEachShown" | "takeChanged" | "shownEnds">;

const FRAGMENT = `precision highp float;
varying float vId;
varying float vKind;
void main(void) {
    float id = floor(vId + 0.5);
    float alpha = vKind > 1.5 ? ${ROW_ALPHA.toFixed(1)} : 255.0;
    gl_FragColor = vec4(mod(id, 256.0), mod(floor(id / 256.0), 256.0), floor(id / 65536.0), alpha) / 255.0;
}
`;

/** The edges a hover must measure: `Edge`s, and the edge rows of lines drawn with no `Edge`. */
export interface EdgeCandidates {
    readonly edges: Edge[];
    readonly rows: number[];
}

/** What the target asks of its graph. */
export interface EdgeIdHost {
    /** The texture that places each row. */
    positionTexture(): RawTexture;
    /** The graph's edges, in the order the full walk takes them. */
    edges(): Iterable<Edge>;
    /** The edges drawn with no `Edge`, or null off the `"batched"` path. */
    rowLines(): IdRowLines | null;
    /** The node that places every row. */
    root(): TransformNode | null;
    /**
     * How many writes so far could have moved a row (`RowTable.moves`).
     * @param settle - First bring the rows' CPU copy up to what the layout last published.
     */
    moves(settle: boolean): number;
    /** Draw a frame soon: on WebGPU the target is drawn inside one. */
    requestFrame(): void;
}

/** The edge ID target of one scene; see the file comment. */
export class EdgeIdTarget {
    /**
     * How many times the target was drawn, its list rebuilt and windows read from it, and how many answers are
     * pending: on WebGPU a read answers a frame or more after it is asked for. `rowsWritten` counts row lines
     * written into its vertices, each row once a write: every row on a whole write, the changed ones otherwise.
     * `wholeReads` counts whole reads back on WebGPU, and `wholePending` those sent and not yet back.
     */
    readonly counts = { draws: 0, rebuilds: 0, reads: 0, pending: 0, rowsWritten: 0, wholeReads: 0, wholePending: 0 };
    /** The visible edges as of the last rebuild, in walk order. */
    edges: Edge[] = [];

    private readonly target: RenderTargetTexture;
    private readonly material: ShaderMaterial;
    private readonly mesh: Mesh;
    /** The row lines' mesh: a line per edge row, at the row ({@link ROW_FLOATS} floats a row). */
    private readonly rowMesh: Mesh;
    /** The row lines' vertices' CPU copy; empty until the first write. */
    private rowVertices = new Float32Array(0);
    /**
     * The row lines' vertices' GPU buffer. Made here with its stride: a buffer `Mesh.setVerticesData` makes has
     * none, and a ranged write to it sends nothing.
     */
    private rowBuffer: Buffer | null = null;
    /** Whether the row lines' vertices were written whole once: a target made after lines were drawn writes them. */
    private rowsStarted = false;
    /** Bumped on every write that changed a row line, so a read taken before it is not held. */
    private rowVersion = 0;
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
    /** What the target was last drawn from: the rows' move count, then the rows' matrix to the screen. */
    private drawnFrom: number[] = [];
    private readsSent = 0;
    private readKept = 0;
    /** The last window read back on WebGPU, what the target was drawn from then, and the edges it named. */
    private lastRead: { cx: number; cy: number; radius: number; from: number[]; named: EdgeCandidates } | null = null;
    /** The `Edge` list and row lines the drawn target holds: {@link builtAt}, then {@link rowVersion}. */
    private drawnVersion = "";
    /** Whether whole reads are kept, on WebGPU: from the first question about an edge on. */
    private armed = false;
    /** Whole reads sent and not yet back. */
    private wholeInFlight = 0;
    /** What the last whole read sent was drawn from, so a frame drawn from the same sends none. */
    private wholeSent: { from: number[]; version: string } | null = null;
    /** The newest whole read back: the frame it was drawn in, what from, its size and its pixels. */
    private whole: {
        frame: number;
        from: number[];
        version: string;
        width: number;
        height: number;
        pixels: Uint8Array;
    } | null = null;
    /** Buffers of whole reads no longer held, for the next ones. */
    private readonly spare: Uint8Array[] = [];
    /** What the last frame drawn was drawn from, and whether that changed from the frame before. */
    private shown: number[] | null = null;
    private shownChanged = false;
    /** What the picture before the one on screen was drawn from. */
    private before: number[] = [];

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
        this.mesh = this.lineMesh("graphty-edge-ids");
        this.rowMesh = this.lineMesh("graphty-edge-id-rows");
        this.target.renderList = [this.mesh, this.rowMesh];
        this.stops.push(
            observe(this.target.onBeforeRenderObservable, () => {
                this.writeRows();
                const root = this.host.root();
                for (const mesh of [this.mesh, this.rowMesh]) {
                    mesh.parent = root;
                    mesh.computeWorldMatrix(true);
                }

                this.material.setTexture("rowPosition", this.host.positionTexture());
            }),
            observe(scene.onBeforeRenderObservable, () => {
                if (this.drawnRequested || this.wantsWhole()) {
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

                this.afterFrame();
            }),
        );
        this.target.onAfterRenderObservable.add(() => {
            // On WebGPU the draw in the frame that replaced the lines' vertex buffer comes out
            // empty (measured on SwiftShader), so only a later frame's draw counts.
            if (this.materialReady() && !(engine.isWebGPU && this.builtIn === scene.getFrameId())) {
                this.drawnIn = scene.getFrameId();
                this.drawnFrom = this.from(false);
                this.drawnVersion = this.version();
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
    candidates(x: number, y: number, radius: number): EdgeCandidates | Promise<EdgeCandidates> | null {
        if (this.disposed) {
            return null;
        }

        this.arm();
        if (this.builtAt !== edgeDrawChanges.count) {
            this.rebuild();
        }

        this.writeRows();
        const fresh = this.drawnIn === this.scene.getFrameId() && this.fits() && this.drawnVersion === this.version();
        if (!fresh && !(this.target.isReadyForRendering() && this.materialReady())) {
            return null;
        }

        if (!this.scene.getEngine().isWebGPU) {
            if (!fresh) {
                this.fit();
                this.target.render();
            }

            return this.drawnIn === this.scene.getFrameId() ? this.window(x, y, radius, true) : null;
        }

        this.counts.pending++;
        const read = fresh
            ? this.window(x, y, radius, false)
            : new Promise<void>((resolve) => {
                  this.waiting.push(resolve);
                  this.drawnRequested = true;
                  this.host.requestFrame();
              }).then(() => this.window(x, y, radius, false));
        return read.finally(() => {
            this.counts.pending--;
        });
    }

    /**
     * {@link candidates} with no read, for a press on WebGPU, which cannot wait for one. First the edges the last
     * window read back named, when it was read around the same pixel and nothing has moved, been shown or hidden, or
     * changed size since the target it read was drawn: a click lands where the pointer last moved, so the hover's
     * read usually answers it. Otherwise the window around the point in the newest whole read, when it holds the
     * lines the target holds now and was drawn from what is drawn now, from the picture on screen, or from the one
     * before it.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @param radius - The window's half-width, in render pixels.
     * @returns The edges, or null when no read answers for this point: the first question about an edge, or right
     *   after the lines or the canvas changed, before a frame has drawn them.
     */
    held(x: number, y: number, radius: number): EdgeCandidates | null {
        if (this.disposed) {
            return null;
        }

        this.arm();
        this.writeRows();
        if (this.builtAt !== edgeDrawChanges.count || !this.fits()) {
            return null;
        }

        const { cx, cy } = this.pixel(x, y);
        const read = this.lastRead;
        if (read !== null && read.cx === cx && read.cy === cy && read.radius === radius) {
            if (sameValues(read.from, this.from(true))) {
                return read.named;
            }
        }

        return this.wholeWindow(cx, cy, radius);
    }

    /**
     * The edges a window of the newest whole read names, when that read answers for now: see {@link held}.
     * @param cx - The point's pixel column.
     * @param cy - The point's pixel row, from the bottom.
     * @param radius - The window's half-width, in render pixels, when the read was drawn from what is drawn now.
     * @returns The edges, or null when the read does not answer.
     */
    private wholeWindow(cx: number, cy: number, radius: number): EdgeCandidates | null {
        const { whole } = this;
        const { width, height } = this.target.getSize();
        if (whole?.version !== this.version() || whole.width !== width || whole.height !== height) {
            return null;
        }

        // Drawn from what is drawn now; else from the picture on screen (rows the layout published since may not be
        // drawn yet) or the picture before it.
        const exact = sameValues(whole.from, this.from(false));
        if (!exact && !sameValues(whole.from, this.shown ?? []) && !sameValues(whole.from, this.before)) {
            return null;
        }

        const r = exact ? radius : radius * STALE_WIDEN;
        const left = Math.max(0, cx - r);
        const bottom = Math.max(0, cy - r);
        const w = Math.min(width, cx + r + 1) - left;
        const h = Math.min(height, cy + r + 1) - bottom;
        if (w <= 0 || h <= 0) {
            return this.named(this.pixels, 0);
        }

        if (this.pixels.length < w * h * 4) {
            this.pixels = new Uint8Array(w * h * 4);
        }

        for (let row = 0; row < h; row++) {
            const at = ((bottom + row) * width + left) * 4;
            this.pixels.set(whole.pixels.subarray(at, at + w * 4), row * w * 4);
        }

        return this.named(this.pixels, w * h);
    }

    /** Keep whole reads from now on, on WebGPU, and draw a frame to take the first. */
    private arm(): void {
        if (!this.armed && this.scene.getEngine().isWebGPU) {
            this.armed = true;
            this.host.requestFrame();
        }
    }

    /**
     * Whether this frame should draw the target for a whole read: armed, with room for another read, and the picture
     * changed in the last frame or the last read sent no longer holds what is drawn.
     * @returns True to draw it.
     */
    private wantsWhole(): boolean {
        if (!this.armed || this.disposed || this.wholeInFlight >= 2) {
            return false;
        }

        if (this.builtAt !== edgeDrawChanges.count) {
            this.rebuild();
        }

        this.writeRows();
        const sent = this.wholeSent;
        return this.shownChanged || sent?.version !== this.version() || !sameValues(sent.from, this.shown ?? []);
    }

    /**
     * After each frame, while armed: note what it showed, and read the target back whole when it was drawn in it
     * from a picture no read was sent for, or ask for a frame that draws it.
     */
    private afterFrame(): void {
        if (!this.armed || this.disposed) {
            return;
        }

        const frame = this.scene.getFrameId();
        const from = this.from(false);
        this.shownChanged = this.shown !== null && !sameValues(this.shown, from);
        if (this.shownChanged && this.shown !== null) {
            this.before = this.shown;
        }

        this.shown = from;
        const sent = this.wholeSent;
        const drawnNow = this.drawnIn === frame && this.drawnVersion === this.version();
        if (drawnNow && (sent?.version !== this.drawnVersion || !sameValues(sent.from, this.drawnFrom))) {
            const stamp = { from: this.drawnFrom, version: this.drawnVersion };
            this.wholeSent = stamp;
            // Read after the frame is sent, as a hover's read is.
            queueMicrotask(() => {
                this.readWhole(frame, stamp);
            });
        } else if (!drawnNow && this.wantsWhole()) {
            this.host.requestFrame();
        }
    }

    /**
     * Read the whole target back, as drawn in a frame, and hold it when no newer one has come back.
     * @param frame - The frame it was drawn in.
     * @param stamp - What it was drawn from.
     * @param stamp.from - The rows' move count and the matrix to the screen.
     * @param stamp.version - The lines it holds.
     */
    private readWhole(frame: number, stamp: { from: number[]; version: string }): void {
        const texture = this.target.getInternalTexture();
        if (this.disposed || texture === null) {
            return;
        }

        const { width, height } = this.target.getSize();
        // WebGPU copies rows padded to 256 bytes, then packs them at the buffer's front.
        const size = height * Math.ceil((width * 4) / 256) * 256;
        const reused = this.spare.pop();
        const pixels = reused?.length === size ? reused : new Uint8Array(size);
        this.wholeInFlight++;
        this.counts.wholePending++;
        this.scene
            .getEngine()
            ._readTexturePixels(texture, width, height, -1, 0, pixels, true, false, 0, 0)
            .then(
                () => {
                    const held = this.whole;
                    if (this.disposed || (held !== null && held.frame >= frame)) {
                        this.release(pixels);
                        return;
                    }

                    if (held !== null) {
                        this.release(held.pixels);
                    }

                    this.whole = { frame, from: stamp.from, version: stamp.version, width, height, pixels };
                    this.counts.wholeReads++;
                },
                // A device lost mid-read leaves the last read held; the next frame drawn reads again.
                () => undefined,
            )
            .finally(() => {
                this.wholeInFlight--;
                this.counts.wholePending--;
                if (!this.disposed && this.wantsWhole()) {
                    this.host.requestFrame();
                }
            });
    }

    /**
     * Keep a whole read's buffer for the next read.
     * @param pixels - The buffer.
     */
    private release(pixels: Uint8Array): void {
        if (this.spare.length < 2) {
            this.spare.push(pixels);
        }
    }

    /**
     * Which `Edge` list and row lines the target holds now.
     * @returns The list's build and the row lines' version, as one key.
     */
    private version(): string {
        return `${String(this.builtAt)}:${String(this.rowVersion)}`;
    }

    /**
     * A mesh of one-pixel lines drawn only into the target, unindexed, with the target's material.
     * @param name - Its name.
     * @returns The mesh.
     */
    private lineMesh(name: string): Mesh {
        // No camera of the scene draws a mesh of layer mask 0, and a target with its own list does not check it.
        const mesh = new Mesh(name, this.scene);
        mesh.layerMask = 0;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.doNotSyncBoundingInfo = true;
        mesh.isUnIndexed = true;
        mesh.material = this.material;
        return mesh;
    }

    /**
     * Bring the row lines' vertices up to the row lines: the rows changed since the last write, or every row when
     * the row lines cannot say which or a row is past the vertices' end. A row with no shown line keeps its two
     * vertices, as kind 0, which draw nothing.
     */
    private writeRows(): void {
        const lines = this.host.rowLines();
        if (lines === null) {
            return;
        }

        const runs = lines.takeChanged();
        const vertices = this.rowVertices;
        const last = runs === null ? 0 : (runs.at(-1) ?? 0);
        if (runs === null || last > vertices.length / ROW_FLOATS || !this.rowsStarted) {
            this.rowsStarted = true;
            this.writeAllRows(lines, last);
            return;
        }

        if (runs.length === 0) {
            return;
        }

        const buffer = this.rowBuffer;
        let changed = false;
        for (let i = 0; i < runs.length; i += 2) {
            const [first, end] = [runs[i], runs[i + 1]];
            for (let row = first; row < end; row++) {
                changed = this.setRow(vertices, row, lines.shownEnds(row)) || changed;
            }

            this.counts.rowsWritten += end - first;
            // A run is a view starting at its own first float, with its count (`EdgeLineBatch.send`).
            const floats = vertices.subarray(first * ROW_FLOATS, end * ROW_FLOATS);
            buffer?.updateDirectly(floats, first * ROW_FLOATS, (end - first) * 2);
        }

        // A row painted again with the same line (a restyle of its color) leaves the target as it was.
        if (changed) {
            this.rowsChanged();
        }
    }

    /**
     * Write every row line's vertices into a new buffer, with room to grow.
     * @param lines - The row lines.
     * @param least - Rows the buffer must hold at least.
     */
    private writeAllRows(lines: IdRowLines, least: number): void {
        let rows = Math.max(least, this.rowVertices.length / ROW_FLOATS);
        lines.forEachShown((row) => {
            rows = Math.max(rows, row + 1);
        });
        // Room to grow, so a load that paints rows past the end writes all of them a few times, not once a row.
        const size = rows <= this.rowVertices.length / ROW_FLOATS ? rows : Math.max(1024, rows * 2);
        if (size === 0) {
            return;
        }

        const vertices = new Float32Array(size * ROW_FLOATS);
        lines.forEachShown((row, source, target) => {
            this.setRow(vertices, row, [source, target]);
        });
        this.rowVertices = vertices;
        this.counts.rowsWritten += size;
        const buffer = new Buffer(this.scene.getEngine(), vertices, true, 3);
        this.rowMesh.setVerticesBuffer(buffer.createVertexBuffer(VertexBuffer.PositionKind, 0, 3));
        this.rowBuffer?.dispose();
        this.rowBuffer = buffer;
        // On WebGPU a draw in the frame that replaced the vertex buffer comes out empty, as after a rebuild.
        this.builtIn = this.scene.getFrameId();
        this.rowsChanged();
    }

    /**
     * Write one row's two vertices.
     * @param vertices - The row lines' vertices.
     * @param row - The edge row.
     * @param ends - Its line's node rows, or undefined for a row with no shown line.
     * @returns Whether the row's line changed.
     */
    private setRow(vertices: Float32Array, row: number, ends: readonly [number, number] | undefined): boolean {
        const at = row * ROW_FLOATS;
        const kind = ends === undefined ? 0 : 2;
        const same =
            vertices[at + 2] === kind &&
            vertices[at + 1] === row + 1 &&
            (kind === 0 || (vertices[at] === ends?.[0] && vertices[at + 3] === ends[1]));
        vertices[at] = ends?.[0] ?? 0;
        vertices[at + 1] = row + 1;
        vertices[at + 2] = kind;
        vertices[at + 3] = ends?.[1] ?? 0;
        vertices[at + 4] = row + 1;
        vertices[at + 5] = kind;
        return !same;
    }

    /** The row lines changed: the drawn target and the read held from it no longer hold them. */
    private rowsChanged(): void {
        this.rowVersion++;
        this.lastRead = null;
    }

    /**
     * What the target would be drawn from now: the rows' move count, then root, view and projection as one matrix.
     * @param settle - First bring the rows' CPU copy up to date (never while a frame draws).
     * @returns The values, empty with no camera.
     */
    private from(settle: boolean): number[] {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return [];
        }

        const root = this.host.root()?.computeWorldMatrix() ?? Matrix.IdentityReadOnly;
        return [
            this.host.moves(settle),
            ...root.multiply(camera.getViewMatrix().multiply(camera.getProjectionMatrix())).m,
        ];
    }

    /**
     * A canvas point's pixel in the target.
     * @param x - X in CSS pixels.
     * @param y - Y in CSS pixels.
     * @returns The pixel's column and row, counted from the bottom.
     */
    private pixel(x: number, y: number): { cx: number; cy: number } {
        const scaling = this.scene.getEngine().getHardwareScalingLevel();
        // A render target's first row is the bottom of the picture on either engine.
        return { cx: Math.floor(x / scaling), cy: this.target.getSize().height - 1 - Math.floor(y / scaling) };
    }

    /**
     * Whether the lines' material is ready to draw them.
     * @returns True once its effect has compiled.
     */
    private materialReady(): boolean {
        // Babylon.js 9 reads the mesh's first submesh here, and a mesh given no lines yet has
        // none; with no geometry there is nothing mesh-specific to ask about anyway.
        return this.material.isReady(this.mesh.getTotalVertices() > 0 ? this.mesh : undefined);
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
        this.rowMesh.dispose();
        this.rowBuffer?.dispose();
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
                lines.push(srcNode.index, id, 1, dstNode.index, id, 1);
            }
        }

        this.edges = edges;
        this.loose = loose;
        this.lastRead = null;
        // At least one line (of kind 0, drawing nothing), so a graph of curves alone still draws and reads as fresh.
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
    private window(x: number, y: number, radius: number, now: true): EdgeCandidates;
    private window(x: number, y: number, radius: number, now: false): Promise<EdgeCandidates>;
    private window(x: number, y: number, radius: number, now: boolean): EdgeCandidates | Promise<EdgeCandidates> {
        const engine = this.scene.getEngine();
        const { width, height } = this.target.getSize();
        const { cx, cy } = this.pixel(x, y);
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
        const version = this.drawnVersion;
        const from = this.drawnFrom;
        const sent = ++this.readsSent;
        return engine._readTexturePixels(texture, w, h, -1, 0, pixels, true, false, left, bottom).then(() => {
            const named = this.named(pixels, w * h);
            // Kept for a press only while it names the lines the target holds now, and when no later read has landed.
            if (version === this.version() && sent > this.readKept) {
                this.readKept = sent;
                this.lastRead = { cx, cy, radius, from, named };
            }

            return named;
        });
    }

    /**
     * The edges the pixels just read name, with the loose ones, in walk order.
     * @param pixels - The pixels read.
     * @param count - How many pixels were read.
     * @returns The edges, and the row lines' edge rows.
     */
    private named(pixels: Uint8Array, count: number): EdgeCandidates {
        const at = new Set<number>(this.loose);
        const rows = new Set<number>();
        for (let i = 0; i < count && !this.disposed; i++) {
            const id = pixels[i * 4] + pixels[i * 4 + 1] * 256 + pixels[i * 4 + 2] * 65536;
            const alpha = pixels[i * 4 + 3];
            if (alpha !== 0 && id > 0) {
                (alpha === ROW_ALPHA ? rows : at).add(id - 1);
            }
        }

        const { edges } = this;
        return {
            edges: [...at].sort((a, b) => a - b).flatMap((i) => edges[i] ?? []),
            rows: [...rows].sort((a, b) => a - b),
        };
    }
}

/**
 * Whether two lists of numbers are the same.
 * @param a - One.
 * @param b - The other.
 * @returns True when they have the same values in the same order.
 */
function sameValues(a: readonly number[], b: readonly number[]): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i]);
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
