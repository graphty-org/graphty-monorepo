# Visual review: what the repository and GitHub give us to build on

Date: 2026-09-27. Facts were read from `master` at 17d5468b and from the live GitHub settings of
`graphty-org/graphty-monorepo` on the same day. Each fact names its source: a file and line, a
`gh api` call, or a documentation URL (listed at the end).

This is the ground a self-hosted replacement for Chromatic has to stand on: how the five
Storybooks are built, where the output goes, what CI already decides for us, what the pre-push
gate can afford, which capture and diff tools already exist, what keeps a canvas screenshot
stable, and what GitHub will and will not let us do for free -- including whether an approval can
be made to genuinely require the owner.

## 1. How each Storybook is built

| Storybook | Directory | Storybook version | Builder | Build command | Local build size |
|---|---|---|---|---|---|
| graphty-element | `graphty-element/` | 9 (`@storybook/addon-vitest ^9.0.11`) | web components on Vite | `storybook build` | 16 MB |
| graphty (the app) | `graphty/` | 9 (`storybook ^9.1.20`) | React on Vite | `storybook build` | 11 MB |
| compact-mantine | `compact-mantine/` | 8 (`storybook ^8.6.12`) | React on Vite | `storybook build` | 9.9 MB |
| algorithms | `algorithms/` | 9 (`@storybook/html-vite ^9.0.11`) | HTML on Vite | `storybook build` | 7.0 MB |
| layout | `layout/` | 9 (`@storybook/html-vite ^9.0.11`) | HTML on Vite | `storybook build` | 7.5 MB |

Sources: each package's `package.json` (`build-storybook` script; graphty-element line 160, graphty
line 24, compact-mantine line 71, algorithms line 75, layout line 58); sizes from `du -sh` of the
main checkout's `*/storybook-static` directories. All five together are about 51 MB.

- Nx runs them as the `build-storybook` target, which `dependsOn: ["^build"]` (`nx.json:81-83`), so
  each Storybook builds after the packages it imports.
- Locally, the dev servers need `PORT` and are started through servherd (root `CLAUDE.md`,
  "Starting Servers"). A static build needs no server; any capture tool can serve
  `storybook-static` itself, as `tools/diff-stories.mjs` does.
- Mixed Storybook 8 and 9 is the reason to capture the built `storybook-static` (its `index.json`
  and `iframe.html?id=...`) rather than go through a Storybook-version-specific test addon.

## 2. What CI already does with them

All in `.github/workflows/ci.yml`.

- **One build job for everything.** `build` (line 26) runs on `ubuntu-latest`, checks out with
  `fetch-depth: 0` (line 36-37), installs with `pnpm install --frozen-lockfile`.
- **Affected-only planning.** The step "Plan affected projects and test shards" (lines 66-75) runs
  `nx show projects --affected --base=origin/<base_ref> --head=HEAD --json` on a pull request, and
  the full project list on a push to master or a manual dispatch. `tools/ci-test-matrix.mjs` turns
  that into three job outputs: `affected` (a JSON array of package directory names), `test-matrix`
  and `test-count` (lines 31-34). Any new job can gate on
  `contains(fromJSON(needs.build.outputs.affected), '<package>')`, exactly as the Chromatic jobs do
  (for example lines 520-523).
  - What counts as "everything" is nx.json's `sharedGlobals`: a change to root configs, the
    lockfile or any workflow file affects every project (comment at lines 59-63).
- **All five Storybooks are built on every run, affected or not** (lines 167-180), because the
  Links job checks links into all of them. So a visual job for an affected package never has to
  build; it downloads.
- **Artifacts.** Each `storybook-static` is uploaded as `build-storybook-element`,
  `build-storybook-app`, `build-storybook-compact-mantine`, `build-storybook-algorithms`,
  `build-storybook-layout` (lines 285-318), all with `retention-days: 1`. They are fine as input
  to a capture job in the same run, and useless as a "live Storybook to click through" a day later.
  Artifacts are not browsable in place; a reviewer has to download and unzip them.
