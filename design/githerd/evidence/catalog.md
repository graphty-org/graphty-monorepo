# githerd situation catalog

githerd exists to keep the graphty-org/graphty-monorepo pipeline moving: a red master noticed and
fixed, releases unblocked, pull requests shepherded to merge, issues triaged and kept current,
and the parallel Claude Code sessions that do the work kept fed, unblocked and out of each
other's way. This catalog lists every situation githerd has to handle. Any design for githerd is
judged against it: for each situation, the design must name the signal it uses, the action it
takes and the condition it treats as done. A situation the design does not cover is a hole.

The situations come from five evidence files in this directory:

- `incidents/this-session.md` -- one two-week Claude Code session that drove most of the work,
  with a second session in parallel (2026-09-19 to 2026-10-03);
- `incidents/history.md` -- 30 days of GitHub data: 302 pull requests, 1,705 master runs, 470
  issues, 12,935 subagent transcripts;
- `owner/decisions.md` -- everything the owner has decided, required or rejected;
- `platform/facts.md` -- what was measured on this machine about GitHub polling, webhooks,
  Claude Code sessions, hooks, MCP channels and cross-session messages;
- `prior-art/patterns.md` -- what other agent-driven pipelines learned.

## How to read an entry

Each situation has a short name and five fields.

- **Seen / Anticipated.** "Seen" gives how often it happened in the evidence and where. "Anticipated"
  means it has not happened yet; the reason it is likely follows.
- **Signal.** The earliest signal that reliably reveals the situation, what it costs, and how sure
  we are that it works (tags below).
- **Do.** What must happen.
- **Who.** githerd's code; an agent (an interactive Claude session githerd hands the job to); or
  the owner, only for one-way doors, visual approval, money, credentials and logins.
- **Done.** The checkable fact that closes it. Never an agent's say-so.

Signal tags:

- `[verified]` -- measured on this machine (platform/facts.md) or seen working in this repository's
  history.
- `[documented]` -- stated by GitHub's or Anthropic's documentation, or by the prior-art research,
  but not tested here. A design that leans on one of these must test it first.
- `[NO RELIABLE SIGNAL]` -- nothing known detects it early and reliably. These are collected at the
  end, because they are where a design is most likely to fail.

Signal costs, from the measurements in platform/facts.md:

| Cost class | What it means |
|---|---|
| free poll | A conditional GET with `If-None-Match` that returns 304. Measured: a 304 does not spend the 5,000-per-hour REST budget. Works on the events, actions/runs, pulls and issues list endpoints. `X-Poll-Interval` on events is 60 s. |
| REST call | One call from the 5,000-per-hour budget. That budget is per token and shared with every session on the machine running `gh` (618 had already been spent in one hour when measured). Read `X-RateLimit-Remaining` from response headers; `GET /rate_limit` disagreed with the headers in the same minute. |
| log fetch | One REST call that downloads a job log. Error text lives only here (balance exhausted, advisory id, npm 403, plan cap). |
| npm GET | One request to registry.npmjs.org; not part of the GitHub budget. |
| local read | A file, `/proc` or `git` read on this machine. Free. |
| hook | Claude Code runs a githerd script on a session event. Free, push-based, but only for sessions whose settings carry the hook (project settings, since `~/.claude` must not be edited). |
| webhook | Delivered through an outbound relay (smee.io works; direct delivery to this container does not). A hint that shortens the next poll, never the truth: GitHub does not retry failed deliveries and nothing arrives while githerd is down. Anyone holding the relay URL can inject fake events, so `X-Hub-Signature-256` must be verified. |
| Claude judgment | An Opus 5.5 or Fable turn. The most expensive signal; used only when something changed, never on a timer. |

Rules that shape every entry, from owner/decisions.md:

- Detection runs when something changed, not on a fixed timer; no idle master runs, nightlies or
  daily audits.
- No step may depend on the owner answering. The phone may inform; it never makes work happen.
- Claude judges overlap, grouping, relatedness and "already fixed"; code validates and enforces.
- Only issues and pull requests written by the authenticated account reach an agent.
- Never dismiss a failure as flaky or load-related until its mechanism is found.
- `ACTION NEEDED:` only when the owner can act right now, once per item.

---

## 1. Master and release health

Every red master is also a stopped release, because the release workflow runs only after CI, the
GPU lane and the host matrix are green on the same master commit. In 30 days master CI had 19 red
stretches totalling 192 h, and no release could go out for 221 h. Before 2026-10-02, no red master
was first detected by anything whose job was to detect it.

### Master red from merged code on a lane pull requests also run
- Seen: about 6 times in 30 days, red 3 to 14 h each (history section 1; this-session episodes 3,
  8, 15, 18). Typical cause: two pull requests that pass alone and fail together, or a test that
  relied on timing.
- Signal: newest completed run of `ci.yml` on master with conclusion `failure`, read per workflow,
  ignoring any answer older than a run id already seen, red only on two consecutive sightings.
  free poll of `actions/runs?branch=master`, plus one REST call for the failed jobs and steps of
  that run. `[verified]` -- the watcher that did this caught 4 episodes within about 2 minutes
  on 10-02; before the monotonic run-id and two-sighting rules it raised 2 false alarms.
- Do: open one incident per failing job-and-step key. Close the tree: no new auto-merge enabled,
  no update-from-master on any pull request, no new feature work dispatched. Revert if exactly one
  merge is the culprit and master's head is still that commit and still red; otherwise one agent
  fixes forward through a pull request.
- Who: githerd's code detects, holds and reverts; an agent fixes.
- Done: the newest completed run of every gating workflow on master is green at a commit that
  contains the fix.

### Master red on a lane only master runs
- Seen: GPU lane red 75 h in 6 stretches; host matrix (Windows, macOS) 19 h in 4 stretches; the
  master-only cost-estimate accuracy job red 3 or 4 times, once for about 17 h, left red "on
  purpose" (history section 1; this-session episodes 11, 17, 18, 19). No pull request can see these
  jobs, so a green pull request routinely breaks master.
- Signal: as above, but the watched set must be every workflow the release waits on (CI, GPU,
  Hosts, Release), not only `ci.yml`. Same cost. `[verified]`
- Do: as above, plus route the incident to the session or job that merged the culprit, which knows
  the change. A red master-only lane is never left red on purpose without an owner decision
  recorded.
- Who: githerd's code; an agent.
- Done: newest run of that lane on master green.

### Several causes stacked on one red master
- Seen: 2 long stretches (72 h on 09-14, 11.5 h on 10-01 with four separate causes in a row);
  sessions believed master had been red for 2 h when it had been red for 11.5 (history section 1).
- Signal: the set of failing job-and-step keys on master changes while master is still red. One
  REST call per failed run for its jobs. `[verified]` (the keys are in failed-jobs.jsonl).
- Do: each new key is its own incident with its own fixer; master counts as fixed only when one
  full run is green. Report the true start of the red stretch, not the start of the newest cause.
- Who: githerd's code; agents.
- Done: one full green run on master of every gating workflow.

### Intermittent failure on master
- Seen: about 10 on master; 14 distinct intermittent tests overall (algorithms "under 100 ms" at
  least 5 times; ForceAtlas2 frame loop 3; logger port 1 in 30; GPU all-pairs; College football;
  camera framing). A re-run hid 11 worker losses, because counting run conclusions showed zero
  (this-session section 5).
- Signal: attempt-level outcomes. A job whose first attempt failed and whose re-run passed on the
  same commit (`run_attempt` above 1 with a different conclusion). One REST call per re-run run.
  `[verified]` that conclusion-level counting hides them; the attempt-level read itself is a
  standard API field, not yet exercised here.
- Do: a re-run may unblock a release once, but only together with an open issue that names the
  test and asks for the mechanism. The same test failing again on another commit raises that
  issue's priority. A re-run is never recorded as the fix.
- Who: githerd's code re-runs and files; an agent finds the mechanism.
- Done: the issue is closed with a root-cause fix merged, and the test has no first-attempt failure
  on master afterwards.

### Release blocked because a gating lane is red
- Seen: 71 failed release runs from 09-19 to 09-28 (history section 2), nearly all one gate run per
  completed lane on the same red commit.
- Signal: release workflow run conclusion `failure` whose log says a lane is red. free poll plus a
  log fetch. `[verified]`
- Do: fold into the master incident for that lane; no separate job.
- Who: githerd's code.
- Done: the lane's incident is done and a release run on that commit succeeds.

### Release push race: version commit rejected
- Seen: 13 failed runs (non-fast-forward) 09-24 to 09-27; once on 09-30 the release pushed its tags
  but not its version commit, nothing was published, and every re-run failed because the tags
  existed (history section 2; this-session episode 14). The second case came from a pull request
  that edited the version-plan file while the release ran.
- Signal: release job log text "non-fast-forward" or "rejected"; and the general check "a release
  tag exists for a version npm does not have". log fetch, plus one npm GET per tagged package and
  `git ls-remote --tags` (local). `[verified]`
- Do: while a release run is in progress, hold auto-merge on any pull request that touches release
  inputs (version plans, `nx.json` release config, `package.json` versions). If tags exist without a
  publish, an agent lands the version commit through a pull request.
- Who: githerd's code holds; an agent repairs.
- Done: npm shows the tagged versions and master contains the version commit.

### Release published the wrong contents
- Seen: once. On 09-29 a green master released graphty-element 3.0.0 and layout 2.0.0 containing
  half of a migration meant to ship as one grouped breaking release; found 3.5 h later by the other
  session (this-session episode 12).
- Signal: before any merge, the release dry-run of master plus the pull request, compared with the
  owner's intended release plan. After a merge, a published version that is not in the plan. One
  dry-run per held pull request (local, minutes); npm GET afterwards. `[verified]` that the release
  tool's dry-run shows the bump; the comparison against a plan has not been built.
