# Mock: Facet Browser

Date: 2026-10-10. One of the six VR mocks for graphty. A mock here is an architectural spike of one
whole interaction model: a person does the basic graphty journey end to end in a headset with it,
and an analyst could keep working in it. It runs in full VR on a solid colored background, on Meta
Quest 3 / 3S, Samsung Galaxy XR and Apple Vision Pro.

**Built on** Facet Browser (prototype 41), with the role shelves of Encoding Shelves (prototype 29).
**Kind:** usage paradigm (faceted search), no metaphor. **AI:** none; every step is done by hand.
**Proof journey:** stress journey 3, "Gene list to expression map and clusters", in
the functionality inventory (a studio working file, not committed), as assigned in [the mock recommendation](../xr-prototype-mocks.md).

Prototype files are in `prototype-<N>.md` in [prototypes/](../prototypes/README.md).

---

## 1. The idea

You work on the data, and the graph in front of you answers and asks back. Every attribute and every
computed result is a **facet**: a short list of its values (or a histogram, for numbers), each with a
count of how many nodes in the current result have it. Tapping values builds **one live query** on a
bar above the graph: AND across facets, OR within one, NOT by flipping a chip from "is" to "not". A
two-way **role** switch says what the query does to the graph: Highlight fades the rest, Filter hides
the rest. The query's matches are graphty's selection, always, so anything that acts on "the
selection" acts on them. The count beside every value shows the size of every possible next step
before you take it.

**The graph in space is the query's other input.** Sweep a box through the graph with a pinch and
the region becomes a chip ("In this region -- 7 families"), through its full depth, and a **tray**
floats beside it with wider or related chips, each with its count: "Piece 1 -- all 7", "Most
connected here: Medici -- 6". Tap one and it swaps in; the tray re-forms around what is now taken, so
you can walk outward from a place in the graph ("Neighbors of Medici -- 6") without aiming at a
single small node. Tapping a node does the same for that one node. Carry a facet into the graph and a
**paint ring** opens at your hand with the shelves that accept it; release on Color and the graph is
colored by it, previewed on the nodes in front of you before you let go.

The network's structure is something you narrow by, like a category. **Relational facets** ("within
2 hops of Medici", "on a route from A to B") and **Pivot to neighbors** move you through the network
by changing the query, never by flying the camera. The query has browser-style Back and Forward,
which never touch Undo.

Everything else follows from the facet:

- **Running an algorithm adds a facet.** PageRank becomes a histogram on the rail; Louvain or MCL
  becomes a list of clusters with sizes; link prediction becomes a table of scored pairs.
- **Painting is putting a facet on a role.** Drop it on the paint ring in the graph, or on a shelf
  in the Painted strip (Color, Size, Label, Shape, Opacity, Outline, Edge color, Edge width). The
  shelf is the legend and the answer to "why does this look like that".
- **Keep turns the live query into a project object:** a set, a filter step, a layer target or a
  saved view, each with a suggested name. Exploring costs nothing; keeping is a named step that
  Undo takes back.

**What no other mock has.** Three things. The live query is the whole state: nothing else holds
what you are looking at, and Back walks query states, not pages you visited. A count sits beside
every possible next step, on the rail, on every tray and on the paint ring. And you paint by placing
a facet on a role. Cards exist but are secondary: a node's card opens from the "i" on its tray or
its row, and most work never opens one. In Paired Browser the object's page is the main surface;
here the query is.

**What only a headset adds.** The graph is a place you can ask about. On a monitor a network is a
flat picture behind a mouse; here it is a volume at arm's length, and its shape -- a piece floating
apart, a dense knot, a red cluster -- is something you sweep with your hand and turn into a chip with
a count, through its full depth, without aiming at any one node. Facets come to the graph rather
than the graph going into a dialog: a facet carried into the volume opens its paint ring where your
hand is, and the preview lands on the nodes you are looking at. And the field of view is the screen:
the rail, the query with its counts, the graph and the result bar sit around you at once, all in
reading range, with no window covering another.

**Inspiration.** Faceted search in shopping sites and library catalogs, where a count beside every
value tells you what each click will give (Flamenco); dynamic queries, where the display follows a
slider as it moves (Spotfire); Tableau's shelves, where placing a field on a role is how you encode
it; marking menus, which open where the hand is; the web browser's Back and Forward; Gephi's
stackable filters.

---

## 2. What the mock is

### Surfaces

The graph floats at chest height about 1 m away. Every panel is about 1 m away too and sized by
angle, so the eyes do not refocus between the graph and the text. Around the graph are four fixed
surfaces and two kinds of floating chips. Seated or standing is a setting that lowers or raises
everything; Handedness mirrors left and right; "Larger" on any surface enlarges its text and
targets in place.

