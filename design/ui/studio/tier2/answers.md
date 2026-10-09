# Tier 2 answer key -- GRADERS ONLY

Participants never see this file. The tasks are in `tasks.md` (this folder), the bars in
`criteria.md`. Grading follows tier 1's rules (`../answers.md`, its opening sections, and
`../criteria.md`, "Grades"): S, SD, F, G; answers count only when they were on screen first;
graded from the last screenshot, the downloads and the transcript, never from a self-rating;
build defects confirmed by a scripted repro.

**Screenshot paths** such as `preflight/T17A/09.png` or `T17A/09.png` are under
`../rounds/tier-2/preflight/` (build ca8b3b916c22, before the tier 2 fixes). Paths starting
`final/` are in this folder (`final/T4/A/07.png` is `pilot/T4-final/A/07.png`): the walk of every success path on the
study build e2ccec0e9304 (`criteria.md`, first line), with each session's steps in
`pilot/<task>-final/<A|B>.steps.log`. Where the two differ, the final walk is the screen.

**Where the values come from.** Every reference value was read from graphty-element on the served
build `ca8b3b916c22 graphty@0.8.55` (https://dev.ato.ms:9366/?next, 2026-10-07), two ways: a probe
that loads each file through the element's own import and reads filter counts, routes and rankings
(`preflight/reference/probe.mjs`, `probe2.mjs`; output `reference.json`, `reference-open.json`), and
a pilot of every task through the app with `tool/real.mjs`, whose screenshots show the same values
(`preflight/<task>/`). T22 to T24 were piloted on a frozen copy of that build; their values are
the screens' and agree with a count from the files (`preflight/reference/hand.py`). A ranking is
the element's PageRank, which follows each tie from its first column to its second (a CSV opened
"as the file says" is directed); NetworkX's undirected PageRank gives a different order, so never
grade against a hand calculation. Every value was then read again on the study build e2ccec0e9304
from the final walk's screens (`pilot/<task>-final/`), and agrees.

**Every value and every "known on this build" note is re-recorded on the build a round studies**
(criteria, preflight items 3 to 5). This key is recorded on build 8c4eef4722ac; a note that build
no longer shows has been deleted, not left for graders.

**The first round 1 build, 16dcf3494700.** Round 1 was first planned on build 16dcf3494700. Every task half was piloted on it from the start `roster.md` names, with screenshots in
`rounds/r1/pilot/<task><half>/` of this folder (for example `rounds/r1/pilot/T4A/07.png`). Every
value in this key agrees with those screens; where a screen differs (a click point, a cut label, a
note no longer true), the task's entry says so and cites the pilot. The `final/` walks started
from the earlier, unranked setups, while round 1's starts are ranked, colored and sized by
PageRank, so a `final/` drawing can look different from a session's even where the values agree.
Screenshot numbers depend on how the steps are grouped: match the screen, not the number.

**The earlier study build, 3dfe7daf9e45 (graphty@0.8.56).** Before 909b19b578d4 (below), the
round was to run on build 3dfe7daf9e45. Every task half but T21 A was piloted on it again from its start,
with screenshots in `rounds/r1d1/pilot/<task><half>/` (for example `rounds/r1d1/pilot/T4A/09.png`).
Every reference value held. Where this build's screen differs from an earlier note, the task's
entry below now gives this build's screen and cites `rounds/r1d1/`; a `final/` or `rounds/r1/`
citation is kept only where its screen still matches. Across tasks on this build: a selected tie
is drawn with a blue band (not gold); a run's Made with lists "From" and "To" (not "Source" and
"Target"); picking an option in the Path popover's From with a click moves focus on to To.

**The second dry run build, 909b19b578d4 (graphty@0.8.56).** Before 8c4eef4722ac (below), round 1
was to run on build 909b19b578d4, which holds the fixes the 3dfe7daf9e45 pilots pointed to. Every task
half, T21 A included, was piloted on it from its start, with screenshots in
`rounds/r1d2/pilot/<task><half>/` (for example `rounds/r1d2/pilot/T4A/12.png`). Every success path
landed on the first try with no script errors, console errors or failed requests, and every
reference value held. Where this build's screen differs, the task's entry below gives this build's
screen and cites `rounds/r1d2/`; an older citation is kept only where its screen still matches.
Across tasks on this build:

- After the find box picks a node, or after a run finishes, focus lands on the inspector's title
  (the node's or the run's name in the panel header, with a focus ring), not on a row below it.
