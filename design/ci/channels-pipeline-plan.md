# The channels pipeline: implementation plan

Status: plan, 2026-10-24, revised after three reviews. Issue #3418. Implements
`design/ci/channels-pipeline.md` (the design; "section N" below means its section) and its appendices
in `design/ci/channels-pipeline/`. The rollout steps are the design's section 12; this plan breaks
each into work items and groups the agent items into branches.

## 1. Changes to the design

Session decisions, each reversible by an edit. Where the design says otherwise this plan wins, and
the item named corrects the design's text in its own branch.

1. **LLM regression runs once per UTC day**, on the first full run of the day whose ci.yml lane is
   green, and on an owner-dispatched hotfix run; not once per candidate. About $0.94 a run, so about
   $29 a month plus capped bisects, under the owner's ceiling of about $60 (2026-10-12). The
   `spend:llm` alarm at $60 a calendar month stays. Design section 9 already names this as the
   one-line fallback; the round posts the change on #3418 when it merges, and the owner reverses it
   with that one line. Item `llm-once-a-day`.
2. **The owner keeps his own credentials.** Owner action 2 no longer asks him to log out of `gh`,
   delete SSH keys, `npm logout` or remove credential helpers. Agents and every servherd server run
   with `GH_CONFIG_DIR`, `GIT_CONFIG_GLOBAL` (which replaces `~/.gitconfig`, so its credential
   helpers are never read), an SSH command naming only the agent key with no ssh-agent, an empty npm
   user config and an empty `GNUPGHOME`; a PreToolUse hook refuses tool calls that read or use his
   credential paths. A passphrase on his keys is optional hardening. The hook stops accidents and
   casual reads, not a determined agent; the design's residual-risk note stays true. The branch of
   `agent-env-and-guard` corrects design section 6.1 paragraph 2, section 10's "credential helpers
   removed", section 13 item 2 and its checks, and budgets-and-trust section 2. Items
   `agent-env-and-guard`, `owner-agent-account`, `owner-optional-hardening`.
3. **`@experimental` means "may change or disappear in a minor release"** until the owner says
   otherwise on #3418 (item `owner-experimental-promise`). `check-features.mjs` fails on an
   `@experimental` export that names no `FEATURES` row, not on every one; the API docs and README
   state the promise. Item `features-module`.
4. **Several owned pull requests per step**, not one. A workflow file is still never edited by two
   open pull requests at once: owned pull requests touching the same workflow merge one after
   another, each merging master first. This keeps each under about 400 lines.
5. **`base-check.yml` moves to step 5** (item `store-reads-live`), because `[KNOWN?]` needs it from
   the first pull request.
6. **`release-due` moves to step 6** (item `full-run-calls`): it does nothing before the full run.
7. **`ci-budgets.json` moves to step 2** (item `durations-timings`), so its keys exist when the
   replay sets them.
8. **Step 6 overlaps step 5.** The full run publishes nothing, so `full-run-release` merges as soon
   as the light check, the bisect workflow and the store's queries are in, and its 8-slot soak runs
   beside step 5's 20 pull requests. Step 7 still waits for both acceptances.
9. **release.yml's `workflow_run` trigger goes in step 3** (`release-shadow-and-legacy`), not step
   10, so a held release cannot restart the full train on every master merge.
10. **`mode: legacy` ends at step 8** (`canary-deploy`), not step 10: from the domain swap on, an
    urgent release goes through `promote.yml`.
11. **A flush guard in `land.mjs`** (item `flush-stop-landing`), where migration section 9 says "no
    freeze switch": three lines that refuse a top-level `land` or `sync`, never `cut-fix`.
12. **Root CLAUDE.md's target is 12,000 words** after step 5, not migration's 9,000, because the
    golden sections stay until step 10 as the undo; step 10's deletion reaches 9,000.
13. **Nightly holds and fixes its candidate** (owner, 2026-10-26, issue #3741), replacing the
    oldest-candidate offer and the dropped rejected candidate; #3737 (newest first) is superseded.
    Design sections 3 and 5 say how; `candidate-hold` corrects channels section 7.

## 2. How to read an item

The number after an agent item's name is its GitHub issue; owner and pipeline-round items are
tracked on #3418's checklist.

Each item: **who** (agent, owner, or the pipeline round), **size** (S under about 150 changed lines
or an hour of owner time, M under about 400; nothing larger, larger work is split), what it changes,
**needs** (items first), **done** (a check anyone can run), **undo**, and its branch (section 5).
**CP** marks the critical path. Every item can be built in parallel from day 0 unless it says
otherwise; "needs" says when it may merge, not when it may be written.

- **Before the flush ships**, nothing reaches master. Step 0's branches land through golden; every
  other branch is built and tested beside the flush.
- **After the flush ships**, every branch is a pull request into master, started with
  `./tools/worktree-new.sh <branch> origin/master --issue 3418` (or merging `origin/master` into a
  branch begun earlier). `release-shadow-and-legacy` merges first, so no release can publish what
  follows; then `agent-env-and-guard`, so every later pull request is opened by the agent account
  and the owner can approve it; then the rest in section 3's order.
- **Before `owner-ruleset-switch`**, nothing enforces code-owner review, so the round merges an
  owned pull request only after the owner's approving review on it.
- **Owned pull requests** are those CODEOWNERS will cover (section 6.2). The round asks for them in
  batches: one `ACTION NEEDED` line per batch, critical-path pull requests first.
- Commits are signed conventional commits with `Refs #3418`. Pipeline changes never share a pull
  request with product code. Each owned pull request's Proof states its component's lines (pipeline
  code without tests, as migration section 4 counts them) against that component's cap.

## 3. Critical path

Built from day 0, beside the flush: every step-2, step-3 and step-4 branch, `light-check-replay`,
`light-check-plan`, `release-diff`, `bisect-core`, the skill test scaffold and the compact-mantine
Storybook 9 upgrade.

1. Step 0: `t4-graph-fix`, `sentry-build-fix`, `flush-stop-landing` (landed and live) ->
   `freeze-graphty-app` (landed) -> the round creates the flush file -> `flush-ship` with
   `owner-finish-flush` -> `main-follows-master`.
2. Step 3 begins: `release-shadow-and-legacy` -> `agent-env-and-guard` -> `results-worker` and
   `results-wiring` (the 3-day clock starts) -> `owner-delete-repo-secrets`.
3. Beside it: `test-integrity-check`, `codeowners-and-closure` -> `pr-integrity-workflow` ->
   `owner-scratch-ruleset` -> `scratch-ruleset-cases` -> `owner-ruleset-switch` ->
   `step-3-acceptance`.
4. Step 5: `light-check-workflow` (a), then (b) -> `store-reads-live` (3 days of records,
   `results-queries`) -> `pr-open-and-review` -> `shipping-instructions-switch` ->
   `step-5-acceptance`.
5. Step 6, overlapping step 5: `bisect-workflow`, `full-run-calls`, `full-run-release`,
   `version-dry-run`, `light-check-workflow` (c) -> `step-6-acceptance` (needs `step-5-acceptance`).
6. Step 7: `nightly-publish-environment` -> `nightly-site` (publishing on) -> `owner-npm-bind` at
   once -> `nightly-approval` -> `nightly-resume` -> `step-7-acceptance`. Beside step 8, not
   before it: `same-commit-rerun` -> `candidate-hold` -> `candidate-fix-forward` ->
   `candidate-fix-acceptance`.
7. Step 8: `promote-workflow` -> `owner-dist-tag-token` -> `owner-domain-swap` -> `canary-deploy`
   -> `step-8-acceptance`.
8. 7 days without undo, #3318 closed -> `deletion` (three pull requests) -> `local-cleanup`.

Off it: `audit-fix` (only `deletion` waits for it), step 4's per-package selection (a package not
on `fileLevel` runs whole shards under its own budget key), step 9, and the features track.

