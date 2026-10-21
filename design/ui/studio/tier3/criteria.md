The study runs on build 758b8e8081 served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081

Frozen on 2026-10-20 for the tier 3 rounds.

# Success criteria and round plan: first use and styling (tier 3)

A bar changes only between rounds, with the change and its reason in the change log at the end,
and nothing here changes after a round's first session starts. The first line names the frozen
build once the preflight has frozen one; no session starts before it does.

**What is studied.** A person's first use of the graphty app (`/?next`) and their first styling,
on the combined Style panel: the layer tree; a layer's Style area with its Node and Edge tabs; at
the top of each tab, the collapsible picker of which nodes or edges the layer paints, built from
typed condition cards (number range, category values, text contains or starts with, yes/no, has
or has no value), combined with AND; the property lines below it; and the same tabs, picker and
fields when a folder or several layers are selected, where a field whose layers differ shows the
purple "Layer" token. The app is a local
production build of the studio worktree, driven by `../tool/real.mjs`. Tasks: `tasks.md`. Answer
key (graders only): `answers.md`. Participants: `roster.md`.

**Who the participants are.** Simulated: one model playing composite personas, every one of them a
first-time user of graphty, every session from the empty start screen. A failure is strong
evidence; a pass is weak until real people confirm it. Every report says so.

**What the study must answer, beyond the bars:**

1. Can a newcomer get from the empty start screen to a styled drawing, and how long does it take
   (bar 4)?
2. Do the typed condition cards let a newcomer pick nodes or ties by data, with each card type
   (text, category, yes/no, has no value, number), without being told how (bar 1 on T38, T40, T41,
   T45, T50; number cards (T45 B, T50 B) are reported in round 1, not judged, and T42, the number
   card on people, runs in round 2)? T45's halves share what is at stake -- picking ties on the
   Edge tab -- and reach different card types (a category in A, a number in B), so bar 1 judges
   T45 as one task and each card type is reported per half. Each card type is reported with the
   number of domains it was reached on, and a type reached on one domain only is labeled so (in
   round 1 the category card on ties is reached only on neighbors.csv, the number card on ties
   only on Les Miserables, and T50 reaches text only on lesmis-poster and number only on
   volunteers-thanks).
3. When a folder or several layers are selected, do readers read the purple "Layer" token as "each
   layer keeps its own" and leave it alone when they mean to (T46, where setting the folder's color
   is the wrong turn that paints every cluster the same, and T47), and does adding a card to
   several layers at once read as consistent with one layer's picker (T48)? Graders record every
   touch of the token (`Token:` on T46 and T47), and whether the reader opened the picker on the
   folder or on one layer. The bulk part is answered only from sessions that selected the folder
   or several layers (`Route: folder` or `several` on T47 and T48).
4. How does a newcomer reverse a change (T49): the arrow, Control+Z, typing the old value back,
   or removing a layer?
5. Can a newcomer find what a layer someone else made applies to, and why (T50)?
6. When each kind of thing gets its own color, can a newcomer tell from the screen which color
   stands for which kind (T51)? T51's columns hold 3 values each, so its report says question 6 was
   answered on 3-value columns only; the audit's look-alike check (below) covers keys with more
   values than that.

## Grades

As `answers.md`, "How a session is graded": S, SD, F, G, VOID; success = S + SD; graded from the
last screenshot, the saved and downloaded files, the transcript and the scripted style tree
(`styles-start.json`, `styles.json`, `styles-steps.jsonl`), never from the participant's own
rating. Every `grade.md` starts with the three lines `Grade:`, `False done:` and `Wrong turns:`,
which `../tool/score.mjs` reads; a T47 or T48 success adds `Route:`, and every T46 and T47
session adds `Token:` (`answers.md`). The grading calls settled before round 1 (any community
analysis on T46 to T48, T48 B's filtered run, T44 A's `id`, T49 by the drawing) are in
`answers.md`, "Rules settled before round 1". Severity 0-4 (Nielsen). A build defect is confirmed by two or more
participants, or one participant plus a scripted repro (a `real.mjs` walk under the round's
`repro/`). A design problem is confirmed by sessions on two different task halves, or one session
plus a scripted repro: two sessions of one half read the same prompt and are played by the same
model, so a problem the prompt made would confirm itself. An asked color (dark green, orange,
purple, red, blue, yellow) is judged by `colorWord` in compact-mantine's `color-utils.ts`, the name
the app itself gives the drawn value: it holds when that name contains the asked hue word; "dark"
and "bright" are recorded, not graded (`answers.md`, "Rules settled before round 1"). A severity 4 needs a wrong conclusion a reader would act on, a task that cannot be done, or
a participant who leaves. Graders are never told the outcome to look for. A give-up the persona
file scripts is graded G with the line `Scripted exit: yes`; it is never VOID and stays in bar
1's denominator, and `score.mjs` lists it apart. A tool refusal (a click the tool could not
resolve, a pointer step refused in keyboard-only mode) is a tool event, not reader confusion.

**Not scored as new findings:** a new label drawn too small at the default framing, and the
default label font naming no fallback. Both are open owner decisions (`../owner-decisions.md`);
graders record them as known.

**Priming.** A first move is called "unprompted" only after the prompt, the persona's playing
rules and the briefing (`real.mjs --brief` output) have all been read for the words that lead to
it. Findings from Alex (knows Gephi) and Maren (knows Cytoscape) are reported with who they are and
never stand in for the newcomers: a core task half holds bar 1 only with at least 2 S or SD from
sessions other than theirs.

## Bars that decide "done" (all must hold in one round)

A round is scored on the latest result of every task: a task the round re-ran is scored on that
round's sessions; a task it did not re-run carries its sessions from the last round that ran it,
allowed only when no fix touched it. Bars 6, 7 and 8 are measured afresh on every round's frozen
build. A bar not scored in a round does not hold in that round.

