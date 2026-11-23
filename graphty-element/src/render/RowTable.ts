/// <reference types="@webgpu/types" />
/**
 * @file The drawn place and size of every row of one graph, as float textures a shader can read
 * and as a CPU table picking can walk (design/rendering/row-renderer.md 4.1).
 *
 * A row is the node's index in the snapshot. Node batches draw from these tables. They are built
 * only when something opens them (`Graph.openRowTable`), so a graph on the `"objects"` path pays
 * one null check per move.
 */

import type { AbstractEngine, ThinEngine } from "@babylonjs/core";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { ElementPositions } from "../data/positions";
import type { Xyz } from "../meshes/edgeRoute";
import {
    ROW_EXTENT_ELLIPSE,
    ROW_EXTENT_ROUND,
    ROW_EXTENT_SCREEN_BORDER,
    ROW_EXTENT_SEEN_THROUGH,
} from "../meshes/edgeTrim";
import { batchUploadFrames } from "../meshes/FrameRoster";
import type { Node } from "../Node";
import type { GraphSceneMetadata } from "../types/sceneMetadata";
import type { GpuBufferHandle, GpuDeviceHandle } from "./gpuHandles";

/** Texels across both textures: a shader reads texel `i` at `(i % 1024, i / 1024)`. */
const ROW_TEXTURE_WIDTH = 1024;

const FLOATS_PER_TEXEL = 4;
/** `rowPosition` and `rowBounds`: x, y, z and w; x, y, z and radius times w. */
const POSITION_FLOATS = 4;
/**
 * `rowExtent`, three texels a row: scale, round radius, border reach, flags; half extents and
 * bounding radius; outline half extents and the row's reach outline in `rowOutline` (its first side
 * times 1024 plus its count of sides, 0 for none).
 */
const EXTENT_FLOATS = 12;
const EXTENT_BOUNDING_RADIUS = 7;

/** `rowOutline`: one side a texel, its start x and y and its end x and y. */
const OUTLINE_FLOATS = 4;
/** Sides one reach outline may hold in `rowExtent`'s code; past it the row ends a line at its box. */
const OUTLINE_MOST_SIDES = 1023;
/** Sides `rowOutline` may hold before a float can no longer name the first one exactly. */
const OUTLINE_TABLE_SIDES = 16384;

/** Drawn somewhere other than its lane row (a drag, a transition, a group), so a repack leaves it. */
const HELD = 1;
/** Filtered out, hidden by a style or removed: w stays 0. */
const HIDDEN = 2;
/** Shrunk by a particle transition: a repack keeps its w, and paint measures it once it is whole. */
const SHRUNK = 4;
/** Measured at least once since it took this row. */
const KNOWN = 8;

/** What {@link RowTable.measure} reads of a row: a `Node`, or a row drawn with no `Node` (`ColumnRow`). */
export interface RowMeasure {
    readonly index: number;
    readonly drawnScale: number;
    readonly roundRadius: number | null;
    readonly borderReach: number;
    /** Whether its border is drawn in screen pixels, so {@link RowMeasure.borderReach} changes with the zoom. */
    readonly screenBorder?: boolean;
    readonly drawnHalfExtents: Readonly<{ x: number; y: number; z: number }>;
    readonly drawnBoundingRadius: number;
    readonly outlineHalfExtents: Readonly<{ x: number; y: number; z: number }>;
    /** The opacity its style draws its body at. */
    readonly paintedOpacity: number;
    /** Its shape. */
    readonly shapeType?: string | undefined;
    /** A flat shape's outline in units of its box's half size, or null (`surfaceReach`). */
    readonly reachOutline: readonly (readonly [x: number, y: number])[] | null;
}

/** What {@link RowTable.extentOf} reads. */
/** Where a layout on the drawing device fills `rowPosition` (design/rendering/row-renderer.md 4.5). */
export interface DrawnTarget {
    readonly table: RowTable;
    /**
     * The device the texture lives on when the layout shares it, so a landing is copied on the card; null when
     * the renderer draws elsewhere (WebGL, or WebGPU on its own device), so a landing's drawn rows come back in
     * the batch's readback and go up as they came ({@link RowTable.uploadLanded}).
     */
    readonly device: GpuDeviceHandle | null;
    /** A layout transition is drawing rows off their lanes: landings go up by upload, not by copy. */
    readonly suspended?: boolean;
}

export interface RowExtent {
    /** The node's own scale, the same on every axis: a stretched node (a group, a model) is no batch's. */
    scale: number;
    /** Its radius when it is round, else null. */
    round: number | null;
    /** How far its surface reaches along each axis. */
    half: Xyz;
    /**
     * How far its border reaches past its surface as layout counts it (`Node.layoutRadius`): 0 for a border drawn in
     * screen pixels, whose reach changes with the zoom.
     */
    border: number;
}

/**
 * A row's measure as the CPU took it, when the row table's 32-bit copy is that measure rounded: the object path
 * works in the doubles it measured, and a last bit of difference moves a trimmed edge end by a pixel (#6287).
 * @param stored - What the row table holds.
 * @param measured - What the row measured when it was written, or null.
 * @returns The measure, or what the table holds when it holds something else (a shrink part of the way).
 */
export function exactOf(stored: number, measured: number | null): number {
    return measured !== null && Math.fround(measured) === stored ? measured : stored;
}

