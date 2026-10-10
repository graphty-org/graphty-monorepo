# Tier 2 round 2 decisions: what changes before round 3

Decided 2026-10-09 by the Design Director from `insights.md`, `scores.md`, the eight design roles'
proposals and the red team's challenge. Every code claim below was checked against the studio
worktree's source (branch design/studio-tier1), which holds the frozen study build 8f0d5a6f7 plus
notes.

## Was there a dry run, and did participants hit implementation faults?

Yes. Before the first session, every task's success path and round 1's commonest wrong turns were
walked by pointer and by keyboard on four builds in a row (`../../dry-run-r2-1.md` to
`../../dry-run-r2-4.md`). Every task half was then piloted on the frozen build, all 30 detour walks
reached their screens on it, and the study tool's self-check passed five times.

It mostly did its job. Of about 355 problems the graders recorded, about 30 are build faults. None
is above severity 2, none decided a grade, and no session ended on an error. Participants spent the
round on design questions: where a feature lives, what a word means, what the screen leaves out.

It fell short in three ways, and round 3 fixes each one (changes 1 to 3):

- **The walk list is always one round behind.** Each dry run walks the previous round's detours.
  Twelve of the thirty faults sat on a detour nobody had listed: styling a selection. Adding round
  2's detours would close round 2's gap and leave round 3's open. So the next dry run starts from
  throwaway pilot sessions on the candidate build and scripts the routes they actually take.
- **A fault the keyboard walk found was handed on instead of fixed.** The find box's second Escape
  dropping focus was found in the dry run and reached the frozen build anyway.
- **The study leaked, and that hurt more than the build did.** Participants could read the
  facilitator's task file, which names the controls on each route and every follow-up question.
  13 of 16 follow-up sessions answered the follow-up before it was asked, and r2-s05 read the
  avoided-word list. The bias runs one way: a problem found anyway is solid, but a route that
  worked proves little. So the three routes added for round 2 are not yet credited: setting what a
  weight means while opening the file, Replace in the source's "..." menu, and the find box's rule
  hint. Also: the preflight said bar 10's scripted counts existed, and they do not
  (`tool/bars.mjs` has no clipped-text or raw-string count).

## The rule for this round

The study is fixed first, and round 3 does not start until changes 1 to 3 are done and pass a
planted failure. After that comes one change per confirmed problem, each in its owning package:

- graph facts in graphty-element
- shared controls in compact-mantine
- words and arrangement in the graphty app

No feature moves, and no second door opens where one door is being measured. Words at rest go
down, never up (bar 9 (b) failed). The routes credited in round 2 are not reworded or moved until a
clean run re-measures them.

## Changes for round 3, most severe first

Severity uses Nielsen 0 to 4. A measurement fault that voids credit is rated 4.

| #   | Sev | Package                      | Change                                                                        | Tasks                   |
| --- | --- | ---------------------------- | ----------------------------------------------------------------------------- | ----------------------- |
| 1   | 4   | study tool                   | A participant cannot reach a facilitator file, and a session that did is void | all                     |
| 2   | 4   | study tool                   | The dry run starts from pilots' real routes; keyboard faults fixed before freeze | all                   |
| 3   | 4   | study tool                   | Every script a bar or the preflight names exists and fails on a planted fault | all (bars 8, 9, 10)     |
| 4   | 3   | graphty app                  | The find box gives a way on from a typed condition, and Enter runs it          | T22                     |
| 5   | 3   | graphty-element, graphty app | An Add that repeats existing ties says so and offers Replace beside Load       | T21                     |
| 6   | 3   | graphty app                  | Three keyboard focus faults on tier 2 controls                                 | T22, T23, T17           |
| 7   | 2   | graphty-element, graphty app | A Color or Width added to a selection's layer starts at the highlight look     | T22, T24 (detour)       |
| 8   | 2   | graphty app                  | A layer made from a rule is named by its rule, not its count                   | T22                     |
| 9   | 2   | graphty app                  | Words at rest back under round 1's counts on the four tier 2 screens           | all (bar 9 b)           |
| 10  | 2   | compact-mantine              | The extra-small checkbox gets a 24 px target; check the find list by keyboard  | T17, T22 (bar 8)        |
| 11  | 2   | graphty app                  | Readers' words find Shortest path in the Analyze list                          | T18 (bar 11)            |
| 12  | 2   | graphty app                  | A weighted path's run row shows its total, not its hop count                   | T18, T20                |
| 13  | 2   | graphty app                  | "Filter to neighbors" is a plain command; only the step's checkbox turns it off | T23                    |
| 14  | 2   | graphty app                  | A repeated status message is announced again                                   | T19, T17                |
| 15  | --  | tasks-or-answers             | T22 and T24 prompts without "stand out"; the re-run list                       | T22, T24, T17-T22       |

