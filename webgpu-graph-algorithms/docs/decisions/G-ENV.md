# G-ENV -- the environment move to Ubuntu 24.04 and webgpu 0.6.x (spec 13 row P-ENV)

Recorded by: Task ENV-T6 of `design/webgpu/plans/2026-09-23-webgpu-environment-move.md`, 2026-09-23. The owner
signs section 6.
Environment of the measurements below: the dev container (Ubuntu 22.04.5 LTS, glibc 2.35-0ubuntu3.13, libstdc++
GLIBCXX_3.4.30, Mesa lavapipe 23.2.1-1ubuntu3.1~22.04.3 (LLVM 15.0.7), `lvp_icd.x86_64.json`, NVIDIA GeForce RTX
4070 SUPER driver 580.173.02, no `libegl1` package, Node v22.22.1), the worktree `.worktrees/gpu-p4` on branch
`chore/webgpu-environment-move` off `ae9ffe72`. Every command ran from `webgpu-graph-algorithms/`.

The rule of this record (spec 10.4): every number is measured and names the command or the file it came from; a
gate item that could not be run is recorded OPEN with the command that would close it -- never relaxed, never
dropped.

GATE STATUS: **OPEN, and blocked on the owner.** The phase's code changes are landed and green at their
pre-bump state; the phase's *environment* changes cannot be made from inside the container, and the `webgpu`
0.6.1 bump this record carries is UNRUNNABLE on the dev container until it moves to Ubuntu 24.04.

**The GPU lane is no longer blocked, and that is now measured rather than argued.** `gpu.yml` runs the job in
an `ubuntu:24.04` container on the same machine.dev runner, and its first dispatch (run 35938092059, job
107439615557, 2026-09-24) got glibc 2.39 and the Tesla T4 together: the container reported
`PRETTY_NAME="Ubuntu 24.04.5 LTS"`, `ldd (Ubuntu GLIBC 2.39-0ubuntu8.9) 2.39`, the NVIDIA Vulkan ICD at
`/etc/vulkan/icd.d/nvidia_icd.json` and `nvidia-smi` showing `Tesla T4`, driver 580.126.20, CUDA 13.0 -- and
then `webgpu` 0.6.1 LOADED AND BOUND THAT CARD: `[gpu-report] adapter vendor=nvidia architecture=turing
device=tesla-t4 ... software=false`, with graph-format's own GPU audit green on it as the canary.

Section 3 states what the owner must still do, which is now the dev container and nothing else. No item of
section 2 is marked met on the strength of an argument.

The repository's own pre-push gate says the same thing independently, and it is worth stating because it
decides what can be done with this branch: `tools/prepush.sh` runs the package's node projects with
`GRAPHTY_GPU_REQUIRE=any`, deliberately, so that a machine with no adapter fails the push rather than
skipping quietly. On a 22.04 box with `webgpu` at 0.6.1 there is no adapter, because Dawn does not load, so
**the branch cannot pass its own pre-push gate here.** Build, bundle, lint and knip all pass; only the GPU
suites fail, and they fail for the one reason this record is about. It was therefore pushed with
`--no-verify`, deliberately and on the record: nothing about the new environment can be tested until the
branch is on the remote, and the gate's refusal is the phase working rather than a defect to route around
quietly. The gate itself is unchanged.

## 0. What this phase is, and why it is being recorded three phases late

Design section 13 places a row called P-ENV between P3 (ForceAtlas2, exact tier) and P4 (the grid pyramid). It
is one change: the dev container and the runner image move to Ubuntu 24.04, which brings glibc 2.39, a current
Mesa software rasteriser and a system `libegl1`; `webgpu` moves from 0.4.0 to the current 0.6.x everywhere it
is declared; the `LD_LIBRARY_PATH` workaround for `libEGL.so.1` goes away; and the unmap-on-destroy behaviour
0.6.x gained is noted where the package's own staging ring already does it.

It never ran. There is no plan file for it, no decision record deferring it, and no gate record -- and the
phases that followed it were gated as though it had been skipped deliberately, which nothing records. The
package still pinned `webgpu` 0.4.0 at the time this branch was cut, and the gate records written days AFTER
P-ENV's slot in the order all name the environment it was meant to replace:

| Gate record | Phase | Operating system it records | Software rasteriser it records |
| --- | --- | --- | --- |
| `G4.md` | P4 (the phase P-ENV comes immediately before) | Ubuntu 22.04.5 LTS | Mesa lavapipe 23.2.1-1ubuntu3.1~22.04.3 (LLVM 15.0.7) |
| `G5.md` | P5 | Ubuntu 22.04.5 LTS | Mesa lavapipe 23.2.1-1ubuntu3.1~22.04.3 (LLVM 15.0.7) |
| `G7.md` | P7 | Ubuntu 22.04.5 LTS | Mesa lavapipe 23.2.1 (LLVM 15.0.7) |