/** One float texture and the CPU copy it is uploaded from. */
class RowTexture {
    floats: Float32Array<ArrayBuffer>;
    texture: RawTexture;
    /** First and last dirty rows; `first > last` when nothing waits to go up. */
    private first = Number.POSITIVE_INFINITY;
    private last = -1;

    constructor(
        private readonly scene: Scene,
        private readonly floatsPerRow: number,
        capacity: number,
    ) {
        this.floats = new Float32Array(this.lineFloats(capacity));
        this.texture = this.build();
    }

    /**
     * The floats of a whole number of texture lines.
     * @param rows - The rows they must hold.
     * @returns The floats.
     */
    private lineFloats(rows: number): number {
        const line = ROW_TEXTURE_WIDTH * FLOATS_PER_TEXEL;
        return Math.max(1, Math.ceil((rows * this.floatsPerRow) / line)) * line;
    }

    private build(): RawTexture {
        return RawTexture.CreateRGBATexture(
            this.floats,
            ROW_TEXTURE_WIDTH,
            this.floats.length / FLOATS_PER_TEXEL / ROW_TEXTURE_WIDTH,
            this.scene,
            false,
            false,
            Constants.TEXTURE_NEAREST_SAMPLINGMODE,
            Constants.TEXTURETYPE_FLOAT,
        );
    }

    /**
     * Take the rows to their new places and make room for `capacity`, in a new texture when the
     * old one is too small.
     * @param remap - Old row to new row, or null when no row moved.
     * @param capacity - The rows to hold.
     */
    follow(remap: U32 | null, capacity: number): void {
        const length = this.lineFloats(capacity);
        const grown = length > this.floats.length;
        if (remap !== null || grown) {
            const next = new Float32Array(Math.max(length, this.floats.length));
            moveRows(this.floats, next, this.floatsPerRow, remap);
            this.floats = next;
        }

        if (grown) {
            this.texture.dispose();
            this.texture = this.build();
        }
    }

    /**
     * Whether rows wait to go up.
     * @returns True when a row was touched since the last upload.
     */
    get dirty(): boolean {
        return this.first <= this.last;
    }

    /**
     * The rows the next {@link RowTexture.upload} sends: every row of each whole texture line it sends.
     * @returns The first row and one past the last, equal when nothing waits to go up.
     */
    dirtyRows(): [number, number] {
        if (this.first > this.last) {
            return [0, 0];
        }

        const lineRows = (ROW_TEXTURE_WIDTH * FLOATS_PER_TEXEL) / this.floatsPerRow;
        return [Math.floor(this.first / lineRows) * lineRows, (Math.floor(this.last / lineRows) + 1) * lineRows];
    }

    touch(first: number, last = first): void {
        this.first = Math.min(this.first, first);
        this.last = Math.max(this.last, last);
    }

    /**
     * Send what changed, in whole texture lines.
     * @param whole - Send everything: the texture came back empty.
     * @returns The bytes sent.
     */
    /** Forget what changed: the card already has it. */
    clean(): void {
        this.first = Number.POSITIVE_INFINITY;
        this.last = -1;
    }

    /**
     * Send the first `rows` rows from `from`, laid out as `floats` is, without touching `floats`.
     * @param from - The rows, `floatsPerRow` floats each.
     * @param rows - Rows to send.
     * @returns The bytes sent, 0 when the texture is not on the card yet.
     */
    uploadFrom(from: Float32Array, rows: number): number {
        const internal = this.texture.getInternalTexture();
        if (internal === null || rows <= 0) {
            return 0;
        }

        const lineFloats = ROW_TEXTURE_WIDTH * FLOATS_PER_TEXEL;
        const lineRows = lineFloats / this.floatsPerRow;
        const lines = Math.floor(rows / lineRows);
        const rest = rows % lineRows;
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        if (lines > 0) {
            engine.updateTextureData(internal, from.subarray(0, lines * lineFloats), 0, 0, ROW_TEXTURE_WIDTH, lines);
        }

        if (rest > 0) {
            const start = lines * lineFloats;
            const texels = (rest * this.floatsPerRow) / FLOATS_PER_TEXEL;
            engine.updateTextureData(
                internal,
                from.subarray(start, start + rest * this.floatsPerRow),
                0,
                lines,
                texels,
                1,
            );
        }

        return rows * this.floatsPerRow * 4;
    }

    upload(whole: boolean): number {
        const lineFloats = ROW_TEXTURE_WIDTH * FLOATS_PER_TEXEL;
        const firstLine = whole ? 0 : Math.floor((this.first * this.floatsPerRow) / lineFloats);
        const endLine = whole
            ? this.floats.length / lineFloats
            : Math.floor(((this.last + 1) * this.floatsPerRow - 1) / lineFloats) + 1;
        const internal = this.texture.getInternalTexture();
        const dirty = whole || this.first <= this.last;
        this.first = Number.POSITIVE_INFINITY;
        this.last = -1;
        if (!dirty || internal === null) {
            return 0;
        }

        const bytes = this.floats.subarray(firstLine * lineFloats, endLine * lineFloats);
        // Both engines have it; AbstractEngine does not declare it.
        const engine = this.scene.getEngine() as AbstractEngine & Pick<ThinEngine, "updateTextureData">;
        engine.updateTextureData(internal, bytes, 0, firstLine, ROW_TEXTURE_WIDTH, endLine - firstLine);
        return bytes.byteLength;
    }
}

