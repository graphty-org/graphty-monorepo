/**
 * The `orient-flags` kernel body (design 8.5; triangle counting): over the arcs of the simple symmetric graph, arc
 * `(u, v)` is kept when `(degree(v), v)` is above `(degree(u), u)` lexicographically. The order is strict and total,
 * so exactly one arc of every undirected edge survives and every triangle is found once, at its lowest-ranked vertex;
 * the rows stay sorted by target because a compaction preserves order. `src` holds each arc's source. Body only
 * (spec 3.5, D9); normative text.
 */
export const orientFlagsWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn orient_flags(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let a = linear_id(wid, lid.x);
    if (a >= P.count) { return; }                                  // no barrier follows
    let u = src[a];
    let v = colIdx[a];
    let du = rowPtr[u + 1u] - rowPtr[u];
    let dv = rowPtr[v + 1u] - rowPtr[v];
    let keep = dv > du || (dv == du && v > u);                     // (degree, id) of the target above the source's
    flags[a] = select(0u, 1u, keep);
}
`;
