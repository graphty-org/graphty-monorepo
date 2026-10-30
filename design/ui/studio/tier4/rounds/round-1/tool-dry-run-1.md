# Tier 4 round 1: tool dry run 1

Date: 2026-10-30. Build: 79ed770292, served from the main checkout's
`.study-builds/tier4-r1d3-79ed770292` (the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs`
at worktree commit a003550937. Every session started for these checks is under the main checkout's
`tmp/design-studio/tier4/r1/tool-check-1/third-run/` (`gate/`, `match/`, `drop/`, `detours/`, `replay/`,
`bars-dark/`, `prove/`, and the stand-in and planted copies named below); nothing was started in the studio's
files, and no file of the studio, the tool or the build was changed. Briefing one session (check 5) rewrote that
session's `briefing.md` under the worktree's `tmp/studio-sessions/`.

## Result

Ok: all seven checks pass. Two small tool defects remain, and the round still meets one known build finding
that fails bar 5 (see "Problems").

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | pass (26 of 26 match, 619 steps) |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass |
| 7   | Fast paths                                   | pass |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`). A
one-second count of the machine's `real.mjs --serve` and `--warm` node processes ran through every check below
(`gate/poll.log`, 1052 readings): its highest reading was 8, reached 523 times, never 9. Eight sessions started
(two by taking over a warm browser); s05 and s10 printed `waiting for a free browser slot ...` and were still
queued, with their tickets in the pool's `queue/` folder, after 400 seconds. Once two sessions were ended, both
took the freed slots within seconds. `BROWSER_SLOTS=16` runs; `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each make
`with-browser.sh` exit 2 with "BROWSER_SLOTS must be 1 to 16". All ten sessions were ended, each `--end` exiting 0
(`gate/exits.txt`), and no session socket or `--serve` process was left afterwards.

## 2. Matcher

On the start screen, "Samples" names both the top bar's link and the card's button.

- `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls, so the step did nothing;
  name one: "role=button:Samples" button "Samples", "role=link:Samples" link "Samples"`.
- `--click "Samples#1"` and `--click "Samples#2"` each did nothing: `ambiguous: "Samples#1" picks by position
  among different kinds of control, so the step did nothing; name it by kind: "role=button:Samples",
  "role=link:Samples"`.

Neither resolved to the first match. A control's own name is no longer refused because a dialog around it holds
the same words: in the Web API server form, `--click Endpoint`, `--click Mapping` and `--click Kind` each acted on
the field (dry run 2 saw each refused, with the whole form offered as a second candidate). `node --test
tool/match.test.mjs` passes 2 of 2 ("an exact control name wins over a dialog, heading or card whose words
include it"; "a replay compares a refusal by what was refused and the candidates, not its wording"), and
`--prove` passes its planted position pick between the Attribute list's option "weight" and the Data panel's row
"weight", which must be refused.

## 3. File drop

`--drop florentine.gml` on the start screen (`drop/`) printed `dropped the file florentine.gml on the middle of
the window (empty canvas); the page took it`, and the next screenshot shows the florentine network open (15
nodes, 20 edges). The drop goes through the browser's own input path, not page-made events. No screen of this
build refuses a dropped file, so the "not delivered" message was not reached live; `--prove`'s planted page that
takes no file is reported as `the drop was not delivered` (check passes).

## 4. Detours

The same 26 walks as the earlier tool checks (each task half's newest detours walk of the dry run, as its
reports list them) were replayed with `real.mjs --replay <walk> <new folder> --end-on-diverge` on the frozen
build, four at a time through the gate, into `detours/<half>/`:

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

All 26 exited 0 with `replayed all N steps; every check point matched; session ended`, 619 steps in all, with no
script error, console error, failed request, miss or tool error. The 8 walks that diverged in dry run 2 only
because the tool's refusal wording had changed now match as recorded: the replay compares a refusal by what was
refused and the candidates offered. Uploads to the file chooser, a file drop, save and Control+S, the export
dialog, right-click menus, the find box and keyboard chords are among the steps replayed.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier4/rounds/round-1/sessions/r1-s13` (T67 A, Grace) exited 0 and wrote
  `tmp/studio-sessions/tier4/rounds/round-1/sessions/r1-s13/briefing.md` in the worktree, outside the studio's
  files; the folder holds only that file. It holds Grace's two persona files without the sections written for
  the study team ("Why this persona exists", "Evidence limits"), her history from `roster.md`, the T67 A prompt
  word for word, the start command (`REAL_DIST=<frozen build> REAL_TIER=4 ... --start <her folder>
  setup:pantries.txt`) and the tool's "A session", "Steps" and "Names, dialogs and lists". It holds no answer key,
  avoided-words list, "Kept on purpose" line, detours table, follow-up, facilitator note, criteria, the B prompt or
  another participant's name.
- `real.mjs --start .../tier4/rounds/round-1/sessions/r1-s13 setup:pantries.txt` was refused, exit 2, naming the
  folder to brief and start instead; nothing started and no `sessions/` folder was created in the round.
- `real.mjs --prove` (section 7): "a participant transcript that opens tasks.md voids the session, by name" and
  "an end copies the session into the round's folder with the leak check beside it" pass.

## 6. Script-scored bars