- A run's Made with "Ran" row and the inspector's subtitle show the date and the time ("Oct 8,
  4:31:04 PM"), so two runs, or a run before and after Rerun, can be told apart on screen.
- A shortest path is drawn in black on the ranked starts, and the legend has one heading,
  "Shortest path", over one entry, "On the path".
- A session's `session.json` records under "commit" the studio worktree's commit at the time of
  the session, not the build served; the "buildStamp" (`909b19b578d4 graphty@0.8.56`) names the
  build. Check the build by the stamp.

**The study build now, 8c4eef4722ac (graphty@0.8.56).** Round 1 runs on build 8c4eef4722ac
(`criteria.md`, first line; buildStamp `8c4eef4722ac graphty@0.8.56`). Every task half was piloted
on it from its start, with screenshots in `rounds/r1d3/pilot/<task><half>/` (for example
`rounds/r1d3/pilot/T4A/10.png`). Every success path landed on the first try with no script errors,
console errors or failed requests, and every reference value held. Where this build's screen
differs, the task's entry below gives this build's screen and cites `rounds/r1d3/`. The notes
across tasks for 909b19b578d4 above still hold, except:

- After the find box picks a node, the focus on the inspector's title is drawn as blue underlined,
  link-style text, not as a ring (`rounds/r1d3/pilot/T12RA/05.png`, `T12RB/05.png`, `T23B/03.png`).
- After Rerun, no focus mark could be seen anywhere (`rounds/r1d3/pilot/T21A/07.png`); focus may
  be on no control. Not confirmed with a screen reader.
- The times in "Ran" are the time of day of each session ("Oct 8, 7:28:37 PM" in one pilot); the
  example times in this key are only examples. Match a run by its time changing, not by the text.

**Where each setup leaves the screen.** A ranked setup (`friends-ranked.txt`, `team-ranked.txt`,
`bus-stops-ranked.txt`, `lesmis-ranked.txt`, `florentine-ranked.txt`) ends on the PageRank run's
inspector with its Style tab chosen, the run just styled; it does not end on Everything. A names
setup (`friends-ranked-names.txt`, `bus-stops-ranked-names.txt`) adds a label line on Everything
afterwards, so it ends on the Everything inspector, Style tab. Every setup hands over with nothing
focused and the pointer off the page, so no control is lit by a hover on the first screen.

**Tool faults seen in the round 1 pilots, not participant misses.** A click that times out
(`elementHandle.click: Timeout 3000ms exceeded`) with no change on screen is the tool's: it
happened once on a setup start (`lesmis-ranked.txt`, which still reached its end state) and once
on `--click "Degree"` (T12R A; the retry worked). Its cause is not traced; no pilot on
909b19b578d4 met it. After two hovers in a
row, the tooltip `real.mjs` prints can be the previous one's: trust the screenshot over the
printed tooltip.

**Success paths** are `real.mjs` steps, walked once each on that build (pilots). Steps marked
(click-at) use a point from the pilot's screenshot; a point is valid only for that build and that
seed, so the pilot of each round re-reads it.

**Failure codes for tier 2** (tier 1's codes also apply):

- `weight-not-read` -- the answer was computed without the tie's number when the task needed it
  (a route counted in links, not minutes or kilometers)
- `added-not-replaced` -- the new file was added beside the old one (doubled ties) instead of
  replacing it
- `stale-read` -- a value read from a run that was out of date (computed on the old file)
- `work-lost` -- the participant's earlier run, colors, reminders or filter are gone at the end
  without the participant choosing to remove them
- `not-kept` -- reminders made but not there after closing and reopening
- `not-marked` -- the elements the task asked to make stand out are not distinguishable from the
  rest at the end (nothing selected, or a color that does not separate them)
- `hid-the-rest` -- the task said to keep everything on the drawing and a filter step is still on
  at the end
- `meaning-wrong` -- a choice that makes the program read the data the wrong way round (a count of
  runs set as a distance, ties followed one way only where they run both ways)

## T4. Two spreadsheets as one network (tier 2)

- **A (office): 12 people and 22 links arrived; messages.csv has 23 rows, and one of them (line 24,
  `p11,p13,6`: Kemi Bello emails p13 six times) names p13, who is not on the staff list.** The Data
  page says so before loading: "12 node rows and 23 edge rows read; the load makes 12 nodes and 22
  edges." and "1 edge row names a node missing from the node rows. Show the 1 unmatched row", with
  "Leave out" chosen; the link shows line 24, `p11, p13, 6` (`rounds/r1d3/pilot/T4A/06.png`,
  `07.png`). The Tables list marks the edge table with a red-orange warning triangle and reads
  "Edges: messages.csv / 23 rows, 1 left out". After Load: the project and graph are named
  "people and messages", header "From 2 files" (drawn in blue, like a link), Overview Nodes 12,
  Edges 22, Directed, Density 0.1667, Components 1, "Edges per node 3 to 6, mean 3.667" (the value
  wraps onto two lines) (`rounds/r1d3/pilot/T4A/09.png`; the Graph page's Overview has no Sources
  row). On the Data page (a click on "Data") the Sources list shows the source's row in full on two
  lines, "people.csv and messages.csv" over "12 nodes, 22 edges", with three rows under it:
  people.csv, messages.csv and "1 row left out", the last with a red-orange warning triangle and
  gray-white text (`rounds/r1d3/pilot/T4A/10.png`). Hovering the source row shows no tooltip; the
  whole text is already on screen (`14.png`). Selecting the source row opens the source in the
  inspector: Added, Nodes 12, Edges 22, "1 edge row was left out: it names a node missing from the
  node rows.", and the row itself (`13.png`); only the source row is highlighted, not its three
  child rows. Selecting the "1 row left out" row opens an inspector titled "1 row left out" with
  the subtitle "Left out of people.csv and messages.csv" and the same body: an "Added" section
  with Nodes 12 and Edges 22, then the sentence and the row (`11.png`); apart from its title it is
  the source's inspector. In both, the row wraps and shows in full: "Line 24: p13 has no node row;
  from p11, to p13, emails 6" (`11.png`, `13.png`), so the missing person, the sender and the
  number of emails are all on screen with no hover. Choosing "Add"
  instead loads 13 nodes and 23 edges (p13 becomes a node with no name); either choice is correct
  if the participant says which row did not fit.
- **B (football team): 10 players and 17 passes arrived; passes.csv has 18 rows, and one
  (line 17, `s04,s11,3`: Dina Moss passes 3 times to s11) names s11, who is not in players.csv.** Data
  page: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges", "1 edge row
  names a node missing from the node rows", line 17, `s04, s11 (no node row), 3`, and the Tables
  list's edge table "Edges: passes.csv" with the warning triangle and "18 rows, 1 left out"
  (`rounds/r1d3/pilot/T4B/06.png`, `07.png`); after Load: "From 2 files", 10 nodes, 17 edges,
  Density 0.1889, Components 1, "Edges per node 2 to 4, mean 3.4" (`09.png`); on the Data page the
  source's row shows in full on two lines, "players.csv and passes.csv" over "10 nodes, 17 edges",
  with three rows under it: players.csv, passes.csv and "1 row left out", the last with the
  red-orange warning triangle (`10.png`); hovering the source row shows no tooltip (`11.png`); the
  "1 row left out" row opens an inspector with the subtitle "Left out of players.csv and
  passes.csv" and the same body as the source's (Added, Nodes 10, Edges 17, the sentence and the
  row), with the line wrapped in full: "Line 17: s11 has no node row; from s04, to s11, passes 3"
  (`rounds/r1d3/pilot/T4B/12.png`, the source's own, `13.png`). The project is named "players and
  passes" (header, Data page title, and the import heading "players and passes: 10 nodes, 17
  edges", `06.png`). With "Add": 11 and 18. The import page's weight line, unmatched-row line and
  Add and Leave out buttons are drawn at about body size. Before "Show the 1 unmatched row" is
  clicked, the edge table's preview ends at line 15, so line 17 is below it unmarked; the summary
  under the table names the problem (`06.png`).
- **Success path:** `--click "No thanks"`; `--click "New from data..."`; `--click "choose a
file..." --upload people.csv`; `--click "Add a table"` (the "+" beside Tables); `--click "File..."
--upload messages.csv`; read the report (`--click "Show the 1 unmatched row"` shows it); `--click
"Load"`; `--click "Data"` (Sources); the "1 row left out" row is in the list; selecting it (or
  the source row) shows the left-out row again in the inspector, in full. Before Load, hovering
  "Leave out" shows the tooltip "Skip the rows whose end names no node"
  (`rounds/r1d3/pilot/T4A/08.png`, `T4B/08.png`); "Add" was not hovered. The "Add a table" control
  is a bare "+" beside "Tables" with no words on screen (`T4A/04.png`); record any participant who
  does not find it. To hover the source row with the tool, point at the tree item:
  `--hover "people.csv and messages.csv"` also matches the inspector's heading and takes the first.
- **Other routes:** opening people.csv from "Open project or file..." loads it straight in (12
  nodes, no ties); then Control+O with messages.csv goes through the Data page as an addition
  (not piloted). Grade SD if the end state and the unmatched row are right.
- **S:** the drawing holds both files' rows, the counts are stated, and the unmatched row is named
  (or "one email row names someone not on the staff list"). **SD:** counts right but the unmatched
  row found only after a detour, or not named but counted ("22 of 23"). **F:** `false-done`
  ("everything arrived" with 22 of 23 links), `never-found` (only one file in), wrong counts.
- **After Load the left-out row is on screen in two places on the Data page:** the row "1 row
  left out" in the Sources list, visible with nothing selected and marked with the red-orange
  warning triangle, and the inspectors, which name the row in full (its line, the missing person,
  from, to and the number). The Graph page says nothing about it: only "From 2 files" (drawn small,
  in link blue) and the counts (`rounds/r1d3/pilot/T4B/09.png`). A participant who loads without
  reading the report and then finds the row on the Data page (the list row or the inspector) is S;
  one who says everything arrived is `false-done`. The counts can be read from the Graph page's
  Overview, the source row or either inspector. Both inspectors show the "Added" section with the
  whole source's Nodes and Edges, and the left-out row sits under that heading with no "Left out"
  heading of its own: record any participant who reads those counts as describing the left-out
  row, or the row as having been added.
- **Note:** the people's names are an Attribute, not the label, by default; the drawing shows no
  names. The emails (and passes) column also comes in as an Attribute, with "Weight: none (each
  edge counts 1)", and nothing on the import page says how to make it the weight
  (`rounds/r1d3/pilot/T4A/06.png`). Neither is part of the task; record any participant who stops
  to put names on or to set the weight.

## T17. Only the strong ties

- **A (running club): 19 of the 20 people are still in it, joined by 12 ties.** Theo is the one
  left out (none of his ties reaches 4). Screen: header chip "19 of 20 nodes"; the Filters row
  reads the full name "weight is at least 4" with its checkbox ticked and a second line "20 to 19
  nodes" (the row has no tooltip); after "Add step" the right-hand panel leaves the step editor
  and shows the graph's Overview, which leads with "Nodes showing 19 of 20" and "Edges showing 12
  of 41", then "The counts below are for the whole graph." (`rounds/r1d3/pilot/T17A/07.png`). The
  step's own editor (a click on its row) says "Off" in its header once unticked
  (`rounds/r1d3/pilot/T17A/09.png`); its "On" header was not opened on this build. **Back:**
  untick the step's checkbox ("Apply step: weight is at least 4"); the row still reads "weight is
  at least 4", its second line now "off", and the chip goes (`rounds/r1d3/pilot/T17A/08.png`).
  Undo or deleting the step is equally right.
- **B (Les Miserables): 26 of the 77 characters are still in it, joined by 51 ties.** Chip "26 of
  77 nodes", row "shared_chapters is at least 5" over "77 to 26 nodes", Overview "Nodes showing 26
  of 77", "Edges showing 51 of 254" (`rounds/r1d3/pilot/T17B/07.png`). Back as in A, the row's
  second line "off" (`rounds/r1d3/pilot/T17B/09.png`).
- **The count can be read in three places:** the chip, the Overview's "showing" rows, and the
  Filters row's second line ("20 to 19 nodes": the whole graph, then what is left).
- **Follow-up answers:** A, 5 or more runs together: chip "10 of 20 nodes", row "20 to 10 nodes",
  Overview "Edges showing 5 of 41" (`rounds/r1d3/pilot/T17A/11.png`). B, 8 or more shared
  chapters: chip "17 of 77 nodes", row "77 to 17 nodes", Overview "Nodes showing 17 of 77", "Edges
  showing 19 of 254" (`rounds/r1d3/pilot/T17B/12.png`). The editor of a step that is off labels
  its button "Save and turn on" (`T17A/09.png`, `T17B/10.png`): pressing it saves the new value and
  turns the step back on at once (checkbox ticked, chip back, drawing narrowed), and the button
  says so beforehand. **The trap on this build:** a participant who then ticks the checkbox,
  expecting to switch the step on, switches it off (the same state as `T17A/12.png`,
  `T17B/13.png`: the row reads "off" and the chip goes); only the small "off" on the row's second
  line says so. Expect fewer participants to fall into it now that the button names the effect,
  and record each who does. Reporting the whole club (20; 77) from that state is `read-wrong`,
  unless the participant notices and ticks it again.
- **Success path (A):** `--click "Data"`; `--click "weight"` (the attribute row); `--click
"Attribute actions"`; `--click "Filter to..."`; `--click "Value" --type 4`; `--click "Add step"`;
  read the chip; `--click "Apply step: weight is at least 4"`. **Follow-up success path (A),**
  from there: `--click "weight is at least 4"` (the step's row; its editor opens with "Off" in the
  header); `--click "Value" --key Control+a --type 5`; `--click "Save and turn on"`; read the
  chip "10 of 20 nodes" with the checkbox now ticked and the row "20 to 10 nodes"; then `--click
"Apply step: weight is at least 5"` once, which brings the whole club back (row "off", Overview
  Nodes 20, Edges 41). Saving already turned the step on, so the only tick in this path is the one
  that brings everyone back; "edit, then tick to switch it on" turns it off instead (the trap
  above). Walked on this build (`rounds/r1d3/pilot/T17A/09.png` to `12.png`, `T17B/10.png` to
  `13.png`). On B the same with `shared_chapters` and 8. On B the attribute is
  `shared_chapters` and the value 5. The Filters "+" ("Add filter step") then Attribute, "weight",
  "at least", 4 is the other door; in an earlier pilot the attribute list's "weight" option was
  hard to click by name (the tool clicked the tree row), so graders accept either door. Hovering
  the checkbox of a step that is off shows the tooltip "Turn this step on"
  (`rounds/r1d3/pilot/T17A/08.png`, `T17B/09.png`).
- **On the drawing:** in the A setup two pairs of dots sit almost on top of each other (about
  567,758 / 583,753 and 717,745 / 735,744, `rounds/r1d2/pilot/T17A/01.png`), so a count of visible
  dots or ties comes out short (about 11 ties at 4 or more, the 567-583 tie hidden; at 5 or more,
  9 dots and all 5 ties can be seen, `rounds/r1d3/pilot/T17A/11.png`). The grade does not change (a
  count stated must be right); record the overlap as the cause when a dot count is off by these
  pairs.
- **Known on this build:** after "Add step" the right-hand panel shows the Overview, not the step
  editor, so adjusting the step means clicking its row (`rounds/r1d3/pilot/T17A/07.png`). The
  "Attribute actions" menu opens over the inspector's "Table: Edges" value (`T17A/04.png`). The
  drawing's legend keeps the whole graph's PageRank range while the filter hides nodes, with
  nothing saying whose range it is (`T17A/07.png`, `T17B/07.png`); record any participant who reads
  it as a count. On B the Data page's node Attributes list shows only id and name, not the
  PageRank the setup computed (`T17B/02.png`).
- **S:** the drawing narrowed, the count read from the chip, the Overview or the Filters row (19,
  or 26), and the whole graph back. **SD:** narrowed by a wrong first comparison then corrected;
  count read by counting dots. **F:** `wrong-attribute`, the count stated before the drawing
  changed, selection used instead (selected dots highlighted but nothing left out: the chip never
  appears), or never brought back (`work-lost` if the step was deleted with no way back and the
  participant believed the club gone).
- **Wrong reading:** under the "showing" rows the Overview still lists Nodes 20, Edges 41 (B: 77,
  254), Density, Components and Edges per node for the whole graph, below the line that says so.
  20 (or 77) given as "still in it" is `read-wrong`.

## T18. The fewest people in between

- **A (running club): Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, 3 people in between. It is
  the only chain of that length.** Screen: the Path popover, whose Weight box reads "None" under "Not
  read -- weight's meaning is not set, and a path needs a distance" (`rounds/r1d2/pilot/T18A/02.png`);
  in its Weight list "weight (loaded, not read)" is grayed out above the checked "None", and the
  open list covers that explanation (`07.png`). The popover also has an Advanced section whose
  Method reads "Chosen automatically" (`09.png`). After Find path the run opens on its Values:
  "Path 5 nodes, 4 edges", "Nodes in order" Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with reads
  Analysis "Shortest path", Ran with the date and time ("Oct 8, 4:31:04 PM"), From "Chloe", To
  "Milo", Weight "None" with the line "Not read -- weight's meaning is not set, and a path needs a
  distance." under it, then a collapsed "Advanced run settings" whose Method select reads
  "Dijkstra, chosen automatically" (`rounds/r1d3/pilot/T18A/10.png`, `11.png`). Made with has no
  Weight select. The Graph tree row reads "Shortest path 4 hops". The tie numbers are runs
  together, not distances: a participant who sets them as a distance gets a different chain and
  is wrong for this task (`meaning-wrong`).
- **B (Florentine families): Strozzi, Ridolfi, Medici, Salviati, Pazzi -- 4 marriages, 3
  families in between; the only chain of that length.** Values as in A; Made with From "Strozzi",
  To "Pazzi", Weight "None" with the line "Each edge counts as 1." under it
  (`rounds/r1d3/pilot/T18B/06.png`; `07.png` with Advanced run settings open). The sample has no weight column, so the Path popover shows no
  "Not read" line on B.
- **Follow-up answers:** A, Ben to Nora: Ben, Theo, Ravi, Pia, Nora, 5 nodes, 4 edges; Made with
  From "Ben", To "Nora", Weight "None" (`rounds/r1d3/pilot/T18A/15.png`; the only chain of that
  length, by a count over friends.csv). B, Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi,
  Ginori, 5 nodes, 4 edges (`rounds/r1d3/pilot/T18B/10.png`; agrees with a hand count from the
  marriage list). Ran shows the time of each run (for example "Oct 8, 7:28:19 PM", then "7:28:52
  PM"), so the newer chain can be told by its time changing. The second run replaces the first: the Graph tree keeps one
  "Shortest path 4 hops" row and the first chain is gone, so a participant who wants both must
  note the first. Reopening the popover with p brings back empty From and To.
- **Success path (A):** `--key p` (or a node's menu "Path between...", or Analyze, "Shortest
  path"); `--type Chloe --click "Chloe"` (the option); `--click "To" --type Milo --click "Milo"`;
  `--click "Find path"` (the run opens on its Values, with focus on the run's title). Typing a name
  and pressing Enter in From moves on to To, and Enter in To moves focus to the Find path button;
  a second Enter or a click runs it (`rounds/r1d3/pilot/T18B/05.png`). Picking an option with a
  click also moves focus on: in From to To (`rounds/r1d2/pilot/T18A/04.png`), and in To to the Find
  path button (`rounds/r1d3/pilot/T18A/07.png`), so the `--click "To"` step is harmless but not
  needed. "Advanced run settings" is collapsed after the first run; once opened, it stays open
  after the next run (`rounds/r1d3/pilot/T18A/11.png`, `15.png`). Escape pressed while the Weight list is open closes only the list; the
  popover stays open. The one-item suggestion list under From covers the To field while it is
  open, and the one under To covers the Weight field (`T18B/03.png`, `05.png`); Enter picks the
  suggestion and moves on. The popover covers the lower third of the drawing, including part of a
  highlighted path, and picking a node in From or To does not mark it on the drawing. The pick
  buttons beside From and To also take a click on a node, but friends.csv and the Florentine
  sample draw no names by default, so a participant must name the people by typing or put names
  on first.
- **Known on this build:** the legend has one heading, "Shortest path", over one entry, "On the
  path", with a black swatch. On the ranked starts the path's nodes and edges are black and stand
  out from the orange PageRank colors (`rounds/r1d3/pilot/T18A/10.png`, `T18B/06.png`). The
  inspector's icon beside the run's title is the same path icon as the Graph tree row, and after a
  run the tree's "Shortest path 4 hops" row is highlighted (`T18A/10.png`, `T18B/06.png`). Two
  layout overlaps can mislead a reader of the drawing: on A, the path's start, Chloe (about
  716,744), half-hides Farah, who is not on it (about 750,730; `rounds/r1d3/pilot/T18A/12.png`,
  `13.png`); on B, the highlighted Peruzzi-Bischeri edge passes straight through an orange node not
  on the path (about 713,604, `rounds/r1d3/pilot/T18B/10.png`). A chain read off the drawing with
  names on is still SD, as below; record any participant who names a node from such an overlap.
  On A the drawing shows each tie's arrowhead in the file's direction, and the chain runs against
  some of them (Ivan to Chloe, Kofi to Ivan, `T18A/10.png`); nothing on screen says a path counts
  ties both ways. Record any participant who doubts the chain for that reason.
- **S:** names in order and the count (4 introductions, or 3 people between, or 5 people in the
  chain) read off the Values or the drawing with names on. **SD:** right chain after a detour, or
  read from the highlighted drawing with names put on. **F:** a longer chain, or a guess from the
  drawing with no names on screen (`not-run`).

## T19. Reminders that stay with the work

- **Success state (A): two notes in the Notes place, "Moving away in May; ask who takes over the
  Tuesday run" with the chip "Farah", and "Spring list, checked against the sign-up sheet" with
  the chip "Graph"; the project saved; after closing and reopening, both notes are listed again.**
  (`rounds/r1d3/pilot/T19A/13.png`, the Notes place after reopening from Recent projects.) The
  inspector header of Farah reads "Node 1 note" (the type, then the link), and of the graph "From
  friends.csv 1 note" (B: "From Florentine families 1 note") (`T19A/05.png`, `08.png`).
- **B:** the same with "Check the 1434 return from exile" on "Medici" and "Marriages only; business
  ties are a separate list" on "Graph" (`rounds/r1d3/pilot/T19B/12.png`); its project is saved as
  "Florentine families".
- **Success path (A):** `--key /` `--type Farah` `--key Enter` (selects Farah; focus lands on the
  inspector's title "Farah"); `--key n`; `--type "<text>"`; `--key Control+Enter` (focus moves to
  the saved note's card, with a white focus ring and no tooltip); `--key Escape --key Escape`
  (nothing selected: the next note is about the graph; the new note's form says "About Graph");
  `--key n`; type; `--key Control+Enter`; `--key Control+s`; `--click Save`; `--reopen`; click the
  project in Recent projects (`--click friends`; in B click-at 624,108, its row: the sample of the
  same name is also on the start screen; `--click "Florentine families"` reports the name as
  shared with the sample's button and takes the Recent projects row, which the tool calls a
  gridcell "Florentine families In this browser - 15", which also works,
  `rounds/r1d3/pilot/T19B/11.png`); `--click
"Notes"`. The menus' "Add note" (a node's canvas menu, the inspector "...") and the Notes place
  "+" are the same command.
- **The save:** Control+S on this build opens "Save friends as" and keeps the project in this
  browser ("Saved friends in this browser."); Recent projects lists it after reopening as "friends"
  over "In this browser - 20 nodes - Oct 8, 2026, 7:28 PM" (the date and time of the save)
  (`rounds/r1d3/pilot/T19A/09.png`, `10.png`, `11.png`). That save
      alone counts as kept. The start screen also says "This browser can clear projects kept here.
      Save a local copy of any project you need to keep."; a participant who saves a local copy as
      well took no detour. The header's "Local only" label reads the same before and after the save,
      and nothing lasting on screen says the project is saved: only the toast, which fades.
- **S:** both notes, each on the right target, there after reopening, and the participant shows
  the Notes place (or the inspector's "1 note" link). **SD:** one note on the wrong target fixed
  after a detour; or the reminders kept but found only after searching. **F:** `not-kept` (no save,
  or the notes missing after reopening), `wrong-row` (both notes on the graph, or the Farah note
  on another person), a note typed into another field (Find, a label).
- **Screens on this build:** the whole graph stays in view through Find, the notes and the save;
  the drawing shows around and under the Save dialog; after the reopen the PageRank row reads 20
  (B 15) as before (`rounds/r1d3/pilot/T19A/09.png`, `12.png`; `T19B/09.png`, `11.png`). The
  success state is `rounds/r1d3/pilot/T19A/13.png` (B `12.png`); the screenshot numbers depend on
  how the steps are grouped. The Notes place lists the newest note first: the graph's note above
  the person's (`rounds/r1d3/pilot/T19B/07.png`, `12.png`).
- **Watch:** after the reopen the drawing is framed smaller or shifted (A: the graph spans about
  x 520 to 970, y 220 to 740 instead of x 440 to 1040, y 100 to 780,
  `rounds/r1d3/pilot/T19A/12.png` against `09.png`; B: about y 205 to 735 instead of 155 to 735,
  `T19B/11.png` against `09.png`); colors, sizes and key are unchanged, so this is not
  `work-lost`. After a note is saved, the focus ring stays on its card even after Escape Escape has
  cleared the selection and the inspector shows the graph (`rounds/r1d3/pilot/T19A/06.png`,
  `T19B/05.png`). On A, Farah's node half-covers a larger node not on it, and the yellow
  selection halo surrounds both, so the drawing does not make clear which is selected
  (`T19A/02.png` to `05.png`). The start screen lists "Florentine families" twice on B, under
  Recent projects (the saved work, "In this browser - 15 nodes" and the date) and under Samples
  (`rounds/r1d3/pilot/T19B/10.png`); nothing on the Recent projects row says it holds the notes,
  and opening the sample shows no notes. Record any participant who reads any of these as lost
  data.

## T20. A number that means "farther"

- **A (bus stops): Depot, Market, Park, Clinic, Harbor -- 14 minutes.** Screen: after Find path
  the run opens on its Values: "Path 5 nodes, 4 edges", "Total distance 14", Nodes in order; Made
  with From "Depot", To "Harbor", Weight "minutes (farther)" (`rounds/r1d3/pilot/T20A/14.png`); the
  graph's Overview "Loaded weight minutes (farther)" (`rounds/r1d2/pilot/T20A/08.png`). Once the
  run opens, the Overview is replaced by the run's Values, so the "Loaded weight" row is off screen
  until the participant clicks the graph's row; Made with's Weight row still shows the meaning.
  **The wrong answers:** read without the minutes, the program counts links and returns Depot,
  Station, Harbor (2 links, 29 minutes) or Depot, School, Harbor (2 links, 21 minutes); both are
  `weight-not-read`.
- **B (hiking trails): Trailhead, Creek, Meadow, Ridge, Summit -- 7.5 km.** Values "Total distance
  7.5", Made with Weight "km (farther)" (`rounds/r1d3/pilot/T20B/16.png`); Overview "Loaded weight
  km (farther)", Direction "Directed" (`11.png`). Wrong: Trailhead, Pine Fork, Summit (2 links,
  9.0 km), `weight-not-read`. Summit and Creek, both on the route, sit almost on top of each other
  on the drawing (about 755,645 and 790,636), no names are drawn, and hovering a node shows no
  tooltip although the pointer turns into a hand, so the route is read from Nodes in order, not
  from the drawing. The Path popover opens over the lower part of the drawing, where both ends of
  the route are (`T20B/12.png`).
- **Success path (A), the load-time route:** `--click "No thanks"`; `--click "New from data..."`;
  `--click "choose a file..." --upload bus-stops.csv`; open the minutes column's role (click-at
  728,203, the box showing "Attribute"; 728,225 lands on the small type caption under it, "whole
  number" on A and "number" on B, and opens nothing, `rounds/r1d3/pilot/T20A/05.png`, `06.png`);
  the list offers From, To, Weight, Date or time, Edge id and Attribute
  (`rounds/r1d3/pilot/T20B/08.png`); `--click "Weight"` (the summary reads "Weight: minutes" for
  now, B "Weight: km"); a "Higher means" row appears BELOW the row of role boxes, under that
  summary line (about y 263 to 307); the role boxes stay where they are (the minutes box still at
  about 712,203) and only the preview table moves down about 62 px
  (`rounds/r1d3/pilot/T20A/07.png`, `T20B/09.png`); a point from the old layout, 712,287, now
  lands on the Higher means choices; Higher means offers Not set, Closer, Farther
  and Capacity and starts on "Not set" with "Choose what a higher weight means. Until you do, a
  path counts every edge as one step, and PageRank and communities read a higher weight as
  closer." under it; `--click "Farther"` (the line under it changes to "A higher weight means
  farther apart, such as a longer trail; a path takes the smallest total.", the same example
  whatever the data is, and the summary changes at once to "Weight: minutes (farther)",
  `rounds/r1d3/pilot/T20A/08.png`, `T20B/10.png`); `--click "Load"` (Load is enabled while Higher
  means is still "Not set"); `--key p` (the Path popover's Weight starts on "minutes (farther,
  loaded)", `rounds/r1d3/pilot/T20B/12.png`); From Depot, To Harbor as in T18 (a clicked option
  moves focus on to To, then to Find path); `--click "Find path"` (focus lands on the run's
  title). B: trails.csv, the km column's role box at the same first point, 728,203. On both halves,
  before a role is chosen the summary reads "Weight: none (each edge counts 1)"
  (`rounds/r1d3/pilot/T20A/04.png`, `T20B/04.png`). Screenshot numbers depend on how the steps are
  grouped; match the screen.
- **Escape on the import page:** one Escape on the "Open as a new graph" page with no list open
  throws away the whole import (the file, the column roles) without asking and returns to the
  start screen (`rounds/r1d3/pilot/T20B/05.png` to `06.png`). A participant who loses the setup
  that way and loads again has taken a detour; record each one.
- **"Capacity" under Higher means:** not walked. A participant who chooses it is graded by the
  end state (the route, the total and what Made with says), and graders record the choice.
- **Numbers beside the route:** the Graph tree row reads "Shortest path 4 hops"; 4 given as the
  minutes is `read-wrong`.
- **The "Date or time" role:** the minutes column's role list offers "Date or time" beside
  "Weight" (`rounds/r1d2/pilot/T20A/05.png`). Chosen for minutes, the file loads with no weight and
  the path run counts links: Depot, Station, Harbor, no total, Made with "Weight: none (each edge
  counts 1)" (walked as "Time" on build ca8b3b916c22, `preflight/T20A-time/13.png`). It is
  `weight-not-read`.
- **The per-run route:** opened from "Open project or file..." the file loads straight in with no
  weight: no "Loaded weight" row in the Overview. (The Data page cannot tell the routes apart: even
  after the load-time route it names no weight, `rounds/r1d2/pilot/T20B/17.png`.) The Path
  popover's Weight list then offers "minutes (farther)", which gives the right route and total
  (`T20A-open/05.png`), but only for that run. **Grade it SD**: the route is right, but the task
  asked that every calculation treat minutes as a length, and the next calculation would not.
- **S:** the load-time route, the right stops in order and the total, and the participant points
  to "Loaded weight minutes (farther)" or Made with's Weight row "minutes (farther)". Made with is
  a list of plain rows (Analysis, Ran, From, To, Weight) and holds no Weight select; "minutes
  (farther, loaded)" is shown only in the Path popover's Weight box before the run
  (`rounds/r1d3/pilot/T20B/12.png`, `T20A/14.png`). Pointing to that box before the run also
  counts. "Total distance" has no unit on screen (`rounds/r1d3/pilot/T20B/16.png`).
- **Direction on B:** "As the file says" loads trails.csv directed, so each trail is followed only
  from its first column to its second. The right route survives because every trail on it points
  toward the Summit; a participant who sets the graph undirected gets the same route. **SD:** the
  per-run route; or the load-time route found after a detour. **F:** `weight-not-read` ("Date or
  time" chosen counts here); `read-wrong` (4); Closer chosen (paths then ignore the number: same
  wrong routes); a total added by hand from a wrong route.

## T21. The list was updated

- **A (running club): first before, Farah (PageRank 0.0639); first now, Ava (0.0801).** The rest
  of the new top four: Farah 0.0656, Hana 0.0643, Ivan 0.0614 (on screen 0.06556, 0.06428,
  0.06141). Still 20 people and 41 ties.
  Screens: before, the Values' Top 10 starts "Farah 0.06394" (`rounds/r1d3/pilot/T21A/02.png`);
  Data page titled "Replace: friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41" (`05.png`);
  after Load the PageRank row carries the out-of-date mark and its inspector the bar "Data changed
  since this run" with "Rerun" (`06.png`); after Rerun the Values' Top 10 starts "Ava 0.08012" and
  the key reads 0.02872 to 0.08012 (`rounds/r1d3/pilot/T21A/07.png`). The Replace page's "Higher
  means" shows "Not set" chosen, as the file's own weight has no meaning yet; nothing there needs
  choosing for this task. The rerun's Made with says "weight (read as closer)" and "Its meaning
  was not set, so this run assumed a higher weight means closer".
- **B (team): 14 people now (and 21 ties; were 12 and 16); first before, Hal (0.1293); first now,
  Di (0.1339), then Hal 0.1305, Ed 0.1245.** "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
  14, 21" (`rounds/r1d3/pilot/T21B/05.png`); after Rerun, Top 10 "Di 0.1339", the key 0.02333 to
  0.1339, the row 14 and "14 of 14 have a value" (`rounds/r1d3/pilot/T21B/08.png`). Between Load
  and Rerun the two new people, Mo and Nia, are drawn as small dots in a saturated blue unlike
  every other node, which the key does not explain (about 623,516 and 788,634), and the drawing is
  laid out again (`rounds/r1d3/pilot/T21B/06.png`): the visible sign of the out-of-date run. Record
  any participant who reads the blue as a highlight or a selection.
- **On both halves between Load and Rerun,** the inspector's histogram, "<n> of <n> have a value"
  with the old range, and the old Top 10 (Farah first; Hal first) stay on screen at full contrast
  with nothing on them marking them out of date, and the drawing's key keeps the old range; the
  only marks are the "Data changed since this run" bar and the row's icon, which changes to a
  history icon with no words (`rounds/r1d3/pilot/T21A/06.png`, `T21B/06.png`). The run's time is shown in its
  subtitle and under Made with ("Ran Oct 8, 4:33:16 PM"), and it changes on Rerun, so the time
  also tells the participant the run was redone.
- **Success path (A):** `--click "Values"` (to read the first name before); `--click "Data"`;
  `--rclick "friends.csv"` (the Sources row; its "..." menu works too); `--click "Replace with
file..." --upload friends-v2.csv`; `--click "Load"` (the app returns to the Graph page with the
  run's inspector open on its Values, where it was); `--click "Rerun"` (the run's inspector stays
  open through the replacement when it was open before; otherwise `--click "PageRank"`, the run
  row now marked out of date, comes first, and its absence or presence is not a deviation). "First
  before" is read from the Values before the replacement (or from the setup's open run).
- **Traps on this build:** after Load, the old colors stay on the drawing and the key keeps the old
  range (A 0.03779 to 0.06394; B 0.03273 to 0.1293) until Rerun: reading the top person then is
  `stale-read` (Farah, or Hal on B). The row's right-click menu opens with neither item
  highlighted, with "Edit source..." first, above "Replace with file..."
  (`rounds/r1d3/pilot/T21A/04.png`, `T21B/04.png`); the open menu covers the end of the row's own
  counts. "Edit source..." opens "Add to friends" and its
  Load doubles the ties (41 to 82, `check-notes-sources/05.png`): `added-not-replaced`. Control+O
  with friends-v2.csv goes to the same "Add to" page (not piloted). Opening friends-v2.csv as a new
  project and running PageRank again gives the right name but loses the earlier work: SD at best
  (`work-lost` if the participant claims the work was kept). On B the PageRank row still says 12
  until Rerun.
- **Watch:** on B the replacement lays the drawing out again, so every node moves although the
  run, its colors and its layers stay (`rounds/r1d3/pilot/T21B/06.png`); on A, where the people
  are the same, the drawing keeps its shape and the camera only zooms out a little
  (`T21A/04.png` against `06.png`). Record any participant who reads a moved drawing as lost work.
  After Load, the PageRank inspector's small "Reset Damping factor to default" button lands under
  the pointer left on Load (about 1411,870) and is drawn in its hover state, but its tooltip opens
  only once the pointer moves; it then covers the "Its meaning was not set..." note and the
  "Damping factor" label (`T21A/06.png`; `T21B/06.png`, `07.png`). A second click there would
  reset the damping factor. Record any participant who clicks it. The Replace page reads "0 node
  rows" on A beside "the load makes 20 nodes" (`T21A/05.png`); record any participant who reads it
  as an error.
- **S:** replaced (counts as above), rerun, both names right (B: and 14 people). **SD:** right
  after a detour (an addition undone, a new project), or the rerun found only after a stale read
  that the participant caught. **F:** `stale-read`, `added-not-replaced` left in place, `false-done`.

## T22. Make the ones that meet a condition stand out

- **A (bus stops): 3 links take 10 minutes or more -- School to Harbor 12, Station to Harbor 14,
  Depot to Station 15.** Screen: the line under the find box reads "3 edges selected"; inspector
  header "3 edges selected", Summary Edges 3, Selection 3, a "Selected edges" table (Edge, minutes)
  listing School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14; the three lines drawn
  with a blue band on the full map of 10 stops (`rounds/r1d3/pilot/T22A/07.png`), and no filter
  step.
- **B (Les Miserables): 13 ties of 10 or more shared chapters.** Line under the box and inspector
  "13 edges selected", Selection 13, a "Selected edges" table listing the 13 ties with their
  shared_chapters (MmeMagloire--Myriel 10, Thenardier--MmeThenardier 13, Thenardier--Valjean 12,
  Cosette--Valjean 31, Javert--Valjean 17, Marius--Gillenormand 12, Marius--Cosette 21,
  Marius--Valjean 19, Combeferre--Enjolras 15, Courfeyrac--Enjolras 17, Courfeyrac--Combeferre 13,
  Bossuet--Courfeyrac 12, Bossuet--Enjolras 10), all 77 characters still drawn, the 13 ties drawn
  with thick blue bands (`rounds/r1d3/pilot/T22B/06.png`).
- **The count can be read in four places:** the line under the find box (until Escape empties the
  box), the inspector's header or its Summary ("Edges 3"; B "Edges 13"), the Selection layer row in
  the left list (the only "Selection 3" on screen), and the rows of the "Selected edges" table.
- **Success path (A):** `--key /`; `--type "=minutes >= \`10\`"`(a gray line under the box reads
"Rule: press Enter to select matches");`--key Enter`; read the line under the box or the
inspector. B: `--type "=shared_chapters >= \`10\`"`. A bare number (`=minutes >= 10`) is refused
with "Put numbers in backticks:" with an example from the open data's own column (A: "minutes >
`9`"; B: "shared_chapters > `16`") in red under the box as it is typed, before Enter
(`rounds/r1d3/pilot/T22A/04.png`, `T22B/03.png`): a correction after it is not a detour, it is
the path; Enter on a refused rule changes nothing (`T22A/05.png`, `T22B/04.png`). A lone "="
lists the columns a rule can use (A: id as a node column, minutes as an edge column; B: id, name
as node columns, shared_chapters as an edge column; the PageRank values are not listed) above
the layer list, with "Type a rule, such as minutes > `9`" (B: "shared_chapters > `16`",
`rounds/r1d3/pilot/T22A/03.png`, `T22B/02.png`; on B the example's "`16`" wraps onto a line of
its own). An accepted rule stays in the box after Enter (with no visible text highlight), and the
line under it reads "3 edges selected" (B "13 edges selected"). A second Enter on the accepted rule
changes nothing and is not a detour. Escape in the box clears the box and keeps the selection; the
line under the box goes with the text, so the count is then read from the inspector or the
Selection layer row (`rounds/r1d3/pilot/T22A/09.png`, `T22B/08.png`). On B the example 16 sits
near the task's 10; record any participant who uses 16.
- **Other routes, graded by the end state:** clicking each line with Shift held (A: 3 lines; not
  checked on this build); a color on Everything's edges that separates exactly the 10-or-more ties.
  A filter step ("minutes is at least 10") narrows the drawing to the slow links and their stops
  (not piloted) but hides the rest; turned off again it leaves nothing marked.
- **Known on this build:** the selection's "..." menu offers no way to select the ends of the
  edges (`rounds/r1d2/pilot/T22B/09.png`). It opens with "Neighborhood -- Select a node first"
  disabled and not highlighted, and the first enabled item, "Path between...", highlighted, so an
  Enter at once would start a path (`rounds/r1d3/pilot/T22B/15.png`). Escape with that menu open
  closes only the menu; the selection stays (`T22B/16.png`). The tool cannot reach the menu by the
  name "Selection actions" (`--click "Selection actions"` finds nothing, `T22A`, step 13); it is the
  "..." at the top right of the inspector. **Escape with focus outside the find box and no menu
  open clears the whole selection:** after a click on the Selection layer row, or in the
  inspector's header (focus on its Style and Values tabs), one Escape removes the bands and the
  row's count, and the inspector falls back to the graph (`rounds/r1d3/pilot/T22A/13.png` to
  `14.png`; `T22B/11.png` to `13.png`): a participant who ends that way has nothing marked
  (`not-marked`), unless they run the rule again. The selection is not in the undo history:
  Control+Z then undoes the last style change instead, with nothing on screen naming it (in the
  pilot it removed the setup's size by PageRank, `T22A/15.png`); record any participant who loses
  earlier styling that way. Clicking Everything (to put names on, say) keeps the selection:
  Selection still reads 3 (B 13) and the lines stay marked (`T22A/10.png`). After a click on a
  layer row, "/" reaches the find box (`T22A/11.png`, `16.png`). The Selection layer's own panel
  shows Nodes FFD700 at 40% with size 1.45, and Edges 0077BB at 100% with size 2.5, the blue the
  selected ties are drawn in (`T22A/12.png`, `T22B/11.png`). The Everything layer's node color reads
  6366F1 although the PageRank layer above it draws every node orange (`T22A/10.png`). The bus-stops setup draws no
  stop names, so the bands cannot be tied to stop names on the drawing; the "Selected edges" table
  names them. Record where the participant went to find `minutes` or `shared_chapters` (the "="
  list, the Data page, an edge's values).
- **S:** the matching ties marked, everything else still drawn and no filter step on, and the count
  (3; 13) read from the screen. **SD:** the same after a detour (a filter first, then off; a wrong
  comparison corrected; a refused rule retyped; a selection lost to Escape and made again), or the
  count read by counting marked lines. **F:** `hid-the-rest`, `not-marked` (a count from a filter
  with nothing marked at the end, or a selection cleared and not made again), a wrong count,
  `false-done`.
- **Measure:** the route (a rule in the box, Shift-clicks, a color, a filter), and whether the
  participant typed "=" without being shown it anywhere. The design defers a separate dialog
  for selecting by a condition until this task shows the need; graders record every place the
  participant looked for one.

## T23. Who is a step or two away

- **A (running club): 14 people besides Ava** -- Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan,
  Jada, Kofi, Quinn, Ravi, Sana, Theo. Left out: Lena, Milo, Nora, Omar, Pia. Screen: the neighbor
  list at Hops 2 (with Follow All) is headed "Ava's 14 connections within 2 hops" with the 14 names
  under it, Selection 15; after "Filter to neighbors" the header chip reads "15 of 20 nodes" and 15
  dots are drawn (`rounds/r1d3/pilot/T23A/06.png`, `07.png`).
- **B (Florentine families): 11 families besides the Medici** -- Acciaiuoli, Albizzi, Barbadori,
  Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni (the Hops 2 list's
  own order, alphabetical). Left out: Peruzzi, Lamberteschi, Bischeri (the sample has 15 families;
  there is no Pucci). Header "Medici's 11 connections within 2 hops", Selection 12; chip "12 of 15
  nodes"; the Graph inspector then reads "Nodes showing 12 of 15" and "Edges showing 14 of 20"
  (`rounds/r1d3/pilot/T23B/05.png`, `06.png`, `10.png`). The Florentine graph is undirected, so the
  list has no Follow row.
- **Success path (A):** `--key /`; `--type Ava`; `--key Enter` (selects Ava); `--key g` (the list
  opens at Hops 1, headed "Ava's 6 connections", and already sets Selection to 7, Ava and her 6
  ringed, `rounds/r1d3/pilot/T23A/05.png`; screenshot numbers depend on how the steps are grouped,
  so match the screen, not the number); `--click 2` (the Hops segment; the tool reports the name as
  shared with the button "Dev 2" in A and takes the segment); `--click "Filter to neighbors"`. On
  B, type Medici. A node's canvas menu "Neighborhood" and the Degree row's route open the same
  list.
- **Wrong answers:** 6 (one step only: Hops 1, on both datasets); on A, 6 with Follow Out
  (friends.csv loads directed, but running together goes both ways: `meaning-wrong`); 15 or 12
  given as the count is right if the participant says it includes Ava or the Medici. At Hops 1 the
  header reads "Ava's 6 connections" (B "Medici's 6 connections"), and at Hops 2 it adds the hop
  count, "Ava's 14 connections within 2 hops" (`rounds/r1d3/pilot/T23A/06.png`, `T23B/04.png`,
  `05.png`). A participant who still reports 14 (11) as direct ties, or who doubts it against
  Degree 6, is recorded; the count itself is right for this task.
- **Other routes:** the Filters section's "+" with Keep "the neighbors of the selection" (not
  checked on this build); selecting the people one by one and counting. Graded by the end state.
- **Known on this build:** after the find box selects Ava (B: the Medici), the drawing does not
  move; only the node gets a ring, and focus lands on the inspector's title
  (`rounds/r1d3/pilot/T23A/04.png`, `T23B/03.png`). On A, Hops 1 is a Neighbor / weight table in
  alphabetical order (Ben 3, Chloe 5, Dev 2, Ivan 1, Sana 1, Theo 1), with the focus ring on the
  Hops "1" segment, not on a table row (`rounds/r1d3/pilot/T23A/05.png`), and Hops 2 a plain list
  of names; record any participant who reads the change as another feature. On B (no weights) both
  are plain alphabetical lists, and `--click 2` is not ambiguous. "Filter to neighbors" is drawn as
  an outlined button before it is clicked; after the click it stays a filled blue chip, reported
  as pressed, and its tooltip "Showing only this neighborhood. Press again to show every node"
  opens just below it while the pointer rests there, covering the list's first two names (A Ben
  and Chloe, B Acciaiuoli and Albizzi), so a count made at that moment comes out 2 short
  (`rounds/r1d3/pilot/T23A/07.png`, `T23B/06.png`). Pressing it again shows every node, removes
  the step from the Filters list (removed, not unticked) and drops the chip (`T23A/12.png`): the
  panel's own way back. The header chip "15 of 20 nodes" (B "12 of 15 nodes") has the tooltip
  'Showing only: "within 2 hops of Ava". Click to open Filters, where you can turn it off.'
  (`T23A/08.png`, `T23B/07.png`), and a click on the chip (whose pointer does not change on hover)
  opens the Data page, where the Filters list shows the step in full as "within 2 hops of Ava" over
  "20 to 15 nodes" (B "within 2 hops of Medici" over "15 to 12 nodes") with its checkbox ticked
  (`T23A/11.png`, `T23B/12.png`); the chip's tooltip stays open over the top of that page while
  the pointer rests on the chip. After the filter, the PageRank row is marked out of date
  ("PageRank, out of date", a history icon, tooltip "Ran on 20 nodes; 15 shown now", B "Ran on 15
  nodes; 12 shown now", the tooltip covering the rail's Notes button; hovering the row's name
  shows no tooltip, only its icon does) and still reads 20 (B 15), though only the drawing
  narrowed; the drawing is not refit (`rounds/r1d3/pilot/T23A/10.png`, `T23B/08.png`,
  `09.png`). The ranking is not stale for this task: record any participant who reruns it or
  reads the mark as a problem. On B the Graph inspector (the "showing" counts) opened only after a
  click on empty canvas, which also clears the selection and closes the neighbor list
  (`T23B/10.png`); the left panel's graph heading does nothing when clicked. The setup hands over
  with the pointer off the page; on both halves the PageRank row is already highlighted on the
  first screen because the setup's last click selected it, not a hover (`T23B/01.png`).
