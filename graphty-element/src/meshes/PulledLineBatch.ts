import {
    type AbstractEngine,
    type BaseTexture,
    Constants,
    type Mesh,
    RawTexture,
    type Scene,
    type ShaderMaterial,
    type ThinEngine,
} from "@babylonjs/core";

import { DirtyRuns } from "./DirtyRuns";
import {
    JOIN_TEMPLATE_INDICES,
    JOIN_TEMPLATE_VERTICES,
    LEAN_TEMPLATE_INDICES,
    LEAN_TEMPLATE_OF,
} from "./edgeJoinShader";
import { markEdgeLineBatchMesh } from "./EdgeLineBatch";
import { batchUploadFrames } from "./FrameRoster";
import { takePoolReserve } from "./poolReserve";
import { curveShape, type CurveSpan } from "./pulledCurve";

/**
 * @file Straight edges drawn from the row table: a piece is two row numbers, not twenty floats.
 *
 * A plain `EdgeLineBatch` slot carries its piece's six points, so moving a node rewrites and
 * uploads every edge at it. A pulled piece carries the rows of its two nodes, written once when the
 * edge joins, and the join shader (`EDGE_PULLED`) reads their places from `rowPosition` each
 * frame. Moving a node uploads its row and no edge byte. Design: `design/rendering/row-renderer.md`,
 * section 4.3.
 *
 * Only a straight piece between node centres is pulled: a plain solid line, no cap, gap, group,
 * bend or loop (the first row of the trim table).
 *
 * A piece also carries its own look -- color, opacity and width -- so edges that differ only in those
 * share one batch and one draw (stage 19): a thousand colors are one draw, not a thousand.
 *
 * A CURVE batch (stage 21, `EDGE_PULLED_CURVE`) draws curves (`line.bezier`), lone or fanned out of a
 * bundle: an edge takes a run of pieces, each naming its point along the cut path, and the shader works out
 * the path from the two rows' places and the span the edge writes (`meshes/pulledCurve.ts`). Its pieces
 * take two more texels: (samples, first, pieces, startAt), then (endAt, bow, 1 for a fanned arc, unused).
 *
 * A curve batch also keeps a ROUTE TABLE (`edgeRoutes`) for lines through bends (`line.bends`): an edge's
 * cut path, its ends and the bends between, one (x, y, z) to a texel, in a block of its own that its span names
 * ({@link PulledLineBatch.writeRoute}). A move of either node writes them again.
 */

/**
 * The internal switch that routes qualifying edges here (`Edge.createLine`) on any render path. The
 * `"batched"` path pulls them without it; off by default, only the test projects that prove the
 * path on `"objects"` write it.
 */
export const pulledEdgesDefault: { value: boolean } = { value: false };

/**
 * Whether an element with no `antialias` property or attribute multisamples. True, the documented
 * default; only render-parity's `VITE_PARITY_ANTIALIAS=false` run writes it, so every story's three
 * loads draw without multisampling and the batched one uses the lean line program.
 */
export const antialiasDefault: { value: boolean } = { value: true };

/** Texels across the edge table, as across the row table: texel `i` is at `(i % 1024, i / 1024)`. */
const TABLE_WIDTH = 1024;

/**
 * Texels a piece takes: (source row, target row, width, opacity), then (red, green, blue, point);
 * a curve's piece two more (see the file comment).
 */
const TEXELS_PER_PIECE = 2;
const TEXELS_PER_CURVE_PIECE = 4;

/** The join template, drawn once per piece: its index list and its vertices. */
const JOIN_TEMPLATE = { indices: JOIN_TEMPLATE_INDICES, vertices: JOIN_TEMPLATE_VERTICES };

/** The lean program's rectangle, drawn once per piece of a mesh made with `pulledLean: true`. */
export const LEAN_TEMPLATE = { indices: LEAN_TEMPLATE_INDICES, vertices: LEAN_TEMPLATE_OF.length };

/** Floats in one texel. */
const TEXEL_FLOATS = 4;

/** Slots a piece's draw key orders under one group's rank: a table holds far fewer pieces. */
const SLOTS_PER_RANK = 2 ** 32;

/**
 * The pieces of one width, numbered as the object path's batch of that width numbers its slots:
 * the next new slot and the freed ones, taken last first.
 */
