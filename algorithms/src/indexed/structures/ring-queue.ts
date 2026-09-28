/**
 * A fixed-capacity FIFO queue of node indices over one `Uint32Array`, for the frontier of a
 * breadth-first sweep that may re-enqueue a node (label propagation, SPFA-style relaxation) and so
 * cannot use the one-pass `order` array plain BFS does. Overflow and underflow throw rather than
 * silently overwrite: a wrong capacity is a bug in the caller.
 * @public
 */
export class RingQueue {
    private readonly buffer: Uint32Array;
    private head = 0;
    private count = 0;

    /**
     * Create an empty queue.
     * @param capacity - The most entries the queue holds at once
     */
    constructor(capacity: number) {
        this.buffer = new Uint32Array(capacity);
    }

    /**
     * The number of queued entries.
     * @returns The entry count
     */
    get size(): number {
        return this.count;
    }

    /**
     * Whether the queue holds no entries.
     * @returns True when empty
     */
    isEmpty(): boolean {
        return this.count === 0;
    }

    /**
     * Append a value at the tail.
     * @param value - A node index
     * @throws RangeError when the queue is full
     */
    push(value: number): void {
        const capacity = this.buffer.length;
        if (this.count === capacity) {
            throw new RangeError(`RingQueue: full at capacity ${String(capacity)}`);
        }
        this.buffer[(this.head + this.count) % capacity] = value;
        this.count++;
    }

    /**
     * Remove and return the value at the head.
     * @returns The oldest queued node index
     * @throws RangeError when the queue is empty
     */
    shift(): number {
        if (this.count === 0) {
            throw new RangeError("RingQueue: shift on an empty queue");
        }
        const value = this.buffer[this.head];
        this.head = (this.head + 1) % this.buffer.length;
        this.count--;
        return value;
    }

    /** Drop every entry, keeping the buffer for reuse. */
    clear(): void {
        this.head = 0;
        this.count = 0;
    }
}
