import { makeMask, maskCount, maskSet, maskTest, maskToIndices, type NodeMask } from "@graphty/graph-format";

/**
 * A fixed-length set of indices over graph-format's packed mask words, so `words` can be handed
 * to anything that takes a `NodeMask` or `EdgeMask` (`maskToIndices`, `filterEdges`,
 * `inducedSubgraph({ mask })`) without a copy.
 * @public
 */
export class BitSet {
    /** The packed words, `ceil(length / 32)` of them; shared, not copied. */
    readonly words: NodeMask;

    /**
     * Create an empty set over indices in `[0, length)`.
     * @param length - The number of indices the set covers
     */
    constructor(readonly length: number) {
        this.words = makeMask(length);
    }

    /**
     * Whether an index is in the set.
     * @param i - An index below `length`
     * @returns True when present
     */
    has(i: number): boolean {
        return maskTest(this.words, i);
    }

    /**
     * Include an index.
     * @param i - An index below `length`
     */
    add(i: number): void {
        maskSet(this.words, i, true);
    }

    /**
     * Exclude an index.
     * @param i - An index below `length`
     */
    delete(i: number): void {
        maskSet(this.words, i, false);
    }

    /** Exclude every index. */
    clear(): void {
        this.words.fill(0);
    }

    /**
     * The number of included indices.
     * @returns The population count
     */
    count(): number {
        return maskCount(this.words, this.length);
    }

    /**
     * The included indices in ascending order.
     * @returns A fresh array of indices
     */
    toIndices(): Uint32Array {
        return maskToIndices(this.words, this.length);
    }
}
