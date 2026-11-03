# Tier 5 round 1: tool dry run 1

Date: 2026-11-03. Build: 1e123d7d33, served from the main checkout's
`.study-builds/tier5-r1d1-1e123d7d33` (the first line of `../../criteria.md`). Tool: `../../../tool/` at
worktree commit 17db260b87 (the tool's last change is fb61362abf). Every session started for these checks is
under the main checkout's `tmp/design-studio/tier5/r1/tool-check-1/1e123d7d33/` (`gate/`, `match/`,
`detours/`, `detours-any-screen/`, `replay/`, `repeat-T72A-d2/`, `repeat-T71B-d2/`, `repeat-T70A-d5/`, `prove/`,
`prove-tier5/`, `bars-dark/`, `bars-light/`; the scoring checks in `selftests/`, `zero/`, `standin/` and
`gatecopy/`). Nothing was started in the studio's files, and no file of the studio, the tool or the build was
changed. Briefing the round's 30 sessions (check 5) wrote their `briefing.md` files under the worktree's
`tmp/studio-sessions/`. An earlier version of this file covered build d3fda9f2b6; this one replaces it.

## Result

Not ok. Checks 2, 3, 5 and 7 pass (7 with `REAL_TIER` unset). Check 1 fails once, check 4 has two tool
failures beside the app's own changes, and check 6 leaves three scored items with no script:

- **Check 1.** The machine-wide count of studio browsers read 9 twice (00:32:30 and 00:32:32): `real.mjs
  --prove`'s warm-pool check starts its browsers through a slot pool of its own (6 slots), outside the
  machine's 8, while 8 other studio browsers were running (section 1).
- **Check 4.** A name refused at one moment and taken at the next is still refused without a second look:
  T72 A `detour-2`'s "Condition..." was refused in 1 of 12 replays of the same route on the same build,
  with one "Condition..." on screen (section 4). And a route recorded by a replay that had found a refused
  name resolved now replays that step instead of checking it, so T70 A `detour-5` diverges on the tool's own
  note (section 4).
- **Check 6.** Every script the criteria name exists, fails on its own planted failure and on zero items,
  and runs on the frozen build; but no script counts words at rest per screen, runs the large-list check on
  the rejected build's 50,000-node list, or reads T79's waits over 10 s, though the criteria hand all three
  to a script (section 6).
- **Beside check 7.** `real.mjs --prove` with `REAL_TIER=5` in its environment, as the tier 5
  briefing's start command exports it, still fails five participant checks and stops on `ENOENT`; with
  `REAL_TIER` unset it passes all 100 checks (section 7).

What the scripts report about the build is clean: the scripted walk of the tier 5 screens finds no serious
axe finding and no failing 50,000-node list in either theme, and the wording check finds no prompt word on the
frozen build's screens (section 6). Separately from the tool, the round's gate still refuses the round
(section 5).

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | fail: 9 studio browsers for 2 seconds, from `--prove`'s own pool; the gate itself held 8 |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | fail: 78 of 82 run to the end; 3 stop where the app changed; 1 stops on the tool's own note; one name refused in 1 of 12 replays |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | fail: every named script works; 3 scored items have no script |
| 7   | Fast paths                                   | pass (with `REAL_TIER` unset) |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`), with
`REAL_DIST` set to the frozen build. A count of the node processes running `real.mjs --serve` or `real.mjs
--warm` (bash wrappers left out), about once a second, ran from before the starts to the end of every check
in this file (`poll.log`, 1,143 readings from 00:26:41 to 00:52:10). s01, s04, s06 and s10 printed `waiting for a free browser slot ...`
(s04 and s10 started while the other six ran, as slots came free). The script waits for every start before it ends any, so with all eight slots
held two sessions (s02, s03) were ended by hand to let the queue move; then all ten starts had exited 0, and
all ten ends exited 0 (`gate/exits.txt`). Every gate session records the NVIDIA renderer.
`BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each make `with-browser.sh` exit 2 with `BROWSER_SLOTS must be 1
to 16, not "17"` (and `"99"`); `BROWSER_SLOTS=16` runs its command, exit 0.