- Do: breaking pull requests are held across all sessions and grouped per package; a group lands as
  one merge. A published version outside the plan is reported to the owner at once (a published
  version cannot be unpublished, so what to do next is the owner's call).
- Who: githerd's code holds and compares; the owner decides recovery.
- Done: every published version matches the plan.

### Unintended version bump
- Seen: once (a 0.x package about to go to 1.0.0 on 09-20); also a peer range that excluded the
  dependency's current version made the release refuse to run (twice), a release group left behind
  after a one-off release (5 runs), a tag that already existed (3 runs) (history section 2).
- Signal: the release dry-run on the pull request that changes versions or release config. Local,
  minutes. `[verified]` (the dry-run would have shown each case).
- Do: an agent fixes the config in the same pull request before it merges.
- Who: an agent; githerd's code requires the dry-run result on such pull requests.
- Done: the dry-run shows exactly the intended bumps.

### First publish of a new package
- Seen: 4 packages in 30 days; each blocked the release for hours until the owner created the
  package with `npm login` plus a one-time password and enabled trusted publishing (history
  section 2).
- Signal: a pull request adds a publishable `package.json` whose name npm does not know (npm GET
  returns 404). Earlier and cheaper than the release's 403 OIDC error. One npm GET per new name.
  `[verified]` that the 403 appears; the 404 pre-check is standard registry behavior.
- Do: tell the owner while the pull request is still open, with the exact package name and the two
  steps; hold that pull request's merge until npm knows the name.
- Who: the owner (credential and login).
- Done: npm returns the package; the release publishes it.

### npm propagation delay read as failure
- Seen: 4 runs; once a session invented "awaiting approval on npmjs.com" from a 409 and sent the
  owner looking for it (history section 2).
- Signal: a 409 "previously staged version" in the publish log means the upload succeeded. npm GET
  every minute for up to 10 minutes. `[verified]` (visible after 1 to 7.5 minutes).
- Do: wait; never report it to the owner.
- Who: githerd's code.
- Done: npm shows the version.

### Release reported failed when it landed
- Seen: once (09-24: an agent read the skipped run, not the later green one).
- Signal: npm's published versions are the truth, not run conclusions. npm GET. `[verified]`
- Do: githerd's release status comes from npm versions against master's commits, never from a run.
- Who: githerd's code.
- Done: status matches npm.

### Release starved by a steady stream of merges
- Anticipated. 118 of 256 GPU-lane runs on master were cancelled by newer pushes; seven merges once
  landed within two minutes; the GPU lane takes up to about 2 hours. If merges keep arriving faster
  than the slowest lane finishes, no commit is ever green on every lane and nothing releases, with
  no red anywhere.
- Signal: hours since the newest commit that is green on every gating lane, while merges continue.
  Derived from the same free poll. `[verified]` inputs; the derived measure is new.
- Do: when it passes a limit, hold auto-merge until the slowest lane completes on master's head.
- Who: githerd's code.
- Done: a release run succeeds.

### Master looks green but has not run against today's world
- Seen: 10-03. The braces advisory failed every pull request's audit while master stayed green,
  because master had not run CI since the advisory changed (this-session section 3).
- Signal: nothing on master. The signal is the shared pull request failure (section 3) or the
  advisory feed (section 2). `[verified]` that master alone is blind here.
- Do: never treat "master green" as "nothing is wrong with master".
- Who: githerd's code.
- Done: see the shared-failure entry.

### Red spreads into pull requests through update-from-master
- Seen: updating pull requests from master while master was red spread the red into every pull
  request (this-session section 11; the same failure is reported elsewhere in prior-art 2.6).
- Signal: none needed; githerd prevents it. Every update uses the newest commit verified green on
  every gating lane, never master's tip. Mergify (adopted 10-03) updates branches from master
  itself; whether it checks master first is unverified.
- Do: githerd's own updates use the green commit only; while master is red, githerd keeps Mergify's
  queue held (for example with the hold label its rules already respect).
- Who: githerd's code.
- Done: no pull request is updated onto a red commit.

### Gating lane gets cancelled, never finishes
- Seen: GPU re-runs take about 2 hours; a provider shut the machine mid-run (09-20); "the
  self-hosted runner lost communication" (09-22).
- Signal: newest run of a gating lane is `cancelled` or has a runner-loss error, and no newer run
  exists for master's head. free poll plus log fetch. `[verified]`
- Do: re-dispatch the lane once on master's head; a second runner loss is an incident.
- Who: githerd's code.
- Done: the lane completes on master's head.

---

## 2. External drift: the world changes, the code does not

### Security advisory fails the dependency audit
- Seen: at least 5 (09-09 with 288 vulnerabilities, 57 h red; axios 09-30; 09-29/30; node-forge
  10-02; braces 10-03). The braces advisory was published 09-18 and UPDATED 10-02 22:36; the update
  is what made `pnpm audit` fail. There was no Dependabot alert for it (this-session section 3;
  history section 1).
- Signal: the GitHub advisory database queried by update time (not publication time) for the npm
  ecosystem, matched against package names in master's `pnpm-lock.yaml`, then confirmed by running
  `pnpm audit` locally on master's lockfile. One REST call per poll (whether `/advisories` honors
  ETags was not measured), local audit in seconds, no CI spent. `[documented]` for the feed;
  `[verified]` that the shared pull request failure catches it later.
- Do: one shared job before any pull request fails: upgrade or override to a patched version. With
  no patched version, record an audit exception with a reason and a review date (reversible, so an
  agent decides). If the only fix is a major version of one of our packages (node-forge needed
  remote-logger 2.0), that release is a one-way door for the owner, while the exception keeps
  pull requests moving.
- Who: githerd's code detects; an agent fixes; the owner only for a forced major.
- Done: `pnpm audit` passes on master's lockfile and on every open pull request after update.

### Dependabot alerts disagree with reality
- Seen: twice. Alerts on master despite an existing override (undici, markdown-it, ip-address);
  19 alerts of which 18 looked stale against the fixed lockfile; and no alert at all for braces.
- Signal: none trustworthy. Dependabot alerts are not a reliable signal in either direction.
- Do: never open work from a Dependabot alert alone; confirm with `pnpm audit`.
- Who: githerd's code.
- Done: n/a.

### Runner image moves under the project
- Seen: once. `ubuntu-latest` moved to 24.04 and Mesa 25 while every gate record said Mesa 23
  (09-23); runners were then pinned (PR 693). GitHub has announced `ubuntu-latest` moves to 26.04
  from 10-19, so the next one is dated.
- Signal: the "Runner Image" version lines in the "Set up job" section of a job log, compared with
  the last recorded value; deprecation warnings on runs of a pinned image. One log fetch per
  workflow when a run completes after a quiet period. `[documented]` (log format), not yet read by
  any watcher.
- Do: an agent opens an issue for the image move before the date; with pinned images, the
  deprecation notice is the trigger.
- Who: an agent.
- Done: the pinned image is current and its gate records match the job log.

### Rented GPU runner out of balance
- Seen: twice on 10-02 (balance $-2.08 at 04:04, $-2.80 at 23:43); a day of runs including
  63-minute paired benchmarks spent it.
- Signal: the job's second step is NAMED "Machine: Insufficient balance to run job. Current
  balance: $..." and names the cause exactly; the job has no log and no annotation (platform-facts
  9.5). jobs list, no log fetch. `[verified]`. A warning before zero would need the provider's balance, and no
  balance API is known: `[NO RELIABLE SIGNAL]` for the early warning. A spend estimate from GPU job
  minutes is possible but its rate is not known.
- Do: tell the owner once, immediately, as a payment action; never give it to an agent as a code
  failure. After the top-up, re-run the failed lane on master's head.
- Who: the owner pays; githerd's code re-runs.
- Done: the lane completes on master's head.

