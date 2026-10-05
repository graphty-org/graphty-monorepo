# Local screenshot previews, Finish on local captures, and the pending-approvals inbox

Date: 2026-10-04. Status: adopted design. Built: pinned fonts (section 3), the preview script
(section 5, started by the agent after each push rather than by the server), review and
Finish on local captures (section 6, without the "CI differs from your local approval" mark: such
an image simply comes back undecided), the inbox (section 7) and the notifier (section 8, as its
own `visual-review notify` process). Not built from section 7: the collapsed "waiting and done"
line (the pull request cards stay listed in full under the inbox), the local-preview failure
reasons from `status.json`, and the per-project byte-mismatch count. Measurements are against master at
0b9d4393b.

This document extends the visual review system described in `design.md` (same folder). That
system screenshots every Storybook story in CI, compares each screenshot with an approved baseline
image committed in Git LFS under `visual-baselines/`, and lets the owner accept or reject each
difference on a review page served from the development machine (`visual-review serve`). Finish
on that page commits the accepted images with a review record signed by the owner's passkey, and
a CI job, the gate (`visual-review/trusted/gate.mjs`), fails a pull request that holds a
difference nobody approved.

## 1. What changes

Today the owner waits about 25 to 32 minutes after an agent pushes before CI's screenshots reach
the review page, and a reviewed pull request needs one more full CI run after Finish. This design
makes three changes:

1. **Local previews.** The development machine captures a pull request's screenshots itself, a
   few minutes after the push, with fonts pinned in this repository so its bytes match CI's.
2. **Finish on local captures.** The owner can accept and Finish on those local images. The gate
   is unchanged and still checks CI's own captures: when CI's screenshot matches what the owner
   approved, the pull request passes with nothing left to decide; when it does not, the gate fails
   and those images come back to the owner. Best case this saves about 50 minutes from push to
   merge-queue entry; worst case the owner approves the same images a second time in CI.
3. **Knowing what is waiting.** The review page opens on a pending-approvals inbox (every pull
   request with undecided images, fewest images first), and the review server sends one quiet
   push notification when pull requests become ready for review, batched, and never for CI
   noise.

Fixed, unchanged by this design:

- The development machine never becomes a CI runner. Nothing CI or the gate reads is produced
  there.
- Only the owner approves images, with passkey-signed review records.
- `visual-review/trusted/gate.mjs` and `visual-review/trusted/lib/approval.mjs` do not change.
- Baselines on master change only through the owner's signed records.

## 2. Why a local capture can match CI byte for byte

**CPU does not matter.** The visual job records the runner's CPU in each `results.json`. Over 16
recent jobs (runs 37211866060 to 37220350543) the runners were AMD EPYC 7763 (Zen 3, AVX2 only),
AMD EPYC 9V74 and 9V45 (AVX-512), and Intel Xeon Platinum 8370C and 8573C (AVX-512). All 1,002
compact-mantine captures and 198 graphty-element captures equalled their baselines byte for byte.
SwiftShader and Chromium's CPU rasterizer produce the same bytes whatever the SIMD width. The
development machine's i9-14900KF (AVX2) sits inside that range.

**The browser already matches.** Local and CI captures both record Chromium 143.0.7499.4
(Playwright 1.57.0, pinned in `visual-review/package.json`) and the same WebGL renderer string
(`ANGLE ... SwiftShader Device (Subzero)`). Both machines run Ubuntu 24.04 in UTC with
`LANG=en_US.UTF-8`; capture also forces `TZ=UTC`, `locale: "en-US"`, a fixed clock start,
1200 x 900 at scale 2, and deletes `navigator.gpu`. Chromium bundles its own FreeType, HarfBuzz,
Skia and PNG encoder; it uses the host's fontconfig only to find font files.

