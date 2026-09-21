import { type F32, INVALID_INDEX, remapArray, type U32 } from "@graphty/graph-format";

/** Floats per node: x, y, z, in SCENE units. */
export const POSITION_COMPONENTS = 3;

/** Rows the array holds before its first growth. */
export const DEFAULT_CAPACITY = 1024;

/**
 * Reject a row count that is not a non-negative integer.
 *
 * `fill()` and `subarray()` truncate a fractional argument and clamp a negative one, so without
 * this a `capacity` of 1.5 gives a FRACTIONAL capacity that survives every later
 * `Math.max(capacity * 2, n)`, and `Number.NaN` gives a zero-row array that defeats the
 * "at least one row" floor below.
 * @param value - the count to check
 * @param what - the parameter name, for the message
 * @returns the value, unchanged, when it is a non-negative integer
 */
function requireRowCount(value: number, what: string): number {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`ElementPositions: ${what} must be a non-negative integer, found ${String(value)}`);
    }

    return value;
}

/**
 * Whether a coordinate can be STORED, not merely whether it is finite as a double.
 *
 * The backing array is a Float32Array, so the guard has to be f32-shaped: 1e39 passes
 * `Number.isFinite` and is rounded to Infinity by the assignment, and `isPlaced()` then reports
 * that row PLACED -- exactly the row this class exists to refuse. `Math.fround` performs the same
 * rounding the store does, so one predicate covers NaN, an infinity, and any double that OVERFLOWS
 * f32. An f32 underflow to zero stays legal: the origin is a place, an infinity is not.
 * @param value - the coordinate to check
 * @returns true when the value is finite after the round to f32
 */
export function isStorableCoordinate(value: number): boolean {
    return Number.isFinite(Math.fround(value));
}

/**
 * The element-owned node position array (graph-format design 14.4 rule 4).
 *
 * The element -- not the snapshot -- owns node coordinates. After every freeze, GraphStore lends
 * `view(nodeCount)` to the new snapshot as its `role: "position"` column BY REFERENCE, so layout
 * engines, drag and (from E1) a GPU simulation all write into this one array and nothing a user
 * laid out is lost to a re-freeze.
 *
 * Two rules the format imposes and this class exists to keep:
 *
 * - The buffer must be a plain, NON-RESIZABLE ArrayBuffer. `columnFromTypedArray` refuses a view
 *   over a resizable ArrayBuffer or a SharedArrayBuffer with E_UNSUPPORTED (decision D-SAB,
 *   invariant I17). So growth here is allocate-and-copy; `ArrayBuffer.resize` is never called and
 *   `{ maxByteLength }` is never passed to the constructor.
 * - The attached view must be EXACTLY `3 * nodeCount` long or the attach throws E_COLUMN_LENGTH.
 *   That is what `view(n)` is for.
 *
 * "Unplaced" is NaN in the x component (14.4 rule 4; @graphty/layout's `seedPositions` seeds NaN
 * rows), and `isPlaced()` asks whether that x is STORABLE rather than merely whether it is not NaN,
 * so a stored infinity counts as unplaced too.
 *
 * That second half is NOT redundant with the write guards, and the invariant is NOT held "by
 * construction". `write()` and `fillUnplaced()` refuse any coordinate `isStorableCoordinate()`
 * rejects, but they are not the only writers: the whole point of the design is that `view()` is
 * lent to the snapshot as a `mutable: true` column, so a layout, a drag and (from E1) a GPU
 * readback write straight through the column and never reach those guards at all. An infinity that
 * arrives that way -- stored outright, or arrived at because the assignment rounded a perfectly
 * finite double like 1e39 into the f32 array -- would otherwise be reported PLACED, which in
 * Babylon makes the mesh vanish and poisons the scene bounding box and the camera framing with
 * nothing in the console. Reported unplaced, the row is handed back to the layout instead, which is
 * what an unseeded node gets anyway.
 *
 * Testing x alone is a deliberate LIMIT, not a proof: a NaN or an infinity written through the lent
 * column into y or z alone is not policed here, and only the element-side writers cover all three.
 * What testing x alone does buy: a NaN x from a force layout that divided by a zero distance is
 * treated as unplaced rather than as a coordinate, so an importer seed re-applies to it on the next
 * freeze.
 *
 * THE STALENESS CONTRACT. `grow()` past the capacity and `remap()` both REPLACE the array object,
 * so every `view()` handed out before that call is a view over a dead buffer: writes through it
 * are invisible to this class, and writes through this class are invisible to it. Nothing here
 * detects that, by design -- `GraphStore` re-attaches the column on EVERY freeze (PLAN DECISION 3)
 * and emits `snapshot-replaced`, which is what holders react to. A holder that keeps a raw `F32`
 * across a freeze is the bug; the test file pins both halves of this so a future in-place growth
 * cannot land silently.
 *
 * Every row accessor is bounded by the LIVE ROW COUNT, not by the allocated length. A typed array
 * answers `undefined` past its end and swallows a store past its end, so an unbounded `isPlaced`
 * would answer for a row that does not exist, an unbounded `read` would report it at the ORIGIN,
 * and an unbounded `write` would drop the coordinate with no error: the exact silent-coordinate
 * loss the NaN fill exists to prevent, one step off the end of the array.
 */
