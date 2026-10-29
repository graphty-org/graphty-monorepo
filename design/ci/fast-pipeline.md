# Fast pipeline: from development branch to graphty.app and npm

Status: Accepted, 2026-10-21, with the owner's decisions in section 9 (decision record
`design/decisions/2026-10-21-fast-pipeline-adopted.md`). Issue #3262. It is built in the order of
section 10; until each piece lands, the tools follow `design/ci/golden-local.md`.

Partly superseded on 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the gate becomes a
light gate with no tests, and verification runs the full suite in GitHub CI instead of on this machine.
Sections 3, 4.3 (testing), 4.5, 7 (the first row), 8 (the last row), 9 (decision 8) and 10 (step 3) are
marked below; the rest stands.

This document describes how a change in graphty-monorepo should travel from a development branch
to the graphty.app web site and to npm. It keeps what works in the current landing design and the
release train, and changes what makes large work take days to land.

It replaces these parts of `design/ci/golden-local.md`: the "full local gate on every
landing" row of 3.1, and sections 4.2 (landing), 4.3 (screenshot review at the cut), 4.7 (what CI
is for), 4.8 (the lock), the landing-failure rows of 4.13, and 4.14's cut selection and one-round
grace before a revert; the rest of 4.14 (`golden-cut`, the draft cut pull request, `ship`) stays.
It replaces `design/ci/ci-cd-plan.md` except sections 7 (where the GPU, macOS and Windows lanes run), 9 (flaky tests), 10 and 11 (the release train), 12 (keeping master
green) and 13 (runner capacity and API budget), which stay in force.

Words used throughout:

- **golden** is the local integration branch every change lands in before master.
- **landing** is merging a finished branch into golden with `tools/land.mjs`.
- **the cut** is a golden commit chosen for master, opened as a pull request (`golden-cut`), whose
  screenshots the owner approves and which GitHub CI checks once before it merges.
- **the gate** is `tools/prepush.sh`, which runs CI's own test shard commands on this machine.
- **the pipeline round** is the `/pipeline-round` skill: an agent session that owns landing
  failures, reverts and cuts, and watches verification (section 4.3).
- **the release train** is `release.yml`, which tests master's tip in full every 6 hours and
  publishes to npm when everything passes.
- **Hosts** is `hosts.yml`, the macOS and Windows lane the release train runs.

## 1. Why change

Big features take days to land. The push log, gate logs, preview status files and GitHub runs from
2026-10-15 to 2026-10-21 show where the time goes:

- **The landing gate is long and serial.** Every landing holds one machine-wide lock while the full
  gate runs: median 34 minutes, up to 102. About 20 landings a day queue for it. Only 47% of golden
  landing pushes passed, and each failure pays the whole gate again, against a golden that has moved.
- **The same code is tested again and again.** A branch's gated push (median 31 minutes, plus a
  median 27-minute wait for one of three gate slots) is not reused by its landing, because passes are
  stored by branch name, not by input. The cut runs the gate again (median 78), then GitHub CI (24).
- **CI on the cut fails on what the local gate missed:** three of five cut runs on 2026-10-20 and
  2026-10-21, each costing a fix and another 24 to 45-minute cycle.
- **Screenshot approvals repeat** when two branches that each changed screenshots land together.
- **About a fifth of golden gate failures were the machine's** (lost DNS, stale `node_modules`).

GitHub Actions runners are not the bottleneck: waits are 2 to 4 seconds, and the heaviest run (a
release) uses at most 29 of 60 Linux runners. The bottleneck is this machine: the landing lock, the
gate slots and the one-at-a-time screenshot preview.

## 2. What Anthropic does

