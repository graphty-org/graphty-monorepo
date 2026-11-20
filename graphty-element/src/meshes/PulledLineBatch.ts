import type { AbstractEngine, BaseTexture, ThinEngine } from "@babylonjs/core";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { GraphtyError } from "../errors/GraphtyError";
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
import { curveShape, type CurveSpan, MAX_PIECES } from "./pulledCurve";

/**
 * @file Straight edges drawn from the row table: a piece is two row numbers, not twenty floats.
 *
 * A plain `EdgeLineBatch` slot carries its piece's six points, so moving a node rewrites and
 * uploads every edge at it. A pulled piece carries the rows of its two nodes, written once when the
 * edge joins, and the join shader (`EDGE_PULLED`) reads their places from `rowPosition` each
 * frame. Moving a node uploads its row and no edge byte. Design: `design/rendering/row-renderer.md`,
 * section 4.3.
 *
 * Only a straight piece between node centers is pulled: a plain solid line, no cap, gap, group,
 * bend or loop (the first row of the trim table).
 *
 * A piece also carries its own look -- color, opacity and width -- so edges that differ only in those
 * share one batch and one draw (stage 19): a thousand colors are one draw, not a thousand.
 *
 * A CURVE batch (stage 21, `EDGE_PULLED_CURVE`) draws curves (`line.bezier`), lone or fanned out of a
 * bundle: an edge takes ONE entry, its rows, its look and its span, two texels more than a straight piece's:
 * (samples, first, pieces, startAt), then (endAt and the shape, `curveShape`). The draw gives every entry
 * {@link PulledLineBatch.stride} pieces, the most any of its curves has asked for, and the shader works out
 * piece j's place along the cut path from the two rows' places and the span (`meshes/pulledCurve.ts`); a piece
 * past its own curve's draws nothing. An entry per edge, not per piece, keeps a million long curves (64 pieces
 * each) to 64 MB and a 2048 x 2048 table, inside every WebGL2 card (#9160).
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
export const antialiasDefault: { value: Antialias } = { value: true };

/**
 * How the canvas multisamples (graphty-element's `antialias`): always (`true`), never (`false`),
 * only on the frame a still scene rests on (`"at-rest"`), or never while the line shader smooths
 * the lines' edges itself (`"shader"`).
 */
export type Antialias = boolean | "at-rest" | "shader";

/**
 * Which program a straight pulled line draws (`GraphContext.leansLines`): the join template
 * (`false`), the lean rectangle (`true`, `EDGE_PULLED_LEAN`), or the lean rectangle a pixel wider
 * with its edges smoothed in the fragment shader (`"smooth"`, `EDGE_LINE_AA`).
 */
export type LeanLines = boolean | "smooth";

/**
 * Texels across a table at first, as across the row table. A table taller than the card allows (`maxTextureSize`) is
 * made wider instead, a power of two at a time: texel `i` is at `(i % width, i / width)`, and the shaders read the
 * width from the texture itself (`pulledTexelGlsl`), so the CPU copy is the same at any width.
 */
const TABLE_WIDTH = 1024;

/**
 * The most entries a table may name: the draw order table names entries as floats, which count every whole number
 * only up to 2^24. A curve's span names its route block in two floats ({@link ROUTE_SPLIT}), so the route table
 * has no such limit.
 */
const MOST_ENTRIES = 2 ** 24;

/** The most vertices one draw may ask for: `drawArrays` takes a signed 32-bit count. */
const MOST_VERTICES = 2 ** 31 - 1;

/**
 * Routes of at most this many points take a block of the next power of two, so a path a point longer
 * keeps its block; longer ones take exactly what they need, which keeps a million 65-point center arcs
 * (65 million texels) inside one 8192 x 8192 table.
 */
const ROUTE_ROUNDED = 32;

/**
 * The refusal of a table the card cannot hold, or a draw it cannot make.
 * @param texels - Texels the table would hold.
 * @param most - The card's `maxTextureSize`.
 * @param entries - Entries it would name.
 * @param mostEntries - The most it may name.
 * @returns The `E_TOO_LARGE` error.
 */
