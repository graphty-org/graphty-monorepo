# Tier 5 round 1: tool dry run 1

Date: 2026-11-02. Build: d3fda9f2b6, served from the main checkout's
`.study-builds/tier5-r1d2-d3fda9f2b6` (the first line of `../../criteria.md`). Tool: `../../../tool/real.mjs`
at worktree commit 0910cffb53. Every session started for these checks is under the main checkout's
`tmp/design-studio/tier5/r1/tool-check-1/` (`gate-pass1/`, `gate/`, `detours/`, `replay/`, `endstate/`,
`steps-round/`, `wording/`, `prove/`); nothing was started in the studio's files, and no file of the studio, the
tool or the build was changed. Briefing one session (check 5) wrote that session's `briefing.md` under the
worktree's `tmp/studio-sessions/`.

## Result

Not ok. Checks 1, 2, 3, 5 and 7 pass. Check 6 fails: of the five things the criteria score by a script, none
is built for tier 5 -- the step counter counts tier 4's core tasks, the grade scorer scores tier 3's bars, the
end-state check reads no style layer, no script walks the tier 5 screens (bar 5's axe, the wording check, the
50,000-node lists), and nothing reads the follow-up ratings. Check 4: 56 of the 67 commonest detours run to
their end on the frozen build; 10 stop where the app or the setup now answers differently and need a walker, and
one stops on a tool defect: a click on a control that is on screen fails on a stale element handle. The screen
record that replays compare also counts controls hidden by `visibility: hidden`. The round gate accepts tier 1
and 2 evidence for tier 5 (section 5).

| #   | Check                                        | Result |
| --- | -------------------------------------------- | ------ |
| 1   | Browser gate                                 | pass |
| 2   | Matcher refuses an ambiguous name            | pass |
| 3   | File drop on the start screen                | pass |
| 4   | Detour walks replay without a tool error     | fail: 56 of 67 run to the end; 10 stop where the app changed; 1 tool error (stale handle) |
| 5   | Participants cannot reach facilitator files  | pass (the gate's tier 5 checks are thin, section 5) |
| 6   | Every script-scored bar has a working script | fail: no scoring script handles tier 5 |
| 7   | Fast paths                                   | pass |

## 1. Browser gate

Ten `real.mjs --start ... empty` commands were launched at the same moment (`gate/s01` to `gate/s10`), twice.
The first pass's count also matched the `with-browser.sh` shell wrappers (their command lines carry
`real.mjs --serve`), so it is not used; its sessions ran the same way. In the second pass a one-second count of
the node processes running `real.mjs --serve` or `real.mjs --warm` ran from before the starts through the
ends, the detour replays, the single replay and the self-test (`poll.log`, 676 readings): its highest
reading was 8, reached 99 times, never 9. Eight sessions started at once (two of them by taking a warm
browser over); s03 and s04 printed `waiting for a free browser slot ...` and started once ends freed slots.
All ten starts exited 0, and all ten were ended (`gate/exits.txt`). `BROWSER_SLOTS=17` and `BROWSER_SLOTS=99`
each make `with-browser.sh` exit 2 with `BROWSER_SLOTS must be 1 to 16, not "17"` (and `"99"`);
`BROWSER_SLOTS=16` runs its command, exit 0.

## 2. Matcher

- On the start screen, `--click Samples` did nothing and printed `ambiguous: "Samples" matches 2 controls,
  so the step did nothing; name one: "role=button:Samples" button "Samples", "role=link:Samples" link
  "Samples"`; `--click "Samples#1"` was refused too, as a pick by position among different kinds of control.
- With the volunteers network open, `--click Graph` did nothing and printed `ambiguous: "Graph" matches 2
  controls, so the step did nothing; name one: "Graph#1" button "Graph", "Graph#2" button "Graph
  volunteers.graphml"` (the left rail's Graph and the sidebar's header, whose first word is Graph).

Neither resolved to the first match.

## 3. File drop

`--drop volunteers.graphml` on the start screen (`gate/s02`) printed `dropped the file volunteers.graphml on the
middle of the window (empty canvas); the page took it`, and the next screenshot (`gate/s02/02.png`) shows the
volunteers network open (24 nodes, 63 edges). The drop goes through the browser's own input path. No screen of
this build refuses a dropped file, so the "not delivered" message was not reached live; the self-test's planted
page that takes no file reports it (section 7, "a drop the page does not take is reported as not delivered").

## 4. Detours

