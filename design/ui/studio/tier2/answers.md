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
(criteria, preflight items 3 to 5). This key is recorded on build e2ccec0e9304; a note that build
no longer shows has been deleted, not left for graders.

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
  "Leave out" chosen; the link shows line 24, `p11, p13, 6` (`final/T4/A/07.png`). After Load:
  header "From 2 files", Overview Nodes 12, Edges 22, and a Sources row whose name is cut to
  "people.csv and mess..." (its tooltip: "people.csv and messages.csv"), "12 nodes, 22 edges, 1 row
  left out", with both tables under it. Selecting it opens the source in the inspector: Added
  Nodes 12, Edges 22, "1 edge row was left out: it names a node missing from the node rows.", and
  the row itself, "p11, p13, 6" (`final/T4/A/11.png`). Choosing "Add" instead loads 13 nodes and 23 edges (p13 becomes a
  node with no name); either choice is correct if the participant says which row did not fit.
- **B (football team): 10 players and 17 passes arrived; passes.csv has 18 rows, and one
  (line 17, `s04,s11,3`: Dina Moss passes 3 times to s11) names s11, who is not in players.csv.** Data
  page: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges", "1 edge row
  names a node missing from the node rows", line 17, `s04, s11, 3` (`final/T4/B/07.png`); after
  Load: "From 2 files", 10 nodes, 17 edges; the source's inspector lists "s04, s11, 3"
  (`final/T4/B/11.png`). With "Add":
  11 and 18.
- **Success path:** `--click "No thanks"`; `--click "New from data..."`; `--click "choose a
file..." --upload people.csv`; `--click "Add a table"` (the "+" beside Tables); `--click "File..."
--upload messages.csv`; read the report (`--click "Show the 1 unmatched row"` shows it); `--click
"Load"`; `--click "Data"` (Sources); selecting the source shows the left-out row again.
- **Other routes:** opening people.csv from "Open project or file..." loads it straight in (12
  nodes, no ties); then Control+O with messages.csv goes through the Data page as an addition
  (not piloted). Grade SD if the end state and the unmatched row are right.
- **S:** the drawing holds both files' rows, the counts are stated, and the unmatched row is named
  (or "one email row names someone not on the staff list"). **SD:** counts right but the unmatched
  row found only after a detour, or not named but counted ("22 of 23"). **F:** `false-done`
  ("everything arrived" with 22 of 23 links), `never-found` (only one file in), wrong counts.
- **After Load the left-out row is still on screen:** the Sources row says "1 row left out" (its
  quiet text is cut at the default panel width) and the source's inspector lists the row. A
  participant who loads without reading the report and then finds it there is S; one who says
  everything arrived is `false-done`.
- **Note:** the people's names are an Attribute, not the label, by default; the drawing shows no
  names. Not part of the task; record any participant who stops to put names on.

## T17. Only the strong ties

- **A (running club): 19 of the 20 people are still in it, joined by 12 ties.** Theo is the one
  left out (none of his ties reaches 4). Screen: header chip "19 of 20 nodes"; the Filters row
  "weight is at least 4 20 to 19 nodes" with its checkbox ticked; the drawing shows 12 ties
  and the Overview leads with "Nodes showing 19 of 20" and "Edges showing 12 of 41", then "The
  counts below are for the whole graph." (`final/T17/A/07.png`). The step's own editor (a click on
  its row) says "On", and "Off" once unticked. **Back:** untick the step's checkbox
  ("Apply step: weight is at least 4"); the row reads "weight is at least 4 off" and the chip
  goes (`final/T17/A/09.png`). Undo or deleting the step is equally right.
- **B (Les Miserables): 26 of the 77 characters are still in it, joined by 51 ties.** Chip "26 of
  77 nodes", row "shared_ch... 77 to 26 nodes" (hovering it shows "shared_chapters is at least 5"),
  Overview "Nodes showing 26 of 77", "Edges showing 51 of 254" (`final/T17/B/07.png`). Back as in
  A.
- **Success path (A):** `--click "Data"`; `--click "weight"` (the attribute row); `--click
"Attribute actions"`; `--click "Filter to..."`; `--click "Value" --type 4`; `--click "Add step"`;
  read the chip; `--click "Apply step: weight is at least 4"`. On B the attribute is
  `shared_chapters` and the value 5. The Filters "+" ("Add filter step") then Attribute, "weight",
  "at least", 4 is the other door; in the pilot the attribute list's "weight" option was hard to
  click by name (the tool clicked the tree row), so graders accept either door.
