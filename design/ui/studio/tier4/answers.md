# Tier 4 answer key (graders and pilots only)

Never shown to participants. Each task: its success definition, the success path, and what the
final screen, the end-state records or the saved file must show. Paths name controls as the
frozen build (7de2dc4e23) is expected to draw them; the dry run corrects them on that build and
logs each change in `criteria.md`. Values marked "(pilot to confirm)" were worked out from the
files, not yet read off a screen; `real.mjs --gate` refuses the round while any remains. The dry run
also writes each core task's path step count here (bar 7: "Path steps: N").

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

As loaded on 2026-10-29 (e52d7c4f57): `opened` and `installed` are read as text (the inspector's
Overview offers "Time: opened -- Set as time", "Set in Data" since tier 4 R10); `lat` and `lon` are designated Latitude and
Longitude by themselves under Fields; no Label is designated (the columns are `site` and
`station`); `zip` and `code` are read as text and keep their zeros; the table shows warnings on
`families` / `depth_cm` and `site` / `station`.

## T60. From a web address

- **Success**: the network is open from the web address (the Sources row is the address's file,
  with the link glyph) and the participant reports the counts. A: **24** nodes (people and
  organizations) and **59** edges. B: **331** genes and **361** interactions.
- **Path**: start screen > Open network data > the box "Web address of a graph file" > paste the
  address > Enter. The graph opens; the inspector's Overview shows Nodes and Edges.
- **Also success**: from inside a project, Data > Sources "+" (Add source) > Server... with the same
  address, if the counts reported are the loaded network's.
- **Not success**: a downloaded copy opened with "Open a file" (the prompt forbids it); counts that
  do not match.

## T61. Two spreadsheets as one network

- **Success**: one network with both files' records (Sources lists both files), and the report
  says A: **13** sites (12 from the list and one, **P13**, only in the route list) and **18**
  routes; something did not fit: P13 is not on the site list, and one route is listed twice. B:
  **12** gauges (11 and **G12**) and **14** stretches (read off `gauges-joined.txt`'s first
  screenshot); G12 is not on the gauge list and one stretch is listed twice. Reporting 12 sites (11
  gauges) plus the one unknown is equally right.
- **Follow-up** (fix coverage for the source row's counts, not graded): A **18** routes, B **14**
  stretches, read on the second file's Sources row.
- **Path**: start screen > Open a file > pantries.csv (opens 12 nodes) > Data > Sources "+" (Add
  source) > File... > deliveries.csv > the join screen ("Join deliveries.csv -> pantries.csv",
  Edges, from = Id, to = Id; chips "18 edges added", "1 new node", "1 not in graph", "1 repeated
  key") > Join. Overview: Nodes 13, Edges 18.
- **Detour that still succeeds**: opening deliveries.csv first and pantries.csv second, if the end
  network has both.
- **Not success**: two separate projects; the second file opened with Replace, so only one table
  is in the network.

## T62. Read the wrong way

- **Success**: the `opened` (B `installed`) column's kind is a date (`data.json`; its table header
  shows the calendar glyph), and the participant names **Bayview Clinic** (opened 2023-03-08; B
  **Birch Hollow**, put in 2018-06-27). Designating it as the time while its kind stays text is P:
  that is T63's act, and it leaves the column kind untested. If designating the time also changes
  the kind on the frozen build, it counts (pilot to confirm).
- **Path** (pilot to confirm which route the build offers; both count): the table (toolbar Table)
    > the `opened` header's menu > its kind > date; or the inspector's Overview "Set in Data"; or Data >
    > Fields "+" > Time > opened. Then sort by opened, highest first, and read the top row.
- **Not success**: the right name read off by eye with the column still read as text.

## T63. Where and when

- **Success**: the time is designated as `opened` (B `installed`) (`data.json`), and the report
  names `lat` and `lon` (or latitude and longitude) for where and `opened` (B `installed`) for when.
  The place is designated by the program at load (Latitude `lat`, Longitude `lon`), so leaving it is
  right; only the report shows whether the participant knows it. The time set but the place not
  named is P.
- **Also reported** (not graded): whether the participant opened Fields to check the place.
- **Path**: the inspector's Overview "Set in Data" (it opens Data > Fields with the Time entry
  added and the column chosen; change it there if it is not `opened`); or Data > Fields "+" > Time >
  opened.
