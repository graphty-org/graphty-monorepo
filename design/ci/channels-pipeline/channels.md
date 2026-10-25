# Channels and promotion: canary, nightly, production

Status: design, 2026-10-24. Issue #3418. Part of the channels pipeline design
(`design/ci/channels-pipeline/`); the pull request checks, the Cloudflare test store, stories as tests,
feature flags and CI time budgets are their own sections and are only referenced here.

## 1. The shape in one table

graphty ships through three channels. Each is one public site and one npm dist-tag, and each holds
exactly the bytes the channel before it held.

| Channel    | Site (GitHub Pages) | Site repository                                     | Git ref              | npm dist-tag | Moves when                                                                                                                   |
| ---------- | ------------------- | --------------------------------------------------- | -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| canary     | canary.graphty.app  | graphty-org/graphty-monorepo (its own Pages)        | `master`             | none         | every green master build, minutes after a pull request merges                                                                |
| nightly    | nightly.graphty.app | graphty-org/graphty-nightly (new, built files only) | `channel/nightly`    | `next`       | a green 6-hour full run: automatically when no screenshot changed, after the owner's signed screenshot approval when one did |
| production | graphty.app         | graphty-org/graphty-site (exists, built files only) | `channel/production` | `latest`     | only when the owner triggers it and approves the deployment                                                                  |

Code lives only in graphty-monorepo. The two site repositories hold built files and a small deploy
workflow, nothing else. A version number is created once, at nightly, and the same number moves to
`latest` at production; nothing is rebuilt after canary.

Why this shape, against the record:

| What went wrong                                                                                                                                                                                                                                                        | What this design does instead                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| graphty.app deployed every green master build while master ran no tests, so the live site and docs described code the T4, Hosts, macOS and LLM lanes had not passed (issue #3318: graphty.app on master `a870943` while npm `latest` stayed on graphty-element 3.30.0) | graphty.app and npm `latest` move only together, by one promotion of a nightly that passed every lane                     |
| A landed change was visible nowhere until its cut reached master; the last four cuts took 14.6 h, 11.6 h, 2.2 days and 16.3 h                                                                                                                                          | canary shows a merged change within one master build (about 25 minutes today, about 8 once the Build regression is fixed) |
| The release train ran 12 empty attempts in a row (2026-10-21 to 10-23) because master did not move                                                                                                                                                                     | the full run tests master's tip, which moves about 15 times a day; a slot with nothing new does nothing                   |
| Each cut needed 3 to 6 screenshot Finish rounds; in 29 of 53 CI runs the only red job was "waiting for the owner"                                                                                                                                                      | screenshots are decided once per nightly candidate, and "waiting for the owner" is a state, never a red run               |
| Rebuilding for release ships code nobody tested (Mozilla's release-promotion lesson)                                                                                                                                                                                   | canary's assembled site and the full run's builds are the same artifacts nightly and production serve                     |
| One account for owner and agents, so "only the owner may promote" was a rule, not a control                                                                                                                                                                            | production promotion waits on a GitHub environment the owner alone can approve; agents act as a separate machine account  |

## 2. What each deploy contains

Every site is assembled once, by `tools/assemble-pages-site.sh` in `deploy-pages.yml`, from one
master commit's push build, and the tarball is identical on all three sites: the graphty app, the
VitePress docs with the API pages, the seven Storybooks (graphty-element, graphty, compact-mantine,
algorithms, layout, cytoscape-extensions, graph-io fidelity), the algorithms and layout demos, the
hosted datasets under `/data/graph-samples/v1/` (`graph-samples/scripts/build-hosted.mjs`), and the
build stamp `<meta name="graphty-build" content="commit=<sha> release=<tag>">`.

The last deployed github-pages artifact measured 373 MB (2026-10-24 18:17 UTC). The hosted datasets
are under 1 MB today.

What differs per site is runtime configuration, never the build: `/site.json`, written by each
site's deploy step next to the unpacked tarball:

```json
{
    "channel": "nightly",
    "features": ["timeline"],
    "dataBaseUrl": "/data/graph-samples/v1/",
    "sentryEnvironment": "nightly"
}
```

The app reads it at start-up, passes the dataset base to graph-samples' `baseUrl` option (so each
site serves the app its own datasets, same-origin) and sets the element's feature attribute (see
the feature-flags section). canary's file is `tools/channels/canary.site.json` in this repository;
nightly's and production's are `site.json` in their site repositories, so changing what production
switches on is a reviewed commit in graphty-site and a redeploy, with no rebuild.

