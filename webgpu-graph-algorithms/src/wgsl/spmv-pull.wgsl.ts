/**
 * The `spmv-pull` kernel body (spec 6 row 9, 8.2; PD-1 of the M8b plan): one invocation per row of the REVERSE
 * adjacency, grid-stride over `[0, P.n)`, folding `weight * xNorm[nbr]` over the row's in-arcs in chunks of 64
 * terms (a two-level f32 sum: the chunk absorbs the rounding of 64 terms, the row total the rounding of the chunk
 * count, so a 10,000-arc hub row loses about 200 rounding steps instead of 10,000; Kahan compensation is not used
 * because Metal's shader compiler folds `((acc + term) - acc) - term` to zero whatever hides it) and writing
 * `rankOut[v] = beta * pv + alpha * (sum + danglingMass * pv)`, where `pv` is `personalization[v]` when
 * HAS_PERSONALIZATION and the uniform `P.uniformP` otherwise. PageRank sets alpha to the
 * damping factor, beta to `1 - alpha` and USE_DANGLING; HITS and eigenvector set alpha 1, beta 0, uniformP 0; Katz
 * sets alpha to the attenuation, beta to its constant and uniformP 1. The body is normative: a sabotage mutation
 * (test/helpers/sabotage.ts) is a textual edit of it, so it is not restyled.
 */

/** Entry point `spmv_pull`; overrides HAS_PERSONALIZATION and USE_DANGLING plus the standard USE_PERM / HAS_WEIGHTS. */
export const spmvPullWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn spmv_pull(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    var dangling = 0.0;
    if (USE_DANGLING) { dangling = partials[0].danglingMass; }
    let first = linear_id(wid, lid.x);
    for (var row = first; row < P.n; row = row + P.stride) {
        let v = select(row, perm[row], USE_PERM);
        let a0 = max(rowPtr[v], P.arcBase);
        let a1 = min(rowPtr[v + 1u], P.arcEnd);
        var acc = 0.0;
        var chunk = 0.0;
        var inChunk = 0u;
        for (var arc = a0; arc < a1; arc = arc + 1u) {
            let nbr = colIdx[arc - P.arcBase];               // \`target\` is a WGSL reserved word (spec 16.2)
            var weight = 1.0;
            if (HAS_WEIGHTS) { weight = weights[arc - P.arcBase]; }
            // two-level sum: 64 terms into chunk, chunk into acc (see the header; no compensation, no select)
            chunk = chunk + (weight * xNorm[nbr]);
            inChunk = inChunk + 1u;
            if (inChunk == 64u) {
                acc = acc + chunk;
                chunk = 0.0;
                inChunk = 0u;
            }
        }
        acc = acc + chunk;
        var pv = P.uniformP;
        if (HAS_PERSONALIZATION) { pv = personalization[v]; }
        rankOut[v] = (P.beta * pv) + (P.alpha * (acc + (dangling * pv)));
    }
}
`;
