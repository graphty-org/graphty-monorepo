/**
 * G5, the `grid-downsample` kernel body (spec 7.7; P4-T9): one dispatch per coarser level; every parent cell is the
 * sum of its 4 (2D) or 8 (3D) children at the level below, read at P.childBase and written at P.parentBase (the
 * pseudo-cells, indices cells .. of level 0, are never children). No atomics. Body only; normative text.
 */
export const gridDownsampleWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn grid_downsample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let pc = linear_id(wid, lid.x);                                // the parent cell inside its level
    if (pc >= P.parentCells) { return; }                           // no barrier follows
    let side = P.parentSide;
    let cs = 2u * side;                                            // the child level's side
    let px = pc % side;
    let py = (pc / side) % side;
    let pz = pc / (side * side);
    var acc = vec4f(0.0);
    for (var dz = 0u; dz < P.depth; dz = dz + 1u) {
        for (var dy = 0u; dy < 2u; dy = dy + 1u) {
            for (var dx = 0u; dx < 2u; dx = dx + 1u) {
                let child = (2u * px + dx) + cs * ((2u * py + dy) + cs * (2u * pz + dz));
                acc = acc + pyramid[P.childBase + child];
            }
        }
    }
    pyramid[P.parentBase + pc] = acc;
}
`;
