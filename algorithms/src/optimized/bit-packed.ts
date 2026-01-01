import { TypedFastBitSet } from "typedfastbitset";

/**
 * Wrapper around TypedFastBitSet with graph-specific optimizations
 *
 * Provides efficient bit-packed set operations optimized for graph algorithms
 * with 8x memory reduction compared to standard JavaScript Set for boolean values.
 */
export class GraphBitSet {
    private bitset: TypedFastBitSet;
    private _cardinality = 0;

    /**
     * Creates a new GraphBitSet with optional pre-allocated capacity.
     * @param capacity - The initial capacity to pre-allocate for the bitset
     */
    constructor(capacity?: number) {
        this.bitset = new TypedFastBitSet();
        if (capacity) {
            // Pre-allocate for known size
            this.bitset.resize(capacity);
        }
    }

    /**
     * Add a single element to the set.
     * @param index - The element index to add
     */
    add(index: number): void {
        if (!this.bitset.has(index)) {
            this.bitset.add(index);
            this._cardinality++;
        }
    }

    /**
     * Remove a single element from the set.
     * @param index - The element index to remove
     */
    remove(index: number): void {
        if (this.bitset.has(index)) {
            this.bitset.remove(index);
            this._cardinality--;
        }
    }

    /**
     * Check if an element exists in the set.
     * @param index - The element index to check
     * @returns True if the element exists, false otherwise
     */
    has(index: number): boolean {
        return this.bitset.has(index);
    }

    /**
     * Clear all elements
     */
    clear(): void {
        this.bitset.clear();
        this._cardinality = 0;
    }

    /**
     * Check if the set is empty.
     * @returns True if the set contains no elements, false otherwise
     */
    isEmpty(): boolean {
        return this._cardinality === 0;
    }

    /**
     * Optimized for graph algorithms - add a range of indices.
     * @param start - The starting index (inclusive)
     * @param end - The ending index (exclusive)
     */
    addRange(start: number, end: number): void {
        for (let i = start; i < end; i++) {
            if (!this.bitset.has(i)) {
                this.bitset.add(i);
                this._cardinality++;
            }
        }
    }

    /**
     * Fast cardinality tracking - get the number of elements in the set.
     * @returns The number of elements in the set
     */
    size(): number {
        return this._cardinality;
    }

    /**
     * Batch operations for frontier management - swap contents with another GraphBitSet.
     * @param other - The GraphBitSet to swap contents with
     */
    swap(other: GraphBitSet): void {
        [this.bitset, other.bitset] = [other.bitset, this.bitset];
        [this._cardinality, other._cardinality] = [other._cardinality, this._cardinality];
    }

    /**
     * Efficient iteration over all elements in the set.
     * @yields The indices of elements in the set
     */
    *[Symbol.iterator](): Generator<number> {
        // Use TypedFastBitSet's optimized iteration
        yield* this.bitset;
    }

    /**
     * Perform union operation with another GraphBitSet, updating this set in place.
     * @param other - The GraphBitSet to union with
     */
    union(other: GraphBitSet): void {
        const result = this.bitset.union(other.bitset);
        this.bitset = result;

        const size = this.bitset.size();
        this._cardinality = size;
    }

    /**
     * Perform intersection operation with another GraphBitSet, updating this set in place.
     * @param other - The GraphBitSet to intersect with
     */
    intersection(other: GraphBitSet): void {
        const result = this.bitset.intersection(other.bitset);
        this.bitset = result;

        const size = this.bitset.size();
        this._cardinality = size;
    }

    /**
     * Perform difference operation with another GraphBitSet, updating this set in place.
     * @param other - The GraphBitSet to subtract from this set
     */
    difference(other: GraphBitSet): void {
        const result = this.bitset.difference(other.bitset);
        this.bitset = result;

        const size = this.bitset.size();
        this._cardinality = size;
    }

    /**
     * Clone the bitset.
     * @returns A new GraphBitSet with the same elements
     */
    clone(): GraphBitSet {
        const cloned = new GraphBitSet();
        cloned.bitset = this.bitset.clone();

        cloned._cardinality = this._cardinality;
        return cloned;
    }
}

/**
 * Specialized bit array for visited tracking
 *
 * More memory efficient than GraphBitSet for simple boolean arrays
 * that don't need set operations.
 */
export class VisitedBitArray {
    private words: Uint32Array;
    private wordCount: number;
    private _size: number;

    /**
     * Creates a new VisitedBitArray with the specified size.
     * @param size - The number of bits to allocate
     */
    constructor(size: number) {
        this._size = size;
        this.wordCount = Math.ceil(size / 32);
        this.words = new Uint32Array(this.wordCount);
    }

    /**
     * Set bit at the specified index.
     * @param index - The bit index to set
     */
    set(index: number): void {
        if (index < 0 || index >= this._size) {
            throw new Error(`Index ${String(index)} out of bounds [0, ${String(this._size)})`);
        }

        const wordIndex = index >>> 5; // divide by 32
        const bitIndex = index & 31; // modulo 32
        const word = this.words[wordIndex];
        if (word !== undefined) {
            this.words[wordIndex] = word | (1 << bitIndex);
        }
    }

