# Visual review: roadmap

Date: 2026-09-27

The graphty monorepo is replacing Chromatic, the hosted service that screenshots every story in
its five Storybooks (graphty-element, compact-mantine, graphty, algorithms, layout), compares each
screenshot with an approved "baseline" image, and lets the owner accept or reject each difference.
Chromatic billed about $3,750 in half a month with no spending cap, so it is now switched off
except on pull requests labelled `chromatic`, and visual changes are waiting for review.

The replacement captures screenshots with Playwright in our own GitHub Actions jobs (free for a
public repository), keeps the baselines as PNG files in git, and reviews them in a small web page
served from the development server. Nothing is hosted and nothing is billed: the target is $0 a
month against a $200 ceiling.

This roadmap is five milestones. The first gets the owner reviewing and approving images again
today, for compact-mantine and graphty-element; each later one adds to it without rework. The
detailed build order is in `plan.md`; the full design, including the security model, is in
`design.md`.

## Tiers

The owner's priorities, the Chromatic features the repository actually uses, and features from
other tools (Argos, Percy, Happo, Applitools, reg-cli, Playwright, BackstopJS) are analysed in
`feature-analysis.md`. P0 is must have, P1 nice to have, P2 later. Where this roadmap moves an item
from the owner's tier, the reason is given.

| Feature | Owner | Recommended | Milestone | Reason for a change |
|---|---|---|---|---|
| Web diff UI | P0 | P0 | 1 | |
| Accept and reject in the UI, with a reason | P0 | P0 | 1 | |
| Baselines committed to git | P0, probably LFS | P0, plain git | 1 | See "Storage" below |
| Run in CI | P0 | P0 | 1 blocks unreviewed merges, 3 requires a signed review | |
| Run in the pre-push hook | P0 | P0 | 2 | Needs the pinned fonts first, or a local capture disagrees with CI |
| Multiple projects | P0 | P0 | 1 (two), 2 (all five) | |
| Review history tied to git hashes | P0 | P0 | 1 | |
| ...and dirty state | P0 | answered by a rule | 1 | Only a CI capture of a pushed commit can be accepted; local captures are labelled as previews |
| No hosted server | P0 | P0 | 1 | |
| Only run changed projects (Nx affected) | P1 | P1 | 2 | Capturing both projects on every pull request costs a few free CI minutes |
| Flashing between old and new | P1 | **P0** | 1 | A few lines, and canvas changes are often a few pixels |
| Pixel-level highlighting | P1 | **P0** | 1 | Same reason |
| Zoom, keyboard review, accept a whole project | -- | **P0** | 1 | The first review is about 1,000 images |
| Capture twice; an unstable story cannot be accepted, only excluded with a reason | -- | **P0** | 1 | One unstable graphty-element story is already known; accepting it makes every later run fail |
| Chromatic story parameters in use: light and dark modes, `delay`, `disableSnapshot`, `diffThreshold`, `diffIncludeAntiAliasing`, `pauseAnimationAtEnd`, and the `isChromatic()` signal | -- | P0 | 1 | This is the whole Chromatic surface the stories use |
| Links to the baseline and new live Storybooks | P1 | P1 | 2 | |
| Per-story history panel, "previously rejected" | -- | P1 | 2 | Records hold the data from milestone 1 |
| Recapture failed or unstable stories from the UI | -- | P1 | 2 | |
| Owner-only approval that an AI agent with the owner's credentials cannot forge | -- | **P0** | 3 | Agents here hold the owner's GitHub token and signing key; see "What approval proves" |
| Compare any two built Storybooks (for example a past release against master) | -- | P1 | 4 | Already done by hand with `tools/diff-stories.mjs` |
| Comments and annotations Claude can pick up | P2 | P2 | 5 | Reject reasons cover much of it from milestone 1 |
| Optimise time, CPU and storage | P2 | P2, except hashing before pixel comparison | 1 (hashing), 5 | Hashing all captures takes milliseconds |
| MCP server | P2 | P2 | 5 | Reads the same `results.json` everything else reads |
| Other browsers | P2 | P2 | 5 | compact-mantine on WebKit first; it has no canvas |
| Auto-approve, several reviewers, perceptual or AI diffing | -- | never | -- | Conflict with owner-only approval, or hide few-pixel changes |

## Storage: plain git, not Git LFS (for now)

