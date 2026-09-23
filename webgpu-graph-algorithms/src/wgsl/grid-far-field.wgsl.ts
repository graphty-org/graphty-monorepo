/**
 * G6, the `grid-far-field` kernel body (spec 7.7; P4-T10; D24): per node `i = sortedIdx[t]`, its finest cell
 * recomputed from `pos[i]` and the state (PD-10); for an inside node the coarsest level minus the 3x3 (3x3x3)
 * around its coarsest cell, then at every finer level the 6x6 (6x6x6) block that is the parent's 3x3 minus this
 * level's own 3x3 -- space tiled exactly once, no theta -- plus the outside pseudo-cell's centroid; for an outside
 * node the coarsest level in full and no pseudo-cell. Every cell term is the per-cell law on the mass-weighted
 * centroid (Gephi Region semantics), softened by `eps^2`: `LAW` 0 (FA2) `d * (k m_i M / d2)`, `LAW` 1 (FR, 7.20)
 * `d * (k^2 M / d2)` (mass 1 per node, so `M` is the cell's count), `LAW` 2 (coulomb) `d * (-g m_i M / d2^1.5)`
 * (P4-T13, PD-22). `force += f` (K2 wrote it). The loop bounds are `P.levels` and `P.gridMax` from the uniform,
 * not a `LEVELS` override (PD-16, DEP-P4-G). Body only; normative text.
 */
export const gridFarFieldWgsl = /* wgsl */ `
fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }
fn grid_side(level: u32) -> u32 { return P.gridMax >> level; }
fn level_base(level: u32) -> u32 {                             // the pyramid index of level L's cell 0 (level 0 carries the pseudo-cell at index cells)
    var base = 0u;
    for (var l = 0u; l < level; l = l + 1u) {
        let s = grid_side(l);
        base = base + s * s * select(1u, s, P.dim == 3u) + select(0u, 1u, l == 0u);
    }
    return base;
}
fn cell_at(level: u32, cx: i32, cy: i32, cz: i32) -> u32 {
    let s = grid_side(level);
    return level_base(level) + u32(cx) + s * (u32(cy) + select(0u, s * u32(cz), P.dim == 3u));
}
fn cell_force(pi: vec4f, q: vec4f) -> vec3f {                  // one far-field term, softened by state.eps (7.7)
    if (q.w <= 0.0) { return vec3f(0.0); }                     // an empty cell
    let d = pi.xyz - q.xyz / q.w;                              // to the mass-weighted centroid
    let d2 = dot(d, d) + S.eps * S.eps;
    if (LAW == 1u) { return d * (P.frK * P.frK * q.w / d2); }                       // LAW 1 (FR, 7.20): k^2 / d per node, q.w nodes at the centroid
    if (LAW == 2u) { return d * (-P.coulomb * pi.w * q.w / (d2 * sqrt(d2))); }     // LAW 2 (coulomb): -g m_i M_cell / d^2
    return d * (P.scalingRatio * pi.w * q.w / d2);             // LAW 0 (FA2): |F| = k m_i M_cell / d
}

@compute @workgroup_size(WG)
fn grid_far_field(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let t = linear_id(wid, lid.x);
    if (t >= P.n) { return; }                                      // no barrier follows
    let i = sortedIdx[t];                                          // sorted order (D24)
    let pi = pos[i];
    let gf = f32(P.gridMax);
    let q = (pi.xyz - S.gridMin.xyz) * S.invCellSize;              // PD-10
    var c0 = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
    if (P.dim == 2u) { c0.z = 0; }                                 // 2D: one z plane; the loops below visit cz = 0 only, so the 3x3 test must see cz - 0
    let g = i32(P.gridMax);
    var inside = c0.x >= 0 && c0.x < g && c0.y >= 0 && c0.y < g;
    if (P.dim == 3u) { inside = inside && c0.z >= 0 && c0.z < g; }
    let top = P.levels - 1u;
    let ts = i32(grid_side(top));                                  // the coarsest side (4)
    let zTop = select(0, ts - 1, P.dim == 3u);                     // z ranges: one plane in 2D
    var f = vec3f(0.0);
    if (inside) {
        let ct = c0 / i32(1u << top);                              // the node's coarsest cell
        for (var cz = 0; cz <= zTop; cz = cz + 1) {
            for (var cy = 0; cy < ts; cy = cy + 1) {
                for (var cx = 0; cx < ts; cx = cx + 1) {
                    if (abs(cx - ct.x) <= 1 && abs(cy - ct.y) <= 1 && abs(cz - ct.z) <= 1) { continue; }   // the 3x3(x3) is finer levels' work
                    f = f + cell_force(pi, pyramid[cell_at(top, cx, cy, cz)]);
                }
            }
        }
        for (var l = top; l > 0u; l = l - 1u) {                    // level l - 1: the parent's 3x3 at level l, refined, minus this level's own 3x3
            let level = l - 1u;
            let cl = c0 / i32(1u << level);
            let cp = cl / 2;
            let side = i32(grid_side(level));
            let zLo = select(0, max(0, 2 * (cp.z - 1)), P.dim == 3u);
            let zHi = select(0, min(side - 1, 2 * (cp.z + 1) + 1), P.dim == 3u);
            for (var cz = zLo; cz <= zHi; cz = cz + 1) {
                for (var cy = max(0, 2 * (cp.y - 1)); cy <= min(side - 1, 2 * (cp.y + 1) + 1); cy = cy + 1) {
                    for (var cx = max(0, 2 * (cp.x - 1)); cx <= min(side - 1, 2 * (cp.x + 1) + 1); cx = cx + 1) {
                        if (abs(cx - cl.x) <= 1 && abs(cy - cl.y) <= 1 && abs(cz - cl.z) <= 1) { continue; }
                        f = f + cell_force(pi, pyramid[cell_at(level, cx, cy, cz)]);
                    }
                }
            }
        }
        f = f + cell_force(pi, pyramid[grid_cells()]);             // the outside pseudo-cell as one far-field term
    } else {
        for (var cz = 0; cz <= zTop; cz = cz + 1) {                // an outside node: the coarsest level in full, no pseudo-cell (it would include itself)
            for (var cy = 0; cy < ts; cy = cy + 1) {
                for (var cx = 0; cx < ts; cx = cx + 1) {
                    f = f + cell_force(pi, pyramid[cell_at(top, cx, cy, cz)]);
                }
            }
        }
    }
    store_force(i, load_force(i) + f);
}
`;
