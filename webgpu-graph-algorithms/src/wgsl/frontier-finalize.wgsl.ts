/**
 * The `frontier-finalize` kernel body (design 5.4, 6 row 7; P8-T4, the P8 plan's PD-3 / PD-23 / DEP-P8-C): the
 * device-side selector of the frontier family. One workgroup, one lane, no barrier after the early return (spec 3.5
 * rule 1). It is recorded TWICE per level, in two roles chosen by `P.role`, because a level's dispatch sizes become
 * known at two moments: role 0 runs at the START of a level -- rotates `nextFrontierCount` into `frontierCount`,
 * advances `level`, decides `done` (an empty frontier, or `level >= P.maxDepth`), chooses the path and writes this
 * level's seven 16-byte slots at `P.slotBase`; role 1 runs once the edge queue is filled -- clamps `edgeCount` to
 * `P.edgeCapacity`, sizes the contract slot, or, when `edgeCountUnclamped` exceeds the capacity, zeroes it and sizes
 * the fused-retry slot from `frontierCount` instead (PD-23). Two rules: a boundary that finds `done` set zeroes its
 * slots and moves no counter word (the host records levels past the end); role 1 counts a two-phase level only when
 * role 0 chose one, which it reads from slot 0's `x` (a storage write of one dispatch is visible to the next of the
 * same pass). The `(x, y)` arithmetic is `indirect-finalize`'s verbatim (P4), so a count above 2^32 - wg cannot wrap
 * and a group count above MAX_WORKGROUPS_PER_DIM splits in 2D; slots 2 and 6 are sized one WORKGROUP per entry for
 * `bfs-fused`; slots 3, 4 and 5 (the bits fill over `ceil(n / 32)` words, the bitset build over the frontier, the sweep
 * over the unvisited list) are the bottom-up level's.
 *
 * Roles 2 and 3 are the SSSP round boundary of the near-far loop (P8-T9, PD-20), over the same block read in its
 * SSSP sense (word 1 the raw near half's appends, 21 the raw far half's, 0 and 20 the deduped pile counts, 22 the
 * threshold, 23 the delta, 4 the previous threshold, 14 the round's mode) and the same seven slots: role 2 finds a
 * non-empty raw near half and sizes the near dedupe (slots 0 and 1, count word 1, output word 0) in mode 0; finds it
 * empty and the far half not, raises the threshold by the delta (one f32 add; an add that returns the threshold
 * unchanged sets `done 3`, the host's E_UNSUPPORTED), remembers the previous threshold in word 4 and sizes the far
 * dedupe (slots 3 and 4, count word 21, output word 20) in mode 1; finds both empty and sets `done 1`; and finds a
 * raw half above the capacity and sets `done 2` (the host's E_TOO_LARGE). It counts a round in `level` when it
 * picks a mode and NOT at the done boundary, so `level` at the end is the number of relax rounds dispatched; a
 * boundary that finds `done` set obeys rule 1. Role 3 runs once the dedupe has landed: mode 0 sizes slot 2 (the
 * relax over nearIn) from word 0 and restarts the raw near half (word 1 to 0); mode 1 sizes slot 5 (the pass-through
 * over farIn) from word 20 and restarts the raw far half (word 21 to 0).
 *
 * Beamer's test (P8-T8, PD-21), evaluated at every boundary BEFORE the `done` branch (so a switch can be counted at
 * the done boundary too, which the host model of the tests mirrors): top-down switches to bottom-up when
 * `frontierDegreeSum > unvisitedDegreeSum / alpha` (u32 division; alpha the host's `max(1, floor(arcCount / n))`
 * unless tuned) and the frontier is growing (`next > frontierCount`); bottom-up switches back when
 * `next * beta < unvisitedCount` (a u32 product, wrapping only above 178M vertices, which no admitted device
 * reaches) and the frontier is shrinking; `P.mode == 1` (the driver's `"top-down"`) pins the direction at 0. Every
 * change is counted in `switches`, the previous direction is word 14. The two unvisited words the test reads are
 * rebuilt exactly once per submit by `bfs-unvisited-flags` (PD-18) and maintained here by subtraction: the count is
 * subtracted from the SECOND boundary of a submit on and the degree sum from the THIRD on, because a boundary may
 * only subtract what the submit's rebuild counted, and the frontier whose degree sum the second boundary holds was
 * claimed before the rebuild ran (the rebuild counts the vertices unclaimed when it runs; the frontier rotated in at
 * boundary 0 was claimed by the previous submit's last contract, so it was never in the sum; boundary b subtracts
 * `next = |F_b|`, inside the sum iff b >= 1, and `degSum = deg(F_{b-1})`, inside it iff b >= 2). The degree sum is
 * the "unvisited degree estimate" of the design rather than an exact count for two reasons: it is one level stale
 * (a frontier's degree sum is only known once it has been expanded), and a bottom-up level expands nothing, so the
 * word stops falling while bottom-up runs and overstates the set afterwards. The bias is one-directional -- an
 * overstated m_u makes the switch INTO bottom-up harder, never easier -- and the next submit's rebuild makes it
 * exact again. Body only (spec 3.5, D9); the text is normative: the sabotage rows of test/helpers/sabotage.ts are
 * textual edits of it.
 *
 * Since 2026-09-25 nothing dispatches FROM the slots (G8-F5: Dawn's validation of an indirect dispatch cost about
 * 0.4 ms of device time each, whether or not it dispatched anything, and the seven slots of thirty-two recorded
 * levels were 97 % of a traversal's wall time). Every level kernel is a direct grid-stride dispatch that reads the
 * `path` word (24) this kernel writes -- 0 nothing (done, or a level past the end), 1 two-phase, 2 fused, 3
 * bottom-up, 4 the fused retry (role 1), 5 a near SSSP round, 6 a far one (role 2) -- and the SSSP dedupes read
 * their counts from words 8 and 9, which role 2 writes. The slots stay as the selector's recorded decision, read
 * back by the frontier tests; deleting them with those tests is the follow-up.
 */
