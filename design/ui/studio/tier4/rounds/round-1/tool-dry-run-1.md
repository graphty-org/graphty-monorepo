# Tier 4 round 1: tool dry run 1

Date: 2026-10-30. Build: 79ed770292, served from the main checkout's
`.study-builds/tier4-r1d3-79ed770292` (the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs`
at worktree commit 9dfb8b9321. Every session started for these checks is under the main checkout's
`tmp/design-studio/tier4/r1/tool-check-1/` (`gate/`, `replay/`, `detours/`, `prove/`); nothing was started in the
studio's files, and no file of the studio, the tool or the build was changed.

## Result

Not ok. Checks 1, 3, 4, 5 and 7 pass; check 2 passes with one wording defect in the tool's refusal; check 6 fails: bar 4's end-state check, bar 5's scripted axe walk of the tier 4 screens and bar 7's step count have no script, and the wording check cannot run without that walk. The round's gate also refuses the round today (section 6).

| #   | Check                                   | Result     |
| --- | --------------------------------------- | ---------- |
| 1   | Browser gate                            | pass       |
| 2   | Matcher refuses an ambiguous name       | pass, with one wording defect |
| 3   | File drop on the start screen           | pass (delivered case only) |
| 4   | Detour walks replay without a tool error | pass (26 of 26 matched) |
| 5   | Participants cannot reach facilitator files | pass |
| 6   | Every script-scored bar has a working script | FAIL |
| 7   | Fast paths                              | pass |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`). A one-second
count of the machine's `real.mjs --serve` and `--warm` processes ran for 400 seconds, through the starts, the ends
and the replays and self-test that followed: its highest reading was 8 (`gate/poll.log`). Eight sessions started
within 12 seconds; s05 and s06 printed `waiting for a free browser slot ...` and started 30 seconds later, once
ends freed slots. `BROWSER_SLOTS=17 with-browser.sh true` exits 2 with "BROWSER_SLOTS must be 1 to 16"; 16 runs.
All ten sessions were ended, each `--end` exiting 0.

## 2. Matcher

On the start screen, "Samples" names both the top bar's link and the card's button.

- `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls, so the step did nothing;
  name one: "Samples#1" button "Samples", "Samples#2" link "Samples"`.
- `--click "Samples#1"` did nothing either: `ambiguous: "Samples#1" picks by position among different kinds of
  control ...; name it by kind: "role=button:Samples", "role=link:Samples"`.

Neither resolved to the first match. Defect: the first refusal offers `"Samples#1"` and `"Samples#2"` as the way
to name one, and the tool then refuses exactly that pick, because the two are different kinds of control. A
participant who follows the first message's advice spends a second step on a second refusal. When the candidates
differ in kind, the first message should offer the `role=<role>:<name>` forms instead.

## 3. File drop

`--drop florentine.gml` on the start screen (session `gate/s06`) printed `dropped the file florentine.gml on the
middle of the window (empty canvas); the page took it`, and the next screenshot shows the florentine network open
(15 nodes, 20 edges). The drop goes through the browser's own input path (DevTools `Input.dispatchDragEvent` with
the real file), not page-made events. The "not delivered" branch (a page that does not take the drop prints `the
drop was not delivered ...`) is in the code but was not reached: no screen of this build refuses a dropped file,
so it was not exercised live in this check.

## 4. Detours

Every task half's commonest detours, as its dry-run report lists them, were replayed with `real.mjs --replay
<walk> <new folder> --end-on-diverge` on the frozen build, four at a time through the gate, into `detours/<half>/`.
For each half the newest detours walk of the dry run was taken (where a half's detours are several walks, each
of them):

| Half | Walks replayed (main checkout's `tmp/design-studio/tier4/`) |
| ---- | ------------------------------------------------------------ |
| T60A | `r1d3/pilot/T60A/detour-server-c`, `detour-open-file-c`, `detour-menu-paste-c` |
| T60B | `r1d3/pilot/T60B/rp8-detours` |
| T61A | `r1d3/pilot/T61A/y2-d1-main-menu`, `y2-d2-start-screen` |
| T61B | `r1d3/pilot/T61B/n2-menu-open`, `n3-flows-first`, `n4-quick-actions`, `n5-drop` |
| T62A | `r1d2/pilot/T62A/j3-detour-fields` |
| T62B | `r1d3/pilot/T62B/w2-detours` |
| T63A | `r1d3/pilot/T63A/detours-4` |
| T63B | `r1d3/pilot/T63B/r6-detours` |
| T64A | `r1d3/pilot/T64A/y-detours` |
| T64B | `r1d3/pilot/T64B/detour-style-table-c` |
| T65A | `r1d3/pilot/T65A/y-s2-detours` |
| T65B | `r1d3/pilot/T65B/n5-detours` |
| T66A | `r1d3/pilot/T66A/w2-detours` |
| T66B | `r1d3/pilot/T66B/z14-T64A-detours` |
| T67A | `r1d3/pilot/T67A/x2a-table`, `x2b-source`, `z2c-header` |
| T67B | `r1d3/pilot/T67B/q12a-T64A-detours` |
| T68A | `r1d3/pilot/T68A/w2-detours` |
| T68B | `r1d3/pilot/T68B/z04-detours-3` |

All 26 exited 0 with `replayed all N steps; every check point matched; session ended` (6 to 61 steps each, 619
in all), with no script error, console error, failed request, miss or refusal. Every one drew on the NVIDIA card.
Steps the detours use and the replays exercised include uploads to the file chooser, a file drop, save and
Control+S, the export dialog, right-click menus, the find box and keyboard chords.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier4/rounds/round-1/sessions/r1-s05` (T62 A, Grace) exited 0 and wrote
  `tmp/studio-sessions/tier4/rounds/round-1/sessions/r1-s05/briefing.md` in the worktree, outside the studio's
  files; the folder holds only that file. It holds Grace's two persona files (without the "Why this persona
  exists" and "Evidence limits" sections written for the study team), her history from `roster.md`, the T62 A
  prompt word for word, the start command (`REAL_DIST=<frozen build> REAL_TIER=4 ... --start <her folder>
  setup:pantries.txt`) and the tool's "A session", "Steps" and "Names, dialogs and lists". It holds no answer
  key, avoided-words list, follow-up, facilitator note, criteria, the B prompt, another task, or another
  participant's name.
