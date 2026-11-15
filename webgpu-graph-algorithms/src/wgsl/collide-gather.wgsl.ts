/**
 * The `collide-gather` kernel body (issue #3256, the collision force; twin of layout/src/simulation/collision.ts): per
 * free node, the sum of the pushes out of every node it overlaps in its own and the neighbouring cells, into `moves`.
 * A candidate's own cell is compared with the searched one, so a cell sharing a hash bucket neither pushes wrongly nor
 * twice. A pair shares the push; a fixed partner leaves it all to the free node; an inert row (mass 0) pushes nothing;
 * a coincident pair parts along `kick_dir`. It reads positions only, so the result does not depend on thread order, and
 * the bucket order is the stable sort's, so two runs are bitwise equal. A bucket above `P.cellMax` is read only that
 * far, which bounds a crowd's cost while it spreads. Body only.
 */
export const collideGatherWgsl = /* wgsl */ `
fn collide_cell(p: vec3f) -> vec3<i32> {
    let c = vec3<i32>(floor(clamp(p * P.invCell, vec3f(-1.0e9), vec3f(1.0e9))));
    return select(c, vec3<i32>(c.xy, 0), P.dim == 2u);
}
fn collide_key(c: vec3<i32>) -> u32 {
    let u = bitcast<vec3<u32>>(c);
    return lowbias32(((u.x * 73856093u) ^ (u.y * 19349663u)) ^ (u.z * 83492791u)) & P.hashMask;
}
fn pair_push(i: u32, pi: vec4f, ri: f32, j: u32, pj: vec4f) -> vec3f {
    if (pj.w <= 0.0) { return vec3f(0.0); }                        // an inert row (mass 0, setInert) pushes nothing
    let reach = (ri + radii[j]) * P.radiusScale;
    var d = pi.xyz - pj.xyz;
    if (P.dim == 2u) { d.z = 0.0; }
    let d2 = dot(d, d);
    if (d2 >= reach * reach) { return vec3f(0.0); }
    let share = select(0.5, 1.0, mask_bit(fixedMask[j >> 5u], j));
    if (d2 < FA2_COINCIDENT_SQ) { return kick_dir(i, j, P.dim) * (reach * share); }
    let dist = sqrt(d2);
    return d * ((reach - dist) / dist * share);
}

@compute @workgroup_size(WG)
fn collide_gather(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    var shift = vec3f(0.0);
    let pi = pos[i];
    if (pi.w > 0.0 && !mask_bit(fixedMask[i >> 5u], i)) {
        let ri = radii[i];
        let c0 = collide_cell(pi.xyz);
        let zr = select(1, 0, P.dim == 2u);
        for (var dz = -zr; dz <= zr; dz = dz + 1) {
            for (var dy = -1; dy <= 1; dy = dy + 1) {
                for (var dx = -1; dx <= 1; dx = dx + 1) {
                    let c = c0 + vec3<i32>(dx, dy, dz);
                    let key = collide_key(c);
                    let start = cellStart[key];
                    let end = min(cellStart[key + 1u], start + P.cellMax);
                    for (var k = start; k < end; k = k + 1u) {
                        let j = sortedIdx[k];
                        let pj = pos[j];
                        if (j != i && all(collide_cell(pj.xyz) == c)) { shift = shift + pair_push(i, pi, ri, j, pj); }
                    }
                }
            }
        }
    }
    moves[i] = vec4f(shift, 0.0);
}
`;
