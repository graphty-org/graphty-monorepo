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