The commonest detours of every task half are the pilots' `detour-N` walks of the dry run's first pass
(`tmp/design-studio/tier5/r1/pilot/<half>/detour-N/`, as the reports under `../../r1/pilot/` describe them, one
walk per detour that `../../tasks.md`'s "Detours each pilot walks" lists): 67 walks over all 20 halves, recorded
on baac78342b. No later pass re-walked them; its `touched-N` walks re-check what each fix changed. (`--only`
takes walk names; the tool README's example `--only success,detours` names kinds of walk, and with it the rewalk
finds nothing: `FAIL: no route.jsonl under ... for detours; nothing to replay`.) All 67 were
replayed on the frozen build with `real.mjs --rewalk <r1/pilot> <tool-check-1/detours> --only
detour-1,...,detour-6`, four at a time through the gate:

- **36 matched** to the end (`all N steps matched`), among them every detour of T71 A, T72 A, T75 B, T76 A, T78 A
  and T79 B, and 4 of T70 A's 6.
- **31 diverged** (exit 5), each at a step where the frozen build, or the tool's setup, answers differently from
  the recording, with the session ended and its folder renamed `-diverged`. 20 of them stop at step 1 or 2,
  so those detours were not walked at all: most on the river gauges half and T75 A, where the recorded screen
  held the data table and the matches strip drawn together and the frozen build draws the strip alone (the fix
  of before-the-first-session item 8), and on T77 and T79 A, where a setup's start no longer leaves an Undo step
  (the tool now empties the undo history after a setup: "Undo changing node color on Staff" gone, "Nothing to
  undo" in place of "Undo changing the layout"). The rest stop later on a renamed control ("Node color:
  PageRank" now "Node color: PageRank, 0.02796 to 0.05862, Orange to brown", T74 A), a changed count line (T73
  A's step row) or a point that now lands on another thing (T70 A).

No replay printed a script error, a crash, a closed page or a failed tool step. To walk the 29 diverged routes
outside T79 past the screens the fixes changed, they were replayed again with `REAL_REPLAY_TOLERANCE=100000`
(the screen check point off; names and printed lines still checked) into `detours-any-screen/`: 20 of the 29 matched to the end. Together with the first replay, 56 of the
67 detours ran to their last step on the frozen build. Of the other 11, ten stop where the app or the setup now
answers differently and a walker has to carry on by hand from the screenshot:

- a point that now lands on another thing (T70 A `detour-3`: the matches strip's "Shown" label moved);
- a control's name that now carries its range or palette ("Node color: Betweenness, 0 to 25, Orange to brown",
  T73 B `detour-1`, T74 A `detour-1`, T74 B `detour-1`) or a changed count line (T70 A `detour-5`, T73 A
  `detour-1`);
- an option list in another order (T72 B `detour-1`: "Has no value" where "Between" was);
- the Undo step a setup used to leave (T77 A `detour-3`: "Staff" now names 2 controls, not 3; T79 A `detour-3`:
  "Nothing to undo"), and a focus line naming the workspace's step row (T79 A `detour-2`).

The eleventh, T71 B `detour-2`, is the tool's own failure below.

**Defect: a click on a control that is on screen can fail on a stale handle.** In the second replay of T71 B
`detour-2`, step 1 (`--click Data --click "Add filter" --click role=option:telemetry --click no --click
Condition...`) printed `could not click "Condition...": elementHandle.click: Element is not attached to the DOM`,
though "Condition..." is drawn in the properties pane of that step's screenshot
(`detours-any-screen/T71B/detour-2-diverged/02.png`) and the same step clicked it in the first replay. The
matcher (`match.mjs`, `find`) returns an element handle, and the click (`real.mjs`, `act` after `find`) acts on
that handle; when the app re-renders the pane between the two (here, right after ticking "no" commits the
step), the handle points at a node no longer in the page, and the click is reported as a miss instead of being
found again by its name. A participant would read it as the app refusing the click, `steps.mjs` counts it as a
step, and a replay reads it as the app having changed.

**Defect: the screen check point counts controls hidden by `visibility: hidden`.** On the frozen build, while a
selection workspace is open, the data table is kept in place but not drawn (`visibility: hidden`, the fix
1c02b8a883). The replays' screen records on the river gauges half list 9 `button ` and 12 `row ` with empty
names: the hidden table's header buttons and rows. `screenOf` in `real.mjs` keeps an element when
`e.checkVisibility()` is true, and that call with no options does not test the `visibility` property, while
`innerText` of a hidden element is empty. Every route recorded on this build with a workspace open therefore
carries 21 phantom controls; they match on a replay of the same build, but they inflate every screen
difference against a build that draws the table differently, and anyone reading `route.jsonl` for what was on
screen counts controls a person cannot see. The matcher is not affected (it keeps only Playwright-visible
handles).

## 5. Participants and facilitator files

- `real.mjs --brief .../tier5/rounds/round-1/sessions/r1-s05` (T71 A, Grace) exited 0 and wrote
  `tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s05/briefing.md` in the worktree, outside the studio's
  files; the folder holds only that file. It holds Grace's two persona files without the sections written for
  the study team, her history from `roster.md` ("Your earlier sessions with this program"), the T71 A prompt word
  for word, the start command (`REAL_DIST=<frozen build> REAL_TIER=5 ... --start <her folder>
  setup:volunteers.txt`) and the tool's "A session", "Steps" and "Names, dialogs and lists". It holds no answer
  key, path, avoided-words or kept-words list, follow-up (no "On a scale from 1", no question about what she
  looked at besides the drawing), facilitator note, criteria, the B prompt or another participant's name.
  "gauges" appears only in the tool's table of data files; "overwhelm" only in Grace's own persona evidence.
- `real.mjs --start .../tier5/rounds/round-1/sessions/r1-s05 setup:volunteers.txt` was refused, exit 2, naming
  the folder to brief and start instead; nothing started and no `sessions/` folder was created in the round.
- `real.mjs --start` of the briefed folder under `tmp/studio-sessions/` was refused too, exit 1: the round's
  `plan.md` has no "Gate evidence" section. `real.mjs --gate .../tier5/rounds/round-1` exits 1 with three
  `FAIL:` lines: no keyboard walk of T70 A on the frozen build, no detours walk of T78 B on the frozen build,
  and no bars run (`round-1/bars/bars.json`). So no session of the round can start yet, as intended. But the
  gate checks tier 5 as it checks tier 2: it asks for one `bars.mjs` run with no `--tier` and in one theme (it
  checks the tier, the theme and the walked screens only for tiers 3 and 4), refuses "pilot to confirm" but not
  "the dry run reads", and of before-the-first-session items 3 to 9 checks only that each half has its walks
  (`../../criteria.md` lists the rest as owed). A tier 1 and 2 bars run plus
  the two missing walks would let the round start with none of tier 5's own evidence.
- `real.mjs --prove` (section 7): "a participant transcript that opens tasks.md voids the session, by name" and
  "an end copies the session into the round's folder with the leak check beside it" pass.

## 6. Script-scored bars

The criteria score five things by a script, a check or a count: bars 1 to 3 from the grades' first lines, bar
4's end-state check, bar 5's scripted walk of the tier 5 screens (axe, and with it the wording check of
before-the-first-session item 5 and the 50,000-node lists), bar 8's step count (`tool/steps.mjs`), and bar 9's
median of the follow-up ratings (`Overwhelm:` in each grade). Each script that exists catches its own planted
failures, but none of the five is built for tier 5:

| Bar | Script | Exists | Fails on its own planted failure | Fails on zero items | Runs on the frozen build for tier 5 |
| --- | ------ | ------ | -------------------------------- | ------------------- | ----------------------------------- |
| 1-3 | `tool/score.mjs` | yes | yes, `--self-test` exit 0 | yes | **no**: it scores tier 3's bars |
| 4 | `tool/endstate.mjs` | yes | yes, `--self-test` exit 0 | yes | **partly**: filter cards and sources only |
| 5 (and item 5) | `tool/bars.mjs` for the tier 5 screens; `tool/wording.mjs` | `bars.mjs` takes only `--tier 3` and `--tier 4`; `wording.mjs` yes | `wording.mjs --self-test` exit 0 | `wording.mjs` fails without `spoken.json` | **no**: no tier 5 walk exists |
| 8 | `tool/steps.mjs` | yes | yes, `--self-test` exit 0 | yes | **no**: it counts tier 4's core tasks |
| 9 | none | **no** | -- | -- | **no** |

**Bars 1 to 3.** `score.mjs` run on a stand-in tier 5 round (`steps-round/`: the round's `plan.md`, two T70 A
sessions each holding the frozen build's T70 A success route and `Grade: S`, `False done: no`, `Wrong turns: 0`)
reads the grade lines, but judges bar 1 by tier 3's rule: "T70 success (not judged: fewer than 4 sessions, so it
does not hold)". Tier 5's bar 1 needs 3 of 4 on a four-session task and 2 of 2 on a two-session task (T72, T75,
T77, T79), and leaves Sam's sessions out; `score.mjs` has no two-session rule and no notion of the keyboard-only
sessions. It also scores a tier 3 "bar 4" (`T39: steps to every node in one new color`) that tier 5 does not
have, and so exits 1 on any tier 5 round.

**Bar 4.** `endstate.mjs` over copies of seven frozen-build pilot success walks (`endstate/`: T70 A and B, T71 A
and B, T73 A, T74 A, T78 A) exits 0 with 1 to 3 items each. Those items are filter cards and data sources only:
tier 5's end-state check is also "each layer's selection count against the members the element paints" and
"the styling after the session against the styling before it with every preview ended (a layer left suspended
is a severity 4 candidate the script itself confirms)". `data.json` as `real.mjs --end` writes it holds no style
layer at all (its keys: counts, sources, knownFields, weight, columns, filters, filter, window), the script reads
no `styles.json` or `styles-start.json`, and its self-test plants no layer mismatch and no suspended preview.
So the T70 A, T73 A and T74 A style-layer sessions are checked on nothing their task changed. Before-the-first-
session item 4 ("`real.mjs --end` writes each layer's selection ... into the end-state records") does not hold.

