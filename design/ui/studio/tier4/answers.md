# Tier 4 answer key (graders and pilots only)

Never shown to participants. Each task: its success definition, the success path, and what the
final screen, the end-state records or the saved file must show. Paths name controls as the
frozen build (a53beb7179) draws them. The dry run read every value and path off the earlier build
0ffeae2ef5, the re-pilots re-read the changed ones off 037e96e9bb, ff17391bb1, bccf8fe47f and then
a53beb7179, and each change is logged in `criteria.md`. A note naming an earlier build that no later
note replaces still holds on a53beb7179. Each core task's path step count is written as "Path steps: N"
(bar 7).

On 0ffeae2ef5 and 037e96e9bb, `real.mjs --end` writes `work.json`, `key.json` and `styles*.json` but no
`data.json`, and none of those records a column's kind or role, a filter card or a fix. Until
`data.json` exists, everything this key grades "from `data.json`" is read from the screenshots and
the step log: a column's kind from its table header glyph (calendar for date, `Aa` for text), a
role from Data > Fields, a card from Data > Filters.

## Facts no briefing may hold

- `P13` -- the site that is only in deliveries.csv (T61 A, T66 A)
- `G12` -- the gauge that is only in flows.csv (T61 B, T66 B)
- `Bayview Clinic` -- T62 A's answer
- `Birch Hollow` -- T62 B's answer
- `Harbor Market` -- T64 A's answer
- `Old Bridge` -- T64 B's answer
- `Library Annex` -- the site whose families count is "n/a" (T67 A)
- `Stone Weir` -- the gauge whose depth is "-" (T67 B)
- `5` and `3` -- T65 B's counts (gauges in the picture, gauges marked)

## The files

- `pantries.csv`: 12 sites P01-P12 with `site`, `zip` (leading zeros), `opened` (ISO days),
  `lat`, `lon`, `families` (P07 Library Annex holds `n/a`), `volunteer_run` (`Y`/`N`); P06's site is
  " Northgate Center" with two leading spaces.
- `deliveries.csv`: 19 rows `from,to,trips`. `P05,P13` names a site not in pantries.csv; `P03,P10,6`
  appears twice.
- `gauges.csv`: 11 gauges G01-G11 with `station`, `code` (leading zeros), `installed` (ISO days),
  `lat`, `lon`, `depth_cm` (G07 Stone Weir holds `-`), `telemetry` (`yes`/`no`); G06's station is
  " Willow Run" with two leading spaces.
- `flows.csv`: 15 rows `from,to,km`. `G09,G12` names a gauge not in gauges.csv; `G03,G04,2.1`
  appears twice.

As loaded on 0ffeae2ef5 and 037e96e9bb: `opened` and `installed` are read as text (header `Aa`); the inspector's
Overview shows "Time: opened" (B "Time: installed") with a "Set in Data" button before any time is
set, and that button sets the time in place; `lat` and `lon` are designated Latitude and Longitude
by themselves under Fields (the table does not mark them); no Label is designated (the columns are
`site` and `station`); `zip` and `code` are read as text and keep their zeros; the table shows
warnings on `families` / `depth_cm` and `site` / `station`. The T62 setups open with the table
showing.

## T60. From a web address

- **Success**: the network is open from the web address (the Sources row is the address's file,
  with the link glyph) and the participant reports the counts. A: **24** nodes (people and
  organizations) and **59** edges. B: **331** genes and **361** interactions.
- **Path**: start screen > Open network data > the box "Web address of a graph file" > paste the
  address > Enter. The box has no Open button; Enter is the only way to open the address (the icon
  button after the box, "Choose file", opens the file chooser). The graph opens; the inspector's
  Overview shows Nodes and Edges. On 0ffeae2ef5 and ff17391bb1 the source's inspector shows a
  file glyph and "Source", not the address; the Sources row has the link glyph.
- **Also success**: from inside a project, Data > Sources "+" (Add source) > Network data... > the
  same box > Enter, if the counts reported are the loaded network's (that route leaves the project
  named "Untitled"). Sources "+" > Server... is not this route: it is a dead end (below). The empty project's canvas card ("No nodes to draw") offers only File... and
  Samples...; neither reaches an address, so a session that starts there must find Data > Sources
  "+" > Network data....
