/**
 * The `pr-finalize` kernel body (spec 8.2 dispatch (b)): ONE workgroup folds the `P.groups` per-workgroup partials
 * into the header at `partials[0]` -- a STORAGE region, never a uniform, read by the next dispatch of the same
 * pass -- and records `firstConverged` the first time the delta falls below `P.convergeThreshold`. NORM_MODE 2
 * stores the square root of the folded norm (the L2 case). The recorded iteration is `P.iteration - 1u` because
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
    for (var g = lid.x; g < P.groups; g = g + WG) {
        d = d + partials[1u + g].danglingMass;
        e = e + partials[1u + g].delta;
        m = m + partials[1u + g].norm;
    }
    let folded = wg_reduce_vec4(vec4f(d, e, m, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        partials[0].danglingMass = folded.x;
        partials[0].delta = folded.y;
        var norm = folded.z;
        if (NORM_MODE == 2u) { norm = sqrt(max(0.0, folded.z)); }
        partials[0].norm = norm;
        partials[0].iteration = P.iteration;
        let unset = partials[0].firstConverged == U32_MAX;
        if (P.trackConvergence == 1u && P.iteration >= 2u && folded.y < P.convergeThreshold && unset) {
            partials[0].firstConverged = P.iteration - 1u;
        }
    }
}
`;