**Bar 5 and the wording check.** `bars.mjs` reads `--tier 3` and `--tier 4` only (`const OWN = TIER === "3" ||
TIER === "4"`); `--tier 5`, or no `--tier`, runs tier 1's and tier 2's bars. Nothing walks the tier 5 screens
of item 5 (the outline, the workspace, its picker, a step pane, the Except switch, the reference picker, an Or
group, Advanced with Edges where, No match, the matches strip, and the 50,000-node checklist and lists) or checks
a list against "Large graphs", and no tier 5 `vocabulary.json` or `spoken.json` exists anywhere under
`tmp/design-studio/tier5/`. `wording.mjs` itself reads tier 5's `tasks.md`: against a planted screen
(`wording/`) it read all 40 prompts, reported "reception" (T71, on screen) and "evening" (T71, spoken) and
kept "board" and "picture", exit 1. It has nothing from the frozen build to read, and it does not take the
build's own strings, option labels or the catalog's search keywords that item 5 names.

**Bar 8.** `steps.mjs` holds `CORE = ["T61", "T62", "T65", "T67"]`, tier 4's core tasks. On the stand-in round
with tier 5's `answers.md` it reports `FAILS T61 (path A null, B null): no path step count in answers.md for
T61A` (and T62, T65, T67) and never counts T70, T71, T73, T74 or T78, exit 1. Item 6 ("`tool/steps.mjs` counts
tier 5's core tasks") does not hold. `answers.md` does hold a "Path steps" number for each core half, though
some say they were read on baac78342b or 797a4f6b47 rather than on the frozen build.

**Bar 9.** No script reads `Overwhelm:`; `../../criteria.md` lists it as owed ("nothing parses
`Overwhelm:`").

## 7. Fast paths

- **GPU renderer.** Every session these checks started (20 gate sessions in two passes, the single replay, every
  detour replay, and the self-test's 18 sessions) records `"renderer": "ANGLE (NVIDIA, Vulkan 1.4.312 (NVIDIA
  NVIDIA GeForce RTX 4070 SUPER (0x00002783)), NVIDIA)"` in its `session.json`; none is SwiftShader.
