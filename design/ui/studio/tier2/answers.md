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

**Round 1's build, 16dcf3494700.** Round 1 runs on build 16dcf3494700 (`criteria.md`, first
line). Every task half was piloted on it from the start `roster.md` names, with screenshots in
`rounds/r1/pilot/<task><half>/` of this folder (for example `rounds/r1/pilot/T4A/07.png`). Every
value in this key agrees with those screens; where a screen differs (a click point, a cut label, a
note no longer true), the task's entry says so and cites the pilot. The `final/` walks started
from the earlier, unranked setups, while round 1's starts are ranked, colored and sized by
PageRank, so a `final/` drawing can look different from a session's even where the values agree.
Screenshot numbers depend on how the steps are grouped: match the screen, not the number.

**Tool faults seen in the round 1 pilots, not participant misses.** A click that times out
(`elementHandle.click: Timeout 3000ms exceeded`) with no change on screen is the tool's: it
happened once on a setup start (`lesmis-ranked.txt`, which still reached its end state) and once
on `--click "Degree"` (T12R A; the retry worked). Its cause is not traced. After two hovers in a
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
  "Leave out" chosen; the link shows line 24, `p11, p13, 6` (`final/T4/A/07.png`). After Load:
  header "From 2 files" and Overview Nodes 12, Edges 22 (the Graph page's Overview has no Sources
  row). On the Data page (a click on "Data") the Sources list has the source's row, with both
  tables under it; at the default panel width its name is cut to "people.csv and mess..." and its
  quiet text to "12 no..." (`rounds/r1/pilot/T4A/09.png`), and its tooltip gives only the name,
  "people.csv and messages.csv". So "1 row left out" never shows in the list. Selecting the row
  opens the source in the inspector: Added Nodes 12, Edges 22, "1 edge row was left out: it names
  a node missing from the node rows.", and the row itself, "p11, p13, 6", with no line number or
  column names (`final/T4/A/11.png`; `rounds/r1/pilot/T4A/12.png`). Choosing "Add" instead loads 13 nodes and 23 edges (p13 becomes a
  node with no name); either choice is correct if the participant says which row did not fit.
- **B (football team): 10 players and 17 passes arrived; passes.csv has 18 rows, and one
  (line 17, `s04,s11,3`: Dina Moss passes 3 times to s11) names s11, who is not in players.csv.** Data
  page: "10 node rows and 18 edge rows read; the load makes 10 nodes and 17 edges", "1 edge row
  names a node missing from the node rows", line 17, `s04, s11, 3` (`final/T4/B/07.png`); after
  Load: "From 2 files", 10 nodes, 17 edges; on the Data page the source's row is cut to
  "players.csv and pas... 10 nod..." and its tooltip reads "players.csv and passes.csv"
  (`rounds/r1/pilot/T4B/09.png`, `10.png`); the source's inspector lists "s04, s11, 3"
  (`final/T4/B/11.png`). The project is named "players", after the first file. With "Add":
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
- **After Load the left-out row is still on screen, but only in one place:** the source's
  inspector, opened by selecting the source's row on the Data page. The row's own quiet text,
  which would say "1 row left out", is cut before it at the default panel width, and hovering it
  shows only the name. A participant who loads without reading the report and then finds the row
  in the inspector is S; one who says everything arrived is `false-done`.
- **Note:** the people's names are an Attribute, not the label, by default; the drawing shows no
  names. Not part of the task; record any participant who stops to put names on.

## T17. Only the strong ties

- **A (running club): 19 of the 20 people are still in it, joined by 12 ties.** Theo is the one
  left out (none of his ties reaches 4). Screen: header chip "19 of 20 nodes"; the Filters row
  with its checkbox ticked, whose name is cut while the step is on: "weight is ... 20 to 19 nodes"
  (`rounds/r1/pilot/T17A/07.png`; hovering it shows "weight is at least 4"); the drawing shows 12 ties
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
  needs a distance", run straight on into "Source: Chloe" and then "Target: Milo" (the form's From
  and To), with the Weight select below (`final/T18/A/07.png`). The Graph tree row reads "Shortest path 4 hops". The tie
  numbers are runs together, not distances: a participant who sets them as a distance gets a
  different chain and is wrong for this task (`meaning-wrong`).
