/**
 * The `bfs-bitset-build` kernel body (design 8.4 "the bitset frontier"; P8-T8): the vertex-list-to-bitset hand-off
 * of a bottom-up level. One invocation per entry of the input frontier (`frontierCount`, word 0), each `atomicOr`ing
 * its vertex's bit into the `ceil(n / 32)`-word bitset at `P.bitsBase` inside the `sweepIn` buffer (the region a
 * `fill` from `SLOT.fillBits` zeroed just before). The design's "bulk non-atomic path when the frontier is >= 40% of
 * n" iterates WORDS of a frontier that is already a bitset; this frontier is a vertex list, so a word-owning store
 * has nothing to iterate and `atomicOr` per vertex is the whole kernel. The sweep appends what it claims as a plain
 * vertex list, exactly as the contract does, and writes no second bitset: the next level's bits come from this
 * kernel running over that list, so one representation of a frontier (a vertex list plus a count) serves the whole
 * phase and the hand-off in either direction is free. The early return keys on a counter and `local_invocation_id`
 * with no barrier after it (spec 3.5 rule 1). Body only (spec 3.5, D9); the text is normative: the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const bfsBitsetBuildWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn bfs_bitset_build(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= atomicLoad(&counters[0])) { return; }                   // frontierCount; no barrier follows
    let v = frontierIn[i];
    atomicOr(&bits[P.bitsBase + (v >> 5u)], 1u << (v & 31u));
}
`;