export class ElementPositions {
    /**
     * Floats per row, so a holder of an instance does not have to import POSITION_COMPONENTS to
     * index the array `view()` returns.
     */
    readonly components = POSITION_COMPONENTS;

    private array: F32;
    private rows = 0;

    /**
     * Allocate the backing array, every row unplaced.
     * @param capacity - rows to reserve before the first growth; a non-negative integer
     */
    constructor(capacity: number = DEFAULT_CAPACITY) {
        requireRowCount(capacity, "capacity");
        this.array = new Float32Array(POSITION_COMPONENTS * Math.max(1, capacity));
        // A Float32Array is ZERO-filled, and zero is a perfectly good coordinate: without this the
        // spare capacity reads back as "placed at the origin" the moment grow() reaches it.
        this.array.fill(Number.NaN);
    }

    /**
     * Rows the backing array can hold without reallocating.
     * @returns the current capacity in rows
     */
    get capacity(): number {
        return this.array.length / POSITION_COMPONENTS;
    }

    /**
     * Rows currently in use. Equals the last snapshot's nodeCount.
     * @returns the live row count
     */
    get count(): number {
        return this.rows;
    }

    /**
     * The exact view to hand to `snapshot.nodes.set("position", ...)`.
     *
     * Bounded by the LIVE ROW COUNT, like every other row accessor here. `subarray` CLAMPS rather
     * than throwing, so without a check a caller that forgot to `grow()` first would get a short
     * array: E_COLUMN_LENGTH from inside graph-format if it is attached, and a layout that silently
     * places only the first `count` nodes if it is not. Bounding by the CAPACITY instead would hand
     * out a writable window over the spare rows -- rows this class reports unplaced, whose NaN fill
     * every later `grow()` and `remap()` depends on, and whose contents the next growth erases.
     * @param nodeCount - the snapshot's node count
     * @returns a subarray of length `3 * nodeCount` over the same buffer
     * @throws RangeError when `nodeCount` is not a non-negative integer, or exceeds the live count
     */
    view(nodeCount: number): F32 {
        requireRowCount(nodeCount, "nodeCount");
        if (nodeCount > this.rows) {
            throw new RangeError(
                `ElementPositions: view(${nodeCount}) needs ${nodeCount} live rows but only ${this.rows} exist; call grow(${nodeCount}) first`,
            );
        }

        return this.array.subarray(0, POSITION_COMPONENTS * nodeCount);
    }

    /**
     * Prefix-stable growth: existing rows keep their coordinates, EVERY row at or above the new
     * count is unplaced -- including the spare capacity, which a later grow() will hand out.
     *
     * Past the capacity this REPLACES the array object; see the staleness contract on the class.
     * @param nodeCount - the new row count; may be smaller than the current one (append-only
     *     builders never shrink, but a caller that does gets a truncation, not a throw). `grow(0)`
     *     is how a dataset is discarded while the reserve is kept
     * @throws RangeError when `nodeCount` is not a non-negative integer
     */
    grow(nodeCount: number): void {
        requireRowCount(nodeCount, "nodeCount");
        if (nodeCount > this.capacity) {
            const capacity = Math.max(this.capacity * 2, nodeCount);
            const next = new Float32Array(POSITION_COMPONENTS * capacity);
            next.set(this.array);
            // From the live ROW COUNT, not from this.array.length: the old array's spare capacity
            // was copied forward by set(), and anything above `rows` is by definition unplaced.
            next.fill(Number.NaN, POSITION_COMPONENTS * this.rows);
            this.array = next;
        } else if (nodeCount > this.rows) {
            this.array.fill(Number.NaN, POSITION_COMPONENTS * this.rows, POSITION_COMPONENTS * nodeCount);
        } else if (nodeCount < this.rows) {
            // Truncation must CLEAR, not merely move the count down. Two ways the abandoned
            // coordinates come back otherwise: a later grow() hands those rows to DIFFERENT nodes
            // already "placed" at the old graph's coordinates, so fillUnplaced() refuses to seed
            // them; and remapArray() walks `min(remap.length, data.length / components)` rows --
            // the CAPACITY, not this count -- so a later remap() copies them into the live space.
            this.array.fill(Number.NaN, POSITION_COMPONENTS * nodeCount, POSITION_COMPONENTS * this.rows);
        }

        this.rows = nodeCount;
    }

    /**
     * Apply a freeze report's `nodeRemap` (previous index space -> new index or INVALID_INDEX).
     *
     * `remapArray` ALLOCATES, so this replaces the array object and collapses the capacity to
     * exactly `nodeCount` (PLAN DECISION 3: a removal is rare and never per frame, so paying one
     * reallocation on the next growth is cheaper than copying the remapped rows a second time into
     * a re-reserved array). Every holder of the old object is stale afterwards, which is why
     * GraphStore re-attaches the column on every freeze and emits `snapshot-replaced`.
     * @param nodeRemap - the report's nodeRemap
     * @param nodeCount - the new snapshot's node count
     * @throws RangeError when `nodeCount` is not a non-negative integer
     */
    remap(nodeRemap: U32, nodeCount: number): void {
        requireRowCount(nodeCount, "nodeCount");
        this.array = remapArray(this.array, nodeRemap, nodeCount, Number.NaN, POSITION_COMPONENTS);
        this.rows = nodeCount;
    }

