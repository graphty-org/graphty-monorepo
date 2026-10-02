# Wide data, nested JSON and the state matrix: what the studio decided

On 2026-10-01 the owner asked three things, recorded verbatim in `../../owner-feedback.md`: does the
studio have a state matrix; what happens when a node or an edge carries dozens of attributes, and
does a surface such as the Data place become overwhelming; and what happens when the data is JSON
with paths through several layers of sub-objects and arrays. The owner decided that all three are
designed before the next user study.

This page gives the studio's decisions, with reasons. The full specification is
`structure-b-refined.md`, now version 5. The state matrix is `state-matrix.md`. Every graph-io and
graphty-element capability the design waits on is in `element-requirements-5.md`.

How to read the labels:

- **Owner** -- recorded in `owner-feedback.md`. Not reopened.
- **Studio** -- decided by the design studio, reversible with an edit, with its reason.

Two samples carry the examples, both already in `../../kit/wide-nested.json`:

- **wide**: an IT estate. 300 hosts with 69 attributes each (`hosts-2026-03.csv`) and 1,105
  connections with 26 (`connections-2026-03.csv`). Its longest name is
  `vuln_count_critical_unremediated_over_30_days`, and many names differ only at the end
  (`cpu_util_p50_pct`, `cpu_util_p95_pct`, `cpu_util_max_pct`). No earlier sample used this
  domain.
- **nested**: one research-network API response (`network-export-2026-03.json`): 170 researchers,
  30 institutions and 160 links, with sub-objects four levels deep
  (`attributes.profile.metrics.citations.total`), arrays of values (`tags`), arrays of ids
  (`coauthor_ids`, 514 items), arrays of records (`affiliations`, 242; `addresses`, 179), and a
  `meta` block that is not graph data.
- **plainJson**: twelve co-authors as node-link JSON, the case that must still load in one step.

---

## What "ready" means for this round

The skeleton goes to the study only when all of these hold:

1. **A state matrix** lists every surface against the adopted states, and every cell is a
   route that renders or "N/A" with its reason (`state-matrix.md`).
2. **Wide data** stays usable on every surface that lists or picks attributes, each shown on its
   own route with the wide sample.
3. **Nested JSON** loads end to end on the Data page with the nested sample, and plain graph JSON
   still loads in one step.
4. **Every graph-io and graphty-element capability** the two need is listed with a proposed API
   and the routes that wait on it; the app walks, flattens, matches and counts nothing.
5. **No regressions** from version 4, and the four problems the last check found are fixed.
6. **Clean**: no console errors, no dead controls, a tooltip on every icon-only control, one
   pattern per job.

---

## 1. Wide data: one field list (studio)

Today attributes are listed in seven places, and each behaves differently: Data > Attributes
shows Find only when the list is taller than the panel; the "+" menus search past 15 items; the
field menu (`fromDataItems`) always offers the four Les Miserables attributes, whatever is loaded;
the inspectors list every attribute; the table shows every column and its "Show columns..." does
nothing. With 69 attributes each of these becomes a wall.

**Decision: one component, the field list, in two sizes, used by every surface that shows or
picks attributes.**

- **Panel size**: Data > Attributes, the inspectors' "N more attributes", the table's column
  chooser.
- **Menu size**: every field picker -- bind, the Label "+" and a label line's field, Color by,
  Size by, Width by, a filter step's attribute, a link's "by" column on the Data page, the
  Data page's Go to column, the Weight line (Analyze, the Path popover, a run's Made with), a
  recipe's binding choice, and Select where's Insert attribute. A picker is the field list at
  every length, drawn as a dark menu with its groups, so Color by does not change form between
  Les Miserables' 4 attributes and the hosts' 69.

Reason: one way to find a field, learned once (Tableau's Data pane uses the same rows in the pane,
the shelves and the calculation editor). Seven local fixes would be seven patterns.

**Its rules:**

1. **Search appears past 15 items.** One count, the number the spec already uses for menus
   (section 2.5). Data > Attributes' "only when the list is longer than the panel" is removed.
   Reason: a rule that depends on window height makes the same route look different at different
   sizes, so the narrow cell of the state matrix could not be repeated. (Rejected: 12, which would
   change a settled number for no case in the samples; "always shown", which puts a find box over
   three items in every short menu.)
