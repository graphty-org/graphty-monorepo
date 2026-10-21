# Tier 3 round 1: tool dry run 2

Checked on 2026-10-21, before any round 1 session, on the frozen build 758b8e8081
(`.study-builds/tier3-r1d2-758b8e8081`, the first line of `../../criteria.md`), with the tool at
commit 7752ec5421. Nothing in the studio's files was changed; every walk, session and planted case
below ran under `tmp/tool-dry-run-2r/` of the studio worktree. This run replaces the first run of
dry run 2 (tool at 0664a753fd), which failed on bar 6 at 900 x 700.

**Verdict: ready.** All six checks pass. One tool problem that does not block the round and the
bars results to triage are listed after the checks.

## 1. The browser gate -- pass

- Six sessions were started at once with `real.mjs --start` (each takes its slot through
  `with-browser.sh`). A poll of every live Chromium carrying a studio browser slot ran from the
  first start to the end of the dry run, one reading about every 2 seconds (a 1-second sleep plus
  one pass over `/proc`): 1,601 readings from 05:42 to 06:32, never more than 4 (4 in 321 of them).
  The bars walks, the detour walks, the self-check and the matcher walk ran beside the six for most
  of that time, all through the same gate.
- When the six were started, another agent's four studio sessions held all four slots; its driver
  had stopped, and the four sessions closed themselves on the 15-minute idle limit. Two of the
  machine's other browser jobs (a pre-push browser shard and a screenshot preview) then held two
  slots. The six waited, each printing "waiting for a free browser slot", and started in turn as
  slots freed. All six were ended; the last readings show no studio browser alive.
- `BROWSER_SLOTS=5` and `BROWSER_SLOTS=0`: `with-browser.sh` refuses with exit 2 and says why.
  `BROWSER_SLOTS=9` on `real.mjs --start`: the start stops, exit 1, nothing started.
- `node --test tool/with-browser.test.mjs`: 2 of 2 pass (first come, first served with a dead
  waiter skipped; `bars.mjs` passed through holding no slot).
- `real.mjs --prove`: "the gate refuses BROWSER_SLOTS above 4", "the gate takes its slot from the
  machine's shared pool", "with every slot full, a bounded start gives up with exit 4 and nothing
  started" and "the same start, run again, starts the session once the slot frees" all `ok`.

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

- `--drop volunteers.graphml` on the start page printed `the page took it`, and `--expect "Open as
  a new graph"` then passed. The drop goes through the browser's own drag input with a real file.
  A second drop with the Main menu open was taken the same way.
- The start page takes a drop anywhere, so "not delivered" cannot be planted there; `--prove`'s "a
  drop where nothing takes it says it was not delivered" and "a file dropped on the start screen
  opens it on the Data page" are both `ok`.

## 4. Detours -- pass

17 walks, 223 steps, on the frozen build, from the detours the dry-run reports under
`../r1d1/pilot/` and `../r1d2/pilot/` and `tasks.md` name: the start page's demo, menus, search and
Control+O; every way of bringing a file (Open network data, New project then Add data, a drop,
Cancel then again); T39's layer with no condition and the Edge tab first, twice; T40's typing
straight after a card and the find box; T41's yes/no left on default, has no value, an unfinished
card and Escape; T43's fixed size and the link icon; T45's Node tab colored instead; T46's run's
layers one by one, twice; T47's starting layer's shape and two names in the find box; T48's card
on one cluster and a new layer above; T49's Control+Z past the change; T50's legend and Values;
T51's one layer per value by hand; a find-box layer, Control+O then Replace and two Control+Z; and
a color bound to a category column, so the key shows.

No step hit a tool error: no exception, no script error, console error or failed request. 218
steps exited 0. The 5 that exited 1 are typing with nothing that takes text focused, each reported
as `nothing that takes text has focus (focus is on ...); typed nothing`, which is the walk's own
wrong guess. The one `ambiguous` line is the start-page walk's deliberate click on "Samples".

The 30 detours walks of the round's own `pilot/` (all on 758b8e8081) were also read: none of their
session logs holds an exception or tool error.

## 5. Participants cannot reach facilitator files -- pass

- `real.mjs --brief .../rounds/round-1/sessions/r1-s07` (T40 A, Ruth), `r1-s14` (T47 B, Nadia) and
  `r1-s19` (T48 A, Sam) each wrote `tmp/studio-sessions/tier3/rounds/round-1/sessions/<id>/briefing.md`
  and created nothing in the round's folder. Each holds the persona, the roster history ("This is
  your first time using this program", and for Sam the keyboard-only line), the half's prompt word
  for word, the exact `--start` command with the frozen build, `REAL_TIER=3`, the participant's own
  folder (and `--keys` for Sam), and the tool's "A session", "Steps" and "Names, dialogs and
  lists". None holds an answer key, facilitator notes, a follow-up, an avoided-words list, criteria,
  the persona files' "Evidence limits" notes or stray markup.
- `--start .../rounds/round-1/sessions/r1-s07` is refused (exit 2) and names the folder to brief
  and start instead.
- `real.mjs --prove` on the frozen build: all 85 checks `ok`, including "a participant transcript
  that opens tasks.md voids the session, by name" and "an end copies the session into the round's
  folder with the leak check beside it".

## 6. Every scripted bar -- pass