The criteria name four scripts for the bars and before-session items scored by a script. Each exists, fails on a
planted failure of its own, fails on a run that reads nothing, and ran on the frozen build:

| Script | Scores | Planted failure | Reads nothing | On the frozen build |
| ------ | ------ | --------------- | ------------- | ------------------- |
| `tool/endstate.mjs` | bar 4, the end-state check | `--self-test` exit 0; and three failures planted in copies of a frozen-build T65 A record (`planted/`), each exit 1 with its line: a Hide card that hides more than it says, a Select card whose chip differs from what is selected, a source chip one edge short | an empty folder: `FAIL: read zero items`, exit 1 | the 26 detour replays, the T61 A replay and the gate sessions: every session ok, exit 0 (exported tables and GraphML counted, project files listed) |
| `tool/bars.mjs --tier 4` | bar 5, axe on the tier 4 screens | an image with no text alternative, two buttons of one name and focus dropped to the page, each caught at 1440 x 900 and 900 x 700 in the run itself; `tier4.test.mjs` 3 of 3 | a screen not reached is a `MISS` line that fails the run (`tier4.test.mjs`) | `bars-dark/`: all nine data screens at both sizes, no `MISS` line, non-empty `vocabulary.json` and `spoken.json`; exit 1 on the build's axe finding (see "Problems") |
| `tool/steps.mjs` | bar 7, cost on core tasks | `--self-test` exit 0; four extra clicks planted in each T62 session of the stand-in round below: `FAILS T62 ... median 4 steps over the path`, exit 1 | a round with no session: `FAILS ... no counted session`, exit 1 | a stand-in round (`steps-round/`: the round's `plan.md`, each core session holding the answer key's path walk on 79ed770292 and `Grade: S`) with the real `answers.md`: T61 7, T62 5, T65 14 / 13, T67 3 / 4, each 0 over its path, exit 0 |
| `tool/wording.mjs` | before-session item 5 | `--self-test` exit 0, every planted echo caught | an empty screen list: `FAIL: read 22 prompts, 0 screens ...`, exit 1; no `vocabulary.json`: exit 1 | the round's `bars/` and `bars-light/` and this run's `bars-dark/`: "22 prompts against 9 screens and their spoken text: 0 shared words and 0 shared phrases not kept on purpose", exit 0 |

The step counter now reads the same counts the answer key gives for each core path, and the wording check passes
on the frozen build's own words, so dry run 2's two blocking findings are closed. `keydraw.mjs --self-test` and
`score.mjs --self-test` also exit 0. Bars 1 to 3 are counted by the researcher from the grades' first lines, and
bar 6 by the experts' walkthroughs, `real.mjs` repros and the content designer's hand count; the criteria name no
script for them.

## 7. Fast paths

- **GPU renderer.** Every session these checks started (10 gate sessions, the matcher and drop sessions, the T61
  A replay, 26 detour replays and the bars walk's sessions) records `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312
  (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)"` in its `session.json`; none is SwiftShader.
- **Warm takeover.** After the gate sessions were ended with `REAL_DIST` set, the next `--start` (`match/`) logged
  `took over warm browser 2183882 (warm for 14 s)` in its `session.log`; the drop session, the T61 A replay and
  17 of the 26 detour replays also took one over.
- **Replay.** `real.mjs --replay` of the main checkout's `tmp/design-studio/tier4/r1d3/pilot/T61A/n1-success`
  (T61 A's success walk, 18 steps) into `replay/T61A-n1-success` matched every check point and ended the session,
  exit 0.
- **`--prove`** on the frozen build (`REAL_PROVE_DIR` under `prove/`): 96 checks, `every check passed`, exit 0.
  Among them "a batch stops at its first miss: the steps after it do not run", "a replay of an unchanged route
  matches every check point and ends the session", "a replay stops at the first step whose check points differ,
  and leaves the session open there", "a rewalk replays every route", "the next start of the same build takes
  over the warm browser, with the app already open" and "the session draws on the GPU, not SwiftShader".
- `node --test design/ui/studio/tool/with-browser.test.mjs`: 5 of 5 pass.

## Problems

1. Bar 5 fails on the frozen build, as already recorded in `../../report.md`: axe finds a critical
   `aria-valid-attr-value` on seven of the nine tier 4 data screens at both sizes (the table's Nodes tab names,
   in `aria-controls`, a panel that is not in the page). The scripted walk measures it correctly; it is a build
   finding the round will report, not a tool error.
2. `real.mjs --prove` reads `REAL_TIER` from the shell. Run with `REAL_TIER=4` set (as every tier 4 briefing's
   start command sets it), it briefs its planted tier 2 sessions against tier 4's `tasks.md`, fails three
   briefing checks ("tasks.md has no Prompt B for T18") and then stops on an uncaught `ENOENT` for its own
   planted `01.png`, with a stack trace instead of its check list (`prove-with-tier4.out`). With `REAL_TIER`
   unset it passes every check. The self-test should set its own tier for its planted sessions.
3. `bars.mjs --tier 4` still prints its summary under tier 2's bar numbers ("bar 8 (axe)", "bar 7 (a): 0 runs",
   "bar 9 (a): 1 app words at rest"), which a reader of a tier 4 run can mistake for tier 4's bars 7 and 8.
