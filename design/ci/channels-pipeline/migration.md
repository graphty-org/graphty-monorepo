# Migration and deletion

Appendix of `design/ci/channels-pipeline.md`; where the two disagree, the main document wins.

Part of the channels pipeline design (issue #3418): how the repository gets from today's golden
pipeline to the new one, in what order, how each step is undone and judged done, what is deleted,
what is kept, and what only the owner can do. Terms: **canary** is master (canary.graphty.app);
**nightly** is the newest master commit that passed the full run (nightly.graphty.app, npm `next`);
**production** is graphty.app and npm `latest`, moved only by the owner; **the full run** is every
shard, the full screenshot capture, T4 GPU, Hosts, macOS work protection, the audit and LLM
regression, on master's tip every 6 hours; **the test store** is the Cloudflare Worker and D1
database holding test results and durations.

## 1. Where we start (measured 2026-10-25 01:50 UTC)

| Fact                             | Value                                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| master                           | `a870943` (the cut, #3321), released nowhere: the train holds it in #3318 (T4 GPU lane and security audit failed)                                                 |
| golden ahead of master           | 284 commits                                                                                                                                                       |
| golden landings not yet verified | 23                                                                                                                                                                |
| npm `latest`                     | graphty-element 3.30.0, published 2026-10-21                                                                                                                      |
| graphty.app                      | served by this repository's Pages (custom domain `graphty.app`, built by `deploy-pages.yml` on every green master build)                                          |
| graphty-org/graphty-site         | exists, public, Pages not configured                                                                                                                              |
| master ruleset 23973898          | bypass: `DeployKey` (always) and `RepositoryRole 5` (Admin, pull requests); required checks `All Checks Pass`, `Lint PR Title`; 0 approvals; no code owner review |
| Agent identity                   | none: every push and every `gh` call is the owner's account `apowers313` (10,025 of 11,132 commits on golden)                                                     |
| Local machinery                  | about 11,000 lines of scripts to delete (section 4); 31 worktrees for live copies, land checks, bisects and githerd                                               |

Six landing systems came and went in 33 days, each replaced before it was finished
(reports/ci-cd-unstuck-2026-10-24.md section 2.1), and the beta site was built twice and landed
neither time (#3267). So: one rollout in a fixed order, no pipeline work outside it until the
deletion step is done, and each step judged by a number.

## 2. Step 0: flush golden

Golden gets nothing new; what it holds reaches master and ships through the held release #3318.

1. **Stop landing.** The pipeline-round skill gets one paragraph at its top: "Flush in progress: no
   `land` and no `sync`; `revert` and `cut-fix` only, for a failure verification found." Only
   pipeline-round lands, so no code change is needed. Subagents keep committing on their branches,
   which become pull requests in step 5.
2. **Verify golden's tip.** `node tools/verify.mjs start` (CI backend, about 48 minutes) until
   `golden-verified` equals `origin/golden`. A failure is handled as today: bisect, `land.mjs revert`
   of the culprit, verify again.
3. **Cut the tip explicitly.** `node tools/land.mjs cut origin/golden-verified`. Naming the commit
   matters: without it, `cut` picks the newest commit whose preview has no unstable image and can
   leave landings behind on golden.
4. **Owner review and ship.** The owner Finishes the cut pull request's screenshots;
   `node tools/land.mjs ship` merges it after one ci.yml run.
5. **Release.** #3318 stays open, so the train restarts itself on the new master push. Its two
   causes must be fixed on golden before the cut: nx could not build its project graph in the T4 lane
   (the tests themselves passed), and the audit flagged zod and body-parser (#3393).

**Done when** (all three): `git merge-base --is-ancestor origin/golden origin/master` succeeds; #3318
is closed by a published release; `npm view @graphty/<pkg> dist-tags.latest` equals the newest
`<project>@<version>` tag on master for all 13 packages.

**Expected duration**: 12 to 48 hours (the last four cuts took 11.6 hours to 2.2 days, mostly
screenshot review).

**Failure modes:**

- _The audit stays red because the advisory has no patched version._ Rollout steps 1 to 9 need
  golden on master, not a release, so they go ahead once the ship merges, except that step 3's
  freeze then pins graphty.app to the shipped master build; only deletion (step 10) waits for #3318. Nothing shipped from 10-21 to 10-23 while everything waited on one red lane.
- _A session lands anyway._ `land.mjs status` shows it; the round reverts it, and the branch goes
  in as a pull request.

## 3. The rollout

A step starts when the steps it depends on have passed their checks; "parallel" steps can start
during the flush. The numbering is the main document's section 12.

| #   | Step                                                            | Starts after                                | Undo                                                       |
| --- | --------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| 1   | Owner setup (accounts, tokens, DNS, site repositories)          | parallel                                    | delete what was created                                    |
| 2   | Results store write-only                                        | parallel                                    | remove the reporter step                                   |
| 3   | Freeze production; agent identity, CODEOWNERS, no bypass        | 0, 1                                        | restore the bypass actor; re-enable the graphty.app deploy |
| 4   | Selection readiness: `fileLevel` for every package; story spike | parallel                                    | none needed (it only adds rules)                           |
| 5   | Pull requests into master                                       | 3, 4                                        | recreate golden from master, re-enable landing             |
| 6   | The 6-hour full run with bisect and revert, publishing nothing  | 5                                           | stop the scheduler's dispatch; production stays frozen     |
| 7   | Nightly: site and npm `next`                                    | 6                                           | skip the promote job                                       |
| 8   | Production promotion; graphty.app moves to graphty-site         | 7                                           | swap the custom domains back                               |
| 9   | Stories as tests replace the separate capture, per project      | 6                                           | keep the old capture job                                   |
| 10  | Deletion                                                        | 5 to 8 checked, 7 days stable, #3318 closed | `git revert` of the deletion                               |

### Step 1: owner setup (parallel)

Everything in main section 13 that does not depend on code: the machine account, the Cloudflare
token, DNS records, domain verification, the nightly site repository, the deploy keys, the npm token.
None of it changes behavior until a later step uses it. **Done when** each item's check passes.

### Step 2: the results store write-only (parallel)

The Worker (`tools/results-service/`, deployed by `results-service.yml` from master) and its D1
database go live. Every CI test job reports to it with its OIDC token (audience `graphty-results`);
nothing reads it yet. Local writes use `GRAPHTY_RESULTS_TOKEN` from `.env`, kind `local` only.

**Done when**, over 3 days: every CI test job of every run has its record (count of records equals
count of jobs, checked by one query); p95 write latency under 500 ms; zero jobs failed or slowed by
more than 5 seconds because of the store. **Failure mode:** the Worker is down or slow: calls time out,
the job goes on, and the missing record means "unknown", which can only make later runs longer.

### Step 3: freeze production, then switch identity

Before any branch can merge into master on its own, production stops following master, and agents
stop being the owner. Today master moves only through an owner-approved cut; from step 5 on it moves
on every green pull request, so without this step graphty.app (which `deploy-pages.yml` deploys from
every green master build) and npm `latest` (which today's release train publishes from master's tip)
would be strictly less guarded for days.

One pull request, owner-reviewed, merged right after the flush ships and before any other:

- `deploy-pages.yml` assembles and uploads `site-<sha>` but no longer deploys, so graphty.app keeps
  serving the master commit #3318 released, until step 8 moves it to graphty-site.
- release.yml runs in shadow: it may test, but its `land` and `publish` jobs are switched off until
  step 7, and step 7 publishes only under `next`. `latest` moves only at the first `promote.yml`.
- `.github/CODEOWNERS` (main section 6.2), `pr-integrity.yml` (integrity, proof, fresh review, the
  breaking-change guard and its exemptions), `dependabot-automerge.yml`.
- `.claude/settings.json` gains `GH_CONFIG_DIR=~/.config/gh-agent` and
  `GIT_CONFIG_GLOBAL=~/.config/git-agent/config`, so every later commit and pull request is the agent's.

Then the owner (main section 13 item 6): environments, the tag ruleset, code-owner review with last-
push approval off, the four required checks, the admin bypass removed, squash off, Actions read-only.
The ruleset settings are tried first on a scratch ruleset that targets a scratch branch, with exactly
the planned settings.

**Undo:** add the bypass actor back; unset the `env` block; re-enable the deploy.

**Done when**, each tested on purpose: graphty.app's build stamp names the commit #3318 released; a
machine-account pull request touching an owned path waits for the owner's review; one touching only
`graphty/src/` auto-merges; `gh pr merge --admin` is refused; the ruleset's `bypass_actors` lists only
`DeployKey`; an agent push of a `*@*` tag is refused; a mechanical revert, an accept-only pull request
and a Dependabot pull request each pass PR Integrity; a pull request titled `feat!:` fails it.

### Step 4: selection readiness (parallel)

- `tools/test-select-mutate.mjs` on graph-io, webgpu-graph-algorithms, algorithms, layout,
  graph-samples and cytoscape-extensions; each joins `fileLevel` (and `fileLevelBrowser` where it has
  a browser project) after a clean run, or its longest shard is sliced under 8 minutes.
- The `everything.patterns` edits and nx's `projectsAffectedByDependencyUpdates: "auto"` (merging
  section 4.3); the selector's import graphs cached from master (merging section 4.1).
- The stories parity spike on 50 graphty and graphty-element stories (stories section 9).

**Done when** every package's light-check shards run under 8 minutes or have their own budget key,
and the spike's outcome (parity, or one re-baseline per project) is recorded on #3418.

### Step 5: pull requests into master

After step 3's checks pass:

- `ci.yml` gets its pull request path from the light check (merging section 4.1). The old `visual`
  job keeps running on pull requests, report-only and outside All Checks Pass, until a project
  switches in step 9; a changed image never fails a pull request from this step on.
- Drafts are gone; agents open a pull request with `tools/pr-open.sh`, which arms auto-merge, then
  stop. The pipeline round owns a red pull request.
- Every open branch that waited during the flush becomes a pull request, oldest first, at most 10 at
  a time, so the first hour does not bury master in conflicts.
- Defaults that point at golden move to master in the same pull request: `tools/worktree-new.sh`
  starts branches from `origin/master` and stops handing itself to `.worktrees/land-live`;
  `MAIN_FOLLOWS` in `tools/land.mjs` becomes `"master"`; `.github/dependabot.yml`'s
  `target-branch: golden` becomes `master` (merging section 4.5).
- Store reads go live (results section 12 step 3): quarantine and the base excuse come from the store.
- CLAUDE.md "Landing changes" becomes "Shipping a change" (section 6) and the skills are rewritten,
  in the same pull request, so the instructions and the flow change at the same moment.

**Undo:** `git branch golden origin/master`, push it, restore the old CLAUDE.md section; `land.mjs`
still exists until step 10.

**Done when**, over the first 20 merged pull requests: median from opened to All Checks Pass under
20 minutes (the report-only `visual` job is not counted); at least 18 of 20 merged without a person
touching them; master's build green after each.

**Failure modes:** combined pull requests keep breaking master (each passed alone): the skew-break
trigger proposes Mergify (merging section 7). The light check fails on itself, as the light landing
check did on 2026-10-24 (32 of 35 failures in two tool checks): tool checks run only when `.github/`
or `tools/` changed.

### Step 6: the full run on master every 6 hours

`release.yml`, dispatched by the existing scheduler at 00:00, 06:00, 12:00 and 18:00 UTC, runs the
full run on canary's commit (channels section 5). Red: the Worker dispatches the bisect, the round
reverts the culprit by pull request, the fix goes forward on its branch (channels section 6). Still
publishing nothing.

**Undo:** stop the scheduler's dispatch; production is frozen, so nothing else needs undoing.

**Done when** 8 consecutive slots (two days) each either passed, or failed and named a culprit whose
revert made the next slot pass, with no slot skipped for a reason other than "already judged".

### Step 7: nightly

The publish job declares `environment: release` and lands first; then the owner binds each npm
trusted publisher to that environment (main section 13 item 9); in that order, because a publisher
bound before the job declares the environment refuses the publish. Then a green full run with no
changed screenshots promotes automatically: `next` on npm and nightly.graphty.app (channels
section 7). With changed screenshots it waits for the owner's Finish.

**Done when** two promotions have happened, one automatic and one after a Finish, and for each:
nightly.graphty.app's build stamp names the promoted commit, and
`npm view @graphty/graphty-element dist-tags.next` is the version tagged on that commit.

### Step 8: production promotion, and the domain move

`promote.yml` (channels section 8). The domain move, in this order, so graphty.app is never without
its datasets (every published graph-samples downloads from `https://graphty.app/data/graph-samples/v1/`):

1. The first promotion writes the current production build, `/data/` included, into graphty-site.
2. `tools/check-site.mjs` (new, about 40 lines) compares graphty-site's file list and hashes with the
   deployed build. Every dataset path must be present.
3. The owner swaps the custom domains (main section 13 item 10). The apex records already point at
   GitHub Pages and do not change. Expect seconds to minutes of gap, and up to an hour before HTTPS
   certificates are issued.
4. `deploy-pages.yml` deploys again, now to canary.graphty.app; the check script runs against all
   three live domains.

**Undo:** swap the custom domains back.

**Done when** the check script passes on all three sites: every page in the site map and every
dataset under `/data/graph-samples/v1/` returns 200 over HTTPS; each site's build stamp names the
expected commit; a `promote.yml` dry run waited for the owner's approval.

### Step 9: stories as tests replace the separate capture

Per project, in the order and with the spike of stories section 9: both captures run in each full
run, `visual-review parity` compares them, and a project switches after two consecutive clean runs
(or after its one owner-signed re-baseline, if the spike found no parity). Each disagreement is filed
as a bug and fixed, never excluded. The baselines and signed approvals stay as they are. If the
comparison needs a change to `visual-review/trusted/gate.mjs` or `approval.mjs`, the owner makes it or
authorizes it in writing on the issue, because agents never edit those files.

### Step 10: deletion

One pull request (owner-reviewed: it touches owned paths), after steps 5 to 8 have passed their
checks, 7 days have passed without an undo, and #3318 is closed. Section 4 lists what goes. Each check
of `tools/prepush-source-checks.sh` is in ci.yml by then (merging section 4.1). The checks:
`pnpm run lint`, `knip` and the full run all green with the files gone, and
`grep -rE 'land\.mjs|verify\.mjs|push-queue|golden-cut|gate-live|land-live' --include=*.md
--include=*.mjs --include=*.yml .` finds nothing outside `design/` and `.claudehistory/`.

**Undo:** `git revert` of that one merge.

## 4. What is deleted, and when

Deleted in step 10, unless noted:

| What                                                                                                                                                                           | Lines or size       | Replaced by                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------ |
| `tools/land.mjs`, `land.test.mjs`                                                                                                                                              | 2,774 + tests       | pull requests with auto-merge                                                                          |
| `tools/verify.mjs`, `verify.test.mjs`                                                                                                                                          | 2,241 + tests       | the 6-hour full run and its bisect job                                                                 |
| `tools/push-queue.sh`, `queued-push-guard.mjs`, `prepush-tests.mjs`, `prepush-inputs.mjs`, `shard-verdict.mjs`, `gate-snapshot.sh`, `push-base.mjs`, `wait-log.mjs`            | about 2,800 + tests | the light pull request checks in CI                                                                    |
| `tools/prepush.sh`, `prepush-source-checks.sh`                                                                                                                                 | 698                 | the quick check (`tools/check-quick.sh`) and ci.yml's Checks job, which takes every source check first |
| `tools/branch-sync.mjs`, the `sync` command                                                                                                                                    | 552                 | none: short branches merge master themselves                                                           |
| `tools/visual-preview.sh` (golden pull request previews)                                                                                                                       | 452                 | affected-story screenshots on each pull request                                                        |
| `tools/ship-risks.mjs`, `branch-tracking.test.mjs`                                                                                                                             | about 300           | none                                                                                                   |
| `live-tools.json` entries `gate` and `land`; worktrees `gate-live`, `land-live`, `golden-local`, `golden-cut`, `golden-bisect-*`, `land-check-*`, `check-golden-*`             | 14 worktrees        | none                                                                                                   |
| Branches `golden`, `golden-cut`, `golden-verified`, `golden-candidate`, `golden-cut-candidate`, `golden-bisect-1`, `golden-bisect-2`, tag `golden-good`                        |                     | master and the full run's green marker (history stays in master)                                       |
| `.github/workflows/golden-verify.yml`, `visual-seed.yml`                                                                                                                       | 248                 | the full run; a new story's first baseline is accepted at promotion like any image                     |
| The Mergify freeze calls in `tools/master-guard.mjs` (its revert job is kept, as the agent)                                                                                    | small               | none                                                                                                   |
| githerd leftovers: 7 `.worktrees/githerd*`, its `live-tools.json` entry, the `githerd-dev` server, the githerd MCP registration                                                |                     | none; the `githerd/` source stays ("code kept", 2026-10-18)                                            |
| CLAUDE.md sections "Landing changes (golden-local)", "Verification after landing", the gate and land parts of "Where a change takes effect", and their rows in the tools table | about 9,000 words   | "Shipping a change" (section 6)                                                                        |
| `tmp/golden/`, `tmp/push-gate-logs/`, `tmp/prepush-passes/`, `tmp/test-ledger/` (after import)                                                                                 | local only          | the test store                                                                                         |

## 5. What is kept, and where it moves

| Kept                                                                                                                                                                                                                                                                   | Where it runs now                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `tools/test-select.mjs`, `test-select-rules.json`, `test-changed.mjs`                                                                                                                                                                                                  | the pull request checks pick tests and stories with it; `pnpm run test:changed` locally                  |
| Test ledger logic in `tools/test-ledger.mjs` (record shape, failure key and signature) and the shard input key from `prepush-inputs.mjs`                                                                                                                               | moved into the Worker and the CI reporter before those files are deleted                                 |
| Quarantine rules (`tools/test-quarantine.mjs`): one retry; flaky = failed and passed on the same inputs; one `priority:critical` issue per test; leaves on issue close, 20 passes or 14 days; never GPU tests or the screenshot verdict                                | the list lives in the store; `test-quarantine.json` goes                                                 |
| `tools/test-history.mjs`, `vitest-time-budget.mjs`                                                                                                                                                                                                                     | read and write the store instead of SQLite and the Actions cache                                         |
| visual-review: review page, capture, passkey-signed approvals, `notify`                                                                                                                                                                                                | reviews pull requests and nightly candidates instead of the golden pull request                          |
| `tools/release-scheduler/` (Cloudflare Worker)                                                                                                                                                                                                                         | unchanged; it now dispatches the full run                                                                |
| `release.yml` as the only file that publishes to npm                                                                                                                                                                                                                   | gains the nightly and promotion jobs                                                                     |
| `release-hold.json`, `release-hold.mjs`, `publish-hold.mjs`, `release-status.mjs`, `release-watch.yml`, `gpu-rerun-on-runner-loss.yml`, `worktree-new.sh`, `branch-note.mjs`, `branch-push.sh`, `no-copy.sh`, the secret scan, `format-staged.sh`, `commit-changes.sh` | unchanged, except branches start from `origin/master`                                                    |
| `test-slots.mjs`, `with-browser.sh`, `low-priority.sh`                                                                                                                                                                                                                 | agents' local runs (23 parallel Chromium filled swap on 2026-10-01); the gate lane goes                  |
| `pr-status-broker.mjs`                                                                                                                                                                                                                                                 | watches every agent pull request in one GraphQL query a minute                                           |
| `sonar-baseline.mjs --watch`, `sonar-gate.mjs`                                                                                                                                                                                                                         | master scans with an issue per new finding; changed lines in the quick check, which leaves the push path |
| `worktree-cleanup.mjs`                                                                                                                                                                                                                                                 | unchanged; its "merged into golden" rule becomes "merged into master"                                    |

## 6. CLAUDE.md and skill rewrites

All in pull requests the owner reviews where they touch owned paths (code-owned from step 3).

- **Root CLAUDE.md**, step 5: "Landing changes (golden-local)" and "Verification after landing"
  become "Shipping a change", at most 600 words: worktree from master, commit, pull request with
  auto-merge, stop; the round owns a red pull request; the 6-hour full run; the three sites;
  promotion is the owner's; the owner's own pipeline edits go through an agent pull request he
  approves; reading the test store. Step 10 removes the rest. Target: under 9,000
  words, from 20,070.
- **Package CLAUDE.md files** naming golden, the gate or `land.mjs` (algorithms, layout,
  graph-format, graph-samples, webgpu-graph-algorithms, githerd; 20 references): step 10.
- **pipeline-round skill** (6,887 words), rewritten in step 5 and trimmed in step 10, in the order of
  main section 12. Gone: "Keep golden moving", "Land what subagents
  finished", "Nightly branch sync", the live copies. `tools/pipeline-round-skill.test.mjs` is updated
  with it.
- **issue-round skill**: subagents end by opening the pull request with auto-merge instead of
  reporting a branch for landing (12 references).
- **design-studio skill**: its 10 references to landing a pass become "open the pass's pull request".
- **Memory**: the golden-local, freeze-golden, push-queue and deploy-blocker entries are marked
  superseded.

## 7. What the owner does

Main section 13, the one list, in order and with each item's check.

## 8. How each choice answers the record

| Past failure                                                               | Answer here                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tier 3 took about 60 hours and froze every other landing                   | No golden and no landing lock; waiting branches enter 10 at a time                  |
| Six landing systems in five weeks; the beta site built twice, never landed | One ordered rollout; deletion is a step with a check, not a hope                    |
| The pipeline's own checks caused most gate failures (32 of 35 on 10-24)    | Tool checks run only when tool files change; the gate's tools are deleted           |
| Local and CI screenshots differed                                          | CI is the reference; the local preview is deleted; every mismatch is a bug (step 9) |
| Agents waited on gates (103 wakes in a day on 10-18)                       | Agents open the pull request and stop; auto-merge merges it                         |
| Gate settings leaked into its own tests (`PREPUSH_ROOT`, `GRAPHTY_*`)      | That gate is gone; CI jobs start from a clean environment                           |
| A CI Build regression went unnoticed for four days                         | Durations reach the store in step 2, so budgets have history on day one             |
| Agents held the owner's authority                                          | Step 3, before the switch: own identity, code-owned pipeline, no bypass             |
| Per-branch merging would loosen production for days                        | Step 3 freezes graphty.app and `latest` until the first promotion                   |
| One red lane stopped everything (10-21 to 10-23)                           | Only the deletion waits on #3318; the switch does not                               |

## 9. Decisions made here (reversible)

- No freeze switch in `land.mjs`: the flush is an instruction in the one skill that lands.
- The test store lives on workers.dev (no DNS) and authenticates CI by GitHub OIDC.
- Site repositories are written with deploy keys, not a GitHub App (the site-flip branch's App
  secrets were never created); the nightly one is graphty-org/graphty-nightly.
- The `githerd/` source and its shard stay; waiting branches enter 10 at a time; step 10 waits 7
  days so an undo stays cheap.
- The rollout order of main section 12: identity and the production freeze before the switch,
  selection readiness beside it.