Measured: about 16 MB of PNGs for compact-mantine (828 images, light and dark) and graphty-element
(171 images); about 22 MB for all five projects. GitHub's current documentation gives the Team
plan, which the graphty-org organisation is on (checked with `gh api orgs/graphty-org`), 250 GiB of
LFS storage and 250 GiB of LFS bandwidth a month; Free and Pro get 10 GiB. Actions downloads count
against bandwidth, and with the organisation's $0 budget an exhausted allowance blocks LFS for the
rest of the month rather than billing. So LFS would fit and cannot cost money.

It is still not worth it at this size: `git lfs` is not installed on the development server, a
missed `git lfs pull` looks like "every image changed", and GitHub's image diff on a pull request's
Files tab works on plain PNGs. A weekly check reports the packed size of the baseline history;
above 300 MB (estimated one to two years out) the baselines move to WebP or to LFS with
`git lfs migrate`, which is a mechanical change.

## What approval proves

AI agents run on the owner's development server with the owner's GitHub CLI token and commit
signing key. Anything those can produce -- a pull request comment, an API call, a signed commit, a
page served from that machine -- can come from an agent.

- **Milestones 1 and 2:** an accept is an unsigned record marked `"unproven": true`. Nothing stops
  an agent from writing one. This is the price of approving again today, and it is stated on every
  record.
- **Milestone 3:** an accept counts only when signed with `ssh-keygen -Y sign` using a FIDO2
  hardware security key that needs a physical touch and a PIN, by a small tool the owner has read,
  run on the owner's own computer from a commit the owner pinned. An audit run from that pinned
  commit reports every baseline change that no such signature covers. The one visual change this
  cannot catch before merge is a pull request whose Storybook detects the capture and renders the
  old picture; the capture of master catches it after the merge and blocks releases. `design.md`
  section 8 states the full guarantee and its assumptions.

## Milestone 1: approving again (today)

The owner reviews compact-mantine and graphty-element captures in a web page and accepts or
rejects them; accepts land in git.

**Delivers.** P0: web diff UI with side by side, flash, pixel highlight and zoom; accept, reject
with a reason, accept a whole project, exclude an unstable story with a reason; baselines as PNGs in
git under `visual-baselines/<project>/`; a capture job in CI on every pull request and master push
(a tool crash never fails the run; on pull requests "All Checks Pass" fails while a seeded project
has unreviewed items, which blocks unreviewed merges but does not prove who reviewed); two
projects; a review record per accept session in `visual-baselines/reviews/`, tied
to the captured commit and CI run; dirty state answered by the "CI captures only" rule; no hosted
server. Promoted from P1: flash and highlight.

**How it works.** A new private package, `visual-review/` (plain `.mjs`, no build step), holds the
capture script, the comparison library, a vendored copy of pixelmatch and the review page. A
`visual` job in `.github/workflows/ci.yml` downloads the Storybook that the existing build job
already uploads, captures every story at 1200 x 900 in Chromium with SwiftShader, compares with the
baselines in the checkout, captures again anything that differs, and uploads `results.json` plus
the new and changed PNGs as an artifact kept 30 days. On the development server,
`visual-review serve` (started through servherd) lists pull requests, downloads their artifacts
with `gh`, and serves the review page. Accept writes the PNGs and a record into a git worktree of
the pull request's branch, commits and pushes; rejects become one pull request comment.

**Exit criteria.**

1. compact-mantine is seeded: every story's baseline is committed on master, accepted by the owner
   in the review page, with unstable stories excluded with a reason. graphty-element is seeded by
   the owner's review of its harness pull request (#519) once that merges, not from master, so its
   baselines come from the stable harness and are reviewed once.
2. On master, the next CI capture of each seeded project shows every item `unchanged`.
3. At least one waiting pull request has been reviewed end to end: its capture shows its
   differences, the owner accepts or rejects them in the page, and the capture after the accept
   shows `unchanged`.
4. Lint, knip and the package's tests pass in CI.

