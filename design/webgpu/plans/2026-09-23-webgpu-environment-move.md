# @graphty/webgpu-graph-algorithms P-ENV -- the environment move to Ubuntu 24.04 and webgpu 0.6.x Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task names the repository it runs in. NEVER run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` yourself -- in a subagent these block forever on an unanswered prompt. Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine. The owner commits through `tools/commit-changes.sh` and creates the worktrees.

**Goal:** Land design phase P-ENV inside `webgpu-graph-algorithms/`, `graph-format/` and `.github/workflows/`: move the development container and both runner images to Ubuntu 24.04, move the `webgpu` npm package from 0.4.0 to the current 0.6.x everywhere it is declared and in the install hint the package's no-WebGPU error prints, retire the `LD_LIBRARY_PATH` workaround for `libEGL.so.1`, note where 0.6.x made the staging ring's unmap redundant, and re-record the gate runs and benchmark baselines on the new rasteriser (gate G-ENV).

**Architecture:** This phase changes no algorithm, no kernel and no interface. It changes the FLOOR everything else was measured on -- the C library, the shader compiler of the software rasteriser, and the native module that carries Dawn -- and its entire risk is that a floor change is invisible in a diff. The three machines this project judges code on are the development container, the GitHub-hosted default lane and the NVIDIA T4 lane, and until this phase they were three different operating systems with nothing recording which. The work is therefore mostly declaration and verification: name the image instead of inheriting it, pin the native module to a build that matches the image, and re-run the gates that were signed off on the old floor.

**Tech Stack:** Ubuntu 24.04 (glibc 2.39, libstdc++ GLIBCXX_3.4.33, Mesa 25.x lavapipe, `libegl1`), the `webgpu` npm package 0.6.1 (Dawn, per platform-arch `dist/`), TypeScript 5.9 (strict), Node 22, vitest 3.2 (`node` / `node-device-errors` / `node-limits` / `browser` projects), pnpm 10 workspace, GitHub Actions (`ubuntu-24.04` lavapipe + SwiftShader lane; the `gpu-linux-t4` lane on a machine.dev T4).

**Spec:** `design/webgpu/webgpu-acceleration-plan.md` -- section 13 row P-ENV and its gate G-ENV (the phase table, between P3 and P4), 2.5 (the optional `webgpu` peer dependency and its range), 12.1-12.6 (the lanes). The design is normative; the departures are section 0.5.

**Plans of record for the surrounding phases:** `design/webgpu/plans/2026-09-15-webgpu-p3.md` (the phase P-ENV follows) and `design/webgpu/plans/2026-09-20-webgpu-p4-grid-pyramid-and-tiers.md` (the phase it precedes, and which ran without it).

**Gate:** G-ENV (design 13 row P-ENV). The record is `webgpu-graph-algorithms/docs/decisions/G-ENV.md`, written by ENV-T6 beside the existing G0-G7.

**Tasks in this document:** ENV-T1 .. ENV-T7. ENV-T1 is the audit and runs first; ENV-T2, ENV-T3 and ENV-T4 are independent of each other and may run in parallel after it; **ENV-T5 is the owner's and every remaining verification waits on it**; ENV-T6 records the gate; ENV-T7 closes it once ENV-T5 has landed.

## Global Constraints

Copied from the spec and the owner's rules; every task's requirements implicitly include this section.

- Never run `git add`, `git commit`, `git push`, `git stash`, `git checkout`, `git reset`, `git restore` or `git worktree` (global rule; in a subagent the last five block forever on an unanswered prompt as surely as the first three). Read-only git (`log`, `show`, `diff`, `ls-files`, `status`) is fine.
- Never add a `Co-Authored-By` or `Claude-Session` trailer to any commit message, script or file.
- Plain ASCII in every file this plan creates or edits; `--` for dashes, straight quotes.
- Never run `sudo` (owner rule). This is why ENV-T5 exists at all: every remaining step of this phase is an `apt`, an image rebuild or a runner provisioning change, and none of them may be run from a task in this plan.
- Spec rules for every phase (design 13): (a) the gate is a list of tests and recorded MEASURED numbers green on the default lane AND the GPU lane before the next phase starts; (c) every `[X]` number the phase touches is replaced by a measured one in `benchmarks/results/`; (d) nothing lands with `eslint-disable`, `@ts-expect-error` (outside negative type tests), non-ASCII, or a CPU fallback.
- Project rule (root `CLAUDE.md`): never create a fallback when WebGPU is absent. A Dawn that will not load is an error, never a quiet CPU path -- which is exactly what makes the version pin a correctness concern rather than a packaging one.
- Never lower a coverage threshold; the `node` project is 80 lines / 80 functions / 75 branches / 80 statements.
- Temporary files under `./tmp/`; write a script file instead of repeating an inline one-liner.

