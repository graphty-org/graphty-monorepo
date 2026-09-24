# Wrong answers from compute shaders that pass a value across a workgroup barrier, on the software renderer shipped with Windows

**Status:** ready to send. Nothing here has been filed anywhere yet.
**Measured:** 2026-09-23, on a GitHub-hosted `windows-latest` runner.
**Affected component:** `d3d10warp.dll` version 10.0.26100.33296, the copy in `C:\Windows\System32` -- the renderer
Direct3D 12 enumerates as "Microsoft Basic Render Driver", commonly called WARP.

---

## Summary

On the version of the Microsoft Basic Render Driver that ships in the box with Windows Server 2025, a Direct3D 12
compute shader that stores a value into groupshared memory and reads it back after `GroupMemoryBarrierWithGroupSync`
returns wrong results. A two-block exclusive prefix sum of 257 ones -- as plain a workgroup-cooperative kernel as
exists -- returns block totals of 1, or 256, or leaves a block's output entirely unwritten, depending on the run. The
wrong answer varies between runs of the same compiled program, so this is a synchronisation failure and not a
miscompilation.

Nothing reports an error. No validation message, no device-removed, no warning from the runtime. The API call
succeeds and the buffer contains the wrong numbers.

Copying Microsoft's own redistributable renderer -- NuGet package `Microsoft.Direct3D.WARP` version 1.0.21, published
2026-09-22 -- next to the host executable makes every affected case pass on the same machine, in the same job, with
the same shaders. The adapter's description string then reads "D3D12 driver version 1.0.21.0" instead of
"D3D12 driver version 10.0.26100.33296".

---

## The machine and the versions

| | |
| --- | --- |
| Host | GitHub-hosted `windows-latest` runner, Microsoft Windows Server 2025 |
| Runner image | `windows-2025-vs2026`, version 20260907.229.1 |
| Adapter | vendor `microsoft`, architecture `warp`, device `microsoft-basic-render-driver` |
| Adapter description, before | `D3D12 driver version 10.0.26100.33296` |
| In-box renderer file version | `C:\Windows\System32\d3d10warp.dll` 10.0.26100.33296 (WinBuild.160101.0800) |
| Adapter description, after the fix | `D3D12 driver version 1.0.21.0` |
| Redistributable used | `Microsoft.Direct3D.WARP` 1.0.21, `build/native/bin/x64/d3d10warp.dll` |
| WebGPU runtime | Dawn through the npm package `webgpu` 0.4.0 (dawn-node), on Node 22.23.2 |
| Shader compiler in use | FXC (`d3dcompiler_47.dll`); see "the compiler" below for why DXC was not reachable |
| Workgroup size | 256 lanes; device reports `maxComputeInvocationsPerWorkgroup` 1024 |
| Subgroup operations | none. The device does not expose the WebGPU `subgroups` feature, and no kernel here uses a wave intrinsic |

The shaders are written in WGSL and translated to HLSL by Dawn's Tint. The generated HLSL is quoted below, because
one of the things that had to be ruled out was our own code generation.

---

## Reproduction

Two shapes are given. The first is the one that matters and fails almost everywhere. The second is smaller and
isolates the ingredient. Neither needs our repository: the shader text, the dispatch shape, the input and both
expected and observed outputs are stated in full.

Every buffer is filled with `0xDEADBEEF` (3735928559) before every run, so a word that nothing wrote is visible
rather than being mistaken for a zero. Below, "untouched" means a word still holding that fill.

### Reproduction 1: a two-block exclusive prefix sum of 257 ones

Three dispatches, recorded into one compute pass, in this order, and submitted once.

Buffers:

- `src`: 257 words, every one `1u`.
- `out`: 257 words, filled with `0xDEADBEEF`.
- `blockSums`: 2 words, filled with `0xDEADBEEF`.
- `blockOffsets`: 2 words, filled with `0xDEADBEEF`.

Shader A, `scan_block`. `COUNT` is a pipeline-overridable constant so that no uniform buffer is involved anywhere:

```wgsl
const WG: u32 = 256u;
override COUNT: u32 = 0u;

@group(0) @binding(0) var<storage, read>       src:       array<u32>;
@group(0) @binding(1) var<storage, read_write> out:       array<u32>;
@group(0) @binding(2) var<storage, read_write> blockSums: array<u32>;

var<workgroup> sh: array<u32, WG>;

@compute @workgroup_size(WG)
fn scan_block(@builtin(workgroup_id) wid: vec3<u32>,
              @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = wid.x * WG + lid.x;
    var v = 0u;
    if (i < COUNT) { v = src[i]; }
    sh[lid.x] = v;
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {   // Hillis-Steele: every lane runs every one of the 8 rounds
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }
    let inclusive = sh[lid.x];
    if (i < COUNT)        { out[i] = inclusive - v; }             // exclusive = inclusive minus own element
    if (lid.x == WG - 1u) { blockSums[wid.x] = inclusive; }       // the block total
}
```

