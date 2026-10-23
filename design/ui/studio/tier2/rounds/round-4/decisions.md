# Tier 2 round 4 decisions: what changes before round 5

Decided 2026-10-11 by the Design Director from `insights.md`, `scores.md`, the design roles'
proposals and the red team's challenge. Every code claim below was checked against the studio
worktree's source (branch design/studio-tier1), which holds the round 4 build 5277e2cbe plus notes.

## What round 4 showed, in one paragraph

53 of 53 valid sessions succeeded, and 3 sessions lost to the study runner are still owed. Last
round's Shift-click fix carried T24 from 2 of 4 to 7 of 7, and the toolbar Filters button was the
first and only door in 7 of 7 T17 sessions. Two bars still fail. Bar 10 fails on two confirmed
severity 3 findings: drawn names and dots covering the ties a task asks about (graphty-element,
already on the owner's list), and the find box offering a rule for a bare number that it then
refuses. Bar 9 (b) fails by two words on an edge's inspector. The study itself failed in two ways
that limit every count: the gate did not run for the second round running, and every briefing
carried a file table that stated answers ("two new people (Mo, Nia)", "each weight is now 6 - w",
the unmatched row `s11`).

## The rule for this round

- **The study is fixed first.** Round 5 does not start until changes 1 and 2 are done and each
  refusal is shown on a planted fault. Writing the rule down did not work in rounds 3 and 4; a
  refusal in the command every session runs does.
- **One change per problem.** Every role found the same three product problems and proposed up to
  four variants each. Each problem gets one path; the others are held below, once, with the reason.
- **Every fix in its owning package.** A wrong suggestion from graphty-element is fixed in
  graphty-element, never guarded in the app.
- **Words at rest do not rise.** No change below adds a word to a screen bar 9 measures.
- **A claim one source made is scripted before it is fixed**, unless the source code alone shows
  the mechanism (change 5).

## Changes for round 5, most severe first

Severity uses Nielsen 0 to 4. A measurement fault that decides a grade is rated 4.

| #   | Sev | Package                      | Change                                                                            | Tasks                    |
| --- | --- | ---------------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| 1   | 4   | study tool                   | A session cannot start without the round's gate; a participant starts on a slot  | all                      |
| 2   | 4   | study tool                   | Briefings name each data file and its kind only; the leak check reads briefings   | all (T4, T21 decided)    |
| 3   | 3   | graphty-element              | The bare-number refusal suggests only a rule the selector accepts                 | T22                      |
| 4   | 3   | graphty-element, graphty app | A typed number inside a number column's range offers "is N or more"               | T22                      |
| 5   | 3   | graphty app                  | Leaving an off filter step's editor without an edit leaves it off                 | T17                      |
| 6   | 3   | graphty app                  | New project, then Discard, no longer shows the error page                         | T21 (any New project)    |
| 7   | 3?  | study tool                   | Three single-source claims scripted on 5277e2cbe before anyone fixes them         | T22, T24                 |
| 8   | 2   | graphty app                  | With a filter step on, the data table lists what the step keeps                   | T17                      |
| 9   | 2   | graphty-element, graphty app | The "or more" rule names its column the way a typed rule does                     | T22                      |
| 10  | 2   | graphty app                  | Cancel in the note editor puts focus on "+"                                       | T19                      |
| 11  | 2   | tasks-or-answers             | T17 histories stop naming "the analysis button in the toolbar"                    | T17                      |
| 12  | 2   | study tool                   | Bar 9 (b): name the added words by diff before any word is cut                    | bar 9 (edge inspector)   |

### 1. A session cannot start without the round's gate; a participant starts on a slot (study tool, severity 4)

- **What.** `real.mjs --gate` exists and works on a planted fault, and `workflow-tier2.js` calls it
  (line 104) and stops on failure. Round 4 still ran with no "Gate evidence" section in `plan.md`:
  the check lives only in the runner, so any other way of starting sessions (a continuation script
  after a usage limit, a hand start) skips it. Separately, three sessions (r4-s05, r4-s20, r4-s28)
  were lost: the runner's own slot count (4) does not see the machine-wide browser cap, so
  `real.mjs --start` waited for a browser past the shell call's limit, the participant ended its
  turn "waiting for the browser slot", and an ended turn is a workflow agent's return.
- **Fix.**
  - The gate refusal moves into the command every session runs first: `real.mjs --start` for a
    session of a round refuses (exit 1, one `FAIL:` line) unless that round's `plan.md` holds the
    "Gate evidence" section that `--gate` writes after an exit 0 on the frozen build. No runner,
    continuation script or hand start can then skip it.
  - The runner takes the machine-wide browser slot before it starts a participant, so a
    participant never waits for one inside its turn.
  - A participant whose session never started (no screenshot in its folder) is not a session: the
    runner re-runs it from a new folder before scoring, and the scores name it.
- **Acceptance.** The tool's self-test shows `--start` refusing a round folder with no gate
  evidence, and a planted full-slots case where the participant still starts once a slot frees.
  Round 5's `plan.md` holds "Gate evidence" before the first session. The owed r4-s05b, r4-s20b
  and r4-s28b run from new folders before round 5's sessions, on 5277e2cbe, and are scored into
  round 4.
- **Files:** `design/ui/studio/tool/real.mjs`, `tool/README.md`, `tier2/rounds/workflow-tier2.js`.

### 2. Briefings name each data file and its kind only; the leak check reads briefings (study tool, severity 4)

- **What.** Every briefing carries `tool/README.md`'s data-file table (lines 100 to 115), which
  states contents the tasks ask participants to find: `team-v2.csv` has "two new people (Mo,
  Nia)", each weight in `friends-v2.csv` "is now 6 - w", one row of `passes.csv` "names `s11`, who
  is not in `players.csv`". r4-s38 named Mo and Nia on the Replace page before anything on screen
  did (`sessions/r4-s38/05.png`). The leak check reads only participant logs, so it never saw this.
