/**
 * @file The membership primitive: one byte per element, addressed by the dense index a node or
 * an edge already carries.
 *
 * A set of elements is a MASK here, not a list of ids, and that choice is the whole reason
 * hiding 40,000 of 50,000 nodes is cheap: the write is 50,000 bytes whatever the answer, a
 * membership test is one array read, the bytes go to a worker without being rewritten, and the
 * cost is bounded at the element count however many elements are in the set. An id list has the
 * opposite shape -- it is unbounded in the size of the answer, it costs a hash lookup per test,
 * and it has to be rebuilt from scratch every time the set moves.
 *
 * Id arrays still exist, because a consumer that wants to iterate should not have to learn what
 * a dense index is. They are a LAZY MATERIALISATION of the mask ({@link ElementMask.ids}), and
 * they are IDENTITY-STABLE: the same frozen array object comes back until the contents actually
 * change, so `previous === next` is a valid staleness test and a read of an unchanged set costs
 * nothing. Handing back a fresh array each read would turn every consumer's equality check into
 * a lie and would drive re-renders that look exactly like a framework bug.
 *
 * This is the same shape as {@link ElementPositions} -- a typed array over dense indices, grown
 * by allocate-and-copy, remapped by the freeze report, bounded by a live row count rather than
 * by the allocated length -- and is meant to be read alongside it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { INVALID_INDEX, remapArray, type U8, type U32 } from "@graphty/graph-format";

/** Rows the mask holds before its first growth. */
export const DEFAULT_MASK_CAPACITY = 1024;

/** The byte a row carries while it is in the set. */
const MEMBER = 1;

/** The byte a row carries while it is out of the set. */
const ABSENT = 0;

/**
 * Reject a row count that is not a non-negative integer.
 *
 * `fill()` and `subarray()` truncate a fractional argument and clamp a negative one, so without
 * this a capacity of 1.5 gives a FRACTIONAL capacity that survives every later doubling, and
 * `Number.NaN` gives a zero-row array that defeats the "at least one row" floor.
 * @param value - The count to check.
 * @param what - The parameter name, for the message.
 * @throws A `RangeError` when the value is not a non-negative integer.
 */
function requireRowCount(value: number, what: string): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`ElementMask: ${what} must be a non-negative integer, found ${String(value)}`);
    }
}

/**
 * The bridge between the dense indices a mask stores and the ids a consumer holds.
 *
 * It is one snapshot's view of the identity space: a node id map, or the edge-endpoint pairs an
 * edge is addressed by. The mask asks for it through a function rather than holding one, because
 * a mask outlives the snapshot it was filled against -- {@link ElementMask.remap} exists for
 * exactly that -- and a stale bridge would answer with the previous graph's ids.
 */
export interface MaskIdSpace<TId> {
    /**
     * The index an id sits at.
     * @param id - The id to look up.
     * @returns The dense index, or `INVALID_INDEX` when this space holds no such element.
     */
    indexOf(id: TId): number;
    /**
     * The id at an index.
     * @param index - The dense index, which the caller has already bounded.
     * @returns The id.
     */
    idOf(index: number): TId;
}

/**
 * A set of nodes or a set of edges, held as one byte per element.
 *
 * Every row accessor is bounded by the LIVE ROW COUNT rather than by the allocated length, and
 * a row outside that count is NOT A MEMBER. A typed array answers `undefined` past its end and
 * swallows a store past its end, so an unbounded read would report membership for an element
 * that does not exist and an unbounded write would drop the change with no error -- which is
 * how a filter silently keeps hiding a node that was removed three imports ago.
 *
 * Reads are lenient and writes are strict, for the same reason `ElementPositions.isPlaced` is
 * lenient while `ElementPositions.write` throws: asking whether a row that does not exist is a
 * member has an honest answer, and putting a row that does not exist into the set does not.
 *
 * THE STALENESS CONTRACT, inherited from `ElementPositions`. {@link ElementMask.grow} past the
 * capacity and {@link ElementMask.remap} both REPLACE the backing array, so any raw bytes handed
 * out before that call describe the previous index space. {@link ElementMask.bytes} answers with
 * a detached COPY rather than a view for exactly this reason: a holder cannot corrupt the model
 * through it, and cannot be silently disconnected from it either.
 */