| Surface                       | Where                                                                                                                                             | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Facet rail**                | Curved, about 25 degrees left of the graph, from 35 degrees below eye level to 10 above                                                           | The rail header: search (over facets, values, the algorithm catalog and every command), a **Nodes / Edges** switch with its own count, the View menu and the Project button. Under it: Add facet ("Add facet -- run an algorithm"); the **Painted strip**, which shows only the shelves in use, one line each with a small legend, plus "All shelves"; Pinned facets; then every other facet grouped by kind (Text, Groups, Amounts, Times, then each run's results under the run, then result tables); last, the Structure group of relational facets, folded until first opened. While a facet is being carried, the Painted strip expands to every shelf. Long lists scroll (see section 3) and have page strips at their ends.                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Query bar**                 | Across, just above the graph; never wider than about 60 degrees; its bottom edge is fixed and nothing on it rises above 10 degrees over eye level | Two rows. **Query row:** the role switch at the left (Highlight / Filter, in words, with "hides the rest" under Filter); an "Inside:" chip summarizing the kept filters, drawn as a solid bracket and read-only here (a tap opens the list of kept filters, each with its card); a Nodes lane and an Edges lane of live chips, each folding into "+3 more" after one line; each live chip has an "is / not" segment at its left end that flips it with one tap; Invert, Clear and the Remove target at the right. **Recovery row** under it, full width: the count ("6 of 16 families -- Highlight", or "20 genes, 34 edges" when the Edges lane has chips), Back and Forward (each naming where it goes: "Back: all 16 families"), Undo and Redo (each naming its step: "Undo: Paint size by PageRank"). Each label has room for at least 24 characters at the default text size and 16 at the largest, with the part that differs between look-alike steps first. Under the recovery row's fixed bottom edge is a 3-degree dead band: a pinch there does nothing and gives a dim pulse, so reaching for the graph never presses Undo. |
| **Result bar**                | Directly under the graph, tilted up like a desk edge (seated, its center about 25 degrees below eye level); never wider than 60 degrees           | Left: the open **card**, when one is open (a node, edge, group value, set, run, layer, filter step or note), with three of that object's verbs and More ("Medici: Note, Pin, Neighbors, More"). A second card stacks behind the first as a tab ("Guadagni / Strozzi") with Compare, which opens both as rows in Table. Right: four verbs for whatever the query matches, headed by the count ("6 of 16 families: Keep, Pivot to neighbors, Paint these, Table, More"). More opens a list low in front of you, generated from verb descriptors (Run on these, Lay out these, and every plugin verb), with destructive verbs after a divider. The graph's handle sits on this bar's top edge. A "Beside the graph" setting moves the bar to the graph's right at its center height; Table and the Project panel then open in the low desk position (below) instead of to the right.                                                                                                                                                                                                                                                       |
| **Right-hand panels**         | To the right of the graph at the rail's height, mirroring it                                                                                      | Table (the result set as rows, the pinned facets as columns, with a row cursor), and the Project panel (Open, Add data, Save, Save as, Export, Picture, Video, Report, Notes, Saved views, Filters, History and Journal, Recipes, Settings, Help and Tour).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **The tray** (floating chips) | Beside what you took from the graph (a node or a swept region), in the graph's space, facing you                                                  | The taken chip first, then up to five wider or related chips, each with its count, then "More", then a verbs row. For a node: "Name is Medici" (taken), "Neighbors of Medici -- 6", "Within 2 hops -- 12", "Within 1 hop of [a set it is in]", its most distinctive value, "Not Medici", "Route from here"; verbs: Note, Pin, then after a divider Hide, and "i" (its card). For a region: "In this region -- 7" (taken), "Only the 5 in front", the values all of them share, values most of them share ("Connections at least 3 -- 5 of 7"), "Most connected here: [the top member by the first pinned amount]", "Not these". For a group value or a set: its members' shared values, "Within 1 hop of these", and verbs Note and Keep as set. Tapping a chip swaps it in for the taken chip, and the tray re-forms around what is now taken. The tray closes when you act anywhere else; closing it changes nothing.                                                                                                                                                                                                                 |
| **Temporary surfaces**        | Low, between the graph's lower edge and the result bar, tilted like a desk, never covering more than the lower third of the graph's box           | The algorithm catalog and its options form, the formula editor, the More list, pill and note cards, and the in-scene keyboard, which docks at desk height (about 35 degrees below eye level). A confirm or a choice that follows a verb (Keep's choices, a destructive step's confirm) opens beside the verb that asked for it, so the preview drawn on the graph stays in view.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Objects and where their verbs live

graphty is object-first. Every object has a card that holds its verbs, and the card's values are
tappable and add to the query exactly like rail values. In this design most verbs are reached
without opening a card: the result bar acts on the matches, and the tray carries a node's or group's
commonest verbs.

| Object                  | How you reach it                                                                                                                              | Where its verbs are                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graph                   | The empty query; the statistics strip on the rail header                                                                                      | The result bar's verbs act on the whole graph when the query is empty                                                                                         |
| Selection (the matches) | Whatever the live query matches; graphty-element's selection always equals it                                                                 | The result bar's verbs; any plugin verb that acts on the selection                                                                                            |
| Node                    | Tap it in the graph, or tap its row in Name, a ranked list or Table: either takes "Name is X". Its card opens from the "i" on its tray or row | Its tray (chips and Note, Pin, Hide); its card (every verb)                                                                                                   |
| Edge                    | The Edges side of the rail; a node card's edge list; tap it in the graph when it is thick enough                                              | Its card                                                                                                                                                      |
| Set                     | A value of the "Member of" facet                                                                                                              | Its card: Add these, Take these out, Rename, Rolling, Delete                                                                                                  |
| Run or result           | Its facet header (the run's name, options, scope and seed)                                                                                    | The header menu: Paint by..., Pin, Describe, Sort, Arrange by, Re-run with, Compare with, Split views by, For each value, Keep groups as sets, Export, Delete |
| Style layer             | A pill on a shelf in the Painted strip                                                                                                        | The pill's card: edit, hide, rename, Move up, Move down, Only on [a kept target], Only in view [a saved view], Why this look, delete                          |
| Filter step             | The Inside: chip's list                                                                                                                       | Its card: on or off, Edit (its chips return to the bar, then Update), Invert, "hide from view only / also from algorithms", Remove                            |
| Note                    | Its marker in the graph; the Notes facet; the Project panel's Notes                                                                           | Its card: edit, jump to target, callout on or off, delete                                                                                                     |
| Saved view              | Project panel, Saved views                                                                                                                    | Go to, rename, update, delete                                                                                                                                 |
| Project                 | Project panel                                                                                                                                 | New, Open, Save, Save as, Export, Report, close                                                                                                               |

### Painting: the paint ring and the role shelves (from Encoding Shelves, 29)

The Painted strip on the rail is a column of shelves: Color, Size, Label, Shape, Opacity, Outline,
Edge color, Edge width, and "More shelves" (every other property in graphty's style schema, folded by
group, generated from the schema). A pill on a shelf is one style layer.

- **The paint ring.** Carry a facet header into the graph's box and a ring of the shelves opens
  around your hand: those that accept the facet are lit, the others carry their reason in words.
  Resting on a sector previews the result on the graph; release on it commits one named step ("Paint
  color by PageRank"); release off the ring cancels. Carrying a value or a chip (Ring 7, the current
  matches) into the ring paints those nodes with a fixed property as a layer that targets that query,
  kept and resolved ("Outline: Member of Ring 7"). **Paint these** on the result bar opens the same
  ring for the matches, and the header menu's **Paint by...** opens it for that facet, in front of
  the graph's lower edge: those are the tap paths. Carrying a header onto a shelf on the rail does the
  same as releasing on that sector. There is no "chosen facet" state: a header tap always opens the
  header menu.
- **Refusals that explain themselves.** Shape on PageRank reads "Shape needs groups -- PageRank is
  an amount. Bin it into 3?"; Edge color on a node facet reads "Edge color takes an edge facet -- use
  the mean of both ends?". Nothing is dropped silently.
- **The pill's card** opens after a commit, low: palette, scale (linear, log, reversed), range,
  diverging center (suggested at 0 when a column has both signs), missing color (gray by default,
  with the count of missing nodes), "Only on [a kept target]" and "Only in view [a saved view]".
- **Order.** Several pills on one shelf stack in order, the lowest painting first. A drag along the
  shelf reorders a pill; a drag out of the shelf carries it; Move up and Move down on its card do the
  same by tap.
- **Why this look.** On any node card, "Why this look" lights the pills that painted that node.
- **Presets** on the strip's header apply in place: "Colorblind safe" re-palettes every color pill
  already on the shelves and adds nothing; "Apply preset as new layers" is a separate, named choice.
- **Previews need an element capability.** The ring's preview of "color by PageRank" or "size by
  PageRank" is a style layer applied but not recorded, removed on cancel. graphty-element's
  transient highlight channel carries brightness, fade and outline only, so this needs a previewed
  style layer in the element (see "Shared under every mock"). Until it exists, the mock previews
  Color through the per-node color channel and Size by its legend only.
- **The live role is emphasis, not a layer.** Highlight's fade is not a pill. A saved view stores
  its query and role as the view's emphasis, and Picture, Video and Report draw it without asking.
  Picture asks only when a live highlight is on that no saved view holds: "The highlight is not
  saved -- Keep as view / Keep as a layer / Leave it out".

### Result kinds: every result has a home

Each field an algorithm declares becomes a facet of its kind:

| Result                                                                                                                                       | Facet kind                                                                                                                                                                   | What you can do with it                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A number per node or edge (PageRank, degree, logFC)                                                                                          | Amount: a histogram that turns into a ranked list when sorted, with a range strip down its edge and a summary line for the current result ("mean 2.3, median 2.1, 36 genes") | Brush a range, top N by a stepper, paint, compare, re-run                                                                                                                                             |
| A group per node (communities, clusters, components)                                                                                         | Groups: values with sizes, each with an "i" for its card, and a size strip ("clusters of at least 4")                                                                        | Tap a group, For each value, Keep groups as sets, paint, compare as a cross table, Group table                                                                                                        |
| An order (traversal levels)                                                                                                                  | A stepped strip                                                                                                                                                              | Step through, paint                                                                                                                                                                                   |
| A graph-level value (modularity, density)                                                                                                    | A line on the run's header, and in the statistics strip named with its run ("modularity 0.41 -- Louvain, resolution 1.0")                                                    | Read, compare                                                                                                                                                                                         |
| **A table of tuples** (scored pairs from link prediction and similarity, routes, flow paths, enrichment rows, a parameter sweep's run table) | **Result table**, under its run, plus a group facet it yields ("Predicted for", "On route 1..3")                                                                             | Sort, top N by score, tap a row: a pair or a route fills "On a route from [A] to [B]" in one act; "Add these" puts a row's members on the bar; Compare with on two prediction runs gives overlap at k |

A run of a table-shaped or graph-level algorithm once per group (For each value, Run on these)
writes one combined table with a group column, or one column in the group table: one step, one
Methods line. Run on these records the matches it ran on as a resolved member list in its scope.

**Missing values are counted, never guessed.** A formula facet, a joined column or a per-group run
says how many nodes have no value before it computes ("missing for 71 -- Leave them out (suggested) /
Count as 0"); the choice prints on the facet header and in Methods, and nodes left out get the value
"missing", so they stay countable and narrowable.

**Edges.** The Nodes / Edges switch on the rail header shows the edge facets (edge attributes, edge
results, Membership). Edge chips go in the query's Edges lane. Node chips decide which nodes match;
edge chips decide which edges match; an edge matches when it passes the edge chips and both its ends
pass the node chips (a switch on the Edges lane makes it "either end"). The count names both units
("301 genes, 974 edges"). Filter with only edge chips hides edges and leaves every node, with a
"Drop nodes left with no edges" switch on the Edges lane.

### The record: steps, lookups and scopes

- **Two histories.** Query edits are free and walk back on Back and Forward; they never fill Undo.
  Project changes (keep, run, paint, hide, move, note, layout, turning a kept filter on or off) are
  named steps on Undo and in History. A take from the graph and the swaps made on its tray are one
  query-history entry, so one Back returns to before the take.
- **Keep is a boundary between the two.** Keep moves the live chips into the kept object, empties
  the query, returns the role to Highlight and adds a query-history entry "Kept as Strong families".
  Back across it restores the chips, labeled "Back: PageRank at least 0.070 -- already kept as Strong
  families". Undo of a Keep removes the object and puts its chips back on the bar: "Undo: Keep filter
  Strong families -- its chips return to the bar".
- **Dependents are named.** The preview of an Undo or Delete names every object that depends on what
  it removes: "Also removes 2 pills and the filter Strong families -- Keep their values as a frozen
  column". Back and Forward skip entries whose objects are gone and label them "(gone)".
- **Every step records its scope:** the exact chips, role and kept filters that were on, with time
  windows as dates and sets with their members. Tapping a step's scope in History puts those chips
  back on the bar.
- **Every lookup is recorded.** A relational chip that runs a graph algorithm (k shortest routes,
  all routes up to length L, flow, cut, and any k-hop expansion above 200 nodes) writes a Journal
  entry the moment its result shows: "Looked up: 3 shortest routes, ACC-48213 to ACC-10077, via
  shared device and shared phone, whole graph -- Route 1: ...". It is not an Undo step. The Methods
  view lists lookups under their own heading; Save as recipe offers them as tickable entries with
  their anchors as named inputs ("Known fraudster: [ ]"); "Put back on bar" restores the chip. The
  query history (Back and Forward) is saved with the project.
- **Every run names what it analyzed.** The options form's Scope row always names the kept filters
  that hide things from algorithms, with counts: "441 genes, 2,870 edges -- inside: Piece 1, which
  hides 45 genes from algorithms". The run's header and its History name repeat it. Kept filters are
  "hide from view only" unless you switch one to "also hide from algorithms", and that switch prints
  in words in the Inside: list.
- **Every export names what it writes.** Every Export form starts with a Scope row: "Whole working
  network: 441 genes, 2,870 edges / What is shown: 371 genes, 2,402 edges".
- **Every run records its seed.** A run with no seed set draws one and records it; Re-run with
  prefills it, so comparing resolution 1.0 with 1.5 compares settings, not two random draws. The
  seed is the app's choice for this run, recorded; graphty-element's default stays unseeded.
- **What is kept is resolved.** A kept filter, set, saved view or step scope stores its windows as
  dates and its members as a list. A region chip, when kept, stores the nodes it held. Rolling
  (re-evaluate on load) is an explicit switch on the object's card, shown on the chip; a rolling
  object that changed says so on its card on reopen ("+4, -2 since Oct 3 -- Show changes / Keep as it
  was / Accept"), never as buttons inside a chip.
- **A saved view holds its own state:** its query and role (its emphasis), its camera, and which
  kept filters are on. Go to on a view applies them as one named step; Picture and Video draw each
  view from what it stores without changing the project.

### Parts folded in from other prototypes

| Part                                                                                                                           | From                                                 | Where it lives here                               |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------- |
| The live query, role switch, relational facets, Pivot, the two histories, recorded scopes                                      | Facet Browser (41)                                   | The whole design                                  |
| Role shelves, refusals that explain themselves, "why this look" as visible pills                                               | Encoding Shelves (29)                                | The Painted strip and the paint ring              |
| Result tables and recorded lookups                                                                                             | Facet Browser (41)                                   | The rail, under each run; the Journal and Methods |
| The detented range handle that names who sits just outside, and the route chip whose facets recount for the nodes on the route | Facet Browser (41), The Sheet (27)                   | Amount facets; the Structure group                |
| Discrete focus with no pointing, walked along the graph's edges                                                                | Focus Remote (36)                                    | Focus mode (below)                                |
| The row cursor with filing (Yes, No, Skip, not reviewed)                                                                       | Graph Browser (28), Patch Bay (32)                   | Table                                             |
| One activation rule: press shows the effect with a count, release commits, release elsewhere cancels                           | One Question at a Time (30), shared by all six mocks | Every press in the design                         |
| Region chips, the tray that re-forms around what is taken, and the paint ring in the graph                                     | New in this mock                                     | The graph                                         |

**Focus mode (switch access).** A setting for people who cannot point. One ring of focus moves in
discrete steps: through the rail's facets and values, the query bar's chips, the recovery row, the
result bar's verbs, the tray, the paint ring, and into the graph, where a direction moves to the
neighbor lying that way along an edge, with a signpost on each edge ("Albizzi -- 4 beyond"). "Next
piece" and a jump list of pieces reach nodes with no edges (Pucci) and other components. Three
inputs run it: Next (or a direction), Act and Back. The path that works on every headset with
controllers is their buttons; on Vision Pro, any pinch is Act and the ring advances on its own at a
set pace. A paired keyboard or Bluetooth switch, and thumb swipes read from hand joints on Quest and
Galaxy XR, are "to be checked": whether key presses reach a page during an immersive session is
unknown on all three browsers, and a swipe recognizer is the page's own, kept only if the check shows
it rarely misfires. Act on a node takes it and opens its tray. Every value, chip and verb has a tap
path (OR with another facet and Remove are in the chip's editor, Pin is in the header menu, Paint by
is in the header menu), so the whole basic journey runs without aiming. A region sweep has no Focus
equivalent; region questions are asked there through relational chips.

**Table and the row cursor.** Table lists the result set; the row cursor walks it with Next and
Previous (buttons, or the thumbstick). By default the camera stays still and a leader line runs from
the row to its node; the graph is framed only when the node is out of view. A row can be filed Yes,
No or Skip; filing is recorded as one review step ("Reviewed 20 genes: 14 yes, 4 no, 2 skipped"), and
the filed value becomes a facet ("Reviewed: yes / no / skipped / not reviewed") so a judgment is
narrowable like anything else.

### Shared under every mock

Built once for all six, so the mocks compare interaction and not infrastructure ([the mock recommendation](../xr-prototype-mocks.md),
"What all six share"): one in-scene panel toolkit (text, scrolling lists, tables, generated forms,
an in-scene keyboard with a caret); one text and file service (by default the headset alone: its own
storage and file picker, Save to the headset; optionally paired with a laptop folder and a phone
keyboard); and graphty-element capabilities that every consumer needs (resolved references that
report drift, what is shown kept apart from what is analyzed, a transient highlight channel drawn
over the style layers, a count before a command runs, and a transient-pointer path for Vision Pro).

This mock also needs two non-breaking graphty-element capabilities that every mock would hit, and
that belong on that shared list:

- **Consumer control of XR input on the graph.** Today the element's XR input handler
  (`graphty-element/src/cameras/XRInputHandler.ts`) drags a node on a pinch and its camera claims
  two-hand gestures, and the public XR input options are only hand tracking, controllers, near
  interaction, physics and a depth multiplier. Needed: an option to turn off node dragging and one to
  turn off the camera gestures (both on by default); an XR pointer event stream (press, move, release,
  cancel, each with the input kind, the hand, the ray and the picked node or edge id); and a way to
  register the consumer's own pick meshes (panels, tray, ring, handle) so they win a pick over the
  graph. Without it the mock would have to reach into the Babylon scene and fight the element's
  handler.
- **A previewed style layer:** applied, not recorded, removed on cancel (for the paint ring).

### What is real and what is stubbed

The build is six weeks. The cut line says which checks run on finished controls.

| When                | Part                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | In the mock                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weeks 1 to 4        | Everything the basic journey and the proof journey touch: the rail with search, scrolling, the Nodes / Edges switch, pinned facets and histogram brushing; the query bar and recovery row; the role switch; the sweep, region chips and the tray; the paint ring and the Color, Size and Label shelves with their refusals; the result bar with the node card; the catalog with PageRank and MCL and the generated options form; Keep as filter; Note with a callout; Undo, Redo, Back and Forward; Add data with matched counts; Export CSV; Save to the headset | Real                                                                                                                                                                                                                                                                                                                                                                                |
| Weeks 5 and 6       | The fraud committee journey: recorded lookups and Put back on bar, saved views with their emphasis, Table with the row cursor, Report as a template fill from the Journal, notes and pictures (HTML and Markdown); Focus mode on Quest controllers                                                                                                                                                                                                                                                                                                                | Real                                                                                                                                                                                                                                                                                                                                                                                |
| Present but shallow | Presets, recipe replay on a second dataset, parameter sweeps, rolling differences, Compare cross tables, Split views, merging two networks, Video (a sequence of stills, one per saved view)                                                                                                                                                                                                                                                                                                                                                                      | Opens, lists and acts on precomputed states                                                                                                                                                                                                                                                                                                                                         |
| Throughout          | Facet counts (each facet's values counted in the current result, leaving out its own chips), membership masks, relational facets                                                                                                                                                                                                                                                                                                                                                                                                                                  | Computed in a Web Worker over the mock's own datasets. The frozen snapshot's typed arrays are transferred once at load and only changes are sent after that; whether the host page uses cross-origin isolation (needed for shared memory) is decided in week 1. In the product this is graphty-element work, so the 2D app gets it too                                              |
| Throughout          | The highlight channel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Real, on graphty-element's per-instance color buffer, updated at most every 100 ms during a brush; labels follow on release only                                                                                                                                                                                                                                                    |
| Throughout          | PageRank, degree, MCL, Louvain, k shortest routes, link prediction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Real graphty-element runs                                                                                                                                                                                                                                                                                                                                                           |
| Throughout          | Picture                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Two kinds. "Flat figure, as the 2D page draws it" (SVG, PDF or 300 dpi PNG with a vector legend) comes from the 2D page's exporter working from the project, in a worker or on the paired laptop; stubbed if that exporter is not ready. "This view" is a render-target capture in the headset, capped at 4096 pixels on a side and rendered in tiles behind "Making 4 pictures..." |
| Throughout          | Laptop and phone pairing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Stubbed on the dev machine (shared)                                                                                                                                                                                                                                                                                                                                                 |

Datasets: Florentine families (16 families including Pucci, 20 marriages), Les Miserables (for free
use), a 4,812-account fraud case, a STRING interaction network of 486 genes with a 25-column
expression results table of 14,210 rows, and a 10,000-node synthetic graph with 40 attributes, on
which a free task is run for the scale checks.

**Panel text at speed.** A recount redraws hundreds of printed counts every 100 ms during a brush.
Each facet block gets its own texture and only blocks in view whose counts changed are redrawn;
counts are drawn from a digit glyph atlas or Babylon's sharp-text (MSDF) renderer, so a changed
count is a few changed quads; histogram bars are thin-instanced quads; lists scroll by moving blocks
under a clip plane, not by redrawing.

### Devices and inputs

| Device                           | Input                                                                                                                                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S, hands         | System ray and pinch                                                                                                                             | Point readouts work (the ray hovers). Ray smoothing and a ray-angle offset (so a hand resting on the thigh reaches the eye-level bar without bending the wrist back) are settings. No Web Speech: text from the in-scene keyboard, a paired keyboard, or the phone. A click sound on taps, detents and ring sectors. A hand that returns after a short dropout is a new input source to WebXR; the gesture in flight is matched to it by handedness.                                                                                                                                                                                                                                                     |
| Meta Quest 3 / 3S, controllers   | Ray, trigger, grip, thumbstick, buttons, haptics                                                                                                 | Trigger taps; grip holds the graph, both grips scale and turn; grip plus thumbstick up or down scales, left or right turns by 45 degrees; thumbstick up or down scrolls the list the ray is on; thumbstick left or right is Back or Forward when the ray is on no list; Y is Undo and B is Redo (mirrored by Handedness), each showing its toast on press and committing on release, and moving the thumbstick before release cancels; A is Act in Focus mode. Haptic ticks on detents and ring sectors. The most precise setup for brushing.                                                                                                                                                            |
| Samsung Galaxy XR                | Two input paths: hand rays and pinch as on Quest (optional controllers likewise), and eye-and-pinch through a transient pointer as on Vision Pro | To be confirmed on the device which path a web session gets. Whichever path has no hover gets the Vision Pro rules below. Chrome on Android XR may offer Web Speech for dictation into a field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Apple Vision Pro, eyes and hands | Safari's transient pointer: look and pinch; hand joints with permission                                                                          | No hover, so counts are always printed, and holding a press is how you read before committing ("Fill B: Strozzi -- release to fill"); the hold never changes what release does. A completed pinch fires `select` then `selectend`; a cancelled one fires `selectend` alone, and the page cancels on that, so a lost hand cancels a brush or a carry with or without hand-joint permission. If the device check shows visionOS fires `select` when tracking is lost, the bar shows "Committed when your hand dropped -- Undo" for 3 seconds in that case. The one-handed turn needs no wrist twist: drag an end knob of the graph's handle sideways. Targets are at least 3 degrees tall, sized for gaze. |

Voice, where it exists, only types into an open text field. Device unknowns are marked "to be
checked": the file picker over an immersive session, dictation, downloads on Vision Pro, key presses
from paired keyboards and switches, and whether stored data survives (Safari may delete a site's
storage after 7 days of browser use without visiting it; the mock asks for persistent storage at the
first Save and, on Vision Pro, also writes the project file out on Save).

---

## 3. The control vocabulary

Every press latches its target when it starts. Ray motion in the first 100 ms of a pinch is ignored,
and a press counts as a tap while it moves less than about 4 degrees with hands or 2 degrees with
controllers (adjustable in Settings). Panels win a pick over the graph.

| Input                                                                                                                                                                                                      | Its one meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Point** (hand ray, controller ray; on Vision Pro, where you look when a pinch starts)                                                                                                                    | Read, change nothing. A readout of what is under the pointer: a value's count, a node's name and pinned values, a step's full name. Pointing at a value or a row lights its nodes in the graph. Where a tap would open a crowded list, the readout says "3 nodes here".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Tap**: press, see, release                                                                                                                                                                               | **Take this.** Press shows what release will do, with a count, on the graph and the bar; holding the press keeps that preview up for as long as you like, which is also how you peek at a value's nodes; release on the surface where the press started does it; release anywhere else cancels. On a value, a histogram bar or a list row: add it to the query (or take it out if it is in); a row naming a node takes "Name is X". On a node in the graph: take "Name is X" and open its tray (a crowded spot opens the 5 nodes nearest the ray's axis, front to back, "and 23 more", "Zoom here"). On a tray chip: swap it in for the taken chip. On a chip's "is / not" segment: flip it. On the rest of a chip: open its editor (Exclude, Or with..., Remove, Edit). On the Inside: chip: open the list of kept filters. On a shelf: open its pills. On a facet header: open its menu. On a button or verb: do it. During a one-shot pick (fill a slot, Move): do what the pick names, which the press shows first. |
| **Drag along a list** (a pinch-drag that moves mostly along a list's axis)                                                                                                                                 | **Scroll it,** with inertia. Every long list also has page strips at its ends, which are taps.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Drag across a histogram or on a range strip or handle**                                                                                                                                                  | **Draw a range.** Handles stop with a detent in the gaps between distinct values while 40 or fewer are in view, and at labeled bin edges above that; the readout names who sits just outside. Release on the facet commits the chip; release off the facet cancels. Tap the handle's number for a keypad.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Pull out** (a pinch-drag that moves a value, chip, facet header or pill sideways out of its list or row)                                                                                                 | **Carry it.** Into the graph: the paint ring opens at your hand. On the bar: add it. On another chip: OR the two. On a shelf: paint by it. On the Pinned area: pin it. On the Remove target beside Clear: take it out. Anywhere else, it goes back and nothing changes. During Move (a one-shot pick from a node's card), a drag that starts on that node moves it and pins it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Release on the paint ring**                                                                                                                                                                              | **Paint the graph with what you carried,** on the shelf under your hand, previewed while you rest there. Off the ring: cancel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Sweep**: a pinch-drag that starts inside the graph's box and passes the drag threshold, however long it was held first                                                                                   | **Ask about a region.** A box drawn in the plane through the graph's center, facing you; it selects every node whose projection through your eye (frozen where it was when the sweep started) falls in the box, through the full depth: "7 families -- 2 hidden behind others", the hidden ones drawn with a see-through outline while you hold. Release inside the graph's box takes "In this region -- 7" and opens the tray; release outside it cancels. A second hand pinching before the box passes the drag threshold turns the sweep into a hold: "Sweep canceled -- holding the graph".                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Hold the graph**: a pinch-drag on empty space outside the graph's box, on the graph's handle (a 20 cm bar on the result bar's top edge, with a knob at each end), or with two hands; grip on controllers | **Move, turn, tilt and scale the graph.** Dragging empty space moves it; dragging an end knob sideways turns it (wrist roll is ignored); pushing or pulling an end knob away or toward you scales it; dragging the handle's middle up or down tilts it; two hands scale and turn. Fit and Zoom here are in the View menu. The graph's box is kept between the dead band and the result bar; a move that would push it behind a panel stops, and "Graph is behind a panel -- Fit" shows. A view change, never a step. A pinch on the graph never moves a node.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Back and Forward** (on the recovery row; thumbstick left or right)                                                                                                                                       | **Walk the query history.** The chips come back; the role stays and the label says so in Filter ("Back: Neighbors of Medici -- still Filter, 10 hidden"). A take and its tray swaps, or a stepping session, is one entry. Never an undo step.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Undo and Redo** (on the recovery row; Y and B)                                                                                                                                                           | **Take back, or redo, the latest project change**, named on the button ("Undo: Hide Medici"). A toast at the graph's lower edge repeats what was undone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Type** (the in-scene keyboard; a paired keyboard; the paired phone; voice where the device has it)                                                                                                       | **Fill the open text field.** Every name field is prefilled with a suggested name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Focus mode**: Next (or a direction), Act, Back                                                                                                                                                           | **Move the one focus ring, press what it is on, back out.** The same meanings as Point, Tap and Back, for people who do not point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

There is no long press and no timed meaning anywhere. Tracking dropouts shorter than 0.1 seconds are
ignored. A longer loss freezes the gesture for 0.5 seconds, then cancels it ("Hand lost -- nothing
changed").

---

## 4. The basic journey

Florentine families: 16 families including Pucci, 20 marriages. Seated, Quest 3 with hands, the
headset alone (no pairing). Acts are counted as taps and drags; typed characters are counted apart.
An act counts as **on the graph** when it lands in the graph's space and changes or reads something:
a sweep, a node tap, a release on the paint ring, or a chip on the tray that floats against the nodes
it describes. Holds and turns are view changes, counted apart.

1. **Enter.**
    - **What you do:** On graphty's page in the headset's browser, choose Enter VR. The rail is empty
      except for Open; tap it, then Samples, then Florentine families.
    - **What you see:** The 16 families floating at chest height, labeled, with Pucci floating apart.
      The rail shows three pinned facets: Name (16 values), Connections (computed on load, a
      histogram from 0 to 6) and Piece (2 values). The rail header reads "16 families, 20 marriages,
      2 pieces, density 0.167". The bar reads "All 16 families -- Highlight", with "Tap a value, or
      sweep the graph, to narrow" under it. The Tour starts beside the first control it teaches.
    - **Controls:** tap. 3 acts, none on the graph.

2. **Get oriented.**
    - **What you do:** Point along the Connections histogram. Pinch beside Pucci, the family
      floating apart, drag a box around it and let go. On the tray that opens, tap "Piece 2 -- all
      1". Tap Back. Drag an end knob of the graph's handle a little sideways to turn the graph.
    - **What you see:** Pointing at each bar reads its count and lights those families: "0
      marriages: 1 family", "1: 4", "2: 2", "3: 6", "4: 2", "6: 1". While the box is drawn it reads
      "1 family -- Pucci". Release takes "In this region -- 1 of 16", and the tray offers "Piece 2 --
      all 1 (the whole piece)", "Connections 0 -- all 1" and "Not these". Tapping "Piece 2" swaps it
      in: the bar reads "Piece is 2 -- 1 of 16", every facet recounts for Pucci alone, and the Piece
      facet still shows "Piece 1: 15" so it could be ORed in. Back reads "Back: all 16 families" and
      returns there in one press with no Undo spent, because the take and its swap were one entry.
    - **Controls:** sweep, tray chip, Back, hold. 4 acts: 2 on the graph, 1 view change.

3. **Find the Medici.**
    - **What you do:** Sweep a box around the dense knot of families in the middle of the graph. On
      the tray, tap "Most connected here: Medici -- 6".
    - **What you see:** While you draw: "7 families -- 2 hidden behind others", the two drawn with a
      see-through outline. Release takes "In this region -- 7 of 16" and the facets recount for the
      seven. The tray offers "Only the 5 in front", "Piece 1 -- all 7", "Connections at least 3 -- 5
      of 7" and "Most connected here: Medici -- 6". Pressing the last shows "Name is Medici -- 1 of 16
      -- release to swap"; on release Medici stays bright and the rest fade, and the tray re-forms
      around Medici: "Neighbors of Medici -- 6", "Within 2 hops -- 12", "Piece 1 -- 15", "Not
      Medici", "Route from here", and Note, Pin, Hide and "i". (Typing "Med" in the Name facet's
      field gets there too; in a large graph that is the faster path.)
    - **Controls:** sweep, tray chip. 2 acts, both on the graph.

4. **Who they married into.**
    - **What you do:** On Medici's tray, tap "Neighbors of Medici -- 6". (Pivot to neighbors on the
      result bar does the same from the panel side.)
    - **What you see:** Pressing previews "6 of 16 families" on the graph; release swaps it in.
      Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati and Tornabuoni light, and Medici dims. The
      facets recount for the six: Connections now shows 1 family at 1, 2 at 2, 3 at 3. The camera
      has not moved; "Frame" on the result bar's count would bring them to the middle. The tray
      re-forms around the six ("These 6", "Piece 1 -- all 6", "Within 1 hop of these -- 10"). The six
      are graphty's selection now.
    - **Controls:** tray chip. 1 act, on the graph.

5. **Who matters most (PageRank).**
    - **What you do:** Tap Add facet at the top of the rail. In the catalog that opens low in front
      of you, the Suggested row offers "Influence (PageRank)"; tap it. The form shows Damping 0.85,
      Maximum iterations 100, Tolerance 1e-6, Weight (none), and a Scope row; leave Scope at "All 16
      families" and tap Compute.
    - **What you see:** The Scope row reads "All 16 families, all 20 marriages -- no kept filter
      hides anything from algorithms", so what will be analyzed is never a guess. A facet "Influence
      (PageRank)" pins itself under the Painted strip as a histogram, with a progress ring for the
      moment it computes and then a summary line, "mean 0.063, 0.010 to 0.145". The six in-laws'
      values are bright in it and the other ten faint, because the query still matches the six.
      History gains "Run PageRank -- on all 16 families".
    - **Controls:** tap (Add facet, catalog entry, Compute); the generated options form. 3 acts.

6. **Read the result.**
    - **What you do:** Tap Clear on the query row. Open the PageRank header's menu and choose Sort by
      value. Point down the ranked list.
    - **What you see:** The histogram becomes a ranked list, each row carrying the pinned Connections
      beside its value: Medici about 0.145 (6), Guadagni about 0.098 (4), Strozzi about 0.088 (4),
      Albizzi 0.079, Tornabuoni 0.071, Ridolfi 0.069, Castellani 0.069 ... Pucci about 0.010. The
      second and third families are compared on adjacent rows, and pointing at a row lights that
      family where it sits in the graph. Describe on the header reads "PageRank, damping 0.85, seed
      not used, all 16 families; Pucci has no marriages, so its value is the share every family gets
      by chance".
    - **Controls:** tap (Clear, header menu, Sort), point. 3 acts.

7. **Color and size by PageRank.**
    - **What you do:** Pull the PageRank header sideways off the rail and carry it into the graph;
      release on Color in the ring that opens at your hand. Tap a sequential palette on the pill's
      card. Carry the header into the graph again and release on Size.
    - **What you see:** As the header leaves the rail, the Painted strip expands to every shelf; as
      it enters the graph's box, the ring opens around your hand with Color, Size, Label and Opacity
      lit and Shape reading "Shape needs groups -- PageRank is an amount. Bin it into 3?". Resting on
      Color previews the colors on the nodes in front of you; release commits "Paint color by
      PageRank", and the pill's card opens low with its palettes. Size takes its default range, 1x to
      3x, and Medici becomes the largest node in the graph. The strip folds back to the two shelves in
      use, each one line with its legend. History gains "Paint color by PageRank" and "Paint size by
      PageRank".
    - **Controls:** carry into the ring (twice), tap a palette. 3 acts, 2 on the graph.

8. **Keep only strong families (filter).**
    - **What you do:** On the ranked list's range strip, drag the "at least" handle down to 0.070
      (or tap its number and type 0.070). Tap Filter on the role switch. Tap Keep, then "Hides from
      view only" beside it, and accept the suggested name "Strong families".
    - **What you see:** The handle stops in each gap between two families' values, with a round
      number in the gap, and its readout names the edge: "at least 0.070 -- 5 of 16; Ridolfi and
      Castellani at 0.069 are out". In Filter role the other 11 vanish: "PageRank at least 0.070 -- 5
      of 16 families, 4 marriages -- 11 hidden". Medici, Guadagni, Strozzi, Albizzi and Tornabuoni
      remain, and Strozzi stands alone: none of its four marriages is to another strong family. Keep
      in Filter role offers two choices beside the verb: "Keep filter -- hides from view only; later
      runs still see all 16" and "Keep filter -- also hides from algorithms". After it, an "Inside:
      Strong families" chip starts the query row, the live query is empty, the role returns to
      Highlight, and every facet counts only the five. The query history gains "Kept as Strong
      families"; History gains "Keep filter: Strong families (PageRank at least 0.070)".
    - **Controls:** drag a handle (or keypad), tap the role switch, tap Keep and its choice. 4 acts.

9. **Write a note.**
    - **What you do:** Tap Medici, now the largest node. On its tray, tap Note, and type "Married
      into six families; the hub of the network." on the in-scene keyboard, which docks at desk
      height and offers completions from the data's names. Tap Done.
    - **What you see:** The tap takes "Name is Medici -- 1 of 5" and opens Medici's tray beside it.
      The note card opens low with its target, "Medici", and a caret you place by pointing; the graph
      above it stays in view. When it closes, a small marker hangs on Medici, and a Notes facet
      appears on the rail ("Has a note: 1"), so notes are found and narrowed like anything else.
    - **Controls:** tap a node, tray verb, type, Done. 3 acts (2 on the graph) and 52 characters
      (fewer with completions).

10. **Undo a mistake.**
    - **What you do:** You want to look at the other four strong families without Medici. You tap
      Medici to reopen its tray and tap Hide, reading it as "leave Medici out". Its press preview
      says "Hide Medici: 1 family, 2 visible marriages (the other 4 are already hidden by Strong
      families) -- a project step", but you are watching the graph, and you release. Tap Undo on the
      recovery row. Then tap the "is" segment of the "Name is Medici" chip on the bar, which is what
      you meant.
    - **What you see:** Medici disappears; Hide is a filter step, listed under the Inside: chip.
      Undo reads "Undo: Hide Medici"; after it, Medici returns with its note, the Inside: list is
      back to one filter, and Redo reads "Redo: Hide Medici". Back, beside it, reads "Back: all 5
      inside Strong families" -- the query before you tapped Medici -- and would not have helped,
      because hiding is a project change, so the two histories are told apart in words. Flipping the
      chip to "Name is not Medici" fades Medici and hides nothing: "4 of 5", a query edit that Back
      takes back.
    - **Controls:** tap a node, tray verb, Undo, chip segment. 4 acts, 2 on the graph.

11. **Save.**
    - **What you do:** Tap Project on the rail header, then Save, then Save again under the
      suggested name "Florentine families".
    - **What you see:** "Saved to this headset: Florentine families -- 1 run, 2 layers, 1 filter, 1
      note", and where it lives. The live query, its role and the query history are saved too, as
      where you were.
    - **Controls:** tap. 3 acts.

**The count.** 33 acts and 52 typed characters; median 3 acts a step, at most 4. 11 of the 33 acts
land on the graph and do work, about 1 in 3: two sweeps (Pucci, the knot), two releases on the paint
ring, two node taps (Medici, in steps 9 and 10) and five tray chips (Piece 2, Most connected here,
Neighbors of Medici, Note, Hide). One more act, the turn, is a view change. Counting only the acts
made directly on nodes, regions and the ring (leaving out the tray), it is 6 of 33, about 1 in 5.5.
Nodes are found by region and by value; the only node taps are on Medici after it is sized as the
largest node.

---

## 5. Harder journeys

### Proof journey: gene list to expression map and clusters

Stress journey 3 in the functionality inventory (a studio working file, not committed), which joins workflows W20 (expression overlay)
and W21 (cluster annotation) in `design/designloom/workflows/`. Persona: Dr. Priya Raman, a cancer
genomics postdoc (`design/designloom/personas/genomics-cytoscape-user.yaml`). She has 300
differentially expressed genes, queried STRING on her laptop for their interactions, and has her
RNA-seq results as a 25-column table. Apple Vision Pro, seated, paired with her laptop folder. The
numbers are illustrative.

1. **Open the network.**
    - **What you do:** Project, Open, the laptop folder, `string_interactions.csv`. The reader offers
      source = node1 and target = node2 from the header row; tap Proceed.
    - **What you see:** "Read as CSV edge list -- 486 genes, 2,912 edges, 0 issues". Its edge
      columns (combined_score and 7 more) arrive as facets on the rail's Edges side. The graph lays
      out as one large cloud with 19 small pieces floating around it. Pinned: Name, Connections,
      Piece.
    - **Controls:** tap. 5 acts, none on the graph.

2. **Keep the largest component as the working network.**
    - **What you do:** Sweep a box around the large cloud. On the tray, tap "Piece 1 -- all 441".
      Tap Filter, then Keep, then "Also hides from algorithms". (Tapping "Piece 1 -- 441" on the
      rail's Piece facet does the same as the sweep.)
    - **What you see:** While drawing: "452 genes -- 11 are in small pieces in front of or behind the
      cloud". The tray offers "Piece 1 -- all 441 (441 of 452 here)"; it swaps in. In Filter role the
      small pieces vanish: "441 of 486 genes -- 45 hidden". After Keep, the query row starts "Inside:
      Piece 1 -- also hidden from algorithms", and the rail header reads "Working network: 441 genes,
      2,870 edges (45 genes in 19 small pieces hidden from view and algorithms)".
    - **Controls:** sweep, tray chip, role switch, Keep and its choice. 5 acts, 2 on the graph.

3. **Add the expression table and read how many rows matched.**
    - **What you do:** Project, Add data, `deseq2_results.csv`. The join form lists the table's
      columns with how many network genes each would match; tap gene_symbol. Tap "Match ignoring
      case". Proceed. Then tap "no row -- 15" in the new join facet, look, and tap Back.
    - **What you see:** Before anything changes: "gene_symbol -- 422 of 441 genes; ensembl_id -- 0;
      description -- 0", then "4 more match ignoring case (C1orf112 / C1ORF112)", with "Match through
      a mapping column or table" for aliases. After Proceed: "Joined deseq2_results.csv by gene_symbol
      (ignoring case): 426 of 441 genes matched a row; 15 have no row; 13,784 rows match no gene in the
      network and were not added." The 25 columns arrive as facets in a "deseq2_results" group, each
      with its inferred kind (logFC, pvalue and padj as amounts, biotype as groups), and a join facet
      reads "matched 426, no row 15". Tapping "no row" lights the 15 in the graph: mostly interactors
      STRING added that she did not measure.
    - **Controls:** tap. 8 acts, none on the graph.

4. **Color by logFC, diverging, centered on zero, gray where missing.**
    - **What you do:** Carry the logFC header into the graph and release on Color. On the pill's
      card, tap the red-blue diverging palette.
    - **What you see:** The ring lights Color, Size, Label and Opacity. The card reads "Diverging,
      centered on 0 (suggested: the column has both signs), missing: gray (15 genes)". The Color
      shelf's legend runs from -4.2 through 0 to +5.1, with a gray swatch "no row: 15". History gains
      "Paint color by logFC".
    - **Controls:** carry into the ring, tap. 2 acts, 1 on the graph.

5. **Size by p-value on a log scale; label by gene symbol.**
    - **What you do:** Carry the pvalue header into the graph and release on Size. On the pill's
      card, tap Log, then Reversed (smaller p draws larger). Carry the Name header into the graph and
      release on Label.
    - **What you see:** The Size legend reads "pvalue, log scale, reversed: 1e-12 largest, 1 smallest;
      missing: smallest size (15 genes)". Labels appear on every gene; the Label pill's card offers
      "all / the largest 50 by Size / on pointing" for later.
    - **Controls:** carry into the ring (twice), tap twice. 4 acts, 2 on the graph.

6. **Run Markov clustering with inflation 2.5; open the clusters by size.**
    - **What you do:** Add facet, the Clustering family, "Markov clustering (MCL)". In the form, tap
      Inflation's number, type 2.5 on the keypad, OK; Compute. Then the Cluster header's menu, Group
      table.
    - **What you see:** The Scope row reads "441 genes, 2,870 edges -- inside Piece 1, which hides 45
      genes from algorithms", and the run records the seed it drew. A Cluster facet appears: "38
      clusters". The group table opens to the right, sorted by size, one row per cluster with its
      size and the mean of each pinned amount: "Cluster 1 -- 64 genes, mean logFC -0.4"; "Cluster 2 --
      36 genes, mean logFC 2.3"; ... History gains "Run MCL (inflation 2.5, seed 4127) -- on Piece 1,
      441 genes".
    - **Controls:** tap, keypad. 8 acts and 3 characters, none on the graph.

7. **Hide clusters under 4 genes; take cluster 2 and read its mean logFC.**
    - **What you do:** On the Cluster facet's size strip, drag the lower handle to 4. Tap Filter, then
      Keep, then "Hides from view only". Then sweep a box around the bright red knot at the right of the
      graph and tap "Cluster 2 -- all 36" on the tray. (Tapping cluster 2's row in the group table does
      the same.)
    - **What you see:** "Clusters of at least 4 genes -- 17 clusters, 371 of 441 genes; 21 clusters
      (70 genes) out". After Keep, "Inside: Piece 1; Clusters of 4 or more". The sweep reads "38
      genes"; the tray offers "Cluster 2 -- all 36 (36 of 38 here)" and "logFC at least 1 -- 31 of 38".
      After the swap, the bar reads "Cluster is 2 -- 36 of 371 genes", and the logFC facet's summary
      line reads "mean 2.3, median 2.1, 36 genes". Cluster 2 is graphty's selection.
    - **Controls:** drag a handle, role switch, Keep and its choice, sweep, tray chip. 6 acts, 2 on
      the graph.

8. **Label cluster 2 "ribosome biogenesis" on the map.**
    - **What you do:** On the tray, which has re-formed around cluster 2, tap Note. Type "ribosome
      biogenesis". Turn Callout on. Done.
    - **What you see:** The note targets "Cluster 2 of MCL (inflation 2.5, seed 4127)", stored with
      its 36 members. Its callout draws the label at the cluster's center, in the scene, and every
      Picture includes it. The Notes facet reads "Has a note: 1".
    - **Controls:** tray verb, type, tap. 3 acts (1 on the graph) and 19 characters.

9. **Export the figure with its legend as SVG, and the node table with the joined columns as CSV.**
    - **What you do:** Clear. Project, Picture, "Flat figure, as the 2D page draws it -- SVG", Save.
      Project, Export, "Node table -- CSV", Save.
    - **What you see:** Picture asks nothing, because no live highlight is on. The SVG lands in the
      laptop folder: 371 genes from her current viewpoint, drawn flat, with vector legends for Color
      ("logFC, diverging, centered on 0; gray: no row") and Size ("pvalue, log, reversed") and the
      "ribosome biogenesis" callout. The Export form's Scope row offers "Whole working network: 441
      genes" (chosen) or "What is shown: 371 genes"; the CSV has every node column, the 25 joined ones
      included. The Methods view lists the read, the component filter, the join with its matched
      counts, the two paint layers, MCL with its inflation, seed and scope, and the size filter.
    - **Controls:** tap. 9 acts, none on the graph. Putting the figure into the paper happens on the
      laptop, where the manuscript is.

**The count.** About 50 acts and 22 typed characters. 8 land on the graph and do work, 1 in 6: two
sweeps (the cloud, cluster 2), three releases on the paint ring, and three tray chips. Loading,
joining, running and exporting are panel work here, as they would be on any surface; the graph
carries the steps that ask where something is (the large component, the red cluster) and what the
map should look like. Every success criterion of the journey is a reading in the headset: the matched
count in step 3, the legends in steps 4 and 5, the cluster table in step 6, the mean logFC in step 7,
the files in step 9.

### Second journey: the fraud case for a committee

The Findings Communication workflow (W15 in `design/designloom/workflows/`). This is not stress
journey 6, which Cutting Room proves; it shows the recorded lookups and the saved views. Persona:
Sarah, a fraud investigator (`design/designloom/personas/fraud-analyst.yaml`), a week after she
found "Ring 7": 23 accounts sharing devices and phones, linked by a route to a known fraudster. The
case holds 4,812 accounts. Her audience is the bank's fraud committee, who are not graph experts.
Quest 3 with hands, seated, paired with her phone for typing. The numbers are illustrative.

1. **Reopen the case and name the audience.** Project, Open, recent, "Case 2026-114"; Project,
   Report, New report; type "For: fraud committee" on the phone. The case reopens where she left it:
   the kept filter "New shared-device accounts" (Aug 27 to Sep 26, 2026), the set Ring 7 with its 23
   stored members, and the query history. About 6 acts, none on the graph. Deciding who the audience
   is happens with her manager, not in the headset.
2. **Title.** Tap the title field and type "Ring 7: 23 accounts on 4 shared devices route funds to a
   known fraudster" on the phone. 1 act and about 70 characters.
3. **Bring back the finding the case rests on.** Project, History and Journal; under Lookups, tap
   "Looked up: 3 shortest routes, ACC-48213 to ACC-10077, via shared device and shared phone", then
   Put back on bar. The route chip returns with what it found a week ago ("Route 1: ACC-48213,
   ACC-51190, ACC-10077 ..."), and the facets recount for the accounts on the routes ("Created: 9 of
   11 in the last 30 days"). About 4 acts, none on the graph.
4. **Style for the audience.** On the Painted strip's header, Presets, Colorblind safe: it
   re-palettes the community color pill in place and adds nothing. Sweep a box around the ring's knot
   in the graph: "27 accounts". On the tray, tap "Member of Ring 7 -- all 23 (23 of 27 here)"; the
   tray re-forms around Ring 7; tap "Within 1 hop of Ring 7 -- 41 -- 9 hidden by New shared-device
   accounts". Tap the words "9 hidden by New shared-device accounts", which open that filter's card,
   and turn it off: one named step, "Turn off filter: New shared-device accounts", so the
   long-standing accounts that connect the ring are shown, not missing. Then carry the Ring 7 value
   from the Member of facet into the graph and release on Outline: "Outline: Member of Ring 7", a
   pill above the community color. About 8 acts, 4 on the graph.
5. **Annotate.** Tap the ringleader account at the ring's center; the crowded-tap list offers it by
   id among 3 nearby. On its tray, Note; type "Opened all four shared devices within 3 days." on the
   phone; Callout on; Done. About 5 acts and 47 characters, 3 on the graph.
6. **Context, finding, implication, recommendation.** Four saved views, each made by setting the
   query and the camera and then Keep, as view: "1 Context" (the 1-hop query from step 4 in
   Highlight, so everything else is faded; Fit); "2 The ring" (Member of Ring 7, Frame); "3 The
   route" (the route chip, back via History's scope, Frame); "4 Freeze these" (Member of Ring 7, then
   the risk score handle at 0.8 or more, then Keep, as set "Freeze list", 17 accounts). Each view's
   card shows what it holds: query, role, camera, and which kept filters are on. Views never change
   the Painted strip, so all four share one palette, and each draws its own emphasis. A one-line
   caption note on each. She drags the views into story order. About 22 acts and 160 characters,
   none on the graph.
7. **Production.** Project, Picture, "All saved views", "Flat figure -- 300 dpi PNG", legend and
   notes on: each view drawn from what it stores, with no question about highlights, because each
   view's highlight is its saved emphasis. Video, "Tour the saved views" (stills in the mock). Table
   with "Freeze list", Export CSV (Scope: "Freeze list: 17 accounts", every pinned column). Report:
   tick sections (Context, Findings from notes, Figures from views, Methods, Caveats), Generate, HTML.
   The Methods section comes from the Journal, including the route lookup with its k, edge types and
   route list and the filter turned off in step 4; Caveats are filled from each run's Describe for
   her to keep or cut. About 16 acts.
8. **Validation with the audience.** Save as "Case 2026-114 committee"; send the report to the
   laptop folder. The colleague review happens on the laptop, where the 2D page opens the same project
   with the same views. About 4 acts.

**The count.** About 66 acts and about 300 typed characters; 7 on the graph (the ring sweep, its tray
chips, the Outline drop, the ringleader and its tray), about 1 in 9. This is writing and production
work, where panels are the right tool; the graph carries finding the ring's context and marking it.

---

## 6. How it grows

Every list, form, facet, shelf and ring is generated from graphty-element's descriptors, so a new
entry needs no VR code and no new control.

- **The algorithm catalog with options.** Add facet opens the catalog: Suggested, Recent, families
  with plain and technical names ("Influence (PageRank)"), an A to Z tab, search by either name, and
  cost and preconditions on each entry; any of 60+ entries in three or four acts. The options form is
  generated: numbers as stepper plus keypad (with an exponent key for 1e-6), choices as chips, an
  attribute as a facet pick, a node as an A / B slot filled by tapping a node or sweeping a region in
  the graph, Show advanced, Reset, the Scope row and the seed. Re-run with keeps both results as
  sibling facets; a list in a number field ("0.5, 1.0, 1.5") is a sweep, with a run table under the
  parent (one row per run, its graph-level values, and agreement between runs). Each declared result
  field becomes a facet of its kind, and the result table holds anything shaped as rows.
- **Relational facets from the graph.** Every slot in a relational chip ("Neighbors of [ ]",
  "Within k hops of [ ]", "Route from [A] to [B]", "Through [ ]") is filled by sweeping a region, by
  tapping a node, or by a value; a region fills it with the region's members, resolved when kept.
- **Layouts.** Lay out these under More on the result bar (the whole graph when the query is empty):
  the layout list, then the generated form; a focus node is a slot. The current layout, Re-run,
  Reshuffle seed and Stop sit in the View menu. Arrange by on a facet header puts groups in columns
  or an amount on an axis, and a sweep across that axis offers the matching range on its tray. Move a node
  through its card.
- **Styling layers.** A new style property joins "More shelves" and the paint ring from the style
  schema; a plugin palette joins every color pill's palette list; presets apply in place.
- **Compare.** Compare with on two results (a rank-change list, a cross table, or overlap at k for
  two tables); Split views by any group facet, with shared or separate positions (above 2,000 nodes
  on Quest the second view draws its nodes as camera-facing instanced quads of fixed angular size);
  Suppose gone on a card (a before and after table); two selections are two "Member of" values. A
  comparison worth keeping is kept as a view.
- **History and recipes.** History lists steps with their scopes; the Journal adds lookups; Methods
  prints both. Save as recipe from ticked steps and lookups; replay asks every node anchor, group
  value, time window, input file and join column as a named input, resolves each against the new
  data, and shows each scope's size and each join's matched count against the ones recorded before it
  runs.
- **Import, export and reports.** Readers join Open and "Read as"; their columns arrive as facets;
  Add data joins a table by a key with a matched count; writers join Export with their options form
  and its Scope row; Picture, Video and Report come from the Project panel.
- **Plugins.** An algorithm joins Add facet by family; a layout joins Lay out; a reader joins Open;
  a writer joins Export; a palette joins every color pill; a verb a plugin declares for a set of nodes
  joins More and For each value, and acts on graphty's selection; a new object type becomes a
  "Member of" facet, a relational facet built from a sentence template with typed slots, and its own
  card.
- **AI.** Not in this mock. If added later, an assistant would write dashed chips onto the bar for
  the person to accept, so its answers stay inspectable as queries.

**The honest limit.** The design is as good as its facets. Work that is not "narrow by a value or a
place" fits badly: drawing a pattern template and placing freeform highlight shapes go to the 2D page
(a swept region kept as a note covers simple shapes); rules nested deeper than one OR bracket are
slow; long text needs the phone, the laptop or a paired keyboard. Relational and route facets count
live only up to about 2,000 nodes and after release above that; "all routes up to length L" is
capped at 200 listed routes. A rail of 60 facets lives or dies by its search, its scrolling and the
Pinned area.

---

## 7. Checks inside the mock

Each is measured while people do the journeys above or a 20-minute free task, not as a separate
test.

- **Frame time across the journeys.** Frame time logged on each headset through every step of the
  basic, proof and fraud journeys and the free task, at each journey's own size (16 to 4,812
  nodes), and during a free task run on the 10,000-node synthetic graph; any frame over budget is logged with what was on
  screen. The brushing results are reported at the largest size that held the device's rate during
  those steps; the worker recount check stays at 10,000.
- **Recount latency and frame time.** Time from a tap to updated counts on every facet, with 40
  facets at 1,000 and 10,000 nodes; the graph's highlight update while a brush moves; and frame time
  during a brush with the rail in view, which is where text redraw costs show. Targets: counts within
  100 ms at 10,000 nodes; the frame held at the device's rate (72 to 90 Hz) during brushing.
- **Graph share of acts.** Over the unpaired basic journey and the free task: acts on the graph
  that do work (sweeps, node taps, ring releases, tray chips), the same without tray chips, and view
  changes, each against acts on panels. The set's bar is 1 in 4; this mock is built knowingly under
  it on the strict count (section 8, "Known risks"), so the free task decides what the share means.
  Also logged: how often a sweep or a node
  tap is the first act of a question.
- **Sweeps and trays.** How often people sweep, how often they take a tray chip and which one,
  whether "values most of them share" is the chip they wanted, and how often "Only the N in front"
  is taken (a sign that full depth surprised them).
- **The paint ring.** Releases on a neighboring sector (then undone), cancels, and time against the
  shelf on the rail.
- **Taps read as drags.** Taps that became a carry, a range or a sweep, hands against controllers,
  at the 4 and 2 degree thresholds.
- **Role confusion.** How often people act while in Filter role without meaning to (a node tap in
  Filter hides everything else), and whether they tell Highlight from Filter without help.
- **The two histories.** How often Undo is pressed after only query edits, or Back after a project
  change; whether Hide and "not" are told apart.
- **Reading comfort.** Reading the rail at 25 degrees left, seated, for an hour, including a
  60-facet rail at the largest text size; viewing distance and eye strain; neck angle; and wrist
  extension toward the eye-level bar from a hand resting on the thigh, with and without the ray-angle
  offset.
- **Label length and bar width.** The shortest step name that still tells two MCL runs apart, at the
  default and largest text size, on the recovery row; the result bar's width at the largest text size
  against its 60-degree cap.
- **Graph coverage.** The share of the graph's box covered while each temporary surface is open
  (target: at most the lower third).
- **Dense picking.** Twelve scattered nodes among 400 and among 10,000, on Quest with hands and with
  controllers: by sweeping and swapping on the tray, by typing names into the Name facet with OR, and
  by tapping in the graph with the crowded-tap list; time and errors for each.
- **Brushing precision.** How often the handle lands on the intended threshold on the first drag,
  hands against controllers, and how often the keypad is used instead.
- **Result tables.** Time to explain one link prediction (tap a pair row, read the route and the
  recounted facets) against typing two ids.
- **The record.** Whether people read a step's scope and a lookup in History, and whether the
  Methods paragraph written from the headset is complete when checked against what was done.
- **Switch access.** Whether the basic journey can be done in Focus mode with controller buttons,
  and in how many presses; on Vision Pro with pinch as Act and the self-advancing ring; the other
  input paths once checked.
- **Vision Pro and Galaxy XR.** Panel taps, brushing, sweeps and the ring with the transient
  pointer; whether visionOS fires `select` on tracking loss; which input path Galaxy XR's browser
  gives.
- **Storage.** Whether a project saved to the headset is still there after a week without opening
  the site, on each headset.

---

## 8. Why it should work, and known risks

### Why it should work

- **Counts before you tap guide exploration.** Faceted browsing beat keyword search for open-ended
  exploration in Flamenco (Yee, Swearingen, Li and Hearst, CHI 2003): people felt less lost, mainly
  because a count on every value tells them what the next step will give. The pattern has shipped
  for two decades in shopping sites, library catalogs, Lightroom and Kibana.
- **Display that follows the control.** Dynamic queries (Ahlberg, Williamson and Shneiderman, CHI 1992) made people faster and more accurate than a typed query form; Spotfire commercialized it.
  Brushing a histogram with live counts is the same mechanism.
- **Pivoting through a network with visible history.** PivotPaths (Dork, Henry Riche, Ramos and
  Dumais, IEEE TVCG 2012) and GraphTrail (Dunne, Henry Riche, Lee, Metoyer and Robertson, CHI 2012)
  showed that pivoting through facets and neighbors, with a visible trail, lets people explore linked
  data without getting lost. The tray that re-forms around what is taken is that pivot, done at the
  place in the graph.
- **Placing a field on a role is how analysts already encode.** Polaris (Stolte, Tang and Hanrahan,
  IEEE TVCG 2002), which became Tableau, made shelves the standard way to say "color by this".
  Marking menus (Kurtenbach and Buxton, CHI 1994) showed that a radial menu opened where the hand
  is becomes fast with practice; the paint ring is one.
- **Panels with ray pointing are the reliable menu technique in headsets** for list-like choices
  (Bowman and Wingrave, IEEE VR 2001), and Quest and visionOS ship their own menus that way. This
  design keeps list choices on panels and uses the graph for what is spatial: sweeping a region,
  painting where you look, walking outward from a place.
- **It avoids the act VR does worst.** Selecting small nodes by pointing in a headset is slow:
  the functionality inventory (a studio working file, not committed) cites 12 to 21 seconds a node under 1 degree wide. Here nodes are
  found by region, value, range and relation, which do not depend on target size; a node tap is a
  secondary path.

### Known risks

| Risk                                                                                    | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The graph becomes a passive picture beside the rail                                     | This mock is built knowingly under the set's rule that one act in four lands on the graph. By the strict count (sweeps, ring releases and node taps only, no tray chips) the basic journey is 6 of 33; the proof journey is about 1 in 6 even counting the tray, because loading, joining and exporting are panel work. It is not reworked to raise the count, because more node acts would remove what it tests: whether people need to aim at nodes at all. Sweeps, the tray and the paint ring are the main path, and the graph-share check measures them. If on the free task people also leave the graph alone, the finding is that a query rail does not need a headset; the mock is not carried forward as a design of its own, and its sweeps, region chips and paint ring go into another host |
| A sweep in a dense 3D graph takes nodes the person did not mean                         | Full depth is stated in the count and drawn as see-through outlines while the box is held; "Only the N in front" is the first tray chip; a take is one Back away                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Node taps change the query, so a tap in Filter role hides everything else               | The press previews "Name is X -- 1 of 16 -- 15 will be hidden" in Filter; Back undoes it; the role-confusion check counts it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Filter role hides things silently                                                       | Highlight is the default and Keep returns to it; Filter always prints "N hidden"; the role is named in words and color; Back in Filter says "still Filter"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Two histories confuse people                                                            | Back and Undo sit side by side on a full-width row, each naming what it takes back; Keep is a named boundary between them; a hint when Undo follows only query edits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Relational facets break the facet rule on purpose (routes are found in the whole graph) | The chip says "in the whole graph" and how many routes pass outside the other chips; a "Through [ ]" slot and an "only inside my chips" switch for the other reading                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The facet engine is real graph computation                                              | In a worker for the mock; in the product it belongs in graphty-element (per-value counts, masks, relational facets), where the 2D app gets it too. Relational counts after release above about 2,000 nodes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The mock cannot be built on graphty-element as it is                                    | Two non-breaking element capabilities (XR input control, a previewed style layer) are named in section 2 and must land before the build                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Reading load: counts on every value is a lot of small text                              | Large type, pinned facets on top, the Painted strip folded to the shelves in use, the rest folded by kind and sorted by count, and the graph lit by pointing so reading is backed by seeing; high contrast draws a zero as a struck "0" and an undone chip with a full-contrast outline, not gray                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Head turns between the rail, the bar and the result bar                                 | The bars frame the graph and are capped at 60 degrees; only the rail and the right panels are off to the side; temporary surfaces open low at the center; Larger and Handedness; nothing above 10 degrees over eye level                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Text entry without a keyboard                                                           | Suggested names everywhere, formulas from chips, the in-scene keyboard with completions, the paired phone, a paired keyboard, the laptop for long text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Not memorable as a metaphor                                                             | It is a plain idea; the vocabulary is a short table, Help lists it, and the Tour teaches sweep and swap, tap a value, Back, carry into the ring, a handle and Keep                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Repetitive per-group work                                                               | For each value with a preview, one step; the row cursor for review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Device unknowns                                                                         | Marked "to be checked" in section 2; the default path is the headset's own storage, with persistent storage asked for and the project file written out on Vision Pro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 9. What we learn by building it

- **Whether a headset user needs to aim at nodes at all.** This is the only mock whose answer to
  dense picking is not to point at a node: narrowing by regions, values, ranges and relations, with a
  node tap kept for "what is this one". If people finish the journeys faster and with fewer errors
  here than in the mocks that point, graphty in VR should be built around the query, not the cursor;
  if they keep reaching for single nodes, it should not.
- **Whether a region of the graph works as a query input.** Sweeping a volume and getting back a
  chip, plus "the values these share", and walking outward on the tray, is new and unreviewed. The
  mock shows whether people use it, whether full depth surprises them, and whether the tray's chips
  are the ones they wanted.
- **Whether painting at the graph beats painting at a panel.** The ring opens where the hand is and
  previews on the nodes in view; the shelf on the rail does the same from the side. The mock times
  both and counts mis-releases.
- **Whether one live query with a role switch beats separate select and filter tools in a
  headset,** where an unnoticed Filter hides things outside your view.
- **Whether a count before every step reduces errors where precise reading is hard.** A headset
  makes small text and fine aiming expensive; counts printed on large targets may matter more here
  than on a monitor.
- **Whether the posture holds for an hour:** arms low, nothing held, large targets on a rail and two
  bars at a fixed reading distance, compared with the mocks that hold a plate or work on the graph by
  hand.
- **Whether switch access can do real graph work in a headset.** Focus mode runs the whole basic
  journey without pointing; no other mock tests it.
- **Whether the facet engine is worth building in graphty-element.** Per-value counts, masks and
  relational facets would serve the 2D app too; the mock's latency checks tell us what that engine
  must meet at 10,000 nodes before anyone builds it.

---

## Review notes

### Round 1

Reviews are in `reviews/r1-facet-browser-1.md` (owner's advocate), `reviews/r1-facet-browser-2.md`
(VR interaction), `reviews/r1-facet-browser-3.md` (a computational biologist walking the condition
comparison journey) and `reviews/r1-facet-browser-4.md` (WebXR engineering). Severity 3 and 4
findings, and what was done:

**Owner's advocate (`reviews/r1-facet-browser-1.md`)**

- **Finding 1, severity 4: the graph in space is mostly a picture, and the fix was put off.** Fixed
  in the design, not deferred. A sweep now takes a region chip; the tray swaps chips in and re-forms
  around what is taken, so Pivot and finding a node happen at the graph; carrying a facet into the
  graph opens the paint ring; relational slots fill from a sweep or a node. The basic journey was
  rescripted: 11 of 33 acts land on the graph and do work, with the strict count (no tray chips, 6 of 33) and the view change reported apart. The false sentence about harder journeys is gone; each
  harder journey states its own count. Section 1 has "What only a headset adds". The residual risk
  under the strictest count is in Known risks.
- **Finding 2, severity 3: wrong proof journey.** Fixed. Condition Comparison is removed; stress
  journey 3 is walked step by step (largest component kept as a filter that also hides from
  algorithms, Add data with matched counts, logFC diverging and centered on 0 with gray missing,
  p-value on Size with a log scale, labels, MCL at inflation 2.5 with the cluster table, clusters
  under 4 hidden as a range, cluster 2's mean logFC, the note, SVG and CSV export). The fraud journey
  is kept, renamed so it does not claim stress journey 6.
- **Finding 3, severity 3: node taps made it read as Paired Browser.** Fixed. Medici is found by
  sweeping the knot and "Most connected here" on the tray; Guadagni and Strozzi are read as adjacent
  rows of the ranked list; the only node taps are on Medici once it is the largest node. Section 1
  states the three things no other mock has and how its cards and Back differ from Paired Browser's.
- **Finding 4, severity 3: Back across Keep was undefined, and step 10's label was wrong.** Fixed.
  Keep is a named boundary between the two histories, with its Back and Undo labels stated; step 10's
  Back label is now the true previous query state.

**VR interaction (`reviews/r1-facet-browser-2.md`)**

- **Finding 1, severity 3: on Vision Pro, reading the preview turned a tap into "Not".** Fixed, with a
  different mechanism from the one proposed. The long press is gone; holding a press only keeps the
  preview up. Not is a one-tap "is / not" segment on every chip, plus "Not Medici" and "Not these" on
  the tray. A slide-onto-Not target was not used because a slide on a list row already means scroll
  (along) or carry (sideways), the two meanings that finding 3 of the same review asked for. A press
  inside the graph that moves past the threshold is a sweep, however long it was held.
- **Finding 2, severity 3: "sliding off cancels" turned into a drag.** Fixed. Releasing outside the
  surface where the press started always cancels (a range released off its facet, a sweep released
  outside the graph's box, a carry dropped on nothing). The target is latched at press start, ray
  motion in the first 100 ms is ignored, and the threshold is about 4 degrees for hands and 2 for
  controllers. Section 7 counts taps read as drags.
- **Finding 3, severity 3: hand users could not scroll.** Fixed. A drag along a list scrolls with
  inertia; a carry starts only when an item is pulled sideways out; ranges only on a histogram or
  range strip; page strips at each list's ends.
- **Finding 4, severity 3: a facet header tap meant two things.** Fixed. A header tap always opens
  its menu; there is no "chosen" state. Painting is a carry into the paint ring or onto a shelf, and
  the menu's "Paint by..." opens the same ring as the tap path.
- **Finding 5, severity 3: temporary panels covered the graph.** Fixed. Temporary surfaces open low,
  tilted like a desk, covering at most the lower third of the graph; confirms and choices open beside
  the verb that asked; the keyboard docks at desk height; with "Beside" on, Table opens low. Section 7
  measures coverage.

**Computational biologist (`reviews/r1-facet-browser-3.md`)**

The journey this review walked (condition comparison) was removed under the owner's-advocate finding
2, because it belongs to Prop and Plane. The fixes that apply beyond it were made.

- **Finding 1, severity 3: rewiring scores for genes missing from one network were undefined.**
  Fixed as a general rule: a formula facet, joined column or per-group run states its missing count
  before computing and offers "Leave them out (suggested) / Count as 0", printed on the header and in
  Methods, with "missing" as a value.
- **Finding 2, severity 3: edge facets and edge queries were undefined.** Fixed. A Nodes / Edges
  switch on the rail header, an Edges lane on the query bar, a stated matching rule (both ends, with
  an "either end" switch), counts in both units, and Filter on edge chips hiding only edges.
- **Finding 3, severity 3: a kept filter contradicted the side-by-side views, and the export did not
  say what it wrote.** The journey is gone; the export half is fixed generally: every Export form
  starts with a Scope row ("Whole working network / What is shown"), used in the proof journey.
- **Finding 4, severity 3: the graph did no work in that workflow.** Addressed by the redesign under
  the owner's-advocate finding 1; the proof journey states its graph count (8 of about 50) and why
  it is low.

**WebXR engineering (`reviews/r1-facet-browser-4.md`)**

- **Finding 1, severity 3: the build scope was the whole product.** Fixed. The "What is real" table
  has a cut line: weeks 1 to 4 (the basic and proof journeys), weeks 5 and 6 (the fraud journey,
  Table, Focus mode on controllers), and a list of parts that are present but shallow.
- **Finding 2, severity 3: graphty-element gives a consumer no control over XR input on the
  graph.** Fixed in this file: section 2 names the non-breaking element capability the build needs
  (turn off node drag and camera gestures, an XR pointer event stream, consumer pick meshes that win
  over the graph), alongside a previewed style layer. The same lines belong on the shared
  capabilities list in [the mock recommendation](../xr-prototype-mocks.md), which this file does not edit.