- **S:** the count read from the screen and the drawing narrowed to exactly those people and the
  starting one (the chip). **SD:** right after a detour (Hops 1 first, a filter on an attribute
  undone), or counted by hand from the list. **F:** a wrong count, the drawing not narrowed,
  narrowed to the wrong set (one step), `false-done`.

## T24. One tie on the drawing

- **A (running club): Gus and Ivan ran together once (1).** Screen: a click on the line opens the
  edge inspector titled "Gus -> Ivan" (subtitle "Edge", Values tab) with From Gus, To Ivan, weight
  1, Selection 1, and the line drawn with a blue band (`rounds/r1d3/pilot/T24A/03.png`); its menu
  (a three-dot button whose hover tooltip reads "Edge actions", `04.png`) offers "Select
  endpoints" (with no shortcut shown), "Frame selection (F)" and "Add note (N)" (`05.png`), after
  which the blue band is gone and the inspector reads "2 nodes selected", Summary Nodes 2, "Edges
  joining these nodes 1", Selection 2, and Gus and Ivan carry yellow rings and change color
  (`rounds/r1d3/pilot/T24A/06.png`). Over the line the pointer turns into a hand, but the line
  itself does not change and no tooltip opens (`02.png`). On the A drawing the "Hana" label box is
  drawn over the lower half of Ivan's sphere, and the Gus-Ivan line (and its blue band) stops at the
  label's left edge, so the tie seems to end at "Hana"; a second line out of Gus runs to Hana just
  below it; after Select endpoints the label also covers the lower part of Ivan's ring. Chloe's
  label is drawn over Farah's, and Eli's is mostly hidden under Dev's (only "E" shows)
  (`01.png`, `03.png`, `06.png`). Record any participant who reads the tie as Gus to Hana.
