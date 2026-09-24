# The grid's sort scratch is model-owned, not a pool lease per batch

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.3, the memory-table row "grid tier only:
sort scratch" (line 1741), whose ownership cell reads "pool lease per batch". The line is not
edited; this record changes the owner of that row and leaves its size, its usage class and its
"keys + values ping-pong" note as written.

## The decision

The sort scratch pair (`sortedKey`, `sortedIdx`), the radix histogram table and the scan's block
sums are buffers the model allocates at `load()` and frees at `dispose()`, beside the pyramid
and the grid's other fixed-size buffers. Nothing in the grid pipeline leases from the pool per
batch. The cost is 16 B/node resident on the grid tier (16 MB at 1M nodes) plus the two small
tables.

## Why

`Kernel.bind` caches bind groups by buffer identity, offset and size (`kernel.ts`: "every
GPUBuffer seen by any Kernel gets one number, once"). A pool lease may hand back a different
buffer each batch, so G2 (the sort), G3 (the histogram over `cellKey`, which
after the sort holds a permutation of the keys) and G4 (the
centroids over `sortedIdx`) would miss the cache and rebuild their bind groups every batch. The
grid records one batch per iteration at the default `iterationsPerStep` of 1; a layout of 500
iterations would create and drop 1,500 bind groups for buffers whose contents are rewritten
every iteration anyway.

A model-owned buffer has one identity for the model's lifetime, so every grid kernel binds once
and the batch loop stays at the record-and-submit cost the exact tier already has.

## What we are giving up, and why it is acceptable

The rejected argument was to keep the design's lease:

> | grid tier only: sort scratch | `2 x (4n + 4n)` | storage | pool lease per batch | keys +
> values ping-pong |

It is right about the memory: a lease returns the scratch to the pool between iterations, so an
algorithm running between two layout iterations (a PageRank colouring pass, say) could reuse
the same bytes, and the grid tier's resident footprint would be 7.3's 65 B/node rather than
81 B/node. On a 12 GB card at the 10M tier that is 160 MB, which is not nothing.

It is acceptable because 81 B/node at the design's 1M target (7.21) is 81 MB on a
card whose smallest supported size is measured in gigabytes, and because the bind-group rebuild
is per iteration on the hot path
while the memory is paid once. A lease that saves 16 MB at 1M by rebuilding bind groups every
iteration trades a fixed cost for a recurring one.

## What would reverse this

One condition, counted:

- The 16 B/node puts a 12 GB card under the 10M / 100M tier's budget, measured: a `node-limits`
  run at that size fails allocation with the model-owned scratch and succeeds with a lease. Then
  the scratch goes back to the pool, `Kernel.bind`'s cache key gains a lease-slot identity so
  the rebuild does not come back with it, and this record is superseded by the one that does it.
