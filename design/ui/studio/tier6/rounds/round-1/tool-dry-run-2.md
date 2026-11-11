# Tier 6 round 1: tool dry run 2

Date: 2026-11-05. Build: 3b2a7f0649, served from the main checkout's `.study-builds/tier6-r1d2-3b2a7f0649`
(the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs` at worktree commit 899ecf2f6a. Every session
started for these checks is under the main checkout's `tmp/design-studio/tier6/r1/tool-check-2/` (`gate/`, `fast/`,
`detours/`, `lister-planted/`, `prove/`). No file of the studio, the tool or the build changed. The 12 briefings under
the worktree's `tmp/studio-sessions/` were written again.

## Result

The tool passes all seven checks, and every fault of the first tool dry run is gone. The round still cannot start,
for two reasons that are not faults of the tool:

- **The Gemini requests.** 108 of the tier's 3,000 are left, and the gate needs 480 for the 12 sessions. It is
  already under "For the owner" in `../../../owner-decisions.md`. These checks spent 37 (2,855 to 2,892).
- **The walks.** `real.mjs --gate` on this folder exits 1 with one `FAIL` line per task half: none of the 12 halves
  has a walk on this build. Those walks also need Gemini requests.

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass: never more than 4 alive; above 16 refused; all 6 ended |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks without a tool error            | pass: 0 tool errors in 13 routes; the T92 chip's own click was not reached |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass: no bar names a script; the records and the test the bars lean on hold |
| 7   | Fast paths                                   | pass |

## 1. Browser gate

Six `REAL_TIER=6 real.mjs --start ... empty` commands were launched at the same moment, with no `BROWSER_SLOTS` set
(`gate/`). A one-second count of the machine's `real.mjs --serve` and `--warm` node processes took 59 readings
(`poll.log`) and never passed 4: 36 readings of 4, 17 of 3, the rest fewer. No warm browser ran during the check.

Four sessions started within 4 seconds. `s1` and `s2` printed `waiting for a free browser slot ...` and started as
ends freed slots. All six `--end` commands exited 0, and the count afterwards read 0.

`BROWSER_SLOTS=17`, `99` and `0` each exit 2 with "BROWSER_SLOTS must be 1 to 16"; `BROWSER_SLOTS=16` runs.

A session of another tier keeps the cap of 8, as the tool's README says. Every command of this round carries
`REAL_TIER=6` or a folder under `tier6/`, so the cap of 4 applies to all of them.

## 2. Matcher

On the start screen "Samples" names the top bar's link and the card's button (`fast/warm1`).

- `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls, so the step did nothing; name
  one: "role=button:Samples" button "Samples", "role=link:Samples" link "Samples"`.
- `--click "Samples#1"` did nothing either: `ambiguous: "Samples#1" picks by position among different kinds of
  control, ...`.
- `--click "Open the"` was refused with its 20 sample cards listed.
- In a walk of T92 A, `--click "7 nodes, select"` was refused with its two chips listed, and the rest of that batch
  did not run.

## 3. File drop

- `--drop florentine.gml` on the start screen (`fast/warm1`) printed `the page took it`, and `05.png` shows florentine
  open with 15 nodes and 20 edges.
- `--drop volunteers.graphml` in a `REAL_TIER=6` session (`fast/t6`) did the same: 24 nodes, 63 edges, with Assistant
  on the rail.
- `--click "Open a file" --upload sources.graphml` answers the real file chooser (`fast/t6b`) and every T90 route.
- `--prove` passes "a drop the page does not take is reported as not delivered". That line was seen only on the
  planted page: no real screen tried here refuses a drop.

A file dropped on the open Settings dialog (`fast/t6/05.png`) was taken too: the app opened its Join view behind the
dialog. That is the app's behavior and no task goes there.

## 4. Detour walks

Thirteen routes of the pilots (`tmp/design-studio/tier6/r1/pilot/` and `r1d1/pilot/`) replayed on the frozen build with
`REAL_TIER=6`, at least one per task. Routes with few model calls were chosen because of the requests left. No step
printed a Playwright error or a script error, and every `--end` passed its key check. The only console errors
and failed requests in the 122 steps are the OpenAI key's CORS failure, which T90 and T91 B walk on purpose.

| Route | What it walks | Result |
| ----- | ------------- | ------ |
| T90 B `detour-1` | Settings and Privacy first, a key typed in the wrong place, Escape out | 14 of 14 matched |
| T90 A `detour-6` | The way to the Assistant by Tab and Control+I, with the file opened by keys | 7 of 7 matched |
| T90 A `touched-30` | The OpenAI key fails, then Google, Send again | all 5 steps ran; the last differs: the model had answered sooner |
| T91 A `detour-1` | Menus, right-click, the find box, the command palette | 19 of 19 matched |
| T91 A `detour-4` | The command palette, typing AI and Assistant | 8 of 8 matched |
| T91 A `detour-5` | Tabbing to the find box and typing a word | 6 of 6 matched |
| T91 B `touched-27-x-send-again` | A failed message, the x, Send again | 8 of 8 matched |
| T92 B `detour-4` | Analyze, typing an algorithm by hand | 12 of 12 matched |
| T92 A `touched-13` | Scope x, a chip, Show in table | stopped at step 1 on the model's own words; carried on below |
| T93 B `touched-10` | The approval card, Remove | all 3 steps ran; the model was still working where the recording had finished |
| T94 A `touched-18` | Open run, then Undo | stopped at step 2: this reply took 3 steps, not 1 |
| T94 A `touched-41` | Undo and Redo from an old conversation, Control+Z | 12 of 12 matched |
| T95 B `detour-2` | Looking by hand, then asking what the file cannot say, Show in table | 16 of 16 matched |

Both of the first dry run's tool errors are gone. T90 A `touched-30` passed the CORS line at step 2, where the session's
port used to differ, and T91 B `touched-27-x-send-again` passed step 3, where a control the app was removing used to
print Playwright's words.

The four stops are the model's run-to-run variation, as the replay is built to report. Each named its step and left
the session open, and each `--end` then ended it. The Undo that `touched-18` did not reach was walked in `touched-41`.

**One gap: T92's chip.** T92 A was carried on by hand twice. The first time the reply had two chips of the same name,
the click was refused as in section 2, and Show in table then worked: 7 rows marked, 7 nodes selected
(`detours/T92A-carried-on/06.png`). The second time the reply had no chip, and the tool printed plain misses
(`nothing on screen is called ...`). So a click on the chip itself was not walked on this build. Nothing in the tool
stands in its way, and more tries would only have spent requests.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier6/rounds/round-1/sessions/r1-s05` exited 0 and wrote
  `tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s05/briefing.md` in the worktree, outside the studio's files.
  The folder holds only that file.
- All 12 briefings were written and scanned against `tasks.md`, `answers.md` and `criteria.md`: 14 follow-up sentences,
  59 other `tasks.md` sentences, the avoided-words list, 250 answer-key sentences and 149 criteria sentences, plus the
  words facilitator, hypotheses, success path, Trap fired, Taken on trust and the study documents' file names. There
  were no hits, and the scan caught all five of its planted lines. Each briefing holds the persona, the history, the
  prompt, the start command and the tool's "A session", "Steps" and "Names, dialogs and lists".
- r1-s05's start now reads `setup:connected-sources-open.txt`, which no longer names the selection it measures.
- `--start .../sessions/r1-s05 empty` was refused, exit 2, naming the folder to brief and start instead, and no
  `sessions/` folder was created in the round.
- `--start` of the briefed folder itself is refused too, exit 1, because `plan.md` holds no gate evidence yet.
- `--prove` passes "a participant transcript that opens tasks.md voids the session, by name" and "an end copies the
  session into the round's folder with the leak check beside it".

## 6. Scripts behind the bars

`../../criteria.md` says "No bar here is scored by a script", and no bar names one, so nothing can be missing there.
The researcher counts every bar. What those counts lean on was checked the same way a script would be:

| What | Exists | Fails on a planted failure | On the frozen build |
| ---- | ------ | -------------------------- | ------------------- |
| Bar 7's `work.json`, `styles.json` and `look` | yes | the Poster layer deleted by hand: `gone: poster_1, poster_2`, `look` 1328d3dd4bea to 76f16b7d52f0, and `--prove`'s planted removal | yes (`lister-planted/`; 1328d3dd4bea is the value in `../../answers.md`) |
| A list that read nothing (`workUnread`) | yes | `measure.test.mjs` passes, and `--end` prints `FAIL` and exits 1 | unit test only, no live run |
| The state list's row 6.4: `words.test.ts` | yes | a planted result code with no words fails, naming the code, in a copy of its check | not applicable: it tests `words.ts`, 36 tests pass, and `graphty` differs from the build only by this test |
| The gate's count of requests left (`callsShort`) | yes | `tier6.test.mjs` passes | yes: it refuses this round |
| The round's leak check | yes | `--prove`: a planted transcript is voided, and a session with no log fails by name | not applicable: it reads transcripts |

`real.mjs --gate` no longer asks tier 6 for a `bars.mjs` run. Bar 12's "above 50 words" is counted by hand from the
Figma and visual walks; no script counts it, and the criteria do not say one does.

## 7. Fast paths

- **GPU renderer.** All 45 sessions, the self-test's included, name the NVIDIA card through ANGLE on Vulkan; none reads
  SwiftShader.
- **Warm browser.** With no `REAL_TIER`, a second `--start` of the frozen build (`fast/warm1`) took 1.9 seconds, and its
  `session.log` reads `took over warm browser 1831948 (warm for 19 s)`. A `REAL_TIER=6` start stays cold by design, as
  the tool's README says, so every session of this round starts cold.
- **Replay.** `real.mjs --replay` of T90 B `detour-1` matched all 14 steps and ended its session. Replays that diverged
  stopped at a named step with the session left open, and `--end` then ended them.
- **`--prove`.** 113 checks ok, none failed, exit 0. That includes "a batch stops at its first miss", "a replay of an
  unchanged route matches every check point", "a replay stops at the first step whose check points differ", "a rewalk
  replays every route" and "the next start of the same build takes over the warm browser".
- **`node --test with-browser.test.mjs`.** 5 passed, 0 failed.

## 8. What still stands before the first session

`real.mjs --gate` on this folder exits 1. Its 13 `FAIL` lines say the same two things as "Result": no half has a success
or detours walk on 3b2a7f0649 (T90 B and T93 B no keyboard walk either), and the requests left cannot carry 12 sessions.
The pilots' walks took 2 to 37 calls each, so the walks alone need more than the 108 left. Items 2 and 3 of `plan.md`'s
"Open before the first session" are not tool matters and were not touched here.
