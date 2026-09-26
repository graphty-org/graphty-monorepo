# The spring-electrical preset settles by the shared rule, not by ngraph's absolute one

Date: 2026-09-20
Decided by: the owner
Superseded by: `2026-09-24-settle-rule-has-an-absolute-floor.md` (the rule gained an absolute floor; the one-shared-rule reasoning here stands)
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.20 line 2466, which gives the preset
"ngraph's settle rule (total kinetic energy below a threshold)", and the P5 row of 13 (line 4212),
which lists "ngraph's option names and settle rule" among `createSpringElectrical`'s deliverables.
Neither line is edited; this record replaces the settle rule of those two cells and leaves the
option names, the defaults and `SpringElectricalStats.kineticEnergy` where they are.

## The decision

`createSpringElectrical` settles by the one rule every GPU layout shares (design 7.17): the run is
settled when `meanDisplacement <= settleThreshold * rmsRadius` has held for `settleWindow`
consecutive iterations, or the iteration budget is spent. The rule lives in `ForceSimulation`
(`webgpu-graph-algorithms/src/layouts/force-simulation.ts`, `computeSettled`) and is keyed by
nothing: the spring-electrical model does not override it, does not consult `kineticEnergy` to
decide it, and its `onReheat` hook is empty. The kinetic energy is still computed every iteration
(the integrate kernel folds `0.5 * m * |v|^2` over the free nodes into partials B, the statistics
kernel reads it back) and is REPORTED through `SpringElectricalStats.kineticEnergy` and its
per-iteration trace, so a caller who wants ngraph's absolute stop can read the number and stop the
loop itself. The G5 gate's "settles within 1,000 steps" is measured under the shared rule, and the
comparison with ngraph runs ngraph's own `step()` until it returns `true` or 1,000 steps have
passed, so each side stops by its own rule and the layouts are compared, never the stop counters.
Nothing else moves: ngraph's option names (`springLength`, `springCoefficient`, `gravity`,
`dragCoefficient`, `timeStep`) and defaults (10, 0.8, -12, 0.9, 0.5) stay, the velocity integrator
of the companion record stays, and `settleThreshold` / `settleWindow` keep their shared defaults.

## Why

Design 7.17 already IS ngraph's rule, deliberately made scale-relative. Its text names the models
it was built from: "ngraph's `0.01` per body and the element's 10-step average of `0.05` in scene
units are the models ... made scale-relative because layout units are not scene units". ngraph's
own test is absolute: `index.js` computes `lastMove / bodiesCount` and stops at `<= 0.01`, where
`lastMove` is `(sum |dx|)^2 + (sum |dy|)^2` over the bodies divided by their count
(`lib/codeGenerators/generateIntegrator.js`, the integrator's return value). A layout ten times
larger in its own units moves ten times further per step and never reaches ngraph's threshold; a
layout ten times smaller reaches it while still visibly moving. The shared rule divides by the RMS
radius so the threshold means the same fraction of the layout at any scale, which is exactly the
correction 7.17 made and the reason it exists.

One state machine carries one rule. `ForceSimulation` owns the settle window, the in-flight batch
bookkeeping that makes a reheat safe against a batch already computed from the old counter, and
the `settled` getter graphty-element waits on before it screenshots or animates labels. A second
predicate keyed by the model kind would give the element two settle semantics behind one
`settled` flag, and every consumer would have to know which model it loaded to know what
`settled` means.

## What we are giving up, and why it is acceptable

The rejected argument was to add a second, absolute settle predicate inside `ForceSimulation`,
`lastMove / n <= 0.01`, selected when the model's kind is `"springElectrical"`, so the preset stops
exactly when ngraph would. Design 7.20 line 2466 reads:

> 0.5) and ngraph's settle rule (total kinetic energy below a threshold),

and the P5 row of 13 (line 4212) reads:

> `createSpringElectrical` (the preset of 7.20 with the velocity integrator, ngraph's option names
> and settle rule, `SpringElectricalStats`)

The argument gets one thing right: the preset's whole purpose (7.1 item 3) is to stand in for
graphty-element's default engine at large n, and the closer its behaviour to ngraph's the less a
reader notices the swap. Stopping at a different iteration than ngraph is a visible difference,
and this record does not argue that away.

It is acceptable because the difference is when the run stops, not where the nodes are. Both rules
are movement thresholds on a converging trajectory; on the G5 story graph the preset's layout
under the shared rule sits within the gate's 25% edge-length envelope of ngraph's layout under its
own rule, and that comparison is the test the gate runs. The absolute rule is also one line of
caller code over a number the stats already carry: `kineticEnergy` and `meanDisplacement` are both
in every `SpringElectricalStats`, so a consumer who wants ngraph's stop takes it from the stats
without the state machine growing a second predicate.

## What would reverse this

Two conditions, counted:

- A consumer measures the preset stopping visibly early or visibly late against ngraph on three
  real graphs under the shared threshold (the same `settleThreshold` / `settleWindow` on all
  three, the stop iteration and the layout recorded for both engines). Then the model-kind keyed
  predicate comes back as its own decision, with those three measurements as its evidence.
- Design 7.17 itself changes from a scale-relative rule to an absolute one for every model. Then
  the preset follows the shared rule as before and this record needs no successor.