/**
 * Copy rows to their new places.
 * @param from - The rows.
 * @param to - Where they go, zeroed.
 * @param perRow - Values a row.
 * @param remap - Old row to new row or INVALID_INDEX, or null to keep every row where it is.
 */
function moveRows(
    from: Float32Array | Uint8Array,
    to: Float32Array | Uint8Array,
    perRow: number,
    remap: U32 | null,
): void {
    if (remap === null) {
        to.set(from);
        return;
    }

    const rows = Math.min(remap.length, from.length / perRow);
    for (let row = 0; row < rows; row++) {
        const moved = remap[row] ?? INVALID_INDEX;
        if (moved !== INVALID_INDEX) {
            for (let i = 0; i < perRow; i++) {
                to[moved * perRow + i] = from[row * perRow + i] ?? 0;
            }
        }
    }
}

/**
 * The row tables of one graph. `rowPosition` holds what is drawn, which is usually the lane row
 * (z = 0 in 2D) and is otherwise whatever the mesh funnel last said: every other drawn place (a
 * drag, a transition, a group's set-back) reaches a row through {@link RowTable.place}, which
 * keeps it out of the repack until the mesh and the lane agree again.
 */
export class RowTable {
    /** Rows in the tables: the lane's count at the last freeze. */
    rows = 0;
    /** Calls that sent a texture to the card. */
    uploads = 0;
    /** Bytes those calls sent. */
    uploadedBytes = 0;
    /**
     * Counts every write that can move a row: a repack from the lane, a placed row, a freeze or a
     * clear. Unchanged, no row is drawn anywhere new, so a walk of the drawn positions skips the rows.
     */
    moves = 0;
    /**
     * {@link moves} less the writes of {@link place}, which moves only the row of a node with a mesh: unchanged, no
     * row was moved but by its own `Node`, so a row with no `Node` is where it was.
     */
    unplacedMoves = 0;
    /** Calls that sent the `rowPosition` texture to the card. */
    positionUploads = 0;
    /** Landings sent to the `rowPosition` texture as the layout's readback brought them, with no row written. */
    landedUploads = 0;
    /** Landings copied into the `rowPosition` texture on the card, with no upload. */
    copies = 0;
    /**
     * Told of every row written other than by a repack from the lane, while a layout fills the
     * `rowPosition` texture on the card: it keeps the layout's copy of those rows the same.
     */
    drawnMirror: ((row: number, x: number, y: number, z: number, w: number) => void) | null = null;

    /**
     * Rows brought to a publish the lane owes one at a time, for the texture lines a frame sends while
     * the rest stay owed (`catchUpLines`): what a few rows drawn from the CPU cost per landing.
     */
    owedRowsCaughtUp = 0;
    /**
     * Rows told to a layout's ring ({@link RowTable.drawnMirror}): each is sent again over the landings
     * of the batches in flight when it was told, so a test of what a landing costs waits for them to stop.
     */
    rowsTold = 0;
    /** Rows {@link RowTable.flush} copied from the lane: CPU rows a frame touched. */
    repackedRows = 0;
    /**
     * Counts every write that can change which rows keep their own place ({@link RowTable.keepsOwnRow}):
     * unchanged, a layout skips the walk that finds them.
     */
    ownRowWrites = 0;

    /** x, y, z and bounding radius times w, so radius 0 means hidden. */
    private bounds: Float32Array<ArrayBuffer>;
    private readonly positions: RowTexture;
    private readonly extents: RowTexture;
    /** Every reach outline a row has named, one side a texel: rows of one shape share theirs. */
    private readonly outlines: RowTexture;
    /** Each outline's code in `rowExtent`, by its points. */
    private readonly outlineCodes = new Map<string, number>();
    /** The same, by the array a row handed in, so a row measured again joins no string. */
    private readonly outlineArrays = new WeakMap<object, number>();
    /** Sides written to {@link RowTable.outlines}. */
    private outlineSides = 0;
    private flags: Uint8Array<ArrayBuffer>;
    private laneChanges = -1;
    /** How many of the first {@link RowTable.rows} rows are hidden. */
    private hiddenCount = 0;
    /** The widest half extent {@link RowTable.measure} has written since the last clear. */
    private widest = 0;
    /**
     * The lane's `changes` when a landing was last copied to the card, or -1: a repack of exactly
     * that lane sends no row, and a lane written since (a settle copies the owed landing again just
     * before the write that asked for it) sends every row.
     */
    private copiedAt = -1;
    private twoD = false;
    private readonly laneRow = { x: 0, y: 0, z: 0 };
    private readonly stopFlush: () => void;

    /**
     * Start with no rows: {@link RowTable.replaced} brings them in.
     * @param scene - The scene whose frames upload the tables.
     * @param lane - The coordinate lane, asked each time: a cleared graph has a new one.
     */
    constructor(
        private readonly scene: Scene,
        private readonly lane: () => ElementPositions,
    ) {
        const { capacity } = lane();
        this.positions = new RowTexture(scene, POSITION_FLOATS, capacity);
        this.extents = new RowTexture(scene, EXTENT_FLOATS, capacity);
        this.outlines = new RowTexture(scene, OUTLINE_FLOATS, 1);
        this.bounds = new Float32Array(this.positions.floats.length);
        this.flags = new Uint8Array(this.positions.floats.length / POSITION_FLOATS);
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
    }

    /**
     * How many rows are filtered out, hidden by a style or dropped, kept as rows change rather than counted.
     * @returns The count.
     */
    get hiddenRows(): number {
        return this.hiddenCount;
    }