### Rented runner plan limits
- Seen: twice. The free plan killed jobs at 30 minutes ("free plan runners are limited to 30
  minutes"), undocumented by the provider; splitting the job hit "Concurrent runner limit
  reached". Buying credits did not lift the cap; the owner subscribed.
- Signal: those exact log strings; earlier, job duration trending toward the cap, from job
  `started_at`/`completed_at`. One REST call per completed GPU run. `[verified]` strings.
- Do: report as an account limit; an agent may restructure the workflow, the owner changes the
  plan.
- Who: the owner for the plan; an agent for the workflow.
- Done: the job completes within the plan.

### Job or step time budget overrun
- Seen: 4. A 47-minute job plus a 40-minute benchmark step hit the 75-minute job limit; the paired
  benchmark reached 65 minutes against a 40-minute step limit after a week of new benchmark
  groups (this-session section 4).
- Signal: per-step durations from the jobs API trending toward the step and job limits; the sum of
  step limits exceeding the job limit. One REST call per completed run of that workflow.
  `[verified]` inputs.
- Do: open an issue while there is still margin, not after the first timeout.
- Who: an agent.
- Done: the worst recent duration has the agreed margin under its limit.

### Benchmark noise on rented hardware
- Seen: 3 or more. A 10k-node row swings 1.4 to 4.0 ms on unchanged code depending on which cloud
  T4 it gets; a 0.3 ms row fired falsely; a 4-byte round-trip row at 7.8x baseline was noise
  (this-session sections 2 and 4).
- Signal: the benchmark history of that row against a pinned best and a noise floor, never a
  single sample. `[verified]` that single samples mislead.
- Do: a red benchmark row with history inside its noise band is an issue against the gate, not a
  code fix; outside the band it is a real regression.
- Who: an agent.
- Done: the gate's floor for that row matches its measured noise.

### Paid service overage
- Seen: once. Chromatic billed $3,747 in a month, on track for $10,000; the owner stopped approving
  anything there for days, and found it from the bill.
- Signal: `[NO RELIABLE SIGNAL]`. No usage or billing API is known for any paid service the
  pipeline uses. Chromatic is now gated behind a label; the self-hosted review tool replaced it.
- Do: keep paid usage behind explicit triggers; when the owner reports a bill, park the dependent
  gate and keep other work moving.
- Who: the owner.
- Done: the owner says so.

### External service outage fails a check
- Seen: at least 4. Coveralls HTTP 500; GitHub artifact downloads HTTP 403 when 180 calls fired in
  one second; npm OIDC 403; the review page failing on "error connecting to
  productionresultssa0.blob.core.windows.net".
- Signal: the failing step's log names a remote host and an HTTP 5xx or connection error. log
  fetch. `[verified]`. Whether the cause is the service or our own burst needs the log, not a
  guess.
- Do: a 5xx from a third party is re-run after a wait, not a code job. A 403 or 429 from our own
  burst is a CI design defect and gets an issue.
- Who: githerd's code re-runs; an agent for the defect.
- Done: the check passes on re-run, or the issue exists.

### DNS or network stall on this machine
- Seen: at least 2 days. "could not resolve github.com", artifact downloads failing; a push failed
  on DNS after its gate passed and then waited 4 hours on a classifier refusal; a session asserted
  "DNS" once without evidence and was wrong (this-session sections 7 and 14).
- Signal: githerd's own outbound calls fail with resolution or connect errors, while a second
  host also fails. local. `[verified]`
- Do: githerd marks its view "unknown" (never "green"), pauses dispatch, does not count failed
  pushes or gates as job failures, and says so on the status board.
- Who: githerd's code.
- Done: calls succeed again; paused work resumes.

### Credential or account state blocks everything
- Seen: the Claude API began returning "You'll need to accept the updated Consumer Terms" on 10-02
  and every agent started afterwards died at once (393 subagent transcripts); signing commits
  showed "Unverified" until the owner added the SSH key as a signing key; npm trusted publishing;
  Chromatic and SonarQube tokens; the review tool's passkey (history sections 5 and 6).
- Signal: the exact error text in the session transcript's last record or the session's stop
  reason (`[verified]` from transcript extraction); `gh` returning 401 (immediate);
  `commit.verification.verified == false` on a pushed commit (REST call, `[documented]`). An expiry
  date ahead of time: GitHub returns a token-expiration header for expiring tokens
  (`[documented]`, not measured here). For Claude terms and other accounts no advance signal is
  known.
- Do: stop dispatch of anything that needs the credential; tell the owner once, with the exact
  step; resume when the next call succeeds.
- Who: the owner.
- Done: the next authenticated call succeeds.

### Shared GitHub rate budget runs low
- Seen: 618 of 5,000 calls already spent in one hour by sessions when measured.
- Signal: `X-RateLimit-Remaining` on every response. free. `[verified]` (and `GET /rate_limit`
  disagreed with it, so the endpoint is not the signal).
- Do: githerd backs off its full fetches first and keeps master checks; it must never be what
  exhausts the owner's budget.
- Who: githerd's code.
- Done: remaining budget above the threshold.

### Claude Code update changes the platform under githerd
- Anticipated. Two Claude Code versions (2.1.287 and 2.1.288) ran on this machine during the
  measurements; `claude respawn` exists to restart sessions on a new version; the session-to-session
  protocol is versioned; githerd will depend on registry fields, hook input keys, the Stop hook
  block cap and channel behavior, all of which are internal.
- Signal: `claude --version` differs from the version githerd last verified. local. `[verified]`
  that versions change.
- Do: githerd re-runs its own platform self-test (start a probe session, read its registry entry,
  fire a hook, push a channel message) before dispatching on the new version, and says loudly if
  any check fails.
- Who: githerd's code.
- Done: the self-test passes on the new version.

### Repository settings change under githerd
- Anticipated, with precedent: master had no branch protection until 09-25; feature branches have
  none, which is why stacked pull requests merged without checks; the required checks are named
  "All Checks Pass" and "Lint PR Title". If a required check is renamed or a workflow is removed,
  every pull request waits forever on a check that will never report, and looks merely pending.
- Signal: the rulesets for master (free poll with ETag, `[documented]`), compared with the check
  names that actually report on recent pull requests.
- Do: a required check that has not reported on any pull request for a day is an incident.
- Who: githerd's code detects; the owner changes rulesets.
- Done: every required check reports on new pull requests.

---

## 3. Pull request lifecycle

In 30 days: 302 pull requests, 41% of pull request CI runs failed, median open-to-merge 1.5 h but
11.2 h for those with any CI failure, worst 176 h. Merging moved to Mergify on 10-03: every
non-draft pull request into master with no conflict, no `hold` label and no `!` in the title is
queued, updated from master and merged when required checks pass.

### Own check failure
- Seen: 99 of 265 merged pull requests had at least one failed CI run; 13 needed four or more; one
  needed 22.
- Signal: a completed check run on the pull request's head commit with conclusion `failure`. free
  poll of pulls, then one REST call for check runs per head commit that changed. `[verified]`
- Do: classify before acting, in this order: the same key fails on master (inherited, wait); the
  same key fails on two or more other pull requests (shared, see below); the pull request touches
  nothing (master-side defect); otherwise its own failure, handed to the session that owns the
  pull request, or to a fresh worker if none.
- Who: githerd's code classifies; an agent fixes.
- Done: every required check green on the current head.

### Shared failure across pull requests while master is green
- Seen: 6 incidents; the history scan finds 10 bursts on Build (all security advisories) and 7 on
  Chromatic (approvals pending), each hours before anyone acted. Open pull requests went from 14 to
  22 and later to 23 while sessions fixed them one at a time.
- Signal: the same job and failed step on two or more different pull requests within a few hours.
  One REST call for jobs per failed run. `[verified]` (it would have caught every case in the
  history).
- Do: one urgent shared job; hold every per-pull-request fix job on that key; after the fix merges,
  update only the affected pull requests from the green commit, recording each (pull request,
  commit) pair so it never repeats.
- Who: githerd's code; one agent.
- Done: the key no longer fails on any open pull request after its update.

### A pull request that changes nothing fails
- Seen: 3 (docs-only pull requests failed on unbuilt Storybook targets and on artifact downloads,
  09-21 and 09-23).
- Signal: a pull request whose diff touches no package source fails a test job. One REST call for
  the file list. `[verified]`
- Do: treat it as a master-side defect: shared job, not the pull request's problem.
- Who: an agent.
- Done: a docs-only pull request passes.

### Intermittent failure on a pull request
- Seen: every flake in section 1 also failed pull requests; the College football failure drew two
  agents at once.
- Signal: the failing test is already a known intermittent (an open issue names it) or the same
  test passes on the same head on re-run. One REST call. `[verified]`
- Do: one re-run is allowed when an issue already tracks the mechanism; otherwise open that issue
  first. Never more than one blind re-run per head.
- Who: githerd's code.
- Done: green head and an open or fixed issue for the test.

### Textual merge conflict
- Seen: 17 incidents of conflicts and stale branches; 3 pull requests in conflict now (#24 for
  220 h). A conflicting pull request shows no checks at all, so a watcher waited hours for checks
  that could never appear (09-26). On 10-02 two of three auto-merge pull requests could never merge
  because of conflicts nobody saw.
- Signal: `mergeable == false` / `mergeable_state == "dirty"` on the single pull request GET, read
  again after master moves; `null` or unknown counts as no data; two sightings. GitHub sends no
  event when an advancing base creates a conflict. One REST call per open pull request per master
  move. `[verified]` that the state exists and that no event fires (prior-art 2.8).
- Do: an agent merges the newest green master commit into the branch and resolves; files that
  conflict constantly (a hand-kept count table, the decision index) get an issue to remove the
  hot spot.
- Who: an agent.
- Done: `mergeable == true` and checks running on the new head.

### Conflict only in visual baseline images
- Seen: PR 490 conflicted with master only on baseline images; agents may not write baselines, so
  the owner was asked to run `git checkout --theirs` in a terminal. "Finish" failed three times on
  10-01 because master had newer baselines. The owner had issues opened to fix this in the review
  tool.
- Signal: a local trial merge (`git merge-tree` against the green commit, local, seconds) whose
  conflicting paths are all under `visual-baselines/`. `[verified]` conflict; the local trial merge
  is standard git.
- Do: the review tool's own update-from-master path resolves it (the owner's chosen fix). Until
  that tool fix exists, it is an owner item with the exact command, and the open tool issue is
  linked.
- Who: the review tool; the owner until it is fixed.
- Done: the pull request is mergeable with no owner terminal step.

### Semantic conflict between pull requests
- Seen: 6. Two pull requests that each compiled and passed broke together: a sentinel change made
  every frame allocate a 12.9-billion-element array; a doubled node limit timed out a new scale
  test; a merged pull request used something another removed; a teardown fix removed all lines
  under instancing (this-session section 11).
- Signal: `[NO RELIABLE SIGNAL]` before one of them merges. The earliest real signal is CI on the
  second pull request after it is updated onto a master that contains the first; after both merge,
  it is master red. Claude's overlap judgment before work starts is a forecast, not a signal.
- Do: after any merge, update the open pull requests that Claude judged related to it (from the
  green commit) so their CI runs against the combination before they merge; keep master's
  full-suite lanes as the backstop.
- Who: Claude judgment selects; githerd's code updates; an agent fixes.
- Done: the second pull request is green on a base that contains the first.

### Branch far behind master
- Seen: branches 11 to 95 commits behind; consequences included visual diffs that were really
  master's changes (42 behind), a failure already fixed on master (25 behind), and a new branch cut
  from a local master 80 commits behind, whose docs taught 10 symbols that did not exist.