- **Fix.**
  - The table names each file and its kind ("people", "ties between them", "the same ties, a later
    version") and nothing about its contents.
  - The leak check also reads each session's briefing and fails on any answer-key fact in it (the
    names, numbers and ids `answers.md` grades on).
- **Not changed: `--shift-click`, `--ctrl-click` and `--alt-click` stay in the briefing.** Three
  roles proposed removing `--shift-click`. That would make a Shift-click impossible in the tool for
  a reason no real mouse user has, so T24 would measure the tool, not the app. The three are
  listed together and neutrally ("the same, with that key held"), as a keyboard shows them; T24's
  pass stays discounted for priming, as the insights say.
- **Acceptance.** The self-test plants "Mo, Nia" in a briefing and the leak check fails naming the
  session; the real briefings pass. Round 5's leak check reports every briefing and every log read.
- **Files:** `design/ui/studio/tool/README.md` (data-file table), `tool/real.mjs` (`--leaks`).

### 3. The bare-number refusal suggests only a rule the selector accepts (graphty-element, severity 3)

- **What.** On bus stops, typing "10" offers "=\`10\`" with "Select its matches"; Enter answers
  "Not a rule Find can read (at character 2)" (`expert/figma/find/04.png`, `08.png`).
  `suggestBackticks` in `graphty-element/src/session/styles/predicate.ts` (line 555) accepts its
  rewrite once `parseExpression` succeeds. A lone literal parses, but `compileExpressionPredicate`
  then refuses it as `reads-no-attribute`. The two checks disagree; the function's own comment
  says "a suggestion the selector would refuse in turn ... is no help".
- **Fix.** `suggestBackticks` applies the selector's own acceptance test, parse and at least one
  attribute read (the check `compileExpressionPredicate` makes), and returns no suggestion
  otherwise. The app changes nothing: `ruleFromText` already falls through to "No match" and the
  example rule when no suggestion comes.
- **Not this round.**
  - A `session.selection.count` guard around the suggestion in the app (three roles): it hides an
    element defect from every other consumer.
  - Suggesting only a rewrite with at least one match: it would also hide a valid rule that
    matches nothing, a separate policy.
  - "Attach a suggestion only when it parses": that is today's code.
- **Why the team decides it.** `suggestBackticks` is in no released graphty-element tag (checked
  with `git tag --contains`), and the documented `details.suggestion` is "present only when that
  rewrite is itself a selector". Recorded in `owner-decisions.md` under "decided by the team".
- **Acceptance.** Element unit tests: "10" refused with no `suggestion`; "weight > 3" still gets
  "weight > \`3\`". The round 5 build typed "10" on bus stops shows no "=\`10\`" row.
- **Files:** `graphty-element/src/session/styles/predicate.ts` and its test.

### 4. A typed number inside a number column's range offers "is N or more" (graphty-element and graphty app, severity 3)