    /**
     * At least the widest half extent of any row, on any axis: what a box around the rows' centers
     * grows by to hold the rows. It never shrinks until the dataset is cleared, so it may be wider.
     * @returns The half extent.
     */
    get widestHalf(): number {
        return this.widest;
    }

    /**
     * {@link RowTable.moves} once the CPU copy is up to what the layout last published.
     * @returns The count.
     */
    settledMoves(): number {
        this.catchUp();
        return this.moves;
    }

    /**
     * The CPU copy of `rowPosition`: x, y, z and w, a multiplier on the row's size.
     * @returns The array.
     */
    get rowPosition(): Float32Array<ArrayBuffer> {
        this.catchUp();
        return this.positions.floats;
    }

    /**
     * The `rowBounds` table: x, y, z and bounding radius times w, so radius 0 means hidden.
     * @returns The array.
     */
    get rowBounds(): Float32Array<ArrayBuffer> {
        this.catchUp();
        return this.bounds;
    }

    /**
     * The CPU copy of `rowExtent`.
     * @returns The array.
     */
    get rowExtent(): Float32Array<ArrayBuffer> {
        return this.extents.floats;
    }

    /**
     * The `rowPosition` texture, replaced when it grows.
     * @returns The texture.
     */
    get positionTexture(): RawTexture {
        return this.positions.texture;
    }

    /**
     * The `rowExtent` texture, replaced when it grows.
     * @returns The texture.
     */
    get extentTexture(): RawTexture {
        return this.extents.texture;
    }

    /**
     * The `rowOutline` texture: the reach outlines `rowExtent` names, replaced when it grows.
     * @returns The texture.
     */
    get outlineTexture(): RawTexture {
        return this.outlines.texture;
    }

    /**
     * Whether a row is held where {@link RowTable.place} put it, off its lane: its node's own
     * position is then the exact one, which this table keeps only to 32 bits.
     * @param row - The row.
     * @returns True when it is held.
     */
    isHeld(row: number): boolean {
        return ((this.flags[row] ?? 0) & HELD) !== 0;
    }

    /**
     * Whether a row is filtered out or hidden by a style ({@link RowTable.hide}).
     * @param row - The row.
     * @returns True when it is hidden.
     */
    isHidden(row: number): boolean {
        return ((this.flags[row] ?? 0) & HIDDEN) !== 0;
    }

    /**
     * Whether a row is drawn from its own writes rather than repacked from the lane: held or shrunk.
     * @param row - The row.
     * @returns True when the repack leaves it alone.
     */
    keepsOwnRow(row: number): boolean {
        return ((this.flags[row] ?? 0) & (HELD | SHRUNK)) !== 0;
    }

    /**
     * Fill the first `rows` rows of the `rowPosition` texture from a layout's drawn buffer on the
     * card (design/rendering/row-renderer.md 4.5): one copy, no upload. The CPU copy follows at
     * the next repack, which then sends none of its rows.
     * @param handle - The device the texture and the buffer live on.
     * @param landed - Four floats per row, x, y, z and w, as `rowPosition` holds them.
     * @param rows - Rows to copy.
     * @returns False when the texture is not on the card yet, so nothing was copied.
     */
    copyLanded(handle: GpuDeviceHandle, landed: GpuBufferHandle, rows: number): boolean {
        const device = handle as GPUDevice;
        const buffer = landed as GPUBuffer;
        const texture = this.positions.texture.getInternalTexture()?._hardwareTexture?.underlyingResource as
            GPUTexture | undefined;
        if (texture === undefined || rows <= 0) {
            return false;
        }

        const bytesPerRow = ROW_TEXTURE_WIDTH * FLOATS_PER_TEXEL * 4;
        const lines = Math.floor(rows / ROW_TEXTURE_WIDTH);
        const rest = rows % ROW_TEXTURE_WIDTH;
        const encoder = device.createCommandEncoder({ label: "rowPosition/landed" });
        if (lines > 0) {
            encoder.copyBufferToTexture(
                { buffer, bytesPerRow },
                { texture },
                {
                    width: ROW_TEXTURE_WIDTH,
                    height: lines,
                },
            );
        }

        if (rest > 0) {
            encoder.copyBufferToTexture(
                { buffer, offset: lines * bytesPerRow, bytesPerRow },
                { texture, origin: { x: 0, y: lines } },
                { width: rest, height: 1 },
            );
        }

        device.queue.submit([encoder.finish()]);
        this.positions.clean();
        this.copiedAt = this.lane().changes;
        // The rows are drawn somewhere new, whether or not the lane follows them this frame.
        this.moves++;
        this.unplacedMoves++;
        this.copies++;
        return true;
    }

    /**
     * Fill the first `rows` rows of the `rowPosition` texture from a layout's drawn rows read back from its own
     * device (design/rendering/row-renderer.md 4.5): the bytes go up as they came, with no row written on the
     * CPU. The CPU copy follows at the next repack, which then sends none of its rows, as after a copy.
     * @param from - Four floats per row, x, y, z and w, as `rowPosition` holds them.
     * @param rows - Rows to send.
     * @returns False when the texture is not on the card yet, so nothing was sent.
     */
    uploadLanded(from: Float32Array, rows: number): boolean {
        const bytes = this.positions.uploadFrom(from, Math.min(rows, from.length / POSITION_FLOATS));
        if (bytes === 0) {
            return false;
        }

        this.positions.clean();
        this.copiedAt = this.lane().changes;
        this.moves++;
        this.unplacedMoves++;
        this.landedUploads++;
        this.uploads++;
        this.uploadedBytes += bytes;
        return true;
    }

