/**
 * Shared plumbing of the generators: argument checks, the growable edge buffer and the Bernoulli
 * row sampler every G(n, p)-style generator is built on.
 */

import { MAX_COUNT, type U32 } from "@graphty/graph-format";

import { type RandomStream } from "../random/stream.js";
import { type SampleGraph } from "../types.js";

/**
 * Throw unless `value` is an integer in [min, max].
 * @param name - the option name, for the message
 * @param value - the value
 * @param min - the smallest allowed value
 * @param max - the largest allowed value
 */
export function checkInt(name: string, value: number, min: number, max: number = MAX_COUNT): void {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new RangeError(`${name} must be an integer in [${min}, ${max}], got ${String(value)}`);
    }
}

/**
 * Throw unless `value` is a probability in [0, 1].
 * @param name - the option name, for the message
 * @param value - the value
 */
export function checkProbability(name: string, value: number): void {
    if (!(value >= 0 && value <= 1)) {
        throw new RangeError(`${name} must be a probability in [0, 1], got ${String(value)}`);
    }
}

/**
 * Throw unless `count` edges fit a graph-format snapshot.
 * @param count - the edge count
 */
export function checkEdgeCount(count: number): void {
    if (count > MAX_COUNT) {
        throw new RangeError(`the graph would have ${count} edges, above the limit of ${MAX_COUNT}`);
    }
}

/** A growable pair of Uint32Array edge endpoint arrays. */
export class EdgeBuffer {
    src: U32;
    dst: U32;
    length = 0;

    /**
     * An empty buffer.
     * @param capacity - the initial capacity in edges
     */
    constructor(capacity: number) {
        const size = Math.max(16, Math.min(capacity, MAX_COUNT));
        this.src = new Uint32Array(size);
        this.dst = new Uint32Array(size);
    }

    /**
     * Append one edge.
     * @param u - the source index
     * @param v - the target index
     */
    push(u: number, v: number): void {
        if (this.length === this.src.length) {
            this.grow();
        }
        this.src[this.length] = u;
        this.dst[this.length] = v;
        this.length++;
    }

    /**
     * The edges pushed so far as exactly sized arrays (copies when the buffer has slack).
     * @returns the endpoint arrays
     */
    finish(): { src: U32; dst: U32 } {
        if (this.length === this.src.length) {
            return { src: this.src, dst: this.dst };
        }
        return { src: this.src.slice(0, this.length), dst: this.dst.slice(0, this.length) };
    }

    private grow(): void {
        checkEdgeCount(this.length + 1);
        const size = Math.min(this.src.length * 2, MAX_COUNT);
        const src = new Uint32Array(size);
        const dst = new Uint32Array(size);
        src.set(this.src);
        dst.set(this.dst);
        this.src = src;
        this.dst = dst;
    }
}

/**
 * A buffer sized for a binomial number of edges: the mean plus six standard deviations, so it
 * almost never grows.
 * @param pairs - the number of candidate pairs
 * @param p - the edge probability
 * @returns the buffer
 */
export function binomialBuffer(pairs: number, p: number): EdgeBuffer {
    const mean = pairs * p;
    checkEdgeCount(mean);
    return new EdgeBuffer(Math.ceil(mean + 6 * Math.sqrt(mean * (1 - p)) + 16));
}

/**
 * Append (row, c) for every column c in [lo, hi) chosen independently with probability p, in
 * ascending c, by geometric skipping (V. Batagelj and U. Brandes, "Efficient generation of large
 * random networks", Phys. Rev. E 71, 036113, 2005): O(1 + selected) draws instead of hi - lo.
 * p = 0 and p = 1 draw nothing.
 * @param stream - the row's stream
 * @param p - the probability
 * @param logQ - detLog(1 - p)
 * @param row - the row node, written as the source
 * @param lo - the first candidate column
 * @param hi - one past the last candidate column
 * @param out - the buffer
 */
export function bernoulliSegment(
    stream: RandomStream,
    p: number,
    logQ: number,
    row: number,
    lo: number,
    hi: number,
    out: EdgeBuffer,
): void {
    if (p === 0 || lo >= hi) {
        return;
    }
    if (p === 1) {
        for (let c = lo; c < hi; c++) {
            out.push(row, c);
        }
        return;
    }
    let c = lo + stream.nextSkip(logQ);
    while (c < hi) {
        out.push(row, c);
        c += 1 + stream.nextSkip(logQ);
    }
}

/**
 * Assemble an undirected or directed SampleGraph from a buffer.
 * @param nodeCount - the node count
 * @param edges - the edges
 * @param directed - whether the graph is directed
 * @param nodeColumns - ground-truth columns, if any
 * @returns the graph
 */
export function toGraph(
    nodeCount: number,
    edges: EdgeBuffer,
    directed: boolean,
    nodeColumns?: SampleGraph["nodeColumns"],
): SampleGraph {
    const { src, dst } = edges.finish();
    return nodeColumns === undefined
        ? { directed, nodeCount, src, dst }
        : { directed, nodeCount, src, dst, nodeColumns };
}
