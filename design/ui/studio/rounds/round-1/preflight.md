# Round 1 preflight: the tier 1 study on the real graphty app

Checked on 2026-10-06 against the nine items under "Before a round may start" in `criteria.md`,
on the studio worktree at commit 9d6598eea (graphty 0.8.53, build stamp `9d6598eea3e9`).

## Verdict

**FAIL: round 1 may not start yet.** Eight of the nine items hold. Item 2 fails: the study tool
has no screen-reader mode, so the blind participant's 7 sessions cannot run as the criteria
define them. Nothing else blocks; the other 49 sessions are ready.

What unblocks it: the Design Engineer adds the screen-reader mode to `tool/real.mjs` (what it must
do is under item 2) and its `--prove` checks, including a planted `--click` that must be refused.
Then item 1 is re-checked (the app must still be commit 9d6598eea's, or every reference value is
recorded again), and the round starts.

If the studio decides instead to start the 49 sighted sessions while the mode is built, the plan
already runs the screen-reader sessions last (`plan.md`); that decision must be written into
`plan.md` with its date, and the screen-reader sessions must never be run with screenshots.

## Re-check before the re-runs (2026-10-06, evening)

- Item 1: the worktree is now at commit 452285142 and `graphty/dist` was rebuilt from it at
  16:24. The change between 9d6598eea and 452285142 is one header word in the inspector and an
  API report line; the re-pilot of every task on 452285142 reached every end state with the same
  reference values. PASS on the new commit.