- **B (bus stops): 4 minutes.** Inspector "Station -> Stadium" (a gray swatch beside the title,
  subtitle "Edge"), From Station, To Stadium, minutes 4, Selection 1
  (`rounds/r1d3/pilot/T24B/02.png`); the "Stadium" label reads in full, with the selected line's
  band passing behind the label's white box; the button's tooltip "Edge actions" (`03.png`); the
  menu (`04.png`); after Select endpoints, Station and Stadium ringed in yellow, "2 nodes
  selected", Nodes 2, "Edges joining these nodes 1", Selection 2 (`05.png`).
- **Success path (A):** `--click-at 755,586` (the middle of the Gus-Ivan line on the pilot's
  drawing; the tool prints `edge with id "13"`); read the inspector; `--click "Edge actions"`;
  `--click "Select endpoints"`. B: `--click-at 752,170` (the middle of the Station-Stadium line,
  which runs from Station at about 777,117 to Stadium at about 726,220, on the ranked start
  `bus-stops-ranked-names.txt`; the tool prints `edge with id "15"`,
  `rounds/r1d3/pilot/T24B/02.png`), then the same. The earlier point 753,258 lands on empty canvas
  (`rounds/r1d1/pilot/T24B/02.png`), with no change on screen and no near-miss help. After the line
  click the Selection row reads 1 and the inspector opens on its Values; the Summary counts after
  Select endpoints are the same on B as on A. Both T24 setups (the names setups) end with the
  Everything inspector open (Style tab); the line click does not need it closed (no Escape first).
