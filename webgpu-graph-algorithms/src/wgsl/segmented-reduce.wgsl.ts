/**
 * The `segmented-reduce` kernel body (spec 6 row 3; contract 4.5) in its three degree tiers (P4-T5, PD-6). Every
 * tier folds the VALUE snippet over a row's arcs inside the bound window [P.arcBase, P.arcEnd) and writes out[i]
 * as f32 (a row with no arcs gets the identity element: 0 for sum, F32_MAX for min, -F32_MAX for max); the row is
 * `perm[row]` under USE_PERM and `row` otherwise, over the rows [P.start, P.end) of the dispatch. TIER 0 is one row
 * per thread (no barrier, so its early return is legal); TIER 1 is 32 lanes per row and WG / 32 rows per workgroup,
 * reduced by a five-step tree in workgroup memory (bitwise the same on every subgroup size); TIER 2 is one row per
 * workgroup through `wg_reduce_f32` of the prelude (the subgroup variant when the feature exists, the workgroup twin
 * otherwise -- hence `needs: ["subgroups"]`). The tier bodies are functions called under `if (TIER == 0u)`, an
 * override, so every barrier is reached in uniform control flow. The body is normative: a sabotage mutation
 * (test/helpers/sabotage.ts) is a textual edit of it, so it is not restyled.
 *
 * TIER 0 folds its row through `row_fold_dense`, a stride-one copy of `row_fold`, because the shader compiler emits
 * `row_fold(i, 0u, 1u)` as a call and leaves the stride in a parameter: the loop then walks the row with a runtime
 * step, which costs the strength-reduced addressing into colIdx / weights and the unrolling that keeps several loads
 * in flight per thread. PageRank's out-weight pass, the only caller that passes no tiers today, runs TIER 0 alone,
 * and under the tiers TIER 0 still folds the low-degree rows, which are most of them. The two folds spell their
 * locals apart (`lo` / `hi` / `k` against `a0` / `a1`) so that each sabotage row names exactly one of them; the
 * VALUE snippet sees the same `row`, `arc`, `nbr` and `weight` in both.
 */

/**
 * Entry point `segmented_reduce`; overrides OP (0 sum, 1 min, 2 max) and TIER (0 thread-per-row, 1 32-lanes-per-row,
 * 2 workgroup-per-row); snippet slot VALUE: statements assigning `v` from `row`, `arc`, `nbr`, `weight` (`target`
 * is a WGSL reserved word, hence `nbr`).
 */
export const segmentedReduceWgsl = /* wgsl */ `
fn identity() -> f32 { if (OP == 1u) { return F32_MAX; } if (OP == 2u) { return -F32_MAX; } return 0.0; }
fn comb(a: f32, b: f32) -> f32 { if (OP == 1u) { return min(a, b); } if (OP == 2u) { return max(a, b); } return a + b; }
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_fold(i: u32, lane: u32, step: u32) -> f32 {              // the arcs of row i this lane walks inside the bound window [P.arcBase, P.arcEnd)
    let row = i;                                                 // the CSR row the VALUE snippet may name (the node index, under USE_PERM too)
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var acc = identity();
    for (var arc = a0 + lane; arc < a1; arc = arc + step) {
        let nbr = colIdx[arc - P.arcBase];               // the neighbour index (\`target\` is a WGSL reserved word)
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
        var v = 0.0;
        //@@VALUE@@
        acc = comb(acc, v);
    }
    return acc;
}
fn row_fold_dense(i: u32) -> f32 {                              // TIER 0's stride-one twin of row_fold (see the header)
    let row = i;                                                 // the CSR row the VALUE snippet may name (as in row_fold)
    let lo = max(rowPtr[i], P.arcBase);
    let hi = min(rowPtr[i + 1u], P.arcEnd);
    var acc = identity();
    for (var arc = lo; arc < hi; arc = arc + 1u) {
        let k = arc - P.arcBase;                         // the window-local index; this walk is contiguous
        let nbr = colIdx[k];
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[k]; }
        var v = 0.0;
        //@@VALUE@@
        acc = comb(acc, v);
    }
    return acc;
}
fn finish(i: u32, acc: f32) { out[i] = select(acc, comb(out[i], acc), P.accumulate == 1u); }
fn tier0(wid: vec3<u32>, lane: u32) {                            // TIER 0: one row per thread over [P.start, P.end); no barrier, so the early return is legal (3.5 rule 1)
    let row = linear_id(wid, lane) + P.start;
    if (row >= P.end) { return; }
    let i = row_node(row);
    finish(i, row_fold_dense(i));
}

var<workgroup> sh: array<f32, WG>;
var<workgroup> handoff: array<f32, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                            // TIER 1: 32 lanes per row, WG / 32 rows per workgroup; TIER 2: WG lanes per row (PD-6)
    let g = group_id(wid);
    var row = P.start + g;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.start + g * (WG / 32u) + lid / 32u; lane = lid % 32u; step = 32u; }
    let valid = row < P.end;
    var i = 0u;
    var acc = identity();
    if (valid) { i = row_node(row); acc = row_fold(i, lane, step); }
    if (TIER == 1u) {
        sh[lid] = acc;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = identity();
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = comb(sh[lid], t);
            workgroupBarrier();
        }
        // the row total rides a second array and is stored by lane 31, which reads the group's BASE slot -- one it
        // never wrote, so no store of its own can be forwarded in the load's place (src/wgsl/scan-block.wgsl.ts
        // names the compiler effect); the row, "valid" and the destination are uniform across the group's 32
        // lanes, so lane 31 stores exactly what lane 0 would have
        handoff[lid] = sh[lid];
        workgroupBarrier();
        if (valid && lane == 31u) { finish(i, handoff[lid - 31u]); }
    }
    if (TIER == 2u) {
        let t = wg_reduce_f32(acc, lid, OP);                     // the workgroup tree of the prelude (subgroup variant when available)
        if (valid && lid == 0u) { finish(i, t); }
    }
}

@compute @workgroup_size(WG)
fn segmented_reduce(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}
`;
