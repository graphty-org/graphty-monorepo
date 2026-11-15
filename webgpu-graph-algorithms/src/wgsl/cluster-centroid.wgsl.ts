/**
 * The `cluster-centroid` kernel body (the cluster force, issue #3257): one workgroup per community sums its members'
 * mass-weighted positions, each lane walking the sorted member list with a stride of WG, then one workgroup reduction.
 * No atomics, so two runs are bitwise equal. An inert row weighs 0 and adds nothing. Body only.
 */
export const clusterCentroidWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn cluster_centroid(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let c = group_id(wid);
    var start = 0u;
    var end = 0u;
    if (c < P.clusterCount) {
        start = clusterStart[c];
        end = clusterStart[c + 1u];
    }
    var acc = vec4f(0.0);
    for (var k = start + lid.x; k < end; k = k + WG) {
        let p = pos[members[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);
    }
    let total = wg_reduce_vec4(acc, lid.x, 0u);
    if (lid.x == 0u && c < P.clusterCount) { centroids[c] = total; }
}
`;
