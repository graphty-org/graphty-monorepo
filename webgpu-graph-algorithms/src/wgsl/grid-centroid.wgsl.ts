/**
 * G4, the `grid-centroid` kernel body (spec 7.7; P4-T9): thread per finest cell, the pseudo-cell included; the
 * mass-weighted position sum of a cell's sorted range in index order (no atomics: deterministic), the largest
 * occupancy into hubCounters[1], and cells above GRID_HUB_CELL entries appended to hubList for G4b (PD-13). Body
 * only; normative text.
 */
export const gridCentroidWgsl = /* wgsl */ `
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }

@compute @workgroup_size(WG)
fn grid_centroid(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let c = linear_id(wid, lid.x);
    if (c > grid_cells()) { return; }                              // cells [0, cells]: the pseudo-cell is index cells; no barrier follows
    let start = cellStart[c];
    let count = cellStart[c + 1u] - start;
    atomicMax(&hubCounters[1], count);                             // maxCellOccupancy, read by K1 next iteration
    if (count > GRID_HUB_CELL) {                                   // a hub cell: G4b sums it (PD-13)
        hubList[atomicAdd(&hubCounters[0], 1u)] = c;
        return;
    }
    var acc = vec4f(0.0);
    for (var k = start; k < start + count; k = k + 1u) {           // sorted order: deterministic
        let p = pos[sortedIdx[k]];
        acc = acc + vec4f(p.xyz * p.w, p.w);                       // (sum m x, sum m y, sum m z, sum m)
    }
    pyramid[c] = acc;
}
`;