- **Warm takeover.** In the second gate pass, after the first pass's ends had topped the pool up, `gate/s02` and
  `gate/s06` say `took over warm browser ... (warm for 18 s)` in their `session.log`, and so does the single
  replay below.
- **Replay.** `real.mjs --replay` of the frozen build's T70 A success walk
  (`tmp/design-studio/tier5/r1d2/pilot/T70A/success`, 15 steps) into `replay/T70A-success` printed
  `replayed all 15 steps; every check point matched; session ended`, exit 0.
- **Self-test.** `REAL_PROVE_DIR=<tool-check-1>/prove real.mjs --prove` on the frozen build: 98 checks `ok`,
  "every check passed", exit 0, among them "a batch stops at its first miss: the steps after it do not run", "a
  replay of an unchanged route matches every check point and ends the session", "a replay stops at the first
  step whose check points differ, and leaves the session open there", "a rewalk replays every route: the
  unchanged one matches, a missing control and a changed screen diverge and keep their folder aside", "the next
  start of the same build takes over the warm browser, with the app already open", "the session draws on the
  GPU, not SwiftShader (session.json names the renderer)" and "a drop the page does not take is reported as not
  delivered".
- `node --test tool/with-browser.test.mjs`: 5 tests, 5 pass, 0 fail.
