# Tier 3 round 1: tool dry run 2

Checked on 2026-10-21, before any round 1 session, on the frozen build 758b8e8081
(`.study-builds/tier3-r1d2-758b8e8081`, the first line of `../../criteria.md`), with the tool at
commit 0664a753fd. Nothing in the studio's files was changed; every walk, session and planted case
below ran under `tmp/tool-dry-run-2/` of the studio worktree.

**Verdict: not ready.** Checks 1 to 5 pass. Check 6 fails on one point: the scripted walk that
scores bar 6 walks every screen at 900 x 700 but measures none of bar 6's four checks there (axe,
shared names, focus, typing), and the gate counts those screens as covered. Three smaller tool
problems and the walks the gate still needs are listed after the checks.

## 1. The browser gate -- pass

- Six sessions were started at once with `real.mjs --start` (each takes its slot through
  `with-browser.sh`), with nothing else of the studio running. A poll of every live Chromium
  carrying a studio browser slot ran for the whole run, one reading about every 2 seconds (a
  1-second sleep plus one pass over `/proc`): 287 readings, never more than 4 (4 in 127 of them).
  Four sessions started within 9 seconds; s2 and s6 printed "waiting for a free browser slot" and
  started only after earlier ones ended. All six ended; the last readings show none alive.
- An earlier run of the same six, beside the bars walks, the tool's self-check and two detour walk
  lanes, never showed more than 3 (see problem 3 for why not 4).
- `BROWSER_SLOTS=5` and `BROWSER_SLOTS=0`: `with-browser.sh` refuses with exit 2 and says why.
  `BROWSER_SLOTS=9` on `real.mjs --start`: the start stops, exit 1, nothing started.
- `real.mjs --prove`: "the gate refuses BROWSER_SLOTS above 4", "with every slot full, a bounded
  start gives up with exit 4 and nothing started" and "the same start, run again, starts the
  session once the slot frees" all `ok`.

## 2. The matcher -- pass

On the frozen build's start page:

- `--click Samples`: `ambiguous: "Samples" matches 2 controls, so the step did nothing; name one:
  "Samples#1" button "Samples", "Samples#2" link "Samples"`.
- `--click Docs`: refused the same way, naming all three links.
- `--click "Samples#1"`: refused, since it picks by position between a button and a link; it names
  `"role=button:Samples"` and `"role=link:Samples"`.
- `--prove`: "a name several controls share is refused, with each candidate named" and "a position
  pick among different kinds of control is refused, naming each kind" both `ok`.

## 3. File drop -- pass

- `--drop volunteers.graphml` on the start page printed `the page took it`, and the next screen
  is "Open as a new graph" with volunteers' 24 node rows and 63 edge rows. The drop goes through
  the browser's own drag input (DevTools `Input.dispatchDragEvent` with a real file). A drop after
  `--reopen` in the detour walk was taken the same way.
- The start page takes a drop anywhere, so "not delivered" cannot be planted there; `--prove`'s "a
  drop where nothing takes it says it was not delivered" and "a file dropped on the start screen
  opens it on the Data page" are both `ok`.

## 4. Detours -- pass

