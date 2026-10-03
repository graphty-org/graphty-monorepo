/**
 * The `bc-finalize` kernel body (design 8.4, 5.4): the one-lane bookkeeping of a betweenness source batch, two roles
 * by `P.role`. The batch keeps ONE append-only claim log `S` -- every `(vertex, source)` pair the forward pass
 * claims, packed as the index `s * n + v` into the `n x k` arrays -- and `ends`, the level boundaries into it: the
 * entries at depth `L` are `S[ends[L] .. ends[L + 1])`. That log is Brandes' stack, so the backward pass walks the
 * same ranges from the deepest level up and nothing is ever copied between levels.
 *
 * Role 1 seeds the batch: the k seed entries the host wrote into `S[0 .. k)` get depth 0 and one shortest path (the
 * u32 1, or under `SCALED` the bits of the f32 1.0), `levelMax[0]` the bits of 1.0 (the largest count at depth 0,
 * which `bc-count` scales depth 1 from), `ends[0] = 0`, the append cursor `stackTop` (counters word 26) starts at k, the overflow flag (word 27) is cleared,
 * `level` (word 11) is U32_MAX so the first boundary lands on 0, and `done` (word 15) is cleared.
 *
 * Role 0 is the level boundary, recorded before every forward level: it advances `level`, closes the level just
 * claimed by writing `ends[level + 1] = stackTop`, publishes the new level's size in `frontierCount` (word 0) and sets
 * `done` when that level is empty. A boundary that finds `done` set moves nothing, so the levels the host records
 * past the end are no-ops. The forward kernels dispatch directly and read their range from `ends` (no indirect
 * dispatch: design/decisions/2026-09-25-frontier-kernels-dispatch-directly.md). One lane; no barrier follows the
 * early return of the others (spec 3.5 rule 1). Body only; the sabotage rows of test/helpers/sabotage.ts are
 * textual edits of it.
 */
export const bcFinalizeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bc_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                     // one lane; no barrier follows (3.5 rule 1)
    if (P.role == 1u) {                                              // the seed of a batch
        for (var i = 0u; i < P.k; i = i + 1u) {
            let t = S[i];
            depthK[t] = 0u;                                          // the source is at depth 0
            sigmaK[t] = select(1u, bitcast<u32>(1.0), SCALED);       // with one shortest path, itself (f32 bits when SCALED)
        }
        levelMax[0] = bitcast<u32>(1.0);                             // the largest count at depth 0
        ends[0] = 0u;
        atomicStore(&counters[26], P.k);                             // stackTop: the seeds are the log's first k entries
        atomicStore(&counters[27], 0u);                              // sigmaOverflow
        atomicStore(&counters[11], U32_MAX);                         // level: the first boundary brings it to 0
        atomicStore(&counters[15], 0u);                              // done
        return;
    }
    if (atomicLoad(&counters[15]) != 0u) { return; }                 // done: a no-op level the host recorded past the end
    let level = atomicLoad(&counters[11]) + 1u;
    let top = atomicLoad(&counters[26]);
    ends[level + 1u] = top;                                          // the level's entries end where the log ends now
    let count = top - ends[level];
    atomicStore(&counters[0], count);                                // frontierCount (the inspect seam reads it)
    atomicStore(&counters[11], level);
    atomicStore(&counters[15], select(0u, 1u, count == 0u));         // an empty level ends the batch
}
`;
