/** The `collide-apply` kernel body (issue #3256, the collision force): adds `collide-gather`'s moves to the positions, after every node has read them. Body only. */
export const collideApplyWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn collide_apply(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    let p = pos[i];
    pos[i] = vec4f(p.xyz + moves[i].xyz, p.w);
}
`;
