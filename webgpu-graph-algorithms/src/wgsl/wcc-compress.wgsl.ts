/**
 * The `wcc-compress` kernel body (spec 8.3): pointer jumping to the root, reading through `atomicLoad` on the same
 * `array<atomic<u32>>` because WGSL forbids mixing atomic and plain access to one element. The walk is bounded by
 * `P.maxSteps`; a walk that runs out leaves a shorter path, which the next round finishes. The body is normative:
 * a sabotage mutation is a textual edit of it, so it is not restyled.
 */

/** Entry point `wcc_compress`; no overrides. */
export const wccCompressWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn wcc_compress(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var v = first; v < P.items; v = v + P.stride) {
        var root = atomicLoad(&comp[v]);
        var steps = 0u;
        loop {
            let parent = atomicLoad(&comp[root]);
            if (parent == root) { break; }
            if (steps >= P.maxSteps) { break; }
            steps = steps + 1u;
            root = parent;
        }
        atomicStore(&comp[v], root);
    }
}
`;