function tooLargeError(texels: number, most: number, entries: number, mostEntries: number): GraphtyError {
    return new GraphtyError({
        code: "E_TOO_LARGE",
        source: "view",
        message:
            `An edge table of ${texels.toLocaleString("en-US")} texels and ${entries.toLocaleString("en-US")} entries ` +
            `does not fit what one ${most.toLocaleString("en-US")} x ${most.toLocaleString("en-US")} texture and one draw hold. ` +
            "Draw fewer edges.",
        details: { texels, maxTextureSize: most, entries, mostEntries },
    });
}

/**
 * The shape of a table that holds at least `texels` texels on a card whose textures are at most `most` a side.
 * @param texels - Texels it must hold.
 * @param most - The card's `maxTextureSize`.
 * @param entries - What the table counts (pieces or texels), to check against {@link MOST_ENTRIES}.
 * @returns Its width, the narrowest that keeps it no taller than `most`, and its texels in whole lines.
 * @throws GraphtyError `E_TOO_LARGE` when no table the card can hold has room.
 */
export function tableShape(texels: number, most: number, entries = texels): { width: number; texels: number } {
    // a power of two, which the shaders split a texel number by with a mask and a shift
    let width = Math.min(TABLE_WIDTH, 2 ** Math.floor(Math.log2(most)));
    while (width * 2 <= most && Math.ceil(texels / width) > most) {
        width *= 2;
    }

    if (Math.ceil(texels / width) > most || entries > MOST_ENTRIES) {
        throw tooLargeError(texels, most, entries, MOST_ENTRIES);
    }

    return { width, texels: Math.ceil(texels / width) * width };
}

/**
 * Texels an entry takes: (source row, target row, width, opacity), then (red, green, blue, speed);
 * a curve's two more (see the file comment).
 */
const TEXELS_PER_PIECE = 2;
const TEXELS_PER_CURVE_PIECE = 4;

/** The join template, drawn once per piece: its corners (which the shader turns into vertices) and its vertices. */
const JOIN_TEMPLATE = { indices: JOIN_TEMPLATE_INDICES, vertices: JOIN_TEMPLATE_VERTICES };

/** The lean program's rectangle, drawn once per piece of a mesh made with `pulledLean: true`. */
export const LEAN_TEMPLATE = { indices: LEAN_TEMPLATE_INDICES, vertices: LEAN_TEMPLATE_OF.length };

/** The lean program's define, which a batch that switches program adds to and takes from its material. */
const LEAN_DEFINE = "#define EDGE_PULLED_LEAN";

/** Each scene's batches that can draw their pieces with either program; see {@link drawLinesLean}. */
const SWITCHING = new WeakMap<Scene, Set<PulledLineBatch>>();

/**
 * Draw every straight line batch of a scene with the lean program (`EDGE_PULLED_LEAN`) or with
 * the join template, from the next frame on: `antialias: "at-rest"` draws its moving frames lean
 * and the frame it rests on joined, the picture `antialias: true` draws. Neither moves a piece or
 * sends a table again; the first use of each program compiles it.
 * @param scene - The scene.
 * @param lean - Whether to draw the lean program.
 * @returns How many batches draw the lean program now.
 */
export function drawLinesLean(scene: Scene, lean: boolean): number {
    let count = 0;
    for (const batch of SWITCHING.get(scene) ?? []) {
        batch.drawLean(lean);
        count += lean ? 1 : 0;
    }

    return count;
}

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

/** Draw slots (in the draw order table, a float each) or hidden flags (in the hidden table, a byte each) a texel holds. */
const FLAGS_PER_TEXEL = 4;

/** A row number no row has: the piece draws nothing. */
export const NO_ROW = -1;

/** The row table's textures a straight piece's shader reads its ends' shapes from, asked each frame. */
export type PulledRowShapes = () => { readonly extentTexture: BaseTexture; readonly outlineTexture: BaseTexture };

