/**
 * The `frontier-finalize` kernel body (design 5.4, 6 row 7; P8-T4, the P8 plan's PD-3 / PD-23 / DEP-P8-C): the
 * device-side selector of the frontier family. One workgroup, one lane, no barrier after the early return (spec 3.5
 * rule 1). It is recorded TWICE per level, in two roles chosen by `P.role`, because a level's counts become known at
 * two moments: role 0 runs at the START of a level -- rotates `nextFrontierCount` into `frontierCount`, advances
 * `level`, decides `done` (an empty frontier, or `level >= P.maxDepth`) and chooses the path; role 1 runs once the
 * edge queue is filled -- clamps `edgeCount` to `P.edgeCapacity`, or, when `edgeCountUnclamped` exceeds the
 * capacity, switches the path to the fused retry over `frontierCount` (PD-23). The decision is ONE word of the
 * counters block, `path` (word 24): 0 nothing (done, or a level past the end), 1 two-phase, 2 fused, 3 bottom-up,
 * 4 the fused retry (role 1), 5 a near SSSP round, 6 a far one (role 2). Every level kernel is a direct grid-stride
 * dispatch that reads that word first and runs only when it names it (decision record
 * design/decisions/2026-09-25-frontier-kernels-dispatch-directly.md: Dawn's validation of an indirect dispatch cost
 * about 0.4 ms of device time each, and the seven indirect slots this kernel once wrote per level were 97 % of a
 * traversal's wall time; the slots and their args buffer are gone). Two rules: a boundary that finds `done` set
 * moves no counter word (the host records levels past the end); role 1 counts a two-phase level only when role 0
 * chose one, which it reads from the path word (a storage write of one dispatch is visible to the next of the same
 * pass).
 *
 * Roles 2 and 3 are the SSSP round boundary of the near-far loop (P8-T9, PD-20), over the same block read in its
 * SSSP sense (word 1 the raw near half's appends, 21 the raw far half's, 0 and 20 the deduped pile counts, 22 the
 * threshold, 23 the delta, 4 the previous threshold, 14 the round's mode): role 2 finds a non-empty raw near half
 * and sizes the near dedupe (count word 1, output word 0; the dedupe's count in word 8) in mode 0; finds it empty
 * and the far half not, raises the threshold by the delta (one f32 add; an add that returns the threshold
 * unchanged sets `done 3`, the host's E_UNSUPPORTED), remembers the previous threshold in word 4 and sizes the far
 * dedupe (count word 21, output word 20; the dedupe's count in word 9) in mode 1; finds both empty and sets
 * `done 1`; and finds a raw half above the capacity and sets `done 2` (the host's E_TOO_LARGE). It counts a round in
 * `level` when it picks a mode and NOT at the done boundary, so `level` at the end is the number of relax rounds
 * dispatched; a boundary that finds `done` set obeys rule 1. Role 3 runs once the dedupe has landed and restarts the
 * raw half the round consumed: mode 0 restarts the raw near half (word 1 to 0), mode 1 the raw far half (word 21
 * to 0); the relax kernels size themselves from words 0 and 20.
 *
 * Beamer's test (P8-T8, PD-21; amended for issue #391), evaluated at every boundary BEFORE the `done` branch (so a
 * switch can be counted at the done boundary too, which the host model of the tests mirrors): top-down switches to
 * bottom-up when `nextDegreeSum > unvisitedDegreeSum / alpha` (u32 division; alpha the host's
 * `max(1, floor(arcCount / n))` unless tuned) and the frontier is growing (`next > frontierCount`); bottom-up
 * switches back when `next * beta < unvisitedCount` (a u32 product, wrapping only above 178M vertices, which no
 * admitted device reaches) and the frontier is shrinking; `P.mode == 1` (the driver's `"top-down"`) pins the
 * direction at 0. Every change is counted in `switches`, the previous direction is word 14. `nextDegreeSum` (word
 * 25) is Beamer's m_f measured EXACTLY: `bfs-next-degree` sums the out-degrees of the vertices a level claims at
 * the end of that level, so the boundary that rotates them in as `next` compares the degree of the frontier it is
 * about to expand -- not, as before the amendment, `frontierDegreeSum` (word 2), the degree of the frontier the
 * previous level EXPANDED, one level stale and 0 after a bottom-up level, which on the 1M / 10M R-MAT missed the
 * switch at the level holding 13.6M of the 21M arcs. Word 2 is still accumulated by the expansion and rotated into
 * word 4 for the inspect seam. The two unvisited words are rebuilt exactly once per submit by `bfs-unvisited-flags`
 * (PD-18) and maintained here by subtraction from the SECOND boundary of a submit on, because a boundary may only
 * subtract what the submit's rebuild counted: the rebuild counts the vertices unclaimed when it runs, the frontier
 * rotated in at boundary 0 was claimed by the previous submit's last level, so it was never in the sums, and
 * boundary b subtracts `next = |F_b|` and `nextDegreeSum = deg(F_b)`, both inside the sums iff b >= 1. Both words
 * are therefore exact at every boundary, bottom-up levels included (the sweep's claims are summed like any other).
 * Body only (spec 3.5, D9); the text is normative: the sabotage rows of test/helpers/sabotage.ts are textual edits
 * of it.
 */