- **What.** T22 A asks for bus stops "10 minutes or more", and `bus-stops.csv` has no 10 in its
  minutes column (2 to 15). The "or more" answer is built only from a value row (`valueRowOf` to
  `atLeastOf`, `graphty-element/src/session/query.ts` lines 696 to 745), so a threshold that is not
  a stored value gets nothing. In round 3, 4 of 4 on that half typed the bare number first. Change
  3 alone leaves "No match" and the example line: honest, but a detour.
- **Fix.**
  - graphty-element: `FindResult` gains an optional `atLeast: readonly FindAtLeastRow[]`, where
    `FindAtLeastRow` is `{ kind, path, value, count, target }` built by the existing `atLeastOf`.
    One row per number column whose min <= N <= max while N is not a value in it (a value already
    carries `FindValueRow.atLeast`). Only when the whole typed text is a finite number; at most
    `VALUE_ROWS` rows, in column order. Additive; recorded under "decided by the team". The red
    team's single name is taken over `ranges`.
  - graphty app: `FindBox.tsx` shows each one with the row it already draws, "minutes is 10 or
    more (N)". It parses no number and counts nothing.
- **Not this round.** Putting the Values section above the record sections for a number (the
  Design Engineer): a second change on the same problem, and no task met the row below the fold.
- **Round 5 reads it carefully.** T22 A's prompt says "or more" and so does the row, so a pick of
  it is weak evidence. Credit the change by whether "10" now reaches a selection of the right
  stops without a refusal, not by the word match.
- **Acceptance.** An element unit test: find "10" on bus stops returns one `atLeast` row for
  minutes whose `count` equals `selection.count` of its target; "4" (a value) returns none there
  and keeps `FindValueRow.atLeast`; "99" (out of range) returns none. A `*.real-element.test.tsx`
  types "10", picks the row, and the selection holds every stop with 10 or more minutes.
- **Files:** `graphty-element/src/session/query.ts`, `session/types.ts`, `api/session.api.md`,
  `graphty/src/workspace/graph-place/FindBox.tsx`.

### 5. Leaving an off filter step's editor without an edit leaves it off (graphty app, severity 3)

- **What.** In `Filters.tsx`, `unchanged` is true only when `step?.on === true` (line 444), and the
  leave handler (line 501) saves unless `unchanged`, writing `on: true`. So opening an off step's
  editor and clicking anywhere else turns the step on: the drawing filters again, PageRank goes out
  of date, and a pointer user gets no notice (`expert/a11y/stepon-pointer/08.png` to `10.png`,
  reproduced by keys twice and by pointer). The code shows the mechanism, so no further script is
  needed before the fix.
- **Fix.** The leave handler returns early when `step !== undefined && rule !== null &&
  sameRule(rule, step.rule)`. Nothing else changes: "Save and turn on" and Enter still turn a step
  on, and an edited step still saves on leave as today.
- **Not this round.** Writing `on: s.on` for an edited step plus a spoken "Saved. The step is
  off." (accessibility): it changes what happens to an edited step and adds a spoken line in the
  same round.
- **Acceptance.** A new `bars.mjs` focus action (open an off step's editor, click Graph, expect the
  step still off and no "19 of 20") fails on 5277e2cbe and passes on the round 5 build; a
  real-element test does the same with real clicks.
- **Files:** `graphty/src/workspace/data-place/Filters.tsx`, its real-element test,
  `design/ui/studio/tool/bars.mjs`.

### 6. New project, then Discard, no longer shows the error page (graphty app, severity 3)

- **What.** With unsaved work, Main menu > New project > Discard shows "Something went wrong";
  the console has `GraphtyError: the session has been disposed, so data.snapshot() cannot answer`
  from a component still reading the old session's `attributes()` (`expert/figma.md` finding 1,
  `expert/figma/long/08.png`). A plain load has no unsaved work and does not crash
  (`expert/figma/repro-new/`). The element is right to refuse.
- **Fix, script first.** Run the walkthrough's script once on 5277e2cbe. If it reproduces, find
  the component from the stack and make it read the current session (or nothing while there is
  none). If it does not reproduce, close the finding as not shown.
- **Acceptance.** The same script on the round 5 build lands on the start screen with no error
  page and an empty console; a real-element test drives the same clicks.
- **Files:** found by the trace.

### 7. Three single-source claims scripted before anyone fixes them (study tool, severity 3 if shown)