- **Infrastructure, not coding, is the limit.** Merges in Anthropic's monorepo grew from about 2,500
  to over 30,000 a day, and "we haven't been able to effectively replicate the industry standard of
  a global repository lock on the merge queue, so instead, we've invested in post-merge and
  pre-deploy automated testing", with automated bisect and revert.
  (https://www.anthropic.com/research/redesigning-source-control)
- **At small scale they keep a merge queue.** The Claude Code repository's queue "re-runs every
  check against main with the change applied". Before a pull request exists the agent runs tests, a
  build and screenshots, and a fresh-context agent reviews the diff. Review is tiered by risk:
  low-risk changes need no person once checks pass, "but only for trusted authors"; CI workflow files
  and sensitive paths always need a person; "an approval covers one commit"; at most three rounds.
  (https://claude.dev/blog/solving-code-review-at-anthropic/, a Claude Code team post whose domain
  was not independently confirmed as Anthropic's; nothing below rests on it alone.)
- **Deterministic test impact analysis** picks each pull request's tests from past results and the
  packages touched; "when selection lagged, bad merges spread failures".
  (https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic)
- **A fast sample, then a stricter CI.** In the C compiler project each agent ran a fixed 1% or 10%
  sample; a stricter CI was added "once new commits kept breaking working features".
  (https://www.anthropic.com/engineering/building-c-compiler)
- **Checks the agent cannot skip.** A Stop hook runs the check deterministically; agents may not
  remove or edit tests; features are verified end to end as a user uses them.
  (https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)
- **Claude is first responder for CI failures.** (https://claude.com/resources/articles/ai-ci-cd-on-call)
- **Release on green with no release pull request in some public repositories**
  (claude-agent-sdk-python, claude-code-action); anthropic-sdk-typescript keeps a standing
  release-please pull request. Flags turn off without a deploy.

**What this means for us.** At about 20 landings a day graphty is at the scale where Anthropic
still uses a merge queue, not the scale where it gave up the lock. So post-merge testing here is
justified by our own numbers (a 34 to 102-minute serial gate, 47% passing), not as Anthropic's
practice. What this design builds is a cut-down merge queue: each landing runs its selected checks
against the latest golden under a short lock, and the full checks run after landing, before anything
reaches master. Our feature switches are weaker than Anthropic's flags, because a graphty-element
option is published API (section 4.1). Scion, their server-side source control, does not transfer:
we keep git and one machine, so the lock gets short rather than going away.

## 3. The design in one paragraph

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the verification run is a full `ci.yml` run in GitHub CI on golden's newest commit, not the full local gate; the local gate runs no tests. The GPU tests and SonarQube stay in the local gate.

A development branch is small, tested by a fast check that runs only the tests its change can
affect, reviewed by a fresh-context agent, and has its screenshots captured and signed by the owner
on the branch. Landing takes the lock only to confirm golden has not moved and to push, reusing the
fast check's pass on the identical tree. Each landing starts a verification run of the full gate, the
GPU tests, the screenshots and SonarQube on golden's newest commit; the pipeline round reverts a
landing that broke it. A cut takes the newest verified commit; GitHub CI checks it once, and the
owner approves only screenshots no branch signature covers. A green master build deploys to
beta.graphty.app, and graphty.app changes only when the owner promotes a beta build. The release
train is unchanged.

## 4. The stages

### 4.1 Development branch

**What happens.** An agent works in its own worktree on a branch tied to an issue, as today. Big
features land in pieces of about a day each. Unfinished work hides behind a switch only where that
creates no public contract: in the app, or in graphty-element as an option that is not exported or
is marked `@internal` and kept out of the API report and docs. An exported option must be final in
name and shape before it lands, because renaming or removing it later is a breaking change.

**Testing.** The fast check (section 5) commits a merge of `origin/golden` into the branch, then runs
the gate's source-only checks (formatting, offline links, workflow and config checks, SonarQube on
changed lines), the affected build, lint, type check and API report, and the selected tests. Target:
under 10 minutes. `land.mjs` refuses a branch with no fast-check pass on its exact tree, which plays
the part of Anthropic's Stop hook.

**Review.** A fresh-context subagent reviews the diff against golden for correctness, the
architectural rules (element neutrality, no app workarounds, style through layers, no unfinished
public options) and size; at most three rounds. It never approves screenshots. Anthropic's voting
reviewers and separate security review are not adopted: the full gate and CI still run before
master. In place of "CI workflow files always need a person", a branch that changes
`.github/workflows/`, `visual-review/trusted/`, `visual-review/capture/`, `tools/prepush*`,
`tools/push-queue.sh` or `tools/land.mjs` runs the full gate before landing (no step waits on the
owner).

### 4.2 Landing into golden

1. Without the lock: fetch, run the fast check (reusing any pass on the same tree), and record
   golden's tip as the tested base. A conflict exits with code 2 as today, for the branch's session
   to resolve.
2. Take the lock and fetch. If golden's tip is still the base, merge the branch with `--no-ff`
   ("land: <branch>"), check that the tree equals the one the fast check passed, push, release.
3. If golden moved, release the lock and return to step 1. Shards whose inputs did not change are
   reused, so a retry costs only what changed.
4. After three failed attempts the landing holds the lock through its fast check, so a busy golden
   cannot starve a branch.

**Why the lock is short.** The push still runs the pre-push hook. Today its reuse is keyed by HEAD,
which a land commit always changes. Keyed by tree instead (section 5.4), the landing push reuses the
branch's pass, and a push whose every check already passed takes no gate slot. The branch's own
pushes already uploaded the LFS objects. What remains under the lock is a fetch, a merge and a push.
Lock waits and hold times are logged.

**On failure.** Golden is unchanged. A push lost to the network resets local golden to the remote
tip, releases the lock and returns to step 2; the hook still runs, cheaply. A gate refusal the
machine caused uses `PUSH_QUEUE_RETRY=1`, as today. Never `--no-verify`. One lock, signed land
commits, never copying commits, merged branches kept and the owner's go for breaking commits all
stay.

### 4.3 Golden after landing: verification

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the "Testing" and "How long" paragraphs. `verify.mjs` keeps this state machine, but its gate pushes the commit to `golden-candidate` and reads the result of a full CI run (about 31 minutes), instead of running `tools/prepush.sh` with `PREPUSH_ALL=1` here. Confirm and bisect still run the failing files here first; a failure this machine cannot reproduce is confirmed and bisected in CI.

**What happens.** After a landing, `land.mjs` starts a verification run in the background, as it
starts the screenshot preview today. No standing process, no timer. A run takes golden's newest
commit and keeps going until `golden-verified` reaches golden's tip. No wakeup may be lost between
a run that is finishing and a landing that is pushing, so both decide under one small verify lock
(a lock file beside the state file, held for milliseconds, separate from the landing lock):

- A landing, after its push, takes the verify lock, records its new tip as the `wanted` commit in
  the state file, and starts a run only if no live run is recorded. Then it releases the lock.
- A run, when it finishes a commit, takes the verify lock and re-reads `wanted` and golden's tip.
  If either is past what it just verified, it continues with the newer commit, still recorded as
  the live run. Only when nothing newer is wanted does it mark itself ended and release the lock.

So a landing either sees a live run that will re-read `wanted` before ending, or sees no live run
and starts one.

**State file.** Verification keeps its state in one durable file, `tmp/golden/verify.json` in the
main checkout: the range under test (last verified commit to the commit being verified), the
`wanted` commit, the run's process id and that process's start time (a process id alone can be
reused), its status (running, passed, failed, bisecting, handling, handled), the bisect's progress
(the points tested and their results) and, once found, the culprit landing. It is written before
each step starts and after each step ends, so a run killed at any point leaves a file that says
where it stopped. Every writer (the run, its continuation, the landing, the pipeline round) holds
the verify lock for its whole read, change and write, and writes a temporary file and renames it
over the old one, so no update is lost and no reader sees half a file.

**Testing.** `tools/prepush.sh` with `PREPUSH_ALL=1` on the packages affected since master, so every
shard runs, including graphty-element's eleven browser and Storybook shards the gate today skips
unless a test file changed; the local NVIDIA run of webgpu-graph-algorithms under the GPU slot; a
screenshot preview of every affected project; SonarQube on lines changed since master; and the
dry-run script (section 4.4) when the range includes a long-lived branch. Only CI checks the
`graphty-element-lifecycle` shard (local policy "never"), cost-estimate accuracy, the network half of
the link check and the docs build. Verification takes gate slots ahead of fast checks. The landing log
is the authoritative result; a commit status on golden is best effort.

**How long.** About today's golden gate (34 to 100 minutes) plus 7 to 55 minutes of capture, beside
new landings instead of in front of them.

**On failure.** Verification bisects over the landing merge commits since the last verified commit
(first parent only), rerunning only the failing shard or test file, several points at once when
slots are free, and records each point in the state file. The pipeline round reverts the culprit at
once with `land.mjs revert`, with no one-round grace because branches merge golden, and comments on
its issue and on the issues of open branches that contain it (`git branch -r --contains`). A
failure needing two landings reverts the later one. A failure is reproduced and explained before
anything is called a flake.

**The pipeline round watches verification.** Verification finds and records; the pipeline round
acts. Each round reads the state file and:

- restarts a run whose status is running but whose process is gone (no process with that id and
  start time), from the recorded range;
- starts a run when `golden-verified` is behind golden's tip and no live run is recorded, whatever
  the last status says;
- resumes a bisect that stopped, from the points already recorded, rather than starting over;
- acts on a result: first claims it (status `handling` with its session id, written under the
  verify lock), then reverts the culprit and comments on the issues, then marks it `handled`. A
  round that finds a result already claimed by a live session leaves it alone; a claim whose
  session is gone is taken over, after checking what the earlier session already did (the revert
  commit on golden, the issue comments);
- keeps a lessons file of resolved failure modes, like Anthropic's on-call `lessons.md`: each entry
  names the symptom, how it was told apart from a real failure, and the fix. A round reads it before
  diagnosing, and adds an entry whenever it resolves a failure mode the file did not already hold.

**How fast a broken golden is reverted.** The loop that runs the pipeline round wakes as soon as the
state file records a failure (it watches the file), with a 30-minute wake as the fallback. So a
broken golden is reverted within minutes of verification naming the culprit, not at the next
half-hour round. This is a session watching a file, not a daemon: when no session runs the loop,
nothing acts, as today.

**While golden is red.** Branches merge `golden-verified`, a ref verification moves forward, rather
than golden's tip. A fast check that fails only in tests the branch's diff did not select, and that
also fails on golden alone, reports "golden is broken at <commit>"; the pipeline round treats it as
golden's failure, never the branch's. Landings whose selection includes the red shard wait.

**Re-landing a reverted branch.** `land.mjs` finds the branch's last revert in the full history,
including what reached master, and reverts it before merging. Today it does so only for reverts
master lacks.

**What it blocks.** Only cuts.

### 4.4 Long-lived branches: the dry-run script

**What it is.** The design studio's "dry run" today is agents walking every study task in the graphty
app through a Playwright tool (`design/ui/studio/tool/real.mjs`). This design turns it into a
checked-in Playwright script with no model: a list of features, each a route (the clicks, keys and
uploads a user makes, from the start page, never by URL) and outcome checks (the nodes are colored,
the file loaded with the right node count) read through graphty-element's public API or the
accessibility tree. Outcome checks matter: `design/graphty-element/the-testing-blind-spot.md` found
131 story tests that assert nothing.

**Where it runs.** Only on this machine's NVIDIA card (GitHub runners have no GPU, and this machine
is never a CI runner), with the Chromium flags `real.mjs` proved. It checks that the renderer is the
NVIDIA card and fails loudly otherwise, never captures screenshots, holds the one GPU slot
(`tools/test-slots.mjs --gpu`) and takes browsers through the shared cap of four
(`tmp/with-browser.sh`, which this work checks in).

**How long.** Walks replay in 17 to 31 seconds, so about 90 routes take 25 to 46 minutes on one
browser, 6 to 12 with all four. More browsers means raising the cap for everyone, the owner's call.

**When.** Before landing a branch older than two days or marked long-lived in its issue, and in
verification of a range containing one. Never on a schedule.

**On failure.** A failing route blocks the landing. Anthropic forbids agents to edit tests; we depart
only as far as intended UI changes require. The author may re-record route steps, but a fast-check
script refuses any branch that removes or changes an existing outcome check. Changing one takes its
own branch from a different session, holding only that change and its reason. Each defect the
studio finds becomes a route. The script lives under `graphty/`; a feature added to the app adds a
route.

### 4.5 The cut and GitHub CI

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the cut and cut-fix gates are light (no tests); a cut-fix is verified by a CI run. Ship's CI run is unchanged.

**What happens.** `land.mjs cut` points `golden-cut` at the newest verified commit whose preview has
no unstable or failed images, without re-running the gate. `land.mjs cut <commit>` still cuts a named
commit, running the full gate on it as `cut-fix` does, so golden never blocks shipping. A `cut-fix`
starts verification on `golden-cut`, and `ship` refuses until its tip is verified.

**CI.** `land.mjs ship` marks the pull request ready; ci.yml runs once (about 24 minutes, 220
runner-minutes). It stays: it found real defects on three of the last five cuts. Most such failures
move into verification, which runs CI's shard commands. When CI still fails, the pipeline round
reproduces and fixes it, our equivalent of Anthropic's CI auto-fix. After three failed rounds the cut
drops back to the previous verified commit and the offending landing is reverted.

**Runner capacity.** The owner asked whether to reduce CI to avoid a runner bottleneck. Not today: a
cut and a release together need about 52 of 60 Linux runners, at 4 to 6 cuts and 4 release attempts
a day. The real limit is macOS: a release uses 4 of the 5 macOS runners, so a nightly or
pull-request Hosts run overlapping it queues. Keep macOS and Windows work on the release train, and
revisit if queue time exceeds 10 minutes.

### 4.6 Master and beta.graphty.app

- Every green master build publishes the whole site (app, docs, Storybooks) to **beta.graphty.app**,
  served by GitHub Pages from a new graphty-org repository, `graphty-beta`, through a Pages
  artifact, not by committing the site. The last 30 builds are kept as release assets named by source
  commit. The owner adds a CNAME record for `beta.graphty.app` to `graphty-org.github.io` and
  verifies the domain in the organization's settings.
- **Promotion** is a workflow the owner runs by hand: it deploys one beta build to graphty.app.
  Rollback is promoting an earlier build. Nothing promotes automatically.
- **Hosted data is the exception.** The datasets graph-samples and cytoscape-extensions download
  (`https://graphty.app/data/graph-samples/v1/`) are append-only, so every green master build
  publishes new files there. Early is harmless, and neither the beta app nor a new npm release ever
  names a missing file.
- **How graphty.app is assembled.** graphty.app is deployed with a Pages artifact
  (`actions/upload-pages-artifact`, `actions/deploy-pages`), which replaces the whole site at once,
  so data cannot be added on its own. Every graphty.app deploy, a promotion or a green master build,
  therefore assembles the same way: the promoted beta build (its release asset in `graphty-beta`)
  with its data directory replaced by the data directory of the current master build. The promoted
  build is named by a pointer, the variable `PROMOTED_BUILD` (the source commit) on the
  graphty-monorepo repository, which only the promotion workflow writes. A master build deploys
  graphty.app only when its data directory differs from the deployed one, and never changes which
  build is promoted, so unpromoted docs and app never reach graphty.app. The promoted build's asset
  is exempt from the keep-the-last-30 cleanup.

The link check resolves graphty.app links against the site the build assembles, which is what
promotion publishes. Between a release and the next promotion, the docs describe the previous npm
versions (section 9).

### 4.7 The npm release train

Unchanged (CLAUDE.md "Release versioning"): every 6 hours, the full CI suite, the T4 GPU lane,
Hosts, the macOS work-protection lane, the production audit and the LLM regression tests on master's
tip; publish only when all pass. A red lane holds every package because they depend on each other
and are versioned in one commit; one package can be held with `release-hold.json`. npm gets no
staged channel: a `next` dist-tag is a consumer contract, rejected on 2026-10-04.

After release: install the published packages in a clean directory and render one graph with
graphty-element alone (a failure opens a priority issue); fix forward and `npm deprecate` a bad
version; turn every defect found after release into a test or a dry-run route.

## 5. Deterministic test impact analysis

### 5.1 How it selects

Input: the files changed since the merge base with golden. Output: test files per CI shard, or
"whole shard". The same inputs always give the same selection. Unlike Anthropic's service it does
not use past results: our history is short, and a second service that can fall behind is how
Anthropic's let regressions through.

1. **Package level.** The packages nx calls affected, with the dependency closure
   `tools/prepush-inputs.mjs` computes. Vitest's module graph stops at `dist/`, so across packages
   selection is by package.
2. **File level** (Vitest's `related` mode), first only where no hidden inputs were found
   (graph-format, remote-logger, the unit projects of compact-mantine and graphty); others after the
   replay shows no misses.
3. **Rules for what the import graph cannot see**, in a checked-in file:
    - fixture, data, recording, golden or snapshot folders run the package's suite;
    - `graph-io/test/**` also runs graphty-element and cytoscape-extensions (they read its corpus);
    - `?raw`, `?url`, `?worker`, `?inline` imports, computed paths and source read as text are
      hard-coded edges, plus a short always-run list per package;
    - `.storybook/**` or anything its preview imports runs that Storybook project; graph-samples
      runs graphty-element's and graphty's;
    - test setup files, root Vitest configs, `tools/test-slots.mjs` and any `package.json` run the
      package;
    - `pnpm-lock.yaml` and every nx `sharedGlobals` file run everything;
    - GPU, browsers, local servers and paid LLM calls are lanes, not file selection.
4. **Fail safe.** A changed file no edge or rule accounts for runs its whole package.

### 5.2 Measuring misses before it gates anything

Sampling alone lets new commits break working features, as the C compiler project found. So the
selector starts advisory, logged beside today's full gate, and gates only after zero misses on:

- every golden landing and failed gate in `tmp/push-log.jsonl` (540 pushes in the 7 days measured,
  50 failed on tests);
- every failed ci.yml run on golden or cut pull requests (one GraphQL query): the costly misses are
  what CI caught and the local gate did not;
- a sample of landings run in full, every shard continuing past the first failure.

After adoption, verification runs every affected shard, so a miss shows there. Each miss adds a rule
in the same fix and is counted; a rising count returns the package to whole-package selection.

### 5.3 Reusing passes

Every pass, source-only checks and shards alike, is keyed by its inputs: the git tree of what it
reads, the installed lockfile hash (`node_modules/.pnpm/lock.yaml`), tool versions and the
environment variables that choose lanes. Not by branch name or HEAD. A clean merge of a branch into
golden has the tree the branch tested, so landing and verification reuse it.

## 6. Screenshots signed on the branch

### 6.1 What is true today

Changes with no changed images already go through: the gate passes a commit whose screenshot tree
(`visual-baselines/`) equals master's with no approval. The change is where review happens: on the
branch, at a branch commit, as Anthropic's agents capture screenshots before a pull request exists.
Screenshot approval is not tiered by risk, because only the owner approves images; screenshot files
are sensitive paths.

### 6.2 How it works

1. **Capture.** The branch's fast-check merge commit is captured, for the projects its own changes
   affect, and only when those changes touch something a capture reads; golden moving never
   triggers a recapture. A newer request for a branch replaces a queued one, and verification
   captures go first. Capture uses master's capture code and the pinned fonts.
2. **Review.** The review page lists branch previews and marks one whose branch moved since capture.
   Finish signs as now (the passkey approves a statement naming the accept commit and the exact
   `visual-baselines/` tree) and pushes to a separate ref, `review/<branch>`, so it never races the
   agent's pushes.
3. **Landing.** `land.mjs` merges `review/<branch>` into the branch before testing and refuses to
   land when a signed approval for the branch is missing from what it lands. Never copying keeps the
   approval commit an ancestor of golden, the cut and master, which the gate requires.
4. **Late signature.** If the owner finishes after the branch landed, `land.mjs` lands
   `review/<branch>` alone; it changes only screenshot files, so only the source-only checks run.
5. **At the cut.** A cut whose screenshot tree equals a signed tree passes with no new approval.
   CI's own capture must still match, so if another branch's code changed an image this branch
   signed, the owner sees it again: "unless the merge changes the screenshots" is enforced by capture.

None of this changes trusted code (`gate.mjs`, `approval.mjs`, the gate step in ci.yml); only the
composed-tree gate of section 6.3 does.

### 6.3 When two signed branches combine

Anthropic binds an approval to one commit; today's gate binds one tree. If branches A and B each
changed screenshots and both land before a cut, golden's tree is one nobody signed, and the owner
signs once more at the cut: one Face ID, every image marked "approved before". The owner's
requirement that two signed branches combine with no second review is met fully only with the
composed-tree gate, whose rule is:

- **What must be covered.** Every path under `visual-baselines/` that differs from master: an
  image, a story settings file (`visual-baselines/<project>/<story id>.json`, which changes how a
  story is captured) or a deletion. The only exception is `visual-baselines/reviews/`, the
  per-pull-request records, which mean nothing to the gate today and still do not.
- **What covers a path.** A passkey-signed approval statement, made at a commit in the head's
  history, whose tree holds that path with exactly the head's bytes (or holds no such path, for a
  deletion).
- **What revokes it.** A passkey-signed reject statement naming that path and those exact bytes
  whose signed time is later than the approval's. "Later" is the time inside the signed statement
  (today's `approvedAt`, which the signature must cover), never commit dates or ref order. An
  approval and a reject of the same bytes with the same time count as rejected. Today a Finish that
  rejects signs nothing, so this piece adds signed reject statements.
- **Which rejects count.** Every reject statement on `golden`, `master` and every `review/*` ref,
  which CI fetches before the gate runs. A reject on the review ref of a branch that never lands
  still counts. Approvals, unlike rejects, count only from the head's history, because the approving
  commit must be an ancestor of the gated head.
- **One rule in two places.** The gate and the review page's "approved before" mark apply exactly
  this rule, from the same code.

This departs from "an approval covers one commit" on purpose: the binding moves from a whole tree to
each path's exact bytes, which is what the owner looked at, and CI's capture still proves the code
draws those bytes. The owner adopted it (section 9); it changes the owner's trusted code and
takes effect one cut later, because CI runs master's copy of the gate.

### 6.4 Security properties kept

Everything in `design/visual-testing/design.md`'s threat model stays: only a passkey in master's
`passkeys.json` makes an approval valid; an approval binds exact image bytes; the approving commit
must be an ancestor of the gated head; the gate and capture run from the base branch; thresholds stay
at most 0.8; every project is gated; CI's own capture must match. Agents never sign, press Accept or
Finish, call the page's API, register keys, or edit `passkeys.json`, `gate.mjs`, `approval.mjs`, the
gate step or the visual job.

## 7. Requirements carried over

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the first row now reads "a full CI run on golden, then CI on the cut"; "local testing as close to CI as possible" gives way to one test environment, CI.

- Nothing reaches master with known errors: a full local run, then CI (`golden-local.md` 3.1).
  This rule governs master; golden is protected by verification, bisect and revert instead.
- Only the owner approves screenshots, with the passkey; every story needs an approved baseline
  (`visual-testing/design.md`; `decisions/2026-09-27-only-the-owner-accepts-chromatic-changes.md`).
- This machine is never a CI runner (`visual-testing/local-previews.md`).
- Master changes only through the cut and the release deploy key; signed land and revert commits;
  never copy commits; merged branches kept; every branch tied to an issue and pushed
  (`golden-local.md` 3.1, 4.1; CLAUDE.md "Landing changes").
- Sessions drive the pipeline, with no standing daemon (`golden-local.md` 3.2, 4.13): the landing
  script starts verification runs, which chain their own follow-ups, and the pipeline round makes
  every revert.
- The owner reviews screenshots before anything is offered to master (formerly "before pushing").
- No step waits on the owner; breaking changes only with the owner's go, grouped into one major.
- Paid GPU testing only at release; no silent fallbacks; never blame timing; one automatic retry of
  failed test files and automatic quarantine of flaky tests, each with an issue (owner, 2026-10-22;
  `ci-cd-plan.md` sections 7, 9). A GPU lane counts as stable
  after three consecutive green release-train runs.
- No nightly or fixed-interval job gates anything. Jobs that gate nothing may run on a schedule;
  the nightly Hosts run moves off the release train's hours so the two never compete for macOS
  runners.
- Local testing as close to CI as possible; SonarQube local only (`sonarqube/design.md`).
- The release train, holds, tag pattern, no `next` dist-tag, never disabling `release.yml`, runner
  and cache rules (`ci-cd-plan.md` sections 10 to 13).
- The shared cap of four browsers and the machine-wide test and GPU slots (`tools/test-slots.mjs`,
  `tools/prepush-tests.mjs`); UI tests drive real input; the GitHub API budget; spending caps.

## 8. Requirements this design drops or changes

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): the last row ("Reduce CI and catch errors at release") is answered the other way: CI runs more, the full suite on golden, and this machine runs no tests.

- **Full gate on every landing under the lock** (`golden-local.md` 3.1, 4.2, 4.8). Changed: fast
  check and a short lock; the full gate after landing. Reason: the measured serial gate. Golden may
  hold a broken commit for one verification run; master may not.
- **One pipeline round before reverting a broken landing** (`golden-local.md` 4.14). Changed: revert
  at once, because branches merge golden.
- **The cut re-runs the full gate** (4.14). Dropped for verified commits; kept for a named commit.
- **Screenshot review at the cut** (4.3). Changed: on the branch. Until the composed-tree gate is
  built, one extra Face ID when two signed branches combine.
- **graphty.app deploys on every green master build** (`ci-cd-plan.md` section 11). Changed: beta
  does; graphty.app changes only on promotion, except append-only data.
- **"Waiting for runners is the problem"** (`ci-cd-plan.md`). Dropped: measured waits are 2 to 4
  seconds (section 1).
- **Hosts on pull requests, and ci.yml's Mergify merge-queue handling.** To be removed: no pull
  request but the cut runs CI, and Mergify is retired.
- **Per-pull-request screenshot approvals** (`visual-testing/design.md`). Dropped, replaced by
  signed trees, which composed approvals then refine (section 6.3).
- **An approval covers only its exact tree.** Changed to composed approvals: each changed path
  under `visual-baselines/` but `reviews/` must be covered, byte for byte, by some signed approval
  not revoked by a later signed reject (section 6.3).
- **Passes keyed by branch name or HEAD** (`tools/prepush-inputs.mjs`). Changed: keyed by inputs.
- **Reduce CI and catch errors at release** (owner suggestion, 2026-10-21). Not adopted: runner use
  is under half the limit. Revisit past 10 minutes of queue.

## 9. Owner decisions

Decided by the owner on 2026-10-21:

1. **Composed screenshot approvals: yes** (section 6.3). An image is approved when one of the
   owner's signatures covers that exact image and no later signed reject revokes it (the precise
   rule, including settings files and which rejects count, is in section 6.3). This changes the
   owner's trusted gate code, which the owner has now authorized for this purpose.
2. **Golden may be briefly broken: yes.** "Nothing merges with known errors" governs master. Golden
   is protected by verification, bisect and revert (section 4.3).
3. **The beta repository is `graphty-beta`**, serving beta.graphty.app.
4. **Docs and Storybooks wait for promotion**, because they are paired with the code they document.
   Only the append-only hosted data deploys on every green master build.
5. **No npm beta channel.** The release train is unchanged.
6. **Verification watches itself.** Runs chain until golden is verified and keep a state file; the
   pipeline round is their watchdog, acts on their results and keeps a lessons file; its loop wakes
   on a recorded failure (section 4.3).
7. **The old rules in sections 7 and 8** are kept, narrowed or dropped as listed there.

Decided by the owner on 2026-10-23 ("I'm fine with deferring downstream tests"):

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): decision 8 no longer applies to pushes, because the light gate runs no test shards; it stays for hand runs with `PREPUSH_LIGHT=0`.

