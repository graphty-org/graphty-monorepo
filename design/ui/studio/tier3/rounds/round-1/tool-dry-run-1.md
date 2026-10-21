# Tier 3 round 1: tool dry run 1

Checked on 2026-10-21, before any round 1 session, on the frozen build 758b8e8081
(`.study-builds/tier3-r1d2-758b8e8081`, the first line of `../../criteria.md`), with the tool at
commit 22cb4d4365. Nothing in the studio's files was changed; every walk, session and planted case
below ran under `tmp/tool-dry-run-1/` of the studio worktree.

**Verdict: not ready.** Checks 1 to 5 pass. Check 6 fails: the scripted walk that scores bars 6
and 8 cannot get past the frozen build's start page, the wording check lacks three of the planted
cases the criteria require, bar 4's limit in the scorer is 12 where the criteria say 10, the
key-and-drawing measurement names no script, and the gate passes a round that the criteria say it
must refuse. The round cannot start on this tool.

## 1. The browser gate -- pass

Six sessions were started at once with `real.mjs --start` (each takes its slot through
`with-browser.sh`) while `real.mjs --prove` and the bars walk were also asking for slots. A poll
of every live Chromium carrying a browser slot ran every 1 to 2 seconds (one pass over `/proc`
takes about a second) for the whole run: 390 readings, never more than 4 (4 in 247 of them).
Four sessions started at once; the fifth and sixth waited ("waiting for a free browser slot")
and started only as earlier ones ended. Every session was ended, and the last reading after the
ends showed none of them alive.

- `BROWSER_SLOTS=5` and `BROWSER_SLOTS=0`: `with-browser.sh` refuses with exit 2 and says why.
- `BROWSER_SLOTS=9` on `real.mjs --start`: the start stops, exit 1, nothing started.

## 2. The matcher -- pass

