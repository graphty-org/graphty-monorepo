/**
 * The `coo-scatter` kernel body (design 6 row 10): the last step of `cooToCsr`, after the histogram of the sources
 * and its exclusive scan into `rowPtr`. Two modes under SORTED_INPUT.
 *
 * SORTED_INPUT false is the design's cursor scatter: an arc reserves its slot with `atomicAdd` on its row's cursor
 * (`cursors`, zeroed by the caller), so slots are handed out in race order and a row is NOT sorted by target even when
 * the input was.
 *
 * SORTED_INPUT true takes arcs already ordered by source: arc `i` then sits at its own index minus its row's start
 * inside the row, no cursor and no atomic, so the write is a pure function of the input and the input order survives
 * into every row. The precondition is checked, not trusted: an arc whose source is below its predecessor's raises
 * `cursors[0]`, the word the driver reads back and refuses. Body only (spec 3.5, D9); normative text.
 */
export const cooScatterWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn coo_scatter(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let s = src[i];
    var slot = 0u;
    if (SORTED_INPUT) {
        if (i > 0u && s < src[i - 1u]) { atomicStore(&cursors[0], 1u); }   // unsorted input: the flag the driver refuses
        let within = i - rowPtr[s];                                // the arc's place in its row
        slot = rowPtr[s] + within;
    } else {
        slot = rowPtr[s] + atomicAdd(&cursors[s], 1u);             // race order: the row is not sorted in this mode
    }
    colIdx[slot] = dst[i];
    if (WEIGHTED) { outWeight[slot] = weight[i]; }
}
`;
