# Replacing Chromatic: options, costs and a recommendation

Date: 2026-09-27

## The problem

This repository runs visual regression tests on five Storybooks through Chromatic, a hosted
service that screenshots every story, compares each screenshot with an approved baseline, and
shows a reviewer the differences. In the first half of September 2026 it captured about 481,000
snapshots and cost about $3,750:

| Storybook         | Snapshots (half month) | Snapshots per full run             | Full runs implied |
| ----------------- | ---------------------- | ---------------------------------- | ----------------- |
| compact-mantine   | ~324,000               | 828 (414 stories x light and dark) | ~390              |
| graphty-element   | ~72,000                | 171                                | ~420              |
| graphty (the app) | ~67,000                | 152 (76 stories x light and dark)  | ~440              |
| algorithms        | ~11,000                | 27 (30 stories, 3 opted out)       | ~410              |
| layout            | ~7,000                 | 17                                 | ~410              |
| **Total**         | **~481,000**           | **~1,195**                         |                   |

The story counts come from each Storybook's `index.json`, built from `origin/master` on 2026-09-27.
The last column shows that each project was captured about 400 times in fifteen days, which is
roughly one full capture per push to any pull request that touched the project. compact-mantine
alone is two thirds of the bill, because every one of its stories is captured twice (light and
dark).

Chromatic's paid plans have no spending cap: "Review and testing will not be interrupted.
Additional billed snapshots beyond the included amount are charged at the end of the billing
period" [S1]. The owner wants a replacement that is free, or cheap with a hard cap.

A change that makes Chromatic opt-in (it runs only on a pull request labelled `chromatic`, or on a
manual dispatch, and never on a push to master) is on the branch `ci/chromatic-opt-in` and not yet
merged. It cuts the volume, but not the lack of a cap.

## What we need

Every option below is judged against these requirements:

1. Free, or hard-capped, at our volume (about 1,200 snapshots per full run).
2. Deterministic snapshots of WebGL and WebGPU canvases. graphty-element draws with Babylon.js.
3. Light and dark modes (compact-mantine and graphty set `chromatic.modes` in their previews).
4. A per-story diff review in which the owner accepts or rejects each change. The decision record
   `design/decisions/2026-09-27-only-the-owner-accepts-chromatic-changes.md` (currently on the
   branch `test/storybook-harness-stability`) says a changed snapshot is accepted by the owner and
   nobody else: no agent, script or CI job. A good review UI matters.
5. Baselines per branch, compared against the merge base, so a pull request is judged against
   what it branched from.
6. A pull-request status check.
7. Runs in GitHub Actions on a public repository.
8. Works with Storybook 8 (compact-mantine) and Storybook 9 (the other four), all on the Vite
   builder.
9. Low maintenance.
10. Snapshot only what a change could affect.

## What the repository already has

- **Built Storybooks as CI artifacts.** The `build` job in `.github/workflows/ci.yml` builds all five
  Storybooks on every run and uploads each `storybook-static` directory as an artifact
  (`build-storybook-element`, `-app`, `-compact-mantine`, `-algorithms`, `-layout`). Any capture tool
  can download these instead of building again.
- **Affected-only planning.** The `build` job's "Plan affected projects and test shards" step asks
  Nx which projects a pull request affects. Each Chromatic job runs only when its project is in
  that list. A replacement keeps that gate for free.
- **Rendering determinism.**
    - graphty-element's preview pre-steps every physics layout 1,000 steps when `isChromatic()` is
      true, so a snapshot is a settled graph rather than one mid-flight.
      `isChromatic()` checks the user agent, so any capture tool has to set that signal as well.
    - A global `play` function waits for the element's `graph-settled` event.
    - The label font is pinned: Inter is committed under `graphty-element/test/fonts` and registered
      as "Verdana". This is on the branch `test/storybook-harness-stability`.
    - The Chromatic viewport is pinned at 1200 px wide, on the same branch.
    - `graphty-element/vitest.config.ts` holds the SwiftShader flag sets for headless Chromium.
