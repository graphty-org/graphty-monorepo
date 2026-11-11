# Tier 6 round 1: tool dry run 1

Date: 2026-11-05. Build: 3b2a7f0649, served from the main checkout's `.study-builds/tier6-r1d2-3b2a7f0649`
(the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs` at worktree commit 885c1b66c1. Every
session started for these checks is under the main checkout's `tmp/design-studio/tier6/r1/tool-check-1/`
(`gate-default/`, `gate-slots4/`, `fast/`, `t6-a/`, `detours/`, `lister-planted/`, `bars/`, `prove/`). No file of
the studio, the tool or the build changed; `git status` was clean before this report. Re-briefing `r1-s01` rewrote
its `briefing.md` under the worktree's `tmp/studio-sessions/`.

## Result

Not ok. Two things stop the round, and neither is a defect in a participant's path:

- **The gate cannot pass for this tier.** `real.mjs --gate` needs `bars/bars.json` with no `MISS` line and has no
  tier 6 branch, so it asks for the default `bars.mjs` walk. That walk fails on the frozen build with 20 `MISS`
  lines (section 6). `--start` refuses every session of the round until the gate passes.
- **The Gemini cap is nearly spent.** The tier's count stood at 2,822 of 3,000 before these checks and stands at
  2,855 after them: 145 calls are left. The walks the gate still needs and the 12 sessions need more than that
  (section 8). A session the cap stops is VOID (`../../answers.md`).

The matcher, the file drop, the participant's isolation and the fast paths pass. The browser gate holds its own cap
of 8, not the 4 this check names.

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | fail as written: 8 alive at the defaults; the gate's cap of 8 holds, and the refusal above 16 passes |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks without a tool error            | fail: 2 tool errors in 8 routes; 3 more stop on the model's different reply |
| 5   | Participants cannot reach facilitator files  | pass, with one hint left in the briefing of r1-s05 |
| 6   | Every script-scored bar has a working script | no bar names a script; the records bar 7 reads pass; the gate's `bars.mjs` fails |
| 7   | Fast paths                                   | pass; a tier 6 start never takes a warm browser, by design |

## 1. Browser gate

**At the defaults (`gate-default/`).** Six `real.mjs --start ... empty` commands were launched at the same moment. A
one-second count of the machine's `real.mjs --serve` and `--warm` node processes (`poll.log`, 122 readings) reached
8, 20 times: six sessions and two warm browsers. So the check as written, never more than 4, fails. The cause is not
a gate fault: `real.mjs` sets `BROWSER_GPU=1`, and `with-browser.sh` then defaults to 8 slots, as the tool's README
and the design-studio skill both say. The check's 4, the criteria's "Live at once: at most 4 participants" and the
tool's 8 disagree, and nothing in a participant's start command sets 4. Only the round runner's own semaphore can
hold the round to 4.

**With `BROWSER_SLOTS=4 REAL_TIER=6` (`gate-slots4/`, 136 readings).** Four sessions started at once, and the count
of sessions never passed 4. `s06` and `s03` printed `waiting for a free browser slot ...` and started when ends freed
slots. The total read 6 twice: two warm browsers left by the run before held slots 5 and up, which a cap of 4 does
not count, and they closed by themselves once starts had queued for 6 seconds. No warm browser started during the
run.

**Above 16.** `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each exit 2 with "BROWSER_SLOTS must be 1 to 16";
`BROWSER_SLOTS=16` runs. All twelve sessions were ended, each `--end` exiting 0 (`exits.txt` in each folder).

## 2. Matcher

On the start screen "Samples" names the top bar's link and the card's button (`fast/warm1`).

- `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls, so the step did nothing; name
  one: "role=button:Samples" button "Samples", "role=link:Samples" link "Samples"`.
- `--click "Samples#1"` did nothing either: `ambiguous: "Samples#1" picks by position among different kinds of
  control, ...`.

`--prove` passes "a name several controls share is refused, with each candidate named" and "a position pick among
different kinds of control is refused, naming each kind".

## 3. File drop

- `--drop florentine.gml` on the start screen (`fast/warm1`) printed `dropped the file florentine.gml on the middle
  of the window (empty canvas); the page took it`; the next screenshot shows florentine open, 15 nodes and 20 edges.
- `--drop volunteers.graphml` in a `REAL_TIER=6` session (`t6-a`) did the same: 24 nodes, 63 edges, with Assistant on
  the rail.
- `--click "Open a file" --upload <file>` answers the real file chooser in every detour walk below.
- `--prove` passes "a drop the page does not take is reported as not delivered". No screen walked here refused a
  drop, so that line was seen only on its planted page.

## 4. Detour walks

Eight routes of the dry run's pilots (`tmp/design-studio/tier6/r1d1/pilot/`), at least one per task, replayed on the
frozen build with `REAL_TIER=6`, then two carried on past their stop. Routes with few model calls were chosen because
of the cap (section 8); these walks spent 33 calls.

| Route | What it walks | Result |
| ----- | ------------- | ------ |
| T90 B `detour-1` | Settings and Privacy first, a key typed in the wrong place, Escape out | 14 of 14 matched, 0 calls |
| T91 A `detour-1` | Menus, right-click, the find box, the command palette | 19 of 19 matched, 0 calls |
| T93 B `touched-10` | The approval card, Remove | 3 of 3 matched, 6 calls |
| T90 A `touched-30` | The OpenAI key fails, then Google, Send again | **tool error** at step 2; all 5 steps ran when carried on, 7 calls |
| T91 B `touched-27-x-send-again` | A failed message with the other provider | **tool error** at step 3 |
| T92 A `touched-13` | Scope x, a chip, Show in table | stopped at step 1 on the model's reply; carried on, this reply had no chip to click |
| T94 A `touched-18` | Open run, then Undo | stopped at step 2: this reply took 2 steps, not 1 |
| T95 B `touched-35` | A question the file cannot answer | stopped at step 2: no "9 steps" row in this reply |

**Tool error 1: a replay fails on the session's own port.** `checkLines` in `real.mjs` strips paths and sizes, but
not the loopback port. A browser console line naming the page's origin (`from origin 'http://127.0.0.1:40551'`)
differs in every session, so any route holding a CORS error diverges at that step. This is the OpenAI key's failure,
which T90's prompt sends every session into. It affects replays only, not a participant.

**Tool error 2: a click on a control the app is removing.** In `--click Save --click Done` the Settings dialog closes
after Save. The recording printed `nothing on screen is called "Done"`; the replay found the button first and printed
`could not click "Done": elementHandle.click: Element is not attached to the DOM`. A participant who batches those
two steps sees Playwright's words. It is a race between the name lookup and the dialog closing.

The three model stops are not tool errors: a route's later steps name rows the model wrote, and the replay stopped
and said why, as it should. It means these three tasks' later detours were not walked here on this build. Control
names that hold a time (`ran Nov 5, 3:13:37 PM`) also count as screen differences; they fit inside the tolerance on
their own.

## 5. Participants and facilitator files

- `real.mjs --brief .../tier6/rounds/round-1/sessions/r1-s01` exited 0 and wrote
  `tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s01/briefing.md` in the worktree, outside the studio's files;
  the folder holds only that file.
- A scan of all 12 briefings against `tasks.md` and `answers.md` (19 follow-up sentences, the avoided-words list, the
  measures, 270 answer-key lines, and the words facilitator, hypotheses, success path and the study documents' file
  names) found nothing, and caught both its planted lines. Each briefing holds the persona, the history, the prompt,
  the start command and the tool's "A session", "Steps" and "Names, dialogs and lists".
- `--start .../sessions/r1-s01 empty` was refused, exit 2, naming the folder to brief and start instead. No `sessions/`
  folder was created in the round.
- `--prove` passes "a participant transcript that opens tasks.md voids the session, by name" and "an end copies the
  session into the round's folder with the leak check beside it".

**A hint left in r1-s05 (T92 A).** Its start command names `setup:connected-sources-selected.txt`, and T92 A measures
whether the reader notices a selection nobody told them about. The word is in the briefing. The setup's steps,
`--expect 14 nodes selected` included, are also in the participant's own `session.json`, which the leak check allows.

## 6. Scripts behind the bars

`../../criteria.md` says "No bar here is scored by a script", and no bar names one. So the check's first half is empty
rather than passed. Three things were checked in its place.

**The records bar 7 counts from pass.** Bar 7 reads the `look` values and `work.json`. On the frozen build, a session
of `setup:connected-lesmis-poster.txt` (`lister-planted/`) read `look` 1328d3dd4bea, the value in `../../answers.md`,
with nine layers and one source in `work-start.json`. With the Poster layer deleted by hand, `work.json` gave `gone:
poster_1, poster_2`, `styles.json` gave the same two under `changes`, and `look` moved to 76f16b7d52f0. `--prove` also
passes "a planted removal of the loaded table is listed as gone at the end".

One gap: a lister that reads nothing does not fail. `--end` exits 0 and `workGone` called with no start returns
nothing gone, which reads as a clean session. An unreadable end lists everything as gone, which at least shows.

**The test the state list names was not found.** Row 6.4 counts "the rest by a test that puts each code through
`words.ts`". No test in `graphty/src` calls `endWords`, the function that takes a result code. It is to be named in
the scores, so bar 10 cannot hold for that row until one exists.

**The gate's bars run fails on this build.** `bars.mjs <out> --dist <frozen build>` (`bars/`) exited 1 with 20 `MISS`
lines and an empty measurement. Two mechanisms:

- The tier 1 screens stop at once. `fresh` in `bars.mjs` waits for `main, [role=main]`, and `Frame.tsx` renders `main`
  hidden on the start screen, so the wait times out after 30 seconds and the inner run exits 1.
- The tier 2 walks start with `--click "New from data..."`, a control that is not on the start screen of this build,
  so their setups fail.

The gate (`real.mjs`, `const own = tier === "3" || tier === "4"`) has no tier 6 case, and nothing in tier 6's criteria
needs these screens. Separately, the three walks whose setup failed left their sessions running; they were ended by
hand. All 12 task halves also still have no walk on this build, as `plan.md` says.

## 7. Fast paths

- **GPU renderer.** All 43 sessions name the NVIDIA card through ANGLE on Vulkan; none reads SwiftShader.
- **Warm browser.** With no `REAL_TIER`, a `--start` of the frozen build after the first (`fast/warm1`) took 1.6
  seconds, and its `session.log` reads `took over warm browser 1432751 (warm for 177 s)`. With `REAL_TIER=6` the start
  is always cold (`t6-a`: no such line), as the tool's README says: the app reads `site.json` once, so a warm browser
  cannot have the Assistant. Every session of this round therefore starts cold.
- **Replay.** `real.mjs --replay` of T90 B `detour-1` matched all 14 steps in 25 seconds and ended its session; replays
  that diverged stopped at a named step with the session left open, and were then ended.
- **`--prove`.** 109 checks ok, 0 failed, every check passed, exit 0. That includes "a batch stops at its first miss", "a
  replay of an unchanged route matches every check point", "a replay stops at the first step whose check points
  differ", "a rewalk replays every route" and "the next start of the same build takes over the warm browser".
- **`node --test with-browser.test.mjs`.** 5 passed, 0 failed.

## 8. The Gemini cap

`tmp/design-studio/tier6/gemini-requests.count` read 2,822 before these checks and 2,855 after, against the tool's
3,000 (`TIER6_CAP`). The dry runs spent the rest. The criteria's "far above what 12 sessions need" no longer holds.

- The pilots' walks took 2 to 37 calls, most between 4 and 14. The gate still needs at least 26 walks on this build
  (a success and a detours walk for 12 halves, and two keyboard walks), so about 200 or more.
- 12 sessions at the criteria's limit of about 40 is up to 480, and the experts walk Assistant states too.

`REAL_GEMINI_COUNT` counts in another file and so would pass the cap unnoticed; it was not used here, and it is not a
way round a cap that exists to bound spending. Raising the cap or resetting the count is a spending decision.
