/**
 * The `mst-best` kernel body (design 8.5; the P11 plan's P11-T4, PD-6 and PD-7): one logical edge per invocation of
 * a Boruvka round. An edge whose endpoints lie in different components (`comp` holds every vertex's root) offers
 * itself to both components. `atomicMin` exists for u32 only and no atomic compares one word and writes another, so
 * the per-component minimum of the total edge order (weight, then edge index) is TWO passes of this one body, chosen
 * by the `PASS` override: pass 0 takes the minimum `order_key` of the weight into `bestKey`, pass 1 the minimum edge
 * index among the edges that hold that key into `bestEdge`. `order_key` (the prelude) orders negative weights below
 * positive ones and -0 equal to +0, which a raw bit pattern does not. Without `WEIGHTED` every edge weighs 1 and
 * the index alone decides, as in Kruskal. Body only (spec 3.5, D9); normative text: a sabotage mutation is a textual
 * edit of it.
 */
export const mstBestWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn mst_best(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let e = linear_id(wid, lid.x);
    if (e >= P.count) { return; }
    let cu = comp[edgeSrc[e]];
    let cv = comp[edgeDst[e]];
    if (cu == cv) { return; }                                     // inside one component, or a self-loop
    var w = 1.0;
    if (WEIGHTED) { w = edgeWeight[e]; }
    let k = order_key(w);
    if (PASS == 0u) {
        atomicMin(&bestKey[cu], k);
        atomicMin(&bestKey[cv], k);
    } else {
        if (k == atomicLoad(&bestKey[cu])) { atomicMin(&bestEdge[cu], e); }
        if (k == atomicLoad(&bestKey[cv])) { atomicMin(&bestEdge[cv], e); }
    }
}
`;
