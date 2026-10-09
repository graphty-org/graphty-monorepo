# Tier 2 preflight: what the served build does, decision by decision

Checked on 2026-10-07 on the build served at https://dev.ato.ms:9366/?next: `ca8b3b916c22
graphty@0.8.55`, built from the studio worktree at commit ca8b3b916 ("Replace with file... and
out-of-date runs"), the last app change before this check. The worktree also held another
session's uncommitted graphty-element edits at build time: repairs in five session and catalog
files (a misplaced comment, missing closing lines) that let the committed source build. The build
includes them; the session files record the commit as "with uncommitted changes". The study tool
served a copy of that same build (`REAL_DIST`), so every screenshot below is of these bytes. The tier 2 design is
`next-steps/tier2-design.md`; the tasks, answers, criteria and roster are in `../../tier2/`.

Every path below is under `rounds/tier-2/preflight/` unless it says otherwise. Each check is a
`tool/real.mjs` session: a task pilot (`T4A` ... `T21B`) or a check of one decision
(`check-...`). Numbers are screenshot numbers in that folder.

## Verdict

**Every tier 2 task can be done on this build, and every pilot reached its answer** (12 of 12, two
datasets for each of six tasks). Most decisions of the design are built. What is not built, or is
built differently, is listed with each section and gathered at the end; none of it stops a task,
but several are traps the answer key now grades (a stale ranking after a file is replaced, an
"Edit source..." that adds a second copy, a route row whose number is not the route).

The study has not started: the owner starts it.

## The pilots

| Task                  | Dataset                                    | Reached | Answer on screen                                                                    | Evidence                                                  |
| --------------------- | ------------------------------------------ | ------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| T4 two spreadsheets   | people.csv + messages.csv                  | yes     | 12 nodes, 22 edges; "1 edge row names 1 node no node row holds" (p13)               | `T4A/05.png`, `06.png`, `07.png`                          |
| T4                    | players.csv + passes.csv                   | yes     | 10 nodes, 17 edges; one unmatched row (s11)                                         | `T4B/03.png`, `04.png`                                    |
| T17 strong ties       | friends.csv, weight at least 4             | yes     | "19 of 20 nodes"; unticked: "off", chip gone                                        | `T17A/09.png`, `12.png`                                   |
| T17                   | Les Miserables, shared_chapters at least 5 | yes     | "26 of 77 nodes"                                                                    | `T17B/03.png`                                             |
| T18 fewest in between | friends.csv, Chloe to Milo                 | yes     | Chloe, Ava, Ivan, Kofi, Milo; 5 nodes, 4 edges                                      | `T18A/04.png`                                             |
| T18                   | Florentine, Strozzi to Pazzi               | yes     | Strozzi, Ridolfi, Medici, Salviati, Pazzi                                           | `T18B/04.png`                                             |
| T19 reminders         | friends.csv, Farah + graph                 | yes     | two notes, kept after save and reopen                                               | `T19A/06.png`, `11.png`                                   |
| T19                   | Florentine, Medici + graph                 | yes     | two notes, kept after save and reopen                                               | `T19B/07.png`, `10.png`                                   |
| T20 farther           | bus-stops.csv, Depot to Harbor             | yes     | Depot, Market, Park, Clinic, Harbor; Total distance 14; "Weight: minutes (farther)" | `T20A/08.png`, `16.png`; per-run route `T20A-open/05.png` |
| T20                   | trails.csv, Trailhead to Summit            | yes     | Trailhead, Creek, Meadow, Ridge, Summit; 7.5                                        | `T20B/08.png`                                             |
| T21 updated list      | friends.csv to friends-v2.csv              | yes     | Farah before; after Rerun, Ava 0.08012                                              | `T21A/04.png`, `07.png`, `09.png`                         |
| T21                   | team.csv to team-v2.csv                    | yes     | "now 14, 21"; after Rerun, Di 0.1339                                                | `T21B/03.png`, `06.png`                                   |

The same values come from graphty-element directly: `reference/probe.mjs` loads every file through
the element's import on the served build and reads the filter counts (19 and 12 edges; 26 and 51),
the routes and the rankings (`reference/reference.json`, `reference/reference-open.json`).

## Decision by decision

"Built" means seen working in the check named. "Not checked" means no session reached it; it may
work. "Not built" and "differs" are what the build does instead.

### 1. Filters

| Decision                                                            | State            | Evidence                                                                                                                                           |
| ------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Filters section in the Data place, between Sources and Attributes | Built            | `T17A/09.png`                                                                                                                                      |
| Header chip only while a step is on; it opens the section           | Built            | chip "19 of 20 nodes" `T17A/09.png`, gone when off `T17A/12.png`; clicking it opens the Data place `check-chip-analyze/03.png`                     |
| "+" opens the step editor in the inspector; Keep first              | Built            | `T17A/04.png` ("Keep: an attribute's value")                                                                                                       |
| A step row reads as a sentence with its outcome                     | Built            | "weight is at least 4 20 to 19 nodes" `T17A/09.png`                                                                                                |
| "Apply step" checkbox; an unticked step says "off"                  | Built            | `T17A/12.png`; the tool clicked "Apply step: weight is at least 4" by name                                                                         |
| A row opens in the editor                                           | Built (by click) | `T17A/11.png`; Enter and the row menu's Delete not checked                                                                                         |
| No reordering                                                       | Built            | no reorder control on any screen                                                                                                                   |
| "Filter to..." on an attribute's menu                               | Built            | `T17A/07.png`, `08.png`                                                                                                                            |
| An edge-attribute step keeps passing edges and their ends           | Built            | 19 nodes, 12 edges (`reference/reference.json`, `friends.filter4`); editor line "Keeps edges that pass and the nodes at their ends." `T17A/08.png` |
| Each change one undoable step; the undo notice names the step       | Not checked      |                                                                                                                                                    |
| Empty section "No filters."                                         | **Not built**    | the empty section shows only "Filters" and "+" (`T17A/03.png`)                                                                                     |
| Chip accessible name "Filter: 9 of 22 nodes"                        | Built            | the tool found "Filter: 19 of 20 nodes" by name (`T17A/10.png`)                                                                                    |
| Status line "Filter on: ..."                                        | Not checked      |                                                                                                                                                    |
| Element: steps as state, per-step counts in `plan`                  | Built            | `reference/reference.json` (`plan.effect.steps`)                                                                                                   |

### 2. Shortest path

| Decision                                                              | State         | Evidence                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P opens one Path popover                                              | Built         | `T20A/09.png`, `T18A`, `T18B`                                                                                                                                                              |
| "Path between..." on a node's canvas menu                             | Built         | `check-edge-find/08.png`                                                                                                                                                                   |
| The Analyze entry opens the same popover                              | Not checked   | the check's Analyze search kept earlier text (`check-chip-analyze/05.png`)                                                                                                                 |
| From and To are name comboboxes with a pick button                    | Built         | `T20A/12.png`; "Pick From on the canvas" says "Click a node on the canvas" (`check-status-sr/live.txt`)                                                                                    |
| One node selected fills From and focuses To; two fill both            | Not checked   |                                                                                                                                                                                            |
| Choosing a typed name moves on to To                                  | **Differs**   | focus stays in From, so the next name is appended there ("No node named DepotHarbor", `T20A/10.png`; `check-status-sr/live.txt`)                                                           |
| Follow (Out, All) only on a directed graph                            | **Not built** | bus-stops.csv loads directed and the popover has no Follow (`T20A/09.png`)                                                                                                                 |
| The shared Weight line                                                | Built         | "minutes (farther, loaded)" `T20A/09.png`; per-run "None, minutes (farther)" `T20A-open/03.png`                                                                                            |
| Committing adds a run row and selects it                              | Built         | `T18A/04.png`                                                                                                                                                                              |
| The inspector shows the route, and a total only for a distance weight | Built         | `T20A/16.png` (Total distance 14) and `T18A/04.png` (no total)                                                                                                                             |
| Row summary "3 nodes, 2 edges"                                        | **Differs**   | the Graph tree row shows a count that is not the route: 61 on friends.csv, 35 Florentine, 27 bus stops (`T18A/04.png`, `T18B/04.png`, `T20A/15.png`); the header calls the run a "Measure" |
| Inspector words "Ava, Kofi, Lee", "2 hops"                            | **Differs**   | "Route 5 nodes, 4 edges" and a numbered "Nodes in order" list (`T18A/04.png`)                                                                                                              |
| No path: "No path from Ava to Lee."                                   | Not checked   | no study dataset has an unreachable pair                                                                                                                                                   |
| Status line "Shortest path added: ..."                                | Not checked   |                                                                                                                                                                                            |
| Never "route"                                                         | **Not met**   | "Route" in Values; the key reads "Shortest route (edges) 24" and "Shortest route (nodes)" (`T18A/04.png`)                                                                                  |

### 3. Notes

| Decision                                                            | State                    | Evidence                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| A Notes place on the rail, below Data                               | Built                    | `T19A/04.png`                                                                                                                   |
| N, "+" and "Add note" on menus write about what the inspector shows | Built (N, node menu)     | `T19A/04.png` (Farah), `06.png` (Graph); node menu `check-edge-find/08.png`; edge, several-elements and graph menus not checked |
| Editor opens in place, focus in the text; Mod+Enter saves           | Built                    | typing right after N, Control+Enter saved (`T19A/04.png`)                                                                       |
| Esc discards an empty editor                                        | Not checked              |                                                                                                                                 |
| Text, target chips, time; ", edited"                                | Built, except ", edited" | `T19A/06.png`; notes cannot be edited on this build                                                                             |
| A chip opens its target                                             | Not checked              |                                                                                                                                 |
| A filtered-out target reads "Not in the current graph"              | Built                    | `check-notes-sources/04.png`                                                                                                    |
| One Tab stop; Up and Down move                                      | Not checked              | (no keyboard study in tier 2)                                                                                                   |
| Saved in the project file, back on reopen                           | Built                    | `T19A/11.png`, `T19B/10.png`                                                                                                    |
| Empty: "No notes." with "+"                                         | Built                    | `check-notes-sources/02.png`                                                                                                    |
| Inspector "1 note" link                                             | Built                    | `T19A/04.png`, `06.png`                                                                                                         |
| Status line "Note added about Ava"                                  | Built                    | `check-status-sr/live.txt`                                                                                                      |

### 4. Two tables as one network, and Sources

| Decision                                                       | State       | Evidence                                                                                                                                               |
| -------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One Sources row per load, its tables as children               | Built       | `T4A/07.png`, `T4B/04.png`; the two-file row's name is cut to "people.cs..."                                                                           |
| A source row's menu: Edit source... and Replace with file...   | Built       | `T21A/03.png`                                                                                                                                          |
| Edit source... opens that source's own tables with their roles | **Differs** | it opens "Add to friends" with the tables, and its Load would add a second copy: "the load makes 20 nodes and 82 edges" (`check-notes-sources/05.png`) |
| Header line "From friends.csv" / "From 2 files"                | Built       | `T4A/06.png`, `T20A/08.png`                                                                                                                            |
| Element: `data.sources()` keeps every load                     | Built       | `reference/reference.json` (`office.sources`)                                                                                                          |

### 5. The weight chosen at load, used by every run

| Decision                                                                                         | State       | Evidence                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data page "Higher means: Closer, Farther, Capacity", unset at first, "auto" for a guessed weight | Built       | `T20A/06.png`; "Weight: weight auto" `T21A/04.png`                                                                                                        |
| No weight: "Weight: none (each edge counts 1)"                                                   | Built       | `T20A/04.png`                                                                                                                                             |
| The gloss under the choice                                                                       | Built       | "smaller = closer" under Farther (`T20A/07.png`)                                                                                                          |
| Analyze entries that read a weight show one Weight line                                          | Built       | PageRank "weight (loaded)" `check-chip-analyze/04.png`; Path popover `T20A/09.png`                                                                        |
| An entry that reads no weight shows nothing about weight                                         | Not checked |                                                                                                                                                           |
| Made with says what the run read                                                                 | Built       | "minutes (farther)" `T20A/16.png`; "not read -- weight has no meaning chosen, and a path needs a distance" `T18A/04.png`; "weight (closer)" `T21A/09.png` |
| Graph inspector "Loaded weight"                                                                  | Built       | "minutes (farther)" `T20A/08.png`                                                                                                                         |
| A CSV opened into an open project goes through the Data page                                     | Built       | Control+O with team.csv opens "Add to friends" (`check-chip-analyze/06.png`)                                                                              |
| Distance readers read only a farther weight, else count links and say so                         | Built       | `T18A/04.png` (not read), `T20A/16.png` (read)                                                                                                            |
| Similarity readers read a closer or unset weight; PageRank reads the loaded weight               | Built       | `T21A/09.png` ("weight (closer)", meaning never chosen)                                                                                                   |
| Capacity readers                                                                                 | Not checked | no tier 2 task                                                                                                                                            |

### 6. Neighborhood distance

| Decision                                              | State       | Evidence                                                                                       |
| ----------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| G selects one hop and opens the named list            | Built       | "Ava's 6 connections" `check-neighborhood/02.png`                                              |
| Hops 1, 2, 3; Follow Out, In, All on a directed graph | Built       | `check-neighborhood/02.png` (friends.csv loads directed)                                       |
| A change reselects and relists                        | Built       | "14 nodes within 2 hops of Ava", Selection 15 (`03.png`)                                       |
| Filter to neighbors adds one step                     | Built       | chip "15 of 20 nodes" (`04.png`)                                                               |
| "Grow by one hop" gone from the canvas menu           | Built       | node menu: Neighborhood, Path between..., Frame selection, Add note (`check-edge-find/08.png`) |
| Status line once per change                           | Not checked |                                                                                                |

### 7. Replace a file and see what went out of date

| Decision                                                                                     | State       | Evidence                                                                                  |
| -------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| Replace with file... then the Data page titled "Replace: friends-v2.csv", roles carried over | Built       | `T21A/04.png`, `T21B/03.png`                                                              |
| "Was 20 nodes, 41 edges; now 20, 41"                                                         | Built       | `T21A/04.png`; "Was 12 nodes, 16 edges; now 14, 21" `T21B/03.png`                         |
| Focus on Load when every column matches                                                      | Not checked |                                                                                           |
| Runs and styles kept; nothing reruns by itself                                               | Built       | the PageRank row and its colors stay, with the old key range, until Rerun (`T21A/05.png`) |
| Notes kept across a replace                                                                  | Not checked |                                                                                           |
| The out-of-date mark; "out of date" in the row's name                                        | Built       | `T21A/06.png`; the tool read the row as "PageRank, out of date" (T21B)                    |
| State bar "Data changed since this run" with Rerun                                           | Built       | `T21A/07.png`                                                                             |
| Status line "friends.csv replaced: ..."                                                      | Not checked |                                                                                           |
| Element: staleness by content, not counts                                                    | Built       | friends-v2.csv has the same counts and new weights, and the run is marked (`T21A/06.png`) |

### 8. Edge selection

| Decision                                                   | State       | Evidence                                                                   |
| ---------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| A click on an edge selects it                              | Built       | "edge with id 25" selected (`check-edge-find/02.png`)                      |
| Shift-click adds                                           | Not checked |                                                                            |
| Selected edges are marked                                  | Built       | the dark line between Milo and Omar (`02.png`); Find's 12 edges (`06.png`) |
| Edge inspector: ends, weight, values; title "Milo -> Omar" | Built       | `02.png`                                                                   |
| Select endpoints                                           | Built       | 2 nodes selected (`03.png`)                                                |
| Status line "1 edge selected"                              | Not checked | ("1 node selected" for a node, `check-status-sr/live.txt`)                 |

### 9. Rules in Find

| Decision                                                       | State       | Evidence                                                         |
| -------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| A gray hint while the text starts with "="                     | Built       | "Rule: press Enter to select matches" (`check-edge-find/04.png`) |
| Enter selects the matches                                      | Built       | "0 nodes, 12 edges" (`06.png`)                                   |
| A refused rule gets one line under the box                     | Built       | "Put numbers in backticks: weight > `3`" (`09.png`)              |
| Nothing escapes as a script error                              | Built       | the tool reported no script error in any session                 |
| "Not a rule Find can read (at character N)" for other refusals | Not checked |                                                                  |

### What the design keeps for later

Not built, as decided: several node types joined on a key column; a node weight; the Select where
dialog; several path queries under one run row; "Add as steps" and "Select edges between"; the
selection bar; OR and NOT between filter steps.

## Found while checking

None of these stops a task; each is in the answer key where it can decide a grade.

1. **A path run's tree row shows a number that is not the route** (61, 35, 27), and the key's
   "Shortest route (edges) 24" is not one either. A participant may give it as the answer.
2. **Picking a name in From by keys does not move on to To.** The next name typed is appended in
   From and refused.
3. **Edit source... adds a second copy** (41 ties become 82) instead of editing the load.
4. **After a file is replaced, the old ranking's colors and key stay** until Rerun. Correct by the
   design (nothing reruns by itself), and the reason the answer key grades `stale-read`.
5. **Adding a file whose people are all new to an open project leaves every row out by default**:
   Control+O with team.csv into friends.csv offers "16 edge rows name 12 nodes no node row holds"
   with "Leave out" chosen, so Load adds nothing (`check-chip-analyze/06.png`).
6. **After Find selects a person, the drawing is framed off-center** with part of the graph off the
   canvas (`T19A/04.png`, `check-notes-sources/04.png`).
7. **A reopened project's Direction row shows raw file text**: `Undirected, from the file:
"directed": f...` where the fresh sample read "directed 0" (`T19B/10.png` against `T19B/04.png`).
8. **PageRank on a CSV follows each tie's direction** (a CSV opened "as the file says" is directed),
   so its order differs from an undirected calculation. The answer key uses the element's values.
9. **The Les Miserables and friends.csv drawings carry no names by default**, so T18's pick
   buttons cannot be used by sight without putting names on first; typing names works.

## Before the first tier 2 round

- Run the wording check on the tier 2 screens and prompts (not run here).
- Freeze the build: copy `graphty/dist` of the build under study and serve the copy (`REAL_DIST`),
  as tier 1 rounds did.
- Give participants only their persona file, the prompt and the tool's participant instructions.