### 1. A participant cannot reach a facilitator file, and a session that did is void (study tool, severity 4)

- **What.** Participants found their task by reading `tier2/tasks.md`. Their session folders sit
  inside the studio tree (`tier2/rounds/round-2/sessions/r2-sNN`), and that file is three folders
  up. `real.mjs` already writes a clean `briefing.md` (`--brief`), and `--start` already refuses a
  folder that holds a facilitator file. Neither stops a participant from reading upward, so a
  refusal of a folder without `briefing.md` alone, as several roles proposed, would not have
  stopped r2-s05.
- **Fix.**
  - Participant session folders live outside the studio tree, under the scratch folder. The round
    copies each session's finished folder into `rounds/round-N/sessions/` after `--end`.
  - `--start` refuses a session folder that lies under the studio tree, or that holds no
    `briefing.md` written by `--brief`.
  - The participant's prompt names its own folder and briefing as the only files it may read.
  - After each session, a check reads the participant's tool calls from its transcript. The
    session is void if any call opened `tasks.md`, `answers.md`, `criteria.md`, `roster.md`, a
    persona file, or anything under the studio tree other than its own copied folder. Void
    sessions are re-run, not graded.
- **Acceptance.**
  - A planted-leak self-test passes: a session folder under the studio tree is refused, and a
    transcript that opens `tasks.md` is voided by name.
  - In round 3, the leak check runs on every session and lists 0 unvoided reads.
- **Files:** `design/ui/studio/tool/real.mjs` (`--start` and its self-test), the round runner's
  participant prompt and its post-session check, and `tool/README.md`.

### 2. The dry run starts from pilots' real routes; keyboard faults fixed before freeze (study tool, severity 4)