**Chromatic migration step.** Chromatic stops being needed for compact-mantine and graphty-element.
The owner moves the Chromatic account to the Free plan, confirms with Chromatic that the Free plan
stops at its snapshot limit rather than billing, and removes the payment method. Nobody adds the
`chromatic` label again. Pull requests that waited on Chromatic (#364, #365, #409, #463, #490,
#511, #519) are brought up to date with master and reviewed here.

## Milestone 2: every project, and the local hook (within days)

**Delivers.** P0: algorithms, layout and the graphty app captured and seeded; the pre-push hook
(below); pinned fonts. P1: only affected projects captured; live Storybook links for the baseline
(graphty.app) and the pull request's Storybook; modes of a story shown together; per-story history
panel and "previously rejected"; recapture failed and unstable stories from the page; full-height
capture for compact-mantine and the graphty app once measured stable; a per-story settings file as
the source of truth for thresholds and exclusions.

**The pre-push hook.** `tools/prepush.sh` gains a blocking step, a few seconds with no browser: a
baseline PNG pushed without a review record that names its hash fails the push. A local capture
step is opt-in (`PREPUSH_VISUAL=1`) and becomes default only if local captures match CI byte for
byte and a typical run stays under about a minute. That depends on the pinned fonts: the capture
uses a committed font set through `FONTCONFIG_FILE`, so the development server and the CI runner
render text the same way. Adopting pinned fonts is one planned re-baseline of all projects.

**Exit criteria.** All five projects seeded and `unchanged` on master; a pull request that touches
only compact-mantine captures only compact-mantine; a push of an unrecorded baseline is refused by
the hook; a local capture on the development server and a CI capture of the same commit are
compared, and the result is recorded in `design.md`.

**Chromatic migration step.** Chromatic covers nothing that this system does not. The `chromatic`
label is documented as a rollback only.

## Milestone 3: owner-only approval, enforced (this week)

**Delivers.** P0: signed approval with a hardware key; the "Visual review" pull request check made
required; capture moved out of `ci.yml` into `storybooks.yml` (builds the pull request's
Storybooks, no secrets) followed by `visual.yml` (runs master's code, so a pull request cannot
change its own capture, plan or verdict); `verify` and `audit`; the release job split so the
deploy key never runs repository code; the seed manifest, one signed record covering every
baseline, whose merge commit the owner records outside the repository as the root of trust.

**Owner actions.** Buy two FIDO2 security keys (about $25 to $60 each, once); create the keys on
their own computer; read the signing tool at the seed commit (kept under 2,500 lines); sign the
seed manifest (about 1 to 2 hours, most of it a skim; images that changed since their unproven
accept are listed first); give agents a fine-grained token without workflow or Actions write;
remove the admin bypass from master's ruleset and require "Visual review".

**Exit criteria.** A pull request that changes a baseline without a valid signature cannot merge;
the pinned audit, run on the owner's computer, reports no uncovered change on master; a test proves
a signature made without the PIN is rejected.

**Chromatic migration step.** The replacement is now the gate. Start the two-week watch before
retirement.

## Milestone 4: retire Chromatic (weeks two and three)

**Delivers.** P1: `visual-review diff` compares any two built Storybooks, absorbing
`tools/diff-stories.mjs` and `tools/pixel-diff.mjs`. The pre-push capture's default is decided from
the milestone 2 measurement.

**Chromatic migration step.** After two weeks of the required check without surprises: delete the
`chromatic-*` jobs in `ci.yml` and their "All Checks Pass" entries, the label, `tools/chromatic.sh`,
`tools/chromatic-api.sh`, the Storybook addon and the `chromatic` dependency; replace
`isChromatic()` with a neutral helper that reads a `visual=1` URL flag and switch the capture to it
in the same pull request; delete the Chromatic tokens last. `tools/chromatic-capture.mjs` stays
until nobody needs Chromatic's old images. Rollback before this step is the `chromatic` label;
after it, reverting the removal commit.

**Exit criteria.** No Chromatic job, dependency or token remains; the Chromatic account is closed.

## Milestone 5: later (P2)

- **Notes Claude can act on:** a note pinned to a story or a region, stored as a machine-readable
  block in a pull request comment, read by `visual-review notes --pr N`, and always shown to
  agents as untrusted data from the pull request, never as instructions.
- **MCP server:** `list_reviews`, `get_changes`, `get_images` (as MCP image content) and
  `get_notes`, over the same `results.json` and records. Deliberately no accept tool.
- **Other browsers:** a browser field in the capture key; compact-mantine on WebKit first.
- **Speed and size:** group identical changes across stories, mask regions, a full history page,
  WebP or LFS when the 300 MB trigger fires.
- **A read-only review site on GitHub Pages**, only if reviewing away from both computers is ever
  needed.

## Cost

| Item | Cost a month |
|---|---|
| Actions minutes on standard runners (public repository) | $0 |
| Baselines and records in plain git | $0 |
| Actions artifacts (results 30 days, Storybooks 1 day) | $0 expected; the organisation's $0 budget blocks rather than bills. Check the organisation's storage in billing after the first week |
| Git LFS, hosted review site | not used |
| Chromatic on the Free plan with no payment method | $0 |
| **Total** | **$0**, plus two security keys once, before milestone 3 |

The only path past $200 a month is turning a paid Chromatic plan back on. If this system ever
proves too thin, the fallback is Argos Pro with its spend pause on, about $100 a month, fed by the
same captures.