Each runs once with `real.mjs` on 5277e2cbe; the result goes in round 5's `plan.md`. A claim that
reproduces is fixed in its owning package in the round after; one that does not is closed.

- **A rule on a column that does not exist answers only "Nothing matches this rule"** (r4-s12).
  If it reproduces, graphty-element already has `E_UNKNOWN_ATTRIBUTE` (`session/columns.ts`); the
  fix is the selector refusing with that code, and the app writing "No column named <name>".
- **Escape on a selection layer's Color swatch clears the selection** and drops focus
  (`expert/a11y/path-sr/53.png`, `54.png`). Trace which handler takes the Escape before editing;
  the rule is "innermost first".
- **Whether a drawn label takes a click aimed at a tie under it** (`sessions/r4-s08/02.png`):
  `--hover` then `--click` at the Station-Stadium tie's midpoint. If the label or the dot takes it,
  graphty-element is told which (label placement stays on the owner's list; label hit-testing is
  a separate element question).
- **Files:** none until a script reproduces; results in `tier2/rounds/round-5/plan.md`.

### 8. With a filter step on, the data table lists what the step keeps (graphty app, severity 2)

- **What.** `TableDock.tsx` line 349 asks for scope `"graph"`. With "weight is at least 4" on, the
  top bar, the step row and the Overview read "12 of 41 edges" while the Edges tab reads "41 edges"
  and lists ties the step hides (`sessions/r4-s27/09.png`; r4-s21 the same). graphty-element
  already supports `scope: "visible"` on `nodePage` and `edgePage`.
- **Fix.**
  - The table's scope is `"visible"` when no group is shown (a group keeps its member scope).
  - The tab count reads "12 of 41 edges" while the two differ, in the top bar's words, and "41
    edges" when they agree. "Every count names its unit and its whole."
  - `TableDock` re-renders on a visibility change through the existing `useVisibilityVersion`;
    without it the table goes stale when a step is turned on or off.
- **Not this round.** A line above the table saying it lists everything (accessibility): a notice
  where a fix exists.
- **Known gap, not changed here.** Export from the table still writes every record: the element's
  export cannot be limited to what is showing (the comment at `TableDock.tsx` lines 242 to 244,
  #875 and #820). Check that the export dialog's words say it writes every record; the real fix is
  a visible scope on the element's export, not app code.
- **Acceptance.** A real-element test: turn the step on, the Edges tab reads "12 of 41 edges" and
  lists 12 rows; turn it off, "41 edges". The bar 9 screens' word counts are unchanged (the table
  is not on them).
- **Files:** `graphty/src/workspace/table/TableDock.tsx`, its real-element test and story.

### 9. The "or more" rule names its column the way a typed rule does (graphty-element and graphty app, severity 2)

- **What.** `atLeastOf` writes `quotePath(path)`, so styling "minutes is 5 or more" makes a layer
  named "data.minutes >= \`5\`", read aloud as "data dot minutes ... grave accent", while a typed
  rule on the same screen is named "minutes >= \`10\`" (`expert/visual/find/07.png`, `08.png`).
  The short spelling is decided today by the app's `columnText` in `FindBox.tsx` (line 155), which
  copies the element's knowledge of how a bare name resolves: an app copy of element logic.
- **Fix.** graphty-element exports `rulePath(path)` from `./session` beside `quotePath`: the
  shortest text a rule reads as that column (the bare name for a plain data column, else the
  quoted path). `atLeastOf` and change 4's rows use it; the app's `columnText` becomes a call to it
  and its own logic is deleted. The red team asked for no new export, but without one the app copy
  cannot be deleted, and deleting it is the point.
- **Why the team decides it.** `atLeast` (9b69ca650) is in no released tag, so its text changing is
  not breaking; `rulePath` is a new export. Recorded under "decided by the team".
- **Acceptance.** An element unit test: `rulePath("data.minutes")` is "minutes", a dotted or
  clashing name stays quoted, and each result parses back to the same column. The layer made from
  the row is named "minutes >= \`5\`".
- **Files:** `graphty-element/src/session/styles/predicate.ts`, `session/query.ts`, the session
  entry and `api/session.api.md`, `graphty/src/workspace/graph-place/FindBox.tsx`.

### 10. Cancel in the note editor puts focus on "+" (graphty app, severity 2)

- **What.** `close()` in `NotesPlace.tsx` (line 152) clears the draft and moves no focus, so focus
  falls to the page (WCAG 2.4.3; `expert/a11y/path-sr/30.png`, `31.png`). Delete already moves it
  to "+".
