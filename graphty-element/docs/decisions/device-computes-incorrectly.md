# A GPU that computes the wrong answer, and why the element asks before it attaches

What this records: why graphty-element now has a sixth reason acceleration can be unavailable,
why the question is asked at attach rather than on the first piece of work, and what a reader on
such a machine sees.

Code: `E_DEVICE_INCORRECT` in `src/errors/codes.ts` and in `ACCELERATION_ERROR_CODES`;
`GraphAccelerator.verify` in `src/acceleration/types.ts`; `AccelerationController.#verify` and
`#refuseDevice`; `verify` in `src/testing/fakeAccelerator.ts`;
`test/acceleration/AccelerationController.test.ts`.

## The failure

The software renderer that ships with Windows miscomputes compute shaders that pass a value
across a workgroup barrier. It does not crash and it does not error: it returns numbers, and the
numbers are wrong. Every multi-workgroup prefix sum comes back wrong, and the sort, the histogram
and the whole grid layout tier built on one come back wrong with it, looking entirely plausible.
A reader gets a graph laid out from arithmetic nobody can trust, with nothing anywhere saying so.
`@graphty/webgpu-graph-algorithms` records the diagnosis in its own
`docs/decisions/device-self-check.md`; what it does about it is run a real prefix sum of known
numbers the first time it is given a device, check the answer on the host, and refuse a device
that gets it wrong.

Before this change the element had never been told that reason exists. Its five acceleration
codes covered no WebGPU, no adapter, a software rasteriser, a lost device and a graph too large --
every one of them a device that is missing or unsuitable, none of them a device that answers
and lies.

## What happened without it, measured

A probe on such a machine succeeds: an adapter is there, it is not a software rasteriser by the
element's test, and building an accelerator compiles nothing. So the element attached it and
published `state: "idle"` with the broken device's vendor and description, and the app's status
chip read "GPU acceleration: on".

The first accelerated run -- a PageRank, or the first submitted frame of a GPU layout -- reached
the peer's guard and threw its `E_DEVICE_INCORRECT`. The element does not know that string, so
`GraphtyError.wrap` kept its own fallback and the consumer caught **`E_INTERNAL`**, whose
documentation says "an invariant inside the element broke. This is a bug in graphty-element, not
in the call. The caller files an issue." The real code survived only as `details.sourceCode`. The
published state never moved: `capabilities.acceleration` went on saying a healthy device was
attached, so every later run was planned onto it and failed the same way, and the chip went on
saying the GPU was on.

Three things wrong at once, and the worst of them is the middle one: the element told the
consumer that graphty-element was broken when the truth was that their graphics driver is.

## Why the check runs at attach

The element's own documentation says absence of acceleration is a state the consumer renders, not
a failure it catches, and the controller already probes, builds, attaches, watches for device loss
and publishes. A device that computes wrong answers is one more answer to "is there a usable
accelerator here" -- the same question as "is there an adapter" -- so it belongs in the same
place, decided once, before any of the graph goes near it.

Discovering it on the first layout frame instead puts the discovery inside a repaint, where it
surfaces as a visible rendering failure in the middle of drawing, at a moment the consumer has no
reason to be handling acceleration errors. Asking at attach costs 14 to 20 milliseconds once, on
a machine that has already produced an adapter, and nearly all of it is compiling shaders any
accelerated run compiles anyway.

**This is capability detection, and it is not the fallback the rules forbid.** The forbidden
thing is catching an error from an accelerator that was already running and quietly finishing the
work on the CPU, which turns a real failure into a plausible-looking number. Nothing here does
that: the decision is made before any accelerated work starts, and a failure from work that had
already started still throws.

The cost stays off the path of a consumer with no accelerator at all. `#verify` is reached only
after a factory has actually built one, and an accelerator that cannot check itself omits
`verify` and is asked nothing.

## Where the question is asked, and where it is not

The element asks what the element built. An accelerator arriving through a registered factory is
asked before it is attached; one handed over already built through `setAccelerator` is not,
because the element did not construct it, does not own its lifetime and does not dispose it --
whoever did all three vouched for it by handing it over.

The element does not know how to check a GPU, and must not: nothing outside `webgpu.ts` may name
the optional peer. So the seam is one optional member on the accelerator, `verify(): Promise<void>`
-- resolve when the hardware is trustworthy, reject with `E_DEVICE_INCORRECT` when it is not --
and every backend answers it the same way, the element's own and a third party's alike.

## What a consumer sees

Exactly what they see for a missing adapter, which is the point: `capabilities.acceleration`
reads `state: "unavailable"`, `code: "E_DEVICE_INCORRECT"` and a `reason` naming the backend and
what disagreed; `capabilities:changed` and `graphty-capabilities-change` carry it like any other
transition; the graph draws on the CPU path; and nothing is thrown at them. Under
`acceleration="required"` it throws `E_NO_ACCELERATOR` carrying `details.acceleration:
"E_DEVICE_INCORRECT"`, which is what `required` is for.

The graphty app needed no change. Its status chip already renders the element's `reason` and
decides nothing, so it now reads out the true sentence instead of a generic failure -- which is
what the app-must-not-work-around-the-element rule looks like when it is being obeyed rather than
repaired.

## What this does not do yet

**The shipped WebGPU accelerator does not implement `verify` yet, and the reason is a version
rather than a design.** The peer's device self-check landed after the release graphty-element's
peer range resolves to (`>=0.5.1 <1.0.0`, and the published 0.5.1 predates it), so `verifyDevice`
is not a name `webgpu.ts` can import. The line that finishes it is
`verify: () => verifyDevice(ctx).then(...)` on the accelerator `webgpu.ts` builds, and it lands
when the peer range names a release that exports it. Everything above it -- the code, the seam,
the controller, the published document, the chip -- is in place and under test against the fake.

Until that line lands, a real machine with this defect is caught by the peer's own guard from
inside the first accelerated run, and `#refuseDevice` turns that into the same published state:
the run throws, the element lets go of the device, and `capabilities.acceleration` reports
`unavailable` with `E_DEVICE_INCORRECT` so nothing else is planned onto it. That is the right
ending reached the wrong way round, and it is one failed run worse than the design.

`#refuseDevice` does not try to reattach, where a lost device does. A device that was lost might
come back; a device that computes wrong answers was never trustworthy, and a fresh probe would
find the same hardware.

The check is one property, and it is the accelerator's property to define. A backend whose
`verify` resolves has retired one failure mode, not earned a certificate: the peer's own record is
explicit that a device which carries values across a workgroup barrier correctly may still get
atomics, subgroup reductions or float division wrong.