**Datasets and the npm package.** A published graph-samples defaults to
`https://graphty.app/data/graph-samples/v1/` (`DEFAULT_DATASET_BASE_URL` in
`graph-samples/src/datasets/remote.ts`). Because `next` and `latest` carry the same version, that
default cannot point anywhere else. So production's `/data/` is append-only and a superset: when a
nightly publishes, its new dataset files are added to graphty-site's `data/` directory (committed
in git, small), and production is redeployed with its current tarball plus that data. The overlay
may only add paths; a path that exists with different bytes fails the step, which is the
append-only rule fast-pipeline already set (design/ci/fast-pipeline.md section 4.6). Every site
still serves its own copy; production's simply never loses a dataset a published version names.

## 3. Where the built files live

A 373 MB site committed to git four times a day would pass GitHub's 1 GB repository guidance
within days, so sites are kept as release assets, not in git:

- Each nightly is a GitHub release in graphty-nightly, tag `nightly-<commit>`, with two assets:
  `site.tar.zst` (the canary tarball of that commit, byte for byte) and `channel.json`.
- Each production promotion is a release in graphty-site, tag `production-<commit>`, with the same
  two assets copied from graphty-nightly (a download and upload, no rebuild; the job compares
  sha256).
- Each site repository serves Pages from GitHub Actions. Its `deploy.yml` (workflow_dispatch, input
  `tag`) downloads `site.tar.zst`, unpacks it, overlays `data/` (graphty-site only), writes
  `site.json`, then runs `actions/upload-pages-artifact` and `actions/deploy-pages`. The monorepo
  starts it with a token of the existing Pages GitHub App (secrets `GRAPHTY_PAGES_APP_ID`,
  `GRAPHTY_PAGES_APP_KEY`), which needs Contents and Actions write on both site repositories.
- Each deploy commits one small `deployed.json` (tag, sha256, time, approver): the audit log.

Retention: production releases are kept for good; nightly releases that never reached production
are pruned to the newest 40 (about ten days) by the nightly job.

`channel.json`, the record of one promotion (also a row in the Cloudflare store):

```json
{ "channel": "nightly", "commit": "<candidate sha>", "versionCommit": "<chore(release) sha>",
  "versions": { "@graphty/graphty-element": "3.31.0", "@graphty/graph-format": "1.1.3" },
  "fullRun": "<release.yml run id>", "screenshots": "unchanged" | "approved:<baselines tree>",
  "siteSha256": "<hex>", "promotedAt": "<iso>", "promotedBy": "auto" | "<github login>" }
```

## 4. Canary

`deploy-pages.yml` keeps its trigger (CI completed on a master push) and its assembly steps. It
changes in three ways:

1. Its custom domain becomes canary.graphty.app (this repository's Pages setting; the owner adds
   the DNS record).
2. It always uploads the assembled tarball as an artifact named `site-<sha>` with
   `retention-days: 14`, even when it skips the deploy because a newer commit is live already.
   That artifact is what nightly later copies.
3. It writes canary's `site.json`.

The link check that resolves `https://graphty.app` links against "the site the next deploy would
publish" (`tools/check-links.sh`) keeps doing exactly that: the next deploy is canary's, built from
the same tree production will get.

## 5. The 6-hour full run

`release.yml` keeps its name and its trusted-publishing entries. It becomes the full run plus the
nightly promotion.

**Schedule.** The Cloudflare Worker in `tools/release-scheduler/` keeps its cron
(`0 0,6,12,18 * * *`) and its dispatch `{"ref":"master","inputs":{"scheduled":"true"}}`; only the
input it sends gains `mode: "full"`. Nothing in the Worker's code changes beyond that line.

