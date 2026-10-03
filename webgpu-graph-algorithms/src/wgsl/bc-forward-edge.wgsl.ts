/**
 * The `bc-forward-edge` kernel body (design 8.4 "the McLaughlin-Bader online switch to the edge-parallel form", 8.8
 * row 7): one level of a betweenness batch's forward pass, edge-parallel -- every logical edge of the `edgeList` view
 * for every source of the batch, grid-striding over the edges inside a loop over the k sources. For the edge `(u, x)`
 * and source `s`, when `depth[s][u]` is the level the edge is relaxed toward `x` with EXACTLY the claim and the count
 * of `bc-forward` (the pre-check, `atomicMin`, the winner appends `s * n + x` to the same claim log, every arc on a
 * shortest path adds `sigma[s][u]`, a u32 wrap raises word 27); `UNDIRECTED` relaxes the other direction too, the
 * edge list holding each undirected edge once. Under `SCALED` the count is skipped, as in `bc-forward`. So the two forward bodies are interchangeable level by level and the
 * backward pass cannot tell which ran. A workgroup does nothing when the level is empty (the done boundary). The
 * winners of a strip are packed into the log with one global `atomicAdd` per strip; every barrier is in uniform
 * control flow (the loop bounds are uniforms and the workgroup id). Body only; the sabotage rows of
 * test/helpers/sabotage.ts are textual edits of it.
 */
export const bcForwardEdgeWgsl = /* wgsl */ `
var<workgroup> wlive: u32;                        // 1 when the level has entries
var<workgroup> wwon: atomic<u32>;                 // the strip's winners
var<workgroup> wbase: u32;                        // where the strip's winners go in the log

fn claim(x: u32, next: u32) -> bool {
    if (atomicLoad(&depthK[x]) != INVALID_INDEX) { return false; }   // the pre-check of design 16.1
    return atomicMin(&depthK[x], next) == INVALID_INDEX;
}

fn count_paths(origin: u32, x: u32, next: u32) {
    if (!SCALED && atomicLoad(&depthK[x]) == next) {                 // every arc on a shortest path adds
        let add = atomicLoad(&sigmaK[origin]);
        let old = atomicAdd(&sigmaK[x], add);
        if (old + add < old) { atomicOr(&counters[27], 1u); }        // the u32 wrap, reported
    }
}

@compute @workgroup_size(WG)
fn bc_forward_edge(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let level = atomicLoad(&counters[11]);
    if (lid.x == 0u) { wlive = select(0u, 1u, ends[level + 1u] > ends[level]); }
    if (workgroupUniformLoad(&wlive) == 0u) { return; }              // uniform: nothing below runs on an empty level
    let next = level + 1u;
    for (var s = 0u; s < P.k; s = s + 1u) {
        let base = s * P.n;
        for (var e0 = group_id(wid) * WG; e0 < P.count; e0 = e0 + P.stride) {   // grid-stride over the edges
            let e = e0 + lid.x;
            var a = INVALID_INDEX;                                   // the claims this lane won
            var b = INVALID_INDEX;
            if (e < P.count) {
                let u = base + edgeSrc[e];
                let x = base + edgeDst[e];
                if (atomicLoad(&depthK[u]) == level) {
                    if (claim(x, next)) { a = x; }
                    count_paths(u, x, next);
                }
                if (UNDIRECTED) {                                    // the other direction of an undirected edge
                    if (atomicLoad(&depthK[x]) == level) {
                        if (claim(u, next)) { b = u; }
                        count_paths(x, u, next);
                    }
                }
            }
            let mine = select(0u, 1u, a != INVALID_INDEX) + select(0u, 1u, b != INVALID_INDEX);
            var slot = 0u;
            if (mine != 0u) { slot = atomicAdd(&wwon, mine); }
            workgroupBarrier();
            if (lid.x == 0u) {
                wbase = atomicAdd(&counters[26], atomicLoad(&wwon));   // stackTop: one global atomic per strip
                atomicStore(&wwon, 0u);
            }
            workgroupBarrier();
            if (a != INVALID_INDEX) {
                S[wbase + slot] = a;
                slot = slot + 1u;
            }
            if (b != INVALID_INDEX) { S[wbase + slot] = b; }
        }
    }
}
`;
