/**
 * G7, the `grid-near-field` kernel body (spec 7.7, 7.6, 7.20; P4-T10, P4-T13; D24): per node `i = sortedIdx[t]`, the
 * exact pair law of K3 (`LAW` 0: `|F| = k m_i m_j / d` with the 0.01 floor; `LAW` 1: FR's unfloored `k^2 / d`;
 * `LAW` 2: the unfloored coulomb `-g m_i m_j / d^2`; the antisymmetric coincident kick at the law's magnitude at
 * d = 0.01, PD-22) over the 9 (27) finest
 * cells around its own, or over the 2^dim outside pseudo-cells (one per orthant, issue #90) for an outside node; a cell above `nearMax` entries
 * is sampled by `nearMax` INDEPENDENT draws with replacement, draw `k` reading the slot
 * `lowbias32(((c ^ (iteration * 0x9E3779B9)) ^ seed) ^ (k * 0x85EBCA6B)) % count` (every slot's inclusion
 * probability is `nearMax / count` whatever its position in the sorted order, so a duplicated draw is counted twice
 * and the node itself, when drawn, is skipped and not replaced), and scaled by `others / sampled` where `sampled` is
 * the realised number of draws that were not the node (the Horvitz-Thompson form of PD-15 / DEP-P4-K: given
 * `sampled = s`, those `s` draws are i.i.d. uniform over the `others` slots, so the expectation of the scaled sum is
 * the exact cell sum whenever `s >= 1`; the G4 record's G4-F2 row carries the measurement); then
 * the fused epilogue of K3 (gravity, `force +=`, the swing / traction workgroup reduction in uniform control flow).
 * The helpers `load_force`, `store_force`, `load_old`, `kick_magnitude`, `gravity_force` and the epilogue are K3's
 * text. Body only; normative text.
 */
