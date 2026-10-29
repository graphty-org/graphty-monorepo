# Tier 4 answer key (graders and pilots only)

Never shown to participants. Each task: its success definition, the success path, and what the
final screen, the end-state records or the saved file must show. Paths name controls as the
frozen build (0ffeae2ef5) draws them; the dry run read every value and path off that build and
logged each change in `criteria.md`. Each core task's path step count is written as "Path steps: N"
(bar 7).

On 0ffeae2ef5, `real.mjs --end` writes `work.json`, `key.json` and `styles*.json` but no
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

As loaded on 0ffeae2ef5: `opened` and `installed` are read as text (header `Aa`); the inspector's
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
  Overview shows Nodes and Edges. On 0ffeae2ef5 the source's inspector shows a file glyph and
  "Source", not the address; the Sources row has the link glyph.
- **Also success**: from inside a project, Data > Sources "+" (Add source) > Network data... > the
  same box > Enter, if the counts reported are the loaded network's (that route leaves the project
  named "Untitled").
- **Not success**: a downloaded copy opened with "Open a file" (the prompt forbids it); counts that
  do not match.
- **Dead ends on 0ffeae2ef5** (a session that stops there is F, not P): Sources "+" > Server... and
  the start screen's Web API card open a Server form on which no Kind loads a file address (Test
  and Load stay dimmed); an address typed without `https://` does nothing; the main menu has no
  door to an address.

## T61. Two spreadsheets as one network

- **Success**: one network with both files' records (Sources lists both files), and the report
  says A: **13** sites (12 from the list and one, **P13**, only in the route list) and **18**
  routes; something did not fit: P13 is not on the site list, and one route is listed twice. B:
  **12** gauges (11 and **G12**) and **14** stretches (read off `gauges-joined.txt`'s first
  screenshot); G12 is not on the gauge list and one stretch is listed twice. Reporting 12 sites (11
  gauges) plus the one unknown is equally right. On 0ffeae2ef5 the repeat can be read only on the
  join screen, before Join (a warning glyph beside the "1 repeated key" menu); after Join, the
  issue list names only "1 unknown end" and Overview has no repeated-edge line.
