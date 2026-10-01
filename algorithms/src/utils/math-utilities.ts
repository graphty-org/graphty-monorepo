/**
 * mulberry32: 32-bit state, output in [0, 1). Every step is exact 32-bit integer arithmetic
 * (`Math.imul`), so the sequence is the reference one on every engine. The exact sequence is part
 * of the result contract of every seeded algorithm: changing it changes their results.
 * @param seed - Generator seed; only its low 32 bits are used
 * @returns The generator
 */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