- **Chromatic jobs today.** Five jobs `chromatic-element`, `-app`, `-compact-mantine`,
  `-algorithms`, `-layout` (lines 517-730). Each runs only on a pull request labelled `chromatic`
  whose package is affected, or on `workflow_dispatch` with the `chromatic` input (lines 7-19,
  520-523). They use `chromaui/action@latest` with `exitZeroOnChanges: false` and TurboSnap off.
  The `labeled` event type on `pull_request` (line 8) exists so adding the label starts a run.
- **The required gate.** `all-checks`, named "All Checks Pass" (line 910 onward), `needs` build,
  test, links and the five Chromatic jobs, runs `if: always()`, and treats a skipped `chromatic-*`
  job as a pass. A visual job added to its `needs` list with the same "skipped is fine when
  unaffected" rule becomes required with no ruleset change.
- **No `concurrency` group** in `ci.yml`: a second push to a pull request does not cancel the first
  run. A capture job should add its own `concurrency: visual-${{ github.head_ref }}` with
  `cancel-in-progress: true` to avoid posting two reports.
- Default workflow token permissions are read-only, and workflows cannot approve pull request
  reviews (`gh api repos/.../actions/permissions/workflow`:
  `default_workflow_permissions: read`, `can_approve_pull_request_reviews: false`). A job that
  pushes accepted baselines or comments on a PR must request `contents: write` /
  `pull-requests: write` explicitly.

## 3. GitHub Pages and graphty.app

- **How it deploys.** `.github/workflows/deploy-pages.yml` runs on `workflow_run` of CI, only for
  `branches: [master]` and only when CI succeeded (lines 3-8, 24). It downloads the CI artifacts of
  that run, assembles one directory with `tools/assemble-pages-site.sh ./public`, and publishes it
  with `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`. Concurrency group `pages`,
  no cancel (lines 17-19).
- **Pages settings** (`gh api repos/graphty-org/graphty-monorepo/pages`): `build_type: workflow`,
  custom domain `graphty.app`, HTTPS certificate approved, `https_enforced: false`.
- **The deploy replaces the whole site.** A workflow-built Pages site is one artifact per deploy;
  there is no `gh-pages` branch to add a path to. The current layout
  (`tools/assemble-pages-site.sh:11-20`): `/` app, `/docs/`, `/storybook/graphty-element/`,
  `/storybook/app/`, `/storybook/compact-mantine/`, `/storybook/algorithms/`,
  `/storybook/layout/`, `/algorithms/`, `/layout/`, `/data/graph-samples/v1/`, plus redirects under
  `/storybook/element/`.
- **Only master can deploy.** The `github-pages` environment has a deployment branch policy that
  allows only `master` (`gh api .../environments/github-pages/deployment-branch-policies`). A pull
  request's workflow cannot publish to graphty.app at all.
- **Consequence for per-PR review pages on graphty.app.** They are possible only indirectly: each
  PR's report (and optionally its affected Storybooks) is committed to a separate branch, for
  example an orphan `visual-review` branch, and the master deploy copies that branch into
  `/review/pr-<n>/`. The page then appears only after the next master deploy, which is too late for
  reviewing an open PR. Two workable alternatives:
  1. A second public repository in the org (for example `graphty-org/visual-review`) whose Pages
     site is published from a branch that the monorepo's CI pushes to on every PR run. Its site
     lives at `https://graphty-org.github.io/visual-review/` or a subdomain such as
     `review.graphty.app` (a new CNAME record). Its deploy is independent of master.
  2. No Pages at all for the report: images on an orphan branch of this repository, linked from the
     PR comment by `raw.githubusercontent.com` URLs (the repository is public), and a static HTML
     report built so it can be opened straight from that branch through a raw-HTML viewer, or
     downloaded as an artifact.
- **Pages limits** [G1]: published site at most 1 GB; source repository recommended at most 1 GB;
  soft bandwidth limit 100 GB a month; the soft limit of 10 builds per hour "does not apply if you
  build and publish your site with a custom GitHub Actions workflow"; a deploy times out after 10
  minutes; requests over the rate limit get HTTP 429. Pages may not be used for commercial,
  e-commerce or SaaS purposes (an internal review page for an open-source project is none of
  those).