- Item 2: still FAIL. No screen-reader mode in `tool/real.mjs`; Morgan's 7 sessions stay blocked.
- Item 9: every frozen file's SHA-256 still matches the list below. PASS.
- New, outside the nine items: the session prompt does not point at the studio's persona files
  (Sam's is not found at all), and more session agents ran at once than there are browser
  slots, so 9 sessions ended without running. Both are fixes to the runner, listed in `plan.md`.

## The nine items

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | The build under study is this worktree's commit, rebuilt; the commit is in every `session.json` | PASS | HEAD 9d6598eea; `graphty/dist/index.html` carries build stamp `9d6598eea3e9 graphty@0.8.53`; no uncommitted change under `graphty/` or `graphty-element/`; every `real.mjs` start prints and records the commit (checked on three setup starts today). Re-check at the start of the round: other agents rebuild this worktree. |
| 2 | `real.mjs --prove` prints only `ok`, and the proof includes the screen-reader mode | **FAIL** | `--prove` passed all 23 of its checks today ("every check passed"). But the tool has no screen-reader mode at all: no flag withholds screenshots from the participant, `--click`, `--click-at`, `--hover` and `--drag` are never refused, and after `--key` or `--type` it prints neither the focused control nor live-region text. The proof therefore contains no screen-reader checks. Blocks the 7 sessions of Morgan (r1-s50 to r1-s56). |
| 3 | Every success path and every keyboard path runs on the build as a script and ends on its success state | PASS | Success paths: the re-pilot of every task on commit 9d6598eea reached every end state by the answer key's path (`rounds/r0/pilot/<task>/pilot.md`, 14 tasks, both datasets where there are two). Keyboard paths, keys and typing only, reached their end state for T5, T6, T9 (Les Miserables), T10 (both datasets), T12 (both), T14 and T15 (Les Miserables, 118 keys); on the own file, opening by Control+o and ranking were walked by keys, the rest uses the same controls as Les Miserables. Recorded in `answers.md` with key counts; runs in `tmp/researcher/keypaths*.out` and `tmp/researcher/kb-T15B/`. The three setup files start cleanly (`tmp/researcher/setupcheck-*`). |
| 4 | Every reference value recorded on the commit under test; none blank | PASS | `answers.md`, "Reference values": every ranking the Analyze list offers on Les Miserables, Florentine families and friends.csv; Louvain's six groups, sizes, modularity and all 20 members of the largest group, identical on 3 of 3 fresh loads; the label statements for every dataset at the default window. No "(rehearsal)" is left. |
| 5 | Wording check: the build's text dumped on every screen a success path reaches; every word a prompt shares with it listed; the script fails on a planted echo | PASS | `tmp/researcher/wording-dump.mjs` dumped visible text and accessible names of 45 screens; `tmp/researcher/wording-check.py` refuses to run on fewer than 30 screens or 16 prompts, catches a planted prompt ("analyze", "export", "save", "picture") and lets function words through. One echo was reworded (T5's "file", the word of its target "Open project or file..."); every other shared word is kept with its reason in `tasks.md`. |
| 6 | Persona files for Dev, Ruth and Grace strengthened from public sources; Nadia's checked; Sam's written | PASS, with a limit | New studio files `personas/class-project-student.md` (Dev), `data-journalist.md` (Ruth), `nonprofit-operations-analyst.md` (Grace), about 8 KB each against 4.5 KB, with sources read directly, a voice, abandonment triggers and fuller rules for playing them; `keyboard-only-sam.md` is new. Nadia's 9 KB file has a voice, counterweights, behaviour rules and sources: kept. Limit: the four files have not had the skeptic review the older files had, and are still about a third of the 20-40 KB files, so Dev, Ruth and Grace carry 6 sessions each against Elena's and Tom's 7. |
| 7 | The tool can close the tab and reopen the same browser storage (T14) | PASS | `real.mjs --reopen` reopened the saved project from Recent projects in the re-pilot (`rounds/r0/pilot/T14/09.png`, `10.png`); `--prove` checks it. |
| 8 | The exported image has a key (graphty-element issue #133) before T13 and T15 run | PASS | The re-pilot's images carry "Color: Communities" (T13) and "Size: Influence" with "Color: Influence" (T15, both datasets) and pass the picture checklist (`rounds/r0/pilot/T13/pilot.md`, `T15/pilot.md`). The keyboard walk of T15 downloaded the same image. |
| 9 | Tasks and criteria frozen; a new round folder; participants get only the prompt and their persona file | PASS | `rounds/round-1/` is new. The frozen files' SHA-256 are listed below; a session may start only if they still match. Participant rules are in `plan.md`. |

## Frozen files (SHA-256 at the end of this preflight)

Recompute with `sha256sum criteria.md tasks.md answers.md roster.md personas/*.md` in
`design/ui/studio/` (add `rounds/round-1/setups/*.txt`). A mismatch means the files changed after the freeze: stop and find out why.

```
c859230597d1da0679dc8a1422b795a1cdadc5a26b592316e6ba4d129d9e5000  criteria.md
d470d46d2e5296fa6183d120dc5788177f502a23b65c33d35bb9aea392c401e9  tasks.md
a2e7e7a97079b211e2c8ca263d58f0ab495e5de38271be670a38f1376e07e83c  answers.md
2b8155c7ffb9b3d37907534b81940b3621b40428f0ab264f97e7b2e5b5b125cb  roster.md
3a0a87789c5bff210e7c7032a1abebd2b0f95306e8ea1f484905e56c5ad6a0f3  personas/class-project-student.md
e24c20183436e7314ecda7d44e20fb99934c570a966bddea173daf9d091c2b37  personas/data-journalist.md
fb41423b1b958006dc9d5ee98f7077f4230159e26d7fb2c2fa6c43fffd4b950e  personas/keyboard-only-sam.md
05745739eb0bae0edfc52c93634afd4fd291d2234777d30a2ff9f2ec2eded954  personas/nonprofit-operations-analyst.md
df1d489610c065b31d58411caa6ef20630164dcda04ad12685152aef84e73c8c  rounds/round-1/setups/T13.txt
fe9245f07cf05c9f1ca874aa29a908a9bfb886776450b0c31240492ab0517453  rounds/round-1/setups/T14.txt
03939df715d4a00fdbee3ba0947670c35fc4443dacfcc2a32bdd091d3de36f18  rounds/round-1/setups/T7-B.txt
```

## Found while checking (none blocks the round)

Each is reported to whoever owns the fix. A defect here may show up in sessions; graders record it
as what a user meets (bar scores include build-decided sessions).

- **Focus falls to the page body** (accessibility, bar 8) after: answering the usage card by
  keyboard, adding a Size line, choosing a size attribute, choosing a label attribute, exporting
  an image, Close project, reopening a project, and a refused file. A keyboard user then starts the
  Tab walk again from the top. Also, the workspace's Tab cycle passes through the page body between
  "Resize inspector" and "Main menu".
- **A finished run is not announced** (accessibility, bar 8): the live region says "PageRank added,
  running" and keeps saying it; nothing says the run finished. Binding a size announces nothing.
- **A Top 10 can list two names, or none** (app or graphty-element): it stops before a tie it cannot
  fit. friends.csv's Connections lists only Ava and Ivan; Core depth and How tightly knit list
  nobody on Les Miserables and friends.csv. A heading that says ten above two names is a count the
  screen does not keep (bar 5 risk on T7 if a participant ranks by Connections).
- **Two color keys at once** (to check): after Louvain is run on a graph that already has an
  Influence run, the screen text holds both "Color: Communities" and "Color: Influence". If the
  drawing shows only one of them, the legend disagrees with the drawing (bar 5). Seen in text only,
  not yet on a screenshot.
- **Analyze did not take typing after a run row was clicked** (to reproduce): in a scripted run,
  Escape then Shift+A after clicking a run row in the outline added no new run; clicking the
  Analyze button worked. Not reproduced by hand; T15 and T9 need only one run.
- **Known from the re-pilot and expected in sessions:** the Overview's direction line reads
  "Undirected, from the file: directed 0" with its label squeezed out; Members lists the first 10
  of 20; a reopened run loses its count (graded as a match in T14); on friends.csv the 3D
  perspective makes Farah, the top Influence, look smaller than Ava (a `meaning-wrong` risk on T9
  and T15 that is the build's, not the participant's); "No crossings" in Layout silently does
  nothing (bar 4 candidate in T11); the tool's hover can print the previous tooltip (graders check
  the screenshot, not the printout).
- **The study harness's own picker stand-in** (`tmp/researcher/lib.mjs`) failed to open friends.csv
  by keyboard where `real.mjs` succeeded; that was the harness, not the app.
</content>
</invoke>
