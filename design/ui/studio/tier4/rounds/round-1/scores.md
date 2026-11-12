# Tier 4 round 1 scores: returning users managing their data

Scored against `../../criteria.md` on the frozen build 79ed770292 (graphty@0.8.92). Every one of the
28 sessions' `session.json` and `route.jsonl` names that build. Sources: the graders' `grade.md`
files in `sessions/`, the end-state check (`tool/endstate.mjs`, written to each session's
`endstate.json`), the step count (`tool/steps.mjs`, written to `steps.json`), the scripted axe and
wording walks (`bars/bars.json` dark, `bars-light/bars.json` light), the scripted repros in
`repro/`, and the four expert reports in `expert/` (accessibility, the screenshot audit, the Figma
product designer, visual design). The hand tallies are scripts in the studio worktree's
`tmp/researcher/score-t4r1/` (`doors.py`, `kinds.py`).

All participants are simulated: one model playing returning-user personas. A failure is strong
evidence; a pass is weak until real people confirm it. This file proposes which problems are
confirmed and at what severity; the two skeptics decide what counts against bar 4 and bar 6.

## Headline

**Bar 1 holds; bars 2, 3, 4, 5, 6 and 7 fail** (4 and 6 pending the skeptics).

| Bar                    | Result                       | In one line                                                                                                                                                         |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Task success         | Holds                        | 25 of 26 pointer sessions S or SD; every task at or above 75%, no half at 0. The one miss is T62 B (r1-s08, P)                                                       |
| 2 False "done"         | **Fails**                    | 1 of 28: r1-s08 set the column as the time from the inspector and stopped while the column was still text                                                          |
| 3 Wrong turns          | **Fails**                    | T64's median is 3 (4 and 2 on its two sessions); every other task is at 2 or less                                                                                   |
| 4 Severity 3 and 4     | **Fails** (pending skeptics) | 0 severity 4: the end-state check found no mismatch in 60 items over 28 sessions. Four severity 3 candidates are confirmed defects (below)                          |
| 5 Keyboard             | **Fails**                    | Sam 2 of 2 S with no keyboard block; axe reports one critical rule on 14 of 16 tier 4 screens in each theme                                                        |
| 6 Owner's data rules   | **Fails** (pending skeptics) | The approved "17/19" ratio on a joined source row is gone. Two rules are not judged this round (see bar 6)                                                          |
| 7 Cost on core tasks   | **Fails**                    | T62 holds (0 over its path); T61 is 9 over, T65 4.5, T67 3.5 (limit 3). Counted as frozen, every input including checks after the task was done                    |

## What ran

- **28 planned rows, 28 graded sessions, 0 VOID, 0 re-runs.** Every session started from the
  plan's start (`empty`, a `setup:` file, or `--keys` for Sam) on the frozen build; no setup failed.
- **Models: 28 of 28 on Opus (claude-opus-5-5). 0 sessions ran on Sonnet**; no session ended on a
  model API error, so the Sonnet retry was never used. Nothing is counted apart for it.
- **Leaks: none.** Every grade records `leaks.json` with no file opened outside the session's folder.
- **Grade forms:** r1-s08's grade.md says P. The form the grades were collected in has no P and
  wrote F; this file scores it as P, the criteria's grade. Either way it is not a success.

## Bar 1, per task (pointer sessions; Sam apart)