export class ElementMask<TId> {
    /** Reads the identity space the ids in this mask belong to. */
    private readonly readSpace: () => MaskIdSpace<TId>;

    /** One byte per row: {@link MEMBER} or {@link ABSENT}. */
    private array: U8;

    /** Rows currently in use. Equals the element count of the current snapshot. */
    private rows = 0;

    /** How many rows in `[0, rows)` carry {@link MEMBER}. Maintained exactly by every mutator. */
    private members = 0;

    /** Bumped whenever a mutation actually changed the membership. */
    private revision = 0;

    /** The last id array handed out, or null before the first materialisation. */
    private cachedIds: readonly TId[] | null = null;

    /** The revision `cachedIds` was materialised at. */
    private cachedRevision = -1;

    /** The identity space `cachedIds` was materialised through. */
    private cachedSpace: MaskIdSpace<TId> | null = null;

    /**
     * Allocate the backing array with nothing in the set.
     * @param readSpace - Reads the current identity space. Return ONE object per snapshot: its
     *     identity is what tells the id cache that the ids may have moved, so a function that
     *     builds a fresh object per call costs a re-materialisation per read. It never costs
     *     correctness -- the contents are compared before a new array is handed out.
     * @param capacity - Rows to reserve before the first growth; a non-negative integer.
     * @throws A `RangeError` when `capacity` is not a non-negative integer.
     */
    constructor(readSpace: () => MaskIdSpace<TId>, capacity: number = DEFAULT_MASK_CAPACITY) {
        requireRowCount(capacity, "capacity");
        this.readSpace = readSpace;
        this.array = new Uint8Array(Math.max(1, capacity));
    }

    /**
     * Rows the backing array can hold without reallocating.
     * @returns The current capacity in rows.
     */
    get capacity(): number {
        return this.array.length;
    }

    /**
     * Rows currently in use, which is the element count of the graph rather than of the set.
     * @returns The live row count.
     */
    get count(): number {
        return this.rows;
    }

    /**
     * How many elements are in the set.
     * @returns The member count.
     */
    get size(): number {
        return this.members;
    }

    /**
     * A counter that moves only when the membership actually changes.
     *
     * It is what a holder keys a cache on -- "is the answer I computed from this mask still the
     * answer?" -- without walking the bytes to find out. Growing the mask does not move it;
     * truncating it past a member does.
     * @returns The current revision.
     */
    get version(): number {
        return this.revision;
    }

    /**
     * Prefix-stable growth: every row below the new count keeps its membership, and every row at
     * or above it is out of the set -- including the spare capacity a later growth hands out.
     *
     * Past the capacity this REPLACES the backing array; see the staleness contract on the class.
     * @param count - The new row count. It may be SMALLER than the current one, which truncates:
     *     members above the new count leave the set, because a row that no longer exists cannot
     *     be in it, and leaving the bytes behind would hand a later growth a set it never agreed
     *     to.
     * @throws A `RangeError` when `count` is not a non-negative integer.
     */
    grow(count: number): void {
        requireRowCount(count, "count");

        if (count > this.capacity) {
            const next = new Uint8Array(Math.max(this.capacity * 2, count));
            next.set(this.array);
            // From the live ROW COUNT and not from the old length: the old array's spare capacity
            // came across with set(), and anything at or above `rows` is by definition absent.
            next.fill(ABSENT, this.rows);
            this.array = next;
        } else if (count > this.rows) {
            this.array.fill(ABSENT, this.rows, count);
        } else if (count < this.rows) {
            for (let index = count; index < this.rows; index++) {
                if (this.array[index] === MEMBER) {
                    this.members -= 1;
                    this.revision += 1;
                }
            }

            this.array.fill(ABSENT, count, this.rows);
        }

        this.rows = count;
    }