- **Fix.** Cancel focuses "+" the way Delete does. No words change.
- **Acceptance.** A `bars.mjs` focus action (open a note, Cancel, focus on "+") fails on 5277e2cbe
  and passes on the round 5 build.
- **Files:** `graphty/src/workspace/notes/NotesPlace.tsx`, `design/ui/studio/tool/bars.mjs`.

### 11. T17 histories stop naming "the analysis button in the toolbar" (tasks-or-answers, severity 2)

- **What.** Six of seven T17 histories in `roster.md` say earlier rankings ran "from the analysis
  button in the toolbar", which points participants at the toolbar where the Filters button sits.
- **Fix.** The histories say what was done ("you ranked the people by PageRank"), not where it was
  done. The personas' own habits ("checks counts before and after", "will count the rows") stay:
  real analysts have them. Scoring does not count a check those personas make as unprompted.
- **Constraint.** No bar and no answer-key route changes. Logged in the task file's words-changed
  log.
- **Files:** `design/ui/studio/tier2/roster.md`, the words-changed log in `tier2/tasks.md`.

### 12. Bar 9 (b): name the added words by diff before any word is cut (study tool, severity 2)

- **What.** An edge's inspector counts 29 words against round 1's 27. The roles give three
  diagnoses: the rail's new "Settings" label, ", full graph" on the key, "of nodes" in the header.
  The word lists they cite are not on disk.
- **Fix.** Run `bars.mjs` on the round 1 build and on 5277e2cbe in the same state and write both
  word lists for that screen to `round-4/bars/`.
  - If round 1 measured the screen in a different state (no filter step on), that is a
    measurement fault: re-measure round 1 in the same state and record it in the criteria's change
    log. The limit is never re-set from round 4's data.
  - If the added words are scope words (", full graph", "of nodes"), they stay. Under a filter a
    path or a ranking can run through hidden nodes; the words prevent a wrong reading, and a true
    fact is not cut to pass a count. Bar 9 (b) then fails honestly in round 5.
  - If a word repeats something already on that screen, remove it, and nothing else.
- **Not this round.** Dropping ", full graph" from path rows (Researcher, Figma), or a "Ran on 20
  nodes" line under the key's title (Content): both choose words before the diff names them.
- **Acceptance.** The two word lists and the decision they lead to are in `round-4/bars/` before
  the round 5 freeze.
- **Files:** `design/ui/studio/tool/bars.mjs` (if it cannot target a build), `round-4/bars/`.

## Held, with the reason

- **One warning look for every load problem, removed once the reader chooses** (Visual Designer).
  Severity 2, one session (r4-s50). First in line if a second session meets it.
- **The run row's accessible name "out of date" for a filter change** (Content). Severity 2; it
  belongs with one announcer design, not a patch.
- **A notice when a second path replaces the first.** 0 of 7 needed the first chain afterwards.
- **The Degree arrow selecting the node and its neighbors**, **"As the file says"**, **the
  "Attribute" role and "Weight: none" at load**, **no lasting saved state**, **a path tie drawn
  through a node**, **a note's subject**, **T23's "..." menu**. Each waits for a second round's
  evidence or a script showing it costs a wrong answer.
- **compact-mantine Toast `role="alert"`, the heading focus mark, menu shortcut names.** Severity 1.

## Not changed

- **Drawn names and dots covering each other and the ties** (severity 3, bar 10). graphty-element's
  label placement and layout spacing, on the owner's list. No app font, offset, seed or setup that
  turns names off. Bar 10 keeps failing on it honestly.
- **Shift-click adding to a selection, the toolbar Filters button, the Analyze ranking, "Select
  endpoints", Replace in the source's "..." menu, "4 hops", the Les Miserables "or more" row.**
  Each held or improved this round.
- **Ctrl and Meta adding to a selection.** Nobody tried them first.
- **The "Settings" rail label.** A visible label for an icon-only button.

## What round 5 re-runs

- First the owed r4-s05b, r4-s20b and r4-s28b, from new folders, scored into round 4.
- T22 on both halves (changes 3, 4, 9), with "10" on bus stops the watched move.
- T17 on both halves (changes 5, 8, 11), with the table open under a filter step watched.
- T19 for change 10 by script; no session re-runs T19 for it.
- Every other task carries its round 4 result forward unless a change above touches its route.
