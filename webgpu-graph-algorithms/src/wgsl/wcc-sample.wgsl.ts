/**
 * The `wcc-sample` kernel body (spec 8.3 "a 1,024-entry histogram readback to find the giant component"): writes
 * the component label of `P.items` pseudo-randomly chosen vertices into `hist`, which the host reads back and takes
 * the mode of (PD-12: GAP's SampleFrequentElement counts on the host too, and a device histogram over component
 * ids would return a bucket, not an id). The sampler uses the prelude's `lowbias32` and `%`, never a bitwise
 * operator on an index.
 */

/** Entry point `wcc_sample`; no overrides. */
export const wccSampleWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn wcc_sample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.items) { return; }
    let v = lowbias32(i + P.r) % P.n;
    hist[i] = atomicLoad(&comp[v]);
}
`;