interface WidthGroup {
    readonly rank: number;
    highWater: number;
    readonly free: number[];
}

/** Hidden flags in one line of the hidden table: a byte a piece, four to a texel. */
const HIDDEN_PER_LINE = TABLE_WIDTH * 4;

/** A row number no row has: the piece draws nothing. */
export const NO_ROW = -1;

/** Straight edges between row centres, drawn in one non-instanced draw; see the file comment. */
export class PulledLineBatch {
    /** The one mesh that draws every piece. */
    readonly mesh: Mesh;

    /** Bytes of the edge table sent to the card so far: tables built and rows written, never a move. */
    uploadedBytes = 0;

    /** The edge table's CPU copy: each piece's two rows and its look, {@link PulledLineBatch.pieceFloats} floats. */
    private rows: Float32Array<ArrayBuffer>;

    private table: RawTexture;

    /**
     * Each piece's hidden flag, 255 for hidden (`edgeHidden`). A time window hides and shows pieces scattered
     * over the whole table: a byte each costs a twentieth of what writing their rows sent, which went up in
     * thousands of joined runs (#6025).
     */
    private hidden: Uint8Array<ArrayBuffer>;

    private hiddenTable: RawTexture;

    /** The first and last hidden table line written since the last upload, or -1. */
    private hiddenFirst = -1;
    private hiddenLast = -1;

    /** Pieces handed out so far; the draw covers these. */
    private highWater = 0;

    private readonly free: number[] = [];

    /**
     * Each piece's draw key: its width group's rank, then the slot the object path's batch of that width gives it.
     * The object path draws a batch per width, one after another in the order they were made, and draw order
     * decides how lines that cross blend; the index list draws pieces in this order (#6392).
     */
    private keys = new Float64Array(0);

    /** The width groups, by width, and by rank: the order this batch met them. */
    private readonly groups = new Map<number, WidthGroup>();
    private readonly ranked: WidthGroup[] = [];

    /** Whether a piece took a key out of draw order since the index list was last built. */
    private reorder = false;

    /**
     * The pieces written since the last upload. A time window hides and shows pieces scattered over the whole table,
     * so one first-to-last range would send all of it (#6025).
     */
    private readonly dirty = new DirtyRuns();

    private readonly stopFlush: () => void;
    private readonly stopRestore: () => void;

    /** The route table's CPU copy, a curve batch's only: cut paths' points, one to a texel. */
    private routes: Float32Array<ArrayBuffer> | null = null;

    private routeTable: RawTexture | null = null;

    /** Route texels handed out so far, the size of each block handed out by its first texel, and free blocks by size. */
    private routeHighWater = 0;
    private readonly routeSizes = new Map<number, number>();
    private readonly freeRoutes = new Map<number, number[]>();

    /** The first and last route table line written since the last upload, or -1. */
    private routesFirst = -1;
    private routesLast = -1;

    /** Floats a piece takes in the table. */
    private readonly pieceFloats: number;

    /** Pieces in one line of the edge table. */
    private readonly piecesPerLine: number;

    /**
     * Start a batch on a joined line mesh made with `pulled: true`.
     * @param mesh - The mesh (`CustomLineRenderer.createJoinedLineMesh`), parented as the rows'
     *     own space is: its world matrix is applied to every row's place.
     * @param scene - The scene whose frames upload the table.
     * @param rowPositions - The `rowPosition` texture, asked each frame: the row table replaces it
     *     when it grows.
     * @param curve - Whether its pieces are curves' (a mesh made with `pulledCurve: true`).
     * @param template - What a piece draws: the join template, the lean program's rectangle
     *     (`LEAN_TEMPLATE`, for a mesh made with `pulledLean: true`: 4 vertices and 6 indices, not
     *     the join template's 14 and 30), or another mesh's own (`pulledAnimatedLine.ts`), its
     *     vertices numbered from 0 a piece.
     * @param template.indices - Its index list.
     * @param template.vertices - Its vertices.
     */
    constructor(
        mesh: Mesh,
        private readonly scene: Scene,
        private readonly rowPositions: () => BaseTexture,
        curve = false,
        private readonly template: { readonly indices: readonly number[]; readonly vertices: number } = JOIN_TEMPLATE,
    ) {
        this.mesh = mesh;
        const texels = curve ? TEXELS_PER_CURVE_PIECE : TEXELS_PER_PIECE;
        this.pieceFloats = texels * TEXEL_FLOATS;
        this.piecesPerLine = TABLE_WIDTH / texels;
        markEdgeLineBatchMesh(mesh);
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        this.rows = this.emptyTable(this.piecesPerLine);
        this.table = this.build();
        this.hidden = new Uint8Array(HIDDEN_PER_LINE);
        this.hiddenTable = this.buildHidden();
        this.index();
        if (curve) {
            this.routes = new Float32Array(TABLE_WIDTH * TEXEL_FLOATS);
            this.routeTable = this.buildRoutes(this.routes);
        }
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
        const engine = scene.getEngine();
        const restored = engine.onContextRestoredObservable.add(() => {
            this.index();
        });
        this.stopRestore = () => {
            engine.onContextRestoredObservable.remove(restored);
        };
    }

