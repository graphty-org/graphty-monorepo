# Tier 5 round 1: tool dry run 2

Date: 2026-11-03. Build: 1e123d7d33, served from the main checkout's
`.study-builds/tier5-r1d1-1e123d7d33` (the first line of `../../criteria.md`). Tool: `../../../tool/` at
worktree commit 883dd61847 (the tool's last change is 90e826175a, whose warm-pool self-test waits for and holds
its own slot). Every session started for these checks is under the main checkout's
`tmp/design-studio/tier5/r1/tool-check-2/2026-11-03/` (`gate/`, `match/`, `detours/`, `replay/`, `prove/`,
`prove-tier5/`, `bars-dark/`, `bars-light/`; the scoring checks in `scripts/` and `standin/`). Nothing was
started in the studio's files, and no file of the studio, the tool or the build was changed. Briefing the
round's 30 sessions (check 5) wrote their `briefing.md` files under the worktree's `tmp/studio-sessions/`.

## Result

Ok: all seven checks pass, with no tool error.

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass: never more than 8 studio browsers in 837 one-second readings |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | pass: 79 of 82 run to the end; 3 stop where the app answers differently; no tool error |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass |
| 7   | Fast paths                                   | pass: both `--prove` runs 100 of 100, the warm takeover included, on a busy machine |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`), with
`REAL_DIST` set to the frozen build; each session was held 20 seconds after its start returned and then
ended. A count of the node processes running `real.mjs --serve` or `real.mjs --warm` (shell wrappers left
out), once a second, ran from before the starts until the last browser check here had finished (`poll.log`,
837 readings from 03:48:49 to 04:03:05 PST), while the detour replays, the success replays, both scripted
walks and both `--prove` runs went through the gate beside each other. Its highest reading was 8 (372
readings); it never read 9.

Four starts (s04, s05, s07, s08) printed `waiting for a free browser slot ...` and started when earlier
sessions ended. All ten starts and all ten ends exited 0 (`gate/exits.txt`). `BROWSER_SLOTS=17` and
`BROWSER_SLOTS=99` each make `with-browser.sh` exit 2 with `BROWSER_SLOTS must be 1 to 16, not "17"` (and
`"99"`); `BROWSER_SLOTS=16` runs its command, exit 0. After the last check no session of these checks was
left running; one idle warm browser of the pool remained, which closes itself after its unclaimed wait.

## 2. Matcher

In one session on the frozen build (`match/`):

- On the start screen, `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls,
  so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples" link
  "Samples"`; `--click "Samples#1"` was refused too: `picks by position among different kinds of control,
  so the step did nothing; name it by kind`.
- With the volunteers network open, `--click Graph` did nothing and printed `ambiguous: "Graph" matches 2
  controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" button "Graph
  volunteers.graphml"`.

No name resolved to the first match.

## 3. File drop

`--drop volunteers.graphml` on the start screen printed `dropped the file volunteers.graphml on the middle of
the window (empty canvas); the page took it`, and `match/04.png` shows the volunteers network open (24 nodes,
63 edges). The tool sends the drop as browser input through the DevTools protocol with the real file, not as
events the page makes. No screen of this build refuses a dropped file, so "not delivered" was not reached
live; the self-test's planted page that takes no file reports it in both `--prove` runs.

## 4. Detours