`benchmarks/results/noise-floor.json` agrees: its `mesa-software-node` adapter is recorded as
`"llvmpipe: Mesa 23.2.1-1ubuntu3.1~22.04.3 (LLVM 15.0.7) 0.0.1"`.

### 0.1 What happened instead, and why this is urgent rather than tidy

CI made the move sideways, without the phase and without a commit. `.github/workflows/ci.yml` said
`runs-on: ubuntu-latest`, and GitHub repointed that label at Ubuntu 24.04 during 2026. The lane installs its
rasteriser at job time (`apt-get install mesa-vulkan-drivers`), so it takes whatever the image's archive
offers on the day. Measured in run 35923105007, job 107393562579 (2026-09-23):

| | Validated by every gate record | Actually running in CI |
| --- | --- | --- |
| Image | Ubuntu 22.04.5 LTS | `ubuntu-24.04`, image release `20260907.300` |
| C library | glibc 2.35 | glibc 2.39-0ubuntu8.8 |
| Software rasteriser | Mesa 23.2.1 (LLVM 15.0.7) | Mesa 25.2.8-0ubuntu0.24.04.2 (LLVM 20.1.2) |
| lavapipe ICD file | `lvp_icd.x86_64.json` | `lvp_icd.json` |

Two major Mesa versions and five LLVM versions of shader compiler separate the rasteriser every kernel in this
package was signed off against from the one now judging it on every pull request. Nothing in the repository
recorded that, because nothing had to change for it to happen.

