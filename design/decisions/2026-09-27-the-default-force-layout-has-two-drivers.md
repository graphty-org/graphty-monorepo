# The default force layout has two drivers, and the element picks one

Date: 2026-09-27
Decided by: this change, from the measurement below; issue #439 asked for it
Changes: nothing in the design is contradicted. It completes what the layout catalogue's own file
comment anticipated -- "More than one engine can draw one arrangement. `force` is drawn by ngraph
today and could be" -- and gives `design/decisions/2026-09-21-spring-electrical-fails-loudly-on-set.md`
the case it did not have: an accelerated force layout a consumer never has to ask for by name.

## The decision

The element's default layout is the `force` arrangement, and `force` now has two drivers:

- **`ngraph`** (`ngraph.forcelayout`, Barnes-Hut, on the processor) draws it on a graph of under
  two thousand nodes, and on any machine with no accelerator attached, whatever the size.
- **`spring-electrical`** (the same force model, computed on an accelerator) draws it from two
  thousand nodes upwards when an accelerator that implements it is attached, and at any size under
  the `acceleration="required"` policy.

`LayoutManager.forceDriver` takes the decision, from the accelerator the controller holds, the
policy, the consumer's own `acceleration.minNodes` and the graph's node count. It is re-taken at
every freeze -- which is where a graph gets its size, since the default layout is set before any
data arrives -- and at every controller transition, so an accelerator that arrives moves the
running layout onto it and one that leaves moves it back.

Nothing about this is visible in the element's API. `setLayout` is not called, `layoutType` still
answers `ngraph`, the `layout-changed` event still names `ngraph`, and no consumer writes a probe,
reads a capability or picks an engine to get the accelerated arrangement. That is the architectural
rule this closes: before it, the accelerated force layout could only be had by a consumer who knew
that `spring-electrical` was ngraph's physics and that their machine could run it, which is the
consumer writing hardware detection the element is supposed to own.

Asking for `spring-electrical` by name is unchanged, and still fails with `E_NO_ACCELERATOR` when
nothing can compute it. A consumer who names the engine has chosen the engine.

## The measurement this rests on

`ngraph.forcelayout` had never been timed in this repository. One `step()`, at the element's own
ngraph settings (`springLength: 30`, `springCoefficient: 0.0008`, `gravity: -1.2`, `theta: 0.8`,
`dragCoefficient: 0.02`, `timeStep: 20`, three dimensions), on Node 20 on the 14900 box under the
load it happened to be carrying. Minimum and median over 8 to 50 steps, milliseconds:

| nodes   | 2 edges/node, min | median | 10 edges/node, min | median |
| ------- | ----------------- | ------ | ------------------ | ------ |
| 100     | 0.13              | 0.24   | 0.13               | 0.16   |
| 300     | 0.73              | 0.76   | 0.54               | 0.81   |
| 1,000   | 2.60              | 4.15   | 3.84               | 5.44   |
| 2,000   | 7.21              | 11.94  | 9.11               | 13.23  |
| 5,000   | 29.0              | 36.0   | 15.7               | 28.0   |
| 10,000  | 75.5              | 89.9   | 46.9               | 104.6  |
| 20,000  | 272               | 315    | 226                | 281    |
| 100,000 | 1,816             | 2,025  | 2,423              | 4,725  |

Two things follow, and the first corrects a claim the catalogue was making. ngraph does **not**
"stay interactive on graphs of a hundred thousand nodes": one step there costs about two seconds,
which is half a frame per second. And the curve leaves the frame budget between one and two
thousand nodes -- 2.6 to 3.8 ms at a thousand, 12 to 13 ms at two thousand, where a 60 Hz frame has
16.7 ms in total to pay for the layout, the repaint and everything else.

Against it, the accelerated side, from `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`:
one GPU layout iteration costs 0.593 ms of kernel time and 0.723 ms of wall time at 10,000 nodes on
an RTX 4070 SUPER, and 5.4 ms at a million. So the accelerator is already ahead of ngraph at about a
thousand nodes and further ahead at every size above that -- 65x to 145x at ten thousand.