The count's highest reading was 9, twice, at 00:32:30 and 00:32:32; every other reading was 8 or fewer. At
that moment the detour replays, the tier 5 bars walk and a replay held the machine's 8 slots, and `real.mjs
--prove` started `prove/warm-1` (00:32:29) and `prove/warm-2` (00:32:32). Its warm-pool check
(`proveWarm` in `real.mjs`) runs those starts with `BROWSER_SLOT_DIR=<prove folder>/warm-slots` and
`BROWSER_SLOTS=6`, a pool of its own, so its GPU browsers (two sessions and the warm browser between them)
take no machine slot. A self-test run beside a round's eight sessions therefore puts up to three more GPU
browsers on the card than the gate allows. The bounded-start check does the same: its planted one-slot pool
(`BROWSER_SLOT_DIR=<prove folder>/slots`) ends by starting one real session outside the machine's slots. The
gate's own cap works; the self-test goes around it.

## 2. Matcher

- On the start screen (`match/`), `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2
  controls, so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples"
  link "Samples"`; `--click "Samples#1"` was refused too, as a pick by position among different kinds of
  control.
- With the volunteers network open, `--click Graph` did nothing and printed `ambiguous: "Graph" matches 2
  controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" button "Graph
  volunteers.graphml"`; `--click Graph#1` then took the left rail's Graph.

Neither name resolved to the first match. One refusal in check 4 is not stable between replays (section 4).

## 3. File drop

`--drop volunteers.graphml` on the start screen printed `dropped the file volunteers.graphml on the middle of
the window (empty canvas); the page took it`, and `match/04.png` shows the volunteers network open (24 nodes,
63 edges). The drop is sent as Chromium input with the real file (`Input.dispatchDragEvent` through the
DevTools protocol), not as events the page makes. No screen of this build refuses a dropped file, so the "not
delivered" message was not reached live; the self-test's planted page that takes no file reports it ("a drop
the page does not take is reported as not delivered", section 7).

## 4. Detours

The commonest detours of every task half (`../../tasks.md`, "Detours each pilot walks") are the pilots'
`detour-N` walks, as the reports under `../r1/pilot/` and `../r1d1/pilot/` describe them: 82 walks over all
20 halves. 72 are under `tmp/design-studio/tier5/r1/pilot/<half>/detour-N` (recorded on 0c163f54bf), 4 are
T79 A's `detour-N-0c163f54bf` there (T79 A's plain `detour-N` are on the older baac78342b), and 6 are T71 B's
and T74 B's `detour-1` to `detour-3` under `r1d1/pilot/`, recorded on the frozen build itself. All 82 were
replayed with `real.mjs --rewalk ... --only detour-1,...` four at a time through the gate, twice: once with
every check point (`detours/`), once with `REAL_REPLAY_TOLERANCE=100000`, the screen check point off and names
and printed lines still checked (`detours-any-screen/`). (`--rewalk` also finds the older builds' copies kept
in `r1d1/pilot/T71B/old-*` and `T74B/old-*`; they are left out of the counts.)

- **78 of 82 matched** to the end in both passes, among them all 6 recorded on the frozen build and every
  detour of T70 B, T71, T72, T73, T74, T75, T77, T78 and T79 B.
- **3 stop where the app now answers differently**, each ended, its folder renamed `-diverged`, and a walker
  has to carry on by hand from the screenshot:
  - T76 A `detour-3` (step 27 of 37): a just-added color line now reads "Node color, not set" with no color
    drawn (e85f37f53a); the recording read "Node color, not set, drawn #6366F1 indigo".
  - T76 B `detour-2` (step 24 of 36): the same change; the color dialog and its Opacity slider the recording
    had open are not there, and the walk's next typing finds no box.
  - T79 A `detour-4-0c163f54bf` (step 3 of 15): Done, clicked while the 50,000-node edit says Drawing, now
    closes the workspace; on 0c163f54bf the workspace stayed open (`r1/pilot/T79A/detour-4-0c163f54bf/04.png`).
- **1 stops on the tool's own note** (T70 A `detour-5`, step 8 of 12, both passes and a third replay in
  `repeat-T70A-d5/`): the route was recorded by a replay on 0c163f54bf in which `--hover "Covered by"`, refused
  on baac78342b, was found to name one thing and was not done; the route keeps that as the step's printed line,
  `"Covered by" was refused when recorded; it names p "5 nodes covered by Layer 1" now; not done`. This replay
  does the hover (`tooltip: null`) instead of checking the name, and reports the difference as the app's.
  `real.mjs` decides which names to check and not do from the recorded lines with `refusedName` (`match.mjs`),
  which reads only an `ambiguous: ...` line, never its own `was refused when recorded` line. A walker reading
  `-diverged` would take it for an app change; nothing in the app changed at that step.

No replay of either pass printed a script error, a crash, a closed page, a failed click on a stale handle or a
`SETUP FAILED` line, and every diverged session was ended.

