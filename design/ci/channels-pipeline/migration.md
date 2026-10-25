# Migration and deletion

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
   which become pull requests in step 3.
2. **Verify golden's tip.** `node tools/verify.mjs start` (CI backend, about 48 minutes) until
   `golden-verified` equals `origin/golden`. A failure is handled as today: bisect, `land.mjs revert`
   of the culprit, verify again.
3. **Cut the tip explicitly.** `node tools/land.mjs cut origin/golden-verified`. Naming the commit
   matters: without it, `cut` picks the newest commit whose preview has no unstable image and can
   leave landings behind on golden.
4. **Owner review and ship.** The owner Finishes the cut pull request's screenshots;
   `node tools/land.mjs ship` merges it after one ci.yml run.
5. **Release.** #3318 stays open, so the train restarts itself on the new master push. Its two
   causes must be fixed on golden before step 3: nx could not build its project graph in the T4 lane
   (the tests themselves passed), and the audit flagged zod and body-parser (#3393).

**Done when** (all three): `git merge-base --is-ancestor origin/golden origin/master` succeeds; #3318
is closed by a published release; `npm view @graphty/<pkg> dist-tags.latest` equals the newest
`<project>@<version>` tag on master for all 13 packages.

**Expected duration**: 12 to 48 hours (the last four cuts took 11.6 hours to 2.2 days, mostly
screenshot review).

**Failure modes:**

- _The audit stays red because the advisory has no patched version._ Rollout steps 1 to 7 need
  golden on master, not a release, so they go ahead once the ship merges; only deletion (step 8)
  waits for #3318. Nothing shipped from 10-21 to 10-23 while everything waited on one red lane.
- _A session lands anyway._ `land.mjs status` shows it; the round reverts it, and the branch goes
  in as a pull request.

## 3. The rollout

A step starts when the steps it depends on have passed their checks; "parallel" steps can start
during the flush.

| #   | Step                                                    | Starts after                                | Undo                                           |
| --- | ------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| 1   | Owner setup (accounts, tokens, DNS, site repositories)  | parallel                                    | delete what was created                        |
| 2   | Test store in shadow                                    | parallel                                    | remove the reporter step                       |
| 3   | Pull requests into master; canary site                  | flush shipped                               | recreate golden from master, re-enable landing |
| 4   | The 6-hour full run on master, with bisect and revert   | 3                                           | dispatch release.yml as today                  |
| 5   | Nightly: site and npm `next`                            | 4                                           | skip the promote job                           |
| 6   | Production promotion; graphty.app moves to graphty-site | 5                                           | swap the custom domains back                   |
| 7   | Machine account, CODEOWNERS, admin bypass removed       | 1 and 3                                     | restore the bypass actor                       |
| 8   | Deletion                                                | 3 to 7 checked, 7 days stable, #3318 closed | `git revert` of the deletion                   |
| 9   | Stories as tests replace the separate capture           | 4                                           | keep the old capture job                       |

### Step 1: owner setup (parallel)

Everything in section 7 that does not depend on code: the machine account, the Cloudflare token,
DNS records, domain verification, the nightly site repository, the deploy keys, the npm token. None
of it changes behavior until a later step uses it.

**Done when** each item's check in section 7 passes.

### Step 2: the test store in shadow (parallel)

The Worker (`tools/test-store/`, deployed by `wrangler deploy` from a workflow on master) and its D1
database go live. Every CI test job reports to it; nothing reads it yet.

- CI writes authenticate with the job's GitHub OIDC token (audience `graphty-test-store`, claim
  `repository` = `graphty-org/graphty-monorepo`): no stored secret. Local writes use
  `TEST_STORE_TOKEN` from `.env`.
- Volume: 4 full runs of 36 shards plus about 30 pull requests of about 10 shards is under 1,500
  group records a day, far inside D1's free tier (100,000 writes a day).
- History: `tools/test-ledger-import.mjs` loads the 77 MB local ledger into the store once.

**Done when**, over 3 days: every CI test job of every run has its record (count of records equals
count of jobs, checked by one query); p95 write latency under 500 ms; zero jobs failed or slowed by
more than 5 seconds because of the store (the fail-open timeout is 3 seconds per call).

**Failure mode:** Worker down or slow: calls time out, the job goes on, and the missing record
means "unknown", which can only make later runs longer.

### Step 3: pull requests into master, and the canary site

The switch. After the flush has shipped:

- `ci.yml` gets its pull request path from the design's light checks section (format, lint,
  typecheck, affected build, affected tests, affected stories). The required check names stay
  `All Checks Pass` and `Lint PR Title`, so the ruleset needs no edit in this step.