| Task                    | All    | A      | B      | S / SD / P | Wrong turns (median) | Steps: median (path) | First door                                               |
| ----------------------- | ------ | ------ | ------ | ---------- | -------------------- | -------------------- | -------------------------------------------------------- |
| T60 web address         | 2 of 2 | 1 of 1 | 1 of 1 | 2 / 0 / 0  | 0, 0 (0)             | -- (not core)        | Start screen, Open network data (2)                      |
| T61 join two tables     | 4 of 4 | 2 of 2 | 2 of 2 | 2 / 2 / 0  | 2, 2, 2, 1 (2)       | 16 (7)               | Start screen, Open a file (4)                            |
| T62 column kind         | 3 of 4 | 2 of 2 | 1 of 2 | 3 / 0 / 1  | 0, 0, 0, 1 (0)       | 5 (5)                | Table header (3); inspector "Set in Data" (1, the P)     |
| T63 time and place      | 2 of 2 | 1 of 1 | 1 of 1 | 2 / 0 / 0  | 2, 2 (2)             | -- (not core)        | Table header (1); inspector "Set in Data" (1)            |
| T64 weight and name     | 2 of 2 | 1 of 1 | 1 of 1 | 0 / 2 / 0  | 4, 2 (**3**)         | -- (not core)        | Data > Fields (2)                                        |
| T65 filter cards        | 4 of 4 | 2 of 2 | 2 of 2 | 4 / 0 / 0  | 0, 0, 0, 0 (0)       | 17.5 (A 14, B 13)    | Toolbar Filters (2); Filters "+" (1); table header (1)   |
| T66 take one node out   | 2 of 2 | 1 of 1 | 1 of 1 | 1 / 1 / 0  | 2, 1 (1.5)           | -- (not core)        | Filters "+" (1); source row issue chip (1)               |
| T67 file problems       | 4 of 4 | 2 of 2 | 2 of 2 | 3 / 1 / 0  | 1, 0, 2, 0 (0.5)     | 7 (A 3, B 4)         | Table "With issues" (A 2); source row issue chip (B 2)   |
| T68 send the data out   | 2 of 2 | 1 of 1 | 1 of 1 | 2 / 0 / 0  | 0, 0 (0)             | -- (not core)        | Table options "..." (1); main menu (1)                   |
| **All pointer**         | **25 of 26** |  |        | 19 / 6 / 1 |                      |                      |                                                          |
| Sam, keyboard (bar 5)   | 2 of 2 | T61 A, T65 A | -- | 2 / 0 / 0 | 1, 2             | 47 and 35 keys       | Tab (T61), F6 (T65)                                      |

Steps are `tool/steps.mjs`'s count of inputs in `route.jsonl` (clicks, keys, typed text, files
chosen); see bar 7. T63: both participants named the place columns in their reports (graded) and
neither opened Data > Fields to check them; both checked the place in the table header's Role menu.

## Bar 2, false "done"

One: **r1-s08** (T62 B, Tom). The inspector's Overview row "Time: installed" with its "Set in Data"
button was the only control he saw that named the column. Pressing it designated the time; the
"Time" chip on the header, the Timeline button and the timeline's dates ("Jun 30, 1995 - Jun 27,
2018") all read as success, while the header kept the text glyph and `data.json` holds `installed`
as type string, role time. Truth was on screen (the glyph) but only there. This is problem 2 below.

## Bar 3, wrong turns

T64 fails at a median of 3, on two sessions: r1-s21 (A, Alex) 4 and r1-s22 (B, Maren) 2. The
wrong turns the two share are the weight's "Higher means" words, which look like the box's
label but open nothing when clicked (problem 9), and the table's column issue marks, opened looking
for what the weight reads (problem 11). With two sessions per task the median is their mean, so
one session with 4 decides the bar.

## Bar 4, severity 3 and 4

**Severity 4: none.** `tool/endstate.mjs` read 60 items over the 28 sessions (filter card chips
against the element's counts and what is drawn and selected, source row counts against a recount,
exported files against the network) and found no mismatch. No filter hid more than it said and no
export dropped a row.

**Severity 3: four confirmed defects carry a 3 from a grader or an expert.** Each is proposed here;
the skeptics decide whether its 3 stands (a severity 3 counts only with a reader who paid for it).