/** The row table's textures a pulled batch reads, asked each frame: the table replaces one when it grows. */
export interface PulledRowTextures {
    readonly positionTexture: BaseTexture;
    readonly extentTexture: BaseTexture;
    readonly outlineTexture: BaseTexture;
}

/**
 * Draw keys for `capacity` pieces, each piece's its own number: the key one width gives it, and the key of a piece
 * not yet handed out.
 * @param capacity - How many pieces.
 * @returns The keys.
 */
function identityKeys(capacity: number): Float64Array {
    return Float64Array.from({ length: capacity }, (_, piece) => piece);
}

/** Straight edges between row centers, drawn in one non-instanced draw; see the file comment. */
export class PulledLineBatch {
    /** The one mesh that draws every piece. */
    readonly mesh: Mesh;

    /** Bytes of the edge table sent to the card so far: tables built and rows written, never a move. */
    uploadedBytes = 0;

    /** The edge table's CPU copy: each piece's two rows and its look, {@link PulledLineBatch.pieceFloats} floats. */
    private rows: Float32Array<ArrayBuffer>;

    private table: RawTexture;

    /** Texels across the edge table, the hidden table, the draw order table and the route table: see {@link tableShape}. */
    private tableWidth = TABLE_WIDTH;
    private hiddenWidth = TABLE_WIDTH;
    private orderWidth = TABLE_WIDTH;
    private routeWidth = TABLE_WIDTH;

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

    /** Whether the pieces draw the lean program in place of the template; see {@link PulledLineBatch.drawLean}. */
    private lean = false;

    /** Pieces handed out so far; the draw covers these. */
    private highWater = 0;

    private readonly free: number[] = [];

    /**
     * Each piece's draw key: its width group's rank, then the slot the object path's batch of that width gives it.
     * The object path draws a batch per width, one after another in the order they were made, and draw order
     * decides how lines that cross blend; the draw order table draws pieces in this order (#6392).
     * Null while there is one width group, where every piece's key is its own number (8 MB a million edges spared).
     * Doubles, never floats: a key is rank * 2^32 + slot.
     */
    private keys: Float64Array | null = null;

    /** The width groups, by width, and by rank: the order this batch met them. */
    private readonly groups = new Map<number, WidthGroup>();
    private readonly ranked: WidthGroup[] = [];

    /** Whether a piece took a key out of draw order since the draw order was last built. */
    private reorder = false;

    /**
     * The piece each draw slot draws, a float a slot, while pieces of two widths interleave; null while every slot
     * draws the piece of its own number. The draw is unindexed: `gl_VertexID` names the slot and the corner, and the
     * shader reads the slot's piece here (`pulledPiece`). An index list did this at 4 bytes an index, 120 bytes an
     * edge, built and sent whole at every growth (#6389).
     */
    private order: Float32Array<ArrayBuffer> | null = null;

    /** The draw order table, or one empty line while {@link PulledLineBatch.order} is null. */
    private orderTable: RawTexture;

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

    /** Whether this is a curve batch, whose entries each draw {@link PulledLineBatch.stride} pieces. */
    private readonly curve: boolean;

    /**
     * Pieces the draw gives each entry of a curve batch: the most any span written to it has asked for, never fewer
     * than 1. It only grows, as an edge's run of pieces used to.
     */
    private piecesEach = 1;

    /**
     * Whether a write past what the card can hold has been reported (`Edge.refuseTooLarge`): once a batch is enough.
     * @internal
     */
    refusalReported = false;

