/**
 * What the slots of a batch held when the visibility mask hid them, so showing one again puts it
 * back as it was instead of placing it from scratch (issue #6025).
 *
 * A hidden slot is zeroed, which draws nothing, and placing it again costs its edge a walk:
 * where each end meets its node, its caps, its label. A time window that jumps shows tens of
 * thousands of edges at once, almost none of whose nodes moved while they were hidden, and that
 * walk was most of the jump. The edge's own endpoint cache still says whether anything moved;
 * a parked slot only means the placement it last had is there to put back.
 *
 * Used by the batches whose shader has no per-slot hidden flag to read: arrow caps and the lines
 * drawn from thin-instance matrices. A joined line's batch hides a slot with its `edgeHidden`
 * flag instead and never moves the slot's floats (`EdgeLineBatch.park`).
 *
 * A slot is parked only by {@link ParkedSlots.park} and stays parked until it is put back or
 * written in any other way (placed, hidden, taken, handed back), which forgets it: a parked
 * slot then never brings back a placement something has since replaced.
 *
 * ponytail: the stash is as large as the batch's own array once a slot near its end is parked,
 * so a graph with most edges hidden holds its line slots twice. Keep only the hidden slots
 * (compacted) if that memory starts to matter.
 */
export class ParkedSlots {
    private stash = new Float32Array(0);
    private parked = new Uint8Array(0);

    /**
     * Start with no slot parked.
     * @param stride - Floats per slot in the array the slots live in.
     */
    constructor(private readonly stride: number) {}

    /**
     * Keep a slot's floats. A slot already parked keeps what it held when it was
     * first parked: it has been zero since, and zero is not its placement.
     * The caller zeroes the slot afterwards (without {@link ParkedSlots.forget}).
     * @param data - The batch's array.
     * @param index - The slot.
     */
    park(data: Float32Array, index: number): void {
        if (!this.isParked(index)) {
            if (this.stash.length < data.length) {
                const stash = new Float32Array(data.length);
                stash.set(this.stash);
                this.stash = stash;
                const parked = new Uint8Array(data.length / this.stride);
                parked.set(this.parked);
                this.parked = parked;
            }

            // An indexed loop: a `subarray` view per slot cost more than the copy (issue #6025).
            const at = index * this.stride;
            for (let k = at; k < at + this.stride; k++) {
                this.stash[k] = data[k];
            }
        }

        this.parked[index] = 1;
    }

    /**
     * Put a parked slot back as it was.
     * @param data - The batch's array.
     * @param index - The slot.
     * @returns True when it was parked and is now back; false when there was nothing to restore.
     */
    unpark(data: Float32Array, index: number): boolean {
        if (!this.isParked(index)) {
            return false;
        }

        const at = index * this.stride;
        for (let k = at; k < at + this.stride; k++) {
            data[k] = this.stash[k];
        }
        this.parked[index] = 0;

        return true;
    }

    /**
     * Forget a slot: something else wrote it.
     * @param index - The slot.
     */
    forget(index: number): void {
        if (index < this.parked.length) {
            this.parked[index] = 0;
        }
    }

    /**
     * What a slot is drawn as when it is shown: what it held when it was parked, or what it holds.
     * @param data - The batch's array.
     * @param index - The slot.
     * @returns A view of the slot's floats; copy it before either array is written.
     */
    placementOf(data: Float32Array, index: number): Float32Array {
        const at = index * this.stride;
        return (this.isParked(index) ? this.stash : data).subarray(at, at + this.stride);
    }

    /**
     * Whether a slot is parked.
     * @param index - The slot.
     * @returns True while it is.
     */
    isParked(index: number): boolean {
        return index < this.parked.length && this.parked[index] === 1;
    }
}