- **Pixel tests.** graphty-element's browser tests already read real pixels from the canvas, for
  example `test/browser/style-paint-pixels.test.ts`. Those are contract tests with their own
  assertions and are not affected by this decision.
- **Local diff tools.** Pull request #496 (issue #218) added three scripts:
    - `tools/diff-stories.mjs` serves two built Storybooks on free ports, renders named stories
      under SwiftShader and saves the PNGs.
    - `tools/pixel-diff.mjs` compares two PNGs.
    - `tools/chromatic-capture.mjs` downloads Chromatic's comparison images with a session cookie.

    The first two are most of a self-hosted capture pipeline already.

## Measurements

Everything below was measured on 2026-09-27 on the development server, an Intel i9-14900 with
32 threads. Nothing was uploaded anywhere.

Method:

- Each Storybook was built with `storybook build` from `origin/master`.
- A Playwright script served the static build on a local port and opened
  `iframe.html?id=<story>&viewMode=story` for every story in `index.json`. For light and dark it
  added `&globals=theme:<mode>;colorScheme:<mode>`.
- Chromium ran headless with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`,
  and a user agent containing "Chromatic" so the preview's pre-steps apply.
- The script waited until Storybook's render phase reached `completed`, which includes the play
  functions, then two animation frames, and saved a PNG.
- Every Storybook was captured twice and compared pixel by pixel.

| Storybook                      | Captures  | Wall time     | Workers | Baseline PNG size | Run-to-run               |
| ------------------------------ | --------- | ------------- | ------- | ----------------- | ------------------------ |
| graphty-element                | 171       | 80 s and 77 s | 4       | 7.4 MB            | 170 identical, 1 differs |
| compact-mantine (light + dark) | 828       | 55 s and 49 s | 8       | 8.9 MB            | 828 identical            |
| graphty (light + dark)         | 152       | 12 s          | 8       | 2.7 MB            | captured once            |
| algorithms                     | 30        | 21 s          | 8       | 1.7 MB            | captured once            |
| layout                         | 17        | 3 s           | 8       | 0.9 MB            | captured once            |
| **All five**                   | **1,198** | **~3 min**    |         | **~22 MB**        |                          |

More detail from the same runs:

- **Per-story time.** A graphty-element story took a median of 1.5 s to render and capture, 4.8 s at
  the 95th percentile and 8.9 s at worst. A standard GitHub runner for a public repository has
  4 vCPUs, so expect CI to be two to three times slower than these numbers. That is still minutes,
  and CI minutes on standard runners are free for public repositories [S2].
- **The one unstable story.** `ai-control--default` (the AI showcase) settled into a different layout
  on each run: 4.5% of its pixels changed. It needs a fixed seed or pre-steps whatever tool is used.
  Chromatic would see the same instability.
- **Missing emoji.** Emoji in stories render as empty boxes on this host, because it has no emoji
  font. Screenshots depend on the fonts of the machine that takes them. Baselines must therefore be
  captured on one pinned image and never on a developer's laptop.
- **TurboSnap is not blocked by Vite.** The Storybook build emitted `preview-stats.json` (2.6 MB)
  when run with `--stats-json`. The comment in `ci.yml` says TurboSnap is off because "Vite doesn't
  generate preview-stats.json", citing storybookjs/storybook#27172. That comment is out of date:
  #27172 was a Windows-only path bug, fixed in Storybook 8.1.6 [S3], and Chromatic supports Vite
  natively from Storybook 8 [S4].

    TurboSnap would still save little here. Chromatic recaptures everything when "Files imported by
    preview.js are altered" [S5], and both big previews import the package's own source:
    - graphty-element imports `../src/graphty-element`
    - compact-mantine imports `compactTheme` from `../src`

    So almost every source change is a full rebuild.

## The options

### Hosted services

**Chromatic Free plan, with TurboSnap and opt-in builds.**

- Cost: $0 for 5,000 snapshots a month (25,000 "turbosnaps"). At the limit, testing pauses: "Review
  and testing will be paused once you use all 5,000 included billed snapshots per month" [S1]. That
  is a real hard cap.
- Volume: 5,000 is about four full runs a month. TurboSnap bills a copied snapshot at 0.2 [S5], but
  as explained above our previews make most changes into full rebuilds.
- Open-source plan: 35,000 a month, but only for projects with over 100 contributors, over 40k
  weekly npm downloads, over 10k stars, or a company design system with more than 5 contributors
  [S6]. This repository probably does not qualify.
- Everything else about Chromatic stays: the best review UI of any option, and branch and merge
  handling done for us.
- Verdict: the right immediate stop-gap, and a useful optional viewer later. It cannot be the gate,
  because four runs a month is not continuous testing.

**Argos CI.**

- Plans [S7]:
    - Hobby: free, 5,000 screenshots a month, uploads blocked at the limit. Personal accounts only,
      so a GitHub organisation needs Pro [S8].
    - Pro: $100 a month for 35,000 screenshots, then $0.004 each, or $0.0015 for a Storybook
      screenshot.
- Hard cap: Pro can "Pause builds on all your projects when the amount is reached", with alerts at
  50, 75 and 100%. The pause must be switched on, because "Setting a spend amount does not stop
  usage by itself" [S9]. Failed builds are not counted [S7].
- Cost at our volume:
    - today's full volume of ~960,000 a month: about $100 + 925,000 x $0.0015 = ~$1,490 a month
    - opt-in runs (about 30 full runs, ~36,000 snapshots): about $100 a month
- Open-source sponsorship [S10]:
    - granted case by case, with no published number
    - requires a non-commercial project, an Argos banner in the README and a dofollow link
- Screenshots are taken in our own CI and uploaded:
    - `@argos-ci/storybook` has a Vitest plugin and a test-runner (Storybook 8 to 11, Vitest 4+) [S11]
    - `argos upload <dir>` accepts any folder of PNGs [S12]
    - so our SwiftShader setup and our pinned fonts carry over unchanged
- Review and gating: per-screenshot accept and reject, baselines taken from the merge base, GitHub
  commit statuses, and flaky-test detection [S13][S14][S15].
- Limit: 5,000 screenshots per build [S12]; a full run of ours is ~1,200.
- Lock-in is low. The server is MIT licensed, but self-hosting is "not officially supported" [S16],
  and the review history lives in Argos.
- Verdict: the best hosted fallback.

**Percy (BrowserStack).**

- 5,000 free screenshots a month; beyond that "is treated as overage and is charged at the overage
  rate" [S17]. No hard stop and no spend cap is documented.
- Paid prices are not on BrowserStack's pricing page. Third parties quote about $0.01 per
  screenshot, which would be roughly $10,000 a month at our volume (unverified).
- BrowserStack's open-source program promises "unlimited testing", but states no Percy number and
  no eligibility rules [S18].
- Verdict: fails the cap requirement unless the open-source program covers us. An email would
  settle that.

**Applitools.**

- No permanent free tier. Starter is $667 a month for 100,000 component checkpoints [S19].
- Open-source terms: 10,000 checkpoints a month, revocable "at any time and for any reason" [S20].
  That is too small, and it is proprietary with heavy lock-in.

**Happo.**

- Free for 5,000 a month, Chrome only. Pro is $749 for 300,000, then $0.006 each: about $4,950 a
  month at our volume [S21].
- Open-source terms are not published.

**Lost Pixel (the platform and the open-source mode).**

- Sunset. The team joined Figma, and the GitHub repository was archived on 2026-04-22 [S22][S23].
  Do not adopt.

**Meticulous.** Replays recorded user sessions; it is not a Storybook snapshot tool.

**Microsoft Playwright Testing.** Retired on 2026-03-08 [S24].

**Visual Regression Tracker.**

- A self-hosted server (Apache-2.0, Docker Compose) with an approval UI, branch baselines and a
  choice of pixelmatch, looks-same or odiff for comparing [S25].
- It needs an always-on server that CI can reach, with a database and storage. That is a service to
  run, patch and back up.
- Its Playwright agent was last published in 2024.
- Verdict: more operations work than it saves.

### Self-hosted and open source

**Playwright screenshots of the built Storybook.**

- How it works: read `index.json`, visit each story's iframe, and compare each screenshot either
  with Playwright's `toHaveScreenshot` (the Playwright test runner [S26]) or with a small script
  like the one measured above.
- Review: the Playwright HTML report shows expected, actual and diff with a slider [S27].
- Baselines: files in the repository, updated with `--update-snapshots`.
- It captures the same artifact Chromatic captures, the built `storybook-static`, so it works the
  same for Storybook 8 and 9 and can reuse the CI artifacts.
- Written up as a free Chromatic replacement by [S28].
- Determinism is ours to own: run inside the Playwright Docker image pinned to the Playwright
  version [S29], since fonts differ between operating systems [S28].
- The measurements above show this is fast and, apart from one story, deterministic.

**Vitest 4 browser mode, `toMatchScreenshot`.**

- It exists: added in Vitest 4, still labelled experimental [S30][S31].
- How it works: it retries the capture until two consecutive screenshots match, then compares with
  pixelmatch (`threshold`, `allowedMismatchedPixelRatio`, anti-aliasing ignored by default).
- Files: baselines go to `__screenshots__/<test file>/<name>-<browser>-<platform>.png`, and the
  reference, actual and diff images go to `.vitest/attachments/` [S32][S33].
- Vitest UI shows the diffs with a slider.
- Combining it with Storybook's Vitest addon is not ready:
    - Storybook's own visual-testing docs cover only Chromatic [S34]
    - calling `toMatchScreenshot` inside the addon throws "Invalid Chai property" [S35]
    - after `composeStory` it loses the test context (open vitest#8853) [S36]
    - Vitest 5 has an open bug that leaks the viewport between tests (vitest#11250) [S37]
- The repository's storybook shards also run against the dev server with coverage on, which is not
  the build we ship.
- Verdict: a good fit on paper, and worth revisiting in a year. Today it is more fragile than
  screenshots of the static build.

**Storybook's Vitest addon combined with `storybook-addon-vis` / `vitest-plugin-vis`.**

- A third-party add-on that snapshots every story automatically, supports light and dark variants,
  and compares with pixelmatch or SSIM [S38].
- Each Storybook major needs a different addon major (1.x for Storybook 8, 2.x for 9, 3.x and later
  for 10) [S39], so our mix of Storybook 8 and 9 would need two of them.
- It has one maintainer.
- Verdict: viable, but it adds a dependency the static-build approach does not need.

**reg-suit + storycap, reg-cli, reg-actions.**

- storycap last released in 2024 and declares only Storybook 7 and 8 [S40].
- reg-suit keeps baselines in S3 or GCS and has no GitHub storage plugin; the request for one,
  issue #182, is unanswered [S41].
- The useful parts, both actively maintained:
    - reg-cli: an HTML report with slider, blend and toggle views, and passed, failed, new and
      deleted lists. Last release 2026-05; release candidate 2026-09 [S42].
    - reg-actions: a GitHub Action that compares with the target branch's latest artifact and comments
      on the PR. Its baselines expire with the artifacts [S43].

**BackstopJS, Loki, Storybook test-runner + jest-image-snapshot.**

- BackstopJS and Loki: no release since 2024. Loki has no Storybook 9 support [S44][S45].
- Storybook test-runner: "superseded by the Vitest addon" [S46].
- Verdict: do not adopt any of them.

**Comparison engines.**

- pixelmatch: the default in both Playwright and Vitest; handles anti-aliasing [S47].
- odiff: claims about 6x faster than pixelmatch [S48]. At 1,200 small PNGs the comparison is not
  the slow part, so it does not matter here.

### Where self-hosted baselines can live

- **Plain git, next to each package.**
    - About 22 MB for all five Storybooks today. An accepted change adds a new file version, typically
      10 to 45 KB.
    - The pull request's own tree holds the baselines it branched from, plus whatever the owner
      accepted on that branch. That is exactly the comparison against the merge base the
      requirements ask for, with no extra machinery.
    - The cost: two pull requests that change the same story conflict on a binary file, and are
      resolved by accepting again after the merge.
- **Git LFS.** GitHub's free LFS allowance is 10 GiB of bandwidth a month, Actions downloads count
  against it, and LFS is disabled for the rest of the month when it runs out [S49]. About 800 CI
  checkouts a month of 22 MB is about 17 GB. That would break CI. Do not use it.
- **Orphan branch.** Keeps binary history out of master, but loses the free comparison against the
  merge base. Worth it only if repository size becomes a problem.
- **Actions artifacts or cache.** Both expire: artifacts after 90 days at most for public
  repositories, and cache entries unused for 7 days are evicted [S50][S51]. That is fine for
  holding the diff report, and wrong for baselines.

### Review and approval, self-hosted

- **Showing the diffs.**
    - reg-cli's report is the best free per-story diff viewer. Publish it as a workflow artifact.
    - The PR comment lists each changed story with its baseline, new and diff images inline. The
      images are pushed to an orphan `visual-review` branch under `pr-<n>/` and linked by their raw
      URLs, which works because the repository is public.
    - The job summary carries the same list.
    - Examples of PR comments with diff images: [S52].
- **Approving.**
    - A GitHub Environment named `visual-baselines` with the owner as its only required reviewer.
      Required reviewers are available on public repositories on every plan [S53].
    - An "accept visual changes" workflow runs on `workflow_dispatch`, with inputs for the PR number
      and optionally a list of story ids (all changed stories if empty). It targets that environment,
      so it waits until the owner presses Approve in GitHub. Then it recaptures on the same pinned
      image and commits the new PNGs to the PR branch through the API.
    - This enforces the decision record mechanically: nobody but the owner can release the job. It is
      the same pattern as the label-triggered snapshot updates used by Streamlit and the dispatch
      flow described by Scott Logic [S54][S55].
- **Rejecting** a change means not accepting it. The check stays red until the code changes.

## Comparison

| Option                                             | Cost at our volume                                  | Hard cap                    | Review UI                   | Canvas determinism               | Maintenance                        | Lock-in |
| -------------------------------------------------- | --------------------------------------------------- | --------------------------- | --------------------------- | -------------------------------- | ---------------------------------- | ------- |
| Chromatic Pro (today)                              | ~$7,500/month                                       | no                          | best                        | Chromatic's browsers             | none                               | high    |
| Chromatic Free + opt-in                            | $0                                                  | yes, pauses at 5,000        | best                        | Chromatic's browsers             | none                               | high    |
| Argos Pro, capturing in our CI                     | ~$100/month opt-in, ~$1,490/month at today's volume | yes, once spend pause is on | good                        | ours (SwiftShader, pinned fonts) | low                                | low     |
| Percy                                              | ~$10,000/month (unverified)                         | no                          | good                        | Percy's browsers                 | none                               | high    |
| Happo                                              | ~$4,950/month                                       | unclear                     | good                        | Happo's browsers                 | none                               | high    |
| Playwright over static Storybook, baselines in git | $0                                                  | not needed                  | reg-cli report + PR comment | ours                             | medium, a few hundred lines we own | none    |
| Vitest `toMatchScreenshot` via the Storybook addon | $0                                                  | not needed                  | Vitest UI (local only)      | ours                             | medium-high, open bugs             | none    |
| Visual Regression Tracker                          | a server                                            | not needed                  | good                        | ours                             | high                               | low     |

## Recommendation

**Primary: capture in our own CI with Playwright, keep the baselines in git, and let the owner
approve through a protected GitHub Environment.**

- It is free, with no cap to manage. Continuous testing on every push costs CI minutes, which are
  free for this public repository.
- It is deterministic on our canvases. 998 of 999 captures were identical run to run, and the one
  exception is a story defect that any tool would show.
- It captures the built Storybook, the same artifact Chromatic captures. So it is indifferent to
  Storybook 8 versus 9, and it reuses the artifacts CI already uploads.
- It keeps the existing Nx affected-only gate and the per-package status checks.
- The owner-only acceptance rule becomes a permission, not a promise.

**Fallback: Argos Pro with the spend pause on, set at, say, $150 a month.**

- Use it if the self-hosted review experience proves too thin.
- The same capture step feeds it: `argos upload` takes the directory of PNGs the primary pipeline
  produces, so switching is one CI step, not a rewrite.
- Apply for the open-source sponsorship at the same time.

**Today, before any of this:**

- Move every Chromatic project to the Free plan. Its 5,000-snapshot pause is the only hard cap on
  offer, and it stops the bill immediately.
- Merge the opt-in change on `ci/chromatic-opt-in` so the free allowance is spent only when asked
  for.
- Check how a paused Chromatic build reports to the `ci-success` gate before relying on it. This
  has not been verified.

## Migration outline

1. **Stop the spend.**
    - Downgrade the five Chromatic projects to Free.
    - Merge the opt-in change.
    - Correct the stale TurboSnap comment in `ci.yml`.
2. **Make capture a first-class tool.**
    - Grow `tools/diff-stories.mjs` into `tools/capture-stories.mjs`: walk `index.json`, apply the
      Chromatic parameters the stories already declare (`modes`, `viewports`, `delay`,
      `disableSnapshot`), wait for the render phase, write `<story>.<mode>.png`.
    - Replace the user-agent trick for `isChromatic()` with an explicit signal the preview reads, for
      example a `visual=1` query parameter.
    - Fix `ai-control--default`.
    - Land the pinned label font and viewport from `test/storybook-harness-stability`.
3. **Pin the environment.** Run capture inside `mcr.microsoft.com/playwright:<version>-noble`,
   matching the repository's Playwright version, with the SwiftShader flags. Baselines are only
   ever written by this image in CI.
4. **Add the CI jobs.**
    - One `visual-<package>` job per package, gated by the existing affected plan.
    - Each downloads its `build-storybook-*` artifact, captures, and compares with
      `<package>/visual-baselines/` using pixelmatch at threshold 0.1 and zero allowed pixels.
    - It fails the check on any difference and publishes the reg-cli report, the PR comment and the
      job summary.
    - Add the jobs to the `ci-success` needs list.
5. **Add the approval path.**
    - Create the `visual-baselines` environment with the owner as its only reviewer.
    - Add the dispatch workflow that recaptures and commits the accepted PNGs to the PR branch.
    - Update the decision record to name the environment instead of Chromatic's accept button.
6. **Seed the baselines** by running the accept workflow once on master through a normal pull
   request, which the owner reviews image by image.
7. **Run both side by side** for two weeks, with Chromatic Free on opt-in and the new jobs gating.
   Compare what each flags.
8. **Retire Chromatic.**
    - Remove the five Chromatic jobs, `tools/chromatic*.sh` and `tools/chromatic-capture.mjs`, the
      `chromatic` dev dependencies, and the `isChromatic` import.
    - Keep or delete the Free projects as the owner prefers.

## What we lose compared with Chromatic

- **The review app.** Chromatic has one page per build with per-story accept and deny, a diff
  overlay with a spotlight, comments on a snapshot, and a history of who accepted what. Self-hosted
  review is a static report plus a PR comment, and accepting is a workflow run. Accepting a subset
  means typing story ids. Argos gets most of the app back, for money.
- **A published Storybook per build**, linked from the PR, and the "UI Review" workflow.
- **Baseline bookkeeping done for us.** Chromatic follows accepted snapshots across merges, rebases
  and squashes. With git baselines, two pull requests that change the same story conflict, and the
  second is accepted again after the first merges.
- **Chromatic's rendering farm.** Chromatic captures on its own browsers, in parallel, with its own
  fonts. We become responsible for the image, the fonts, the flags and the time: about 3 minutes
  locally for all five Storybooks, probably 5 to 10 minutes in CI across parallel jobs.
- **Flake handling.** Chromatic retries and reports unstable snapshots. We get "capture until two
  consecutive shots match" only if we write it, which is what Vitest's own assertion does.
- **Multi-browser capture.** Chromatic can add Firefox, Safari and Edge. We capture Chromium only,
  which is what we use today.
- **No vendor lock-in to lose, and no bill to watch.** This is a gain, not a loss.

## Sources

Read on 2026-09-27.

- [S1] https://www.chromatic.com/docs/billing/
- [S2] https://docs.github.com/en/billing/concepts/product-billing/github-actions
- [S3] https://github.com/storybookjs/storybook/issues/27172 and https://github.com/storybookjs/storybook/pull/27218
- [S4] https://www.chromatic.com/docs/turbosnap/setup/
- [S5] https://www.chromatic.com/docs/turbosnap/
- [S6] https://www.chromatic.com/docs/open-source/
- [S7] https://argos-ci.com/pricing
- [S8] https://argos-ci.com/docs/learn/billing-and-subscription/pricing-plans.md
- [S9] https://argos-ci.com/docs/learn/billing-and-subscription/spend-management.md
- [S10] https://argos-ci.com/docs/learn/billing-and-subscription/open-source.md
- [S11] https://argos-ci.com/docs/reference/storybook.md
- [S12] https://argos-ci.com/docs/reference/argos-command-line-interface-cli.md
- [S13] https://argos-ci.com/docs/learn/review-workflow/review-a-build.md
- [S14] https://argos-ci.com/docs/learn/platform-fundamentals/baseline-build.md
- [S15] https://argos-ci.com/docs/learn/reliability-and-flakiness/flaky-test-detection.md
- [S16] https://argos-ci.com/docs/overview.md and https://github.com/argos-ci/argos
- [S17] https://www.browserstack.com/docs/percy/overview/plans-and-billing
- [S18] https://www.browserstack.com/open-source
- [S19] https://applitools.com/pricing/
- [S20] https://applitools.com/legal/open-source-terms-of-use/
- [S21] https://happo.io/pricing
- [S22] https://www.lost-pixel.com/blog/lost-pixel-team-is-joining-figma
- [S23] https://github.com/lost-pixel/lost-pixel
- [S24] https://azurefeeds.com/2025/09/09/retirement-microsoft-playwright-testing-preview-will-be-retired-on-march-8-2026/
- [S25] https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker
- [S26] https://playwright.dev/docs/test-snapshots
- [S27] https://github.com/microsoft/playwright/issues/22425
- [S28] https://markus.oberlehner.net/blog/running-visual-regression-tests-with-storybook-and-playwright-for-free
- [S29] https://playwright.dev/docs/docker
- [S30] https://vitest.dev/blog/vitest-4
- [S31] https://vitest.dev/api/browser/assertions#tomatchscreenshot
- [S32] https://vitest.dev/guide/browser/visual-regression-testing
- [S33] https://vitest.dev/config/browser/expect
- [S34] https://storybook.js.org/docs/writing-tests/visual-testing
- [S35] https://github.com/storybookjs/storybook/discussions/32930
- [S36] https://github.com/vitest-dev/vitest/issues/8853
- [S37] https://github.com/vitest-dev/vitest/issues/11250
- [S38] https://github.com/repobuddy/visual-testing/tree/main/packages/vitest-plugin-vis
- [S39] https://github.com/repobuddy/visual-testing
- [S40] https://github.com/reg-viz/storycap
- [S41] https://github.com/reg-viz/reg-suit and https://github.com/reg-viz/reg-suit/issues/182
- [S42] https://github.com/reg-viz/reg-cli
- [S43] https://github.com/reg-viz/reg-actions
- [S44] https://github.com/garris/BackstopJS/releases
- [S45] https://github.com/oblador/loki and https://github.com/oblador/loki/issues/550
- [S46] https://storybook.js.org/docs/writing-tests/integrations/test-runner
- [S47] https://github.com/mapbox/pixelmatch
- [S48] https://github.com/dmtrKovalenko/odiff
- [S49] https://docs.github.com/en/billing/concepts/product-billing/git-lfs
- [S50] https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization
- [S51] https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- [S52] https://github.com/onyx-dot-app/onyx/pull/14491
- [S53] https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- [S54] https://github.com/streamlit/streamlit/pull/17143
- [S55] https://blog.scottlogic.com/2025/08/21/making-visual-comparison-test-maintenance-easier-with-github-actions.html
