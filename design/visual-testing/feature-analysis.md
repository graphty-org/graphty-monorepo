# Visual review: feature analysis

Date: 2026-09-27

## What this document is

The graphty monorepo is replacing Chromatic, the hosted service that screenshots every story in
its five Storybooks (graphty-element, compact-mantine, graphty, algorithms, layout), compares each
screenshot with an approved "baseline" image, and lets the owner accept or reject each difference.
Chromatic billed about $3,750 in half a month with no spending cap. The replacement captures the
screenshots in our own GitHub Actions jobs with Playwright, keeps the baselines in git, and makes
acceptance require a touch of the owner's physical security key.

This document lists every feature the replacement could have, from three sources:

1. the owner's own list, with the owner's priority;
2. the Chromatic features this repository actually uses today;
3. useful features of other visual review systems (Argos, Percy, Applitools, Happo, reg-cli,
   Playwright, Vitest, BackstopJS, Visual Regression Tracker, GitHub itself).

For each feature it gives what it is, why it matters here, the owner's tier where the owner gave
one, a recommended tier, and the stage that delivers it. Tiers: **P0** must have, **P1** nice to
have, **P2** later. Where the recommendation differs from the owner's tier, the reason is given.
It then covers what the owner-only approval guarantees, the migration from Chromatic, what is
usable today, and the cost.

The evidence behind the numbers is in the companion documents in this folder:
`chromatic-alternatives.md` (options and measurements), `research-chromatic-use.md` (what we use
from Chromatic, with file and line references), `research-other-systems.md` (feature survey),
`research-repo.md` (CI, Pages, pre-push, permissions) and `research-tech.md` (technology choices).

## The stages

Each stage is usable on its own; later stages add to it without rework.

| Stage | Target | What it adds |
|---|---|---|
| **Stage 0: stop the spend** | today, owner action | Switch the Chromatic account (the graphty-org billing account, not each project) to the Free plan. Chromatic already runs only on pull requests labelled `chromatic`. See "Migrating from Chromatic". |
| **Stage 1a: approving again** | today | One CI job per Storybook (compact-mantine and graphty-element first) that captures, compares and uploads the results; a static review page built from that CI artifact; acceptance signed on the owner's own computer with a security-key SSH signature; the check reports unsigned baseline changes. Defined in "Usable today". |
| **Stage 1b: review in the page** | within days | Accept and reject buttons in the page that build the selection and copy the exact accept command; keyboard review; the other three Storybooks. |
| **Stage 2: enforced** | this week | The signature check becomes required and joins the "All Checks Pass" gate, the pre-push signature check, recapture once to separate unstable from changed, the retrospective audit of every baseline commit since Stage 1a. |
| **Stage 3: comfort and retirement** | next two weeks | Links to live Storybooks, boxes and zoom on changed regions, re-accept after a baseline merge conflict, cancel superseded visual runs, optionally a WebAuthn Accept button. Chromatic is removed. |
| **Stage 4: later** | when wanted | Everything marked P2. |

## 1. The owner's list

