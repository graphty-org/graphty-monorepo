/**
 * The `closeness-rowsum` kernel body: closeness from a finished all-pairs distance matrix, one workgroup per row.
 * Every lane walks its strided columns of row `r` (the distances FROM `r`), skips the diagonal and every unreachable
 * entry (`+Infinity`, compared by its bit pattern because WGSL lets a compiler assume no infinities), and adds, by
 * `P.role`: 0 the hop count as an integer (exact: a row of at most 23,170 hops below 23,170 sums below 2^32), 1 the
 * f32 distance, 2 its reciprocal (harmonic closeness; a zero distance adds nothing, as in the CPU port). A tree reduction in workgroup memory folds the lanes and lane
 * 0 writes `out[r]` -- the integer, or the f32 bit pattern. The host turns the row into the score. Body only; the text
 * is normative: the sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const closenessRowsumWgsl = /* wgsl */ `
var<workgroup> partial: array<u32, WG>;

@compute @workgroup_size(WG)
fn closeness_rowsum(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let row = group_id(wid);                                         // uniform: one workgroup per row
    if (row >= P.n) { return; }
    var whole = 0u;
    var real = 0.0;
    for (var c = lid.x; c < P.n; c = c + WG) {
        let d = dist[row * P.n + c];
        if (c == row || bitcast<u32>(d) == F32_INF_BITS) { continue; }
        if (P.role == 0u) {
            whole = whole + u32(d);
        } else if (P.role == 1u) {
            real = real + d;
        } else if (d > 0.0) {
            real = real + 1.0 / d;                                    // a zero distance adds nothing, as on the CPU
        }
    }
    partial[lid.x] = select(whole, bitcast<u32>(real), P.role != 0u);
    for (var s = WG / 2u; s > 0u; s = s / 2u) {
        workgroupBarrier();
        if (lid.x < s) {
            let a = partial[lid.x];
            let b = partial[lid.x + s];
            partial[lid.x] = select(a + b, bitcast<u32>(bitcast<f32>(a) + bitcast<f32>(b)), P.role != 0u);
        }
    }
    if (lid.x == 0u) { out[row] = partial[0]; }
}
`;
