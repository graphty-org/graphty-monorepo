/**
 * G4b, the `grid-centroid-hub` kernel body (spec 7.7; P4-T9): one workgroup per hub cell of hubList, dispatched
 * indirectly from hubArgs (the T1 finalize over hubCounters[0]); a WG-strided mass-weighted sum reduced by the
 * prelude's tree. The work is guarded by `valid`, never an early return, so the reduction is uniform (PD-13). Body
 * only; normative text.
 */
export const gridCentroidHubWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn grid_centroid_hub(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let h = group_id(wid);
    let valid = h < hubCount[0];                                   // a workgroup past the count sums nothing
    var c = 0u;
    var start = 0u;
    var count = 0u;
    if (valid) {
        c = hubList[h];
        start = cellStart[c];
        count = cellStart[c + 1u] - start;
    }
    var acc = vec4f(0.0);
    for (var k = start + lid.x; k < start + count; k = k + WG) {   // strided over the cell's sorted range
        let p = pos[sortedIdx[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);
    }
    let t = wg_reduce_vec4(acc, lid.x, 0u);                        // uniform control flow: 256 -> 1
    if (valid && lid.x == 0u) { pyramid[c] = t; }
}
`;