| #   | Bar                            | Target                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Scored by                                                                                                                                                        |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success                   | Each task run at 4 or more sessions: at least 80% S or SD, and each dataset half at least 2 of 3. In counts: 4 sessions need 4 of 4 (2 of 2 per half); 6 need 5 of 6 with at least 2 of 3 in each half; so one F fails a 4-session task. A task run at fewer than 4 sessions does not hold bar 1; the study cannot pass while any task is unjudged. T47 and T48 hold only when at least half their S/SD sessions went by the bulk route (`Route: folder` or `several`). A core task half (T39, T40, T47, T48) holds only with at least 2 S or SD from sessions other than Alex's and Maren's                         | `../tool/score.mjs` (T47's and T48's from the graders' `Route:` line)                                                                                            |
| 2   | False "done"                   | 0 sessions where the participant said done while the last screen or the style tree showed otherwise. On T49, which is graded by the drawing, a style tree that differs from the start while the drawing matches it is not a false "done" (`answers.md`, "Rules settled before round 1")                                                                                                                                                                                                                                                                                                                              | `../tool/score.mjs` (from the graders' `False done:` line)                                                                                                       |
| 3   | Wrong turns                    | Each task's median wrong turns at most 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `../tool/score.mjs` (from the graders' `Wrong turns:` line)                                                                                                      |
| 4   | Time to the first styled graph | On T39 (one color for the whole drawing, from the empty start), over the pointer sessions (not Sam's `--keys`, whose key presses are another unit; reported apart, for bar 7), the median steps from `01.png` to the first screenshot where every node shows one new color: at most 10, twice the answer key's 5 (the T39 path on every build since 58556989e8). The limit is a number: a fix that shortens the key does not move it; only a change-log entry does. A session that never gets there, or is not graded S or SD (a wrong color), counts as never. Minutes between the two screenshots are a trend only | `../tool/score.mjs` (from `styles-steps.jsonl`'s `colors`)                                                                                                       |
| 5   | Severity 3 and 4 problems open | 0 confirmed, from the sessions, the expert walkthroughs and the screenshot audit together (one problem found by both an expert and a session counts once). A `backlog.md` row rated 3 or 4 at triage counts as open from the start, once, however often it is found again. Not scored in a round whose scripted walk left out a screen that a planned task's success path crosses: a skipped screen is not a clean one                                                                                                                                                                                               | Counted in the round's `insights.md` after the skeptic check; an expert's or the audit's finding only once a scripted repro or a measurement confirms it (below) |
| 6   | Accessibility                  | On every tier 3 screen of the scripted walk, at 1440 x 900 and 900 x 700, in the dark and the light theme: axe-core 0 serious or critical (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after any action the walk lists; and after adding a text card, choosing a text card's match kind ("Starts with"), adding a Color line and adding a Shape line, a value typed with no click first is written (focus lands where the next input goes)                                                                                       | `../tool/bars.mjs --tier 3 --scheme dark` and `--scheme light` (printed there as "bar 8")                                                                        |
| 7   | Keyboard                       | Sam's keyboard-only sessions (started `empty --keys`): at least 3 of 4 S or SD, and 0 confirmed places a keyboard user cannot reach, operate or leave. Such a place is confirmed by a scripted repro started with `--keys` (a `real.mjs` walk under the round's `repro/`) or by two of Sam's sessions, never by an expert's reading alone                                                                                                                                                                                                                                                                            | The graders' grades of Sam's sessions; the accessibility expert's walk, each finding confirmed by a `--keys` repro                                               |
| 8   | Words at rest                  | On each tier 3 screen whose words `bars.mjs` counts, no count above its count in `../tool/bars-limits.json` (`tier3`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `../tool/bars.mjs --tier 3` (printed there as "bar 9 (b)")                                                                                                       |

**Bar 6, the screens and actions** (`../tool/bars.mjs`, `WALKS3`): the start screen; a sample just
opened; Everything's Node and Edge tabs; a new layer with its picker open; the add-a-condition
menu; a text card; a layer with a condition at rest; a color just added; the text and line menus;
the analysis list, filtered to groups (its one-line descriptions join the wording check) and a
run's settings; a run's folder of groups on its Node and Edge tabs; two layers picked together; a
layer with an Edge tab condition at rest; a file read before loading; a category, a yes/no, a
number and a has-no-value card; a layer with four conditions at rest; a color bound to a category
column, with its key, and that color's popover; the size popover before a column is picked and
after; a run's folder with its picker open and a card added to every layer; the "Color from each
layer" dialog the purple token opens; a colleague's project just opened, and its layer selected; the find box with a name typed and its
results; a node's inspector showing its Memberships and "Why this look"; a node's own Style tab
with its Fill "+"; the open shape list; a sample just opened with the key switched on. (The last
five were added 2026-10-18: each sits on a core or study-question task's success path or a
blocking trap, and bars 6 and 8, the experts and the audit read only the walk; preflight 6 does
not pass until `WALKS3` walks them.)
Focus is checked after: adding a layer, adding a card, Done in the picker, adding a color, Undo,
Escape from the line and text menus, running a groups analysis, Done in an Edge tab picker, Load,
adding a yes/no card, Escape from a card's menu, Done after four cards, picking a column for a
color, Escape from the color popover, adding a size, Escape from the size popover before and after
a column, adding a shape, adding a card on a folder, Done in a folder's picker, Escape from the
"Color from each layer" dialog, selecting a colleague's layer, choosing a text card's match kind.
Typing with no click is checked after adding a text card, after choosing "Starts with" in a text
card's match menu (on T40 B's success path, letters typed there reopened the menu and were lost),
and after adding a Color line and a Shape line; a planted case types on the start screen, where
nothing takes text, and must fail. The walk also saves the spoken text of every screen it walks --
accessible names, live-region text and notices (the undo notice, "Not set yet") -- to
`<round>/bars/spoken.json`, which the wording check (preflight 7) reads beside the screen words and
the experts read against the prompts. Hover-only text (tooltips, info bubbles) is in neither; the
experts read it. The design engineer owns `WALKS3` and every addition to it.

**Bar 8, the limits:** recorded by `bars.mjs --tier 3 --record-limits` on build `31e8c2387`
(2026-10-17): a sample just opened 50, Everything's Node tab 47, a layer with a condition at rest
39, a folder of groups 72, two layers picked together 71, a layer with four conditions at rest 42.
Re-recorded on the round 1 build only where lower than the 31e8c2387 counts (`--record-limits`
keeps the lower of the two; a new screen, such as the folder's open picker, gets its first count
there). A screen above 50 words (at rest) or 40 (a selected object's inspector) is a severity 2
finding reported each round until it falls: today a folder of groups (72) and two layers picked
together (71).

**What the expert walkthroughs and the screenshot audit feed, and nothing else:**

- **Bar 5:** a severity 3 or 4 finding, once confirmed by a scripted repro or a measurement.
- **Bar 7:** the accessibility specialist's keyboard findings, once confirmed by a `--keys` repro.
- **The any-severity count** (a measure, not a gate): every confirmed finding.
- **Preflight 7:** an expert's finding of words in `spoken.json` that lead the way to a task's
  answer: that task is reworded before the round or reported as primed.

**When they run:** every round, before they see the sessions, the Figma product designer, the
visual designer and the accessibility specialist walk every bar 6 screen on the frozen build at
1440 x 900 and 900 x 700, in light and dark, and the design engineer runs the screenshot audit at
the same sizes and in both themes. The key-and-drawing check reads every session's last
screenshot, so it runs after grading; it feeds bar 5 and answers question 6. Images are checked
by reading what they show, never by an image model's yes or no. The audit's checklist, the same
every round:

- text cut with no way to read it whole, and a raw code, id or field path on screen (`bars.mjs`
  prints both as its "bar 10" counts; the expert gives each a severity);
- overlap, and anything that runs off the panel or the window at 900 x 700;
- contrast below 4.5:1 for text or 3:1 for controls and focus rings, and a control with no
  visible focus ring;
- the purple "Layer" token's text at 4.5:1 or more against its background in both themes,
  measured;
- **key and drawing agree**: on every session's last screenshot, the key's colors and values, the
  picker's count and the colors on the drawing say the same thing. A disagreement (a key that is
  stale, two values in one color where the key says each has its own) is a severity 3, confirmed
  by that session plus a measurement (the session's `styles.json` colors against the key's values
  and the picker's count, read by script) or a scripted repro. A styled node the participant left
  selected is graded by its color in the style tree (`answers.md`); when its selection ring or tint
  makes it read as a color the key does not say, that is a key-and-drawing disagreement, recorded
  here. Two values the key draws in one color, or whose colors `colorWord` names alike, are
  recorded as look-alike colors (on round 1, T46 B and T47 B: ten clusters in an eight-color
  palette, with B's crimson group beside the new red).

The experts' scope also covers what the screen says out loud: the walk's `spoken.json` (accessible
names, live-region text, notices) is read against the prompts for words that lead the way, and
against the screens for names that misstate what a control does.

Each finding is confirmed by a scripted repro (a `real.mjs` walk under the round's `repro/`) or a
measurement (a contrast ratio, a pixel box, a count read by script), never by a second expert's
reading: every expert is the same model reading the same picture, so a second reading is not
independent. Only a confirmed severity 3 or 4
feeds a bar: it counts against bar 5 like one found in a session, once even when a session also
hit it. The number of confirmed findings of any severity is a measure, not a gate (below), and is
compared between rounds only over the same set of screens. Bar 5 is not scored in a round whose
walk left out any screen a planned task's success path crosses (preflight 6): the experts and the
audit see only what the walk shows, so a missing screen would read as a clean one.

## Measures reported every round (not gates)

| Measure                                                                                                                                                                          | Why                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| All sessions' success together (target 85%)                                                                                                                                      | The earlier tiers' target                                                   |
| Minutes to the first styled graph, per task (a trend: the clock holds the model's thinking)                                                                                      | Question 1                                                                  |
| Steps against the success path, median per task                                                                                                                                  | Where success is costly                                                     |
| Which card types were used, by whom, and which were looked for and not found                                                                                                     | Question 2; a card type nobody reaches is a candidate for removal           |
| Each card type's success, with the number of domains it was reached on; a type reached on one domain only is labeled so                                                          | Question 2; a pass on one domain does not read as general                   |
| Touches of the purple "Layer" token on T46 and T47 (`Token:`) and what followed; picker opened on a folder or on one layer                                                       | Question 3                                                                  |
| T47 and T48 successes by route (folder, several, one by one, around, cover), from grade.md's `Route:`                                                                            | Question 3, bar 1 and the stall rule count only folder and several          |
| Picker opened unprompted on a single layer (T38, T40, T41, T45), and the step it was opened                                                                                      | Shows whether the collapsed picker is found                                 |
| Escape pressed in the picker or a card, and whether the step note expected it to cancel                                                                                          | Escape keeps edits by design                                                |
| Edges or ties looked for on the Node tab first (T45)                                                                                                                             | Tests the split into Node and Edge tabs                                     |
| Which color the participant named for a kind, and where they read it (T51)                                                                                                       | Question 6                                                                  |
| How a change was reversed (arrow, Control+Z, typed back, layer removed)                                                                                                          | Question 4                                                                  |
| Whether the layer's conditions were read before T50's answer, per half (A's names give away the rule), from grade.md's `Read from:` (rule, selection, other)                     | Question 5                                                                  |
| First move after the sample or file opened, and the second place looked                                                                                                          | Where a newcomer looks first; the second place is the stronger signal       |
| Script errors, console errors and failed requests on a success path (target 0)                                                                                                   | Each is a bug report                                                        |
| What worked, per task                                                                                                                                                            | A report of failures alone does not say what to keep                        |
| Bar 1 over the newcomers alone (all but Alex and Maren), per task; a half that holds only because of them is named                                                               | Their findings never stand in for newcomers (`score.mjs` reports it)        |
| Bar 1 without Sam's sessions, per task; a half that fails only through Sam names bar 7 as the cause                                                                              | Sam's core sessions can use up a half's one allowed F                       |
| What each T46 to T48 participant typed into the analysis filter, per half; a word the prompt gave (B's "clusters") reported as prompted, A's "circles" as the unprompted reading | The B halves keep "clusters" on purpose (`tasks.md`); the filter matches it |
| Sam's steps to the first styled graph on T39, in key presses                                                                                                                     | Bar 7's evidence; left out of bar 4                                         |
| Confirmed findings of any severity (sessions, experts, audit), against last round over the same screens                                                                          | The trend under bar 5; a rise is explained in `insights.md`                 |

## Round plan

- **Rounds:** ONE round for now: round 1 runs, is scored and reported, and the study then stops
  for the owner. A further round runs only on the owner's go (2026-10-20). Round 1 runs every task
  but T37, T42 and T44 (see Size). A later round, once the owner allows one, re-runs every task
  below its bar at full size, the core tasks at full size always, and each task a fix touched at 4
  or more; T42 and T44 run at 4 in round 2.
- **What round 1 can conclude:** it cannot pass, because T37, T42 and T44 are unjudged by plan, and
  the stall rule does not apply, because there is no round before it. Its report gives each bar as
  held, failed or not scored over the 12 tasks that ran, lists T37, T42 and T44 as not judged, and
  never says "passed"; its headline reads "not passable in round 1: three tasks not run by plan".
  Its count of confirmed findings is the baseline for that measure.
- **Core tasks** (decide the stall rule): T39 (first styled graph), T40 (picking by data, two
  domains), T47 (several layers at once; its successes counted on the folder or several route
  only) and T48 (a card added to several layers at once, where bulk editing and picking meet).
- **Size:** at most 56 sessions a round; round 1's allocation is in `roster.md` (the four core
  tasks at 6, eight tasks at 4: T38, T41, T43, T45, T46, T49, T50, T51). T37, T42 and T44 are not
  run in round 1: T37's first look is recorded in every session; T42's and T44's slots go to T51,
  whose key is the likeliest screen to look right and answer wrong (question 6), so it is judged
  in round 1. T42 and T44 run at 4 in round 2, since the study cannot pass while a task is
  unjudged; T37 waits for a later round.
- **At most 4 participants alive at once**, and at most 4 browsers machine-wide in all (participants,
  graders, experts, pilots, engineers' checks, freezes), every one through `../tool/with-browser.sh`.
  `real.mjs --start` is called directly, never wrapped in `with-browser.sh` (it takes its own slot).
- **Starting a session:** each participant's start is its own step, run before the participant's
  turn, with `REAL_SLOT_WAIT_SECONDS` set; a session with no `01.png` is re-run as `<id>b`. Every
  session ends with `--end`, also after a failure.
- **No step cap.** A session ends when the participant says done, gives up, or stops making
  progress.
- **Step notes:** one or two sentences per step, in character.
- **Session cap:** 56 per round.
- **API errors:** a session that ends on a model API error is voided and run again from a clean
  folder (a new `<id>b`, never the old folder); if that fails too, it is run once more on Sonnet.
  Every session's model is recorded in its `grade.md`, and a session not run on the round's model
  is reported apart.
- **Isolation:** participants read only their briefing folder under `tmp/studio-sessions/`; the
  round's leak check (`real.mjs --leaks`) runs over every session and its log count is read; a
  participant's own log is read before a session is voided on a text match.
- **Frozen build:** one copy of `graphty/dist` per round, made after the preflight passes; its
  commit is on this file's first line, and in every `session.json`.
- **Never resume an edited run:** a changed plan or script starts a fresh run.

## Before a round may start (preflight)

1. The build under study is the studio worktree's commit, rebuilt with no uncommitted changes,
   frozen and served; this file's first line names it. A commit that changes nothing in graphty,
   graphty-element, compact-mantine or `pnpm-lock.yaml` does not refreeze the build: a walk, a
   bars run or a reference value read on any commit whose diff of those four against the named
   build is empty counts as read on the named build, and the gate evidence records that empty
   diff. (1fa51e2b0b holds the same app code as 52cb47a85a.) The round 1 build holds the golden
   merge f9d8b44b9 (`git merge-base --is-ancestor f9d8b44b9 <build>`), which `decided.md`'s
   2026-10-20 entries describe; 3ef9e6c1ec does not, so nothing walked or read on it counts.
2. `node ../tool/real.mjs --prove` prints only `ok` on the frozen build.
3. `node --test ../tool/tier3.test.mjs`, `node ../tool/score.mjs --self-test` and
   `node ../tool/wording.mjs --self-test` pass: the tier wiring, the style-tree dump on a planted
   removal, and every scripted bar's planted failure. A self-test passes only when it holds these
   planted cases (a passing self-test without them reads as a check that does not exist):
    - **wording:** an irregular-form echo ("drawn" against "draw"), an echo found only in
      `spoken.json`, and a phrase of two or more words, common words included, that a prompt
      shares with the screen words or `spoken.json`;
    - **gate:** a pilot keyed by its half's folder, a half missing each walk it needs (preflight
      9), a walk on a build whose app code differs, and a bars run missing a bar 6 screen;
    - **bars walk:** a MISS line for each of the five screens added on 2026-10-18 and for the
      typing check after "Starts with".
4. **Dry run on the frozen build:** every task's success path in `answers.md`, both halves, ends on
   its success state; each also walks its detours (`tasks.md`, "Detours the dry run walks") and the
   success path again by keyboard, noting focus and screen-reader names. Pilots start from the real
   start and get everywhere by clicking or keys, never by URL. A pass is complete only when every
   task half the round plans has its walks on the frozen build (preflight 1 says which builds
   count): the success and detours walks on every half, and the keyboard walk on Sam's four halves
   (T39 A, T40 A, T47 B, T48 A; the accessibility specialist walks the other screens by keyboard
   every round); a walk skipped for any reason (no browser slot free, a pilot that returned
   nothing) is run again, never read as clean. The keyboard walk counts only when its
   `session.json` records `keyboardOnlyMode: true` (started with `--keys`). The dry run walks
   only the halves the round plans: halves whose last pass found a blocking defect first, then the
   core tasks, then the rest. A pass that stops partway is finished, not started again; its walks
   on the frozen build stand. Each pass is triaged against `decided.md`, the tier's binding
   decisions: a complaint against a decided behavior is no change, and a reversal needs a new entry
   there with its reason and evidence. The dry run goes to the **session-ready bar** and no
   further: no crash, no blocked task and no grading-spoiling wrong result on any task's success
   path or listed detours, re-walked after fixing. A **grading-spoiling wrong result** is (a) an
   answer key success state that cannot be reached, or (b) a screen on a success path or listed
   detour whose count, key or drawn colors disagree with the style tree (the audit's
   key-and-drawing check, run on each pilot's last screenshot). A keyboard-only block on one of
   Sam's four halves is a blocked task. Only those are fixed (a defect on two screens
   once, in its shared part); friction, wording, cosmetic and keyboard-only or screen-reader-only
   problems go to `backlog.md`, each row with its Nielsen severity (accessibility items also to
   the accessibility expert's walk), and are fixed between rounds; a row at 3 or 4 counts once
   under bar 5 and is listed in round 1's `insights.md` as known and open, so the experts do not
   file it as new. Already rated: the folder's chain icon, which paints every cluster one color
   (3); the "Color: Louvain" key, which looks clickable and does nothing (2); a node's own Fill
   "+", which makes a one-node layer (3). At most two fix passes; a re-pilot after a fix pass walks only the
   success paths and the routes the fixes touched, and a half then holds with its success walk
   on the new frozen build plus its other walks from an earlier build of this dry run on routes no
   fix touched (each fix's commit names the routes it touches). If the bar still fails after two passes, the
   dry run stops for the owner with the remaining blockers. Confusing moments that remain go to
   the sessions, which exist to find them.
5. Every reference value in `answers.md` is read on the frozen build; the run-dependent ones
   (the clusters) are run twice to show they repeat. T46 to T48 accept any community analysis the
   analysis list offers (Louvain, Leiden, Label propagation, Markov, Spectral, Hierarchical), so
   each one's group sizes, and the target group's count, are read twice on the frozen build and
   written into `answers.md`. A method whose two runs differ is marked so there, and a session
   that ran it is graded against its own run: the target group and its count are read from that
   session's `styles.json`, not from a fixed number.
6. `node ../tool/bars.mjs <round>/bars --tier 3 --scheme dark --dist <frozen build>`, and again
   into `<round>/bars-light` with `--scheme light`, each with every planted case caught and no MISS
   line (read the MISS lines, not only the exit code); bar 8's limits are recorded on the round 1
   build from the dark run. The walk must cover every screen bar 6 lists; until `WALKS3` walks the
   five screens added on 2026-10-18 and the "Starts with" typing check, and writes `spoken.json`,
   this step does not pass, and the gate refuses (preflight 9).
7. **Wording:** `node ../tool/wording.mjs tasks.md <round>/bars/vocabulary.json` reports 0 shared
   words not kept on purpose, after a planted echo was caught. It reads the walk's screen words and
   its `spoken.json` (accessible names, live-region text, notices), and it counts a word's
   irregular forms as one word (draw, draws, drawn, drawing; pick, picked; keep, kept), with a
   planted irregular echo caught. Its "kept, on screen" lines are saved to
   `<round>/bars/wording.txt` and read against the last round's; round 1, which has no last round,
   reads them against the "Kept on purpose" lists in `tasks.md`. A kept word on screen that no
   list justifies is re-justified in `tasks.md` or its task is reported as primed.
8. **Briefings:** `real.mjs --brief` writes every planned session's briefing; each is read for
   priming (persona playing rules, the briefing's tool text) before the round.
9. **Gate:** `real.mjs --gate <round>` writes the "Gate evidence" section of the round's `plan.md`
   for the frozen build (a pilot of every planned task half and the bars run). `--start` refuses
   every session of a round without it; the round ends on the first refusal. The gate keys each
   walk by its half's folder (`pilot/<T40B>/<walk>/session.json`), and holds a half only with
   the walks preflight 4 asks of it (the keyboard walk with `keyboardOnlyMode: true`), each on a
   build that counts as the frozen one or, after a fix pass, on routes no fix touched (preflight
   4), each with its screenshots. It refuses when the bars run's screens miss one bar 6 lists, or
   no `spoken.json` was written. Its list of halves still missing a walk is the dry run's queue:
   pilots take only halves that are both in the round's plan and on that list.
10. This file, `tasks.md` and `answers.md` are frozen; the round folder is new.

## After a round: scoring and the skeptic check

`node ../tool/score.mjs <round>` scores bars 1 to 4 and writes `score.json`. Two skeptics, each
alone, try to refute every finding and every bar result; a finding two skeptics drop is dropped,
one that one drops is weakened unless answered with evidence (a screenshot, a grade line, the code
at the build commit). A defect is called confirmed only with a scripted repro or two sessions.
Every number is given with its denominator, with and without build-decided sessions.

## How a fix is accepted

In the package that owns the problem: graph facts and neutral `{ code, params }` in
graphty-element (an additive API is the team's call, recorded under "decided by the team" in
`../owner-decisions.md`; a breaking one goes there "for the owner" and never blocks the study),
words and arrangement in the graphty app, a shared control fixed in compact-mantine. Every fix
serves every user and domain, comes with a test that drives real input and fails without it, and
is re-piloted on the new frozen build. Remove before adding; words at rest never rise.

## When the study stops (done)

- **Passed:** every bar holds in one round. Recommend confirming with real people.
- **Stalled:** a round makes no progress over the round before: the core tasks' successful sessions
  (T47's on the folder or several route only) rise by fewer than 2, no confirmed severity 3 or 4 was closed, and no failed bar now holds. The
  owner is told, with the evidence.
- **A one-way door:** a problem whose fix needs an owner decision that cannot be undone cheaply
  stops work on that task only; the owner is told.
- **The safety cap:** 6 rounds.

## Change log

- 2026-10-21 (round 1 pilots on 758b8e8081; no session has run): `answers.md` matches the frozen
  build 758b8e8081 as the pilots in `rounds/r1d2/pilot/` saw it (15 halves: T37 B, T38 B, T39 A,
  T40 B, T41 A and B, T42 A, T43 A and B, T44 A and B, T45 A and B, T46 B, T49 A; the
  `answers.md` change log lists what changed). No bar changed and no step count changed. `tasks.md`
  is unchanged: no prompt was wrong. The walk agents could not write `report.md`; the session
  folders and this log are the record.
    - Fixed on this build: a layer made from a find-box selection takes condition edits before its
      first look (T41 B's "Has no value" switch, a second card, Done keeps both); Undo after
      Control+O > Replace with the same file redraws from the layers; the first find-box pick
      after Replace draws its ring. **T44 B's grading-spoiling state is gone**, so its grading line
      (grade from the last screenshot) is withdrawn and T44 B is graded from the tree as usual.
    - **Grading risk, for preflight 4's triage:** with a find-box selection still held, the first
      color or size on a layer moves the drawing about 135 to 155 px right and can leave painted
      nodes off screen on the last screenshot (T38 B: 7 of 10 visible; T41 B: 3 of 4), so a
      participant reading names or a count off the drawing can stop short. Graded as before: the
      layer from `styles.json`, an answer only as it was on screen.
    - Recorded for preflight 4's triage, not fixed here: a layer made from a `>` rule
      (`hours > 20`) opens a card that shows raw rule text and takes no edit, only Remove (T42 A;
      the `>=` form works); a "Rule: graphty.degree > 16" layer's card shows the internal field
      path and its attribute list offers no Degree (T37 B); after an exported GraphML is opened
      with Replace and undone once, the key drops the Louvain section while the groups stay
      drawn (T46 B); Escape in a category card's value search closes the whole picker (T46 B);
      Escape on a layer's Which nodes summary cleared a selection (T37 B); a just-added number
      card shows a count of its own (T45 B); "Filter to..." leaves focus on the tree row on A too
      (T42 A); a right-click on a find-box row does nothing (T38 B); the picker's hex box can leave
      the caret after the value, "Remove node color" sends focus to Effects' "+", and the eye's
      tooltip and name differ (T49 A); F6, Which nodes, the heading's focus ring and Enter on
      Samples as before.

- 2026-10-20 (round 1 build refrozen): the study build is 758b8e8081, served from
  `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081`. It replaces
  6de5f95d12, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-6de5f95d12`.
  `real.mjs --prove` passes on it once two of its checks were corrected (they failed on 6de5f95d12
  too): selecting a node moves the camera, so the click-at check reads a node's point after the
  selection, and a reopened tab's start page pictures, which graphty.app does not serve, are logged
  without failing the step. No bar changed.

- 2026-10-20 (round 1 pilots on 6de5f95d12; no session has run): `answers.md` matches the frozen
  build 6de5f95d12 as the pilots in `rounds/r1d1/pilot/` saw it (21 of 30 halves; T38 A, T40 B,
  T42 B, T46 B, T47 A, T48 B, T49 A and T51 not walked again; the `answers.md` change log lists
  what changed). No bar changed and no step count changed. `tasks.md` is unchanged: no prompt was
  wrong. Several walks' `report.md` was not rewritten for this build (the walk agents could not
  write it); the session folders and this log are the record.
    - **T50 is no longer blocked:** both project files, saved by an earlier build, open with their
      look on every way in, and `changes.changed` stays empty on the reading routes.
    - Fixed on this build: Control+O > Replace with the same file keeps hand-picked and rule
      layers on the same nodes or edges; the table's Louvain column uses the key's group names.
    - **Grading-spoiling, for preflight 4's triage:** on T44 B, a one-node label layer made from a
      find-box selection, then Control+O > Replace with the same file, then two undos, leaves the
      deleted layer's label drawn; labeling Everything afterwards draws only that name while
      `styles.json` reports `node.label` on all 24, so a grader reading the tree would mark S.
      `answers.md` grades that state from the last screenshot until the build is fixed.
    - Recorded for preflight 4's triage, not fixed here (each with its walk folder in the pilot's
      output): F6 still never reaches the top bar and stops on resize handles; a new layer's Which
      nodes still only expands; the drawing still moves when a selection is held (selection
      layers, a node's own Fill, a size bound on a selection) and the table still shrinks it;
      Escape on a member opened from a layer's Values list closes the layer (`decided.md` says it
      returns to the member's row; T50 keyboard); Escape in the picker's hex box and after removing
      a just-added unset line says nothing on screen; Tab never leaves the color picker; Tab in a
      typed attribute list takes nothing; Replace takes two pages and two clicks; an exported
      GraphML opened with Replace adds "A group from the file" layers with internal names, a notice
      that runs off the canvas, style fields offered as attributes and unmatched text ids; a layer
      from `=degree > 16` is named "Rule: graphty.degree > 16"; on T41 B the "email: has a value"
      card refuses "Has no value" and Done drops the edits silently; two "Degree" rows in the
      analysis list after a run, and Tab with `deg` typed lands on a disabled "Update Degree layer";
      Escape twice from the find box cleared a selection with a layer open (T43 A) and a second
      Escape after the color picker cleared a node selection (T46 A); with the table open a find
      pick does not scroll the table; a find-box node pick after Replace drew no selection ring;
      the sample pictures are broken (graphty.app answers 404); the private-window notice shows on
      every opening; no focus ring on the opened graph's heading; the karate club's three top
      degree colors are nearly the same brown; a node is named by id in the inspector while its
      label is shown (T39 B, T44 B).

- 2026-10-20 (round 1 build refrozen): the study build is 6de5f95d12, served from
  `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-6de5f95d12`. It replaces
  7d87760756, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-7d87760756`.

- 2026-10-20 (round 1 pilots on 7d87760756; no session has run): `answers.md` and `tasks.md`'s
  facilitator detours now match the frozen build as the pilots in `rounds/r1/pilot/` saw it, every
  half walked by pointer, detours and keyboard (the `answers.md` change log lists what changed).
  No bar changed. Bar 4's frozen counts stand; the key's counts fell by one on every task that
  brings a file ("Open a file" and Load replace "No thanks", "Open project or file" and Load) and
  are unchanged on sample tasks (Samples and the card replace "No thanks" and the sample).
    - Grading records, not bars: the start page's turning demo is the first graph the tool sees,
      so T49's start is read from the first `styles-steps.jsonl` line after the sample opens, and
      every task's layers are graded from `styles.json` itself, never from its `changes`; a T49
      ending whose `colors` is `["none"]` matches the drawing. Reason: on this build the rule as
      written would grade every correct T49 undo F.
    - **T50 is blocked on this build:** both project files open without their style part ("1 part
      did not come back"), so no layer, nothing drawn, and no route to S. They opened with their
      layer on e3c5bca8e6. A T50 session on 7d87760756 is build-decided; under preflight 4 this
      is a blocked task, to be fixed before round 1.
    - Recorded for preflight 4's triage, not fixed here: F6 never reaches the top bar and lands on
      resize handles; a new layer's Which nodes still only expands; the drawing moves when a
      selection is held (runs, selection layers) and when the table opens; Tab in a typed
      attribute list takes nothing; Escape in the picker's hex box and the size dialog reverts
      silently; Escape on a checkbox closes a card's picker; the sample pictures are broken; the
      usage notice is off the first screen. Each contradicts `decided.md` or the bar 6 checks.
    - Tool, owed before any session: `real.mjs` prints "the app never drew its window" at every
      start on the start page, and its `styles-start.json` records the demo.

- 2026-10-20: round 1 frozen on 7d87760756 (`.study-builds/tier3-r1-7d87760756`), replacing
  3ef9e6c1ec (`.study-builds/tier3-r1d1-3ef9e6c1ec`). The commit merges origin/golden into the
  studio branch and holds merge f9d8b44b9, as preflight 1 requires. No bar changed.
  `real.mjs --prove` fails on it (45 checks pass, 20 fail): with no project open the app now
  shows a start page (a turning sample graph, Open a file, Open network data, Samples, New
  project) and no workspace toolbar, so the steps that name "Open project or file", "Undo",
  "Find" and "New from data..." find nothing, every setup stops at its first step, and the
  turning graph reports "the drawing is still moving" after every step. The setups, the walks
  and the tool's own proof steps must be rewritten for this entry before any session.
- 2026-10-20 (before any session; nothing has started):
    - The round plan runs ONE round. Further rounds need the owner's go. Reason: the owner asked
      for one round to start.
    - Preflight 4's dry-run exit test (regressions of the last pass's fixes under 10% of the fix
      list, the full passes stopped at about 40%, repeated until it holds) is replaced by the
      session-ready bar of the design-studio skill: fix only crashes, blocked tasks and
      grading-spoiling wrong results on the success paths and listed detours; friction, wording,
      cosmetic and keyboard-only problems go to `backlog.md`; at most two passes, then stop for the
      owner. Reason: five dry-run passes never converged. Their fix-now lists ran 344, 217, 151,
      129 and 124 rows, of which only 2 were crashes and 76-88% friction, wording or cosmetic
      (analysis in `tmp/tier3-dryrun-severity/`).
    - The studio branch now includes golden: origin/golden was merged into it (merge f9d8b44b9).
      Two behaviors follow golden and are recorded in `decided.md` (2026-10-20): the camera glides
      to center every pick, and an algorithm's result is painted as ordinary layers in its own
      result color. No bar changed. The build on line 1, 3ef9e6c1ec, predates that merge
      (`git merge-base --is-ancestor f9d8b44b9 3ef9e6c1ec` fails); the next freeze names a commit
      that holds it (preflight 1), and every walk and reference value is read again there.
- 2026-10-20 (fifth review by the researcher, the user advocate and the red team; frozen; no
  session has run):
    - Preflight 1: the round 1 build must hold the golden merge. Reason: all three found that
      3ef9e6c1ec does not, while `decided.md` and this log describe golden's behavior; its app
      code differs from HEAD in 1,472 files and no walk was made on it.
    - Round plan: what round 1 can conclude (held, failed or not scored per bar; never "passed";
      no stall rule; the confirmed-findings baseline). Reason: all three; bar 1 cannot hold while
      T37, T42 and T44 are unjudged, and the stall rule needs a round before.
    - Grades: a design problem is confirmed by two task halves or one session plus a repro.
      Reason: two sessions of one half share the prompt and the model, the same lack of
      independence that already rules out a second expert (researcher).
    - Grades: an asked color is judged by the app's own `colorWord`. Reason: "any dark green" and
      "bright red" were judged by eye, and bar 4 counts a wrong color as never (red team). The red
      team's new hue bands in `score.mjs` were not taken: `colorWord` already holds the decided
      bands (2026-10-18) and is what the app speaks, so no second table can drift from it.
    - Bar 1: a core half needs 2 S or SD from sessions other than Alex's and Maren's; bar 1 is
      also reported without Sam. Reason: one newcomer could fail and the half still hold through
      someone who knows another tool, against the roster's own rule (researcher). `roster.md`
      swaps Alex's T48 A with Dev's T46 A so T48 A no longer rests on Alex and Sam together.
    - Bar 5: `backlog.md` rows carry a severity, and a known 3 or 4 counts once from the start.
      Reason: the session-ready bar sends friction to the backlog unrated, so an expert could
      raise a known problem as new (user advocate, red team).
    - What the expert walkthroughs and the audit feed, in one place; the key-and-drawing check runs
      after grading and is confirmed by a script comparing `styles.json` with the key; look-alike
      colors recorded. Reason: it reads every session's last screenshot, so it could not run
      "before they see the sessions"; an expert's leading-words finding fed no bar (all three).
    - Preflight 3 names the planted cases each self-test must hold. Reason: today's self-tests pass
      on tools that cannot measure what preflights 6, 7 and 9 ask (researcher).
    - Preflight 4 defines a grading-spoiling wrong result, makes a keyboard block on Sam's halves a
      blocked task, asks the keyboard walk only on Sam's halves, and lets a half hold after a fix
      pass with older walks on untouched routes. Reason: the gate demanded three fresh walks while
      the re-pilot rule walks only success paths and touched routes, and two triagers would sort
      the same row differently (user advocate, red team).
    - Preflights 6 and 9: a missing bar 6 screen or `spoken.json` is a gate refusal, and the gate's
      missing list is the dry run's queue. Reason: "does not pass until" went unbuilt through three
      reviews; six of the 34 walks on 3ef9e6c1ec went to T37, which round 1 does not run (red team,
      user advocate).
    - `answers.md`: T50 B's summary reading ("31 or more hours and trained") is S, with a
      `Read from:` line on every T50 grade. Reason: no volunteer has exactly 30 hours, so both
      readings name the same six; the line keeps question 5's measure (researcher, red team; the
      user advocate's SD was not taken, since the reader named the right people and what they
      share).
    - `tasks.md`: T46 and T47 no longer say "keeps its own color". Reason: the purple token is
      spoken "each layer's own value", and question 3 asks whether readers take it to mean that
      (researcher).
    - Not taken: dropping T37 from the judged set (red team): its find-by-rule route is not the
      first-move measure every session records, so round 1 states it unjudged instead.
    - **Owed before round 1** (the gate refuses every session until these are done): freeze the
      commit that holds golden; the dry run's first pass on it (every planned half's success and
      detours walks, Sam's four keyboard walks); preflight 5's values for all six community
      methods, two runs each, and T51's palette colors; the design engineer's `WALKS3` screens,
      "Starts with" typing check and `spoken.json`, `wording.mjs`'s irregular forms, `spoken.json`
      and phrase echoes, and `gateCheck` by half, each with the planted case preflight 3 names;
      then preflights 6 to 9.

- 2026-10-19: round 1 dry run 1 frozen on 3ef9e6c1ec (`.study-builds/tier3-r1d1-3ef9e6c1ec`),
  replacing e3c5bca8e6 (`.study-builds/tier3-r1-e3c5bca8e6`). No bar changed.

- 2026-10-19 (round 1 pilots on e3c5bca8e6): `answers.md` and the T41/T48 detour line of
  `tasks.md` now match the frozen build as the pilots in `rounds/r1/pilot/` saw it (the
  `answers.md` change log lists what changed). No bar changed. Bar 4's frozen counts stand; the
  key's step counts rose by one on every task whose path adds a condition, because the collapsed
  Which nodes line only expands on its first click.
    - Left to the Director: T50 B, a reader who answers "31 or more hours and trained" from the
      "Select what it paints" summary (it reads "hours 31 to 52", "trained Yes (6)") has read the
      selection, not the layer's rule. The key grades "hours 30 to 52 and trained", read from the
      card, as S (52 is the file's highest); how the summary reading is graded is open.
    - Owed before round 1: T46 B and T49 B by keyboard (both walks stopped after the start
      screen). Most halves' `rounds/r1/pilot/<half>/report.md` was not written by the walk agents
      (the harness refused the write); T40 B's still describes build 1fa51e2b0b and T45 A's build
      58556989e8.

- 2026-10-19 (round 1 build refrozen): the study build is now e3c5bca8e6, in
  `.study-builds/tier3-r1-e3c5bca8e6`. It replaces build 1fa51e2b0b
  (`.study-builds/tier3-r1-1fa51e2b0b`). Its diff of graphty, graphty-element, compact-mantine and
  `pnpm-lock.yaml` against 1fa51e2b0b is empty, so it holds the same app code (preflight 1). No bar
  changed.

- 2026-10-19 (fourth review by the researcher, the user advocate and the red team; frozen for the
  tier 3 rounds on build 1fa51e2b0b; no session has run, and the dry run's exit test has NOT been
  met on this build):
    - Bar 2 writes in T49's rule: a style tree that differs while the drawing matches the start is
      not a false "done". Reason: `answers.md` settled it on 2026-10-18, but a grader reading this
      table alone would have marked it.
    - Bar 5 is not scored in a round whose walk left out a screen a planned success path crosses,
      and its "Scored by" says experts and the audit count only through a repro or a measurement.
      Reason: a round could otherwise report 0 open severity 3 and 4 from experts who never saw the
      shape list or a node's own Style tab -- a skipped check reading as a clean one.
    - Bar 6 checks focus and typing after choosing a text card's match kind. Reason: in T40 B's
      walk on this build, `GAL` typed straight after "Starts with" reopened the menu on "Ends with"
      and was lost: a core task's success path, which the bar did not check.
    - Bar 7's unreachable places are confirmed by a `--keys` repro or two of Sam's sessions.
      Reason: the same rule bar 5 has; one model's reading of a screenshot is not independent.
    - The audit settles styled nodes left selected: graded by the style tree's color, and a
      selection tint that makes a node read as another color is a key-and-drawing disagreement.
      Reason: on the find-box detour, purple genes kept yellow rings and read yellow-orange, and
      two graders could have graded the same screen two ways.
    - The walk saves spoken text (accessible names, live-region text, notices) to `spoken.json`,
      which the wording check and the experts read; the wording check joins irregular forms and
      round 1 reads kept words against `tasks.md`'s lists. Reason: "drawn" in every unset color
      line's name and the "Not set yet" line were checked by nobody in a measurable way, the
      stemmer joins only plurals, and "the last round's" list does not exist for round 1.
    - Preflight 1: a commit that changes no app code does not refreeze the build. Reason:
      1fa51e2b0b changed only documents, and naming it reset the dry run's count, so the night's
      pass re-walked tasks already walked on the same app code.
    - Preflight 4: the dry run walks only the halves the round plans, last pass's blocking halves
      first; a stopped pass is finished, not restarted; a keyboard walk counts only with
      `keyboardOnlyMode: true`. Reason: 9 of the stopped pass's 33 walks went to T37 and T42,
      which round 1 does not run, while T47 and T48 got none, and two walks named "keyboard" were
      started without `--keys`.
    - Preflight 5: a community method whose two runs differ is graded against the session's own
      run. Reason: T46 to T48 accept six methods, `answers.md` holds Louvain's values only, and a
      fixed number for a method that does not repeat would grade correct work F.
    - Preflight 9: the gate keys walks by their half's folder and holds a half only with its three
      walks. Reason: `gateCheck` in `real.mjs` keys each pilot by the walk folder's own name, so
      `pilot/T40B/b1fa-pointer/` never counts as T40B, and once a half matched, one walk passed it.
    - Question 2 and a new measure report each card type with the number of domains it was reached
      on. Reason: T45 and T50 reach each card type on one domain per half.
    - Round 1: T51 runs at 4 and is judged; T44 joins T42 in round 2 at 4 (`roster.md`). Reason:
      coloring by a category is the commonest first styling act, and its key is the screen most
      likely to look right and answer wrong (question 6); names on the drawing were tested most in
      tier 1 and answer no study question. The total stays 56 and no persona's count changes.
    - `tasks.md`: T50 asks what "made the project color them" orange or green, not "draw". Reason:
      T50's success route reads "Why this look", where every unset color line's spoken name says
      "drawn". `draw` is kept on purpose in T43, T47 and T51 with its reason.
    - Not taken: T41 B's "missing" reworded in one half only (the halves already differ in dataset;
      a wording difference in one half would mix wording and data, the same limit T46 to T48 carry,
      and "missing" echoes no screen word); T51 B moved to College football's conferences (a half
      never piloted, needing new reference values and walks before round 1, on a task whose B half
      changed on 2026-10-18).
    - **Owed before round 1** (the gate refuses every session until these are done):
        - Finish the dry run on 1fa51e2b0b (or 52cb47a85a, the same app code): all three walks of
          T46 A to T50 B first, then T39 A (keyboard and detours), T41 B (keyboard), T43 A and B,
          T45 A and B, T51 A and B; triage the pass into `dry-run-r1-5.md` and `backlog.md`. The
          "Starts with" typing defect on T40 B is a blocking success-path defect: fix it in its
          shared part, refreeze, and walk T40 B and T50 A (both text-card routes) again; "Add a
          condition" needing a second click is triaged against the exit test.
        - Design engineer: `WALKS3` walks the five screens added on 2026-10-18, the "Starts with"
          typing check and `spoken.json`; `wording.mjs` joins irregular forms; `gateCheck` keys
          by half and checks the three walks and the build equivalence; each with a planted case.
        - Preflight 5's reference values for every community method on T46 to T48, two runs each.
        - Preflight 6 (both themes), 7, 8 and 9 on the frozen build.

- 2026-10-18 (round 1 build frozen): the study build is now 1fa51e2b0b, in
  `.study-builds/tier3-r1-1fa51e2b0b`. It replaces build 52cb47a85a
  (`.study-builds/tier3-r1d3-52cb47a85a`), the third dry run's build. No bar changed. The dry
  run's exit test had not been met on this build (the 2026-10-19 entry lists what was owed).
- 2026-10-18 (third review by the researcher, the user advocate and the red team; frozen for the
  round 1 build 52cb47a85a; no session has run):
    - Preflight 4's "until a pass finds nothing new" is replaced by an exit test (no blocking
      defect on a success path or listed detour, regressions under 10%, no reversed decision),
      triage against the new `decided.md`, and a pass incomplete while any planned half lacks its
      three walks. Reason: four passes found 344, 217, 151 and 129 defects; 41% to 55% of pass 4's
      came from pass 3's fixes or survived them, and three behaviors flipped between triages
      (a dimmed "+" as a Tab stop, Escape in the inspector, a card's remove button in the Tab
      order). Pass 4 skipped T39 A and B, T41 B and T46 A. The fourth-pass stop is gone: it named a
      pass already past. The gate (`real.mjs --gate`) already refuses a half with no pilot on the
      frozen build.
    - Bar 4: at most 10, twice the key's 5, as a fixed number. Reason: the key's T39 path was 5 on
      every build since 58556989e8, so "twice the key's 6" gave a false reason and 12 was 2.4 times
      the key. The red team's "keep 12, drop the derivation" was taken in part: the limit no longer
      follows the key.
    - Bar 5: an expert or audit finding is confirmed by a scripted repro or a measurement, not a
      second expert (the same model is not independent); the Layer token check is a measured
      4.5:1.
    - Bar 6: five screens on success paths and blocking traps join the walk (find with results, a
      node's Memberships and "Why this look", a node's own Style tab, the open shape list, a sample
      with the key on).
    - Grading, settled in `answers.md`: T46 to T48 accept any community analysis, with reference
      values read for each (the prompts never name Louvain); T48 B's filtered run is
      `Route: around` (no bulk credit); T44 A keeps `id`; T49 is graded by the drawing, and a
      style tree that differs is a finding about the design, not an F or a false done (which also
      makes the hand comparison with `revision` ignored unnecessary for the grade).
    - Wording (`tasks.md`): T46 and T50 drop "drawn", which every unset color line's name now says;
      "clusters" (B of T46 to T48) and "circles" (A) are kept with their reason, and what B typed
      into the analysis filter is a new measure. T51 B asks for the companies, not the agencies,
      so its halves no longer share one answer (both were green) and B tests sky blue.
    - Not taken: moving T51 B to `neighbors.csv`'s tie kinds (it moves the task to the Edge tab,
      a second property, in an unjudged 2-session task; the companies change fixes the shared
      answer with one word); rewording the B halves' "clusters" (it is the everyday word; the
      halves are reported apart instead). Recorded as limits for the report: volunteers and
      sources share one data shape, and in T46 to T48 the A/B difference cannot be split between
      the wording and the dataset.

- 2026-10-18 (round 1 build refrozen; no bar changed): the study build is now 52cb47a85a, frozen
  in `.study-builds/tier3-r1d3-52cb47a85a`; it replaces build 6dd0b00bd7
  (`.study-builds/tier3-r1d2-6dd0b00bd7`, kept unchanged). It was built from the committed tree
  at 52cb47a85a, with no uncommitted changes to graphty, graphty-element or compact-mantine.

- 2026-10-18 (round 1 pilots on 6dd0b00bd7; no bar changed): `answers.md`'s success paths now
  match the frozen build 6dd0b00bd7, as walked by the pilots in `rounds/r1d2/pilot/`. Step counts
  held except T45 B (15, walked for the first time since ed4351b258) and T46 (12: the folder's
  caret expands it without a click on the row; walked on B only). T48's cover route is 2 steps
  longer (a new line's italic `6366F1` is not set until another color is set first), and T49's
  remove-and-re-add route is S only when the line ends set to `6366F1`. T39's path is still 5, so
  bar 4 still reads "twice the answer key's 6" against a key of 5. `tasks.md` changed one detour
  line; no prompt was wrong. Owed before round 1: T46 A all three ways (no browser slot was free),
  T37 A by keyboard and T43 B by keyboard past the start screen. One new grading question for the
  Director, recorded and not changed: T46's prompt asks the program to "work out clusters" without
  naming Louvain, and the analysis filter's `cluster` lists Leiden, Label propagation, Markov,
  Spectral and Hierarchical beside it, while the success definition says "a Louvain run's
  clusters"; how a run of another of these is graded is open. The questions logged on 5bd16cda6e
  (T48 B's filtered run, T37's find-box rule) and before stay open.

- 2026-10-18 (round 1 build refrozen; no bar changed): the study build is now 6dd0b00bd7, frozen
  in `.study-builds/tier3-r1d2-6dd0b00bd7`; it replaces build 5bd16cda6e
  (`.study-builds/tier3-r1d1-5bd16cda6e`, kept unchanged). It was built from the committed tree
  at 6dd0b00bd7, with no uncommitted changes to graphty, graphty-element or compact-mantine.

- 2026-10-18 (round 1 pilots on 5bd16cda6e; no bar changed): `answers.md`'s success paths now
  match the frozen build 5bd16cda6e, as walked by the pilots in `rounds/r1d1/pilot/`. Paths got
  shorter where Fill "+" now adds the Color line at once and the from box arrives with its value
  selected (T38 12 steps, T40 A 10 and B 11, T41 18, T42 10 on both halves, T39's new-layer route
  7); T39's path is still 5, so bar 4 still reads "twice the answer key's 6" against a key of 5.
  Owed before round 1: T45 B (not walked on this build; its from box likely saves a step) and T46
  A by keyboard (cut off on the start screen). Two grading questions for the Director, recorded and
  not changed: T48 B's route of a Filters step, a Louvain run while it is on, then the step turned
  off, ends on the target look and count but with clusters worked out on the 12 shown, and no
  `Route:` value fits it; T37's find-box rule (`=degree > 30`, through "Did you mean") now names
  the most connected, and is graded by its length like any route. The three questions logged on
  2026-10-17 stand. In `tasks.md` the T41/T48 detour line about a card left with no value was out
  of date (a notice now says it was dropped, except after a click on the drawing); no prompt was
  wrong.
- 2026-10-18 (no bar changed): the study build is now 5bd16cda6e, frozen in
  `.study-builds/tier3-r1d1-5bd16cda6e`; it replaces build ed4351b258
  (`.study-builds/tier3-r1d1-ed4351b258`, kept unchanged). It was built from the worktree, which
  also held uncommitted changes to graphty, graphty-element and compact-mantine at the time, so
  the commit alone does not reproduce it; the frozen copy is the build.
- 2026-10-17 (round 1 pilots on ed4351b258; no bar changed): `answers.md`'s success paths now
  match the frozen build ed4351b258, as walked by the pilots in `rounds/r1d1/pilot/`. Paths got
  shorter where focus now lands in the color box or a card's box (T38 13 steps, T40 A 11, T41 19,
  T42 A 12, T45 A 16); T39 is still 5, so bar 4 still reads "twice the answer key's 6" against a
  key of 5, for the Director to settle between rounds. The two build defects that decided tasks on
  58556989e8 are fixed on this build: T50's layer opens by name with its rule, and T42's number
  card shows an inline error instead of crashing (`10,000` is taken; `$10,000` is refused with a
  message). Three grading questions for the Director, recorded and not changed: T37 also accepts a
  node's Degree matched against the Values tab's "Highest" (both on screen before any run), which
  makes a 3-step route; T44 A keeps accepting `id` as the name though it drops the spaces
  (`MlleVaubois`); T49's "remove the Color line alone" draws the starting look while the tree holds
  no color, so it is F by the tree while the screen shows it done. In `tasks.md` one detour line
  for T40 A and T50 A was out of date (focus lands in the card's text box) and now says so; no
  prompt was wrong.

- 2026-10-17 (round 1 build refrozen): the study build is ed4351b258, served from
  `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-ed4351b258`. It replaces
  58556989e8, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-58556989e8`.

- 2026-10-17 (round 1 pilots on 58556989e8; no bar changed): `answers.md`'s success paths now
  match the frozen build, counted one click or entry per step. Bar 4 still reads "at most 12,
  twice the answer key's 6": the key's T39 path is 5 steps on this build, and the limit stays 12
  because bars change only by the Director between rounds. Two build defects decide tasks and
  fall under preflight 4: a colleague's project opens with its layer not joined to its row, so T50's
  rule is on no screen (both halves); a number card whose low end goes above its high end crashes
  the inspector (T42). The look hash keeps each layer's `revision`, so T49's exact-retype route
  needs graders to compare the style trees with `revision` ignored until `../tool/measure.mjs`
  strips it. `tasks.md`'s prompts were walked and none was wrong.

- 2026-10-17 (round 1 build frozen): the study build is 58556989e8, served from
  `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-58556989e8`. No build was frozen
  before it.
- 2026-10-17 (second review by the researcher, the user advocate and the red team; frozen): bar 1
  writes out what 80% means at 4 and 6 sessions, and T47 and T48 hold only when most successes went
  by the folder or several route (one layer at a time no longer counts: it is the bulk edit not
  found). Bar 4 is measured over pointer sessions only (Sam's key presses are another unit) and a
  session not graded S or SD counts as never. Bar 6 is walked in both themes, checks that typing
  after adding a text card, a Color line or a Shape line is written, and covers the screens success
  paths go through and the walk had missed: color and size bound to data and their popovers, the
  "Color from each layer" dialog, an Edge tab condition at rest, a colleague's project and its
  layer, the filtered analysis list. Bars 6 and 8 name `bars.mjs`'s own numbers. The screenshot
  audit has a written checklist, including key and drawing agreement on every last screenshot; only
  confirmed severity 3 and 4 findings feed a bar (bar 5), and the any-severity count is a measure
  compared over the same screens. Question 3 also reads T46, with a `Token:` grade line. New
  measures: bar 1 over newcomers alone, Sam's keyboard steps. The roster keeps Maren off T39,
  Alex off T40 B and Tom off T51. Not taken: the stall rule reading the any-severity count (it
  grows with the screens walked; severity 3 and 4 already count); T45's halves given one card type
  (the task is picking ties on the Edge tab, the same in both halves); a newcomer on T44 A (T44 is
  unjudged at 2 sessions and runs at 4 in round 2); a check that fails on any kept word newly on
  screen (the round reads the list instead: a word on screen may still be the right word).

- 2026-10-17 (after the review by the user advocate, the red team and the Director): bar 1 no
  longer passes an unjudged task, and T47 holds only when most successes went through the
  clusters; bar 4 ends at every node in one new color and counts a session that never got there;
  bar 8's limits only fall, and screens over the word budgets are reported as severity 2; T48 is a
  core task at 6, T37 and T42 leave round 1, T51 (each kind its own color) joins at 2; three new
  measures from the design decision's watch list; the folder's open picker joins bar 6; the dry run
  no longer stops after 4 passes with defects left; "1 of 2 layers" dropped from what is studied
  (no success path reaches it). Where the reviewers differed, the Director's call stands: T37's
  slots go to T48 (not to T42), and T50 keeps its project file, with question 5 reported per half.

- 2026-10-17: Rewritten for the owner's new focus, first use and styling on the combined Style
  panel. Replaces the earlier tier 3 draft for returning users (git history only). Bars 1 to 4 are
  scored by `../tool/score.mjs`, bars 6 and 8 by `../tool/bars.mjs --tier 3`, and the wording
  check by `../tool/wording.mjs`; each was shown to fail on a planted case. Bar 8's limits recorded
  on build `31e8c2387`, to be recorded again on the round 1 frozen build. Not frozen.
