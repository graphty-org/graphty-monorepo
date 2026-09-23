# Refusing a device that computes incorrectly, rather than computing around it

What this records: why `@graphty/webgpu-graph-algorithms` now runs a correctness check on every device before it
computes on one, why that check is a real scan rather than a probe of a shader construct, and why the package
refuses a failing device instead of running a second implementation that would work on it.

Code: `src/primitives/verify.ts` (the check and the guard), `src/types/context.ts` (`DeviceCheck`, the record a
caller can read first), `E_DEVICE_INCORRECT` in `src/errors.ts`, `test/primitives/verify.test.ts`.

## The defect

On the Windows leg of the host matrix -- Dawn's D3D12 backend over the Microsoft Basic Render Driver, the
software renderer built into Windows, adapter description `D3D12 driver version 10.0.26100.33296` -- compute
shaders that synchronise across a workgroup return wrong answers. A two-block exclusive prefix sum of 257 ones
produced block totals of 1 instead of 256, or 256 and then a block nothing wrote at all, and two runs of
identical code in the same job disagreed. Everything above that scan was wrong with it: the histogram, the radix
sort, the grid build and every layout over them -- eighteen test files. Every single-block scan and every earlier
primitive stayed correct.

It is not our shader. Three repairs were attempted and the third failed identically to the first. Copying
Microsoft's current redistributable renderer (`Microsoft.Direct3D.WARP` 1.0.21) beside the runner's Node
executable made all of it pass untouched, and the adapter description changed to `1.0.21.0`. Another project
reported the same symptom on the same renderer through an unrelated toolchain (gfx-rs/wgpu issue 7904).

The danger to a caller was never a crash. It was silence: a graph laid out from wrong numbers, or a centrality
score quietly incorrect, with no error anywhere.

## Why the check is a scan of the shipped kernels

An earlier hand-written matrix of workgroup constructs (`test/primitives/workgroup-id-probe.test.ts`) was measured
PASSING on that renderer in the same job in which the real scan returned the wrong answer. Six of its seven cases
were right there; the one that failed is a shape no shipping kernel uses. A copy of a shader's shape is not
evidence about the shader.

So the check drives the shipped `prepareScan` through the shipped composer and pipeline cache. One scan covers
both recorded failures at once: a value crossing `workgroupBarrier` inside a block, and a block total crossing
from one dispatch of a compute pass to the next dispatch that reads it -- the shape of every driver in this
package (`src/primitives/scan.ts`, `src/primitives/grid.ts`), and the mechanism behind the second open Windows
finding, a cell histogram that differed between two runs of identical input.

Two details are load-bearing and must survive any edit:

- The input is 1, 2, 3, ..., not all ones. All ones gives every block the same total, so a block total stored at
  the wrong index still reads correct -- which is precisely the Windows symptom.
- The output is filled with `0xdeadbeef` before the dispatch, so a word nothing wrote is distinguishable from a
  word written wrongly. In every failing Windows run the second block's output came back as that poison word.
  That distinction is what made the diagnosis possible, and the thrown error reports it.

## Why refusing, and not a barrier-free second implementation

Solving beats refusing, so it was designed and costed rather than waved away.

The survey: of the thirty compute kernels in `src/wgsl/`, fifteen carry no dependency on a value crossing a
workgroup barrier. Of the fifteen that do, three hold it in their own text (`scan-block`, `radix-hist`,
`radix-scatter`) and twelve hold it through `wg_reduce_f32` / `wg_reduce_u32` / `wg_reduce_vec4`, whose two bodies
live in one place (`src/kernel/prelude.ts`). Setting the workgroup size to one invocation -- which the package
already plumbs -- makes every barrier trivially correct and needs no edit at all in those twelve; the three
self-contained ones need about fifty lines of rewrite; the grid build already has a barrier-free sort that only
wants a correct scan under it. It is a smaller change than it sounds.

Speed was not the obstacle. Measured over 4,194,304 words in 16,384 blocks on the software rasteriser here, the
barrier-free exclusive scan was 9.5x FASTER than the cooperative one (3.0 ms against 28.4 ms) and the barrier-free
block reduction 4.3x faster -- barriers are real thread synchronisation on a processor-backed renderer. On the
card the barrier-free scan was 2.6x slower.

It was rejected for three reasons:

1. It could never be shown to be right. It exists only for devices that return wrong answers, and no device
   available to us returns wrong answers, so every line would ship unverified on the one platform it is for.
   That is the outcome the rule forbids -- wrong answers, more slowly.