---

## 0. Read this first

### 0.1 Why this plan is dated after the phases it precedes

Design section 13 puts P-ENV between P3 and P4. It never ran, and nothing recorded a decision to defer it: there
is no plan file, no decision record and no gate record. The package still pinned `webgpu` 0.4.0 when this plan
was written, and `G4.md`, `G5.md` and `G7.md` -- all written days after P-ENV's slot in the order -- each record
Ubuntu 22.04.5 and Mesa lavapipe 23.2.1 (LLVM 15.0.7), the exact environment the phase was meant to replace.

Meanwhile the default lane moved anyway, sideways and without a commit: `.github/workflows/ci.yml` said
`runs-on: ubuntu-latest`, GitHub repointed that label at Ubuntu 24.04, and the lane installs its rasteriser at job
time. So every pull request has been judging kernels on Mesa 25.2.8 (LLVM 20.1.2) -- two major Mesa versions and
five LLVM versions newer than anything signed off -- while every gate record in the repository said 23.2.1.

That is the failure this phase closes, and the shape of it is why the plan's centre of gravity is *naming things*
rather than changing them: the environment moved precisely because no file had to change for it to move.

### 0.2 The measured facts this plan is built on

All measured 2026-09-23. They are the reason the task order is what it is.

| Machine | Image | glibc | libstdc++ | Software rasteriser | `libegl1` |
| --- | --- | --- | --- | --- | --- |
| Dev container | Ubuntu 22.04.5 LTS | 2.35 | GLIBCXX_3.4.30 | Mesa 23.2.1 (LLVM 15.0.7) | absent |
| Default CI lane | `ubuntu-24.04` (`20260907.300`) | 2.39 | GLIBCXX_3.4.33 | Mesa 25.2.8 (LLVM 20.1.2) | -- |
| GPU lane (machine.dev T4) | Ubuntu 22.04.5 LTS | 2.35 | GLIBCXX_3.4.30 | -- (NVIDIA 580.126.20) | present, 1.4.0-1 |

And the binaries, from `readelf -V` on each `dawn.node`:

| `webgpu` | Needs at most | Loads on |
| --- | --- | --- |
| 0.4.0 | `GLIBC_2.34`, `GLIBCXX_3.4.30` | Ubuntu 22.04 and newer |
| 0.6.1 | `GLIBC_2.38`, `GLIBCXX_3.4.32` | Ubuntu 24.04 and newer |

The two do not overlap below 24.04. Upstream made that explicit: `webgpu` 0.5.0 moved its Linux build base to
Ubuntu 24.04 (dawn-gpu/node-webgpu `a3d71016`, "bump ubuntu build to 24.04").

**The consequence that shapes this plan:** the bump cannot be verified on either of the two machines this project
tests on until both move to 24.04. Attempting it on the dev container gives

```
Error: /usr/lib/x86_64-linux-gnu/libstdc++.so.6: version `GLIBCXX_3.4.32' not found
  (required by .../webgpu/dist/linux-x64/dawn.node)   code: 'ERR_DLOPEN_FAILED'
