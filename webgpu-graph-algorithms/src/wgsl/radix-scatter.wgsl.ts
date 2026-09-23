/**
 * The `radix-scatter` kernel body (spec 6 row 6; P4-T4): the stable scatter of one LSD pass. Lane 0 ranks the block's
 * keys serially in index order with a RADIX_BINS-entry counter table (PD-5: deterministic and stable, WG steps per
 * workgroup; ponytail: the 8-way split ranking of GraphWaGu is the upgrade if T-6 shows the sort on the critical
 * path), then every lane writes its key and value at `offsets[digit * P.groups + group] + rank`. Body only;
 * normative text.
 */
export const radixScatterWgsl = /* wgsl */ `
var<workgroup> rank: array<u32, WG>;
var<workgroup> cnt: array<u32, RADIX_BINS>;

@compute @workgroup_size(WG)
fn radix_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    for (var b = lid.x; b < RADIX_BINS; b = b + WG) { cnt[b] = 0u; }
    let g = group_id(wid);
    let i = g * WG + lid.x;
    var key = 0u;
    var d = 0u;
    if (i < P.count) {
        key = keys[i];
        d = (key >> P.shift) & RADIX_DIGIT_MASK;
    }
    workgroupBarrier();
    if (lid.x == 0u) {                                             // serial stable ranking (PD-5)
        let last = min(WG, P.count - g * WG);
        for (var s = 0u; s < last; s = s + 1u) {
            let ds = (keys[g * WG + s] >> P.shift) & RADIX_DIGIT_MASK;
            rank[s] = cnt[ds];
            cnt[ds] = cnt[ds] + 1u;
        }
    }
    workgroupBarrier();
    if (i < P.count) {
        let dst = offsets[d * P.groups + g] + rank[lid.x];
        keysOut[dst] = key;
        valsOut[dst] = vals[i];
    }
}
`;