    /**
     * Report whether a row carries real coordinates.
     *
     * A row outside the live count is UNPLACED, never placed: this predicate is used to decide
     * whether an importer seed may be written, and answering "placed" for a row that does not
     * exist is how a coordinate gets thrown away without an error. So is a row whose x is an
     * infinity, which only a writer that bypassed `write()` -- that is, one writing through the
     * column this array is lent to -- can produce; see the class comment.
     * @param index - node index
     * @returns true when the row is inside the live count AND carries a storable x
     */
    isPlaced(index: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index >= this.rows) {
            return false;
        }

        return this.hasStorableX(POSITION_COMPONENTS * index);
    }

    /**
     * Read one row into a caller-supplied object (14.4 rule 7: never return a shared vector).
     * @param index - node index
     * @param out - the object to fill
     * @param out.x - receives the scene-unit x
     * @param out.y - receives the scene-unit y
     * @param out.z - receives the scene-unit z
     * @throws RangeError when `index` is not an integer in `[0, count)`
     */
    read(index: number, out: { x: number; y: number; z: number }): void {
        const base = this.rowBase(index);
        // The fallbacks are unreachable past rowBase(), and NaN rather than 0 so that a future
        // change which makes them reachable reports "unplaced" instead of "at the origin".
        out.x = this.array[base] ?? Number.NaN;
        out.y = this.array[base + 1] ?? Number.NaN;
        out.z = this.array[base + 2] ?? Number.NaN;
    }

    /**
     * Write one row.
     *
     * This is the ONE choke point every layout, every drag and (from E1) every GPU readback goes
     * through, so it is where an unstorable coordinate is stopped. NaN is this class's unplaced
     * marker: letting one in through here would unplace a placed node from the inside, and an
     * infinity would be stored and then reported placed. The test is `isStorableCoordinate`, NOT
     * `Number.isFinite`, because the array is f32: a finite double of 1e39 passes `isFinite` and
     * lands as Infinity. A caller holding such a coordinate has a bug upstream and must drop the
     * update, not hand it on.
     * @param index - node index
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     * @throws RangeError when `index` is not an integer in `[0, count)`. A node added since the
     *     last freeze has no row yet: freeze first (which grows this array), then write
     * @throws RangeError when any component is NaN, an infinity, or a double that overflows f32
     */
    write(index: number, x: number, y: number, z: number): void {
        const base = this.rowBase(index);
        if (!isStorableCoordinate(x) || !isStorableCoordinate(y) || !isStorableCoordinate(z)) {
            throw new RangeError(
                `ElementPositions: row ${String(index)} was written the unstorable coordinate (${String(x)}, ${String(y)}, ${String(z)}); NaN is this class's UNPLACED marker, and an infinity -- including one an f32 overflow produces -- poisons the scene bounds`,
            );
        }

        this.array[base] = x;
        this.array[base + 1] = y;
        this.array[base + 2] = z;
    }

    /**
     * Write a row ONLY when it is unplaced. This is how importer-seeded coordinates reach a new
     * node without overwriting anything a layout or a drag already produced.
     *
     * `false` means exactly one thing -- the row was ALREADY PLACED, by the same test `isPlaced()`
     * applies. A row that does not exist yet throws instead of returning `false`, so a caller that
     * seeds before growing finds out rather than losing the coordinate.
     * @param index - node index
     * @param x - scene-unit x
     * @param y - scene-unit y
     * @param z - scene-unit z
     * @returns true when the row was written, false when it was already placed
     * @throws RangeError when `index` is not an integer in `[0, count)`
     * @throws RangeError when any component is NaN, an infinity, or a double that overflows f32,
     *     through `write()`
     */
    fillUnplaced(index: number, x: number, y: number, z: number): boolean {
        const base = this.rowBase(index);
        if (this.hasStorableX(base)) {
            return false;
        }

        this.write(index, x, y, z);
        return true;
    }

    /**
     * Whether the row at this offset carries a storable x, which is the one test "placed" means.
     * @param base - the array offset of the row's x component
     * @returns true when the stored x is neither NaN nor an infinity
     */
    private hasStorableX(base: number): boolean {
        return isStorableCoordinate(this.array[base] ?? Number.NaN);
    }

    /**
     * The array offset of a live row, rejecting anything else.
     * @param index - node index
     * @returns the offset of the row's x component
     */
    private rowBase(index: number): number {
        if (!Number.isInteger(index) || index < 0 || index >= this.rows) {
            throw new RangeError(
                index === INVALID_INDEX
                    ? "ElementPositions: INVALID_INDEX is the graph-format 'no node' sentinel, not a row"
                    : `ElementPositions: row ${String(index)} is outside the live range [0, ${this.rows})`,
            );
        }

        return POSITION_COMPONENTS * index;
    }
}