```

### 0.3 The two-machine correction to the design

Design 13 row P-ENV says "the dev container and the runner image move to Ubuntu 24.04", singular. There are two
runner images, and they are on opposite sides of the line:

- the **default lane** is already 24.04 (it arrived there by itself) and needs only to say so;
- the **GPU lane** is Ubuntu 22.04.5 and is the release gate -- `release.yml` waits for `gpu.yml` and refuses to
  publish unless it succeeded. With `webgpu` at 0.6.1 that lane cannot load Dawn at all.

So merging this phase to master without moving the T4 image would turn the release gate red. That is recorded as
finding ENV-F2 and is the one item that must reach the owner before the branch merges.

### 0.4 What this phase deliberately does not do

- It does not re-gate P4, P5 or P7. Their measurements are valid for the adapter each names; what is stale is the
  claim that those adapters are what CI uses. ENV-T7 re-records the baselines rather than re-opening the gates.
- It does not delete the pending-map deferral in `src/memory/readback.ts`. See 0.5 DEPARTURE-2.
- It does not change the published peer range `">=0.4.0 <1.0.0"`. It already admits 0.6.x by design (2.5), and
  narrowing it would strand consumers on distributions that can only load 0.4.0 -- which, after 0.2, is a real
  population rather than a hypothetical one.

### 0.5 Departures from the design

- **DEPARTURE-1 (design 13 row P-ENV, "the runner image").** Read as two images, per 0.3. The gate's "both lanes"
  is unchanged; what changes is that the GPU lane's move is called out as owner-provisioned and as a merge
  blocker, which the design's singular phrasing hides.
- **DEPARTURE-2 (design 13 row P-ENV, "the 0.6.x unmap-on-destroy shim noted as redundant").** The note is
  written; nothing is deleted, and the note states the limit of the redundancy. Upstream `402a7ea1` unmaps a
  device's buffers when the device is destroyed, which covers the unmap half of `Readback.destroyAll()`. It does
  not cover the pending-map deferral, which guards a different defect -- dawn-node settling a pending map promise
  twice, a SIGSEGV in `AsyncRunner::Reject` -- that no commit between 0.4.0 and 0.6.1 claims to fix. Removing the
  deferral on the strength of a release note would delete the only guard between a pending map and a crash.
- **DEPARTURE-3 (design 13 row P-ENV, "the `LD_LIBRARY_PATH` workaround removed").** Kept until ENV-T5 lands. The
  workaround exists because the container has no `libegl1`; removing it before the container has one would make
  the card invisible to Dawn, which fails silently by listing only llvmpipe. ENV-T7 deletes it after a measured
  card acquisition without it.
- **DEPARTURE-4 (additive).** `ci.yml` gains a step that prints the image, glibc and Mesa versions into the job
  log. The design's gate asks only that `gpu-report.json` show the new versions, which covers the GPU lane; the
  default lane had no equivalent, and its silence is how the rasteriser changed unnoticed.

---

## Phase P-ENV: the environment move

### ENV-T1: audit what is declared, what runs, and what the gates recorded

**Status: DONE** (2026-09-23, branch `chore/webgpu-environment-move`). Repository: `graphty-monorepo`.

- [x] Find every declaration of the `webgpu` package: `webgpu-graph-algorithms/package.json` (devDependency
      `0.4.0`, peer `">=0.4.0 <1.0.0"`), `graph-format/package.json` (devDependency `^0.4.0`).
- [x] Find the install hint the no-WebGPU error prints: `src/node/index.ts` `INSTALL_HINT`, asserted by
      `test/device/acquire.test.ts`. Its own comment named the phase that was supposed to change it.
- [x] Record what each machine actually runs (the table of 0.2), from `/etc/os-release`, `ldd --version`,
      `dpkg-query -W`, the CI job log of run 35923105007 and the GPU lane log of run 35922927676.
- [x] Record what the gate records claim: `G4.md`, `G5.md`, `G7.md` and `benchmarks/results/noise-floor.json`.
- [x] Establish the load rule for 0.4.0 vs 0.6.1 with `readelf -V`, and confirm the failure mode by installing
      0.6.1 into a scratch directory and requiring it.
- [x] Read the upstream history between v0.4.0 and v0.6.1 (seventeen commits) for anything bearing on the
      intermittent abort.

**Verification:** every row of the tables in 0.2 names the command or the run id it came from.

### ENV-T2: name the runner image in the workflows instead of inheriting it

**Status: DONE.** Repository: `graphty-monorepo`. Files: `.github/workflows/ci.yml`, `.github/workflows/gpu.yml`.

- [x] Replace `runs-on: ubuntu-latest` with `runs-on: ubuntu-24.04` in all ten `ci.yml` jobs. A no-op today --
      `ubuntu-latest` IS 24.04 -- which is the point: it makes the next move a reviewed commit. GitHub has
      announced `ubuntu-latest` becoming Ubuntu 26 from 2026-10-19 (`actions/runner-images#14748`).
- [x] Add a header comment to `ci.yml` stating what the label did and why it is now named.
- [x] Add a "Record the image, glibc and rasteriser versions" step to the lavapipe lane, printing `PRETTY_NAME`,
      `ldd --version` and the installed `mesa-vulkan-drivers` / `libvulkan1` / `libegl1` versions. It never fails
      the step (DEPARTURE-4).
- [x] Record the measured T4 image facts in `gpu.yml`'s runner comment, and state there that its Ubuntu 22.04 is
      what blocks the 0.6.x bump on that lane.

