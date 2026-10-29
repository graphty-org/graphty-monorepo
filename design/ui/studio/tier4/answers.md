# Tier 4 answer key (graders and pilots only)

Never shown to participants. Each task: its success definition, the success path, and what the
final screen or saved file must show. Paths name controls as the build of 2026-10-29 (e52d7c4f57)
draws them; the dry run corrects them on the frozen build and logs each change in `criteria.md`.
Values marked "(pilot to confirm)" were worked out from the files, not yet read off a screen.

## Facts no briefing may hold

- `P13` -- the site that is only in deliveries.csv (T61 A, T66 A)
- `G12` -- the gauge that is only in flows.csv (T61 B, T66 B)
- `Bayview Clinic` -- T62 A's answer
- `Birch Hollow` -- T62 B's answer
- `Harbor Market` -- T64 A's answer
- `Old Bridge` -- T64 B's answer
- `Library Annex` -- the site whose families count is "n/a" (T67 A)
- `Stone Weir` -- the gauge whose depth is "-" (T67 B)

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
Overview offers "Time: opened -- Set as time"); `lat` and `lon` are designated Latitude and
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
  **12** gauges (11 and **G12**) and **14** stretches; G12 is not on the gauge list and one stretch
  is listed twice (pilot to confirm the B counts on screen). Reporting 12 sites (11 gauges) plus the
  one unknown is equally right.
- **Path**: start screen > Open a file > pantries.csv (opens 12 nodes) > Data > Sources "+" (Add
  source) > File... > deliveries.csv > the join screen ("Join deliveries.csv -> pantries.csv",
  Edges, from = Id, to = Id; chips "18 edges added", "1 new node", "1 not in graph", "1 repeated
  key") > Join. Overview: Nodes 13, Edges 18.
- **Detour that still succeeds**: opening deliveries.csv first and pantries.csv second, if the end
  network has both.
- **Not success**: two separate projects; the second file opened with Replace, so only one table
  is in the network.

## T62. Read the wrong way

- **Success**: the `opened` (B `installed`) column is read as a date or time (its table header shows
  the calendar glyph, or Fields designates it as the time), and the participant names **Bayview
  Clinic** (opened 2023-03-08; B **Birch Hollow**, put in 2018-06-27).
- **Path** (pilot to confirm which route the build offers; both count): the table (toolbar Table)
    > the `opened` header's menu > its kind > date; or the inspector's Overview "Set as time"; or Data >
    > Fields "+" > Date or time > opened. Then sort by opened, highest first, and read the top row.
- **Not success**: the right name read off by eye with the column still read as text.

## T63. Where and when

- **Success**: under Data > Fields, the place is designated (Latitude `lat`, Longitude `lon`, set
  by the program at load; leaving them is right) and the time is designated as `opened` (B
  `installed`).
- **Path**: the inspector's Overview "Set as time"; or Data > Fields "+" > Date or time > opened.
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
  10 -- **14 of 24** visible; one selects role staff -- **4** selected, none hidden by it. B: one
  keeps kind person and donations at least 1,000 -- **7 of 24** visible; one selects on_record yes
  -- **4** selected.
- **Path**: Data > Filters "+" > trained > Yes; on that card "+ field" > hours > at least 10; the
  card's toggle on Hide... (the card keeps only what it matches: the header chip reads 14 of 24).
  Filters "+" > role > staff; its toggle on Select. Order free.
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

- **Success**: the participant finds the program's warnings and applies the offered fixes. A:
  `families` "1 not a number" (Library Annex, `n/a`) made blank; `site` padded spaces (Northgate
  Center) trimmed. B: `depth_cm` not a number (Stone Weir, `-`) made blank; `station` padded spaces
  (Willow Run) trimmed (pilot to confirm the B issue list: the build showed "With issues 11"). The
  table shows no warning left on those columns, and the report names what was found.
- **Path**: Table > "With issues" > a warning header's menu > the fix (Make blank, Trim).
- **Also success**: a `volunteer_run` Y/N read as yes/no if the program offers it.
- **Not success**: editing values by hand outside the program; reporting without changing.

## T68. Sending it on

- **Success**, A: `downloads/` holds the node table and the edge table as CSV (one file each, or a
  zip of both), the node file with 13 rows and the `site` column. B: `downloads/` holds a `.graphml`
  file with 12 nodes and 14 edges.
- **Path**: main menu (or Control+E) > Export > Data > CSV (A) or GraphML (B) > Export / Save. The
  tool writes the saved file into the session's `downloads/` and prints its path.
- **Not success**: a saved project (`.graphty.json`) or an image only.