export const gridNearFieldWgsl = /* wgsl */ `
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_old(i: u32) -> vec3f { return vec3f(oldForce[3u * i], oldForce[3u * i + 1u], oldForce[3u * i + 2u]); }
fn gravity_force(pi: vec4f) -> vec3f {                         // spec 7.9: centroid (GRAVITY_CENTER 0) or origin (1); regular or strong
    var q = pi.xyz;
    if (GRAVITY_CENTER == 0u) { q = pi.xyz - S.centroid.xyz; }
    if (STRONG_GRAVITY) { return -P.gravity * pi.w * q; }
    let d = length(q);
    if (d > FA2_DIST_FLOOR) { return -P.gravity * pi.w * q / d; }
    return vec3f(0.0);
}
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }
fn kick_magnitude(mi: f32, mj: f32) -> f32 {                   // the law's magnitude at d = FA2_DIST_FLOOR (the P5 plan's PD-10)
    if (LAW == 1u) { return P.frK * P.frK / FA2_DIST_FLOOR; }
    if (LAW == 2u) { return -P.coulomb * mi * mj / FA2_DIST_FLOOR_SQ; }
    return P.scalingRatio * mi * mj / FA2_DIST_FLOOR;
}
fn pair_force(i: u32, pi: vec4f, jj: u32, o: vec4f) -> vec3f {  // the exact pair law of K3 (7.6, 7.20): the floor (FA2 only), the coincident kick
    let d = pi.xyz - o.xyz;
    var d2 = dot(d, d);
    if (d2 < FA2_COINCIDENT_SQ) { return kick_dir(i, jj, P.dim) * kick_magnitude(pi.w, o.w); }
    if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }
    let k = P.scalingRatio * pi.w * o.w;
    if (LAW == 1u) { return d * (P.frK * P.frK / d2); }
    if (LAW == 2u) { return d * (-P.coulomb * pi.w * o.w / (d2 * sqrt(d2))); }
    return d * (k / d2);
}
fn cell_sum(i: u32, pi: vec4f, c: u32, own: bool) -> vec3f {     // one finest cell: exact below nearMax entries, Horvitz-Thompson above (PD-15)
    let start = cellStart[c];
    let count = cellStart[c + 1u] - start;
    var f = vec3f(0.0);
    if (count <= P.nearMax) {
        for (var k = start; k < start + count; k = k + 1u) {
            let jj = sortedIdx[k];
            if (jj != i) { f = f + pair_force(i, pi, jj, pos[jj]); }
        }
        return f;
    }
    let base = (c ^ (P.iterationIndex * 0x9E3779B9u)) ^ P.seed;                  // the per-iteration draw seed (7.16)
    var sampled = 0u;
    for (var k = 0u; k < P.nearMax; k = k + 1u) {
        let jj = sortedIdx[start + (lowbias32(base ^ (k * 0x85EBCA6Bu)) % count)];   // draw k: independent inclusion, with replacement (PD-15)
        if (jj == i) { continue; }
        f = f + pair_force(i, pi, jj, pos[jj]);
        sampled = sampled + 1u;
    }
    if (sampled == 0u) { return vec3f(0.0); }
    let others = select(count, count - 1u, own);
    return f * (f32(others) / f32(sampled));                     // others / sampled over the realised sample (DEP-P4-K)
}

@compute @workgroup_size(WG)
fn grid_near_field(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let t = linear_id(wid, lid.x);
    let valid = t < P.n;
    var i = 0u;
    var pi = vec4f(0.0);
    var f = vec3f(0.0);
    if (valid) {
        i = sortedIdx[t];                                          // sorted order (D24)
        pi = pos[i];
        let gf = f32(P.gridMax);
        let q = (pi.xyz - S.gridMin.xyz) * S.invCellSize;
        var c0 = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
        if (P.dim == 2u) { c0.z = 0; }                             // 2D: the one z plane
        let g = i32(P.gridMax);
        var inside = c0.x >= 0 && c0.x < g && c0.y >= 0 && c0.y < g;
        if (P.dim == 3u) { inside = inside && c0.z >= 0 && c0.z < g; }
        if (inside) {
            let zr = select(0, 1, P.dim == 3u);
            for (var dz = -zr; dz <= zr; dz = dz + 1) {
                for (var dy = -1; dy <= 1; dy = dy + 1) {
                    for (var dx = -1; dx <= 1; dx = dx + 1) {
                        let cx = c0.x + dx;
                        let cy = c0.y + dy;
                        let cz = c0.z + dz;
                        if (cx < 0 || cx >= g || cy < 0 || cy >= g || cz < 0 || cz >= g) { continue; }
                        let c = u32(cx) + P.gridMax * (u32(cy) + select(0u, P.gridMax * u32(cz), P.dim == 3u));
                        f = f + cell_sum(i, pi, c, dx == 0 && dy == 0 && dz == 0);
                    }
                }
            }
        } else {
            var own = grid_cells() + select(0u, 1u, c0.x >= g / 2) + select(0u, 2u, c0.y >= g / 2);   // G1's orthant key
            if (P.dim == 3u) { own = own + select(0u, 4u, c0.z >= g / 2); }
            for (var o = grid_cells(); o < grid_cells() + select(4u, 8u, P.dim == 3u); o = o + 1u) {   // an outside node: every outside pseudo-cell
                f = f + cell_sum(i, pi, o, o == own);
            }
        }
    }
    // epilogue (7.9, 7.10): gravity and force += under the guard, the swing / traction reduction outside it (K3's text)
    var sw = 0.0;
    var tr = 0.0;
    if (valid) {
        f = f + gravity_force(pi);
        let fnew = load_force(i) + f;
        store_force(i, fnew);
        if (SWING_MODE == 1u) {                                    // NetworkX: positions and forces mixed, every node (7.2)
            sw = pi.w * length(pi.xyz - fnew);
            tr = 0.5 * pi.w * length(pi.xyz + fnew);
        } else if (!mask_bit(fixedMask[i >> 5u], i)) {             // paper: free nodes only
            let fold = load_old(i);
            sw = pi.w * length(fnew - fold);
            tr = 0.5 * pi.w * length(fnew + fold);
        }
    }
    let tt = wg_reduce_vec4(vec4f(sw, tr, 0.0, 0.0), lid.x, 0u);   // uniform control flow: 256 -> 1
    if (lid.x == 0u) { partials[group_id(wid)].swingTraction = tt.xy; }
}
`;