export const frontierFinalizeWgsl = /* wgsl */ `
fn write_slot_groups(slot: u32, groups: u32, count: u32) {           // groups workgroups, split in 2D above the per-dim limit
    var x = groups;
    var y = 1u;
    if (groups > MAX_WORKGROUPS_PER_DIM) {
        x = MAX_WORKGROUPS_PER_DIM;
        y = (groups + MAX_WORKGROUPS_PER_DIM - 1u) / MAX_WORKGROUPS_PER_DIM;
    }
    let base = 4u * (P.slotBase + slot);                               // 16-byte slots: (x, y, 1, count)
    args[base] = x; args[base + 1u] = y; args[base + 2u] = 1u; args[base + 3u] = count;
}
fn write_slot(slot: u32, count: u32) {                                // one INVOCATION per entry: ceil(count / wg) workgroups
    let groups = count / P.wg + select(0u, 1u, count % P.wg != 0u);   // ceil(count / wg) without the u32 wrap (indirect-finalize's rule)
    write_slot_groups(slot, groups, count);
}
fn zero_slot(slot: u32) {
    let base = 4u * (P.slotBase + slot);
    args[base] = 0u; args[base + 1u] = 0u; args[base + 2u] = 1u; args[base + 3u] = 0u;
}

@compute @workgroup_size(WG)
fn frontier_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x != 0u) { return; }                                       // one lane; no barrier follows (3.5 rule 1)
    if (P.role == 0u) {                                                // the level boundary
        if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op level the host recorded past the end
            for (var s = 0u; s < 7u; s = s + 1u) { zero_slot(s); }     // this slotBase holds the previous submit's args
            return;                                                    // no counter word moves (P8-T6's levels formula reads them)
        }
        let finished = atomicLoad(&counters[0]);
        let next = atomicLoad(&counters[1]);
        let degSum = atomicLoad(&counters[2]);
        atomicStore(&counters[3], finished);                           // prevFrontierCount
        atomicStore(&counters[4], degSum);                             // prevDegreeSum
        atomicStore(&counters[0], next);                               // the rotation
        atomicStore(&counters[1], 0u);
        atomicStore(&counters[2], 0u);
        atomicStore(&counters[8], 0u);                                 // edgeCount
        atomicStore(&counters[9], 0u);                                 // edgeCountUnclamped
        atomicStore(&counters[12], atomicLoad(&counters[12]) + next);  // visitedCount
        if (P.firstOfSubmit >= 1u) {                                   // b = the boundary's index inside its submit, clamped to 2 (P8-T8, PD-18)
            atomicStore(&counters[5], atomicLoad(&counters[5]) - next);    // unvisitedCount (exact): F_b was inside the submit's rebuilt sum iff b >= 1
        }
        if (P.firstOfSubmit >= 2u) {
            atomicStore(&counters[6], atomicLoad(&counters[6]) - degSum);  // unvisitedDegreeSum (one level stale): F_{b-1} was inside it iff b >= 2
        }
        let level = atomicLoad(&counters[11]) + 1u;                    // the seed is U32_MAX, so the first boundary lands on 0
        atomicStore(&counters[11], level);
        let done = (next == 0u) || (level >= P.maxDepth);
        atomicStore(&counters[15], select(0u, 1u, done));
        var direction = atomicLoad(&counters[14]);
        if (P.mode == 1u) {
            direction = 0u;                                                 // top-down only (the test seam)
        } else if (direction == 0u) {
            if (degSum > atomicLoad(&counters[6]) / P.alpha && next > finished) { direction = 1u; }   // m_f > m_u / alpha and growing
        } else {
            if (next * P.beta < atomicLoad(&counters[5]) && next < finished) { direction = 0u; }      // next * beta < unvisited and shrinking
        }
        if (direction != atomicLoad(&counters[14])) { atomicStore(&counters[13], atomicLoad(&counters[13]) + 1u); }   // switches
        var path = 0u;                                                 // word 24: what the level's kernels run (0 nothing, 1 two-phase, 2 fused, 3 bottom-up; role 1 writes 4 for the retry)
        if (done) {
            for (var s = 0u; s < 7u; s = s + 1u) { zero_slot(s); }
        } else if (direction == 1u) {                                  // the bottom-up level (P8-T8): the bits fill, the bitset build, the sweep
            zero_slot(0u); zero_slot(1u); zero_slot(2u); zero_slot(6u);
            write_slot(3u, (P.n + 31u) / 32u); write_slot(4u, next); write_slot(5u, atomicLoad(&counters[7]));
            path = 3u;
            atomicStore(&counters[19], atomicLoad(&counters[19]) + 1u);
        } else if (next < P.fusedMax) {                                // P8-T7 makes this branch reachable (fusedMax is 0 until then)
            zero_slot(0u); zero_slot(1u); zero_slot(3u); zero_slot(4u); zero_slot(5u); zero_slot(6u);
            write_slot_groups(2u, next, next);                         // bfs-fused is one WORKGROUP per frontier entry
            path = 2u;
            atomicStore(&counters[17], atomicLoad(&counters[17]) + 1u);
        } else {
            zero_slot(2u); zero_slot(3u); zero_slot(4u); zero_slot(5u);
            write_slot(0u, next);                                      // slots 1 and 6 are role 1's
            path = 1u;
        }
        atomicStore(&counters[14], direction);
        atomicStore(&counters[24], path);
    } else if (P.role == 1u) {                                         // the edge queue is filled
        if (args[4u * P.slotBase] == 0u) {                             // role 0 did not choose the two-phase path (done, fused or bottom-up): nothing to size, nothing to count
            zero_slot(1u); zero_slot(6u);
            return;
        }
        let clamped = min(atomicLoad(&counters[8]), P.edgeCapacity);
        atomicStore(&counters[8], clamped);
        if (atomicLoad(&counters[9]) > P.edgeCapacity) {               // PD-23: the fused retry
            let entries = atomicLoad(&counters[0]);
            zero_slot(1u); write_slot_groups(6u, entries, entries);    // one workgroup per frontier entry, as slot 2
            atomicStore(&counters[24], 4u);                            // the path word: bfs-fused runs the retry, bfs-contract nothing
            atomicStore(&counters[10], atomicLoad(&counters[10]) + 1u);
            atomicStore(&counters[17], atomicLoad(&counters[17]) + 1u);
        } else {
            write_slot(1u, clamped); zero_slot(6u);
            atomicStore(&counters[18], atomicLoad(&counters[18]) + 1u);   // twoPhaseLevels counts the CHOICE role 0 made, even for zero edges (P8-T7 Step 4's invariant)
        }
    } else if (P.role == 2u) {                                         // the SSSP round boundary (P8-T9, PD-20): which pile this round relaxes
        atomicStore(&counters[8], 0u);                                 // the dedupe counts (words 8 and 9, the SSSP sense) and the path word: nothing unless a pile is chosen below
        atomicStore(&counters[9], 0u);
        atomicStore(&counters[24], 0u);
        if (atomicLoad(&counters[15]) != 0u) {                         // done already: a no-op round the host recorded past the end (rule 1)
            for (var s = 0u; s < 7u; s = s + 1u) { zero_slot(s); }
            return;
        }
        let nearRaw = atomicLoad(&counters[1]);                        // the raw near half's appends, unclamped
        let farRaw = atomicLoad(&counters[21]);                        // the raw far half's appends, unclamped
        if (nearRaw > P.edgeCapacity || farRaw > P.edgeCapacity) {     // a pile overflowed its half: the host raises E_TOO_LARGE
            atomicStore(&counters[15], 2u);
            for (var s = 0u; s < 7u; s = s + 1u) { zero_slot(s); }
            return;
        }
        zero_slot(2u); zero_slot(5u); zero_slot(6u);                   // role 3 sizes the relax slots once the piles are deduped
        if (nearRaw != 0u) {                                           // a near round: dedupe the near half into nearIn
            atomicStore(&counters[0], 0u);                             // the deduped near count, accumulated by dedupe-filter
            atomicStore(&counters[14], 0u);                            // mode 0
            write_slot(0u, nearRaw); write_slot(1u, nearRaw);          // dedupe-claim, dedupe-filter over the near half
            atomicStore(&counters[8], nearRaw);                        // the near dedupe's count word
            atomicStore(&counters[24], 5u);                            // the path word: sssp-relax role 0 runs, role 1 nothing
            zero_slot(3u); zero_slot(4u);
            atomicStore(&counters[11], atomicLoad(&counters[11]) + 1u);   // rounds dispatched (the done boundary is not counted)
        } else if (farRaw != 0u) {                                     // the near pile is empty: raise the threshold and re-bucket the far pile
            let threshold = bitcast<f32>(atomicLoad(&counters[22]));
            let raised = threshold + bitcast<f32>(atomicLoad(&counters[23]));   // ONE f32 add on the bit patterns (PD-9)
            if (raised == threshold) {                                 // the delta is below the threshold's ulp: the host raises E_UNSUPPORTED
                atomicStore(&counters[15], 3u);
                for (var s = 0u; s < 7u; s = s + 1u) { zero_slot(s); }
                return;
            }
            atomicStore(&counters[4], atomicLoad(&counters[22]));      // prevThresholdBits: what the pass-through drops below
            atomicStore(&counters[22], bitcast<u32>(raised));
            atomicStore(&counters[20], 0u);                            // the deduped far count, accumulated by dedupe-filter
            atomicStore(&counters[14], 1u);                            // mode 1
            zero_slot(0u); zero_slot(1u);
            write_slot(3u, farRaw); write_slot(4u, farRaw);            // dedupe-claim, dedupe-filter over the far half
            atomicStore(&counters[9], farRaw);                         // the far dedupe's count word
            atomicStore(&counters[24], 6u);                            // the path word: sssp-relax role 1 runs, role 0 nothing
            atomicStore(&counters[11], atomicLoad(&counters[11]) + 1u);
        } else {                                                       // both piles empty: finished
            atomicStore(&counters[15], 1u);
            for (var s = 0u; s < 7u; s = s + 1u) { zero_slot(s); }
        }
    } else if (P.role == 3u) {                                         // the piles are deduped: size the relax
        if (atomicLoad(&counters[15]) != 0u) { return; }               // role 2 zeroed every slot of the round
        if (atomicLoad(&counters[14]) == 0u) {
            write_slot(2u, atomicLoad(&counters[0]));                  // the near round over nearIn
            atomicStore(&counters[1], 0u);                             // the raw near half restarts
        } else {
            write_slot(5u, atomicLoad(&counters[20]));                 // the pass-through over farIn
            atomicStore(&counters[21], 0u);                            // the raw far half restarts (the pass-through re-appends what stays far)
        }
    }
}
`;