    /**
     * Apply a freeze report's remap (previous index space -> new index or `INVALID_INDEX`).
     *
     * A member whose element survived the freeze stays a member at its new index; a member whose
     * element was removed leaves the set, which is the only honest answer. `remapArray`
     * allocates, so this replaces the backing array and collapses the capacity to exactly
     * `count`, the same bargain `ElementPositions.remap` strikes: a removal is rare and never
     * per frame, so one reallocation on the next growth is cheaper than copying twice now.
     * @param remap - The freeze report's node or edge remap.
     * @param count - The new element count.
     * @throws A `RangeError` when `count` is not a non-negative integer.
     */
    remap(remap: U32, count: number): void {
        requireRowCount(count, "count");
        this.array = remapArray(this.array, remap, count, ABSENT);
        this.rows = count;
        this.members = this.countMembers();
        // Unconditional: the indices moved, so anything materialised from the previous index
        // space has to be built again even when the same elements are still in the set.
        this.revision += 1;
    }

    /**
     * Whether one row is in the set.
     * @param index - The dense index.
     * @returns True when the row is inside the live count AND carries the member byte. A row
     *     outside the live count, a fractional index and `INVALID_INDEX` are all "not a member"
     *     rather than an error: asking about an element that is not there has an honest answer.
     */
    has(index: number): boolean {
        if (!Number.isInteger(index) || index < 0 || index >= this.rows) {
            return false;
        }

        return this.array[index] === MEMBER;
    }

    /**
     * Whether one element is in the set, by the id a consumer holds.
     * @param id - The node or edge id.
     * @returns True when the graph holds that element and it is in the set.
     */
    hasId(id: TId): boolean {
        return this.has(this.indexOf(id));
    }

    /**
     * The dense index an id sits at, through the store's id-to-index map.
     * @param id - The node or edge id.
     * @returns The index, or `INVALID_INDEX` when the graph holds no such element.
     */
    indexOf(id: TId): number {
        return this.readSpace().indexOf(id);
    }

    /**
     * Put one row into the set.
     * @param index - The dense index.
     * @returns True when this changed the membership, false when the row was already a member.
     * @throws A `RangeError` when `index` is not an integer in `[0, count)`. An element added
     *     since the last freeze has no row yet: freeze first, which grows this mask, then add.
     */
    add(index: number): boolean {
        this.requireRow(index);
        if (this.array[index] === MEMBER) {
            return false;
        }

        this.array[index] = MEMBER;
        this.members += 1;
        this.revision += 1;

        return true;
    }

    /**
     * Take one row out of the set.
     * @param index - The dense index.
     * @returns True when this changed the membership, false when the row was not a member.
     * @throws A `RangeError` when `index` is not an integer in `[0, count)`.
     */
    delete(index: number): boolean {
        this.requireRow(index);
        if (this.array[index] !== MEMBER) {
            return false;
        }

        this.array[index] = ABSENT;
        this.members -= 1;
        this.revision += 1;

        return true;
    }

    /**
     * Put every live row into the set.
     * @returns True when this changed the membership.
     */
    fill(): boolean {
        if (this.members === this.rows) {
            return false;
        }

        this.array.fill(MEMBER, 0, this.rows);
        this.members = this.rows;
        this.revision += 1;

        return true;
    }

    /**
     * Take every row out of the set. The row count is untouched: this empties the set, it does
     * not shrink the graph.
     * @returns True when this changed the membership.
     */
    clear(): boolean {
        if (this.members === 0) {
            return false;
        }

        this.array.fill(ABSENT, 0, this.rows);
        this.members = 0;
        this.revision += 1;

        return true;
    }

    /**
     * Swap every live row's membership: what was in the set is out, and what was out is in.
     * @returns True when this changed the membership, which is true for any non-empty mask.
     */
    invert(): boolean {
        if (this.rows === 0) {
            return false;
        }

        for (let index = 0; index < this.rows; index++) {
            this.array[index] = this.array[index] === MEMBER ? ABSENT : MEMBER;
        }

        this.members = this.rows - this.members;
        this.revision += 1;

        return true;
    }

    /**
     * Add everything in another mask to this one.
     * @param other - A mask over the SAME index space. Rows it does not reach are read as absent,
     *     because a row outside a mask's live count is not one of its members; that is what makes
     *     an operation between two masks caught mid-growth safe rather than a length assertion.
     * @returns True when this changed the membership.
     */
    union(other: ElementMask<TId>): boolean {
        return this.combine(other, (mine, theirs) => mine === MEMBER || theirs === MEMBER);
    }

    /**
     * Keep only what is also in another mask.
     * @param other - A mask over the same index space; see {@link ElementMask.union}.
     * @returns True when this changed the membership.
     */
    intersect(other: ElementMask<TId>): boolean {
        return this.combine(other, (mine, theirs) => mine === MEMBER && theirs === MEMBER);
    }

