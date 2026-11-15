# Tier 5 round 1: tool dry run 2

Date: 2026-11-03. Build: 1e123d7d33, served from the main checkout's
`.study-builds/tier5-r1d1-1e123d7d33` (the first line of `../../criteria.md`). Tool: `../../../tool/` at
worktree commit e8a49b0eb1 (the tool's last change is 2aa3ff3fad). Every session started for these checks is
under the main checkout's `tmp/design-studio/tier5/r1/tool-check-2/1e123d7d33/` (`gate/`, `match/`,
`detours/`, `detours-any-screen/`, `replay/`, `repeat-T72A-d2/`, `repeat-T70A-d5/`, `prove/`,
`prove-tier5/`, `bars-dark/`, `bars-light/`; the scoring checks in `selftests/`, `zero/` and `standin/`, the
briefing checks in `brief/`). Nothing was started in the studio's files, and no file of the studio, the tool
or the build was changed. Briefing the round's 30 sessions (check 5) rewrote their `briefing.md` files under
the worktree's `tmp/studio-sessions/`. An earlier version of this file covered build d3fda9f2b6; this one
replaces it.

## Result

Ok: all seven checks pass on the frozen build, with no tool error. The five tool problems tool dry run 1
found are gone: the self-test's browsers stay inside the machine's 8 (the count never read 9), the
"Condition..." click that was refused once in 12 replays matched in 30 of 30 and in both detour passes, T70 A
`detour-5` (a route holding the tool's own "was refused when recorded" note) now matches in 8 of 8 replays,
`real.mjs --prove` passes all 100 checks with `REAL_TIER=5` exported as well as unset, and the three items
with no script (words at rest, the rejected build's 50,000-node list, T79's waits over 10 s) each have one
that fails on its planted case and on zero items and runs on the frozen build.

What stands between the round and its first session is not the tool (section 4 and "Problems"): three detour
walks stop where the app now answers differently and need a walker on the frozen build, the scripted walk
prints three screens over the words-at-rest budget and six waits over 10 s on the 50,000-node path for the
calm-first check and bar 9 to read, and the round's `plan.md` still has no "Gate evidence", so `--start`
refuses every session.

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass: never more than 8 studio browsers in 1,156 one-second readings, the self-test included |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | pass: 79 of 82 run to the end in both passes; 3 stop where the app changed; no tool error |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass |
| 7   | Fast paths                                   | pass, with `REAL_TIER` unset and with `REAL_TIER=5` |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`), with
`REAL_DIST` set to the frozen build; each session was held 20 seconds after its start returned and then
ended, so the queued starts could take the freed slots. A count of the node processes running `real.mjs
--serve` or `real.mjs --warm` (bash wrappers left out), once a second, ran from before the starts to the end
of every check in this file (`poll.log`, 1,156 readings from 01:22:09 to 01:47:57), while the detour
replays, both scripted walks of the tier 5 screens, the replays and `real.mjs --prove` twice ran beside each
other through the gate. Its highest reading was 8, in 425 readings; it never read 9.

Eight starts returned between 01:22:12 and 01:22:21; s01, s06, s07 and s08 printed `waiting for a free
browser slot ...` (four warm browsers held slots when the starts began), and s01 and s06 started at 01:22:37
and 01:22:38, after the first sessions ended. All ten starts and all ten ends exited 0 (`gate/exits.txt`).
s05 and s09 took over warm browsers. `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each make `with-browser.sh`
exit 2 with `BROWSER_SLOTS must be 1 to 16, not "17"` (and `"99"`); `BROWSER_SLOTS=16` runs its command,
exit 0.

The self-test's warm-pool and bounded-start checks, which in tool dry run 1 started GPU browsers in a pool of
their own and put a ninth browser on the machine, now take a machine slot too (`BROWSER_SLOT_ALSO`): both
`--prove` runs (`prove/warm-1`, `warm-2`, and the same in `prove-tier5/`) ran beside the detour replays and
the scripted walks, and the count did not pass 8. `with-browser.test.mjs` covers it ("a planted pool with BROWSER_SLOT_ALSO also
waits for, and holds, a slot of that pool"), 6 of 6 pass.

## 2. Matcher

- On the start screen (`match/`), `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2
  controls, so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples"
  link "Samples"`; `--click "Samples#1"` was refused too, as a pick by position among different kinds of
  control (`name it by kind: "role=button:Samples", "role=link:Samples"`).
- With the volunteers network open, `--click Graph` did nothing and printed `ambiguous: "Graph" matches 2
  controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" button "Graph
  volunteers.graphml"`; `--click Graph#1` then took the left rail's Graph.

Neither name resolved to the first match. The matcher now looks again for up to a second before refusing a
shared name, and refuses only if the name stays shared; the route that was refused once in 12 replays in tool
dry run 1 now matches in every replay (section 4).

## 3. File drop

`--drop volunteers.graphml` on the start screen printed `dropped the file volunteers.graphml on the middle of
the window (empty canvas); the page took it`, and `match/04.png` shows the volunteers network open. The drop
is sent as Chromium input with the real file (through the DevTools protocol), not as events the page makes.
No screen of this build refuses a dropped file, so the "not delivered" message was not reached live; the
self-test's planted page that takes no file reports it, in both `--prove` runs ("a drop the page does not
take is reported as not delivered", section 7).

## 4. Detours

The commonest detours of every task half (`../../tasks.md`, "Detours each pilot walks") are the pilots'
`detour-N` walks, as the reports under `../r1/pilot/` and `../r1d1/pilot/` describe them: 82 walks over all
20 halves. 72 are under `tmp/design-studio/tier5/r1/pilot/<half>/detour-N` (recorded on 0c163f54bf), 4 are
T79 A's `detour-N-0c163f54bf` there, and 6 are T71 B's and T74 B's `detour-1` to `detour-3` under
`r1d1/pilot/`, recorded on the frozen build itself. All 82 were replayed with `real.mjs --rewalk ... --only
detour-1,...` four at a time through the gate, twice: once with every check point (`detours/`), once with
`REAL_REPLAY_TOLERANCE=100000`, the screen check point off and names and printed lines still checked
(`detours-any-screen/`). `--rewalk` also finds T79 A's plain `detour-2` to `detour-4` (walked on the older
baac78342b, kept beside the 0c163f54bf copies) and the older builds' copies in `r1d1/pilot/T71B/old-*` and
`T74B/old-*`; they are left out of the counts, as in tool dry run 1.

- **79 of 82 matched** to the end in both passes, among them all 6 recorded on the frozen build, T70 A
  `detour-5` and T72 A `detour-2`, and every detour of T70, T71, T72, T73, T74, T75, T77, T78 and T79 B.
- **3 stop where the app now answers differently**, in both passes and again when each was replayed alone
  (`repeat-T76A-detour-3`, `repeat-T76B-detour-2`, `repeat-T79A-d4-0c16`); each was ended, and a walker has
  to carry on by hand from the screenshot:
  - T76 A `detour-3` (step 27 of 37): a just-added color line now reads "Node color, not set" with no color
    drawn; the recording read "Node color, not set, drawn #6366F1 indigo".
  - T76 B `detour-2` (step 24 of 36): the same change; the color dialog and its Opacity slider the recording
    had open are not there, and with the screen check off the walk's next typing finds no box (step 25).
  - T79 A `detour-4-0c163f54bf` (step 3 of 15): Done, clicked while the 50,000-node edit says Drawing, now
    closes the workspace; on 0c163f54bf the workspace stayed open.

No replay of either pass printed a script error, a crash, a closed page, a failed click on a stale handle or a
`SETUP FAILED` line, no click was refused as shared, and no session was left open (no `real.mjs --serve`
under these checks' folders after the last one).

**The two routes tool dry run 1 found the tool unsure on.** T72 A `detour-2`, whose "Condition..." was
refused once in 12 replays there with one "Condition..." on screen, was replayed 30 more times alone on the
frozen build (`repeat-T72A-d2/run1` to `run30`, most beside 7 other browsers): 30 of 30 matched all 6 steps.
T70 A `detour-5`, whose route holds `"Covered by" was refused when recorded; it names p "5 nodes covered by
Layer 1" now; not done` at step 8, was replayed 8 times alone (`repeat-T70A-d5/run1` to `run8`): 8 of 8
matched all 12 steps; the replay now checks that name and does not do the hover, as the recording did
nothing.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier5/rounds/round-1/sessions/<id>` was run for all 30 planned sessions; each exited
  0 and wrote `tmp/studio-sessions/tier5/rounds/round-1/sessions/<id>/briefing.md` in the worktree, outside
  the studio's files, each folder holding only that file. Each holds the persona file, "Your earlier sessions
  with this program" from `roster.md`, "What you are asked to do" (the prompt), the start command
  (`REAL_DIST=<frozen build> REAL_TIER=5 ... --start <the briefed folder>`) and the tool's "A session",
  "Steps" and "Names, dialogs and lists". Searched for in all 30 and absent: "On a scale", "least sure",
  "Follow-up", "Kept on purpose", "Kept in every task", "Avoided", "Path steps", "Grade:", "Prompt A",
  "Prompt B", "answer key", `tasks.md`, `answers.md`, "criteria", "hypothes", "Why this persona", "Evidence
  limits". Two words appear that are not facilitator material: "facilitator" in Alex's briefings is his
  persona's own rule for playing him ("does not propose UI solutions unless the facilitator asks"), and
  "overwhelm" in six briefings (r1-s01, s05, s09, s13, s17, s25) is the persona's own background ("Has seen a
  mapping tool overwhelm people", "Data overload"), not the follow-up question.
- `real.mjs --start .../tier5/rounds/round-1/sessions/r1-s03 setup:volunteers.txt` was refused, exit 2,
  naming the folder to brief and start instead; nothing started and no `sessions/` folder was created in the
  round.
- `--start` of the briefed folder under `tmp/studio-sessions/` was refused too, exit 1: the round's `plan.md`
  has no "Gate evidence" section, so no session of the round can start yet (the round's own gate, not the
  tool).
- `real.mjs --prove`: "a participant transcript that opens tasks.md voids the session, by name" and "an end
  copies the session into the round's folder with the leak check beside it" pass, in both runs (section 7).

## 6. Script-scored bars

The criteria score bars 1 to 3 and bar 9's named elements from the grades' lines (`tool/score.mjs`), bar 4's
end-state check (`tool/endstate.mjs`), bar 5's axe and item 5's scripted walk with the 50,000-node lists, the
words at rest and the rejected build's case (`tool/bars.mjs --tier 5`) and its wording check
(`tool/wording.mjs`), bar 8's step count (`tool/steps.mjs`), and bar 9's waits on T79's path, read from
`route.jsonl` (`tool/waits.mjs`, which the tool's README names; the criteria name the routes, not the
script). `tool/keydraw.mjs` (key against drawing) was checked with them.

| Bar | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build |
| --- | ------ | ------ | -------------------------------- | ------------------- | ------------------------ |
| 1-3, 9 | `score.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 4 | `endstate.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 5 and item 5 | `bars.mjs --tier 5` | yes | yes, every planted case caught at each size, per theme | yes (a screen whose count read no words, a missed planted case or an unflagged rejected list makes the run untrusted) | yes |
| item 5 | `wording.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 8 | `steps.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 9 (T79's waits) | `waits.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| -- | `keydraw.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |

`node --test` of `with-browser.test.mjs` (6 of 6), `tier5.test.mjs` (3 of 3), `match.test.mjs` (2 of 2),
`measure.test.mjs` (2 of 2), `bar10.test.mjs` (1 of 1) and `bar8-9.test.mjs` (3 of 3, run through
`with-browser.sh` as its header asks) pass.

**Zero items** (`zero/`): on a tier 5 round folder with a plan and no session, `score.mjs --tier 5` prints
`a scripted bar fails or was not measured`; `steps.mjs --tier 5` fails every core task with no counted
session; `endstate.mjs` prints `FAIL: read zero items in 0 session folders`; `keydraw.mjs` reads no key row;
`wording.mjs` on an empty `vocabulary.json` prints `FAIL: read 20 prompts, 0 screens and 0 screens' spoken
text; a check over nothing checks nothing`; `waits.mjs` on a folder with no walk prints `FAIL: no timed step
read (0 routes, 0 steps with no "ms"): nothing measured`. All exit 1.

**A stand-in round on the frozen build** (`standin/`): the round's own `plan.md` (30 sessions), each session a
copy of the frozen build's pilot success walk of its half (`tmp/design-studio/tier5/r1d1/pilot/<half>/success`,
T79 A's `success-1e123d7d33`) with a passing grade and an `Overwhelm: 2 -- none -- ...` line. `score.mjs`
prints `every scripted bar holds`, exit 0. `endstate.mjs` reads 4 to 6 items from each of the 30 sessions and
finds no mismatch, exit 0. `keydraw.mjs` reads 35 key rows over the 30 sessions with no disagreement, exit 0.
`steps.mjs` holds T70 (median 1 over the path) and T71 (2 over) and fails T73, T74 and T78 (12.5, 4 and 8
over), exit 1: the pilot success walks of T73 A, T74 B and T78 B go on after success, so the failure is the
walks', not the script's (as in tool dry run 1).

**Bar 5 and item 5 on the frozen build** (`bars-dark/`, `bars-light/`, each `bars.mjs --tier 5 --scheme
<theme> --dist <frozen build>`): each walked all 36 screens at 1440 x 900
and 900 x 700 with no `MISS` line, caught every planted case at each size (among them "sixty words and a
five-word heading: counted" and the rejected build's case, below), is not marked untrusted, and exited 0. In
both themes: 0 serious or critical axe findings on every screen; 26 long or partial lists on the 50,000-node
screens, all holding "Large graphs" (bounded, a count, a search); and the rejected build's "While has nodes"
step at 50,000 (`tmp/design-studio/tier5/prep/build-7ca4cae647`, at 1440 x 900) is `caught by the
large-list check (list Reference, 52 rendered)`. `wording.mjs` against `../../tasks.md` and each run's
`vocabulary.json` reads 20 prompts against 36 screens and their spoken text: 0 shared words and 0 shared
phrases not kept on purpose, exit 0. The runs list controls that share a name (the Data place filter card's
"Use Except role staff" checkbox twice on 18 screens, "Use role staff" on 2) and text cut off with no way to
read it whole (the workspace header at 900 x 700); these are findings for the experts and gate nothing in the
run.

**Words at rest** (both themes the same): the screens at rest read 39 words at the start, 57 on the style
host's read-only outline, 66 on the filter host's and 67 on the 50,000-node outline, at both sizes, so three
screens are printed `OVER` the 50-word budget; the workspace open on a step reads 19 to 29 words (limit 40);
no heading is over 3 words. These are severity 2 candidates for the calm-first check (bar 9), not script
failures.

**T79's waits** (`waits.mjs`): on the frozen build's T79 pilot walks (`r1d1/pilot/T79A`, `T79B`, `r1/pilot/T79A`,
`T79B`, `--build 1e123d7d33`: 213 timed steps in 10 routes) one wait passed 10 s: 10.6 s on a step of five
actions ending in typing "Grants" (`r1d1/pilot/T79A/touched-9-1e123d7d33/02.png`), exit 1. On the round's
own scripted 50,000-node walk (`round-1/bars/sessions`, made on d3fda9f2b6, not the frozen build), 9 of 74
steps passed 10 s, longest 33.7 s on Done (`big-900x700/12.png`). Whether the screen showed work under way
is for a person to read from those screenshots; the script did what bar 9 asks of it.

## 7. Fast paths

- **GPU renderer.** All 318 sessions these checks started (`find ... -name session.json` under
  `tool-check-2/1e123d7d33/`, the stand-in's copied walks left out) record `"renderer": "ANGLE (NVIDIA,
  Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)"`; none is SwiftShader.
- **Warm takeover.** `match/session.log` says `took over warm browser 1179950 (warm for 29 s)`, and so do two
  gate sessions (s05, s09), `prove/warm-2` and `prove-tier5/warm-1` and `warm-2`, five of the 20 replays (for
  example `replay/T70A-success`, `warm for 30 s`) and 70 of the 196 detour replays.
- **Replay.** `real.mjs --replay` of the frozen build's pilot success walk of every one of the 20 halves
  (`tmp/design-studio/tier5/r1d1/pilot/<half>/success`, T79 A's `success-1e123d7d33`, 7 to 20 steps) into
  `replay/` printed `replayed all N steps; every check point matched; session ended`, exit 0, each, the two
  50,000-node walks included.
- **Self-test.** `REAL_PROVE_DIR=<tool-check-2/1e123d7d33>/prove real.mjs --prove` on the frozen build, with
  `REAL_TIER` unset: 100 checks `ok`, `every check passed`, exit 0. The same with `REAL_TIER=5` in its
  environment (`prove-tier5/`), as the tier 5 briefing's start command exports it: 100 checks `ok`, exit 0
  (it now pins tier 2, the tier of its planted tasks). Both runs pass "a batch stops at its first miss: the
  steps after it do not run", "a replay of an unchanged route matches every check point and ends the
  session", "a replay stops at the first step whose check points differ, and leaves the session open there",
  "a rewalk replays every route: the unchanged one matches, a missing control and a changed screen diverge
  and keep their folder aside", "the next start of the same build takes over the warm browser, with the app
  already open", "the session draws on the GPU, not SwiftShader", "a drop the page does not take is reported
  as not delivered", "the gate refuses BROWSER_SLOTS above 16", "with every slot full, a bounded start gives
  up with exit 4 and nothing started", "a participant transcript that opens tasks.md voids the session, by
  name" and "an end copies the session into the round's folder with the leak check beside it".
- `node --test tool/with-browser.test.mjs`: 6 tests, 6 pass, 0 fail.

## Problems

Of the tool: none.

Of the round's evidence (not tool failures):

1. Three detours stop where the app now answers differently (section 4): T76 A `detour-3` and T76 B
   `detour-2` (a just-added color line shows no color) and T79 A `detour-4-0c163f54bf` (Done during Drawing
   now closes the workspace). They need a walker on the frozen build before the gate's detours evidence rests
   on them.
2. The scripted walk prints three screens `OVER` the words-at-rest budget at both sizes and in both themes:
   the style host's read-only outline at rest (57 words), the filter host's (66) and the 50,000-node outline
   (67), against 50 (section 6). Each is a severity 2 candidate for the calm-first check (bar 9).
3. `waits.mjs` finds waits over 10 s on the 50,000-node path on the frozen build: in this check's scripted
   walk (`bars-dark/sessions`, `--build 1e123d7d33`) 6 of 74 steps, longest 16.1 s on the step that opens
   Which nodes and the dept checklist (`big-1440x900/03.png`), and in the pilot walks one, 10.6 s
   (`r1d1/pilot/T79A/touched-9-1e123d7d33/02.png`). Each sums several actions; whether the screen showed work
   under way is for bar 9's reader to judge from those screenshots. The round's own `bars/` walk, which the
   gate reads, was made on d3fda9f2b6 (9 waits over 10 s, longest 33.7 s on Done).
4. The pilot success walks of T73 A, T74 B and T78 B go on after success, so a stand-in round built from them
   fails `steps.mjs` on T73, T74 and T78; they cannot stand in for the answer key's path counts (section 6).
5. The round's `plan.md` has no "Gate evidence" section, so `--start` refuses every session of the round
   (section 5). `../../criteria.md` still says "Until the walk counts them, 'Cramped' below is 'not
   re-tested'"; the walk now counts them.