- The draft rule stays (a draft runs no CI); auto-merge is already on for the repository.
- Agents open one pull request per branch with `gh pr create` and `gh pr merge --auto --merge`, then
  stop. They never wait on it: the pipeline round owns a red pull request.
- Every open branch that waited during the flush becomes a pull request, oldest first, at most 10 at
  a time, so the first hour does not bury master in conflicts.
- `deploy-pages.yml` keeps deploying every green master build. In this step it still serves
  graphty.app; the domain moves to canary.graphty.app in step 6, when production has a home.
- Three defaults that point at golden today move to master in the same pull request:
  `tools/worktree-new.sh` starts branches from `origin/master` and stops handing itself to
  `.worktrees/land-live`; `MAIN_FOLLOWS` in `tools/land.mjs` becomes `"master"`, so the main checkout
  stops following `golden-verified`; `.github/dependabot.yml`'s two `target-branch: golden` become
  `master`, so Dependabot opens ordinary pull requests that auto-merge like any other.
- CLAUDE.md "Landing changes" becomes "Shipping a change" (section 6) in the same pull request, so
  the instructions and the flow change at the same moment.

**Undo:** `git branch golden origin/master`, push it, restore the old CLAUDE.md section; `land.mjs`
still exists until step 8.

**Done when**, over the first 20 merged pull requests: median from pull request opened to merged
under 20 minutes; at least 18 of 20 merged without a person touching them; master's build green after
each (the golden era's median, first commit to master, was 54.9 hours).

**Failure modes:**

- _Combined pull requests keep breaking master_ (each passed alone). Three such master failures in
  a week turn on Mergify's queue, as the owner decided (it ran healthily here: 371 of 418 merged,
  median 23 minutes, 0 stuck).
- _The light checks fail on themselves_, as the light landing check did on 2026-10-24 (35 of 50
  failed, 32 of them in two tool checks). Tool checks ("Release dry run", "CI workflow tests") do not
  run on product pull requests at all; they run only when `.github/` or `tools/` changed.

### Step 4: the full run on master every 6 hours

`release.yml`, dispatched by the existing Cloudflare scheduler at 00:00, 06:00, 12:00 and 18:00 UTC,
runs the full run on master's tip. Red: the pipeline round bisects over master's first-parent merges
with only the failing tests, reverts the culprit by pull request, and the fix goes forward on its
branch. The bisect reuses `verify.mjs`'s evidence rule (a point is bad only when the same failure
reproduces there; a culprit is named only when its parent passes), moved into the bisect job.

**Undo:** dispatch release.yml with today's inputs; the scheduler is unchanged.

**Done when** 8 consecutive slots (two days) each either passed, or failed and named a culprit whose
revert made the next slot pass, with no slot skipped for a reason other than "master did not move".

**Failure mode:** red with no code culprit (a lost T4 spot runner, npm slow to list a version):
`gpu-rerun-on-runner-loss.yml` and `publish-hold.mjs` already handle both and are kept.

### Step 5: nightly

