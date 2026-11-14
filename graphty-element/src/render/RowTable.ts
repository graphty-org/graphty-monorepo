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
import { batchUploadFrames } from "../meshes/FrameRoster";
import type { Node } from "../Node";

/** Texels across both textures: a shader reads texel `i` at `(i % 1024, i / 1024)`. */
const ROW_TEXTURE_WIDTH = 1024;

const FLOATS_PER_TEXEL = 4;
/** `rowPosition` and `rowBounds`: x, y, z and w; x, y, z and radius times w. */
const POSITION_FLOATS = 4;
/**
 * `rowExtent`, three texels a row: scale, round radius, border reach, flags; half extents and
 * bounding radius; outline half extents and one spare float.
 */
const EXTENT_FLOATS = 12;
const EXTENT_BOUNDING_RADIUS = 7;

/** The `rowExtent` flag of a row whose surface is the same distance from its center every way. */
const ROW_EXTENT_ROUND = 1;

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
    readonly drawnHalfExtents: Readonly<{ x: number; y: number; z: number }>;
    readonly drawnBoundingRadius: number;
    readonly outlineHalfExtents: Readonly<{ x: number; y: number; z: number }>;
}

/** What {@link RowTable.extentOf} reads. */
/** Where a layout on the drawing device fills `rowPosition` (design/rendering/row-renderer.md 4.5). */
export interface DrawnTarget {
    readonly table: RowTable;
    readonly device: GPUDevice;
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
    /** The `rowBounds` table: x, y, z and bounding radius times w, so radius 0 means hidden. */
    rowBounds: Float32Array<ArrayBuffer>;
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
    /** Calls that sent the `rowPosition` texture to the card. */
    positionUploads = 0;
    /** Landings copied into the `rowPosition` texture on the card, with no upload. */
    copies = 0;
    /**
     * Told of every row written other than by a repack from the lane, while a layout fills the
     * `rowPosition` texture on the card: it keeps the layout's copy of those rows the same.
     */
    drawnMirror: ((row: number, x: number, y: number, z: number, w: number) => void) | null = null;

    private readonly positions: RowTexture;
    private readonly extents: RowTexture;
    private flags: Uint8Array<ArrayBuffer>;
    private laneChanges = -1;
    /** How many of the first {@link RowTable.rows} rows are hidden. */
    private hiddenCount = 0;
    /** The widest half extent {@link RowTable.measure} has written since the last clear. */
    private widest = 0;
    /** A landing was copied to the card since the last repack, which then sends no row of it. */
    private copied = false;
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
        this.rowBounds = new Float32Array(this.positions.floats.length);
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
     * At least the widest half extent of any row, on any axis: what a box around the rows' centres
     * grows by to hold the rows. It never shrinks until the dataset is cleared, so it may be wider.
     * @returns The half extent.
     */
    get widestHalf(): number {
        return this.widest;
    }

