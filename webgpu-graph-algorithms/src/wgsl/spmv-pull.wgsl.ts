/**
 * The `spmv-pull` kernel body (spec 6 row 9, 8.2; PD-1 of the M8b plan) in its three in-degree tiers (P4-T5, PD-6):
 * every tier folds `weight * xNorm[nbr]` over a row's in-arcs of the REVERSE adjacency in chunks of 64 terms (a
 * two-level f32 sum: the chunk absorbs the rounding of 64 terms, the row total the rounding of the chunk count, so a
 * 10,000-arc hub row loses about 200 rounding steps instead of 10,000; Kahan compensation is not used because
 * Metal's shader compiler folds `((acc + term) - acc) - term` to zero whatever hides it) and writes
 * `rankOut[v] = beta * pv + alpha * (sum + danglingMass * pv)`, where `pv` is `personalization[v]` when
 * HAS_PERSONALIZATION and the uniform `P.uniformP` otherwise. The rows are [P.start, P.n) of the dispatch, `perm[row]`
 * under USE_PERM: TIER 0 is grid-stride over them (one row per thread, `P.stride` from planGridStride); TIER 1 is 32
 * lanes per row and WG / 32 rows per workgroup with a five-step tree in workgroup memory (each lane keeps its own
 * 64-term chunking); TIER 2 is one row per workgroup through `wg_reduce_f32` (hence `needs: ["subgroups"]`). PageRank
 * sets alpha to the damping factor, beta to `1 - alpha` and USE_DANGLING; HITS and eigenvector set alpha 1, beta 0,
 * uniformP 0; Katz sets alpha to the attenuation, beta to its constant and uniformP 1. The body is normative: a
 * sabotage mutation (test/helpers/sabotage.ts) is a textual edit of it, so it is not restyled.
 */

/** Entry point `spmv_pull`; overrides HAS_PERSONALIZATION, USE_DANGLING and TIER (0 / 1 / 2) plus the standard USE_PERM / HAS_WEIGHTS. */
export const spmvPullWgsl = /* wgsl */ `
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_sum(v: u32, lane: u32, step: u32) -> f32 {               // this lane's arcs of row v inside the bound window, the two-level 64-term fold of the header
    let a0 = max(rowPtr[v], P.arcBase);
    let a1 = min(rowPtr[v + 1u], P.arcEnd);
    var acc = 0.0;
    var chunk = 0.0;
    var inChunk = 0u;
    for (var arc = a0 + lane; arc < a1; arc = arc + step) {
        let nbr = colIdx[arc - P.arcBase];               // \`target\` is a WGSL reserved word (spec 16.2)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
        // two-level sum: 64 terms into chunk, chunk into acc (see the header; no compensation, no select)
        chunk = chunk + (weight * xNorm[nbr]);
        inChunk = inChunk + 1u;
        if (inChunk == 64u) {
            acc = acc + chunk;
            chunk = 0.0;
            inChunk = 0u;
        }
    }
    acc = acc + chunk;
    return acc;
}
fn finish(v: u32, acc: f32) {
    var dangling = 0.0;
    if (USE_DANGLING) { dangling = partials[0].danglingMass; }
    var pv = P.uniformP;
    if (HAS_PERSONALIZATION) { pv = personalization[v]; }
    rankOut[v] = (P.beta * pv) + (P.alpha * (acc + (dangling * pv)));
}
fn tier0(wid: vec3<u32>, lane: u32) {                            // TIER 0: grid-stride over the rows [P.start, P.n); no barrier
    for (var row = linear_id(wid, lane) + P.start; row < P.n; row = row + P.stride) {
        let v = row_node(row);
        finish(v, row_sum(v, 0u, 1u));
    }
}

var<workgroup> sh: array<f32, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                            // TIER 1: 32 lanes per row; TIER 2: WG lanes per row; rows [P.start, P.n) (PD-6)
    let g = group_id(wid);
    var row = P.start + g;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.start + g * (WG / 32u) + lid / 32u; lane = lid % 32u; step = 32u; }
    let valid = row < P.n;
    var v = 0u;
    var acc = 0.0;
    if (valid) { v = row_node(row); acc = row_sum(v, lane, step); }
    if (TIER == 1u) {
        sh[lid] = acc;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = 0.0;
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = sh[lid] + t;
            workgroupBarrier();
        }
        if (valid && lane == 0u) { finish(v, sh[lid]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_f32(acc, lid, 0u);
        if (valid && lid == 0u) { finish(v, t); }
    }
}

@compute @workgroup_size(WG)
fn spmv_pull(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
`;