8. **A landing check defers downstream packages' tests to verification.** It runs the tests of the
   packages the change touches (file-level where the selector allows) and every fixed check (build of
   the affected packages, lint, API report, bundle size, docs site, SonarQube), but not the shards of
   packages reached only as dependents or readers of a changed package: a graph-io change no longer
   runs graphty-element's or the graphty app's shards before landing. A change to a shared root file
   (nx's sharedGlobals, the lockfile, the rules' "everything" list) still runs everything. The switch is
   `PREPUSH_DEFER_DOWNSTREAM` in `tools/prepush-tests.mjs`, on by default since 2026-10-23
   (`PREPUSH_DEFER_DOWNSTREAM=0` turns it off), now that verification names a culprit only on a failure
   that fails all five confirming runs of its test files, bisects only `land:` merges, judges each probe by
   the same five-run rule and requires the culprit's parent to pass every run; a test that passes any
   confirming run goes to the quarantine, never to a revert.

## 10. Build order

> Superseded 2026-10-23 by `design/ci/ci-full-testing.md` (issue #3316): step 3's verification moves to CI; the build order for that is in that document's section 9.

Each step is useful alone and lands separately.

1. Key passes by inputs; log lock, slot and preview waits; check in `tmp/with-browser.sh`.
2. The selector in advisory mode, with the replay.
3. Verification with bisect, `golden-verified`, verified-only cuts, and verification after `cut-fix`;
   self-chaining follow-up runs and the state file `tmp/golden/verify.json`.
4. The pipeline round as verification's watchdog: restarting dead runs, resuming bisects, acting on
   results, the lessons file, and the loop waking on a recorded failure with a 30-minute fallback.
5. The short-lock landing, once steps 2 and 3 show no misses.
6. The composed-tree gate (authorized by the owner, section 9).
7. Branch capture, `review/<branch>` refs, and `land.mjs` merging them.
8. The beta repository, its deploy and the promotion workflow; graphty.app assembled from the
   promoted build named by `PROMOTED_BUILD` plus the current master build's data (section 4.6).
9. The dry-run script, starting from the routes of the studio's most recent study.
10. Removing Hosts on pull requests and ci.yml's Mergify handling; moving the nightly Hosts run off
    the release train's hours.

CLAUDE.md and the pipeline-round skill change as each step lands, not before.