    /**
     * Send a row's CPU copy at the next flush, over the landing just copied: the layout's ring held
     * something else for the row when that batch landed.
     * @param row - The row.
     */
    resend(row: number): void {
        if (row < this.rows) {
            this.positions.touch(row);
        }
    }

    /**
     * A layout published by upload after a landing was copied and before the repack: the copy no
     * longer holds the lane, so the next repack sends every row it writes. Without this a settling
     * batch that landed in the same frame as the last copy never went up, and the texture rested
     * on the copied landing while the CPU copy held the settled rows.
     */
    dropCopy(): void {
        this.copiedAt = -1;
    }

    /**
     * Where a row is drawn.
     * @param row - The row.
     * @returns A new vector.
     */
    centerOf(row: number): Vector3 {
        // A pinned row is one an owed publish leaves where it is, and a held or shrunk row one the repack
        // leaves, so a frame that reads it writes no row. Any other row is read as the owed publish
        // writes it, one row and not every row: a label or an arrowhead is drawn from the CPU each frame.
        const lane = this.lane();
        if (((this.flags[row] ?? 0) & (HELD | SHRUNK)) === 0 && row < this.rows && !lane.keeps(row)) {
            const at = this.laneRow;
            if (lane.readOwed(row, at)) {
                // as `repackRow` copies it: an unplaced row at the origin, and flat in 2D
                const placed = Number.isFinite(at.x);
                return new Vector3(placed ? at.x : 0, placed ? at.y : 0, placed && !this.twoD ? at.z : 0);
            }

            this.catchUp();
        }

        const { floats } = this.positions;
        const base = row * POSITION_FLOATS;
        return new Vector3(floats[base], floats[base + 1], floats[base + 2]);
    }

    /**
     * What {@link RowTable.measure} wrote of a row, at the size the row is drawn now.
     * @param row - The row.
     * @returns Its scale, its radius when it is round, and its half extents.
     */
    extentOf(row: number): RowExtent {
        const { floats } = this.extents;
        const base = row * EXTENT_FLOATS;
        const flags = this.flags[row] ?? 0;
        // a shrunk row keeps its whole size here, and how much of it is drawn in w, which hiding zeroes
        const part =
            (flags & SHRUNK) !== 0 && (flags & HIDDEN) === 0 ? this.positions.floats[row * POSITION_FLOATS + 3] : 1;
        const of = (i: number): number => (floats[base + i] ?? 0) * (part ?? 1);
        return {
            scale: of(0),
            round: ((floats[base + 3] ?? 0) & ROW_EXTENT_ROUND) === 0 ? null : of(1),
            half: { x: of(4), y: of(5), z: of(6) },
            border: ((floats[base + 3] ?? 0) & ROW_EXTENT_SCREEN_BORDER) === 0 ? of(2) : 0,
        };
    }

    /**
     * {@link RowTable.extentOf} in the doubles a row's own measure gives, where the table holds them rounded: a row
     * drawn with no `Node` trims its edges from these, as a `Node` does from its own (#6287).
     * @param row - The row and its measure.
     * @returns Its extent.
     */
    exactExtentOf(row: RowMeasure): RowExtent {
        const stored = this.extentOf(row.index);
        const { round, half } = stored;
        const measured = row.drawnHalfExtents;
        return {
            ...stored,
            round: round === null ? null : exactOf(round, row.roundRadius),
            half: { x: exactOf(half.x, measured.x), y: exactOf(half.y, measured.y), z: exactOf(half.z, measured.z) },
        };
    }

    /**
     * Where the coordinate lane puts a row, as the repack draws it: flat in 2D.
     * @param row - The row.
     * @param out - Written with the place.
     * @param out.x - X.
     * @param out.y - Y.
     * @param out.z - Z.
     * @returns False when the lane places the row nowhere.
     */
    laneOf(row: number, out: { x: number; y: number; z: number }): boolean {
        this.lane().read(row, out);
        if (this.twoD) {
            out.z = 0;
        }

        return Number.isFinite(out.x);
    }

