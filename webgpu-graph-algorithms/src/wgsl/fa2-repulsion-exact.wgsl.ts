/**
 * The `fa2-repulsion-exact` kernel body (K3; contract 4.5; spec 7.6, 7.9, 7.10): the tiled all-pairs repulsion
 * `|F| = k m_i m_j / d` with the 0.01 distance floor and the antisymmetric coincident kick (`LAW` 0; P5's `LAW` 1
 * is Fruchterman-Reingold `k^2 / d` and `LAW` 2 ngraph's Coulomb `-g m_i m_j / d^2`, both unfloored, spec 7.20,
 * with the kick's magnitude taken from the law at d = 0.01, PD-10), the gravity epilogue
 * (GRAVITY_CENTER 0 = centroid, 1 = origin; STRONG_GRAVITY) added under the `valid` guard, `force += f`, and the
 * swing / traction workgroup reduction in uniform control flow (SWING_MODE 0 = paper: free nodes only against
 * `oldForce`; 1 = NetworkX: positions and forces mixed, every node) whose lane 0 writes
 * `partials[group].swingTraction`. `pos` is `array<vec4f>` with the mass in `.w`; `force` / `oldForce` are stride-3
 * `array<f32>` read through the per-body helpers (4.4 rule 6). Normative text, copied verbatim: the P1-T5 sabotage
 * rows (gravity sign, `k / d2`, the `jj != i` guard, the `.w` mass lane) are textual edits of this string.
 * The j range is split into passes of at most EXACT_TILES_PER_PASS tiles (issue #87: llvmpipe's per-invocation loop
 * budget); an earlier pass adds its partial sum into `force`, the last one runs gravity and the epilogue. A graph of
 * at most 32,768 nodes is one pass, bitwise the single-pass kernel. Record it through recordExactRepulsion.
 */
export const fa2RepulsionExactWgsl = /* wgsl */ `
var<workgroup> tile: array<vec4f, WG>;                         // xyz + mass, 4 KiB at WG = 256

fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn store_force(i: u32, f: vec3f) {
    force[3u * i] = f.x;
    force[3u * i + 1u] = f.y;
    force[3u * i + 2u] = f.z;
}
fn load_old(i: u32) -> vec3f { return vec3f(oldForce[3u * i], oldForce[3u * i + 1u], oldForce[3u * i + 2u]); }
fn kick_magnitude(mi: f32, mj: f32) -> f32 {                   // the law's magnitude at d = FA2_DIST_FLOOR (PD-10)
    if (LAW == 1u) { return P.frK * P.frK / FA2_DIST_FLOOR; }
    if (LAW == 2u) { return -P.coulomb * mi * mj / FA2_DIST_FLOOR_SQ; }
    return P.scalingRatio * mi * mj / FA2_DIST_FLOOR;
}
fn gravity_force(pi: vec4f) -> vec3f {                         // spec 7.9: centroid (GRAVITY_CENTER 0) or origin (1); regular or strong
    var q = pi.xyz;
    if (GRAVITY_CENTER == 0u) { q = pi.xyz - S.centroid.xyz; }
    if (STRONG_GRAVITY) { return -P.gravity * pi.w * q; }
    let d = length(q);
    if (d > FA2_DIST_FLOOR) { return -P.gravity * pi.w * q / d; }
    return vec3f(0.0);
}

@compute @workgroup_size(WG)
fn repulsion(
    @builtin(workgroup_id) wid: vec3<u32>,
    @builtin(local_invocation_id) lid: vec3<u32>,
    @builtin(num_workgroups) nwg: vec3<u32>,
) {
    // issue #87: pass p of the tile range is dispatched with p + 1 z slices; only the last slice works, so the pass
    // index needs no uniform. Uniform: keyed on workgroup_id and num_workgroups only.
    if (wid.z + 1u < nwg.z) { return; }
    let i = linear_id(wid, lid.x);
    let valid = i < P.n;
    var pi = vec4f(0.0);
    if (valid) { pi = pos[i]; }
    var f = vec3f(0.0);
    let tiles = (P.n + WG - 1u) / WG;
    let tileBegin = (nwg.z - 1u) * EXACT_TILES_PER_PASS;
    let tileEnd = min(tiles, tileBegin + EXACT_TILES_PER_PASS);
    for (var t = tileBegin; t < tileEnd; t = t + 1u) {
        let j = t * WG + lid.x;
        if (j < P.n) { tile[lid.x] = pos[j]; } else { tile[lid.x] = vec4f(0.0); }   // guarded fill; mass 0 marks the pad
        workgroupBarrier();                                                       // uniform: every invocation reaches it
        for (var s = 0u; s < WG; s = s + 1u) {
            let o = tile[s];
            let jj = t * WG + s;
            if (o.w > 0.0 && jj != i) {                                           // mass > 0 for every real node, 0 for the pad
                let d = pi.xyz - o.xyz;
                var d2 = dot(d, d);
                if (d2 < FA2_COINCIDENT_SQ) {                                     // coincident: antisymmetric unit kick of the law's magnitude at d = 0.01 (7.2; PD-10)
                    f = f + kick_dir(i, jj, P.dim) * kick_magnitude(pi.w, o.w);
                    continue;
                }
                if (LAW == 0u) { d2 = max(d2, FA2_DIST_FLOOR_SQ); }               // FA2 alone floors d >= 0.01 (7.2); FR and coulomb are unfloored (7.20)
                let k = P.scalingRatio * pi.w * o.w;
                if (LAW == 0u) { f = f + d * (k / d2); }                          // LAW 0 (FA2): |F| = k m_i m_j / d along d / d
                if (LAW == 1u) { f = f + d * (P.frK * P.frK / d2); }              // LAW 1 (FR, 7.20): |F| = k^2 / d, mass ignored
                if (LAW == 2u) { f = f + d * (-P.coulomb * pi.w * o.w / (d2 * sqrt(d2))); }   // LAW 2 (coulomb, ngraph generateQuadTree.js:131-132): |F| = -g m_i m_j / d^2
            }
        }
        workgroupBarrier();
    }
    if (tileEnd < tiles) {                                                        // an earlier pass: its partial sum only (uniform: P.n, nwg)
        if (valid) { store_force(i, load_force(i) + f); }
        return;
    }
    // epilogue (7.9, 7.10): gravity and force += under the guard, the swing / traction reduction outside it
    var sw = 0.0;
    var tr = 0.0;
    if (valid) {
        f = f + gravity_force(pi);
        let fnew = load_force(i) + f;
        store_force(i, fnew);
        if (SWING_MODE == 1u) {                                                   // NetworkX: positions and forces mixed, every node (7.2)
            sw = pi.w * length(pi.xyz - fnew);
            tr = 0.5 * pi.w * length(pi.xyz + fnew);
        } else if (!mask_bit(fixedMask[i >> 5u], i)) {                            // paper: free nodes only (Gephi ForceAtlas2.java 283-293)
            let fold = load_old(i);
            sw = pi.w * length(fnew - fold);
            tr = 0.5 * pi.w * length(fnew + fold);
        }
    }
    let t = wg_reduce_vec4(vec4f(sw, tr, 0.0, 0.0), lid.x, 0u);                   // uniform control flow: 256 -> 1
    if (lid.x == 0u) { partials[group_id(wid)].swingTraction = t.xy; }
}
`;