- **Sizing per-PR review pages against those limits.** A PR's changed images are small (tens of KB
  each). Publishing the head Storybooks for a PR is the expensive part: about 51 MB for all five,
  7-16 MB for one. The 1 GB cap allows roughly 20 full sets, or 60+ single-package Storybooks, so a
  review site must prune closed PRs. The graphty.app site itself is already about 51 MB of
  Storybooks plus the app and docs.

## 4. The pre-push gate

- `.husky/pre-push` runs `tools/scan-secrets.sh` and then `pnpm run prepush:fast`, which is
  `tools/prepush.sh` (`package.json:25`).
- `tools/prepush.sh` computes affected packages from `git merge-base origin/master HEAD` to `HEAD`
  with `NX_DAEMON=false` (lines 68-79), or every package with `PREPUSH_ALL=1`. It exits early with a
  pass when nothing is affected (lines 84-87). It never uses `set -e`; each step goes through
  `run_step`, which ORs into `FAILED` (lines 45-56). A new step fits that pattern exactly, guarded
  by `affected <package>`.
- It builds affected packages but **does not build any Storybook**. A visual step would have to
  add `nx run <pkg>:build-storybook` for affected packages. Build times are not measured in this
  repository; the capture itself measured 3 to 80 seconds per Storybook on this machine
  (`chromatic-alternatives.md`, Measurements).
- The script's own budget reasoning (lines 219-242): the gate already costs "about six minutes",
  and the full graphty-element storybook project (290 s) and browser project (463 s) were kept out
  because "a gate people bypass with --no-verify catches nothing at all". A local visual step must
  be affected-only and in the same order of cost as the 25-second contract lane, or it will be
  bypassed.
- Fonts differ between machines (emoji rendered as empty boxes on this host; see
  `chromatic-alternatives.md`). A local capture on the developer machine cannot be compared with
  a CI-captured baseline byte for byte unless it runs in the same pinned container image. The
  local hook is therefore either a warning-only preview, or runs capture inside the same
  Playwright Docker image CI uses.

## 5. Tools that already exist

From pull request #496 (merged 2026-09-27, "feat(tools): add local CI shards, Chromatic diff tools
and worktree scripts"):

- **`tools/diff-stories.mjs`** (199 lines): serves two `storybook-static` directories on OS-chosen
  ports from a tiny `node:http` server (lines 72-98), launches Chromium with
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (lines 102-104), renders
  named story ids at one viewport (default 1000x800, `deviceScaleFactor: 1`), waits a **fixed**
  settle (default 4500 ms, lines 118-120), screenshots, and for graphty-element also reads the
  camera and node positions from `graphty-element.graph` so a difference can be attributed to a
  camera move or moved nodes. It takes explicit story ids, not `index.json`, and does not apply
  `chromatic.modes`, `delay` or `disableSnapshot`. The serving and launch code is reusable as is;
  the settle should become "Storybook render phase completed + element `graph-settled`".
- **`tools/pixel-diff.mjs`** (115 lines): compares two same-size PNGs with `pngjs` (already a
  dependency, 7.0.0), per-channel threshold default 12, prints changed-pixel count and fraction,
  largest channel delta, mean signed drift, bounding box and a "spread vs local" reading, and
  writes a red-on-faded diff image. Exit codes 0 / 1 / 2 make it CI-usable. It does not use
  pixelmatch (not installed), so no anti-aliasing detection.
- **`tools/chromatic-capture.mjs`** (166 lines): read-only download of one Chromatic build's
  comparison images using a browser session cookie. Useful once, for migration: export the images
  Chromatic currently holds as the accepted baselines, to compare against the first self-captured
  set.
- **`tools/chromatic.sh`** (129 lines) and **`tools/chromatic-api.sh`** (96 lines): run Chromatic
  the way CI does, and read-only GraphQL queries against a build. Both go away at retirement.
- Installed browser tooling: `playwright` / `playwright-core` / `@playwright/test` 1.57.0 in the
  pnpm store. The Docker image to pin to is `mcr.microsoft.com/playwright:v1.57.0-noble`.
- `.gitattributes` already marks `*.png binary`.

## 6. What keeps a screenshot stable