    /**
     * Say a node's mesh was put at a point: the mesh funnel's write.
     * @param row - The node's row.
     * @param x - Drawn x.
     * @param y - Drawn y.
     * @param z - Drawn z.
     */
    place(row: number, x: number, y: number, z: number): void {
        if (row >= this.rows) {
            return;
        }

        const lane = this.laneRow;
        const laneRows = this.lane();
        // A row the owed landing writes is one the card already draws there (the layout copied it in)
        const onCard = laneRows.owedWrites(row, lane);
        if (!onCard) {
            laneRows.read(row, lane);
        }

        const atLane =
            Math.fround(x) === lane.x && Math.fround(y) === lane.y && Math.fround(z) === (this.twoD ? 0 : lane.z);
        const flags = this.flags[row] ?? 0;
        const next = atLane ? flags & ~HELD : flags | HELD;
        this.flags[row] = next;
        // A node that follows its lane row each frame (a labeled one) changes nothing a skip walk reads.
        this.ownRowWrites += next === flags ? 0 : 1;
        const base = row * POSITION_FLOATS;
        const { floats } = this.positions;
        const unchanged = this.countPlace(base, flags, next, atLane, x, y, z);
        const { bounds } = this;
        floats[base] = bounds[base] = x;
        floats[base + 1] = bounds[base + 1] = y;
        floats[base + 2] = bounds[base + 2] = z;
        // ...so a node put exactly where the card already draws it sends nothing: either where the owed landing
        // puts it (the layout copied it in), or where it already was and was sent (a row the landing leaves, as a
        // pinned one). A labeled node costs its own row each frame, and no texture line goes up to be caught up.
        // Hidden counts as long as it was hidden before (its w is 0 on the card); held and shrunk rows are drawn
        // from their own writes. A measured row counts: KNOWN says nothing about where the row is drawn.
        if (
            atLane &&
            (onCard ? Math.fround(z) === lane.z : unchanged) &&
            (flags & (HELD | SHRUNK)) === 0 &&
            floats[base + 3] === ((flags & HIDDEN) === 0 ? 1 : 0)
        ) {
            return;
        }

        if ((flags & (HIDDEN | SHRUNK)) === 0) {
            this.writeW(row, 1);
        } else {
            this.positions.touch(row);
            this.mirror(row);
        }
    }

    /**
     * Count what a {@link RowTable.place} write changes, before it is written.
     * @param base - The row's first float.
     * @param flags - The row's flags before the write.
     * @param next - Its flags after it.
     * @param atLane - Whether the write puts it where its lane row is.
     * @param x - Drawn x.
     * @param y - Drawn y.
     * @param z - Drawn z.
     * @returns Whether the row stays where it stood.
     */
    private countPlace(
        base: number,
        flags: number,
        next: number,
        atLane: boolean,
        x: number,
        y: number,
        z: number,
    ): boolean {
        const { floats } = this.positions;
        // The row as it stood: one put again where it already was (a pinned labeled node, each frame) is unchanged.
        const unchanged =
            floats[base] === Math.fround(x) &&
            floats[base + 1] === Math.fround(y) &&
            floats[base + 2] === Math.fround(z);
        // A write that leaves the row where it is drawn moves nothing: a node built lazily for its row (a
        // selection, a hover) places it again where it already is, and must not tell the edge ID target, the
        // nodes that follow the rows or the update loop that rows moved. Drawn where the lane says unless held,
        // and where the floats say when held.
        const unmoved =
            next === flags && (atLane || unchanged) && ((flags & (HIDDEN | SHRUNK)) !== 0 || floats[base + 3] === 1);
        if (!unmoved) {
            this.moves++;
        }

        return unchanged;
    }

    /**
     * Say how much of its size a row is drawn at while a particle transition carries it.
     * @param row - The row.
     * @param w - Between 0 and 1; 1 when it is whole again.
     */
    shrink(row: number, w: number): void {
        if (row >= this.rows) {
            return;
        }

        const flags = this.flags[row] ?? 0;
        this.ownRowWrites++;
        this.flags[row] = w === 1 ? flags & ~SHRUNK : flags | SHRUNK;
        if ((flags & HIDDEN) === 0) {
            this.writeW(row, w);
        }
    }

    /**
     * Say whether a row is drawn at all.
     * @param row - The row.
     * @param hidden - True when it is filtered out or hidden by a style.
     */
    hide(row: number, hidden: boolean): void {
        if (row >= this.rows) {
            return;
        }

        const flags = this.flags[row] ?? 0;
        if (((flags & HIDDEN) !== 0) !== hidden) {
            this.hiddenCount += hidden ? 1 : -1;
        }

        this.flags[row] = hidden ? flags | HIDDEN : flags & ~HIDDEN;
        if (!hidden && (flags & (HIDDEN | SHRUNK)) === SHRUNK) {
            // Still drawn, part of the way through a shrink: its W is the shrink's.
            return;
        }

        this.writeW(row, !hidden && ((flags & HELD) !== 0 || this.lane().isPlaced(row)) ? 1 : 0);
    }

    /**
     * Forget a row's node: it stays hidden until the next freeze hands the row to another.
     * @param row - The row.
     */
    drop(row: number): void {
        if (row < this.rows) {
            this.hiddenCount += ((this.flags[row] ?? 0) & HIDDEN) === 0 ? 1 : 0;
            this.ownRowWrites++;
            this.flags[row] = HIDDEN;
            this.writeW(row, 0);
        }
    }

    /**
     * Write a row's `rowExtent` row and its bounding radius. Paint calls it, never a move.
     * @param node - The node, or the row drawn with no `Node` (`ColumnRow`).
     */
    measure(node: RowMeasure): void {
        const row = node.index;
        const flags = this.flags[row] ?? SHRUNK;
        if (row >= this.rows || (flags & SHRUNK) !== 0) {
            return;
        }

        const half = node.drawnHalfExtents;
        this.widest = Math.max(this.widest, half.x, half.y, half.z);
        const outline = node.outlineHalfExtents;
        const round = node.roundRadius;
        const base = row * EXTENT_FLOATS;
        const extentFlags =
            (round === null ? 0 : ROW_EXTENT_ROUND) |
            (node.shapeType === "ellipse" ? ROW_EXTENT_ELLIPSE : 0) |
            (node.paintedOpacity < 1 ? ROW_EXTENT_SEEN_THROUGH : 0) |
            (node.screenBorder === true ? ROW_EXTENT_SCREEN_BORDER : 0);
        this.extents.floats.set(
            [
                node.drawnScale,
                round ?? 0,
                node.borderReach,
                extentFlags,
                half.x,
                half.y,
                half.z,
                node.drawnBoundingRadius,
                outline.x,
                outline.y,
                outline.z,
                (extentFlags & ROW_EXTENT_SEEN_THROUGH) === 0 ? 0 : this.outlineCode(node.reachOutline),
            ],
            base,
        );
        this.flags[row] = flags | KNOWN;
        this.extents.touch(row);
        this.writeW(row, this.positions.floats[row * POSITION_FLOATS + 3] ?? 0);
    }