## 4. Work items

### Step 0: flush golden

**t4-graph-fix** (#3318) -- agent, S, CP. nx could not build its project graph in the T4 lane, one of the
two causes holding #3318. Done: `gpu.yml` dispatched on the branch passes its graph step. Undo:
revert.

**audit-fix** (#3393) -- agent, S, off the path. The audit flags zod and body-parser (#3393). Done:
`pnpm audit --prod` reports neither. With no patched version, it waits; #3318 then releases
through a `mode: legacy` dispatch once the fix is in, and only `deletion` waits. Undo: revert.

**sentry-build-fix** (#3415) -- agent, M, CP. Corrects branch `perf/ci-build-sentry-after-build` (#3415) per
merging section 5.3: a `sentry` job after Build on every event (inject debug ids, re-upload
graphty's dist), the upload alone master-only in environment `master-build`, `VITE_SENTRY_*` as
repository variables. Done: in its CI run `graphty:build` under 2 min and Build under 6; no secret
in the Build step's env; graphty's dist hashes equal on a pull request run and a master run of one
tree. Undo: revert the land commit.

**flush-stop-landing** (#3419) -- agent, S, CP. In `land.mjs`, the top-level `land` and `sync` commands
refuse while the main checkout's `tmp/golden/flush` exists; the `land` that `cutFixThenLand` calls
after merging into `golden-cut` passes a flag and is not refused (about five lines). Put live with
`tools/live.sh land` as soon as it lands. Atop the pipeline-round skill, an **interim rules**
paragraph, in force from the flush until `shipping-instructions-switch` replaces it:

- Flush in progress: no `land`, no `sync`; `revert` and `cut-fix` only.
- After the flush ships: rollout branches of #3418 open pull requests into master, in the order of
  this plan's section 3; nothing else is landed or opened until `step-5-acceptance`, except a fix for
  a red master.
- A `master-guard` revert pull request whose capture changes a screenshot gets its own immediate
  `ACTION NEEDED` line (the old visual gate holds it until step 9, though PR Integrity exempts
  reverts).

Done: with the file present, `node tools/land.mjs land <branch> --dry-run` exits 1 naming the flush,
and `node tools/land.mjs cut-fix <branch> --dry-run` succeeds. Undo: delete the file.

**freeze-graphty-app** (#3420) -- agent, S, CP, the last golden landing. `deploy-pages.yml` assembles and
uploads `site-<sha>` (14 days) on every green master build, but deploys graphty.app only when the
build's head commit is the version merge release.yml's `land` job pushed. So #3318's release, and
later a `mode: legacy` release, moves graphty.app with npm `latest`, and nothing else does. Needs:
`sentry-build-fix`, `t4-graph-fix`, `flush-stop-landing` live. Done: after a green master build of
an ordinary merge graphty.app's build stamp is unchanged and the run holds artifact `site-<sha>`;
after #3318's version merge the stamp names that commit. Undo: revert.

**flush-ship** -- pipeline round, S of work over 12 to 48 h, CP. In order:

1. Once `freeze-graphty-app` has landed, create the main checkout's `tmp/golden/flush`.
2. `node tools/verify.mjs start` until `golden-verified` equals `origin/golden`.
3. `node tools/land.mjs cut origin/golden-verified`; the owner's Finish (`owner-finish-flush`);
   `node tools/land.mjs ship`.
4. #3318 restarts through today's `workflow_run` on the master push.

Needs: `freeze-graphty-app`. Done: `git merge-base --is-ancestor origin/golden origin/master`;
#3318 closed by a release; each package's `dist-tags.latest` equals its newest tag; graphty.app's
stamp names #3318's version merge (the last three waived until `audit-fix` if the audit has no
patch).

**owner-finish-flush** -- owner, S, CP (section 13 item 1). When the round says the cut's preview is
ready: decide its changed screenshots, Finish with Face ID. Done: the cut's gate is green.

**main-follows-master** (#3421) -- agent, S, CP, right after `flush-ship`. `MAIN_FOLLOWS = "master"` in
`land.mjs` and `worktree-new.sh`'s default base `origin/master`, live at once with
`tools/live.sh land`, so the main checkout and every new worktree read master's
`.claude/settings.json`, skills and CLAUDE.md. Golden is an ancestor of master by then, so nothing is
lost. Its record is the first pull request into master after `release-shadow-and-legacy`. Done: the
next `land.mjs status` leaves the main checkout on master; a new worktree's `git merge-base HEAD
origin/master` is master's tip. Undo: set it back.

### Step 1: owner setup (parallel with steps 0, 2 and 4)

**owner-inputs** (#3422) -- agent, S, day 0. Posts on #3418 everything the owner items say "the session
gives": each environment's secret list (names and where each value comes from), the Cloudflare
commands, the scratch-ruleset command (once `pr-integrity-workflow` exists), the site deploy keys'
public halves. Done: each owner item below links its comment.

**agent-identity-files** (#3423) -- agent, S, no commit. Generate `~/.ssh/graphty-agent_ed25519` and
`~/.ssh/graphty-agent-signing_ed25519`; write `~/.config/git-agent/config` (budgets section 2.2,
with `core.sshCommand "ssh -i ~/.ssh/graphty-agent_ed25519 -o IdentitiesOnly=yes -o
IdentityAgent=none"`), an empty `~/.config/npm-agent/npmrc` and `~/.config/gnupg-agent/`; generate the
two site deploy key pairs. Done: keys at mode 600, public halves posted on #3418. Undo: delete.

**owner-agent-account** -- owner, S, CP (item 2, revised). Create the machine account (suggested
`graphty-agent`, 2FA, recovery codes kept), Write on graphty-monorepo only;
`GH_CONFIG_DIR=~/.config/gh-agent gh auth login` with its fine-grained token (budgets section 2.2);
add the two SSH public keys; create its two further tokens and store them: the agent token as the
new value of repository secret `MASTER_GUARD_TOKEN`, `AGENT_AUTOMERGE_TOKEN` in environment
`dependabot-automerge`. Nothing of his own is removed. Needs: `agent-identity-files`. Done:
`GH_CONFIG_DIR=~/.config/gh-agent gh api user --jq .login` prints the agent;
`ssh -i ~/.ssh/graphty-agent_ed25519 -o IdentitiesOnly=yes -T git@github.com` greets it. Undo:
delete the account.

**owner-optional-hardening** -- owner, S, optional, any time. A passphrase on his SSH keys with no
ssh-agent holding them; an uncached GPG passphrase; his `credential.helper` lines in a config only
his shell loads. No step waits for it.

**owner-cloudflare** -- owner, S (item 3; results section 13). Workers Paid and R2; the API token
and account id as secrets; the scheduler App's Contents: read and Administration: read and a second
key on the `graphty-results` Worker; `GRAPHTY_RESULTS_TOKEN` in `.env`, its hash on the Worker. Done:
`/v1/health` answers (after `results-worker` deploys).

**owner-environments** -- owner, S (item 4). The seven environments, master only, `production` with
him as required reviewer and prevent self-review off. Each one's secrets **copied** from the list in
`owner-inputs`; a repository-level secret is never deleted here (`owner-delete-repo-secrets` does
that once no job reads it). Done: `gh api repos/graphty-org/graphty-monorepo/environments --jq
'.environments[].name'` lists all seven. Undo: delete them.

**owner-dns-and-domain** -- owner, S (item 6), needed by step 7. In this order: verify `graphty.app`
for the organization's Pages (the TXT record), and only once it says "Verified" add the CNAMEs
`canary` and `nightly`; a CNAME to `github.io` before verification can be claimed by another Pages
site. Done: "Verified"; `dig +short nightly.graphty.app` answers.

**owner-site-repositories** -- owner, S (item 7). Create public graphty-org/graphty-nightly; on it
and graphty-site add the deploy keys (write) and set Pages' source to GitHub Actions. Done: both
repositories list the key and the Pages source.

### Step 2: results store, write-only

**results-worker** (#3426) -- agent, two pull requests, CP. (a) M: `tools/results-service/` (Worker, D1
migration, `/v1/health`) and `results-service.yml` deploying from master. (b) M: OIDC with audience
`graphty-results`; `full`, `bisect`, `base` only from master's ref and workflow; `local` by token
hash; `deploy` from the site repositories. It stores and answers, nothing more. Needs:
`owner-cloudflare`, `agent-env-and-guard`. Done: tests pass; `/v1/health` answers; a `full` record
from a branch ref is refused. Undo: delete the Worker.

**results-reporter** (#3427) -- agent, M. The pure tools: `tools/results/` (client; `run-group.mjs`: inputs
key, run, retry failed files once, one record per test group, spool); a Vitest failure reporter
(batched past the 20th); 5 s and 2 s timeouts, fail open; `test-history.mjs` and
`vitest-time-budget.mjs` reading and writing the store (`vitest-time-budget.mjs` keeps its cache file
as the fallback). No workflow edit. Done: tests, including a store that never answers.

**durations-timings** (#3428) -- agent, M. `ci-budgets.json` (section 7 values) and `tools/ci-budgets.mjs`
(`report`, `trend`, `lint`): `trend` files or updates exactly one issue per key over its alarm
(design 7), and posts one comment per pull request whose key is over 1.5 times master's median;
`lint` fails a job whose `timeout-minutes` is not twice its budget, and a secret in Build's env
(the one-build-for-every-event rule). No workflow edit. Done: tests, including a seeded secret in
Build's env failing `lint`.

**results-wiring** (#3429) -- agent, M, CP, the step-2 workflow pull request. The reporter step and a last
`timings` job (`if: always()`, posting job, step, `NX_PROFILE` task and queue rows) in ci.yml,
release.yml, gpu.yml, hosts.yml, the macOS, lifecycle and LLM jobs; `restricted-cpu-stress.yml`
writes kind `stress`; `timeout-minutes` set on every job so `ci-budgets.mjs lint` passes on master
(warns only until `light-check-workflow` (c) makes it a Check). Needs: `results-worker`,
`results-reporter`, `durations-timings`. Done, over 3 days: one query shows records equal to jobs;
p95 write under 500 ms; no job slowed over 5 s by the store; stored runs match their JUnit; a slow
scratch run warns and stays green. Undo: revert.

**results-queries** (#3430) -- agent, M. The Worker's read side, with endpoint tests: the plan read
(quarantine computed at read time, master-evidence excuses, per-file durations), the full run's
candidate pick, the state `release-due` reads, the trend alarm computation, `age:nightly`. Needs:
`results-worker`. Done: each endpoint's test against seeded records. Undo: revert.

**cache-hygiene** (#3431) -- agent, S. Each cache key family's size and write rate in `ci-budgets.json`; a
master job deleting superseded keys (keeping one LFS key per project and one import-graph key);
monthly `bytes:lfs` and `bytes:actions-cache` rows. In `results-wiring`'s pull request. Done: a
second master build leaves one key per family.

### Step 3: freeze npm, switch identity

**release-shadow-and-legacy** (#3424) -- agent, M, CP, the first pull request into master after the flush.
release.yml's `land` and `publish` off; `workflow_run` removed, so a held release never restarts
the train; a red shadow run files no "Release held" issue (one comment on #3418 instead). Every
release.yml job that reads a secret declares its environment (`land` and `publish` in `release`,
`llm` in `full-run`). `mode: legacy`, owner-dispatched: the full lanes, then an approval job in
`production`, then `land` and `publish` (`latest`) in `release` as today; graphty.app follows the
version merge through `freeze-graphty-app`'s rule. An empty `release-approvals.json`. Needs:
`flush-ship`, `owner-environments`. Done: a scheduled run publishes, pushes and files nothing; a
master push starts no release; a `mode=legacy` dispatch waits in `production`. Undo: revert.

**owner-delete-repo-secrets** -- owner, S, after `release-shadow-and-legacy` merges. Delete the
repository-level `RELEASE_DEPLOY_KEY`, `GOOGLE_API_KEY`, `SENTRY_AUTH_TOKEN`, the Pushover secrets
and any npm token; each now lives only in its environment. Done (agent): `gh api
repos/graphty-org/graphty-monorepo/actions/secrets --jq '.secrets[].name'` lists none of them; a
`mode=legacy` dry run still reads each.

**test-integrity-check** (#3432) -- agent, M, CP. `tools/check-test-integrity.mjs` with tests (budgets
section 4.1) and its replay over the 96 `land:` merges of 2026-10-18 to 10-24. Done: every false
positive fixed in the check; the real-hit count in section 6.2 and on #3418. Undo: delete.

**codeowners-and-closure** (#3433) -- agent, S, CP. `.github/CODEOWNERS` (section 6.2) and
`tools/check-owned-closure.mjs` over the selector's import graph. Done: the replay over the 117
landings counts the owned ones (about 27 expected); the closure check names no unowned file on master
once the list grows by what it named. Undo: delete CODEOWNERS.

**pr-integrity-workflow** (#3434) -- agent, M, CP. `pr-integrity.yml` (section 6.4: integrity, owned closure,
Proof, fresh-review patch id, breaking guard, signed baselines via master's `approval.mjs`, the three
exemptions); `.github/pull_request_template.md`; `pr-issue-link.yml` accepts `dependabot[bot]`;
`dependabot-automerge.yml` (Actions updates wait for the owner). Needs: `test-integrity-check`,
`codeowners-and-closure`. Done: `scratch-ruleset-cases`. Undo: drop it from the required checks.

**agent-env-and-guard** (#3425) -- agent, M, CP, the second pull request into master after the flush.
`.claude/settings.json` `env`: `GH_CONFIG_DIR`, `GIT_CONFIG_GLOBAL`, `NPM_CONFIG_USERCONFIG`,
`GNUPGHOME`, `SSH_AUTH_SOCK=""`. A PreToolUse hook `tools/claude-owner-credential-guard.mjs` with
tests, in the style of `claude-no-foreground-wait.mjs`: refuses Bash, Read, Grep and Glob calls
touching `~/.config/gh/`, `~/.gitconfig`, `~/.git-credentials`, `~/.npmrc`, `~/.gnupg/`, non-agent
keys in `~/.ssh/`, `git credential fill|approve`, `git credential-cache`, `gh auth token|switch`,
`ssh-add`, `-c credential.helper`, or an override of any of the five variables. CLAUDE.md's
"Starting Servers" and "The GitHub API budget" rewritten (migration section 6; only those sections,
so `shipping-instructions-switch` merges this first). Every servherd server that uses git or `gh`
restarted with the five variables: `visual-review`, `visual-review-notify`, `pr-status-broker`,
`sonar-baseline` (`--watch`), `worktree-cleanup`, and any other `servherd_list` shows running a
`gh` or git command. The design edits of section 1 change 2. Opened, like
`release-shadow-and-legacy`, under the owner's account; he merges both himself. Needs:
`owner-agent-account`, `main-follows-master`. Done: in an agent session `gh api user` is the agent,
`git credential fill` gives no password, `npm whoami` fails, a commit is "Verified" as the agent;
each listed server's environment answers `gh api user` with the agent; the hook test refuses each
pattern and passes an ordinary call of each tool. Undo: remove the block and the hook.

**owner-scratch-ruleset** -- owner, S, CP. Run the one `gh api` command from `owner-inputs`, which
creates a scratch ruleset with exactly the planned settings on `scratch/ruleset-trial`. Needs:
`pr-integrity-workflow`. Undo: delete it.

**scratch-ruleset-cases** (#3435) -- agent, S, CP. Against the scratch ruleset, each logged on #3418: an
owned-path pull request waits and a `graphty/src/` one auto-merges; `--admin` refused; a revert, an
accept-only and a Dependabot pull request pass PR Integrity, a `feat!:` title and an unsigned PNG
fail it; a master merge keeps the fresh review and a fix push loses it. Needs:
`owner-scratch-ruleset`.

**owner-ruleset-switch** -- owner, S, CP (item 5). Ruleset 23973898 per section 13 item 5 (bypass
removed, code-owner review, the four required checks); the tag ruleset; the `channel/*` rule; squash
off; Actions read-only and "Allow Actions to approve" off. Needs: every step-3 pull request merged,
`scratch-ruleset-cases` passing, `agent-env-and-guard` live; any pull request still open under the
owner's account is closed and reopened as the agent first. Undo: add the bypass actor back, remove
the four required checks, turn squash and "Allow Actions to approve" back on.

**step-3-acceptance** (#3436) -- agent, S, CP. On the real ruleset, each logged on #3418: graphty.app's
stamp still names #3318's version merge (or step 0's commit if #3318 waits on `audit-fix`);
`bypass_actors` only `DeployKey`; an agent `*@*` tag push refused; an owned-path pull request waits;
the review server's accept commit is the agent's.

### Step 4: selection readiness

**select-mutate-names** (#3437) -- agent, S. `test-select-mutate.mjs --name <n>` gives each run its own
`.worktrees/select-mutate-<n>`. Done: two runs at once leave both reports.

**file-level-selection** (#3439) -- agent, S. A clean `test-select-mutate.mjs <package> --name <package>`
run, at most 4 at once on this machine, for graph-io, webgpu-graph-algorithms, algorithms, layout,
graph-samples and cytoscape-extensions. The clean ones join `fileLevel` (and `fileLevelBrowser`) in
one owned pull request with `affected-input-fixes`; a package whose run is not clean gets its
longest shard sliced under 8 min in a pull request of its own. Needs: `select-mutate-names`. Done:
each clean run in the Proof, or every slice under 8 min in CI. Undo: remove the entry.

**affected-input-fixes** (#3438) -- agent, S. Merging section 4.3: `.github/workflows/**` out of
`sharedGlobals`, `projectsAffectedByDependencyUpdates: "auto"`, `^\.github/` and
`^pnpm-lock\.yaml$` out of `everything.patterns`, the smoke-shard rule. In `file-level-selection`'s
pull request. Done: a workflow-only commit selects only the tool tests and smoke shards; a lockfile
bump of one package's dependency affects only its dependents. Undo: revert.

**light-check-replay** (#3440) -- agent, M. `packBins()` in `tools/test-select.mjs` (bins of at most 8 min
from per-file durations, an unknown file counted as the family's longest) with tests; the replay of
`tmp/test-select/advisory.jsonl` through it sets each light-check key in `ci-budgets.json`. Needs:
`durations-timings`; merges after `results-wiring` so the durations it reads are the store's. Done:
the replay's table (key, p50, p90) on #3418, cited in each `why`. Undo: revert.

**story-parity-spike** (#3389) -- agent, M. Stories section 9's spike: 50 stories each of graphty and
graphty-element, dev and production mode, measured in CI by a new `visual-review parity` command
(which merges; the harness may not). Done: the outcome recorded on #3418. Undo: none needed.

### Step 5: pull requests into master

**nx-cache-worker** (#3441) -- agent, S. `tools/nx-cache-worker/` over R2 (merging section 5.2), deployed by
one more job in `results-service.yml`; write token in `nx-cache-write`, read token a repository
secret; the writing job declares `nx-cache-write` only on master. Needs: `owner-cloudflare`,
`owner-environments`, `results-worker`. Done: master writes entries; an unaffected package is a
remote hit on a pull request; a pull request write gets 403. Undo: unset the two variables.

**light-check-plan** (#3442) -- agent, M. A per-entry `files` field in `ci-test-matrix.mjs`; the story
selector in `test-select.mjs` (import closure, global inputs, the lockfile exception); default base
`origin/master` there and in `test-changed.mjs`; the import-graph cache key. Branched from
`light-check-replay`'s branch, merging it, since both edit `test-select.mjs`. Needs:
`light-check-replay`, `affected-input-fixes`. Done: tests; a one-package plan's bins are all under
8 min. Undo: revert.

**light-check-workflow** (#3443) -- agent, three ci.yml pull requests in order, CP. Merging section 4.1.

- (a) M: Plan inside Build with one store read as `results-plan`; Build with the cache probe;
  `Test (<family>-<bin>)` through `run-group.mjs`. Needs: `light-check-plan`, `nx-cache-worker`,
  `results-wiring`, `results-queries`, `step-3-acceptance`. Done: a one-package pull request within
  `run:ci.yml:pr`, a graphty-element `src/` one within `run:ci.yml:pr-wide`.
- (b) S: `Stories (<project>-<bin>)` running the old `visual` capture of the selected stories,
  report-only, and the old full `visual` job report-only outside All Checks Pass; story tests replace
  it per project in step 9. Done: a changed image reports and passes.
- (c) M, merged right after `full-run-release`, so nothing runs nowhere: the added Checks
  (`ci-budgets.mjs lint`, a stub `tools/check-features.mjs` that passes while no `FEATURES` module
  exists, the signing-bypass check out of `prepush-source-checks.sh`); tool tests only on tool
  changes; Docs only on docs inputs; coverage, network links, lifecycle and Cost Estimate Accuracy
  moved to the full run. Done: a pull request touching no docs runs no Docs job; the next full run
  reports coverage and lifecycle.

Undo: revert the ci.yml commit.

**store-reads-live** (#3388) -- agent, M, CP, once `results-wiring` has 3 days of records. Quarantine and
the master excuse from the plan (`[NEW-FLAKY]`, `[FLAKY-UNRELATED]`, `[KNOWN?]`), with one
`priority:critical` issue per quarantined test filed or updated by the reading step;
`base-check.yml` (input `repeat`); the light check reads quarantine from the store, while the full
path keeps reading `tools/test-quarantine.json` until `full-run-release` switches it (the file goes
in step 10); `results/cli.mjs import` of the 14,203 ledger records as kind `local`; the Mergify Test
Insights upload deleted (settled 29). Needs: `results-queries`, `light-check-workflow` (a). Done: a
seeded unrelated flaky test passes as `[FLAKY-UNRELATED]` and files exactly one issue; `base-check.yml
repeat: 5` quarantines it; 14,203 imported. Undo: revert.

**pr-open-and-review** (#3444) -- agent, M, CP. `tools/pr-review.sh` (headless `claude -p`, `/code-review`
at `high`, issue plus diff plus Proof only, report with its patch id) and `tools/pr-open.sh` (merging
section 2.2, including the webgpu reminder). Done: on a scratch branch `pr-open.sh` returns in under
30 s with auto-merge armed and PR Integrity green; a webgpu-graph-algorithms change prints the
reminder. Undo: revert.

**skill-test-scaffold** (#3445) -- agent, S. `tools/pipeline-round-skill.test.mjs`: the skill's sections
exist in section 12's order and name no deleted command. Reviewed alone. Done: it fails on today's
skill and passes on `shipping-instructions-switch`'s.

**shipping-instructions-switch** (#3446) -- agent, M in words, CP, written from step 3 on and merged last
in step 5, so instructions and flow change at one moment. Root CLAUDE.md per migration section 6's
step-5 rows ("Shipping a change", under 600 words, replaces the landing and verification sections;
the five agent rules of budgets section 4.4; merges master after `agent-env-and-guard`, which edits
other sections); `compact-mantine/CLAUDE.md`; the pipeline-round skill in section 12's order, with
these rules from the design: record skew breaks and propose Mergify after two in 7 days or one that
kept canary red over 6 hours; the branch-ceiling daily list with answers recorded by
`branch-note.mjs`; the reminder 14 days before `NPM_DIST_TAG_TOKEN_EXPIRES`; the stall alarm's
48-hour `ACTION NEEDED`; the interim rules paragraph removed. issue-round (subagents end with
`pr-open.sh`); design-studio (a pass opens its pull request). Also `dependabot.yml` to master,
`worktree-cleanup.mjs` "merged into master", `VITEST_BUDGET_BASE`; the golden-local, freeze-golden,
push-queue and deploy-blocker memory entries marked superseded. Needs: `light-check-workflow` (b),
`pr-open-and-review`, `store-reads-live`, `skill-test-scaffold`. Done: the skill test passes; `grep
-c 'land.mjs land' CLAUDE.md .claude/skills/*/SKILL.md` is 0; root CLAUDE.md under 12,000 words.
Undo: restore the sections, `git branch golden origin/master`.

**open-waiting-branches** -- pipeline round, S. Each branch that waited during the flush gets
`pr-open.sh`, oldest first, at most 10 open at once. Done: the broker's file shows no waiting branch
without a pull request.

**step-5-acceptance** (#3447) -- agent, S, CP. Over the first 20 merged pull requests: median to All Checks
Pass within budget; 18 merged untouched; master green after each; one Dependabot pull request
auto-merged and built.

**quick-check-and-prepush** (#3448) -- agent, S, after `step-5-acceptance` (the live gate follows master,
and step 5's undo needs today's gate). `tools/check-quick.sh` and `check:quick` (merging section 6,
with `GIT_CONFIG_GLOBAL=/dev/null` for tests, SonarQube changed lines, and the real-GPU run with
`GRAPHTY_GPU_REQUIRE=nvidia`, the EGL path and the unset list when webgpu-graph-algorithms is
affected); `.husky/pre-push` down to LFS, secret scan and images. Done: `pnpm run check:quick`
under 6 min on a one-package change and runs the GPU tests on a webgpu change; under 10 s of
push-hook time. Undo: restore the hook.

**kept-tools-strip** (#3449) -- agent, M, after `step-5-acceptance`, for the same reason. The gate lane and
marks out of `test-slots.mjs`, the sync merge out of `branch-push.sh`, the gate-shard lane out of
`with-browser.sh`, the sync fields out of `branch-note.mjs`. Done: their tests pass; two local
vitest runs still share slots. Undo: revert.

### Step 5a: runner load (after step 5; owner, 2026-10-26)

Runners, not merging, are the bottleneck at about 76 merges a day, and more capacity is not
available for under about $1,000 a month (design section 7.1). The items cut work, in this order;
the full run stays first in line for runners. Each item's Proof gives its runner-minutes saved.

**cancel-superseded-master-builds** -- agent, S. ci.yml's `concurrency` makes a newer push replace a waiting
master build; a running one finishes (#3938) (push to master only; pull request, dispatch and
release.yml calls unchanged); the ci.yml comment and its tool test say so. In the same pull request,
`master-guard.mjs` treats a master build cancelled for a newer one as superseded, not red, and
`release-due.mjs` reads every merge since the last master build that finished, so a cancelled
build's `Fixes #N` or `Refs #N` still starts its restart. Needs: nothing. Done: two quick master
merges leave the older build cancelled with no red-master issue, the newer deployed to canary, and a
restart asked for by the cancelled merge started. Undo: revert.

**fewer-pushes-per-pr** (#3850) -- agent, S. On 2026-10-26 (07:00Z on, 244 pull request ci.yml
runs) 101 runs were cancelled, 99 of them by a newer push to the same branch, a median 6 minutes
later (38 within 5 minutes), after running a median 8 minutes (p90 42): about 1,800 cancelled
run-minutes a day. Two causes: `.husky/post-commit` (`tools/branch-push.sh`) pushed every commit,
so every commit on a branch with an open pull request started a run; and `tools/pr-open.sh` merged
`origin/master` into a branch that was only behind, one more push, though a pull request is tested
as merged with master and the required checks are not strict. So `branch-push.sh` does not push a
branch with an open pull request (the status broker's file when fresh, else one cached `gh pr list`;
unsure, it pushes) and says so, and `pr-open.sh` merges master only on a conflict or
`--merge-master`. Needs: nothing. Done: over a day, pull request runs cancelled by a newer push to
the same branch fall well below the 99 measured. Undo: revert.

**stop-unneeded-pr-captures** -- agent, S. A pull request's screenshot capture jobs that `All
Checks Pass` does not need stop once its verdict is in (today they run 15 to 25 minutes past it).
Needs: nothing. Done: on 5 pull requests no capture job runs past `All Checks Pass`. Undo: revert.

**old-capture-removal** (#3473, step 9) -- the largest single saving; no new work here, only its
order: it goes as soon as story-test parity holds for each project.

**selection-for-whole-shard-packages** -- agent, M. The packages whose pull requests still run whole
shards join `fileLevel` after a clean `test-select-mutate.mjs` run, as `file-level-selection` did for
the first ones. Needs: `file-level-selection`. Done: no `run:ci.yml:pr-<package>` budget key left.
Undo: drop the package from `fileLevel`.

**nx-cache-hit-rate** -- agent, S. Measure the nx remote build cache's hit rate per task on pull
requests from the `timings` rows, then fix the largest misses (inputs that change on every commit).
Needs: `nx-cache-worker`. Done: the hit rate is shown per task and the top three misses are fixed or
explained. Undo: revert.

**tools-docs-fast-path** -- agent, S. A change only to `tools/` (outside the selector's inputs) or
only to docs runs only the checks that read it, with no package build or test shard. Needs:
`light-check-workflow`. Done: a tools-only and a docs-only pull request each finish under 5 runner-
minutes with `All Checks Pass` green. Undo: revert.

**runner-minutes-per-merge** -- agent, S. The health dashboard shows runner-minutes per merged pull
request per day, split by kind (pull request run, master build, full run, other). Needs: the results
store's job rows; the dashboard is `design/ci/health-dashboard.md`. Done: the dashboard shows the last 14 days, and each item above can read its
saving from it. Undo: revert.

**merge-queue-batching-replay** -- agent, M, only if runners are still saturated after the items
above. Replay a day of merges through GitHub's native merge queue with merge groups, and measure
tests per batch, batch failure rate and bisect cost; the owner decides from the numbers. Mergify's
record (809 CI runs for 761 merges, 197 wasted) is why it is measured first. Needs:
`runner-minutes-per-merge`. Done: the measurements recorded in design section 7.1 and a decision on
#3418. Undo: none needed (a replay changes nothing).

Done 2026-10-27. The replay (2026-10-26) found 279 runner-minutes per merged pull request; 1.9% of
pull request runs failed on tests the pull request broke, 4.6% on a failure shared with master, 1%
on a flaky test and 16% on a cheap check. Running the full suite once saves 31% for 14 more minutes
of median time to merge; Mergify batches of 4 save 51% at an 83-minute median. The owner chose
neither for now. Mergify batching (batches of 4, at most 30 minutes' wait, cheap checks before queue
entry) is turned back on when, over 7 days, fewer than 5% of queue entries have a pull request run
that failed on tests the pull request touched, and the rule that lets unrelated failures through
(#3925) is live. Design section 7.1 has the numbers; #3951 puts the trigger rate on the health dashboard.

### Step 6: the full run every 6 hours, publishing nothing

**bisect-core** (#3450) -- agent, M. `tools/bisect-core.mjs` with tests: `verify.mjs`'s rules (channels
section 6). Done: three recorded verifications (a culprit, a flaky-before, no culprit) replay to
`verify.mjs`'s answers. Undo: delete.

**bisect-workflow** (#3451) -- agent, M, CP. `bisect.yml` (concurrency `bisect-<sha>`, the full run's load
conditions, at most 8 points, `max-parallel` sized so a bisect and a full run fit the runner
budget); a `files` input and per-point concurrency on gpu, hosts and macOS; T4 capped at 4 paid
hours after the local card; LLM limits of channels section 5. Needs: `bisect-core`. Done: a broken
scratch range names its culprit merge. Undo: revert.

**release-diff** (#3452) -- agent, S. `tools/release-diff.mjs` with its tests. Done: tests over two real
release pairs.

**full-run-calls** (#3453) -- agent, S, ci.yml. `reuse_build_run`, On shards after their Off twins (none
while `FEATURES` is empty), Performance outside the verdict, `release-due`. Needs:
`light-check-workflow` (b). Done: a dispatched `reuse_build_run` skips Build.

**full-run-release** (#3454) -- agent, M, CP, release.yml. Channels sections 5 and 13: `mode`, the catch-up
step, the store's candidate pick, `verdict` with the gate on green-clean, the red issue
(`priority:critical`) and one bisect dispatch; a restart runs only on a merge referencing the red
issue, its failing tests first; the full path reads quarantine from the store; new outcomes (red
full run, owner item) announced on the Release status issue and Pushover; the coverage, network
link, lifecycle and Cost Estimate Accuracy lanes. Needs: `full-run-calls`, `bisect-workflow`,
`release-diff`, `results-queries`, `light-check-workflow` (a). Done: a dispatched run posts a
verdict; a second dispatch on the same commit skips as judged; a merge not referencing the red issue
starts no restart. Undo: stop the scheduler.

**version-dry-run** (#3455) -- agent, S, release.yml, after `full-run-release`. `version-dry-run` against
`release-approvals.json`. Done: a seeded major without an entry fails the dry run. Undo: revert.

**llm-once-a-day** (#3456) -- agent, S, in `full-run-release`'s branch. The `llm` job runs when the ci.yml
lane is green and the store has no LLM run that UTC day, or on an owner `mode=full`; `spend:llm`
warns at $60. Sections 3, 9 and 11, channels section 5 and CLAUDE.md's `llm-regression` line
corrected. Done: two days of slots, exactly one LLM run a day. Undo: one condition.

**deploy-record-and-hosts** (#3457) -- agent, S. `deploy-pages.yml` records `site-<sha>` in the store;
`hosts.yml` loses its cron. Done: the store lists the last master build's site. Undo: revert.

**scheduler-updates** (#3458) -- agent, S, owned. `tools/release-scheduler/`: dispatch with `mode: full`;
the ancestry check with Contents: read (design 4); the daily "exactly one write deploy key, id
164375816" check that files `priority:critical` (design 6.3). Needs: `owner-cloudflare`,
`full-run-release`. Done: its tests; a seeded second deploy key files one issue. Undo: revert.

**autosave-compat-lane** (#3459) -- agent, M. A lifecycle test opening production's autosave and project
files with the candidate, and the reverse refusing without touching data (channels section 10).
Done: passes on master; a seeded format change fails it. Undo: remove it.

**step-6-acceptance** (#3460) -- agent, S, CP. 8 consecutive slots passed, or failed with a culprit whose
revert made the next pass; none skipped but as judged; during a slot with a bisect running, queue
time p95 under 10 minutes. Needs: `step-5-acceptance`.

### Step 7: nightly and npm `next`

**nightly-publish-environment** (#3461) -- agent, S, CP, lands alone first. `publish` keeps `environment:
release` and adds `--tag next` for the nightly path; `pnpm install --frozen-lockfile
--ignore-scripts`; `land` pushes `site-<sha>` and `channel/nightly`. `mode: legacy` keeps
publishing `latest` from the same `release` job behind its `production` approval job, so the
binding below does not break it. Needs: `step-6-acceptance`, `step-5-acceptance`. Done: a release
dry run under `--ignore-scripts` succeeds. Undo: revert.

**site-deploy-workflow** (#3462) -- agent, S. `tools/channel/site-deploy.yml` (the site repositories'
`deploy.yml`: check the asset against `deployed.json`, deploy, report kind `deploy`) and
`graphty/sites/nightly.json`. Done: a wrong-hash dry run refuses. Undo: revert.

**owner-site-deploy-commit** -- owner, S, after `site-deploy-workflow` merges. Commit its
`deploy.yml` to graphty-nightly and graphty-site; set the custom domain nightly.graphty.app on
graphty-nightly and enforce HTTPS. Done: a dry dispatch on graphty-nightly runs.

**nightly-site** (#1020) -- agent, M, CP. release.yml's `site` job (prerelease, tarball and `channel.json`,
sha256 to the store, `deployed.json` to graphty-nightly, wait for the report), `land` and `publish`
on for `next`, the `age:nightly` stall alarm, announcements of a promoted nightly; a nightly
promotion waits while a publish hold is open. Needs: `nightly-publish-environment`,
`site-deploy-workflow`, `owner-site-deploy-commit`. Done: the next slot publishes `next`, serves
nightly.graphty.app with the candidate's stamp and hash; with a seeded publish hold the promotion
waits. Undo: skip the promote job.

**owner-npm-bind** -- owner, S, CP (item 8), right after `nightly-site` merges and before the next
6-hour slot. Environment `release` on each trusted publisher. The first nightly publishes before the
binding (a publisher with no environment accepts any), so every publisher is used within hours of
its edit and none can expire; a refused publish is a publish hold, cleared with `gh run rerun <run
id> --failed`. Done: the next `next` publish succeeds from `release`.

**nightly-approval** (#3463) -- agent, M. The review page and server (not `trusted/`): offer the
candidate, decisions by hash; Finish opens the accept-only pull request; live via `tools/live.sh
visual-review`. Merged as #3653; the resume it named is `nightly-resume`. Needs: `nightly-site`.

Order below: the smallest piece that unblocks nightly first. Each is part of #3741; those that
change release.yml are owned.

**nightly-resume** (#3741) -- agent, M, CP. `mode: promote-nightly` (design section 5): refuse unless
the approval (the accept pull request's head) is the candidate plus accept-only commits and the
candidate's latest verdict is green-images; gate on its `visual-final-*` with `--head <approval>`;
version, land (with the version-only `release-diff` of the master merge), publish, site on the
approval; store `approved`; `release-due` dispatches it on an accept merge naming the held candidate
(or any green-images one while nothing is held), and every full slot catches up on one. Needs:
`nightly-site`. Done: an approved green-images run promotes to `next` and nightly.graphty.app; a
second dispatch, or one for a red run, does nothing. Undo: revert; candidates wait as today.

**same-commit-rerun** (#3741) -- agent, M. The `recapture` job and `visual-final-*`,
`release-rerun.yml` (absorbing `gpu-rerun-on-runner-loss.yml`; modes and jobs as design section 3),
no red issue or bisect on attempt 1, `release-rerun.yml` filing when it starts no attempt 2, "Flaky in
full run" filing in `full-run.mjs verdict`. First check on a scratch run that `--failed` re-runs a
failed job inside the called ci.yml and its dependents. Needs: none. Done: a seeded one-time lane
failure and a seeded one-time story difference each end green with one flaky issue; a consistent
failure ends red with one issue and one bisect; a failed publish is never re-run. Undo: revert.

**candidate-hold** (#3741) -- agent, M. `channel/candidate`, the store's `candidate` table read by
`release-state`, `offered`, `candidates.mjs` and the stall alarm; `pick()` serves the hold first;
`offeredCandidate()` offers only its head, once green-images; `mode: abandon`; the hold issue;
channels section 7. Needs: `nightly-resume`, `same-commit-rerun`, the owner adding
`channel/candidate` to the deploy-key ruleset. Done: a seeded red C stays held across two master
slots; abandon frees the next slot. Undo: delete the branch; `pick()` takes the newest again.

**candidate-fix-forward** (#3741) -- agent, M. `tools/channel/candidate-fix.mjs` with tests
(the fix commit, the newer-master and partial-fix refusals, a conflict), release.yml's
`candidate_fix` job before every full, restart and candidate pick, `mode: candidate` (input
`fix_pr`, from `release-due` on a merge that references the hold issue), the run's own build and
`site-<H>` (`deploy-pages.yml` called). First version (owner, 2026-10-26): the run on H re-tests
H whole, every lane and the whole screenshot capture, about 1 to 1.5 hours per fix, so fix forward
works now instead of after #3592 and #3472. The narrower re-test (the affected shards and lanes,
the `recapture` job shooting the affected Storybooks whole and carrying the rest over) is built
behind the repository variable `CANDIDATE_RETEST=affected`, off until those land; switching it on
changes nothing for a fix author. Fix authors use `worktree-new.sh` from
`origin/channel/candidate` and `pr-open.sh` unchanged. Needs: `candidate-hold`. Done: a scratch
fix from C merges into master and `channel/candidate`, the run on H re-tests it whole and
promotes (or waits for the owner's screenshot approval and then promotes); a fix made from newer
master is refused with a hold-issue comment. Undo: revert; a hold waits for abandon.
Follow-up, after #3592 and #3472: set `CANDIDATE_RETEST=affected` and check one fix forward's run.

**candidate-fix-acceptance** (#3741) -- agent, S. One held candidate promoted after a fix forward,
recorded on #3741. Needs: `candidate-fix-forward`. Not a step-7 or step-8 gate.

**immutable-release-probe** (#3464) -- agent, S. On a scratch repository with immutable releases on, check
that `gh release edit --prerelease` and `--latest` work; report on #3418.

**owner-immutable-releases** -- owner, S, after `immutable-release-probe` reports they work.

**step-7-acceptance** (#3465) -- agent, S, CP. Migration section 3's step-7 checks for one automatic and one
approved promotion; CLAUDE.md "Release versioning" and "A new package's first npm publish" rewritten.

### Step 8: production promotion and the domain move

**promote-workflow** (#3267) -- agent, M, CP. `promote.yml` (channels section 8) and
`graphty/sites/production.json`. Can be built and dry-run during step 6; merges after
`step-7-acceptance`. Done: a dry run waits for the owner and moves nothing; it refuses a nightly that
was not clean or approved, a hash mismatch, an open publish hold, a version missing on npm, and a
rollback across an autosave or project format change; `config_only` and `channel: nightly` each work.
Undo: do not dispatch it.

**owner-dist-tag-token** -- owner, S, CP, just before `promote-workflow`'s first real dispatch.
`NPM_DIST_TAG_TOKEN` (granular, write on `@graphty`, bypass 2FA) in `production` and
`NPM_DIST_TAG_TOKEN_EXPIRES`. Done: a no-op `npm dist-tag add` from the workflow succeeds.

**dataset-overlay-and-site-check** (#3466) -- agent, M. `tools/dataset-overlay.mjs` with its test over two
real `build-hosted.mjs` outputs, and `tools/check-site.mjs` (file list and hashes, every page and
dataset 200 over HTTPS, build stamp). Done: both tests pass. Undo: revert.

**owner-domain-swap** -- owner, S, CP (item 10), after the first promotion filled graphty-site and
`check-site.mjs` passed on it. Undo: swap back.

**canary-deploy** (#3467) -- agent, S, CP, after `owner-domain-swap`. `deploy-pages.yml` deploys every green
master build to graphty-monorepo's Pages with domain canary.graphty.app (the version-merge rule
goes); `mode: legacy` removed, `promote.yml` being the urgent path now. Done: after the next master
build canary's stamp equals master's tip. Undo: revert.

**links-against-canary** (#3468) -- agent, S. `check-links.sh` resolves `https://graphty.app` links against
canary, and a 404 for a path the newest nightly serves reads "pending promotion"; `links-weekly.yml`
likewise. Needs: `canary-deploy`. Done: a seeded link to a nightly-only page reports "pending
promotion". Undo: revert.

**step-8-acceptance** (#3469) -- agent, S, CP. Migration section 3's step-8 checks; CLAUDE.md "GitHub Pages
URLs" and "Build System" and `graph-samples/CLAUDE.md`'s dataset paragraph rewritten.

### Step 9: stories as tests, per project (after step 6, off the critical path)

**compact-mantine-storybook-9** (#3470) -- agent, M, product, from day 0. The upgrade, its own pull request,
`Figma-Approved:` if a picture moves.

**story-test-harness** (#3471) -- agent, M, after `story-parity-spike`. `@graphty/visual-review/vitest` and
`visual-review/capture/story-test.mjs`, `merge-results`, production semantics (stories sections 3
and 4). Done: one graphty story's PNG byte-equals the old capture's. Undo: revert.

**stories-switch-project** (#3472) -- agent, S each, in parallel: graphty, graphty-element, compact-mantine
(after its Storybook 9 upgrade), algorithms and layout, cytoscape-extensions, graph-io-fidelity. Its
owned `.storybook/vitest.setup.*`, both captures in each full run, `visual-review parity`; a switched
project's Stories job fails a pull request that adds a `FEATURES` row and changes an existing story's
image (settled 26). Done: two zero-difference runs (or the owner's re-baseline). The `visual` entry
removals go in one batch pull request. Undo: put the entry back.

**owner-rebaseline** -- owner, M, only on "no parity": one Finish per project; any change to
`gate.mjs` or `approval.mjs` is his or authorized on the issue.

**old-capture-removal** (#3473) -- agent, M, after the last switch. Stories section 11's list; with no byte
parity from the spike, one built-Storybook capture stays in the full run. CLAUDE.md "Visual review"
rewritten. Done: a full run green without it. Undo: revert.

### Features track (product work, beside steps 5 to 8)

**features-module** (#3474) -- agent, two pull requests. (a) M, product: features section 3's module in
graphty-element, the API report, docs and README stating the `@experimental` promise. Additive, so
no owner approval. (b) S, owned: the real `tools/check-features.mjs` replacing the stub (an
`@experimental` export must name a `FEATURES` row; the element reads no host URL, storage or
environment). Done: the API report only adds; unknown ids never throw; an orphan `@experimental`
export fails the check.

**owner-experimental-promise** -- owner, S, any time. Confirm or change on #3418 what
`@experimental` promises; the round asks once, with an `ACTION NEEDED` line, when (a) is ready.

**app-site-config** (#3475) -- agent, S, before step 7. The app fetches `site.json` first (missing or invalid
= every experiment off), applies `featuresFromUrl(location.href)`, shows the site name; the per-site
build branches in `sentry.ts` and `open.ts` go. Done: real-element tests with and without
`site.json`.

**on-configuration** (#3476) -- agent, S, with the first `FEATURES` row. A setup file calling
`setDefaultFeatures(["all"])`, On shards, element stories against Off baselines. Done: the first
flag's pull request changes no screenshot and no test.

### Step 10: deletion

**deletion** (#3477) -- agent, three owner-reviewed pull requests, each undone by `git revert -m 1`. Needs:
steps 5 to 8 accepted, 7 days without undo, #3318 closed, `audit-fix`. (a) Whole-file deletions of
section 15's list, `test-quarantine.mjs` and `tools/test-quarantine.json` included. (b) The
workflow-part removals (ci.yml's Mergify, draft and verify parts). (c) The instructions: the
remaining CLAUDE.md rows, the package CLAUDE.md references (algorithms, layout, graph-format,
graph-samples, webgpu-graph-algorithms, githerd), the pipeline-round skill trimmed; root CLAUDE.md
reaches 9,000 words. Done: lint, knip and a full run green after each; migration section 3's grep
finds nothing outside `design/` and `.claudehistory/`; about 12,300 pipeline lines deleted against at
most 6,450 added, counted as migration section 4 counts them.

**local-cleanup** -- pipeline round, S, after `deletion` merges. Each tip logged to
`tmp/pruned-branches.log`, then the golden branches, tag `golden-good`, the golden, gate, land and
githerd worktrees, `githerd-dev` and its MCP registration, and the four `tmp/` state folders removed.
Done: `git ls-remote origin 'golden*'` is empty; `git worktree list` names none. Undo: recreate the
branches from the log.

## 5. Branches

One pull request each unless marked; lines are estimated changed lines with tests; "owned" means the
owner reviews.

- Step 0, through golden: `perf/ci-build-sentry-after-build` (sentry-build-fix, 120, owned);
  `fix/3318-t4-graph` (t4-graph-fix, 60); `ci/3418-flush-guard` (flush-stop-landing, 40);
  `ci/3418-freeze-graphty-app` (freeze-graphty-app, 40). After the flush, into master:
  `fix/3393-audit` (audit-fix, 60); `ci/3418-main-follows-master` (30, owned).
- Step 2: `ci/3418-results-worker` (two pull requests, 250 and 250); `ci/3418-results-reporter`
  (350); `ci/3418-ci-budgets` (durations-timings, 300); `ci/3418-results-wiring` (results-wiring
  and cache-hygiene, 250); `ci/3418-results-queries` (350). All owned.
- Step 3, all owned: `ci/3418-release-shadow` (250, first); `ci/3418-agent-identity` (300, second);
  `ci/3418-test-integrity` (400); `ci/3418-codeowners` (150); `ci/3418-pr-integrity` (350).
- Step 4: `ci/3418-select-mutate-names` (40); `ci/3418-file-level` (the clean packages and
  affected-input-fixes, 150, owned), plus `ci/3418-slice-<package>` for any that is not clean;
  `ci/3418-bin-packing` (250, owned); `ci/3418-story-parity-spike` (250).
- Step 5: `ci/3418-nx-cache` (150, owned); `ci/3418-light-check-plan` (350, owned, merges the
  bin-packing branch); `ci/3418-light-check-a`, `-b`, `-c` (250, 100, 200, owned);
  `ci/3418-store-reads` (350, owned); `ci/3418-pr-open` (250, owned); `ci/3418-skill-test` (100,
  owned); `ci/3418-shipping-instructions` (docs, owned, last); then `ci/3418-quick-check` (150,
  owned) and `ci/3418-strip-gate-lanes` (250).
- Step 6: `ci/3418-bisect-core` (400, owned); `ci/3418-bisect-workflow` (350, owned);
  `ci/3418-release-diff` (150, owned); `ci/3418-full-run-calls` (100, owned); `ci/3418-full-run`
  (full-run-release and llm-once-a-day, 350, owned); `ci/3418-version-dry-run` (100, owned);
  `ci/3418-deploy-record` (60, owned); `ci/3418-scheduler` (120, owned);
  `test/3418-autosave-compat` (250).
- Step 7: `ci/3418-publish-environment` (60, owned, first); `ci/3418-site-deploy` (120, owned);
  `ci/3418-nightly-site` (350, owned); `ci/3418-nightly-approval` (350).
- Step 8: `ci/3418-promote` (350, owned); `ci/3418-dataset-overlay` (250, owned);
  `ci/3418-canary-deploy` (60, owned); `ci/3418-links-canary` (80, owned).
- Step 9: `feat/3418-compact-mantine-storybook-9` (product); `ci/3418-story-test-harness` (400,
  owned); `ci/3418-stories-<project>` x6 (50 each, owned) and one batch removal of their `visual`
  entries; `ci/3418-old-capture-removal` (-250, owned).
- Features: `feat/3418-features-module` (350, product); `ci/3418-check-features` (80, owned);
  `feat/3418-app-site-config` (150); `feat/3418-on-configuration` (100).
- Step 10: `ci/3418-delete-files`, `ci/3418-delete-workflow-parts`, `ci/3418-delete-instructions`
  (together about -12,000, owned).

## Review notes

Three reviews of the first draft (ordering, completeness, size and parallelism). Every finding was
either fixed in the items above or is answered here.

- **Branches started from `golden-verified` before the flush would carry golden's commits into
  their pull requests.** They would not once the flush ships: `golden-verified` equals
  `origin/golden`, which is then an ancestor of master, so such a branch's pull request shows only
  its own commits. Section 2 still has every branch merge `origin/master` before opening.
- **"Change 1 overrides a binding owner decision."** Design section 9 records the once-per-candidate
  decision and names once a day as the one-line fallback when spend matters; the owner's $60
  ceiling (2026-10-12) still stands and once per candidate is up to $113. The session takes the
  fallback, posts it on #3418, and the owner reverses it with one line. Kept.
- **"Change 3 decides a one-way door."** The default is the weakest promise ("may change or
  disappear in a minor release"). A weaker promise can later be strengthened without breaking
  anyone; only withdrawing a stronger one would break consumers. So stating it is reversible in the
  direction that matters. Kept, with `owner-experimental-promise` asking him once.
- **"Change 2 weakens a security control."** The separation that matters is that agent tool calls
  run as the agent account; the environment variables, the hook and the servherd restarts give that.
  What it does not stop, a determined agent reading the owner's files on purpose, the design's
  residual-risk note already admits. The owner can add the passphrase hardening at any time. Kept,
  with the full servherd list and the design edits named in `agent-env-and-guard`.
- **The legacy release and the `release` binding.** Resolved by publishing from one `release` job
  behind a `production` approval job, rather than a second publish job in `production`.
  graphty.app moves only on a version merge, so legacy needs no deploy job of its own.
- **The line estimates sum past the 6,450-line cap.** The cap counts pipeline code in `tools/`,
  `.github/` and `.husky/` without tests (migration section 4: "2,774 + tests" on the deleted side),
  while section 5's estimates include tests. Each owned pull request's Proof reports its component
  against its cap, and `deletion` checks the total.
- **Pinning the live gate during step 5.** Not possible: the push queue moves `.worktrees/gate-live`
  to origin/master before each push whatever it holds. So the two gate-changing items merge after
  `step-5-acceptance` instead.