**Verification:** `grep -c "ubuntu-latest" .github/workflows/ci.yml` is 0; the workflow parses (`actionlint`, or a
dispatch run).

### ENV-T3: bump the `webgpu` declarations and the install hint

**Status: DONE (declared); its verification is OPEN on ENV-T5.** Repository: `graphty-monorepo`.
Files: `webgpu-graph-algorithms/package.json`, `graph-format/package.json`,
`webgpu-graph-algorithms/src/node/index.ts`, `webgpu-graph-algorithms/test/device/acquire.test.ts`,
`pnpm-lock.yaml`.

- [x] `webgpu-graph-algorithms` devDependency `"webgpu": "0.4.0"` -> `"0.6.1"`.
- [x] `graph-format` devDependency `"webgpu": "^0.4.0"` -> `"^0.6.1"`.
- [x] Leave the peer range `">=0.4.0 <1.0.0"` alone (0.4).
- [x] `INSTALL_HINT` -> "install the optional peer dependency webgpu@0.6.1", and the assertion in
      `test/device/acquire.test.ts` with it. Replace the stale "P-ENV re-pins ..." comment with a pointer to the
      gate record.
- [x] Refresh `pnpm-lock.yaml`.
- [ ] **OPEN:** run the `node`, `node-device-errors` and `node-limits` projects against 0.6.1 on both adapters.
      Blocked: 0.6.1 cannot load below Ubuntu 24.04 (0.2). Closed by ENV-T5 then ENV-T7.

**Verification (the part that can run today):** `pnpm run build` and `pnpm run lint` clean; the full `node` and
`node-device-errors` projects green on lavapipe and on the card at the pre-bump pin, recorded in `G-ENV.md`
section 1 as the BEFORE half.

Expect `tools/prepush.sh` to REFUSE the push after this task on a 22.04 box, and do not weaken it to get
through: it runs the node projects with `GRAPHTY_GPU_REQUIRE=any` on purpose, so a machine with no adapter
fails rather than skipping, and after the bump that machine is this one. Build, bundle, lint and knip still
pass. The push waits for ENV-T5 (finding ENV-F6).

### ENV-T4: the redundancy note and the consumer-facing install rule

**Status: DONE.** Repository: `graphty-monorepo`. Files: `webgpu-graph-algorithms/src/memory/readback.ts`,
`webgpu-graph-algorithms/README.md`.

- [x] Note in the `readback.ts` file comment that `webgpu` 0.6.1 unmaps a device's buffers on destroy
      (dawn-gpu/node-webgpu `402a7ea1`), that this makes the unmap half of `destroyAll()` redundant on 0.6.x, and
      that the pending-map deferral stays because it guards a different defect (DEPARTURE-2). Delete nothing.
- [x] Rewrite the README install section so a Linux consumer can tell which build they can load, stated in symbol
      versions (`GLIBC_2.38` / `GLIBCXX_3.4.32` for 0.6.x, `GLIBC_2.34` / `GLIBCXX_3.4.30` for 0.4.0) rather than
      a distribution name, with the `require`-time error text so the failure is recognisable. Stop telling every
      consumer to install 0.4.0.

**Verification:** `LC_ALL=C grep -nP '[^\x00-\x7F]'` over the touched files finds nothing; `pnpm run lint` clean.

### ENV-T5: **OWNER** -- move the development container and the T4 runner image

**Status: OPEN. This task cannot be performed by any other task in this plan** -- the container is the machine the
tasks run inside, the T4 image is provisioned by a hosted provider, and the owner's rules forbid `sudo`.

- [ ] Rebuild the dev container on Ubuntu 24.04 with glibc >= 2.38, `GLIBCXX_3.4.32`, `mesa-vulkan-drivers` 25.x,
      `libvulkan1`, `vulkan-tools` and `libegl1`.
- [ ] Move the GPU lane's T4 to a 24.04 image, or to a runner class that offers one. The label
      `machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand` in `gpu.yml` is the image selector; the workflow's `runner`
      dispatch input is where a replacement label goes.
- [ ] **Do not merge this branch to master until the second item is done**: `release.yml` requires `gpu.yml`
      green, and the lane cannot load Dawn 0.6.1 on 22.04.

The commands and the checks are written out as a numbered list in `webgpu-graph-algorithms/docs/decisions/G-ENV.md`
section 3, which is the copy to follow.

### ENV-T6: write the gate record

