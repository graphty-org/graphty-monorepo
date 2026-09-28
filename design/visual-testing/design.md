# Visual review: design, roadmap and plan

Date: 2026-09-27

This is the design for the system that replaces Chromatic in the graphty monorepo. Chromatic
screenshots every story in the repository's five Storybooks, compares each screenshot with an
approved "baseline" image, and lets the owner accept or reject each difference. It billed about
$3,750 in half a month with no spending cap. The replacement does the same work in our own GitHub
Actions jobs and in git, and costs $0 a month.

It is built in two steps. **Today** the owner can review and accept again, but an accept is an
unsigned record marked "unproven": nothing yet stops an AI agent on the owner's machine from
writing one. **This week** the owner reviews and signs on their own computer, with a small tool
they have read, run from a commit they pinned, and a hardware security key that needs a physical
touch and a PIN. From then on the "Visual review" check is required and accepts only those
signatures, and an audit run from the pinned commit reports any baseline change that no such
signature covers. Section 8 states exactly what this does and does not guarantee; the largest gap
is that the Storybook being captured is built by pull request code, so a pull request can still
hide a visual change from the capture, and that is detected only after it merges.

Timing words map to `roadmap.md`'s milestones: "today" is milestone 1, "within days" milestone 2,
"this week" milestone 3, "weeks two and three" milestone 4. Milestone 1 was built smaller than
this document's target in several deliberate ways; section 1a lists what exists now, and where it
and the rest of this document disagree, section 1a describes the code.

The research behind the numbers is in the same folder: `chromatic-alternatives.md` (options and
measurements), `feature-analysis.md` (every candidate feature with its tier), `research-chromatic-use.md`
(what we use from Chromatic, with file references), `research-other-systems.md`, `research-repo.md`
(CI, Pages, pre-push, permissions) and `research-tech.md`.

## 1. Summary

| Part               | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code               | A new private workspace package, `@graphty/visual-review` in `visual-review/`, written as plain `.mjs` with no build step. `trusted/` holds verify, audit, sign, serve, compare and the review page, using only node built-ins, `git`, `gh`, `ssh-keygen` and a vendored copy of pixelmatch, under a line budget the owner can read. `capture/` adds Playwright. It absorbs `tools/diff-stories.mjs` and `tools/pixel-diff.mjs`.                                       |
| Capture            | Runs in `visual.yml`, a workflow that runs master's code after a new `storybooks.yml` workflow has built the pull request's Storybooks, never the pull request's code. Playwright and Chromium with SwiftShader open each story at 1200 x 900, with `&chromatic=true` and a frozen clock. The pull request's JavaScript runs only inside Chromium.                                                                                                                     |
| Compare            | SHA-256 of the PNG first; pixelmatch only on files whose bytes differ. Every differing story is captured a second time in a fresh browser context, which separates real changes, unstable stories and one-off flakes.                                                                                                                                                                                                                                                  |
| Baselines          | PNG files in Git LFS from the first baseline, in a root `visual-baselines/<project>/` directory that belongs to no Nx project, with one settings file per story that is the source of truth for its capture settings; review records and settings files stay plain git. About 16 MB for the first two projects (section 7). Seeding is per story: a story is accepted when it looks right, and until then it blocks only a pull request that changes it (section 11a). |
| Approval           | Today: an unsigned record marked "unproven", written from the review page on the development server. This week: `visual-review sign` on the owner's own computer, from a pinned commit, shows every before and after image and signs the record with `ssh-keygen -Y sign` and an `ed25519-sk` security key (touch and PIN). Rejects are never signed.                                                                                                                  |
| Records            | One JSON file per review session in `visual-baselines/reviews/`, covering every project reviewed in it, committed with the images, and recording the capture environment.                                                                                                                                                                                                                                                                                              |
| Pull request check | A "Visual review" status posted by `visual.yml`. Advisory at first; required once enforcement starts.                                                                                                                                                                                                                                                                                                                                                                  |
| Audit              | `visual-review audit` flags every baseline or protected-file change on master that no valid signature covers. The owner runs it from a root commit they recorded outside the repository; `visual-audit.yml`, which `release.yml` waits for, runs it on every master push together with a drift capture.                                                                                                                                                                |
| Pre-push           | Blocks on a baseline change without a valid signature (seconds). A capture comparison is opt-in until measured.                                                                                                                                                                                                                                                                                                                                                        |
| Cost               | $0 a month. Two FIDO2 security keys (about $25 to $60 each, once) are needed before signing starts.                                                                                                                                                                                                                                                                                                                                                                    |

## 1a. Milestone 1 as built

What is in the repository today, where it differs from the target above. `plan.md`, "Decisions
for this milestone", gives the reason for each.

- **Capture is a `visual` job in `.github/workflows/ci.yml`**, one per project (compact-mantine and
  graphty-element), after the existing build job and using the Storybooks it uploads. There is no
  `storybooks.yml` or `visual.yml` yet. So the pull request's own code runs the capture, including
  `visual-review/capture/` and `ci.yml` itself: a pull request could change how it is captured or
  judged, and only code review would notice. That ends in milestone 3.
- **The merge gate blocks.** On pull requests the "All Checks Pass" job runs
  `visual-review/trusted/gate.mjs`. For every project that has baseline PNGs on the base branch it
  reads the newest attempt's `results.json` of this CI run, and fails when that capture holds any
  item other than `unchanged`, `excluded` or `unseeded` (no baseline yet, and the pull request
  does not change it; section 11a), or is missing or unfinished. Both the list of
  projects and "seeded" are read from the base branch (the directories under `visual-baselines/`
  holding a PNG), so neither deleting a project's baselines nor editing
  `visual-review/projects.json` in the pull request switches the gate off; the newest attempt is used, so "Re-run failed jobs" cannot skip it; a `results.json` that
  fails validation counts as missing. The owner's accept commit turns the items `unchanged`,
  which clears it.
- **The gate also checks review records.** Every baseline PNG, and every settings file that
  excludes a story, that differs between the base tip and the pull request (the merge ref's first
  parent and the merge ref) must appear, with its new SHA-256, as the `to` of an item in a record
  the pull request adds under `visual-baselines/reviews/`; a record the base already holds may
  not be changed or deleted. Without this, committing the captured PNGs into `visual-baselines/`
  cleared the gate with no review: in a scratch clone a rejected item's PNG, committed by hand,
  turned the next capture all `unchanged` and the old gate passed.
- **What the gate proves.** That the pull request's captures match its own baselines, and that
  every baseline change is named, by path and new hash, in some JSON file added under
  `visual-baselines/reviews/`. Only those two fields are checked: the record need not have
  Finish's other fields, and its hash need not match any CI capture. It does not prove the owner pressed
  Finish: a record is a plain file anyone who can push can write, including an agent holding the
  owner's credentials, and the gate lives in `ci.yml`, which the pull request controls. Signed
  records (milestone 3) close that. Master pushes are not gated.
- **A capture crash never fails a run by itself.** The `visual` job has job-level
  `continue-on-error: true`, and the "Check all jobs passed" step skips the `visual` entry of
  `needs` altogether, so whatever result GitHub reports for a failed matrix job under
  `continue-on-error` cannot fail master's run (release, deploy and coverage wait on it). On a
  pull request a crash blocks through the gate instead, as a missing or unfinished capture.
- **Not yet run in CI.** The branch has not been pushed, so none of these is measured: the visual
  jobs themselves, the gate's artifact download and its depth-2, blob-less checkout, the wall
  time of each project on a runner, and whether two CI runs of one commit produce byte-identical
  PNGs, which the whole approach depends on. Milestone 1 is done only when the tooling pull
  request's own run shows them: both visual jobs green with a complete `results.json`, All
  Checks Pass green, a deliberate capture crash on a throwaway branch still leaving the run
  green, a re-run of the visual job whose hashes equal the first attempt's, and each project's
  wall time. Record the results here.
- **Capture time.** On the development server (i9-14900KF, 4 workers) compact-mantine took 2 min
  12 s with all 828 items new and 1 min 00 s when seeded; graphty-element took 6 min 49 s with
  all 169 stories new (each new item is captured twice) and 3 min 39 s when seeded. The job's
  timeout is 45 minutes until the first CI runs are measured.
- **The gate is inactive until the first baselines are on master.** No `visual-baselines/`
  directory exists yet, so no project is seeded and nothing is blocked.
- **Baselines are Git LFS objects from the start** (`.gitattributes`:
  `visual-baselines/**/*.png filter=lfs diff=lfs merge=lfs -text`), decided before any baseline was
  committed; section 7 gives the reasons and the bandwidth estimate. Only the `visual` job fetches
  images, and only its own project's (`git lfs pull --include`), with the objects cached in the
  Actions cache; every other job, the gate included, sees pointer files. Capture and `compare`
  stop with "baseline is an LFS pointer; run git lfs pull" rather than report every image changed.
  `serve` refuses to start without a working git-lfs, and Finish refuses a commit whose PNG is not
  a pointer and uploads the objects with `git lfs push` before `git push` (it runs with hooks off).
  The gate, and the pre-push record check when it comes, read an image's hash from its pointer's
  `oid sha256:` line, which equals the PNG's SHA-256 that records name, so they never download an
  image. `.husky/pre-push` runs `tools/lfs-pre-push.sh` first, because `git lfs install` cannot add
  its own hook beside husky's.
- **Seeding is per story** (section 11a). On pull requests the `visual` job downloads master's
  newest complete capture (`visual-review reference`, with `actions: read`), and a story with no
  baseline whose capture matches master's is `unseeded` instead of `new`. Master's rejects become
  one issue with the machine-readable block, since master has no pull request to comment on.
- **`trusted/` has one dependency**, `pngjs`, for decoding PNGs in the comparison. The
  dependency-free rule matters once `trusted/` verifies signatures (milestone 3).
- **No pinned fonts.** Captures use the CI runner's system fonts. The clock starts at a fixed
  instant and keeps running. Pinned fonts arrive in milestone 2 as one planned re-baseline.
- **No pre-push visual step.** `tools/prepush.sh` runs only the visual-review package's own tests.
  The signature check and the opt-in local capture arrive in milestone 2.
- **Every pull request captures both projects.** Affected-only planning is milestone 2.
- **Story parameters are read on every capture.** A story's `parameters.chromatic`
  (`disableSnapshot`, `diffThreshold`, `diffIncludeAntiAliasing`, `delay`, `modes`) applies, with
  the story's settings file in `visual-baselines/<project>/<id>.json` taking precedence where one
  exists. A story newly excluded by its own parameters while it still has a baseline is reported
  as `removed`, with that reason, so it blocks until the owner decides; a dropped mode is reported
  as `removed` the same way. **A raised `diffThreshold`, a new `diffIncludeAntiAliasing` or a
  changed `delay` in a story's parameters is not a review item in milestone 1.** CLAUDE.md forbids
  agents to change these parameters; milestone 2 makes the settings file the source of truth and
  milestone 3 puts it under signing.
- **WebGPU is removed from every captured page** (`navigator.gpu` is deleted before any page
  script runs), so graphty-element always takes its CPU path. No Chromium switch hides WebGPU.
- **A failed capture is retried once** in a fresh browser context before it is reported `failed`.
- **Records are `"unproven": true`.** An agent holding the owner's credentials could press Accept,
  or write a record by hand.
- **Rejects are one pull request comment** with a machine-readable block; nothing is committed.
  After Finish a reject stays in the server's local state, keyed by the image's hash, so the next
  CI run shows an unchanged rejected capture as rejected rather than undecided, and Finish does
  not post it again. The page cannot show a reject made on another machine.
- **Finish signs with the server's environment.** The accept commit is signed by whatever git
  configuration the server process sees. When an agent starts the server through servherd, its
  `GIT_CONFIG_*` overrides (its own signing key) are inherited, so the commit carries the agent's
  signature, not the owner's. The targets screen and Finish's confirmation name the key and say
  when it comes from the environment; start the server from your own shell to sign with yours.