- **The Chromatic signal.** `chromatic/isChromatic` (chromatic 11.29.0,
  `node_modules/.pnpm/chromatic@11.29.0/node_modules/chromatic/isChromatic.mjs`) returns true when
  the user agent contains "Chromatic" **or the URL contains `chromatic=true`**. A capture tool can
  therefore add `&chromatic=true` to the iframe URL instead of faking a user agent, with no story
  change. It is used by:
  - `graphty-element/.storybook/preview.ts:97-99`: a decorator sets
    `layoutBehavior = { layout: { preSteps: 1000 } }` on every element that did not set its own.
  - `graphty-element/stories/helpers.ts:324`: `preStepsHere()` returns a story's own pre-step count
    under Chromatic and 0 otherwise.
  - `graphty-element/stories/assertions.ts:508`: an assertion that is relaxed under Chromatic.
- **Settling.** `graphty-element/.storybook/preview.ts:34` defines `waitForGraphSettled`, and a
  global `play` (lines 122-124) waits for the element's `graph-settled` event. Storybook marks the
  story's render phase complete only after `play` finishes, so "render phase completed" already
  includes "graph settled".
- **Determinism guard.** `graphty-element/test/browser/story-determinism.test.ts` fails when a
  snapshotted story uses unseeded `Math.random()` or a physics layout without a seed, pre-steps or
  a settle wait. It reads `disableSnapshot` to know which stories are snapshotted.
- **SwiftShader flag sets** live in `graphty-element/vitest.config.ts:76-85` (`swiftshader`:
  `--use-angle=swiftshader --enable-unsafe-swiftshader --use-webgpu-adapter=swiftshader`, plus
  `nvidia` and `metal` sets). WebGPU stories (`LayoutGpu.stories.ts:355`) already opt out with
  `disableSnapshot: true`.
- **Not yet on master:** the pinned label font (Inter committed as
  `graphty-element/test/fonts/inter-latin.woff2` and registered as "Verdana") and the pinned
  1200 px viewport are on the branch `test/storybook-harness-stability` (commit 9f20e4a9), which
  is not merged. So is the decision record
  `design/decisions/2026-09-27-only-the-owner-accepts-chromatic-changes.md`. Until that branch
  lands, label rendering depends on the capturing machine's fonts.

## 7. Chromatic features the stories actually use

These are the only `chromatic` story parameters in the repository (grep of `*.ts`/`*.tsx`
excluding `node_modules`). A replacement capture tool must honour each one.

| Parameter | Where | Meaning to replicate |
|---|---|---|
| `modes: { light, dark }` | `compact-mantine/.storybook/preview.tsx:110-113` (global `theme`), `graphty/.storybook/preview.tsx:114-117` (global `colorScheme`) | capture every story twice, setting the named global through `&globals=...` |
| `delay` | element preview 500 ms (`preview.ts:117-118`), algorithms and layout previews 300 ms (`preview.ts:22-24` in each), several graphty-element stories 500-1000 ms (`EdgeStyles.stories.ts:61`, `:955`, `:1273`, `:1513`, `:1750`), 800 ms in two algorithms stories | extra wait after render completes |
| `pauseAnimationAtEnd: true` | graphty-element preview (`preview.ts:119`) | CSS animations jumped to their end state |
| `disableSnapshot: true` | `PerformanceTest.stories.ts:24-25`, `LayoutGpu.stories.ts:355-356`, three algorithms stories (`FloydWarshall`, `BellmanFord`, `FordFulkerson`) and others in `LabelStyles.stories.ts` | skip the story |
| `diffThreshold`, `diffIncludeAntiAliasing` | `Layout.stories.ts:212-215` (0.3), `:298-300` (0.8) | per-story tolerance on the comparison |

Chromatic features the repository depends on beyond parameters: per-story accept/deny in its web
app, per-branch baselines that follow merges, a PR status check (`exitZeroOnChanges: false` makes
the job fail), and the published Storybook per build. TurboSnap is not used (disabled in each job).

## 8. Branch protection and who can approve

- **Ruleset "Protect master"** (`gh api .../rulesets/23973898`), active on the default branch:
  no deletion, no force push, changes only through a pull request with **merge commits only**,
  **0 required approving reviews**, `require_extra_approval_for_unattributed_changes: true`, and
  two required status checks: "All Checks Pass" and "Lint PR Title".