- Signal: `behind_by` from the compare API. One REST call per pull request per master move.
  `[verified]`
- Do: update from the green commit only when it matters: its failure is already fixed on master,
  its visual captures are needed, or it is next to merge. Never cut a branch from a local master;
  always from the green commit.
- Who: githerd's code.
- Done: the pull request's base contains the green commit it needs.

### Visual captures out of date
- Seen: PR 519 was approved, then blocked by 4 new changed images because master moved after the
  review; PRs 519 and 365, approved before passkeys existed, were refused by the new gate.
- Signal: the review gate's record names the master commit its captures were compared against;
  master's baselines have changed since. Read from the review tool's record. `[verified]` that it
  happens; the field is in the tool.
- Do: update, re-capture, and ask the owner to review only the images that changed since the last
  approval.
- Who: githerd's code and an agent; the owner reviews.
- Done: the gate is green on the current head.

### Waiting on the owner's visual review
- Seen: most UI pull requests; the slowest merges (#365 at 176 h, #364 at 160 h) waited on
  approval; approval messages are the owner's most common message (35); PR 617 had 150 changed
  images, PR 365 had 357 files to re-sign.
- Signal: the review gate check on the head is pending with "awaiting approval". free poll plus one
  REST call. `[verified]`
- Do: list it for the owner with a direct link, ordered fewest diffs first, as one standing list.
  Never a fix job, never an agent approval. Visual-changing work for agents is throttled when the
  list grows (review capacity is the real limit). Get the owner's eyes early on work that changes
  meshes or rendering.
- Who: the owner.
- Done: approved and finished; gate green.

### Owner rejects visual changes
- Anticipated as a routine path; seen as an event (the owner rejected 28 changed pictures in the
  10-01 seed review, which turned out to be silent regressions).
- Signal: a reject decision in the review tool's record for that pull request. `[verified]` that
  rejects are recorded.
- Do: a fix job for the pull request's owner session, carrying the owner's note and the rejected
  images.
- Who: an agent.
- Done: new captures approved.

### Visual gate passes when it should not
- Seen: for three days (09-27 to 10-01) four packages had no baselines, "no baseline yet" passed,
  and three merges moved 28 approved pictures unnoticed; graphty-element 3.0.0 and 3.1.0 shipped in
  that window. A seed pull request passed the gate with open rejects because the gate skipped
  unseeded packages. The owner called it a CRITICAL error.
- Signal: every package with a Storybook has baselines on master, and no story is excluded or
  "no baseline yet". local read of master's `visual-baselines/` and story list, on each master
  move. `[verified]` that the gap existed and was invisible.
- Do: a master-level incident, same priority as red master.
- Who: githerd's code detects; an agent fixes the gate.
- Done: every package's stories have approved baselines on master.

### Review tool or review server unusable
- Seen: about 12 events in 8.3 of this-session: Accept not committing; Finish doing nothing because
  the browser suppressed dialogs; a page blank after one failed call; servherd reusing the old
  directory so two "restarts" ran stale code; a 1.2 GB first download; a cached old script; a
  passkey confusion that cost 30 minutes.
- Signal: githerd checks the server through servherd and with an HTTP request to a health route,
  and checks the served version against master, before it hands the owner any review link. local.
  `[verified]` that servherd reports status; the health route is the tool's to provide.
- Do: an agent restarts it through servherd; a defect becomes an issue in the review tool.
- Who: an agent; githerd's code checks.
- Done: the link works on current code.

### Stacked pull request
- Seen: 6 merge-order incidents; twice a stacked pull request with auto-merge on merged into its
  base at once, skipping its own CI, because feature branches have no protection (10-02 05:59 and
  21:22).
- Signal: `base.ref != "master"` in the pulls list. free poll. `[verified]`
- Do: never enable auto-merge on it, and keep Mergify away from it; when GitHub retargets it to
  master after the parent merges, treat it as new.
- Who: githerd's code.
- Done: it merges into master with its own checks green.

### Pull request already merged through another
- Seen: PR 12 stayed open after its commits landed through PR 14 (09-20).
- Signal: every commit of the pull request is reachable from master. One compare call. `[verified]`
- Do: propose closing it with the merging pull request named; githerd's code closes after a grace
  period unless the owner objects.
- Who: githerd's code.
- Done: closed with a pointer.

### Breaking pull request held for a grouped major
- Seen: 4 on 10-02 (PR 676 element 4.0, PR 409 compact-mantine major waiting 169 h, PR 702 AI key
  store found breaking only after it was built, PR 690 remote-logger 2.0 let through to unblock
  every audit).
- Signal: any commit on the head with `!` or a `BREAKING CHANGE` footer, or `!` in the title. One
  REST call for the commit list per head change; an unreadable list counts as breaking.
  `[verified]`
- Do: hold (no auto-merge, `hold` label for Mergify); group with other held breaking pull requests
  for the same package from any session; keep it current with master; ask the owner when to cut
  the major, since a released major version is a one-way door.
- Who: githerd's code holds and groups; the owner decides the release.
- Done: the group lands as one merge and one major per package.

### Breaking change nobody marked
- Anticipated, with precedent: PR 702 was found breaking only after it was built; the owner asked
  "why is this a breaking change" about PR 409. An unmarked breaking change in a non-breaking pull
  request auto-merges and ships as a minor.
- Signal: `[NO RELIABLE SIGNAL]`. The commit marker is the author's claim; no public-API diff check
  exists in the repository.
- Do: the pull request's review asks Claude whether exported API or behavior changed; a
  public-API report in CI would make this a signal (an issue, not a githerd mechanism).
- Who: Claude judgment; an agent for the CI check.
- Done: no minor release removes or changes an export.

### Two sessions planning majors for the same package
- Seen: once (09-29): one session published graphty-element 3.0.0 while the other assembled the
  grouped major that forced 4.0.0 a day later.
- Signal: githerd's own record of held breaking pull requests per package, from every session.
  local. `[verified]` that sessions could not see each other's plans.
- Do: one group per package, visible to all sessions; a second breaking pull request joins it.
- Who: githerd's code.
- Done: one major per package per group.

### Title or commit message fails commitlint
- Seen: 13 (subject case 5, scope not allowed 3, length over 100 4, one title the check could not
  clear because the workflow ignored `edited` and a re-run replayed the old title).
- Signal: githerd runs the repository's commitlint config against the title when the pull request
  opens or its title changes. local, free, before CI. `[verified]` that the CI check fails on
  these.
- Do: case and length are mechanical and githerd's code may fix them; a scope outside the allowed
  list needs the agent. After a title fix, check that the title check actually re-ran on the new
  title.
- Who: githerd's code or an agent.
- Done: "Lint PR Title" green.

### Pre-push gate failure or a push misread as success
- Seen: 16 incidents on the push path; 5 times a failure was read as success (output piped through
  `tail`, "command not found" read as passing, a chain that echoed success after the gate
  refused).
- Signal: the remote branch's head equals the commit the agent says it pushed (`git ls-remote`,
  local, or the pull request's head SHA). `[verified]`
- Do: a push counts only when GitHub has the commit; otherwise the job is not done.
- Who: githerd's code.
- Done: GitHub's head equals the local commit.

### Push queue backs up
- Seen: pushes waited 60 to 120 minutes in the machine-wide push lock (10-02), because one lock
  serialized 15-minute gates across two sessions and their subagents; gates were bypassed with
  `--no-verify` twice under that load.
- Signal: the lock's queue depth and the age of its oldest waiter. local. `[verified]`
- Do: count gate slots as a capacity limit when dispatching; finished work waiting to push is
  ahead of new work; never bypass the gate.
- Who: githerd's code.
- Done: wait under the limit.

### Commits pushed but checks never start
- Seen: conflicting pull requests show no checks (09-26). Anticipated otherwise: commits pushed with
  a token that does not trigger workflows never get checks (prior-art 2.12).
- Signal: no check suite on the head a few minutes after the push. One REST call. `[documented]`
- Do: find out why (conflict, workflow path filter, token) before waiting longer.
- Who: githerd's code; an agent if it is a workflow defect.
- Done: checks running on the head.

### Green but not merging
- Seen: the owner asked "we have 19 open pull requests, when will they get merged?" and "down to
  11, how do I merge the rest?"; four pull requests have waited more than five days.
- Signal: all required checks green, mergeable, and not merged or queued after a short while; the
  reason comes from the pull request's own fields in a fixed order (draft, conflict, `hold` label,
  `!`, base not master, review pending, Mergify state, auto-merge off). free poll plus one REST call.
  `[verified]` fields; Mergify's state on the pull request is new and unverified.
- Do: one line per pull request saying why it is not merging, on the status board; act on the
  reasons githerd can act on.
- Who: githerd's code.
- Done: merged, or the reason is an owner item.

### Auto-merge on where policy forbids it
- Seen: twice on stacked pull requests; the environment pull request would have broken every push
  from every session if auto-merge had merged it (10-02).
- Signal: the `auto_merge` field of each open pull request against policy (breaking, stacked,
  held, owner-decision pending). free poll. `[verified]`
- Do: githerd's code turns it off and records why; agents never touch auto-merge themselves.
- Who: githerd's code.
- Done: auto-merge matches policy on every open pull request.

### Head changed after githerd checked it
- Anticipated: githerd decides "this head is mergeable" and an agent pushes again before the merge
  is enabled.
- Signal: GitHub's `expectedHeadOid` on enabling auto-merge refuses a moved head. `[documented]`
- Do: always pass the head githerd checked.
- Who: githerd's code.
- Done: merges only heads that were checked.

### Pull request waiting on an owner decision or owner-only step
- Seen: the environment pull request waited from 09-24 to at least 10-02 on a dev-container rebuild
  only the owner can do; a performance target with no decision for days; a public option decision
  never raised.
