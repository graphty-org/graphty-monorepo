# A Fruchterman-Reingold reheat restarts the temperature at 70% of the budget, not the iteration count

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.20 line 2444, "`reheat()` sets the
iteration to `floor(0.7 * iterations)` so a drag gets a small temperature", and the `onReheat`
comment of the `ForceModel` interface in 7.19 (line 2323), "FR: iteration =
`floor(0.7 * iterations)`". Neither line is edited; this record narrows "the iteration" in both to the
temperature index and leaves the 70% fraction, the small temperature after a drag and the rest
of the hook interface as they are.

## The decision

On the GPU Fruchterman-Reingold model a `reheat()` (a drag, an unpin, a `setParams`) restarts
the TEMPERATURE index at `floor(0.7 * iterations)` and the iteration BUDGET at 0. The model keeps
a `tempOrigin`, the global iteration index at which its temperature index is 0; `onReheat` arms a
flag, and the next `paramsFor(global)` sets `tempOrigin = global - floor(0.7 * iterations)`
(`webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts`, `temperatureAt`). The
temperature written into each iteration's uniform slot is `max(0, 0.1 - dt * (global -
tempOrigin))` with `dt = 0.1 / (iterations + 1)`, so after a reheat it is the small value the CPU
gives at 70% of its run and it cools to exactly 0 over the remaining 30%. `ForceSimulation.reheat()`
is untouched: it sets `iterationsDone = 0` and `settledCount = 0` for every model and calls
`model.onReheat(writer)` with no iteration argument. A reheated FR run therefore does not stop
when the budget counts to `iterations`; the temperature reaches 0, the integrate kernel moves
nothing, `meanDisplacement` is 0, and the settle window closes the run within `settleWindow`
more iterations. `iterationsDone` at that stop reads about `0.3 * iterations + settleWindow`.
Nothing else moves: the CPU Fruchterman-Reingold simulation
(`layout/src/simulation/fruchterman-reingold.ts`, `reheat()`) still sets its own iteration
counter to `floor(0.7 * iterations)` and stops at the budget, and the `ForceModel` hook interface
of 7.19 keeps its signature.

## Why

`ForceModel` is the P3 contract every layout model implements, and `onReheat(state)` is one of
its nine hooks. Making the budget restart at 70% would need the hook to return the restart
iteration (or take the simulation's counter as an argument) so `ForceSimulation` could set
`iterationsDone` from it, and every model would carry that change to serve one model's budget
accounting. The temperature clamp already makes the reheated run terminate on its own: once the
temperature is 0 the run is settled by the shared rule of 7.17 in `settleWindow` iterations, so
the design's stated purpose for the 70% restart, "a drag gets a small temperature", is met
without the state machine learning anything about temperatures.

The observable difference between the two is the value of `iterationsDone` at the stop, not the
layout: the same temperatures reach the same kernels in the same order either way, and the
positions at the moment the temperature hits 0 are identical. What differs is only whether the
counter reads `iterations` or `0.3 * iterations + settleWindow` when `settled` turns true.

## What we are giving up, and why it is acceptable

The rejected argument was to give `ForceModel.onReheat` a return value, the iteration index to
restart from, so `ForceSimulation.reheat()` could set `iterationsDone` to it and a reheated FR
run would end at the budget exactly as the CPU simulation does. Design 7.20 line 2444 reads:

> `reheat()` sets the iteration to `floor(0.7 * iterations)` so a drag gets a small temperature
> (graft: A 7.16)

and 7.19 line 2323 reads:

> `onReheat(state: StateWriter): void; // FA2: nothing; FR: iteration = floor(0.7 * iterations) (7.20)`

The argument is right that the CPU and GPU simulations now report different `iterationsDone`
after a drag on the same graph with the same options, and that a reader of the two `stats`
records side by side would see it. It is also right that "sets the iteration" reads most
naturally as the budget counter, which is what the CPU simulation does.

It is acceptable because no consumer reads `iterationsDone` after a drag as a budget: the
element waits on `settled`, which turns true either way, and the layout it then shows is the
same. The reheated run still costs about 30% of the budget plus the settle window, which is the
cost the design intended. And the temperature index, which is what actually shapes the layout,
restarts exactly where the design says.

## What would reverse this

Two conditions, counted:

- A graphty-element feature reads `iterationsDone` after a drag as "iterations left in the
  budget" (a progress bar, a remaining-work estimate) and the 30% budget matters to it. Then the
  hook returns the restart iteration, `ForceSimulation.reheat()` sets `iterationsDone` from it,
  every model returns 0 except FR, and this record is superseded.
- The CPU simulation changes its own `reheat()` to keep the budget counter at 0 and restart only
  its temperature. Then the two agree on `iterationsDone` and this record needs no successor.
