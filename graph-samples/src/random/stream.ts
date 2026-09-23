/**
 * The one random number source of @graphty/graph-samples, and its determinism contract.
 *
 * A stream is named by `(seed, domain, block)`:
 *
 * - `seed` is the caller's seed, any safe integer in [0, 2^53).
 * - `domain` is a fixed ASCII name per generator and purpose ("gnp", "sbm", ...). It is hashed
 *   with 32-bit FNV-1a to `domainId`.
 * - `block` is a unit of work the ALGORITHM defines (a row of the adjacency matrix, a node), an
 *   integer in [0, 2^32). It never depends on how many workers or chunks run the generator.
 *
 * The stream's key is `Threefry2x32-20(key = (seed mod 2^32, floor(seed / 2^32)),
 * counter = (domainId, block))`, and its words are `Threefry2x32-20(key = streamKey,
 * counter = (i mod 2^32, floor(i / 2^32)))` for i = 0, 1, 2, ..., two words per counter, word 0
 * first. Every draw below is defined in terms of those words with integer-exact arithmetic, so the
 * same `(seed, domain, block)` yields the same values on every engine, platform and version.
 * `test/random/stream.test.ts` freezes it with golden values: changing anything here changes every
 * seeded graph, which is a breaking change of the package.
 */

import { detLog } from "./log.js";
import { threefry2x32 } from "./threefry.js";

const TWO_32 = 4294967296;
const TWO_53 = 9007199254740992;

/**
 * 32-bit FNV-1a over the UTF-16 code units of `name` (the names are ASCII, so this is the bytes).
 * @param name - the domain name
 * @returns the unsigned 32-bit hash
 */
export function domainId(name: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        h ^= name.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Throw unless `seed` is a safe non-negative integer.
 * @param seed - the seed
 */
export function checkSeed(seed: number): void {
    if (!Number.isSafeInteger(seed) || seed < 0) {
        throw new RangeError(`seed must be an integer in [0, 2^53), got ${String(seed)}`);
    }
}

/** A deterministic stream of random words keyed by (seed, domain, block). */
export class RandomStream {
    private readonly seedLo: number;
    private readonly seedHi: number;
    private readonly domain: number;
    private readonly key = new Uint32Array(2);
    private readonly out = new Uint32Array(2);
    private counter = 0;
    private spare = -1;

    /**
     * The stream of one block.
     * @param seed - the caller's seed, an integer in [0, 2^53)
     * @param domain - the generator's fixed domain name
     * @param block - the first block, an integer in [0, 2^32)
     */
    constructor(seed: number, domain: string, block: number) {
        checkSeed(seed);
        this.seedLo = seed >>> 0;
        this.seedHi = Math.floor(seed / TWO_32);
        this.domain = domainId(domain);
        this.reset(block);
    }

    /**
     * Restart the stream at the first word of another block of the same seed and domain.
     * @param block - the block, an integer in [0, 2^32)
     */
    reset(block: number): void {
        threefry2x32(this.seedLo, this.seedHi, this.domain, block >>> 0, this.key);
        this.counter = 0;
        this.spare = -1;
    }

    /**
     * The next word.
     * @returns an unsigned 32-bit integer
     */
    nextU32(): number {
        if (this.spare >= 0) {
            const word = this.spare;
            this.spare = -1;
            return word;
        }
        const c = this.counter++;
        threefry2x32(this.key[0], this.key[1], c >>> 0, Math.floor(c / TWO_32), this.out);
        this.spare = this.out[1];
        return this.out[0];
    }

    /**
     * A uniform double in [0, 1) with 53 random bits: (a >>> 5) * 2^26 + (b >>> 6), over 2^53,
     * for the next two words a and b. Exact: every step is an integer below 2^53.
     * @returns the double
     */
    nextFloat(): number {
        const a = this.nextU32() >>> 5;
        const b = this.nextU32() >>> 6;
        return (a * 67108864 + b) / TWO_53;
    }

    /**
     * A uniform integer in [0, n) by masked rejection: draw a word, keep its low
     * ceil(log2 n) bits, retry while the result is >= n. Exact and unbiased; fewer than two
     * words per call on average. For n above 2^32 the high bits come from one extra word drawn
     * first.
     * @param n - the bound, an integer in [1, 2^53]
     * @returns the integer
     */
    nextBelow(n: number): number {
        if (n <= TWO_32) {
            const mask = n === 1 ? 0 : 0xffffffff >>> Math.clz32(n - 1);
            for (;;) {
                const x = (this.nextU32() & mask) >>> 0;
                if (x < n) {
                    return x;
                }
            }
        }
        const hiBound = Math.ceil(n / TWO_32);
        const hiMask = 0xffffffff >>> Math.clz32(hiBound - 1);
        for (;;) {
            const hi = (this.nextU32() & hiMask) >>> 0;
            const x = hi * TWO_32 + this.nextU32();
            if (x < n) {
                return x;
            }
        }
    }

    /**
     * The number of failures before the next success of a Bernoulli(p) sequence, given
     * `logQ = detLog(1 - p)` for 0 < p < 1: floor(detLog(1 - u) / logQ) for u = nextFloat().
     * The caller handles p = 0 and p = 1 without drawing.
     * @param logQ - detLog(1 - p), negative and finite
     * @returns a non-negative integer (possibly above 2^53 for tiny p)
     */
    nextSkip(logQ: number): number {
        return Math.floor(detLog(1 - this.nextFloat()) / logQ);
    }
}
