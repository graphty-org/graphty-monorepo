/**
 * The generator 2.x's `SeededRandom` was, kept so the grsbm and SynC suites can replay the golden
 * records, which were taken with it. Not the package's generator: its float64 product exceeds 2^53
 * and it can return exactly 1, so the package draws from mulberry32 instead.
 * @param seed - Generator seed
 * @returns The 2.x generator
 */
export function legacySeededRandom(seed: number): () => number {
    const m = 0x80000000;
    let state = ((seed % m) + m) % m;
    return () => {
        state = (1103515245 * state + 12345) % m;
        return state / (m - 1);
    };
}