- **The capture artifact is `visual-<project>-<attempt>`, kept 30 days,** holding `results.json`
  and the PNGs. There is no separate `visual-results-<project>` artifact kept 90 days (sections 7,
  8 and 9); after 30 days a run's captures can no longer be reviewed or re-verified.
- **A local capture hashes only `git diff HEAD --binary`.** Untracked files are not part of the
  hash (section 9), so two local runs that differ only in an untracked file carry the same
  `diff` value. Local captures cannot be accepted, so this affects labelling only.
- **Tests.** The unit tests cover `trusted/lib/`, `trusted/gate.mjs` and `capture/capture.mjs`
  (against a stand-in Storybook) under the 80/75 thresholds. The review page is driven in Chromium
  by `test/page.test.mjs`, but browser code is not counted in coverage, and `trusted/cli.mjs` is
  only argument parsing around them, so it is left out of coverage; the gate's command line is run
  as a subprocess. `npm run lint` also type-checks `trusted/` and `capture/` from their JSDoc
  (`tsc --checkJs`, not strict). The CI workflow semantics are proven only by a run of the pull
  request itself (above).
- **Capture is at device scale factor 2, cropped to the content, as Chromatic's.** Each story and
  mode renders in a 1200 x 900 viewport at scale 2, and the PNG is cropped to the union of the
  story's ink: each text run's own box, each replaced element (image, SVG, canvas, form control)
  and each element that paints something of its own (a background other than the page's, a
  border, a shadow, an outline). A block that only lays out, such as the story root or a
  full-width wrapper, adds nothing, so a single button is cropped to the button. Portals such as
  tooltips and popovers are elements of the body too and count. Each box is cut to the ancestors whose overflow clips it (so rows hidden in a scroll area do not
  stretch it; a fixed element escapes them), plus a 32 CSS-pixel margin, within the page; a taller story is captured past the viewport. A canvas
  project (`canvas: true` in `projects.json`: graphty-element, and algorithms and layout when they
  join) keeps the viewport: its full width, and the content's height plus the margin, never past
  the viewport, since a larger capture can resize the Babylon canvas and clear it. results.json
  records `scale: 2` (a file without it is read as 1), and each review record copies it into its
  `subject`. A first version took every element's box; since the story root and full-width
  wrappers span the page, 976 of 994 compact-mantine captures came out the full 2400 px wide
  even for a single button, which the ink rule fixes.
- **Determinism at scale 2, cropped (measured 2026-09-27).** Two full captures back to back of
  each project on the development server (i9-14900KF, no baselines, so every item was also
  captured twice within each run, while other agents kept the load average between about 30 and
  80): compact-mantine, 8 workers, 828 items, 144 s and 120 s; graphty-element, 4 workers, 176
  items plus 2 excluded, 540 s and 571 s. Every one of the 1,004 PNGs was byte-identical between
  the two runs. Within the runs, one capture of 2,008 differed from its twin:
  `glyphs-glyph-gallery--field-glyphs.light` in the second compact-mantine run, by a single
  anti-aliased glyph pixel (73,80,87 against 127,133,138), so it was reported `unstable`; its
  first capture matched the other run's. An earlier pair of runs, before the crop stopped counting
  what a scroll area hides, was byte-identical as well. A third pair, with the ink crop below and
  the load average near 70: compact-mantine 822 of 828 byte-identical, five differing in bytes but
  in no pixel over the threshold, and the glyph gallery's one pixel again; graphty-element 173 of
  174 identical, `ai-control--default` unstable (known, section 6), and the two
  `layout-gpu--*-fake` stories failed in both runs on Playwright's 30 s screenshot timeout. On pull
  request #409's Storybook, adding the wait for web fonts (section 6, item 4) cut the captures that
  differed between two runs, or within one, from about 230 of 994 to 26. This is one machine;
  runner to runner is still unmeasured (section 6).
- **The stories with their own `diffThreshold`.** 21 graphty-element captures set one, all with
  `diffIncludeAntiAliasing: true`: the ten Layout/3D stories (0.3 from the component, D3 0.8),
  Styles/Graph Skybox (0.3) and ten Styles/Label stories (0.25 to 0.5). Chromatic's per-story
  verdicts cannot be read without the owner's login cookie (`tools/chromatic-capture.mjs` needs
  `CHROMATIC_SESSION_COOKIE`, which is not set), so the only Chromatic verdicts at hand are the
  story list of graphty-element build 1001 in `chromatic-study/03-options/01-build-1001-text.txt`
  (a branch that changed the label font, so its changes are real, not noise). Under our capture
  the two runs were byte-identical, so each threshold absorbed nothing: zero pixels differ at the
  default 0.063 and at the story's own value alike. What a threshold hides only shows once two
  captures differ, which on one machine they do not; the runner-to-runner measurement decides
  whether any is still needed. No story parameter was changed.

    | Capture                                                                                                                                        | Threshold | Chromatic build 1001 | Our run a vs run b |
    | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------- | ------------------ |
    | layout-3d--circular, --fixed, --force-atlas-2, --force-atlas-2-weighted, --kamada-kawai, --kamada-kawai-weighted, --ngraph, --random, --spring | 0.3       | not listed (passed)  | identical          |
    | layout-3d--d-3                                                                                                                                 | 0.8       | not listed (passed)  | identical          |
    | styles-graph--skybox                                                                                                                           | 0.3       | not listed (passed)  | identical          |
    | styles-label--badge                                                                                                                            | 0.5       | not listed (passed)  | identical          |
    | styles-label--emoji-labels                                                                                                                     | 0.25      | not listed (passed)  | identical          |
    | styles-label--background-gradient, --corner-radius, --pointer, --text-outline, --text-shadow, --unicode-text                                   | 0.25      | changed (unreviewed) | identical          |
    | styles-label--depth-fade, --font-size                                                                                                          | 0.3       | changed (unreviewed) | identical          |