- Signal: the job parked itself with a one-way-door question, or a `needs-decision` label. free
  poll. `[verified]` that such items were forgotten.
- Do: one owner-queue item with the question and its consequences; the pull request is kept
  current meanwhile; other work continues.
- Who: the owner.
- Done: the owner's answer is recorded and the job resumes.

### Duplicate pull requests
- Seen: 2 pairs (PRs 605 and 606 for one flaky glyph; 609 and 610 for design docs).
- Signal: two open pull requests claiming the same issue, or judged the same by Claude when the
  second opens. Claude judgment, once per new pull request. `[verified]` that it happened without
  claims.
- Do: prevent with claims; if it still happens, keep the older and propose closing the newer.
- Who: githerd's code; Claude judgment.
- Done: one pull request per piece of work.

### Abandoned pull request
- Seen: #24 open 220 h in conflict; four green GPU pull requests untouched for two days.
- Signal: no claim and no activity on the pull request for longer than a limit. free poll.
  `[verified]`
- Do: it enters the queue (oldest pull request first, per the owner's ordering).
- Who: githerd's code; an agent.
- Done: merged, or closed with a reason.

### Fix pull requests pile up for one incident
- Anticipated from prior art: one CI fixer elsewhere opened 18 fix pull requests and left 30 orphan
  branches while main stayed red for five months.
- Signal: the count of open pull requests and attempts tied to one incident. local.
  `[documented]`
- Do: one attempt at a time per incident, a fixed attempt budget, and a record of each attempt's
  findings passed to the next.
- Who: githerd's code.
- Done: the incident is fixed, or escalated once with the findings.

### Review comments from a bot account
- Anticipated: Greptile reviews pull requests in this repository, from an account that is not the
  owner's. The owner-only filter removes every other account's text from agent input, so Greptile's
  findings would be silently dropped.
- Signal: review comments on a pull request by an account other than the owner's. free poll.
  `[verified]` that the filter rule exists.
- Do: decide explicitly which bot accounts are trusted for review comments (a two-way door: an
  allow list in githerd's config, read from master), or say that bot reviews are ignored.
- Who: githerd's code.
- Done: the choice is recorded and the status board counts what was hidden.

### Pull request from another account
- Anticipated: the repository is public.
- Signal: `user.login` differs from the authenticated account. free poll. `[verified]` rule.
- Do: ignore it entirely and count it on the status board; never hand its text to an agent.
- Who: githerd's code.
- Done: n/a.

### Pull request backlog grows
- Seen: 14 to 22 open on 10-01, 23 on 10-03, both from shared causes; the owner noticed first.
- Signal: open pull request count and the histogram of "why not merging" reasons. free poll.
  `[verified]`
- Do: when one reason dominates, it is a shared cause; say so on the status board without being
  asked.
- Who: githerd's code.
- Done: the dominant reason is handled.

---

## 4. Issue lifecycle

470 issues in 30 days, all from the owner's account (Claude sessions file them), 307 in one bulk
filing; 218 open. Every issue carries one type, one priority and one effort label. The owner gives
batch orders by label ("fix all critical bugs").

### New issue
- Seen: 15 to 35 a day outside the bulk filing; one open issue lacks a priority.
- Signal: `issues?since=` with ETag. free poll. `[verified]`
- Do: an agent adds missing labels from the existing set only (never invents a label) and checks
  for duplicates and overlap with open work.
- Who: an agent (Claude judgment); githerd's code validates labels.
- Done: one type, one priority and one effort label.

### Issue from another account
- Anticipated: the repository is public.
- Signal: author differs from the authenticated account. free poll. `[verified]` rule.
- Do: ignore; count it on the status board.
- Who: githerd's code.
- Done: n/a.

### Duplicate issue
- Seen: one recorded (737 filed before 673 was found); no issue has ever been closed as a duplicate,
  so the real number is unknown.
- Signal: Claude judgment against open issues when an issue is filed or re-triaged. One judgment
  turn per new issue. `[NO RELIABLE SIGNAL]` mechanically; judgment is the only option.
- Do: propose closing as duplicate with the link; githerd's code closes after a grace period unless
  the owner objects.
- Who: Claude judgment; githerd's code closes.
- Done: closed as duplicate with a link, or kept with a reason.

### Obsolete issue
- Seen: five label-propagation bugs filed 09-27 against code a later rewrite replaced; a run was
  spent discovering they were already gone.
- Signal: `[NO RELIABLE SIGNAL]` mechanically. The trigger is a merged pull request that Claude
  judges related; the check is Claude reading current master with a cited file or reproduction.
- Do: propose closing with the evidence; a second independent pass confirms before the proposal;
  close after grace.
- Who: Claude judgment; githerd's code closes.
- Done: closed with cited evidence, or refreshed with current facts.

### Fixed elsewhere but still open
- Seen: at least 4 (420, 421, 426, 464 on 10-01).
- Signal: the issue's timeline shows a cross-reference from a merged pull request that did not use a
  closing keyword. One REST call per issue touched by a merge. `[documented]` timeline field;
  `[verified]` that such issues stayed open.
- Do: confirm against master with evidence, then propose closing.
- Who: an agent; githerd's code closes.
- Done: closed with the merged pull request named.

### Issue needs splitting
- Seen as an owner decision: big jobs go to agents, which split them themselves; the owner is never
  asked.
- Signal: the working agent's own judgment at the start of the job.
- Do: the agent files the child issues, links them, and claims the first; githerd tracks the
  parent until all children close.
- Who: an agent.
- Done: every child closed, then the parent.

### Overlap or grouping with work in flight
- Seen: the owner's rule (conflicts must be known before work starts, so related work is done as
  one job); duplicate work happened at least 3 times without it.
- Signal: Claude judgment over the candidate issue and every open claim, at dispatch time. One
  judgment turn per dispatch. Owner-mandated; path guessing and regexes are rejected.
- Do: join an existing job, wait for it, or proceed independently; githerd's code enforces the
  answer (no second claim on overlapping work).
- Who: Claude judgment; githerd's code enforces.
- Done: no two in-flight jobs overlap without a recorded decision.

### Stale needs-decision and blocked labels
- Seen: 13 `needs-decision` and 14 `blocked`, mostly from the 09-24 bulk filing and never
  revisited; on 09-24, 48 issues were `needs-decision` until review against the one-way-door rule
  left 4.
- Signal: label age from issue events. One REST call per labelled issue during re-triage.
  `[verified]`
- Do: re-judge each against the one-way-door rule; decide the reversible ones with a written
  decision comment and remove the label; send the real one-way doors to the owner queue.
- Who: an agent; the owner for real one-way doors.
- Done: every remaining `needs-decision` is a true one-way door in the owner queue.

### Issue needing a one-way-door decision
- Seen: about 4 live; one decision was never raised for two days.
- Signal: the agent's judgment while triaging or working.
- Do: one owner-queue item with the question, the options and what each costs to undo; the job is
  parked, its worker freed.
- Who: the owner.
- Done: the owner's answer is recorded and the work resumes.

### Owner answers on an issue
- Anticipated as the normal way a parked question is answered from a phone.
- Signal: an issue comment by the authenticated account on a parked issue. free poll of
  `issues/comments?since=`. `[verified]` endpoint.
- Do: unpark and re-queue with the answer attached.
- Who: githerd's code.
- Done: the job is back in the queue.

### Owner edits an issue after work started
- Anticipated: the owner changes scope while an agent works on it.
- Signal: `updated_at` later than the claim, with body or label changes. free poll.
- Do: tell the working session (a doorbell, not an order; see section 5) and attach the diff of the
  issue text to the job record.
- Who: githerd's code.
- Done: the session acknowledged through a tool call.

### Critical issue in nobody's hands
- Seen: on 10-02 two critical bugs were in no session's list, and 7 of 15 high-priority bugs taken
  by the other session had no pull request and no known status.
- Signal: a critical or high issue with no claim and no linked pull request. free poll plus
  githerd's claims. `[verified]`
- Do: it is next in the queue after master and shared incidents; a claim with no progress for a
  limit is released.
- Who: githerd's code.
- Done: claimed and progressing.

### Owner batch order by label
- Seen: "fix all critical bugs" or "fix all high priority bugs" four times (09-24, 09-25, 09-27,
  10-02), each with the instruction to agree, disagree or ask, and to label disagreements
  `blocked`.
- Signal: the order is typed into a session. `[NO RELIABLE SIGNAL]` unless that session forwards it
  to githerd through a tool call.
- Do: the order becomes a githerd record with its issue list fixed at that moment; githerd reports
  progress against it and anything dropped.
- Who: the receiving session records it; githerd's code tracks it.
- Done: every issue in the order is closed, or labelled `blocked` with a reason.

### Bulk filing
- Seen: once (307 issues on 09-24).
- Signal: many new issues in one poll. free poll.
- Do: triage at a bounded rate; never dispatch work for all of them at once.
- Who: githerd's code; agents.
- Done: all labelled.

### Issue that touches Cytoscape.js
- Seen: the owner's order on 10-02: never comment on any Cytoscape.js issue or repository.
- Signal: the issue or job mentions Cytoscape. local.
- Do: the job carries the rule, and the worker's deny rules block `gh` writes to any repository
  outside graphty-org.
- Who: githerd's code.
- Done: n/a (a standing guard).

### Issue that needs an owner-only system change
- Seen: system packages that need root (bubblewrap, socat), a dev-container rebuild pending for 8
  days, an OS upgrade deferred because it stops all work.
- Signal: the agent's judgment while working.
- Do: owner queue with the exact command or step; the dependent work is parked, everything else
  continues.
- Who: the owner.
- Done: the owner did it; the job resumes.

### Agent closed an issue the owner reopens
- Anticipated with any automated close.
- Signal: a `reopened` event by the authenticated account. free poll. `[documented]`
- Do: record the reopen as a veto; never close that issue automatically again.
- Who: githerd's code.
- Done: n/a.

### Defects found but never filed
- Seen: six defects never filed and two promised fixes never done (audit of 09-29).
- Signal: `[NO RELIABLE SIGNAL]`. A finding mentioned in a transcript and not filed leaves no
  mark on GitHub.
- Do: a job's done-condition includes "every defect found was filed or fixed", which the agent
  lists in its completion record and githerd checks against GitHub.
- Who: an agent; githerd's code checks the list.
- Done: each listed defect has an issue or a commit.

### Issues from automated stages
- Seen: since 10-02 new issues come from SonarQube burn-down stages and the Cytoscape study.
- Signal: free poll; the batch shows as many issues from one session in a short time.
- Do: same triage; group by Claude judgment so they become a few jobs, not dozens.
- Who: Claude judgment; githerd's code.
- Done: labelled and grouped.

---

## 5. Agents (the interactive Claude sessions doing the work)

What githerd can see, measured: every live session writes `~/.claude/sessions/<pid>.json` with
`status` (`busy`, `idle`, `waiting` with `waitingFor`), `sessionId`, `cwd`, `name` and tmux pane;
`claude agents --json` lists live sessions and filters dead entries; background sessions
(`claude --bg`) keep `~/.claude/jobs/<id>/state.json` with `done` or `blocked`; Stop hooks receive
`last_assistant_message` and can inject the next instruction (up to 9 consecutive blocks); a
channel push is obeyed when the session is idle and ignored while it is busy; an MCP tool call is
moved to the background after 120 s; a session cannot be trusted to end itself.

### Session died
- Seen: crashes and kills leave stale registry files (14 of 22 registry files and 11 of 19 sockets
  belonged to dead processes when measured).
- Signal: the pid in the registry no longer exists (`kill -0`), or the session drops out of
  `claude agents --json`. local, free. `[verified]`
- Do: verify on GitHub what the job left (branch, pushed head, pull request); release the claim;
  start a fresh session for the job with the previous attempt's findings and the existing worktree.
- Who: githerd's code.
- Done: the job has a live session again, or is complete on GitHub.

### Session stopped on an API error
- Seen: 548 subagent transcripts ended on an error: 393 on the Consumer Terms change (10-02), 129 on
  session or weekly usage limits, 12 on overload, 7 on server errors; the owner restarted after
  "Claude API Error" three times on 09-22.
- Signal: the error text in the transcript's last record (`[verified]` by extraction over 12,935
  transcripts); the StopFailure hook event with reasons `rate_limit`, `overloaded`,
  `billing_error`, `authentication_failed` (`[documented]`, not tested here).