The commonest detours of every task half are the pilots' `detour-N` walks the reports under `../r1d1/pilot/`
and `../r1d2/pilot/` describe: 82 walks over all 20 halves (72 under `tmp/design-studio/tier5/r1/pilot/<half>/`;
T79 A's four `detour-N-0c163f54bf` there; T71 B's and T74 B's `detour-1` to `detour-3` under `r1d1/pilot/`).
Each was replayed with `real.mjs --replay ... --end-on-diverge` on the frozen build, four at a time, each start
through the gate (`detours/exits.txt`).

- **79 of 82 matched** to the end.
- **3 stop where the app answers differently from the recording**; each was ended:
  - T76 A `detour-3` (step 27 of 37): a just-added color line reads "Node color, not set" with no color
    drawn; the recording read "Node color, not set, drawn #6366F1 indigo". Same as dry run 1.
  - T76 B `detour-2` (step 24 of 36): the same change; the color dialog and its Opacity slider the recording
    had open are not there. Same as dry run 1.
  - T79 A `detour-4-0c163f54bf` (step 4 of 15): this time step 3 (Done, clicked while the 50,000-node edit is
    drawing, then a fill color) matched, and step 4's Undo tooltip reads "Undo changing the conditions on
    Layer 1" where the recording read "Undo switching to 2D". In dry run 1 the same walk stopped at step 3,
    where Done closed the workspace. Whether Done lands before or after the drawing finishes decides which
    of the two the walk meets, so this walk does not replay the same way twice on this build.

No replay printed a script error, a crash, a closed page or a `SETUP FAILED` line.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier5/rounds/round-1/sessions/<id>` was run for all 30 planned sessions; each exited
  0 and wrote `tmp/studio-sessions/tier5/rounds/round-1/sessions/<id>/briefing.md` in the worktree, each
  folder holding only that file. All 30 hold the persona, "Your earlier sessions with this program", "What
  you are asked to do", the start command (`REAL_DIST=<frozen build> REAL_TIER=5 ... --start <the briefed
  folder> setup:<file>`) and the tool's "A session", "Steps" and "Names, dialogs and lists". Searched for in
  all 30 and absent: "On a scale", "least sure", "Follow-up", "follow-up", "Kept on purpose", "Kept in every
  task", "Avoided", "Path steps", "Grade:", "Prompt A", "Prompt B", "answer key", `tasks.md`, `answers.md`,
  "criteria", "hypothes", "Why this persona", "Evidence limits", "success path", "Overwhelm", "Rating". The
  word "facilitator" appears in Alex's five briefings, in his persona's own rule ("does not propose UI
  solutions unless the facilitator asks"), and "overwhelm" in Grace's persona background: persona material,
  not facilitator material.
- `real.mjs --start .../tier5/rounds/round-1/sessions/r1-s03 setup:volunteers.txt` was refused, exit 2,
  naming the folder to brief and start instead; nothing started and no `sessions/` folder was created in the
  round.
- `--start` of the briefed folder under `tmp/studio-sessions/` was refused too, exit 1: the round's `plan.md`
  has no "Gate evidence" section yet.
- `real.mjs --prove`: "a participant transcript that opens tasks.md voids the session, by name" and "an end
  copies the session into the round's folder with the leak check beside it" pass in both runs.

## 6. Script-scored bars

| Bar | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build |
| --- | ------ | ------ | -------------------------------- | ------------------- | ------------------------ |
| 1-3, 9 | `score.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes, exit 0 |
| 4 | `endstate.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes, exit 0 |
| 5 and item 5 | `bars.mjs --tier 5` | yes | yes, every planted case caught at each size, per theme | yes (a screen whose count read no words, or a missed planted case, makes the run untrusted) | yes, exit 0 in both themes |
| item 5 | `wording.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes, exit 0 |
| 8 | `steps.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes (below) |
| 9 (T79's waits) | `waits.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| -- | `keydraw.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes, exit 0 |

`node --test` of `tier5.test.mjs` (4 of 4), `match.test.mjs` (2 of 2), `measure.test.mjs` (2 of 2) and
`with-browser.test.mjs` (7 of 7) pass.

**Zero items** (`scripts/zero/`): on a tier 5 round folder holding the round's plan and no session,
`score.mjs --tier 5` prints `a scripted bar fails or was not measured`; `steps.mjs --tier 5` fails every core
task with `no counted session`; `endstate.mjs` prints `FAIL: read zero items in 0 session folders`;
`keydraw.mjs` prints `FAIL: read no key row in 0 sessions`; `wording.mjs` on an empty `vocabulary.json` prints
`FAIL: read 20 prompts, 0 screens ...`; `waits.mjs` on a folder with no walk prints `FAIL: no timed step
read`. All exit 1. Without `--rating-gates`, `score.mjs` prints bar 9's median line as `holds` over 0 ratings,
marked as a measure that gates nothing; with `--rating-gates` the same line `FAILS`.

**A stand-in round on the frozen build** (`standin/`): the round's `plan.md` (30 sessions), each session a copy
of this check's own frozen-build replay of its half's success walk (`replay/<half>`), with dry run 1's
stand-in grade (S, no false done, 0 wrong turns, `Overwhelm: 2 -- none -- ...`). `score.mjs` prints `every
scripted bar holds`, exit 0; `endstate.mjs` reads 3 to 6 items per session and finds no mismatch, exit 0;
`keydraw.mjs` reads 35 key rows over 30 sessions with no disagreement, exit 0. `steps.mjs` holds T70 (median 1
over the path) and T71 (2 over) and fails T73, T74 and T78 (12.5, 4 and 8 over), exit 1: those halves'
pilot success walks go on after success, so they cannot stand in for the path counts (as in dry run 1).

**Bar 5 and item 5** (`bars-dark/`, `bars-light/`, `bars.mjs --tier 5 --scheme <theme> --dist <frozen
build>`): each walked all 36 screens at 1440 x 900 and 900 x 700 with no `MISS` line, caught every planted
case at each size, has an empty `untrusted` list, and exited 0. In both themes: 0 axe findings on every
screen; 26 long or partial lists hold the "Large graphs" rule and none fails; the rejected build's "While has
nodes" at 50,000 is `caught by the large-list check (list Reference, 52 rendered)`. `wording.mjs` against
`../../tasks.md` and each run's `vocabulary.json`: 20 prompts against 36 screens, 0 shared words and 0 shared
phrases not kept on purpose, exit 0.

**Words at rest** (both themes, both sizes): the style host's read-only outline 57 words, the filter host's
66, the 50,000-node outline 67, each `OVER` the 50-word budget. Severity 2 candidates for the calm-first
check, not script failures; unchanged from dry run 1.

**T79's waits** (`waits.mjs --build 1e123d7d33`): this check's replays of both T79 success walks, 23 timed
steps, longest 6.4 s, none over 10 s, exit 0. The scripted 50,000-node walk (`bars-dark/sessions`, 74 timed
steps): 4 over 10 s, longest 15.9 s (`big-900x700/03.png`, four actions ending in opening the dept
checklist), exit 1, as bar 9 asks. Whether the screen showed work under way is for bar 9's reader.

## 7. Fast paths

- **GPU renderer.** All 193 `session.json` files under this check's folder (163 sessions started here, plus
  the stand-in's 30 copies of them) record `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce
  RTX 4070 SUPER (0x00002783)), NVIDIA)"`; none is SwiftShader.