    /**
     * The CPU copy of `rowPosition`: x, y, z and w, a multiplier on the row's size.
     * @returns The array.
     */
    get rowPosition(): Float32Array<ArrayBuffer> {
        return this.positions.floats;
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
     * @param device - The device the texture and the buffer live on.
     * @param buffer - Four floats per row, x, y, z and w, as `rowPosition` holds them.
     * @param rows - Rows to copy.
     * @returns False when the texture is not on the card yet, so nothing was copied.
     */
    copyLanded(device: GPUDevice, buffer: GPUBuffer, rows: number): boolean {
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
        this.copied = true;
        this.copies++;
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
        this.copied = false;
    }

    /**
     * Where a row is drawn.
     * @param row - The row.
     * @returns A new vector.
     */
    centerOf(row: number): Vector3 {
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
        this.lane().read(row, lane);
        const atLane =
            Math.fround(x) === lane.x && Math.fround(y) === lane.y && Math.fround(z) === (this.twoD ? 0 : lane.z);
        const flags = this.flags[row] ?? 0;
        this.flags[row] = atLane ? flags & ~HELD : flags | HELD;
        this.moves++;
        const base = row * POSITION_FLOATS;
        const { floats } = this.positions;
        const bounds = this.rowBounds;
        floats[base] = bounds[base] = x;
        floats[base + 1] = bounds[base + 1] = y;
        floats[base + 2] = bounds[base + 2] = z;
        if ((flags & (HIDDEN | SHRUNK)) === 0) {
            this.writeW(row, 1);
        } else {
            this.positions.touch(row);
            this.mirror(row);
        }
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
        this.extents.floats.set(
            [
                node.drawnScale,
                round ?? 0,
                node.borderReach,
                round === null ? 0 : ROW_EXTENT_ROUND,
                half.x,
                half.y,
                half.z,
                node.drawnBoundingRadius,
                outline.x,
                outline.y,
                outline.z,
                0,
            ],
            base,
        );
        this.flags[row] = flags | KNOWN;
        this.extents.touch(row);
        this.writeW(row, this.positions.floats[row * POSITION_FLOATS + 3] ?? 0);
    }

    /**
     * Follow a freeze: rows renumbered, the lane grown or truncated, new nodes on new rows.
     * @param remap - The freeze report's nodeRemap, or null when no row moved.
     * @param nodes - The graph's nodes.
     */
    replaced(remap: U32 | null, nodes: Iterable<Node>): void {
        const lane = this.lane();
        this.moves++;
        this.positions.follow(remap, lane.capacity);
        this.extents.follow(remap, lane.capacity);
        const { length } = this.positions.floats;
        if (remap !== null || length > this.rowBounds.length) {
            const bounds = new Float32Array(length);
            moveRows(this.rowBounds, bounds, POSITION_FLOATS, remap);
            this.rowBounds = bounds;
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
        this.flags.fill(0);
        this.hiddenCount = 0;
        this.widest = 0;
        this.rows = 0;
        this.laneChanges = -1;
    }

    /** Bring the tables up to the lane and send what changed. Runs before every frame. */
    flush(): void {
        const lane = this.lane();
        const twoD = this.scene.metadata?.twoD === true;
        if (lane.changes !== this.laneChanges || twoD !== this.twoD) {
            this.twoD = twoD;
            this.laneChanges = lane.changes;
            this.moves++;
            this.repack(lane.view(Math.min(this.rows, lane.count)), !this.copied);
            this.copied = false;
        }

        // Babylon gives a texture back as it was made after a lost context, so every row goes
        // up again; the same rule as the batches on this roster.
        const whole = batchUploadFrames.isRestoring(this.scene);
        for (const table of [this.positions, this.extents]) {
            const bytes = table.upload(whole);
            if (bytes > 0) {
                this.uploads++;
                this.uploadedBytes += bytes;
                this.positionUploads += table === this.positions ? 1 : 0;
            }
        }
    }

    /** Stop following the frames and free the textures. */
    dispose(): void {
        this.stopFlush();
        this.positions.texture.dispose();
        this.extents.texture.dispose();
    }

    /**
     * One typed pass from the lane over every row nothing else holds.
     * @param lane - The lane's live rows.
     * @param send - False when a landing already put these rows on the card.
     */
    private repack(lane: Float32Array, send: boolean): void {
        const { flags } = this;
        const rows = lane.length / 3;
        for (let row = 0; row < rows; row++) {
            if (((flags[row] ?? 0) & (HELD | SHRUNK)) === 0) {
                this.repackRow(row, lane);
            }
        }

        if (rows > 0 && send) {
            this.positions.touch(0, rows - 1);
        }
    }

    /**
     * Copy one row from the lane: flat in 2D, and collapsed when it is unplaced or hidden.
     * @param row - The row.
     * @param lane - The lane's live rows.
     */
    private repackRow(row: number, lane: Float32Array): void {
        const from = row * 3;
        const to = row * POSITION_FLOATS;
        const { floats } = this.positions;
        const bounds = this.rowBounds;
        const x = lane[from] ?? Number.NaN;
        const placed = Number.isFinite(x);
        const w = placed && ((this.flags[row] ?? 0) & HIDDEN) === 0 ? 1 : 0;
        floats[to] = bounds[to] = placed ? x : 0;
        floats[to + 1] = bounds[to + 1] = placed ? (lane[from + 1] ?? 0) : 0;
        floats[to + 2] = bounds[to + 2] = placed && !this.twoD ? (lane[from + 2] ?? 0) : 0;
        const shownBefore = floats[to + 3];
        floats[to + 3] = w;
        bounds[to + 3] = (this.extents.floats[row * EXTENT_FLOATS + EXTENT_BOUNDING_RADIUS] ?? 0) * w;
        // The layout's ring keeps the w it was given, so a row the lane first places (or unplaces)
        // tells it, and goes up once, since the landing already copied holds the old w.
        if (w !== shownBefore && this.drawnMirror !== null) {
            this.positions.touch(row);
            this.mirror(row);
        }
    }

    private writeW(row: number, w: number): void {
        const base = row * POSITION_FLOATS;
        this.positions.floats[base + 3] = w;
        this.rowBounds[base + 3] = (this.extents.floats[row * EXTENT_FLOATS + EXTENT_BOUNDING_RADIUS] ?? 0) * w;
        this.positions.touch(row);
        this.mirror(row);
    }

    private mirror(row: number): void {
        const tell = this.drawnMirror;
        if (tell !== null) {
            const base = row * POSITION_FLOATS;
            const { floats } = this.positions;
            tell(row, floats[base] ?? 0, floats[base + 1] ?? 0, floats[base + 2] ?? 0, floats[base + 3] ?? 0);
        }
    }
}
