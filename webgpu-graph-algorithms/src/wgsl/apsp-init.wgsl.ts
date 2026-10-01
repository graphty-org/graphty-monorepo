/**
 * The `apsp-init` kernel body (design 8.7): writes the arcs into the `n x n` distance matrix after `fill` has set
 * every entry to `+Infinity`. One lane per ROW `u`: it walks `u`'s arcs and keeps the cheapest weight per target
 * (`min`), so parallel arcs collapse to the cheapest one, then writes the diagonal zero LAST, so a self-loop never
 * displaces it. Every arc of row `u` lands in row `u` of the matrix and only this lane writes that row, so there is
 * no race and no atomic. Unweighted (`HAS_WEIGHTS` false) every arc costs 1. A directed snapshot writes its one
 * direction; an undirected one stores both arcs of every edge, so both halves are written. The driver refuses
 * negative and non-finite weights before any dispatch. Body only (spec 3.5, D9); the text is normative: the
 * sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const apspInitWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn apsp_init(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let u = linear_id(wid, lid.x);
    if (u >= P.n) { return; }
    let rowBase = u * P.n;
    let end = rowPtr[u + 1u];
    for (var a = rowPtr[u]; a < end; a = a + 1u) {
        let v = colIdx[a];
        let w = select(1.0, weights[a], HAS_WEIGHTS);
        dist[rowBase + v] = min(dist[rowBase + v], w);               // parallel arcs collapse to the cheapest
    }
    dist[rowBase + u] = 0.0;                                          // last: a self-loop never displaces the zero
}
`;