**Which commit.** The pick job takes the commit canary.graphty.app serves at that moment (read from
its build stamp, as `deploy-pages.yml`'s check job already does) and freezes it for the attempt.
That commit's push build and its `site-<sha>` artifact are guaranteed to exist. The slot does
nothing when that commit was already judged by a full run (an event, not a timer: the record in
the Cloudflare store says so).

**What it runs, in parallel, on that commit:**

| Lane                                                                    | Workflow                                            | Typical time                                       |
| ----------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Every test shard (36 shards in 25 jobs) and the full screenshot capture | `ci.yml` (called)                                   | 38 to 48 min today, including a 21 to 24 min Build |
| NVIDIA T4 GPU tests and benchmarks                                      | `gpu.yml`                                           | about 50 min, the longest                          |
| Hosts: Dawn on Metal and WebKit, D3D12 WARP and Chromium                | `hosts.yml` (full scope)                            | under 45 min                                       |
| macOS work protection: WebKit, Safari, Safari on iOS                    | `work-protection-macos.yml`                         | under 40 min                                       |
| Production dependency audit                                             | `audit` job, `pnpm audit --prod --audit-level=high` | 1 min                                              |
| LLM regression (about 190 paid Gemini calls, about $0.94)               | `llm` job                                           | about 10 min                                       |

Change: `ci.yml` gains the input `reuse_build_run`. The full run passes the master push run that
built the candidate, and ci.yml's Build job downloads those `build-*` artifacts instead of
building, when they exist; when they do not, it builds ("unknown means run"). The master push
build's `retention-days` goes from 1 to 14 so they exist. This makes the tested builds the canary
builds, and cuts the run to about the T4's 50 minutes.

The LLM lane runs once per candidate commit. A restart on a new commit re-runs it only when the
LLM lane was what failed, or when the diff since the last LLM-green commit touches graphty-element's
AI code or the lockfile. That keeps it within the owner's roughly $60 a month (four candidates a
day at $0.94 would be $113). The T4 runs on every candidate, as the owner ruled on 2026-10-13.

Each lane records its results in the Cloudflare store as its last step; Coveralls stays advisory.

**Verdict.** One job, `verdict`, reads every lane's result and the capture and ends in exactly one
of four states, written to the store and announced by `tools/release-status.mjs` on the
`Release status` issue and through Pushover:

- `green-clean`: every lane passed and no screenshot differs from master's baselines. Promote to
  nightly now (section 7).
- `green-images`: every lane passed, and some screenshots differ. Wait for the owner (section 7).
- `red`: a lane failed on a test or a story errored. Section 6.
- `owner-item`: a lane failed for a reason no code change fixes (below). Announced once as an
  owner item; not bisected.

A candidate whose `nx release --dry-run` plans a major bump for any package is never promoted
automatically: it waits for the owner like `green-images`, because breaking changes need the
owner's go and the grouped major (#676, #702, #843, #1370) stays held.

**Restart on fix.** While a `red` state is open (issue "Full run red: <lane> on <sha>"), release.yml's
existing `workflow_run` trigger on a green master push starts a restart, but only when the pushed
merge references that issue (`Refs #N`, `Fixes #N`) or is the revert the pipeline round opened for
it. A restart first runs only the previously failing tests on the new tip (minutes, through the
same filter the bisect uses); only when they pass does it run the full run there. A merge that is
not a fix waits for the next slot. This answers tier 3's 49.6 hours, where every retry tested new code.

`concurrency: release-train` (no cancelling) stays: one run at a time, at most one waiting.

## 6. Red: bisect, revert, fix forward

The pipeline round (the `/pipeline-round` skill) owns every red full run.

1. **Confirm.** The `bisect.yml` workflow (new; workflow_dispatch with `good`, `bad`, `lane` and
   the failing test ids read from the store) first re-runs only the failing test files on the red
   commit, up to 5 times, on the lane's own runner. The rules are today's verification rules,
   moved from `tools/verify.mjs` (`confirm`, `bisect`, `finishBisect`) into
   `tools/bisect-core.mjs`:
    - fails 5 of 5: a consistent failure, bisect it;
    - passed and failed on this commit with the same inputs: flaky. If the store has a failure of
      the same test before the range, it was flaky before: quarantine it and file a
      `priority:critical` issue naming the range's merges as suspects, never bisected or reverted.
      If not, it is newly intermittent, a regression: bisect it, and a point is bad when it fails
      at least 1 of 5.