| #   | Problem                                                                                                                                                                                                                                                                                                                                      | Ratings                                       | How confirmed                                                                                                                     | Reader cost seen                                                                                                     | Proposed |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **The join screen previews the wrong rows.** The row with the unknown end (P05 to P13, G09 to G12) is drawn without the edge tag and labeled "not in graph", which reads as "left out"; Join adds it and creates an empty node. "1 new node" looks like a chip but does nothing and never names the node. The repeat is tagged as added. | r1-s03 3; r1-s01, s02, s04 2                  | 4 sessions on both halves (A: s01, s03; B: s02, s04), Sam (s27), repros `repro/r1-s01` to `r1-s04`                                | 3 of 4 read the preview as "the row will be left out"; every one learned what Join did only from the tables after it | 3        |
| 2   | **Designating the time leaves the column text, and the screen says both.** The inspector's "Time: <column> / Set in Data" sets the role only; the Time chip, the timeline's dates and the Filters picker's calendar glyph read as a date column, while the header keeps the text glyph and the Role menu can tick None.                    | r1-s08 3; s05, s06, s07, s19 2                | 5 sessions on both halves (A: s05, s07, s19; B: s06, s08), repro `repro/r1-s19.sh`; Figma finding 8                               | One false done (r1-s08, P); three others named the contradiction and could not explain it                            | 3        |
| 3   | **"With issues 11" counts suggestions and hides the row with a real problem.** On the gauges file the table chip counts the 11 "could be yes/no" rows as issues; turned on, it narrows the table to G01-G11, drops G12 (the unknown end), and the bar still reads "12 nodes" with no sign the table is narrowed.                         | r1-s20 3; r1-s04 1; visual finding 20 2       | r1-s20 plus repro `repro/r1-s20.sh` (02.png chip off ends at G12, 04.png chip on ends at G11); r1-s04 could not explain the count | r1-s20 counted the narrowed table and concluded "12 nodes but my list has 11 rows"                                   | 3        |
| 4   | **Export's format warning drops focus and says nothing.** With CSV and style layers, Export opens "Styles lost in CSV" inside the dialog without saving; focus falls to the page, nothing is announced, and about 48 Tabs pass before focus re-enters the dialog.                                                                         | Accessibility finding 1: 3; s25, s26 (pointer) 2 | Accessibility walk `expert/a11y/k5` (route.jsonl steps 23-74); the box itself in r1-s25 and r1-s26 (A and B)                    | No screen-reader participant reached Export; both pointer participants had to stop and press Save anyway             | 3 for a screen-reader user, held as candidate until `k5` is replayed as its own repro |

Expert severity 3s that are not confirmed at 3:

- **Filter card's "Hide" keeps what matches** (Figma finding 1): the defect is confirmed by r1-s23
  (A) and its repro `repro/r1-s23.sh` ("Is exactly P13" with Hide leaves only P13), but the session
  recovered (SD) and no other participant misread it. Proposed 2; listed as problem 14.
- **A date condition rests as a raw millisecond number** ("opened is at most 1546300799999", Figma
  finding 2): no session collapsed a date card (r1-s10 and r1-s12 left theirs open, r1-s12/17.png),
  and the screenshot audit did not record it. Unconfirmed; it needs a scripted repro of a collapsed
  date card. The end state shows the stored value (r1-s12 `data.json`: max 1104537599999).

## Bar 5, keyboard

- **Sam: 2 of 2 S** (r1-s27 T61 A, r1-s28 T65 A), 47 and 35 keys. No keyboard block: the
  accessibility walk found every screen operable, every dialog closed with Escape, every focus loss
  recoverable. Keyboard costs that are confirmed are problem 18 (F6) and 19 (Tab order).
- **axe: fails.** One rule, `aria-valid-attr-value` (critical), on 14 of 16 walked screens in each
  theme, at 1440 x 900 and 900 x 700: every screen with the table open (Sources "+", both web
  address routes from Sources "+", the join screen, the issue list, Fields "+", the Filters picker,
  Export on Data). The table's Nodes tab names a tab panel that is never rendered
  (`graphty/src/workspace/table/TableDock.tsx`, Tabs with no Tabs.Panel). The start screen and the
  web address box from it are clean. The walk's planted cases were all caught. Owner: graphty app.
  No color-contrast finding in either theme.

## Bar 6, the owner's data rules

