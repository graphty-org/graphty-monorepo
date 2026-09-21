/**
 * The `pr-scale` kernel body (spec 8.2 dispatch (a)): one invocation per node writes `xNorm[u]` and contributes a
 * per-workgroup partial of the dangling mass, the L1 delta `|rankIn - rankPrev|` and, for the spectral modes, the
 * norm term. NORM_MODE selects the divisor: 0 PageRank (`rankIn[u] / outWeightSum[u]`, 0 and a dangling
 * contribution when the sum is not positive); 1 and 2 are NORM PASSES that write no xNorm and only accumulate
 * `abs(x)` (L1) or `x * x` (L2); 3 divides by the scalar `partials[0].norm` the previous dispatch folded; 4 is the
 * identity (Katz). The body is normative: a sabotage mutation is a textual edit of it, so it is not restyled.
 *
 * The guard is named `inRange`, never `active`: `active` is a WGSL reserved word (spec 16.2) and the composer
 * rejects it before a device is touched.
 */

/** Entry point `pr_scale`; override NORM_MODE (0 PageRank, 1 L1 norm pass, 2 L2 norm pass, 3 scale by partials[0].norm, 4 identity). */
export const prScaleWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn pr_scale(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let u = linear_id(wid, lid.x);
    let inRange = u < P.n;
    var x = 0.0;
    var prev = 0.0;
    if (inRange) { x = rankIn[u]; prev = rankPrev[u]; }
    var dangling = 0.0;
    var delta = 0.0;
    var normTerm = 0.0;
    if (inRange) {
        delta = abs(x - prev);
        if (NORM_MODE == 0u) {
            let divisor = outWeightSum[u];
            if (divisor <= 0.0) { dangling = x; xNorm[u] = 0.0; } else { xNorm[u] = x / divisor; }
        }
        if (NORM_MODE == 1u) { normTerm = abs(x); }
        if (NORM_MODE == 2u) { normTerm = x * x; }
        if (NORM_MODE == 3u) {
            var scale = partials[0].norm;
            if (scale <= 0.0) { scale = 1.0; }
            xNorm[u] = x / scale;
        }
        if (NORM_MODE == 4u) { xNorm[u] = x; }
    }
    let folded = wg_reduce_vec4(vec4f(dangling, delta, normTerm, 0.0), lid.x, 0u);
    if (lid.x == 0u) {
        let slot = 1u + group_id(wid);
        partials[slot].danglingMass = folded.x;
        partials[slot].delta = folded.y;
        partials[slot].norm = folded.z;
    }
}
`;