    /**
     * Pieces the draw covers: every piece handed out, live or free (a free one draws nothing).
     * @returns The count.
     */
    get drawnCount(): number {
        return this.highWater;
    }

    /**
     * Hand out a piece, drawing nothing until {@link PulledLineBatch.setRows}.
     * @param width - The width {@link PulledLineBatch.setLook} will give it, which places it in draw order as the
     *     object path's batch of that width would draw it.
     * @returns The piece.
     */
    acquire(width = 0): number {
        let piece = this.free.pop();
        if (piece === undefined) {
            if (this.highWater === this.rows.length / this.pieceFloats) {
                this.grow();
            }

            piece = this.highWater++;
            this.setCount();
        }

        let group = this.groups.get(width);
        if (group === undefined) {
            group = { rank: this.ranked.length, highWater: 0, free: [] };
            this.groups.set(width, group);
            this.ranked.push(group);
        }

        const key = group.rank * SLOTS_PER_RANK + (group.free.pop() ?? group.highWater++);
        // With one width a piece's key is its own number, as the free pieces are taken in the same order.
        this.reorder ||= this.keys[piece] !== key;
        this.keys[piece] = key;
        return piece;
    }

    /**
     * Hand a piece back: it draws nothing.
     * @param piece - The piece.
     */
    release(piece: number): void {
        this.setRows(piece, NO_ROW, NO_ROW);
        this.setHidden(piece, false);
        this.free.push(piece);
        const key = this.keys[piece] ?? 0;
        this.ranked[Math.floor(key / SLOTS_PER_RANK)]?.free.push(key % SLOTS_PER_RANK);
    }

    /**
     * Draw a piece between two rows' centres. Written when an edge joins or changes a node, never
     * because one moved.
     * @param piece - The piece.
     * @param source - The source node's row.
     * @param target - The target node's row.
     */
    setRows(piece: number, source: number, target: number): void {
        this.rows[piece * this.pieceFloats] = source;
        this.rows[piece * this.pieceFloats + 1] = target;
        this.touch(piece);
    }

    /**
     * Hide or show a piece, keeping its rows and look: only its flag is written and sent.
     * @param piece - The piece.
     * @param hidden - Whether it draws nothing.
     */
    setHidden(piece: number, hidden: boolean): void {
        const flag = hidden ? 255 : 0;
        if (this.hidden[piece] === flag) {
            return;
        }

        this.hidden[piece] = flag;
        const line = Math.floor(piece / HIDDEN_PER_LINE);
        this.hiddenFirst = this.hiddenFirst < 0 ? line : Math.min(this.hiddenFirst, line);
        this.hiddenLast = Math.max(this.hiddenLast, line);
    }

    /**
     * Give a piece its look, as the plain line's material takes it: written when an edge joins or
     * restyles, never because a node moved.
     * @param piece - The piece.
     * @param look - Its look.
     * @param look.r - Red, 0 to 1.
     * @param look.g - Green, 0 to 1.
     * @param look.b - Blue, 0 to 1.
     * @param opacity - Its opacity, 0 to 1.
     * @param width - Its width, in the units the material's `width` takes.
     */
    setLook(piece: number, look: { r: number; g: number; b: number }, opacity: number, width: number): void {
        const at = piece * this.pieceFloats;
        this.rows[at + 2] = width;
        this.rows[at + 3] = opacity;
        this.rows[at + 4] = look.r;
        this.rows[at + 5] = look.g;
        this.rows[at + 6] = look.b;
        this.touch(piece);
    }

