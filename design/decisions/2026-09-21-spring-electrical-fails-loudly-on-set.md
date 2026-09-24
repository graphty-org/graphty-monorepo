# spring-electrical is always offered and fails loudly when no accelerator implements it

Date: 2026-09-21
Decided by: the owner, in the M6 plan
(`design/webgpu/plans/2026-09-21-webgpu-m6-graphty-element-v2.md`, departure DEP-M6-E and plan
decision PD-15)
Changes: `design/webgpu/webgpu-acceleration-plan.md` 9.4 item 6 (`:3188-3196`), which offers a
`"spring-electrical"` registration "only when `graph.accelerator?.springElectrical` exists". That
section is NOT edited; this record supersedes it.

## The decision

`spring-electrical` is a built-in layout name like the other sixteen, registered at module load
whatever hardware is present (`graphty-element/src/layout/index.ts:27`). Setting it without an
accelerator that implements it throws a `GraphtyError` with code `E_NO_ACCELERATOR` from
`setLayout`, naming what is missing.

What is not static is what the catalogue SAYS about it. `LayoutImplementation`, the per-engine row
under an arrangement, carries `requires?: { accelerator?: boolean }`
(`graphty-element/src/catalog/layouts.ts:84`) and the spring-electrical row sets it (`:223`),
mirroring `AlgorithmDescriptor.requires`. A consumer's layout picker reads that field beside
`capabilities.acceleration.state` and disables or annotates the entry, without trying the layout
and without hard-coding its name.

## Why

A catalogue that changes with the hardware is a different feature from the one this phase is
building. It needs a `catalog:changed` event on every attach and detach, a `LAYOUT_CATALOG` that is
computed rather than declared, and a rule for what happens to a consumer holding a layout id that
just disappeared. The element's catalogue is a static table today and its plugin registry publishes
static descriptors.

Failing loudly on `set()` is the element's own rule for a layout that cannot run: an unknown layout
is `E_UNKNOWN_LAYOUT`, a layout asked for in more dimensions than it supports is `E_UNSUPPORTED`,
and both are errors from the call that asked, not absences from a list
(`design/graphty-element/extension-points.md:249-254`). `E_NO_ACCELERATOR` is the same shape of
answer for the same shape of question.

And the absence is the worse diagnostic of the two. A consumer who asks for `spring-electrical` on
a machine with no device gets, under the design's rule, "unknown layout" -- which is the same
answer they would get for a typo, and sends them to look for a misspelling instead of at their
hardware.

## The argument that was rejected

Offering the layout only when the attached accelerator has `springElectrical`, as 9.4 item 6 says.
Its case is real: a picker built from the catalogue then cannot offer something that will fail, so
no consumer has to reason about hardware at all.

Rejected because `requires.accelerator` gets the same picker the same answer with no dynamic
catalogue and no new event, and because a list that silently loses an entry is hard to debug from
the outside -- the consumer sees a shorter list and has nothing to ask about why.

## What we are giving up

A consumer who ignores `requires` and offers every layout in the catalogue will show a reader an
entry that throws when they pick it. The error says why, and the catalogue field that would have
prevented it is one property read away, but the failure is at pick time rather than at draw time.

## What would reverse this

`catalog:changed` landing for another reason. Once the catalogue is dynamic and consumers already
subscribe to it, filtering spring-electrical out when no accelerator implements it costs nothing
extra, and 9.4 item 6 becomes the better rule again -- with the loud failure kept for the consumer
who asks for it anyway.