- **S:** the drawing narrowed, the count read from the chip or the row (19, or 26), and the whole
  graph back. **SD:** narrowed by a wrong first comparison then corrected; count read by counting
  dots. **F:** `wrong-attribute`, the count stated before the drawing changed, selection used
  instead (selected dots highlighted but nothing left out: the chip never appears), or never
  brought back (`work-lost` if the step was deleted with no way back and the participant believed
  the club gone).
- **Wrong reading:** under the "showing" rows the Overview still lists Nodes 20, Edges 41 (B: 77,
  254), below the line that says they are the whole graph's. 20 (or 77) given as "still in it" is
  `read-wrong`.

## T18. The fewest people in between

- **A (running club): Chloe, Ava, Ivan, Kofi, Milo -- 4 introductions, 3 people in between. It is
  the only chain of that length.** Screen: the Path popover, whose Weight box reads "None" under "Not
  read -- weight has no meaning chosen, and a path needs a distance" (`final/T18/A/02.png`); after
  Find path the run opens on its Values: "Path 5 nodes, 4 edges", "Nodes in order" Chloe 1, Ava 2,
  Ivan 3, Kofi 4, Milo 5; Made with "Weight: not read -- weight has no meaning chosen, and a path
  needs a distance" (`final/T18/A/07.png`). The Graph tree row reads "Shortest path 4 hops". The tie
  numbers are runs together, not distances: a participant who sets them as a distance gets a
  different chain and is wrong for this task (`meaning-wrong`).
- **B (Florentine families): Strozzi, Ridolfi, Medici, Salviati, Pazzi -- 4 marriages, 3
  families in between; the only chain of that length.** Values as in A; Made with "Weight: none
  (each edge counts 1)" (`final/T18/B/07.png`).
- **Success path (A):** `--key p` (or a node's menu "Path between...", or Analyze, "Shortest
  path"); `--type Chloe --click "Chloe"` (the option); `--click "To" --type Milo --click "Milo"`;
  `--click "Find path"` (the run opens on its Values). Typing a name and pressing Enter in From moves
  on to To, and Enter in To moves on to Find path, as in B's walk. The pick buttons beside From and To also take a click
  on a node, but friends.csv and the Florentine sample draw no names by default, so a participant
  must name the people by typing or put names on first.
- **Known on this build:** the legend names the highlight "Shortest route (edges)" and "Shortest
  route (nodes)" (the element's layer names). In the Weight list of A, "weight (loaded, not read)"
  is listed but cannot be chosen.
- **S:** names in order and the count (4 introductions, or 3 people between, or 5 people in the
  chain) read off the Values or the drawing with names on. **SD:** right chain after a detour, or
  read from the highlighted drawing with names put on. **F:** a longer chain, or a guess from the
  drawing with no names on screen (`not-run`).

## T19. Reminders that stay with the work

- **Success state (A): two notes in the Notes place, "Moving away in May; ask who takes over the
  Tuesday run" with the chip "Farah", and "Spring list, checked against the sign-up sheet" with
  the chip "Graph"; the project saved; after closing and reopening, both notes are listed again.**
  (`final/T19/A/09.png` before, `14.png` after reopening from Recent projects.) The inspector
  header of Farah reads "1 note", and of the graph "1 note".
- **B:** the same with "Check the 1434 return from exile" on "Medici" and "Marriages only; business
  ties are a separate list" on "Graph" (`final/T19/B/09.png`, `14.png`); its project is saved as "Florentine families".
- **Success path (A):** `--key /` `--type Farah` `--key Enter` (selects Farah); `--key n`; `--type
"<text>"`; `--key Control+Enter`; `--key Escape --key Escape` (nothing selected: the next note is
  about the graph); `--key n`; type; `--key Control+Enter`; `--key Control+s`; `--click Save`;
  `--reopen`; click the project in Recent projects (`--click friends`; in B click-at 624,108, its
  row: the sample of the same name is also on the start screen); `--click "Notes"`. The menus' "Add note" (a node's canvas menu,
  the inspector "...") and the Notes place "+" are the same command.
- **The save:** Control+S on this build opens "Save friends as" and keeps the project in this
  browser ("Saved friends in this browser."); Recent projects lists it after reopening
  (`final/T19/A/12.png`). That save alone counts as kept. The start screen also says "This browser
  can clear projects kept here. Save a local copy of any project you need to keep."; a participant
  who saves a local copy as well took no detour.
