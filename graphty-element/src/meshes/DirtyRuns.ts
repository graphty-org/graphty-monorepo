import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import type { Mesh } from "@babylonjs/core";

/**
 * The most runs one upload sends: past it, the runs nearest each other are joined into one.
 *
 * A CALL COSTS MORE THAN THE BYTES IT SAVES, so do not raise this to make a scattered write upload
 * less. A time-window jump over 1,000,000 edges (test/browser/timeline-frame-bench.ts, RTX 4070
 * SUPER, 40,000 rows changed, render milliseconds at each cap): 1,024 runs sent 138 MB in 47.5 ms,
 * 4,096 sent 103 MB in 45.6 ms, 16,384 sent 37 MB in 57.4 ms, and no cap sent 7 MB in 96,000 calls
 * in 71.4 ms. Each call costs about 0.3 us more than the unwritten slots it skips.
 */
export const MAX_RUNS = 4_096;

/**
 * Which slots of one buffer were written since its last upload.
 *
 * Slot order has nothing to do with what moved, so a single range would span the whole buffer:
 * written slots are kept as a list and sorted into runs of neighbors when the buffer uploads.
 *
 * DIRTY WITH NO SLOTS LISTED MEANS THE WHOLE BUFFER, and stays that way until the upload. That is
 * the state of a write made with ranged uploads off, and of a list that grew past half the slots,
 * so a later write can never shrink an upload below what was written before it.
 */
export class DirtyRuns {
    /** Whether anything was written since the last upload. */
    dirty = false;

    /** The slots written, in the order they were, with repeats. */
    private readonly written: number[] = [];

    /**
     * Note one slot's write.
     * @param slot - The slot.
     * @param ranged - Whether ranged uploads are on: off, no list is kept.
     * @param slots - How many slots the buffer draws.
     */
    mark(slot: number, ranged: boolean, slots: number): void {
        const { written } = this;
        if (!ranged) {
            this.whole();
        } else if (!this.dirty || written.length > 0) {
            this.dirty = true;
            if (written.at(-1) !== slot) {
                written.push(slot);
            }

            if (written.length * 2 > slots) {
                written.length = 0;
            }
        }
    }

    /** Note a write the slots cannot describe: the next upload is the whole buffer. */
    whole(): void {
        this.dirty = true;
        if (this.written.length > 0) {
            this.written.length = 0;
        }
    }

    /**
     * Say what to upload, and start the next frame's list.
     * @param ranged - Whether ranged uploads are on.
     * @returns The runs as flat pairs of first slot and end slot (exclusive) in slot order, at most
     *     {@link MAX_RUNS} of them, or null for the whole buffer.
     */
    take(ranged: boolean): readonly number[] | null {
        this.dirty = false;
        const sorted = ranged ? Uint32Array.from(this.written).sort() : null;
        this.written.length = 0;
        if (sorted === null || sorted.length === 0) {
            return null;
        }

        const runs: number[] = [];
        let end = -1;
        for (const slot of sorted) {
            if (slot === end) {
                end++;
                runs[runs.length - 1] = end;
            } else if (slot > end) {
                end = slot + 1;
                runs.push(slot, end);
            }
        }

        return runs.length / 2 > MAX_RUNS ? joinNearest(runs, runs.length / 2 - MAX_RUNS) : runs;
    }
}

/**
 * Join runs across their smallest gaps until few enough are left. The slots in a closed gap were
 * not written, so they go up unchanged: a few more bytes, in place of a call per run or the whole
 * buffer.
 * @param runs - The runs, flat pairs in slot order.
 * @param joins - How many gaps to close.
 * @returns The joined runs.
 */
function joinNearest(runs: readonly number[], joins: number): number[] {
    const gaps = new Uint32Array(runs.length / 2 - 1);
    for (let i = 0; i < gaps.length; i++) {
        gaps[i] = runs[2 * i + 2] - runs[2 * i + 1];
    }

    // Close every gap under the cut, and of the gaps equal to it only as many as are still owed.
    const cut = gaps.slice().sort()[joins - 1];
    let equalLeft = joins - gaps.filter((gap) => gap < cut).length;
    const joined = [runs[0], runs[1]];
    for (let i = 0; i < gaps.length; i++) {
        let close = gaps[i] < cut;
        if (!close && gaps[i] === cut && equalLeft > 0) {
            equalLeft--;
            close = true;
        }

        if (close) {
            joined[joined.length - 1] = runs[2 * i + 3];
        } else {
            joined.push(runs[2 * i + 2], runs[2 * i + 3]);
        }
    }

    return joined;
}

/**
 * Send a mesh's thin-instance matrices to the GPU.
 *
 * Whole for a run at slot 0: a partial update takes no count, and without one Babylon keeps that
 * short view as `Buffer._data`, which a lost context rebuilds the buffer from at the run's size.
 * @param mesh - The mesh.
 * @param runs - The runs from {@link DirtyRuns.take}, or null for every matrix.
 */
export function sendThinInstanceMatrices(mesh: Mesh, runs: readonly number[] | null): void {
    if (runs === null || runs[0] === 0) {
        // Babylon uploads the matrices only up to the instance count already.
        mesh.thinInstanceBufferUpdated("matrix");
        return;
    }

    for (let i = 0; i < runs.length; i += 2) {
        mesh.thinInstancePartialBufferUpdate("matrix", runs[i + 1] - runs[i], runs[i]);
    }
}