    /**
     * Start a batch on a joined line mesh made with `pulled: true`.
     * @param mesh - The mesh (`CustomLineRenderer.createJoinedLineMesh`), parented as the rows'
     *     own space is: its world matrix is applied to every row's place.
     * @param scene - The scene whose frames upload the table.
     * @param rowPositions - The `rowPosition` texture, asked each frame: the row table replaces it
     *     when it grows.
     * @param curve - Whether its pieces are curves' (a mesh made with `pulledCurve: true`).
     * @param template - What a piece draws: the join template, the lean program's rectangle
     *     (`LEAN_TEMPLATE`, for a mesh made with `pulledLean: true`: 6 corners, not the join
     *     template's 30), or another mesh's own (`pulledAnimatedLine.ts`). Its shader names a
     *     corner's vertex itself: the batch draws `indices.length` vertices a piece, unindexed.
     * @param template.indices - Its corners: the vertex each draws, which its shader holds too.
     * @param template.vertices - Its vertices.
     * @param switches - Whether {@link drawLinesLean} may switch it to the lean program: a straight
     *     batch drawing the join template, 2D or 3D.
     * @param rowShapes - The row table's `rowExtent` and `rowOutline` textures, asked each frame, for a straight
     *     piece's shader to stop at a translucent row's outline (`PULLED_TRIM_GLSL`); null for a shader that reads
     *     neither (a curve's, whose ends are cut on the CPU).
     */
    constructor(
        mesh: Mesh,
        private readonly scene: Scene,
        private readonly rowPositions: () => BaseTexture,
        curve = false,
        private readonly template: { readonly indices: readonly number[]; readonly vertices: number } = JOIN_TEMPLATE,
        switches = false,
        private readonly rowShapes: PulledRowShapes | null = null,
    ) {
        this.mesh = mesh;
        const texels = curve ? TEXELS_PER_CURVE_PIECE : TEXELS_PER_PIECE;
        this.pieceFloats = texels * TEXEL_FLOATS;
        this.curve = curve;
        markEdgeLineBatchMesh(mesh);
        mesh.isPickable = false;
        mesh.doNotSyncBoundingInfo = true;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.isUnIndexed = true;
        const first = this.shape(TABLE_WIDTH);
        this.tableWidth = first.width;
        this.rows = this.emptyTable(first.texels / texels);
        this.table = this.build();
        const hidden = this.flagShape(first.texels / texels);
        this.hiddenWidth = hidden.width;
        this.hidden = new Uint8Array(hidden.flags);
        this.hiddenTable = this.buildHidden();
        const order = this.flagShape(1);
        this.orderWidth = order.width;
        this.orderTable = this.buildOrder(new Float32Array(order.flags));
        this.sort();
        if (curve) {
            const routes = this.shape(TABLE_WIDTH);
            this.routeWidth = routes.width;
            this.routes = new Float32Array(routes.texels * TEXEL_FLOATS);
            this.routeTable = this.buildRoutes(this.routes);
        }
        if (switches) {
            let switching = SWITCHING.get(scene);
            if (switching === undefined) {
                switching = new Set();
                SWITCHING.set(scene, switching);
            }

            switching.add(this);
        }

        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
        const engine = scene.getEngine();
        const restored = engine.onContextRestoredObservable.add(() => {
            this.sort();
        });
        this.stopRestore = () => {
            engine.onContextRestoredObservable.remove(restored);
        };
    }

    /**
     * The piece each draw slot draws, or null while each draws the piece of its own number.
     * @returns The draw order table's CPU copy.
     */
    get drawOrder(): Readonly<Float32Array> | null {
        return this.order;
    }

    /**
     * How many draw keys the batch holds: none while it has met one width.
     * @returns The count.
     * @internal
     */
    get keyCount(): number {
        return this.keys?.length ?? 0;
    }

    /**
     * Pieces the draw covers: every piece handed out, live or free (a free one draws nothing).
     * @returns The count.
     */
    get drawnCount(): number {
        return this.highWater;
    }

