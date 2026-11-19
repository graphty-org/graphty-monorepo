/**
 * The `envelope` kernel body (issue #8801): the fit-to-view measure of the scene array `to_scene` wrote, on the device,
 * so the owner reads 64 bytes a landing instead of walking every row. Four modes, one dispatch each, in order:
 * 0 (grid-stride, one partial per workgroup): the count, sum, min and max of the finite rows into `partials[3g..3g+2]`;
 * 1 (one workgroup): those partials folded in index order into `env[0..2]` (sum and count, min, max);
 * 2 (grid-stride): the largest squared distance of a finite row from `env[0].xyz / env[0].w` into `partials[3g].x`;
 * 3 (one workgroup): those folded into `env[3].x`. A row is finite when none of its three exponents is all ones, read
 * from the bits so no compiler folds the test away. Every fold runs in a fixed order, so two runs are bitwise equal.
 * Body only.
 */
export const envelopeWgsl = /* wgsl */ `
fn env_finite(v: f32) -> bool { return (bitcast<u32>(v) & F32_INF_BITS) != F32_INF_BITS; }
@compute @workgroup_size(WG)
fn envelope(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let stride = P.groups * WG;
    if (P.mode == 0u) {
        var sum = vec4f(0.0);
        var lo = vec4f(F32_MAX);
        var hi = vec4f(-F32_MAX);
        for (var i = g * WG + lid.x; i < P.n; i = i + stride) {
            let p = vec3f(scene[3u * i], scene[3u * i + 1u], scene[3u * i + 2u]);
            if (env_finite(p.x) && env_finite(p.y) && env_finite(p.z)) {
                sum = sum + vec4f(p, 1.0);
                lo = min(lo, vec4f(p, 0.0));
                hi = max(hi, vec4f(p, 0.0));
            }
        }
        let s = wg_reduce_vec4(sum, lid.x, 0u);
        let a = wg_reduce_vec4(lo, lid.x, 1u);
        let b = wg_reduce_vec4(hi, lid.x, 2u);
        if (lid.x == 0u) {
            partials[3u * g] = s;
            partials[3u * g + 1u] = a;
            partials[3u * g + 2u] = b;
        }
    } else if (P.mode == 1u) {
        var sum = vec4f(0.0);
        var lo = vec4f(F32_MAX);
        var hi = vec4f(-F32_MAX);
        for (var k = lid.x; k < P.groups; k = k + WG) {
            sum = sum + partials[3u * k];
            lo = min(lo, partials[3u * k + 1u]);
            hi = max(hi, partials[3u * k + 2u]);
        }
        let s = wg_reduce_vec4(sum, lid.x, 0u);
        let a = wg_reduce_vec4(lo, lid.x, 1u);
        let b = wg_reduce_vec4(hi, lid.x, 2u);
        if (lid.x == 0u) {
            env[0] = s;
            env[1] = a;
            env[2] = b;
        }
    } else if (P.mode == 2u) {
        let total = env[0];
        let c = total.xyz / max(total.w, 1.0);
        var far = 0.0;
        for (var i = g * WG + lid.x; i < P.n; i = i + stride) {
            let d = vec3f(scene[3u * i], scene[3u * i + 1u], scene[3u * i + 2u]) - c;
            let q = dot(d, d);
            if (env_finite(q) && q > far) { far = q; }
        }
        let m = wg_reduce_f32(far, lid.x, 2u);
        if (lid.x == 0u) { partials[3u * g] = vec4f(m, 0.0, 0.0, 0.0); }
    } else {
        var far = 0.0;
        for (var k = lid.x; k < P.groups; k = k + WG) { far = max(far, partials[3u * k].x); }
        let m = wg_reduce_f32(far, lid.x, 2u);
        if (lid.x == 0u) { env[3] = vec4f(m, 0.0, 0.0, 0.0); }
    }
}
`;
