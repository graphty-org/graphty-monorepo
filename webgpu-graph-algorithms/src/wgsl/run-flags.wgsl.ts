/**
 * The `run-flags` kernel body (design 6 row 10; the simple symmetric graph build): over arcs sorted by the pair
 * (`keysA`, `keysB`), `flags[i]` is 1 exactly when arc `i` opens a run of equal pairs -- the first arc, or one whose
 * pair differs from its predecessor's -- and is not a dropped arc (`keysA[i] == INVALID_INDEX`). An exclusive scan
 * of the flags numbers the runs, which is how parallel arcs merge into one. Body only (spec 3.5, D9); normative text.
 */
export const runFlagsWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn run_flags(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = linear_id(wid, lid.x);
    if (i >= P.count) { return; }                                  // no barrier follows
    let a = keysA[i];
    var first = a != INVALID_INDEX;                                // a dropped arc never opens a run
    if (i > 0u) { first = first && (a != keysA[i - 1u] || keysB[i] != keysB[i - 1u]); }
    flags[i] = select(0u, 1u, first);
}
`;
