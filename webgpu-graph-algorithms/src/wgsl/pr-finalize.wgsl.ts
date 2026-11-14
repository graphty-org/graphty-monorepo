/**
 * The `pr-finalize` kernel body (spec 8.2 dispatch (b)): ONE workgroup folds the `P.groups` per-workgroup partials
 * into the header at `partials[0]` -- a STORAGE region, never a uniform, read by the next dispatch of the same
 * pass -- and records `firstConverged` the first time the delta falls below `P.convergeThreshold`. NORM_MODE 2
 * stores the square root of the folded norm (the L2 case). Every power-iteration mode (1 HITS, 2 eigenvector, 4
 * Katz) holds the delta to `P.convergeThreshold` times the folded L1 size of the iterate (the partials' `pad0`), a
 * change relative to the vector, where a delta of exactly 0 (an iterate that died out) also counts; PageRank (0)
 * compares it to the threshold as it is, since its iterate sums to 1. The recorded iteration is `P.iteration - 1u` because
 * the delta a scale pass produces at iteration i is `|x(i-1) - x(i-2)|`, the error of iteration i - 1 (PD-9).
 * The body is normative: a sabotage mutation is a textual edit of it, so it is not restyled.
 */

/** Entry point `pr_finalize`; override NORM_MODE (2 takes the square root of the folded norm, every other value stores it as folded). */
export const prFinalizeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn pr_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    var d = 0.0;
    var e = 0.0;
    var m = 0.0;
    var a = 0.0;
    for (var g = lid.x; g < P.groups; g = g + WG) {
        d = d + partials[1u + g].danglingMass;
        e = e + partials[1u + g].delta;
        m = m + partials[1u + g].norm;
        a = a + partials[1u + g].pad0;
    }
    let folded = wg_reduce_vec4(vec4f(d, e, m, a), lid.x, 0u);
    if (lid.x == 0u) {
        partials[0].danglingMass = folded.x;
        partials[0].delta = folded.y;
        var norm = folded.z;
        if (NORM_MODE == 2u) { norm = sqrt(max(0.0, folded.z)); }
        partials[0].norm = norm;
        partials[0].iteration = P.iteration;
        var limit = P.convergeThreshold;
        if (NORM_MODE != 0u) { limit = limit * folded.w; }
        let settled = folded.y < limit || (NORM_MODE != 0u && folded.y == 0.0);
        let unset = partials[0].firstConverged == U32_MAX;
        if (P.trackConvergence == 1u && P.iteration >= 2u && settled && unset) {
            partials[0].firstConverged = P.iteration - 1u;
        }
    }
}
`;