| What is scored | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build |
| --- | --- | --- | --- | --- | --- |
| Bars 1 to 4 | `tool/score.mjs` | yes | yes: `--self-test`, every planted failure caught | yes: an empty round prints "no valid session, so no bar was measured", exit 1 | reads grades and `styles-steps.jsonl`, not the build |
| Bars 6 and 8 | `tool/bars.mjs --tier 3` | yes | yes: in both themes and at both sizes, axe, shared names, focus and typing each catch their planted case (plus the clipped name and the raw code); `tier3.test.mjs` plants a MISS for each screen, for "Starts with" and for each check left out at 900 x 700 | yes: an empty walk gives a MISS for every bar 6 item | dark and light: no MISS line, all 37 screens, 24 focus actions, 4 typing checks and 4 planted checks at both 1440 x 900 and 900 x 700, `spoken.json` written |
| Wording check | `tool/wording.mjs` | yes | yes: `--self-test` holds the irregular form, the spoken-only echo and the shared phrase | yes: no screens gives "FAIL: read 32 prompts, 0 screens", exit 1 | yes: 37 screens and their spoken text read, 0 shared words and 0 shared phrases not kept on purpose (exit 0) |
| Key and drawing (bar 5's measurement) | `tool/keydraw.mjs` | yes | yes: `--self-test`, five planted disagreements | yes: a session with no `key.json` and a folder with none both fail, exit 1 | yes: 25 sessions of this run, 34 key rows read, 0 disagreements |
| Gate | `real.mjs --gate` | yes | yes: 11 planted rounds, each refused for its own reason (below) | yes: a round with no pilot and no bars run is refused | yes: a copy of round 1's folder (its pilot walks and bars runs) passes with 26 files of evidence |

`node --test tool/tier3.test.mjs`: 9 of 9 pass.

The gate's planted rounds, each refused with exit 1 and no "Gate evidence" written: no pilot and
no bars run; walks keyed by the half's folder itself instead of `pilot/<half>/<walk>/`; a keyboard
walk not started `--keys` and a half with no detours walk; a detours walk on 6de5f95d12, whose app
code differs; a stub `bars.json`; a dark run missing one screen; a light run with no
`spoken.json`; a MISS line in the dark run; the dark run's focus check missing one action at 900 x
700; the light run's axe check not proven at 900 x 700; the dark run's typing check missing one at
900 x 700. The complete round passed (exit 0).

## A tool problem that does not block the round

**`--prove` fails and stops early when `REAL_TIER=3` is set.** Run from `tier3/` with `REAL_TIER=3`
in the environment (the variable every tier 3 briefing's start command carries), five of its
participant-side checks fail ("tasks.md has no Prompt B for T18", "no Prompt A for T20"): its
planted sessions are tier 2 tasks, but it takes the tier from the environment. It then stops on an
unhandled `ENOENT` writing `01.png` into a session that never started, so the checks after it never
run. Without `REAL_TIER` (as criteria preflight 2 runs it) all 85 pass. The self-check should fix
its planted sessions' tier itself, and report a failed check instead of stopping.

## Bars results to triage (the bars measure them; they are not tool errors)

- **Bar 6, dark, both sizes:** axe serious on the open shape list and the find results
  (`scrollable-region-focusable`), and on a node's own Style tab, the number card and the
  has-no-value card (`target-size`). On the start screen, Samples, Docs and GitHub each name more
  than one control.
- **Bar 6, light, both sizes:** `color-contrast` serious on every screen but the start screen and
  "a file read, before loading", plus the dark theme's findings.
- **Bar 8:** four screens over their limits: a sample just opened (72 against 50; the notice "This
  browser may clear what it keeps for this site. Save a copy to a file to be sure" is part of it),
  Everything's Node tab (53 against 47), a layer with a condition (45 against 39) and a layer with
  four conditions (51 against 42).
- Focus never fell to the page after any listed action, and every typing check wrote its value,
  at both sizes in both themes.

## Evidence

All under the studio worktree's `tmp/tool-dry-run-2r/`:

- Check 1: `gate-test.sh`, `gate-test.log`, `gate-finish.sh`, `gate2/` (the six sessions),
  `poll2.sh` and `poll2.log` (the poll over the whole run), `with-browser-test.log`.
- Checks 2 and 3: `matcher-drop.sh`, `matcher-drop.log`, `matcher-drop/`, `matcher-drop-miss/`.
- Check 4: `detours.sh`, `detours/`.
- Check 5: `brief.log`; the briefings under `tmp/studio-sessions/tier3/rounds/round-1/sessions/`.
- The self-check and the self-tests: `prove.log` (85 ok), `prove-tier3env.log` (the run with
  `REAL_TIER=3`), `score-self.log`, `wording-self.log`, `keydraw-self.log`, `tier3-test.log`.
- The bars walks: `bars-dark.log`, `bars/`, `bars-light.log`, `bars-light/`.
- The wording and key checks: `wording-dark.txt`, `keydraw.log`.
- The gate: `gate-planted.sh`, `gate-planted.log`, `gate-planted/`, `keys/` and `keys.log` (the
  `--keys` walk), `round1-gate.log` and `round1-gate/`.
- The zero-item runs: `zero-items.log`, `empty-round/`, `empty-keydraw/`, `empty-keydraw2/`,
  `empty-vocab.json`.