- **Other routes, graded by the end state:** typing a name in the find box lists that node and
  its ties (B: "Stadium" lists the node and School -> Stadium, Stadium -> Harbor and Station ->
  Stadium, `rounds/r1d3/pilot/T24B/06.png`; A not re-walked), and typing the inspector's title
  ("Station -> Stadium") finds exactly that tie (`07.png`). Typing the number lists ties too: on
  B, "4" lists the four ties of 4 minutes (Depot -> Market, Park -> Clinic, Station -> Stadium,
  Museum -> Library), each with "minutes: 4", and "Select where minutes is 4 (4)" (`08.png`).
  Tie titles in the list use "->", as the inspector does. A tie opened from there shows the same
  inspector, and is not a detour. Selecting Gus and then Ivan with Shift held is another
  route (S if both and only both are selected).
- **Known on this build:** the title's arrow is the file's direction, not a fact about the bus.
  The app's words here are "Edge", "Select endpoints" and "Edges joining these nodes", which the
  prompt avoids on purpose; record how the participant got from "the two on this tie" to "Select
  endpoints".
- **S:** the number (1; 4) read from the screen, and exactly the two ends selected at the end.
  **SD:** right after a detour (a missed click on the line, a wrong tie opened first), or the two
  selected one at a time after the ends command was not found. **F:** a wrong number (another tie
  read), more or fewer than the two selected, the number guessed from the line's look, `false-done`.