- **Bypass actors:** any deploy key, always (this is how `release.yml` pushes), and the Admin
  repository role, "pull_request" mode only (an admin may merge a PR without meeting the rules,
  but cannot push directly).
- **People.** Org plan: **Team**, 2 seats (`gh api orgs/graphty-org`). Org members: apowers313
  (repository admin) and MarcoCiaramella (read). The org does not require two-factor
  authentication (`two_factor_requirement_enabled: false`).
- **Environments exist and work here.** The repository already has an environment,
  `github-pages`, with a branch policy. On Free, Pro and Team plans, required reviewers and wait
  timers are "only available for public repositories" [G2]; this repository is public, so both
  are available. Up to six users or teams can be required reviewers. The optional "Prevent
  self-review" setting means "users who initiate a deployment cannot approve the deployment job,
  even if they are a required reviewer" [G2].

### What an environment approval does and does not prove

The threat: agents on the owner's machine run with the owner's GitHub CLI credentials and signing
key.

- The `gh` token on this machine is an OAuth token for **apowers313** with scopes
  `gist, read:org, repo, workflow` (`X-OAuth-Scopes` header of `gh api -i user`).
- The REST endpoint "Review pending deployments for a workflow run" approves or rejects a job
  waiting on a protected environment. "Required reviewers with read access to the repository
  contents and deployments can use this endpoint", and classic/OAuth tokens "need the repo scope"
  [G3]. So **an agent holding that token can approve a required-reviewer environment in the
  owner's name**, without any browser, 2FA or passkey prompt.
- "Prevent self-review" does not help: an agent that starts the workflow with the owner's token is
  the owner, so the owner could not approve their own gate either.
- Sudo mode (the web re-authentication prompt) covers account, security, org and ruleset changes in
  the web UI [G4]; the docs do not say it applies to API token requests, and approving a
  deployment is not in its list.
- **Commit signatures prove nothing either.** Commits are signed with an SSH key at
  `~/.ssh/git_signing_claude.pub`, type `ssh-ed25519` (git config `gpg.format=ssh`,
  `commit.gpgsign=true`). It is a software key an agent can use without the owner present. There
  is no smartcard or OpenPGP card in use (`gpg --card-status`: no SmartCard daemon).

What would genuinely require the owner:

1. **A hardware-backed approval signature.** An SSH key of type `ed25519-sk` on a FIDO2 security
   key, created with `-O verify-required` (PIN + touch) or at least touch-required. The owner signs
   the approval (for example a small manifest of story ids and image hashes, committed to the PR
   branch or pushed as a signed tag). CI verifies the signature with `ssh-keygen -Y verify`
   against an `allowed_signers` file that lives on master, so a PR cannot change who is trusted.
   An agent can prepare the manifest, but cannot produce the signature without a physical touch.
   This works with the current single-account setup and no extra seat.
2. **A second GitHub account used only for approval**, whose credentials exist only in the owner's
   browser behind a passkey, with no token on this machine. Make it the only required reviewer of a
   `visual-baselines` environment. Agents cannot reach it. Cost: on a Team plan a member seat, or
   an outside collaborator with read access (outside collaborators on public repositories do not
   take a paid seat; verify before relying on it). Weaker than option 1 if the owner ever creates a
   token for it.
3. **Plain environment approval by apowers313.** Convenient (one click in the Actions UI) but, as
   shown above, reproducible by any process holding the `gh` token. It records who approved and
   when, which is useful as history, not as proof.

## 9. Storage: git, Git LFS, artifacts

