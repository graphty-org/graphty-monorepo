# Tier 4 round 1: tool dry run 2

Date: 2026-10-30. Build: 79ed770292, served from the main checkout's
`.study-builds/tier4-r1d3-79ed770292` (the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs`
at worktree commit 755189e83e. Every session started for these checks is under the main checkout's
`tmp/design-studio/tier4/r1/tool-check-2/` (`gate/`, `replay/`, `detours/`, `reworded/`, `path-routes/`,
`bars-dark/`, `prove/`); nothing was started in the studio's files, and no file of the studio, the tool or the
build was changed. Re-briefing one session (check 5) rewrote that session's `briefing.md` under the worktree's
`tmp/studio-sessions/`, with the same content.

## Result

Not ok. Checks 1, 2, 3, 5 and 7 pass. Check 4 passes only once the recorded routes are given the tool's
current wording: 8 of the 26 detour walks stop at a step whose screen did not change, because the tool's own
refusal message changed since they were recorded. Check 6 finds every named script present, catching its
planted failures and running on the frozen build, but two of the bars it scores cannot hold as things stand:
the wording check fails on the frozen build's own words, and the answer key's path step count for T61 is one
lower than the step counter counts for that very path. The tool also refuses a click on a control's exact
name when the words sit inside a dialog or a focusable heading (section 2).

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass |
| 2   | Matcher refuses an ambiguous name            | pass; the earlier wording defect is fixed; a new matcher defect found |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | pass with a tool defect: 18 of 26 match as recorded, all 26 once the old refusal wording is updated |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | scripts pass; wording check and T61's path count fail |
| 7   | Fast paths                                   | pass |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`). A
one-second count of the machine's `real.mjs --serve` and `--warm` node processes ran through the starts, the
ends, the replays, the bars walk and the self-test (`gate/poll.log`, 617 readings): its highest reading was 8,
reached 84 times, never 9. When the starts began, four warm browsers held slots; they closed as the starts
queued, and eight sessions started (two of them by taking a warm browser over). s06 and s07 printed `waiting
for a free browser slot ...` and started once ends freed slots. `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each
make `with-browser.sh` exit 2 with "BROWSER_SLOTS must be 1 to 16". All ten sessions were ended, each `--end`
exiting 0 (`gate/exits.txt`).

## 2. Matcher

On the start screen, "Samples" names both the top bar's link and the card's button.

- `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls, so the step did nothing;
  name one: "role=button:Samples" button "Samples", "role=link:Samples" link "Samples"`.
- `--click "Samples#1"` did nothing either: `ambiguous: "Samples#1" picks by position among different kinds
  of control, so the step did nothing; name it by kind: "role=button:Samples", "role=link:Samples"`.

Neither resolved to the first match, and the first refusal now offers the forms the tool accepts (dry run 1's
wording defect is fixed).

**Defect: an exact name is refused because a dialog or a heading counts as a second control.** The replays
show the tool refusing clicks a person makes on a control's own visible name:

- In the Server form (Sources "+" > Server..., or the start screen's Web API card), `--click Endpoint`,
  `--click Mapping`, `--click Kind` and `--click Example` are each refused: the second candidate is the whole
  form, `dialog "Server Kind Example Endpoint Sign in Show the password Mapping Limit Expand on d"`. No field
  of that form can be clicked by its label.
- With a graph open, `--click Graph` (the left rail's Graph button) is refused: the second candidate is the
  canvas heading `heading "Graph, pantries: 13 nodes, 18 edges"`.
- On a filter card, `--hover Hide` is refused: the second candidate is the card, `group "Node id contains
  P13, Hide"`.

Mechanism: the matcher (`real.mjs`, the candidate collection after `getByText`) climbs from a matched text to
the nearest element that is a control, and its selector includes any `[tabindex]`. A modal dialog, a heading
the app focuses on navigation and a card group carry `tabindex="-1"`, so a word inside them that belongs to no
real control (the form's example table, the heading's own text) is collected as a control of that name, and
the exact-name button or field gets a rival. A person would never click a dialog or a heading. In a session
each such refusal costs a participant a step, and `steps.mjs` counts the refused click as a step (bar 7). The
pilots met the same refusals: they are recorded in the routes of T60 A and B, T64 A and B, T66 A and B and
T67 B.