    /**
     * A reach outline's code in `rowExtent`: its first side in `rowOutline` times 1024 plus its count of sides, written
     * there the first time a row names it.
     * ponytail: outlines are kept for the table's life, and past {@link OUTLINE_TABLE_SIDES} sides a new one ends its
     * line at the row's box; a table that forgets unused outlines can come when shapes churn that much.
     * @param outline - The outline, or null.
     * @returns The code, 0 for none.
     */
    private outlineCode(outline: RowMeasure["reachOutline"]): number {
        if (outline === null || outline.length < 3 || outline.length > OUTLINE_MOST_SIDES) {
            return 0;
        }

        const known = this.outlineArrays.get(outline) ?? this.outlineCodes.get(outline.join());
        if (known !== undefined) {
            this.outlineArrays.set(outline, known);
            return known;
        }

        const start = this.outlineSides;
        if (start + outline.length > OUTLINE_TABLE_SIDES) {
            return 0;
        }

        this.outlines.follow(null, start + outline.length);
        const { floats } = this.outlines;
        outline.forEach(([x, y], i) => {
            const [nx, ny] = outline[(i + 1) % outline.length];
            floats.set([x, y, nx, ny], (start + i) * OUTLINE_FLOATS);
        });
        this.outlines.touch(start, start + outline.length - 1);
        this.outlineSides += outline.length;
        const code = start * 1024 + outline.length;
        this.outlineCodes.set(outline.join(), code);
        this.outlineArrays.set(outline, code);
        return code;
    }

    /**
     * Follow a freeze: rows renumbered, the lane grown or truncated, new nodes on new rows.
     * @param remap - The freeze report's nodeRemap, or null when no row moved.
     * @param nodes - The graph's nodes.
     */
    replaced(remap: U32 | null, nodes: Iterable<Node>): void {
        const lane = this.lane();
        this.moves++;
        this.unplacedMoves++;
        this.ownRowWrites++;
        this.positions.follow(remap, lane.capacity);
        this.extents.follow(remap, lane.capacity);
        const { length } = this.positions.floats;
        if (remap !== null || length > this.bounds.length) {
            const bounds = new Float32Array(length);
            moveRows(this.bounds, bounds, POSITION_FLOATS, remap);
            this.bounds = bounds;
            const flags = new Uint8Array(length / POSITION_FLOATS);
            moveRows(this.flags, flags, 1, remap);
            this.flags = flags;
        }

        this.rows = lane.count;
        this.laneChanges = -1;
        for (const node of nodes) {
            const row = node.index;
            if (row < this.rows && ((this.flags[row] ?? 0) & KNOWN) === 0) {
                this.flags[row] = 0;
                this.measure(node);
                this.hide(row, node.getRenderState() !== "visible");
                if (lane.isPlaced(row)) {
                    const { x, y, z } = node.drawnPosition;
                    this.place(row, x, y, z);
                }
            }
        }

        this.hiddenCount = 0;
        for (let row = 0; row < this.rows; row++) {
            this.hiddenCount += ((this.flags[row] ?? 0) & HIDDEN) === 0 ? 0 : 1;
        }
    }

    /** Forget every row: the dataset was cleared. */
    cleared(): void {
        this.moves++;
        this.unplacedMoves++;
        this.ownRowWrites++;
        this.flags.fill(0);
        this.hiddenCount = 0;
        this.widest = 0;
        this.rows = 0;
        this.laneChanges = -1;
    }

    /** Bring the tables up to the lane and send what changed. Runs before every frame. */
    flush(): void {
        const lane = this.lane();
        // Rows go up in whole texture lines from the CPU copy, so a publish the lane owes is written
        // first, or the line would carry the rest of its rows back to an older landing.
        if (this.positions.dirty && !this.catchUpLines(lane)) {
            lane.settle();
        }

        const twoD = (this.scene.metadata as GraphSceneMetadata | null)?.twoD === true;
        if (lane.changes !== this.laneChanges || twoD !== this.twoD) {
            this.twoD = twoD;
            this.laneChanges = lane.changes;
            this.moves++;
            // a lane change that left every repacked row where it was (a drag's own row, written by place) moves none
            if (this.repack(lane.view(Math.min(this.rows, lane.count)), this.copiedAt !== lane.changes)) {
                this.unplacedMoves++;
            }

            this.copiedAt = -1;
        }

        // Babylon gives a texture back as it was made after a lost context, so every row goes
        // up again; the same rule as the batches on this roster.
        const whole = batchUploadFrames.isRestoring(this.scene);
        for (const table of [this.positions, this.extents, this.outlines]) {
            const bytes = table.upload(whole);
            if (bytes > 0) {
                this.uploads++;
                this.uploadedBytes += bytes;
                this.positionUploads += table === this.positions ? 1 : 0;
            }
        }
    }