- **S:** both notes, each on the right target, there after reopening, and the participant shows
  the Notes place (or the inspector's "1 note" link). **SD:** one note on the wrong target fixed
  after a detour; or the reminders kept but found only after searching. **F:** `not-kept` (no save,
  or the notes missing after reopening), `wrong-row` (both notes on the graph, or the Farah note
  on another person), a note typed into another field (Find, a label).
- **Watch:** after Find selects a person, the drawing is framed so that part of the graph is off
  the canvas until the next fit (`T19A/04.png`, `check-notes-sources/04.png`). Record any
  participant who reads it as lost data.

## T20. A number that means "farther"

- **A (bus stops): Depot, Market, Park, Clinic, Harbor -- 14 minutes.** Screen: after Find path the run opens on its
  Values: "Path 5 nodes, 4 edges", "Total distance 14", Nodes in order; Made with "Weight: minutes
  (farther)" (`final/T20/A/14.png`); the graph's Overview "Loaded weight minutes (farther)"
  (`final/T20/A/08.png`).
  **The wrong answers:** read without the minutes, the program counts links and returns Depot,
  Station, Harbor (2 links, 29 minutes) or Depot, School, Harbor (2 links, 21 minutes); both are
  `weight-not-read`.
- **B (hiking trails): Trailhead, Creek, Meadow, Ridge, Summit -- 7.5 km.** Values "Total distance
  7.5", Made with "Weight: km (farther)" (`final/T20/B/14.png`). Wrong: Trailhead, Pine Fork, Summit (2
  links, 9.0 km), `weight-not-read`.
- **Success path (A), the load-time route:** `--click "No thanks"`; `--click "New from data..."`;
  `--click "choose a file..." --upload bus-stops.csv`; open the minutes column's role (click-at
  728,205, the box showing "Attribute"); `--click "Weight"`; under "Higher means", which starts on
  "Not set" with "paths ignore it; PageRank and communities read it as larger = closer" under it
  (`final/T20/A/06.png`), `--click "Farther"`; `--click "Load"`; `--key p`; From Depot, To Harbor
  as in T18; `--click "Find path"`.
- **Numbers beside the route:** the Graph tree row reads "Shortest path 4 hops"; 4 given as the
  minutes is `read-wrong`.
- **The "Date or time" role:** the minutes column's role list offers "Date or time" beside
  "Weight" (`final/T20/A/05.png`). Chosen for minutes, the file loads with no weight and the path
  run counts links: Depot, Station, Harbor, no total, Made with "Weight: none (each edge counts 1)"
  (walked as "Time" on build ca8b3b916c22, `preflight/T20A-time/13.png`). It is `weight-not-read`.
- **The per-run route:** opened from "Open project or file..." the file loads straight in with no
  weight ("Weight: none" on the Data page; no "Loaded weight" in the Overview). The Path popover's
  Weight list then offers "minutes (farther)", which gives the right route and total
  (`T20A-open/05.png`), but only for that run. **Grade it SD**: the route is right, but the task
  asked that every calculation treat minutes as a length, and the next calculation would not.
- **S:** the load-time route, the right stops in order and the total, and the participant points
  to "Loaded weight minutes (farther)" or Made with "Weight: minutes (farther)". **SD:** the
  per-run route; or the load-time route found after a detour. **F:** `weight-not-read` ("Date or time"
  chosen counts here); `read-wrong` (4); Closer chosen (paths then ignore the number: same wrong routes); a total added by hand from a wrong
  route.

## T21. The list was updated

- **A (running club): first before, Farah (PageRank 0.0639); first now, Ava (0.0801).** The rest
  of the new top four: Farah 0.0656, Hana 0.0643, Ivan 0.0614. Still 20 people and 41 ties.
  Screens: Data page titled "Replace: friends-v2.csv", "Was 20 nodes, 41 edges; now 20, 41"
  (`final/T21/A/05.png`); after Load the PageRank row carries the out-of-date mark and its
  inspector the bar "Data changed since this run" with "Rerun" (`final/T21/A/06.png`); after Rerun
  the Values' Top 10 starts "Ava 0.08012" and the key reads 0.02872 to 0.08012
  (`final/T21/A/07.png`). The Replace page's "Higher means" shows "Not set" chosen, as the file's
  own weight has no meaning yet; nothing there needs choosing for this task.