- **Follow-up** (fix coverage for the source row's counts, not graded): A **18** routes, B **14**
  stretches, on the second file's Sources row. On 0ffeae2ef5 the row's issue chip is drawn over the
  edge count (A reads as a slash, a glyph and "8"; B's 14 is hidden), so the count is readable only
  in the row's hover tooltip ("13 nodes, 18 edges"; B "12 nodes, 14 edges"); the row's accessible
  name says "17 of 19 rows joined" (B "13 of 15").
- **Path**: start screen > Open a file > pantries.csv (opens 12 nodes) > Data > Sources "+" (Add
  source) > File... > deliveries.csv > the join screen ("Join deliveries.csv -> pantries.csv",
  Edges, from = Id, to = Id; chips "18 edges added", "1 new node", "1 not in graph", and "1
  repeated key" drawn as a warning glyph and a menu) > Join. Overview: Nodes 13, Edges 18, "From 2
  files". B the same with gauges.csv and flows.csv: "Join flows.csv -> gauges.csv", chips "14
  edges added", "1 new node", "1 not in graph", "1 repeated key"; Overview Nodes 12, Edges 14.
  Path steps: 6.
- **Detour that still succeeds**: opening deliveries.csv first and pantries.csv second (Data >
  "+" > File...), if the end network has both. On 0ffeae2ef5 that order gives A 13 nodes and **19**
  edges with "1 repeated edge" listed (the repeat is kept); those counts are that network's own and
  count as right. Main menu > Open project or file... and dropping the file on the open network
  open the same join screen.
- **Not success**: two separate projects; the second file opened with Replace, so only one table
  is in the network. On 0ffeae2ef5 Replace (the Join split button's, or the source row's "Replace
  with file...") keeps the first file's columns and gives the same counts as a join (A 13 / 18, B
  12 / 14); only the Sources list, which then holds the second file alone, shows it.
- **A second door on 0ffeae2ef5**: Quick actions (Control+K) > Add data... opens an older "Add to"
  page whose default leaves G12 and its stretch out (B: 11 nodes, 14 edges) and shows no unknown
  gauge afterwards. A report of 11 and 14 that names nothing that did not fit is P.

## T62. Read the wrong way

- **Success**: the `opened` (B `installed`) column's kind is a date (its table header shows the
  calendar glyph), and the participant names **Bayview Clinic** (opened 2023-03-08; B **Birch
  Hollow**, put in 2018-06-27). Designating it as the time while its kind stays text is P: that is
  T63's act, and it leaves the column kind untested. On 0ffeae2ef5 designating the time does not
  change the kind: after the inspector's "Set in Data" or Data > Fields "+" > Time > opened, the
  header keeps `Aa`, yet the cells draw as dates and the sort gives the right name. Those routes are
  P (a false success on screen; grade by the header glyph).
- **Path**: the table (already showing at the start) > the `opened` header's menu (its "Options
  for opened" button, or right-click on the header) > Type > date; then sort newest first (the
  header menu's "Sort descending", or the header clicked twice) and read the top row. The menu calls
  the kind "Type" (text, number, yes/no, date, category); the caption then reads "newest first".
  No control in the Data place sets a column's kind on this build. Path steps: 5.
- **Not success**: the right name read off by eye with the column still read as text.

## T63. Where and when

- **Success**: the time is designated as `opened` (B `installed`), and the report names `lat` and
  `lon` (or latitude and longitude) for where and `opened` (B `installed`) for when. The place is
  designated by the program at load (Latitude `lat`, Longitude `lon`), so leaving it is right; only
  the report shows whether the participant knows it. The time set but the place not named is P.
- **Also reported** (not graded): whether the participant opened Fields to check the place.
- **Path**: the inspector's Overview "Set in Data" (on 0ffeae2ef5 it sets Time = `opened` in place:
  Fields does not open, nothing is announced, and the "Time: opened" row leaves the Overview); or
  Data > Fields "+" > Time > opened (B: expand gauges.csv first); or the table's `opened` header
  menu > Role > Time.
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
  leaves "Higher means" empty, and Analyze then reads it as farther. For A that is the opposite of
  the prompt (P unless "Higher means" is set); for B it is the asked reading.
- **Not success**: a Style text line that draws the name but leaves the label unset is half (P):
  the program still names the site by its code elsewhere.

## T65. Only some in the picture, and some marked

- **Success**: two filter conditions on, in either order. A: one keeps trained and hours at least
  10 -- **14 of 24** visible; one selects role staff -- **4** selected, none hidden by it. B (start
  `gauges-tidy.txt`: Stone Weir's depth blank, `installed` read as dates): one keeps telemetry yes
  and depth_cm at least 70 -- **5 of 12** visible (G01, G02, G04, G09, G11); one selects installed
  before 2005 -- **3** selected among those in the picture (G01, G02, G09).
- **Selected count on 0ffeae2ef5**: a Select card also selects nodes another card has taken out of
  the picture, so A shows "5 nodes selected" with 4 rings drawn (Selected layer 5, spoken "5 nodes
  selected"). With both cards right, a report of 5 read off the screen is graded on the cards: the
  count is the build's defect, not the participant's.
- **Path**: Data > Filters "+" (Add filter) > trained > Yes; on that card "Add a condition" >
  hours > Between, "from" 10 (the "to" stays 52) > Enter. A new card starts on Hide, so this one
  needs no Select / Hide step (14 of 24). Add filter > role > staff ("Is any of"); switch that
  card from Hide to Select (left on Hide it leaves 4 of 24 in the picture). Order free: the other
  order gives the same 14 of 24 and 5 selected. Path steps: 12 (A).
- **B on 0ffeae2ef5**: the first half matches (one card, telemetry yes and depth_cm Between 70 to
  210, Hide: 5 of 12). The second half cannot be built: Filters, the Style condition picker and the
  find box offer `installed` as text even after it is read as dates and set as the time, so
  "before 2005" has no condition. The nearest workaround (Starts with "19", Select) selects G01,
  G09 and the hidden G05 and misses G02. B is blocked on this build; no path step count.
- **B with date conditions (the build after 0ffeae2ef5 that adds them)**: Filters "+" lists
  `installed` with the calendar glyph; its card opens on Before with the box focused. **Path**:
  Add filter > telemetry > Yes; Add a condition > depth_cm > "from" 70 > Enter; Add filter >
  installed > type 2005 > Enter (3 of 12 while it hides); switch that card to Select. The screen
  reads **5 of 12** nodes and **"5 nodes selected"**: G01, G02 and G09 are marked among the five in
  the picture, and the two hidden gauges put in before 2005 (G05, G03) are selected too by the
  Select rule above. Graded on the cards, as for A. Path steps: 12 (B). The same Before 2005 in a
  style layer's Which nodes keeps 5 of 12 nodes ("installed before 2005, 5 nodes").
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
  the other edges (A 17, B 13). Both count; the edge loss is the build's defect.
- **A card on the id cannot leave one node out on 0ffeae2ef5**: text cards offer only Contains,
  Starts with, Ends with, Is exactly, Has a value and Has no value, and Hide hides what does not
  match, so an id card for P13 with Hide leaves P13 alone in the picture (1 of 13). That is not
  success.
- **Not success**: removing deliveries.csv from Sources (it deletes the routes); deleting the node.

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
  of 12 and 0 of 14).
- **Success**, A: `downloads/` holds the node table and the edge table as CSV (one file each, or a
  zip of both), the node file with **13** rows including P13 and the `site` column, the edge file
  with 18 (headers `source,target,trips`, not the person's `from,to,trips`). B: `downloads/` holds a
  `.graphml` file with **12** nodes and **14** edges. Equally right: the files hold only what is in
  the picture AND the export screen said what is not included AND the participant reports it. On
  0ffeae2ef5 the picture holds no edges, a "Shown" export writes 12 nodes (B 11) and an edge file
  with no rows (B no edges), and the export screen's scope and chip count nodes only, so it never
  says the edges are left out: such an export is not the equally-right case.
- **Severity 4 candidate**: a file short of rows with no sign on screen that rows were left out.
  Seen on 0ffeae2ef5: the Shown edge export above, and a GraphML exported from a source row (scope
  "gauges.csv 11": 11 nodes, 0 edges, no warning), whose scope then sticks for Control+E.
- **Path**: main menu (or Control+E) > Export, which opens on Data with Format CSV. A: Table Nodes,
  scope All 13 > Export > "Styles lost in CSV" > Save anyway; then Table Edges > Export > Save
  anyway. B: Format > GraphML > Export > "Styles lost in GraphML" > Save anyway (a step the export
  always adds while a node is out of the picture). The tool writes the saved file into the
  session's `downloads/` and prints its path; the screen's notice gives only the file name.
- **Not success**: a saved project (`.graphty.json`) or an image only. Control+S with a `.graphml`
  name saves the project in the browser and writes no file.