    /**
     * Give an animated line's piece its speed, a multiple of the element's own pace (`pulledAnimatedLine.ts`), in the
     * slot a straight piece leaves unused.
     * @param piece - The piece.
     * @param speed - Its `line.animationSpeed`.
     */
    setSpeed(piece: number, speed: number): void {
        this.rows[piece * this.pieceFloats + 7] = speed;
        this.touch(piece);
    }

    /**
     * Give a curve batch's piece its point along its edge's cut path and the edge's span: written when
     * the edge is placed, which its nodes moving does, but never more than its own pieces.
     * @param piece - The piece.
     * @param point - Which piece of the path it draws: from point `point` to `point + 1`.
     * @param span - The span (`curveSpan`), or null to draw nothing.
     * @param route - For a line through bends, its block in the route table ({@link PulledLineBatch.writeRoute}).
     */
    setCurve(piece: number, point: number, span: CurveSpan | null, route = 0): void {
        const at = piece * this.pieceFloats;
        this.rows[at + 7] = point;
        this.rows[at + 8] = span?.samples ?? 0;
        this.rows[at + 9] = span?.first ?? 0;
        this.rows[at + 10] = span?.pieces ?? 0;
        this.rows[at + 11] = span?.startAt ?? 0;
        this.rows[at + 12] = span?.endAt ?? 0;
        [this.rows[at + 13], this.rows[at + 14], this.rows[at + 15]] = curveShape(span, route);
        this.touch(piece);
    }

    /**
     * Keep a line's cut path in the route table, in the block it holds when it fits there, else in another.
     * @param at - The block the line holds, or -1.
     * @param points - The path's points, flat (x, y, z) triples.
     * @returns The block that holds them now: its first texel.
     */
    writeRoute(at: number, points: readonly number[]): number {
        const count = points.length / 3;
        const size = 2 ** Math.ceil(Math.log2(Math.max(1, count)));
        let block = at;
        if (at < 0 || (this.routeSizes.get(at) ?? 0) < size) {
            this.releaseRoute(at);
            block = this.takeRoute(size);
        }

        const { routes } = this;
        if (routes === null) {
            return block;
        }

        routes.fill(0, block * TEXEL_FLOATS, (block + size) * TEXEL_FLOATS);
        for (let k = 0; k < count; k++) {
            routes.set(points.slice(3 * k, 3 * k + 3), (block + k) * TEXEL_FLOATS);
        }
        const first = Math.floor(block / TABLE_WIDTH);
        const last = Math.floor((block + size - 1) / TABLE_WIDTH);
        this.routesFirst = this.routesFirst < 0 ? first : Math.min(this.routesFirst, first);
        this.routesLast = Math.max(this.routesLast, last);
        return block;
    }

    /**
     * Hand a route block back.
     * @param at - Its first texel, or -1 for none.
     */
    releaseRoute(at: number): void {
        const size = this.routeSizes.get(at);
        if (size === undefined) {
            return;
        }

        this.routeSizes.delete(at);
        const free = this.freeRoutes.get(size) ?? [];
        free.push(at);
        this.freeRoutes.set(size, free);
    }

    /**
     * A free route block of a size, the table doubled while it has no room.
     * @param size - Its texels, a power of two.
     * @returns Its first texel.
     */
    private takeRoute(size: number): number {
        let block = this.freeRoutes.get(size)?.pop();
        if (block === undefined) {
            block = this.routeHighWater;
            this.routeHighWater += size;
            while (this.routes !== null && this.routeHighWater * TEXEL_FLOATS > this.routes.length) {
                const grown = new Float32Array(this.routes.length * 2);
                grown.set(this.routes);
                this.routes = grown;
                this.routeTable?.dispose();
                this.routeTable = this.buildRoutes(grown);
                this.routesFirst = -1;
                this.routesLast = -1;
            }
        }

        this.routeSizes.set(block, size);
        return block;
    }

