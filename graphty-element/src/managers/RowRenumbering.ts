/**
 * @file The renumberings of a set of rows since each object last read its row, kept as runs so a
 * removal from a million-edge graph does not visit a million objects to tell each its new row
 * (issue #9164). An object stamps the epoch it read its row at and brings the row forward only
 * when it is next read.
 */

import { INVALID_INDEX, type U32 } from "@graphty/graph-format";

/** One order-keeping renumbering: runs of rows that moved by the same amount, and the rows dropped. */
interface Step {
    /** The row count it renumbers from; a row at or past it was never renumbered and stays invalid. */
    readonly length: number;
    /** The first row of each run, ascending. */
    readonly starts: Uint32Array;
    /** Each run's shift. */
    readonly shifts: Int32Array;
    /** The rows dropped, ascending. */
    readonly dropped: Uint32Array;
}

/** How many renumberings are kept before every object is brought forward and they are let go. */
const MOST_STEPS = 64;

/**
 * The last index in an ascending array at or below a value, or -1.
 * @param sorted - The array.
 * @param value - The value.
 * @returns The index.
 */
function atOrBelow(sorted: Uint32Array, value: number): number {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (sorted[middle] <= value) {
            low = middle + 1;
        } else {
            high = middle;
        }
    }

    return low - 1;
}

/**
 * A remap as runs, or null when it does not keep the order of the rows it keeps.
 * @param remap - Old row to new row, or INVALID_INDEX.
 * @returns The step.
 */
function stepOf(remap: U32): Step | null {
    const starts: number[] = [];
    const shifts: number[] = [];
    const dropped: number[] = [];
    let last = -1;
    let shift = Number.NaN;
    for (let row = 0; row < remap.length; row++) {
        const moved = remap[row];
        if (moved === INVALID_INDEX) {
            dropped.push(row);
            continue;
        }

        if (moved <= last) {
            return null;
        }

        last = moved;
        if (moved - row !== shift) {
            shift = moved - row;
            starts.push(row);
            shifts.push(shift);
        }
    }

    return {
        length: remap.length,
        starts: Uint32Array.from(starts),
        shifts: Int32Array.from(shifts),
        dropped: Uint32Array.from(dropped),
    };
}

/**
 * A row after one step.
 * @param step - The step.
 * @param row - The row before it.
 * @returns The row after it, or INVALID_INDEX.
 */
function through(step: Step, row: number): number {
    if (row >= step.length) {
        return INVALID_INDEX;
    }

    const drop = atOrBelow(step.dropped, row);
    if (drop >= 0 && step.dropped[drop] === row) {
        return INVALID_INDEX;
    }

    const run = atOrBelow(step.starts, row);
    return row + step.shifts[run];
}

/**
 * Whether a renumbering only drops rows: each kept row moves to the next free row, in order.
 * @param remap - Old row to new row, or INVALID_INDEX.
 * @returns True for a removal.
 */
function dropsOnly(remap: U32): boolean {
    let next = 0;
    for (let row = 0; row < remap.length; row++) {
        const moved = remap[row];
        if (moved !== INVALID_INDEX && moved !== next++) {
            return false;
        }
    }

    return true;
}

/** The renumberings of one kind of row (the edges of one graph) since each object read its row. */
export class RowRenumbering {
    /** The epoch now: an object whose stamp is this holds its current row. */
    epoch = 0;

    /** The epoch `steps[0]` renumbers from. */
    private base = 0;

    /** The renumberings since `base`, oldest first. */
    private steps: Step[] = [];

    /**
     * Record a renumbering.
     * @param remap - Old row to new row, or INVALID_INDEX.
     * @returns False when it reorders rows, which cannot be kept as runs: the caller then places
     *     every object itself, after {@link RowRenumbering.restart}.
     */
    record(remap: U32): boolean {
        const step = stepOf(remap);
        if (step === null) {
            return false;
        }

        this.steps.push(step);
        this.epoch++;
        return true;
    }

    /**
     * Whether enough renumberings are kept that every object should be brought forward now.
     * @returns True past the cap.
     */
    get full(): boolean {
        return this.steps.length >= MOST_STEPS;
    }

    /**
     * Let go of every renumbering kept: objects stamped before now no longer resolve, so the caller
     * brings every object forward first, or places each again.
     */
    restart(): void {
        this.epoch++;
        this.base = this.epoch;
        this.steps = [];
    }

    /**
     * A row read at an epoch, as it is now.
     * @param row - The row then.
     * @param epoch - The epoch it was read at.
     * @returns The row now, or INVALID_INDEX when a renumbering dropped it or it is older than
     *     every renumbering kept.
     */
    resolve(row: number, epoch: number): number {
        if (epoch < this.base) {
            return INVALID_INDEX;
        }

        let now = row;
        for (let at = epoch - this.base; at < this.steps.length && now !== INVALID_INDEX; at++) {
            now = through(this.steps[at], now);
        }

        return now;
    }

    /**
     * Renumber an array indexed by row, as an order-keeping freeze ({@link RowRenumbering.record} took it)
     * renumbered its rows. A removal, which only drops rows, is done in place: the dropped rows are spliced out,
     * which moves the rest natively, with no new array of the graph's length. Any other renumbering (an undo putting
     * rows back between others) gives a new array.
     * @param rows - The array, by old row.
     * @param remap - Old row to new row, or INVALID_INDEX, keeping order.
     * @returns The array by new row: `rows` itself after a removal.
     */
    static remapRows<T>(rows: (T | undefined)[], remap: U32): (T | undefined)[] {
        if (dropsOnly(remap)) {
            if (rows.length > remap.length) {
                rows.length = remap.length;
            }

            for (let row = rows.length - 1; row >= 0; row--) {
                if (remap[row] === INVALID_INDEX) {
                    rows.splice(row, 1);
                }
            }

            return rows;
        }

        const moved: (T | undefined)[] = [];
        for (let row = 0; row < rows.length; row++) {
            const each = rows[row];
            const to = remap[row] ?? INVALID_INDEX;
            if (each !== undefined && to !== INVALID_INDEX) {
                moved[to] = each;
            }
        }

        return moved;
    }
}
