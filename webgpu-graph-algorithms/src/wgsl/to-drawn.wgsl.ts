/** The `to-drawn` kernel body (design/rendering/row-renderer.md 4.5): turns the scene array `to_scene` wrote into the renderer's drawn positions, `(scene - center) * scale + target` with z = 0 in 2D, into one stride-4 slot of the drawn ring. A row set in `skip` is left as the owner wrote it, and w is never written. Body only. */
export const toDrawnWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn to_drawn(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    if (mask_bit(skip[i >> 5u], i)) { return; }                    // a held row or a follower: the owner's value stays
    let s = vec3f(scene[3u * i], scene[3u * i + 1u], scene[3u * i + 2u]);
    let d = (s - vec3f(P.cx, P.cy, P.cz)) * P.scale + vec3f(P.tx, P.ty, P.tz);
    drawn[i] = vec4f(d.xy, select(d.z, 0.0, P.dim == 2u), drawn[i].w);
}
`;