- **Git LFS allowances** [G5]: GitHub Free and Pro 10 GiB storage and 10 GiB bandwidth a month;
  **GitHub Team and Enterprise Cloud 250 GiB storage and 250 GiB bandwidth a month**. The org is
  on Team, so the 10 GiB figure in `chromatic-alternatives.md` was the wrong plan; the correct
  allowance is 250 GiB.
  - Downloads count against the repository owner's bandwidth "for both public and private
    repositories", including GitHub Actions downloads [G5]. On a public repository, clones by
    anyone, including forks' CI, spend the org's quota.
  - With a $0 budget (the org has one): "You are not charged for overages, but Git LFS usage is
    blocked for the rest of the calendar month" [G5]. Blocked LFS means checkouts get pointer files
    instead of images, which would fail every visual job until the first of the month.
  - Estimate: ~22 MB of baselines x ~800 CI checkouts a month is about 17 GB, 7% of the Team
    allowance. Fetching only the affected package's baselines (`git lfs pull --include
    <pkg>/visual-baselines/**`) and caching the LFS objects with `actions/cache` keyed on the
    `.gitattributes`-tracked tree cuts it further. LFS is viable on Team; it was not on Free.
  - `git lfs` is **not installed** on this development machine (`git: 'lfs' is not a git
    command`). The repository has no LFS-tracked files today.
- **Plain git.** The packed repository is 89.5 MiB today (`git count-objects -vH`). 22 MB of
  baselines plus 10-45 KB per accepted image change is a modest addition; no quota, no bandwidth
  meter, no blocking at a limit. Pages' "source repositories" 1 GB recommendation [G1] does not
  apply to this repository, whose Pages source is a workflow artifact, not the repository.
- **Actions artifacts** cost nothing for public repositories (storage billing applies only to
  private repositories) [G6]; retention is at most 90 days on public repositories
  (`chromatic-alternatives.md`, [S50] there). The repository's workflows use `retention-days: 1`
  for 24 artifacts and 14 or 90 for three others (grep of `.github/workflows/*.yml`).
- **Actions minutes** on standard GitHub-hosted runners are free for public repositories [G6].
  The org's $0 stop-usage budgets therefore only matter for larger runners, Packages and LFS.

## 10. Summary of constraints

- CI builds all five Storybooks every run and hands them out as same-run artifacts; affected
  packages are already a job output. A per-package visual job costs one download and one capture.
- graphty.app is deployed only from master, as a whole-site artifact; per-PR pages need either a
  separate Pages repository or images on an orphan branch linked by raw URLs.
- The capture must set `chromatic=true` in the URL (or change the previews to a neutral flag),
  honour `modes`, `delay`, `pauseAnimationAtEnd`, `disableSnapshot` and the two per-story
  thresholds, and run in a pinned Playwright 1.57.0 image. The font pin is not on master yet.
- Environment approval is available on this public Team-plan repository, but the owner's `gh`
  token can approve it through the REST API. Only a hardware-key signature (or an approval
  account whose credentials never touch this machine) makes approval require the owner.
- Git LFS fits comfortably in the Team plan's 250 GiB, with a hard block rather than a bill at the
  limit; plain git also works and has no meter.

## Sources

Repository files (at 17d5468b unless noted): `.github/workflows/ci.yml`,
`.github/workflows/deploy-pages.yml`, `tools/assemble-pages-site.sh`, `tools/prepush.sh`,
`.husky/pre-push`, `package.json`, `nx.json`, `tools/ci-test-matrix.mjs`,
`tools/diff-stories.mjs`, `tools/pixel-diff.mjs`, `tools/chromatic-capture.mjs`,
`tools/chromatic.sh`, `tools/chromatic-api.sh`, `.gitattributes`,
`graphty-element/.storybook/preview.ts`, `graphty-element/stories/helpers.ts`,
`graphty-element/stories/assertions.ts`, `graphty-element/test/browser/story-determinism.test.ts`,
`graphty-element/vitest.config.ts`, each Storybook's `.storybook/preview.*` and `package.json`;
branch `test/storybook-harness-stability` at b7de813f; `design/visual-testing/chromatic-alternatives.md`.

GitHub API reads, 2026-09-27: `repos/graphty-org/graphty-monorepo/pages`,
`.../rulesets/23973898`, `.../environments`, `.../environments/github-pages/deployment-branch-policies`,
`.../actions/permissions/workflow`, `.../collaborators`, `orgs/graphty-org`, `orgs/graphty-org/members`,
`gh api -i user` (token scopes), `gh pr view 496`.

Documentation, read 2026-09-27:

- [G1] https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- [G2] https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- [G3] https://docs.github.com/en/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run
- [G4] https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/sudo-mode
- [G5] https://docs.github.com/en/billing/concepts/product-billing/git-lfs
- [G6] https://docs.github.com/en/billing/concepts/product-billing/github-actions
