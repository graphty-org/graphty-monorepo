# Tier 5 round 1: tool dry run 1

Date: 2026-11-03. Build: 1e123d7d33, served from the main checkout's
`.study-builds/tier5-r1d1-1e123d7d33` (the first line of `../../criteria.md`). Tool: `../../../tool/` at
worktree commit b486ca7ff7 (the tool's last change is bf8aa82961). Every session started for these checks is
under the main checkout's `tmp/design-studio/tier5/r1/tool-check-1/rerun/` (`gate/`, `match/`, `detours/`,
`detours-any-screen/`, `replay/`, `prove/`, `prove-tier5/`, `bars-dark/`, `bars-light/`; the scoring checks in
`zero/` and `standin/`). Nothing was started in the studio's files, and no file of the studio, the tool or the
build was changed. Briefing the round's 30 sessions (check 5) wrote their `briefing.md` files under the
worktree's `tmp/studio-sessions/`.

## Result

Not ok: six of the seven checks pass with no tool error; one self-test check failed once in two runs.

`real.mjs --prove` passed 99 of 100 checks in its first run and 100 of 100 in its second. The one that failed,
"the next start of the same build takes over the warm browser", depends on a spare machine browser slot:
its warm browser takes a slot only in try mode (a spare slot above 4, never while a start waits in the
queue), and during the first run the machine held 8 studio browsers in 152 of the check's 167 seconds (the
detour replays and the scripted walks beside it). No warm browser became ready in the check's 120-second
wait, so the next start waited about 40 seconds for a slot, started cold, and the check failed. The second
run, at a time when the machine held 4 to 8 browsers, passed it (`took over warm browser ... (warm for 4
s)`). The fast path itself works (a start in check 2 took over a warm browser); the self-test's verdict on it
depends on how busy the machine's slots are.

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass: never more than 8 studio browsers in 1,288 one-second readings |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | pass: 79 of 82 run to the end in both passes; 3 stop where the app changed; no tool error |
| 5   | Participants cannot reach facilitator files  | pass |
| 6   | Every script-scored bar has a working script | pass |
| 7   | Fast paths                                   | fails once: the warm-takeover self-test check failed in 1 of 2 `--prove` runs (above); everything else passes |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`), with
`REAL_DIST` set to the frozen build; each session was held 20 seconds after its start returned and then
ended. A count of the node processes running `real.mjs --serve` or `real.mjs --warm` (bash wrappers left
out), once a second, ran from before the starts until every check in this file had finished (`poll.log`,
1,288 readings from 03:09:46 to 03:31:44 PT), while the detour replays, both scripted walks, the replays and
two `--prove` runs ran beside each other through the gate. Its highest reading was 8; it never read 9.

Eight starts returned at once; s01, s02, s06, s07 and s10 printed `waiting for a free browser slot ...`, and
s01 and s02 started only after the first sessions ended. All ten starts and all ten ends exited 0
(`gate/exits.txt`). `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99` each make `with-browser.sh` exit 2 with
`BROWSER_SLOTS must be 1 to 16, not "17"` (and `"99"`); `BROWSER_SLOTS=16` runs its command, exit 0.

## 2. Matcher

- On the start screen (`match/`), `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2
  controls, so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples"
  link "Samples"`; `--click "Samples#1"` was refused too, as a pick by position among different kinds of
  control.
- With the volunteers network open, `--click Graph` did nothing and printed `ambiguous: "Graph" matches 2
  controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" button "Graph
  volunteers.graphml"`.

Neither name resolved to the first match.

## 3. File drop

