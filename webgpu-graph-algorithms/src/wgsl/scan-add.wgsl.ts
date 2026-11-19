/**
 * The `scan-add` kernel body (the scan's third step): adds the exclusive prefix of its block's sum,
 * `blockOffsets[group]`, to every element of the block. Body only; normative text.
 */
export const scanAddWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn scan_add(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let g = group_id(wid);
    let i = g * WG + lid.x;
    if (i >= P.count) { return; }                                  // no barrier follows
    out[i] = out[i] + blockOffsets[g];
}
`;
