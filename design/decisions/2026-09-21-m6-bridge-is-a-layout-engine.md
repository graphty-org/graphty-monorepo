# The accelerated layout is a LayoutEngine subclass, not a layout factory

Date: 2026-09-21
Decided by: the owner, in the M6 plan
(`design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md`, departure DEP-M6-A and plan
decision PD-8)
Changes: `design/element-api/element-api-design.md` 4.7 (`:2258-2330`, the `LayoutApi` transport
`play` / `pause` / `tick` / `stop` / `settle` on `session.layout`) and 4.14 (`:2992-3067`, the
`{ kind: "layout"; descriptor: LayoutDescriptor; create: LayoutFactory }` plugin, with
`LayoutFactory` declared in section 12 at `:4311-4312`); and one statement of
`design/decisions/2026-09-19-land-element-graph-store.md` (`:83-90`, "The layout extension point
stops being a class"). Those sections are NOT edited; this record supersedes them. Both places
carry a dated note pointing here.

## The decision

graphty-element drives `@graphty/layout`'s `LayoutSimulation` -- the seam that runs a force layout
on the CPU or on an accelerator -- from `SimulationLayoutEngine`, a class extending the element's
existing abstract `LayoutEngine`
(`graphty-element/src/layout/SimulationLayoutEngine.ts`). `LayoutManager` constructs it with the
acceleration controller, and it is registered under the built-in names `forceatlas2`, `spring` and
`spring-electrical` through `LayoutEngine.register(cls)`, beside the other fourteen
(`graphty-element/src/layout/index.ts:20-36`).

The transport is the element's own: `element.setRunning(running)` plays and pauses, `isRunning()`
and the `graph-settled` event report, and the per-frame `step()` is the update loop's, exactly as
WebGPU design 9.4 item 9 (`design/webgpu/webgpu-acceleration-plan.md:3220-3229`) specifies. No
`session.layout` API and no `LayoutFactory` registry are built by this phase.

The three things a later `LayoutApi` needs are on the bridge already and are the members that API
would read: whether it is running, whether it has settled, and how many steps it has taken.

## Why

The factory registry has not been built, and neither has the session API that would use it.
Version 2 of the element ships `LayoutEngine.register(cls)` over classes, the live extension note
(`design/graphty-element/extension-points.md`) documents "a class extending `LayoutEngine`" as the
registration idiom a third party writes today, and `session.layout` does not exist. Landing the
accelerator seam through an API that has to be invented first would put two unrelated pieces of
work -- the GPU bridge and the version 2 layout transport -- into one task, and make gate G6 wait
on both.

The bridge is also the wrong place to prove the new registration shape. What M6 has to establish
is that an accelerator can be attached to a running layout, removed from it, and swapped under it
without losing positions or pins. That is a statement about the simulation and the frame loop, and
it is true whatever registers the layout.

## The argument that was rejected

`design/decisions/2026-09-19-land-element-graph-store.md` said this class could not be written:
"In 2.0 a layout is a factory function registered through one registry ... There is no class to add
members to." That was a correct reading of the design and an incorrect prediction about the tree.
Version 2 landed without the factory registry; the class is still the extension point, still what
the extension note tells a third party to write, and still what all seventeen built-in layouts are.
A record that says a class cannot be added to has to be answered by the tree, not by the design it
was reasoning from.

The second rejected option was to build `LayoutFactory` and `session.layout` in M6 and register the
bridge through them. It buys nothing this phase needs, and it would ship a version of the layout
transport designed around the one caller that exists rather than around the API the design
specifies.

## What we are giving up

A consumer who wants to pause an accelerated layout calls `element.setRunning(false)`, not
`session.layout.pause()`. There is one transport in the element today and it is the element's
property surface, so nothing is inconsistent -- but a reader of the design will find verbs in 4.7
that the element does not answer to yet, and 4.7's `state` machine (`idle` / `running` / `paused`
/ `settled` / `stopped`) is expressed as a boolean and a settled flag.

## What would reverse this

The layout factory registry landing. When `LayoutFactory` and `session.layout` exist,
`SimulationLayoutEngine` becomes the implementation behind a factory registration rather than a
registered class, and the transport moves to the session API; the simulation, the swap, the pin
packing and the release list are unchanged by that move, which is why they were built here.
