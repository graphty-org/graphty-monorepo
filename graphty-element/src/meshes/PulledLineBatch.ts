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

import { JOIN_TEMPLATE_INDICES, JOIN_TEMPLATE_VERTICES } from "./edgeJoinShader";
import { markEdgeLineBatchMesh } from "./EdgeLineBatch";
import { batchUploadFrames } from "./FrameRoster";

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
 */

/**
 * The internal switch that routes qualifying edges here (`Edge.createLine`) on any render path. The
 * `"batched"` path pulls them without it; off by default, only the test projects that prove the
 * path on `"objects"` write it.
 */
export const pulledEdgesDefault: { value: boolean } = { value: false };

/** Texels across the edge table, as across the row table: texel `i` is at `(i % 1024, i / 1024)`. */
const TABLE_WIDTH = 1024;

/** Texels a piece takes: (source row, target row, width, opacity), then (red, green, blue, unused). */
const TEXELS_PER_PIECE = 2;

/** Pieces in one line of the edge table. */
const PIECES_PER_LINE = TABLE_WIDTH / TEXELS_PER_PIECE;

/** Indices in the join template, drawn once per piece. */
const TEMPLATE_INDICES = JOIN_TEMPLATE_INDICES.length;

/** Floats in one texel. */
const TEXEL_FLOATS = 4;

/** Floats a piece takes in the table. */
const PIECE_FLOATS = TEXELS_PER_PIECE * TEXEL_FLOATS;

/** A row number no row has: the piece draws nothing. */
const NO_ROW = -1;

/** Straight edges between row centres, drawn in one non-instanced draw; see the file comment. */
export class PulledLineBatch {
    /** The one mesh that draws every piece. */
    readonly mesh: Mesh;

    /** Bytes of the edge table sent to the card so far: tables built and rows written, never a move. */
    uploadedBytes = 0;

    /** The edge table's CPU copy: each piece's two rows and its look, {@link PIECE_FLOATS} floats. */
    private rows: Float32Array<ArrayBuffer>;

    private table: RawTexture;

    /** Pieces handed out so far; the draw covers these. */
    private highWater = 0;

    private readonly free: number[] = [];

    /** The first and last table line written since the last upload, or -1. */
    private dirtyFirst = -1;
    private dirtyLast = -1;

    private readonly stopFlush: () => void;

    /**
     * Start a batch on a joined line mesh made with `pulled: true`.
     * @param mesh - The mesh (`CustomLineRenderer.createJoinedLineMesh`), parented as the rows'
     *     own space is: its world matrix is applied to every row's place.
     * @param scene - The scene whose frames upload the table.
     * @param rowPositions - The `rowPosition` texture, asked each frame: the row table replaces it
     *     when it grows.
     */
    constructor(
        mesh: Mesh,
        private readonly scene: Scene,
        private readonly rowPositions: () => BaseTexture,
    ) {
        this.mesh = mesh;
        markEdgeLineBatchMesh(mesh);
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        this.rows = PulledLineBatch.emptyTable(PIECES_PER_LINE);
        this.table = this.build();
        this.index();
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

        if (this.highWater === this.rows.length / PIECE_FLOATS) {
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
        this.rows[piece * PIECE_FLOATS] = source;
        this.rows[piece * PIECE_FLOATS + 1] = target;
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
        const at = piece * PIECE_FLOATS;
        this.rows[at + 2] = width;
        this.rows[at + 3] = opacity;
        this.rows[at + 4] = look.r;
        this.rows[at + 5] = look.g;
        this.rows[at + 6] = look.b;
        this.touch(piece);
    }

    /**
     * Mark a piece's table line to be sent with the next frame.
     * @param piece - The piece.
     */
    private touch(piece: number): void {
        const line = Math.floor(piece / PIECES_PER_LINE);
        this.dirtyFirst = this.dirtyFirst < 0 ? line : Math.min(this.dirtyFirst, line);
        this.dirtyLast = Math.max(this.dirtyLast, line);
    }

    /** Send the table lines written since the last frame, and bind this frame's row table. */
    flush(): void {
        const material = this.mesh.material as ShaderMaterial | null;
        material?.setTexture("rowPosition", this.rowPositions());
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

    /** Stop following the frames and free the mesh and the table. */
    dispose(): void {
        this.stopFlush();
        this.table.dispose();
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
    private static emptyTable(pieces: number): Float32Array<ArrayBuffer> {
        const table = new Float32Array(pieces * PIECE_FLOATS);
        for (let at = 0; at < table.length; at += PIECE_FLOATS) {
            table[at] = NO_ROW;
            table[at + 1] = NO_ROW;
        }

        return table;
    }

    /** Double the table, keeping every piece where it is. */
    private grow(): void {
        const grown = PulledLineBatch.emptyTable((this.rows.length / PIECE_FLOATS) * 2);
        grown.set(this.rows);
        this.rows = grown;
        this.table.dispose();
        this.table = this.build();
        this.dirtyFirst = -1;
        this.dirtyLast = -1;
        this.index();
    }

    /** The join template once per piece the table has room for, numbered so `gl_VertexID / 14` is the piece. */
    private index(): void {
        const capacity = this.rows.length / PIECE_FLOATS;
        const indices = new Uint32Array(capacity * TEMPLATE_INDICES);
        for (let piece = 0; piece < capacity; piece++) {
            for (let i = 0; i < TEMPLATE_INDICES; i++) {
                indices[piece * TEMPLATE_INDICES + i] = JOIN_TEMPLATE_INDICES[i] + piece * JOIN_TEMPLATE_VERTICES;
            }
        }

        this.mesh.setIndices(indices, capacity * JOIN_TEMPLATE_VERTICES);
        this.setCount();
    }

    /** Draw only the pieces handed out. */
    private setCount(): void {
        const [subMesh] = this.mesh.subMeshes;
        subMesh.indexCount = this.highWater * TEMPLATE_INDICES;
        subMesh.verticesCount = this.highWater * JOIN_TEMPLATE_VERTICES;
        subMesh.setBoundingInfo(this.mesh.getBoundingInfo());
    }
}