`--drop volunteers.graphml` on the start screen printed `dropped the file volunteers.graphml on the middle of
the window (empty canvas); the page took it`, and `match/04.png` shows the volunteers network open (24 nodes,
63 edges). The drop is sent as Chromium input with the real file, not as events the page makes. No screen of
this build refuses a dropped file, so the "not delivered" message was not reached live; the self-test's
planted page that takes no file reports it in both `--prove` runs ("a drop the page does not take is
reported as not delivered").

## 4. Detours

The commonest detours of every task half are the pilots' `detour-N` walks the reports under `../r1d1/pilot/`
and `../r1d2/pilot/` describe: 82 walks over all 20 halves (72 under `tmp/design-studio/tier5/r1/pilot/<half>/`,
recorded on 0c163f54bf; T79 A's four `detour-N-0c163f54bf` there; T71 B's and T74 B's `detour-1` to
`detour-3` under `r1d1/pilot/`, recorded on the frozen build). All 82 were replayed with `real.mjs --rewalk`
four at a time through the gate, twice: once with every check point (`detours/`), once with
`REAL_REPLAY_TOLERANCE=100000`, the screen check point off and names and printed lines still checked
(`detours-any-screen/`). `--rewalk`'s name filter also picked up T79 A's plain `detour-1` to `detour-4` (walked
on the older baac78342b) and the old builds' copies in `r1d1/pilot/T71B/old-*` and `T74B/old-*`; they are left
out of the counts.

- **79 of 82 matched** to the end in both passes, among them all 6 recorded on the frozen build.
- **3 stop where the app answers differently from the recording**, in both passes, the same three as in the
  earlier dry run on this build; each was ended, and a walker has to carry on by hand from the screenshot:
  - T76 A `detour-3` (step 27 of 37): a just-added color line reads "Node color, not set" with no color
    drawn; the recording read "Node color, not set, drawn #6366F1 indigo".
  - T76 B `detour-2` (step 24 of 36; step 25 with the screen check off): the same change; the color dialog
    and its Opacity slider the recording had open are not there, and the next typing finds no box.
  - T79 A `detour-4-0c163f54bf` (step 3 of 15; step 12 with the screen check off): Done, clicked while the
    50,000-node edit says Drawing, closes the workspace; with the screen check off, the step-12 refusal of
    "Node color" offers the same four candidates, but the color box's name lacks "drawn #6366F1 indigo", the
    same change as T76.

No replay printed a script error, a crash, a closed page or a `SETUP FAILED` line, and no session was left
open (no `real.mjs --serve` under these checks' folders after the last one).

## 5. Participants and facilitator files

- `real.mjs --brief .../tier5/rounds/round-1/sessions/<id>` was run for all 30 planned sessions; each exited
  0 and wrote `tmp/studio-sessions/tier5/rounds/round-1/sessions/<id>/briefing.md` in the worktree, outside
  the studio's files, each folder holding only that file. Each holds the persona, "Your earlier sessions with
  this program", "What you are asked to do", the start command (`REAL_DIST=<frozen build> REAL_TIER=5 ...
  --start <the briefed folder> setup:<file>`) and the tool's "A session", "Steps" and "Names, dialogs and
  lists". Searched for in all 30 and absent: "On a scale", "least sure", "Follow-up", "Kept on purpose",
  "Kept in every task", "Avoided", "Path steps", "Grade:", "Prompt A", "Prompt B", "answer key", `tasks.md`,
  `answers.md`, "criteria", "hypothes", "Why this persona", "Evidence limits", "success path", "Overwhelm".
  Two words appear that are persona material, not facilitator material: "facilitator" in Alex's five
  briefings (his persona's rule "does not propose UI solutions unless the facilitator asks") and "overwhelm"
  in six (the persona's own background).
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
| 1-3, 9 | `score.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 4 | `endstate.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 5 and item 5 | `bars.mjs --tier 5` | yes | yes, every planted case caught at each size, per theme | yes (a screen whose count read no words, a missed planted case or an unflagged rejected list makes the run untrusted) | yes |
| item 5 | `wording.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 8 | `steps.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| 9 (T79's waits) | `waits.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |
| -- | `keydraw.mjs` | yes | yes, `--self-test` exit 0 | yes, exit 1 | yes |

`node --test` of `tier5.test.mjs` (4 of 4), `match.test.mjs` (2 of 2), `measure.test.mjs` (2 of 2) and
`with-browser.test.mjs` (6 of 6) pass.

**Zero items** (`zero/`): on a tier 5 round folder holding the round's plan and no session, `score.mjs --tier
5` prints `a scripted bar fails or was not measured`; `steps.mjs --tier 5` fails every core task with no
counted session; `endstate.mjs` prints `FAIL: read zero items in 0 session folders`; `keydraw.mjs` reads 0 key
rows; `wording.mjs` on an empty `vocabulary.json` prints `FAIL: read 20 prompts, 0 screens ...; a check over
nothing checks nothing`; `waits.mjs` on a folder with no walk prints `FAIL: no timed step read`. All exit 1.

**A stand-in round on the frozen build** (`standin/`): the round's `plan.md` (30 sessions), each session a copy
of the frozen build's pilot success walk of its half (`tmp/design-studio/tier5/r1d1/pilot/<half>/success`,
T79 A's `success-1e123d7d33`) with a passing grade and an `Overwhelm: 2 -- none -- ...` line. `score.mjs`
prints `every scripted bar holds`, exit 0; `endstate.mjs` reads 4 to 6 items per session and finds no
mismatch, exit 0; `keydraw.mjs` reads 35 key rows over 30 sessions with no disagreement, exit 0. `steps.mjs`
holds T70 (median 1 over the path) and T71 (2 over) and fails T73, T74 and T78 (12.5, 4 and 8 over), exit 1:
the pilot success walks of those halves go on after success, so they cannot stand in for the path counts.

**Bar 5 and item 5** (`bars-dark/`, `bars-light/`, `bars.mjs --tier 5 --scheme <theme> --dist <frozen
build>`): each walked all 36 screens at 1440 x 900 and 900 x 700 with no `MISS` line, caught every planted
case at each size, has an empty `untrusted` list, and exited 0. In both themes: 0 axe findings on every
screen; every list on the 50,000-node screens holds "Large graphs"; the rejected build's "While has nodes" at
50,000 is `caught by the large-list check (list Reference, 52 rendered)`. `wording.mjs` against
`../../tasks.md` and each run's `vocabulary.json`: 20 prompts against 36 screens, 0 shared words and 0 shared
phrases not kept on purpose, exit 0. The runs list controls that share a name (the Data place filter card's
"Use Except role staff" and "Use role staff" checkboxes), findings for the experts that gate nothing.

**Words at rest** (both themes the same, at both sizes): the style host's read-only outline 57 words, the
filter host's 66, the 50,000-node outline 67, each printed `OVER` the 50-word budget; the workspace open on a
step stays under 40. These are severity 2 candidates for the calm-first check, not script failures.

**T79's waits** (`waits.mjs`, `--build 1e123d7d33`): on the frozen build's T79 pilot walks (213 timed steps in
10 routes) one wait passed 10 s, 10.6 s on a step of five actions ending in typing "Grants"
(`r1d1/pilot/T79A/touched-9-1e123d7d33/02.png`); on this check's scripted 50,000-node walk
(`bars-dark/sessions`, 74 timed steps) 6 passed 10 s, longest 17.2 s (`big-900x700/03.png`). Both exit 1, as
bar 9 asks; whether the screen showed work under way is for bar 9's reader.

## 7. Fast paths

- **GPU renderer.** All 277 sessions these checks started (the stand-in's copied walks left out) record
  `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)"`;
  none is SwiftShader.
- **Warm takeover.** `match/session.log` says `took over warm browser 2965692 (warm for 30 s)`, a start of
  the frozen build after the gate check's starts; so do 2 detour replays and `prove-tier5/warm-2`. The 20
  success replays took over none: the machine's slots were full while they ran, and a warm browser takes
  only a spare one.
- **Replay.** `real.mjs --replay` of the frozen build's pilot success walk of every one of the 20 halves into
  `replay/` printed `replayed all N steps; every check point matched; session ended`, exit 0, each (7 to 20
  steps, the two 50,000-node walks included).
- **Self-test.** `REAL_PROVE_DIR=<rerun>/prove real.mjs --prove` on the frozen build, `REAL_TIER` unset:
  99 `ok`, 1 `FAIL`, exit 1. The same with `REAL_TIER=5` (`prove-tier5/`): 100 `ok`, `every check passed`,
  exit 0. Both pass "a batch stops at its first miss", "a replay of an unchanged route matches every check
  point and ends the session", "a replay stops at the first step whose check points differ, and leaves the
  session open there" and "a rewalk replays every route"; "the next start of the same build takes over the
  warm browser" failed in the first and passed in the second (see "Result" for the mechanism).
- `node --test tool/with-browser.test.mjs`: 6 tests, 6 pass.

## Problems

Of the tool:

1. `real.mjs --prove`'s check "the next start of the same build takes over the warm browser" fails whenever
   the machine's browser slots are full: its warm browser can take only a spare slot above 4 (try mode, and
   never while a start waits in the queue), the check waits up to 120 seconds for it to be ready and then
   starts anyway. On 2026-11-03 at 03:19:50 to 03:22:31 PT the machine held 8 studio browsers in 152 of those
   seconds, so no warm browser was placed and the next start waited about 40 seconds for a slot and started
   cold (`prove/warm-2`). The same check passed at 03:29 with slots free. The check's verdict rests on how
   busy the machine is rather than on the warm pool working; it should hold a slot for its warm browser (or
   wait for a spare one) before it judges the takeover.

Of the round's evidence (not tool failures):

2. Three detours stop where the app answers differently from the recording (section 4): T76 A `detour-3`
   and T76 B `detour-2` (a just-added color line shows no drawn color) and T79 A `detour-4-0c163f54bf` (Done
   during Drawing closes the workspace). They need a walker on the frozen build before the gate's detours
   evidence rests on them.
3. Three screens are `OVER` the words-at-rest budget at both sizes and in both themes (57, 66 and 67 words
   against 50), severity 2 candidates for the calm-first check.
4. Waits over 10 s on the 50,000-node path on the frozen build: 6 of 74 steps in this check's scripted walk
   (longest 17.2 s) and 1 in the pilot walks (10.6 s), for bar 9's reader.
5. The pilot success walks of T73, T74 and T78 go on after success, so a stand-in round built from them
   fails `steps.mjs` on those tasks (section 6).
6. The round's `plan.md` has no "Gate evidence" section, so `--start` refuses every session of the round.
