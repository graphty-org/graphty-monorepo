# The two layout knobs live on behavior.layout; the acceleration threshold keeps one spelling

Date: 2026-09-21
Decided by: the owner, in the M6 plan
(`design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md`, departure DEP-M6-H and plan
decision PD-7)
Changes: `design/element-api/element-api-design.md` 4.12 (`:2851-2867`), whose `ConfigValues` lists
`layoutPreSteps`, `layoutStepMultiplier` and `layoutSettleThreshold` but neither of the two knobs
the simulation seam needs. That section is NOT edited; a dated note under it points here.
`design/webgpu/webgpu-acceleration-plan.md` 9.4 item 7 (`:3197-3211`) is implemented as written and
is not amended.

## The decision

The two knobs the layout package reads are properties of the frame loop, and they sit beside the
frame-loop knob they default from, on `behavior.layout`
(`graphty-element/src/config/GraphBehavior.ts`):

- `iterationsPerStep` -- how many simulation iterations one `step()` submits. Unset it defaults to
  `stepMultiplier`, the number of times the update loop already steps a non-simulation engine per
  frame, so the two engine kinds do the same amount of work per frame by default.
- `maxInFlight` -- how many `step()` batches may be outstanding before a GPU simulation coalesces
  them. Default 2.

The threshold that decides WHERE work runs has exactly one spelling, `"acceleration.minNodes"`
(`ACCELERATION_MIN_NODES_KEY`), and one element door: the reflecting attribute
`acceleration-min-nodes`, which writes the controller's `minNodes`, the same number
`session.config.acceleration.minNodes` reads. `acceleration-min-nodes` is to the threshold what
`acceleration` is to the policy.

When the version 2 `ConfigDocument` lands, `ConfigValues` gains `layoutIterationsPerStep: number`
and `layoutMaxInFlight: number` beside `layoutStepMultiplier`, mapping one-to-one onto
`behavior.layout.iterationsPerStep` and `behavior.layout.maxInFlight`, exactly as
`layoutStepMultiplier` maps onto `behavior.layout.stepMultiplier` today. No task of phase M6
implements `ConfigValues`: the element's `session.config` is the frozen `{ data, acceleration }`
pair, and the configuration document is version 2 session work.

## Why

`iterationsPerStep` and `maxInFlight` are `SimulationOptions` -- the layout package's own type,
read by the CPU simulation and by the GPU one. They describe how hard the layout is driven per
frame, which is what `stepMultiplier` and `preSteps` describe, and a reader tuning one is tuning
all three. Putting them anywhere else would mean two places to look for "how fast does the layout
run".

The threshold is the opposite kind of number: it decides where a computation happens, not how much
of it happens, and it is session configuration already. It gets an attribute because attributes are
how a page with no build step reaches the element, and because a host that wants the reader's
choice remembered has to re-apply it on mount -- the element persists neither the policy nor the
threshold.

## The argument that was rejected

A second spelling of the threshold. Earlier documents call it `gpuMinNodes`
(`design/decisions/2026-09-19-graphty-element-owns-webgpu.md` uses that name), and an attribute
named `gpu-min-nodes` would read naturally beside it. Rejected: one key, one name. Two spellings of
one setting means a consumer setting the one the element does not read, and a search of the
repository that finds half the call sites.

Also rejected: a `ConfigValues` key for each of the two layout knobs NOW, ahead of the
configuration document. The keys would have to be implemented twice -- once against today's frozen
config object and once against the document -- and the second implementation would be the one that
changed their behaviour.

## What we are giving up

Until the `ConfigDocument` lands, the two layout knobs are not exportable settings: they do not
round-trip through `toDocument()`, and a consumer who wants them persisted stores them and applies
them through `layoutBehavior` on mount. The threshold does round-trip, through the attribute.

## What would reverse this

The layout transport moving to `session.layout` (see
`design/decisions/2026-09-21-m6-bridge-is-a-layout-engine.md`). If the per-frame drive becomes a
property of the layout API rather than of the element's behaviour object, the two knobs move with
it, and the `ConfigValues` keys named above are the thing that stays put.