    /**
     * Get bit value at the specified index.
     * @param index - The bit index to get
     * @returns True if the bit is set, false otherwise
     */
    get(index: number): boolean {
        if (index < 0 || index >= this._size) {
            return false;
        }

        const wordIndex = index >>> 5;
        const bitIndex = index & 31;
        const word = this.words[wordIndex];
        return word !== undefined && (word & (1 << bitIndex)) !== 0;
    }

    /**
     * Clear all bits
     */
    clear(): void {
        this.words.fill(0);
    }

    /**
     * Toggle bit at the specified index.
     * @param index - The bit index to toggle
     */
    toggle(index: number): void {
        if (index < 0 || index >= this._size) {
            throw new Error(`Index ${String(index)} out of bounds [0, ${String(this._size)})`);
        }

        const wordIndex = index >>> 5;
        const bitIndex = index & 31;
        const word = this.words[wordIndex];
        if (word !== undefined) {
            this.words[wordIndex] = word ^ (1 << bitIndex);
        }
    }

    /**
     * Population count for statistics - count the number of set bits.
     * @returns The number of bits set to 1
     */
    popcount(): number {
        let count = 0;
        for (let i = 0; i < this.wordCount; i++) {
            const word = this.words[i];
            if (word !== undefined) {
                count += this.popcountWord(word);
            }
        }
        return count;
    }

    /**
     * Efficient population count for a single word.
     * Uses bit manipulation tricks for fast counting.
     * @param n - The 32-bit word to count
     * @returns The number of bits set to 1 in the word
     */
    private popcountWord(n: number): number {
        let x = n;
        x = x - ((x >>> 1) & 0x55555555);
        x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
        return (((x + (x >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24;
    }

    /**
     * Get size of the bit array.
     * @returns The total number of bits in the array
     */
    size(): number {
        return this._size;
    }

    /**
     * Check if all bits are zero.
     * @returns True if no bits are set, false otherwise
     */
    isEmpty(): boolean {
        for (let i = 0; i < this.wordCount; i++) {
            if (this.words[i] !== 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Set multiple bits from an array of indices.
     * @param indices - Array of bit indices to set
     */
    setMultiple(indices: number[]): void {
        for (const index of indices) {
            this.set(index);
        }
    }

    /**
     * Get indices of all set bits.
     * @returns Array containing the indices of all bits that are set to 1
     */
    getSetIndices(): number[] {
        const indices: number[] = [];
        for (let wordIndex = 0; wordIndex < this.wordCount; wordIndex++) {
            const word = this.words[wordIndex];
            if (!word || word === 0) {
                continue;
            }

            for (let bitIndex = 0; bitIndex < 32; bitIndex++) {
                if (word & (1 << bitIndex)) {
                    const index = (wordIndex << 5) + bitIndex;
                    if (index < this._size) {
                        indices.push(index);
                    }
                }
            }
        }
        return indices;
    }
}

/**
 * Bit-packed distance array for BFS
 *
 * Optimized for storing distances using 16-bit integers (up to 65,535 levels)
 * Still provides 2x memory savings compared to standard 32-bit numbers
 */
export class CompactDistanceArray {
    private data: Uint16Array;
    private _size: number;
    private static readonly INFINITY = 65535;

    /**
     * Creates a new CompactDistanceArray with the specified size.
     * @param size - The number of distance values to store
     */
    constructor(size: number) {
        this._size = size;
        this.data = new Uint16Array(size);
        this.data.fill(CompactDistanceArray.INFINITY); // Initialize with max value (unvisited)
    }

    /**
     * Set distance at the specified index.
     * @param index - The node index to set the distance for
     * @param distance - The distance value to set
     */
    set(index: number, distance: number): void {
        if (distance >= CompactDistanceArray.INFINITY) {
            throw new Error(`Distance exceeds maximum value (${String(CompactDistanceArray.INFINITY - 1)})`);
        }

        this.data[index] = distance;
    }

    /**
     * Get distance at the specified index.
     * @param index - The node index to get the distance for
     * @returns The distance value, or INFINITY if not set
     */
    get(index: number): number {
        const value = this.data[index];
        return value ?? CompactDistanceArray.INFINITY; // Default to unvisited
    }

    /**
     * Check if a node has been visited (has a valid distance).
     * @param index - The node index to check
     * @returns True if the node has been visited, false otherwise
     */
    isVisited(index: number): boolean {
        return this.data[index] !== CompactDistanceArray.INFINITY;
    }

    /**
     * Reset all distances to unvisited state.
     */
    clear(): void {
        this.data.fill(CompactDistanceArray.INFINITY);
    }

    /**
     * Get the size of the distance array.
     * @returns The number of elements in the array
     */
    size(): number {
        return this._size;
    }
}