    /**
     * Pieces the draw gives each entry: the most a curve's span has asked for, 1 in a straight batch.
     * @returns The count.
     */
    get stride(): number {
        return this.piecesEach;
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
        // With one width a piece's key is its own number, as the free pieces are taken in the same order, so the keys
        // are kept only from the second width on, starting from that identity.
        let { keys } = this;
        if (keys === null && this.ranked.length > 1) {
            keys = this.keys = identityKeys(this.rows.length / this.pieceFloats);
        }

        if (keys !== null) {
            this.reorder ||= keys[piece] !== key;
            keys[piece] = key;
        }

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
        const key = this.keys === null ? piece : (this.keys[piece] ?? 0);
        this.ranked[Math.floor(key / SLOTS_PER_RANK)]?.free.push(key % SLOTS_PER_RANK);
    }

    /**
     * Draw a piece between two rows' centers. Written when an edge joins or changes a node, never
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
        const line = Math.floor(piece / (this.hiddenWidth * FLAGS_PER_TEXEL));
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
     * slot a plain piece leaves unused.
     * @param piece - The piece.
     * @param speed - Its `line.animationSpeed`.
     */
    setSpeed(piece: number, speed: number): void {
        this.rows[piece * this.pieceFloats + 7] = speed;
        this.touch(piece);
    }

