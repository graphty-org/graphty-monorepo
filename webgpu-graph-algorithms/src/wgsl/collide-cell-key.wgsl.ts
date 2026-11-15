/**
 * The `collide-cell-key` kernel body (issue #3256, the collision force): the spatial hash of every node's cell, one
 * largest diameter wide, over an unbounded grid, so no extent is needed; `cellVal[i] = i` for the sort. The clamp keeps a
 * far-away or NaN coordinate out of an out-of-range float-to-int conversion. `collide-gather` repeats these two
 * helpers. Body only.
 */
export const collideCellKeyWgsl = /* wgsl */ `
fn collide_cell(p: vec3f) -> vec3<i32> {
    let c = vec3<i32>(floor(clamp(p * P.invCell, vec3f(-1.0e9), vec3f(1.0e9))));
    return select(c, vec3<i32>(c.xy, 0), P.dim == 2u);             // 2D or flat: one z plane
}
fn collide_key(c: vec3<i32>) -> u32 {
    let u = bitcast<vec3<u32>>(c);
    return lowbias32(((u.x * 73856093u) ^ (u.y * 19349663u)) ^ (u.z * 83492791u)) & P.hashMask;
}

@compute @workgroup_size(WG)
fn collide_cell_key(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    cellKey[i] = collide_key(collide_cell(pos[i].xyz));
    cellVal[i] = i;
}
`;