**Two thousand rather than one thousand**, because a rebuild and a graph upload are not free, and
because below two thousand ngraph still fits a frame on its own. The floor also keeps the DEFAULT
PICTURE unchanged for every graph small enough to study: the two drivers agree to within a quarter
on the edge-length distribution of a 150-node graph (`webgpu-graph-algorithms/docs/decisions/G5.md`
item 4 measured 1.94 % and 5.55 % on the quantiles), which is close but not identical, and a reader
who asked for nothing should not have their small graph redrawn by whatever hardware they happen to
own. Above the floor the question does not arise in the same way: ngraph's picture at those sizes is
one a reader waits seconds for.

## What the two drivers do NOT share

**Their published defaults.** Each driver keeps its own option schema and its own defaults, and the
element translates nothing: `ngraph` runs at the element's long-standing tuning above, and
`spring-electrical` runs at `ngraph.forcelayout`'s own library defaults (`springLength: 10`,
`springCoefficient: 0.8`, `gravity: -12`, `dragCoefficient: 0.9`, `timeStep: 0.5`), which is the
configuration its oracle was cross-checked against ngraph 3.3.1 in. An option a consumer sets by
name -- every one of those five is spelled the same in both -- reaches whichever driver runs.
`theta` is ngraph's Barnes-Hut parameter and has no meaning for the accelerated solver, so it is
dropped there rather than reinterpreted.

**The arrangement, across a swap back to the processor.** The accelerated driver adopts the
coordinates already in the element's position array, so a swap onto it continues the layout;
ngraph places the bodies it is given itself, so a swap back to it re-seeds them. A swap in that
direction happens when an accelerator is detached or lost, or when a graph shrinks below the floor.

## Live additions

The catalogue advertises ngraph as accepting nodes and edges added while it is running, and the
accelerated driver keeps that promise by a different route: a data load freezes a new snapshot, the
element hands it to the running simulation (`SimulationLayoutEngine.reload`), and the arrangement is
carried over in the simulation's own units. That path was already in place for `forceatlas2` and
`spring` and is pinned by `test/browser/simulation-layout-engine.test.ts`. Nothing about live
addition had to be built for this, and nothing about it is worse on the accelerated driver.

## The arguments that were rejected

**Give `spring-electrical` a CPU path -- ngraph IS its CPU path -- and route by name.** Issue #439
proposes it, and it is the tidier model: one engine, one name, two implementations, and
`setLayout("spring-electrical")` works on every machine. Rejected because it deletes a published
error: `E_NO_ACCELERATOR` from a `setLayout` that names that engine is the contract
`design/decisions/2026-09-21-spring-electrical-fails-loudly-on-set.md` decided on and a consumer may
be switching on it. The same consumer benefit is available with the contract intact -- the default
arrangement reaches the accelerator, and the loud name stays loud -- which is what landed.

**No floor: the accelerator whenever one is attached.** Simpler, and closer to what the
architectural rule reads like on its own. Rejected on the measurement: at a hundred nodes ngraph's
step costs 0.13 ms, a rebuild and an upload cost more than the step they replace, and every small
graph a reader studies would be redrawn by hardware they never asked to use, with the two pictures
agreeing only to within a quarter on edge length. `acceleration="required"` is how a consumer asks
for exactly this.

**A published option for the floor, in `behavior.layout`.** Rejected as a contract published for
one number nobody has asked to set. `acceleration.minNodes` already raises it, `required` already
lifts it, and a module constant moves in one edit when a measurement moves it.

## What is still owed

**The owner has not compared the two pictures side by side.** Issue #439 asks for that before the
routing is written, and the floor is what makes landing it first defensible rather than a
substitute for it: no graph small enough for that comparison to be about anything a reader would
notice is routed to the accelerator unless the consumer set `acceleration="required"`. If the owner
looks at a large graph drawn both ways and does not accept the accelerated picture, the change to
make is the floor, not the routing.

## What would reverse this

A measurement that puts the crossover somewhere else -- a browser's readback cost, a weak
integrated GPU, or an ngraph that got faster -- moves `FORCE_ACCELERATED_MIN_NODES` in
`graphty-element/src/managers/LayoutManager.ts` and nothing else. The routing itself is reversed
only by deciding that the default arrangement should never reach an accelerator, which is the
position issue #439 exists to reject.