export const frontierFinalizeWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn frontier_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                       // one lane; no barrier follows (3.5 rule 1)
    if (P.role == 0u) {                                                // the level boundary
        if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op level the host recorded past the end
            atomicStore(&counters[24], 0u);                            // the path word is the only word that moves (P8-T6's levels formula reads the rest)
            return;
        }
        let finished = atomicLoad(&counters[0]);
        let next = atomicLoad(&counters[1]);
        let degSum = atomicLoad(&counters[2]);
        let nextDeg = atomicLoad(&counters[25]);                       // deg(F_b), summed by bfs-next-degree when F_b was claimed (issue #391)
        atomicStore(&counters[3], finished);                           // prevFrontierCount
        atomicStore(&counters[4], degSum);                             // prevDegreeSum
        atomicStore(&counters[0], next);                               // the rotation
        atomicStore(&counters[1], 0u);
        atomicStore(&counters[2], 0u);
        atomicStore(&counters[25], 0u);                                // the next level's claims sum from 0
        atomicStore(&counters[8], 0u);                                 // edgeCount
        atomicStore(&counters[9], 0u);                                 // edgeCountUnclamped
        atomicStore(&counters[12], atomicLoad(&counters[12]) + next);  // visitedCount
        if (P.firstOfSubmit >= 1u) {                                   // b = the boundary's index inside its submit, clamped (P8-T8, PD-18): F_b was inside the submit's rebuilt sums iff b >= 1
            atomicStore(&counters[5], atomicLoad(&counters[5]) - next);       // unvisitedCount, exact
            atomicStore(&counters[6], atomicLoad(&counters[6]) - nextDeg);    // unvisitedDegreeSum, exact (issue #391: no longer one level stale)
        }
        let level = atomicLoad(&counters[11]) + 1u;                    // the seed is U32_MAX, so the first boundary lands on 0
        atomicStore(&counters[11], level);
        let done = (next == 0u) || (level >= P.maxDepth);
        atomicStore(&counters[15], select(0u, 1u, done));
        var direction = atomicLoad(&counters[14]);
        if (P.mode == 1u) {
            direction = 0u;                                                 // top-down only (the test seam)
        } else if (direction == 0u) {
            if (nextDeg > atomicLoad(&counters[6]) / P.alpha && next > finished) { direction = 1u; }   // m_f > m_u / alpha and growing, m_f the degree of the frontier about to be expanded
        } else {
            if (next * P.beta < atomicLoad(&counters[5]) && next < finished) { direction = 0u; }      // next * beta < unvisited and shrinking
        }
        if (direction != atomicLoad(&counters[14])) { atomicStore(&counters[13], atomicLoad(&counters[13]) + 1u); }   // switches
        var path = 0u;                                                 // word 24: what the level's kernels run (0 nothing, 1 two-phase, 2 fused, 3 bottom-up; role 1 writes 4 for the retry)
        if (done) {
            path = 0u;
        } else if (direction == 1u) {                                  // the bottom-up level (P8-T8): the bits fill, the bitset build, the sweep
            path = 3u;
            atomicStore(&counters[19], atomicLoad(&counters[19]) + 1u);
        } else if (next < P.fusedMax) {                                // P8-T7 makes this branch reachable (fusedMax is 0 until then)
            path = 2u;                                                 // bfs-fused: one WORKGROUP per frontier entry
            atomicStore(&counters[17], atomicLoad(&counters[17]) + 1u);
        } else {
            path = 1u;                                                 // advance-expand, then role 1 and bfs-contract
        }
        atomicStore(&counters[14], direction);
        atomicStore(&counters[24], path);
    } else if (P.role == 1u) {                                         // the edge queue is filled
        if (atomicLoad(&counters[24]) != 1u) {                         // role 0 did not choose the two-phase path (done, fused or bottom-up): nothing to clamp, nothing to count
            return;
        }
        let clamped = min(atomicLoad(&counters[8]), P.edgeCapacity);
        atomicStore(&counters[8], clamped);
        if (atomicLoad(&counters[9]) > P.edgeCapacity) {               // PD-23: the fused retry
            atomicStore(&counters[24], 4u);                            // the path word: bfs-fused runs the retry over frontierCount, bfs-contract nothing
            atomicStore(&counters[10], atomicLoad(&counters[10]) + 1u);
            atomicStore(&counters[17], atomicLoad(&counters[17]) + 1u);
        } else {
            atomicStore(&counters[18], atomicLoad(&counters[18]) + 1u);   // twoPhaseLevels counts the CHOICE role 0 made, even for zero edges (P8-T7 Step 4's invariant)
        }
    } else if (P.role == 2u) {                                         // the SSSP round boundary (P8-T9, PD-20): which pile this round relaxes
        atomicStore(&counters[8], 0u);                                 // the dedupe counts (words 8 and 9, the SSSP sense) and the path word: nothing unless a pile is chosen below
        atomicStore(&counters[9], 0u);
        atomicStore(&counters[24], 0u);
        if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op round the host recorded past the end (rule 1)
            return;
        }
        let nearRaw = atomicLoad(&counters[1]);                        // the raw near half's appends, unclamped
        let farRaw = atomicLoad(&counters[21]);                        // the raw far half's appends, unclamped
        if (nearRaw > P.edgeCapacity || farRaw > P.edgeCapacity) {     // a pile overflowed its half: the host raises E_TOO_LARGE
            atomicStore(&counters[15], 2u);
            return;
        }
        if (nearRaw != 0u) {                                           // a near round: dedupe the near half into nearIn
            atomicStore(&counters[0], 0u);                             // the deduped near count, accumulated by dedupe-filter
            atomicStore(&counters[14], 0u);                            // mode 0
            atomicStore(&counters[8], nearRaw);                        // the near dedupe's count word (dedupe-claim, dedupe-filter over the near half)
            atomicStore(&counters[24], 5u);                            // the path word: sssp-relax role 0 runs, role 1 nothing
            atomicStore(&counters[11], atomicLoad(&counters[11]) + 1u);   // rounds dispatched (the done boundary is not counted)
        } else if (farRaw != 0u) {                                     // the near pile is empty: raise the threshold and re-bucket the far pile
            let threshold = bitcast<f32>(atomicLoad(&counters[22]));
            let raised = threshold + bitcast<f32>(atomicLoad(&counters[23]));   // ONE f32 add on the bit patterns (PD-9)
            if (raised == threshold) {                                 // the delta is below the threshold's ulp: the host raises E_UNSUPPORTED
                atomicStore(&counters[15], 3u);
                return;
            }
            atomicStore(&counters[4], atomicLoad(&counters[22]));      // prevThresholdBits: what the pass-through drops below
            atomicStore(&counters[22], bitcast<u32>(raised));
            atomicStore(&counters[20], 0u);                            // the deduped far count, accumulated by dedupe-filter
            atomicStore(&counters[14], 1u);                            // mode 1
            atomicStore(&counters[9], farRaw);                         // the far dedupe's count word (dedupe-claim, dedupe-filter over the far half)
            atomicStore(&counters[24], 6u);                            // the path word: sssp-relax role 1 runs, role 0 nothing
            atomicStore(&counters[11], atomicLoad(&counters[11]) + 1u);
        } else {                                                       // both piles empty: finished
            atomicStore(&counters[15], 1u);
        }
    } else if (P.role == 3u) {                                         // the piles are deduped: restart the raw half the round consumed
        if (atomicLoad(&counters[15]) != 0u) { return; }               // role 2 chose no pile this round
        if (atomicLoad(&counters[14]) == 0u) {
            atomicStore(&counters[1], 0u);                             // the raw near half restarts (sssp-relax role 0 sizes itself from word 0)
        } else {
            atomicStore(&counters[21], 0u);                            // the raw far half restarts (the pass-through re-appends what stays far; role 1 sizes itself from word 20)
        }
    }
}
`;