- **Warm takeover.** `match/session.log`, a start of the frozen build after the gate check's starts, says
  `took over warm browser 3189457 (warm for 36 s)`; 28 sessions here took over a warm browser in all.
- **Replay.** `real.mjs --replay` of the frozen build's pilot success walk of every one of the 20 halves
  (`tmp/design-studio/tier5/r1d1/pilot/<half>/success`, T79 A's `success-1e123d7d33`) into `replay/` printed
  `replayed all N steps; every check point matched; session ended`, exit 0, each (7 to 20 steps, the two
  50,000-node walks included).
- **Self-test.** `real.mjs --prove` on the frozen build, once with `REAL_TIER=5` (`prove-tier5/`) and once
  with it unset (`prove/`), each run while the detour replays and the scripted walks held the machine's
  slots: 100 `ok`, `every check passed`, exit 0, both. Both pass "a batch stops at its first miss", "a replay
  of an unchanged route matches every check point and ends the session", "a replay stops at the first step
  whose check points differ, and leaves the session open there", "a rewalk replays every route" and "the
  next start of the same build takes over the warm browser" (`took over warm browser ... (warm for 4 s)` and
  `(warm for 53 s)`). The warm-takeover check that failed once in dry run 1, when every spare slot was
  taken, now passes under the same load.
- `node --test tool/with-browser.test.mjs`: 7 tests, 7 pass.

## Problems

None of the tool. Of the round's evidence (not tool failures):

1. Three detours stop where the app answers differently from the recording (section 4): T76 A `detour-3`
   and T76 B `detour-2` (a just-added color line shows no drawn color) and T79 A `detour-4-0c163f54bf`.
   They need a walker on the frozen build before the gate's detours evidence rests on them. T79 A's walk
   stops at a different step from run to run (step 3 in dry run 1, step 4 here), depending on whether Done
   is clicked before or after the 50,000-node drawing finishes.
2. Three screens are `OVER` the words-at-rest budget at both sizes and in both themes (57, 66 and 67 words
   against 50), severity 2 candidates for the calm-first check.
3. Waits over 10 s on the scripted 50,000-node walk (4 of 74 steps, longest 15.9 s), for bar 9's reader.
4. The pilot success walks of T73, T74 and T78 go on after success, so a stand-in round built from them
   fails `steps.mjs` on those tasks (section 6).
5. The round's `plan.md` has no "Gate evidence" section, so `--start` refuses every session of the round
   until `real.mjs --gate` passes.
