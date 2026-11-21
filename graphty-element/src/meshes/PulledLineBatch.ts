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
import { type EdgeLineMeta, markEdgeLineBatchMesh, patternSpacing } from "./EdgeLineBatch";
import { batchUploadFrames } from "./FrameRoster";
import { takePoolReserve } from "./poolReserve";
import { CURVE_STRIDE, curveShape, type CurveSpan } from "./pulledCurve";
import { placedEnds, type PulledCapLook, type RestSource, RestWatch, roundRowsEnds } from "./restPlacement";

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
 * bundle: an edge takes a run of entries, each its rows, its look, its part of the run and its span, two texels more
 * than a straight piece's: (samples, first, pieces, startAt), then (endAt and the shape, `curveShape`). An entry
 * holds `CURVE_STRIDE` (16) pieces of its edge's path. Each piece the edge's longest cut has needed takes a draw SLOT
 * of its own, handed out and freed exactly as the object path's line batch hands out its slots, so the pieces draw
 * in the object path's order; the SLOT TABLE (`edgeSlots`, a name a slot) says which entry and which of its 16
 * pieces a slot draws. The shader works out piece j's place along the cut path from the two rows' places and the span
 * (`meshes/pulledCurve.ts`); a piece past its own curve's draws nothing. An entry per 16 pieces and four bytes a
 * piece, not four texels, keep a million long curves (64 pieces each) to 4096 x 4096 tables (#9160).
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
 * The most entries a table may name: the draw order and slot tables name them in a float's bits ({@link NAME_BASE}),
 * a curve's piece as its entry times 16 plus the piece, below 2^30. A curve's span names its route block in two
 * floats ({@link ROUTE_SPLIT}), so the route table has no such limit.
 */
const MOST_ENTRIES = 2 ** 26;

/**
 * What the draw order and slot tables add to a name before writing its bits as a float: the float is then a normal
 * number, never zero, a denormal a card may flush, or a NaN it may rewrite, and the shader reads the bits back
 * (`floatBitsToUint`). A slot table's 0 names nothing.
 */
const NAME_BASE = 2 ** 23;

/** The most vertices one draw may ask for: `drawArrays` takes a signed 32-bit count. */
const MOST_VERTICES = 2 ** 31 - 1;

/**
 * Routes of at most this many points take a block of the next power of two, so a path a point longer keeps its block;
 * longer ones (a line through more than 30 bends) take exactly what they need. A center arc has at most 25 points
 * (`edgeRoute.centerCircle`), so a million of them take 32 million texels, inside one 8192 x 8192 table.
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

    /** Pieces handed out so far (a curve batch's draw slots); the draw covers these. */
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

    /**
     * A straight batch's placed ends (`edgeEnds`): two texels a piece, the source end and 1, then the line's end,
     * written at rest for a piece under a pulled head ({@link PulledLineBatch.setCapBack}); empty until one is.
     */
    private ends = new Float32Array(TABLE_WIDTH * TEXEL_FLOATS);

    private endsTable: RawTexture | null = null;

    private endsWidth = TABLE_WIDTH;

    /** Whether {@link PulledLineBatch.ends} was written since its last upload. */
    private endsDirty = false;

    /** Each piece's head, for a piece under a pulled head: what its line end is placed by at rest. */
    private readonly endLooks: (PulledCapLook | undefined)[] = [];

    /** What the pieces' ends are placed from at rest; null until a piece has a head or the batch a pattern. */
    private rest: RestSource | null = null;

    /** A patterned straight batch's pattern (`EdgeMesh.pulledPattern`), whose every piece is placed at rest. */
    private readonly pattern: EdgeLineMeta["pattern"];

    private readonly watch = new RestWatch();

    /**
     * A curve batch's slot table ({@link PulledLineBatch.setCurve}): each draw slot's entry times `CURVE_STRIDE` plus
     * its piece, in a float's bits past {@link NAME_BASE}, 0 for none. Null in a straight batch, where a slot draws
     * the entry of its own number.
     */
    private slots: Float32Array<ArrayBuffer> | null = null;

    private slotNames: Uint32Array<ArrayBuffer> | null = null;
    private slotTable: RawTexture | null = null;
    private slotWidth = TABLE_WIDTH;

    /** The first and last slot table line written since the last upload, or -1. */
    private slotsFirst = -1;
    private slotsLast = -1;

    /** A curve batch's entries handed out so far, the freed ones, and each one's width (which its slots are keyed by). */
    private entryHighWater = 0;
    private readonly freeEntries: number[] = [];
    private readonly entryWidths: number[] = [];

    /** Each entry's slots, `CURVE_STRIDE` an entry, -1 for none yet: taken as its pieces are first needed. */
    private entrySlots: Int32Array<ArrayBuffer> = new Int32Array(0);

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
            this.entrySlots = new Int32Array((first.texels / texels) * CURVE_STRIDE).fill(-1);
            this.growSlots(first.texels / texels);
            const routes = this.shape(TABLE_WIDTH);
            this.routeWidth = routes.width;
            this.routes = new Float32Array(routes.texels * TEXEL_FLOATS);
            this.routeTable = this.buildRoutes(this.routes);
        }
        this.pattern = curve ? undefined : (mesh.metadata as EdgeLineMeta | null)?.pattern;
        if (!curve) {
            this.endsTable = this.buildEnds();
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
    get drawOrder(): readonly number[] | null {
        const { order } = this;
        return order === null ? null : Array.from(new Uint32Array(order.buffer), (bits) => bits - NAME_BASE);
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
     * Pieces the draw covers: every piece handed out, live or free (a free one draws nothing). In a curve batch, every
     * draw slot: a piece of a curve.
     * @returns The count.
     */
    get drawnCount(): number {
        return this.highWater;
    }

    /**
     * Pieces an entry holds: `CURVE_STRIDE` in a curve batch, 1 in a straight batch.
     * @returns The count.
     */
    get stride(): number {
        return this.slots === null ? 1 : CURVE_STRIDE;
    }

    /**
     * Hand out a piece (a curve batch's entry, with a slot for its first piece), drawing nothing until
     * {@link PulledLineBatch.setRows}.
     * @param width - The width {@link PulledLineBatch.setLook} will give it, which places it in draw order as the
     *     object path's batch of that width would draw it.
     * @returns The piece.
     */
    acquire(width = 0): number {
        if (this.slots === null) {
            return this.takeSlot(width);
        }

        let entry = this.freeEntries.pop();
        if (entry === undefined) {
            if (this.entryHighWater === this.rows.length / this.pieceFloats) {
                this.grow();
            }

            entry = this.entryHighWater++;
        }

        this.entryWidths[entry] = width;
        this.slotsFor(entry, 1);
        return entry;
    }

    /**
     * Give an entry's first `count` pieces a draw slot each, in piece order, those it has kept: a curve keeps the
     * slots its longest cut took, as the object path's curve keeps its batch slots.
     * @param entry - The entry.
     * @param count - Pieces, at most `CURVE_STRIDE`.
     */
    private slotsFor(entry: number, count: number): void {
        const { slotNames } = this;
        if (slotNames === null) {
            return;
        }

        for (let j = 0; j < count; j++) {
            if ((this.entrySlots[entry * CURVE_STRIDE + j] ?? -1) >= 0) {
                continue;
            }

            const slot = this.takeSlot(this.entryWidths[entry] ?? 0);
            this.entrySlots[entry * CURVE_STRIDE + j] = slot;
            this.nameSlot(slot, NAME_BASE + entry * CURVE_STRIDE + j);
        }
    }

    /**
     * Write a slot's name in the slot table.
     * @param slot - The slot.
     * @param bits - Its name's bits, 0 for none.
     */
    private nameSlot(slot: number, bits: number): void {
        if (this.slotNames === null) {
            return;
        }

        this.slotNames[slot] = bits;
        const line = Math.floor(slot / (this.slotWidth * FLAGS_PER_TEXEL));
        this.slotsFirst = this.slotsFirst < 0 ? line : Math.min(this.slotsFirst, line);
        this.slotsLast = Math.max(this.slotsLast, line);
    }

    /**
     * Entries handed out so far: a curve batch's own count, else one a draw slot.
     * @returns The count.
     */
    private get entryCount(): number {
        return this.slots === null ? this.highWater : this.entryHighWater;
    }

    /**
     * The draw slots a piece of the batch may take: a curve batch's slot table, else the edge table's pieces.
     * @returns The count.
     */
    private get slotCapacity(): number {
        return this.slotNames?.length ?? this.rows.length / this.pieceFloats;
    }

    /**
     * Hand out a draw slot, keyed into draw order by its width.
     * @param width - Its width.
     * @returns The slot.
     */
    private takeSlot(width: number): number {
        let piece = this.free.pop();
        if (piece === undefined) {
            if (this.highWater === this.slotCapacity) {
                if (this.slots === null) {
                    this.grow();
                } else {
                    this.growSlots(this.slotCapacity * 2);
                }
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
            keys = this.keys = identityKeys(this.slotCapacity);
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
        if (this.slots === null) {
            // a straight piece's spare float is its cap's stand-back (`setCapBack`): the next taker starts with none
            this.rows[piece * this.pieceFloats + 7] = 0;
            this.endLooks[piece] = undefined;
            this.freeSlot(piece);
            return;
        }

        // its slots go back in piece order, as the object path's curve gives its batch slots back
        for (let j = 0; j < CURVE_STRIDE; j++) {
            const slot = this.entrySlots[piece * CURVE_STRIDE + j] ?? -1;
            if (slot >= 0) {
                this.nameSlot(slot, 0);
                this.freeSlot(slot);
                this.entrySlots[piece * CURVE_STRIDE + j] = -1;
            }
        }

        this.freeEntries.push(piece);
    }

    /**
     * Hand a draw slot back.
     * @param slot - The slot.
     */
    private freeSlot(slot: number): void {
        this.free.push(slot);
        const key = this.keys === null ? slot : (this.keys[slot] ?? 0);
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
        this.unplace(piece);
    }

    /**
     * Hand a piece's ends back to the shader until the next rest places them again.
     * @param piece - The piece.
     */
    private unplace(piece: number): void {
        if (this.rest === null) {
            return;
        }

        if ((this.ends[piece * 2 * TEXEL_FLOATS + 3] ?? 0) !== 0) {
            this.ends[piece * 2 * TEXEL_FLOATS + 3] = 0;
            this.endsDirty = true;
        }

        this.watch.touch();
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
     * Stop a straight piece short of its target's outline for an arrowhead drawn from the row table
     * (`ArrowCapBatch.setPulled`), in the slot a plain piece leaves unused: the piece then runs from its source's outline to
     * the head's back, as `Edge.transformArrowCap` ends an object edge's line (`PULLED_TRIM_GLSL`'s `pulledCapTrim`).
     * @param piece - The piece.
     * @param back - How far before the target's outline the line stops, at node scale 1 (`EdgeMesh.lineStopOf`);
     *     0 for no head, the line running between the rows as a plain piece does.
     * @param look - The head, which places the line's end at rest (`restPlacement.ts`); none leaves it to the shader.
     * @param rest - What the ends are placed from at rest.
     */
    setCapBack(piece: number, back: number, look?: PulledCapLook, rest?: RestSource): void {
        this.rows[piece * this.pieceFloats + 7] = back;
        this.endLooks[piece] = look;
        this.rest = rest ?? this.rest;
        this.touch(piece);
        this.unplace(piece);
    }

    /**
     * Say what a patterned batch's pieces are placed from at rest (`restPlacement.ts`), so a still dashed line's ends
     * and spacing are the object path's; nothing for a solid batch, whose pieces are placed only under a head.
     * @param rest - The rows, and whether a layout moves them.
     */
    restFrom(rest: RestSource): void {
        if (this.pattern !== undefined && this.rest === null) {
            this.rest = rest;
            this.watch.touch();
        }
    }

    /**
     * Give a curve batch's entry its edge's span: written when the edge is placed, which its nodes moving does. An
     * entry holds {@link PulledLineBatch.stride} pieces of the path, so a curve of more takes a run of entries; each
     * piece the span needs is given a draw slot the first time it is needed.
     * @param piece - The entry.
     * @param part - Which of its edge's run it is: it draws pieces from `part * stride` on.
     * @param span - The span (`curveSpan`), or null to draw nothing.
     * @param route - For a routed path, its block in the route table ({@link PulledLineBatch.writeRoute}).
     */
    setCurve(piece: number, part: number, span: CurveSpan | null, route = 0): void {
        const at = piece * this.pieceFloats;
        this.rows[at + 7] = part;
        this.rows[at + 8] = span?.samples ?? 0;
        this.rows[at + 9] = span?.first ?? 0;
        this.rows[at + 10] = span?.pieces ?? 0;
        this.rows[at + 11] = span?.startAt ?? 0;
        this.rows[at + 12] = span?.endAt ?? 0;
        [this.rows[at + 13], this.rows[at + 14], this.rows[at + 15]] = curveShape(span, route);
        this.touch(piece);
        this.slotsFor(piece, Math.min(CURVE_STRIDE, (span?.pieces ?? 0) - part * CURVE_STRIDE));
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
        this.followRest(material);
        this.flushRoutes();
        this.flushHidden();
        this.flushSlots();
        if (this.reorder) {
            this.sort();
        }

        if (!this.dirty.dirty) {
            return;
        }

        const runs = this.dirty.take(true) ?? [0, this.entryCount];
        const texels = this.pieceFloats / TEXEL_FLOATS;
        for (let i = 0; i < runs.length; i += 2) {
            this.sendTexels(runs[i] * texels, runs[i + 1] * texels);
        }
    }

    /**
     * Place the ends of the pieces under a pulled head on the CPU once the rows are at rest (`restPlacement.ts`), by
     * `Edge.placeArrowCaps`'s arithmetic over the row table (`Edge.interceptPointsFromColumns`): the source's outline
     * and the line's end before its head, so a still graph draws the objects picture.
     * @param material - The batch's material, given whether the placed ends are current.
     */
    private followRest(material: ShaderMaterial | null): void {
        const { rest } = this;
        if (rest !== null && this.endsTable !== null && this.watch.due(rest)) {
            this.placeEnds(rest.rows);
            this.watch.done(rest.rows);
        }

        material?.setFloat("endsPlaced", this.watch.placed ? 1 : 0);
        if (this.endsDirty && this.endsTable !== null) {
            this.endsTable.update(this.ends);
            this.uploadedBytes += this.ends.byteLength;
            this.endsDirty = false;
        }
    }

    /**
     * Place every piece with a head and two rows, as {@link PulledLineBatch.followRest} says.
     * @param rows - The row table.
     */
    private placeEnds(rows: RestSource["rows"]): void {
        const pieces = this.rows.length / this.pieceFloats;
        if (this.ends.length < pieces * 2 * TEXEL_FLOATS) {
            const { width, texels } = this.shape(pieces * 2, pieces);
            this.endsWidth = width;
            this.ends = new Float32Array(texels * TEXEL_FLOATS);
            this.endsTable?.dispose();
            this.endsTable = this.buildEnds();
        }

        const { ends } = this;
        const positions = rows.restingPositions;
        const at = placedEnds;
        ends.fill(0);
        for (let piece = 0; piece < this.highWater; piece++) {
            const look = this.endLooks[piece];
            const base = piece * this.pieceFloats;
            const [from, head] = [this.rows[base] ?? NO_ROW, this.rows[base + 1] ?? NO_ROW];
            if (
                (look === undefined && this.pattern === undefined) ||
                from < 0 ||
                head < 0 ||
                this.hidden[piece] !== 0 ||
                // a hidden row draws no line: the shader trims it, and draws nothing
                positions[from * 4 + 3] * positions[head * 4 + 3] === 0 ||
                !(look === undefined
                    ? bareEnds(rows, from, head, at)
                    : roundRowsEnds(rows, from, head, (scale) => look.lineStopAt(look.size * scale), at) > 0)
            ) {
                continue;
            }

            // EdgeLineBatch.place: a straight line's spacing for its length (Vector3.Distance)
            const [dx, dy, dz] = [at[6] - at[0], at[7] - at[1], at[8] - at[2]];
            const spacing = patternSpacing(this.pattern, Math.sqrt(dx * dx + dy * dy + dz * dz)); // eslint-disable-line unicorn/prefer-modern-math-apis -- Vector3.Distance's own arithmetic, which the object path's spacing reads
            const to = piece * 2 * TEXEL_FLOATS;
            ends[to] = at[0];
            ends[to + 1] = at[1];
            ends[to + 2] = at[2];
            ends[to + 3] = 1;
            ends[to + 4] = at[6];
            ends[to + 5] = at[7];
            ends[to + 6] = at[8];
            ends[to + 7] = spacing;
        }

        this.endsDirty = true;
    }

    /**
     * Send the placed ends table whole and bind it.
     * @returns The texture.
     */
    private buildEnds(): RawTexture {
        const texture = RawTexture.CreateRGBATexture(
            this.ends,
            this.endsWidth,
            this.ends.length / (this.endsWidth * TEXEL_FLOATS),
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
        (this.mesh.material as ShaderMaterial | null)?.setTexture("edgeEnds", texture);
        this.uploadedBytes += this.ends.byteLength;
        return texture;
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

    /** Send the slot table lines written since the last frame: one call, the lines between the first and last. */
    private flushSlots(): void {
        const internal = this.slotTable?.getInternalTexture();
        if (this.slotsFirst < 0 || this.slots === null || !internal) {
            return;
        }

        const lines = this.slotsLast - this.slotsFirst + 1;
        const perLine = this.slotWidth * FLAGS_PER_TEXEL;
        const bytes = new Float32Array(this.slots.buffer, this.slotsFirst * perLine * 4, lines * perLine);
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        engine.updateTextureData(internal, bytes, 0, this.slotsFirst, this.slotWidth, lines);
        this.uploadedBytes += bytes.byteLength;
        this.slotsFirst = -1;
        this.slotsLast = -1;
    }

    /**
     * Make the slot table hold at least `wanted` slots, keeping every name, or no more than the card and one draw
     * allow: past them, E_TOO_LARGE.
     * @param wanted - Slots it must hold.
     */
    private growSlots(wanted: number): void {
        const corners = Math.max(this.template.indices.length, LEAN_TEMPLATE.indices.length);
        const most = Math.min(
            this.mostTexture() ** 2 * FLAGS_PER_TEXEL,
            MOST_ENTRIES * CURVE_STRIDE,
            Math.floor(MOST_VERTICES / corners),
        );
        if (this.highWater >= most) {
            throw tooLargeError(
                Math.ceil(this.highWater / FLAGS_PER_TEXEL),
                this.mostTexture(),
                this.highWater + 1,
                most,
            );
        }

        const shape = this.shape(Math.ceil(Math.min(wanted, most) / FLAGS_PER_TEXEL), 0);
        this.slotWidth = shape.width;
        const slots = new Float32Array(shape.texels * FLAGS_PER_TEXEL);
        if (this.slots !== null) {
            slots.set(this.slots);
        }

        this.slots = slots;
        this.slotNames = new Uint32Array(slots.buffer);
        this.slotTable?.dispose();
        this.slotTable = RawTexture.CreateRGBATexture(
            slots,
            this.slotWidth,
            slots.length / (this.slotWidth * FLAGS_PER_TEXEL),
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
        (this.mesh.material as ShaderMaterial | null)?.setTexture("edgeSlots", this.slotTable);
        this.uploadedBytes += slots.byteLength;
        this.slotsFirst = -1;
        this.slotsLast = -1;
        this.sort();
    }

    /** Stop following the frames and free the mesh and the table. */
    dispose(): void {
        SWITCHING.get(this.scene)?.delete(this);
        this.stopFlush();
        this.stopRestore();
        this.table.dispose();
        this.hiddenTable.dispose();
        this.orderTable.dispose();
        this.slotTable?.dispose();
        this.routeTable?.dispose();
        this.endsTable?.dispose();
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
        const reserved = this.entryCount + takePoolReserve(this.scene, "lines");
        const texels = this.pieceFloats / TEXEL_FLOATS;
        // the most entries the card's largest texture holds, the draw order names and one draw reaches: past them, a
        // table of the most, and E_TOO_LARGE once full
        const corners = Math.max(this.template.indices.length, LEAN_TEMPLATE.indices.length);
        // a curve batch's draw reaches its slots, not its entries (`growSlots`)
        const reach = this.slots === null ? Math.floor(MOST_VERTICES / corners) : MOST_ENTRIES;
        const most = Math.min(Math.floor(this.mostTexture() ** 2 / texels), MOST_ENTRIES, reach);
        const handed = this.entryCount;
        if (handed >= most) {
            throw tooLargeError(handed * texels, this.mostTexture(), handed + 1, most);
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

        if (this.slots !== null) {
            const entrySlots = new Int32Array(pieces * CURVE_STRIDE).fill(-1);
            entrySlots.set(this.entrySlots);
            this.entrySlots = entrySlots;
            return;
        }

        this.sort();
    }

    /**
     * Put the pieces handed out in draw order ({@link PulledLineBatch.keys}): in the draw order table while two widths
     * interleave, else in plain piece order with no table read.
     */
    private sort(): void {
        const capacity = this.slotCapacity;
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
            // each name in a float's bits (NAME_BASE)
            const names = new Uint32Array(order.buffer);
            names.set(drawn);
            // a piece handed out later whose key is its own number asks for no sort, so its slot must already name it
            for (let slot = highWater; slot < size; slot++) {
                names[slot] = slot;
            }

            for (let slot = 0; slot < size; slot++) {
                names[slot] = (names[slot] ?? 0) + NAME_BASE;
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
        subMesh.verticesCount = this.highWater * corners;
        subMesh.setBoundingInfo(this.mesh.getBoundingInfo());
    }
}

/**
 * A headless piece's ends, as `Edge.bareEnd` ends an object edge's line with no cap: its nodes' centers, which an
 * opaque node hides; a translucent end is left to the shader (`pulledTrim`).
 * @param rows - The row table.
 * @param from - The source row.
 * @param to - The target row.
 * @param out - Written with the ends, as `roundEnds` writes them.
 * @returns False for ends the CPU does not place.
 */
function bareEnds(rows: RestSource["rows"], from: number, to: number, out: Float64Array): boolean {
    if (rows.seenThrough(from) || rows.seenThrough(to)) {
        return false;
    }

    const positions = rows.restingPositions;
    for (let i = 0; i < 3; i++) {
        out[i] = positions[from * 4 + i];
        out[6 + i] = positions[to * 4 + i];
    }

    return true;
}