| Rule                                             | Result                       | Evidence                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An owner-approved surface removed or restyled    | **Violation** (pending skeptics) | The joined source row's ratio ("deliveries.csv 17/19", reference `source-row-join-ratio.png` in the main checkout's `tmp/design-studio/tier4/reference/`) is not drawn on this build: the row reads "d.." with node, edge and issue chips (r1-s01/14.png, r1-s12/17.png, the audit's `bars-1200x900/.../08.png`). The ratio is only in the row's accessible name ("13 of 15 rows joined", r1-s02). Figma finding 3 names it; the audit's screenshot shows it, though the audit's text judged only the cut name. Decided fix R11 said the ratio stays. |
| "Links" or "ties" for edges                      | Holds                        | Neither word in the walk's vocabulary (`bars/vocabulary.json`) or on any audited screen                                                                                                                                                                                                                                                                             |
| Configuration reachable only from the table      | Holds, by the owner's reading | A column's Type is set only from the table header menu, which the owner chose to keep there (`owner-decisions.md`, "Where a column's kind is set"). r1-s06 looked for it in Data first (opinion, 1)                                                                                                                                                              |
| A hotkey with no visible button showing its key  | Candidate, not confirmed     | The column menu opens by Shift+F10, ContextMenu or Alt+ArrowDown; its "..." button shows no key and is hidden at rest (accessibility finding 9, `a11y/k3/20.png`, `39.png`). Needs its own scripted repro. Related: the source row menu's "Export... Ctrl+E" shows a key that opens Export on the whole graph, not on that file (Figma finding 9)               |
| A sentence on screen where a control would do    | **Not judged**               | The Data place at rest measures 52 words against a budget of 50 (`../../words-at-rest.md`); the content designer's hand count, which decides, was not made this round                                                                                                                                                                                             |
| The interaction designer's walkthrough           | **Not run**                  | No interaction designer report in `expert/`. The Figma designer's walk covered consistency with the Style panel                                                                                                                                                                                                                                                    |

## Bar 7, cost on core tasks

`tool/steps.mjs` (exit 1), against the answer key's path counts:

| Task | Path (A / B) | Sessions (inputs)                      | Median over the path | Limit | Result    |
| ---- | ------------ | -------------------------------------- | -------------------- | ----- | --------- |
| T61  | 7 / 7        | s01 16, s02 16, s03 22, s04 12         | 9                    | 3     | **Fails** |
| T62  | 5 / 5        | s05 5, s06 6, s07 5, s08 4             | 0                    | 3     | Holds     |
| T65  | 14 / 13      | s09 20, s10 16, s11 14, s12 19         | 4.5                  | 3     | **Fails** |
| T67  | 3 / 4        | s13 7, s14 7, s15 7, s16 6             | 3.5                  | 3     | **Fails** |

The frozen rule counts every input, including checks made after the task was done. By the
graders' own counts of steps to the success state (their units are close to but not exactly the
tool's): T61 needed 9 to 14 to reach the joined network (median about 12, still about 5 over);
T65 and T67 would come within the limit (T67 about 2 over, T65 about 1.5). So T61's cost is in
getting the join done; T65's and T67's is mostly participants checking a result the screen did not
confirm (problems 1, 5, 13 and 16). The limit is not re-set from this round.

## Confirmed problems (severity 2 and below), for the fix list

Confirmed = two sessions on different halves, one session plus a scripted repro, or an expert
finding the audit or a session also shows. Severity is the proposal; the graders' ratings are
given where they differ. Each is counted once, at its highest list. Problems 1-4 are above.

| #   | Problem                                                                                                                                                                       | Sev | Confirmed by                                                                                       | Package                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 5   | The repeated key's menu (Keep first / Keep both / Ignore) marks no current choice and no row; "Keep first" changes nothing on screen; after Join nothing records the fold     | 2   | s01, s03 (A), s04 (B), s27; repro `r1-s03` (02.png and 03.png identical); Figma 6                  | graphty app (join screen)                 |
| 6   | The unknown end is decided only after Join, in the issue list, with "Add nodes" already applied; the issue never names the end or its edge; "Leave out" does not say it deletes | 2   | s02, s20, s24 (B), s03, s27 (A)                                                                    | graphty app (issue list)                  |
| 7   | "Join" picked from the Join choices menu only closes the menu                                                                                                                 | 2   | s02 plus repro `r1-s02` (04.png, 05.png)                                                           | graphty app (join screen)                 |
| 8   | The second source's name is cut to one letter ("d..", "f...") while its chips keep their room                                                                                  | 2   | s01, s03, s19, s27 (A), s04 (B); screenshot audit 2; visual 8                                      | graphty app (source row)                  |
| 9   | The weight's "Higher means" words are plain text, not the box's label: clicking them opens nothing, and the box's name ("Higher weight means") does not contain them          | 2   | s21 (A), s22 (B), repros `r1-s21`, `r1-s22.sh`; visual 3 (an empty select looks finished)          | graphty app (Fields)                      |
| 10  | A header click on an ISO-day text column sorts A to Z, which already looks like date order; only the small text glyph shows the column is still text                       | 2   | s05, s07 (A), s06 (B)                                                                              | graphty app (table)                       |
| 11  | The column header's issue mark is the only door to a column's fixes but has no tooltip, a default cursor, and is exposed as an image; its issue is not spoken on focus      | 2   | s13, s21 (A), s22 (B), repro `r1-s13.sh`; accessibility 8, 15                                      | compact-mantine (DataTable header mark)   |
| 12  | A cell drawn orange as an issue only selects its node when clicked; nothing names the issue, and the row reads the same as an unflagged one to a screen reader              | 2   | s13, s15 (A), repros `r1-s13`, `r1-s15`                                                            | graphty app (table)                       |
| 13  | A source row's issue list names no row, shows no sample value and has no Show rows (the header's list does)                                                                  | 2   | s14, s16, s20 (B), s27 (A)                                                                         | graphty app (issue list)                  |
| 14  | A filter card's effect reads "Hide" and keeps what matches; the tooltip says "Hide nodes that do not match" and the top bar says "Showing only"                               | 2   | s23 (A) plus repro `r1-s23.sh`; Figma 1 (rated 3)                                                  | graphty app (filter cards)                |
| 15  | A new filter card starts on Hide, so a card meant to mark first takes everything else out of the picture                                                                      | 2   | s09, s11, s28 (A), s10, s12 (B): 5 of 5 sessions that made a marking card                          | graphty app (filter cards)                |
| 16  | A card's count chip changes basis: whole graph on Hide, within the picture on Select, while its value counts are whole graph; nothing shows that card order does not matter | 2   | s09, s11, s28 (A), s10, s12 (B); visual 18. s09 concluded order could change the count (wrong)    | graphty app (filter cards)                |
| 17  | The "Data source" condition sits below the visible part of the Filters picker                                                                                                 | 2   | s23 (A), s24 (B)                                                                                   | graphty app (Filters picker)              |
| 18  | F6 skips the top bar and the table's first control, enters on a resize handle, and leaves no visible focus ring on the inspector                                            | 2   | s27, s28, repro `r1-s28.sh`; accessibility 4                                                       | graphty app                               |
| 19  | The start screen puts 13 Tabs before "Open a file"                                                                                                                            | 2   | s27; accessibility 26 (measured by its scripted walk)                                              | graphty app (start screen)                |
| 20  | A text card's chip previews its count while the box has focus, but the picture changes only on leaving the box; nothing says the card is live                              | 2   | s23 (A) plus repro `r1-s23.sh` (04.png vs 05.png); s24 (B)                                         | graphty app (filter cards)                |
| 21  | The place roles are not marked on the headers (Latitude and Longitude ticked in the Role menus, no chip), and the Role submenu opens highlighted on None                     | 2   | s19 (A), s20 (B), repros `r1-s19.sh`, `r1-s20.sh`                                                  | graphty app (table)                       |
| 22  | The column "..." (Options) button is not drawn at rest                                                                                                                       | 2   | s05, s07, s19 (A), s06, s08 (B); accessibility 9                                                   | compact-mantine (DataTable)               |
| 23  | Every CSV export stops on "Styles lost"; GraphML names a loss that did not happen ("node visible not written" while the file writes `graphty.style.node.hidden`)             | 2   | s25 (A), s26 (B), repro `r1-s26`                                                                   | graphty app (export); graphty-element if the loss list is its fact |
| 24  | The issue chip reads "0 issues" with a warning glyph after every issue is fixed                                                                                              | 2   | s16 plus repro `r1-s16-script`; visual 22                                                          | graphty app (source row)                  |
| 25  | Dragging the table's scrollbar closes the open issue list                                                                                                                    | 2   | s16 plus repro `r1-s16-script` (03.png)                                                            | graphty app                               |
| 26  | volunteers.graphml loads with "Coordinates: phone"                                                                                                                           | 2   | s11 plus repro `r1-s11-script`; Figma 11; audit 6                                                  | graphty-element (location detection)      |
| 27  | The start screen never names a web address; "Open network data" reads as databases                                                                                            | 1   | s17 (A), s18 (B), both rated 2 as opinion (held one lower); visual 6, Figma 4 (no Open button)     | graphty app                               |
| 28  | Nothing after a load says whether anything was skipped                                                                                                                        | 1   | s17 (A), s18 (B)                                                                                   | graphty app                               |
| 29  | Nothing says whether a fix or a join changes the file or only the project                                                                                                    | 1   | s13, s15 (A), s04, s16 (B)                                                                         | graphty app                               |
| 30  | The save notice gives only the file name, not where it went                                                                                                                   | 1   | s25 (A), s26 (B)                                                                                   | graphty app                               |
| 31  | Export's "Advanced" is an unlabeled gear alone on its own row                                                                                                                | 1   | s25, s26; audit 9; visual 23; Figma 16                                                             | graphty app                               |
| 32  | Type submenu says "N will not convert" for number and yes/no but nothing for date, and choosing a kind gives no confirmation                                                 | 1   | s05, s07 (A), s06 (B)                                                                              | graphty app (table)                       |
| 33  | The Select / Hide switch is small and its unchosen half is pale with no border                                                                                               | 1   | s09, s11, s23 (A), s10 (B); visual 16                                                              | graphty app (filter cards)                |
| 34  | With no edges the Degree histogram is a solid gray block over 0 to 0                                                                                                         | 1   | s14; audit 14; visual 27                                                                           | graphty app (inspector)                   |
| 35  | The table strip collapses at 900 x 700 (Edges tab, Columns and counts cut)                                                                                                   | 2   | audit 1 with `bars.mjs`'s cut-text check; visual 28; accessibility 16                              | graphty app (table dock)                  |
| 36  | A column's kind is drawn with different glyphs in the table, Fields and the Filters picker                                                                                    | 2   | audit 3; visual 2; Figma 8 (the same screens)                                                      | graphty app                               |