2. It breaks two promises that are not recoverable by more effort: a float result being bitwise identical on
   every adapter (a serial fold and a tree fold round differently), and the memory plan (the per-workgroup
   scratch record of `src/constants.ts` grows 256-fold, 64 MB instead of 0.25 MB on a million-node layout).
3. A renderer that returns two different answers for the same shader in the same job has not been shown to be
   wrong about barriers; it has been shown to be wrong. Its atomics, its buffer coherence and its float rounding
   have never been audited, and the second implementation would stake correctness on all of them.

**This is a deliberate trade of working capability for certainty, not the only option available.** Say so plainly,
because the package's own gate record says most of what it computes was correct on that renderer: PageRank,
connected components, the centralities, degree and the exact-tier layouts all passed there. Refusing the whole
device takes a Windows caller on that renderer from "the grid layout tier is wrong above 32,768 nodes" to "no GPU
at all". A per-capability gate is a much larger design; if a real consumer is ever found on that device, it is the
next thing to build.

Refusing is not degrading, and it does not leave anyone without a graph. `graphty-element` owns the choice of
processor for its consumers and already runs the CPU path when this package is absent. An untrusted device is the
same situation as an absent one and reaches the same place: a graph that draws, and a stated reason.

## What the check does not cover

It checks one property. A device that carries values across a workgroup barrier correctly and gets atomics,
subgroup reductions or f32 division wrong passes it. `check: "exclusive-scan"` is a field precisely so a second
check can be added when a device earns one. A green check is the retirement of one failure mode, not a
certificate.

Neither adapter on the dev box reproduces the defect, so nothing measured here shows the gate FIRING on the real
device. What it shows is that it does not fire wrongly, on Dawn over lavapipe and on Dawn over an RTX 4070 SUPER.
The refusal path is proved instead through the package's own sabotage seam: the shipped `scan-block` body is
replaced with one that writes the wrong block total, and the gate reports `out[256] = 1, expected 32896` -- the
block total of 1 the Windows job produced -- and refuses.

## Open

- Dispatch `hosts.yml` on the Windows leg with the gate in place: the workflow is `Hosts`, the scope to choose is
  `windows-scan-questions`, and the Windows job takes about a quarter of an hour. It is the only machine that can
  show the check firing, and everything above is "does not fire wrongly" until it does. What to read afterwards:
  `grep '\[warp-q\] g'` over the job log. Question (g) reads the baseline run and the run made after Microsoft's
  redistributable renderer was copied beside the host executable, and prints one of PROVEN (fired on the renderer
  in the box, silent on the newer one -- the whole proof), HALF PROVEN (fired, but the copied library was never
  loaded, so the second half was not asked) or NOT PROVEN. Every question also carries its own
  `[device-check] VERDICT:` line -- THE GUARD FIRED, THE GUARD IS SILENT or UNKNOWN -- so the Dawn toggles of
  questions (c) through (e3) say for free whether any of them makes the guard go quiet, which would be a repair
  rather than a refusal (the `fxc_optimizations` lead below is exactly that shape).
- A second repair lead nobody has followed up: in the same Windows job, creating the Dawn instance with the
  `fxc_optimizations` toggle made the whole scan set pass on the unpatched in-box renderer
  (`out[wg-1]=255 out[wg]=256 total=257`, exit 0), while every default-toggle run on the same driver failed it.
  `NodeGpuOptions.dawnFeatures` in `src/node/index.ts` already emits the toggle, so the Node path could be
  repair-then-verify: create, check, and on failure re-create once with the toggle and re-check. Honest limits:
  one sample; only the four scan and probe files ran under it, not the eighteen that fail; Dawn defaults it off
  because FXC miscompiles in other cases with optimisations on; and a browser cannot set instance toggles, so the
  refusal stands there regardless.
- `graphty-element` must add `E_DEVICE_INCORRECT` to its `AccelerationErrorCode` union and decide the sentence a
  reader sees. "This browser's GPU driver returns incorrect results, so the graph is being computed on the
  processor" is a different message from "no GPU found".
- Whether `scripts/gpu-report.js` should run the check too, so `pnpm run gpu:report` answers "can this machine be
  trusted" in the same breath as "what adapter is this".
- An accelerator a consumer builds themselves and injects into `graphty-element` never passes through this
  package, so it is never checked. That is correct -- the element has no GPU code -- but the element's
  documentation has to say it.
