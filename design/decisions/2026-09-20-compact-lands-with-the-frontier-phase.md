# `compact` and `dedupe` land with the frontier phase, not with the grid

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 6 row 4 (line 1571), whose phase cell
reads "P4 (grid hub cells), P7 (WCC), P8", and the P4 row of 13 (line 4211), which lists
`compact` among the phase's deliverables. Neither line is edited; this record moves the two
primitives out of P4 and leaves the rest of both cells where they are.

## The decision

P4 builds neither `compact` nor `dedupe`. The grid's hub list is filled by an `atomicAdd`
append inside G4 (7.7 G4: `hubList[atomicAdd(&hubCounters.hubCount, 1u)] = c`) and turned into
indirect dispatch arguments by the finalize kernel of 5.4; no flag-scan-scatter runs anywhere in
the grid pipeline. The primitives stay in the primitive table of 6 as designed, with their first
consumer moved to the phase that has one.

## Why

Design 13 rule (b) says a phase adds only the primitives its own slice needs, and no G4 item
exercises `compact` or `dedupe`: every hub-cell test drives `hubCounters` and the indirect
finalize, the sort is `radixSort` over `cellKey`, and the pyramid is built by direct dispatches
over `cellStart`. A `compact` written here would be a kernel with a body to sabotage, a noise row
to record and an `inspect()` comparison to keep (rule (f)), all for a primitive nothing in the
phase calls.

`dedupe`'s named consumers are P7's WCC and P8's frontier. P7 landed without it
(`design/decisions/2026-09-19-afforest-needs-no-dedupe.md`: Afforest's hooks are idempotent, so a
duplicate in the queue costs a repeated hook, not a wrong answer). That leaves P8 as the first
phase with a queue that needs deduplicating, and P8 is where the primitive's tests have a
frontier to run on.

## What we are giving up, and why it is acceptable

The rejected argument was to build `compact` and `dedupe` in P4 because design 6 row 4 lists
P4 first among their consumers:

> `compact(batch, flags: Binding, count, out, outCount)` and `dedupe(batch, queue, count, owner:
> Binding, out, outCount)` | flag + scan + scatter (3-7 dispatches); dedupe by Davidson's
> ownership trick (note 04 section 2.3) written race-free for WGSL [...] | O(count) | filter /
> Set | P4 (grid hub cells), P7 (WCC), P8

The row is right that P4 is where the scan lands, and `compact` is a scan plus a scatter; the
marginal cost of writing it here, with `exclusiveScan` fresh, is smaller than it will be in P8.
It is also right that a hub-cell list is a compaction problem in the abstract.

It is acceptable because the concrete hub list is not that problem: the number of hub cells is
small (a cell is a hub above 1,024 occupants), the append is order-independent, and the design's
own G4 row already chose the atomic append over a scan. Writing `compact` in P4 would ship an
untested primitive -- a primitive with no consumer has no parity target, so its tests would prove
only that it agrees with its own oracle on synthetic flags -- and the P8 plan can write it
against the frontier it exists for.

## What would reverse this

Two conditions, counted:

- P8's frontier plan names `compact` or `dedupe` as a deliverable. Then the primitives land there,
  as this record expects, and no new decision is needed.
- P11's Louvain plan names either of them before P8 lands. Then the primitive moves forward to
  P11 and this record is superseded by the one that moves it.
