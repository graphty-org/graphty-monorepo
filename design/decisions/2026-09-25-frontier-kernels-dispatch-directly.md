# The frontier kernels are dispatched directly, gated by a path word; nothing dispatches indirectly

Date: 2026-09-25
Decided by: the phase's builder, as a two-way call inside the owner's instruction to land the
frontier family and merge it when green; the measurement that forced it is finding G8-F5 in
`webgpu-graph-algorithms/docs/decisions/G8.md`
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 5.4, the selector paragraph (lines
1483-1493: "every candidate is recorded for every round, one INDIRECT | STORAGE | COPY_DST buffer
holds one 16-byte slot per (round, candidate), and finalize writes real args into exactly one
slot per round and (0, 0, 1) into the others"), section 8.4 (the BFS host loop, line 2667, and
the near-empty test, line 2689) and section 8.8 row 4 (line 2801), which describe the per-level
kernels of BFS and SSSP as indirect dispatches sized by that device-written args buffer. Those
passages are NOT edited; this record supersedes them. The rest of section 5.4 stands:
`indirect-finalize` and the grid pyramid's hub dispatch are still indirect, once per layout
iteration, where the cost below is invisible.

## The decision

Every per-level kernel of breadth-first search, of the near-far shortest-path loop and of the
closeness sweep is a DIRECT `dispatchWorkgroups` of a host-planned grid-stride grid
(`planGridStride`: at most 4,096 workgroups on hardware, 64 on a software adapter), and the
kernel loops to the count word it has always read. Which kernels do a level's work is decided,
as before, on the device by the selector kernel `frontier-finalize`; it now writes that decision
into a new word of the counters block, `path` (word 24: 0 nothing, 1 two-phase, 2 fused, 3
bottom-up, 4 the fused retry, 5 a near SSSP round, 6 a far one), and every level kernel reads
that word first and treats any other value as an empty count. The SSSP dedupes take their
counts from two words the selector's round role writes (8 and 9, unused by SSSP until now),
the chosen half's raw count and 0 for the other. The selector still writes its seven indirect
slots per level, because the frontier tests read them back as the record of its decision;
nothing dispatches from them, and deleting them together with those tests is a follow-up.

## Why: the indirect dispatch was 97 % of a traversal's wall time, and it was our choice

Dawn validates every `dispatchWorkgroupsIndirect` by inserting an internal compute dispatch that
copies the three words to a scratch buffer and clamps them against
`maxComputeWorkgroupsPerDimension`, with its own bind group and barriers. Measured on the RTX
4070 SUPER with an empty kernel, submit to a 4-byte map: 0.39-0.45 ms of device time per
indirect dispatch whether the slot holds `(0, 0, 1)` or `(1, 1, 1)`, in Dawn-node 0.4.0 and in
Chromium 143 alike; a direct dispatch of the same kernel costs about 1 us in Node and 10 us in
Chromium; only Dawn's `skip_validation` toggle removes it, and no browser user can set that.

The traversal recorded 32 levels per submit unconditionally, each level seven indirect
dispatches, six of them reading a zero slot. On the karate club (34 nodes, 4 levels) that was
224 indirect dispatches per call for 0.8 ms of kernel time: 90.9 ms wall in Node, 93.1 ms in
Chromium through graphty-element, against 0.5 ms for the CPU walk. The same fixed cost sat
under every size up to 100k nodes (76-98 ms), which is why the GPU lost to the CPU by two to
four orders of magnitude on every graph the app shows and won only above about a million nodes.

An adaptive submit cadence alone would have left about 2.85 ms per recorded level; the direct
form leaves the runtime's own per-dispatch cost, tens of microseconds. Measured on the same
card after the change (load average 23-31 from other work on the box, so these are upper
bounds): karate BFS 7.2 ms in Node (from 89.3), 1k / 10k 6.9 ms (from 88.3), 100k / 1M 9.2 ms
(from 89.3), 1M / 10M 61.7 ms (from 98.2, and under the 100 ms target T-10 for the first time);
SSSP on karate 8.0 ms (from 88.4), 1M / 10M 133 ms (from 199). The GPU-versus-CPU crossover
moved from about a million nodes to a few tens of thousands.

## What the field does

NVIDIA cuGraph, Gunrock, GraphBLAST and Merrill's original traversal all drive the level loop
from the host and read the frontier size back every level, because in CUDA that round trip is
under 10 us; ours is about 2 ms in Chromium, which is why we batch levels speculatively instead.
The batched form with device-side termination is what the WebGPU projects that exist use (the
WGLog paper measured it at 15x over a readback per level). None of them pays for a slot per
candidate kernel; the seven-slot design was ours.

## What this does not decide

The size below which graphty-element should keep a traversal on the CPU. With a floor of about
7 ms per call the GPU still loses on a 34-node graph by an order of magnitude; the element's
`acceleration.minNodes` applies to algorithm runs and defaults to 0, measured for the
force-directed layout and never for a traversal. That threshold is an element decision and is
tracked separately.
