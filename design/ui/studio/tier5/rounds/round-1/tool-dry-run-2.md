# Tier 5 round 1: tool dry run 2

Date: 2026-11-02. Build: d3fda9f2b6, served from the main checkout's
`.study-builds/tier5-r1d2-d3fda9f2b6` (the first line of `../../criteria.md`). Tool: `../../../tool/` at
worktree commit fb61362abf. Every session started for these checks is under the main checkout's
`tmp/design-studio/tier5/r1/tool-check-2/` (`gate/`, `match/`, `detours/`, `detours-any-screen/`, `replay/`,
`inspect-T72A-d2/`, `prove/`; the scoring checks in `zero/`, `standin/` and `wording/`). Nothing was started in
the studio's files, and no file of the studio, the tool or the build was changed. Briefing one session (check
5) rewrote that session's `briefing.md` under the worktree's `tmp/studio-sessions/`. The bars runs read in
check 6 (`../round-1/bars/` and `bars-light/`) were made on the frozen build by the round's own preparation,
not by this dry run.

## Result

Not ok, on one tool problem. Checks 1, 2, 3, 5, 6 and 7 pass. In check 4, 57 of the 67 commonest detours run to
their end on the frozen build and the other 10 stop where the app now answers differently, with no script
error, crash, closed page or stale-handle failure; but one detour's click was refused in one replay and taken
in two others of the same route on the same build: the matcher read two buttons named "Condition..." where
the screen shows one (section 4). Separately, `real.mjs --prove` passes only with `REAL_TIER` unset: with
`REAL_TIER=5`, as the tier 5 briefing's start command exports it, five of its participant checks fail and it
stops on an error (section 7).

What the scripts report about the build is not a tool failure, but it stands between the round and its first
session: the scripted walk of the tier 5 screens finds 14 serious axe findings and 18 failing 50,000-node lists
per theme, and the wording check finds 66 prompt words on the frozen build's screens (section 6). The round's
`plan.md` has no "Gate evidence" yet.

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | fail: 57 of 67 run to the end, 10 stop where the app changed; one name refused in one replay of three |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass |
| 7   | Fast paths                                   | pass |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`, the
script `tmp/tool-dry-run-2/gate.sh` of the worktree), while other walks of the studio held slots too. A count
of the node processes running `real.mjs --serve` or `real.mjs --warm` (the bash wrappers left out) every
one to two seconds ran from before the starts until every session had ended (`gate/poll.log`, 82 readings):
its highest reading was 8, reached 72 times, never 9. A second count at the same pace ran on through the
matcher session, the replays, both detour passes and the self-test (`gate/poll-2.log`, 464 readings from
20:38:49 to 20:49:06): its highest reading was 8, reached 70 times, never 9. Seven of the ten started at once (s04 by
taking a warm browser over); s02, s03 and s08 printed `waiting for a free browser slot ...` and started
when slots freed. Because the other walks held the remaining slots, the seven running sessions were ended
early to let the queue move; then all ten starts had exited 0 and all ten ends exited 0
(`gate/exits.txt`). `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each make `with-browser.sh` exit 2 with
`BROWSER_SLOTS must be 1 to 16, not "17"` (and `"99"`); `BROWSER_SLOTS=16` runs its command, exit 0.

## 2. Matcher

- On the start screen (`match/`), `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2
  controls, so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples"
  link "Samples"`; `--click "Samples#1"` was refused too, as a pick by position among different kinds of
  control.
- With the volunteers network open, `--click Graph` did nothing and printed `ambiguous: "Graph" matches 2
  controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" button "Graph
  volunteers.graphml"`; `--click Graph#1` then took the left rail's Graph.

Neither name resolved to the first match. One refusal in check 4 was not stable between replays (section 4).

## 3. File drop

`--drop volunteers.graphml` on the start screen printed `dropped the file volunteers.graphml on the middle of
the window (empty canvas); the page took it`, and `match/04.png` shows the volunteers network open (24 nodes,
63 edges). The drop is sent as Chromium input (`Input.dispatchDragEvent` with the real file, through the
DevTools protocol), not as page-made events. No screen of this build refuses a dropped file, so the "not
delivered" message was not reached live; the self-test's planted page that takes no file reports it (section
7).

## 4. Detours