- **B (Florentine families): Strozzi, Ridolfi, Medici, Salviati, Pazzi -- 4 marriages, 3
  families in between; the only chain of that length.** Values as in A; Made with "Weight: none
  (each edge counts 1)", "Source: Strozzi", "Target: Pazzi" (`final/T18/B/07.png`). The sample has
  no weight column, so the Path popover shows no "Not read" line on B.
- **Follow-up answers:** A, Ben to Nora: not walked on this build; the follow-up prompt says the
  chain is unique and 4 ties long. B, Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi,
  Ginori, 5 nodes, 4 edges (`rounds/r1/pilot/T18B/10.png`; agrees with a hand count from the
  marriage list). The second run replaces the first: the Graph tree keeps one "Shortest path 4
  hops" row and the first chain is gone, so a participant who wants both must note the first.
- **Success path (A):** `--key p` (or a node's menu "Path between...", or Analyze, "Shortest
  path"); `--type Chloe --click "Chloe"` (the option); `--click "To" --type Milo --click "Milo"`;
  `--click "Find path"` (the run opens on its Values). Typing a name and pressing Enter in From moves
  on to To, and Enter in To moves focus to the Find path button; a second Enter or a click runs it
  (`rounds/r1/pilot/T18B/06.png`). Picking an option with a click leaves focus in From
  (`rounds/r1/pilot/T18A/04.png`). The pick buttons beside From and To also take a click
  on a node, but friends.csv and the Florentine sample draw no names by default, so a participant
  must name the people by typing or put names on first.
- **Known on this build:** the legend names the highlight "Shortest route (edges)" and "Shortest
  route (nodes)" (the element's layer names). In the Weight list of A, "weight (loaded, not read)"
  is listed but cannot be chosen (seen on e2ccec0e9304; round 1's pilot did not open the list). On
  the ranked starts the path's node color is an orange inside the PageRank colors, so the nodes on
  the chain cannot be told from the rest on the drawing; only the orange edges show it
  (`rounds/r1/pilot/T18A/07.png`, `T18B/07.png`). A chain read off the drawing with names on is
  still SD, as below, but record any participant misled by the node colors.
- **S:** names in order and the count (4 introductions, or 3 people between, or 5 people in the
  chain) read off the Values or the drawing with names on. **SD:** right chain after a detour, or
  read from the highlighted drawing with names put on. **F:** a longer chain, or a guess from the
  drawing with no names on screen (`not-run`).

## T19. Reminders that stay with the work

- **Success state (A): two notes in the Notes place, "Moving away in May; ask who takes over the
  Tuesday run" with the chip "Farah", and "Spring list, checked against the sign-up sheet" with
  the chip "Graph"; the project saved; after closing and reopening, both notes are listed again.**
  (`final/T19/A/09.png` before, `14.png` after reopening from Recent projects.) The inspector
  header of Farah reads "Node 1 note" (the type, then the link), and of the graph "From
  friends.csv 1 note" (B: "From Florentine families 1 note").
- **B:** the same with "Check the 1434 return from exile" on "Medici" and "Marriages only; business
  ties are a separate list" on "Graph" (`final/T19/B/09.png`, `14.png`); its project is saved as "Florentine families".
- **Success path (A):** `--key /` `--type Farah` `--key Enter` (selects Farah); `--key n`; `--type
"<text>"`; `--key Control+Enter`; `--key Escape --key Escape` (nothing selected: the next note is
  about the graph); `--key n`; type; `--key Control+Enter`; `--key Control+s`; `--click Save`;
  `--reopen`; click the project in Recent projects (`--click friends`; in B click-at 624,108, its
  row: the sample of the same name is also on the start screen; `--click "Florentine families"`
  reports the name as shared with the sample's button and takes the Recent projects row, which
  also works); `--click "Notes"`. The menus' "Add note" (a node's canvas menu,
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
- **Watch:** on A, after Find selects Farah, the drawing is framed so that the top of the graph is
  off the canvas, and it stays so through the notes and the save until the reopen refits it
  (`rounds/r1/pilot/T19A/02.png` to `11.png`). While the Save dialog is open, the drawing below
  the dialog's top edge is blank (`rounds/r1/pilot/T19A/10.png`); it is back after Save. After the
  reopen, the PageRank row in the Graph list shows no count (before the save it read 20, B 15),
  though the run's colors, sizes, key and values all come back
  (`rounds/r1/pilot/T19A/13.png`, `T19B/13.png`): the run is kept, so this is not `work-lost`.
  Record any participant who reads any of these as lost data.

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
  728,225, the box showing "Attribute"; 728,205 lands on the column's name above it,
  `rounds/r1/pilot/T20A/04.png`); `--click "Weight"`; under "Higher means", which starts on
  "Not set" with "paths ignore it; PageRank and communities read it as larger = closer" under it
  (`final/T20/A/06.png`), `--click "Farther"` (the line under it changes to "smaller = closer"; the
  summary above still reads "Weight: minutes" until Load); `--click "Load"`; `--key p` (the Path
  popover's Weight starts on "minutes (farther, loaded)"); From Depot, To Harbor as in T18;
  `--click "Find path"`. B: trails.csv, the km column's role box at the same point, 728,225.
- **Numbers beside the route:** the Graph tree row reads "Shortest path 4 hops"; 4 given as the
  minutes is `read-wrong`.
- **The "Date or time" role:** the minutes column's role list offers "Date or time" beside
  "Weight" (`final/T20/A/05.png`). Chosen for minutes, the file loads with no weight and the path
  run counts links: Depot, Station, Harbor, no total, Made with "Weight: none (each edge counts 1)"
  (walked as "Time" on build ca8b3b916c22, `preflight/T20A-time/13.png`). It is `weight-not-read`.
- **The per-run route:** opened from "Open project or file..." the file loads straight in with no
  weight: no "Loaded weight" row in the Overview. (The Data page cannot tell the routes apart: even
  after the load-time route it names no weight, `rounds/r1/pilot/T20B/15.png`.) The Path popover's
  Weight list then offers "minutes (farther)", which gives the right route and total
  (`T20A-open/05.png`), but only for that run. **Grade it SD**: the route is right, but the task
  asked that every calculation treat minutes as a length, and the next calculation would not.
- **S:** the load-time route, the right stops in order and the total, and the participant points
  to "Loaded weight minutes (farther)" or Made with "Weight: minutes (farther)". Made with also
  holds a Weight select reading "minutes (farther, loaded)" (`rounds/r1/pilot/T20A/14.png`); it is
  part of Made with, so pointing to it counts.
- **Direction on B:** "As the file says" loads trails.csv directed, so each trail is followed only
  from its first column to its second. The right route survives because every trail on it points
  toward the Summit; a participant who sets the graph undirected gets the same route. **SD:** the
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
  14, 21" (`final/T21/B/05.png`); after Rerun, Top 10 "Di 0.1339" (`final/T21/B/07.png`). Between
  Load and Rerun the two new people, Mo and Nia, are drawn in the default color and size, with no
  PageRank color, and the drawing is laid out again (`rounds/r1/pilot/T21B/06.png`): the visible
  sign of the out-of-date run.
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
correction after it is not a detour, it is the path; Enter on a refused rule changes nothing. A lone "=" lists the columns a rule can use
(A: id as a node column, minutes as an edge column; B: id, name as node columns, shared_chapters
as an edge column; the PageRank values are not listed) with "Type a rule after =, such as weight >
`3`" (`final/T22/B/03.png`). A rule that is accepted clears the box after Enter, so the rule is
not on screen at the end (`rounds/r1/pilot/T22A/06.png`).
- **Other routes, graded by the end state:** clicking each line with Shift held (A: 3 lines; not
  checked on this build); a color on Everything's edges that separates exactly the 10-or-more ties.
  A filter step ("minutes is at least 10") narrows the drawing to the slow links and their stops (not
  piloted) but hides the rest; turned off again it leaves nothing marked.
- **Known on this build:** a selection of several edges lists no members: the inspector opens on
  its Values with a Summary whose only row is the edge count, and its menu offers no way to select
  their ends. Clicking Everything (to put names on,
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
- **Known on this build:** after the find box selects Ava (B: the Medici), the drawing shifts but
  stays on the canvas (`rounds/r1/pilot/T23A/04.png`, `T23B/03.png`). On A, Hops 1 is a Neighbor /
  weight table sorted by weight and Hops 2 a plain list of names; record any participant who reads
  the change as another feature. On B (no weights) both are plain lists, Hops 1 alphabetical, and
  `--click 2` is not ambiguous. After "Filter to neighbors" the PageRank row is marked out of date
  ("PageRank, out of date", tooltip "What it ran on changed since this run") and still reads 20
  (B 15), though only the drawing narrowed; the drawing is not refit, and the button shows no "on"
  state (`rounds/r1/pilot/T23A/07.png`, `T23B/07.png`). The ranking is not stale for this task:
  record any participant who reruns it or reads the mark as a problem.
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
  `--click "Select endpoints"`. B: `--click-at 753,258` (the middle of the Station-Stadium line on
  the ranked start `bus-stops-ranked-names.txt`; the tool prints `edge with id "15"`,
  `rounds/r1/pilot/T24B/04.png`), then the same. The B point 750,172 in the `final/` walk was on
  the unranked drawing and misses the line on round 1's start. After the line click the
  Selection row reads 1 and the inspector opens on its Values; the Summary counts after Select
  endpoints are the same on B as on A.
  The setups end with the Everything inspector open; the line click does not need it closed (no
  Escape first).
- **Other routes, graded by the end state:** typing a name in the find box lists only that node,
  not its ties (B: "Stadium", `rounds/r1/pilot/T24B/07.png`; A not re-walked), and typing the
  inspector's title ("Station -> Stadium") finds nothing (`08.png`). Typing the number does list
  ties: on B, "4" lists the four ties of 4 minutes, Station to Stadium among them, with "Select
  where minutes is 4 (4)" (`10.png`); their titles use an arrow character, not "->". A tie opened
  from there shows the same inspector. Selecting Gus and then Ivan with Shift held is another
  route (S if both and only both are selected).
- **Known on this build:** the title's arrow is the file's direction, not a fact about the bus.
- **S:** the number (1; 4) read from the screen, and exactly the two ends selected at the end.
  **SD:** right after a detour (a missed click on the line, a wrong tie opened first), or the two
  selected one at a time after the ends command was not found. **F:** a wrong number (another tie
  read), more or fewer than the two selected, the number guessed from the line's look, `false-done`.
- **Measure:** whether the participant clicked the line itself, and how many tries the click
  took (a 1-pixel line is a small target).

## T12R. One person and who they are tied to, for a returning user

Graded with tier 1's key (`../answers.md`, T12): the same names, counts and grades. What differs
on build 16dcf3494700 from the ranked starts (`rounds/r1/pilot/T12RA/`, `T12RB/`):

- **The path is 5 steps** (no sample to open): `--key /`; `--type Javert` (B: Medici); `--key
  ArrowDown`; `--key Enter`; `--click "Degree"` (the row's name is "Degree 17", B "Degree 6").
- **The node's values:** the section is headed "Summary" (not "Summary values"), with id, name, a
  "Results" subheading, PageRank "0.0303, #5 of 77" (B "0.1458, #1 of 15") and "Degree 17 >"
  (B "Degree 6 >"). Either PageRank or the degree is a fact read.
- **The Degree row opens the Neighborhood view:** the panel's header becomes the name over
  "Neighborhood", with a Hops 1/2/3 switch and "Filter to neighbors" above the list "Javert's 17
  connections" ("Medici's 6 connections"), and the neighbors are selected (Selection 18; B 7).
  Neither sample is directed, so there is no Follow control. Nothing in the panel leads back to
  the Summary; selecting the node again does.
- **The ranked starts draw no names,** so the dots cannot be matched to names on the drawing: the
  names come from the list, and a route by clicking dots one at a time is not workable by name.
