# Decision records

One decision per file, named `YYYY-MM-DD-<slug>.md`, never edited after it lands.
A later decision that changes an earlier one gets its own file and links back.

## Why these are separate files

The design documents in this directory tree are plans of record: they say what was
decided and why, and they are long. When a decision changes, editing the design in
place destroys the thing that stops the decision being reversed six months later --
the record that somebody already considered this and said no. A deleted rationale
gets rediscovered and re-implemented.

The older practice was to append the record to a "Review log" at the end of the
design document itself. That works until two branches append at once: on 2026-09-19
three branches were appending to the end of `webgpu/webgpu-acceleration-plan.md`
and every merge needed a hand-resolved concatenation. One file per decision has no
shared end to collide over, so a branch that records a decision merges cleanly.

Decisions already written into a design document's Review log or decision log stay
where they are. This directory is for new ones.

## What a record contains

The decision, the date, who made it, what it changes, and -- the part that matters --
the argument that was rejected. A record that only says what we do now is a worse
version of the code.

| Record | Decision |
| --- | --- |
| [2026-09-19-no-nightly-gpu-lane.md](2026-09-19-no-nightly-gpu-lane.md) | The GPU lane has no nightly cron |
| [2026-09-19-bench-compare-min-confirms-median.md](2026-09-19-bench-compare-min-confirms-median.md) | A benchmark regression needs the minimum to confirm the median |
| [2026-09-19-graphty-element-owns-webgpu.md](2026-09-19-graphty-element-owns-webgpu.md) | graphty-element owns WebGPU detection; the GPU package is an optional peer |
| [2026-09-19-spmv-pull-is-its-own-kernel.md](2026-09-19-spmv-pull-is-its-own-kernel.md) | `spmvPull` is its own kernel, not a `segmentedReduce` snippet |
| [2026-09-19-spmv-tier-zero-only.md](2026-09-19-spmv-tier-zero-only.md) | `spmvPull` ships the thread-per-row tier only |
| [2026-09-19-afforest-needs-no-dedupe.md](2026-09-19-afforest-needs-no-dedupe.md) | Afforest WCC needs no `dedupe` |
| [2026-09-19-outweightsum-is-call-scratch.md](2026-09-19-outweightsum-is-call-scratch.md) | PageRank's `outWeightSum` is per-call scratch, not a residency entry |
| [2026-09-19-pagerank-ping-pong-is-two-buffers.md](2026-09-19-pagerank-ping-pong-is-two-buffers.md) | PageRank ping-pongs two buffers, not two ranges of one |
| [2026-09-19-a1-lands-inside-m8a.md](2026-09-19-a1-lands-inside-m8a.md) | A1 lands inside phase M8a, together with the first six indexed ports |
| [2026-09-19-pagerank-options-shadowing.md](2026-09-19-pagerank-options-shadowing.md) | The shadowed PageRankOptions stays until 2.0 |