    /**
     * Remove everything that is in another mask.
     * @param other - A mask over the same index space; see {@link ElementMask.union}.
     * @returns True when this changed the membership.
     */
    subtract(other: ElementMask<TId>): boolean {
        return this.combine(other, (mine, theirs) => mine === MEMBER && theirs !== MEMBER);
    }

    /**
     * Keep what is in exactly one of the two masks.
     * @param other - A mask over the same index space; see {@link ElementMask.union}.
     * @returns True when this changed the membership.
     */
    symmetricDifference(other: ElementMask<TId>): boolean {
        return this.combine(other, (mine, theirs) => (mine === MEMBER) !== (theirs === MEMBER));
    }

    /**
     * The raw bytes, for a worker.
     *
     * A DETACHED COPY of the live range, not a view: the model cannot be corrupted through it,
     * and transferring it to a worker -- which detaches the buffer it is handed -- cannot leave
     * this mask holding a dead array. One byte per element, `1` for a member and `0` for
     * everything else, indexed by the same dense index the graph uses.
     * @returns A fresh `Uint8Array` of length {@link ElementMask.count}.
     */
    bytes(): U8 {
        return new Uint8Array(this.array.subarray(0, this.rows));
    }

    /**
     * The ids in the set, materialised lazily and handed back frozen.
     *
     * IDENTITY-STABLE: the same array object comes back until the contents actually change, so a
     * consumer can hold the previous answer and test `previous === next`. The contents are
     * compared rather than assumed, so a remap that shuffled the indices without changing which
     * elements are in the set still answers with the array the caller already has.
     *
     * This is a materialisation and not the boundary type. A consumer that only needs membership
     * should call {@link ElementMask.hasId}, which costs no allocation at all.
     * @returns The ids, in ascending index order. Frozen.
     */
    ids(): readonly TId[] {
        const space = this.readSpace();
        const previous = this.cachedIds;

        if (previous !== null && this.cachedRevision === this.revision && this.cachedSpace === space) {
            return previous;
        }

        const next = new Array<TId>(this.members);
        let found = 0;

        for (let index = 0; index < this.rows; index++) {
            if (this.array[index] === MEMBER) {
                next[found] = space.idOf(index);
                found += 1;
            }
        }

        const unchanged =
            previous !== null && previous.length === next.length && previous.every((id, at) => id === next[at]);
        const ids = unchanged ? previous : Object.freeze(next);

        this.cachedIds = ids;
        this.cachedRevision = this.revision;
        this.cachedSpace = space;

        return ids;
    }

    /**
     * Rewrite every live row from this mask and another one.
     * @param other - The other mask, read as absent past its own live count.
     * @param member - Whether a row is a member, given both bytes.
     * @returns True when any row changed.
     */
    private combine(other: ElementMask<TId>, member: (mine: number, theirs: number) => boolean): boolean {
        let changed = false;

        for (let index = 0; index < this.rows; index++) {
            const mine = this.array[index];
            const theirs = index < other.rows ? other.array[index] : ABSENT;
            const next = member(mine, theirs) ? MEMBER : ABSENT;

            if (next !== mine) {
                this.array[index] = next;
                this.members += next === MEMBER ? 1 : -1;
                changed = true;
            }
        }

        if (changed) {
            this.revision += 1;
        }

        return changed;
    }

    /**
     * How many live rows carry the member byte.
     * @returns The member count.
     */
    private countMembers(): number {
        let found = 0;

        for (let index = 0; index < this.rows; index++) {
            if (this.array[index] === MEMBER) {
                found += 1;
            }
        }

        return found;
    }

    /**
     * Refuse anything that is not a live row, which is what keeps a write from being dropped.
     * @param index - The dense index a mutator was handed.
     * @throws A `RangeError` when `index` is not an integer in `[0, count)`.
     */
    private requireRow(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.rows) {
            throw new RangeError(
                index === INVALID_INDEX
                    ? "ElementMask: INVALID_INDEX is the graph-format 'no such element' sentinel, not a row"
                    : `ElementMask: row ${String(index)} is outside the live range [0, ${this.rows})`,
            );
        }
    }
}