| Feature | What it is | Why it matters for us | Owner | Recommended | Stage |
|---|---|---|---|---|---|
| Visual diff with a web-based UI | A page showing, for each changed story, the baseline image, the new image and what changed | The owner reviews visually, story by story; a terminal cannot show pictures | P0 | P0 | 1a (static page; GitHub's pull request image diff as a second view) |
| Accept and reject in the UI | Per story and per project, with an optional reason | The owner classifies each change as intended or a regression (issues #157, #518) | P0 | P0 | 1a (one command, from the page's selection), 1b (buttons that copy that command; this meets the P0, since signing must happen on the owner's computer, not in the page) |
| Commit baseline images | Baselines stored in the repository next to each package (`<package>/visual-baselines/`) | A pull request's own tree then holds exactly the baselines it branched from, and accepted changes follow the merge into master | P0 (probably Git LFS) | P0, **plain git, not LFS** | 1a |
| Run in CI | One visual job per Storybook in `.github/workflows/ci.yml`, using the Storybook build CI already uploads | The gate that stops unreviewed visual changes reaching master | P0 | P0 | 1a (reporting), 2 (required) |
| Run locally in a git push hook | A step in `tools/prepush.sh` | Catch a visual change before pushing | P0 | P0 for the signature check (blocks); the local screenshot comparison is a **warning, not a block**, unless a container runtime is installed (see note A) | 2 |
| Support multiple projects | Separate baselines, results and pass/fail per Storybook, in one review UI | One package's change must not block another's review | P0 | P0 | 1a (two), 1b (all five) |
| History of reviews, tied to git hashes | Every accept and reject recorded with the reviewed commit, each image's SHA-256, the time and the reason | Audits ("who accepted this and when"); issue #217 exists because 100 changes reached master unreviewed | P0 | P0 (records); a history page is P2, since `git log` plus the records answer the questions (see "The review history") | 1a (records), 4 (page) |
| ...and dirty state | Whether uncommitted code was part of what was reviewed | A review of uncommitted code would not match any commit | P0 (question) | Answered by a rule, not a feature: every accept names a pushed commit and the CI run that captured it, so a dirty tree can never be accepted. The pre-push warning prints "working tree dirty" when it applies. Recording dirty state is dropped | 1a (rule), 2 (warning) |
| Run without a hosted server | Only git, GitHub Actions, and optionally GitHub Pages | No bill, no service to patch | P0 | P0 | 1a |
| Only run diffs for changed packages | Capture only the Storybooks Nx says a change affects | CI time and review noise | P1 | P1, delivered in 1a because CI already computes the affected list and the Chromatic jobs use it | 1a |
| Flashing between baseline and new | The two images alternate a few times a second | A small shift is invisible side by side and obvious when flashed | P1 | **P0**: a few lines of CSS, and canvas changes in graphty-element are often a few pixels | 1a |
| Pixel-level highlighting | Changed pixels painted in a strong colour | Finds a three-pixel change in a 1200 x 900 image | P1 | **P0**: without it a small change cannot be found | 1a (image), 3 (boxes and zoom) |
| Links to baseline and new live Storybooks | From a changed story, open it in the base and the pull request Storybooks | Interacting with a story explains a change a still image cannot | P1 | P1 | 3 |
| Comments and annotations Claude Code can pick up | A note pinned to a story or region, stored as a file an agent reads | Hands a regression to an agent precisely | P2 | P2; a **reason field on accept and reject is P0** (it is part of the history) | 1a (reason), 4 (pinned notes) |
| Optimise time, CPU and storage | Faster capture, smaller baselines | Keeps CI and the pre-push hook cheap | P2 | P2; the one cheap win, comparing file hashes before pixels (30 ms for all 1,198 captures), is in 1a | 1a (hashes), 4 (rest) |
| MCP server so Claude can see changes | A local server exposing changed stories and their images | Agents investigate, the owner decides (issue #218) | P2 | P2; the **machine-readable results file it would read is P0** | 1a (results file), 4 (MCP) |
| Other browsers | Firefox and WebKit captures | Browser-specific regressions | P2 | P2; start with compact-mantine in WebKit (no canvas), since headless Firefox and WebKit have no SwiftShader for graphty-element's WebGL | 4 |

**Note A, the pre-push hook.** Screenshots depend on the fonts and graphics stack of the machine
that takes them. The development server has no Docker, podman or git-lfs, installing them needs
root, and emoji already render there as empty boxes, so local captures will very likely not match
CI's. Baselines therefore come only from CI, and the hook does two things:

- **Blocks (P0, Stage 2):** every changed or deleted file under `visual-baselines/` must be
  covered by a valid owner signature. Seconds, no browser.
- **Warns (Stage 2):** for affected packages, compare HEAD's captures with the merge base's on the
  same machine and print differences. It becomes a block only if the owner installs a container
  runtime (rootless podman or Docker) so the hook can capture in CI's pinned image; that is the
  owner's call. The script's own budget note ("a gate people bypass with --no-verify catches
  nothing") limits it to affected packages.

**Why not Git LFS.** GitHub's current documentation gives the Team plan, which this organisation
is on, 250 GiB of LFS storage and 250 GiB of bandwidth a month (the 10 GiB figure applies to Free
and Pro). Expected use is about 17 GB a month, so LFS would fit. It is still not recommended:
all baselines are 14 MB packed and each accepted image adds about 13 KB; LFS needs `git lfs` on
every machine and agent (it is not installed on the development server); a missed `git lfs pull`
looks like "every image changed"; and the organisation's $0 LFS budget turns an exhausted
allowance into CI failing for the rest of the month. Revisit if the baselines pass a few hundred
megabytes.

## 2. Chromatic features we use today

Chromatic is used as a screenshot farm, a comparison engine, a baseline store and a review page.
The story-level surface is five parameters. Each row says what the replacement does instead.

| Feature | What it is | Why it matters for us | Recommended | Stage |
|---|---|---|---|---|
| One project per Storybook | Five Chromatic projects with separate baselines and history | Same as "multiple projects" above | P0 | 1a |
| Capture the prebuilt Storybook | Chromatic uploads the `storybook-static` CI already built | Reuse the `build-storybook-*` artifacts; never rebuild in the visual job | P0 | 1a |
| Affected-only gating | Each Chromatic job runs only when Nx lists its package | Same gate, reused unchanged | P1 (free) | 1a |
| Job fails on unreviewed changes | `exitZeroOnChanges: false` | Red while changes are unreviewed, with "capture failed" reported differently from "changes to review" (issue #351) | P0 | 1a |
| Skipped job counts as passing in the required gate | "All Checks Pass" allows a skipped `chromatic-*` job | The visual jobs join the gate the same way | P0 | 2 |
| Light and dark modes | compact-mantine and graphty capture every story twice | Set the globals in the iframe URL; name baselines `<story>.<mode>.png` | P0 | 1a |
| `delay` | A minimum wait before capture (18 stories, three previews) | Babylon.js needs frames to finish; honour it as a minimum after the render phase completes | P0 (honour); an event wait instead is P2 | 1a |
| `pauseAnimationAtEnd` | CSS animations frozen at their last frame | Playwright's `animations: "disabled"` does the same for finite animations | P0 | 1a |
| `disableSnapshot` | Skip a story (3 stories) | They cannot be captured deterministically; a change to this flag is a review item (see below) | P0 | 1a |
| `diffThreshold` and `diffIncludeAntiAliasing` | Per-story colour tolerance and anti-aliasing switch (14 stories) | Compared with pixelmatch, which has the same two settings; check once that its colour scale treats these 14 stories as Chromatic's did. A change to either is a review item | P0 | 1a |
| Default viewport 1200 x 900, full-height capture | Chromatic's capture size | Kept as the default because the stories' layouts already assume it; changing it later is an edit and a reseed | P0 | 1a |
| The `isChromatic()` signal | Physics layouts pre-step to a settled picture; a label animation stops | Adding `&chromatic=true` to the iframe URL keeps every call site unchanged | P0 | 1a (URL), 3 (rename to a neutral helper) |
| Wait for the play function | Capture after the story's play function completes | Wait for Storybook's render phase `completed` | P0 | 1a |
| Per-story accept and deny page | The chromatic.com build page | The owner's main review surface today | P0 | 1a |
| Diff overlay and spotlight | Changed pixels highlighted, small diffs zoomed | Same as pixel highlighting above | P0 | 1a (overlay), 3 (zoom) |
| Baselines follow merges | Accepted snapshots on a merged branch become master's | Free with baselines in git | P0 | 1a |
| Build history, who accepted what | Build numbers quoted in issues for audits | Approval records plus `git log` on the baseline file | P0 | 1a |
| Commit status on the pull request | Only compact-mantine's project posted one | One check per package; its summary lists the changed stories | P0 | 1a |
| Published Storybook per build | Chromatic hosted each build's Storybook | Same as "links to live Storybooks" | P1 | 3 |
| Flake filter | Chromatic re-renders to spot unstable stories | Recapture once when a story differs; label it "unstable" if the two captures disagree. One story (`ai-control--default`) is unstable today; before seeding it gets a fixed seed, or `disableSnapshot` as a signed review item | P1 | 1a (that story), 2 (recapture) |
| Data an agent can read | `tools/chromatic-capture.mjs` scraped images with a browser cookie because the API refused them | A results file plus PNGs, readable with no credentials | P0 | 1a |
| TurboSnap, the Visual Tests addon, UI Review, accessibility tests, notifications | Unused or no longer needed | TurboSnap saves little because both big previews import package source; the check is the notification | drop | 3 |

Two defects must be fixed before the graphty app's baselines are seeded, or they are wrong from
the start: its light mode sets `colorScheme` while its preview reads `theme`, so both "light" and
"dark" captures render dark (a one-line fix); and the eruda debug button is drawn into every story
(issue #204).

## 3. Features from other systems

Only features not already covered above.

| Feature | Who has it | What it is and why it matters for us | Recommended | Stage |
|---|---|---|---|---|
| Owner-only approval that an agent cannot forge | Nobody; Argos and Happo attribute agent approvals to the human whose token was used | Agents here hold the owner's GitHub token and commit-signing key. See "What owner-only approval guarantees" | P0 | 1a (signed, reported), 2 (enforced) |
| Accept a whole project in one action | Argos, Percy, Happo, Playwright `--update-snapshots` | One signature over the whole list, not one touch per image | P0 | 1a |
| Progress indicator | Argos ("2 / 3 reviewed") | Shows how much is left; a counter on the same page | P0 | 1a |
| Pinned rendering environment | Playwright Docker image, BackstopJS, Loki | Pin the GitHub runner image and Playwright 1.57; move capture into `mcr.microsoft.com/playwright:v1.57.0-noble` only if the runner image drifts | P0 (pin), P2 (container) | 1a, 4 |
| Compare file hashes before pixels | (our measurement) | 998 of 999 captures were byte-identical across two runs on the development server; pixelmatch runs only on the few that differ. Whether bytes also match across CI runners (mixed CPU types, SwiftShader compiling for the host) is measured in Stage 1a by capturing one Storybook artifact in three CI runs | P0 | 1a |
| Approval carried across pushes | Percy, Chromatic | Free with git: an accepted image is a committed file | P0 | 1a |
| Subset runs never delete baselines | Argos | A package that was not captured keeps its baselines; a removed story is a review item, never a silent delete | P0 | 1a |
| GitHub's own image diff | GitHub (2-up, swipe, onion skin on changed PNGs) | A free second review surface once baselines are PNGs in git; also why they stay PNG, not WebP | P0 (free) | 1a |
| Retrospective audit | (from our threat model) | Walk master's history and flag any baseline change not covered by a valid owner signature; runs on every push to master. Its first run re-checks every baseline commit made during Stage 1a and 1b, when the check was not yet required | P0 | 2 |
| Keyboard review | Argos (Y/N, arrows, J/K) | A few key handlers on the same page | P1 | 1b |
| Zoom to the change | Chromatic autofocus, Argos | Jump to each changed region at pixel scale | P1 | 3 |
| Re-accept after a baseline merge conflict | (git-specific) | Two pull requests that accept the same story conflict on a binary file; take either side, then re-accept what CI now captures | P1 | 3 |
| Cancel superseded runs | GitHub `concurrency` | A concurrency group on the visual jobs only, so an older push's run stops; `ci.yml` has none today and a workflow-wide one would change every job | P1 | 3 |
| Group identical changes | Applitools, Percy | One decision for a token change across 400 stories. Per-project accept covers most of that case; promote to P1 if a real theme change shows per-project accept is too coarse | P2 | 4 |
| Review page on GitHub Pages, pull request comment with images | reg-cli, Playwright report, Argos, Happo | A second storage and transport system to keep alive; the local page plus GitHub's diff already meet "no hosted server". If built, per-PR data goes in a ref outside `refs/heads` (for example `refs/visual-review/*`) so clones do not fetch it, and pull requests from forks, which get no `contents: write`, fall back to the artifact | P2 | 4 |
| Compare any two versions | Happo, reg-cli, Argos | `tools/diff-stories.mjs` already covers the one past use (issue #518) | P2 | 4 |
| Slider and onion skin | reg-cli, Playwright report | GitHub already offers both on the pull request | P2 | 4 |
| Ignore one exact recurring diff | Argos, Happo | Not needed while captures are 998/999 stable | P2 | 4 |
| Hide or mask regions | Chromatic `ignoreSelectors`, Argos, Playwright `mask` | Not used by any story today | P2 | 4 |
| Fallback baseline for a new mode | Argos | Useful only if a third mode is added | P2 | 4 |
| Per-story history page | Argos, Chromatic, Visual Regression Tracker | `git log` covers it until a page is wanted | P2 | 4 |
| Agent review skill | Argos (`argos-pr-review`) | Claude summarises visual changes against the pull request's intent before the owner reviews | P2 | 4 |
| Alignment-aware diff | Happo `lcs-image-diff` | Better diff images when content shifts down | P2 | 4 |
| WebP baselines | reg-cli | Halves storage but GitHub's pull request view does not diff WebP | P2 | 4 |
| Perceptual or AI comparison, noise clustering | Applitools, Percy, Argos | Hides flakiness instead of removing it; would hide a one-pixel border change | drop | -- |
| Auto-approve master builds, multiple reviewers, roles, SSO | Argos, Percy, Chromatic | Conflicts with owner-only acceptance; one reviewer | drop | -- |
| Agent approval | Argos, Happo, Percy MCP servers | Forbidden; the design must prevent it, not merely omit it | never | -- |

**One diff engine.** The compare step uses pixelmatch, because 14 stories set
`diffIncludeAntiAliasing` and pixelmatch detects anti-aliasing; `tools/pixel-diff.mjs`'s hand-rolled
loop is replaced by it rather than kept beside it. pixelmatch is a new dev dependency (no
dependencies of its own). A size change is reported as "changed" with both sizes, never as an
error, since full-height captures change size whenever content height does.

## What owner-only approval guarantees

**What is covered.** Each package's `visual-baselines/` holds the PNGs and a `stories.json` listing
every captured story and mode with the capture settings that decide what the owner sees:
`disableSnapshot`, `diffThreshold`, `diffIncludeAntiAliasing`, `delay` and the mode list. Any
change to a PNG or to `stories.json` -- a changed or new image, a deleted or renamed story, a newly
skipped story, a raised threshold, a changed delay or mode list -- is a review item, shown on the
page and requiring the same signature as an image change.

**Where accepted images come from.** Only from the capture artifact of the CI run of the pull
request's head commit. The review page and the accept command read that artifact, downloaded with
`gh run download`; the accept command records the run id and head commit in the manifest and
refuses any image whose hash does not match that run's results file. A capture made on the
development server is never an accept source, because its fonts and graphics stack differ from
CI's (note A).

**Mechanism.** Accepting writes a manifest (repository, pull request, reviewed commit, CI run id,
and for each review item its path, its previous SHA-256 on the base branch, and its new SHA-256 or
"deleted") and commits it to the pull request. Signing happens on the **owner's own computer**,
where the security key is plugged in, not on the development server: the accept command prints
one command for the owner to run locally, which fetches the manifest from the pull request, prints
its list of items, and runs `ssh-keygen -Y sign` with an `ed25519-sk` key, which needs a physical
touch (and the PIN, since the key is created with `-O verify-required`). The same command pushes
the `.sig` file back, or the owner pastes it. Agent forwarding of the key to the development server
is not used.

Prerequisites on the owner's computer, once: OpenSSH 8.2 or later built with FIDO support (the
ssh bundled with macOS may lack it; Homebrew's `openssh` has it), and
`ssh-keygen -t ed25519-sk -O verify-required`, whose public key goes into the trusted-keys file on
master. A second key as a backup is registered the same way.

**The check.** It runs from **master's copy** of the capture, compare and verify scripts, never the
pull request's. For every changed file under `visual-baselines/` it requires a record that lists
the same path and the file's exact hash, whose previous hash equals the path's current hash on the
base branch (so an old record cannot be replayed to restore an earlier image), and whose signature
verifies against a key in the trusted-keys file on master. It then checks that the committed image
is a true CI render: byte equality with CI's own capture is the fast path; when the bytes differ,
pixelmatch at the story's threshold must pass. The signature fixes the exact hash, so the security
claim does not depend on byte equality. A story CI marks unstable (two captures that disagree) is
reported as unstable, never compared byte for byte, and its baseline change still needs a
signature. In Stage 1a and 1b a failure turns the job red with "unsigned baseline change" but the
job is not required; Stage 2 makes it required. A WebAuthn Accept button in the page is an
optional later comfort (Stage 3), not a different guarantee.

**Guaranteed (from Stage 2):** no change to a baseline image, to a story's presence, or to its
skip, threshold, anti-aliasing, delay or mode settings passes the required check unless someone
physically touched the owner's key while a signature over that exact list was requested. An agent
can prepare everything except the touch. Changes made during Stage 1a and 1b are re-checked by the
retrospective audit.

**Not guaranteed:**

- **That the owner saw what was signed.** The review page runs on a machine agents can write to,
  so a tampered page could show one picture and put another hash in the manifest. Signing on the
  owner's own computer narrows this: the list of paths and hashes shown before the touch is the
  list signed. The check's summary lists every item each signature covered, so the owner can
  confirm after the fact; each touch covers one manifest only.
- **That the story renders the same for users as under capture.** Story code is pull-request code.
  It already detects capture (`chromatic=true`) to settle physics layouts, and it could just as
  well render the old picture under capture only. Only code review of the story catches that.
- **That the rules stay in place.** Changes to the visual tooling take effect only after they merge
  into master, and the verifier accepts changes to itself or to the trusted-keys file only when
  signed by a key trusted before the change. But an agent with the owner's administrator token can
  remove the required check or merge around it; the retrospective audit reports that at the next
  push to master. Preventing it needs agents to run with a token that lacks administration rights,
  which is outside this system.
- **Before Stage 2**, nothing blocks a merge: an unsigned baseline change turns the visual job red
  and is caught by the audit afterwards, not prevented.

## The review history

A record's key is the reviewed commit plus the SHA-256 of each image it covers. The commit that
added a baseline to master is found with `git log` on that baseline file, and the record is joined
to it by the image hash, which is the same in both. That covers "who accepted this image, when and
why" without a page.

Records committed to a pull request that closes without merging stay reachable: GitHub keeps
`refs/pull/<n>/head` for a closed pull request even after its branch is deleted, so reject
records and abandoned reviews can be found with `git fetch origin 'refs/pull/*/head:refs/remotes/pr/*'`
or the API. No copy job is needed unless GitHub is ever seen pruning those refs.

## Migrating from Chromatic

1. **Stop the spend (today, owner).** On chromatic.com, open the graphty-org account's billing page
   (account menu, then Billing) and switch the plan to Free. The plan is per account, not per
   project. Confirm it took effect when the billing page shows the Free plan and a 5,000-snapshot
   monthly limit. Before switching, check on Chromatic's plan page or with its support that
   existing builds stay reviewable on Free; if so, the owner may finish open Chromatic reviews
   there until Stage 1a is live, since reviewing an existing build uses no snapshots. Note that on
   Free, Chromatic pauses review as well as capture once the 5,000 snapshots are used.
2. **Open pull requests with unreviewed Chromatic changes.** At the time of writing, #364, #365,
   #409, #463, #490 and #511 have a failed Chromatic check. For each, the owner either finishes
   the Chromatic review before downgrading, or abandons it. Under the new system, each is
   updated from master once the tooling and the seed have both merged (see "Usable today"), and
   the owner reviews only its own differences.
3. **Seed the first baselines.** The seed pull request's CI job captures every story from
   master's code. The review page shows a thumbnail grid per project with a progress count, and
   the owner accepts per project, opening any thumbnail that looks wrong.
   **Chromatic comparison, best effort, after seeding.** For stories the owner flags, or for one
   Chromatic build's changed set, `tools/chromatic-capture.mjs` fetches Chromatic's images; it
   needs the owner's `CHROMATIC_SESSION_COOKIE` in `.env`. Chromatic rendered with its own browser,
   fonts and GPU, so most graphty-element canvases will differ; flashing between Chromatic's image
   and the new capture is how the owner confirms a difference is only renderer noise. The
   comparison can find a regression, but cannot prove a seed image is correct.
4. **No live side-by-side.** Running both systems for two weeks would use about four full runs'
   worth of the Free allowance and then pause. Instead, the best-effort comparison above plus a few
   Chromatic runs chosen by the `chromatic` label on pull requests with known visual changes,
   comparing the two systems' verdicts.
5. **Remove Chromatic (Stage 3), in this order:** the `chromatic-*` jobs in `ci.yml` and their
   entries in "All Checks Pass"; the `chromatic` label; `tools/chromatic.sh`,
   `tools/chromatic-api.sh` and the `chromatic` npm scripts; the Chromatic addon from each
   Storybook; `isChromatic()` replaced by the neutral helper reading the same URL flag; the
   Chromatic dependency; last, the project tokens from the repository secrets and `.env`.
   `tools/chromatic-capture.mjs` stays until nothing needs old Chromatic images.
6. **Rollback.** Until step 5's last item, re-adding the `chromatic` label to a pull request runs
   Chromatic again on the Free plan. After it, rollback is reverting the removal commit and
   restoring the tokens.

## Usable today

Three pull requests, in this order. Each depends on the one before it being on master, because
the CI job runs master's copy of the scripts and compares against master's baselines. Until both
the tooling and the seed are on master, every story in a blocked pull request would show as
"new". Times are estimates.

1. **The tooling pull request** (agent work about half a day; owner review about 30 minutes). It
   adds, for compact-mantine and graphty-element:
   - **A CI job per affected Storybook** that downloads CI's `build-storybook-*` artifact, walks
     `index.json`, opens each story with `&chromatic=true` and the mode's globals, waits for the
     render phase `completed` plus `delay`, skips `disableSnapshot`, and writes
     `<story>.<mode>.png` at 1200 x 900 with SwiftShader, plus `stories.json`. It hashes captures
     against `visual-baselines/`, runs pixelmatch on those that differ, writes a highlight image
     each and a results file (unchanged, changed, new, removed, settings changed, capture failed;
     hashes, changed-pixel count, bounding box), uploads all of it, and fails on unreviewed items
     (with a different message for capture failures) and on "unsigned baseline change". Not yet
     in the required gate.
   - **A local review command** that runs `gh run download` on a pull request's latest visual
     artifact and serves a static page through servherd: per project a progress count and the
     review items; per story baseline and new side by side, the highlight, and flashing.
   - **Accept and reject commands.** Accept copies the chosen PNGs and `stories.json` from the
     downloaded CI artifact into `visual-baselines/`, writes and commits the manifest, and prints
     the signing command the owner runs on his own computer (see "What owner-only approval
     guarantees"). Reject writes a record with the reason and no image.
   - A fixed seed for `ai-control--default`, or `disableSnapshot` on it.

   Its own visual job cannot run, since master has no scripts yet, so it is **reviewed as code
   only**. It also does the cross-runner measurement: the same artifact captured in three CI runs,
   hashes compared.
2. **The seed pull request** (CI about 10 minutes; owner review about 30 to 60 minutes for the
   roughly 1,000 compact-mantine and graphty-element images as thumbnail grids). The job captures
   master's stories; everything is "new"; the owner accepts per project, signs once per project,
   and merges.
3. **Each blocked pull request** (#364, #365, #409, #463, #490, #511): updated from master, CI
   reruns (about 20 minutes), and the owner reviews only its differences, a few minutes to a
   quarter of an hour each.

Today very likely covers steps 1 and 2; step 3 starts today and finishes tomorrow. The owner's
action items today: switch Chromatic to Free, plug in a FIDO2 security key and create the
`ed25519-sk` key on his own computer, review the tooling pull request, and review the seed.

Next, within days (Stage 1b): Accept and Reject buttons in the page that build the selection and
copy the exact accept command, including the manifest hash, to the clipboard; keyboard review;
algorithms, layout and the graphty app (after its two defects are fixed).

This needs a FIDO2 security key the owner already owns. If there is none, approvals are recorded
unsigned and the check's summary says "recorded, not proven" until a key arrives; the
retrospective audit in Stage 2 then lists every such record for the owner to re-sign.

## Cost ceiling: $200 a month

| Component | Expected monthly cost | Basis |
|---|---|---|
| CI capture and compare on standard GitHub-hosted runners | $0 | Free for public repositories. Larger runners are not used, and the organisation's $0 Actions budget blocks them anyway. |
| Baselines in plain git | $0 | About 14 MB packed plus about 13 KB per accepted image. |
| Git LFS | $0 (not used) | If adopted later, about 17 GB a month against the Team plan's 250 GiB; the $0 budget blocks rather than bills. |
| Actions artifacts | $0 | Billed only for private repositories. |
| Review records | $0 | Text files in the repository. |
| Local review page and pre-push step | $0 | Runs on the existing development server. |
| Hardware security key | $0 a month; about $25 to $60 once, $0 if the owner has one | Common FIDO2 key prices, not checked against a vendor today. A second key as a backup is recommended, registered in the trusted-keys file too. |
| Chromatic until removal | $0 | Free plan, which pauses at 5,000 snapshots a month instead of billing. |
| GitHub Team plan | unchanged | Already paid for other reasons. |
| **Expected total** | **$0 a month** | |
| Fallback, only if the self-hosted review proves too thin: Argos Pro with its spend pause switched on | $100 a month at opt-in volume | $100 for 35,000 screenshots; the pause must be enabled, because a spend amount alone does not stop usage. The same capture step feeds it with `argos upload`. |

Nothing in the design can run up a bill: every component is free on a public repository or
blocked by an existing $0 budget when its allowance runs out. The only way past $200 a month would
be to re-enable a paid Chromatic plan.