17 walks, 223 steps, on the frozen build: the 13 walks of dry run 1 (`tasks.md`, "Detours the dry
run walks") and four more from the detours the dry-run reports under `../r1d2/pilot/` and
`tasks.md` name: T47's starting layer's shape and "Florida State" then "Nebraska" in the find box;
T48's card on one cluster and a new layer above the clusters; a find-box layer colored, Control+O
then Replace, two Control+Z (the r1d2 re-pilots' most repeated detour); and a color bound to the
role column, so the key shows.

No step hit a tool error: no exception, no refused step, no exit 2, and no script error, console
error or failed request. 218 steps exited 0. The 5 that exited 1 are all typing with nothing that
takes text focused, reported as `nothing that takes text has focus (focus is on ...); typed
nothing`, which is the walk's own wrong guess. Every miss named what was there instead (`could
not click "Add to node fill" ... element is not enabled`, the name list covering Done, `nothing on
screen is called "Run Louvain"` after a second Analyze click closed the list).

## 5. Participants cannot reach facilitator files -- pass

- `real.mjs --brief .../rounds/round-1/sessions/r1-s07` (T40 A, Ruth) wrote
  `tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s07/briefing.md` and created nothing in
  the round's folder. It holds Ruth's persona, her roster history ("This is your first time using
  this program"), T40's prompt A word for word, the exact `--start` command with the frozen build
  and her own folder, and the tool's "A session", "Steps" and "Names, dialogs and lists". It holds
  no answer key, facilitator notes, follow-up, avoided-words list or criteria. Two blemishes are
  listed under problem 5.
- `--start .../rounds/round-1/sessions/r1-s07` is refused (exit 2) and names the folder to brief
  and start instead. `--start` of the briefed folder is refused too (exit 1) while `plan.md` holds
  no "Gate evidence" section.
- `real.mjs --prove` on the frozen build: all 85 checks `ok`, including "a participant transcript
  that opens tasks.md voids the session, by name" and "an end copies the session into the round's
  folder with the leak check beside it".
- `real.mjs --leaks rounds/round-1` with no sessions run: exit 1, "FAIL: no participant log read
  for 56 sessions".

## 6. Every scripted bar -- FAIL

| What is scored | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build |
| --- | --- | --- | --- | --- | --- |
| Bars 1 to 4 | `tool/score.mjs` | yes | yes: `--self-test`, 19 planted cases caught; bar 4's limit is the fixed 10 | yes: an empty round prints "no valid session, so no bar was measured", exit 1 | reads grades and `styles-steps.jsonl`, not the build |
| Bars 6 and 8 | `tool/bars.mjs --tier 3` | yes | yes: every planted case caught in both themes; `tier3.test.mjs` plants a MISS for each of the five screens added 2026-10-18 and for typing after "Starts with" | yes: an empty walk gives a MISS for every bar 6 item | dark and light: no MISS line, every bar 6 screen at both sizes, all 24 focus actions and 4 typing checks, `spoken.json` written; **but nothing of bar 6 is measured at 900 x 700** (below) |
| Wording check | `tool/wording.mjs` | yes | yes: `--self-test` holds the irregular-form echo, the echo only in `spoken.json` and the shared phrase | yes: no screens gives "FAIL: read 32 prompts, 0 screens", exit 1 | yes: 37 screens and their spoken text read |
| Key and drawing (bar 5's measurement) | `tool/keydraw.mjs` | yes | yes: `--self-test`, four planted disagreements | yes: a session with no `key.json` and a run with no key row both fail, exit 1 | yes: 8 sessions of the bars walk, 12 key rows read, 0 disagreements |
| Gate | `real.mjs --gate` | yes | yes: 9 planted rounds, each refused for its own reason (below) | yes: a round with no pilot and no bars run is refused | yes: a round with every walk and both bars runs on the frozen build passes and gets its "Gate evidence" |

`node --test tool/tier3.test.mjs`: 7 of 7 pass.

What fails:

- **Bar 6 is measured at 1440 x 900 only.** In `bars.mjs` (`walkTier2`), after a screen is
  recorded as walked, `if (!first) continue;` skips everything else at every size but the first:
  axe, the shared-name check, the focus check after each listed action and the typing checks run
  only at 1440 x 900. At 900 x 700 a screen gets only the bar 10 counts. The walked list still
  records all 37 screens at 900 x 700, so `bar6Gaps` and the gate report full coverage. Bar 6 in
  `../../criteria.md` asks for all four checks "at 1440 x 900 and 900 x 700, in the dark and the
  light theme", and no planted case at 900 x 700 covers axe, names, focus or typing. The bars run
  passes the gate while half of bar 6 was never read.

The gate's planted rounds, each refused with exit 1 and no "Gate evidence" written: no pilot and
no bars run; walks keyed by the half's folder itself instead of `pilot/<half>/<walk>/`; a keyboard
walk not started `--keys`; a half with no detours walk; a detours walk on 6de5f95d12, whose app code
differs; a stub `bars.json` (not a tier 3 run, nothing walked, no `spoken.json`); a dark run
missing one bar 6 screen at 900 x 700; a light run with no `spoken.json`; a MISS line in the dark
run. The complete round passed (exit 0).

## Other problems with the tool

1. **Every session shows a private-window notice that a person would not see.** On every opened
   graph the app shows "This looks like a private window: your work is gone when it closes. Save a
   copy to a file to keep it." Headless Chromium's new browser context reports a memory-sized
   storage quota, which the element reads as a private window. Every participant will see a false
   warning about losing work, and bar 8 counts its 18 words: "a sample just opened" reads 75
   words against a limit of 50.
2. **`bars.mjs` wrapped in `with-browser.sh` holds a slot with no browser for the whole run.** The
   tool README ("Browsers") says every command that launches a browser for the studio, `bars.mjs`
   included, goes through `with-browser.sh`. But `bars.mjs --tier 3` takes its own slot for each
   session it starts, and `with-browser.sh` passes `real.mjs` commands through without taking a
   slot but not `bars.mjs`. Wrapped, each bars run held one slot idle for its whole run. With the
   dark and light runs wrapped, the rest of the machine had two slots for about 16 minutes; that
   is why the first six-session run never showed 4 browsers alive.
3. **A start that waits for a slot can be passed over again and again.** `with-browser.sh` retries
   every 2 seconds in no order, so a start that waits longest has no claim on the next free slot.
   One session started at 03:41 waited until 03:55, while sessions that started asking later got slots first. A
   participant's start is bounded by `REAL_SLOT_WAIT_SECONDS` and exits 4, so the round runner
   retries it, but the wait itself has no limit.
4. **The gate is stricter than the criteria on walks from an earlier build.** Preflights 4 and 9
   let a half hold, after a fix pass, with its other walks from an earlier build of the dry run on
   routes no fix touched. The gate accepts only walks whose app code equals the frozen build's, so
   such a half is refused.
5. **The briefing carries two things from the persona files that are not for the participant.**
   The persona files `data-journalist.md`, `nonprofit-operations-analyst.md`, `keyboard-only-sam.md`
   and `class-project-student.md` end with stray `</content>` and `</invoke>` markup, which is copied
   into the briefing. The persona's "Evidence limits" section ends with a note to the study team
   ("Weight findings on import, search, provenance of numbers and export over findings on her
   words"). Neither one leaks answers or the avoided words.

## What the round still needs (not tool defects)

- **Walks on the frozen build.** `rounds/round-1/` has no `pilot/` folder. The gate was run over
  every dry-run walk in `../r1/`, `../r1d1/`, `../r1d2/` and `../r1d3/`. 13 of the 24 planned halves
  lack a walk the gate accepts: T38 A, T38 B, T41 B, T43 B, T46 B, T47 A, T49 A and T51 A have no
  detours walk; T43 A has no success or detours walk; T39 A has no keyboard walk; and T40 A, T47 B
  and T48 A have neither a detours nor a keyboard walk. Sam's four halves need a keyboard walk
  started `--keys` on the frozen build.
- **Bars results to triage** (the bars measure them; they are not tool errors). Bar 6, dark: axe
  serious on the open shape list and the find results (`scrollable-region-focusable`), and on a
  node's own Style tab, the number card and the has-no-value card (`target-size`). Bar 6, light:
  `color-contrast` serious on every screen after the start page, plus the same as the dark theme.
  On the start screen, Samples, Docs and GitHub each name more than one control. Bar 8: four
  screens are over their limits: a sample just opened (75 against 50), Everything's Node tab
  (53 against 47), a layer with a condition (45 against 39) and a layer with four conditions (51
  against 42).
- **Wording (preflight 7).** `wording.mjs tasks.md bars/vocabulary.json` reports 44 shared words
  and 14 shared phrases not kept on purpose (exit 1). Some of them are for T37, T42 and T44, which
  round 1 does not run. The phrases are mostly dataset names on the start page ("Les Miserables",
  "college football").

## Evidence

All under the studio worktree's `tmp/tool-dry-run-2/`:

- Check 1: `gate-test.sh`, `gate-test2.log` and `gate2/poll.log` (the clean run), `gate-test.log`,
  `gate/` and `poll2.log` (the run beside the other work).
- Checks 2 and 3: `matcher-drop.sh`, `matcher-drop.log`, `matcher-drop/`.
- Check 4: `detours.sh`, `detours/`.
- Check 5: `brief.log`; the briefing under `tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s07/`.
- The self-check and the self-tests: `prove.log` (85 ok), `score-self.log`, `wording-self.log`,
  `keydraw-self.log`, `tier3-test.log`.
- The bars walks: `bars-dark.log`, `bars/`, `bars-light.log`, `bars-light/`.
- The wording check: `wording-dark.txt`.
- The gate: `gate-planted.sh`, `gate-planted.log`, `gate-planted/`, `keys/` (the `--keys` walk),
  `round1-gate.log` and `round1-gate/`.
- The zero-item runs: `empty-round/`, `empty-keydraw/`, `empty-vocab.json`.