    /**
     * Give a curve batch's entry its edge's span: written when the edge is placed, which its nodes moving does. The
     * draw gives every entry as many pieces as the longest span asks for ({@link PulledLineBatch.stride}).
     * @param piece - The entry.
     * @param span - The span (`curveSpan`), or null to draw nothing.
     * @param route - For a routed path, its block in the route table ({@link PulledLineBatch.writeRoute}).
     */
    setCurve(piece: number, span: CurveSpan | null, route = 0): void {
        const at = piece * this.pieceFloats;
        const pieces = span?.pieces ?? 0;
        if (pieces > this.piecesEach) {
            // a line through many bends may ask for more than a curve's most: only while one draw still reaches it
            const corners = this.template.indices.length;
            if (this.rows.length / this.pieceFloats > Math.floor(MOST_VERTICES / (corners * pieces))) {
                throw tooLargeError(this.rows.length / TEXEL_FLOATS, this.mostTexture(), this.highWater, MOST_ENTRIES);
            }

            this.piecesEach = pieces;
            this.setCount();
        }

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
        const size = count > ROUTE_ROUNDED ? count : 2 ** Math.ceil(Math.log2(Math.max(1, count)));
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
        const first = Math.floor(block / this.routeWidth);
        const last = Math.floor((block + size - 1) / this.routeWidth);
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
            const highWater = block + size;
            while (this.routes !== null && highWater * TEXEL_FLOATS > this.routes.length) {
                // doubled, but no more than the card's largest texture holds unless the block needs it: then E_TOO_LARGE,
                // before anything is handed out
                const doubled = Math.min((this.routes.length / TEXEL_FLOATS) * 2, this.mostTexture() ** 2);
                const { width, texels } = this.shape(Math.max(doubled, highWater), 0);
                this.routeWidth = width;
                const grown = new Float32Array(texels * TEXEL_FLOATS);
                grown.set(this.routes);
                this.routes = grown;
                this.routeTable?.dispose();
                this.routeTable = this.buildRoutes(grown);
                this.routesFirst = -1;
                this.routesLast = -1;
            }

            this.routeHighWater = highWater;
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
            this.routeWidth,
            routes.length / (this.routeWidth * TEXEL_FLOATS),
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
        if (this.rowShapes !== null) {
            const { extentTexture, outlineTexture } = this.rowShapes();
            material?.setTexture("rowExtent", extentTexture);
            material?.setTexture("rowOutline", outlineTexture);
        }
        this.flushRoutes();
        this.flushHidden();
        if (this.reorder) {
            this.sort();
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
        const across = this.tableWidth;
        for (let at = first; at < end;) {
            const x = at % across;
            const lines = x === 0 ? Math.floor((end - at) / across) : 0;
            const width = lines > 0 ? across : Math.min(across - x, end - at);
            const height = Math.max(lines, 1);
            const bytes = new Float32Array(this.rows.buffer, at * TEXEL_FLOATS * 4, width * height * TEXEL_FLOATS);
            engine.updateTextureData(internal, bytes, x, Math.floor(at / across), width, height);
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
        const floats = this.routeWidth * TEXEL_FLOATS;
        const bytes = new Float32Array(this.routes.buffer, this.routesFirst * floats * 4, lines * floats);
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        engine.updateTextureData(internal, bytes, 0, this.routesFirst, this.routeWidth, lines);
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
        const perLine = this.hiddenWidth * FLAGS_PER_TEXEL;
        const bytes = new Uint8Array(this.hidden.buffer, this.hiddenFirst * perLine, lines * perLine);
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        engine.updateTextureData(internal, bytes, 0, this.hiddenFirst, this.hiddenWidth, lines);
        this.uploadedBytes += bytes.byteLength;
        this.hiddenFirst = -1;
        this.hiddenLast = -1;
    }

    /** Stop following the frames and free the mesh and the table. */
    dispose(): void {
        SWITCHING.get(this.scene)?.delete(this);
        this.stopFlush();
        this.stopRestore();
        this.table.dispose();
        this.hiddenTable.dispose();
        this.orderTable.dispose();
        this.routeTable?.dispose();
        // Not its textures: `rowPosition` is the row table's, which outlives this batch.
        this.mesh.material?.dispose(true, false);
        this.mesh.dispose();
    }

    private build(): RawTexture {
        const texture = RawTexture.CreateRGBATexture(
            this.rows,
            this.tableWidth,
            this.rows.length / (this.tableWidth * TEXEL_FLOATS),
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
            this.hiddenWidth,
            this.hidden.length / (this.hiddenWidth * FLAGS_PER_TEXEL),
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
     * Send a draw order table to the card whole and bind it.
     * @param order - Its CPU copy, a float a slot.
     * @returns The texture.
     */
    private buildOrder(order: Float32Array<ArrayBuffer>): RawTexture {
        const texture = RawTexture.CreateRGBATexture(
            order,
            this.orderWidth,
            order.length / (this.orderWidth * FLAGS_PER_TEXEL),
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
        (this.mesh.material as ShaderMaterial | null)?.setTexture("edgeOrder", texture);
        this.uploadedBytes += order.byteLength;
        return texture;
    }

    /**
     * The card's largest texture side, asked each time a table grows.
     * @returns `maxTextureSize`.
     */
    private mostTexture(): number {
        return this.scene.getEngine().getCaps().maxTextureSize;
    }

    /**
     * {@link tableShape} on this batch's card.
     * @param texels - Texels the table must hold.
     * @param entries - What it counts, when not texels.
     * @returns Its width and texels.
     */
    private shape(texels: number, entries = texels): { width: number; texels: number } {
        return tableShape(texels, this.mostTexture(), entries);
    }

    /**
     * The shape of the hidden or the draw order table, four flags a texel.
     * @param flags - Flags it must hold.
     * @returns Its width, and its flags in whole lines.
     */
    private flagShape(flags: number): { width: number; flags: number } {
        const { width, texels } = this.shape(Math.ceil(flags / FLAGS_PER_TEXEL), flags);
        return { width, flags: texels * FLAGS_PER_TEXEL };
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
        const texels = this.pieceFloats / TEXEL_FLOATS;
        // the most entries the card's largest texture holds, the draw order names and one draw reaches: past them, a
        // table of the most, and E_TOO_LARGE once full
        const corners = Math.max(this.template.indices.length, LEAN_TEMPLATE.indices.length);
        const reach = Math.floor(MOST_VERTICES / (corners * (this.curve ? MAX_PIECES : 1)));
        const most = Math.min(Math.floor(this.mostTexture() ** 2 / texels), MOST_ENTRIES, reach);
        if (this.highWater >= most) {
            throw tooLargeError(this.highWater * texels, this.mostTexture(), this.highWater + 1, most);
        }

        const wanted = Math.min(Math.max(doubled, reserved), most);
        const shape = this.shape(wanted * texels, wanted);
        this.tableWidth = shape.width;
        const pieces = shape.texels / texels;
        const grown = this.emptyTable(pieces);
        grown.set(this.rows);
        this.rows = grown;
        this.table.dispose();
        this.table = this.build();
        // the new table went up whole
        this.dirty.take(false);
        if (pieces > this.hidden.length) {
            const flags = this.flagShape(pieces);
            this.hiddenWidth = flags.width;
            const hidden = new Uint8Array(flags.flags);
            hidden.set(this.hidden);
            this.hidden = hidden;
            this.hiddenTable.dispose();
            this.hiddenTable = this.buildHidden();
            this.hiddenFirst = -1;
            this.hiddenLast = -1;
        }

        this.sort();
    }

    /**
     * Put the pieces handed out in draw order ({@link PulledLineBatch.keys}): in the draw order table while two widths
     * interleave, else in plain piece order with no table read.
     */
    private sort(): void {
        const capacity = this.rows.length / this.pieceFloats;
        if (this.keys !== null && this.keys.length !== capacity) {
            const keys = identityKeys(capacity);
            keys.set(this.keys);
            this.keys = keys;
        }

        const { keys, highWater } = this;
        const ordered = keys !== null && this.ranked.length > 1;
        if (ordered) {
            // ponytail: sorts every handed-out piece, at most once a frame and only while widths interleave; give
            // each group its own slot range if a large mixed-width load shows it
            const drawn = Uint32Array.from({ length: highWater }, (_, piece) => piece).sort(
                (a, b) => (keys[a] ?? 0) - (keys[b] ?? 0) || a - b,
            );
            const shape = this.flagShape(capacity);
            this.orderWidth = shape.width;
            const size = shape.flags;
            const order = this.order?.length === size ? this.order : new Float32Array(size);
            order.set(drawn);
            // a piece handed out later whose key is its own number asks for no sort, so its slot must already name it
            for (let slot = highWater; slot < size; slot++) {
                order[slot] = slot;
            }

            if (order === this.order) {
                this.orderTable.update(order);
                this.uploadedBytes += order.byteLength;
            } else {
                this.order = order;
                this.orderTable.dispose();
                this.orderTable = this.buildOrder(order);
            }
        }

        (this.mesh.material as ShaderMaterial | null)?.setFloat("edgeOrdered", ordered ? 1 : 0);
        this.reorder = false;
        this.setCount();
    }

    /**
     * Draw the pieces with the lean program or the join template; see {@link drawLinesLean}.
     * @param lean - Whether to draw the lean program.
     */
    drawLean(lean: boolean): void {
        if (lean === this.lean) {
            return;
        }

        const material = this.mesh.material as ShaderMaterial;
        const { defines } = material.options;
        const set = (on: boolean): void => {
            const at = defines.indexOf(LEAN_DEFINE);
            if (on && at === -1) {
                defines.push(LEAN_DEFINE);
            } else if (!on && at !== -1) {
                defines.splice(at, 1);
            }
        };
        set(lean);
        // A program not compiled yet would leave every piece off the frame: the batch keeps the one
        // it has until the other is ready, which its compile, under way now, makes it soon.
        if (!material.isReady(this.mesh, false, this.mesh.subMeshes[0])) {
            set(!lean);
            return;
        }

        this.lean = lean;
        this.setCount();
    }

    /** Draw only the pieces handed out, a vertex a corner. */
    private setCount(): void {
        const [subMesh] = this.mesh.subMeshes;
        subMesh.verticesStart = 0;
        const corners = this.lean ? LEAN_TEMPLATE.indices.length : this.template.indices.length;
        subMesh.verticesCount = this.highWater * this.piecesEach * corners;
        if (this.curve) {
            (this.mesh.material as ShaderMaterial | null)?.setFloat("edgeStride", this.piecesEach);
        }
        subMesh.setBoundingInfo(this.mesh.getBoundingInfo());
    }
}