- **Measure:** whether the participant clicked the line itself, and how many tries the click
  took (a 1-pixel line is a small target).

## T12R. One person and who they are tied to, for a returning user

Graded with tier 1's key (`../answers.md`, T12): the same names, counts and grades. What differs
on build 8c4eef4722ac from the ranked starts (`rounds/r1d3/pilot/T12RA/`, `T12RB/`):

- **The path is 5 steps** (no sample to open): `--key /`; `--type Javert` (B: Medici); `--key
ArrowDown`; `--key Enter`; `--click "Degree"` (the row's name is "Degree 17", B "Degree 6").
  After Enter, focus lands on the node's name in the inspector's header, drawn as blue underlined,
  link-style text rather than a ring (`rounds/r1d3/pilot/T12RA/05.png`, `T12RB/05.png`); a keyboard
  user needs Tab to reach the Degree row. Selecting the node does not move the camera.
- **The node's values:** the inspector header reads "Javert / Node" (a node icon and a color
  swatch beside it) with "Style" and "Values" tabs, Values chosen. The "Summary" section holds id,
  name and the Degree row ("Degree", "17" and a chevron, B "6"); a separate collapsible "Results"
  section below it holds only PageRank "0.0303, #5 of 77" (B "0.1458, #1 of 15") (`T12RA/05.png`,
  `T12RB/05.png`). Either PageRank or the degree is a fact read.
