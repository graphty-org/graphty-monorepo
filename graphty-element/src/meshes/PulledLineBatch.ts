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

import {
    JOIN_TEMPLATE_INDICES,
    JOIN_TEMPLATE_VERTICES,
    LEAN_TEMPLATE_INDICES,
    LEAN_TEMPLATE_OF,
} from "./edgeJoinShader";
import { markEdgeLineBatchMesh } from "./EdgeLineBatch";
import { batchUploadFrames } from "./FrameRoster";
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

/** Floats in one texel. */
const TEXEL_FLOATS = 4;

/** A row number no row has: the piece draws nothing. */
const NO_ROW = -1;

/** Straight edges between row centres, drawn in one non-instanced draw; see the file comment. */
export class PulledLineBatch {
    /** The one mesh that draws every piece. */
    readonly mesh: Mesh;

    /** Bytes of the edge table sent to the card so far: tables built and rows written, never a move. */
    uploadedBytes = 0;

    /** The edge table's CPU copy: each piece's two rows and its look, {@link PulledLineBatch.pieceFloats} floats. */
    private rows: Float32Array<ArrayBuffer>;

    private table: RawTexture;

    /** Pieces handed out so far; the draw covers these. */
    private highWater = 0;

    private readonly free: number[] = [];

    /** The first and last table line written since the last upload, or -1. */
    private dirtyFirst = -1;
    private dirtyLast = -1;

    private readonly stopFlush: () => void;

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

    /** The template drawn once per piece: the join template, or the lean program's rectangle. */
    private readonly template: readonly number[];

    /** Vertices a piece's indices are numbered over. */
    private readonly pieceVertices: number;

    /**
     * Start a batch on a joined line mesh made with `pulled: true`.
     * @param mesh - The mesh (`CustomLineRenderer.createJoinedLineMesh`), parented as the rows'
     *     own space is: its world matrix is applied to every row's place.
     * @param scene - The scene whose frames upload the table.
     * @param rowPositions - The `rowPosition` texture, asked each frame: the row table replaces it
     *     when it grows.
     * @param curve - Whether its pieces are curves' (a mesh made with `pulledCurve: true`).
     * @param lean - Whether its mesh draws the lean program (made with `pulledLean: true`): each
     *     piece's rectangle alone, 4 vertices and 6 indices, not the join template's 14 and 30.
     */
    constructor(
        mesh: Mesh,
        private readonly scene: Scene,
        private readonly rowPositions: () => BaseTexture,
        curve = false,
        lean = false,
    ) {
        this.mesh = mesh;
        this.template = lean ? LEAN_TEMPLATE_INDICES : JOIN_TEMPLATE_INDICES;
        this.pieceVertices = lean ? LEAN_TEMPLATE_OF.length : JOIN_TEMPLATE_VERTICES;
        const texels = curve ? TEXELS_PER_CURVE_PIECE : TEXELS_PER_PIECE;
        this.pieceFloats = texels * TEXEL_FLOATS;
        this.piecesPerLine = TABLE_WIDTH / texels;
        markEdgeLineBatchMesh(mesh);
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        this.rows = this.emptyTable(this.piecesPerLine);
        this.table = this.build();
        this.index();
        if (curve) {
            this.routes = new Float32Array(TABLE_WIDTH * TEXEL_FLOATS);
            this.routeTable = this.buildRoutes(this.routes);
        }
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
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
     * @returns The piece.
     */
    acquire(): number {
        const reused = this.free.pop();
        if (reused !== undefined) {
            return reused;
        }

        if (this.highWater === this.rows.length / this.pieceFloats) {
            this.grow();
        }

        const piece = this.highWater++;
        this.setCount();
        return piece;
    }

    /**
     * Hand a piece back: it draws nothing.
     * @param piece - The piece.
     */
    release(piece: number): void {
        this.setRows(piece, NO_ROW, NO_ROW);
        this.free.push(piece);
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
     * Mark a piece's table line to be sent with the next frame.
     * @param piece - The piece.
     */
    private touch(piece: number): void {
        const line = Math.floor(piece / this.piecesPerLine);
        this.dirtyFirst = this.dirtyFirst < 0 ? line : Math.min(this.dirtyFirst, line);
        this.dirtyLast = Math.max(this.dirtyLast, line);
    }

    /** Send the table lines written since the last frame, and bind this frame's row table. */
    flush(): void {
        const material = this.mesh.material as ShaderMaterial | null;
        material?.setTexture("rowPosition", this.rowPositions());
        this.flushRoutes();
        if (this.dirtyFirst < 0) {
            return;
        }

        const first = this.dirtyFirst;
        const lines = this.dirtyLast - first + 1;
        const floats = TABLE_WIDTH * TEXEL_FLOATS;
        const bytes = new Float32Array(this.rows.buffer, first * floats * 4, lines * floats);
        const internal = this.table.getInternalTexture();
        if (internal) {
            const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
            engine.updateTextureData(internal, bytes, 0, first, TABLE_WIDTH, lines);
            this.uploadedBytes += bytes.byteLength;
        }

        this.dirtyFirst = -1;
        this.dirtyLast = -1;
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

    /** Stop following the frames and free the mesh and the table. */
    dispose(): void {
        this.stopFlush();
        this.table.dispose();
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

    /** Double the table, keeping every piece where it is. */
    private grow(): void {
        const grown = this.emptyTable((this.rows.length / this.pieceFloats) * 2);
        grown.set(this.rows);
        this.rows = grown;
        this.table.dispose();
        this.table = this.build();
        this.dirtyFirst = -1;
        this.dirtyLast = -1;
        this.index();
    }

    /** The template once per piece the table has room for, numbered so `gl_VertexID / 14` (4 when lean) is the piece. */
    private index(): void {
        const capacity = this.rows.length / this.pieceFloats;
        const per = this.template.length;
        const indices = new Uint32Array(capacity * per);
        for (let piece = 0; piece < capacity; piece++) {
            for (let i = 0; i < per; i++) {
                indices[piece * per + i] = this.template[i] + piece * this.pieceVertices;
            }
        }

        this.mesh.setIndices(indices, capacity * this.pieceVertices);
        this.setCount();
    }

    /** Draw only the pieces handed out. */
    private setCount(): void {
        const [subMesh] = this.mesh.subMeshes;
        subMesh.indexCount = this.highWater * this.template.length;
        subMesh.verticesCount = this.highWater * this.pieceVertices;
        subMesh.setBoundingInfo(this.mesh.getBoundingInfo());
    }
}
