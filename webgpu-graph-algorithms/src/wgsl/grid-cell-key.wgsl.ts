/**
 * G1, the `grid-cell-key` kernel body (spec 7.7; P4-T8): the finest cell of every node from the state's robust extent,
 * `floor((p - gridMin) * invCellSize)` (a multiply, correctly rounded everywhere: PD-10), linearised when every axis
 * is in [0, G), and otherwise one of the 2^dim outside pseudo-cells `cells + orthant`, the orthant of the cell about the
 * grid centre (bit a set when `c[a] >= G / 2`; issue #90); `cellVal[i] = i`. The clamp before the floor keeps a
 * far-away or NaN coordinate out of an out-of-range float-to-int conversion. Body only; normative text.
 */
export const gridCellKeyWgsl = /* wgsl */ `
fn grid_cells() -> u32 { return P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u); }

@compute @workgroup_size(WG)
fn grid_cell_key(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.n) { return; }                                      // no barrier follows
    let cells = grid_cells();
    let gf = f32(P.gridMax);
    let q = (pos[i].xyz - S.gridMin.xyz) * S.invCellSize;          // PD-10: never a division
    let c = vec3<i32>(floor(clamp(q, vec3f(-1.0), vec3f(gf + 1.0))));
    let g = i32(P.gridMax);
    var inside = c.x >= 0 && c.x < g && c.y >= 0 && c.y < g;
    if (P.dim == 3u) { inside = inside && c.z >= 0 && c.z < g; }
    var key = cells + select(0u, 1u, c.x >= g / 2) + select(0u, 2u, c.y >= g / 2);   // an outside pseudo-cell: its orthant (issue #90)
    if (P.dim == 3u) { key = key + select(0u, 4u, c.z >= g / 2); }
    if (inside) {
        key = u32(c.x) + P.gridMax * u32(c.y);
        if (P.dim == 3u) { key = key + P.gridMax * P.gridMax * u32(c.z); }
    }
    cellKey[i] = key;
    cellVal[i] = i;
}
`;