- Do: by reason. Overload or server error: resume the same session after a wait. Usage limit: stop
  all dispatch until the reset time, then resume every interrupted job, urgent ones first.
  Terms or billing: one owner item.
- Who: githerd's code; the owner for terms and billing.
- Done: every interrupted job has a live session or is complete.

### Usage limit approaching
- Seen: the weekly limit stood at 82% during the measurements; "my limit just reset, carry on";
  "we hit our claude usage limit, make sure we have recovered all our workflows". The account is
  switched with cswap.
- Signal: `[NO RELIABLE SIGNAL]` that a program can read. The percentage appears as on-screen text
  in a session; no file or API carrying it was found.
- Do: keep enough of the limit for urgent work (master, shared failures) by lowering the number of
  workers as it is consumed, once a readable signal exists.
- Who: githerd's code.
- Done: urgent work never waits on a limit spent by routine work.

### Waiting on a permission prompt
- Seen: workflow subagents sat over 80 minutes on `git stash list`; a subagent waited 4 hours for an
  owner approval to retry a push.
- Signal: registry `status: "waiting"`, `waitingFor: "permission prompt"` (`[verified]`, local,
  free); the Notification hook with `permission_prompt` (`[verified]` the owner's hook already fires
  on it). Whether a subagent's prompt inside a session shows in the registry is `[NO RELIABLE
  SIGNAL]` (untested).
- Do: githerd never answers a permission prompt on the owner's behalf. It records the blocked
  command; if a known-safe alternative exists, the job is re-issued with it in a fresh session;
  otherwise it is an owner item to add an allow rule.
- Who: githerd's code; the owner for allow rules.
- Done: the session is running again.

### Permission classifier refusal
- Seen: 15 refusals, each stopping work until the owner answered; one cost the owner about 75
  minutes; an ordinary `git push` was called "irreversible local destruction". The classifier reads
  the session's own conversation, so a subagent never sees an authorization the owner gave its
  parent. After 3 consecutive or 20 total blocks, auto mode falls back to prompting
  (`[documented]`).
- Signal: the refusal text in the transcript's tool result (`[verified]` it is there); afterwards
  the permission-prompt signal above.
- Do: record it as a blocker with the exact action; never retry it through another session or a
  reworded command; owner item to add a permission rule when the action is legitimate.
- Who: githerd's code; the owner.
- Done: the action is allowed by rule, or the job no longer needs it.

### Claimed but idle
- Seen: four green GPU pull requests untouched for two days; 7 of 15 claimed high-priority bugs had
  no pull request and no status; idle sessions do nothing until prompted.
- Signal: registry `status: "idle"` for longer than a limit while the job's done-condition is false
  on GitHub. local plus free poll. `[verified]`
- Do: ring the doorbell (a channel push that says only "call githerd for your job state", or tmux
  keystrokes when the pane is idle, or a cross-session message); after a fixed number of rings with
  no tool call back, end the session and re-dispatch.
- Who: githerd's code.
- Done: the session made a githerd tool call, or the job has a new session.

### Busy but making no progress
- Seen: a close-out script waited 25 hours on a hung test run; "you've been on the same step for 50
  minutes"; a worker sat in uninterruptible sleep until reboot.
- Signal: registry `busy` while the transcript file has not grown and no tool has started for longer
  than the longest expected tool (a full pre-push gate is about 15 minutes; a push can wait 60 to
  120 minutes in the lock, which githerd can see separately). local. `[verified]` inputs;
  `[NO RELIABLE SIGNAL]` that tells a legitimately long tool from a hung one without a per-tool
  bound.
- Do: past the bound, interrupt (Escape through tmux) and ask for status; if that fails, end and
  re-dispatch. Long known waits (gate, push lock) are excluded by reading the lock.
- Who: githerd's code.
- Done: transcript growing again, or a new session.

### Stuck repeating a wrong theory
- Seen: the worker-death chase (4 days, 10 changes, 4 helped; the answer was a set difference in
  every failing log) and the Windows renderer chase (4.5 hours on a wrong theory).
- Signal: attempts on one failure key with no change in its outcome. local. `[verified]`
- Do: after a fixed attempt budget, the next attempt is a fresh session told the previous theories
  and that they failed, with an evidence-first instruction (read the logs for what differs, build a
  cheap reproduction lane); after that budget, one owner item with the findings.
- Who: githerd's code; agents.
- Done: fixed, or escalated once.

### Agent claims done when it is not
- Seen: about 8: "every check green" while two were red; "the migration is done" when a third was
  done; "the release did not land" when it had; "pushed" after the gate refused.
- Signal: GitHub state against the job's done-condition. free poll. `[verified]`
- Do: the agent's report is a claim githerd checks; a claim that does not verify is a failed
  attempt.
- Who: githerd's code.
- Done: the done-condition holds on GitHub.

### Two sessions on the same work
- Seen: at least 5 (red master 09-24, College football, glyph fix, design docs, the 3.0.0
  release).
- Signal: two claims in githerd for overlapping work (local); for sessions that never claimed, two
  sessions whose branches or pull requests touch the same issue (free poll plus registry cwd).
  Sessions not started by githerd are visible only if they claim or carry githerd's hooks.
- Do: atomic claims before any work; a session not using githerd that is seen on a claimed item is
  sent one message saying who holds it.
- Who: githerd's code.
- Done: one holder per item.

### Session githerd did not start, working on the pipeline
- Seen: the other session ran for two weeks beside this one, exchanging 134 messages; the owner
  asked "how are you communicating with the other agent that's working in this workspace?" and got
  no answer.
- Signal: SessionStart and Stop hooks in the repository's project settings register every session
  opened in the repository, with `session_id`, `cwd` and transcript path (`[documented]` input
  keys, `[verified]` for Stop). `claude agents --json` lists them without hooks (`[verified]`).
- Do: show them on the status board; offer them the same claim tools; never assign them work they
  did not ask for.
- Who: githerd's code.
- Done: every live session in the repository is on the board.

### Owner takes over a worker
- Anticipated as normal: the owner can talk to every worker, and owner input legitimately changes
  what it does.
- Signal: a UserPromptSubmit hook event in that session (`[documented]`, not tested here).
- Do: mark the job "steered by owner"; stop treating that session's silence or detours as a stall;
  do not ring its doorbell until it calls githerd again.
- Who: githerd's code.
- Done: the session calls githerd again, or the owner ends it.

### Owner types into the wrong worker
- Seen: 3 times with two sessions; more likely with more workers.
- Signal: `[NO RELIABLE SIGNAL]`. Only the worker can judge that a message does not fit its job.
- Do: every worker is named after its job (`githerd-pr-412`) so the window title says what it is;
  its instructions say to answer "this is the worker for X" and do nothing when a message is about
  something else.
- Who: the agent.
- Done: n/a.

### Owner asks a question and the worker acts on it
- Seen: at least 4 owner complaints ("just asking, don't implement anything yet", "answer my
  question before you carry on", "what are you doing?").
- Signal: `[NO RELIABLE SIGNAL]`.
- Do: the worker's instructions say a question is answered, not executed.
- Who: the agent.
- Done: n/a.

### Worker asks the owner something
- Seen: 206 messages ended with `ACTION NEEDED:` in one session, many repeating the same item; the
  owner missed the one question that mattered.
- Signal: the Stop hook's `last_assistant_message` ends with a question or an `ACTION NEEDED:` line.
  hook. `[verified]` that the field carries the final text.
- Do: githerd decides: a one-way door, visual approval, money, credential or login becomes one
  owner-queue item and the job parks; anything else is answered by githerd's code with the
  owner's standing rule ("decide it yourself and record why") through the Stop hook.
- Who: githerd's code.
- Done: the worker continues, or the item is in the owner queue once.

### Doorbell not acted on
- Seen in measurement: a channel push that arrives while the session is busy is shown but wrapped
  in a notice telling the model not to act on it; a cross-session message to a session in another
  permission mode may be held for the owner's approval while the send still reports success.
- Signal: no githerd tool call from the session within a limit after the push. local. `[verified]`
- Do: pushes carry no instructions, only "call githerd"; githerd rings again only when the session is
  idle; delivery counts only when the session calls back.
- Who: githerd's code.
- Done: the session called back.

### Session start blocked on a dialog
- Seen in measurement: a session started with a development channel shows a confirmation dialog on
  every start and has no registry file until it is answered.
- Signal: a session githerd started has no registry entry after a few seconds; the pane shows the
  dialog. local. `[verified]`
- Do: githerd answers its own startup dialog through tmux, or packages its channel as an approved
  plugin so the dialog never appears (untested).
- Who: githerd's code.
- Done: the registry entry exists.

### Job ends but the session lingers
- Seen: finished agents stayed listed as running because of leftover background shells (09-24,
  09-26); a session cannot end itself (it refused to kill its own parent as a suspected injection).
- Signal: the job's done-condition holds on GitHub while the session is still alive; the Stop hook
  input lists `background_tasks`. `[verified]`
- Do: githerd ends the session from outside (`/exit` through tmux, or SIGTERM); the conversation
  stays resumable.
- Who: githerd's code.
- Done: the registry entry is gone.

### Rules lost to compaction
- Seen: 8 compactions in one session, 31 across the main sessions; the owner asked for an audit of
  silently dropped work.
- Signal: a SessionStart hook with the `compact` matcher (`[documented]`).
- Do: re-inject the job record (constraints, done-condition, previous findings) after every
  compaction; hard rules live in deny rules and hooks, not in conversation.
- Who: githerd's code.
- Done: n/a (a standing guard).

### Worker in a shared or stale tree
- Seen: an agent resolved conflicts in the owner's main checkout where the other session had 399
  uncommitted files; agents read another agent's new file as established history; worktrees with
  no `node_modules` made "command not found" look like a pass; a worktree missing a package merged
  that day failed its first push.
- Signal: at job start: the session's cwd is the job's own worktree; the worktree has dependencies
  installed and built; its base is the green commit. local. `[verified]`
- Do: one job, one worktree, created by githerd from the green commit and prepared before the
  session starts.
- Who: githerd's code.
- Done: checks pass before the session gets the job.

### Commands that hang or harm shared state
- Seen: `git stash` (shared across every worktree), `git reset`, `git checkout <file>` and `git
  clean` hung subagents on unanswered prompts; Commitizen's interactive commit hook hung scripted
  commits twice; a subagent skipped the hook to get past it; a test running `git init` during the
  gate flipped the main checkout to `core.bare=true`.
- Signal: prevention, not detection: deny rules in the worker's session settings (passed at start,
  never in `~/.claude`). For `core.bare`, a local read of the main checkout's config. `[verified]`
- Do: deny rules for the hazardous commands; non-interactive commit settings for workers.
- Who: githerd's code.
- Done: n/a (a standing guard).

### Agent loosens a test or threshold to get green
- Anticipated from prior art ("AI agents still make things up to get that test case to pass") and
  the owner's rule (fix root causes, never loosen thresholds).
- Signal: `[NO RELIABLE SIGNAL]` mechanically; a fix whose diff touches only tests or numeric
  limits is a hint for a Claude review pass.
- Do: a separate review judgment on fix-job diffs before auto-merge.
- Who: Claude judgment.
- Done: n/a.

### Agent tries something only githerd or the owner may do
- Anticipated: push to master, force-push, merge, enable auto-merge, accept visual changes, write
  baselines, write to a Cytoscape repository.
- Signal: prevention: master's ruleset (server side, `[verified]`), deny rules in the worker's
  settings (`[documented]` to hold even when permissions are bypassed).
- Do: the rule lives in rulesets and deny rules; the prompt only explains it.
- Who: githerd's code.
- Done: n/a.

### Session budget exhausted mid-job
- Seen: the session's web-search budget (200) ran out mid-research and needed a restart (09-27).
- Signal: the tool error text in the transcript. local. `[verified]`
- Do: start a fresh session for the job with its record.
- Who: githerd's code.
- Done: the job continues in a new session.

### Spending without progress
- Anticipated: one multi-agent system elsewhere cost about $100 an hour at peak; a review loop here
  ran 5 rounds of about 40 minutes for 2 mechanical fixes each, and a spec grew from 114 KB to 545 KB
  with findings flat.
- Signal: token usage in the transcript grows while nothing changes on GitHub for the job. local.
  `[verified]` that usage is in the transcript.
- Do: a per-job budget of time and attempts; past it, the job stops and its record says why.
- Who: githerd's code.
- Done: n/a.

### Machine overload
- Seen: load 81 on 32 threads from 15 parallel fixes; load above 500 during whole-project runs;
  23 headless Chromium at once (49 to 51 GB, swap full, a monitoring alert); timing-based results
  taken under that load were invalid.
- Signal: `/proc/loadavg` against core count, `/proc/meminfo` free memory and swap, the count of
  browser processes. local, free. `[verified]`. The owner's rule: measure before blaming resources.
- Do: no new dispatch above the limits; browser-driving jobs share the 4-slot browser lock;
  benchmarks and timing tests are not run locally under load.
- Who: githerd's code.
- Done: below the limits.

### Orphan processes and servers
- Seen: 2.7 GB of `playwright-mcp` processes; Storybooks left running; earlier, abandoned servers
  held 30 GB; idle watchers producing empty notifications.
- Signal: servherd's list, and processes githerd started (recorded by pid, start time and boot id)
  whose job has ended. local. `[verified]`
- Do: stop what githerd or its jobs started when the job ends; leave everything else alone and list
  it.
- Who: githerd's code.
- Done: nothing githerd started outlives its job.

---

## 6. githerd itself

### githerd crashed
- Seen: the stuck-pull-request watcher crashed on every run for a day on a syntax error; 23 pull
  requests backed up before the owner asked why.
- Signal: githerd's heartbeat file (the time of its last completed reconcile) is older than a few
  ticks. local, free. The owner rejected a GitHub Actions safety net, so the watcher has to be
  local: every Claude session in the repository can check the heartbeat from a SessionStart or Stop
  hook and say so loudly. `[verified]` that hooks run in every session; `[NO RELIABLE SIGNAL]` while
  no Claude session is running at all.
- Do: exit loudly on an unrecoverable error, never loop on it; whoever sees a stale heartbeat
  (a hook, the MCP server) restarts githerd.
- Who: githerd's code; hooks.
- Done: the heartbeat is fresh.

### githerd alive but stuck
- Anticipated: a process that exists but whose loop is blocked on a hung call.
- Signal: the same heartbeat, which records completed ticks, not process existence. local.
- Do: same as a crash; every outbound call has a timeout.
- Who: githerd's code.
- Done: ticks completing.

### More than one githerd
- Anticipated, and likely: if githerd starts from an MCP server and every Claude session starts its
  own MCP servers, every session would start its own githerd.
- Signal: a lock held by the running daemon (pid plus start time plus boot id). local. 
- Do: one daemon per machine; MCP servers are thin clients of it and never reconcile on their own.
- Who: githerd's code.
- Done: exactly one daemon.

### Stale or backwards API answers
- Seen: twice on 10-02, GitHub's "latest run" answer returned a failed run from 09-30, raising two
  false red-master alarms.
- Signal: run ids going backwards. free. `[verified]`
- Do: never accept an answer older than one already seen; red and conflict need two sightings.
- Who: githerd's code.
- Done: n/a.

### GitHub API outage or errors
- Anticipated with precedent (HTTP 403 bursts on artifacts, network stalls).
- Signal: 5xx, timeouts, or 403 with `X-RateLimit-Remaining: 0`. free. `[verified]` headers.
- Do: state becomes "unknown since <time>", shown on the status board; no action is taken on stale
  data; no alarm until it lasts.
- Who: githerd's code.
- Done: calls succeed.

### Container restart
- Anticipated: the owner chose this container as the single host. A restart kills githerd, every
  session and tmux, and leaves stale registry files.
- Signal: the boot id changed since githerd last ran. local. `[verified]` that stale files remain
  after a hard stop.
- Do: on start, rebuild state from GitHub and githerd's own job ledger (never from memory); every
  job whose session is gone is re-dispatched, urgent first; sessions can be resumed with
  `claude --resume <sessionId>`.
- Who: githerd's code.
- Done: every job has a live session or is complete.

### Events missed while down
- Seen in measurement: GitHub does not retry failed webhook deliveries; nothing arrives while the
  receiver is down.
- Signal: none needed: the poll is the truth.
- Do: a full reconcile on start and on every tick; events only shorten the wait.
- Who: githerd's code.
- Done: n/a.

### Forged or replayed relay events
- Anticipated: anyone with the relay URL can read the stream and post fake events.
- Signal: `X-Hub-Signature-256` fails verification; delivery ids repeat. local. `[verified]` that the
  header survives the relay.
- Do: drop it and count it.
- Who: githerd's code.
- Done: n/a.

### Bad configuration
- Anticipated: a config edit with a typo; a branch loosening the rules that judge it.
- Signal: validation at start and whenever master's config changes. local.
- Do: config is read from master only; an invalid config stops githerd loudly rather than running
  with a partial one.
- Who: githerd's code.
- Done: valid config loaded.

### githerd's own code changes
- Anticipated: githerd lives in this repository and agents will improve it.
- Signal: master moved and the change touches githerd's own files. free.
- Do: restart on the new code at a quiet point; if the new code fails its self-test, say so loudly
  (never run a version that fails silently).
- Who: githerd's code.
- Done: running master's githerd.

### Writes that silently do nothing
- Anticipated: a dry-run gate left on, or a write that fails without an error.
- Signal: githerd's write ledger shows intended writes with no matching change on GitHub. local plus
  free poll.
- Do: every write is read back; a mismatch is shown on the status board.
- Who: githerd's code.
- Done: n/a.

### Owner notifications broken
- Anticipated from prior art: a notifier that fails silently is the same failure as a watcher that
  fails silently.
- Signal: the notify command's exit status. local.
- Do: a "phone alerts broken" line at the top of the status board, and in every session's hook
  output.
- Who: githerd's code.
- Done: a notification succeeds.

### githerd's own Claude judgment fails
- Anticipated: the judgment turn githerd uses for triage, overlap or grouping errors out, times out
  or returns something invalid.
- Signal: the response fails schema validation, or the call errors. local.
- Do: retry within a budget; an item still unjudged is never dispatched alongside work it might
  overlap.
- Who: githerd's code.
- Done: a valid judgment.

### githerd spends what the sessions need
- Seen in measurement: the REST budget and the Claude usage limit are shared with every session.
- Signal: rate headers; githerd's own count of judgment turns.
- Do: githerd's own spending is visible on the status board and bounded.
- Who: githerd's code.
- Done: n/a.

---

## 7. The owner

The owner's attention is the scarcest resource. Counted from 1,364 owner messages: 35 visual
approvals, 18 merge instructions, 18 "why did X fail", 14 "are you waiting on me", 13 "still
going", 11 typed into the wrong session or about another session. 206 `ACTION NEEDED:` lines in one
session.

### Owner away for hours or days
- Seen: the owner said "there's no guarantee that I will respond".
- Signal: not needed; nothing waits on the owner except owner-only items.
- Do: urgent work proceeds by Claude alone; reversible decisions are made and recorded; owner-only
  items wait in the queue without blocking unrelated work; irreversible automatic steps never skip
  their grace period.
- Who: githerd's code; agents.
- Done: the pipeline moved everything that did not need the owner.

### Visual review queue grows
- Seen: review was the merge bottleneck from 10-01 (150, 357 and 150 images on three pull
  requests).
- Signal: count and age of pull requests waiting on review. free poll.
- Do: order the list by fewest diffs; hold new visual-changing work when the queue is long; batch
  review links into one message when the owner can act.
- Who: githerd's code; the owner reviews.
- Done: queue within its limit.

### One-way door waiting
- Seen: majors, a public option, a performance target; one decision unraised for two days.
- Signal: githerd's own owner queue.
- Do: one item each, with the question, the options and the undo cost; other work continues.
- Who: the owner.
- Done: answered.

### Money, credentials, logins, system changes
- Seen: machine.dev credits, subscription and two top-ups; the Chromatic overage; npm first publish
  for 4 packages; signing key; passkey; Consumer Terms; root packages; container rebuild.
- Signal: each has its exact text in the entries above.
- Do: one `ACTION NEEDED:` line per item when it becomes actionable, never repeated unchanged.
- Who: the owner.
- Done: the next call that needed it succeeds.

### Owner asks for status
- Seen: 29 status questions in one session; "is master still red? or did we fix that?"; "is
  anything waiting on me?" asked at least 14 times.
- Signal: n/a.
- Do: one status view always current, reachable from any session through a githerd tool: master
  and release state, incidents, jobs and their sessions, why each pull request is not merging, the
  owner queue (empty when empty), and githerd's own health.
- Who: githerd's code.
- Done: the owner can answer his own question in one call.

### Alert fatigue
- Seen: 206 `ACTION NEEDED:` lines, many repeating; the owner: "don't tell me ACTION NEEDED until it
  is actually needed".
- Signal: githerd's own alert log.
- Do: alert once per item when it becomes actionable; again only when it changes; nothing for work
  in progress.
- Who: githerd's code.
- Done: n/a.

### Owner policy given in one session
- Seen: the "nothing merges until every story is approved" rule reached one session; the other
  merged three pull requests before it heard (10-01); five merged across both sessions.
- Signal: `[NO RELIABLE SIGNAL]` unless the receiving session records it through githerd.
- Do: policy lives in githerd's config on master and is enforced in code; a session told a new
  rule records it there (through a pull request or a githerd tool).
- Who: the session that heard it; githerd's code.
- Done: every session and githerd enforce it.

### Work the owner asked for is silently dropped
- Seen: the 09-29 audit found a failed close command, an undone branch update, two promised fixes
  never done, six defects never filed, an unraised decision, an unanswered question and four green
  pull requests untouched.
- Signal: githerd's record of orders and jobs, each with a terminal state. local.
- Do: every order and job ends in done, parked with a reason, or failed with findings; the status
  board shows anything older than a limit with no terminal state.
- Who: githerd's code.
- Done: nothing is open without a holder and a state.

### Owner approves in chat but the agent cannot act
- Seen: merging PR 585 was asked of the owner 4 or more times over about 10 hours because the
  classifier refused the merge after the owner had approved it.
- Signal: a classifier refusal on an action the owner authorized (see section 5).
- Do: merges happen through auto-merge or Mergify by rule, not by an agent's merge command, so this
  path is not needed.
- Who: githerd's code.
- Done: n/a.

---

## 8. Combinations that defeat single-situation handling

These are anticipated. Each pairs two entries above that are each handled, but whose handling
conflicts.

### Red master while the usage limit is spent
- Reason: both happened on the same days (09-21, 09-28, 10-02). Red master needs an agent and no
  agent can run.
- Do: the red-master job is first when the limit resets; the status board shows "red, waiting for
  limit reset at <time>"; the owner is told once (switching accounts is his action).

### Red master whose fix needs the owner
- Reason: node-forge needed a breaking remote-logger 2.0 (10-02); the GPU lane needed a top-up.
- Do: an agent first looks for a reversible way back to green (an audit exception with a review
  date is one; disabling a gating lane is not, because it removes a gate). Only when none exists is
  the owner item raised, once, saying why.

### Shared failure inside a held breaking pull request
- Reason: the advisory fix on 10-02 was itself breaking.
- Do: the owner decides whether the major ships now; githerd does not let the breaking rule
  silently block the shared fix or the shared fix silently skip the breaking rule.

### Container restart during a release
- Reason: the release pushes tags, then a version commit, then publishes; a stop between steps
  leaves the half-state seen on 09-30.
- Do: on restart, the release check (tags against npm against master) runs before anything else.

### Owner steers a worker into another worker's job
- Reason: two workers then hold the same work and only one has the claim.
- Do: the claim check runs on every githerd tool call, not only at dispatch.

---

## 9. Situations with no reliable signal

A design must say how it handles each, because detection cannot be relied on.

| Situation | Best available | Why it is not reliable |
|---|---|---|
| Semantic conflict between open pull requests | CI after updating onto master that contains the other | Nothing before one merges; Claude's overlap judgment is a forecast |
| Breaking change nobody marked | Claude review of exported API | The commit marker is the author's claim; no API diff check exists |
| Duplicate issue | Claude judgment at filing | No mechanical signal |
| Obsolete issue | Claude reading current master | No mechanical signal |
| Defect found but never filed | Done-condition listing defects | Leaves no mark on GitHub |
| Owner batch order or new policy typed into a session | The session recording it through githerd | Only the receiving session sees it |
| Owner types into the wrong worker; question taken as an order | The worker's own judgment | Only the worker can tell |
| Agent loosens a test to pass | Claude review of fix diffs | No mechanical rule separates a fix from a weakening |
| Usage limit approaching | none readable | The percentage is on-screen text only |
| Paid service overage (Chromatic) | the owner's bill | No usage API known |
| GPU runner balance before it hits zero | spend estimate from job minutes | No balance API known; rate unmeasured |
| Hung tool versus a legitimately long one | per-tool time bounds | Registry shows `busy` for both |
| Permission prompt inside a subagent | untested | Unknown whether the registry shows it |
| githerd down while no Claude session runs | none | The only local watchers are sessions' hooks |

---

## 10. Counts

| Family | Situations | Seen | Anticipated | No reliable signal |
|---|---|---|---|---|
| Master and release health | 15 | 14 | 1 | 0 |
| External drift | 14 | 12 | 2 | 2 (paid service overage; GPU balance before zero) |
| Pull request lifecycle | 32 | 26 | 6 | 2 (semantic conflict; unmarked breaking change) |
| Issue lifecycle | 19 | 15 | 4 | 4 (duplicate; obsolete; batch order; unfiled defects) |
| Agents | 27 | 23 | 4 | 6 (usage limit; subagent permission prompt; hung versus long tool; wrong window; question taken as order; loosened test) |
| githerd itself | 14 | 4 | 10 | 1 (githerd down while no session runs) |
| Owner | 9 | 9 | 0 | 1 (policy given in one session) |
| Combinations | 5 | 0 | 5 | 0 |
| Total | 135 | 103 | 32 | 16 |

"Seen" counts situations with at least one occurrence in the evidence, including those observed only
during the platform measurements. A situation with a partial signal is counted once under "no
reliable signal" when the part that matters for early detection is missing.