- **What.** Each dry run walked the previous round's list, so the newest detour was never walked.
  The keyboard walk found the find box's Escape fault and handed it to the expert pass instead of
  fixing it. The study tool's click by name landed on a same-named control in r2-s17, s18 and s30,
  and in r2-s17 and s18 that threw away a half-made filter step. Two behaviors are still disputed
  and unscripted: whether a half-made step is thrown away when another item is selected, and what
  a click on empty canvas does while a run is selected (it decides a note's subject).
- **Fix.**
  - Before the freeze, run two throwaway pilot sessions per task on the candidate build, with the
    leak closed (change 1). Script every route they took.
  - Walk those routes, plus round 2's detours:
    - style a selection: its width, its color and its name in the key
    - click away from, or Tab out of, an open step editor
    - run a path twice
    - reopen the Path form
    - open a newer copy of a loaded file
    - click empty canvas while a run is selected
  - Each keyboard walk presses every control on its screen once, not only the answer key's.
  - A fault a participant could hit on any walked route is fixed and re-walked before the build is
    frozen. It is not handed to a later pass.
  - A click by name that matches more than one control is refused, as an ambiguous name already
    is.
- **Acceptance.**
  - The round 3 preflight lists every pilot route and every detour with its walk result.
  - It lists 0 known faults a participant could hit, and a script result for each of the two
    disputed behaviors.
  - The tool's self-test refuses a planted two-match click.
- **Files:** `tier2/pilot/detours.sh`, `tier2/pilot/rewalk.sh`, `tool/real.mjs` (the matcher),
  and the round 3 `preflight.md`.

### 3. Every script a bar or the preflight names exists and fails on a planted fault (study tool, severity 4)

- **What.**
  - Preflight item 9 says `tool/bars.mjs` counts bar 10's clipped text and raw strings. It has no
    such count, so bar 10 rested on specialists alone.
  - `scores.md` (bar 8 and bar 10, line 191) still cites the unnamed-radio-group finding. The
    accessibility specialist withdrew it with evidence (`expert/a11y/group-name-check/`): both
    groups are named through compact-mantine's `SegmentedControl`.
- **Fix.**
  - Build the two bar 10 counts in `bars.mjs`, as `../../criteria.md` defines them:
    - text cut off with no way to read it whole
    - a visible string that is a code, a field path or a raw statement
  - The preflight runs every script it names against a planted failure, and prints the result
    beside its claim.
  - Correct `scores.md`: remove the withdrawn finding from bars 8 and 10. Neither bar's status
    changes: bar 8 still fails on two serious automated failures, and bar 10 on the two confirmed
    severity 3 findings.
- **Acceptance.**
  - `bars.mjs` reports a planted clipped name and a planted `E_BAD_SELECTOR` string by screen and
    element.
  - `scores.md` cites no withdrawn finding.
- **Files:** `tool/bars.mjs`, `rounds/round-2/scores.md`, and the round 3 `preflight.md`.

### 4. The find box gives a way on from a typed condition, and Enter runs it (graphty app, severity 3)

- **What.** 6 of 8 participants typed a condition in the data's words ("chapters 10", ">= 10",
  "minutes") and got only `No match for "chapters 10"` (`r2-s12/03.png`).
  - In `FindBox.tsx`, plain text that finds nothing shows the rule line only when the element
    accepts the text as a rule (`ruleFromText`). Otherwise the line is the bare `emptyLine`.
  - When the line does show a rule (`=<rule>`, or the element's bare-number `suggestion`), it is
    plain text. Neither Enter nor a click runs it.
  - `ruleRefusalWords` shows the element's `suggestion` without its leading "=". Typed as shown, it
    is a plain search, not a rule.
- **Fix.** All three are one path: a miss leads to a hint, and the hint can be run. So they ship
  together and round 3 credits them together.
  - (a) Plain text that finds nothing and reads as no rule shows the existing example line from
    `exampleRule(session)` after "No match", once, never at rest.
  - (b) The suggestion is shown with its "=".
  - (c) A rule shown under the box (the text as a rule, or the element's suggestion) becomes the
    option Enter picks, marked the way the box already marks Enter's option. A click runs it too.
  - The app parses nothing: every rule it shows came from the element.
- **Not this round.**
  - Column rows in plain search: a second door into the same rule, and clutter among node hits.
  - "Select where..." on a column: held as decided before round 2. It comes next only if 3 or more
    of 8 still stall after this change.
  - The element accepting bare numbers changes what an existing call accepts, so it stays on the
    owner's list (`owner-decisions.md`, "Why a selector was refused, as a code"). The engineer's
    opt-in `bareNumbers` flag is rejected: no reasonable consumer would want it off, so it is a
    capability, not a choice.
- **Acceptance.**
  - Browser tests in a `*.real-element.test.tsx`, driven by real typing:
    - "chapters 10" shows "No match" and the example line.
    - "=minutes >= 10" shows the suggestion with its "=", and Enter selects the 10-minute links.
    - "minutes >= `10`" typed without "=" shows the rule, and Enter selects them.
  - Words at rest unchanged.
- **Files:** `graphty/src/workspace/graph-place/FindBox.tsx` and its tests.

### 5. An Add that repeats existing ties says so and offers Replace beside Load (graphty-element and graphty app, severity 3)

- **What.** "Open project or file..." with a newer copy of the loaded file offers only "Add to
  friends". Load would make 82 edges from 41 (`r2-s33/05.png`). Both participants who met it caught
  the number; one who missed it would get doubled ties with no warning, which is severity 4.
  Replace exists only in the source's "..." menu.
- **Fix.**
  - graphty-element: the result of `session.data.prepare()` reports how many incoming edges repeat
    an edge already loaded (same ends, same direction). This is additive, so it is the team's call;
    it is recorded in `owner-decisions.md`.
  - graphty app: when that count is above 0, the Add page shows one line above the buttons in body
    text, with the count against the incoming edges, and a "Replace <source>" button beside Load.
    That button runs the same command as the source's "..." menu (`useSourceActions`).
  - Matching file names in the app is rejected: it guesses from a name when the element can report
    the fact.
- **Acceptance.**
  - An element unit test: preparing `friends-v2.csv` over `friends.csv` reports 41 repeats, and an
    unrelated file reports 0.
  - An app real-element test: the line and the Replace button appear for friends-v2, and are
    absent for a file with no repeats. Replace from there gives 41 edges.
  - Nothing is added at rest.
- **Files:** graphty-element's `data.prepare()` result type, its API report and tests;
  `graphty/src/workspace/data-page/DataPage.tsx`, `data-page/words.ts`, and
  `data-place/sourceActions.ts` (reused).

### 6. Three keyboard focus faults on tier 2 controls (graphty app, severity 3)

- **What.**
  - A second Escape in an empty find box drops focus to the page: `FindBox.tsx:415` calls `blur()`
    (`expert/a11y`, `path-sr/77.png`, `78.png`).
  - Changing Follow with the arrow keys moves focus into Hops, so the next arrow changes Hops. The
    effect at `inspector/NodeValues.tsx:266-275` re-runs on every render and focuses the first
    checked radio when focus is outside the region (`path-sr/86.png`, `90.png`, `91.png`).
  - Tab then Escape in the filter step editor throws the edit away silently (controls expert
    finding 4).
- **Fix.**
  - Delete the `blur()`, keeping `preventDefault` and `stopPropagation`.
  - Run the focus-on-open step only when the list opens for a new center node.
  - Tab out of, or a click away from, the step editor commits the edit as Save does. Escape still
    cancels, and says so in the status line.
- **Acceptance.** A real-input test for each fault, pressing the keys the walk pressed:
  - focus stays in the find box after two Escapes
  - focus stays on Follow and Hops is unchanged after arrows
  - Tab commits the step
- **Files:** `graph-place/FindBox.tsx`, `inspector/NodeValues.tsx`, `data-place/Filters.tsx`,
  and their tests.

### 7. A Color or Width added to a selection's layer starts at the highlight look (graphty-element and graphty app, severity 2)

- **What.** A line Color or Width added with "+" starts at `startingValue(descriptor)`, the
  element's default. That is exactly how every tie already draws (gray A9A9A9, width 8), so adding
  it changes nothing (r2-s11, s12, s13, s14, s16; `r2-s14/15.png`).
- **Width.** Whether width 8 "draws as a hairline" is an element defect was settled in source and
  by test before this decision. A width of W draws as 10 x W / d pixels at distance d, so 8 draws
  under 2 pixels on a framed graph (`graphty-element/test/browser/edge-width-units.test.ts`). The
  owner already has that question as a breaking change ("what an edge's line width measures").
  This change does not touch it, and the app must not double or scale widths to hide it. That
  answers the red team's objection to the visual and engineering proposals.
- **Fix.** graphty-element already has a neutral answer to "what does a chosen element look like":
  - `highlight()` with no `set` paints a node in the session's highlight color.
  - It paints an edge in that color at three times the default width (`DEFAULT_HIGHLIGHT`,
    `halfOfStyle` in `StylesApi.ts`).
  - The graphty app already chose black as its highlight color (`setHighlightColor`, decided by
    the owner on 2026-10-08).
  - But the element exposes that look to no reader.
  - **Element (additive, team's call):** `session.styles.highlightStyle(target: "node" | "edge")`
    returns the static style `highlight()` would paint for that half when it names no style.
  - **App:** `startingValue` takes its value from that call for a layer whose selector names ids
    (a selection's layer). Everything and run rows keep the descriptor default.
  - No app palette, no invented number. The comment "the app never invents a graph value" stays
    true.
  - The interaction designer's "+" opening the value picker is held. It is a second change on the
    same problem, and round 3 could not tell which one helped.
- **Acceptance.**
  - An element test: `highlightStyle("edge")` equals what `highlight()` paints with no `set`, and
    follows `setHighlightColor`.
  - An app real-element test: select two ties, add Color then Width; the layer holds the highlight
    color and width, and the drawn tie differs from an unstyled one after the selection is cleared
    (pixel check).
- **Files:** graphty-element `session/styles/StylesApi.ts`, its API report and tests;
  `graphty/src/workspace/style/row.ts` (`startingValue`), `style/SetLine.tsx`, and
  `style/StyleTab.tsx`.

### 8. A layer made from a rule is named by its rule, not its count (graphty app, severity 2)

- **What.** `selectionName` in `style/StyleTab.tsx` names a selection of more than one item by its
  count ("13 edges"), so the key says nothing about what the color means (seven sessions).
- **Fix.**
  - When `session.selection.origin` is a rule (it has `text`), the layer is named by that rule
    without its "=" (for example "minutes >= `10`").
  - Every other selection keeps today's name.
  - The key already cuts a long name with "...", and shows it whole on hover.
- **Acceptance.** A real-element test: a rule selection styled from the find box puts its rule in
  the layer list and the key. A hand-picked selection keeps "N edges".
- **Files:** `graphty/src/workspace/style/StyleTab.tsx` (`selectionName`).

### 9. Words at rest back under round 1's counts on the four tier 2 screens (graphty app, severity 2)

- **What.** Bar 9 (b) failed. Every screen's count rose, from round 2's own word fixes:
  - the returning rest screen, 53 to 55
  - a path run's inspector, 66 to 70
  - the neighbor list, 36 to 38
  - an edge's inspector, 30 to 34
- **Fix (content designer to word it).**
  - The key names a run's scope only when the drawing and the run differ. With no filter on, a run
    over the whole graph is just "PageRank". Under a filter it reads "PageRank, full graph", and a
    run on a narrower set keeps "on N nodes". This cuts the rest screen and the edge inspector, and
    answers the eight sessions that stopped on "on 20 nodes" while fewer were drawn.
  - The unweighted path note becomes `Each edge counts as 1; "weight" has no meaning set.`
  - Two words come out of the neighbor list's lines at rest.
  - No new word anywhere.
- **Acceptance.** `bars.mjs` bar 9 (b) reports each of the four screens at or under round 1's count,
  on the round 3 frozen build.
- **Files:** `graphty/src/workspace/canvas/legendWords.ts` (`rowName`), `analyze/words.ts`
  (`weightRead`), and the neighbor list's words in `inspector/words.ts`.

### 10. The extra-small checkbox gets a 24 px target; check the find list by keyboard (compact-mantine, severity 2)

- **What.** The automated accessibility check fails two things (bar 8):
  - The filter step's checkbox is 12 x 12 px, against 24 asked by WCAG 2.5.8. Four participants
    found it small.
  - The find list's scroll area is reported as not keyboard-reachable. Its rows are driven from the
    text box by arrows, which the check cannot see.
- **Fix.**
  - compact-mantine's extra-small Checkbox gets an invisible 24 x 24 hit area. The drawn box is
    unchanged, every caller gets it, and `Filters.tsx` does not change.
  - For the find list, script ArrowDown to the last row first:
    - If the row scrolls into view, record the exception, with that evidence, in the criteria
      change log.
    - If it does not, fix the scrolling in `FindBox.tsx`.
    - No second Tab stop.
- **Acceptance.**
  - The compact-mantine browser test clicks 6 px outside the drawn box and toggles it.
  - A pointer test on a 20 px filter row shows the hit area does not take the next row's click.
  - The axe target-size failure is gone.
  - The find list script result is in the preflight.
- **Files:** compact-mantine's Checkbox styles (`src/theme/components/controls.ts`) and their
  browser test; possibly
  `graph-place/FindBox.tsx`.

### 11. Readers' words find Shortest path in the Analyze list (graphty app, severity 2)

- **What.** Bar 11 failed on paths: 8.5 steps against 8. Nothing at the find box leads on to the
  path tool. The find box led 6 of 8 to the Analyze list, but "linked" found nothing there
  (r2-s26), and r2-s32 never learned the tool exists.
- **Fix.**
  - Add "linked", "between", "fewest", "chain" and "in between" to the `aliases` of
    `shortest-path` in `analyze/words.ts`. They are words for search, never shown.
  - No new door from the find box: that would be a second route while this one is measured.
- **Acceptance.** A unit test: each word filters the Analyze list to Shortest path. Round 3 paths
  cost is at or under 8.
- **Files:** `graphty/src/workspace/analyze/words.ts`.

### 12. A weighted path's run row shows its total, not its hop count (graphty app, severity 2)

- **What.** A weighted path's run row says "4 hops". r2-s03, s07 and s08 doubted the weight was
  used, and r2-s04 and s06 met the hop count beside minutes.
- **Fix.**
  - A weighted path's row reads "<column> <total>" (for example "minutes 14"), the round 1
    "Total <column>" form.
  - An unweighted path keeps "4 hops".
  - It replaces words and adds none.
- **Acceptance.** A unit test of `pathWords` for both cases, and the run row on a weighted bus-stops
  path in a real-element test.
- **Files:** `graphty/src/workspace/analyze/words.ts` (`pathWords`) and the run row that renders it.

### 13. "Filter to neighbors" is a plain command; only the step's checkbox turns it off (graphty app, severity 2)

- **What.** A second press of "Filter to neighbors" deletes its filter step with no notice
  (`expert/figma` finding 8, `path/24.png`). Readers could not tell whether it hides or deletes.
- **Fix.**
  - The command always adds or turns on the step for the current center and reach. It has no
    toggle state.
  - On and off live only on the step's own checkbox, as for every other step.
- **Acceptance.** A real-element test: pressing it twice leaves one step, on. Unchecking the step
  restores the drawing, and the step stays listed.
- **Files:** `graphty/src/workspace/inspector/NodeValues.tsx`, `toolbar/commands.ts`, and
  `inspector/words.ts`.

### 14. A repeated status message is announced again (graphty app, severity 2)

- **What.** The status line in `frame/Frame.tsx` is a polite live region. Writing the same text
  twice is not spoken, so a second "Note added about Shortest path" or "Filter off" is lost
  (`path-sr/28.png`, `58.png`). Repeat work is what tier 2 studies.
- **Fix.** Clear the region before each write, or key each message so a repeat is a new node.
- **Acceptance.** A test sends the same message twice and sees two announcements in the region.
- **Files:** `graphty/src/workspace/frame/Frame.tsx`.

### 15. T22 and T24 prompts without "stand out"; the re-run list (tasks-or-answers)

- **What.**
  - "Stand out" invited a lasting style in T22 and T24. That produced the styling detour, and the
    "a selection does not last" finding the skeptics weakened.
  - T22 measures whether a returning user reaches "select where", and T24 measures finding one
    tie. Neither measures styling.
  - The other prompts the skeptics named stay as written, because they are each task's own
    question: "who was first before" (T21), "make sure both will still be there" (T19), and
    "every calculation treats more minutes as longer" (T20). Graders discount behavior those words
    ask for, as round 2 did.
- **Fix.**
  - The researcher rewords the second sentence of both halves of T22 and T24 to ask the reader to
    show which ones on the drawing, without "stand out" and without any avoided word.
  - The answer key accepts a selection or a style, as now. No bar changes.
  - The change goes in `../../criteria.md`'s change log with this reason. T22 and T24 are compared
    with round 2 on the outcome only, not on steps.
  - **Re-run list for round 3:**
    - r2-s05 (void)
    - the three new routes: T20's weight meaning at load, T21's Replace, T22's rule hint
    - the T17 and T18 follow-ups for the second-time measure, with the leak closed
  - Change 7 is still measured: the dry run walks the styling detour.
- **Acceptance.** The reworded prompts are piloted twice each on the round 3 candidate build. The
  briefing check finds no avoided word.
- **Files:** `tier2/tasks.md` (T22, T24), `tier2/answers.md` (unchanged rules, re-read), and
  `tier2/criteria.md` (change log).

## Not changed, and why

- **Drawn names covering each other and the ties (bar 10, severity 3).** This is graphty-element's
  label placement on an unseeded layout. It is reported as a class to the owner, with
  `r2-s52/02.png`. No smaller font, seed or offset in the app.
- **Bare numbers in rules, and what an edge's width measures.** Both change what an existing
  element API does, and both are already on the owner's list.
- **"Higher means" at load, Filters under Data, Replace's place in the "..." menu, the out-of-date
  mark, and the find box's hint once it shows.** They held, but on weak evidence. They are
  re-measured clean before anyone touches them.
- **The neighbor list grouped by "1 step" and "2 steps".** Waits for graphty-element to report each
  neighbor's distance.
- **"Edit source..." opening a page titled "Replace: team.csv".** A real mismatch, but severity 1
  in no session. Next round, if the limit allows.
- **"Components 1" under a filter (severity 2, three sessions).** The Overview names whole-graph
  counts by an earlier decision; held so change 9 can be measured alone.
- **No tour, hint panel or "a selection is temporary" banner.** Change 7 is the fix.
