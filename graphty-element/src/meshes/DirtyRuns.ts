import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import type { Mesh } from "@babylonjs/core";

/** Runs past which one upload of the whole buffer costs less than many small ones. */
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
     * @returns The runs as flat pairs of first slot and end slot (exclusive) in slot order, or null
     *     for the whole buffer.
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

        return runs.length / 2 > MAX_RUNS ? null : runs;
    }
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