- **B (team): 14 people now (and 21 ties; were 12 and 16); first before, Hal (0.1293); first now,
  Di (0.1339), then Hal 0.1305, Ed 0.1245.** "Replace: team-v2.csv", "Was 12 nodes, 16 edges; now
  14, 21" (`final/T21/B/05.png`); after Rerun, Top 10 "Di 0.1339" (`final/T21/B/07.png`).
- **Success path (A):** `--click "Data"`; `--rclick "friends.csv"` (the Sources row; its "..."
  menu works too); `--click "Replace with file..." --upload friends-v2.csv`; `--click "Load"`; `--click "Rerun"`
  (the run's inspector stays open through the replacement when it was open before; otherwise
  `--click "PageRank"`, the run row now marked out of date, comes first, and its absence or
  presence is not a deviation). "First before" is read from the Values before the replacement (or from the setup's
  open run).
- **Traps on this build:** after Load, the old colors stay on the drawing and the key keeps the old
  range (0.03779 to 0.06394) until Rerun: reading the top person then is `stale-read` (Farah, or
  Hal on B). "Edit source..." on the same row opens "Add to friends" and its Load doubles the ties
  (41 to 82, `check-notes-sources/05.png`): `added-not-replaced`. Control+O with friends-v2.csv
  goes to the same "Add to" page (not piloted). Opening friends-v2.csv as a new project and running PageRank again gives the right
  name but loses the earlier work: SD at best (`work-lost` if the participant claims the work was
  kept). On B the PageRank row still says 12 until Rerun.
- **Watch:** the replacement lays the drawing out again, so every node moves although the run, its
  colors and its layers stay. Record any participant who reads the moved drawing as lost work.
- **S:** replaced (counts as above), rerun, both names right (B: and 14 people). **SD:** right
  after a detour (an addition undone, a new project), or the rerun found only after a stale read
  that the participant caught. **F:** `stale-read`, `added-not-replaced` left in place, `false-done`.

## T22. Make the ones that meet a condition stand out

- **A (bus stops): 3 links take 10 minutes or more -- School to Harbor 12, Station to Harbor 14,
  Depot to Station 15.** Screen: inspector header "3 edges selected", Summary Edges 3, Selection 3,
  the three lines drawn with a gold band on the full map of 10 stops (`final/T22/A/06.png`).
- **B (Les Miserables): 13 ties of 10 or more shared chapters.** Inspector "13 edges selected",
  Selection 13, all 77 characters still drawn (`final/T22/B/05.png`); on the dense drawing the 13
  gold bands are thin, and several are hard to pick out in the middle.
- **Success path (A):** `--key /`; `--type "=minutes >= \`10\`"`(a gray line under the box reads
"Rule: press Enter to select matches");`--key Enter`; read the inspector header. B: `--type
  "=shared_chapters >= \`10\`"`. A bare number (`=minutes >= 10`) is refused with "Put numbers in
backticks: weight > `3`" under the box as it is typed, before Enter (`final/T22/A/03.png`): a
correction after it is not a detour, it is the path. A lone "=" lists the columns a rule can use
(B: id, name as node columns, shared_chapters as an edge column) with "Type a rule after =, such
as weight > `3`" (`final/T22/B/03.png`).
- **Other routes, graded by the end state:** clicking each line with Shift held (A: 3 lines; not
  checked on this build); a color on Everything's edges that separates exactly the 10-or-more ties.
  A filter step ("minutes is at least 10") narrows the drawing to the slow links and their stops (not
  piloted) but hides the rest; turned off again it leaves nothing marked.
- **Known on this build:** a selection of several edges lists no members: the inspector shows only
  counts, and its menu offers no way to select their ends. Clicking Everything (to put names on,
  say) keeps the selection: Selection still reads 3 and the lines stay marked. Record where the
  participant went to find `minutes` or `shared_chapters` (the "=" list, the Data page, an edge's
  values).
- **S:** the matching ties marked, everything else still drawn and no filter step on, and the count
  (3; 13) read from the screen. **SD:** the same after a detour (a filter first, then off; a wrong
  comparison corrected; a refused rule retyped), or the count read by counting marked
  lines. **F:** `hid-the-rest`, `not-marked` (a count from a filter with nothing marked at the end),
  a wrong count, `false-done`.
- **Measure:** the route (a rule in the box, Shift-clicks, a color, a filter), and whether the
  participant typed "=" without being shown it anywhere. The design defers a separate dialog
  for selecting by a condition until this task shows the need; graders record every place the
  participant looked for one.

## T23. Who is a step or two away