- **The Degree row opens the Neighborhood view:** the panel's header becomes the name over
  "Neighborhood", with a "Back to Javert" control (B "Back to Medici"); below it the heading
  "Javert's 17 connections" (B "Medici's 6 connections"), then a Hops 1/2/3 switch, then "Filter
  to neighbors" (an outlined button), then the list; the neighbors are selected (Selection 18; B
  7). On both halves the Hops "1" segment (an outline) and the first neighbor (Babet; B
  Acciaiuoli, a gray fill) look lit at once, so which one holds focus cannot be seen
  (`rounds/r1d3/pilot/T12RA/06.png`, `T12RB/06.png`). In the Neighborhood header the node icon is a
  different glyph and the color swatch is gone (`T12RB/06.png` against `05.png`). On the drawing
  the person asked about wears the same yellow glow as the neighbors. Neither sample is directed,
  so there is no Follow control. "Back to Javert" returns to the Summary (Selection back to 1,
  `T12RA/08.png`, `T12RB/08.png`); after it no focus mark can be seen (not checked with a screen
  reader). The tooltip of "Filter to neighbors" ("Hide every node outside this neighborhood") opens
  over the first neighbor's name and hides it (`T12RA/07.png`, `T12RB/07.png`).
- **The find box lists ties too:** typing "Medici" lists the node under "Nodes 1" and its six ties
  under "Edges 6" ("Acciaiuoli -- Medici", "Medici -- Barbadori", and so on,
  `rounds/r1d3/pilot/T12RB/03.png`). Typing "Javert" shows him and 6 of his 17 ties in view under
  the heading "Edges 17", with a scrollbar at the list's right edge, so the screen shows that more
  ties exist (`rounds/r1d3/pilot/T12RA/03.png`). The scrollbar is also drawn when every row fits
  (Medici), so it is not by itself a sign of more rows. After one wheel turn no "Values" heading
  was in view (`T12RA/09.png`); the list may not have reached its end. Reading the neighbors from
  that list of ties is graded as tier 1's key grades neighbors read from the ties (SD); 6 given as
  Javert's ties from that list is a wrong count, and 17 read from the "Edges 17" heading is the
  right one. A participant who picks a tie instead of the node by mistake has
  taken a detour.
- **Both setups end on the PageRank inspector (Style tab), not on Everything**
  (`rounds/r1d2/pilot/T12RA/01.png`), as every ranked setup does; it does not change this task.
- **The ranked starts draw no names,** so the dots cannot be matched to names on the drawing: the
  names come from the list, and a route by clicking dots one at a time is not workable by name.