- **Not success**: a downloaded copy opened with "Open a file" (the prompt forbids it); counts that
  do not match.
- **Dead ends on 0ffeae2ef5 and a53beb7179** (a session that stops there is F, not P): Sources "+" >
  Server... and the start screen's Web API card open a Server form on which no Kind loads a file
  address (Test and Load stay dimmed, with no tooltip saying why; on a53beb7179, Kind Web API with
  the address in Endpoint, Enter does nothing); an address typed without `https://` does nothing;
  the main menu has no door to an address. On a53beb7179, Control+V in the main menu's find box,
  in a browser that denies clipboard reading, shows the browser's own error ("Paste failed: ...
  Read permission denied.").

## T61. Two spreadsheets as one network

- **Success**: one network with both files' records (Sources lists both files), and the report
  says A: **13** sites (12 from the list and one, **P13**, only in the route list) and **18**
  routes; something did not fit: P13 is not on the site list, and one route is listed twice. B:
  **12** gauges (11 and **G12**) and **14** stretches (read off `gauges-joined.txt`'s first
  screenshot); G12 is not on the gauge list and one stretch is listed twice. Reporting 12 sites (11
  gauges) plus the one unknown is equally right. On 0ffeae2ef5 and 037e96e9bb the repeat can be read only on the
  join screen, before Join (a warning glyph beside the "1 repeated key" menu); after Join, the
  issue list names only "1 unknown end" and Overview has no repeated-edge line.
