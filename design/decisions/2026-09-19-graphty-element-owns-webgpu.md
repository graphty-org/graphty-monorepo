# graphty-element owns WebGPU detection; the GPU package is an optional peer

Date: 2026-09-19
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 9.1 (the dependency diagram and the
"graphty-element imports nothing new" paragraph), 9.4 item 1, 9.5 in full, and the W2 row of 9.8.
Also the M6 and M7 plan documents of 2026-09-19, which are amended in place because they had not
landed when this was decided. Those design sections are NOT edited; this record supersedes them.

## The decision

`@graphty/webgpu-graph-algorithms` becomes an OPTIONAL peer dependency of `@graphty/graphty-element`.
graphty-element owns WebGPU detection, construction, device-loss recovery and the policy that
decides when to use a GPU. The graphty app owns none of it.

Activation is an auto-registering subpath. graphty-element publishes a second entry point,
`@graphty/graphty-element/webgpu`, which is a side-effect module: it statically imports the GPU
package and registers an accelerator factory with a registry inside the element. A consumer opts in
with one line and writes no integration code:

```js
import "@graphty/graphty-element";
import "@graphty/graphty-element/webgpu";   // the entire integration
```

Everything after that line is the element's job: probing for an adapter, requesting a context,
constructing the accelerator, attaching it to the graph, handling `ctx.lost`, applying the
`gpuMinNodes` threshold, and running the CPU path when there is no adapter.

A consumer who does not install the optional peer omits the second import. Their build succeeds,
with no bundler configuration and no resolution error.

`Graph.setAccelerator()` stays public. It is how the tests inject a fake accelerator (gate G6 is
defined in terms of one) and how a third party could supply a different implementation.

## Why

The root `CLAUDE.md` Architectural Principles say graphty-element must be self-sufficient and
directly consumable by third parties, and that the app is only HTML around it. Design 9.1 is
incompatible with that: it makes the app the ONLY importer of the GPU package, so GPU acceleration
is a capability only this repository's own application knows how to switch on.

The concrete cost was measured while planning M7. The integration code the app was going to own --
`attachAccelerator`, the probe, the context request, the `ctx.lost` handler, the
`"auto" | "off" | "required"` policy -- is tasks M7-T3 through M7-T5, several engineer-days. Every
third-party consumer would have rebuilt it, or never discovered the feature. Two parts of it are
not obvious to rebuild: WebGPU requires a secure context, so a consumer serving over plain http
gets a silent "off" with no diagnostic, and `gpuMinNodes` has no defensible default -- gate G12
requires MEASURING the CPU/GPU crossover, and a consumer has no harness to measure it with.

## What we are giving up, and why it is acceptable

This is the part a reader needs, because 9.1's argument is real and is not wrong on its own terms.

9.1 buys an acyclic, minimal dependency graph: graphty-element imports nothing new at runtime and
gains no devDependency, and the GPU package's own dependencies never reach a consumer who does not
want them. An optional peer keeps most of that -- a consumer who does not install it pays nothing,
and the core entry never references the GPU package, so no bundler ever resolves it -- but it does
put graphty-element's name on a WebGPU-shaped API, and it means the element's test matrix has to
cover both the registered and unregistered paths.

The second cost is release coupling. `release.yml` already gates publication on `gpu.yml` and
`hosts.yml` being green, and a GPU benchmark flake on a rented T4 has already blocked an unrelated
graphty-element patch from reaching npm. Declaring the peer makes that coupling structural rather
than incidental, and `hosts.yml`'s path filter should grow `graphty-element/**`.

The third is that "one import line" is not zero. A truly zero-code auto-detect -- a dynamic import
of the GPU package from the element's core -- was rejected: module resolution in a bundled browser
app happens at BUILD time, so that import fails the build of every consumer who did not install the
optional peer, and the fix is bundler configuration in a file the consumer may not control. Trading
one documented import line for a build break in the default case is a bad trade. The subpath works
in every bundler, on a CDN, and under an import map, with no configuration in any of them.

## What would reverse this

Either of these, and if one holds, revisit rather than re-deriving this:

- the one import line proves to be a real adoption barrier -- consumers report that GPU "does not
  work" and the cause is the missing import often enough to outweigh a build break; or
- the element's bundle or its type surface grows a hard dependency on WebGPU types that an
  optional peer cannot express, at which point the choice is between vendoring the GPU package as a
  regular dependency and going back to injection.

## What still exists

Everything the GPU package does, unchanged: it throws (`E_NO_WEBGPU`, `E_NO_ADAPTER`, ...) and
never runs a CPU path. The no-silent-degradation rule is unchanged and is NOT what this record
relaxes: detecting that WebGPU is unavailable and running the CPU implementation is correct;
catching a GPU error mid-run and quietly finishing on the CPU is still forbidden.

The app keeps what is genuinely presentation: a Settings control that writes the element's `gpu`
policy into its config, and a status chip that reads the status the element publishes. Reading a
property and rendering it is consuming the element. Deciding, probing, constructing or recovering
is not, and none of that stays in the app.

## Amendment 2026-09-23: three more places in the design that this decision reaches

The Changes line at the top of this record names design 9.1, 9.4 item 1, 9.5 and the W2 row of
9.8. Indexing the design's superseded passages on 2026-09-23
(`design/webgpu/superseded-parts-of-the-design.md`) turned up three more places in the same
document that hand the graphty app work this decision moved into graphty-element. Nothing below
is a new decision; it completes the list this record should have carried. Those passages are not
edited either, for the same reason as the rest.

The line numbers below are the design as it stands on 2026-09-23. A note added at the top of that
file the same day pushed its body down by eight lines, so these numbers are eight higher than the
ones in the Changes line above.

- **13, the phase table, row P6 (line 4221).** The deliverables cell ends "app: 9.5
  `attachAccelerator`" and the row's outcome column reads "the GPU layout 'detected' in the app".
  Both are the element's work now. The rest of the row -- the algorithms, layout and
  graphty-element deliverables and the G6 gate -- stands.
- **13, the phase table, row P12 (line 4227).** The deliverables cell gives the app
  "`calibrateLayout()` + `createAccelerator` defaults wiring" and "device-loss UX (toast + the CPU
  simulation taking over the running layout)". Construction and device-loss recovery belong to the
  element; what is left for the app is the toast if it wants one, the stories, and rendering the
  status. That row's gate is separately unsatisfiable for an unrelated reason -- see
  `2026-09-19-no-nightly-gpu-lane.md` and its own amendment of this date.
- **2.4, the first row of the who-answers table (line 443) and its last row (line 448).** The
  first row answers "Is WebGPU present, is the adapter hardware, is it worth using?" with "The APP
  (graphty) at start-up, or a Node script", which then calls `element.setAccelerator(gpu)`. The
  last row gives the app the decision whether to inject a software adapter. graphty-element
  answers both questions now.

Section 2.4 needs a warning the other two do not. Everything else in that table is still exactly
right, and it is the no-silent-degradation rule that the "What still exists" section above says
this record does NOT relax: the dispatcher choosing the CPU only when no accelerator was injected,
the missing-method branch, an error propagating instead of falling back, `E_TOO_LARGE` thrown
before allocation. The root `CLAUDE.md` cites 2.4 approvingly for exactly that. So the section is
half-live rather than dead, which is the worse state of the two: a reader who is right to trust it
for the rule gets no signal that its first and last rows are gone.