**Fonts are the one known difference.** A local capture of graphty-element's
`data--cytoscape-session` differed from CI's baseline in 315 pixels inside a 24 x 31 box: CI draws
a clipboard emoji in a button, the local machine draws an empty box, because it has no emoji font
(`emojiFont: false` in its results.json, `true` in CI's). Every other pixel matched. Locally,
fontconfig resolves `Arial` to Liberation Sans, `Helvetica` to Nimbus Sans, and `Roboto`, `Inter`
and `sans-serif` to DejaVu Sans; what the hosted runner resolves is not recorded. The runner image
also changes every week or so, so CI's own baselines can drift if a font package changes there.

## 3. Pinned fonts, committed to this repository

### Options considered

- **One container image for CI and the local machine** (for example
  `mcr.microsoft.com/playwright:v1.57.0-noble`). Identical userland on both sides, but it needs
  Docker or Podman on the development machine (installing either needs sudo), very likely
  re-baselines all of about 1,430 images because CI's fonts change, adds a 2 GB image pull to
  each visual job, and pins nothing that matters beyond fonts. Held in reserve: if the experiment
  in section 4 finds a difference that is not fonts (a host library Chromium does not bundle),
  this is the answer, and it needs the owner to install Podman.
- **Make the development machine match the runner** (install the runner's font packages).
  Cheapest, but it tracks an image GitHub changes without notice and leaves CI's own drift
  unsolved. Used only as an experiment arm.
- **Pinned fonts inside the capture (chosen).** Capture launches Chromium with `FONTCONFIG_FILE`
  pointing at a committed `fonts.conf` that lists only a committed font directory, so no host
  font is consulted, locally or in CI. This was already the plan in `design.md` section 6 item 9;
  this document changes where the files live.

### Where the fonts live

The font files are committed to **this repository**, not shipped in the published
`@graphty/visual-review` npm package. The package stays generic; each repository brings its own
fonts and points the tool at them through its config:

- A root directory `visual-fonts/` holds `fonts/` (the font files), `conf.d/` (fontconfig's rule
  files), `licenses/` (each Debian package's copyright file) and `fonts.conf`. Everything under
  `visual-fonts/fonts/` is a Git LFS object, like the baselines.
- `fonts.conf` lists `<dir prefix="relative">fonts</dir>` and
  `<include prefix="relative">conf.d</include>`, so it works from any checkout path, and a
  `<cachedir prefix="xdg">` that capture points at a temporary `XDG_CACHE_HOME` given to the
  browsers only (Playwright itself finds Chromium under `XDG_CACHE_HOME`, so it cannot be set for
  the whole process). The family aliases are the runner's own rule files, not hand-written ones.
- `visual-review.config.json` gains one setting, `"fontconfig": "visual-fonts/fonts.conf"`.
  Without it capture behaves as today (host fonts), so other repositories using the package are
  unaffected.
- Capture refuses to run when the setting names a file whose font files are still Git LFS pointer
  files, and says which `git lfs pull --include` to run. It never falls back to host fonts.
- Capture records the SHA-256 of the font directory in `environment.fonts` (`design.md` section 6
  item 10), and `hasEmojiFont` asks the pinned configuration.

**Which fonts.** To avoid a re-baseline, the committed set is a snapshot of every font file the
runner's fontconfig lists and of its `/etc/fonts/conf.d` (minus `50-user.conf` and
`51-local.conf`, which read the user's and the host's own settings), taken by a throwaway workflow
on 2026-10-04 (runner image `ubuntu24` 20260927.320.1, fontconfig 2.15.0). That is 88 files,
117 MB, from the Debian packages fonts-dejavu (core, extra, mono), fonts-liberation,
fonts-noto-color-emoji, fonts-freefont-ttf, fonts-ipafont-gothic, fonts-lato,
fonts-tlwg-loma-otf, fonts-unifont, fonts-wqy-zenhei and xfonts-scalable; most arrive with
`playwright install --with-deps`. The runner resolves `sans-serif`, `system-ui`, `Roboto`,
`Segoe UI`, `Verdana` and `Inter` to DejaVu Sans, `Arial` and `Helvetica` to Liberation Sans,
`monospace` to DejaVu Sans Mono, `emoji` to Noto Color Emoji, CJK to WenQuanYi Zen Hei and Thai to
Loma; the pinned set resolves every family the same way. Several of these fonts are GPL with the
font exception (FreeFont, WenQuanYi, Unifont, Loma), the rest OFL or similar; all allow
redistribution with their license texts. Trimming the set (the CJK and Unifont files are 49 MB of
it) is a later two-way door: re-run the experiment below on the smaller set first.

Chromium bundles its own fontconfig (it is not in `ldd`'s list) and reads `FONTCONFIG_FILE`, so
the host's fontconfig version does not matter either.

**CI change.** The visual job fetches only its own project's baselines from LFS today
(`git lfs pull --include "visual-baselines/<project>/**"` in `.github/workflows/ci.yml`). That
include gains `visual-fonts/**`; so do the merge queue's capture and the `visual-seed.yml`
workflow, and the package's `templates/visual-review.yml` fetches whatever directory the config's
`fontconfig` setting is in. The fonts are 117 MB, cached with the LFS objects: the cache key
hashes the font pointers too, so a run with the fonts already cached downloads nothing.

## 4. The verification experiment

Run before anything lands, against one recent master commit M whose CI visual jobs show every
item `unchanged` (for example the commit of run 37220350543). Compare by hash, not by status:
results.json records each item's `capture` SHA-256 even when it is `unchanged`, and `unchanged`
alone is not byte equality (pixelmatch can call a slightly different image unchanged). The test is
`local.capture == ci.capture`, a jq join on `file`, with no PNG download.

Capture every story (about 1,430 items over five projects); a seeded graphty-element run takes
about 3 min 40 s locally and compact-mantine about 1 min, so the whole set is cheaper than
choosing a sample. Run each arm once with `taskset -c 0-3` and 4 workers (CI's shape) and once
unpinned, to expose anything that depends on core count or speed.

| Arm | Fonts                                             | Storybook                   | Isolates                    |
| --- | ------------------------------------------------- | --------------------------- | --------------------------- |
| A0  | host, as today                                    | CI's artifact from M's run  | current state               |
| A1  | host plus CI's emoji font in ~/.local/share/fonts | CI's artifact               | is it only the emoji font?  |
| A2  | as A1                                             | built locally at M          | local vs CI Storybook build |
| A3  | pinned (CI's snapshotted files)                   | built locally at M          | the chosen setup, locally   |
| A3c | pinned, same files                                | CI build, on a throwaway PR | the chosen setup, on CI     |

A3c runs on a draft pull request carrying the hold label (so Mergify never merges it) whose
ci.yml sets `FONTCONFIG_FILE` on the visual job and carries the font directory; its visual jobs
are re-run twice so at least three runner CPU models are covered. It is closed unmerged.

**Success criteria.** To keep the existing baselines: A3c equals master's baselines for every
item that is stable on CI today. To recommend local previews to the owner as worth looking at: in
A3 and A3c at least 99% of items byte-identical to CI's capture in each project, every mismatch
explained by a named mechanism (never "timing"). Finish on local captures does not wait for a
threshold: the owner has accepted that a mismatch costs a second approval. The numbers, the
per-project local build and capture times and the measured CI font facts go into `design.md`
section 6.

**Watch item.** `graphty-element/src/session/cost/calibrate.ts` and `AiControl.stories.ts` read
`navigator.hardwareConcurrency` (32 locally, 4 on CI). If a story differs because of it, capture's
init script pins it to 4, next to the `navigator.gpu` deletion.

### Results (2026-10-04)

Commit M is master at 22f878576 (CI run 37224508194, whose captures all equal their baselines).
Local captures on the i9-14900KF, compared by `capture` hash with M's CI captures:

| Arm                                               | compact-mantine | graphty-element | graphty | algorithms | layout |
| ------------------------------------------------- | --------------- | --------------- | ------- | ---------- | ------ |
| A0: host fonts, CI's Storybook                    | 1012/1012       | 0/198           | 178/178 | 27/27      | 17/17  |
| A3: pinned, CI's Storybook                        | 1012/1012       | 198/198         | 178/178 | 27/27      | 17/17  |
| A3: pinned, CI's Storybook, `taskset -c 0-3`, 4 w | 1012/1012       | 198/198         | 178/178 | 27/27      | 17/17  |
| A3: pinned, Storybook built locally at M          | 1012/1012       | 198/198         | 178/178 | 27/27      | 17/17  |

With host fonts every graphty-element capture differs: 179 visibly, 168 of them only in the
23 x 29 box at the top right where the toolbar's clipboard emoji is drawn (an empty box locally),
the rest in stories that draw emoji or non-Latin labels, other fonts in panels, or the same emoji
box shifted; 19 more below the threshold. With the pinned fonts all 1,432 items are byte-identical, unpinned and on four
cores, with CI's Storybook build and with one built locally (also with the Nx cache skipped for
graphty-element and compact-mantine). Arms A1 and A2 were not needed: nothing differs to isolate.
`navigator.hardwareConcurrency` (32 here, 4 on CI) changed no capture, so it is not pinned.

A3c: a throwaway draft pull request (#1008, closed) captured in CI with `FONTCONFIG_FILE` set to
the pinned set, on an AMD EPYC 7763 runner. Its merge tree's base was master at ed7820208, and
master's own CI run of ed7820208 (37232345467; host fonts; EPYC 7763, Xeon 6973P-C and Xeon
Platinum 8573C runners) captured the same tree. All 1,462 items are byte-identical between the
two, so pinning changes no CI byte and no baseline needs re-approving. In both runs the same 20
items (10 graphty dark-mode stories, 7 graphty-element layout and label stories, 3 layout
stories) differ from their baselines below the threshold (`unchanged`, 0 changed pixels): they
come from master's code changes between M and ed7820208, not from fonts.

Local capture times with pinned fonts (config workers): compact-mantine 96 to 100 s,
graphty-element 109 to 115 s, graphty 41 to 45 s, algorithms 29 s, layout 10 s; about 4.8 minutes
for all five. Building graphty-element's and compact-mantine's Storybooks without the Nx cache
took 44 s.

A short re-check list (about 20 captures, run with `--stories` after a Playwright bump or a font
change): graphty-element `data--cytoscape-session`, `styles-label--emoji-labels`,
`styles-label--unicode-text`, `styles-label--font-size`, `styles-label--badge`,
`styles-graph--skybox`, `layout-2d--force-atlas-2`, `layout-3d--force-atlas-2`,
`selection--mode-2-d`, `layout-gpu--force-atlas-2-web-gpu`, `ai-control--default`;
compact-mantine (light and dark) `foundations-glyphs--field-glyphs`,
`components-data-display-datatable--right-to-left`,
`components-data-display-datatable--large-dataset`, `components-overlays-menu--context-menu`;
graphty `compact-buttons--action-icon-toolbar`; algorithms `centrality--page-rank`; layout
`layout2d--force-atlas-2`.

## 5. Making a local capture

**What tree.** CI's pull request run builds `refs/pull/<n>/merge` (the head merged into the base
branch tip), not the head. The local capture builds that same tree. If master moves before CI
starts, CI's merge differs; affected items come back undecided because their baseline hash
differs, which is the correct outcome.

**The script.** `tools/visual-preview.sh <pr>` (new, about 40 lines):

- refuses a pull request whose head is not a branch of this repository (never builds a fork's
  code on the development machine);
- takes one `flock`, so only one local capture runs at a time (the machine's shared 4-browser
  cap);
- fetches `refs/pull/<n>/merge` into a dedicated worktree `.worktrees/visual-preview`, reused
  between runs (`git checkout --detach` inside that worktree only; never the main checkout, never
  stash);
- runs `pnpm install --frozen-lockfile`, `visual-review install-browser`, and the affected
  projects' Storybook build commands from `visual-review.config.json`;
- runs `visual-review capture --project <p> --out tmp/visual-review/local/<n>/<p>` for each,
  4 workers; projects are those `nx show projects --affected` lists against master intersected
  with the config's projects, all five when unsure;
- writes `tmp/visual-review/local/<n>/status.json` (`running`, `done`, or `failed` with the step
  and the last lines of its log), which the inbox reads.

**Who starts it.** The review server, not the agents. It already checks GitHub every two minutes
for every open pull request; when it sees a head it has no local capture of, and the pull request
changes a package with a Storybook, it starts the script for it (one at a time, newest push
first), when started with `--local-previews`. Relying on each agent to remember a background step
after every push fails silently; the server sees every push. A capture whose head is no longer
the pull request's head when it finishes is discarded.

Until the server starts previews itself, the agent that pushes runs the script after each push
(the project `CLAUDE.md`, "Visual review"), and the server lists only a preview whose head is the
pull request's current head.

## 6. Reviewing and finishing on local captures

### The flow

1. An agent pushes. Within a minute or two the server starts a local preview.
2. About 6 to 10 minutes after the push the local capture is done; the pull request appears in
   the inbox (section 7) and the notifier (section 8) may tell the owner.
3. The owner opens it. Each project captured locally is labelled "local preview" with the commit
   it built; Accept, Reject and Exclude work exactly as on a CI capture, and decisions are saved
   in the same `tmp/visual-review/state/<pr>.json`, each keyed by the image's SHA-256 and its
   baseline's SHA-256 (`decisionsOf` in `trusted/lib/serve.mjs` already applies a saved decision
   only when both hashes match).
4. **The owner may Finish right away.** Finish's sheet says which projects are local ("2 projects
   from a local capture: CI will check them, and anything CI draws differently comes back to
   you"). Finish signs the record with the passkey and pushes, exactly as today.
5. If CI's capture of the same head lands before the owner finishes, it replaces the local one,
   project by project. Every decision whose image is byte-identical carries over by itself; every
   image that differs shows undecided again.

A Finish may mix projects: those with a CI capture of the head use it, the rest use the local
capture. Every project in one Finish must be a capture of the same pull request head (today's
check is "the same CI run").

### What the record says

The record format keeps its fields; only `subject` describes the capture differently.
`subject.runId` and `subject.runAttempt` are `null` when any project was captured locally, and a
new `subject.local` lists those projects with the merge commit built, the host name and the tool
version. The commit message says "Captured locally at <merge sha>" instead of "Captured by CI run
N". Neither the gate nor `approval.mjs` reads `subject`: the gate replays each record item's path
from one hash to another and checks the signature over the whole record, so a record of a local
capture is verified exactly as one of a CI capture.

### How the unchanged gate handles it

After a Finish on local captures the pull request's branch holds the locally captured PNGs as its
baselines, with a signed record moving each path to that image's hash. Pushing the Finish commit
starts a new CI run (the run of the earlier push is superseded). CI captures the new head and
compares each story with the baseline the branch now holds, as it always does: SHA-256 first, and
pixelmatch at the story's threshold only when the bytes differ.

- **CI draws the same bytes:** every accepted item reads `unchanged`, the record covers every
  baseline change, and the gate passes. Nothing is left to decide. This is the 50-minute case.
- **CI draws something visibly different** (beyond the story's diff threshold): the item reads
  `changed` against the locally approved baseline, and the gate fails, exactly as for any
  unapproved difference. The owner's local approval is never applied to CI's different bytes.
- **CI differs below the story's threshold:** the item reads `unchanged` and passes. This is the
  same tolerance every baseline has between two CI runs today; the gate has never required byte
  identity. The server counts these per project as local-versus-CI byte mismatches and shows the
  count in the inbox's footer, so a project whose local captures drift is visible early.
- **A local capture that failed or was incomplete** cannot be finished, as today for CI.

A tampered or wrong local image cannot pass: the owner approves what they see, and the gate
passes only if CI's own render of the pull request matches it.

### What the owner sees when bytes differ

The server remembers the hashes it finished from local captures. When CI's capture of the Finish
commit shows an item `changed` against a baseline that came from a local Finish, the item is
marked **"CI differs from your local approval"**, the pull request returns to the inbox's ready
list (and counts as newly ready for the notifier), and the diff view shows the image you approved
(now the baseline) beside CI's. Accepting it again is an ordinary CI-capture Finish. If one
project keeps producing these, that is a determinism defect to find and fix in capture, not a
reason to stop local Finish.

### The rule this replaces

`visual-review/README.md` says today that a local preview "is look only: its fonts and graphics
stack are not CI's, so only a CI capture of a pushed commit becomes a baseline", and its
troubleshooting entry "Captures differ from what you see locally" says to let CI's capture become
the baseline. `design.md` sections 1a and 11a say the same, and `accept.mjs` refuses any capture
with `local` provenance or no `runId`.

The new rule: **a baseline may come from a local capture of a pull request's merge tree, made with
the repository's pinned fonts, but it passes the gate only when CI's own capture matches it.** CI
remains the only judge; a local capture is a proposal the owner can approve early. Ad hoc captures
(`capture --stories` into a scratch directory, served with `serve --results`) stay look only: they
are not a capture of a pull request's merge tree, and the page keeps refusing decisions on them.

## 7. The pending-approvals inbox

The review page's landing screen becomes an inbox. It answers one question fast: what is waiting
for me, and what is the quickest thing to clear.

**Ready for you.** Every open pull request with at least one undecided image whose captures are
complete (local or CI) for its current head, sorted by fewest undecided images first, then by how
long it has waited. One row each: pull request number and title, undecided count ("3 images"),
source ("local preview" or "CI"), "CI differs from your local approval (2)" when that applies,
and how long ago it became ready. Tapping the row opens its first undecided image directly, not
the project table. A pull request whose capture is still running for some projects shows "2 of 3
projects ready" and is listed after the complete ones.

**Not ready.** Pull requests whose capture failed, each with its reason in one line: "local
preview failed: Storybook build (graphty-element)", "CI capture failed" with **Job log**,
"incomplete: 40 of 198 stories", "artifact expired". Retry where it applies. These are for agents
to fix; they never notify.

**Waiting and done.** One collapsed line each: "4 capturing (2 local, 2 in CI)", "6 with nothing
to decide". Expanding shows today's targets cards, with their badges and project tables, so
nothing the current targets screen offers is lost.

**Count and freshness.**

- The page title is "(3) Visual review" with the number of ready pull requests, and the favicon
  is an inline SVG with the same number on it, so a pinned tab shows it.
- On a home-screen web app, `navigator.setAppBadge(n)` sets the icon badge where the browser
  allows it (on iPadOS it needs notification permission; the notifier in section 8 does not
  depend on it).
- The page asks the server for the inbox every 30 seconds while visible, and at once when it
  becomes visible again (`visibilitychange`), so switching to it shows the current list. The
  server answers from its cache; it checks GitHub every two minutes on its own and reads the
  local preview status files on every request, so a finished local capture appears within 30
  seconds.
- "Updated 40 s ago" and **Refresh** stay.

**iPad and home screen.** The inbox rows are full-width, at least 44 px tall, readable at iPad
portrait width. The page gets a web app manifest (`display: standalone`, name "Visual review",
an icon) and the matching `apple-mobile-web-app-capable` and `apple-touch-icon` tags. The session
token stays in the address fragment, and the manifest has no `start_url`, so "Add to Home Screen"
keeps the address it was added from, token included; this is verified on the owner's iPad before
the work is called done. The page also keeps the token in the device's local storage, so a link
without a token (the notifier's) opens on a device that has used the page before.

## 8. The quiet notifier

### How notifications are sent today

The owner's Claude Code hooks call `~/.claude/scripts/claude-notify.sh <status> <message>
[title]`, which posts to Pushover with credentials it reads from `PUSHOVER_USER_KEY` and
`PUSHOVER_APP_TOKEN` (environment first, its own defaults otherwise). The Stop hook sends one when
an agent's final line starts with `ACTION NEEDED:`, and a Notification hook sends permission
prompts. Every agent session uses the same Pushover application, so a visual review looks like any
other ping, and agents that end with "ACTION NEEDED: approve the visual review for #812" add to
the noise.

### The design

The review server sends the notification, because it is the one process that knows when a pull
request becomes ready.

- **When.** A pull request becomes _ready_ when it enters the inbox's "Ready for you" list
  (complete captures, at least one undecided image), including a return after a local Finish that
  CI disagreed with. It notifies once per entry: further pushes while it is still waiting in the
  list do not notify again; it can notify again only after it has left the list (decided,
  finished, closed, or fallen to "not ready") and come back.
- **Debounce.** The first ready pull request notifies at once (the owner wants to approve as soon
  as possible). Any that become ready within the next 10 minutes are held and sent together as
  one message when the 10 minutes end. Nothing new, nothing sent.
- **Never for:** CI running or finishing, failed or incomplete captures, downloads, flakes,
  merges, or anything already notified.
- **The message.** Title "Visual review: 3 ready". Body: one line per pull request, fewest images
  first ("#812 Fix label padding: 2 images"), then the inbox's address without the session token
  (the token never goes through Pushover). Plain text.
- **Process.** The notifier is its own small process, `visual-review notify`, run beside the
  server from the same checkout. The server writes its inbox to `<workDir>/state/inbox.json` after
  every check of GitHub (every two minutes); the notifier reads that file every 30 seconds and
  never calls GitHub. An inbox older than ten minutes (the server stopped) changes nothing.
  "Once per entry" is kept per pull request and captured head, so every push announces again once
  its new capture is ready.
- **State.** The notified set and the time of the last message are kept in
  `<workDir>/state/notify.json`, so a restart neither repeats nor loses one. A message whose
  command fails is not recorded as sent and is tried again 30 seconds later.
- **Delivery.** The package stays generic: `notify --command '<json argv>'` (or the
  `VISUAL_REVIEW_NOTIFY` environment variable) names a program and its arguments, with `{title}`,
  `{message}` and `{url}` replaced, run without a shell. On the development machine it is started
  through servherd as `visual-review-notify`, with
  `VISUAL_REVIEW_NOTIFY='["/home/apowers/.claude/scripts/claude-notify.sh","waiting","{message}","{title}"]'`,
  which reads the credentials the same way the existing hooks do. Neither process reads or stores
  a credential, and nothing under `~/.claude` changes.
- **A quieter channel (optional, owner).** Pushover gives each application its own sound and
  priority. If the owner creates a second Pushover application named "Visual review", passing its
  token as `PUSHOVER_APP_TOKEN` in the review server's environment only (one line in the servherd
  start, set by the owner) gives visual reviews their own sound, so the owner can silence the
  general agent channel and keep this one. `claude-notify.sh` already prefers the environment
  value, so no script changes.
- **Removing the duplicate source.** The project `CLAUDE.md` gains a rule: agents do not end with
  `ACTION NEEDED:` for a visual review; the review server notifies.

### Alternatives considered

| Idea                                                                                       | Verdict                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only tune the existing Pushover hooks (lower priority, dedupe)                             | Rejected as the whole answer: it leaves no list to pull up, and the noise comes from many agent sessions the hooks cannot tell apart. Partly adopted: the separate application above.                                      |
| Only the inbox, refreshed by the owner                                                     | Adopted, but not alone: the owner would have to keep checking, and the goal is approving minutes after a push.                                                                                                             |
| GitHub review requests or a "Visual review: pending" commit status with a saved search     | Rejected: GitHub's mobile notifications already carry CI noise, they cannot show local previews (which never touch GitHub), and a search is slower to open than the inbox.                                                 |
| Web Push from the review page (home-screen web app notifications on iPadOS 16.4 and later) | Deferred: no third-party service, but it needs VAPID keys, payload encryption in the server, and a permission prompt per device, while Pushover already reaches the owner's phone and iPad. Revisit if Pushover goes away. |
| A Discord channel with one message per ready pull request                                  | Rejected: the Discord bot runs inside Claude sessions, not as a service, and it is one more place to look.                                                                                                                 |
| An email digest                                                                            | Rejected: too slow for "approve as soon as possible".                                                                                                                                                                      |
| An iOS widget (Shortcuts or Scriptable) polling a count                                    | Deferred: the inbox's JSON (`/api/inbox`, token required) makes it a small later addition if the title badge and notifications are not enough.                                                                             |

## 9. Changes by file

- `visual-fonts/` (new, LFS): font files, licenses, `fonts.conf`. `.gitattributes`: LFS rules
  for it.
- `visual-review.config.json`: `"fontconfig": "visual-fonts/fonts.conf"`.
- `visual-review/trusted/lib/config.mjs`: read and validate `fontconfig` (optional).
- `visual-review/capture/capture.mjs`: launch Chromium with `FONTCONFIG_FILE` and a temporary
  `XDG_CACHE_HOME` when configured; refuse LFS pointer files; record `environment.fonts`; pin
  `navigator.hardwareConcurrency` only if section 4 needs it.
- `.github/workflows/ci.yml` (visual job and the merge queue's capture), `visual-seed.yml` and
  the package's `templates/`: add the font directory to the LFS pull. Coordinated with the
  concurrent CI work on the `ci/*` branches.
- `tools/visual-preview.sh` (new): section 5.
- `visual-review/trusted/lib/serve.mjs` and the page: local captures of a pull request's merge
  tree as reviewable projects; starting previews with `--local-previews`; the inbox and
  `/api/inbox`; the notifier and `--notify-command`; the "CI differs from your local approval"
  mark; the per-project byte-mismatch count; manifest, icons and the title and favicon count.
- `visual-review/trusted/lib/accept.mjs`: accept a project captured by the preview script
  (`local` provenance with a merge commit and pinned fonts), require one head across projects
  instead of one CI run, write `subject.local`, and the commit message. Ad hoc `--results`
  captures stay refused.
- Not changed: `visual-review/trusted/gate.mjs`, `visual-review/trusted/lib/approval.mjs`,
  `visual-review/passkeys.json`.
- Docs: `visual-review/README.md` (the rule in section 6, the inbox, the notifier, the
  `fontconfig` setting), `design.md` sections 1a, 6 and 11a, and the project `CLAUDE.md` (its "Visual review"
  section's look-only sentence, and the notification rule in section 8).

## 10. Ordered steps

1. Measure CI's font resolution on a throwaway draft pull request with the hold label: `fc-match`
   for every family in `design.md` section 6 item 9 and every `font-family` the stories use, the
   matched files and their SHA-256, `dpkg -l 'fonts-*'`; upload the files as an artifact.
2. Run arms A0 to A2 locally on commit M (no repository change).
3. Build `visual-fonts/` from step 1 in a scratch directory; run A3 locally and A3c on the
   throwaway pull request; record the results in `design.md`. Close it unmerged.
4. If a non-font difference remains, find its mechanism; only if it is a host library, propose
   the container option to the owner.
5. Land `visual-fonts/`, the config setting, capture's use of it and the CI LFS include. Push a
   no-op pull request after it and confirm every project reads `unchanged`. (A pull request runs
   the base branch's capture code, so this is the first one that uses the pinned fonts.)
6. `tools/visual-preview.sh`; run it on two real pull requests and compare its hashes with their
   CI captures.
7. Review server: the inbox (the default screen), local captures as reviewable projects, Finish
   on them, the "CI differs" mark.
8. The notifier, and starting previews from the server.
9. Docs and the `CLAUDE.md` rule.
10. Use it for two weeks; count local Finishes and how many CI confirmed with nothing to decide.

Steps 6 to 9 do not wait for the experiment's 99% figure; without pinned fonts the local captures
differ more often, which only costs second approvals.

## 11. Time saved

From 18 recent successful ci.yml runs (2026-10-04), minutes after the run was created: the build
job ends at about 11 (6.5 to 15.6); graphty-element's visual job at about 27 (17.8 to 30.1),
compact-mantine's at 15.2 to 24.5, graphty's at about 11 to 18, algorithms and layout about 1.5
after the build. The server polls every 2 minutes and then downloads, so the owner sees a full
pull request at about 25 to 32 minutes.

Locally a preview is ready about 6 to 10 minutes after the push (graphty-element captures in
about 3 min 40 s, compact-mantine in about 1 min, plus the affected Storybook builds, estimated at
2 to 5 minutes and measured in step 6).

- Reviewing locally, finishing on CI: the owner reviews about 20 minutes earlier, and Finish is
  one click once CI lands.
- Finishing locally, CI agrees: Finish about 10 minutes after the push; one CI run (about 25 to
  30 minutes) takes the pull request to the merge queue. About 45 to 50 minutes saved per
  reviewed pull request.
- Finishing locally, CI disagrees: the owner approves the differing images again on CI's capture;
  no worse than today apart from the second look.

## 12. Interaction with the CI/CD plan

The CI/CD redesign under way at the same time (`design/ci/ci-cd-plan.md`) keeps screenshots on
every push, approval before merge-queue entry, and batches that re-verify captures. This design
changes none of them: CI still captures every push and the gate still judges CI's captures; a
local Finish only moves the owner's signed approval earlier. The queue's capture runs the same
tool, so it also gets the pinned fonts, which makes queue captures independent of runner-image
font updates. No new CI jobs; the only CI edit is the LFS include in section 3.

## 13. One-way doors and risks

**One-way doors**

- Font binaries in this repository's Git LFS history (117 MB: the runner's 88 font
  files, section 3, with their licenses). Decided by the owner on
  2026-10-04: in this repository, not in the published package.
- The changed README rule (section 6). Decided by the owner on 2026-10-04.

Everything else (the server, the inbox, the notifier, the script, the docs, the
`hardwareConcurrency` pin) is an edit to undo.

**Risks**

- The font snapshot does not reproduce CI's resolution exactly: some baselines change. A3c finds
  it before anything lands; the fallback is one planned re-baseline.
- A difference that is not fonts (core count, a story reading machine speed): the experiment
  measures it; the fix goes in the story or capture's init script, not in a tolerance.
- Master moves between the local and CI capture: affected items come back undecided. Correct; a
  second look.
- Load on the development machine: one local capture at a time, 4 workers, within the shared
  browser cap.
- The review server is not running: no previews and no notifications; CI's flow is unaffected.
  servherd keeps it running.
- Notifications become noise again: the debounce interval is a server option, and the
  once-per-entry rule is the guard; if the owner still finds it noisy, the next step is a daily
  quiet window in the server, not more filtering in the hooks.