- **A (running club): 14 people besides Ava** -- Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan,
  Jada, Kofi, Quinn, Ravi, Sana, Theo. Left out: Lena, Milo, Nora, Omar, Pia. Screen: the neighbor
  list's header with Hops 2 and Follow All reads "14 nodes within 2 hops of Ava" with the 14 names
  under it, Selection 15; after "Filter to neighbors" the header chip reads "15 of 20 nodes" and 15
  dots are drawn (`final/T23/A/05.png`).
- **B (Florentine families): 11 families besides the Medici** -- Acciaiuoli, Castellani, Strozzi,
  Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati, Pazzi, Guadagni, Ginori. Left out: Peruzzi,
  Lamberteschi, Bischeri, Pucci. Header "11 nodes within 2 hops of Medici", Selection 12; chip "12
  of 15 nodes" (`final/T23/B/05.png`). The Florentine graph is undirected, so the list has no Follow row.
- **Success path (A):** `--key /`; `--type Ava`; `--key Enter` (selects Ava); `--key g` (the list
  opens at Hops 1, headed "Ava's 6 connections", `final/T23/A/03.png`; screenshot numbers depend on
  how the steps are grouped, so match the screen, not the number); `--click 2` (the Hops segment; the tool reports the name
  as shared with the button "Dev 2" in A and takes the segment); `--click "Filter to neighbors"`.
  On B, type Medici. A node's canvas menu "Neighborhood" and the Degree row's route open the same
  list.
- **Wrong answers:** 6 (one step only: Hops 1, on both datasets); on A, 6 with Follow Out (friends.csv
  loads directed, but running together goes both ways: `meaning-wrong`); 15 or 12 given as the
  count is right if the participant says it includes Ava or the Medici.
- **Other routes:** the Filters section's "+" with Keep "the neighbors of the selection" (not
  checked on this build); selecting the people one by one and counting. Graded by the end state.
- **Known on this build:** after the find box selects Ava, the drawing is framed off center with
  part of the graph off the canvas, as in T19; record any participant who reads it as people
  missing. At Hops 1 the list is a Neighbor / weight table sorted by weight; at Hops 2 it is a plain
  list of names; record any participant who reads the change as another feature.
- **S:** the count read from the screen and the drawing narrowed to exactly those people and the
  starting one (the chip). **SD:** right after a detour (Hops 1 first, a filter on an attribute
  undone), or counted by hand from the list. **F:** a wrong count, the drawing not narrowed, narrowed
  to the wrong set (one step), `false-done`.

## T24. One tie on the drawing

- **A (running club): Gus and Ivan ran together once (1).** Screen: a click on the line opens the
  edge inspector titled "Gus -> Ivan" with From Gus, To Ivan, weight 1, and the line drawn with a
  gold band (`final/T24/A/02.png`); its menu ("Edge actions") offers "Select endpoints"
  (`final/T24/A/03.png`), after which the inspector reads "2 nodes selected", Summary Nodes 2,
  "Edges joining these nodes 1", Selection 2, and Gus and Ivan are ringed (`final/T24/A/04.png`).
- **B (bus stops): 4 minutes.** Inspector "Station -> Stadium", From Station, To Stadium,
  minutes 4 (`final/T24/B/02.png`); after Select endpoints, Station and Stadium ringed, "2 nodes
  selected" (`final/T24/B/04.png`).
- **Success path (A):** `--click-at 755,586` (the middle of the Gus-Ivan line on the pilot's
  drawing; the tool prints `edge with id "13"`); read the inspector; `--click "Edge actions"`;
  `--click "Select endpoints"`. B: `--click-at 750,172` (the Station-Stadium line), then the same.
  The setups end with the Everything inspector open; the line click does not need it closed (no
  Escape first).
- **Other routes, graded by the end state:** typing Gus in the find box lists his ties as "Gus ->
  Ivan" among the results (B: "School -> Stadium", "Stadium -> Harbor", "Station -> Stadium",
  `final/T24/B/05.png`), which open the same inspector; selecting Gus and then Ivan with Shift
  held (S if both and only both are selected).
- **Known on this build:** the title's arrow is the file's direction, not a fact about the bus.
- **S:** the number (1; 4) read from the screen, and exactly the two ends selected at the end.
  **SD:** right after a detour (a missed click on the line, a wrong tie opened first), or the two
  selected one at a time after the ends command was not found. **F:** a wrong number (another tie
  read), more or fewer than the two selected, the number guessed from the line's look, `false-done`.
- **Measure:** whether the participant clicked the line itself, and how many tries the click
  took (a 1-pixel line is a small target).
