# CI/CD, testing and release plan for the graphty monorepo

Status: adopted by the owner on 2026-10-04, as written, with two choices made explicit: the
visual-review gate accepts a merge-queue batch (section 6), and releases go out on a daily
train (section 10), plus an ad hoc release for anything that cannot wait a day (section 11).
Migration is in progress: section 16 lists the steps in order, and `CLAUDE.md` ("CI/CD
Pipeline", "Merging", "Release versioning") says which parts are live today.
The decision record is `design/decisions/2026-10-04-ci-cd-plan-adopted.md`.

This plan redesigns how pull requests are checked, merged and released in
graphty-org/graphty-monorepo. It is written for someone who knows GitHub Actions but
has not seen the repository's recent history.

## 1. The situation in numbers

The repository is a pnpm + Nx TypeScript monorepo with about ten published npm packages
and one private app. Almost every pull request is written by an AI coding agent; one
person (the owner) reviews and is the only one allowed to approve screenshot changes.

Measured from origin/master and the GitHub API on 2026-10-04:

| Fact                                                | Value                        | Source                       |
| --------------------------------------------------- | ---------------------------- | ---------------------------- |
| Merges to master per day (last 4 full days)         | 14, 38, 30, 34               | `git log --first-parent`     |
| Release commits per day                             | 2 to 8                       | same                         |
| Git tags (npm versions) created in the last 7 days  | 221, about 30 a day          | `git for-each-ref refs/tags` |
| Pull request CI, start to finish, successful runs   | median 28 min, p90 39 min    | last 100 ci.yml runs         |
| Pull request CI runs that failed                    | 32 of 88 (36%)               | same                         |
| Master CI, start to finish                          | median 54 min                | same                         |
| Master CI, sum of all job durations                 | 163 job-minutes in 32 jobs   | jobs of run 37213810248      |
| Master CI critical path (build, then longest shard) | about 32 min                 | same                         |
| GPU lane (NVIDIA T4, machine.dev on-demand)         | 40 to 90 min a run           | gpu.yml runs                 |
| Hosts lane (macOS Metal, Windows D3D12 WARP)        | median 43 min, up to 142 min | hosts.yml runs               |

Two conclusions fall out of this before any research:

1. **The CI work itself is small; waiting for runners is the problem.** A full run is 163
   job-minutes, and the 60-job plan offers 86,400 job-minutes a day, enough for about 500 full
   runs. But a full run asks for 32 runners at once, half of them for jobs that last one to
   four minutes, most of which is setup. Master's 54 minutes of wall time against a 32-minute
   critical path is about 20 minutes of waiting for a free runner. Thirty pull requests pushing
   at once ask for close to 1,000 runners.
2. **The merge queue is at its ceiling.** Today Mergify checks one pull request at a time, in
   place: it merges master into the pull request and waits for that pull request's full CI
   (about 30 to 40 minutes). That is at most about 2 merges an hour, about 40 a day running
   around the clock. The 30 to 38 merges a day on 1-3 October are that ceiling.

The four times master went red on 3 and 4 October each have a clear mechanism:

- **A bundle-size budget overflow from three pull requests combined.** Each one passed on its
  own. This is "merge skew", the failure a merge queue that tests the combined tree exists to
  catch.
- **A cost-estimate test at its tolerance edge.** The `cost-accuracy` job in ci.yml runs only
  on master. A check that runs only after merging can only turn master red.
- **Two UI test races.** These were real bugs in the code, not flaky tests.
- **A GPU-lane cache bug that showed only on a second run.** The bug was in the lane itself, and
  the lane runs only on master.

## 2. The design in one page

```
 agent pushes --> [PR CI: affected build/lint/tests + visual capture]      ~20 min, free
                    (draft PRs skip it; a new push cancels the old run)
                         |
 owner reviews screenshots on the PR (passkey) --+
 path-scoped T4 GPU run, once, if GPU code changed-+
                                                 v
                 queue entry: PR CI green + visual gate green + title lint
                         |
                         v
 [Mergify queue: batches of up to 4 PRs, 2 batches checked at once,
  FULL un-selected CI on the combined tree, screenshots must equal the
  committed baselines (no new approvals), bisect on failure]            ~35-40 min
                         |
                         v
 master --> [post-merge: full CI again (feeds deploy + release), GPU on
             GPU-affecting commits, Hosts on path-matching commits]
            red CI => freeze the queue + automatic revert PR, top priority
                         |
                         v
 daily release train: release PR (versions + changelogs) cut from the
 newest commit green on every lane, merged through the queue, published
 with npm trusted publishing from release.yml; graphty.app deploys on
 every green master. Ad hoc release: the same workflow, dispatched by hand,
 cuts the release PR at once
 nightly: full Hosts (Windows 90 min, macOS), full GPU, on master tip
```

Expected result: 50 merges a day with room for about 150; about 20 minutes from push to PR
feedback; about 45 minutes from approval to merge in the median case; at most a few
red-master events a month, each frozen and reverted automatically; about 5 to 10 npm versions
a day instead of about 30; GitHub Actions runner cost unchanged at $0; GPU spend about
$5 to $15 a day.

The rest of this document explains each piece, the alternatives, and the migration.

## 3. What runs on a pull request push

**Runs:** the same "affected" CI that runs today. That means build, lint, knip, formatting,
the repository checks (bundle size, published dependencies, declared tools, release hold,
legacy use), the test shards of the packages the change affects plus their dependents, the
Storybook builds, link checking, and the visual capture with the visual-review gate. Two
changes:

1. **Fewer, longer jobs.** Merge the shards that take one to four minutes into two "small
   packages" jobs: one for graph-format, graph-io, graph-samples, layout and algorithms-default;
   one for the browser-based shards algorithms-browser, remote-logger, compact-mantine, graphty,
   visual-review and webgpu-graph-algorithms-browser. The visual capture of the algorithms,
   layout and graphty Storybooks goes into one job as well. A full run drops from 32 jobs to
   about 15, with the same critical path. `tools/ci-test-matrix.mjs` already owns the shard
   list, so this is an edit there.
2. **No CI on draft pull requests.** Agents open a draft while they iterate (the local pre-push
   gate still runs) and mark it ready when done. CI triggers on `ready_for_review` and
   `synchronize` of non-draft pull requests. Combined with the existing cancel-in-progress, this
   removes most of the runs that are thrown away.

**Moves in:** the `cost-accuracy` test (graphty-element `test:cost`) runs on any pull request
that affects graphty-element. Every check that can fail must run before the merge. Any check
that is too noisy to run there is advisory, and its result goes to the job summary, never
into a red status on master.

**Stays on master only, advisory:** the algorithms performance benchmarks. They record
numbers and have no pass/fail role.

**Why affected-only here is safe:** the merge queue (section 5) runs the full, un-selected
suite on the combined tree before anything lands. Mozilla, Google TAP and Meta allow test
selection before merge only because a full run follows it (research: testing tiers, section
3). Here the full run comes before the merge, which is stricter than any of them.

**Alternatives considered:**

- Run only cheap checks on the pull request and everything else in the queue (Mergify's
  documented "two-step CI", Rust's light PR CI). Rejected for the browser tests: 36% of pull
  request runs fail today. If those failures were found in the queue instead, almost every
  batch would fail (a batch of 4 at a 36% failure rate fails 83% of the time) and the queue
  would do nothing but bisect. Agents need the full affected suite on their own branch.
  OpenStack's "clean check" rule, that a change must pass its own check before entering the
  gate, is the same reasoning.
- Run everything on every push. Rejected: affected-only already cut a run from about 30 jobs
  (`tools/ci-test-matrix.mjs` header) and the queue now provides the full run.

**Reversible:** all of it is workflow configuration.

## 4. What gates queue entry

Mergify `queue_conditions`, evaluated on the pull request's own head commit:

- "All Checks Pass" green on the pull request. This includes the visual-review gate, so every
  changed screenshot carries the owner's passkey-signed approval for this pull request.
- "Lint PR Title" green.
- Not a draft, no `hold` label, not a breaking change (a `!` before the colon in the title).
  Breaking changes keep waiting for the grouped major release, as today.
- **If the change affects webgpu-graph-algorithms** (by `nx show projects --affected`, which
  covers graph-format and the lockfile): one green T4 GPU run on the pull request head. See
  section 7.

Why approval belongs here and not in the queue: an approval is bound to a pull request and to
the exact image contents it was given over. The queue tests a synthetic commit nobody looked
at. Every vendor that tried to require approval on queue commits stalled or asked for a second
approval (Chromatic issues #871 and #1483). Argos, the only tool that documents both queue
kinds, re-uses the pull requests' approvals inside the queue instead of asking again. This
plan does the same (section 6).

## 5. What runs in the merge queue

**Tool: keep Mergify,** switched from "one pull request at a time, in place" to batched
checks on draft pull requests.

```yaml
# sketch, not final
queue_rules:
    - name: default
      batch_size: { min: 1, max: 4 }
      batch_max_wait_time: 5 min
      queue_conditions: [...section 4...]
      merge_conditions:
          - check-success=Queue Checks Pass # the full run, only on mergify/merge-queue/* branches
merge_queue:
    max_parallel_checks: 2
    # reset_on_external_merge: left at the default; nothing pushes to master outside the queue
    # once section 10 lands
priority_rules:
    - name: fix or revert for a red master
      conditions: [label=priority:critical]
      priority: high
```

**What the queue run is:** CI on the draft pull request's branch, detected by
`startsWith(github.head_ref, 'mergify/merge-queue/')`. It is the full, un-selected suite:

- every build, every shard, all five Storybook captures, bundle size and cost-accuracy;
- graphty-element browser shards stay at 5 and storybook shards at 4;
- one aggregator job named "Queue Checks Pass".

It is the same as today's master push run without the benchmarks: about 15 jobs after the
consolidation, about 35 to 40 minutes. On pull request events the aggregator reports success
at once, so the required check exists on both kinds of run (the workaround GitHub staff
describe in community discussion 103114).

**Batching:** up to 4 pull requests per batch, waiting at most 5 minutes for a batch to fill.

- Why 4: the chance a batch fails is 1-(1-p)^n. Master went red about 4 times in about 70
  merges on 2-4 October, so p is about 5%. A batch of 4 then fails 19% of the time; a batch
  of 8 fails 34%.
- Shopify uses 8 at 1,000 developers. Rust's rollups take 10 to 20 hand-picked low-risk pull
  requests. With agent-written changes and one reviewer, smaller batches mean less bisection.
- Re-tune with measured p after two weeks (section 14).

**Speculation:** 2 batches checked at once, the second on top of the first (Zuul-style
cumulative branches, Mergify's `max_parallel_checks`).

- Two full runs hold about 30 runners. That leaves about 30 for pull request CI.
- A value of 3 would starve pull request feedback, which is what the research on runner
  saturation warns about.
- Zuul's adaptive window (grow by 1 on success, halve on failure) is the model if this ever
  needs to scale. Mergify has no adaptive window, so 2 is fixed.

**Failure isolation:** Mergify's recursive bisection. A failing batch is split in halves and
re-checked until one pull request fails alone. That pull request is removed, and the
batches behind it are rebuilt without it.

- A failure that no split reproduces is not retried away. It is a non-deterministic failure
  and is handled by the flaky-test policy (section 9).
- `skip_intermediate_results` stays off, because it would count a later green run as proof
  that an earlier red one was transient.
- `max_checks_retries` stays 0.

**How the merge lands:** Mergify merges each batch's draft pull request with one merge commit
(`merge_method: merge-batch` on the default queue rule, a trial since 2026-10-05), titled "Merged
#42, #43, #44". Master's tip is then the exact tree the queue tested, and master's CI, GPU and Hosts
lanes run once per batch rather than once per pull request (one batch of two started two master
runs, 54 minutes each, before). The original pull requests show as merged because their heads are
reachable from master. A revert of a batch commit reverts the whole batch; master-guard's revert
title lists its pull requests. Because master's tree after a batch merge is the tree "Queue Checks
Pass" just passed, a red master run on a batch commit points first at the jobs that run only on
master (the benchmarks, the other push-only steps) or at a flake, not at one pull request of the
batch; the guard still reverts the whole batch when the parent was green, and its revert body says
so. A reverted pull request cannot re-enter the queue (its commits are already in master's
history); the work comes back as a revert of the revert, with the fix or minus the culprit. The release pull request keeps `merge_method: merge` in its own
rule, because release.yml's publish job finds it by the release branch named in the merge commit.
Rollback: set the default rule back to `merge_method: merge`. Before the trial, Mergify merged the
original pull requests with merge commits.

GitHub's ruleset on master must not require branches to be up to date, because the queue
proves that instead. Otherwise GitHub refuses the merge of a pull request whose own head is
behind (Mergify documentation, "GitHub rulesets"). Two alternatives fix that refusal: make
Mergify a bypass actor, or use the fast-forward merge method. Fast-forward would make master's
tip the exact tested commit. It is a reasonable later step, but it changes the shape of
history and the release tooling reads first-parent history, so it is not part of the first
cut.

**Two existing problems this change has to fix:**

- The `.mergify.yml` comment on master records that a draft pull request's title fails "Lint
  PR Title". pr-title.yml must pass trivially on `mergify/merge-queue/` branches.
- The visual-review gate must understand a queue run (section 6).

**Throughput and latency:**

- One queue cycle is about 40 minutes. 2 batches of up to 4 per cycle gives at most about 12
  merges an hour.
- Working 16 hours that is about 190 a day, about 4 times the 50-a-day target.
- Approval to merge: about 45 minutes at the median (a short wait plus one cycle). A batch that
  bisects adds one or two cycles, so expect about 2 hours at p90.
- A burst of 30 approvals at once drains in about 2.5 hours, against more than 15 today.

**Alternatives considered:**

| Option                                                       | Who does it                                               | Why not here                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub's native merge queue (`merge_group`)                  | GitHub's own monorepo (about 2,500 pull requests a month) | Free and available for public org repos, but it only ejects and rebuilds (no bisection), has no queue-only required check without workarounds, and no hold-label or title-based conditions outside rulesets. Mergify already runs here and is free for open source.                                         |
| Serial queue, in place (today)                               | bors-era Rust, about 10 merges a day                      | Already at its ceiling.                                                                                                                                                                                                                                                                                     |
| Human-curated rollups                                        | Rust                                                      | Needs a person to assemble them; the one person here reviews screenshots.                                                                                                                                                                                                                                   |
| No queue: test against tip, merge out of order, revert after | Chromium CQ, LLVM                                         | The bundle-budget break was exactly the cross-PR skew this lets through, and there is no human sheriff to back changes out.                                                                                                                                                                                 |
| Speculative queue with ML prediction                         | Uber SubmitQueue                                          | Built for 1,000+ changes a day.                                                                                                                                                                                                                                                                             |
| Mergify parallel scopes from the Nx graph                    | Mergify docs (gha-mergify-ci)                             | graph-format sits under everything and graphty-element depends on most packages, so most pull requests would share a scope. Mergify's direct merge for unaffected scopes is declined when two-step CI is on. Add it only if measurements show app-only pull requests waiting behind unrelated package work. |

**Reversible:** all queue settings are `.mergify.yml` edits.

## 6. Screenshot approval in a batched queue

**How approval works today (design/visual-testing/design.md, "The gate"):**

- The owner accepts images on a local review page and signs Finish with a passkey (Face ID).
- The signed review record lists, for each baseline PNG, its SHA-256 before (`from`) and after
  (`to`), and names the pull request.
- The CI gate requires every baseline that differs between master and the pull request to be
  carried from master's hash to the pull request's hash by verified records that name that
  pull request.
- CI runs the gate's code as master has it, so a pull request cannot loosen it.

**Why this already composes with batching:**

- An approval is about contents (hash to hash), not about a commit. A batch's tree is master
  plus each pull request's verified baseline changes.
- Two pull requests that change the same baseline PNG cannot be combined: git cannot merge
  binary files, so Mergify cannot build that batch and dequeues the later one.
- Everything else combines without loss.

**The queue's visual check:**

1. Capture all five Storybooks from the batch tree, exactly as on master (full capture, not
   affected-only).
2. Require every story to be `unchanged` against the batch tree's committed baselines. No new
   or changed image may appear, and no approval is requested or accepted in the queue.
3. Re-run the record check with the set of pull request numbers in the batch, read from the
   draft pull request. This is the same idea as Argos's `ARGOS_MERGE_QUEUE_PRS`.

**What this catches that nothing does today:** a visual semantic conflict.

- Example: pull request A restyles a button, and pull request B adds a story that uses the
  button, approved with the old style.
- Each passes alone. Together, B's story renders differently from B's approved baseline.
- The batch fails, bisection merges A, and B is ejected. B's author merges master and the owner
  re-reviews that one story.
- This is correct behavior: the image being merged must be the image the owner saw.

**Who makes the change:** the project's rules forbid agents from editing
`visual-review/trusted/gate.mjs` or the gate step and visual job in ci.yml. For this one
change the owner authorized it on 2026-10-04: an agent may change `visual-review/trusted/gate.mjs`,
`visual-review/trusted/lib/approval.mjs` if needed, and the ci.yml gate step, so that the gate
accepts a batch (several pull request numbers) when the queue's captures equal the
owner-approved images of every pull request in the batch, with no new approval in the queue.
The authorization covers nothing else: agents still never press Accept or Finish, never write
`visual-baselines/`, never edit `visual-review/passkeys.json` and never register passkeys.

- Until it lands, the queue can run with `batch_size: 1` on draft pull requests. That still
  gains speculation (2 at once) and two-step CI.
- To verify before building on it: that the draft pull request body (or the branch) gives the
  embarked pull request numbers in a form CI can read. Mergify documents that batch merge
  commits list them ("Merged #42, #43, #44"); the draft pull request's own format must be
  confirmed on one run.

**One-way door?** Not for consumers. It is a change to the trust rule of the gate: "a record
naming any pull request in this batch counts." It is a security boundary, so it was the owner's
decision; the owner made it on 2026-10-04. It is reversible.

## 7. Where the GPU, macOS and Windows lanes run

The principle every project in the research follows: special hardware sits on the blocking
path only where capacity meets the latency budget. Chromium's FYI and location-based
builders, PyTorch's ciflow labels and 4-hourly periodic jobs, Node.js's on-demand Jenkins
matrix, and wgpu and Bevy's software adapters per pull request plus a daily cron all work this
way. Software adapters run on every pull request; real or slow hardware runs where its cost is
paid once.

| Lane                                                        | Pull request                                                                                                                | Merge queue | Master                                                        | Schedule                                                                 | Release gate     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------- |
| Linux Dawn on lavapipe, Chromium on SwiftShader (in ci.yml) | yes, when affected                                                                                                          | yes, always | yes                                                           | --                                                                       | via CI           |
| NVIDIA T4, gpu.yml (machine.dev, paid)                      | once per PR that affects webgpu-graph-algorithms, required for queue entry; re-run only if GPU-affecting code changes again | no          | each commit that affects webgpu-graph-algorithms, newest-wins | nightly full on master tip (spot tenancy); weekly paired benchmark stays | yes              |
| macOS Metal + WebKit, hosts.yml                             | path-matching PRs, advisory                                                                                                 | no          | path-matching commits, newest-wins                            | nightly full                                                             | yes, when it ran |
| Windows D3D12 WARP, hosts.yml                               | the existing 15-minute `windows-scan-questions` scope, advisory                                                             | no          | full scope (up to 90 min), newest-wins                        | nightly full                                                             | yes, when it ran |

**Why the T4 run is required before the queue for GPU-affecting pull requests:**

- It runs in parallel with the owner's review, so it rarely adds latency.
- It costs about $1.60 a run ($0.01753 a minute on-demand, machine.dev pricing).
- It keeps GPU regressions out of master instead of finding them at release time.
- It runs once per relevant pull request, triggered when the pull request is marked ready,
  not on every push. Today it needs a manual `gpu` label.

**Why it is not in the queue:** 40 to 90 minutes per batch would double the queue cycle.

**Why Windows WARP stays out of the pull request path:** 90 minutes, and it is a software
adapter whose own quirks are what it mostly finds.

**No silent fallback:** every lane keeps `GRAPHTY_GPU_REQUIRE`. A missing adapter fails the
lane, and nothing re-runs on the CPU.

**When a hardware lane goes red on master:**

- It does not freeze the queue; only ci.yml does that.
- It blocks the release (already true) and opens a `priority:critical` issue that names the
  GPU-affecting commits since the lane's last green run, usually 1 to 3.
- An agent then bisects the lane between those commits and fixes or reverts.
- This is Chromium's "FYI builder plus release gate" placement, made to work with no human
  sheriff.

**Release gate change:** release.yml today requires a GPU run on the released commit. With
the path filter, a commit that does not affect webgpu-graph-algorithms inherits the result of
the newest earlier commit that did, the same way Hosts already treats "did not run" as nothing
to wait for.

**Reversible:** all of it is workflow triggers.

## 8. What runs on master and on a schedule

**On every master commit:**

- The full CI run, as today. It feeds the deploy and release artifacts, the coverage upload and
  the benchmarks.
- It should never be red once the queue runs the same suite on the same tree. If it is red,
  that is a signal (section 12).
- It costs about 163 job-minutes, so it is kept even though it duplicates the queue's run. Its
  artifacts are what release.yml publishes.

**Nightly, on master tip:**

- full Hosts (macOS and the full Windows scope);
- full T4 GPU on spot tenancy ($0.0048 a minute);
- the full visual capture, compared against baselines. It is cheap and catches drift in the
  runner image, fonts or browser that no path filter would trigger.

**Weekly:** the existing external-link check and the GPU paired benchmark.

**Optional, add when an image change bites again:** a weekly canary of the full CI on the next
Ubuntu runner image. The repository pins `ubuntu-24.04` because an unannounced image move
changed the Mesa rasterizer once. wgpu and PyTorch use periodic jobs for this kind of drift.

## 9. Flaky-test policy

The project's rule: a failing test is never called flaky without finding its cause. Two of
the four red-master events were "flaky" UI tests that turned out to be real races. The policy
must therefore be enforced by automation, because agents will otherwise re-run until green.

1. **No automatic retries anywhere.** Vitest has none configured today; keep it that way.
   Mergify `max_checks_retries: 0` and `skip_intermediate_results: false`. Retrying hides
   exactly the races that were real bugs here.
2. **A queue failure that bisection does not reproduce is a non-deterministic failure.** A
   workflow then does three things:
    - opens (or adds to) an issue labeled `bug`, `priority:high`, `effort:medium`, named for
      the test, with the failing log, the batch members and the commit;
    - re-runs the failing shard on master's tip, which is Chromium's "test without the patch"
      step. If master fails too, the bug is already in master, the ejected pull request is
      innocent and is re-queued, and the issue says so;
    - lets the issue go to an agent to find the mechanism. "Timing" is not an accepted
      conclusion without the mechanism.
3. **Quarantine only with the owner's yes.** A quarantine needs an issue, an expiry of 14 days
   at most, and the test still runs and reports, so it can be watched. This is the PyTorch
   DISABLED-issue model with Datadog's expiry. Three kinds of test are never quarantined: GPU
   correctness tests, the visual gate, and any test whose failure would allow a silent
   CPU-for-GPU substitution.
4. **Measure.** Mergify's CI Insights and Test Insights are included in its free open-source
   plan. They rank failures by how often they ejected a pull request, as Chromium's Flake
   Portal does. Read them before tuning the batch size.

Not adopted: Shopify's "evict only after 3 failures" (tuned for a 25% flake rate) and
Node.js's "yellow counts as green". Both accept flakes as permanent, which this project's
rule forbids.

## 10. Releases

**Today:**

- release.yml publishes after every merge, from the newest master commit green on CI, GPU and
  Hosts.
- It pushes the version commit to master with a deploy key that bypasses the pull-request-only
  ruleset.
- It already uses npm trusted publishing (OIDC, `id-token: write`, npm 11.x, no token).

Three costs at 30 to 50 merges a day:

- **Version noise.** 221 tags in a week reach consumers as constant update pull requests.
- **The queue is reset on every release.** Every version commit pushed outside the queue
  resets Mergify's queue (`reset_on_external_merge` defaults to resetting), throwing away the
  checks in flight. That is 2 to 8 resets a day.
- **A standing bypass of master's protection.**

**Adopted: a daily release train through the queue.**

1. On a schedule (once a day at a fixed hour; `workflow_dispatch` is the ad hoc release of
   section 11),
   release.yml finds the newest master commit green on every lane. That gate logic exists
   today.
2. It runs `nx release version` (conventional commits, independent versions, the
   release-hold.json filter, all unchanged) on a branch from that commit and opens a "chore:
   release" pull request containing only version fields and CHANGELOG.md files.
3. A second Mergify queue rule handles it at high priority. Its check is a small job that
   proves the diff touches only `version` fields and changelogs; there is no full CI, since the
   code is the commit that was already green on every lane.
4. When it merges, release.yml (same file name, so the ten trusted-publisher entries on npm
   stay valid) publishes from the release branch's head, tags each package as
   `{projectName}@{version}` as today, and keeps the existing "is it on npm yet" idempotence
   check.
5. The deploy key and the direct push are removed.

This is the pattern of Vite and Vitest (a release commit landed by pull request, then
published from CI), TanStack, pnpm and Radix (a Changesets "Version Packages" pull request)
and release-please. Keeping nx's conventional commits means agents change nothing in how
they write commits.

**graphty.app deploys on every green master CI run, not on a release.** deploy-pages.yml
already takes a run id and a commit. The app is private, so its cadence affects no consumer.

**Cadence:** daily. Each changed package gets at most one version a day: about 5 to 10
versions a day across the repository, against about 30 today. Angular ships weekly and
TypeScript nightly to `next`; daily is the smallest change that ends the noise.

**Not now:**

- A `next` or canary dist-tag per merge (Nx, Next.js, React).
- pkg.pr.new previews per pull request (Vite, Vitest, Vue).
- Add one only when an outside consumer asks to test unreleased code. The app consumes the
  packages from the workspace and needs neither.

**One-way doors in this section:**

- **Adding a dist-tag channel**, or changing what `latest` means, is a contract with
  consumers. It is not proposed.
- **The tag pattern `{projectName}@{version}`** and the changelog location are read by people
  and tools outside the repository. Keep both.
- **Renaming release.yml or adding a GitHub Environment** changes the trusted-publisher entry
  of every package. That is not one-way, but it takes 10 manual edits on npmjs.com and breaks
  publishing until they are done. Keep the file name.
- **Release cadence** is not a contract. It is reversible.

## 11. Ad hoc release

The daily train is the default. When something must reach npm sooner -- a fix a consumer is
waiting for, a broken release to supersede -- the owner cuts a release at once with the same
workflow.

**What it is:** a `workflow_dispatch` of release.yml, the same workflow and the same jobs as the
daily train. It does exactly what the scheduled run does, immediately:

1. It finds the newest master commit green on every lane (CI, and GPU and Hosts when they ran
   or are inherited, section 7). It never releases a commit that is not green everywhere; if the
   commit you want is still running, wait for its lanes or dispatch again later.
2. It runs `nx release version` on a branch from that commit and opens the "chore: release" pull
   request, labeled `priority:critical`, so it goes to the front of the merge queue.
3. The release queue rule checks only that the diff touches `version` fields and changelogs, and
   Mergify merges it.
4. On the merge, release.yml publishes with npm trusted publishing and tags
   `{projectName}@{version}`, exactly as the train does.

**Optional: only some packages.** A `packages` input (nx project names, comma separated) limits
the release to those packages. The workflow runs the same `tools/release-hold.mjs apply` the
train uses, with `--only <packages>`, which holds every other project for that run; nothing is
committed. Two consequences, both from how holds work today: a held
package is not patch-bumped as a dependent of a released one, and the next daily train releases
everything that was left out, from its last tag. Holds already committed in `release-hold.json`
still apply, so a dispatch cannot release a package the owner has held.

**Same gates, no shortcut:** the lane gate, the release-hold check, the diff-only queue check and
trusted publishing are the train's, unchanged. There is no input that skips a lane, publishes
from a branch other than master's history, or publishes without the queue.

**How to invoke it:**

- Command line: `gh workflow run release.yml --ref master` (add `-f packages=graph-format,graph-io`
  to limit it). Then `gh run list --workflow release.yml --limit 1` shows the run, and the release
  pull request appears in a few minutes.
- Actions UI: Actions -> Release -> "Run workflow", branch `master`, optionally fill in
  `packages`, then "Run workflow".

**Who may:** the owner, or an agent the owner has asked to cut one. GitHub lets anyone with write
access dispatch a workflow; the rule that only the owner decides on an ad hoc release is a
project rule, not a setting. An agent never dispatches one on its own initiative, including to
ship its own fix.

**What it costs:** one more set of npm versions that day for every package with releasable
commits (or only the named ones). In the queue, the release pull request jumps ahead of waiting
batches; because a higher-priority pull request goes in front, Mergify may restart the checks of
batches already in flight, at most one queue cycle (about 40 minutes) of work. Its own check takes
a few minutes and no full CI. Two or three a week cost little; one a day would double the version
noise the train exists to end, so if ad hoc releases become routine, move the train's hour or run
it twice a day instead.

## 12. Keeping master green when something slips through

With the full suite run on the combined tree before merge, only three things can turn master's
ci.yml red: non-determinism, a difference between the queue's tree and master's tree (an
outside push, which this plan removes), or a broken lane. When it happens:

1. **Freeze.** A workflow listening for a failed ci.yml on master freezes the Mergify queue
   through Mergify's queue-freeze API. This is Chromium's "tree closed". Pull request CI keeps
   running, and nothing merges.
2. **Revert first.** The same workflow opens a revert pull request for the batch that landed
   the failure (its members are listed in the merge commits) with `priority:critical`, which
   jumps the queue. This follows LLVM's "revert to green", PyTorch's autorevert bot and
   Chromium's LUCI Bisection auto-revert. With one human, the sheriff has to be automation.
3. **Unfreeze** automatically on the first green master CI run.
4. **Find the cause.** The reverted pull request is re-opened by its agent and must find the
   cause before it re-enters. The flaky-test policy applies if the failure did not reproduce.

Hardware lanes do not freeze the queue (section 7).

## 13. Runner capacity and API budget

**Runners (GitHub Team plan: 60 Linux jobs, 5 macOS):**

- Runner minutes cost nothing on a public repository; concurrency is the limit.
- After consolidation a full run holds about 15 runners. The queue holds about 30 (2 runs).
  About 30 remain for pull request CI, which runs affected-only at about 4 to 12 runners per
  run.
- Draft pull requests no longer run CI, and cancel-in-progress drops superseded runs.
- macOS: only the Hosts lane uses it, on path-matching master commits and nightly, at most one
  at a time, well under 5.
- **If the queue still waits for runners** (measure "queued" time on queue runs; act if the
  median is above 10 minutes), move only the queue's jobs to GitHub larger runners. They have
  a separate 1,000-job limit and cost $0.012 a minute (4-core).
    - About 20 queue runs a day at about 163 job-minutes is about 3,300 minutes, about $40 a
      day.
    - The 4-core build job would also cut the critical path by several minutes.
    - This is reversible: the runner label is one line per job.
- **Caching:** keep `actions/cache` (a pull request can read the base branch's cache but cannot
  write into it). Do not adopt the deprecated `@nx/s3-cache` family, which was withdrawn over
  CVE-2025-36852 (cache poisoning by any pull request). With agent-written pull requests that
  threat model is real. If Nx Cloud is ever added, pull requests get a read-only token.

**GitHub API (5,000 requests an hour on the owner's token):**

- The token was exhausted twice by agents polling pull request status.
- Mergify uses its own app installation, and workflows use `GITHUB_TOKEN` (a separate quota
  per repository), so neither of those is the problem.
- The fix is one local status broker. It is a single process on the owner's machine, started
  through servherd. Once a minute it asks for every open pull request's status rollup in one
  GraphQL query (the pattern CLAUDE.md gained on 2026-10-04) and writes the result to a local
  file that agents read.
- That is at most a few hundred points an hour, however many agents are running.
- Agents never call `gh pr checks` or `gh run watch` in a loop.

## 14. Expected numbers

| Measure                           | Today                                          | Proposed                                                      |
| --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| Push to PR CI result, median      | 28 min (p90 39)                                | about 20 min                                                  |
| Approval to merge, median / p90   | 30 min to many hours, depending on queue depth | about 45 min / about 2 h                                      |
| Merge capacity                    | about 2 an hour, about 40 a day                | about 12 an hour, about 190 a day in 16 h                     |
| Burst of 30 approvals drains in   | more than 15 h                                 | about 2.5 h                                                   |
| Red master events                 | 4 in 2 days                                    | target under 2 a month, each frozen and reverted in under 1 h |
| npm versions                      | about 30 a day                                 | about 5 to 10 a day (one train)                               |
| Queue resets from release commits | 2 to 8 a day                                   | 0                                                             |
| Full-suite runs a day             | about 50 (one per merged PR, in place)         | about 20 queue runs + about 30 master runs                    |
| Owner's API token                 | exhausted twice in a day                       | under 10% used                                                |

Assumptions:

- a queue-time failure rate of about 5%;
- 50 pull requests a day;
- a 40-minute queue cycle.

Re-measure after two weeks:

- if p is under 3%, raise the batch maximum to 6;
- if it is over 10%, lower it to 2 and look at what is failing.

## 15. Costs

| Item                                                                                                                                                              | Cost                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GitHub Actions standard Linux, Windows and macOS runners (public repository)                                                                                      | $0                                                                                                               |
| Mergify (free for open source, includes CI and Test Insights)                                                                                                     | $0                                                                                                               |
| T4 GPU: GPU-affecting pull requests (about 3 to 6 a day at about $1.60) plus GPU-affecting master commits (about 3 to 6 a day) plus nightly on spot (about $0.45) | about $5 to $15 a day, $150 to $450 a month                                                                      |
| Weekly paired GPU benchmark                                                                                                                                       | about $1.75 a week                                                                                               |
| Optional larger runners for the queue only                                                                                                                        | about $40 a day, only if measurements call for it                                                                |
| Chromatic                                                                                                                                                         | $0 (disabled; the in-repo visual review replaces it)                                                             |
| Owner's time                                                                                                                                                      | screenshot review only. CI no longer asks the owner to re-approve anything; the queue never needs a new approval |

Watch: Git LFS bandwidth from baseline downloads in the visual jobs. They are cached per
project, but the queue adds about 20 full captures a day.

## 16. Migration, in order

Each step is independently reversible unless marked. Each step is one pull request.

1. **Measure the starting point.** Turn on Mergify CI Insights. Record queue wait, merges a
   day, pull request CI p50/p90, runner queued time and red-master count for one week.
2. **Remove master-only failure sources.** Move `cost-accuracy` into pull request CI for
   graphty-element-affecting changes (or make it advisory with an issue). Mark the benchmarks
   advisory. Make pr-title.yml pass on `mergify/merge-queue/` branches.
3. **Cut runner demand.** Consolidate the small shards in `tools/ci-test-matrix.mjs` and the
   three small visual jobs. Skip CI on draft pull requests. Tell agents (CLAUDE.md) to open
   drafts and mark them ready.
4. **API broker.** Start the status broker through servherd. Point agents at it in CLAUDE.md.
5. **Queue mode in CI.** Add the `mergify/merge-queue/` detection, the full-suite path and the
   "Queue Checks Pass" aggregator to ci.yml. Turn off "require branches to be up to date" in
   the master ruleset if it is on.
6. **The visual gate's queue mode.** Accept several pull request numbers and require all
   `unchanged` on a queue run. Agents may make this change under the owner's 2026-10-04
   authorization (section 6), and only this change to the trusted gate. Confirm on one draft queue pull request how the embarked pull
   request numbers can be read.
7. **Two-step queue, no batching yet.** `.mergify.yml`: `merge_conditions` on "Queue Checks
   Pass", `batch_size: 1`, `max_parallel_checks: 2`. Run for 2 to 3 days. Check that merges
   land, that the gate passes and that no draft pull request stalls.
8. **Turn on batching:** `batch_size {min 1, max 4}` with a 5-minute wait. Keep bisection;
   leave retries at 0.
9. **Red-master automation:** freeze on red, revert pull request at `priority:critical`,
   unfreeze on green.
10. **Hardware lanes.**
    - GPU: an nx-affected path filter on master, a required pre-queue run for affected pull
      requests (triggered on ready, not on every push), and nightly on spot.
    - Hosts: pull requests on the 15-minute Windows scope, the full scope on master and
      nightly.
    - Update release.yml's gate so a commit with no GPU run inherits from the newest earlier
      one.
11. **Release train.** Deploy graphty.app from every green master run. Change release.yml from
    "every lane-green merge pushes a version commit" to "daily, open a release pull request,
    publish on its merge", keeping the file name and the trusted-publisher setup. Add the
    second queue rule for release pull requests, and the ad hoc dispatch with its `packages`
    input (section 11). Remove the deploy key and its ruleset bypass
    last, after one release has gone through the new path.
    - The cadence change is reversible.
    - Dropping the deploy key is reversible but must be re-granted by hand.
12. **Re-measure and tune.** Batch size from the measured failure rate. Larger runners for the
    queue only if queue jobs wait more than 10 minutes for runners.

## 17. Decision ledger

| Decision                                   | Choice                                                                           | Alternatives                         | Precedent                                                      | Door                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| Merge tool                                 | Mergify, batched draft-PR checks                                                 | GitHub native queue; in-place serial | Mergify docs; Shopify, Zuul, GitLab trains                     | reversible                                                    |
| PR checks                                  | full affected suite, drafts skipped                                              | cheap-only two-step                  | OpenStack clean check                                          | reversible                                                    |
| Queue checks                               | full un-selected suite on the batch                                              | affected-only in queue               | Rust auto builds, bors                                         | reversible                                                    |
| Batch / speculation                        | max 4 / 2 at once, bisection                                                     | larger batches; Zuul adaptive        | Shopify 8, Mergify bisection, Zuul window                      | reversible                                                    |
| Visual approval                            | on the PR; the queue only proves "unchanged" against the batch's approved images | approval on the queue commit         | Argos merge-queue mode; Chromatic issues #871, #1483           | reversible (gate trust rule: decided by the owner 2026-10-04) |
| T4 GPU                                     | pre-queue for GPU-affecting PRs, post-merge filtered, nightly, release gate      | per push; queue; master only         | Chromium location builders and FYI bots, PyTorch ciflow        | reversible                                                    |
| Windows / macOS                            | post-merge, nightly, release gate; short scope on PRs                            | per PR full                          | wgpu, Bevy, PyTorch periodic                                   | reversible                                                    |
| Flakes                                     | no retries, issue per non-reproduced failure, owner-approved expiring quarantine | retry N times; auto-quarantine       | Chromium without-patch, PyTorch DISABLED, Datadog expiry       | reversible                                                    |
| Red master                                 | freeze + automatic revert                                                        | sheriff by hand                      | Chromium tree closer, LLVM revert-to-green, PyTorch autorevert | reversible                                                    |
| Release cadence                            | daily train via release PR, plus ad hoc dispatch of the same workflow            | every merge; weekly; tags only       | Vite/Vitest, Changesets users, release-please                  | reversible                                                    |
| Dist-tags, tag pattern, changelog location | unchanged                                                                        | add `next` channel                   | Nx, Next.js, React canaries                                    | ONE-WAY if changed; not changed                               |
| Publish workflow identity                  | keep release.yml, OIDC                                                           | new workflow or environment          | npm trusted publishing GA                                      | manual 10-package re-config if changed                        |
| Deploy of graphty.app                      | every green master                                                               | with release                         | Vite preview releases on main                                  | reversible                                                    |

The plan was built on three research reports (merge queues, test tiers, release models); they
are not kept in the repository. The sources this document relies on directly are:

- Mergify, queue reset on outside pushes: https://docs.mergify.com/merge-queue/lifecycle/
- Mergify, free for open source: https://mergify.com/pricing
- Mergify, batch merge commit listing its pull requests:
  https://docs.mergify.com/changelog/2026-04-07-new-merge-batch-merge-method-for-merge-queue/
- machine.dev T4 pricing: https://docs.machine.dev/platform-specifications/gpu-runners/