- `real.mjs --start .../tier4/rounds/round-1/sessions/r1-s05 setup:pantries.txt` was refused, exit 2, naming the
  folder to brief and start instead; nothing started.
- `real.mjs --prove` (run with `REAL_PROVE_DIR` under `prove/`): "a participant transcript that opens tasks.md
  voids the session, by name" and "an end copies the session into the round's folder with the leak check beside
  it" pass, as do the round leak check's three checks and the gate's refusal of a round with no gate evidence.

## 6. Script-scored bars

FAIL. Of the bars and before-session items in `../../criteria.md` scored by a script, check or count, only the
wording check has a script that exists; the others name a script that does not exist or no script at all.

- **Bar 4, the end-state check** ("a script run over every session's `data.json`": card counts against what the
  element shows, join chips against node and edge counts, export row counts). No such script exists in
  `tool/`, and `real.mjs --end` writes no `data.json` (no code in `real.mjs` writes one; no `data.json` exists under
  any tier 4 walk). Before-the-first-session item 4 is therefore not met, and the bar's severity 4 cases
  ("a filter that hides more than it says", "an export that drops rows") have no check. The criteria do not name
  the script's file.
- **Bar 5, the scripted axe walk of the tier 4 screens** (both sizes, both themes). `bars.mjs` measures tier 2's
  screens by default and tier 3's with `--tier 3`; it has no tier 4 mode and no walk of the web address box,
  Sources "+", the join screen, Fields "+", the Filters picker, the issue list or Export on Data. No tier 4
  `bars.json`, axe result or `vocabulary.json` exists anywhere under the main checkout's
  `tmp/design-studio/tier4/` or the round's folder.
- **Before-the-first-session item 5, the wording check.** `wording.mjs` exists and its `--self-test` passes (every
  planted echo caught), but it needs the `vocabulary.json` of the tier 4 screen walk above, which no script
  produces, so it cannot run on the frozen build.
- **Bar 7, cost on core tasks** ("the step logs, against each path's step count"). No script counts a session's
  steps against `answers.md`'s path counts. `score.mjs` exists and its self-test passes, but it scores tier 3's
  bars (time to the first styled graph, the T47 route line) and reads nothing tier 4 measures.
- **The gate.** `real.mjs --gate rounds/round-1` (run read-only; it wrote nothing) refuses the round on two counts
  the dry run still owns: it looks for the pilot walks under the main checkout's
  `tmp/design-studio/tier4/round-1/pilot/<half>/`, where none are (the dry run's walks are under `r1d1` to
  `r1d3`), and it wants `rounds/round-1/bars/bars.json` from a `bars.mjs` run, which for tier 4 would be a tier 2
  run measuring none of tier 4's screens. The gate also sorts walks by name (`detour`, `keys`/`keyboard`), and
  several of the dry run's detour walks are named otherwise (`T67A/x2a-table`, `T61B/n4-quick-actions`), so they
  would count as success walks.

The scripts that do exist were checked against planted failures: `wording.mjs --self-test`, `keydraw.mjs
--self-test` and `score.mjs --self-test` each exit 0 with every planted case caught. None of the three reads a
tier 4 measure on the frozen build.

## 7. Fast paths

- **GPU renderer.** Every session these checks started (the ten gate sessions, the single replay and the 26
  detour replays) records `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER ...))"`
  in its `session.json`; none is SwiftShader.
- **Warm takeover.** After the gate sessions were ended with `REAL_DIST` set, two warm browsers were waiting; the
  next `--start` (the replay below) logged `took over warm browser 1772819 (warm for 112 s)` in its `session.log`,
  and ten of the 26 detour replays also took one over.
- **Replay.** `real.mjs --replay` of the main checkout's `tmp/design-studio/tier4/r1d3/pilot/T60A/success-c`
  (T60 A's success path by web address, 8 steps) into `replay/T60A-success-c` matched every check point and ended
  the session, exit 0.
- **`--prove`** on the frozen build: 94 checks, `every check passed`, exit 0. Among them "a batch stops at its first
  miss", "a replay of an unchanged route matches every check point and ends the session", "a replay stops at the
  first step whose check points differ, and leaves the session open there", "a rewalk replays every route" and
  "the next start of the same build takes over the warm browser, with the app already open".
- `node --test design/ui/studio/tool/with-browser.test.mjs`: 5 of 5 pass.