2. **Bisect** over master's first-parent merges between the last green full-run commit and the red
   commit (`git rev-list --first-parent <good>..<bad>`), running only the failing tests. Each point
   reuses that merge's master push build artifacts (14 days), so a point costs minutes, not a build.
   At about 4 merges per slot, that is 2 or 3 points. The culprit is named only when its parent
   passes all 5 runs (evidence, never timing); otherwise no merge is named and the issue says why.
   GPU failures are bisected first on the pipeline machine's NVIDIA card under the GPU slot (free);
   only when they do not reproduce there does `bisect.yml` call `gpu.yml` with a test filter.
   Hosts and macOS failures bisect on their own runners through the same filter input.
3. **Revert.** The round opens `git revert -m 1 <culprit merge>` as a pull request from the machine
   account, body `Refs #<red issue>`, auto-merge on the light checks, and comments on the culprit's
   issue. Its merge triggers the restart (section 5).
4. **Fix forward** on an ordinary branch and pull request, when a revert conflicts or the fix is
   smaller. The fix never changes a test expectation, a timeout, a quarantine entry, a threshold,
   a budget or a workflow in the same pull request as the product fix.

Reds no code fixes, handled as `owner-item` or by existing tools:

| Cause                                                                 | Handling (existing file)                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| T4 spot runner lost                                                   | `gpu-rerun-on-runner-loss.yml` re-runs the lane on the same run                                     |
| npm slow to list an accepted version                                  | `tools/publish-hold.mjs settle` closes the hold on the next run                                     |
| High advisory with no patched version (#3393)                         | owner item; release past it only by a reviewed `pnpm.auditConfig.ignoreGhsas` entry with the reason |
| Google refused the key or balance                                     | the `llm` job's `owner_item` output, as today                                                       |
| A pipeline tool failure (#3318: nx could not build its project graph) | `red` on the tool, fixed forward; the lane's own tests are not blamed                               |

## 7. Promotion to nightly

**green-clean** runs at once in the same release.yml run. **green-images** waits: the review page
(visual-review, see the stories section) offers the newest awaiting candidate's capture. The owner
reviews and presses Finish; Finish signs the baselines tree with his passkey as
`visual-review-approvals/<tree>.json` and opens a pull request to master that merges on the light
checks. That merge's green build fires release.yml's `workflow_run` trigger, which finds the
awaiting candidate and resumes it with `mode: promote-nightly` and no re-test. A newer candidate
that reaches `green-images` or `green-clean` supersedes an older awaiting one, so the owner always
reviews only the newest; an approval whose tree matches a newer green candidate promotes that one.

The resume step proves the approval by running the owner's gate unchanged:
`node visual-review/trusted/gate.mjs --captures <the candidate's capture> --base <channel/nightly>
--head <master tip holding the approval>`. That passes only with a passkey-signed statement of
exactly the baselines tree the candidate's images match. The step is new code beside the gate,
not an edit of it; CODEOWNERS makes the owner review it.

**The promotion steps** (reused from today's release.yml jobs, in this order):

1. `version` job: `tools/release-hold.mjs apply`, then `tools/release-version.sh` (nx release,
   conventional commits, `tools/changelog-renderer.cjs`), `tools/release-diff.mjs` to prove the
   commit changes only version fields and changelogs.
2. `land` job: merge the version commit into master's current tip and push it with one
   `{project}@{version}` tag per package, atomically, with `RELEASE_DEPLOY_KEY`, plus a
   fast-forward of `channel/nightly` to the version commit. Unchanged from today except that ref.
3. `publish` job: `nx release publish --tag next`, trusted publishing as today, then the
   existing check that every version is on npm. GitHub releases are created as prereleases.
4. `site` job: upload the candidate's `site-<sha>` tarball and `channel.json` as release
   `nightly-<sha>` in graphty-nightly, start its `deploy.yml`, then commit the candidate's new
   `/data/` files to graphty-site and start its deploy (data overlay only; production's app is
   untouched).

A failure before step 2 leaves nothing behind and the state goes to `red` on the release machinery.
A failure in step 3 after the push is today's publish hold ("Release held: publish failed on
<sha>", `tools/publish-hold.mjs`), cleared by `gh run rerun <id> --failed`. A failure in step 4
re-runs alone; npm `next` and the nightly site may differ for that long, and the job's issue says so.

**Consequence of plain versions under `next`.** npm resolves a range such as `^3.30.0` to the
highest version whatever its dist-tag, so a consumer with a caret range gets nightly versions on a
fresh install. It follows from using the same version numbers on both tags; the
installation docs say to pin an exact version to stay on production. At most four versions a day
per changed package.

## 8. Promotion to production

**Trigger.** A new workflow, `promote.yml` (workflow_dispatch; input `nightly`, default the newest
nightly; input `dry_run`). Its one job runs in the GitHub environment `production`, whose
protection is: required reviewer the owner, "prevent self-review" on, deployments only from
`master`. Anyone may dispatch it (the owner from the GitHub mobile app or `gh workflow run
promote.yml`); it does nothing until the owner approves the pending deployment in GitHub, signed
in as himself. No visual-review passkey is used here: every nightly's images were already approved
or unchanged, and the promotion moves nothing new. This is enforceable only once agents act as the
machine account and not as the owner (section 11).

**Steps**, each idempotent, so a re-run finishes a partial promotion:

1. Read `channel.json` of `nightly-<sha>` and the store's record; refuse unless the full run was
   `green-clean`, or `green-images` with an approval, no publish hold is open for those versions,
   and every listed version is on npm.
2. For each package, `npm dist-tag add <name>@<version> latest` when `latest` differs. npm trusted
   publishing covers `npm publish` only, so this uses an npm granular access token with write on the
   @graphty packages, stored only as the `production` environment's secret `NPM_DIST_TAG_TOKEN`.
   npm moves dist-tags one package at a time; a failure part way leaves some moved, and the re-run
   moves the rest.
3. Copy the release to graphty-site as `production-<sha>` (sha256 compared) and start its
   `deploy.yml`. npm moves first, so the docs never describe a version `latest` does not install
   for more than the minutes the deploy takes.
4. Mark those packages' GitHub releases as not prerelease, and append to each one "Changes since
   <previous latest>": the CHANGELOG.md sections between the two versions, read from the version
   commit. Fast-forward `channel/production`. Write `channel.json` with `promotedBy` the approver.

The same artifacts at every step: the tarball canary served, the npm versions nightly published.

## 9. Hotfix and rollback

**Hotfix** (decided here; reversible): the fix merges to master through its own pull request like
any change, so canary has it within one master build. The owner then dispatches
`gh workflow run release.yml --ref master -f mode=full` instead of waiting for the slot. Green and
clean promotes to nightly automatically; with changed images it waits for Finish. Then the owner
dispatches `promote.yml`. End to end about 1.5 hours: light checks about 10 minutes, the master
build, the 50-minute full run, two approvals.

**Rollback of production** is faster than any fix: dispatch `promote.yml` with the previous
nightly. It moves `latest` back to those versions and redeploys that release; production's data
overlay keeps every dataset. Caret-range consumers still resolve to the highest version, so a bad
version is also deprecated (`npm deprecate <name>@<version> "<reason>"`, same token) and the real
fix ships as the next patch through the hotfix path.

**Rollback of nightly**: usually unnecessary, because the revert and the next green run supersede
it. Otherwise `promote.yml` with `channel: nightly` moves `next` back and redeploys the previous
graphty-nightly release, behind the same owner approval (it needs the same token).

**Rollback of canary**: revert on master.

## 10. Holds

- **`release-hold.json`** stays (temporary hold of one package from versioning, owner's rule that
  holding is not exclusion). Applied in the nightly `version` job by `tools/release-hold.mjs`; a
  held package gets no nightly version, so production never moves its `latest`.
- **Publish hold** stays as it is (`tools/publish-hold.mjs`, `release-watch.yml`). `promote.yml`
  refuses a nightly while its publish hold is open.
- **Train hold** ("Release held: <what> failed on <sha>", `tools/release-held.sh`) becomes the
  `red` state's issue, "Full run red: <lane> on <sha>", labels `bug`, `priority:critical`. Scheduled
  slots no longer skip while it is open: a slot runs when canary's commit is new, because that
  commit may hold the fix.

## 11. Access and identities

- Agents act as a GitHub Team machine account (the owner creates it), with write access but no
  admin role, not a reviewer of the `production` environment, and not a code owner.
- Master's ruleset drops the admin bypass. Bypass list: the release deploy key only.
  `channel/nightly` and `channel/production` get a ruleset that only the deploy key may update and
  nobody may delete.
- CODEOWNERS (owner) on `.github/workflows/**`, `tools/release*`, `tools/channels/**`,
  `tools/bisect-core.mjs`, `release-hold.json` and `visual-review/trusted/**`, with "require review
  from code owners" on master. The site repositories' `site.json` and `deploy.yml` are code-owned
  there too.
- `NPM_DIST_TAG_TOKEN` lives only in `production`; trusted-publisher entries keep naming
  `release.yml` with no environment, so they need no change.

## 12. What release.yml becomes, and what is deleted

release.yml keeps `pick`, `ci`, `t4`, `hosts`, `autosave_macos`, `audit`, `llm`, `coverage`,
`version`, `land` and `publish`. It gains `mode` (`full`, `promote-nightly`; `scheduled` stays),
`verdict`, `site`, the restart filter and the `--tag next`. `held` becomes the `red` and
`owner-item` reporter. Its header comment is rewritten for the new flow.

New files: `.github/workflows/promote.yml`, `.github/workflows/bisect.yml`,
`tools/bisect-core.mjs`, `tools/channels/canary.site.json`, and in each site repository
`deploy.yml` and `site.json`.

Deleted or retired in this area:

- `golden-verify.yml` and `tools/verify.mjs`'s local runner (its rules move to `bisect-core.mjs`);
- release.yml's "restart on any master push while held" and its skip-while-held rule;
- `deploy-pages.yml`'s role as graphty.app's deploy;
- `promote-pages.yml`, `tools/pages-builds.sh` and the `site_data` job on branch
  `ci/3267-site-flip` (commit 0701dead02), and branch `ci/3267-beta-site`, closed as superseded;
  the dataset-overlay idea from 0701dead02 is kept;
- pull request #1942 (`NIGHTLY_ENABLED`, never set), closed as superseded;
- `land.mjs cut`, `cut-fix` and `ship`, and the cut and golden pull requests, with the rest of the
  golden machinery (listed in the merging section).

Kept unchanged: `release-watch.yml`, `gpu-rerun-on-runner-loss.yml`, `master-guard.yml` (useful
again now that pull requests move master), the release tools named above, the scheduler.

## 13. Migration order

After golden is flushed through the current release (#3318): (1) canary on its domain, keeping
`site-<sha>`; (2) the full run in shadow, publishing nothing (measure: green under 60 minutes,
share of reds that are tooling); (3) nightly and npm `next`; (4) once the machine account,
`production` environment and token exist, graphty.app moves to graphty-site at a quiet hour
(GitHub reissues its certificate: a short outage) and the first `promote.yml` runs; (5) delete
section 12's list and update the pipeline-round skill and every CLAUDE.md in the same pull request.

## 14. The owner's actions

- DNS: CNAME records for canary.graphty.app and nightly.graphty.app; domain verification for
  graphty.app in the organization; the graphty.app move to graphty-site at a time he picks.
- Create the public repository graphty-org/graphty-nightly (or let the machine account create it)
  and install the Pages GitHub App on it with Contents and Actions write.
- Create the GitHub Team machine account; remove the admin bypass on master's ruleset; create the
  `production` environment with himself as required reviewer and self-review prevented.
- Create the npm granular token for dist-tags, store it as `NPM_DIST_TAG_TOKEN` in `production`,
  and renew it before npm's expiry for write tokens. No trusted-publisher change is needed.
- Review, as code owner, the release.yml step that calls `visual-review/trusted/gate.mjs`.