**A name refused in one replay and taken in the others.** T72 A `detour-2` matched in both passes. Replayed
ten more times alone on the frozen build (`repeat-T72A-d2/run1` to `run10`), it stopped once (run 1) at step
2 (`--click role=option:kind --click company --click agency --click Condition... ...`) with `ambiguous:
"Condition..." matches 2 controls, so the step did nothing; name one: "Condition...#1" button "Condition...",
"Condition...#2" button "Condition..."`, while the step's screenshot (`run1/03.png`) shows one "Condition..."
(the pane's, beside "Or..."); the other nine matched all 6 steps. So for a moment after the "agency" click the
page held two buttons of that name, and the matcher read it then: between batched steps the tool waits for two
quiet frames, or gives up after 2 seconds (`__realIdle` in `real.mjs`), then resolves the next name once, with
no second look before refusing. A participant whose step met that moment would read a refusal of a control
they see once, and `steps.mjs` and the replays would count it as theirs. The same was seen in the previous
tool dry run on d3fda9f2b6. T71 B `detour-2`, whose click once failed on a stale element handle, matched in
both passes and in three more replays (`repeat-T71B-d2/`).

## 5. Participants and facilitator files

- `real.mjs --brief .../tier5/rounds/round-1/sessions/<id>` was run for all 30 planned sessions; each exited
  0 and wrote `tmp/studio-sessions/tier5/rounds/round-1/sessions/<id>/briefing.md` in the worktree, outside
  the studio's files, each folder holding only that file. The one read in full (r1-s03, T70 A, Dana) holds
  her persona file without the sections written for the study team, her history from `roster.md` ("Your
  earlier sessions with this program"), the T70 A prompt word for word (checked against `../../tasks.md`), the
  start command (`REAL_DIST=<frozen build> REAL_TIER=5 ... --start <her folder> setup:volunteers.txt`) and the
  tool's "A session", "Steps" and "Names, dialogs and lists". Searched for in all 30 and absent: the
  follow-up ("On a scale", "Overwhelm", "least sure"), "Kept on purpose", "Kept in every task", "Avoided",
  "Path steps", "Grade:", "Prompt A", "Prompt B", `tasks.md`, `answers.md`, "criteria", "hypothes", "Why this
  persona", "Evidence limits". The one hit, "facilitator" in Alex's five briefings, is his persona's own rule
  for playing him ("does not propose UI solutions unless the facilitator asks"), not a facilitator note.
  "gauges" appears only in the tool's table of data files. Sam's two briefings (r1-s29, r1-s30) carry
  `--keys` on the start command; the other 28 do not.
- `real.mjs --start .../tier5/rounds/round-1/sessions/r1-s03 setup:volunteers.txt` was refused, exit 2,
  naming the folder to brief and start instead; nothing started and no `sessions/` folder was created in the
  round.
- `--start` of the briefed folder under `tmp/studio-sessions/` was refused too, exit 1: the round's `plan.md`
  has no "Gate evidence" section, so no session of the round can start yet.
- `real.mjs --prove`: "a participant transcript that opens tasks.md voids the session, by name" and "an end
  copies the session into the round's folder with the leak check beside it" pass (section 7).

The gate run on a copy of the round folder (`gatecopy/`, so the real `plan.md` is not written) names what
still stands between the round and its first session, besides the walks it looks for beside the copy:
`../../answers.md` keeps six "Build notes" headings for builds other than the frozen one (0c163f54bf,
c3100058ab, 47c95a09fc, 797a4f6b47, baac78342b, fc1d7ee4f6); `../../decided.md` has no "Reference
screenshots" section; and the round's `bars/` and `bars-light/` were measured on d3fda9f2b6, not the frozen
build. These are the round's evidence, not tool failures; the bars runs of section 6 show the frozen build
passes them.

## 6. Script-scored bars

The criteria score bars 1 to 3 and bar 9's named elements from the grades' lines (`tool/score.mjs`), bar 4's
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
| -- | `keydraw.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |

`node --test` of `with-browser.test.mjs` (5 of 5), `tier5.test.mjs` (3 of 3), `match.test.mjs` (2 of 2) and
`measure.test.mjs` (2 of 2) pass.

**Zero items** (`zero/`): on a tier 5 round folder with a plan and no session, `score.mjs --tier 5` prints
`PROBLEM: no valid pointer session, so no bar was measured`; `steps.mjs --tier 5` fails every core task with
`no counted session`; `endstate.mjs` prints `FAIL: read zero items in 0 session folders`; `keydraw.mjs`
prints `FAIL: read no key row in 0 sessions`; `wording.mjs` on an empty `vocabulary.json` prints `FAIL: read
20 prompts, 0 screens and 0 screens' spoken text; a check over nothing checks nothing`. All exit 1.

**A stand-in round on the frozen build** (`standin/`): the round's own `plan.md` (30 sessions), each session a
copy of the frozen build's pilot success walk of its half (`tmp/design-studio/tier5/r1d1/pilot/<half>/success`,
T79 A's `success-1e123d7d33`; all 20 halves) with a passing grade and an `Overwhelm: 2 -- none -- ...` line.
`score.mjs` applies tier 5's rules: 3 of 4 on T70, T71, T73, T74 and T78, 2 of 2 on T72, T75, T77 and T79,
Sam's two `--keys` sessions left out of bars 1 to 3 and reported as bar 5's "S or SD", bar 9's ratings per
half; every scripted bar holds, exit 0. `endstate.mjs` reads 4 to 6 items from each of the 30 sessions, style
layers included (4 layers in r1-s01), and finds no mismatch, exit 0. `keydraw.mjs` reads 35 key rows over the
30 sessions with no disagreement, exit 0. `steps.mjs` counts T70, T71, T73, T74 and T78 against the answer
key's "Path steps" and reports Sam's sessions apart; it holds T70 (median 1 over) and T71 (2 over) and fails
T73, T74 and T78 (12.5, 4 and 8 over), exit 1: the pilot success walks of T73 A (36 inputs), T74 B (19) and
T78 B (34) go on after success, so the failure is the walks', not the script's.

**Bar 5 and item 5 on the frozen build** (`bars-dark/`, `bars-light/`, each `bars.mjs --tier 5 --scheme
<theme> --dist <frozen build>`): each walked all 36 screens at 1440 x 900 and 900 x 700 with no `MISS` line,
caught all 36 planted cases, is not marked untrusted, and exited 0. In both themes: 0 serious or critical axe
findings on every screen; 88 lists read on the 50,000-node screens, 26 of them long or partial, and all 26 hold
"Large graphs" (bounded, a count, a search). `wording.mjs` against `../../tasks.md` and each run's
`vocabulary.json` (which holds the catalog's search keywords) reads 20 prompts against 36 screens and their
spoken text: 0 shared words and 0 shared phrases not kept on purpose, exit 0. The runs list controls that share
a name (the Data place filter card's "Use Except role staff" checkbox twice on its screens) and text cut off
with no way to read it whole (the workspace header at 900 x 700); these are findings for the experts, which
gate nothing in the run.

**Not scored by any script.** Three things the criteria hand to the scripted walk or the step logs have no
script that scores them:

- **Words at rest per screen** (item 5, and bar 9's "Cramped" row: "counted per screen by the scripted walk
  (`bars.mjs --tier 5`) against ... about 30 and 40 at most"). `bars.mjs --tier 5` counts no words at rest:
  both runs print `bar 9 (a): 1 app words at rest ... (tier 1 not measured)`. The criteria say "Until the
  walk counts them, 'Cramped' below is 'not re-tested'", so this gates nothing, but item 5 is not fully
  scripted.
- **The rejected build's "While has nodes" list at 50,000 as a case the large-list check must flag** (item
  5). The check's planted case is a made-up list of 2,000 options (`measure.mjs`, `biglist`), not the
  rejected build's list; nothing runs the check on that build.
- **T79's waits** (bar 9: "each wait on T79's path ... of more than 10 s with a sign of work but no progress",
  from `route.jsonl` and the scripted walk). No script reads them; `score.mjs` and `steps.mjs` read no
  timing. Read by hand from the frozen build's two T79 success walks, no step took more than 7 s in all
  (`ms.total`, longest 6.9 s, the Which nodes click on 50,000 nodes).

## 7. Fast paths

- **GPU renderer.** All 317 sessions these checks started (`find ... -name session.json` under
  `tool-check-1/1e123d7d33/`) record `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX
  4070 SUPER (0x00002783)), NVIDIA)"`; none is SwiftShader.
- **Warm takeover.** `match/session.log` says `took over warm browser 3898761 (warm for 17 s)`, after the gate
  sessions' ends had topped the pool up, and so do 16 of the 24 replays in `replay/` (for example
  `replay/T70A-success`: `warm for 11 s`). No gate session took one over: the pool was empty when the ten
  started together.
- **Replay.** `real.mjs --replay` of the frozen build's pilot success walk of every one of the 20 halves
  (`tmp/design-studio/tier5/r1d1/pilot/<half>/success`, T79 A's `success-1e123d7d33`, 7 to 20 steps) into
  `replay/` printed `replayed all N steps; every check point matched; session ended`, exit 0, each, the two
  50,000-node walks included. So did the frozen build's keyboard walks of T71 A, T71 B, T74 B and T75 A (39
  to 82 steps), each replayed as a `--keys` session (`keyboardOnlyMode: true` in its `session.json`).
- **Self-test.** `REAL_PROVE_DIR=<tool-check-1/1e123d7d33>/prove real.mjs --prove` on the frozen build, with
  `REAL_TIER` unset: 100 checks `ok`, `every check passed`, exit 0, among them "a batch stops at its first
  miss: the steps after it do not run", "a replay of an unchanged route matches every check point and ends the
  session", "a replay stops at the first step whose check points differ, and leaves the session open there",
  "a rewalk replays every route: the unchanged one matches, a missing control and a changed screen diverge
  and keep their folder aside", "the next start of the same build takes over the warm browser, with the app
  already open", "the session draws on the GPU, not SwiftShader", "a drop the page does not take is reported
  as not delivered", "the gate refuses BROWSER_SLOTS above 16", "a participant transcript that opens tasks.md
  voids the session, by name" and "an end copies the session into the round's folder with the leak check
  beside it".
- The same command with `REAL_TIER=5` (`prove-tier5/`), as the tier 5 briefing's start command exports it,
  fails five participant checks ("a briefing holds the prompt word for word ...": `--brief: tasks.md has no
  Prompt B for T18`; "a briefing for a studio session folder is written outside the studio's files": `no
  Prompt A for T20`; "a start refuses a session of a round whose plan holds no gate evidence"; "a participant
  transcript that opens tasks.md voids the session, by name": `no briefing; no participant log`) and stops on
  `ENOENT ... r9-s01/01.png`, exit 1. Its planted round uses tier 2's tasks (T18, T20), and `REAL_TIER=5`
  makes `--brief` read tier 5's `tasks.md`. Its participant folders are also written under the studio's
  `design/ui/studio/tmp/prove-tier5/`, not under `REAL_PROVE_DIR` (git ignores that folder).
- `node --test tool/with-browser.test.mjs`: 5 tests, 5 pass, 0 fail.

## Problems

Of the tool:

1. `real.mjs --prove`'s warm-pool check (and its planted one-slot pool) starts GPU browsers through a slot
   pool of its own, so the machine count of studio browsers reached 9 while it ran beside 8 others (section
   1). The gate caps what goes through it; the self-test does not go through it.
2. A click's name can be refused as shared at a moment the page holds a second, short-lived control of that
   name: T72 A `detour-2`'s "Condition..." was refused in 1 of 12 replays of one route on the frozen build,
   with one "Condition..." on screen (`repeat-T72A-d2/run1/03.png`). The matcher resolves a name once, after
   an idle wait that can give up at 2 seconds, and does not look again before refusing (section 4). Found in
   the previous tool dry run on d3fda9f2b6 too; the tool has not changed since.
3. A replay does not recognize its own "was refused when recorded; it names ... now; not done" line in a
   route it recorded: `real.mjs` builds the names to check-not-do from the recorded lines with `refusedName`
   (`match.mjs`), which matches only an `ambiguous: ...` line. A route recorded by a replay that found a refused
   name resolved (T70 A `detour-5` on 0c163f54bf) therefore does that step on its next replay and diverges on
   the tool's own note: `recorded ["\"Covered by\" was refused when recorded; it names p \"5 nodes covered by
   Layer 1\" now; not done"], now ["tooltip: null"]` (section 4).
4. `real.mjs --prove` with `REAL_TIER=5` in its environment fails five participant checks and stops on
   `ENOENT ... r9-s01/01.png` (section 7). It passes, 100 checks, with `REAL_TIER` unset.
5. Three scored items have no script: words at rest per screen, the rejected build's 50,000-node list as the
   large-list check's case, and T79's waits over 10 s (section 6).

Of the round's evidence (not tool failures):

6. Three detours stop where the app now answers differently (section 4): T76 A `detour-3` and T76 B
   `detour-2` (a just-added color line shows no color, e85f37f53a) and T79 A `detour-4-0c163f54bf` (Done
   during Drawing now closes the workspace). They need a walker on the frozen build before the gate's
   detours evidence rests on them; T70 A `detour-5` needs one too until problem 3 is fixed. The frozen
   build's pilot success walks of T73 A, T74 B and T78 B go on after success, so they cannot stand in for
   the answer key's path counts (section 6).
7. The round's gate still refuses it: six "Build notes" headings for other builds in `answers.md`, no
   "Reference screenshots" section in `decided.md`, the round's `bars/` and `bars-light/` measured on
   d3fda9f2b6, and no "Gate evidence" in `plan.md`; so `--start` refuses every session of the round (section
   5). The bars runs of section 6 (`bars-dark/`, `bars-light/` under this check's folder) show the frozen
   build passes the scripted walk, but they are not in the round's folder.