2. **Search matches the start of words.** A name splits into words at `_`, `.`, `-`, spaces and
   case changes; every typed word must match the start of some word. "vu cr" finds the two
   `vuln_count_critical...` fields; "cpu p95" finds `cpu_util_p95_pct`; "city" finds `site_city` among
   the hosts and `location.city` among the institutions. It matches the attribute's name and the column it came from.
   Matched parts are bold; a polite announcement gives the count ("9 of 69 attributes"). Reason:
   plain substring matching finds too much in this data ("at" is inside 15 of the 69 host names). With no match,
   the one empty line: `No match for "xyz"`.
3. **Grouped by table, groups open.** Node type, then edge table, as Data > Attributes already
   does. A reader may collapse a group; search opens every group that has a match. Reason: a group
   that starts collapsed hides fields by default, which is how Gephi users lose their columns.
4. **"In use" first, as an order, not a toggle.** Inside each group, an "In use (6)" block comes
   first, then everything else ("Other attributes (63)"), computed attributes first and then by
   name. In use means painted by a row, used in a label, filtered on, read by a run (a run's
   weight override), or holding a role (Key, Name, From, To, Links to, Weight, Time). Each in-use
   row carries a tag saying what uses it ("Color", "Weight", "Filter", "Louvain"), in text and in
   its accessible name. Reason: an order answers
   "which fields are in use" with nothing to switch and nothing to forget; a "Show: In use" toggle
   left on hides a field from someone searching for it. Rejected: the "All / In use" toggle.
5. **Folders come only from the data's own nesting.** A nested field sits under its parent's
   subhead (`profile.contact` > `email`); the subhead starts collapsed unless something under it
   is in use. Names are never grouped by underscore prefix (`cpu_`, `vuln_`, `cmdb_`). Reason:
   prefixes are guesses (`site` and `site_city` would split), and search finds a prefix in two
   keys. Rejected: folders made by hand, grouping by type, type chips, search prefixes.
6. **One truncation rule: a middle ellipsis on every attribute name and path**, an end ellipsis on
   prose (node names, notes, source names). The full text is always in the tooltip and in the
   accessible name. Reason: in this data the end of a name is what tells fields apart
   (`..._p50_pct`, `..._p95_pct`, `..._over_30_days`); an end ellipsis makes them identical.
7. **A typed picker lists unsuitable fields last, disabled with the reason.** Size by lists the
   number fields, then one collapsed group "Not a number (45)", whose rows are disabled with
   "Size needs a number". Search reaches them. Reason: a reader who types "region" into Size by
   and finds nothing assumes the field does not exist. The same rule covers the two new kinds of
   value nested JSON brings: a list attribute and a value kept whole are listed in every typed
   picker (Color by, Size by, Width by, the Weight line) disabled with their reason
   ("tags holds several values; use Show as groups"; "A value kept whole is not one value"), suitability coming from graphty-element. The
   conceptual model reads a list of categories as a cover (overlapping groups) and keeps numeric
   vectors and opaque values without encoding them, so no picker invents a way to draw one.
8. **The list is built on the Quick actions pattern**: focus stays in the find field, the list
   below is a listbox, Up and Down move the active row, Enter picks, Esc closes and returns focus.
   Each table group is a labeled group. The table's column chooser is the same list with a
   checkbox per row. Reason: today a searchable menu puts a text field inside a menu, which is
   invalid for assistive technology, and the menu's first-letter jump takes the reader's typing.
   This replaces the menu's search mode; it is not a second pattern. Menus of 15 items or fewer
   stay dark menus.

**On each surface:**