- On the frozen build's start page, `--click Samples` is refused: `ambiguous: "Samples" matches 2
  controls, so the step did nothing; name one: "Samples#1" button "Samples", "Samples#2" link
  "Samples"`. No screenshot change followed.
- `--prove`: "a name several controls share is refused, with each candidate named" and "a
  position pick among different kinds of control is refused, naming each kind" both `ok`.

## 3. File drop -- pass

- `--drop volunteers.graphml` on the frozen build's start page printed `the page took it`, and the
  next screenshot is the "Open as a new graph" page with volunteers' 24 node rows and 63 edge
  rows. The drop goes through the browser's own drag input (DevTools `Input.dispatchDragEvent`
  with a real file), not page-made events.
- `--prove`: "a drop where nothing takes it says it was not delivered" and "a file dropped on the
  start screen opens it on the Data page" both `ok`.

## 4. Detours -- pass

Each task's commonest detours (`../../tasks.md`, "Detours the dry run walks") were walked on the
frozen build, 13 walks and 142 steps: the start page's demo buttons, the notice left alone, a
sample from the main menu, the top bar's Samples link and the library search, Control+O with a
graph open; "Open network data", "New project" then "Add data...", a file dropped on the start
page, Cancel then a second try; T39's new layer with no condition, "dark green" typed, the Edge
tab's color first; T40's typing straight after a card and the find box; T41's yes/no left on its
default, "no value" searched in the add menu, an unfinished card dropped with Enter, Escape in the
picker; T43's size link icon opened and closed; T45's Node tab colored first and an edge width
typed; T46's filter cleared by Escape, the run's folder, the "Color from each layer" dialog and
the find box; T49's three Control+Z and a layer removed by right-click; T50's picker opened and
closed and Values; T51's color on Everything and a category card.

No step hit a tool error (no exception, no refused step syntax, no exit 2). Every miss the tool
printed was the walk's own wrong guess about the screen, reported the way a participant would
need it: `nothing on screen is called "Color"` when Everything's Line already held Color; `could
not click "Add to node fill" ... element is not enabled` with the browser's reason; `could not
click "Done" ... <div role="option" value="Mme Hucheloup"> ...` when the text card's name list
covered Done; `nothing that takes text has focus (focus is on button "Analyze")` after a second
Analyze click closed the list. No step reported a script error, console error or failed request.
Logs and screenshots: `tmp/tool-dry-run-1/detours/`.

## 5. Participants cannot reach facilitator files -- pass

- `real.mjs --brief .../rounds/round-1/sessions/r1-s01` wrote
  `tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s01/briefing.md`, outside the studio's
  files, and created nothing in the round's folder. It holds Elena's persona, her roster history
  ("This is your first time ..."), T39's Prompt A word for word and the exact `--start` command
  with the frozen build and her own folder, then the tool's "A session", "Steps" and "Names,
  dialogs and lists". No answer key, facilitator notes, follow-up, avoided words or criteria.
  One leftover: the persona's "What would delight her" keeps the line "See
  `study/hypotheses/explorer-elena.md` for the design hypotheses these outcomes test". That file
  does not exist and the leak check voids any read under the studio's files, but the line points
  a participant at team material and should be dropped from the briefing.
- `--start .../rounds/round-1/sessions/r1-s01` is refused (exit 2): "a participant's session
  inside the studio's files ... brief it ... and start the folder that prints".
- `--start` of the briefed participant folder is refused too (exit 1) while `plan.md` holds no
  "Gate evidence" section, as it should be before the gate.
- `real.mjs --prove` on the frozen build: all 85 checks `ok`, including "a participant
  transcript that opens tasks.md voids the session, by name" and "an end copies the session into
  the round's folder with the leak check beside it".
- `real.mjs --leaks rounds/round-1` with no sessions run: exit 1, "FAIL: no participant log read
  for 56 sessions", so a leak check that read nothing does not report "no leaks". (It writes
  every planned session's briefing under `tmp/studio-sessions/` as it goes.)

## 6. Every scripted bar -- FAIL

| Bar | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build |
| --- | ------ | ------ | -------------------------------- | ------------------- | ------------------------ |
| 1 Task success, 2 False done, 3 Wrong turns, 4 Time to first styled graph | `tool/score.mjs` | yes | yes (`--self-test`, 17 planted cases caught) | yes: an empty round prints "no valid session, so no bar was measured", exit 1 | reads grades and `styles-steps.jsonl`, no build; but see bar 4's limit below |
| 6 Accessibility, 8 Words at rest | `tool/bars.mjs --tier 3` | yes | partly: 8 planted cases caught, one not ("the typed check typed into no field") | yes (that miss marks the run NOT TRUSTED, exit 1) | **no**: 92 MISS lines, 2 screens measured |
| Wording check (preflight 7, beside bars 6 and 8) | `tool/wording.mjs` | yes | partly (`--self-test` passes, but without three cases the criteria require) | yes: no screens read gives "FAIL: read 32 prompts and 0 screens", exit 1 | not reached: needs the walk's `vocabulary.json` |
| 5 key-and-drawing measurement ("read by script") | none named | **no** | -- | -- | -- |
| Gate (preflight 9) | `real.mjs --gate` | yes | partly | yes (a plan with no rows: "lists no session") | refuses round 1 today, but for the wrong reason (below) |

What fails:

- **`bars.mjs --tier 3` cannot walk the frozen build.** Its walks (`WALKS3`) were written for the
  build before the start page: they open files with "Open project or file", which 758b8e8081 does
  not have ("Open a file" and the Samples button are there), and the first walk's "Everything,
  Node tab" expects "Which nodes" where it is not. The dark run measured only "the start screen"
  and "a sample just opened" at 1440 x 900; every other bar 6 screen, every focus check and every
  typing check is a MISS, at both sizes (`tmp/tool-dry-run-1/bars-dark.log`, `bars/bars.json`).
  The light run was not started: it walks the same moves.
- **`WALKS3` still lacks what the criteria require of it**: the five screens added on 2026-10-18
  (the find box with a name typed and its results, a node's inspector with Memberships and "Why
  this look", a node's own Style tab with its Fill "+", the open shape list, a sample with the key
  switched on), the typing check after "Starts with", and `spoken.json` (the word appears nowhere
  in `bars.mjs`). The planted case "a MISS line for each of the five screens and for the typing
  check after Starts with" (preflight 3) therefore cannot exist either.
- **Bar 8's limits were not re-recorded on the round 1 build.** `tool/bars-limits.json` "tier3"
  is still build 31e8c23878b6 (2026-10-17). On 758b8e8081 "a sample just opened" counts 75 words
  against its limit of 50; the extra words are the private-window notice and its buttons.
- **`wording.mjs` misses the planted cases preflight 3 names**: its stemmer joins only plurals
  (no "drawn" against "draw", "picked" against "pick", "kept" against "keep"); it reads only
  `vocabulary.json`, never `spoken.json`; and it compares single words, so a shared phrase of two
  or more words is never caught. Its self-test plants none of the three.
- **Bar 4's limit is 12 in the scorer, 10 in the criteria.** `score.mjs` defaults `--key-steps`
  to 6 (limit `2 * 6`), its usage line and the tool README show `--key-steps 6`, and nothing in
  the studio passes `--key-steps 5`. Criteria bar 4: "at most 10, twice the answer key's 5 ... The
  limit is a number". A run scored as documented holds bar 4 at a median of 11 or 12, which the
  criteria fail. The limit should be the fixed 10, not derived from a flag.
- **Bar 5's key-and-drawing check names no script.** The criteria confirm a key-and-drawing
  disagreement with "the session's `styles.json` colors against the key's values and the picker's
  count, read by script"; no tool script compares those, so the measurement does not exist.
- **The gate passes what it must refuse.** `gateCheck` in `real.mjs` keys a pilot by its walk
  folder's own name and accepts one walk per half: a planted round whose plan names T39 A, with
  one session folder at `pilot/T39A/` and a stub `bars/bars.json` holding only `{"build":
  "758b8e8081x", "untrusted": []}`, passed the gate and got a "Gate evidence" section
  (`tmp/tool-dry-run-1/gate-round/`). The same walk at `pilot/T39A/success/`, the layout every
  dry run uses (`rounds/r1d2/pilot/T39A/m-pointer/`), is not found. It never checks the three
  walks a half needs, `keyboardOnlyMode: true` on Sam's halves, the build equivalence of
  preflight 1, a bars run's MISS lines or missing bar 6 screens, or `spoken.json`. Preflight 9
  asks for all of these, and "gateCheck keys by half" is listed as owed since 2026-10-19.

## Beside the tool

Not tool defects, but the gate will need them once it checks what preflight 4 asks:

- `rounds/round-1/` has no `pilot/` folder; the dry-run walks on 758b8e8081 are under
  `rounds/r1d2/pilot/`.
- No walk on 758b8e8081 of Sam's four halves (T39 A, T40 A, T47 B, T48 A) records
  `keyboardOnlyMode: true`: T39 A's `j-keys`, `k-keys` and `m-keys` were started without
  `--keys`. The newest `--keys` walks of those halves are on 6de5f95d12, e3c5bca8e6, 6dd0b00bd7 and
  earlier builds.
- The start page shares names beyond Samples: the bars walk's shared-name check lists link "Docs"
  three times and link "GitHub" twice.

## Evidence

All under the studio worktree's `tmp/tool-dry-run-1/`: `gate-test.sh`, `gate-test.log` and
`gate/poll.log` (check 1); `detours.sh`, `detours2.sh` and `detours/` (checks 2 to 4);
`prove.log` (`real.mjs --prove`, 85 ok); `bars-dark.log` and `bars/` (the bars walk);
`empty-round/` and `empty-vocab.json` (the zero-item runs); `gate-round/` (the planted round the
gate passed).