Shader B, `scan_add`:

```wgsl
const WG: u32 = 256u;
override COUNT: u32 = 0u;

@group(0) @binding(0) var<storage, read_write> out:          array<u32>;
@group(0) @binding(1) var<storage, read>       blockOffsets: array<u32>;

@compute @workgroup_size(WG)
fn scan_add(@builtin(workgroup_id) wid: vec3<u32>,
            @builtin(local_invocation_id) lid: vec3<u32>) {
    let i = wid.x * WG + lid.x;
    if (i >= COUNT) { return; }
    out[i] = out[i] + blockOffsets[wid.x];
}
```

The three dispatches:

1. `scan_block` with `COUNT = 257` over `src` -> `out`, `blockSums`. Two workgroups of 256 lanes.
2. `scan_block` with `COUNT = 2`, bound as `src` = `blockSums`, `out` = `blockOffsets`, `blockSums` = a scratch
   word that is discarded. One workgroup of 256 lanes.
3. `scan_add` with `COUNT = 257` over `out`, `blockOffsets`. Two workgroups of 256 lanes.

**Expected**, and what every other device tested produces -- an NVIDIA T4, Mesa lavapipe, Apple Metal in a macOS VM,
SwiftShader in Chromium:

```
out[i]       == i, for i = 0 .. 256      (so out[255] == 255 and out[256] == 256)
blockSums    == [256, 1]
blockOffsets == [0, 256]
```

**Observed** on the in-box renderer. Four distinct results came out of six runs of this kernel in one CI job
(a seventh run, with the renderer replaced, is in "what makes it go away" below):

| Run | `out[255]` | `out[256]` | `blockSums` | `blockOffsets` |
| --- | --- | --- | --- | --- |
| Expected | 255 | 256 | `[256, 1]` | `[0, 256]` |
| 1. Baseline, no toggles | 255 | untouched + 256 | `[256, untouched]` | `[0, 256]` |
| 2. The same program again | 255 | untouched + 1 | `[1, untouched]` | `[0, 1]` |
| 3. The same program again, with the generated HLSL dumped | 255 | untouched + 256 | `[256, untouched]` | `[0, 256]` |
| 4. Compiled with debug symbols and optimisation skipped | 1 | untouched + 1 | `[1, untouched]` | `[0, 1]` |
| 5. Compiled with the FXC optimiser on | 255 | 256 | `[256, 1]` | `[0, 256]` |
| 6. Groupshared zero-initialisation turned off | 255 | untouched + 1 | `[1, untouched]` | `[0, 1]` |

The raw words behind "untouched + 256" and "untouched + 1" are 3735928815 and 3735928560, the fill plus 256 and the
fill plus 1.

What to read off that table.

Block 1's two output addresses were never written. In all six runs `out[256]` and `blockSums[1]` still held the
`0xDEADBEEF` fill after dispatch 1, and the word finally read back is that fill plus whatever dispatch 3 added to
it. Dispatch 3 ran over `out[256]`; dispatch 1 did not.

`blockSums[0]` disagrees with block 0's own output, and we cannot account for it. Block 0's total is 256 -- it holds
256 in-range elements, every one a 1. In runs 2 and 6 the block's own output says exactly that: `out[255]` is 255
and `blockOffsets[0]` is 0, so lane 255 computed its `inclusive` as 256. Yet `blockSums[0]`, which that same lane
stores from that same variable on the next line of the same kernel, came back 1. Run 4 is inconsistent in the same
direction: `out[255]` of 1 implies an `inclusive` of 2, and `blockSums[0]` is again 1.

That 1 has two readings and our measurement does not separate them. 1 is block 1's total, block 1 having exactly one
in-range element. 1 is also lane 255's own input element -- the value `v` it loaded from `src` before the barrier
loop. So either something other than block 0's lane 255 wrote index 0, or that lane stored a value it never
computed. We report the number and leave the mechanism to whoever knows the renderer; it is the one measurement here
that a reader can arithmetic-check against the rest of the row, and it does not add up.

