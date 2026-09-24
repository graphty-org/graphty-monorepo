# A performance target belongs to a class of card, not to every card

Date: 2026-09-24
Decided by: the owner, who asked whether the missed target was justified or lazy and delegated
two-way calls
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 10.4, the target table's status as
a cross-class contract, and target T-7 in particular. That section is NOT edited; this record
supersedes it. The measurement behind it is finding G4-F21 in
`webgpu-graph-algorithms/docs/decisions/G4.md`.

## The decision

The target table of section 10.4 is a contract on the reference card and a RECORDED figure on
every other class of runner. A class that misses a target is not failing the gate; the gate
requires the figure to be measured, reported and compared against that class's own pinned
baseline, which is what catches a regression.

Where a class needs a number of its own -- because something automated has to go red on it --
the number is set from that class's own measurements, not by scaling the reference card's.
For `gpu-linux-t4`, target T-7 is **25 ms**: the slower of the two observed medians on that
class, 18.165 ms, times the 1.35 the benchmark gate already tolerates as run-to-run variation.

T-7's 15 ms stands for the reference card and is met there with room to spare (1.493 ms).

## Why: the target was never a statement about the kernel

The attraction pass is an indirect gather -- it walks the edge list and reads node positions
through an index -- so what decides its speed is whether those positions are still in cache.
G4-F21 measured it across a ladder of working-set sizes on both cards. Each card's time falls
off a cliff at its own cache capacity and nowhere else: the Tesla T4 pays 13.9 times the time
for 4 times the work on the one step that crosses its 4 MiB, where every other step on the
ladder costs 2 to 3 times; the RTX 4070 SUPER's throughput halves for a single doubling that
crosses its 48 MiB. Same kernel, same graph, two cliffs, each at its own card.

The ratio between the cards follows from that and proves it has no other cause. It sits near
2.5 while the positions fit both caches, rises to between 7.5 and 9.4 once the array fills the
T4's cache but not the dev box's, and comes back DOWN to 3.5 at the largest size, where neither
card holds it. A kernel inefficiency cannot switch itself off at the moment the fast card runs
out of cache.

So "15 ms at a million nodes" is not a claim about our code. It is a claim that 16 MiB of
positions fit in the card's last-level cache. The reference card misses the same 15 ms at four
million nodes for exactly the reason the T4 misses it at one million, and once neither card
fits, the two are 3.5x apart -- inside the 2.8 to 5.7 band every other measurement shows.

Which settles the question that prompted this: the miss was neither justified nor lazy. It was
a target written on one machine and applied to another whose cache is twelve times smaller,
and nobody had measured the thing that decides it.

## The second reason, which is about measurement rather than hardware

The lane's own T-7 row, on the run that produced the ladder, reads **13.796 ms** -- under the
15 ms target -- where the session that recorded the miss read 18.165 ms. Every neighbouring
row is 12 to 31 percent faster as well. These are two rented instances of the same card class
doing identical work, and they differ by up to 1.32x.

One lane figure is therefore not a class figure, and a target set from a single run of a rented
machine will flip between passing and failing for reasons that have nothing to do with the
code. That is why the T4 number above is taken from the slower observation with the gate's own
tolerance on top, and why the rest of the table is recorded rather than enforced off-reference.

## What we are giving up

A recorded figure does not fail a build. A change that makes the attraction pass slower on the
T4 but not on the reference card will not turn the lane red by missing a target.

It will still be caught, by the mechanism that is actually built for it: the benchmark
comparison runs on every lane run and compares each row against that class's own pinned
baseline. That is strictly better at finding regressions than a fixed target, because it
measures against what this class did last time rather than against what a different card did
once. The target's job was to say "fast enough to ship"; the baseline's job is to say "slower
than it was", and only the second one can detect a regression at all.
