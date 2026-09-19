# A benchmark regression needs the minimum to confirm the median

Date: 2026-09-19
Decided by: the owner
Changes: contract 6.8 of `design/webgpu/plans/2026-09-14-webgpu-p0-p3-interfaces.md`, whose rule 4
reads "for every result present in both, `medianMs > 3 x baseline.medianMs` -> listed as a
regression". That section is a historical plan of record and is NOT edited; this record supersedes
its rule 4.

## The decision

`scripts/bench-compare.js` fails the lane only when BOTH the median and the minimum of a row are
above the threshold times their baselines. A row whose median rose while its minimum held is
printed as `noisy` and does not fail. The table gains a `min ratio` column, so the number the rule
turns on is visible on every row. A row missing `minMs` on either side falls back to the median
alone, so a baseline written before the field existed still works.

Nothing else moves: the threshold is still 3, the quiet-GPU skip of T-13 still comes first, a
missing baseline is still "new", and `--threshold` / `--class` are unchanged.

## What happened

Run 35414639899 (master, `cde458a2`) failed the GPU lane on one row out of eighteen:

    REGRESSION  roundtrip/empty submit + 4-byte readU32 round trip  1.344 ms  baseline 0.171 ms  x7.84

Every test in that run passed -- node, node-limits, the no-subgroups twins, the browser smoke. The
commit under test deleted two jobs from `gpu.yml` and changed no GPU code; the `test-gpu` job's
step list is byte-identical across it. The release gate then did its job and refused to publish,
so a caret-range fix to graphty-element sat unreleased behind a benchmark.

The raw bench table, which the compare step did not print, has the answer:

| | median | min | max |
| --- | --- | --- | --- |
| the failing run | 1.344 ms | 0.169 ms | 12.990 ms |
| the baseline | 0.171 ms | 0.143 ms | 1.299 ms |

The floor did not move. The run's fastest sample is 0.169 ms against a baseline whose median is
0.171 ms. What moved is the middle of a five-sample series, which is what interference does.

## Why the minimum

Interference -- another process on the card, a driver hiccup, a clock drop, a noisy neighbour on a
rented on-demand host -- can only make a sample SLOWER. It can never make one faster. The fastest
of the runs is therefore the one estimator of the true cost that interference cannot inflate: if
the floor has not moved, the code's cost has not moved.

The median is not that. With `runs` at 5 (`benchmarks/harness.ts`), three unlucky samples out of
five carry the median with them, and on a row whose true cost is 0.17 ms a single scheduling delay
is several multiples of the measurement. The baseline row shows this from its own clean capture:
`medianMs 0.1714, minMs 0.1430, maxMs 1.2988` -- a maximum 7.6x its own median, recorded on the
run we trusted enough to check in.

A real regression raises the floor with the median and still fails. Verified against the artifact
of the failing run itself: the old script exits 1, the new one exits 0 and prints `noisy`, and
every other row's min ratio lands between x0.84 and x1.05 while the noisy row's is x1.18.

## What we are giving up, and why it is acceptable

A regression that raises the median without raising the minimum -- a new slow path taken on some
fraction of iterations, a reallocation every N calls, a cache that misses sometimes -- is no
longer a failure. That is a real category, and this rule is blind to it.

It is acceptable because five samples could not see it either. Distinguishing "three of five
samples are slow because the code changed" from "three of five samples are slow because the host
was busy" is not something a 5-sample median can do, whichever way the rule is written; before
this change the lane answered "regression" to both, and it was wrong often enough to block a
release. The row stays in the table as `noisy` rather than being hidden, so a run of them on the
same row is still visible to a reader.

## What would reverse this

- A real regression lands and the table calls it `noisy`. One occurrence is enough to revisit:
  this rule trades exactly that case away.
- Repeated `noisy` on the same row across unrelated commits, which would mean the row is measuring
  the host rather than the code and should be dropped from the gate or given its own threshold.

The better fix, if either happens: raise `runs` for the cheap rows so the median is actually
stable -- a sub-millisecond row can afford 200 samples, a 254 ms row cannot -- and re-capture the
baseline. It costs a GPU session, which is why it is not this change.
