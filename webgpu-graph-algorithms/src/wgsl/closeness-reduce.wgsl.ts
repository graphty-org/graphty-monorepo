/**
 * The `closeness-reduce` kernel body (design 8.4, 9.7 "integer distances before division"; P8-T11, the P8 plan's
 * PD-13): the one-lane bookkeeping of the bit-parallel sweep, two roles by `P.role`. Role 0 is the level boundary,
 * recorded BEFORE the level's `compact` and sweep: `done` is whether the previous level's compacted count is 0 (so the
 * traversal ends one level after the last claim, one empty sweep and no wrong sum), then for every source `s` the
 * claims the level just run made (`newCount[s]`) are folded into `reached[s]` and into the 64-bit `sum[s]` at the
 * distance `level + 1` -- the product as a 16-bit split into a low and a high word, then the add with its carry --
 * `newCount[s]` is zeroed and `level` advances. Role 1 is the seed of a batch: for the batch's `k = min(32, n -
 * P.source)` sources, bit `s` into `visited[source_s]` and into the frontier region level 0 reads (region 1, since
 * level 0's parity is 0), `flags[source_s] = 1` (level 0's `compact` turns the flags into the list; a seeded list
 * would be overwritten by a compaction of all-zero flags), `counters[0] = k` (not done) and `level = U32_MAX` (so
 * level 0's boundary accumulates nothing and brings the word to 0, and level 1's counts the distance-1 claims at 1).
 * No barrier follows the early return of the other lanes (3.5 rule 1). Body only (spec 3.5, D9); the text is
 * normative: the sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const closenessReduceWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn closeness_reduce(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                     // one lane; no barrier follows (3.5 rule 1)
    if (P.role == 1u) {                                              // the seed of a batch: P.source is its first source
        let k = min(32u, P.n - P.source);
        for (var s = 0u; s < k; s = s + 1u) {
            let v = P.source + s;
            let bit = 1u << s;
            bits[v] = bit;                                           // visited
            bits[P.bitsBase + v] = bit;                              // the frontier level 0 reads (region 1: level 0's parity is 0)
            bits[3u * P.bitsBase + v] = 1u;                          // flags: level 0's compact turns them into the list
        }
        atomicStore(&counters[0], k);                                // not done
        atomicStore(&counters[11], U32_MAX);                         // level: the first boundary brings it to 0
        atomicStore(&counters[15], 0u);                              // done
        return;
    }
    // role 0: the level boundary -- done from the previous level's compacted count, then the accumulation
    let count = atomicLoad(&counters[0]);
    atomicStore(&counters[15], select(0u, 1u, count == 0u));
    let level = atomicLoad(&counters[11]);
    let d = level + 1u;                                              // the distance of the claims the level just run made
    for (var s = 0u; s < 32u; s = s + 1u) {
        let c = atomicLoad(&perSource[s]);                           // newCount[s]
        atomicStore(&perSource[32u + s], atomicLoad(&perSource[32u + s]) + c);   // reached[s]
        // sum[s] += c x d in 64 bits: the 16-bit split product (pLo, pHi), then the add with its carry
        let cLo = c & 0xFFFFu;
        let cHi = c >> 16u;
        let dLo = d & 0xFFFFu;
        let dHi = d >> 16u;
        let ll = cLo * dLo;
        let lh = cLo * dHi;
        let hl = cHi * dLo;
        let mid = (ll >> 16u) + (lh & 0xFFFFu) + (hl & 0xFFFFu);
        let pLo = (ll & 0xFFFFu) | ((mid & 0xFFFFu) << 16u);
        let pHi = (cHi * dHi) + (lh >> 16u) + (hl >> 16u) + (mid >> 16u);
        var lo = atomicLoad(&perSource[64u + s]);                    // sumLo[s]
        var hi = atomicLoad(&perSource[96u + s]);                    // sumHi[s]
        let before = lo;
        lo = lo + pLo;
        hi = hi + pHi + select(0u, 1u, lo < before);
        atomicStore(&perSource[64u + s], lo);
        atomicStore(&perSource[96u + s], hi);
        atomicStore(&perSource[s], 0u);
    }
    atomicStore(&counters[11], level + 1u);
}
`;