The commonest detours of every task half are the pilots' `detour-N` walks
(`tmp/design-studio/tier5/r1/pilot/<half>/detour-N/`, as the reports under `../../r1/pilot/` describe them): 67
walks over all 20 halves, recorded on baac78342b. All 67 were replayed on the frozen build with `real.mjs
--rewalk <r1/pilot> <tool-check-2/detours> --only detour-1,...,detour-6`, four at a time through the gate:

- **35 matched** to the end with every check point (`detours/rewalk.json`).
- **32 diverged** (exit 5), each ended and its folder renamed `-diverged`. 21 of them stop on the screen check
  point alone, 17 at step 1 or 2, and one (T72 A `detour-2`) on a refused name (below): the recordings list the data table's controls and the matches strip's rows
  (`button Close table`, `input matches`, `row Group id ...`), and the frozen build, whose tool now leaves out
  what `visibility: hidden` keeps in place, draws one of the two where the recording listed both.

All 67 were then replayed again with `REAL_REPLAY_TOLERANCE=100000` (the screen check point off; names and
printed lines still checked) into `detours-any-screen/`: **57 matched** to the end, the same 35 plus the 21
above and T72 A `detour-2`. The other 10 stop where the app now answers differently, each with its session ended, and a walker has
to carry on by hand from the screenshot:

- a point that now lands on another thing (T70 A `detour-3`: the matches strip's "Shown" label moved);
- a name that now carries more ("Node color: PageRank, 0.02796 to 0.05862, Orange to brown", T74 A `detour-1`;
  the same for T73 B `detour-1` and T74 B `detour-1`), a step row that now reads its reference ("Within 2 hops
  of v02, 16 of 24 nodes so far", T73 A `detour-1`), and a name the recording refused that now names one thing
  ("5 nodes covered by Layer 1", T70 A `detour-5`);
- an option list in another order (T72 B `detour-1`: "Has no value" where "Between" was);
- the Undo step a setup used to leave (T77 A `detour-3`: "Staff" now names 2 controls, not 3; T79 A
  `detour-3`: "Nothing to undo"), and focus after a pick on the step row rather than the checklist's box (T79 A
  `detour-2`).

No replay of either pass printed a script error, a crash, a closed page, a failed click on a stale handle (the
defect of the first tool dry run) or any other failed tool step.

**Defect: a name refused in one replay and taken in the others.** In the first pass, T72 A `detour-2` stopped
at step 2 (`--click role=option:kind --click company --click agency --click Condition... ...`) with
`ambiguous: "Condition..." matches 2 controls, so the step did nothing; name one: "Condition...#1" button
"Condition...", "Condition...#2" button "Condition..."`. The screenshot of that step
(`detours/T72A/detour-2-diverged/03.png`) shows one "Condition..." (the pane's, beside "Or..."), and the same
route on the same build matched all 6 steps in the second pass and in a third replay
(`inspect-T72A-d2/`), as it did in the first tool dry run. So for some moment after the "agency" click
the page held two buttons of that name, and the matcher read the page at that moment: between batched steps
the tool waits for two quiet frames, or gives up after 2 seconds (`__realIdle` in `real.mjs`), and then
resolves the next name once, with no second look before refusing it. What drew the second button (the title
pane's and a step pane's add actions both carry one in `SelectionEditor.tsx`) was not established. A
participant whose step met that moment would read a refusal of a control they see once, and `steps.mjs` and the
replays would count it as theirs.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier5/rounds/round-1/sessions/r1-s01` (T70 A, Grace) exited 0 and wrote
  `tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s01/briefing.md` in the worktree, outside the studio's
  files; the folder holds only that file. It holds Grace's two persona files without the sections written for
  the study team ("Why this persona exists", "Evidence limits"), her history from `roster.md` ("Your earlier
  sessions with this program"), the T70 A prompt word for word, the start command (`REAL_DIST=<frozen build>
  REAL_TIER=5 ... --start <her folder> setup:volunteers.txt`) and the tool's "A session", "Steps" and "Names,
  dialogs and lists". Searched for and absent: the follow-up ("On a scale", "what did you notice the drawing"),
  "Kept on purpose", "Avoided in every task", the B prompt ("river council"), "Path steps", "Grade:", any other
  participant's name, `tasks.md`, `answers.md`, "criteria", "Facilitator", "hypothes". "gauges" appears only
  in the tool's table of data files.
- `real.mjs --start .../tier5/rounds/round-1/sessions/r1-s01 setup:volunteers.txt` was refused, exit 2,
  naming the folder to brief and start instead; nothing started and no `sessions/` folder was created in the
  round.
- `--start` of the briefed folder under `tmp/studio-sessions/` was refused too, exit 1: the round's `plan.md`
  has no "Gate evidence" section, so no session of the round can start yet.
- `real.mjs --prove` (section 7): "a participant transcript that opens tasks.md voids the session, by name"
  and "an end copies the session into the round's folder with the leak check beside it" pass.

## 6. Script-scored bars

The criteria score bars 1 to 3 and bar 9's ratings from the grades' lines (`tool/score.mjs`), bar 4's
end-state check (`tool/endstate.mjs`), bar 5's axe and item 5's scripted walk with the 50,000-node lists
(`tool/bars.mjs --tier 5`) and its wording check (`tool/wording.mjs`), and bar 8's step count
(`tool/steps.mjs`). `tool/keydraw.mjs` (key against drawing) was checked with them.

| Bar | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build |
| --- | ------ | ------ | -------------------------------- | ------------------- | ------------------------ |
| 1-3, 9 | `score.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 4 | `endstate.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 5 (and item 5) | `bars.mjs --tier 5` | yes | yes, 36 planted cases caught per theme | yes (a run that reads no 50,000-node list or no keyword is not trusted) | yes |
| item 5 | `wording.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 8 | `steps.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| -- | `keydraw.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | not run on a session |

`node --test` of `tier5.test.mjs`, `match.test.mjs`, `measure.test.mjs` and `with-browser.test.mjs` all pass.

**Zero items** (`zero/`): on a round folder with a plan and no session, `score.mjs --tier 5` prints `PROBLEM:
no valid pointer session, so no bar was measured` and exits 1; `steps.mjs --tier 5` fails every core task with
`no counted session`; `endstate.mjs` prints `FAIL: read zero items in 0 session folders`; `keydraw.mjs` prints
`FAIL: read no key row`; `wording.mjs` on an empty `vocabulary.json` prints `FAIL: read 40 prompts, 0 screens
... a check over nothing checks nothing`. All exit 1. Without `--rating-gates`, `score.mjs` prints bar 9's
median as `holds ... median null over 0` (a measure that gates nothing); with it, it fails.

**Bars 1 to 3, 9 and 8 on the frozen build** (`standin/`): a stand-in round with the round's own `plan.md`
(30 sessions), each session a copy of the frozen build's pilot success walk of its half (19 of the 20 halves;
T79 A's only success walk is on another build) with a passing grade and an `Overwhelm: 2 -- none -- ...` line.
`score.mjs` applies tier 5's rules: 3 of 4 on T70, T71, T73, T74 and T78, 2 of 2 on T72, T75, T77 and T79,
Sam's two `--keys` sessions left out of bars 1 to 3 and reported as bar 5's "S or SD", and bar 9's ratings per
half; every scripted bar holds, exit 0. `steps.mjs` counts T70, T71, T73, T74 and T78 against the answer key's
"Path steps" (15, 9, 12, 12, 17 and 19) and reports Sam's sessions apart; it holds T70 and T71 and fails T73
A, T74 B and T78 B, whose pilot walks go on after success (T73 A's 20 steps test the Hops box after the
layer is done, 36 inputs in all), so the failure is the walks', not the script's.

**Bar 4 on the frozen build** (`replay/`): the end records of five replays of frozen-build success walks
(T70 A, T71 A, T73 A, T74 A, T78 A) hold `painted` (each layer's members as graphty-element paints them,
whether a preview is drawn and whether the workspace is open), and `endstate.mjs` reads 4 to 6 items from
each, layers included, exit 0. The self-test catches a layer that paints more than its count, a topmost
count that is not drawn, a preview left on after the workspace closed and styling lost under an unchanged
layer.

**Bar 5 and item 5 on the frozen build**: `../round-1/bars/bars.json` (`--tier 5 --scheme dark`) and
`bars-light/bars.json` (`--scheme light`) are on build `d3fda9f2b65c`, walked all 37 screens at 1440 x 900 and
900 x 700 with no `MISS` line, caught all 36 planted cases each, and are not marked untrusted. They read 88
lists each. What they report is the build's, not the tool's: 14 serious axe findings per theme
(`scrollable-region-focusable` on the value picker of a new rule and of an Or group, `color-contrast` on the open
reference picker, in both hosts and at 50,000 nodes) and 18 failing lists per theme (the workspace's node
table on every 50,000-node screen: 14 to 16 rows of 35,960 to 50,000, with a count and no search box in its
pane). `wording.mjs` against `../../tasks.md` and each run's `vocabulary.json`, which holds the catalog's
search keywords, reads 40 prompts against 36 screens and reports 66 shared words (among them T79's "away", a
catalog keyword, and "number", an option label), exit 1.

## 7. Fast paths

- **GPU renderer.** All 175 sessions these checks started (`find ... -name session.json` under
  `tool-check-2/`) record `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER
  (0x00002783)), NVIDIA)"`; none is SwiftShader.
- **Warm takeover.** `gate/s04/session.log` says `took over warm browser 2284101 (warm for 4 s)`, and so do
  `match/` and all five replays in `replay/`.
- **Replay.** `real.mjs --replay` of five frozen-build pilot success walks (`tmp/design-studio/tier5/r1d2/pilot/
  <half>/success` for T70 A, T71 A, T73 A, T74 A and T78 A, 9 to 20 steps) into `replay/` printed `replayed all
  N steps; every check point matched; session ended`, exit 0, each.
- **Self-test.** `REAL_PROVE_DIR=<tool-check-2>/prove real.mjs --prove` on the frozen build: 100 checks `ok`,
  `every check passed`, exit 0, among them "a batch stops at its first miss: the steps after it do not run", "a
  replay of an unchanged route matches every check point and ends the session", "a replay stops at the first
  step whose check points differ, and leaves the session open there", "a rewalk replays every route: the
  unchanged one matches, a missing control and a changed screen diverge and keep their folder aside", "the next
  start of the same build takes over the warm browser, with the app already open", "the session draws on the
  GPU, not SwiftShader", "a drop the page does not take is reported as not delivered" and "the gate refuses
  BROWSER_SLOTS above 16". The same command with `REAL_TIER=5` in its environment, as the tier 5 briefing's
  start command exports it, fails five of the participant checks and then stops on an error (`ENOENT ...
  r9-s01/01.png`): the self-test's planted round uses tier 2's tasks (T18, T20), and `REAL_TIER=5` makes
  `--brief` look them up in tier 5's `tasks.md` (`tasks.md has no Prompt B for T18`), so no briefing is
  written and the steps after it find no folder.
- `node --test tool/with-browser.test.mjs`: 5 tests, 5 pass, 0 fail.

## Problems

Of the tool:

1. A click's name can be refused as shared at a moment the page holds a second, short-lived control of that
   name: T72 A `detour-2`'s "Condition..." was refused in one of three replays of the same route on the same
   build (section 4). The matcher resolves a name once, after an idle wait that can give up at 2 seconds, and
   does not look again before refusing.
2. `real.mjs --prove` with `REAL_TIER=5` in its environment fails five participant checks and stops on
   `ENOENT ... r9-s01/01.png`: its planted round is a tier 2 round (T18, T20) but `--brief` reads the tier from
   `REAL_TIER` (section 7). It passes, 100 checks, with `REAL_TIER` unset.

Of the round's evidence (the build's, found by the scripts; not tool failures):

3. The scripted walk of the tier 5 screens finds, in each theme, 14 serious axe findings
   (`scrollable-region-focusable` on the value picker of a new rule and of an Or group, `color-contrast` on the
   open reference picker) and 18 failing 50,000-node lists (the workspace's node table, with a count and no
   search box in its pane); bar 5 and "Large graphs" fail on them as the build stands.
4. `wording.mjs` finds 66 prompt words on the frozen build's screens or in what they say (among them T79's
   "away", a catalog keyword, and "number", an option label), so item 5's wording check does not pass yet.
5. Ten detours stop where the app now answers differently (section 4) and need a walker before the gate's
   detours evidence rests on them; the frozen build's pilot success walks of T73 A, T74 B and T78 B go on after
   success, so they cannot stand in for the answer key's path counts.
6. The round's `plan.md` holds no "Gate evidence" section, so `--start` refuses every session of the round.