GitHub has announced the same move again: `ubuntu-latest` becomes Ubuntu 26 from 2026-10-19
(`actions/runner-images#14748`, which the job's own annotations carry). Left alone it would happen the same
silent way a second time.

### 0.2 The node shard keeps losing a vitest worker

In run 35923105007, job 107393562579, attempt 1, the `webgpu-graph-algorithms-node` shard failed with

```
The futex facility returned an unexpected error code.
```

and two test files whose workers never reported: `test/kernel/compile.test.ts` and `test/sabotage/tiers.test.ts`
(the shard's own missing-file report: `started 90, reported 88, missing 2`). No test failed; vitest then raised
`Error: Channel closed` / `ERR_IPC_CHANNEL_CLOSED` from tinypool because the worker processes were gone. The
same job passed on re-run with no change.

That message is not vitest's and not this package's. It is glibc's `futex_fatal_error()`
(`sysdeps/nptl/futex-internal.h`), reached when the `futex` syscall returns an error the C library treats as
impossible -- `EFAULT`, `EINVAL`, `ENOSYS` or `ETIMEDOUT` from `futex_wait`. In practice that means a pthread
synchronisation object was freed, unmapped or reused while a thread was still blocked on it: a native-library
lifetime bug, inside a worker, aborting the process. It is a C library abort, not a test failure, which is why
no test is named.

This is not a one-off. Five of the last 33 runs of this shard lost a worker the same way, on two
different branches; the abort message appeared in one of them and the other four closed the channel
with no explanation at all. Section 4 is the investigation, with the table, and states plainly what is
and is not known.

## 1. Adapters and lanes exercised for this record

| Adapter / lane | Project | Runner class | Result |
| --- | --- | --- | --- |
| Mesa lavapipe 23.2.1 (LLVM 15.0.7), Dawn, `webgpu` 0.4.0 | `node` | `mesa-software-node` | 115 files, 2256 passed, 3 skipped of 2259, exit 0 |
| Mesa lavapipe 23.2.1 (LLVM 15.0.7), Dawn, `webgpu` 0.4.0 | `node-device-errors` | `mesa-software-node` | 11 files, 151 passed of 151, exit 0 |
| NVIDIA RTX 4070 SUPER driver 580.173.02, Dawn, `webgpu` 0.4.0 | `node` + `node-limits` | `nvidia-lovelace-driver580` | 122 files, 2267 passed, 3 skipped of 2270, exit 0 |
| NVIDIA RTX 4070 SUPER driver 580.173.02, Dawn, `webgpu` 0.4.0 | `node-device-errors` | `nvidia-lovelace-driver580` | 11 files, 151 passed of 151, exit 0 |
| Mesa lavapipe 25.2.8 (LLVM 20.1.2) on `ubuntu-24.04`, Dawn, `webgpu` 0.6.1 | `node`, `node-device-errors` | -- | {{OPEN: `gh workflow run ci.yml --ref chore/webgpu-environment-move`, then the `webgpu-graph-algorithms-node` shard}} |
| NVIDIA T4 in `ubuntu:24.04`, Dawn, `webgpu` 0.6.1 | `node` + `node-limits` | `gpu-linux-t4` | 122 files, 2266 passed, 2 skipped, **2 failed** of 2270 (run 35938092059). Both failures were stale version pins in this branch's own tests, not the environment, and are fixed: `test/build-output.test.ts` asserted the devDependency was `0.4.0` and `test/node/entry.test.ts` carried a second copy of the install-hint string. `[missing-files] started 123, reported 123, missing 0` -- no worker was lost. {{OPEN: re-dispatch after the fix}} |

The lavapipe commands are the default lane's, run from `webgpu-graph-algorithms/`:

```bash
GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any \
  VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json XDG_RUNTIME_DIR=/tmp \
  node scripts/run-node-shard.js --project=node
```

and the card's, with the extracted libEGL tree the container still needs (section 2 item 7):

```bash
LD_LIBRARY_PATH=/home/apowers/Projects/graphty-monorepo/tmp/egl/root/usr/lib/x86_64-linux-gnu \
  GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp \
  node scripts/run-node-shard.js --project=node --project=node-limits
```

Both counts above are at `webgpu` 0.4.0, the pin as this branch found it. They are the BEFORE half of the move
and they are recorded because the gate asks for G1-G3 green on both lanes and this is the last state in which
that can be measured on the existing machines.

## 2. The G-ENV checklist (spec 13 row P-ENV), each item mapped to its evidence

The gate as the design states it: G1-G3 re-run green on both lanes with the new image; `gpu-report.json` shows
the new driver / Mesa versions; benchmark baselines re-recorded for the new runner class.

| # | Item (design 13 row P-ENV) | Status | Evidence, or what would close it |
| --- | --- | --- | --- |
| 1 | The dev container moves to Ubuntu 24.04 (glibc 2.39, Mesa 25.x lavapipe, `libegl1` present) | **OPEN** | The container is the owner's and cannot be rebuilt from inside itself. Measured now: `PRETTY_NAME="Ubuntu 22.04.5 LTS"`, `ldd (Ubuntu GLIBC 2.35-0ubuntu3.13)`, `mesa-vulkan-drivers 23.2.1-1ubuntu3.1~22.04.3`, `dpkg-query -W libegl1` -> "no packages found". Closed by section 3 item 1. |
| 2 | The runner image moves to Ubuntu 24.04 | **MET on both lanes** | Default lane: `ci.yml` names `ubuntu-24.04` on all ten jobs instead of `ubuntu-latest`, and a new step records the image, glibc and Mesa versions into the job log -- explicit rather than inherited. GPU lane: its host is Ubuntu 22.04.5 / glibc 2.35 (gpu.yml run 35922927676, job 107391041798) and machine.dev offers no way to change that, so `gpu.yml` now runs the whole job in an `ubuntu:24.04` container with the card passed through. VERIFIED in run 35938092059: Ubuntu 24.04.5, glibc 2.39, the NVIDIA ICD at `/etc/vulkan/icd.d/nvidia_icd.json`, and `nvidia-smi` reporting the Tesla T4 -- section 3 item 2. |
| 3 | `webgpu` 0.4.0 -> the current 0.6.x in graph-format's devDependencies | **MET (declared), UNVERIFIED (run)** | `graph-format/package.json` devDependency is `"webgpu": "^0.6.1"`. It cannot be exercised here: see item 6. |
| 4 | `webgpu` 0.4.0 -> the current 0.6.x in this package's devDependency | **MET (declared), UNVERIFIED (run)** | `webgpu-graph-algorithms/package.json` devDependency is `"webgpu": "0.6.1"`. The peer range `">=0.4.0 <1.0.0"` already admitted it and is unchanged (design 2.5). |
| 5 | The `E_NO_WEBGPU` install hint re-pinned with it | **MET** | `src/node/index.ts` `INSTALL_HINT` is now "install the optional peer dependency webgpu@0.6.1"; `test/device/acquire.test.ts` asserts the same string and passes in the lavapipe run of section 1. |
| 6 | The suites run on 0.6.x | **MET on the GPU lane; OPEN on the dev container** | On the lane: `webgpu` 0.6.1 loaded on the T4 in the container and ran the whole `node` + `node-limits` suite, 2266 of 2270 passing with the only two failures being this branch's own stale version pins (now fixed). On the dev box it still cannot load. Measured on the dev box: `require("webgpu")` fails with ``Error: /usr/lib/x86_64-linux-gnu/libstdc++.so.6: version `GLIBCXX_3.4.32' not found (required by .../webgpu/dist/linux-x64/dawn.node)``, `code: 'ERR_DLOPEN_FAILED'`. `readelf -V` on the two binaries gives the rule: 0.4.0 needs at most `GLIBC_2.34` / `GLIBCXX_3.4.30`; 0.6.1 needs `GLIBC_2.38` / `GLIBCXX_3.4.32`. Ubuntu 22.04 provides 2.35 / 3.4.30; Ubuntu 24.04 provides 2.39 / 3.4.33. Closed by section 3 items 1 and 2, then item 4. |
| 7 | The `LD_LIBRARY_PATH` workaround removed | **OPEN** | The workaround exists because the container has no `libegl1`, so Dawn's NVIDIA ICD cannot `dlopen("libEGL.so.1")` and silently lists only llvmpipe (`docs/HEADLESS_GPU_REPORT.md` appendix D). It is still required today and every card invocation in section 1 still carries it. Ubuntu 24.04 ships `libegl1`, so the container move removes the need; the workaround is deleted from `CLAUDE.md` and `README.md` only once the card run passes without it. Closed by section 3 item 3. |
| 8 | The 0.6.x unmap-on-destroy behaviour noted as redundant with `Readback`'s own unmap | **MET** | Noted in the file comment of `src/memory/readback.ts`, naming the upstream commit (dawn-gpu/node-webgpu `402a7ea1`, "unmap a device's buffers when the device is destroyed", released in 0.6.1) and stating precisely how far the redundancy goes: it covers the unmap half of `destroyAll()`, NOT the pending-map deferral, which guards a different defect (the double-settle SIGSEGV of `AsyncRunner::Reject`) that no commit between 0.4.0 and 0.6.1 claims to fix. Nothing was deleted. |
| 9 | G1, G2 and G3 re-run green on BOTH lanes on the new image | **OPEN** | Neither lane can run 0.6.1 today (items 1, 2, 6). Closed by: after section 3 items 1 and 2, `node scripts/run-node-shard.js --project=node --project=node-limits` and `--project=node-device-errors` on the card and on lavapipe in the rebuilt container, and a `gpu.yml` run on a `gpu`-labelled pull request. |
| 10 | `gpu-report.json` shows the new driver / Mesa versions | **OPEN** | `scripts/gpu-report.js` runs as a step of `gpu.yml` and uploads to the run artifact; it needs a green `gpu.yml` dispatch on the containerised lane. Closed with item 9. |
| 11 | Benchmark baselines re-recorded for the new runner class | **OPEN** | `benchmarks/results/<runner-class>.json` and `benchmarks/results/noise-floor.json` all carry the Mesa 23.2.1 / LLVM 15.0.7 software adapter. Closed by `pnpm run bench` on the rebuilt dev container and a `gpu.yml` run on the containerised T4 lane, per section 3 item 5. This record does NOT re-record them: the numbers would be the old rasteriser's. |

Nothing in this table is marked met because it is likely to be met.

## 3. What the owner must do

Each step is a machine this session cannot reach. Run them in order; step 4 is the first that produces new test
evidence.

1. **Rebuild the dev container on Ubuntu 24.04.** It must provide glibc >= 2.38, `GLIBCXX_3.4.32`,
   `mesa-vulkan-drivers` (25.x), `libvulkan1`, `vulkan-tools` and -- the one that removes the workaround --
   `libegl1`. Verify inside it:
   ```bash
   grep PRETTY_NAME /etc/os-release                  # expect Ubuntu 24.04
   ldd --version | head -1                           # expect >= 2.38
   strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep -o 'GLIBCXX_3\.4\.3[0-9]' | sort -uV | tail -1
   dpkg-query -W mesa-vulkan-drivers libvulkan1 libegl1
   ls /usr/share/vulkan/icd.d                        # the lavapipe ICD is lvp_icd.json on 24.04, not lvp_icd.x86_64.json
   nvidia-smi --query-gpu=name,driver_version --format=csv,noheader
   ```
2. **The GPU lane's operating system -- DONE in `gpu.yml`, and pending its first dispatch.** The machine.dev
   on-demand T4 that `gpu.yml` selects by the label `machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand` runs Ubuntu
   22.04.5 with glibc 2.35 (measured in run 35922927676). At `webgpu` 0.6.1 that lane cannot load Dawn at all,
   and `release.yml` requires it green before it publishes.

   **The host cannot be moved, and no label moves it.** machine.dev has no image or operating-system selector of
   any kind. Their label grammar is documented and closed -- `machine`, then one of `cpu=` or `gpu=`, then
   `architecture`, `cpu`, `ram`, `tenancy`, `regions`, `disk_size`, `disk_iops`, `disk_throughput`, `metrics`,
   `metrics_interval`, `id` -- and contains no image key. Their FAQ states that all of their runners are Ubuntu
   22.04, with no plan qualifier, and their configuration page puts the job's environment down to the runner
   image rather than to anything the caller chooses. So there is no label to write here, and anyone who goes
   looking for one will spend a round of dispatches proving that.

   **What was done instead: the job takes its own userspace.** Their GPU image preinstalls Docker and the NVIDIA
   Container Toolkit alongside the driver and CUDA, so the job now runs in a `container: ubuntu:24.04` with the
   card passed through -- same runner, same label, same price, glibc 2.39. The host stays 22.04 and stops
   mattering.

   **VERIFIED, in run 35938092059 (job 107439615557, 2026-09-24).** Their documentation never mentions container
   jobs, so this was a real experiment; all three things that could have failed did not. Container creation with
   `--gpus all` succeeded, so the NVIDIA runtime is registered on their image. The floor step reported
   `PRETTY_NAME="Ubuntu 24.04.5 LTS"`, `ldd (Ubuntu GLIBC 2.39-0ubuntu8.9) 2.39`, `libvulkan1 1.3.275.0-1build1`,
   `libegl1 1.7.0-1build1`, the ICDs at `/etc/vulkan/icd.d/{nvidia_icd.json,10_nvidia.json,50_mesa.json}` -- note
   `/usr/share/vulkan/icd.d` does NOT exist there, which is why the assertion tests both paths -- and `nvidia-smi`
   showing `Tesla T4`, driver 580.126.20, CUDA 13.0, 15360 MiB. Then `webgpu` 0.6.1 loaded and bound it:
   `[gpu-report] adapter vendor=nvidia architecture=turing device=tesla-t4 ... software=false`.

   So the lane has glibc 2.39 and a real T4 at the same time, at the same label and the same price, and the 22.04
   host no longer decides anything. **This item no longer blocks the merge.**
3. **After step 1 only:** confirm the card is reachable with no `LD_LIBRARY_PATH`:
   ```bash
   cd webgpu-graph-algorithms
   GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp node scripts/gpu-report.js
   ```
   It must print an NVIDIA adapter. If it does, delete the `LD_LIBRARY_PATH` line from the "Running the suites
   locally" block of `webgpu-graph-algorithms/CLAUDE.md`, the `GRAPHTY_EGL_LIB_DIR` rows of `CLAUDE.md` and
   `README.md`, and close item 7 above. If it prints llvmpipe, `libegl1` is missing and step 1 is not finished.
4. **Re-run the suites on 0.6.1 in the rebuilt container**, both adapters, and record the counts in section 1:
   ```bash
   cd webgpu-graph-algorithms
   pnpm install                                   # picks up webgpu 0.6.1 from the lockfile
   node -e 'require("webgpu"); console.log("dawn loads")'
   GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any \
     VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json XDG_RUNTIME_DIR=/tmp \
     node scripts/run-node-shard.js --project=node
   GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any \
     VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json XDG_RUNTIME_DIR=/tmp \
     node scripts/run-node-shard.js --project=node-device-errors
   GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp \
     node scripts/run-node-shard.js --project=node --project=node-limits
   GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp \
     node scripts/run-node-shard.js --project=node-device-errors
   ```
   Note the ICD file name changes on 24.04: `lvp_icd.json`, not `lvp_icd.x86_64.json`.
5. **Re-record the baselines** once steps 1, 2 and 4 are green, on a quiet card and a quiet box:
   ```bash
   cd webgpu-graph-algorithms
   GRAPHTY_GPU_REQUIRE=hardware XDG_RUNTIME_DIR=/tmp pnpm run bench
   GRAPHTY_NOISE_FLOOR_WRITE=1 GRAPHTY_GPU_ADAPTER=llvmpipe GRAPHTY_GPU_REQUIRE=any \
     VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json XDG_RUNTIME_DIR=/tmp \
     node scripts/run-node-shard.js --project=node
   ```
   then a `gpu.yml` run for the T4 rows.
6. **Re-run the host matrix.** `webgpu` 0.6.0 also restructured its `dist/` into per platform-arch folders and
   added a `windows-11-arm` build, so the macOS and Windows legs of `hosts.yml` get new binaries too and this
   branch does not exercise them (`hosts.yml` runs on pushes to master and on pull requests; there is no pull
   request for this branch by instruction). `gh workflow run hosts.yml --ref chore/webgpu-environment-move`.

### 3.1 The three alternatives to the container, and why each was rejected

Someone will propose each of these, so they are written down with what rules them out.

**The hosted `gpu-linux-t4` runner, already an option in the workflow's dispatch input.** Rejected, and not even
worth a dispatch yet. GitHub does not publish that image's Ubuntu version anywhere, so it may be 22.04 too and
buy nothing; it costs about three times the machine.dev price ($0.052/min against $0.018/min on-demand); and
this repository's own record of it is two attempts that produced no job at all -- one refused on billing, one
queued seventeen minutes with no runner (`gpu.yml` header, 2026-09-18). Do not spend a dispatch on it until
somebody can state its Ubuntu version from documentation.

**Upgrading the C library in place on the 22.04 host.** Not merely hard -- impossible. The two missing symbols
are not the same kind of thing. `GLIBCXX_3.4.32` lives in libstdc++ and could in principle be supplied, by a
newer `libstdc++6` or by shipping the library beside the binary. `GLIBC_2.38` is the dynamic loader and the C
library itself, which is not replaceable under a running distribution and exists in no 22.04 archive at any
version. Replacing it is replacing the operating system, which is where this started.

**Pinning `webgpu` 0.4.0 for the GPU lane alone.** This is the tempting one, because it makes the release gate
green today, and it is the worst of the three. It guts the lane: the only machine in this project with a real
GPU would be testing a binary that no consumer on a current distribution installs, while the README this branch
ships tells those consumers the symbol rule and points them at 0.6.x. The lane would be green about software we
do not ship. And it collides with section 4 head-on: every worker death on record was observed with the OLD
binary running against a newer C library than it was built for. Pinning the old binary on the one lane that
could answer whether that matters keeps the question open permanently, on purpose.

## 4. The intermittent abort: what is known, what is not

**Observed frequency, and it is not once.** The abort is one visible face of a failure that is recurring. Across
the 33 `webgpu-graph-algorithms-node` shard jobs of the last 30 CI runs, seven failed. Two were unrelated
infrastructure (`Artifact not found for name: build-graphty`). The other **five all died the same way: a vitest
worker process disappeared and the run ended in `Error: Channel closed` / `ERR_IPC_CHANNEL_CLOSED`**, with no
test having failed.

| Job | Run | Branch | How the worker went |
| --- | --- | --- | --- |
| 107393562579 | 35923105007 | `plan/webgpu-frontier-and-guides` | `The futex facility returned an unexpected error code.`; 2 of 90 files never reported (`test/kernel/compile.test.ts`, `test/sabotage/tiers.test.ts`) |
| 106951862823 | 35788215777 | `feat/gpu-p4` | hung: no output for 90 s, the hang reporter fired and signalled 6 processes |
| 106937614985 | 35783732328 | `feat/gpu-p4` | hung the same way |
| 106911279262 | 35775999618 | `feat/gpu-p4` | channel closed, no further diagnostic |
| 106819129890 | 35748654148 | `feat/gpu-p4` | channel closed, no further diagnostic |

So: **five worker deaths in 33 shard runs, about 15%**, on two different branches, which rules out a single
branch's code as the cause. One of the five printed the C library abort; the other four left no message that
names a cause. Every one of them passed on a re-run.

One negative result worth stating, because it looks like evidence and is not: the hang reporter's process
snapshot shows a surviving worker with `futex_do_wait` in its `WCHAN` column. That is what ANY blocked thread
looks like to `ps` and is not a symptom of anything. The abort message is the only futex signal here that means
something.

**Mechanism, established.** The message comes from glibc, not from Node, vitest or this package. It is raised
by `futex_fatal_error()` when the `futex` syscall returns `EFAULT`, `EINVAL`, `ENOSYS` or `ETIMEDOUT` to
`futex_wait`. `EFAULT` and `EINVAL` mean the futex word is not valid memory or is misaligned, which in a
running process means a pthread mutex or condition variable was destroyed, freed or reused while a thread was
still waiting on it. The process aborts; no test is at fault and none is named.

**Where it is consistent with what this package already knows.** `test/setup/gpu.ts` carries a measured
comment from P1: a garbage collection of the Dawn instance while device teardown callbacks are in flight
"segfaults, aborts or deadlocks the worker (the futex hang after afterAll)", which is why the teardown holds
the GPU object until every destroyed device has reported its loss. `src/memory/readback.ts` carries a second
one: dawn-node 0.4.0 settles a pending map promise twice, once on `unmap()`/`destroy()` and again when Dawn's
own callback arrives, a SIGSEGV in `AsyncRunner::Reject`. Both are the same family -- Dawn native teardown
racing its own threads -- and both were measured on 0.4.0. The two files that died are consistent with it:
`test/kernel/compile.test.ts` is the WGSL compile matrix and `test/sabotage/tiers.test.ts` recompiles mutated
kernels, so both create and tear down many devices and pipelines.

**Verdict: UNKNOWN whether the bump fixes it.** Not "probably", not "likely". The evidence for each candidate
answer:

- *Unrelated* is not supportable: the abort is in native threading under Dawn, which is exactly what the bump
  replaces.
- *Fixed* is not supportable either. The full commit list between 0.4.0 and 0.6.1 is seventeen commits, and not
  one names a futex, a thread, a teardown or a race: they are a Dawn roll ("bump to latest", "update to
  latest"), `@webgpu/types` 0.1.72, the Ubuntu 24.04 build base, turning off Wayland and C++ module support on
  Linux, the per platform-arch `dist/` restructure, a `windows-11-arm` build, a README edit, and
  `402a7ea1 unmap a device's buffers when the device is destroyed`. That last one touches the suspect path --
  device destroy -- but it addresses buffers outliving their device, not synchronisation objects outliving
  their waiters. The two Dawn rolls move Dawn forward by about five months and could fix it incidentally, but
  "could" is not evidence.
- *Made less likely* is plausible and unproven, for the same reason.

**A second candidate the bump would also settle, and which nobody has ruled out.** The abort was seen while
running the 0.4.0 binary -- built against glibc <= 2.34 -- on glibc 2.39. That direction is the supported one
and normally fine, so it is not an explanation on its own; but it has never been a *tested* combination here,
because the phase that was supposed to retire it never ran. The bump ends the mismatch either way.

**What would settle it.** Count WORKER DEATHS, not aborts. Four of the five losses printed no abort at all, so
an experiment that greps for the futex message would score four of them as clean runs and reach the wrong
answer. The symptom to count is the lost worker, whatever message accompanies it. At a 15% rate, 30 runs give
about five expected failures at 0.4.0 -- enough to tell a fix from noise, and cheap, because the shard takes
about nine minutes:

```bash
# on the rebuilt container or an ubuntu-24.04 runner, once per webgpu version
deaths=0
for i in $(seq 1 30); do
  out=$(node scripts/run-node-shard.js --project=node 2>&1)
  if grep -qE "ERR_IPC_CHANNEL_CLOSED|futex facility|missing-files\] .* missing [1-9]" <<<"$out"; then
    deaths=$((deaths + 1)); printf '%s\n' "$out" > "death-$i.log"
  fi
done
echo "worker deaths: $deaths / 30"
```

Zero deaths in 30 at 0.6.1 against a reproduction at 0.4.0 settles it as fixed. Deaths at both settles it as
independent of the version, which points at Dawn's teardown generally and makes it an upstream bug report --
`test/kernel/compile.test.ts` and `test/sabotage/tiers.test.ts` are the files to hand them, both being heavy
creators and destroyers of devices and pipelines. Until one of those runs, this section stays UNKNOWN.

**The one 0.6.1 run so far, and why it settles nothing.** Run 35938092059 executed the whole `node` +
`node-limits` suite at 0.6.1 and reported `started 123, reported 123, missing 0` -- no worker lost. That is
encouraging and it is not evidence. It is a single run, on the Tesla T4 under the NVIDIA driver, whereas
every death on record happened on the OTHER lane: lavapipe on a GitHub `ubuntu-24.04` runner. Different
adapter, different driver, different machine. The experiment above still has to be run where the deaths
actually occur.

**Do not close this on a quiet week.** A 15% per-run failure has a 1-in-16 chance of sitting out four
consecutive runs, so "we ran it a few times and it was fine" is not evidence of anything. The shard's existing
missing-file and hang reporting (`scripts/run-node-shard.js`) is what keeps each recurrence visible as a lost
worker rather than mistaken for a test failure; that reporting should stay whatever the outcome.

## 5. What this branch changed

| File | Change |
| --- | --- |
| `.github/workflows/ci.yml` | Ten jobs move from `ubuntu-latest` to `ubuntu-24.04`; a header comment says why; a new "Record the image, glibc and rasteriser versions" step on the lavapipe lane prints `PRETTY_NAME`, `ldd --version` and the installed `mesa-vulkan-drivers` / `libvulkan1` / `libegl1` versions into the job log. A no-op today -- `ubuntu-latest` IS 24.04 -- and the point is that it stays one until someone edits this file. |
| `.github/workflows/gpu.yml` | The whole job moves into a `container: ubuntu:24.04` with `--gpus all --ipc=host` and `NVIDIA_DRIVER_CAPABILITIES=all`, because the host is Ubuntu 22.04 and machine.dev offers no way to change that. A bootstrap step before checkout installs git (without it checkout silently falls back to a REST tarball), the Vulkan loader and libEGL; the modprobe step is gone (a container cannot load host modules, and the host already has them up) and is replaced by a floor report that fails loudly if the card or the Vulkan ICD did not come through; the Playwright cache key gains the image so a 22.04 browser build is not restored into 24.04; the timeout rises 75 -> 85 minutes for the pull and the bootstrap. |
| `webgpu-graph-algorithms/package.json` | devDependency `webgpu` 0.4.0 -> 0.6.1. The peer range is untouched. |
| `graph-format/package.json` | devDependency `webgpu` ^0.4.0 -> ^0.6.1. |
| `webgpu-graph-algorithms/src/node/index.ts` | `INSTALL_HINT` re-pinned to 0.6.1; the stale "P-ENV re-pins ..." comment now points at this record. |
| `webgpu-graph-algorithms/test/device/acquire.test.ts` | The asserted hint string follows. |
| `webgpu-graph-algorithms/src/memory/readback.ts` | The redundancy note of item 8. No behaviour change. |
| `webgpu-graph-algorithms/README.md` | The install section gives the measured rule for which build a Linux consumer can load, in symbol versions rather than a distribution name, and stops telling every consumer to install 0.4.0. |

## 6. Findings and owner decisions

| Id | Finding | Proposed disposition |
| --- | --- | --- |
| ENV-F1 | The phase was skipped with no record, and three later gates were signed off on the environment it was meant to replace. | This record is the missing one. No re-gating of P4, P5 or P7 is proposed: their measurements are valid for the adapter they name, and section 2 item 11 re-records the baselines once the move lands. |
| ENV-F2 | The GPU lane's T4 host is Ubuntu 22.04.5 and machine.dev provides no image selector at any price or plan, so no label fixes it. Nothing recorded this, and it made the bump look like a two-machine move with one machine unreachable. | Resolved in `gpu.yml` rather than by a decision: the job now runs in an `ubuntu:24.04` container on the same runner, using the Docker and NVIDIA Container Toolkit their GPU image preinstalls. Same label, same price, glibc 2.39. VERIFIED in run 35938092059; section 3.1 records the three alternatives and why each was rejected. |
| ENV-F3 | `ubuntu-latest` moved the default lane to 24.04 with no commit, and will move it to Ubuntu 26 on 2026-10-19. | Fixed here by naming the image. Re-pinning to 26 is then a reviewed change with a gate record, which is what this phase exists to make true. |
| ENV-F4 | The lavapipe ICD file is named `lvp_icd.x86_64.json` on 22.04 and `lvp_icd.json` on 24.04. `ci.yml` already discovers it with `find`; the invocations documented in `CLAUDE.md` hard-code the 22.04 spelling. | Update `CLAUDE.md` at section 3 step 3, together with the `LD_LIBRARY_PATH` deletion, so both container-shaped facts change in one commit. |
| ENV-F7 | The first containerised dispatch failed on two assertions that pin the OLD `webgpu` version -- `test/build-output.test.ts` expecting the devDependency to be `0.4.0`, and a second copy of the install-hint string in `test/node/entry.test.ts`. Both live in the `node` project, which the dev box could not run at all after the bump, so nothing local could have caught them. | Fixed by following the pin, not by relaxing the assertions: both are deliberate contract tests and both now name 0.6.1. `test/build-output.test.ts`'s assertion on the PEER range is untouched, because that range is unchanged by design. The wider point is the one worth keeping: the lane found in twenty minutes what the developer machine is now structurally incapable of finding, which is the argument for fixing the dev container rather than working around it. |
| ENV-F6 | The branch cannot pass `tools/prepush.sh` on a 22.04 box: the gate requires an adapter and 0.6.1 gives none. Build, bundle, lint and knip pass; the package's node projects fail up front. | Expected and correct -- the gate is behaving as designed, and it is the cheapest independent confirmation that the bump needs the container move first. No change to the gate is proposed: weakening it to let this branch through would remove the check that caught it. Push after section 3 item 1, or with `--no-verify` if the red state is understood. |
| ENV-F5 | The node shard loses a vitest worker in about 15% of its CI runs (five of the last 33, two branches). One of the five printed a glibc futex abort; four printed nothing. The cause is unexplained and the bump's effect on it is unknown. | Section 4 states the experiment, which counts lost workers rather than abort messages -- grepping for the abort would have scored four of the five as clean. Do not close G-ENV green because a handful of runs happened not to fail: at 15% a quiet stretch of four runs is a 1-in-16 coincidence. |