- **Not success**: the time left undesignated; a column changed to the wrong kind.

## T64. Its name, and what makes a tie strong

- **Success**: the node label is `site` (B `station`): the inspector and find name P05 as **Harbor
  Market** (B G05 **Old Bridge**), and the edge weight is `trips` (B `km`, read as a distance:
  higher means farther). The participant reports the name.
- **Path**: Data > Fields (pantries.csv) "+" > Label > site; Data > Fields (deliveries.csv) "+" >
  Weight > trips, "Higher weight means" stronger (B: farther). Check: find "P05" or click it.
- **Not success**: a Style text line that draws the name but leaves the label unset is half (P):
  the program still names the site by its code elsewhere.

## T65. Only some in the picture, and some marked

- **Success**: two filter conditions on, in either order. A: one keeps trained and hours at least
  10 -- **14 of 24** visible; one selects role staff -- **4** selected, none hidden by it. B (start
  `gauges-tidy.txt`: Stone Weir's depth blank, `installed` read as dates): one keeps telemetry yes
  and depth_cm at least 70 -- **5 of 12** visible (G01, G02, G04, G09, G11); one selects installed
  before 2005 -- **3** selected among those in the picture (G01, G02, G09) (pilot to confirm both
  counts and that a date condition is offered).
- **Path**: Data > Filters "+" > trained > Yes; on that card "+ field" > hours > at least 10; the
  card's Select / Hide set to Hide (the header chip reads 14 of 24). Filters "+" > role > staff; its
  Select / Hide set to Select. Order free. B the same with telemetry, depth_cm and installed (pilot
  to confirm).
- **Also success**: two separate keep cards (trained; hours) instead of one card with two fields.
- **Not success**: a style layer that colors them while everyone stays; a selection made by
  clicking nodes one by one (counted P if the counts are right).
- **Follow-up**: success says the order makes no difference (the counts are the same either way).

## T66. Only what is on your own list

- **Success**: a filter condition leaves out P13 (B G12) and the network still holds it: **12 of
  13** visible (B **11 of 12**). Either a Data source card (pantries.csv, keep) or a card on id or a
  blank site (Hide) is right.
- **Path**: Data > Filters "+" > Data source > pantries.csv (the card keeps what came from it).
- **Not success**: removing deliveries.csv from Sources (it deletes the routes); deleting the node.

## T67. What looks wrong, put right

- **Success**: the participant finds the program's issues and applies the offered fixes. A:
  `families` "1 not a number" (Library Annex, `n/a`) made blank; `site` padded spaces (Northgate
  Center) trimmed. B: `depth_cm` not a number (Stone Weir, `-`) made blank; `station` padded spaces
  (Willow Run) trimmed (pilot to confirm the B issue list: the build showed "With issues 11"). The
  table shows no warning left on those columns, and the report names what was found.
- **Path**: Data > the source row's issues chip > the issue list > the fix (Make blank, Trim). The
  table may show the same list and point to the Data place; configuration is the Data place's
  (pilot to confirm the route on the frozen build).
- **Also success**: a `volunteer_run` Y/N read as yes/no if the program offers it.
- **Not success**: editing values by hand outside the program; reporting without changing.

## T68. Sending it on

- **Start**: `pantries-narrowed.txt` (B `gauges-narrowed.txt`): both lists together, with a Data
  source card on that leaves P13 (B G12) out of the picture, the state T66 leaves.
- **Success**, A: `downloads/` holds the node table and the edge table as CSV (one file each, or a
  zip of both), the node file with **13** rows including P13 and the `site` column, the edge file
  with 18. B: `downloads/` holds a `.graphml` file with **12** nodes and **14** edges. Equally
  right: the files hold only what is in the picture (A 12 nodes and 17 edges; B 11 and 13) AND the
  export screen said the left-out node is not included AND the participant reports it (pilot to
  confirm the counts).
- **Severity 4 candidate**: a file short of rows with no sign on screen that rows were left out.
- **Path**: main menu (or Control+E) > Export, which opens on Data > CSV (A) or GraphML (B) >
  Export / Save. The tool writes the saved file into the session's `downloads/` and prints its path.
- **Not success**: a saved project (`.graphty.json`) or an image only.
