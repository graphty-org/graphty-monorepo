/**
 * The `coo-emit` kernel body (design 6 row 10, 8.6; the first step of the simple symmetric graph build): position `i`
 * takes arc `a` -- `i` itself, or `order[i]` under INDEXED, which is how a sorted permutation is materialised -- and
 * writes that arc's source, target and weight. Arc `2e` is logical edge `e` as declared and arc `2e + 1` its reverse,
 * so every edge lands in both directions and the result is symmetric whatever the snapshot's directedness. A
 * self-loop is dropped: both of its arcs are written as `INVALID_INDEX`, which sorts after every node index and which
 * `run-flags` never marks. Weights are 1 without WEIGHTED. Body only (spec 3.5, D9); normative text.
 */
export const cooEmitWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn coo_emit(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    var a = i;
    if (INDEXED) { a = order[i]; }                                 // the arc this position takes
    let e = a / 2u;                                                // arc 2e is edge e as declared, arc 2e + 1 its reverse
    let forward = (a % 2u) == 0u;
    let u = edgeSrc[e];
    let v = edgeDst[e];
    var w = 1.0;
    if (WEIGHTED) { w = edgeWeight[e]; }
    if (u == v) {                                                  // a self-loop is dropped: both arcs sort last and never open a run
        outSrc[i] = INVALID_INDEX;
        outDst[i] = INVALID_INDEX;
        outWeight[i] = 0.0;
        return;
    }
    outSrc[i] = select(v, u, forward);
    outDst[i] = select(u, v, forward);
    outWeight[i] = w;
}
`;
