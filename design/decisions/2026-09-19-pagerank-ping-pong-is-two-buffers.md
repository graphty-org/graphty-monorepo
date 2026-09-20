# PageRank ping-pongs two buffers, not two ranges of one

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 8.10, the sentence "Ping-pong pairs are one
buffer with two bind groups", as it applies to the rank pair of PageRank and of the power
iterations (HITS, eigenvector, Katz) built on the same driver. That section is NOT edited. The
BFS bitset rows of the same table are P8's and are not decided here.

## The decision

`src/algorithms/pagerank.ts` leases two scratch buffers, `rankA` and `rankB`, of `n` f32 each,
from the algorithm scope's one `Lease`. Iteration `i` binds `rankIn` and `rankPrev` on `pr-scale`
to one and the other, `rankOut` on `spmv-pull` to the second, and the next iteration swaps them.
Every binding is a whole buffer at offset 0. `Kernel.bind` caches a bind group by
`bufferId:offset:size`, so after the first two iterations the swap is one `Map` lookup and
allocates nothing. Two bind groups, as the design wants; two buffers, which it does not.

Nothing else moves: no bind group is rebuilt per iteration, no readback happens inside a batch,
and the rest of 8.10 -- counters and flags sharing one `u32` block, the PageRank scalars sharing
`partials` -- is followed as written.

## Why

Nothing forbids the one-buffer form, and what it gains is small, uneven, and paid for with
fewer nodes.

It is bindable. `Kernel.bind`'s aliasing check (`src/kernel/kernel.ts`, the loop over resolved
bindings) runs once per kernel and only rejects a pair of slots that name one buffer when one of
them is `storage` and the other is not, or when both are `storage` and their ranges intersect.
On `pr-scale` the two halves would arrive through
`rankIn` and `rankPrev`, both `storage-ro`, which the check skips. On `spmv-pull` one half would
arrive through `rankOut` alone (the kernel's input is `xNorm`, a different buffer), so there is
no pair to reject. WebGPU's usage-scope validation is per dispatch, and the half that `spmv-pull`
writes is only read by the `pr-scale` dispatch before it, so the two accesses never meet in one
scope either.

It saves little. The design's rule buys one bind group per resource set, and `bind()`'s cache
gives two buffers that already: two cached bind groups, one lookup per iteration. It buys no
bookkeeping: every scratch buffer of the scope is released by the one `dispose()` in the
algorithm's `finally`, so a second lease is a second line of `scope.scratch()` and nothing more.
It can buy pool bytes, but only in some size bands. The pool rounds every request up to a class,
powers of two from 4 KiB to 64 MiB and 16 MiB steps above that (`BufferPool.sizeClass`,
`src/memory/buffer-pool.ts`). One buffer of two 256-aligned halves is never larger than two
buffers of `4n` bytes, and for `512 < n <= 8,388,608` (`2 KiB < 4n <= 32 MiB`) the two forms
round to the same total. Outside that band two buffers cost more: 4 KiB more at `n <= 512`, where
each of the two rounds up to the 4 KiB minimum class; 48 MiB more for `8,388,609 <= n <=
10,485,760`, 32 MiB more up to `n = 12,582,912` and 16 MiB more up to `n = 14,680,064`, where two
buffers round to two 64 MiB classes while the doubled request lands in the 16 MiB steps; nothing
more for `14,680,065 <= n <= 16,777,216`; and above that 16 MiB more in alternating bands of
2,097,152 nodes, the first being `16,777,217 <= n <= 18,874,368` (exact sweep of
`BufferPool.sizeClass` over `2 * sizeClass(4n)` against `sizeClass(2 * align256(4n))`). The
saving is real, is at most a few pool classes, and is never the difference between fitting and not: pool
`E_TOO_LARGE` is thrown per buffer, against the unrounded byte length and the device's
`maxBufferSize` (`BufferPool.acquire`), so one buffer of `2 * align(4n)` bytes fails at half the
`n` that two buffers of `4n` still pass. Two buffers fit every graph one buffer fits, and twice
as many nodes besides.

What the one-buffer form would cost is a computed midpoint offset inside the algorithm driver,
where every scratch binding of `src/algorithms/` is a whole buffer at offset 0. The package does
bind sub-ranges elsewhere, and this record does not pretend otherwise: the residency binds each
core array at its segment offset inside the one arena buffer and binds packed views at
256-aligned offsets of one buffer (`src/memory/residency.ts`), and the force-simulation driver
binds `state` as a 256-byte prefix and `trace` behind it in one buffer
(`src/layouts/force-simulation.ts`). Those are upload-side and layout-side shapes with their own
reasons; the algorithm drivers have none today, and two buffers keep it that way.

## What we are giving up, and why it is acceptable

The rejected argument was one buffer of two 256-byte-aligned halves, `rankIn` at offset 0 and
`rankOut` at the aligned midpoint, swapped by two bind groups. Design 8.10 reads:

> Ping-pong pairs are one buffer with two bind groups; counters and flags share one small `u32`
> block; the dangling / delta scalars of PageRank share `partials`.

It is right about the bind groups: two, cached, never rebuilt, and that part is followed. It is
right that one lease is less to name and less to free where a driver manages its buffers by hand,
and P8's frontier bitsets, which are not decided here, may well be written that way. It is only
that in this package a `Lease` and a bind cache already deliver what the rule was written to
secure, so the rule's cost (a sub-range binding) is paid for nothing.

The cost of two buffers is two `scope.scratch()` calls instead of one, and pool bytes that are
the same for `512 < n <= 8,388,608` and one to three pool classes more in the bands named above.
Bind groups and release are the same, and the per-buffer size limit admits twice the nodes.

## What would reverse this

Two conditions, counted:

- A run on the GPU lane (the T4 or the 4070), measured and not estimated, in which a PageRank
  call at some `n` in one of the bands above completes with the ping-pong as one buffer and fails
  with `E_OUT_OF_MEMORY` as two, because the extra pool classes were the device memory that was
  missing. `E_TOO_LARGE` cannot be the reversing error: it is per buffer, and the one-buffer form
  hits it first.
- P8 lands its bitset ping-pong as one buffer with two bind groups and a sub-range binding
  helper for it, at which point matching that shape here is one edit and its own small decision,
  not this one reopened.