- **Data > Attributes** is the list itself, panel size. Its "+" (New attribute) is unchanged.
- **Field pickers** are the list, menu size, in every place an attribute is picked (the list
  above). The Label list keeps Typed text first and the Notes group last. A link's "by" column lists the type's Key first, then its other unique columns
  (version 4's rule); ranking by how many values two tables share is deferred (section 6).
- **Node and edge inspectors, Data tab**: the in-use attributes, then one disclosure, "67 more
  attributes", that opens the list in place with its search. Attributes with no value on this
  element are counted inside it ("10 empty"), not listed. Reason: a host is often missing
  `legacy_asset_tag` or `decommission_requested_on`; 40 rows reading "empty" is noise.
- **Table dock**: the key column is frozen on the left; by default the table shows the key and
  the in-use attributes; one button in the dock's tab strip, "Columns: 8 of 69", opens the panel
  list with checkboxes. This replaces the dead "Show columns..." and is the only place an
  attribute can be hidden. Hiding a column belongs to the table view and never changes data
  (Airtable, Power BI). The existing column menu keeps sorting and its other commands.
- **Why this look** lists only the rows that win a property for this element (owner), at most one
  per property, so it does not grow with the number of attributes or of rows. Its only change is
  the middle ellipsis on attribute names in its values.

Skipped, each to be added only if the study shows a need: per-field hide outside the table, the
"In use" toggle, hand-made folders, type chips, sorting by source order.

## 2. The Data page at 69 columns (studio)

Version 4 set roles under each column header. That was a studio decision (owner-feedback.md
records no owner decision on it). With 69 columns, 69 role dropdowns would be the wall the owner
warned about.

**Decision: roles stay under the column headers, the one place they are set, and the headers
stop looking like 69 controls.**

- **A column with the default role reads "Attribute" in quiet text**, not drawn as a dropdown; it
  is still the same role control (Enter or a click opens the role menu).
- **Columns that have a role pin to the left**, after the frozen Key column, so the reader sees
  Key, Name, From, To and Weight without scrolling.
- **Go to column**: the field list, menu size, above the grid (shown past 15 columns). Picking a
  column scrolls to its header and focuses it. Columns with a role are listed first.
- **Keyboard** is unchanged from version 4: the header row is one Tab stop, Left and Right move,
  Enter or Alt+Down opens the role menu. So 69 columns are never 69 Tab stops.

Reason: the header is the one home of a role in version 4, the door-entries example in both Row
and Pair depends on it, and both have been reviewed. Rejected: a strip of role slots above the
grid. It would replace a working control just before a study, and graphty has eleven roles with
"Links to" allowed on any number of columns, so the strip would grow per column and bring the wall
back. Rejected: showing the role control only on hover, which a keyboard user cannot find.

**Study check** (worded without the screen's words): "make the machines that cost the most count
the most" on the wide sample. Does the tester find `monthly_cost_usd` among 69 columns and give it
its role in a few keystrokes? If testers hunt through the headers, the role strip comes back as a
candidate.

## 3. Nested JSON (studio)

**Plain graph JSON still loads in one step.** A file graph-io recognizes (node-link, d3, JGF,
Cytoscape, graphology, vis, NetworkX adjacency and tree) is one row in Tables with its roles set by
the file and shown locked, every check green and focus on Load. Today graphty-element's JSON source
forces the node-link reading and cannot read JGF, Cytoscape, graphology or vis files: that is an
element defect, fixed in the element, not worked around in the app.

**Any other JSON document becomes tables.** The Data page needs one new idea: **an array of
records inside the document is a table.** From there every choice uses a control the page already
has. Precedents: Tableau's JSON connector (tick the levels of a schema tree), Power Query's expand,
Neo4j's UNWIND (an array is often edges, not extra rows).

1. **The structure is shown in Tables.** The document's row expands into a tree of its objects
   and arrays only, never its leaf values, each array with its item count:
   `meta`, `data`, `data.researchers [170]`, `data.institutions [30]`, `links [160]`. Leaf values
   are the grid's columns once their table is in use. Reason: the sample has 89 paths; listing
   them all in the left column would be the wall again. Paths are shown dotted with `[]`, never
   typed.
2. **The element proposes the tables.** Arrays of records with a unique id-like field are
   proposed as node tables, and arrays whose records carry two id fields as edge tables, already
   ticked. For the sample that is researchers, institutions and links, so the common case is:
   read the report, press Load. An array of records that sits outside every used table has a
   **Use as table** checkbox on its tree row (Space toggles it). Whatever the load leaves unread
   (`meta`) is one report line.
3. **Picking nodes and edges** is the header strip the page already has: Each row is: a node |
   an edge, Type, Key.
4. **Sub-objects become columns at every depth.** `attributes.profile.metrics.citations.total` is
   one column, grouped in the grid under a `profile` header (and in every field list under its
   parent's subhead). The parent header's menu has the one alternative, **Keep as one value**,
   which stores the sub-object whole. Reason: flattening an object never multiplies rows, so it
   loses nothing and is safe; the fields a researcher wants are deep. Rejected: flattening one
   level and offering "Split into fields" per object, which adds a decision per object on a grid
   that already has dozens of columns. Airbyte's unreadable names came from arrays turned into
   child tables, not from object paths.
5. **Names are the full path inside the record**, such as `attributes.profile.h_index`, and never
   shortened in storage. Lists show the last word under its parent; anywhere a name stands alone
   (a bound value, a role tag, a column header) it takes the middle ellipsis. Reason: a shortened
   stored name ("given" for `name.given`) would change when a column is added and break every
   saved binding and note.
6. **An array becomes one of four things**, chosen in its column's role menu, each with the count
   it will produce on the item (from graphty-element's preview, never counted by the app):
   - **One value** -- the array kept as one value. Where no record holds more than one item, the
     element stores that item as a plain value. Default for arrays of records.
   - **Several values** -- a list attribute; a filter matches when any item does; on a list of
     categories Show as groups reads it as overlapping groups (the conceptual model's "cover"); a
     list of numbers is the model's numeric vector, kept, shown and exported, never drawn.
     Default for arrays of plain values (`tags`).
   - **Several edges** -- the Links to role on a list column: "Links to -> researcher, each item
     (514 edges)". Offered when the items are values. Its link submenu is version 4's, so
     **New type...** works here too: `tags` linked to a new type "tag" makes each distinct tag a
     node and each item an edge, with no new control.
   - **Several rows** -- the array becomes a child table, listed under its parent in Tables, with
     a locked first column, "researcher (parent)", already set to Links to -> researcher. Offered
     when the items are records. `affiliations` then has two linking columns (the parent and
     `institution_id`), so "Each row is: an edge" becomes available: researcher to institution
     edges with `role` and `since` as edge attributes -- the door-entries pattern again.
   A child table's one home is that role menu: its row in Tables has no checkbox, and Remove on it
   is disabled with "Choose another outcome under affiliations in researchers".
   **Rejected: "first item".** It drops data without saying so and depends on file order, the
   reason version 4 refused first and last for times. In the sample, 59 researchers have two or
   more addresses.
   **Rejected: a confirmation dialog for a large expansion.** The count is on the menu item
   before the choice; a load too large to draw is refused by the element's existing refusal.
7. **Links to more than one type.** In `links`, `target` is a researcher in 118 records and an
   institution in 42. The link submenu gains **Any of these types...**, which lets the reader tick
   the types (researcher, institution); the element matches each value against those types' keys
   and the report counts each ("118 to researcher, 42 to institution") and refuses a value that
   matches two. Reason: without it this ordinary API export cannot load. It is not version 4's
   out-of-scope polymorphic link, which reads the type from a column; that stays out.
8. **Pairs listed from both sides.** Co-author ids are often listed by both people. In the sample
   4 pairs are; in other data most may be. The report says so ("4 co-author pairs are listed by
   both researchers") with the choice on the line. The choice is version 4's control for
   repeated links, **One edge per: Item | Pair** (Item is Row's counterpart for a list column),
   defaulting to Pair on an undirected graph, not a second control with new words. Reason:
   counted twice, degree and every centrality measure are silently wrong; and "repeated links"
   already has one control on this page.
9. **Preview, report and errors** use what the page has: the sample grid (a cell holding a value
   kept whole shows `{3 fields}` or `[4]`, its contents in the tooltip), the model strip, the
   always-visible match report, and one refusal per typed error on the tree row it concerns:
   not valid JSON (line and column), no array of records found (the tree still shows; Choose
   another file... is the primary button), a path that no longer exists after Edit source.
10. **The inspector shows a value kept whole** as a collapsed, read-only tree.
11. **The design is not the sample's shape.** The same controls take the other common shapes:
    records keyed by id (an object of records, as JGF does), a document that is one array or
    JSON Lines, arrays of arrays (columns `column1`, `column2`, ..., as a headerless CSV), an
    object of values keyed by ids inside a record (`dependencies`: the array role menu, Several
    edges to the key), a reference in a sub-object (`author.id`, an ordinary column), arrays
    inside a child table (the same menu at any depth), and an array whose items differ in shape
    (One value only, counted in the report). A second domain, a package registry, shows them on
    `data-page/json-keyed`. Reason: a design checked against one document is tuned to it;
    these are the shapes graph-io's own JSON dialects and common API exports already use.
12. **A Name may be built from several columns.** The researchers' names are two fields,
    `attributes.name.given` and `attributes.name.family`. Choosing Name in a second column's role
    menu adds it to the Name rather than moving it: the columns join with a space, in column
    order, and each shows the one role chip "Name: given + family" (the menu item says "Adds
    family to the Name: given + family"; Attribute takes a column out). The page proposes the
    Name, marked as suggested, when a node table has name-like columns: `attributes.name` for
    institutions, `given` + `family` for researchers. Every surface that names a node shows that
    one Name: the inspector title and its Summary (one Name row, "given + family" in its tag), the
    canvas walk and its announcement, the table's one Name column (its parts stay in Columns,
    unchecked), a set's member list, search and a note's target chip. Reason: a person is not
    "Diallo" in one place and "Wei Diallo" in another; before this, the inspector joined the two
    fields while the table showed only the family name, and the load description could name only
    one. Rejected: a computed attribute or label template to join them, which waits on label
    templates (low priority) and would make a name a styling choice, when the owner decided the
    Name is a role and the drawn label is picked in styling. The element API name is listed in
    `element-requirements-5.md` section 8, to confirm on its pull request.

## 4. Where paths are read, and in what syntax (studio)

- **Nested values are flattened once, by graph-io, at load.** After the load,
  `attributes.profile.h_index` is an ordinary column, so the element's existing column lookup in
  style bindings, selectors and filters reads it, and nothing walks nested objects while drawing.
  Labels, which today read their own full path language over the raw record, move onto the same
  reader. Reason: the smallest change to the element, one reader instead of two dialects, and the
  GPU path cannot read opaque JSON cells anyway.
- **A path that reads nothing is an error.** Today a binding to a path that matches no column
  paints nothing and says nothing; the element raises a typed error instead, and the Binding
  popover and Why this look show it.
- **Stored paths use names, `.`, `[*]`, `.*` (the values of an object keyed by id) and quoted names** (`"address.city"` for a key that really
  contains a dot). This is graphty-element's own grammar and matches neither JMESPath nor RFC 9535
  JSONPath: every `[*]` flattens (`a[*].b[*]` is one row per inner item, where JMESPath gives a
  list of lists) and a quoted name may follow a `.`. Indexes, filters, recursive descent and
  functions are refused with a typed error. Reason: no route needs more, and a small grammar of
  its own says exactly what a table path does. Readers never type a path in this round.

## 5. The state matrix (studio)

**Columns, the states every surface defines:** Empty, Loading, Error, Partial, One, Typical, Many,
Long text, Narrow, and Waiting on graphty-element.

- **Partial is its own column.** A join matching 60%, an unread `meta` block or a run stopped at
  its time limit is "something happened and some of it is wrong", which reads and announces
  differently from a refusal. Folding it into Error lets a surface claim coverage without designing
  the harder case.
- **Many** uses the wide sample on the surfaces that list attributes, and many rows, runs, notes
  or graphs where a surface lists those. It is a real state of the section, not a switch that
  renders a section unchanged under a "wide" name.
- **Long text**: the 46-character attribute name, a seven-segment path, a 60-character row or
  project name, a long note.
- **Narrow** is a real 1024 x 768 window, written as a `@1024` suffix on a route; the study script
  sets the browser's size from it. Reason: the app's layout breakpoints sit at 1180 and 1200 px,
  and a narrowness imitated inside the page never reaches them.
- **Waiting on graphty-element** is a control drawn disabled with its reason, the existing design
  note pattern. A capability the element lacks is listed in `element-requirements-5.md`, not drawn
  as a state.
- **Not columns:** Nested (a kind of data; it has its own rows on the Data page), Keyboard (each
  route that opens a surface puts focus inside it, and the check fails when focus is on the page
  body), dark mode (a second check pass over every matrix route), 200% text (a separate pass).
- **A cell** is a route that renders, `BUILD: <what>` until it is built, or `N/A: <reason>`. A
  cell may name another surface's route only when that route shows this surface in the state.
  No cell says "falls back to".
- **Kept true by a check**: `study.mjs --matrix` reads the matrix, fails on a missing section, a
  blank cell, an N/A with no reason or a route that does not exist or does not render, and checks
  every route with one browser and a fresh context per 25 routes.
- **One loading and one problem block**: `AB.problem(text, { verb, go })` beside `AB.empty`, for
  "what happened, what to do" (the Data page's refusals, a failed save, a binding that reads
  nothing). No new loading helper: loading is the canvas card and the run row's progress bar,
  and panels that render from one snapshot honestly have no loading state of their own.

## 6. What graph-io and graphty-element must add

In full in `element-requirements-5.md`, sections 7 and 8. In short:

- graph-io: describe a JSON document's structure; paths that step through arrays; flatten
  sub-objects at load; what an array becomes; child tables that carry their parent's key; new
  issue codes. graph-io: writing a `list` column for an array of scalars (the `list` data type already exists; graph-format's inference is unchanged).
- graphty-element: the JSON source reads every dialect graph-io knows; the table description
  gains `at`, `keep` and `arrays`; the preview returns the structure, suggested tables and a count
  per choice; links to several types; reciprocal pairs on list links; list attributes and a
  `contains` test; attribute descriptors gain `parent` and a short `plainName`, and a separate usage map, `attributeUsage()`, says what uses each attribute (the design documents call it `usedBy`); one path
  reader with an error for a path that reads nothing.
- **Kept in the app** because it is presentation: searching and ordering a list on screen,
  truncation, which columns a table view shows. (The accessibility specialist asked for search in
  the element; the studio keeps it in the app, because a third party that builds its own picker
  chooses its own matching and so has nothing to reimplement.)
- **Deferred**: ranking link columns by how many values two tables share (the "by" list uses the
  element's `unique` and `suggestedKey` meanwhile); a column limit at import (no file needs one).

## 7. The four problems the last check found

Each has its own route in `state-matrix.md` ("Regressions") so it cannot return unnoticed.

- **(a) Shift+Arrow on the canvas does not walk.** Confirmed in the source: it jumps to Valjean
  once on Les Miserables and otherwise only flashes a message. Fix: Shift+Arrow selects the next
  node in that direction on any dataset, through the same selection code a click uses.
- **(b) The note editor dropped a removed subject chip on Save.** The source now compares the
  chips and applies a change; to confirm on its route.
- **(c) A canvas click showed no selection bar.** Fixed for Les Miserables (the node inspector's
  frame draws the bar); still missing on the door-entries person and building and on the edge
  inspector. Fix: the bar comes from the one place a selection is set, so a click, Shift+Arrow and
  Select where all raise it.
- **(d) "person by badge" changed only the header.** The source now changes the edge count to
  "0 edges" and adds the match report line; to confirm on its route.

## Round 8 checks this adds

Worded so the tasks never reuse the screen's words, and each run on two domains (hosts and
researchers):

- "Color the machines by how much of their processor they use at the busiest times." (Finds
  `cpu_util_p95_pct` among 69 in a few keystrokes?)
- "Which details are shaping this picture right now?" (Reads the "In use" block?)
- "Show only the columns you need to compare patch status." (Columns: N of M?)
- "Make the machines that cost the most count the most." (Go to column, a role at width.)
- "Load the research export so that people who wrote papers together are connected." (Several
  edges on `coauthor_ids`?)
- "Each person should also connect to the places they have worked." (Several rows on
  `affiliations`, then an edge?)
- "Some links point at places, not people. Load them anyway." (Any of these types?)

---

## Still open

Nothing here needs the owner before the study.

- **Names that become permanent when graph-io, graph-format and graphty-element ship them**: the
  table fields `at`, `keep` and `arrays` and their values, the descriptor fields `parent`,
  `elementType`, `domainKind` and `plainName`, the usage map `attributeUsage()`, the generated child-table columns `parentAs` and `keyAs`, the new `AttributeType` values `"list"`
  and `"json"` (an exported type, so a consumer's exhaustive switch needs a case), `displayName` as
  a list of columns (it widens `nodeLabelPath`'s type), the stored path syntax, and the issue codes. Each is reversible with an edit until its release; the studio
  recommends the owner confirm them on the pull request that adds them, as with version 4's
  names.
- **Role slots above the grid** stay a candidate if the study shows testers hunting through
  column headers on the wide sample.
- **To confirm with graphty-element**: that a flattened column of a JSON source re-reads cleanly
  on Refresh when the document gains or loses a sub-object field; that several label meshes per
  node stay fast at 10,000 nodes (carried from version 4).
