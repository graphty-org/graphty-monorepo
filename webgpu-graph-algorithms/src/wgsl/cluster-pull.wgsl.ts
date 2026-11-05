/**
 * The `cluster-pull` kernel body (the cluster force, issue #3257): after K2 wrote the attraction, every node of a
 * community adds the pull toward its centroid to `force`, so K3's swing, K4 and K5 treat it as any other force. `LAW`
 * is the model's law of attraction with the centroid as the other end of one more edge: 0 ForceAtlas2's `d`, 1
 * Fruchterman-Reingold's `d^2 / k`, 2 ngraph's Hooke spring of rest length 0; laws 0 and 2 scale with the node's mass.
 * Body only.
 */
export const clusterPullWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn cluster_pull(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }
    let c = clusterOf[i];
    if (c == 0xffffffffu) { return; }
    let p = pos[i];
    let total = centroids[c];
    if (p.w <= 0.0) { return; }                                      // an inert row is not pulled, and weighs nothing
    let d = total.xyz / total.w - p.xyz;
    var pull = P.clusterStrength * p.w;
    if (LAW == 1u) { pull = P.clusterStrength * length(d) / P.frK; }
    if (LAW == 2u) { pull = pull * P.springCoefficient; }
    force[3u * i] = force[3u * i] + pull * d.x;
    force[3u * i + 1u] = force[3u * i + 1u] + pull * d.y;
    force[3u * i + 2u] = force[3u * i + 2u] + pull * d.z;
}
`;
