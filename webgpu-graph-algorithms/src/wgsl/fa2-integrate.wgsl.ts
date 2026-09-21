/**
 * K5 of the ForceAtlas2 iteration, `fa2-integrate` (spec 7.11; contract 4.5): the per-node speed factor
 * `speed / (1 + sqrt(speed * swing_i))` with the local swing recomputed inline (paper mode `m |F(t) - F(t-1)|`,
 * networkx mode `m |F|`, contract 4.6), the position update with no displacement clamp (D25), z never integrated
 * in 2D (spec 7.13), `oldForce` stored in paper mode for fixed nodes too (spec 7.11), and the partials A
 * (sum p, sum |p - c|^2, min, max with max |p - c|^2 in `max.w`) and C (sum |dp| over free rows, free count) in
 * uniform control flow. `APPLY` (P5, spec 7.20) picks the integrator: 0 = the FA2 text, 1 = the Fruchterman-Reingold
 * temperature cap `min(|F|, t)` along F, 2 = ngraph's semi-implicit Euler step with drag and the unit speed clamp
 * over the velocity that lives in the `oldForce` slot (PD-2), which also folds the free kinetic energy into
 * `partials.swingTraction.x` (PD-4); mode 1 folds the free force energy `sum |F|^2` into the same slot for K1's
 * adaptive cooling and takes its temperature from the state block when `FA2_FLAG_ADAPTIVE` is set. The energy
 * reduction runs under every mode; only its write is conditional.
 *
 * Body only (spec 3.5, D9); normative text (contract 4.5); the K5 sabotage mutations (P3-T5) are textual edits of it.
 */

/** The K5 body: entry point `integrate`; calls the reduction helpers (`needs: ["subgroups"]`, contract 4.3). */
export const fa2IntegrateWgsl = /* wgsl */ `fn load_force(i: u32) -> vec3f { return vec3f(force[3u * i], force[3u * i + 1u], force[3u * i + 2u]); }
fn load_old(i: u32) -> vec3f { return vec3f(oldForce[3u * i], oldForce[3u * i + 1u], oldForce[3u * i + 2u]); }
fn store_old(i: u32, f: vec3f) {
    oldForce[3u * i] = f.x;
    oldForce[3u * i + 1u] = f.y;
    oldForce[3u * i + 2u] = f.z;
}

@compute @workgroup_size(WG)
fn integrate(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    var dp = vec3f(0.0);
    var p = vec4f(0.0);
    var free = false;
    var valid = false;
    var ke = 0.0;
    if (i < P.n) {
        valid = true;
        let f = load_force(i);
        p = pos[i];
        var swing_i = p.w * length(f);                                     // SWING_MODE 1: NetworkX's local swinging m |F| (layout.py line 1497)
        if (SWING_MODE == 0u) { swing_i = p.w * length(f - load_old(i)); }  // paper: m |F(t) - F(t-1)|, recomputed inline (7.2)
        let factor = S.speed / (1.0 + sqrt(S.speed * swing_i));
        let fixed = mask_bit(fixedMask[i >> 5u], i);
        dp = select(f * factor, vec3f(0.0), fixed);                        // APPLY 0 (FA2): no clamp on dp (D25)
        if (APPLY == 1u) {                                                  // APPLY 1 (FR, 7.20): move along F by min(|F|, t); a fixed node stays
            let mag = length(f);
            let t = select(P.temperature, S.temperature, (P.flags & FA2_FLAG_ADAPTIVE) != 0u);   // adaptive cooling: K1's state temperature
            dp = vec3f(0.0);
            if (mag > 0.0 && !fixed) { dp = f * (min(mag, t) / mag); }
            ke = select(0.0, dot(f, f), !fixed);                              // the force energy of Hu's step control, folded like the spring preset's kinetic energy
        }
        if (APPLY == 2u) {                                                  // APPLY 2 (spring-electrical): ngraph's Euler step over the velocity in the oldForce slot (PD-2)
            var v = load_old(i);
            let fd = f - P.dragCoefficient * v;                             // drag (generateCreateDragForce.js:18)
            v = v + (P.timeStep / p.w) * fd;                                 // v += (dt / m) F (generateIntegrator.js:27-29)
            let sp = length(v);
            if (sp > 1.0) { v = v / sp; }                                     // the unit speed clamp (generateIntegrator.js:33-37)
            if (P.dim == 2u) { v.z = 0.0; }
            dp = select(P.timeStep * v, vec3f(0.0), fixed);                  // dp = dt v; a pinned body is skipped (generateIntegrator.js:21, 39-41)
            if (!fixed) { store_old(i, v); }
            ke = select(0.0, 0.5 * p.w * dot(v, v), !fixed);                 // partials B under APPLY 2 (PD-4)
        }
        if (P.dim == 2u) { dp.z = 0.0; }                                   // 2D never integrates z (7.13)
        p = vec4f(p.xyz + dp, p.w);
        pos[i] = p;
        if (SWING_MODE == 0u) { store_old(i, f); }                         // fixed nodes too, so a later unpin sees no stale swing (7.11)
        free = !fixed;
    }
    // uniform control flow from here (3.5 rule 1): partials A (sum p, sum |p - c|^2, min, max over valid rows) and C (sum |dp|, free count)
    let c = S.centroid.xyz;
    var sumv = vec4f(0.0);
    var lo = vec4f(F32_MAX);
    var hi = vec4f(-F32_MAX);
    var dl = 0.0;
    var fr = 0u;
    if (valid) {
        let q = p.xyz - c;
        sumv = vec4f(p.xyz, dot(q, q));
        lo = vec4f(p.xyz, 0.0);
        hi = vec4f(p.xyz, dot(q, q));                                  // max.w carries max |p - c|^2 so K1 can write the exact layoutRadius (spec 3.3)
    }
    if (free) { dl = length(dp); fr = 1u; }
    let tSum = wg_reduce_vec4(sumv, lid.x, 0u);
    let tLo = wg_reduce_vec4(lo, lid.x, 1u);
    let tHi = wg_reduce_vec4(hi, lid.x, 2u);
    let tDl = wg_reduce_f32(dl, lid.x, 0u);
    let tFr = wg_reduce_u32(fr, lid.x, 0u);
    let tKe = wg_reduce_f32(ke, lid.x, 0u);
    if (lid.x == 0u) {
        let g = group_id(wid);
        partials[g].sum = tSum;
        partials[g].min = tLo;
        partials[g].max = tHi;
        partials[g].dispFree = vec2f(tDl, f32(tFr));
        if (APPLY != 0u) { partials[g].swingTraction = vec2f(tKe, 0.0); }   // overwrites K3's epilogue: K4 never runs under FR or the preset (PD-4)
    }
}`;