    /**
     * Send a route table to the card whole and bind it.
     * @param routes - Its CPU copy.
     * @returns The texture.
     */
    private buildRoutes(routes: Float32Array<ArrayBuffer>): RawTexture {
        const texture = RawTexture.CreateRGBATexture(
            routes,
            TABLE_WIDTH,
            routes.length / (TABLE_WIDTH * TEXEL_FLOATS),
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
        (this.mesh.material as ShaderMaterial | null)?.setTexture("edgeRoutes", texture);
        this.uploadedBytes += routes.byteLength;
        return texture;
    }

    /**
     * Mark a piece to be sent with the next frame.
     * @param piece - The piece.
     */
    private touch(piece: number): void {
        this.dirty.mark(piece, true, this.rows.length / this.pieceFloats);
    }

    /** Send the table lines written since the last frame, and bind this frame's row table. */
    flush(): void {
        const material = this.mesh.material as ShaderMaterial | null;
        material?.setTexture("rowPosition", this.rowPositions());
        this.flushRoutes();
        this.flushHidden();
        if (this.reorder) {
            this.index();
        }

        if (!this.dirty.dirty) {
            return;
        }

        const runs = this.dirty.take(true) ?? [0, this.highWater];
        const texels = this.pieceFloats / TEXEL_FLOATS;
        for (let i = 0; i < runs.length; i += 2) {
            this.sendTexels(runs[i] * texels, runs[i + 1] * texels);
        }
    }

    /**
     * Send a span of the edge table: its whole lines in one call, a part line on either side in one each.
     * @param first - Its first texel.
     * @param end - The texel after its last.
     */
    private sendTexels(first: number, end: number): void {
        const internal = this.table.getInternalTexture();
        if (!internal) {
            return;
        }

        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        for (let at = first; at < end;) {
            const x = at % TABLE_WIDTH;
            const lines = x === 0 ? Math.floor((end - at) / TABLE_WIDTH) : 0;
            const width = lines > 0 ? TABLE_WIDTH : Math.min(TABLE_WIDTH - x, end - at);
            const height = Math.max(lines, 1);
            const bytes = new Float32Array(this.rows.buffer, at * TEXEL_FLOATS * 4, width * height * TEXEL_FLOATS);
            engine.updateTextureData(internal, bytes, x, Math.floor(at / TABLE_WIDTH), width, height);
            this.uploadedBytes += bytes.byteLength;
            at += width * height;
        }
    }

    /** Send the route table lines written since the last frame. */
    private flushRoutes(): void {
        const internal = this.routeTable?.getInternalTexture();
        if (this.routesFirst < 0 || this.routes === null || !internal) {
            return;
        }

        const lines = this.routesLast - this.routesFirst + 1;
        const floats = TABLE_WIDTH * TEXEL_FLOATS;
        const bytes = new Float32Array(this.routes.buffer, this.routesFirst * floats * 4, lines * floats);
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        engine.updateTextureData(internal, bytes, 0, this.routesFirst, TABLE_WIDTH, lines);
        this.uploadedBytes += bytes.byteLength;
        this.routesFirst = -1;
        this.routesLast = -1;
    }

    /** Send the hidden table lines written since the last frame: one call, the lines between the first and last. */
    private flushHidden(): void {
        const internal = this.hiddenTable.getInternalTexture();
        if (this.hiddenFirst < 0 || !internal) {
            return;
        }

        const lines = this.hiddenLast - this.hiddenFirst + 1;
        const bytes = new Uint8Array(this.hidden.buffer, this.hiddenFirst * HIDDEN_PER_LINE, lines * HIDDEN_PER_LINE);
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        engine.updateTextureData(internal, bytes, 0, this.hiddenFirst, TABLE_WIDTH, lines);
        this.uploadedBytes += bytes.byteLength;
        this.hiddenFirst = -1;
        this.hiddenLast = -1;
    }

    /** Stop following the frames and free the mesh and the table. */
    dispose(): void {
        this.stopFlush();
        this.stopRestore();
        this.table.dispose();
        this.hiddenTable.dispose();
        this.routeTable?.dispose();
        // Not its textures: `rowPosition` is the row table's, which outlives this batch.
        this.mesh.material?.dispose(true, false);
        this.mesh.dispose();
    }

    private build(): RawTexture {
        const texture = RawTexture.CreateRGBATexture(
            this.rows,
            TABLE_WIDTH,
            this.rows.length / (TABLE_WIDTH * TEXEL_FLOATS),
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
        (this.mesh.material as ShaderMaterial | null)?.setTexture("edgeRows", texture);
        this.uploadedBytes += this.rows.byteLength;
        return texture;
    }

    /**
     * Send the hidden table to the card whole and bind it.
     * @returns The texture.
     */
    private buildHidden(): RawTexture {
        const texture = RawTexture.CreateRGBATexture(
            this.hidden,
            TABLE_WIDTH,
            this.hidden.length / HIDDEN_PER_LINE,
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_UNSIGNED_BYTE,
        );
        (this.mesh.material as ShaderMaterial | null)?.setTexture("edgeHidden", texture);
        this.uploadedBytes += this.hidden.byteLength;
        return texture;
    }

    /**
     * A table of pieces that draw nothing.
     * @param pieces - Pieces it holds.
     * @returns The table.
     */
    private emptyTable(pieces: number): Float32Array<ArrayBuffer> {
        const table = new Float32Array(pieces * this.pieceFloats);
        for (let at = 0; at < table.length; at += this.pieceFloats) {
            table[at] = NO_ROW;
            table[at + 1] = NO_ROW;
        }

        return table;
    }

    /**
     * Double the table, or make room for every piece a load's paint run still expects (`poolReserve.ts`) when that is
     * more, in whole table lines, keeping every piece where it is.
     */
    private grow(): void {
        const doubled = (this.rows.length / this.pieceFloats) * 2;
        const reserved = this.highWater + takePoolReserve(this.scene, "lines");
        const pieces = Math.max(doubled, Math.ceil(reserved / this.piecesPerLine) * this.piecesPerLine);
        const grown = this.emptyTable(pieces);
        grown.set(this.rows);
        this.rows = grown;
        this.table.dispose();
        this.table = this.build();
        // the new table went up whole
        this.dirty.take(false);
        if (pieces > this.hidden.length) {
            const hidden = new Uint8Array(Math.ceil(pieces / HIDDEN_PER_LINE) * HIDDEN_PER_LINE);
            hidden.set(this.hidden);
            this.hidden = hidden;
            this.hiddenTable.dispose();
            this.hiddenTable = this.buildHidden();
            this.hiddenFirst = -1;
            this.hiddenLast = -1;
        }

        this.index();
    }

    /**
     * The template once per piece the table has room for, numbered so `gl_VertexID / vertices` is the piece, the
     * pieces handed out first and in draw order ({@link PulledLineBatch.keys}).
     */
    private index(): void {
        const capacity = this.rows.length / this.pieceFloats;
        const { indices: template, vertices } = this.template;
        if (this.keys.length !== capacity) {
            // a piece not yet handed out keys as its own number, which is the key one width gives it
            const keys = Float64Array.from({ length: capacity }, (_, piece) => piece);
            keys.set(this.keys);
            this.keys = keys;
        }

        const { keys, highWater } = this;
        // ponytail: sorts every handed-out piece, at most once a frame and only while widths interleave; give each
        // group its own index range if a large mixed-width load shows it
        const drawn =
            this.ranked.length > 1
                ? Uint32Array.from({ length: highWater }, (_, piece) => piece).sort(
                      (a, b) => (keys[a] ?? 0) - (keys[b] ?? 0) || a - b,
                  )
                : null;
        const indices = new Uint32Array(capacity * template.length);
        for (let at = 0; at < capacity; at++) {
            const piece = at < highWater ? (drawn?.[at] ?? at) : at;
            for (let i = 0; i < template.length; i++) {
                indices[at * template.length + i] = template[i] + piece * vertices;
            }
        }

        this.reorder = false;

        this.mesh.setIndices(indices, capacity * vertices);
        // Keep the list on the GPU only: Babylon's CPU copy is 4 bytes an index (120 B an edge) that nothing reads.
        // A lost context is rebuilt from that copy, so a restored one indexes again (`restoreIndices`).
        const { geometry } = this.mesh;
        const buffer = geometry?.getIndexBuffer();
        if (geometry && buffer) {
            geometry.setIndexBuffer(buffer, capacity * vertices, indices.length, true);
        }

        this.setCount();
    }

    /** Draw only the pieces handed out. */
    private setCount(): void {
        const [subMesh] = this.mesh.subMeshes;
        subMesh.indexCount = this.highWater * this.template.indices.length;
        subMesh.verticesCount = this.highWater * this.template.vertices;
        subMesh.setBoundingInfo(this.mesh.getBoundingInfo());
    }
}