- **The review page shows real size.** One CSS pixel of the page per CSS pixel the story was drawn
  at (the image's width divided by its scale), each image scrolling in its own frame, with 2x, 4x
  and 8x (hard pixels from 4x), and "next changed box", which scrolls every frame until the next
  region of changed pixels is in view (its top left first when it is larger than the frame) and
  outlines it inside the image, so a region at an edge keeps all four sides. A frame opens at the
  top left of its image, scrolling only to show a changed region smaller than the frame that
  would otherwise be out of sight. Views: side by side; flash, which alternates the two images
  themselves at about 1.5 Hz, and hold Space to flash; highlight; and spotlight, the new image
  dimmed to 65/255 except around the changed pixels grown by 10 image pixels (Chromatic's focus
  mask). The client-side crop to a background-coloured box is gone: capture crops now.
- **The grid.** It opens on the undecided items. Failed captures are listed first, in their own
  list, with their reason, console and stack (capture keeps the whole thrown message and the
  text of Storybook's error screen, `#error-message` and `#error-stack`); they can only be
  excluded. The rest is grouped by component (the story id before `--`), components holding a
  changed item first, then new, unstable and removed; a story's modes sit together. Tiles are
  numbered in the order the story screen's "N of M" and J / K follow, and coming back from a
  story outlines and scrolls to its tile. A text filter, a go-to box (a number, or part of a story
  id), and a per-component "Accept N undecided" (asks first; `/api/accept-all` with `component`)
  complete it. Escape returns to the grid from a story wherever the focus is.
- **No decision is silently reversed.** A reject always needs a reason. A, R and E do nothing on a
  decided item; U or Undo clears it first. The API refuses a different decision on a decided
  item with 409 and accepts the same one again (opening an item Accept all decided re-sends it).
- **One commit status per Finish.** "Visual review", posted once when Finish completes, on the
  pushed commit (or the captured one when nothing was accepted): `failure` with any reject,
  `pending` while items are undecided, else `success`, with the counts in its description.
  Chromatic re-posted its status after every accept (27 times on pull request #409). It is
  information, not a required check; a failed post is reported on the page and undoes nothing.
- **A local preview (`serve --results`) is look only.** It is the target "local", titled "Local
  preview", never master or a seed: no Accept, Reject or Exclude, no Finish, and the API refuses
  every decision and Finish on it, because Finish accepts only CI captures. `--branch` is gone.
- **The signing key and how to replace it.** The targets screen and Finish's confirmation name the
  key, where git found it (`git config --show-origin`), and the committer, and print the exact
  command that starts the same server from the owner's own shell.

The owner's guide to reviewing is `visual-review/README.md`.

## 2. Goals and non-goals

**Goals**

1. The owner can approve images again **today**, starting with compact-mantine and then
   graphty-element, and unblock the pull requests waiting on Chromatic.
2. Every P0 in the owner's list: a web diff UI, accept and reject in it, baselines committed to
   git, CI, a pre-push hook, several projects, a review history tied to commits, and no hosted
   server.
3. Accepting a change requires the owner, not merely the owner's credentials. Section 8 states
   exactly what that guarantees, from when, and under which assumptions.
4. Nothing can bill past $200 a month; the design aims at $0.
5. Every later feature is an addition, not a rewrite.

**Non-goals**

- Replacing the unit, contract or determinism tests. Visual review sits beside them.
- Automatic approval of anything, by anyone other than the owner. There is deliberately no accept
  command an agent can run to completion, and the MCP server will have no accept tool.
- Perceptual or AI image comparison. It hides the one-pixel changes graphty-element cares about.
- Multiple reviewers, roles or sign-in. There is one reviewer.
- Chromatic parity in features the repository does not use (TurboSnap, UI Review, accessibility
  tests, Figma links).

## 3. Feature tiers

The owner's list, the Chromatic features the repository actually uses, and features from other
systems (Argos, Percy, Happo, Applitools, reg-cli, Playwright, BackstopJS, Visual Regression
Tracker, GitHub) are analysed row by row in `feature-analysis.md`. This table is the result, with
the changes from the owner's tiers explained.

| Feature                                                                                                                                           | Owner             | Recommended                                                | When                                                                                                                 | Why the change, if any                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Web diff UI                                                                                                                                       | P0                | P0                                                         | today                                                                                                                |                                                                                                                                    |
| Accept and reject in the UI, with a reason                                                                                                        | P0                | P0                                                         | today                                                                                                                | The reason is the history's "why"                                                                                                  |
| Baselines committed to git                                                                                                                        | P0 (probably LFS) | P0, Git LFS                                                | today                                                                                                                | The owner's decision before the first baseline: plain-git image history is permanent and a later move rewrites history (section 7) |
| Run in CI                                                                                                                                         | P0                | P0                                                         | today (blocks unreviewed merges, proves nothing about who), this week (signed and required)                          |                                                                                                                                    |
| Pre-push hook                                                                                                                                     | P0                | P0: signature check blocks; capture comparison opt-in      | within days; today there is no pre-push visual step                                                                  | A local capture can only block once it matches CI byte for byte, which needs the pinned fonts                                      |
| Multiple projects                                                                                                                                 | P0                | P0                                                         | compact-mantine today, graphty-element once its harness fix merges, the rest within days                             |                                                                                                                                    |
| History tied to git hashes                                                                                                                        | P0                | P0 as records today; a per-story history panel P1          | today, panel within days                                                                                             | The records hold the data; the panel only reads them                                                                               |
| ...and dirty state                                                                                                                                | P0 (question)     | answered by a rule                                         | today                                                                                                                | Only CI captures of a pushed commit can be accepted (section 9)                                                                    |
| No hosted server                                                                                                                                  | P0                | P0                                                         | today                                                                                                                | Review runs on the development server today and on the owner's computer from this week; nothing is hosted                          |
| Affected-only runs                                                                                                                                | P1                | P1                                                         | within days                                                                                                          | Planned by master's rules, not the pull request's Nx settings (section 12); both projects cost a few free minutes until then       |
| Flashing                                                                                                                                          | P1                | **P0**                                                     | today                                                                                                                | A few lines; graphty-element's canvas changes are often a few pixels                                                               |
| Pixel highlighting                                                                                                                                | P1                | **P0**                                                     | today                                                                                                                | Same reason                                                                                                                        |
| Zoom to the change, keyboard review                                                                                                               | --                | **P0**                                                     | today                                                                                                                | A few lines each; few-pixel changes are invisible without zoom                                                                     |
| Exclude a flaky story with a reason                                                                                                               | --                | **P0**                                                     | today                                                                                                                | One flaky story among about 1,000 would otherwise block the seed                                                                   |
| Links to baseline and new live Storybooks                                                                                                         | P1                | P1                                                         | within days                                                                                                          |                                                                                                                                    |
| Comments Claude can pick up                                                                                                                       | P2                | P2                                                         | later                                                                                                                | Reject reasons cover much of it, as untrusted data (section 8)                                                                     |
| Optimise time, CPU, storage                                                                                                                       | P2                | P2, except hash-before-pixels at P0                        | today (hashing)                                                                                                      | Hashing all 1,198 captures takes 30 ms                                                                                             |
| MCP server                                                                                                                                        | P2                | P2; the machine-readable `results.json` it reads is **P0** | later                                                                                                                | Everything reads that file: the UI, CI, pre-push                                                                                   |
| Other browsers                                                                                                                                    | P2                | P2                                                         | later                                                                                                                | Start with compact-mantine on WebKit, which has no canvas                                                                          |
| Owner-only approval an agent cannot forge (no vendor has this)                                                                                    | --                | **P0**                                                     | unproven records today, signed and enforced this week                                                                | Agents here hold the owner's GitHub token and signing key                                                                          |
| Accept a whole project at once, progress count                                                                                                    | --                | P0                                                         | today                                                                                                                | The seed is about 1,000 images                                                                                                     |
| Light and dark modes, `delay`, `disableSnapshot`, `diffThreshold`, `diffIncludeAntiAliasing`, `pauseAnimationAtEnd` (Chromatic parameters in use) | --                | P0                                                         | today                                                                                                                | Five story parameters are the whole story-level surface we use                                                                     |
| The `isChromatic()` signal                                                                                                                        | --                | P0                                                         | today                                                                                                                | Physics layouts pre-step and a label animation stops; `&chromatic=true` in the URL keeps it working                                |
| Settings changes are review items                                                                                                                 | --                | P0                                                         | today for a newly excluded story or a dropped mode; within days for thresholds, anti-aliasing and delay (section 1a) | A raised threshold or a new `disableSnapshot` changes what is checked                                                              |
| Retrospective audit from a pinned root                                                                                                            | --                | P0                                                         | this week                                                                                                            | The only check an agent cannot rewrite (section 8)                                                                                 |
| Modes grouped per story, pull request context on the review screens                                                                               | --                | P1                                                         | within days                                                                                                          | Halves the key presses on compact-mantine; shows whether a diff is intended                                                        |
| Recapture of failed and unstable stories, re-apply after a rebase                                                                                 | --                | P1                                                         | within days                                                                                                          | Without them one timeout blocks a clean pull request                                                                               |
| Compare any two built Storybooks (for example the last 1.x release against master)                                                                | --                | P1                                                         | week two                                                                                                             | A real past need (issue #518); `diff-stories.mjs` already does it                                                                  |
| Hosted review site, group identical changes, mask regions, full history page, WebP baselines, alignment-aware diff, agent review summary          | --                | P2                                                         | later                                                                                                                |                                                                                                                                    |
| Auto-approve, multiple reviewers, perceptual diffing, agent approval                                                                              | --                | never                                                      | --                                                                                                                   | Conflict with owner-only acceptance or hide real changes                                                                           |

## 4. Architecture

```
 pull request push
        |
        +--> ci.yml (tests, unchanged; the pull request's code)
        |
        v
 storybooks.yml (pull_request; the pull request's code; contents: read, no secrets)
   builds the five Storybooks from the merge commit; uploads them plus build.json
   (the merge commit it built and both parents)
        |
        v
 visual.yml (workflow_run of storybooks.yml; master's code; actions: read in capture)
   resolve: the pull request from head repository + branch; validate build.json's parents
   plan:    master's rules over git diff base..head -> projects to capture
   capture: each planned Storybook as data; capture twice where it differs; compare with the
            baselines of the merged tree and of the base tip; upload results and PNGs
   verify:  every changed baseline or protected file is covered by a valid signed record
            -> "Visual review" status; one pull request comment (a convenience, not evidence)
        |
        v
 owner's own computer: `node <pinned>/visual-review/trusted/cli.mjs sign --pr N`
   fetches the capture and baselines, re-hashes them, serves the review page on 127.0.0.1;
   prints the record hash; ssh-keygen -Y sign (touch + PIN); commits and pushes
        |
        v
 a push that changed only visual-baselines/ reuses the last capture, so the verifier turns
 green in minutes

 master push: storybooks.yml -> visual-audit.yml (protected; release.yml waits for it): the
 audit of the pushed range, and a drift capture of the projects the range can affect
```

The only trusted inputs are: the root commit and key fingerprints the owner recorded outside the
repository, the tool code the owner has read and signed, the signatures in the records, and git's
own objects. Everything else, including the development server, master's workflows and master's
dependencies, is treated as something an agent could have altered.

## 5. Components and file layout

**Decision: a private workspace package in plain `.mjs`, with no build.** The command line, the
review page and the later MCP server share the results schema, the record format, canonical
hashing and the pixelmatch settings. There is no bundle and no compiled app: what is committed is
what runs, so the owner can read every tool change as an ordinary diff.

```
visual-review/                        @graphty/visual-review, "private": true, bin "visual-review"
  package.json, project.json          Nx targets: test, lint (no build); out of nx release
  projects.json                       the project registry and plan rules (section 12)
  trusted-keys.json                   trusted ssh security-key public keys with attestation (section 8)
  fido-metadata/                      vendored FIDO metadata roots the audit checks attestation against
  fonts/, fonts/fonts.conf            the pinned font set used by every capture (section 6)
  trusted/                            node built-ins, git, gh and ssh-keygen only; no dependencies
    cli.mjs                           verify | audit | sign | serve | compare | diff
    lib/*.mjs                         results and record schemas, canonical JSON, hashing,
                                      signature and attestation checks, git and gh helpers
    vendor/pixelmatch.mjs             pixelmatch's source (about 200 lines, ISC), vendored
    page/index.html, review.js, .css  the review page, plain HTML and JavaScript
  capture/capture.mjs                 Playwright capture; the only code with a dependency
                                      (an exact playwright-core version)
  mcp/                                later: a stdio MCP server over the same data
  test/                               unit tests, signature test vectors, a fixture Storybook

visual-baselines/                     root directory; in .nxignore and .prettierignore
  <project>/<story-id>[.<mode>].png   a Git LFS object (section 7)
  <project>/<story-id>.json           that story's settings: disableSnapshot (with a reason),
                                      diffThreshold, diffIncludeAntiAliasing, delay, modes
  reviews/<utc-time>-<id>.json        one accept record per session, any number of projects
  reviews/<utc-time>-<id>.sig         its ssh signature (absent on unproven records)

.github/workflows/
  storybooks.yml                      pull_request and master push: build the five Storybooks
  visual.yml                          workflow_run of storybooks.yml, dispatch, weekly
  visual-audit.yml                    workflow_run of storybooks.yml on master: audit and drift
```

**Line budget.** Everything under `trusted/`, including the vendored pixelmatch and the page, stays
under 2,500 lines, and a test fails above it or on any minified or generated file there. That is
what lets the owner read the whole tool once before the seed manifest and read each later tool
change in full.

**Why a root `visual-baselines/`.** Inside a package, every accept would mark that package and
everything depending on it as affected (nx.json's `default` input is `{projectRoot}/**/*`), bust
the build caches and rerun every test shard just to confirm the capture equals the new baseline.
At the root, in `.nxignore`, a baselines-only commit affects no Nx project. Signatures cover
canonical JSON, so the on-disk layout does not matter.

**Why no dependencies in `trusted/`.** `verify` and `audit` decide what counts as signed. If they
ran on `node_modules` installed from the root lockfile, any merged pull request could change a
resolved dependency and weaken the check without touching a protected path. `trusted/` runs with
`node` alone, in the workflows and on the owner's computer. (Milestone 1's comparison still
imports `pngjs`; see section 1a.)

**Settings files are the source of truth.** A story's parameters are only the default written
when the story is first captured. A later change to those parameters is proposed as a settings
review item, and the owner's "Exclude with reason" writes `disableSnapshot` to the file directly.
One file per story means two pull requests that each add a story never touch the same file.

**Out of nx release.** nx.json releases every project (`"projects": ["*"]`), private ones
included, and its release commit is pushed straight to master. `visual-review` is excluded
(`"!visual-review"`), with a test that fails if the exclusion goes.

Deleted once absorbed: `tools/diff-stories.mjs`, `tools/pixel-diff.mjs`. Kept until nothing needs
Chromatic's old images: `tools/chromatic-capture.mjs`.

## 6. Capture and determinism

`visual-review capture --project <id> --storybook <dir> --out <dir>` builds on the existing
measurements: 998 of 999 viewport captures were byte-identical between two runs, about 1,198
captures in about 3 minutes, on an idle 32-thread machine with host fonts. The pinned fonts change
that environment, so every measurement is rerun under them before a seed.

1. Serve `storybook-static` from a small `node:http` server (the code in `diff-stories.mjs`).
   Read `index.json`, skip docs entries.
2. Open `iframe.html?id=<id>&viewMode=story&chromatic=true[&globals=<mode global>:<mode>]`. The
   `chromatic=true` URL signal makes `isChromatic()` return true, so every existing call site keeps
   working with no story change.
3. **Fixed start time.** Every context calls `page.clock.install({ time: "2026-01-01T12:00:00Z" })`
   and then `page.clock.resume()` before navigating, so the clock starts at a fixed instant and
   keeps advancing. Stories that print the time (the graphty app's `AiMessageBubble`, the top
   bar's dates) render the same every day, and code that measures elapsed time with `Date.now()`
   (graphty-element's input playback and recording) still progresses; `setFixedTime` would freeze
   it. Both calls install Playwright's fake clock, so the proof that settle waits still work is the
   two-run determinism check, not the choice of call. The instant is recorded in `results.json`.
4. **Settle.** Wait for `__STORYBOOK_PREVIEW__.currentRender.phase === "completed"`; `errored` is
   **capture failed**, reported differently from "changed" (issue #351). "Completed" does not mean
   graphty-element has settled: its preview declares the settle `play` function inside
   `parameters`, where Storybook never reads it. So the capture then calls `waitForStableFrame()`
   on every `graphty-element` in the story and waits for one more animation frame. A rejection, a
   timeout, or any "Graph settled timeout" console warning makes the item `failed`, never a
   picture, and its console output goes into `results.json`. Before that, wait for
   `document.fonts.ready`, one animation frame and `document.fonts.ready` again: a web font is
   fetched only when text first needs it, which can be after the render completed, and a capture
   taken before it arrives draws the fallback face, a different crop, and anything placed beside
   the text elsewhere. On pull request #409 (which bundles Inter) this alone made roughly 230 of
   994 captures differ between two runs on a loaded machine. Then wait the story's `delay`.
5. **Settings.** Read the story's settings file; for a story with none, take `disableSnapshot`,
   `diffThreshold` and `diffIncludeAntiAliasing` from its parameters and propose a new settings
   file. A parameter that later differs from the file is proposed as a settings item.
6. Screenshot a 1200 x 900 viewport at device scale factor 2 (as Chromatic), `caret: "hide"`,
   `animations: "disabled"`, cropped to the story's ink (text, replaced elements and whatever
   paints a background, border or shadow; section 1a) plus 32 CSS pixels. **Viewport only, full width** for canvas projects (graphty-element, algorithms,
   layout; cropped only in height): a full-page capture can resize the Babylon canvas, which
   clears it and redraws on a later frame the settle wait never saw. Other projects may extend past
   the viewport when their content does; the two-run measurement in section 1a covers it. `animations: "disabled"` fast-forwards finite CSS and Web
   Animations (which matches `pauseAnimationAtEnd`) and resets infinite ones. It does not touch
   timer-driven state such as Mantine Transition phases; if those flake, compact-mantine's preview
   sets Mantine's transition durations to 0 when `chromatic=true`.
7. **Chromium flags:** `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
--force-color-profile=srgb --disable-lcd-text --font-render-hinting=none`, matching
   `tools/diff-stories.mjs`. No Chromium switch hides WebGPU (`navigator.gpu` stays defined, and
   whether an adapter request fails differs by host), so capture deletes `navigator.gpu` in an init
   script before any page script runs. Every story then takes graphty-element's CPU path the same
   way on every host. `TZ=UTC`, `LANG=en_US.UTF-8`.
8. **Pinned environment.** The `ubuntu-24.04` runner label, and the exact `playwright-core`
   version in `visual-review/package.json`, bumped only by a deliberate upkeep pull request
   (quarterly), independent of other lockfile changes. The browser directory is restored from a
   cache keyed by that version (restore only; the capture job never saves a cache).
9. **Pinned fonts.** The capture sets `FONTCONFIG_FILE=visual-review/fonts/fonts.conf`, which lists
   only the committed font directory (Inter, DejaVu Sans and DejaVu Sans Mono, and the COLRv1 build
   of Noto Color Emoji; all OFL) and a temporary `<cachedir>`, so no host font is consulted.
   Explicit alias rules decide which committed font answers each family: `sans-serif`, `serif`,
   `monospace`, `emoji`, `system-ui`, `ui-sans-serif`, `ui-monospace`, `SFMono-Regular`, `Menlo`,
   `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial` and `Verdana`
   (graphty-element's label default). A check story renders each family, a non-Latin line, an
   emoji and the current time, so a font or clock regression is one obvious diff. Within days, a
   test greps story and component sources for `font-family` values and fails on a family with no
   rule.
10. **Recorded environment.** Each capture records the CPU model and flags from `/proc/cpuinfo`,
    the Chromium version, the WebGL renderer string, whether `navigator.gpu` exists, the SHA-256 of
    the font directory and the tool version. The record that accepts an image copies that
    environment into its signed `subject`, so the environment of every baseline stays in git.
    Compare reads the environment of the baseline's newest covering record; a capture whose
    `navigator.gpu` or renderer differs from it is an environment error, not a diff.

**Measurements before each project's seed** (every project):

- Two-run determinism under CI-like contention (`taskset -c 0-3`, 4 workers) on the development
  server, with the pinned fonts; for compact-mantine also full page. A story whose play function
  or settle wait timed out is a finding, fixed in the story or excluded with a reason. algorithms
  and layout need this most: the layout 3D stories run a timed one-second tween, and the
  algorithms play functions compute their `waitFor` timeouts from a wall-clock `animationSpeed`.
- 2 against 4 workers on the runner; keep the faster.

Two more measurements run in parallel and never block a seed:

- **Runner to runner:** capture the same artifact in up to 10 CI runs and record the CPU models
  seen and whether pixelmatch at each story's threshold absorbs the difference. If it does not,
  capture moves into the Playwright container image, as a planned re-baseline (section 15).
- **Local against CI** with the pinned fonts, which decides whether pre-push capture can ever block.

**Fix before seeding** (or the baselines are wrong from the start):

- **graphty-element is seeded only after `test/storybook-harness-stability` merges** (commit
  9f20e4a9, not on master today), or at least its preview, font and pre-step parts. It registers a
  committed Inter font as "Verdana", deletes the 1,000-pre-step Chromatic decorator, moves
  pre-steps into five Data stories and changes Physics250's stepping.
- `ai-control--default` is unstable: give it a fixed seed, or exclude it with a reason.
- compact-mantine's `indicator--default` loaded its avatar from `i.pravatar.cc`, so a capture
  showed the photo or an empty circle depending on whether the network answered before the
  screenshot (capture's second pass marked it `unstable`). The story now draws initials and needs no
  network. A local capture after the fix: 828 images, none unstable, and the 826 untouched images
  byte-identical to a capture made before it. No other compact-mantine story loads a remote URL.
- The graphty app (within days): its light mode sets the global `colorScheme` but its preview reads
  `theme`, so both modes render dark; and the eruda debug button is drawn into every story
  (issue #204).

## 7. Diffing and storage

### Diffing

1. **Hash first.** Equal SHA-256 means unchanged. 30 ms for all 1,198 captures.
2. **pixelmatch on the rest**, at the story's `diffThreshold` (default 0.063, Chromatic's
   default, checked once against the 14 stories that set their own) and `includeAA` from
   `diffIncludeAntiAliasing`. Zero pixels over the threshold are allowed. If all pixels are under
   the threshold the status is `unchanged` and the old baseline is kept.
3. **Size changes.** Both images are padded to the larger width and height, anchored top-left,
   with a fixed checkerboard. The padded area counts as changed, and the item carries both sizes.
   Since captures are cropped to their content, a story that grows or shrinks is a size change.
   Sizes, boxes and pixel counts are in image pixels (two per CSS pixel at scale 2); the review
   page states sizes in image pixels only, never mixing units as Chromatic's message does.
4. **Second capture.** Every item that differs from its baseline, and every new item, is captured
   again in a new browser context. With the same pixelmatch rule:
    - both captures agree and differ from the baseline: `changed` (or `new`);
    - the two disagree and neither equals the baseline: `unstable`. It cannot be accepted, since
      the next run could capture the other image. The owner resolves it with **Exclude with
      reason**, which writes `disableSnapshot: true` and the reason to the settings file as an
      ordinary settings item, or the story is fixed and recaptured;
    - one differs and the other equals the baseline, and that baseline and settings file are
      unchanged in this pull request: `flaky`. It passes the gate, is not a review item, and adds
      one to that story's flake count in the weekly issue. A story over three flakes in a week gets
      its own issue.
5. **Failed items** (an errored render, a settle timeout) are never acceptable. They are resolved
   by a recapture (section 10), by fixing the story, or by Exclude with reason.
6. **Two comparisons.** Each item is compared with the baseline in the merged tree (the gate: is
   everything accepted?) and with the baseline on the base branch tip (the review: what does this
   pull request change about master?). The review screens use the second; an item that equals
   master's image is labelled "back to master, nothing to sign".
7. **`results.json`** has one entry per story and mode: both statuses, old and new SHA-256, both
   sizes, the changed-pixel count and bounding box, the recapture count, and the console output of
   a failure; plus the tool version, the built merge commit and its parents, the merged tree, the
   frozen clock instant, the dirty flag and diff hash (local runs), and the environment of section 6
   item 10. The schema caps entry counts and string lengths.
8. **No diff images are stored.** The review page runs the same pixelmatch in the browser (20 to
   50 ms a pair).

### Storage and its size over a year

| What                       | Where                                                  | Size                                                                                                                                                                                                                          | Retention                            |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Baselines                  | monorepo, Git LFS                                      | graphty-element 7.4 MB (171 images) and compact-mantine 8.9 MB (828), measured: about 16 MB. algorithms, layout and graphty (75 stories, light and dark, full height) are not yet measured; estimate 22 to 26 MB for all five | forever                              |
| Review records             | monorepo                                               | about 1 to 2 KB a session; a seed manifest about 250 KB                                                                                                                                                                       | forever                              |
| `visual-results-<project>` | Actions artifact, `results.json` only                  | a few KB                                                                                                                                                                                                                      | 90 days                              |
| `visual-<project>`         | Actions artifact, PNGs of differing and new items only | small                                                                                                                                                                                                                         | 30 days                              |
| Storybook artifacts        | Actions artifacts from `storybooks.yml`                | 7 to 16 MB each                                                                                                                                                                                                               | 7 days on pull requests, 1 on master |

**Growth.** The earlier growth test changed small regions and let git's deltas recover half, which
is not how these baselines change: a canvas re-render or a Chromium bump changes whole frames, and
deltas help little. The estimate is therefore (full re-baselines a year x the full size of all five
projects) plus feature accepts: about 4 to 6 re-baselines x 22 to 26 MB, plus 20 to 50 MB of
feature work, or **about 110 to 210 MB in the first year**, before a second browser multiplies it.
In plain git that would reach a 300 MB trigger within one to two years and then need a history
rewrite; that is why the baselines are in Git LFS from the start (below). Churn is kept down by
bumping `playwright-core` quarterly, not with every lockfile change. The weekly run measures a
real full-frame re-capture's size and replaces this estimate.

**Git LFS from the start (the owner's decision, 2026-09-27, before any baseline was committed).**
In plain git every baseline version stays in history forever: every clone and every
`fetch-depth: 0` CI checkout (most of ci.yml's) would carry the 110 to 210 MB estimated above for
year one alone, before more browsers multiply it. Moving later means `git lfs migrate import`,
which rewrites every commit since the first baseline: every open branch and worktree must be
rebuilt, and commit hashes that records, reject comments and milestone 3's recorded root commit
name stop existing. With LFS, git holds a 130-byte pointer per image, and only a job that needs
the images downloads them, only for the current tree. The earlier objections are answered in the
tooling: git-lfs is now installed on the development server; a missed `git lfs pull` stops capture
with "baseline is an LFS pointer; run git lfs pull" instead of looking like "every image changed";
`serve` refuses to start without git-lfs, so an accept cannot commit raw PNGs.

**Who fetches what.** `actions/checkout` fetches no LFS objects unless asked (it sets
`GIT_LFS_SKIP_SMUDGE` when `lfs` is false), so every job sees pointer files. Only the `visual` job
fetches images: `git lfs pull --include "visual-baselines/<project>/**"`, for its own project. It
first restores `.git/lfs/objects` from the Actions cache, keyed by the hash of that project's
pointer files (in effect the list of object ids), falling back to the newest cache for the
project, so a run downloads from LFS only images accepted since that cache was saved. The gate's
record check reads the image hash from each pointer and downloads nothing. The review page
downloads nothing from LFS either: the baselines a capture was compared with travel in the
capture artifact.

**LFS storage and bandwidth, against the Team plan's 250 GiB of each a month.** GitHub's current
documentation gives the Team plan, which this organisation is on, 250 GiB of LFS storage and 250
GiB of bandwidth a month (Free and Pro get 10 GiB); Actions downloads count against bandwidth. The
organisation's $0 LFS budget blocks LFS for the rest of the month rather than billing, so the
failure mode is blocked downloads, never a bill.

| Item                         | Estimate                                                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storage                      | Every version ever pushed: about 16 MB at seed (24 MB for all five projects), 110 to 210 MB after year one. Under 0.1 % of 250 GiB                                                                                                                                       |
| Bandwidth, CI, cache working | The images accepted in a month (about 10 to 20 MB) downloaded by the few runs that start before a cache holding them is saved, plus a full project download (7 to 9 MB) whenever a cache is evicted. About 1 to 5 GiB a month                                            |
| Bandwidth, CI, no cache hit  | The worst case: every `visual` job downloads its whole project. About 4,500 runs a month (about 50 merges and 100 pull request pushes a day) x 16 MB = about 70 GiB a month, about 100 GiB with all five projects. Still under 250 GiB; a second browser would double it |
| Bandwidth, people            | A fresh clone or `git lfs pull` of the current baselines is 16 to 24 MB; the development server's worktrees share one LFS object store, so each image is downloaded there once                                                                                           |

The weekly run planned in section 11 is to report the month's LFS bandwidth from the organisation's billing
usage and opens an issue above 100 GiB, well before the block at 250 GiB.

**GitHub's own image diff.** Whether the pull request Files tab renders an LFS image side by side
has not been checked; the review page, which shows baseline and capture from the artifact, is the
image diff the review relies on.

## 8. Accept, reject, and approval integrity

### The threat

Two kinds of attacker.

**Agents on the development server**, running as the owner. They hold the owner's `gh` OAuth token
(scopes `repo`, `workflow`, `gist`, `read:org`; an administrator of the repository and the
organisation, also used as git's https credential), the owner's software commit-signing key, the
server's filesystem (including every page it serves), a browser with virtual WebAuthn
authenticators, and possibly the owner's desktop through Claude in Chrome or computer use, which
can drive a browser signed in to GitHub and type into a terminal.

**Anyone who opens a pull request, forks included.** Their code runs in ci.yml's and
storybooks.yml's jobs (package scripts, install hooks, the Storybook build), their Storybook
JavaScript runs wherever it is opened, their files are in CI artifacts, and their text reaches the
review screens.

So a GitHub API call, a signed commit, a comment, a label, a dispatch, a status, a ruleset edit, a
merge through the admin bypass, a page served from the development server, anything a pull request
job produced, or text in a pull request can come from an attacker. None of those can be the proof
of approval.

### The root of trust

1. **A FIDO2 security key in the owner's hands, and a backup.** Every signature needs a physical
   touch, which no software can supply, and the PIN. Platform passkeys (Touch ID, Windows Hello)
   are not trusted: their verification can come from a typed PIN or password.
2. **A root key created on the owner's own computer**, in their own terminal:
   `ssh-keygen -t ed25519-sk -O verify-required -O write-attestation=<file>`. It needs OpenSSH 8.9
   or later with security-key support (on macOS, Homebrew's `openssh`; Apple's build omits it).
   The public key and attestation go into `trusted-keys.json`. The audit re-verifies every key's
   attestation against the vendored FIDO metadata roots, so only hardware keys can be trusted.
   Adding or removing a key is a record signed by a key trusted before the change.
3. **Two values recorded outside the repository**, on paper or a phone: the root commit (below)
   and the fingerprint of each trusted key, compared with github.com's rendering of
   `trusted-keys.json`.
4. **The tool code, read by the owner.** `trusted/` at the root commit, and every change to it
   signed since, is small plain source the owner has read (section 5's line budget).
5. **The signature format.** `ssh-keygen -Y sign -n visual-review` over the canonical record.
   Verification generates an `allowed_signers` file from `trusted-keys.json` with
   `verify-required` on every line, so a signature made with a touch but without the PIN is
   rejected; a test vector proves it. WebAuthn signatures from a browser page are not accepted: a
   page served from an agent-writable machine can show one image and ask for a touch over another.

**Protected paths:** `.github/**`, `visual-review/trusted/**`, `visual-review/projects.json`,
`visual-review/trusted-keys.json` and `visual-review/fido-metadata/**`. A change to any of them
needs a signed record, like a baseline. The verifier and the audit also fail when any workflow
other than `visual.yml` and `visual-audit.yml` grants `statuses: write`, `checks: write` or
`write-all`, or when any job other than release.yml's push job names the `release` environment.
Tool changes and image changes go in separate pull requests; the verifier fails a pull request
that has both, so an image review never includes a tool diff.

### The record

```json
{
    "version": 1,
    "pr": 123,
    "subject": {
        "builtMerge": "<sha>",
        "base": "<sha>",
        "head": "<sha>",
        "mergedTree": "<sha>",
        "baseTip": "<sha>",
        "runId": 987654,
        "environment": {
            "chromium": "...",
            "renderer": "...",
            "gpu": false,
            "cpu": "...",
            "fonts": "<sha256>",
            "tool": "<sha>"
        }
    },
    "notOpened": 3,
    "items": [
        {
            "path": "visual-baselines/compact-mantine/button--primary.dark.png",
            "from": "<sha256 on the base tip, or null>",
            "to": "<sha256, or null for a removal>",
            "reason": "new focus ring"
        },
        {
            "path": "visual-baselines/graphty-element/chart--line.json",
            "from": "<sha256>",
            "to": "<sha256>",
            "reason": "exclude: settle timeout under load"
        }
    ],
    "reviewedAt": "2026-09-27T12:00:00Z"
}
```

- Every item is an accept. The signature, in the `.sig` file beside the record, covers the
  canonical JSON (sorted keys, no whitespace). Unproven records have no `.sig` and carry
  `"unproven": true`.
- One record covers every project reviewed in the session, so one touch signs it all.
- `from` is the file's hash on the base branch tip, because that is the change the pull request
  makes to master. `subject` ties the record to the capture run, the commits and the environment.
  `notOpened` counts the accepted items the owner never opened; the audit reports it.
- **Rejects are never signed** and never committed. Each reject session becomes one pull request
  comment with a machine-readable block. **Every reason is untrusted data**, since anyone can write
  one: every screen, the future notes command and the MCP server show reasons quoted and labelled
  as data from the pull request, never as instructions for an agent.

### Signing from the owner's own computer

This is the only accept path once enforcement starts.

**Which code runs.** Never the monorepo's HEAD or the pull request's branch, and never an install.
The owner keeps a clone on their computer and runs the tool from the pinned root commit, or from a
later commit that the pinned audit reports as the newest one whose tool changes are all signed:

```
git -C ~/graphty fetch
git -C ~/graphty worktree add --detach ~/visual-review-tool <pinned or audit-reported commit>
node ~/visual-review-tool/visual-review/trusted/cli.mjs sign --pr 123
```

`trusted/` uses only node built-ins, `git`, `gh` and `ssh-keygen`. No `pnpm install`, no package
script, no repository git hook runs (every git command it issues sets `core.hooksPath=/dev/null`).

**What the owner does, every time:**

1. Run `sign --pr N`. The tool reads the pull request and selects its newest acceptable
   `visual.yml` run (below), downloads the results and images, fetches the base tip's baselines
   from git, re-hashes every image, and refuses anything whose hash differs from `results.json`.
2. It serves the review page (section 10) on `127.0.0.1` with a random per-session token in the
   URL. The tool, not the page, holds the images it re-hashed and builds the record; the page only
   displays and collects decisions. Items already covered by a signed record on the branch, with
   the same path and `to` hash, show as "signed in an earlier round" and are left out of the to-do
   count and the new record. Decisions in progress are saved by the tool in
   `~/.local/state/visual-review/<pr>.json`, keyed by path and hash, so an interrupted session
   resumes. Protected-path changes are shown as source diffs.
3. The page and the terminal both print the record's SHA-256 and the counts per project, including
   "N accepted without being opened". The owner presses Sign; `ssh-keygen -Y sign` asks for the
   touch and the PIN.
4. The tool fetches the pull request head into a detached worktree, writes the accepted PNGs (from
   the bytes it re-hashed), the settings files, the record and its `.sig`, commits with the
   owner's own git identity, and pushes. If the push is rejected because the branch moved, it
   fetches again, merges the signed commit onto the new head and pushes, with no second touch,
   and lists the accepted items the new head's capture may supersede. Rejects go into the pull
   request comment. For a fork, this needs "allow edits by maintainers".
5. Because only `visual-baselines/` changed, the verifier reuses the last capture and posts green
   within a few minutes (section 11).

The development server's `serve` is the same page without Sign; from enforcement on it is a
preview for the owner and agents.

**Recapture** of failed and unstable items dispatches `visual.yml` for those story ids. After
enforcement it runs only from `sign`, with the owner's own `gh` session, because the agent token
has no Actions write.

**Rebases.** A signature does not depend on the branch's history, so updating from master by merge
or rebase keeps it valid as long as the hashes match. If a rebase drops the accept commit, the pull
request screen says "signed record missing from the branch" and `sign --reapply --pr N` (or the
development server) commits the same signed files again, with no new touch. `CLAUDE.md` tells
agents to update a branch by merge, not rebase, after an accept.

**Baseline conflicts.** Two open pull requests often change the same compact-mantine images. PNGs
cannot be merged, so `CLAUDE.md` gains the rule: on any conflict under `visual-baselines/`, take
master's side for every file, push, and let CI recapture; the owner then reviews only items whose
new capture differs from master. The review page shows "base changed under a signed item: re-sign
needed" with the count, since a signed item's `from` no longer matches the base tip.

### Which runs count

A `visual.yml` run is accepted, in `verify`, in `sign`'s run selection and in the baselines-only
reuse path, only when its workflow `path` is `.github/workflows/visual.yml`, its `head_branch` is
master, and its event is `workflow_run`, or `workflow_dispatch` on master. A dispatch of a modified
`visual.yml` from an agent branch is therefore ignored. Each rule has a test vector.

### The verifier

`visual-review verify` is `trusted/`, run by `visual.yml` from master's copy with `node` alone.
For each pull request run:

- It reads only the results the same `visual.yml` run's capture jobs uploaded, by the artifact IDs
  those jobs output. Nothing from an artifact is executed; `results.json` is parsed against the
  schema. Pull request files are read with `git show <sha>:<path>`.
- Every file that differs between the base and the head under `visual-baselines/` (except
  `reviews/`) or a protected path must be covered by the newest accept item for that path, taken
  from records added in this pull request, where `to` equals the file's hash at head (null for a
  deletion), `from` equals its hash on the current base tip, the record's `pr` is this pull
  request, and the `.sig` verifies under `trusted-keys.json` as it is on master. For images and
  settings, the `to` hash must also be in one of two places: the record's own `subject.runId`,
  whose `visual-results-<project>` artifact is kept 90 days; or the current run, where the item is
  `unchanged` against `to` under the story's threshold. The current run is the stronger evidence,
  so a signed pull request brought up to date weeks later needs no new signature.
- Every project that master's plan rules (section 12) select must have a result; a missing
  Storybook artifact is `failed`.

"Visual review" is **success** only when the verifier passes and every planned project's current
results hold nothing but `unchanged` and `flaky` items against the merged tree's baselines. A
recapture is an overlay: its results are the amended run's results with only the recaptured ids
replaced, merged by master's code, so one run always holds every current hash. The verify job has
`contents: read`, `actions: read`, `statuses: write`, `pull-requests: write` and nothing else. It
maintains one pull request comment with counts and each record's hash; the comment is a
convenience. Tests cover a two-round pull request, a rebase after signing, a signature made
without the PIN, a signed run whose artifacts have expired, a fork, and each rule of "Which runs
count".

### The audit

`visual-review audit --root <commit>` from the pinned `trusted/`:

1. Fails when the root commit is not an ancestor of master's head.
2. At the root, every file under `visual-baselines/` and every protected file must equal the `to`
   of an item in a signed record present at the root. The root is therefore the merge of the
   **seed manifest**: one record, signed on the owner's computer, listing every baseline and
   protected file's hash. Before signing it, the owner reads `trusted/` at that commit in full.
3. Walks master's first-parent chain from the root. For each step, every changed baseline or
   protected file must be covered by a record added in that same step, with `from` equal to the
   hash on the first parent, `to` equal to the hash in the step, and `pr` naming a pull request
   GitHub reports as merged into that step. A direct push has no such pull request and is
   reported. Release commits are direct pushes that touch neither, by the release push job's own
   check (below), so they pass.
4. Prints each record's hash, item count and `notOpened`, every uncovered change, and the newest
   commit whose tool changes are all covered (the commit the owner may run `sign` from next).

- **The independent audit** is the owner's: on their own computer, from the pinned `trusted/`.
- **The CI audit** is `visual-audit.yml` on every master push. It is a protected path and
  `release.yml` waits for it, so an unsigned change blocks releases. It is a convenience: an agent
  with today's token can rewrite master.

### The release job and the deploy key

Today release.yml checks out master with `RELEASE_DEPLOY_KEY`, then runs `pnpm install`, the Nx
cache and `nx release` in the same job, so unsigned repository code (package scripts, nx.json,
`tools/`, the lockfile) runs with the key that may push to master. It is split:

- The existing job versions, tags and builds **without the key**, and uploads the result as a git
  bundle artifact.
- A new push job in release.yml runs no install and no repository script, and checks out nothing
  from the tree. It verifies the bundle is a fast-forward of master whose diff touches only
  `package.json` version fields, `CHANGELOG.md` files and `pnpm-lock.yaml`, and nothing under
  `visual-baselines/` or a protected path. Only then does it load the key, which is a secret of a
  `release` environment that only this job names, and push the commits and tags.

### What is guaranteed, and under which assumptions

**Assumptions:** the owner's security keys never leave their hands; the owner recorded the root
commit and fingerprints outside the repository; the tool code at the root commit, and every tool
change signed since, was read by the owner and is honest; and while the owner signs or audits,
their computer has no agent with a shell, no computer use and no Claude in Chrome session.

**Before signing starts (today):** nothing is guaranteed against an agent. Accepts are "unproven".
A pull request can also loosen its own check without a review item by raising a story's
`diffThreshold` or `delay` in its parameters, or by editing the gate in `ci.yml` (section 1a);
only code review and the CLAUDE.md rules stand in the way until milestone 3.
The seed manifest replaces them all with one signed record at enforcement.

**Guaranteed, as detection, from the root, for an owner who runs the pinned audit:** every file under
`visual-baselines/` and every protected path on master either equals a hash the owner signed in the
pinned tool, which showed it and counted the items not opened, or is reported. Deleting workflow
runs, editing rulesets or rewriting history cannot hide that from the pinned code. A signature
proves each item was offered for review, not that the owner looked at it; `notOpened` says how
many were not.

**Guaranteed, as prevention, only after the owner settings below, and only while no agent drives a
browser session signed in to GitHub as the owner:** no pull request that changes a baseline, a
story setting or a protected file goes green without such a signature, and nothing reaches master
without a green check except the release push job's version commits, which cannot touch either.

**Not guaranteed:**

- **That the capture shows what users see.** The Storybook is built by pull request code, which can
  detect the capture and render the old picture. Such a change reaches master unreviewed. The
  master drift capture catches it after the merge and blocks releases until a signed re-baseline
  lands. Code review is the only earlier defence.
- **That two separately green pull requests look right together.** Branches are not required to
  be up to date (section 11), so two pull requests that each passed against an older master can
  combine into a change nobody reviewed. The drift capture detects it after the merge.
- **That master's capture code and dependencies are honest.** The capture job runs master's
  `capture/` and Playwright, which merged pull requests can change without a signature. The
  owner's audit covers what was committed, not how it was captured.

**Owner settings that turn detection into prevention** (each reversible):

1. Agents get a fine-grained token with only Contents read and write, Pull requests read and
   write, Issues read and write and Metadata read on this repository: no Workflows and no Actions
   write, and no organisation permissions. Revoke the existing OAuth token on the development
   server and point git's credential helper at the new token. **This is what stops status
   spoofing:** a ruleset pins "Visual review" to the GitHub Actions app, which accepts it from any
   workflow whose token may write statuses, so an agent able to push a workflow could post its own
   green. The cost: agents cannot push any change under `.github/workflows/`, including ordinary
   CI work, the enforcement step's ci.yml edits and upkeep pull requests, and cannot bring a
   branch up to date by pushing a merge that brings in a master workflow change. The owner pushes
   workflow edits from their own computer and updates such branches with GitHub's "Update branch"
   button. Whether the update-branch API (`PUT /pulls/N/update-branch`) works with the
   fine-grained token in that case is tested on a scratch pull request and recorded here.
2. Keep the owner's GitHub session out of any browser an agent drives: Claude in Chrome off, or
   GitHub signed in only in a browser profile agents do not use.
3. `RELEASE_DEPLOY_KEY` becomes a secret of the `release` environment, restricted to master and
   named only by release.yml's push job (the verifier and audit enforce the "only").
4. Remove the admin bypass from "Protect master", keeping only the release deploy key; require
   "Visual review".

## 9. History, git hashes and dirty state

- **Who accepted this image, and when:** `git log` on the PNG gives the commit; the record with the
  matching `to` hash gives the reason, the pull request, the captured commits, the run, the
  environment and the time. Records are files, so they survive squash merges and deleted branches.
  `visual-results-<project>` names the producing run for 90 days.
- **Every review round:** each accept session is a record; each reject session is a pull request
  comment with a machine-readable block, read back with `gh` and shown as untrusted data.
- **Dirty state is answered by a rule.** Only a CI capture of a pushed commit can be accepted.
  Local captures record `git describe --always --dirty` and a SHA-256 of `git diff HEAD --binary`
  plus untracked files, and the page labels them "local preview, not acceptable".
- **In the UI:** a per-story history panel (within days) lists the records and reject comments
  naming the story's files, with a link to each past image by hash. "Previously rejected:
  <reason>" appears when a capture's hash equals one rejected before. A full history page is P2.

## 10. The review UI

One page in plain HTML and JavaScript (`trusted/page/`), served by `serve` on the development
server and by `sign` on the owner's computer. It is plain because the signing page is a security
boundary the owner must be able to read (section 18).

**Screens**

1. **Pull requests.** Pull requests awaiting review first, with counts; then the rest, and "master"
   for seeding.
2. **Pull request.** Its title and link, the commits since the last reviewed head, and one row per
   project: a progress count ("12 / 40 reviewed"), counts by status against master, and badges for
   "unstable", "capture failed", "flaky", "signed in an earlier round", "signed record missing
   from the branch", "base changed under a signed item: re-sign needed" and "capture expired,
   re-run CI". **Recapture failed and unstable items** dispatches an overlay run (section 8); when
   the Storybook artifact has expired it re-runs `storybooks.yml` instead.
3. **Project.** Items grouped by story id, with the modes of each story together; a list or a
   thumbnail grid, filtered by status. The grid is the seed view. **Accept all in this project**
   accepts every acceptable item.
4. **Story.**
    - The modes as tabs, or a grid of baseline and new per mode. Accept and Reject act on the
      whole story, with a per-mode override. Unstable and failed items offer **Exclude with
      reason** instead of Accept.
    - Two comparisons when they differ: **vs master** (the default, what the signature covers) and
      **vs last accepted on this pull request**.
    - Side by side; **flash** at about 1.5 Hz, adjustable, plus hold-to-toggle; **pixel
      highlight** over a dimmed baseline, a box around each cluster; a "size changed WxH -> WxH"
      badge with padded images.
    - **Zoom** with `image-rendering: pixelated`, jumping to each box.
    - **Live Storybook links** with the mode and `&chromatic=true` in the URL, which Storybook
      passes to the preview iframe, so the live story renders as captured; a "live behaviour"
      toggle removes it. One link is the pull request's Storybook, served by the development
      server's content server on another origin (never from the signing page's origin); the other
      is `https://graphty.app/storybook/<path>/?path=/story/<id>`, labelled "current master (may be
      newer than this comparison)". A link to the pull request's Files tab for this image.
5. **Sign.** Counts per project, "N accepted without being opened", the rejects, and the record
   hash. Only in `sign`, and in `serve` before enforcement as "Save unproven accept".

**Decisions** are derived from git (signed records on the branch) plus the tool's state file
(section 8, step 2), never from browser storage.

**Keyboard:** J and K next and previous, A accept, R reject, E exclude, U undo, F flash, H
highlight, S spotlight, Z next zoom (real size, 2x, 4x, 8x), N next changed box, Space (hold)
flash, Shift+A accept the project, Escape back to the grid.

**Where it runs**

- **Development server, from day one:** `visual-review serve`, started through servherd with
  `PORT={{port}}`; the owner opens the servherd host name in their own browser. It lists pull
  requests with `gh`, downloads artifacts, checks images against `results.json`, and serves pull
  request Storybooks from a second servherd server (another origin). Before enforcement its accept
  commits the PNGs (as LFS pointers, after `git lfs push` uploads the images) and an unproven
  record in its own worktree (signed, pushed with `--no-verify`);
  after, it is a preview.
- **The owner's computer, from enforcement:** `sign` (section 8).

## 11. CI and the pull request check

| Workflow              | Trigger                                                                      | Code that runs                                   | Does                                                                                                                                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`              | pull request, push to master, dispatch                                       | the pull request's                               | Unchanged, except: `persist-credentials: false` on every checkout; `filter: blob:none` where only trees are read; a push whose diff from its previous head touches only `visual-baselines/` plans no build or test job, and "All Checks Pass" passes only if the previous head's CI run succeeded |
| `storybooks.yml`      | pull request, push to master                                                 | the pull request's; `contents: read`, no secrets | Builds the five Storybooks and uploads them (7 days on pull requests, 1 on master) with `build.json`: `github.sha` and its two parents. A baselines-only push builds nothing and uploads only `build.json`                                                                                        |
| `visual.yml`          | `workflow_run` of `storybooks.yml` (pull requests)                           | master's                                         | Resolve, plan, capture (`actions: read`, no secrets; graphty-element as two shards), verify; post "Visual review"; update one comment. A baselines-only push with the same built base reuses the last capture                                                                                     |
| `visual.yml` dispatch | `workflow_dispatch` on master (pull request number and story ids, or master) | master's                                         | Recapture overlay; capture master for a seed                                                                                                                                                                                                                                                      |
| `visual.yml` weekly   | schedule                                                                     | master's                                         | Capture all five projects on master with the drift rule; flake counts, baseline size and clone time into one issue                                                                                                                                                                                |
| `visual-audit.yml`    | `workflow_run` of `storybooks.yml` on master                                 | master's (protected)                             | Audits and captures `github.event.workflow_run.head_sha` explicitly, with that sha in its `run-name`. Audit of the pushed range; drift capture of only the projects master's plan rules select for that range                                                                                     |

- **Resolving the pull request.** `workflow_run` payloads have no pull request for forks, and
  `github.head_ref` is empty. `visual.yml` asks `gh api repos/{o}/{r}/pulls?head=<owner>:<branch>&state=open`
  from `head_repository` and `head_branch`, and requires the pull request's `head.sha` to equal
  the run's `head_sha`. Concurrency is keyed on `head_repository.full_name` plus `head_branch`,
  with `cancel-in-progress` for pull request runs only; master runs are never cancelled.
- **Capture target.** `refs/pull/N/merge` moves whenever master moves, so it is never re-read.
  `build.json` claims the merge commit the Storybook was built from and its parents. `visual.yml`
  treats it as untrusted: the second parent must equal `head_sha` and the first must be on the
  base branch's first-parent history. It then computes the merged tree itself with `git merge-tree
--write-tree <first parent> <head>` and compares against that tree's baselines. A conflict, or a
  claim that fails the checks, is the environment error "stale build, re-run", never diffs.
- **Drift.** An item counts as drift only when it differs from the baseline above its threshold,
  is captured again in a fresh context, and both captures agree. An item unstable on master goes
  into the weekly issue with its story id and does not block releases. Drift fails
  `visual-audit.yml`, which blocks releases until a signed re-baseline lands; CI, the graphty.app
  deploy and coverage are unaffected.
- **Release wiring.** release.yml adds "Visual audit" to `on.workflow_run.workflows` and
  `visual-audit.yml` to its `for wf in` loop, finding the audit run for a sha by its `run-name`.
  Without the trigger entry the gate would find the audit pending, end without releasing, and never
  run again. The chain `storybooks.yml` -> `visual-audit.yml` -> `release.yml` uses GitHub's
  three `workflow_run` levels, so nothing may chain after release.yml.
- **No "require branches to be up to date".** The setting is ruleset-wide. Master took 52 merges
  on 2026-09-26 and 46 on 2026-09-27 with 13 pull requests open, and a CI run takes 17 to 38
  minutes. Strict mode would serialise merges at one per CI-plus-capture cycle, at most about 30 a
  day, and rerun 21 shards for each stale pull request. The stale-green race is left to detection
  (section 8). A narrower guard, within days: when a master push changes
  `visual-baselines/<project>/`, `visual-audit.yml` sets "Visual review" to pending ("base
  baselines changed, re-run") on open pull requests whose last plan included that project.
- **Required status.** Advisory until enforcement; then "Visual review" is required.
- **Time.** Measured on the development server while other agents kept its load average near
  40: graphty-element (171 items, 4 workers) took 551 s with no baselines, where every item is
  captured twice, and 346 s against baselines; an earlier run took 8 min 38 s. compact-mantine
  (828 items, 8 workers) took 133 s with no baselines and 81 s against them. In one graphty-element
  run a single story (`layout-gpu--spring-fake`) hit Playwright's 30 s screenshot timeout on its
  second capture and captured normally on the next run; a failed capture is now retried once
  before it is reported. The CI job's 30-minute timeout has room for these times; a 4-vCPU runner
  is not yet measured, and graphty-element splits into two shards if it passes about 20 minutes. Because `visual.yml` follows
  `storybooks.yml` instead of the whole test suite, push to reviewable is expected at about 10 to
  15 minutes (install and build, then capture), against 30 or more if it waited for CI; it is
  measured on the tooling pull request and recorded here. ci.yml notes an organisation limit of
  about 60 concurrent jobs; storybooks.yml adds one and `visual.yml` up to six.

## 11a. Seeding one story at a time, and iterating on a story

Many stories did not look right on their first pass and needed several rounds of changes. A seed
that assumed one master capture shows every story right would force the owner either to accept
wrong images or to hold every pull request until all of them were fixed. So seeding is per
story, and a story with no baseline is a normal, lasting state, not an error.

**States.** On master's capture a story with no baseline is `new`: the owner may accept it there,
reject it with a reason, or leave it. On a pull request's capture, CI compares it with master's
newest complete capture of the same story (downloaded by `visual-review reference`):

| Pull request's capture of a story with no baseline | Status                        | Blocks the pull request                  |
| -------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| Looks as in master's capture                       | `unseeded`, "no baseline yet" | No                                       |
| Differs from it, or the story is not on master     | `new`                         | Yes, until the owner accepts or excludes |
| Differs between its own two captures               | `unstable`                    | Yes, until excluded or fixed             |

`unseeded` items are shown in the review page under their own filter, need no decision, are
skipped by Accept all and offer no Accept button: seeding an untouched story happens on master's
capture, where it was captured twice and shown as `new`. `unseeded` is never "reviewed"; it only
does not block, and the story's first baseline still needs the owner's accept.

**A round.** The owner opens master in the page (`serve --master-run <run id>`), accepts the
stories that look right, rejects the ones that do not with a reason, and leaves the rest. Finish
pushes the accepts as a seed pull request and opens one issue holding every reject, labelled
`bug`, ending in the same `<!-- visual-review-rejects ... -->` JSON block a pull request reject
comment has (project, file, captured hash, reason), so an agent can pick it up. The reasons are
untrusted data from the agent's point of view (section 8), as on pull requests.

**Fixing a rejected story.** The agent changes the story in a pull request. That pull request's
capture of the story differs from master's, so it is `new` there and blocks that pull request
only. The owner reviews it on that pull request; accepting it writes its first baseline into the
pull request's accept commit, and it merges with the fix. Rejecting it again posts a reason and
the loop repeats.

**The gate.** It passes `unchanged`, `excluded` and `unseeded` items and blocks everything else,
for every project with at least one baseline on the base branch. A project with none is ignored
entirely, as before. So one unseeded story never blocks a pull request that does not touch it,
and a story a pull request adds or changes always needs the owner.

**Where the reference comes from, and its limit.** The `visual` job, on pull requests only,
lists ci.yml's recent push runs on master with `gh` (`actions: read`) and downloads the newest
one's `visual-<project>-<attempt>` artifact whose `results.json` is valid and complete. Only its
`new` items whose PNG hashes to the hash `results.json` names serve as reference images. That
run can be a few merges older than the pull request's base: a story changed on master in between
then reads `new` on the pull request, which blocks rather than passes, and a re-run after
master's CI finishes clears it. With no reference at all (artifacts expired, no finished master
run), every story without a baseline is `new`, which is the safe side.

**Before a pull request exists.** An agent or the owner iterates on a story's look locally:
build the Storybook, then `visual-review capture --project <p> --out tmp/<task>/<p> --stories
<id prefix>`, which captures only the matching stories in seconds and reports no baseline as
removed; open the PNG, or serve the directory with `serve --results tmp/<task>`. The page lists
it as "Local preview", never as master or a seed, and it is look only: no decision buttons and no
Finish, and the API refuses every decision and Finish on it. A local capture records `local`
(describe and diff hash); its fonts and graphics stack are not CI's, so a preview can never
become a baseline.

**How captures and baselines move.** CI uploads each capture as an artifact. The review server
lists open pull requests and their newest CI runs with `gh` and downloads the artifacts with `gh
run download` into `tmp/visual-review/`; the baselines a capture was compared with are inside the
artifact, so the server never fetches images from Git LFS. Finish commits the accepted PNGs as LFS
pointers and a record in a throwaway worktree at the captured head, uploads the images with `git
lfs push`, and pushes to the pull request's branch. CI then captures again on the new head and
compares with the baselines that branch now holds: accepted items read `unchanged`, rejected ones
still differ, and only what is undecided or changed since is left. Nothing restarts from scratch,
and decisions not yet finished are kept for every image whose hash did not change.

## 12. Multiple projects and affected-only runs

`visual-review/projects.json` is the registry. Each entry names the project id, the package
directory, the Storybook artifact name (`build-storybook-element` and `build-storybook-app` for
graphty-element and graphty, `build-storybook-<project>` for the others), the modes and their
Storybook global, viewport or full-height capture, the worker and shard count, the graphty.app
Storybook path (`app` for the graphty app), and `inputs`: the path globs whose change can alter
its rendering. Adding a Storybook is one entry plus a seed.

| Project            | Modes       | Capture                    | When                                    |
| ------------------ | ----------- | -------------------------- | --------------------------------------- |
| compact-mantine    | light, dark | full height, once measured | today                                   |
| graphty-element    | default     | viewport                   | once the harness branch merges          |
| algorithms, layout | default     | viewport                   | within days                             |
| graphty            | light, dark | full height, once measured | after its `colorScheme` and eruda fixes |

A project that was not captured keeps its baselines untouched; a partial run never deletes a
baseline, and a removed story is a review item, never a silent delete.

**The visual plan** is computed by master's code in `visual.yml` from `git diff --name-only

<base> <head>`, never from the pull request's `nx.json`, `.nxignore` or `tools/ci-test-matrix.mjs`.
A project is planned when:

- a changed path matches its `inputs`; or
- `visual-baselines/<project>/` changed; or
- a changed path matches no project's `inputs` and is not in the short ignore list (`design/**`,
  `*.md` outside story directories), so an unknown change plans everything; or
- `visual-review/capture/**`, `visual-review/projects.json` or `visual-review/fonts/**` changed,
  or the `playwright-core` version resolved for `visual-review` in `pnpm-lock.yaml` differs
  between base and head. Then every project is planned, so a renderer change is reviewed before it
  merges. Changes to `trusted/` (the reviewer, not the capture) do not plan everything.

Until the `inputs` test lands (within days), every project is planned on every pull request,
which is safe. The test derives each project's Nx dependency closure on master and fails when its
`inputs` miss a directory.

Per-story selection (Chromatic's TurboSnap) is not worth building: both large Storybooks import
their package's source, so almost any change touches every story, and hashing makes an unchanged
story almost free.

## 13. The pre-push hook

**Built: the Git LFS upload.** `.husky/pre-push` first runs `tools/lfs-pre-push.sh`, which hands
git's ref lines to `git lfs pre-push`, so the images a push points at reach GitHub before the
commits do. `git lfs install` cannot add that hook itself, because the repository's hooks path is
husky's. Without git-lfs the script lets a push through only when no commit it sends touches an
LFS-tracked path, and otherwise fails with the install steps. git-lfs's post-checkout, post-commit
and post-merge hooks only serve LFS file locking, which is not used, so they are not called.

Planned: two steps in `tools/prepush.sh`:

1. **"Visual baselines are signed" (blocking, seconds, no browser).** `node
visual-review/trusted/cli.mjs verify --local` over `merge-base..HEAD`, run whenever that diff
   touches `visual-baselines/` or a protected path. It sits before the gate's "No package is
   affected" early exit, because a baselines-only push affects no Nx project. It catches an agent
   that copies PNGs into `visual-baselines/` by hand; it is a convenience, because `--no-verify`
   exists. Baseline PNGs are LFS pointers in git, so it reads each image's hash from the pointer's
   `oid sha256:` line (the gate's `contentHash`), which equals the hash a record names; it never
   needs the images.
2. **"Visual capture" (warning, opt-in with `PREPUSH_VISUAL=1`).** It builds the Storybook
   (Nx-cached, but minutes on a miss) and captures. It is only meaningful if local captures match
   CI (section 6), and becomes on by default only if a typical run stays under about a minute.

## 14. Migration from Chromatic

1. **Today, the owner:** switch the graphty-org Chromatic account to the Free plan, confirm in
   Chromatic's billing settings or with their support that the Free plan stops at its 5,000
   snapshots rather than billing, and record where that was confirmed. Remove the payment method,
   which caps spend whatever the plan does. Chromatic already runs only on pull requests labelled
   `chromatic`. Finish or abandon the open Chromatic reviews on #364, #365, #409, #463, #490 and
   #511.
2. **Seed** from master's capture, one story at a time (section 11a): the owner accepts the
   stories that look right, rejects the ones that do not with a reason, excludes unstable ones,
   and leaves the rest for a later round; none of it has to be done in one pass.
3. **Spot-check, best effort.** For a doubtful seed image, `tools/chromatic-capture.mjs` fetches
   Chromatic's last accepted image to flash against the new capture. Chromatic rendered with its
   own browser and fonts, so this can find a regression but cannot prove a seed image right.
4. **Blocked pull requests** are updated from master; the owner reviews only their own differences.
5. **Retire Chromatic** after "Visual review" is required and two weeks pass without surprises:
   remove the `chromatic-*` jobs and their "All Checks Pass" entries, the label,
   `tools/chromatic.sh` and `tools/chromatic-api.sh`, the addon and the dependency; replace
   `isChromatic()` with a neutral helper reading a `visual=1` URL flag and switch the capture in the
   same pull request; delete the tokens last.
6. **Rollback.** Until retirement, the `chromatic` label runs Chromatic on the Free plan. After it,
   revert the removal commit.

## 15. Roadmap and plan

### Today: approving again, unproven

What was built for milestone 1 differs from the steps below (a job in `ci.yml` instead of two new
workflows, no pinned fonts or `.nxignore` yet); section 1a and `plan.md` describe what exists.

**The owner (about 15 minutes):** Chromatic to the Free plan, confirm it stops, remove the payment
method; order a FIDO2 security key and a backup.

**The tooling pull request (agent), smallest usable thing first.** Each step is usable before the
next starts; if the day runs out, what is cut is step 4's extras, never steps 1 to 3.

1. **compact-mantine only: `capture`, `compare`, the pinned fonts and the frozen clock**, with the
   second capture and `results.json`, and the contention measurement rerun under the pinned fonts.
   Package wiring kept minimal: `pnpm-workspace.yaml` entry (a shared global: this pull request
   runs every test shard), `project.json` with test and lint, the `knip.config.ts` entry, a test
   shard in `tools/ci-test-matrix.mjs` at the usual coverage thresholds, `check:declared-tools` and
   `check:published-deps`, `"!visual-review"` in nx.json's release projects, and
   `visual-baselines/` in `.nxignore` and `.prettierignore`.
2. **`serve` with the review page:** pull request and project lists with progress, the thumbnail
   grid, side by side, flash, highlight, zoom, J/K/A/R/E, accept, reject with reason, Exclude with
   reason, accept all, and "N accepted without being opened". Accept writes an **unproven** record.
3. **`storybooks.yml` and `visual.yml`** with resolve, plan (every project until the `inputs` test
   lands), capture and an advisory comment. A `workflow_run` workflow runs only from master, so it
   is exercised locally against a Storybook artifact from this pull request's run, and for real
   after the merge.
4. Extras if time allows: the per-story settings proposals, the flaky status.

**The seed, compact-mantine (owner, about 20 to 30 minutes for a first round):** merge the
tooling pull request; an agent starts `visual-review serve --master-run <run id>` through
servherd; the owner reviews the grid, accepts what looks right, rejects what does not with a
reason, and excludes any flaky story with a reason. The server commits the baselines and unproven
record to a seed pull request, and files the rejects as one issue; merge the seed pull request
once its capture shows the accepted items `unchanged`. Stories left without a baseline block
nothing until a pull request changes them (section 11a). Then update each blocked pull request
from master and review its differences.

**graphty-element is seeded only after `test/storybook-harness-stability` merges** and its
contention measurement passes, the same day if possible (about 10 to 20 minutes of review).

### Within days

- algorithms and layout, each after its own contention measurement; graphty after its two fixes.
- The verifier and the "Visual review" status (advisory), with the run rules and fork resolution.
- The `inputs` test and the `font-family` grep test.
- Modes grouped per story, pull request context, two comparisons, the tool-side decision file,
  the per-story history panel and reject comments, the recapture overlay, live Storybook links.
- The pre-push verify step (blocking) and the opt-in capture step.
- The baselines-changed pending guard (section 11).

### This week: enforcement

1. `trusted/` complete: `verify`, `audit` and `sign`; ssh signature verification with
   `verify-required` and its test vectors; attestation checks against the vendored FIDO metadata;
   the workflow-permission and release-environment rules; the line-budget test.
2. The release split in release.yml (section 8), and release.yml's trigger and loop entries for
   "Visual audit". `visual-audit.yml` with the drift rule.
3. The owner creates the root key and the backup key on their own computer. A pull request adds
   them to `trusted-keys.json`.
4. **The seed manifest, a second full pass the owner should budget for (about 1 to 2 hours):** the
   owner first reads `trusted/` at that pull request's commit (under 2,500 lines), then runs `sign
--manifest` from it. The grid lists first the images whose hash differs from the unproven
   record that accepted them, labelled "changed since you accepted it (unproven)"; everything else
   follows for a quick skim. The unproven records only set the order. The owner signs one record
   covering every baseline and protected file. Once it merges, the owner records that merge commit
   as the root, and the key fingerprints, outside the repository.
5. `ci.yml`: `persist-credentials: false` on every checkout, `filter: blob:none` where only trees
   are read, the baselines-only fast path.
6. The four owner settings in section 8, then "Visual review" required. `CLAUDE.md` gains the
   merge-not-rebase rule after an accept and the baseline-conflict rule.

### Weeks two and three

- `visual-review diff`: compare any two built Storybooks.
- Decide the pre-push capture's default from the local-versus-CI measurement.
- Retire Chromatic.

### Later (P2)

- **Notes Claude can act on:** a note pinned to a story or region, stored as a pull request comment
  block and read by `visual-review notes --pr N`, labelled as untrusted data.
- **MCP server:** `list_reviews`, `get_changes`, `get_images` (as MCP image content), `get_notes`.
  Deliberately no accept tool.
- **A hosted read-only review site** on GitHub Pages, if reviewing away from both computers is ever
  needed. It needs a GitHub App credential to read the monorepo's artifacts.
- **Other browsers:** a browser field in the capture key; compact-mantine on WebKit first.
- **Speed and size:** grouping identical changes, region masks, a full history page, WebP when the
  size trigger fires.

### Upkeep

The quarterly `playwright-core` bump, a runner-label change, a font change or a capture-container
switch is one pull request that plans every project and re-baselines them together. An agent
prepares these; the owner pushes any workflow part and signs them. Tool changes come in their own
pull requests, which the owner reads in full before signing. Each time the owner advances the tool
commit they sign from, they take it from the pinned audit's output.

## 16. Cost per month

| Item                                                   | Cost                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions minutes on standard runners, public repository | $0                                                                                                                                                                                                                                                                                                                                                            |
| Records and settings files in plain git                | $0                                                                                                                                                                                                                                                                                                                                                            |
| Actions artifacts and cache                            | $0 expected, not confirmed. GitHub's billing page says Actions minutes are free for public repositories but states artifact storage quotas only for private ones. The organisation's $0 budget blocks rather than bills. Results are kept 90 days, images 30, Storybooks 7 on pull requests; check the organisation's storage in billing after the first week |
| Git LFS                                                | $0: about 0.2 GiB stored and 1 to 5 GiB (at worst about 100 GiB) downloaded a month, against the Team plan's 250 GiB of each; the $0 budget blocks rather than bills (section 7)                                                                                                                                                                              |
| Hosted review site                                     | not used                                                                                                                                                                                                                                                                                                                                                      |
| FIDO2 security key and backup                          | $0 a month; about $25 to $60 each, once                                                                                                                                                                                                                                                                                                                       |
| Chromatic until removal                                | $0 on the Free plan, once its stop-at-limit behaviour is confirmed and the payment method removed                                                                                                                                                                                                                                                             |
| **Total**                                              | **$0 a month**                                                                                                                                                                                                                                                                                                                                                |

The only way past $200 a month is to switch a paid Chromatic plan back on. If the self-hosted
review ever proves too thin, the fallback is Argos Pro with its spend pause switched on, about $100
a month at opt-in volume, fed by the same capture directory.

## 17. Risks

| Risk                                                                   | Mitigation                                                                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graphty-element captures before it settles                             | Capture waits on `waitForStableFrame()` and fails, never pictures, on a timeout; every project measured under contention before its seed                                  |
| A timeout or flaky story blocks a clean pull request                   | Second capture separates `flaky` (passes, counted) from `unstable`; recapture overlays; Exclude with reason                                                               |
| A new story is flaky and gets accepted                                 | New items are captured twice and cannot be accepted when unstable                                                                                                         |
| CI runners differ by CPU model                                         | Environment recorded in every signed record; measured over up to 10 runs; threshold or the Playwright container, as a planned re-baseline                                 |
| The runner image, fonts or clock drift and everything changes at once  | Pinned runner label, fonts, `playwright-core` and clock; a renderer change plans every project; drift needs two agreeing captures and blocks releases, never CI           |
| A pull request's Storybook hides a change from its capture             | Not prevented; master's drift capture catches it after the merge; code review                                                                                             |
| Two green pull requests combine into an unreviewed change              | Not prevented; drift capture; the baselines-changed pending guard                                                                                                         |
| Pull request code fakes the capture, the plan or the status            | Plan, capture and verify run master's code; only master's `visual.yml` runs count; no agent can push a workflow                                                           |
| The release job pushes baselines with the deploy key                   | Split release: the key meets no repository code and pushes only version files                                                                                             |
| The page the owner reviews shows one image and signs another           | The tool, not the page, builds the record from bytes it re-hashed; the page is small source the owner has read                                                            |
| An agent runs code on the owner's computer through the tool            | The tool runs from a pinned, read commit, with no install and no repository hooks                                                                                         |
| An agent with the admin token routes around the check                  | The pinned audit detects it; the owner settings prevent it                                                                                                                |
| Signed work expires with its artifacts                                 | The current capture reproducing `to` also counts; results kept 90 days                                                                                                    |
| Losing the only key                                                    | A registered backup key; a lost key only stops new approvals                                                                                                              |
| The seed is a large review, twice                                      | Grids, modes grouped, accept all per project; the second pass lists changed images first                                                                                  |
| Baseline history slows every CI clone                                  | Git LFS: clones and ordinary checkouts carry only pointers; only the `visual` job fetches images, for its project, through the Actions cache                              |
| A checkout without the LFS images compares pointers                    | Capture and `compare` stop with "baseline is an LFS pointer; run git lfs pull"; they never report every image changed                                                     |
| An accept commits raw PNGs instead of LFS pointers                     | `serve` refuses to start without git-lfs and its filter; Finish refuses a commit whose PNG is not a pointer                                                               |
| A push sends pointers without their images                             | `.husky/pre-push` runs `tools/lfs-pre-push.sh`; Finish runs `git lfs push` itself; a missing image fails the next capture's `git lfs pull`, which blocks the pull request |
| The LFS bandwidth allowance runs out and downloads are blocked         | The Actions cache keeps CI near 1 to 5 GiB of 250 GiB a month; worst case about 100 GiB; the planned weekly check warns at 100 GiB                                        |
| An unseeded story looks the same as master only because both are wrong | "No baseline yet" never passes as reviewed: it only does not block; its first baseline still needs the owner's accept                                                     |
| The package is ours to maintain                                        | Upkeep cadence in section 15, instead of a vendor with no spending cap                                                                                                    |

## 18. Alternatives rejected

- **Chromatic on a paid plan, Percy, Applitools, Happo, hosted Argos.** Monthly cost, a hosted
  dependency, and in every case an agent holding the owner's token can approve as the owner. Argos
  Pro with its spend pause stays the fallback.
- **Self-hosted review servers (Visual Regression Tracker and similar).** A server to host and
  patch, which the owner ruled out.
- **Playwright's own `toHaveScreenshot` as the whole system.** Good comparison, but no review UI,
  no approval, and a generated test per story.
- **Capturing inside ci.yml.** Pull request code in the same job can rewrite the results or drop
  its project from the plan.
- **Waiting for all of CI before capturing.** Doubles the time to a reviewable pull request;
  `storybooks.yml` rebuilds the Storybooks in free runner minutes instead.
- **A committed bundle and a compiled review app.** Generated code cannot be read, so signing a
  tool update would mean trusting it blind, and every compact-mantine or Vite change would make the
  build stale and need a signature.
- **A compact-mantine review app.** The repository rule is to use the shared components; it yields
  here because the signing page is a security boundary that must be small, readable source with no
  build. A second Mantine app for the development server would duplicate every review feature, so
  both servers use the one plain page.
- **WebAuthn signing in the review page.** The page is served from an agent-writable machine, so
  its signature proves only a touch, not what was seen.
- **Running the tool from an installed checkout on the owner's computer.** Runs agent-written
  install scripts and dependencies on the one machine every guarantee assumes is agent-free.
- **"Require branches to be up to date" and the merge queue.** At about 50 merges a day either
  serialises merges below today's pace; the merge queue would also need a `merge_group` branch in
  every workflow. Drift detection covers the combined-change gap after the fact.
- **Plain git for baselines, moving to LFS later.** Image history in plain git is permanent: 110 to
  210 MB in year one before more browsers, in every clone. Moving later is `git lfs migrate
import`, a history rewrite that breaks every branch, worktree and recorded commit hash (section 7).
- **Baselines inside each package.** Every accept would rerun the package's and its dependants'
  whole CI (section 5).
- **Baselines in a separate repository, or in a git submodule.** Every accept becomes a
  two-repository write (commit and push the baselines, then move the pointer in the monorepo);
  two pull requests that both accept conflict on the submodule pointer even when their images do
  not; the pull request shows a submodule commit hash instead of the images; and every CI job
  needs a second fetch.
- **Platform passkeys as trusted keys.** Their user verification can come from a typed PIN.
- **A second GitHub account as the only approver of a deployment environment.** Needs a paid
  account, GitHub does not re-authenticate before an approval, and an administrator token can
  delete the runs that hold the evidence.
- **Capture in Docker locally.** The development server has no container runtime and installing
  one needs root; pinned fonts through fontconfig are tried first.
- **Perceptual or AI diffing.** Hides the few-pixel changes that matter here.