**Status: DONE.** Repository: `graphty-monorepo`. File:
`webgpu-graph-algorithms/docs/decisions/G-ENV.md`.

- [x] Record the phase, why it is late, and the three gate records that were signed off on the old floor.
- [x] Record the eleven G-ENV checklist items, each MET with its evidence or OPEN with the command that closes
      it. A gate item that could not be run is never relaxed and never dropped.
- [x] Record the owner's steps as a numbered list of commands and checks (section 3).
- [x] Record the intermittent abort investigation and its verdict (section 4).
- [x] Record the findings ENV-F1 .. ENV-F5 for the owner to sign.

**Verification:** every OPEN item names a command; every MET item names a file, a run id or a test count.

### ENV-T7: close the gate after ENV-T5

**Status: OPEN, blocked on ENV-T5.** Repository: `graphty-monorepo`.

- [ ] Re-run the `node`, `node-device-errors` and `node-limits` projects on 0.6.1, on lavapipe and on the card in
      the rebuilt container, and fill `G-ENV.md` section 1. Note the lavapipe ICD is `lvp_icd.json` on 24.04, not
      `lvp_icd.x86_64.json` (finding ENV-F4).
- [ ] Confirm the card acquires with no `LD_LIBRARY_PATH` (`node scripts/gpu-report.js` prints an NVIDIA adapter),
      then delete the workaround from `webgpu-graph-algorithms/CLAUDE.md` and `README.md` and update the
      hard-coded ICD spelling in the same commit (DEPARTURE-3, ENV-F4). Closes G-ENV item 7.
- [ ] Run `gpu.yml` on a `gpu`-labelled pull request; confirm `gpu-report.json` carries the new driver and Mesa
      versions. Closes items 9 and 10.
- [ ] Re-record `benchmarks/results/<runner-class>.json` and `benchmarks/results/noise-floor.json` on the new
      rasteriser. Closes item 11. The old numbers are not carried forward: they are a different shader compiler's.
- [ ] Run `hosts.yml` -- `webgpu` 0.6.0 restructured `dist/` per platform-arch and added a `windows-11-arm` build,
      so the macOS and Windows legs get new binaries and this branch does not exercise them.
- [ ] Settle the futex abort with the loop of `G-ENV.md` section 4, and replace that section's UNKNOWN with the
      result. Do not close it on a single run that happened not to abort.

---

## 7. Appendices

### 7.1 The environments, as one block

```bash
# what any machine in this phase must be able to answer the same way
grep PRETTY_NAME /etc/os-release
ldd --version | head -1
strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep -o 'GLIBCXX_3\.4\.[0-9]*' | sort -uV | tail -1
dpkg-query -W mesa-vulkan-drivers libvulkan1 libegl1
ls /usr/share/vulkan/icd.d
node -e 'require("webgpu"); console.log("dawn loads")'
```

### 7.2 The two test environments every Run line uses

```bash
# lavapipe, as the default lane runs it (the ICD file name is 24.04's)
export GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any \
       VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json XDG_RUNTIME_DIR=/tmp

# the card (after ENV-T5 there is no LD_LIBRARY_PATH line)
export GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp
```

### 7.3 The commit subjects of this phase

```
ci(workflows): name ubuntu-24.04 and record the lane's rasteriser versions
build(deps): move the webgpu devDependency from 0.4.0 to 0.6.1
docs(webgpu-graph-algorithms): record the environment move and its gate
```

## 8. Self-review

- **Does the plan's own verification hold?** Partly, and it says where it does not. ENV-T1, T2, T4 and T6 are
  verifiable on the machine that ran them. ENV-T3 is declared but cannot be exercised below Ubuntu 24.04, and
  that is stated at the task, in the gate record and in the report rather than being glossed as done.
- **Is any gate item relaxed?** No. Seven of the eleven G-ENV items are OPEN, each with the command that closes
  it. The temptation here is item 9 -- "G1-G3 re-run green on both lanes" -- where a green run on the OLD pin
  could be passed off as the gate. It is recorded as the BEFORE half instead.
- **What would make this plan wrong?** If the machine.dev provider offers no 24.04 T4 image, ENV-T5's second item
  has no answer as written and the GPU lane needs a different runner class -- a larger change than this phase,
  and the reason ENV-F2 is an owner decision rather than a task.
- **What is still unknown after this plan?** Whether the bump fixes the intermittent futex abort. Section 4 of the
  gate record refuses to guess and states the experiment that settles it.