The same compiled program produced two different wrong answers. Runs 1 and 2 are the same binary: run 2 was launched
asking for the newer shader compiler, the runtime refused the request and said so in its log ("Forcing toggle
use_dxc to 0 when it was 1"), and the adapter's feature list was unchanged, so nothing about the compile differed.
`blockSums[0]` came back 256 the first time and 1 the second.

A single block is always right. The same `scan_block` over exactly 256 ones, one workgroup, one dispatch, produced
`out[0] == 0`, `out[255] == 255` and a block total of 256 in every one of the six runs, including the ones where
the two-block case was wrong.

### Reproduction 2: a value published by one lane, read by another after a barrier

Smaller, and it isolates the ingredient. One dispatch, four workgroups of 256 lanes. `sums` is 4 words filled with
`0xDEADBEEF`.

```wgsl
const WG: u32 = 256u;

@group(0) @binding(0) var<storage, read_write> sums: array<u32>;

var<workgroup> published: u32;
var<workgroup> sh: array<u32, WG>;

@compute @workgroup_size(WG)
fn main(@builtin(workgroup_id) wid: vec3<u32>,
        @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { published = wid.x; }     // one lane publishes
    workgroupBarrier();

    sh[lid.x] = 1u;                             // the same 8-round barrier loop as above, as a workload
    workgroupBarrier();
    for (var s = 1u; s < WG; s = s * 2u) {
        var t = 0u;
        if (lid.x >= s) { t = sh[lid.x - s]; }
        workgroupBarrier();
        sh[lid.x] = sh[lid.x] + t;
        workgroupBarrier();
    }

    if (lid.x == WG - 1u) { sums[published] = 4242u; }   // a different lane consumes
}
```

**Expected:** `sums == [4242, 4242, 4242, 4242]`.

**Observed** on the in-box renderer, in four of the six runs: `sums` was untouched in all four words. Lane 255 did
not get lane 0's value, so its store either did not happen or landed outside the buffer and was dropped by bounds
robustness. In the other two runs it returned the expected four words.

This second shape and the prefix sum agree in five of the six runs. The one exception is the run compiled with
debug symbols and optimisation skipped, where this shape was correct and the prefix sum was wrong in a new way, so
it is a second symptom of the same class rather than a complete account of the first.

---

## What was ruled out

This is a long list on purpose. Three separate shader repairs were spent on this before the cause was found, and
each cost an eighty to ninety minute round trip on the runner.

### The shader constructs, each cleared by a probe on that same device in those same runs

Seven small kernels, each four workgroups of 256 lanes into freshly filled buffers. All but the one in
Reproduction 2 came back correct in every run:

1. The workgroup id as a value: each workgroup stored its own id into its own 256-word range. Correct.
2. The same, with the id read before the eight-round barrier loop and used after it. Correct.
3. A single-lane store (`if (lid.x == WG - 1u)`) at an index derived from the workgroup id, no barrier. Correct.
4. The same single-lane store, after the eight-round barrier loop. Correct.
5. A value published by one lane and read by another across barriers -- Reproduction 2 above. **This one failed.**
6. A groupshared array written by *every* lane, then read across one barrier by lane 0 at an index that lane never
   wrote. Correct.
7. A constant stored at an index derived from the workgroup id, by every lane. Correct.

So: the workgroup id arrives intact, index arithmetic is right, a divergent single-lane store works, a groupshared
array written by all lanes and read by one across a barrier works. The construct that fails is the one that carries
a value from one lane to another.

### The dispatch machinery, likewise cleared on that device, in those same runs

A multi-block prefix sum does five things that a single-block one does not. Each was isolated and each was correct
in every run:

1. Several dispatches of one pipeline in one compute pass, each selecting its own parameters through a dynamic
   offset into a 256-byte-slot ring buffer.
2. The same dispatches, each with its own 16-byte uniform buffer and its own bind group at offset zero.
3. The same dispatches in separate compute passes.
4. A storage binding that starts 256 bytes into a larger buffer.
5. A second dispatch in the same pass reading what the dispatch before it wrote.

And uniform delivery is out of it entirely: Reproduction 1 above passes the element count as a pipeline-overridable
constant, with no uniform buffer anywhere, and fails identically to the version that uses one.

### Three shader repairs, all failed

- Broadcasting the workgroup id through a groupshared scalar published by lane 0. This fixed the per-element writes
  and zeroed every block total, including the single-block case that had always been right.
- Reading the workgroup id after the barrier loop rather than before it. This reproduced the original exactly.
- Routing the block total through a second groupshared array written by every lane and read across a barrier by
  lane 0 at an index it never wrote -- the shape that kernel 6 in the list above found intact. This failed
  identically to the original. It is a different kernel from the one printed as Reproduction 1, which stores the
  block total straight from `inclusive` and has no second array; both kernels ran in all seven configurations, and
  in every one of them the two produced the same `out[255]` and the same `out[256]` as each other.

### The compiler

Dawn's D3D12 backend compiles through FXC here: the published dawn-node ships `d3dcompiler_47.dll` and neither
`dxcompiler.dll` nor `dxil.dll`. The newer compiler is not reachable in this build and was proven so two ways:
the runtime logged "Forcing toggle use_dxc to 0 when it was 1", and the adapter's feature list still lacked
`shader-f16`, which this backend offers only under DXC.

That does not leave FXC as the suspect, for three reasons.

First, the generated HLSL is correct. This is what Dawn produced for the third repair just described -- the kernel
with the `handoff` array, not the Reproduction 1 shader -- dumped from that machine:

```hlsl
groupshared uint sh[256];
groupshared uint handoff[256];

uint group_id(uint3 wid) { return (wid.x + (wid.y * 65535u)); }

void scan_block_inner(uint3 wid, uint3 lid, uint tint_local_index) {
  if ((tint_local_index < 256u)) { sh[tint_local_index] = 0u; handoff[tint_local_index] = 0u; }
  GroupMemoryBarrierWithGroupSync();
  uint readAt = ((group_id(wid) * 256u) + lid.x);
  uint v = 0u;
  if ((readAt < P[0u].x)) { v = src.Load((0u + (readAt * 4u))); }
  sh[lid.x] = v;
  GroupMemoryBarrierWithGroupSync();
  { uint s = 1u;
    while(true) {
      if ((s < 256u)) { } else { break; }
      uint t = 0u;
      if ((lid.x >= s)) { uint v_2 = min((lid.x - s), 255u); t = sh[v_2]; }
      GroupMemoryBarrierWithGroupSync();
      sh[lid.x] = (sh[lid.x] + t);
      GroupMemoryBarrierWithGroupSync();
      { s = (s * 2u); }
    }
  }
  uint inclusive = sh[lid.x];
  handoff[lid.x] = inclusive;
  GroupMemoryBarrierWithGroupSync();
  uint g = group_id(wid);
  uint i = ((g * 256u) + lid.x);
  if ((i < P[0u].x)) { v_1.Store((0u + (i * 4u)), (inclusive - v)); }
  if ((lid.x == 0u)) { blockSums.Store((0u + (g * 4u)), handoff[255u]); }
}

[numthreads(256, 1, 1)]
void dawn_entry_point(scan_block_inputs inputs) {
  scan_block_inner(inputs.wid, inputs.lid, inputs.tint_local_index);
}
```

Two barriers a round, in the right places. One guarded load of `sh[lid.x - s]`. No re-materialised load, no
duplicated read, nothing hoisted across a barrier. (The loop's own iteration counter, which Tint adds to bound every
loop, is elided above for readability and is not involved.)

Second, the same class of failure has been reported on the same renderer through an entirely different toolchain
that uses DXC. See the corroboration section.

Third, and decisively, a compiler produces the same program every time. This one does not produce the same answer
every time.

### Optimisation level and workgroup-memory initialisation

FXC runs at optimisation level zero here by default. Adding debug symbols and skip-optimisation on top gave a third,
distinct wrong answer. Turning the FXC optimiser on instead gave a completely correct run. Turning off the runtime's
injected zero-initialisation of groupshared memory changed nothing -- still wrong.

A defect that a scheduling change makes and unmakes is a race. The correct run under the optimiser is not a fix and
should not be reported as one: given that the same binary returns different answers on different runs, one green run
under any setting is not evidence of anything.

---

## What makes it go away

Downloading `Microsoft.Direct3D.WARP` version 1.0.21 from NuGet, taking `build/native/bin/x64/d3d10warp.dll` out of
the package and copying it next to the host executable (and next to the Dawn addon, either location being a
candidate for the loader to reach first). No other change: same shaders, same machine, same job, same build.

The adapter description changed from "D3D12 driver version 10.0.26100.33296" to "D3D12 driver version 1.0.21.0",
which is how we know a different renderer answered and that this is a real before-and-after rather than the copy
being ignored. With the newer renderer loaded:

- the two-block prefix sum returned `out[255] == 255`, `out[256] == 256`, `blockSums == [256, 1]` and
  `blockOffsets == [0, 256]` -- correct;
- the one-lane-publishes probe returned `[4242, 4242, 4242, 4242]` -- correct;
- every other probe stayed correct;
- the affected test files exited zero.

Worth noting for anyone reproducing this: a plain copy next to the executable was enough. The process did not have
to opt into the Direct3D 12 Agility SDK.

---

## Corroboration

**The 1.0.21 release notes describe exactly this change.** The notes for `Microsoft.Direct3D.WARP` 1.0.21, published
2026-09-22, say: "Control flow transforms redesigned. Control flow that is statically uniform now always results in
real jumps. Control flow that is not statically uniform now reaches wave/group consensus and can still jump when
dynamically uniform." Both failing shapes above put a groupshared access inside a branch that is not statically
uniform -- `if (lid.x == 0u)`, `if (lid.x >= s)` -- with barriers around it.

**Another project hit the same thing through a different toolchain.** gfx-rs/wgpu issue 7904, "Workgroup memory
barriers not working correctly in DX12/HLSL backend", was opened 2025-07-09 and closed two days later on a
suspicion that was never confirmed. A parallel reduction summing 1 to 64 in groupshared memory returned 2080 on
Linux, macOS and SwiftShader, and 3 on Windows over the Microsoft Basic Render Driver -- the first round of the tree
and nothing after it. Their shaders came from rust-gpu as SPIR-V, went through naga rather than Tint, and compiled
through DXC rather than FXC; nothing in that path is shared with ours except the renderer.

Two details in that thread point where our measurements do. A commenter could not reproduce it on Windows 11 23H2,
a machine carrying a different in-box renderer version. And a wgpu maintainer closed it by saying "I suspect that
this is a bug in warp", recommending an up-to-date WARP be installed in CI because "the one in windows 10/server
2022 is quite old and buggy". The reporter thanked him and the issue was closed there. Nobody confirmed a fix or
named a version, and the reporter's own workaround was to install SwiftShader instead.

---

## Why it matters

A consumer gets silently wrong numbers, not an error.

There is no failure signal of any kind. The device is not lost, no validation error is raised, no warning is
printed, and the API calls all succeed. The only way to notice is to already know the right answer.

The affected construct is not exotic. Passing a value between lanes of a workgroup through groupshared memory and a
barrier is the basis of every prefix sum, reduction, histogram, sort and stream-compaction kernel written for a GPU,
and therefore of everything built on those. In our own package the failure takes out the exclusive scan and, with
it, the counting sort, the radix sort, a spatial grid build and every layout above them, while every kernel that
does not cross a barrier stays correct -- which is precisely the pattern that makes a partial failure hard to
attribute.

The affected renderer is the default on any Windows machine without a usable GPU, which includes GitHub's hosted
Windows runners: the image measured here was just over two weeks old and fully patched, and its in-box
`d3d10warp.dll` is the broken one. Anyone running Direct3D 12 or WebGPU compute in Windows CI is running on it.

And because the wrong answer varies between runs of the same binary, a test suite that happens to pass once proves
nothing. We saw correct and incorrect results from the identical program within a single job.

---

## Where this should go

**Primary: the team that owns the renderer -- Microsoft's Direct3D group.** They publish `d3d10warp.dll` both in
Windows and as the NuGet package `Microsoft.Direct3D.WARP`, whose project site is https://aka.ms/direct3dwarp and whose
package page directs bug reports to the DirectX Discord. The fault is in the renderer and nowhere else: the same
compiled shader is right on the redistributable build and wrong on the in-box one. Two things are worth asking them,
and only they can answer either. First, confirm that the control-flow redesign shipped in 1.0.21 is what fixes this,
so that everyone else can stop looking at their own compilers. Second, say which Windows servicing update carries
that fix to the in-box `d3d10warp.dll`, which on a fully patched Windows Server 2025 image dated 2026-09-07 is still
10.0.26100.33296 -- because a fix that only exists in a NuGet package does not reach a consumer running on Windows
as shipped, and copying a DLL next to the executable is not something an application can reasonably ask of its
users.

**Secondary, and not a defect report: gfx-rs/wgpu.** Their issue 7904 is the same defect, reached independently
through a toolchain that shares nothing with ours but the renderer, and it was closed without a cause. Two things
are worth telling them. Their closed issue now has an explanation and a fix. And their own CI installs a pinned
redistributable WARP -- `WARP_VERSION = "1.0.20"` in `xtask/src/install_warp.rs`, last moved on 2026-06-01 by
commit d0264fcb, "update DXC and WARP to latest" -- and 1.0.20 was published on 2026-05-28, before the 1.0.21
control-flow redesign, so their bots are still running a renderer from before the fix. Moving that pin to 1.0.21
is a one-line experiment against whatever they still see, and their issue 8368, "Multiple Failures on Latest
WARP", is open. They cannot fix the renderer, but a second project confirming the
same before-and-after is what will make the report to Microsoft hard to dismiss, and it stops the next project
spending three shader repairs rediscovering this.