## 3. File drop

`--drop florentine.gml` on the start screen (`gate/s02`) printed `dropped the file florentine.gml on the middle
of the window (empty canvas); the page took it`, and the next screenshot shows the florentine network open (15
nodes, 20 edges). A drop on the "Open network data" dialog (`gate/s03`) was taken by the page as well and opened
the same network. The drop goes through the browser's own input path, not page-made events. No screen of this
build refuses a dropped file, so the "not delivered" message was not reached live; the self-test's planted
page that takes no file is reported as `the drop was not delivered` (section 7).

## 4. Detours

The same 26 walks as dry run 1 (each task half's newest detours walk of the dry run, as its reports list them)
were replayed with `real.mjs --replay <walk> <new folder> --end-on-diverge` on the frozen build, four at a time
through the gate, into `detours/<half>/`:

| Half | Walks replayed (main checkout's `tmp/design-studio/tier4/`) | As recorded |
| ---- | ------------------------------------------------------------ | ----------- |
| T60A | `r1d3/pilot/T60A/detour-server-c`, `detour-open-file-c`, `detour-menu-paste-c` | open-file stops at step 4 |
| T60B | `r1d3/pilot/T60B/rp8-detours` | stops at step 4 |
| T61A | `r1d3/pilot/T61A/y2-d1-main-menu`, `y2-d2-start-screen` | match |
| T61B | `r1d3/pilot/T61B/n2-menu-open`, `n3-flows-first`, `n4-quick-actions`, `n5-drop` | match |
| T62A | `r1d2/pilot/T62A/j3-detour-fields` | match |
| T62B | `r1d3/pilot/T62B/w2-detours` | match |
| T63A | `r1d3/pilot/T63A/detours-4` | match |
| T63B | `r1d3/pilot/T63B/r6-detours` | match |
| T64A | `r1d3/pilot/T64A/y-detours` | stops at step 1 |
| T64B | `r1d3/pilot/T64B/detour-style-table-c` | stops at step 1 |
| T65A | `r1d3/pilot/T65A/y-s2-detours` | match |
| T65B | `r1d3/pilot/T65B/n5-detours` | match |
| T66A | `r1d3/pilot/T66A/w2-detours` | stops at step 9 |
| T66B | `r1d3/pilot/T66B/z14-T64A-detours` | stops at step 1 |
| T67A | `r1d3/pilot/T67A/x2a-table`, `x2b-source`, `z2c-header` | x2a-table stops at step 12 |
| T67B | `r1d3/pilot/T67B/q12a-T64A-detours` | stops at step 1 |
| T68A | `r1d3/pilot/T68A/w2-detours` | match |
| T68B | `r1d3/pilot/T68B/z04-detours-3` | match |

18 exited 0 with `replayed all N steps; every check point matched; session ended`. The other 8 stopped (exit 5)
at a step whose screen and refusal were the same as recorded; only the refusal's wording differed. The walk had
recorded `name one: "Graph#1" button "Graph", "Graph#2" heading ...`, and the tool now prints `name one:
"role=button:Graph" button "Graph", "role=heading:Graph" heading ...`, the fix for dry run 1's wording defect.
The replay compares a step's printed lines word for word, so it reads the tool's own changed message as the app
having changed.

To check the rest of those 8 walks, each route was copied to `reworded-routes/` with only those recorded
refusal lines rewritten to the current wording (nothing else in the routes was touched), and replayed into
`reworded/`: all 8 exited 0 with every check point matched. So all 26 walks, 619 steps in all, run on the
frozen build with no script error, console error, failed request or tool error, and every one drew on the
NVIDIA card.

**Defect: a change to the tool's own words breaks every route recorded before it.** Any re-walk after a fix
(`--rewalk` of the dry run's walks) will mark these 8 walks diverged and send them to a walker though the app
did not change. The replay should compare a refusal by what it refused and its candidates (their kinds and
names), not by its sentence, or the dry run's routes should be re-recorded once on the current tool.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier4/rounds/round-1/sessions/r1-s09` (T65 A, Grace) exited 0 and wrote
  `tmp/studio-sessions/tier4/rounds/round-1/sessions/r1-s09/briefing.md` in the worktree, outside the studio's
  files; the folder holds only that file. It holds Grace's two persona files without the sections written for
  the study team, her history from `roster.md`, the T65 A prompt word for word, the start command
  (`REAL_DIST=<frozen build> REAL_TIER=4 ... --start <her folder> setup:volunteers.txt`) and the tool's "A
  session", "Steps" and "Names, dialogs and lists". It holds no answer key, avoided-words list, kept-words list,
  follow-up ("Would it have made any difference if you had set those up in the other order?" is absent),
  facilitator note, criteria, the B prompt or another participant's name. "gauges" appears only in the tool's
  table of data files.
- `real.mjs --start .../tier4/rounds/round-1/sessions/r1-s09 setup:volunteers.txt` was refused, exit 2, naming
  the folder to brief and start instead; nothing started and no `sessions/` folder was created in the round.
- `real.mjs --prove` (section 7): "a participant transcript that opens tasks.md voids the session, by name" and
  "an end copies the session into the round's folder with the leak check beside it" pass.

## 6. Script-scored bars

The criteria name four scripts for the bars and before-session items they score. Each exists, catches its own
planted failures, fails on a run that reads nothing, and ran on the frozen build:

| Script | Scores | Planted failures | Reads nothing | On the frozen build |
| ------ | ------ | ---------------- | ------------- | ------------------- |
| `tool/endstate.mjs` | bar 4, the end-state check | `--self-test` exit 0, every planted mismatch caught | an empty folder: `FAIL: read zero items`, exit 1 | see below |
| `tool/bars.mjs --tier 4` | bar 5, axe on the tier 4 screens | planted image, twin names and dropped focus caught at both sizes in the run itself; `tier4.test.mjs` 3 of 3 | a screen not reached is a `MISS` line that fails the run (`tier4.test.mjs`) | see below |
| `tool/steps.mjs` | bar 7, cost on core tasks | `--self-test` exit 0, every planted case caught | "a round with no session to count fails" | see below |
| `tool/wording.mjs` | before-session item 5 | `--self-test` exit 0, every planted echo caught | fails without `vocabulary.json` | see below |

Bars 1 to 3 are counted by the researcher from the grades' first lines, and bar 6 by the experts' walkthroughs,
`real.mjs` repros and the content designer's hand count; the criteria name no script for them.

**End-state check.** `endstate.mjs` over the 26 detour replays and the gate and replay sessions on the frozen
build: every session `ok`, 0 to 9 items each, exit 0 (the T68 sessions' exported files counted, project files
listed and not counted). Planted on real data from the frozen build, in copies under `planted/`: the T65 A
replay's drawn nodes lowered by one gives `filter card filter-2 (keep): its chip says 14 of 24 nodes, so 14
drawn, but 13 are drawn (it hides more than it says)`, exit 1; its selected nodes raised by one gives `filter
card filter-1 (select): its chip says 4 nodes selected, the element has 5 selected`, exit 1. Every session ended
on this tool writes `data.json`.

**Bar 5 walk.** `bars.mjs bars-dark --tier 4 --scheme dark --dist <frozen build>` walked all nine data screens
at 1440 x 900 and 900 x 700, caught every planted case at both sizes, had no `MISS` line and wrote a non-empty
`vocabulary.json` and `spoken.json`. It exits 1, as the round's own `bars/` and `bars-light/` runs do: axe finds
a critical `aria-valid-attr-value` on seven of the nine screens at both sizes (a Nodes / Edges tab whose
`aria-controls` names a panel that is not in the page). That is bar 5 failing on the build, a finding for the
round, not a tool error. Its printed summary still uses tier 2's bar numbers ("bar 8 (axe)", "bar 7 (a): 0
runs", "tier 1 in the dark scheme"), which a reader of a tier 4 run can mistake for tier 4's bars 7 and 8.

**Wording check: fails on the frozen build.** `wording.mjs tier4/tasks.md <run>/vocabulary.json` on this run
and on the round's `bars/` and `bars-light/` each exit 1: "22 prompts against 9 screens and their spoken text:
65 shared words and 1 shared phrase not kept on purpose" (for example T68's "file", "open", "network",
"GraphML", "route" and "ended"; T62's phrase "site opened" against "site Open" in the web address box). Before-
the-first-session item 5 requires the walk to pass this check, so the round cannot start until either the
prompts or the kept-word lists in `tasks.md` are settled against those 65 words.

**Step count: T61's path count does not match the counter.** `steps.mjs` was run on a stand-in round under
`steps-round/` (the round's `plan.md`, with each core session holding a pilot success walk's `route.jsonl` and
a `Grade: S`) with the real `answers.md`: it read the path counts T61 6, T62 5, T65 12, T67 3 (B 4) and counted
every session. The pilots' success walks run 8 to 27 steps, since they also hover, open chips and check their
work, so that run fails T61, T65 and T67; it says nothing about the round. To test the key itself, T61 A's path
exactly as `answers.md` writes it (Open a file, pantries.csv, Data, Sources "+", File..., deliveries.csv, Join)
was replayed as a hand-written route (`path-routes/T61A-path`): it reaches the success state (13 nodes, 18
edges, "From 2 files") in **7** steps as `steps.mjs` counts them, against the key's "Path steps: 6". T61's
limit is therefore one step tighter than the criteria intend. T62's (5) and T67's (3) paths count the same as
the key by the counter's rule; T65's path as the key writes it (choosing from lists, the "from" box, Enter,
switching a card to Select) likely counts above 12, so all four should be re-counted by replaying each path
through `steps.mjs` before the round.

## 7. Fast paths

- **GPU renderer.** Every session these checks started (50 in all: 10 gate sessions, the single replay, the T61 A
  path, 26 detour and 8 reworded replays, the bars walk's sessions) records `"renderer": "ANGLE (NVIDIA, Vulkan
  1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)"` in its `session.json`; none is
  SwiftShader.
- **Warm takeover.** Two of the ten gate starts took over warm browsers. After the gate sessions were ended
  with `REAL_DIST` set, two warm browsers were waiting, and the next `--start` (the replay below) logged `took
  over warm browser 1943578 (warm for 38 s)` in its `session.log`; 22 of the 34 detour and reworded replays also
  took one over.
- **Replay.** `real.mjs --replay` of the main checkout's `tmp/design-studio/tier4/r1d3/pilot/T60A/success-c`
  (T60 A's success path by web address, 8 steps) into `replay/T60A-success-c` matched every check point and
  ended the session, exit 0.
- **`--prove`** on the frozen build (`REAL_PROVE_DIR` under `prove/`): 96 checks, `every check passed`, exit 0.
  Among them "a batch stops at its first miss: the steps after it do not run", "a replay of an unchanged route
  matches every check point and ends the session", "a replay stops at the first step whose check points differ,
  and leaves the session open there", "a rewalk replays every route", "the next start of the same build takes
  over the warm browser, with the app already open", "the session draws on the GPU, not SwiftShader" and "a drop
  the page does not take is reported as not delivered".
- `node --test design/ui/studio/tool/with-browser.test.mjs`: 5 of 5 pass.

## Problems

1. The wording check (`wording.mjs`) fails on the frozen build: 65 prompt words and 1 phrase shared with the
   tier 4 screens are not kept on purpose. Before-the-first-session item 5 is not met.
2. The answer key's "Path steps: 6" for T61 is one below what `steps.mjs` counts for that path (7); T65's 12
   likely undercounts too. Bar 7's limits are not in the counter's units.
3. The matcher refuses a click on a control's exact name when the same words sit inside an element with
   `tabindex` that is not a control (a modal dialog, a focusable heading, a filter card's group): every field of
   the Server form, the rail's Graph button with a graph open, a card's Hide.
4. A replay compares the tool's own refusal sentences word for word, so the changed refusal wording makes 8
   of the 26 recorded detour walks diverge where the app did not change; a re-walk would send them to walkers.
5. Bar 5 fails on the build: a critical axe finding (`aria-valid-attr-value`, a tab's `aria-controls` naming a
   missing panel) on seven of the nine tier 4 data screens, at both sizes, in both themes.
6. `bars.mjs --tier 4` prints its summary under tier 2's bar numbers ("bar 8 (axe)", "bar 7 (a)").