Candidates, not confirmed (one session or one expert, no repro): the web address load drops focus to
the page (accessibility 3); Escape on the join screen cancels the join and focus goes to the
inspector (accessibility 5); the issues panel opens with no focus ring (s27); Export's Columns chip
reads "1 of 1" for a three-column Edges table (audit 4); a typed "at least 10" is stored as
"between 10 and 52" with today's highest value as the top (s09, s11, s28, all on half A; the end
state shows max 52); the link glyph marks both a web address and a joined local file (visual 1); a
date-only value is exported as a timestamp (Figma 10); the first file's issue chip disappears after
a join (Figma 5, visual 9: both experts, no session named it). Severity 1 expert findings by screen
are in the four expert reports and go to the fix list unchanged.

**By kind and severity (graders' 158 problems over 28 sessions, before merging):** severity 3: 3;
2: 78; 1: 72; 0: 5. Behavior 69, wording 35, build defect 21, opinion 19, accessibility 14. By
package, of the 36 confirmed above: graphty app 32, compact-mantine 2, graphty-element 1 (phone
read as a place), and one shared between the app and the element (the export loss list).

## Fix coverage (decided fixes R1 to R15 in `../../decided.md`)

| Fix                                                         | Reached by                                     | Result on this build                                                                                                                                              |
| ----------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 a study build serves `site.json`                          | All 21 setup starts                            | Holds: no SETUP FAILED                                                                                                                                            |
| R2 Filters "+" opens the Style attribute picker             | T65 (s09-s12, s28), T66 (s23, s24)             | Holds as built; "Data source" sits below the fold (problem 17)                                                                                                     |
| R3 a text card previews its count, writes on commit         | s23, s24 (pointer)                             | Works as decided; both read the preview as "not applied" (problem 20). Its keyboard re-test was not run                                                            |
| R4 a card's header is one row; a written card rests as a summary | T65 (5 sessions)                          | Built; its re-test question ("which rule marks some while leaving everyone in?") was not asked. Select and Hide cards look alike at rest (problems 16, 33)         |
| R5 choosing the time sets only the time                     | s08, s19, s20                                  | Holds where seen: in s08 and s20 no dock opened unasked                                                                                                           |
| R6 turning a card on or off keeps the camera                | T65, T66 sessions                              | Not measured: no participant reported movement and no script compared node positions. Not re-tested                                                                |
| R7 every Data menu uses the "+" grammar                     | T61 (Sources "+"), T68 (row menu)              | Built; the row's "Ctrl+E" does something else (Figma 9). The rename re-test was not run                                                                            |
| R8 one door to network data, with an Open button            | T60 (start screen only)                        | The Open button is not built (Figma 4, visual 6). The in-project door was not re-tested: T60 starts on the empty screen                                           |
| R9 a source row shows its issues                            | T67 B (s14, s16), T63 B, T66 B                 | Built; its list names no row (problem 13) and keeps a "0" chip (problem 24). T67 A went to the table instead (s13, s15)                                            |
| R10 one role list; "Set in Data" opens Fields               | T62 (4), T63 (2)                               | Not built as decided: "Set in Data" sets the time in place and leads to a false done (problem 2); current role not highlighted (problem 21)                        |
| R11 a source row's name gets the room; the ratio stays      | T61 follow-up (s01-s04, s27), every joined start | Not built: the name is cut to one letter (problem 8) and the ratio is gone (bar 6)                                                                              |
| R12 Fields shows every source, one group each               | T63, T64 (s19-s22)                             | Built; its re-test question was not asked                                                                                                                         |
| R13 every join count is a chip that narrows the table       | T61 (5)                                        | Not built for "1 new node" (does nothing) or "1 repeated key" (not a chip): problems 1 and 5                                                                       |
| R14 Export opens on Data and says its loss in one line      | T68 (s25, s26)                                 | Opens on Data from the table; the loss line is jargon and every CSV stops on a warning (problem 23)                                                                |
| R15 a date column reads as a date                           | T62 (s05-s07), T63 A                           | Holds after Type > date; but the first header click on a text column already looks date-sorted (problem 10)                                                        |

## Candidate insights (each with its evidence; for the skeptics)

1. **One fact drawn two ways is the round's main failure.** The time role against the column's kind
   (problem 2: one false done, three participants puzzled), the place roles set but unmarked
   (problem 21), "Hide" against the tooltip and the top bar (problem 14), a card's chip on two bases
   (problem 16), "With issues" counting suggestions as faults (problem 3), and a kind glyph that
   differs between table, Fields and picker (problem 36). Participants resolved each by opening a
   second menu or checking the table. Evidence: 13 sessions across T62, T63, T65, T66, T67.
2. **A count without its rows sends people to the tables.** The join's chips (problem 1), the
   repeat's menu (5), the unknown-end issue (6), the source row's issue list (13) and "N have no
   value" (r1-s10) all give a number and name nothing. Every T61 participant learned what Join did
   only from the tables after Join, and T61's cost (median 16 inputs against a path of 7) is mostly
   that checking.
3. **Choices come after the act, with a default already applied.** The unknown end is decided after
   Join with "Add nodes" in effect (problem 6); a filter card starts on Hide (problem 15: 5 of 5
   participants who made a marking card lost part of the picture first). Both were recovered every
   time, so they cost steps, not success. Note for the fix: `owner-decisions.md` item 1 builds
   "Select | Filter to | Filter out" with a new card starting on Filter out, which renames the
   effect but keeps the default that caused problem 15.
4. **The table header is the first door for column work, and the inspector shortcut is the trap.**
   T62: 3 of 4 went to the header and succeeded; the 1 who used the inspector's "Set in Data"
   ended P with a false done. T63: both checked the place in the header's Role menu and neither
   opened Fields. This matches the owner's keeping Type and Role in the header.
5. **A fix created a trap.** R15 made date columns read as dates and the first header click sort A
   to Z; on a text column of ISO days that sort already looks like a date column (problem 10, 3 of
   4 T62 sessions sorted first).
6. **The issue home depends on where people already are.** On T67, both A sessions went to the table
   ("With issues"), both B sessions to the source row's issue chip. The source row list is the
   decided home (R9) but lacks what the table's list has (Show rows, a sample value).

## Scoring notes

- Bar 1 counts pointer sessions only; Sam's two are in bar 5. With Sam the totals are 27 of 28.
- Bar 3 with Sam included is unchanged (T61 median 2, T65 median 0).
- `endstate.mjs` exited 0 with 60 items; `steps.mjs` exited 1 on T61, T65 and T67.
- Every grade's `Wrong turns:` and `False done:` line was read from `grade.md` (`doors.py` asserts
  each session's build).
