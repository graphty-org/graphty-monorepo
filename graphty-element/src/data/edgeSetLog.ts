/**
 * @file Which node pairs gained or lost an edge, by the edge set version each change produced: what
 * lets a cache over the edge set (the parallel-edge bundles, the edges a frame places) follow one
 * edit at the cost of that edit rather than a walk of every edge (issue #9164).
 */
import type { NodeIdType } from "../Node";

/** The changes kept before the log forgets them and a reader starts over from the whole set. */
const KEPT = 4096;

/** A pair of node ids, either way round. */
export type EdgeSetPair = readonly [NodeIdType, NodeIdType];

/**
 * The pairs whose edges changed, each stamped with the edge set version it produced.
 *
 * A CHAIN WITH NO GAP OR NOTHING. A change the log was not told of (a clear, a dispose) breaks the
 * chain, and a reader asking from before the break is told to start over, as it is when the log
 * has forgotten past {@link KEPT} changes -- a load of a million edges is read as a whole, never
 * as a million pairs.
 */
export class EdgeSetLog {
    /** The version the kept changes start after; a reader older than it starts over. */
    private floor = 0;
    /** The version of the last change told; when the edge set's version is past it, an untold change came since. */
    private last = 0;
    private versions: number[] = [];
    private pairs: EdgeSetPair[] = [];

    /**
     * Record one change to the edge set.
     * @param before - The edge set's version before it.
     * @param after - Its version after it.
     * @param pair - The two ends of the edge that came or went.
     */
    record(before: number, after: number, pair: EdgeSetPair): void {
        if (before !== this.last || this.versions.length >= KEPT) {
            this.versions = [];
            this.pairs = [];
            this.floor = before;
        }

        this.versions.push(after);
        this.pairs.push(pair);
        this.last = after;
    }

    /**
     * The pairs changed since a version.
     * @param version - The version the reader last followed.
     * @param now - The edge set's version now.
     * @returns The pairs, repeats included; or null when the reader has to start over.
     */
    since(version: number, now: number): EdgeSetPair[] | null {
        if (version === now) {
            return [];
        }

        if (now !== this.last || version < this.floor || version > now) {
            return null;
        }

        const changed: EdgeSetPair[] = [];
        for (let at = this.versions.length - 1; at >= 0 && this.versions[at] > version; at--) {
            changed.push(this.pairs[at]);
        }

        return changed;
    }
}