A green full run with no changed screenshots promotes automatically: its build goes to
graphty-org/graphty-nightly (built files only, one commit per promotion, pushed with that
repository's deploy key) and `release.yml` publishes the versions under `next`. With changed
screenshots it waits for the owner's Finish on the review page.

npm trusted publishing needs no change: every `npm publish` stays in `release.yml`, which all 13
trusted-publisher entries name. Another workflow file would need 13 new entries, and an unused entry
expires in 2 days (cytoscape-extensions' first release, 2026-10-07).

**Done when** two promotions have happened, one automatic and one after a Finish, and for each:
nightly.graphty.app serves the promoted commit (its `build.json` names the commit), and
`npm view @graphty/graphty-element dist-tags.next` is the version tagged on that commit.

### Step 6: production promotion, and the domain move

A `workflow_dispatch` job in `release.yml`, gated by environment `production` (reviewer
`apowers313`), moves `latest` to the versions `next` holds and copies the nightly build, unchanged,
into graphty-org/graphty-site. Trusted publishing covers `npm publish` only, not `npm dist-tag add`,
so the job uses a granular token (`NPM_PROMOTE_TOKEN`, in `production` only), proved first by
re-adding `latest` to one package's current version, which changes nothing.

The domain move, in this order, so graphty.app is never without its datasets (every published
graph-samples downloads from `https://graphty.app/data/graph-samples/v1/`):

1. The first promotion writes the current production build, `/data/` included, into graphty-site.
2. A check script (`tools/check-site.mjs`, new, about 40 lines) compares graphty-site's file list and
   hashes with the deployed build. Every dataset path must be present.
3. The owner swaps the custom domains (section 7, item 9). The apex records already point at GitHub
   Pages and do not change. Expect seconds to minutes of gap, and up to an hour before HTTPS
   certificates are issued.
4. The check script runs against the live domains.

**Undo:** swap the two custom domains back.

**Done when** the check script passes on all three sites: every page in the site map and every
dataset under `/data/graph-samples/v1/` returns 200 over HTTPS; each site's `build.json` names the
expected commit (canary: master's tip; nightly: the last promotion; production: the owner's last
promotion).

### Step 7: agent identity, code owners, no admin bypass

The order matters, because GitHub does not let an author approve their own pull request:

1. A pull request adds `.github/CODEOWNERS`, naming `@apowers313` for `/.github/`, `/tools/`,
   `/.husky/`, `/.claude/`, `CLAUDE.md`, `**/CLAUDE.md`, `/visual-review/trusted/`,
   `/visual-review/passkeys.json`, `nx.json`, `vitest.shared.config.ts`, `**/vitest*.config.*`,
   `release-hold.json` and the CI time budget file. It has no effect until the rule is on.
2. Agents switch to the machine account. `.claude/settings.json` gets an `env` block:
   `GH_CONFIG_DIR=~/.config/gh-agent` (where the owner logged the machine account in) and
   `GIT_CONFIG_GLOBAL=~/.config/git-agent/config` (its name, email and SSH signing key). The owner's
   own shell keeps his own `gh` and git identity.
3. The owner edits ruleset 23973898: removes the `RepositoryRole 5` bypass, keeps `DeployKey`, turns
   on "Require review from Code Owners".

**Undo:** add the bypass actor back; unset the `env` block.

**Done when**, tested on purpose: a machine-account pull request touching `tools/` waits for the
owner's review; one touching only `graphty/` auto-merges; `gh pr merge --admin` is refused; the
ruleset's `bypass_actors` lists only `DeployKey`; a deploy-key release push still lands.

### Step 8: deletion

One pull request (the owner reviews it, since it touches `tools/` and `.github/`), after steps 3 to 7
have passed their checks, 7 days have passed without an undo, and #3318 is closed. Section 4 lists
what goes. The checks: `pnpm run lint`, `knip` and the full run all green with the files gone, and
`grep -rE 'land\.mjs|verify\.mjs|push-queue|golden-cut|gate-live|land-live' --include=*.md
--include=*.mjs --include=*.yml .` finds nothing outside `design/` and `.claudehistory/`.

**Undo:** `git revert` of that one merge.

### Step 9: stories as tests replace the separate capture

Shadow first: for 5 full runs, the end-of-test screenshot comparison runs beside today's
`visual` job. **Done when** the two agree on every story's verdict (same baseline hash, same
pass or changed) in all 5 runs; each disagreement is filed as a bug and fixed, never excluded. Then
the old capture job is removed. The baselines in `visual-baselines/` and the signed approvals in
`visual-review-approvals/` stay exactly as they are. If the comparison needs a change to
`visual-review/trusted/gate.mjs` or `approval.mjs`, the owner makes it or authorizes it in writing
on the issue, because agents never edit those files.

## 4. What is deleted, and when

Deleted in step 8, unless noted:

| What                                                                                                                                                                           | Lines or size       | Replaced by                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------- |
| `tools/land.mjs`, `land.test.mjs`                                                                                                                                              | 2,774 + tests       | pull requests with auto-merge                                                                  |
| `tools/verify.mjs`, `verify.test.mjs`                                                                                                                                          | 2,241 + tests       | the 6-hour full run and its bisect job                                                         |
| `tools/push-queue.sh`, `queued-push-guard.mjs`, `prepush-tests.mjs`, `prepush-inputs.mjs`, `shard-verdict.mjs`, `gate-snapshot.sh`, `push-base.mjs`, `wait-log.mjs`            | about 2,800 + tests | the light pull request checks in CI                                                            |
| `tools/prepush.sh`, `prepush-source-checks.sh`                                                                                                                                 | 698                 | a pre-push hook of format, lint and typecheck on touched packages (under 2 minutes)            |
| `tools/branch-sync.mjs`, the `sync` command                                                                                                                                    | 552                 | none: short branches merge master themselves                                                   |
| `tools/visual-preview.sh` (golden pull request previews)                                                                                                                       | 452                 | affected-story screenshots on each pull request                                                |
| `tools/ship-risks.mjs`, `branch-tracking.test.mjs`                                                                                                                             | about 300           | none                                                                                           |
| `live-tools.json` entries `gate` and `land`; worktrees `gate-live`, `land-live`, `golden-local`, `golden-cut`, `golden-bisect-*`, `land-check-*`, `check-golden-*`             | 14 worktrees        | none                                                                                           |
| Branches `golden`, `golden-cut`, `golden-verified`, `golden-candidate`, `golden-cut-candidate`, `golden-bisect-1`, `golden-bisect-2`, tag `golden-good`                        |                     | master and the full run's green marker (history stays in master)                               |
| `.github/workflows/golden-verify.yml`, `visual-seed.yml`                                                                                                                       | 248                 | the full run; seeding happens through a pull request like any baseline                         |
| `master-guard.yml` revert job, the revert half of `tools/master-guard.mjs`                                                                                                     | about 300           | the pipeline round's bisect and revert pull request. The red-master issue and phone alert stay |
| githerd leftovers: 7 `.worktrees/githerd*`, its `live-tools.json` entry, the `githerd-dev` server, the githerd MCP registration                                                |                     | none; the `githerd/` source stays ("code kept", 2026-10-18)                                    |
| CLAUDE.md sections "Landing changes (golden-local)", "Verification after landing", the gate and land parts of "Where a change takes effect", and their rows in the tools table | about 9,000 words   | "Shipping a change" (section 6)                                                                |
| `tmp/golden/`, `tmp/push-gate-logs/`, `tmp/prepush-passes/`, `tmp/test-ledger/` (after import)                                                                                 | local only          | the test store                                                                                 |

## 5. What is kept, and where it moves

| Kept                                                                                                                                                                                                                                                                   | Where it runs now                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `tools/test-select.mjs`, `test-select-rules.json`, `test-changed.mjs`                                                                                                                                                                                                  | the pull request checks pick tests and stories with it; `pnpm run test:changed` locally                         |
| Test ledger logic in `tools/test-ledger.mjs` (record shape, failure key and signature) and the shard input key from `prepush-inputs.mjs`                                                                                                                               | moved into the Worker and the CI reporter before those files are deleted                                        |
| Quarantine rules (`tools/test-quarantine.mjs`): one retry; flaky = failed and passed on the same inputs; one `priority:critical` issue per test; leaves on issue close, 20 passes or 14 days; never GPU tests or the screenshot verdict                                | the list lives in the store; `test-quarantine.json` goes                                                        |
| `tools/test-history.mjs`, `vitest-time-budget.mjs`                                                                                                                                                                                                                     | read and write the store instead of SQLite and the Actions cache                                                |
| visual-review: review page, capture, passkey-signed approvals, `notify`                                                                                                                                                                                                | reviews pull requests and nightly candidates instead of the golden pull request                                 |
| `tools/release-scheduler/` (Cloudflare Worker)                                                                                                                                                                                                                         | unchanged; it now dispatches the full run                                                                       |
| `release.yml` as the only file that publishes to npm                                                                                                                                                                                                                   | gains the nightly and promotion jobs                                                                            |
| `release-hold.json`, `release-hold.mjs`, `publish-hold.mjs`, `release-status.mjs`, `release-watch.yml`, `gpu-rerun-on-runner-loss.yml`, `worktree-new.sh`, `branch-note.mjs`, `branch-push.sh`, `no-copy.sh`, the secret scan, `format-staged.sh`, `commit-changes.sh` | unchanged, except branches start from `origin/master`                                                           |
| `test-slots.mjs`, `with-browser.sh`, `low-priority.sh`                                                                                                                                                                                                                 | agents' local runs (23 parallel Chromium filled swap on 2026-10-01); the gate lane goes                         |
| `pr-status-broker.mjs`                                                                                                                                                                                                                                                 | watches every agent pull request in one GraphQL query a minute                                                  |
| `sonar-baseline.mjs --watch`                                                                                                                                                                                                                                           | the only SonarQube use: master scans, an issue per new finding; `sonar-gate.mjs` leaves the push path in step 3 |
| `worktree-cleanup.mjs`                                                                                                                                                                                                                                                 | unchanged; its "merged into golden" rule becomes "merged into master"                                           |

## 6. CLAUDE.md and skill rewrites

All in pull requests the owner reviews (they are code-owned from step 7).

- **Root CLAUDE.md**, step 3: "Landing changes (golden-local)" and "Verification after landing"
  become "Shipping a change", at most 600 words: worktree from master, commit, pull request with
  auto-merge, stop; the round owns a red pull request; the 6-hour full run; the three sites;
  promotion is the owner's; reading the test store. Step 8 removes the rest. Target: under 9,000
  words, from 20,070.
- **Package CLAUDE.md files** naming golden, the gate or `land.mjs` (algorithms, layout,
  graph-format, graph-samples, webgpu-graph-algorithms, githerd; 20 references): step 8.
- **pipeline-round skill** (6,887 words), rewritten in step 3 and trimmed in step 8. New order: red
  master build; a red full run (bisect, revert pull request, fix forward); held release or failed
  publish; red or conflicting agent pull requests; owner items waiting (screenshot review for
  nightly, promotion); stale branches and worktrees. Gone: "Keep golden moving", "Land what subagents
  finished", "Nightly branch sync", the live copies. `tools/pipeline-round-skill.test.mjs` is updated
  with it.
- **issue-round skill**: subagents end by opening the pull request with auto-merge instead of
  reporting a branch for landing (12 references).
- **design-studio skill**: its 10 references to landing a pass become "open the pass's pull request".
- **Memory**: the golden-local, freeze-golden, push-queue and deploy-blocker entries are marked
  superseded.

## 7. What the owner does

In the order needed. Each item ends with how to tell it worked.

1. **Approve the flush's screenshots** on the cut pull request (step 0), and later every nightly
   candidate with changed screenshots. _Check:_ the cut merges; nightly promotes.
2. **Machine account** (GitHub Team plan): a new user, 2FA on, an org member with the Write role on
   graphty-monorepo only. Its name appears on every agent commit. On this machine run
   `GH_CONFIG_DIR=~/.config/gh-agent gh auth login` as it, and add an SSH signing key to it.
   _Check:_ `GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login` prints the new name.
3. **Cloudflare token** in the release scheduler's account, with Workers Scripts Edit and D1 Edit;
   repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. _Check:_ the store's
   deploy workflow succeeds.
4. **Domain verification**: graphty-org settings, Pages, verified domains, add `graphty.app` and
   publish its TXT record (`_github-pages-challenge-graphty-org.graphty.app`); this covers the
   immediate subdomains, so verify canary and nightly separately only if the page asks. _Check:_
   "Verified".
5. **DNS**: CNAME `canary` and `nightly` to `graphty-org.github.io`; the apex records stay.
   _Check:_ `dig +short canary.graphty.app`.
6. **Site repositories**: create graphty-org/graphty-nightly (public, empty). On it and on
   graphty-site, add the write deploy keys the session generates and turn on Pages from `main`,
   root; secrets `NIGHTLY_SITE_DEPLOY_KEY`, and `PRODUCTION_SITE_DEPLOY_KEY` in the `production`
   environment only. _Check:_ the first nightly push appears there.
7. **`production` environment**: required reviewer `apowers313`, "Prevent self-review", branch
   master only. _Check:_ a promotion dispatch waits for you.
8. **npm**: the 13 trusted-publisher entries stay. Add one granular token with write on the
   `@graphty` packages for moving `latest` (allow granular tokens if the packages disallow them),
   as `NPM_PROMOTE_TOKEN` in `production`. _Check:_ the no-op dist-tag write succeeds.
9. **Custom domain swap** (step 6, one sitting, when told graphty-site is complete): remove
   `graphty.app` from graphty-monorepo's Pages and add it to graphty-site's; add
   `canary.graphty.app` to graphty-monorepo and `nightly.graphty.app` to graphty-nightly; Enforce
   HTTPS once each certificate exists. _Check:_ the site check script passes.
10. **Review the CODEOWNERS pull request**, then **edit ruleset 23973898**: remove the Admin bypass,
    keep the deploy key, turn on "Require review from Code Owners". _Check:_ step 7's tests.
11. **Changes to `visual-review/trusted/`** that stories as tests need (step 9): make or authorize
    them on the issue.
12. **Promote** to production whenever you judge nightly good: dispatch the promotion and approve the
    `production` deployment.

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
| Agents held the owner's authority                                          | Step 7: own identity, code-owned pipeline, no bypass                                |
| One red lane stopped everything (10-21 to 10-23)                           | Only the deletion waits on #3318; the switch does not                               |

## 9. Decisions made here (reversible)

- No freeze switch in `land.mjs`: the flush is an instruction in the one skill that lands.
- The test store lives on workers.dev (no DNS) and authenticates CI by GitHub OIDC.
- Site repositories are written with deploy keys, not a GitHub App (the site-flip branch's App
  secrets were never created); the nightly one is graphty-org/graphty-nightly.
- The `githerd/` source and its shard stay; waiting branches enter 10 at a time; step 8 waits 7
  days so an undo stays cheap.