- **Follow-up** (fix coverage for the source row's counts, not graded): A **18** routes, B **14**
  stretches, on the second file's Sources row. On 0ffeae2ef5 the row's issue chip is drawn over the
  edge count (A reads as a slash, a glyph and "8"; B's 14 is hidden), so the count is readable only
  in the row's hover tooltip ("13 nodes, 18 edges"; B "12 nodes, 14 edges"); the row's accessible
  name says "17 of 19 rows joined" (B "13 of 15"). On 037e96e9bb and ff17391bb1 A's 18 reads whole on the row,
  beside a node count of 13 and an issue chip "1"; the tooltip still reads "13 nodes, 18 edges", and
  the row's file name is cut to "d.." (B's row was not re-walked on this build).
- **Path**: start screen > Open a file > pantries.csv (opens 12 nodes) > Data > Sources "+" (Add
  source) > File... > deliveries.csv > the join screen ("Join deliveries.csv -> pantries.csv",
  Edges, from = Id, to = Id; chips "18 edges added", "1 new node", "1 not in graph", and "1
  repeated key" drawn as a warning glyph and a menu) > Join. Overview: Nodes 13, Edges 18, "From 2
  files". B the same with gauges.csv and flows.csv: "Join flows.csv -> gauges.csv", chips "14
  edges added", "1 new node", "1 not in graph", "1 repeated key"; Overview Nodes 12, Edges 14.
  Path steps: 6.
- **Detour that still succeeds**: opening deliveries.csv first and pantries.csv second (Data >
  "+" > File...), if the end network has both. On 0ffeae2ef5 through a53beb7179 that order gives A 13 nodes and **19**
  edges with "1 repeated edge" listed (the repeat is kept); those counts are that network's own and
  count as right. Main menu > Open project or file... and dropping the file on the open network
  open the same join screen.
- **Not success**: two separate projects; the second file opened with Replace, so only one table
  is in the network. On 0ffeae2ef5 through ff17391bb1 Replace (the Join split button's, or the
  source row's "Replace with file...") keeps the first file's columns and gives the same counts as
  a join (A 13 / 18, B 12 / 14); only the Sources list, which then holds the second file alone,
  shows it. With "Replace pantries.csv" chosen, the join screen's header still reads "Join
  deliveries.csv -> pantries.csv", and after Replace the Undo notice names the file that replaced,
  not the one replaced.
- **A second door**: on 0ffeae2ef5, Quick actions (Control+K) > Add data... opened an older "Add
  to" page whose default left G12 and its stretch out (B: 11 nodes, 14 edges) and showed no unknown
  gauge afterwards; a report of 11 and 14 that names nothing that did not fit was P. On 037e96e9bb
  and ff17391bb1 it opens the same join screen as the path, and Join gives the path's result (A 13 nodes, 18 edges,
  both sources): graded as the path.
- **Separate graph on 037e96e9bb**: the join screen's "Open as a separate graph" (or Control+O with
  a network open) makes a second project from deliveries.csv alone (13 nodes, 19 edges, "1 repeated
  edge"): two separate projects, not success. On ff17391bb1 that new project still shows the old
  project's last notice (for example "Undid replacing deliveries.csv."). Replace leaves the issue
  chip at 2, attributed to the second file.

## T62. Read the wrong way

- **Success**: the `opened` (B `installed`) column's kind is a date (its table header shows the
  calendar glyph), and the participant names **Bayview Clinic** (opened 2023-03-08; B **Birch
  Hollow**, put in 2018-06-27). Designating it as the time while its kind stays text is P: that is
  T63's act, and it leaves the column kind untested. Designating the time does not change the
  kind: after the inspector's "Set in Data" or Data > Fields "+" > Time > opened, the header keeps
  `Aa`. On 0ffeae2ef5 the cells then drew as dates; on 037e96e9bb they stay ISO text
  ("2023-03-08") under a "Time" chip on the header, and a header click sorts "A to Z" / "Z to A".
  Either way the ISO days sort in date order, so the right name can come out on top. Those routes
  are P (a false success on screen; grade by the header glyph).
- **Path**: the table (already showing at the start) > the `opened` header's menu (its "Options
  for opened" button, or right-click on the header: A's right-click opens the menu, B's does
  nothing on 037e96e9bb and ff17391bb1) > Type > date; then sort newest first (the
  header menu's "Sort descending", or the header clicked twice) and read the top row. The menu calls
  the kind "Type" (text, number, yes/no, date, category); the caption then reads "newest first"
  (A: "Sorted by opened, newest first", top row P12 Bayview Clinic, Mar 8, 2023). After "date" the
  caption stays "In the order loaded" until the first header click ("oldest first"); the second
  gives "newest first" (B: Birch Hollow, Jun 27, 2018 on top). No control in the Data place sets a
  column's kind on this build. Path steps: 5.
- **On 037e96e9bb**: B's `installed` header lies past the table's right edge at 1440 px; a
  right-click on it did nothing, and the first click on "Options for installed" only scrolls the
  table to it, the second opens the menu. By keyboard the Options button is not a Tab stop: the
  menu opens from the focused header with the menu key (Shift+F10 in the T62 pilots, the
  ContextMenu key or Alt+ArrowDown in T67's), which nothing on screen names.
- **Not success**: the right name read off by eye with the column still read as text.

## T63. Where and when

- **Success**: the time is designated as `opened` (B `installed`), and the report names `lat` and
  `lon` (or latitude and longitude) for where and `opened` (B `installed`) for when. The place is
  designated by the program at load (Latitude `lat`, Longitude `lon`), so leaving it is right; only
  the report shows whether the participant knows it. The time set but the place not named is P.
- **Also reported** (not graded): whether the participant opened Fields to check the place.
- **Path**: the inspector's Overview "Set in Data" (on 0ffeae2ef5 and ff17391bb1 it sets Time = `opened` in place:
  Fields does not open, nothing is announced, and the "Time: opened" row leaves the Overview); or
  Data > Fields "+" > Time > opened (B: expand gauges.csv first); or the table's `opened` header
  menu > Role > Time (on 037e96e9bb and ff17391bb1, Control+Z undoes it with "Undid changing a
  column's role."). On 037e96e9bb the table marks neither `lat` nor `lon` (only `opened` gets a
  "Time" chip), and the Map layout's options show "Location lat, lon" on a button that does
  nothing; on ff17391bb1 Escape then closes the options with Map not applied. On ff17391bb1 Fields
  "+" > Time adds an empty Time line with its list open; Escape takes the empty line back without
  a notice, and choosing opened sets the time.
- **Not success**: the time left undesignated; a column changed to the wrong kind.

## T64. Its name, and what makes a tie strong

- **Success**: the node label is `site` (B `station`): the inspector and find name P05 as **Harbor
  Market** (B G05 **Old Bridge**), and the edge weight is `trips` (B `km`), with its reading set: A
  higher means closer (more trips, a stronger tie), B higher means farther. The participant reports
  the name.
- **Path**: Data > Fields (pantries.csv) "+" (Add to node fields) > Label > site; Data > Fields
  (deliveries.csv) "+" (Add to edge fields) > Weight > trips, "Higher means" (accessible name
  "Higher weight means"; options closer, farther, capacity) > closer (B: farther). B's gauges.csv
  group starts collapsed: Expand gauges.csv first. Check: the Graph place's find box (Control+F)
  "P05", or click it; the canvas toolbar's search (Quick actions) answers "No results" for a node.
  B path steps: 9.
- **Weight set from the table**: the trips (B km) header menu > Role > Weight sets the weight but
  leaves "Higher means" empty. On 0ffeae2ef5 Analyze then read it as farther. On 037e96e9bb Analyze
  does not read it at all: Shortest path opens on Weight None ("Each edge counts as 1"), lists the
  column as "trips (loaded, not read)" (B "km (loaded, not read)") and counts steps. The reading is
  not set, so this route is P on both A and B until "Higher means" is set in Data > Fields.
- **The Analyze list on 037e96e9bb and ff17391bb1**: Shortest path's Weight list offers the column
  with its reading ("km (farther)") for that run only; Fields keeps no weight, so a run weighted
  there with no weight set in Data is P. With the weight set in Data, PageRank opens on it ("trips
  (closer, loaded)"). Shortest path reads only a "farther" weight: B opens on "km (farther)"; A,
  with "closer" set, opens on None, lists "trips (closer, loaded, not read)" and shows why it is not
  read. A's path on None is right for A: grade on Data > Fields. On 037e96e9bb a second run with
  the same ends kept the first run's result even after the reading changed, and the path result
  listed nodes by code (G05, G08, G09). On ff17391bb1 a run asked again after the weight's reading
  changed computes a new result, and the path result lists nodes by name once the label is set.
- **Not success**: a Style text line that draws the name but leaves the label unset is half (P):
  the program still names the site by its code elsewhere.

## T65. Only some in the picture, and some marked

- **Success**: two filter conditions on, in either order. A: one keeps trained and hours at least
  10 -- **14 of 24** visible; one selects role staff -- **4** selected, none hidden by it. B (start
  `gauges-tidy.txt`: Stone Weir's depth blank, `installed` read as dates): one keeps telemetry yes
  and depth_cm at least 70 -- **5 of 12** visible (G01, G02, G04, G09, G11); one selects installed
  before 2005 -- **3** selected among those in the picture (G01, G02, G09).
- **Selected count**: a Select card selects only what is in the picture, so A reads "4 nodes
  selected" with 4 rings, and turning the keep card off selects the fifth staff member again.
  (Builds 0ffeae2ef5 and 037e96e9bb selected over the whole graph: 5 for A, 5 for B. ff17391bb1
  and bccf8fe47f select only what is in the picture: 4 for A, 3 for B.)
- **Card counts**: from 71230abff1 on, the Select card's chip counts what it marks, among what the
  keep card leaves in the picture: A's role card reads **4 of 14** with "4 nodes selected", B's
  installed card **3 of 5** with "3 nodes selected", in either order, and a screen reader hears
  "Node 3 of 5" for B's card. With A's keep card off, the role card reads 5 of 24 and selects 5;
  on again, 4 of 14 and 4. The keep card reads 14 of 24 (A) and 5 of 12 (B), and the top bar reads
  14 of 24 (A) and 5 of 12 (B). On a53beb7179 and every earlier build the Select card's chip counted
  over the whole graph (A 5 of 24, B 5 of 12) while 4 (B 3) were selected.
- **Path**: Data > Filters "+" (Add filter) > trained > Yes; on that card "Add a condition" >
  hours > Between, "from" 10 (the "to" stays 52) > Enter. A new card starts on Hide, so this one
  needs no Select / Hide step (14 of 24). Add filter > role > staff ("Is any of"); switch that
  card from Hide to Select (left on Hide it leaves 4 of 24 in the picture). Order free: the other
  order gives the same 14 of 24 and 4 selected. Path steps: 12 (A).
- **B on 0ffeae2ef5**: the first half matched (one card, telemetry yes and depth_cm Between 70 to
  210, Hide: 5 of 12). The second half could not be built: `installed` was offered as text, so
  "before 2005" had no condition. B was blocked on that build.
- **B with date conditions (037e96e9bb)**: Filters "+" lists
  `installed` with the calendar glyph; its card opens on Before with the box focused. **Path**:
  Add filter > telemetry > Yes; Add a condition > depth_cm > "from" 70 > Enter; Add filter >
  installed > type 2005 > Enter (3 of 12 while it hides); switch that card to Select. The screen
  reads **5 of 12** nodes and **"3 nodes selected"**: G01, G02 and G09, the gauges in the picture put
  in before 2005; a screen reader hears 3. Path steps: 12 (B). The same Before 2005 in a
  style layer's Which nodes keeps 5 of 12 nodes ("installed before 2005, 5 nodes"). On 037e96e9bb
  through a53beb7179 the collapsed date card reads "installed is at most 1104537599999" (a raw number for the end of
  2004), not "before 2005"; that wording is the build's, and the card is right.
- **Also success**: two separate keep cards (trained; hours) instead of one card with two fields.
- **Not success**: a style layer that colors them while everyone stays; a selection made by
  clicking nodes one by one (counted P if the counts are right).
- **Follow-up**: success says the order makes no difference (the counts are the same either way).

## T66. Only what is on your own list

- **Success**: a filter condition leaves out P13 (B G12) and the network still holds it: **12 of
  13** visible (B **11 of 12**). Either a Data source card (pantries.csv, keep) or a card on `site`
  (B `station`) "Has a value" with Hide is right.
- **Path**: Data > Filters "+" (Add filter) > Data source > tick pantries.csv (the card keeps what
  came from it). On 0ffeae2ef5 that card also leaves out every edge from deliveries.csv: the screen
  reads "12 of 13 nodes, 0 of 18 edges" (B "11 of 12 nodes, 0 of 14 edges"), and ticking the second
  file brings P13 back. The site / station "Has a value" card gives 12 of 13 (B 11 of 12) and keeps
  the other edges (A 17, B 13). Both count; the edge loss is the build's defect. On builds after
  009087a540 the Data source card keeps every edge whose two ends it keeps: the screen reads "12 of
  13 nodes, 17 of 18 edges" (B "11 of 12 nodes, 13 of 14 edges"), the routes stay drawn, and the
  card's own chip counts nodes only ("12 of 13"); ticking the second file shows 13 of 13 and 18 of
  18 (B 12 of 12 and 14 of 14). 037e96e9bb, ff17391bb1 and 79ed770292 are such builds; with both files ticked
  the top bar reads "13 of 13 nodes" (B "12 of 12 nodes") with no edge count, and only the
  inspector shows 18 of 18 (B 14 of 14). The card's effect control reads "Select | Hide", with Hide
  on.
- **A card on the id cannot leave one node out on 0ffeae2ef5, 037e96e9bb or ff17391bb1**: the id card offers
  only Contains, Starts with, Ends with and Is exactly (the `site` / `station` card adds Has a value
  and Has no value), and Hide hides what does not match, so an id card for P13 with Hide leaves P13
  alone in the picture (1 of 13, 0 of 18 edges; B 1 of 12, 0 of 14). That is not success. On 037e96e9bb the table's id
  column menu "Filter to..." does nothing; on `site` it adds a card.
- **A style layer that hides the node** (Which nodes: Node id contains P13, Visibility Hidden) is
  not a filter card: not success. On 037e96e9bb B's G09 -> G12 stretch stays drawn, and the canvas
  key reads "Show: Layer 1, 1 of 12 nodes".
- **Not success**: removing deliveries.csv from Sources (it deletes the routes); deleting the node.
  One deletion looks like success by its number: the second file's Sources row issue chip opens
  its issue list ("Issues in flows.csv": 1 unknown end, with Add nodes, Leave out and Ignore), and
  on a53beb7179 Leave out (no tooltip) deletes G12 and its G09 -> G12 stretch: the inspector's Full
  graph reads Nodes 11 and Edges 13, the flows.csv row reads 11 and 13 with 0 issues, and the top
  bar has no "of" count. A report of 11 from that route is not success; grade on the top bar
  ("11 of 12") and the inspector, not the number. Undo restores both. Walked on B; A's
  deliveries.csv chip lists the same unknown end.

## T67. What looks wrong, put right

- **Success**: the participant finds the program's issues and applies the offered fixes. A: the
  source row's chip "2 issues in pantries.csv": `families` "1 not a number" (Library Annex, `n/a`)
  made blank; `site` padded spaces (Northgate Center) trimmed. B: the chip "3 issues in
  gauges.csv": `depth_cm` "1 not a number" (Stone Weir, `-`) made blank; `station` "1 value with
  padded spaces" (Willow Run) trimmed; `telemetry` "11 values could be yes/no" (Read as yes/no).
  B's "With issues 11" in the table counts every row because of the yes/no suggestion. Making
  blank and trimming is success on B; reading telemetry as yes/no as well is also success, and
  leaving it is not a failure. The table shows no warning left on the fixed columns, and the report
  names what was found.
- **Path**: Data place (already showing at the start) > the source row's issues chip > the issue
  list > Make blank > Trim. Path steps: 3 (B: 4 with Read as yes/no). The table's header warning
  marks open a one-line list with the same fixes (Make blank, Ignore, Show rows, Ignore all).
- **Also success**: B `depth_cm` header menu > Type > number, which also clears the depth issue.
  On 0ffeae2ef5 the program offers nothing for A's `volunteer_run` Y/N: no issue names it.
- **Not success**: editing values by hand outside the program; reporting without changing.

## T68. Sending it on

- **Start**: `pantries-narrowed.txt` (B `gauges-narrowed.txt`): both lists together, with a Data
  source card on that leaves P13 (B G12) out of the picture, the state T66 leaves. On 0ffeae2ef5
  that card also leaves out every edge, so the start shows A 12 of 13 nodes and 0 of 18 edges (B 11
  of 12 and 0 of 14). On builds after 009087a540 the start shows A 12 of 13 nodes and 17 of 18
  edges (B 11 of 12 and 13 of 14), with the routes drawn.
- **Success**, A: `downloads/` holds the node table and the edge table as CSV (one file each, or a
  zip of both), the node file with **13** rows including P13 and the `site` column, the edge file
  with 18 (headers `source,target,trips`, not the person's `from,to,trips`). B: `downloads/` holds a
  `.graphml` file with **12** nodes and **14** edges. Equally right: the files hold only what is in
  the picture AND the export screen said what is not included AND the participant reports it. On
  0ffeae2ef5 the picture holds no edges, a "Shown" export writes 12 nodes (B 11) and an edge file
  with no rows (B no edges), and the export screen's scope and chip count nodes only, so it never
  says the edges are left out: such an export is not the equally-right case. On 037e96e9bb the
  edges table's scope reads "Shown 17 of 18" and the export writes those 17 edges (P13's route left
  out), and the node scope reads "12 of 13": the screen says what is left out, so a Shown export
  the participant reports is the equally-right case.
- **Severity 4 candidate**: a file short of rows with no sign on screen that rows were left out.
  Seen on 0ffeae2ef5: the Shown edge export above, and a GraphML exported from a source row (scope
  "gauges.csv 11": 11 nodes, 0 edges, no warning), whose scope then sticks for Control+E.
- **Other doors on 037e96e9bb and ff17391bb1**: the source row's Export... opens on scope
  "pantries.csv 12 of 13" with a "12 of 13" chip; the table options' Export... opens on "All 13".
  Each CSV export passes "Styles lost in CSV" with Save anyway. B: the gauges.csv row's Export... >
  GraphML writes 11 nodes and 0 edges at once (no Save anyway step); its scope line says "0 of 14
  edges", but the file holds neither the network nor what is in the picture (13 edges), so it is
  not success. The flows.csv row's Export... and the table options' Export... write 12 nodes and 14
  edges after Save anyway: success.
- **Path**: main menu (or Control+E) > Export, which opens on Data with Format CSV. A: Table Nodes,
  scope All 13 > Export > "Styles lost in CSV" > Save anyway; then Table Edges > Export > Save
  anyway. B: Format > GraphML (the scope reads "All 12 nodes, 14 edges") > Export > "Styles lost in GraphML" > Save anyway (a step the export
  always adds while a node is out of the picture). The tool writes the saved file into the
  session's `downloads/` and prints its path; the screen's notice gives only the file name.
- **Not success**: a saved project (`.graphty.json`) or an image only. Control+S with a `.graphml`
  name saves the project in the browser and writes no file.
