# Tier 6 round 2: tool dry run 1

Date: 2026-11-05. Build: 3b2a7f0649, served from the main checkout's `.study-builds/tier6-r1d2-3b2a7f0649`
(the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs` at worktree commit cd66fd7c48. Every session
started for these checks is under the main checkout's `tmp/design-studio/tier6/r2/tool-check-1/` (`gate2/`, `fast/`,
`detours/`, `carried/`, `lister-planted/`, `unread/`, `prove/`). `gate/` there holds a first run whose process count
matched nothing, so it is no evidence for the count. No file of the tool or the build changed.

## Result

The tool passes all seven checks. Nothing here stops a session. Four limits and one stale paragraph are listed under
"What these checks leave open".

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass: never more than 4 alive; above 16 refused; all 6 ended |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks without a tool error            | pass: 0 tool errors in 24 replays, 10 routes walked to their end and 34 recorded walks |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass: no bar names a script; what the counted bars lean on holds |
| 7   | Fast paths                                   | pass |

## 1. Browser gate

Six `REAL_TIER=6 real.mjs --start ... empty` commands were launched at the same moment, with no `BROWSER_SLOTS` set
(`gate2/`). A one-second count of the machine's `real.mjs --serve` and `--warm` node processes took 32 readings
(`poll.log`) and never passed 4: 12 readings of 4, 13 of 2, 1 of 1 and 6 of 0.

Four sessions started together. `s2` and `s4` printed `waiting for a free browser slot ...` and started when ends freed
slots. All six `--end` commands exited 0, and the count afterwards read 0.

`BROWSER_SLOTS=17`, `99` and `0` each exit 2 with "BROWSER_SLOTS must be 1 to 16"; `BROWSER_SLOTS=16` runs.

## 2. Matcher

On the start screen "Samples" names the top bar's link and the card's button (`fast/warm1`).

- `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls, so the step did nothing; name
  one: "role=button:Samples" button "Samples", "role=link:Samples" link "Samples"`.
- `--click "Samples#1"` did nothing either: `ambiguous: "Samples#1" picks by position among different kinds of
  control, ...`.
- `--click "Open the"` was refused with its 20 sample cards listed.
- In the walks, shared chips and buttons were refused the same way, with the rest of the batch not run: `"7 nodes,
  select"` (4 candidates) and `"Show in table"` (2) in `carried/`. `"9 nodes, select#1"` in a T91 B walk chose among
  controls of one kind and was clicked.

## 3. File drop

- `--drop florentine.gml` on the start screen (`fast/warm1`) printed `the page took it`, and `05.png` shows florentine
  open with 15 nodes and 20 edges.
- `--drop volunteers.graphml` in a `REAL_TIER=6` session (`fast/t6`) printed the same.
- `--click "Open a file" --upload sources.graphml` answers the real file chooser (`fast/t6b`), printing `a file
  chooser is open` and `chose the file sources.graphml`.
- `--prove` passes "a file dropped on the start screen opens it as a new graph" and "a drop the page does not take is
  reported as not delivered". That line was seen only on the planted page: no real screen tried here refuses a drop.

## 4. Detour walks

Three readings, all with `REAL_TIER=6` on the frozen build.

**Replays (`detours/`).** The detour walk of all 12 task halves from `tmp/design-studio/tier6/round-2/pilot/`, T92 A's
success walk, and 11 routes of the first dry runs (`r1/` and `r1d1/`) that the reports under `../r1/pilot/` and
`../r1d1/pilot/` describe. 13 of the 24 matched to the end, and 163 steps matched in all. No step printed a Playwright
error or a script error, and every `--end` passed its key check.

| Route | What it walks | Result |
| ----- | ------------- | ------ |
| T90 A `detour-1` | Settings and Privacy first, a key in the wrong place, the OpenAI key, then Google | 19 of 19 matched |
| T90 B `detour-1` | Settings and Privacy, a key typed and Escape, Save | 14 of 14 matched |
| T91 A `detour-1` | Menus, right-click, the find box, the command palette, Control+I | 19 of 19 matched |
| T91 B `detour-1` | A change sought through the Assistant | 9 of 9 matched |
| T92 A `detour-1`, `success` | Asking on the left selection | stopped at step 1 on the reply's words |
| T92 B `detour-1` | Steps, Open run, a follow-up, Undo | stopped at step 2: this reply took another number of steps |
| T93 A `detour-1` | The approval, asking why | stopped at step 3 on the reply's words |
| T93 B `detour-1` | The approval, Keep them | stopped at step 3: the model had finished where the recording was still working |
| T94 A `detour-1`, B `detour-1` | Color, then asking to put it back | stopped at step 1: the model was still working where the recording had finished |
| T95 A `detour-1` | A question the file cannot answer | stopped at step 1: 2 steps, not 8 |
| T95 B `detour-1` | The same, with a follow-up | stopped at step 3: the model was still working |
| `r1d1` T90 B `detour-1`, `r1` T90 A `detour-6` | Settings first; the way to the Assistant by keys | 14 of 14, 7 of 7 matched |
| `r1d1` T91 A `detour-1`, `r1` T91 A `detour-4`, `detour-5` | Menus, the palette, Tab to the find box | 19 of 19, 8 of 8, 6 of 6 matched |
| `r1` T92 B `detour-4` | Analyze, typing an algorithm by hand | 12 of 12 matched |
| `r1d1` T91 B `touched-27-x-send-again` | A failed message, the x, Send again | 8 of 8 matched |
| `r1d1` T93 B `touched-10` | The approval card, the chip, Remove | 3 of 3 matched |
| `r1d1` T90 A `touched-30` | The OpenAI key fails, then Google, Send again | stopped at step 4: another step count |
| `r1d1` T94 A `touched-41` | Undo and Redo from an old conversation | stopped at step 1: the model was still working |
| `r1` T95 B `detour-2` | Looking by hand, then asking, Show in table | stopped at step 14 of 16: another step count |

Each of the 11 stops is the model's run-to-run variation, as the replay is built to report: a reply that took another
number of steps, other words, or a fixed `--wait` that ended before or after the model did. Each named its step and
left the session open, and each `--end` then ended it with exit 0.

**The same routes, walked to their end (`carried/`).** Ten of the routes that stopped were sent step by step instead,
waiting after each one until the Assistant's Stop button was gone: T92 A's two, T92 B, T93 A and B, T94 A and B, T95 A
and B, and `touched-41`. All 81 steps ran and exited 0, and all ten `--end` commands exited 0 with a clean key check. Seven
steps met a plain miss or refusal, every one a name from the recorded reply that this reply did not have: "3 steps", "5
steps", "Jump to newest", "Undo#2", or a shared "7 nodes, select" or "Show in table".

**The recorded walks.** A scan of what the tool printed in all 34 routes under `round-2/pilot/`, 385 steps, found no
Playwright, timeout or tool line. It caught its planted `could not click ... Timeout` line and fails on a folder with
no route. It found 17 plain misses and refusals, and 28 console or request lines: the OpenAI key's CORS failure, which
T90 walks on purpose, and one aborted Gemini request.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier6/rounds/round-2/sessions/r2-s05` exited 0 and wrote
  `tmp/studio-sessions/tier6/rounds/round-2/sessions/r2-s05/briefing.md` in the worktree, outside the studio's files.
  The folder holds only that file.
- All 12 briefings were scanned against `tasks.md`, `answers.md` and `criteria.md`: 14 follow-up sentences, 59 other
  `tasks.md` sentences, the avoided-words list, 250 answer-key sentences and 149 criteria sentences, plus the words
  facilitator, hypotheses, success path, Trap fired, Taken on trust and the study documents' file names. There were no
  hits, and the scan caught all five of its planted lines. Each briefing holds the persona, the history, the prompt, the
  start command and the tool's "A session", "Steps" and "Names, dialogs and lists".
- `--start .../sessions/r2-s05 empty` was refused, exit 2, naming the folder to brief and start instead, and no
  `sessions/` folder was created in the round.
- `--prove` passes "a participant transcript that opens tasks.md voids the session, by name" and "an end copies the
  session into the round's folder with the leak check beside it".

## 6. Scripts behind the bars

`../../criteria.md` says "No bar here is scored by a script", and no bar names one, so nothing can be missing there.
The researcher counts every bar. What those counts lean on was checked the same way a script would be:

| What | Exists | Fails on a planted failure | On the frozen build |
| ---- | ------ | -------------------------- | ------------------- |
| Bar 7's `work.json`, `styles.json` and `look` | yes | the Poster layer deleted by hand: `gone: poster_1, poster_2`, `look` 1328d3dd4bea to 76f16b7d52f0, and `--prove`'s planted removal | yes (`lister-planted/`; 1328d3dd4bea is the value in `../../answers.md`) |
| A list that read nothing (`workUnread`) | yes | `measure.test.mjs` passes, 3 of 3 | unit test only, no live run: see below |
| The state list's row 6.4: `words.test.ts` | yes | a planted result code with no words fails, naming the code, in a copy of its check | 36 tests pass; `graphty` differs from the build only by this test |
| The gate's count of requests left (`callsShort`) | yes | `tier6.test.mjs` passes, 9 of 9 | not run: `--gate` rewrites `plan.md` |
| The round's leak check | yes | `--prove`: a planted transcript is voided, and a session with no log fails by name | not applicable: it reads transcripts |

The other scripts of the tool pass their own planted cases: `endstate.mjs`, `steps.mjs`, `score.mjs`, `keydraw.mjs` and
`wording.mjs --self-test` each exit 0. No tier 6 bar reads them.

## 7. Fast paths

- **GPU renderer.** All 71 sessions under `tool-check-1/`, the self-test's included, name the NVIDIA card through ANGLE
  on Vulkan; none reads SwiftShader.
- **Warm browser.** With no `REAL_TIER`, a second `--start` of the frozen build (`fast/warm1`) took 1.7 seconds, and its
  `session.log` reads `took over warm browser 3095642 (warm for 18 s)`. A `REAL_TIER=6` start stays cold by design, as
  the tool's README says (`fast/t6` has no such line), so every session of this round starts cold.
- **Replay.** `real.mjs --replay` of T90 B `detour-1` from `round-2/pilot/` matched all 14 steps and ended its session.
  Replays that diverged stopped at a named step with the session left open, and `--end` then ended them.
- **`--prove`.** 113 checks ok, none failed, exit 0. That includes "a batch stops at its first miss", "a replay of an
  unchanged route matches every check point", "a replay stops at the first step whose check points differ", "a rewalk
  replays every route" and "the next start of the same build takes over the warm browser".
- **`node --test with-browser.test.mjs`.** 5 passed, 0 failed.

## What these checks leave open

- **A replay rarely reaches the end of a walk with a real model.** 11 of the 24 stopped, and those are the routes where
  the model does the work. A route's fixed `--wait` and its "N steps" names belong to one reply. A stopped replay is
  therefore no sign of a changed build on these tasks: it needs a person to read the step, or a walk like `carried/`.
- **T92's chip click was not walked on this build.** The T92 routes hover the chip and go to Show in table, and none clicks
  it; in `carried/` the hover printed `tooltip: null` and the shared "Show in table" was refused. Clicks on a chip did
  work on other tasks (`82 nodes, select` in T93 B, `9 nodes, select#1` in T91 B), and nothing in the tool stands in its way.
- **`workUnread` has no live failure.** A planted setup that opens nothing (`unread/`) still read a full list and ended
  with exit 0, because the start screen holds the Les Miserables sample behind it. So an empty list could not be planted
  without changing the tool, and the failure stands on `measure.test.mjs` alone.
- **A briefed folder's `--start` was not tried**, since it would write into a real session's folder, and neither was
  `--gate`, which rewrites `plan.md`. `plan.md` holds a "Gate evidence" section for this build.
- **`plan.md` contradicts itself.** "Open before the first session", item 1, still says `--gate` exits 1 and the walks
  are missing, while the "Gate evidence" section below it lists them. Its count of requests spent, 3,000, is also old.

These checks took the tier's request count from 3,294 to 3,502. That leaves 1,498 of the 5,000, and the 12 sessions may
use 480.
