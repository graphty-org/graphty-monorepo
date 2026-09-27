/**
 * The `lpa-step` kernel body (design 8.6; label propagation): after `group-by-key-row` has written every vertex's
 * best neighbour label into `bestKey`, a vertex adopts it only when the move goes the way the pass allows -- down to
 * a lower label on a pass whose `P.direction` is 0, up to a higher one when it is 1. That is cuGraph's swap-avoidance
 * rule: two neighbours can no longer trade labels forever, because on any one pass only one of the two moves is
 * legal. Updates are synchronous (`labelsIn` read, `labelsOut` written) and the moves of a workgroup are added to
 * `counters[P.counterIndex]` with ONE atomic per workgroup. Body only (spec 3.5, D9); normative text.
 */
export const lpaStepWgsl = /* wgsl */ `
var<workgroup> moved: atomic<u32>;

@compute @workgroup_size(WG)
fn lpa_step(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { atomicStore(&moved, 0u); }
    workgroupBarrier();
    let v = linear_id(wid, lid.x);
    if (v < P.n) {
        let cur = labelsIn[v];
        let best = bestKey[v];
        var next = cur;
        if (best != INVALID_INDEX && best != cur) {
            let down = best < cur;
            if (down == (P.direction == 0u)) { next = best; }        // the alternating direction rule
        }
        labelsOut[v] = next;
        if (next != cur) { atomicAdd(&moved, 1u); }
    }
    workgroupBarrier();                                            // every lane, unconditionally
    if (lid.x == 0u) {
        let m = atomicLoad(&moved);
        if (m > 0u) { atomicAdd(&counters[P.counterIndex], m); }  // one atomic per workgroup
    }
}
`;
