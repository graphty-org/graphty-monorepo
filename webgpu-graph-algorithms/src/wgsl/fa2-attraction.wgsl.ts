/**
 * K2 of the ForceAtlas2 iteration, `fa2-attraction` (spec 7.5; contract 4.5): the gather of the attraction force
 * over the undirected CSR rows (both arcs present, so the sum is symmetric with no atomics), the linear or linlog
 * law, the optional weights, the distributed-action division by the mass in `pos.w`, written as the FIRST writer of
 * `force` each iteration (or combined into it under `P.accumulate`, the windowed pattern of 4.2). The arcs are read
 * inside the bound window [P.arcBase, P.arcEnd). P4-T5 (PD-6, PD-7) gives it the three degree tiers: TIER 0 is one
 * row per thread over `[P.tierStart, P.tierEnd)`; TIER 1 is 32 lanes per row over `[P.hiEnd, P.midEnd)` with a
 * five-step tree in workgroup memory; TIER 2 is one workgroup per row over `[0, P.hiEnd)` through `wg_reduce_vec4`
 * (hence `needs: ["subgroups"]`); the row is `perm[row]` under USE_PERM. `LAW` (P5, spec 7.20) picks the pair law:
 * 0 = the FA2 text, 1 = Fruchterman-Reingold `d^2 / k` (unfloored), 2 = ngraph's Hooke spring `k_s (d - L)`; under
 * 1 / 2 the models compile `LINLOG = false` and `HAS_WEIGHTS = false`, and the law overwrites `w` so weights are
 * ignored either way.
 *
 * Body only (spec 3.5, D9); normative text (contract 4.5); the K2 sabotage mutations (P3-T5, P5-T7, P4-T5 / T6) are
 * textual edits of it.
 *
 * TIER 0 folds its row through `row_force_dense`, a stride-one copy of `row_force`, because the shader compiler
 * emits `row_force(i, 0u, 1u)` as a call and leaves the stride in a parameter: the loop then walks the row with a
 * runtime step, which costs the strength-reduced addressing into colIdx / weights and the unrolling that keeps
 * several loads in flight per thread. TIER 0 runs on every load -- alone when no row reaches degree 32, and over
 * the low-degree rows, which are most of them, when the tiers are bound. The two folds spell their locals apart
 * (`arc` / `nbr` / `weight` / `total` against `a` / `j` / `w` / `f`) so that each sabotage row names exactly one
 * of them.
 */

/** The K2 body: entry point `attraction`; the tier bodies are functions called under the uniform `TIER` override, so the barriers of `tiered` are reached in uniform control flow and `tier0`'s early return is legal (spec 3.5 rule 1). */
export const fa2AttractionWgsl = /* wgsl */ `fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn row_node(row: u32) -> u32 { return select(row, perm[row], USE_PERM); }
fn row_force(i: u32, lane: u32, step: u32) -> vec3f {           // the arcs of row i this lane walks inside the bound window [P.arcBase, P.arcEnd) (4.2)
    let pi = pos[i];                                           // xyz + mass in one load (D23)
    let a0 = max(rowPtr[i], P.arcBase);
    let a1 = min(rowPtr[i + 1u], P.arcEnd);
    var f = vec3f(0.0);
    for (var a = a0 + lane; a < a1; a = a + step) {
        let j = colIdx[a - P.arcBase];
        if (j == i) { continue; }                              // a self-loop exerts no force
        var w = 1.0;
        if (HAS_WEIGHTS) { w = weights[a - P.arcBase]; }
        let d = pos[j].xyz - pi.xyz;                           // toward j
        let len = max(length(d), FA2_DIST_FLOOR);
        if (LAW == 1u) { w = length(d) / P.frK; }              // LAW 1 (FR, 7.20): |F| = d^2 / k along d / d, unfloored; the linear select below applies w as is
        if (LAW == 2u) { w = P.springCoefficient * (len - P.springLength) / len; }   // LAW 2 (spring, ngraph generateCreateSpringForce.js:33-36): Hooke k_s (d - L) toward j
        let mag = select(w, w * log(1.0 + len) / len, LINLOG); // linear: |F| = w len; linlog: |F| = w log(1 + len)
        f = f + d * mag;
    }
    return f;
}
fn row_force_dense(i: u32) -> vec3f {                          // TIER 0's stride-one twin of row_force (see the header)
    let pi = pos[i];
    let lo = max(rowPtr[i], P.arcBase);
    let hi = min(rowPtr[i + 1u], P.arcEnd);
    var total = vec3f(0.0);
    for (var arc = lo; arc < hi; arc = arc + 1u) {
        let k = arc - P.arcBase;                               // the window-local index; this walk is contiguous
        let nbr = colIdx[k];
        if (nbr == i) { continue; }                            // a self-loop exerts no force
        var weight = 1.0;
        if (HAS_WEIGHTS) { weight = weights[k]; }
        let d = pos[nbr].xyz - pi.xyz;                         // toward the neighbour
        let len = max(length(d), FA2_DIST_FLOOR);
        if (LAW == 1u) { weight = length(d) / P.frK; }         // LAW 1 (FR, 7.20), as in row_force
        if (LAW == 2u) { weight = P.springCoefficient * (len - P.springLength) / len; }   // LAW 2 (spring), as in row_force
        let mag = select(weight, weight * log(1.0 + len) / len, LINLOG);
        total = total + d * mag;
    }
    return total;
}
fn finish(i: u32, f0: vec3f) {
    var f = f0;
    if (DISTRIBUTED) { f = f / pos[i].w; }
    if (P.accumulate == 1u) { f = f + load_force(i); }         // the windowed loop of 4.2 (arcBase != 0 dispatches after the first)
    store_force(i, f);                                         // overwrites: attraction is the first writer of force each iteration
}
fn tier0(wid: vec3<u32>, lane: u32) {                          // TIER 0: one row per thread over [tierStart, tierEnd); no barrier, so the early return is legal (3.5 rule 1)
    let row = linear_id(wid, lane) + P.tierStart;
    if (row >= P.tierEnd) { return; }
    let i = row_node(row);
    finish(i, row_force_dense(i));
}

var<workgroup> sh: array<vec3f, WG>;
var<workgroup> handoff: array<vec3f, WG>;

fn tiered(wid: vec3<u32>, lid: u32) {                          // TIER 1: 32 lanes per row over [hiEnd, midEnd); TIER 2: WG lanes per row over [0, hiEnd) (PD-6, PD-7)
    let g = group_id(wid);
    var row = g;
    var end = P.hiEnd;
    var lane = lid;
    var step = WG;
    if (TIER == 1u) { row = P.hiEnd + g * (WG / 32u) + lid / 32u; end = P.midEnd; lane = lid % 32u; step = 32u; }
    let valid = row < end;
    var i = 0u;
    var f = vec3f(0.0);
    if (valid) { i = row_node(row); f = row_force(i, lane, step); }
    if (TIER == 1u) {
        sh[lid] = f;
        workgroupBarrier();
        for (var s = 16u; s >= 1u; s = s / 2u) {                 // the five-step tree over each 32-lane group; every lane runs every step
            var t = vec3f(0.0);
            if (lane < s) { t = sh[lid + s]; }
            workgroupBarrier();
            sh[lid] = sh[lid] + t;
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
        let t = wg_reduce_vec4(vec4f(f, 0.0), lid, 0u);
        if (valid && lid == 0u) { finish(i, t.xyz); }
    }
}

@compute @workgroup_size(WG)
fn attraction(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) { tier0(wid, lid.x); } else { tiered(wid, lid.x); }
}`;