    /**
     * Bring only the texture lines about to go up to a publish the lane owes, one row at a time, so a
     * few touched rows (a labeled node, an arrowed edge's ends) cost their lines and not every row.
     * @param lane - The lane.
     * @returns False when the lane owes a publish it cannot read by row: settle it.
     */
    private catchUpLines(lane: ElementPositions): boolean {
        if (!lane.owesRows) {
            return false;
        }

        const [first, end] = this.positions.dirtyRows();
        const last = Math.min(end, this.rows, lane.count);
        const at = this.laneRow;
        let moved = false;
        for (let row = first; row < last; row++) {
            if (((this.flags[row] ?? 0) & (HELD | SHRUNK)) !== 0) {
                continue;
            }

            if (!lane.readOwed(row, at)) {
                // the publish cannot be read by row now: the caller writes it, and the repack copies every row
                return false;
            }

            moved = this.repackRowAt(row, at.x, at.y, at.z) || moved;
        }

        // the repack after it finds these rows already where the lane put them, so they count here
        if (moved) {
            this.unplacedMoves++;
        }

        this.owedRowsCaughtUp += Math.max(0, last - first);
        return true;
    }

    /**
     * Say this many rows are about to be read one at a time (each built node's, both ends of every placed edge): when a landing
     * the lane owes would be written partway through them anyway, it is written now, before the first, so no
     * row is answered one at a time only to be written with the rest.
     * @param rows - Rows about to be read.
     */
    willRead(rows: number): void {
        if (this.lane().owedReadsSpill(rows)) {
            this.catchUp();
        }
    }

    /** Bring the CPU copy up to a publish the lane owes (`ElementPositions.owe`) before it is read. */
    private catchUp(): void {
        if (this.lane().settle()) {
            this.flush();
        }
    }

    /** Stop following the frames and free the textures. */
    dispose(): void {
        this.stopFlush();
        this.positions.texture.dispose();
        this.extents.texture.dispose();
        this.outlines.texture.dispose();
    }

    /**
     * One typed pass from the lane over every row nothing else holds.
     * @param lane - The lane's live rows.
     * @param send - False when a landing already put these rows on the card.
     * @returns True when a row was drawn somewhere new.
     */
    private repack(lane: Float32Array, send: boolean): boolean {
        const { flags } = this;
        const rows = lane.length / 3;
        this.repackedRows += rows;
        let moved = false;
        for (let row = 0; row < rows; row++) {
            if (((flags[row] ?? 0) & (HELD | SHRUNK)) === 0) {
                moved = this.repackRow(row, lane) || moved;
            }
        }

        if (rows > 0 && send) {
            this.positions.touch(0, rows - 1);
        }

        return moved;
    }

    /**
     * Copy one row from the lane: flat in 2D, and collapsed when it is unplaced or hidden.
     * @param row - The row.
     * @param lane - The lane's live rows.
     * @returns True when the row is drawn somewhere new.
     */
    private repackRow(row: number, lane: Float32Array): boolean {
        const from = row * 3;
        return this.repackRowAt(row, lane[from] ?? Number.NaN, lane[from + 1] ?? 0, lane[from + 2] ?? 0);
    }

    /**
     * {@link RowTable.repackRow} from one row's coordinates.
     * @param row - The row.
     * @param x - Its x, NaN when unplaced.
     * @param y - Its y.
     * @param z - Its z.
     * @returns True when the row is drawn somewhere new.
     */
    private repackRowAt(row: number, x: number, y: number, z: number): boolean {
        const to = row * POSITION_FLOATS;
        const { floats } = this.positions;
        const { bounds } = this;
        const placed = Number.isFinite(x);
        const w = placed && ((this.flags[row] ?? 0) & HIDDEN) === 0 ? 1 : 0;
        const nx = placed ? x : 0;
        const ny = placed ? y : 0;
        const nz = placed && !this.twoD ? z : 0;
        const shownBefore = floats[to + 3];
        const moved = floats[to] !== nx || floats[to + 1] !== ny || floats[to + 2] !== nz || shownBefore !== w;
        floats[to] = bounds[to] = nx;
        floats[to + 1] = bounds[to + 1] = ny;
        floats[to + 2] = bounds[to + 2] = nz;
        floats[to + 3] = w;
        bounds[to + 3] = (this.extents.floats[row * EXTENT_FLOATS + EXTENT_BOUNDING_RADIUS] ?? 0) * w;
        // The layout's ring keeps the w it was given, so a row the lane first places (or unplaces)
        // tells it, and goes up once, since the landing already copied holds the old w.
        if (w !== shownBefore && this.drawnMirror !== null) {
            this.positions.touch(row);
            this.mirror(row);
        }

        return moved;
    }

    private writeW(row: number, w: number): void {
        const base = row * POSITION_FLOATS;
        this.positions.floats[base + 3] = w;
        this.bounds[base + 3] = (this.extents.floats[row * EXTENT_FLOATS + EXTENT_BOUNDING_RADIUS] ?? 0) * w;
        this.positions.touch(row);
        this.mirror(row);
    }

    private mirror(row: number): void {
        const tell = this.drawnMirror;
        if (tell !== null) {
            this.rowsTold++;
            const base = row * POSITION_FLOATS;
            const { floats } = this.positions;
            tell(row, floats[base] ?? 0, floats[base + 1] ?? 0, floats[base + 2] ?? 0, floats[base + 3] ?? 0);
        }
    }
}
