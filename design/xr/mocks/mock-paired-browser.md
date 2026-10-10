# Mock spec: Graph Browser -- pages, links, a hotbox on the object, and two hands

Date: 2026-10-10. For graphty's owner and whoever builds the mock. This is one of the six VR mocks
in [the mock recommendation](../xr-prototype-mocks.md) beside this file, where it is listed as mock 1, "Paired Browser". It is named
here for its idea; pairing a laptop or phone is shared infrastructure that all six mocks use. It is
built on Graph Browser (prototype 28) and Paired Browser (prototype 44), with Hotbox (prototype 26)
as the way to act on things in the graph. Prototype files are `prototype-<N>.md` in [prototypes/](../prototypes/README.md).

---

## 1. The idea

**graphty in a headset works like a web browser beside a graph you hold and work on with both
hands.** Every object graphty knows -- the graph, a node, an edge, a set, a run and its result, a
style layer, a filter step, a note, a named view, the project -- has a page in a reader panel
beside the graph. A page always reads the same way: what the object is (its facts), what you can
do to it (its verbs, as worded buttons that say what they will change and how much: "Hide: 1
family, 2 marriages"), and what it is connected to (links). Every mention of an object anywhere is
a link to its page, and the graph always shows the page you are on (section 2 gives the rule for
each kind of page).

Three rules make it safe to explore:

- **Looking is not changing.** Following links, framing, focusing on neighbors and stepping a time
  window are "where you looked", and **Back** walks them. Back never undoes anything, and never
  moves the graph from where your hands put it.
- **Changes have names.** Running, painting, filtering, hiding, noting and filing a judgment are
  changes, and a separate **Undo** takes them back by name ("Undo: Hide Medici").
- **The graph is worked on directly, with two hands doing different jobs.** The pointing hand
  opens what it pinches. Held still on a node, an edge or the graph, it opens that object's
  commands right there (the **hotbox**); still holding, it slides to a command and lets go to run
  it, all in one gesture. The other hand gathers and fills: a pinch on a node or a sweep across
  several puts them in graphty's **selection**, marked on each node and counted on the toolbar
  ("Selection: 7"); and while a form or note waits for a node, its pinch fills the slot, so one
  hand can stay on the keyboard while the other cites from the graph.

**The hotbox** shows the held object's verbs in short rows at the spot, each with its count, and
graphty's twelve menu headers around them, so every command is one gesture away and still a word.
**Again** repeats the last command on the new target. Undo is never in the hotbox.

**What only a headset adds.** A desktop already has a side panel and a right-click menu on a node;
here those are conveniences, not the reason for the design. Two things a desktop cannot do are:

- **Two hands at once.** One hand reads and points while the other gathers or cites. Basic step 9
  types a note with one hand and cites nodes from the graph with the other.
- **Gathering by where things sit in space.** A sweep takes what you see between two groups,
  through the depth of a 3D layout, where no rule says the same thing. Journey 4 step 10 does it.

Section 7 tests both against a pages-only arm and against what people choose when nobody tells
them which path to take.

**Inspiration.** The web browser: pages, links, Back and Forward, an address bar that finds
anything and is also the command palette. The default apps of visionOS and Horizon OS, which are
panels of text and buttons beside content. Maya's hotbox (Kurtenbach, Fitzmaurice, Owen and
Baudel, CHI 1999): one held key shows every menu around the cursor. Marking menus' release-to-run
(Kurtenbach and Buxton, 1993). The desktop convention that a right-click on a selected item acts on
the whole selection. Guiard's asymmetric division of labor between the hands (1987). Table Lens and
dynamic queries for the reader that shows a ranking beside its histogram with one cut across both.

---

## 2. What the mock is

### Surfaces

Full VR on a solid colored background. Seated is the reference posture; standing works the same.

| Surface               | Where                                                                                                                                                                                                                                       | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The graph             | Chest height, about 75 cm away, a little right of center, where the person's hands then put it                                                                                                                                              | The data, drawn by graphty-element. Pickable nodes and edges; the graph itself is its empty space inside its bounds plus a 10 cm shell around them, drawn faintly while a ray is in it. A name tag beside whatever the dominant ray rests on. Context drawn faint (an opaque blend toward the background color), never hidden. Nodes a pending filter would drop get a dashed ring. Selected nodes carry the **selection mark** (below). Labels default to "focus plus top 50" (by degree, or by what the size layer reads) on every headset with hands |
| Under the graph       | A strip just below the graph, tilted toward you                                                                                                                                                                                             | The minimap (the whole graph small, the current framing outlined, a static picture refreshed on each layout; a press on it opens the graph's page), a Zoom stepper, a Closer and Farther stepper (the one-hand way to move the graph), and the "Show more around here" dial: Focus only, +25, +100, +400, All, each naming how many it adds. On a list with a row cursor, the dial follows the cursor                                                                                                                                                   |
| The reader panel      | To the graph's left at the same distance, with at least 5 degrees between its edge and the graph's bounds, about 50 by 40 cm, centered 10 degrees below eye level. Docked beside (default), below, or to the right of the graph in Settings | Toolbar, address bar, breadcrumb, the current page, status line, and a column on its graph-side edge                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The graph-side column | The panel edge nearest the graph (the right edge when docked left; mirrored when docked right; the top edge's center when docked below)                                                                                                     | Back and Forward at the top, Places under them (the last 10 places, by name); Next and Previous for the row cursor. Nothing that changes the project sits in this column                                                                                                                                                                                                                                                                                                                                                                                |
| The toolbar           | Top of the panel                                                                                                                                                                                                                            | At the end farthest from the graph: Undo and Redo, each naming its step. Then Home; the Selection chip (its count, a "..." box, and a Collect switch on its edge); Commands; "Showing X of Y" (opens the filter chain); the Devices chip ("Headset only", or the paired devices)                                                                                                                                                                                                                                                                        |
| The address bar       | Under the toolbar                                                                                                                                                                                                                           | Type-ahead over every page (nodes by any part of a name or id, sets, rule matches, runs, layers, filter steps, notes, views, attributes, algorithms by plain and technical name, layouts, formats, settings, help) and over files graphty holds. Results list in the page body. Verbs come back as rows with their own button, so it is also the command palette. Typing never runs anything; Enter opens the highlighted result; Up and Down move the highlight                                                                                        |
| A page                | The panel's body                                                                                                                                                                                                                            | Title (kind, name, one status word); Facts; Verbs in three groups with a gap between them (look and keep / change how it shows / change the data, always last); Links. Every row naming an object has a "..." box at its right end. Scrolls by whole rows                                                                                                                                                                                                                                                                                               |
| Status line           | Under the page                                                                                                                                                                                                                              | What the dominant ray rests on; armed states ("Choosing Center: pinch a node, type its name, or pick a row"; "Cite: pinch a node or a fact"; "Cut: pinch a node to cut beside it"); runs and loads in progress, each with its own Stop that names what it stops                                                                                                                                                                                                                                                                                         |
| The hotbox            | At the held object, at the nearer of 55 cm from the eyes and 10 cm in front of the object, between eye level and 20 degrees below, drawn on top of the graph                                                                                | Section "The hotbox" below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| The "which one?" card | At the pinch point                                                                                                                                                                                                                          | Up to 8 nodes nearest the ray with two values each, then "Edges here (N)" and More                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| The wide sheet        | In the panel's place, at the panel's tilt, at most 60 by 40 cm; the page it came from shrinks to a tab on its graph-side edge, and the graph-side column stays where it was                                                                 | Any table of more than 6 columns, or one the person widens: frozen name and sort columns, up to 8 columns by 15 rows of 1.3 cm text, "Next columns" past that. Several distributions show as small histograms in one row, never paged                                                                                                                                                                                                                                                                                                                   |
| The in-scene keyboard | Docked under the panel's bottom edge, tilted toward the hands, never over the page                                                                                                                                                          | From the shared text and file service: a caret with caret keys and word-jump, a completion row, Enter, Done                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**The selection mark.** A small bright bracket on the side of each selected node that faces you,
on every page. It never uses color or size, which belong to the style layers. While the selection
holds 20 or fewer nodes, they are labeled whatever the Labels setting says. Where a page draws its
own rings (a scenario, a filter preview), the mark steps aside and the status line says "selection
marks hidden while previewing". Resting the ray on the Selection chip lights the selected nodes
and names them on the status line.

**Panel budget.** Of the panel's 40 cm height, the toolbar takes 4 cm, the address bar 3.5, the
breadcrumb 2 and the status line 2.5, which leaves about 28 cm for a page: about 12 rows of text at
least 1.3 cm tall, or 9 rows of buttons at least 2.5 cm tall with gaps. A node page (title; five
fact rows; 12 verbs as four rows of up to four buttons; three link rows) fills about 29 cm, so its
last links scroll. The Node and Run pages are piloted at this budget in week 3; the minimap and the
dial live under the graph to leave the panel to the page. Every inline link is padded to a 2.5 cm
target even when its text is 1.3 cm, and with hands the sticky ray (below) is on by default.

### Objects and their pages

Every object in graphty's ontology has a page kind, generated from a template that declares facts,
verbs (each verb's inputs come from a descriptor and become a form), link relations, the fixed
order of its verbs (the order in the table below, which is also the hotbox's order), and whether it
can be selected.

**What the graph shows, one rule.** The graph lights the members of the page's object -- the nodes
and edges it is, holds or names -- and frames them only if they are off view, at a capped speed (or
by a fade, with Reduce motion). "Off view" means outside a 25 degree cone around the line from the
head to the graph's anchor, so it does not change with every glance. Everything else stays as the
style layers and filters draw it. Only a focus (a neighbor stub opened, Grow neighbors, a dial
step) fades the rest, and a focus belongs to the page that made it.

**Placement and framing are different things.** _Placement_ -- where the graph sits in the room,
its base scale and its turn -- belongs to the hands (a two-hand grab, the Closer and Farther
stepper, a turning drag). Nothing else ever changes it: not Back, not Go, not the row cursor, not a
page change. _Framing_ -- which nodes are centered and how far zoomed in, inside the placed graph --
is page state. The graph page has "Put the graph back where it was" as an explicit, named act.

**Back restores exactly what the page showed when you left it:** the page and its scroll position,
its focus and dial step, its framing (only if the framed nodes are off view), the time window and
the row cursor. Back never restores data: if a filter has since hidden a node the page lit, the
page says so ("Ridolfi is now hidden by PageRank at least 0.070").

**The hotbox and the page you are on.** A hotbox verb whose target is not the current page's object
first opens the target's page (one place in Back), then runs the verb there, so the result, its
focus and Back always belong to the target. Commands whose object is what you are looking at
("Save this view...", "Picture of this view...") open no page first.

**When the selection is a set.** When the selection holds exactly the members of a kept set, the
target of a hold on one of them is the set: "Set: Medici's in-laws (= your selection)". Otherwise
the target is the selection, and a verb that needs a kept target (Note..., a recipe input) offers
"Keep as set and note..." with the suggested name. Every selection target names its hidden members
("Selection: 6 families (4 hidden)") and every count says whether it includes them ("Style these:
all 6"). A gather (an off-hand pinch or sweep) made while the selection is exactly a kept set starts
a new selection; the ray tip reads "+ select (new)" before it lands, and Put back restores the old
one.

| Page                                                           | Facts                                                                                                                                                                                                                             | Verbs (look and keep / change how it shows / change the data)                                                                                                                                                                                                                                                                                       | Links                                                                                                         | What the graph shows                                                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Graph                                                          | counts, density, pieces, directed, weighted, "As of" (the latest date in the data unless set)                                                                                                                                     | Run an algorithm..., Lay out..., Build a rule..., Find, Fit, View from, 2D or 3D, Time..., Save view... / Style..., Style presets, Put the graph back where it was / Filter..., Add data..., New attribute..., Note..., Export...                                                                                                                   | suggested analyses, attributes, layers in order, filter steps, runs, sets and kept rule matches, notes, views | Nothing lit; the whole graph as filtered and painted                                                                     |
| Node, edge                                                     | attributes, results with their rank, degree by edge type, "Painted by"                                                                                                                                                            | Select, Grow neighbors..., Route to..., What if removed... / Style..., Callout... / Note..., Pin, Move and pin, Hide, Merge with..., Delete...                                                                                                                                                                                                      | neighbors as stubs ("+6 marriages"), sets, notes                                                              | That node or edge lit; an opened stub is a focus                                                                         |
| Selection, region, search results, rule matches                | count, hidden count, edges inside, cut edges, summaries against the whole graph                                                                                                                                                   | Keep as set..., Open as table, Compare with..., What if removed, one at a time..., Clear; on rule matches and search results "Select 11 in view" and "Select all 41", the choice recorded on the rule page / Style these..., Fade others / Run on these..., Lay out these..., Make working network..., Filter to these..., Hide, Note..., Export... | members (paged), earlier selections and the last 10 gathers, the rule it came from                            | Members lit; members off view counted on the page ("3 off view: Frame them")                                             |
| Kept rule matches ("in the largest piece", "hub_score top 10") | the rule in words, its members, its table with any added columns, reviews run on it                                                                                                                                               | The rule-matches verbs above, plus Export table...                                                                                                                                                                                                                                                                                                  | the attribute or run the rule reads                                                                           | Members lit                                                                                                              |
| Set, group                                                     | definition, count, profile (each attribute's mean in the set against the whole graph), groups it falls in (from the latest group run), review steps recorded on it, "hand-picked scope" when it came from a hand-picked selection | the selection's verbs plus Rename..., Combine with..., Edit rule..., Label..., Collapse to one node, Delete...; Previous group, Next group                                                                                                                                                                                                          | members, the rule, the runs and routes it came from, layers that target it                                    | Members lit, with their outline drawn                                                                                    |
| Run                                                            | algorithm, options, seed, scope, weight and how it was read (or "unweighted"), direction, time window it ran on, cost, caveats                                                                                                    | Read, Select top..., Compare with... / Paint..., Color by..., Size by... / Filter..., Run again with changes..., Export table..., Remove...                                                                                                                                                                                                         | its result fields (each an attribute page), the run it came from, sets in its groups                          | Its scope lit if it is not the whole graph; rows and bars light their nodes under the ray                                |
| Attribute or result field                                      | kind, range, missing count, the linked reader                                                                                                                                                                                     | Select top..., Select..., Show in name tag / Color by..., Size by..., Label by... / Filter..., Change type...                                                                                                                                                                                                                                       | values or bins, each a link to its members; kept rule matches made from it                                    | As a run page; a brushed band lights its nodes                                                                           |
| Style layer                                                    | what it paints, properties, its legend                                                                                                                                                                                            | Edit..., Hide, Move up, Move down, Rename..., Delete...                                                                                                                                                                                                                                                                                             | target, attribute it reads                                                                                    | Its target lit                                                                                                           |
| Filter step, filter chain                                      | the rule in words, "keeps 5 of 16", "hides from view" or "also limits what runs see", what it does to each kept set ("Medici's in-laws: 2 of 6 kept")                                                                             | Edit rule..., Turn off, Invert, Move up, Move down, Remove, Save as saved filter...                                                                                                                                                                                                                                                                 | the attribute or run it reads                                                                                 | The nodes the step drops, drawn with dashed rings beside the kept ones                                                   |
| Note                                                           | text with its citations, target, missing or not                                                                                                                                                                                   | Edit..., Show marker, Delete...                                                                                                                                                                                                                                                                                                                     | target, each citation                                                                                         | Its target lit, its marker pulsing once                                                                                  |
| View (bookmark)                                                | what it stores (page, framing, focus, time window; never placement)                                                                                                                                                               | Go, Update, Rename..., Delete...                                                                                                                                                                                                                                                                                                                    |                                                                                                               | Unchanged until Go; the minimap outlines the stored framing                                                              |
| Project                                                        | name, where it is saved, saved or not, the datasets it holds                                                                                                                                                                      | Save, Save as..., Export..., Report..., Rename..., Close                                                                                                                                                                                                                                                                                            | views, Recent, History                                                                                        | Nothing lit                                                                                                              |
| History                                                        | steps with names and times, review steps marked with the reviewer                                                                                                                                                                 | Undo back to here, Open as preview, Save steps as recipe...                                                                                                                                                                                                                                                                                         | objects each step made                                                                                        | Unchanged until Open as preview, which draws the graph as of that step under a "Preview" banner; Back leaves the preview |
| Unmatched keys (after a join)                                  | each key that found no row, with the three nearest keys in the table and any known alias                                                                                                                                          | Match to... (a row action), Leave unmatched                                                                                                                                                                                                                                                                                                         | the join, the table                                                                                           | The unmatched nodes lit                                                                                                  |
| Scenario table                                                 | one row per "What if removed" scenario: pieces, largest piece, nodes cut off, average route length                                                                                                                                | Compare rows, Keep, Remove...                                                                                                                                                                                                                                                                                                                       | each scenario's page                                                                                          | The cursor row's removed nodes drawn hollow, the nodes it cuts off ringed                                                |
| Route                                                          | the route's steps as links, each hop with its edge's facts; for several routes, one row per route; which edge types and directions it followed                                                                                    | Next, Previous, Select route nodes, Keep as set...                                                                                                                                                                                                                                                                                                  | the facets below                                                                                              | The routes lit as paths, the cursor row's route brightest                                                                |

### The hotbox

Summoned by holding still on a node, an edge or the graph itself (its empty space or the shell
around it), by the "..." box on any row naming an object or on the Selection chip, or by Commands
on the toolbar (the current page's object). Panel rows, links and buttons never open it by holding.
It never runs anything and never changes the graph on opening.

- **Release to run.** The hold that opens it keeps going: still pinching (or still holding A), the
  person moves the ray to a cell and lets go, and that cell runs. The cell that was lit 100 ms
  before the release is the one that runs, so the hand's jump as the pinch opens never picks a
  neighbor. That whole gesture -- hold, slide, release -- is **one act**, a _held pick_. Letting go
  in the center gap latches the hotbox open; latched, it reads "press here to close" in the gap, a
  press chooses, and the press that closes it from outside is consumed and acts on nothing else.
  Commands and "..." boxes open it latched.
- **Size.** The whole hotbox fits within 40 degrees wide by 30 degrees tall at 55 cm (about 40 by
  30 cm), so it never needs a head turn. Every cell is at least 2.5 cm tall and 5 cm wide (about 2.6
  by 5.2 degrees), the size of the panel's buttons. A long verb name wraps to two lines inside its
  cell and never widens it. A row of six cells (an Again slot, four verbs, More) is about 36 cm with
  gaps.
- **Center.** The target's name and hidden count ("Medici (node)", "Selection: 6 families (4
  hidden)", "Set: Medici's in-laws (= your selection)", "4 runs", "whole graph: showing 16") and the
  gap. When the hold landed on a selected node, a cell under the name reads "Just Albizzi".
- **The review row.** A row under the name is reserved for a review: while a review runs on a list
  that holds the held node, it carries that review's actions ("Keep -- Skip: undecided -- Drop");
  otherwise it reads, dimmed, "No review running". Because the space is always there, no other
  cell moves when a review starts.
- **Center rows.** One row per verb group, in the page's order, data-changing verbs last after a
  gap: an Again slot, at most four verbs, and "More (N)", which opens the rest on the panel. Verb
  order is the fixed rank in the page table, never reordered by use, so a cell is always in the
  same place. For a node: "Again, Select, Grow neighbors..., Route to..., What if removed..." /
  "Style..., Callout..." / "Again, Note..., Pin, Move and pin, Hide, More (2)". Hide never sits
  beside Pin.
- **Again has two fixed slots,** each with its group: the first cell of the look-and-keep row when
  the last command looked or kept, and the first cell after the gap when the last command changed
  the data. Again is worded with both ("Again: What if removed on BRCA1"); the unused slot shows a
  dimmed "Again" with its reason.
- **What is lit changes only past a boundary.** The ray must travel 30 percent of a cell into the
  next before the lit cell changes.
- **Counted outcomes.** A verb that needs a value opens a short strip after the ray rests on it for
  300 ms. The strip opens in the strip lane, a band under the bottom center row that is reserved
  for it and covers no cell, and stays open while the ray is on its verb or in the lane. It lists
  the current state first: "As is -- 1 hop: +6 -- 1 hop, select them: +6 -- 2 hops: +11 --
  Options...". Releasing on such a verb, not on its strip, latches the hotbox with the strip open
  and never runs it. Latched on Vision Pro, where nothing reaches the page between pinches, a press
  on the verb opens its strip. The last cell of every strip opens the verb's full form on the panel.
- **Twelve headers**, single words, six above the center rows and six below: File, Data, Select,
  Analyze, Layout, Style; Filter, Time, Compare, Notes, View, Help. A header opens its column only
  on a press, or on a release while held (which latches), never on rest. Its column replaces the
  center rows: at most six rows plus an "All ... (N)" row that opens that family's page on the
  panel. A press on the target's name brings the object's rows back. Columns are generated from the
  command registry in a fixed rank.
- **Corners:** Find (opens the address bar), Fit, Selection, History. None changes the graph or the
  data, so an overshoot into a corner is never a change.
- **Several objects of one kind are one target.** The selection is one target; so are ticked rows
  on any list page (runs, sets, layers), through the "..." box of a ticked row: "4 runs". Its verbs
  then run once per member and return one combined result: Compare on 3 runs is one rank-change
  table; Select top 10 on 5 runs is 5 kept rule matches and one overlap table ("in 4 of 5 lists").
- **Every item shows its count or its cost** before it runs ("Neighbors, 1 hop: +6", "PageRank:
  under 1 s"), taken from graphty-element's `session.plan()` where a session command exists. The
  hotbox opens on time with "..." in place of a count still being worked out and fills it in; it
  never waits. An item that cannot run is dimmed with its reason ("needs a source: hold on a node").
- **Undo is never in the hotbox**, so an overshoot can never take back work.

### The linked reader

Every ranked result, numeric attribute page and filter form that reads one number column shows it
two ways side by side: the rows sorted by it on the right; on the left a histogram of it, upright,
high values at the top in the same direction as the sort. One cut handle crosses both. Dragged on
the histogram it sets a value; dragged in the rows it snaps between rows (top N). It moves in
detents at the gaps in the data and always names who sits just outside, at the precision that
tells them apart: "PageRank at least 0.070: keeps 5 of 16 families -- just under: Ridolfi 0.0699,
Castellani 0.0693". Two values that print the same get one more digit until they differ, and exact
ties are named as ties ("Bischeri and Peruzzi tie at 0.0688: the cut keeps both or neither"). A
saved rule's words always use the precision that reproduces its count.

**The cut handle is live only on a form whose input it is** (Filter..., Select top..., a threshold
option). While it is live, the status line reads "Cut: pinch a node to cut beside it", the ray tip
reads "cut" before a press, and a press on a node in the graph offers "Cut just above Ridolfi:
keeps 5" and "Cut just below Ridolfi: keeps 6". The linked reader on a page that is not a form is
never live: there a press on a node opens its page. A ray resting on a row lights its node and its
bar; resting on a bar lights its rows and nodes. A drag across bars brushes a band whose small bar
offers Select, Filter to these..., Style these..., Keep as set.... Bins and Log scale sit in its
header.

### The row cursor and review

Every list page (rankings, tables, group tables, route rows, selection members, rule matches, the
scenario table, unmatched keys) has a row cursor. Next and Previous move it. Each move lights the
row's node or nodes, draws a leader line from the cursor row to them, and frames them only if they
are off view, at a capped speed. While the graph is moving, presses on the graph are ignored and the
ray tip reads "moving"; a press is always resolved against where things were at press-down.

The cursor row opens a second line under itself holding the list's **row actions**: two at opposite
ends of the line and, on a review, a smaller "Skip: undecided" between them. "Select" is the
default single action. For 300 ms after the cursor moves, presses on that line are ignored and the
new row's values flash once, so a quick second pinch can never file a row that has not been seen.
The row shows the table's own columns, which the person chose ("Add columns..."), so what she judges
by is what she put there.

"Review these..." on any list sets the pair once ("Keep / Drop", "Ring member / Not involved", or
typed), with an optional reason strip on the second, and the pair is saved with the list and in any
recipe made from it. Filing is a **review step**: the person's judgment enters History as "Reviewed
CHEK2: keep" with the reviewer's name (a Settings row) and the time, and it is a change Undo names
("Undo: Reviewed CHEK2: drop"). Filing a row again records a correction, and History keeps both
entries. "Skip: undecided" records the look and advances; rows never reached are "not reviewed",
never a frozen list of ids.

A row can be filed two ways, and the person picks per row: the row action on the panel, or a held
pick on the node itself, whose hotbox carries the review row (above). Judgments about the row's
numbers are quicker on the row; judgments about what the graph shows around a node are quicker on
the node, with the eyes already there.

### Citing

Every note field has a **Cite** button beside it. While Cite is on, the ray tips read "cite" and a
press by either hand on a node, an edge, a fact or a link -- in the graph or on any page -- inserts a
citation at the caret: a tile that names the object and the value it showed ("Albizzi -- PageRank
0.0791"), links to its page, and keeps that value as it was when cited. Cite stays on until pressed
again or the field loses focus, so a sentence can be typed with one hand while the other cites.

### Parts folded in from other prototypes

| Part                                                                          | From                                                 | Where it sits                                                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Pages, links, generated forms, Back kept apart from Undo                      | Graph Browser (28), Paired Browser (44)              | The whole design                                                                                                |
| The hotbox: center rows, menu headers, release to run, a box to the full form | Hotbox (26)                                          | Holds on the graph; "..." boxes; Commands                                                                       |
| Again: the last command on a new target                                       | Hotbox (26), Verb, Count, Scope (33)                 | Two fixed slots in the hotbox                                                                                   |
| Counted outcomes with "As is" first                                           | Fast Ring over Pages (46), Variant Grid (43)         | The hotbox's strips; the top of every form                                                                      |
| Several objects of one kind as one target                                     | Hotbox (26)                                          | The selection; ticked rows                                                                                      |
| The row cursor with mark-and-next, recorded as review steps                   | Graph Browser (28), Patch Bay (32)                   | Every list page; the hotbox's review row                                                                        |
| The "which one?" card for dense pinches                                       | Hand Menu and Windows (24)                           | Pinches and holds the nearest-node rule cannot settle                                                           |
| The linked reader                                                             | Linked Views (18), Paired Browser (44)               | Run, attribute, table and filter pages                                                                          |
| The detented cut handle that names who sits just outside                      | Facet Browser (41), The Sheet (27), Physics Lab (15) | The linked reader                                                                                               |
| The route page whose counts recount for the nodes on the routes               | Facet Browser (41)                                   | The route page                                                                                                  |
| "Why this look": the layers that painted a node, in order                     | Encoding Shelves (29)                                | "Painted by" on node pages; the layer list on the graph page                                                    |
| A Check card listing the defaults you did not touch                           | One Question at a Time (30)                          | Above Run on every form: "You did not change: damping 0.85, weight none, whole graph", each a link to its field |
| Press shows the effect with a count, release commits, sliding off cancels     | One Question at a Time (30)                          | Every button, link and row, on every device                                                                     |
| A kept scenario table for "What if removed"                                   | Paired Browser (44)                                  | "What if removed" on node, selection, set and ranking pages                                                     |

### Text and files

Text and files come from the shared service in [shared-text-and-file-service.md](shared-text-and-file-service.md): by default the
headset alone (the in-scene keyboard, graphty's own storage on the headset, the browser's file
picker, Save to the headset), with a paired laptop and phone as a separate condition measured
later. One fact the walks depend on: a web page cannot list the headset's Downloads folder, so a
file the person downloaded is not in "Files on this headset" until it has been picked once through
"Add files from this headset...", which opens the browser's multi-select picker and copies the
picked files into graphty's own storage. (The shared service should say this in its own text too.)

### What may be stubbed, with the interaction kept whole

| Stub                                                                                                                                                                    | Why it is allowed                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "What if removed", k shortest routes and Grow neighbors as a focus (no session command today) are computed by the mock in a worker, with their counts                   | The person's acts and the scenario table are real; only the engine is outside the element. Every other count comes from `session.plan()`, and each missing count is filed as one graphty-element issue |
| The combined score (journey 4 step 6) is computed by the mock in a worker and written as a new attribute through the session                                            | The session has no formula command yet; the person's form and its preview are real                                                                                                                     |
| Review steps are kept by the mock in a side log that its Undo and History page interleave with the element's own history                                                | The element's History records only its own commands; an additive consumer step kind is element work, listed under Known risks                                                                          |
| The radial layout's center is marked as a node slot by the mock                                                                                                         | Layout option metadata has no "this is a node" marker yet (algorithms already declare `type: "nodeId"`); an additive `kind: "nodeId"` on layout options is listed as element work                      |
| A view-only hide ("hides from view") and the transient emphasis for previews are drawn by the mock as temporary, unsaved style layers until graphty-element offers them | The person sees the same thing; the element work is listed under Known risks                                                                                                                           |
| History's "Open as preview" and recipe replay run on precomputed states                                                                                                 | The person's acts are real; replaying through the element is later work                                                                                                                                |
| The journey 4 network and expression table are a fixed pair of sample files                                                                                             | The person adds, opens, joins and works on them exactly as on her own files                                                                                                                            |

Real in the mock: the panel and every page kind above, generated forms, the linked reader, the row
cursor with review steps, the selection filled by the off hand and the selection mark, holds and
held picks on the graph, the hotbox with Again, the review row and counted outcomes, Cite by either
hand, Back, Places and Undo, History, the "which one?" card, and the shared text and file service.

### Devices and inputs

| Device                         | Inputs used                                                                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta Quest 3 / 3S, hands       | System hand ray and pinch per hand                                                                                                                       | Hover from the resting dominant ray (150 ms), tested against every drawn node including faint context. No haptics: a click sound and the lit control confirm. Both hands have a palm-facing system pinch (the system menu on one, the menu button on the other); nothing in graphty asks for that pose, the off-hand and holds checks count it on both hands, and a session that goes to `visible-blurred` is treated as lost tracking (cancel, choose nothing). No voice is needed                                                                                                                                                                                                                                                                                          |
| Meta Quest 3 / 3S, controllers | Ray, triggers, grips, A, B, X, Y, thumbsticks, haptics                                                                                                   | A haptic tick on each hotbox item, detent, cut-handle row and row action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Samsung Galaxy XR              | Hands by default; its controllers where present                                                                                                          | As Quest. Android XR's own system hand gesture (a palm-facing pinch that opens the launcher; which hands and poses fire it is confirmed on the device in week 1) is counted alongside Quest's. Eye gaze is not used, since Chrome on Android XR is not confirmed to expose it to pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Apple Vision Pro               | Safari's transient pointer: look, then pinch; after the pinch begins, the ray follows the hand. PS VR2 Sense controllers if Safari exposes their buttons | The page requests no `hand-tracking` feature, so every pinch arrives once, as a transient-pointer select. No hover and no gaze between pinches reach the page; a name tag shows at pinch-down. **Both hands mean the same thing:** a quick pinch opens, a drag that starts beside the graph or on its empty space turns it, and gathering happens only under the Collect switch, shown on a mode chip above the graph. This needs no knowledge of which hand pinched. Holds are decided by how far the ray moves, with the ring drawn at the first hit point, full at 0.9 s. Needs graphty-element's transient-pointer path, which is tested by hand on a real headset with a scripted checklist, since the element's emulated-headset tests do not cover transient pointers |

**Input timing, one rule for every device.** graphty keeps the last 8 poses of each target ray. A
press is resolved against the pose about 60 ms before the pinch or trigger began, and a release
against the pose 60 ms before it ended, so the jump of a closing or opening hand never moves the
target. Stillness for a hold is measured from 100 ms after the press began. A press cancels by
sliding off only when the ray leaves the control's padded bounds by more than half a row. The
lookback is a Settings row beside the hold angle.

Handedness is a Settings row and every mapping below mirrors. Left-handed on controllers: the
hotbox on X, Back on Y, Undo on B, Redo on A, the row cursor on the left stick, turning on the right
stick. All of it works seated with the arms low, one-handed (section 3 gives the one-hand path for
every two-hand or held act), and with no voice.

---

## 3. The control vocabulary

One meaning per input. "Dominant" and "off" hand follow the Handedness setting; on Vision Pro both
hands are treated as dominant and gathering goes through Collect.

| Input                                                   | Controllers                                                                                                                                                                                                     | Hands (Quest, Galaxy XR)                                                                                                        | Vision Pro                                                                     | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Press on a button, link or row                          | Either trigger                                                                                                                                                                                                  | Either hand's pinch                                                                                                             | Look and pinch, either hand                                                    | Activate on release. On press-down the control lights and previews its effect with a count; sliding off before release cancels; lost tracking cancels. A link opens its object's page. A "..." box opens the hotbox for its row's object                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Press on a node or edge in the graph                    | Dominant trigger                                                                                                                                                                                                | Dominant pinch, released before the ring starts (0.3 s)                                                                         | Either hand's pinch, released before 0.3 s                                     | Open that object's page. **Nearest-node rule:** the nearest node is taken when it is within the device's radius of the ray (0.75 degrees on controllers, 1.5 on hands, 2 on Vision Pro) and at least 1.5 times closer than the second nearest; when two or more are that close, the "which one?" card opens. An edge is taken only when no node is within twice the radius and the ray is within the edge's own radius; otherwise "Edges here" on the card. While a slot is armed ("Choosing Center", Cite, a live cut handle) the press fills it instead, and the ray tip says so first                                                                                                                                                                                                                                                                       |
| Press on the graph's empty space or shell               | Dominant trigger                                                                                                                                                                                                | Dominant pinch                                                                                                                  | Either hand's pinch                                                            | Nothing beyond clearing the name tag, so a turn begun and stopped short never takes you off your page. The graph's page is the breadcrumb's first item, or a press on the minimap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Release while the ring fills                            | (n/a)                                                                                                                                                                                                           | Release between 0.3 s and the full ring                                                                                         | Release between 0.3 s and 0.9 s                                                | Cancels: nothing opens. Pinch, read the name tag, release is a pure look                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Press on a node or edge, off hand                       | Off-hand trigger                                                                                                                                                                                                | Off-hand pinch                                                                                                                  | (Collect only)                                                                 | Toggle it in the selection. The off-hand ray tip shows the node's short name with + or - before the press ("+ Ridolfi"). When two or more nodes are that close, it takes nothing and reads "too close -- use the other hand". A removal shows "Put back: Ridolfi" at the off-hand ray tip and on the Selection chip for 5 s. The selection is not a change: it is not in Undo, and its page keeps the last 10 gathers. While a slot is armed, the off hand fills it like the dominant hand                                                                                                                                                                                                                                                                                                                                                                     |
| Drag across nodes, off hand                             | Off-hand trigger held and moved, starting inside the graph's bounds                                                                                                                                             | Off-hand pinch held and moved, starting inside the bounds                                                                       | (Collect only)                                                                 | Sweep: the nearest node along each ray in the wedge swept between frames joins the selection, with a running count and the last name at the ray tip ("+4 -- MDC1"); moving back past the start cancels; release adds. A sweep never removes and never takes faint context. While a focus is on, it takes only focused nodes, and the node whose focus it is joins only if the sweep starts on it. The off hand is heard only while its position is tracked, not estimated                                                                                                                                                                                                                                                                                                                                                                                      |
| Drag that starts outside the graph's bounds, off hand   | Off-hand trigger                                                                                                                                                                                                | Off-hand pinch                                                                                                                  | (as below)                                                                     | Turn the graph, as the dominant drag does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Drag, dominant hand                                     | Dominant trigger held and moved past the hold angle                                                                                                                                                             | Dominant pinch held and moved                                                                                                   | Either hand                                                                    | Beside or on the graph: turn it (never moves a node, never a step). On a page or list: scroll by whole rows. On a control: operate it (a scrub strip, the cut handle, a reorder grip)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Both hands                                              | Both grips                                                                                                                                                                                                      | Both hands pinch                                                                                                                | Both hands pinch                                                               | Move, turn and scale the graph (its placement). Only when both pinches begin inside the graph's bounds or the shell, and neither hand has already become a sweep, a drag or an operated control. A pinch on the panel, a strip, the hotbox or the keyboard is always its own act, whatever the other hand is doing. Never a step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Hold still on a node, edge or the graph                 | Hold A (release on a lit item runs it; release in the center gap latches it; a quick tap of A opens it latched)                                                                                                 | Dominant pinch held still; the ring fills from 0.3 s and the hotbox opens at 0.6 s                                              | Either hand's pinch held still; the ring at the first hit point, full at 0.9 s | The hotbox for that object, or for its set or the whole selection when the object is selected. Still means the ray moved less than the hold angle (1 degree on controllers, 2.5 on hands, 3 on Vision Pro), and hand travel under 2.5 cm never counts as a drag. The name tag shows at press-down and says whether the node is selected ("Albizzi -- in selection (6)"); from 0.3 s the ring carries the target ("Selection: 6"), so the person sees which hotbox is coming. A hold whose press-down the nearest-node rule cannot settle opens the "which one?" card at once with the ring paused, and the row pinched opens that node's hotbox. Keep pinching and release on a cell: it runs (a held pick, one act). A lost hand never chooses; on return nothing is lit. On Quest and Galaxy XR the off hand never opens a hotbox and never shows a name tag |
| Commands; a "..." box                                   | Press                                                                                                                                                                                                           | Press                                                                                                                           | Press                                                                          | The hotbox, latched, with no hold: the path for one hand, for tremor, and for anyone who prefers not to hold                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Back                                                    | B                                                                                                                                                                                                               | Back on the graph-side column                                                                                                   | The same                                                                       | Walk where you looked: pages, framing, focus, the time window. Never changes the project or the graph's placement. Forward and Places sit beside it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Undo, Redo                                              | Off-hand Y, X                                                                                                                                                                                                   | Undo and Redo at the toolbar's far end, each naming its step                                                                    | The same                                                                       | Take back or put back the last change, review steps included. Never in the hotbox, never on a corner, never on a stick                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Row cursor                                              | Dominant thumbstick down and up for Next and Previous; left and right move the highlight between the row actions; the trigger files the highlighted one, with the usual preview ("Drop UBC -- release to file") | Next and Previous on the graph-side column; the row actions on the cursor row's second line, or on the node's hotbox review row | The same                                                                       | Move the cursor on the current list; a row action files the row as a review step and advances                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Turn without grabbing                                   | Off-hand thumbstick                                                                                                                                                                                             | (a drag)                                                                                                                        | (a drag)                                                                       | Turn the graph. Never a step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Ray resting 150 ms                                      | Dominant ray                                                                                                                                                                                                    | Dominant hand ray                                                                                                               | (none; see Press)                                                              | A name tag beside the node and the status line show its name and two values. A row under the ray lights its node and its bar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Collect (a switch on the Selection chip)                | Press                                                                                                                                                                                                           | Press                                                                                                                           | Press                                                                          | The one-hand way to gather, and on Vision Pro the only one: while on, a press on a node toggles it in the selection and a drag that starts inside the graph's bounds sweeps (with either hand on Vision Pro); a drag that starts outside turns. "+ select" at the ray tip (on the mode chip on Vision Pro). Turns off when you leave the page that armed it or press it again                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Typing                                                  | In-scene keys are buttons                                                                                                                                                                                       | The same                                                                                                                        | The same                                                                       | Text into the focused field. No key ever presses a button                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Discard buttons (Stop, Delete..., Remove..., Clear all) | Press                                                                                                                                                                                                           | Press                                                                                                                           | Press                                                                          | Each shows a ring icon. A press opens a strip with the two choices far apart ("Stop: Louvain, 40%" -- "Keep running"), and a press on the far choice commits. Holding a discard button only keeps its preview up, as on every other button. Clear on the Selection chip is not a discard: the selection is not a change, and Put back restores it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Hold time and angles, the ring bands, the lookback, hand-travel floor, hover delay, the
nearest-node radius, ray smoothing (with a sticky ray that keeps a settled target until it leaves by
half a row; on by default with hands), which hand gathers, Labels, the dock and Reduce motion are
Settings rows.

That is the whole vocabulary: press, drag, hold (and its held pick), both hands, and three buttons
(Back, Undo, the row cursor). Everything else is a worded button on a page, a row, or in the
hotbox.

---

## 4. The basic journey

Florentine families: 16 families including Pucci, 20 marriage ties. The person is seated, wearing
a Meta Quest 3, hands only, no voice, headset only. This is their second session; they have seen
the first-use hints once. Acts are counted the same way in every mock: each press, drag, hold,
held pick or sweep is one act, mistaken acts are counted and marked as errors, and typed keys are
counted apart. **On the graph** marks acts that land on nodes, edges or regions in space (a pinch,
sweep, hold or held pick on them), the definition the shared exit criterion uses. Turning and
grabbing the graph are counted as acts but reported apart as **view moves**; they are never counted
on the graph.

1. **Enter.**
    - **What you do:** Open graphty from the headset browser's bookmark and press Enter VR (both in
      the browser's 2D window). On Home in the panel, pinch "Florentine families" under "Start with a
      sample".
    - **What you see:** The 16 families float ahead, labeled. The panel turns to "Graph: Florentine
      families". The toolbar reads "Showing 16 of 16", "Selection: 0", Undo gray, "Headset only".
      The info bar reads "Pinch a node to open its page. Hold still on it for its commands; slide to
      one and let go to run it. Your other hand selects, and cites while you type. Back goes to the
      last place; Undo takes back a change." with "Don't show again".
    - **Controls:** 3 presses. On the graph: 0.

2. **Get oriented.**
    - **What you do:** Read the graph page's facts. Rest the ray on a few nodes. Pinch beside the
      graph and drag to turn it; take it with both hands and pull it a little closer. Pinch the link
      "Pucci alone" in the facts.
    - **What you see:** "16 families, 20 marriages, undirected, 2 pieces: 15 joined, Pucci alone,
      density 0.17, average 2.5 marriages". Suggested analyses as links: "Who matters most:
      Influence (PageRank)", "Groups: Communities (Louvain)", "Go-betweens: Bridges (betweenness)".
      Each resting node shows a name tag ("Strozzi -- 4 marriages"). The graph turns and comes closer
      under your hands, and stays where you put it from now on; nothing enters Back or Undo. "Pucci
      alone" opens Pucci's page ("0 marriages") and lights Pucci at the edge of the graph.
    - **Controls:** a drag and a two-hand grab (2 view moves), a link. 3 acts, 0 on the graph.

3. **Find the Medici.**
    - **What you do:** Rest the ray on the largest knot of ties until the tag reads "Medici -- 6
      marriages", and pinch.
    - **What you see:** "Node: Medici". Medici is already in view, so the graph does not move; Medici
      is lit. Facts: "6 marriages; in no run yet". Links: "Neighbors: +6 marriages", "Notes: none".
      Breadcrumb "Florentine families > Medici". (In a graph too big to see it: the address bar,
      "med", Enter.)
    - **Controls:** 1 press, on the graph.

4. **Who they married into, kept as a set.**
    - **What you do:** Hold still on Medici and keep pinching. Slide to "Grow neighbors...", rest
      until its strip opens, slide into the strip and let go on "1 hop, select them: +6". Then hold
      still on one of the six, Albizzi, slide to "Keep as set..." and let go. Pinch Save.
    - **What you see:** The ring fills on Medici, reading "Medici", and the hotbox opens there:
      "Medici (node)", the review row dimmed ("No review running"), and three rows -- "Again (dimmed:
      no command yet), Select, Grow neighbors..., Route to..., What if removed..."; "Style...,
      Callout..."; "Again (dimmed), Note..., Pin, Move and pin, Hide, More (2)" -- with the twelve
      headers around them. The strip opens in the lane under the rows: "As is -- 1 hop: +6 -- 1 hop,
      select them: +6 -- 2 hops: +11 -- Options...". On release, Medici and its six neighbors draw at
      full strength and labeled; the other nine go faint; each of the six gets the selection mark;
      the chip reads "Selection: 6"; the page's stub has opened into six links (Acciaiuoli, Albizzi,
      Barbadori, Ridolfi, Salviati, Tornabuoni) with "Focus on Medici's marriages -- nothing changed".
      Pinching Albizzi, its tag reads "Albizzi -- in selection (6)" and the ring reads "Selection: 6".
      The hotbox targets "Selection: 6 families" with "Just Albizzi" under the name. Releasing on
      "Keep as set..." opens the selection's page (one place in Back) and its form, with the
      suggested name "Medici's in-laws" (no typing); Save lands on "Set: Medici's in-laws -- 6
      families", and Undo reads "Undo: Keep set Medici's in-laws".
    - **Controls:** two held picks, Save. 3 acts, 2 on the graph.
      Page path: the stub "+6 marriages", "Select these 6" on its line, the Selection chip's "...",
      "Keep as set...", Save: 5 acts, 0 on the graph.

5. **Who matters most (PageRank).**
    - **What you do:** Pinch "Florentine families" in the breadcrumb. Pinch the suggestion "Who
      matters most: Influence (PageRank)". Read the form; pinch Run.
    - **What you see:** "Run Influence (PageRank)": Scope "Whole graph (16 families)", Damping 0.85,
      Weight "None", Advanced folded. The Check card: "You did not change: damping 0.85, weight none,
      whole graph, direction as loaded", each a link to its field. Run reads "Run on 16 families --
      under a second". The panel lands on "Run: PageRank 1"; Undo reads "Undo: Run PageRank". The
      six in-laws keep their selection marks.
    - **Controls:** a link, a link, Run. 3 acts, 0 on the graph.

6. **Read the result.**
    - **What you do:** Read the run page's linked reader. Rest the ray on a few rows. The second
      place surprises you, so pinch Guadagni in the graph and read its page; press Back.
    - **What you see:** On the right the ranking: 1 Medici 0.145, 2 Guadagni 0.098, 3 Strozzi 0.088,
      4 Albizzi 0.079, 5 Tornabuoni 0.071, 6 Ridolfi 0.0699, 7 Castellani 0.0693 ... 16 Pucci 0.010.
      On the left the histogram, upright, Medici's bar alone at the top and a tall cluster near 0.07.
      The row under the ray lights its family and its bar. "How it was made: PageRank, damping 0.85,
      whole graph, undirected, all dates; caveat: Pucci has no marriages and gets only the baseline
      share." The run page is not a form, so its cut handle is not live and the pinch opens
      Guadagni's page: "PageRank 0.098, rank 2 of 16; 4 marriages: Albizzi, Bischeri, Lamberteschi,
      Tornabuoni" -- second without marrying a Medici. Back returns to the ranking at the same scroll
      position.
    - **Controls:** a press on the graph, Back. 2 acts, 1 on the graph.

7. **Color and size by PageRank.**
    - **What you do:** On the run page pinch "Paint...". The form has Color (the first sequential
      palette, because PageRank is an amount) and Size, a range From 1x To 2x. Drag To's scrub strip
      to 3x. Pinch Apply.
    - **What you see:** The graph previews the colors and sizes while the form is open. Apply reads
      "Paint 16 families: color and size by PageRank" and lands on "Style layer: PageRank color and
      size", whose page is also its legend. Medici's page now lists "Painted by: PageRank color and
      size".
    - **Controls:** a button, a scrub, Apply. 3 acts.

8. **Keep only strong families (filter).**
    - **What you do:** Press Back once (a sent form drops out of Back, so this is the run page).
      Pinch "Filter...". The status line reads "Cut: pinch a node to cut beside it"; pinch Ridolfi in
      the graph and choose "Cut just above Ridolfi". Pinch Apply.
    - **What you see:** Pinching Ridolfi offers "Cut just above Ridolfi: keeps 5" and "Cut just below
      Ridolfi: keeps 6". The handle jumps to "PageRank at least 0.070: keeps 5 of 16 families, 4
      marriages -- just under: Ridolfi 0.0699, Castellani 0.0693". The eleven families that would go
      get dashed rings, unlike the plain faintness of context, and the selection marks step aside
      while the preview shows. The form says "Hides from view. Later runs still see all 16" with a
      box "Also limit what runs see". Apply lands on "Filter step: PageRank at least 0.070"; the
      toolbar reads "Showing 5 of 16": Medici, Guadagni, Strozzi, Albizzi, Tornabuoni. The step's
      page adds "1 family kept with no ties showing (Strozzi)" and "Medici's in-laws: 2 of 6 kept
      (Albizzi, Tornabuoni)". The Selection chip reads "Selection: 6 (4 hidden)": Acciaiuoli,
      Barbadori, Ridolfi and Salviati are off view.
    - **Controls:** Back, a button, a press on the graph, a card item, Apply. 5 acts, 1 on the graph.

9. **Write a note on what you found.**
    - **What you do:** Hold still on Albizzi, slide to "Note..." and let go. Type "Only " on the
      in-scene keyboard, press Cite, and -- your dominant hand still on the keys -- pinch Albizzi in
      the graph with your other hand; type " and ", pinch Tornabuoni the same way, type " clear the
      PageRank cut." taking "PageRank" from the completion row. Pinch Save.
    - **What you see:** The selection is exactly the set, so the ring and the hotbox read "Set:
      Medici's in-laws (= your selection), 6 families (4 hidden)". Releasing on "Note..." opens the
      set's page (one place in Back) and the note form, which names its target, the set. The keyboard
      docks under the panel, leaving the page in view. With Cite on, both ray tips read "cite", and
      each off-hand pinch drops a tile at the caret: "Albizzi -- PageRank 0.0791", "Tornabuoni --
      PageRank 0.0714". Save lands on "Note: on Medici's in-laws", reading "Only [Albizzi] and
      [Tornabuoni] clear the PageRank cut."; a marker appears on the set's outline; the set's page
      lists "Notes: 1".
    - **Controls:** a held pick, Cite, two off-hand presses on the graph, Save, about 25 key presses.
      5 acts, 3 on the graph, plus keys.

10. **Undo a mistake.**
    - **What you do:** You hold still on Medici to pin it where it is and slide right along the data
      row while glancing at the panel; you let go two cells past Pin, on Hide. By habit you press
      Back. Then you press Undo, hold still on Medici again, slide to Pin and let go.
    - **What you see:** Hide lit with its preview "Hide Medici: showing 4 of 16" as you passed onto
      it, but you let go before reading it. The toast reads "Hid Medici -- showing 4 of 16". Back
      returns you to the previous page and, because Back followed a one-gesture change within 3 s,
      the info bar reads "Back does not undo -- Undo: Hide Medici". Undo, at the toolbar's far end,
      reads the same. Medici returns, the toolbar reads "Showing 5 of 16", and Redo reads "Redo: Hide
      Medici". The note, the set, the layer, the filter and the run are untouched. Pin marks Medici
      with a pin.
    - **Controls:** a held pick (an error), Back (an error), Undo, a held pick. 4 acts, 2 of them
      errors, 2 on the graph.

11. **Save.**
    - **What you do:** Pinch Home. Pinch "Save...". Pinch Save.
    - **What you see:** The project page reads "Not saved yet". The form holds the suggested name
      "Florentine families -- PageRank" and "Save to: this headset". Save lands on the project page:
      "Saved just now -- this headset". Recent lists it.
    - **Controls:** 3 presses.

**Count.** 35 acts, 2 of them errors, and about 25 typed keys: per step 3, 3, 1, 3, 3, 2, 3, 5, 5,
4, 3 (median 3, worst 5). **Of the 35: 10 on the graph, 2 view moves, 23 on panels -- 29 percent on
the graph**, over the shared exit criterion of one in four. Of the 10, 5 start or make a change
(keep as set, the Ridolfi cut, the two citations, Pin), 4 open a page, a form or a focus (Medici,
grow and select, Guadagni, the note), and 1 is the slip.

The same journey with pages only -- no holds, no off hand, names typed -- takes 36 acts with 4 on
the graph (11 percent) and about 45 keys. So the graph path is not a detour: it is one act shorter
here, and 20 keys shorter because the off hand cites while the other hand types. What the person
gains is measured in section 7: whether held picks keep the eyes on the node (head swings), whether
citing from the graph beats typing names (keys and corrections), and whether people choose the
graph path when both are in front of them. The exit criterion is decided on that last measure, not
on this walk.

---

## 5. Harder journeys

Figures in these walks that are not counts of acts (scores, numbers of genes or airports) are
illustrative; the mock shows whatever the real run returns.

### Journey 4: rank hub genes and defend the choice (this mock's proof journey)

From the functionality inventory (a studio working file, not committed) (journey 4) and `design/designloom/workflows/W23.yaml`; persona
**Dr. Priya Raman**, the genomics postdoc (`design/designloom/personas/genomics-cytoscape-user.yaml`):
a strong biologist and R user, not a graph theorist, who needs a top-10 hub list and a figure she
can defend to a reviewer. She wears a **Samsung Galaxy XR**, hands only, seated, headset only. Her
data: a DNA damage response network from STRING as an edge file (412 proteins, 3,170 interactions,
with STRING's combined score among its 13 columns) and an expression table keyed by gene symbol (25
columns). The first three steps are journey 3's file and join steps.

**Leaves VR, before the walk:** getting the two files onto the headset at all. They are on her
laptop; she mails them to herself and saves them in the headset browser's 2D window, about 8 acts
outside graphty that are not in the count. In the paired condition the laptop's folder is the
Inbox and this disappears; journey 4 is run once paired as well.

Each step gives the walked count. Where the step could be done another way, "Page path" or "Hotbox
path" gives that way's count. The walk takes whichever is shorter at each step.

1. **Add the files and open the network.**
    - **What you do:** On Home pinch "Add files from this headset...". In the browser's picker,
      pick both files and Open. On Home, under Files on this headset, pinch "ddr-string-edges.csv";
      on its page pinch "Open as new graph..."; pinch Open.
    - **What you see:** graphty copies both files into its own storage and lists them. The file page
      shows its first rows and "edge list, 13 columns". The import form maps protein1 and protein2
      as source and target and keeps "combined_score" as an edge attribute, with the other ten
      columns offered folded. The load report: "412 proteins, 3,170 interactions, nothing dropped; 9
      pieces". If the picker ends the immersive session on this headset, graphty re-enters VR on the
      same page with one pinch, counted (the shared service's check).
    - **Controls:** 7 presses (3 of them in the picker). 0 on the graph.

2. **Keep the largest piece as the working network.**
    - **What you do:** On the graph page pinch the fact "9 pieces: largest 391". On its page, "In the
      largest piece (391)", pinch "Make working network...", then Apply.
    - **What you see:** The piece is kept rule matches: its 391 proteins are lit; the form reads "Keep
      391 of 412 proteins as the working network: hides the other 21 and limits what runs see. They
      stay in the project." The 21 get dashed rings while the form is open. Apply makes a filter step
      "Working network: largest piece" with "also limits what runs see" on, and Undo names it.
    - **Controls:** 3 presses. Hotbox path: hold on a node in the main body and let go on the Select
      header (it latches), "Its piece: 391", a held pick on a selected node on "Make working
      network...", Apply: 4 acts, 2 on the graph.

3. **Join the expression table, and repair what it missed.**
    - **What you do:** On the graph page pinch "Add data...", pinch "ddr-expression.csv", switch on
      "Ignore case", pinch Join. On the report pinch "6 not matched". On the first two rows press the
      suggested alias; press Back.
    - **What you see:** The join form, on the panel, proposes "gene_symbol matches node name: 372 of
      391 matched -- 19 not matched". With Ignore case: "385 of 391 matched; 6 not matched". Join adds
      25 columns, each an attribute page (logFC, p_value, and so on). The unmatched page lights the 6
      in the graph and lists each with its three nearest keys in the table and any known alias:
      "H2AFX -- alias of H2AX: Match to H2AX". Each match is a change Undo names. She matches the two
      with an alias; the other four (none in the top 200 by degree) stay "unmatched", and the page
      says so.
    - **Controls:** 8 presses. 0 on the graph.

4. **Run four centralities as one batch, deciding the weight.**
    - **What you do:** Graph page, "Run an algorithm...". In the family "Importance (centrality)",
      tick Degree, Betweenness, Closeness and Eigenvector; pinch "Run 4 as a batch...". On the Check
      card pinch "Ignore weights". Run batch.
    - **What you see:** Each algorithm reads in plain words first ("Betweenness: sits between
      groups"). The batch form holds only the fields all four share -- Scope "Working network (391)",
      Direction -- and under them each algorithm's own fields. The weight reads, per algorithm:
      "Weight -- Degree: not used; Eigenvector: not used; Betweenness: not used; Closeness: read as a
      distance". The Check card says it in words: "combined_score is a confidence: higher means
      closer. Closeness would read it as farther." with counted choices "Use as is (higher score =
      farther) -- Use 1 minus score -- Use 1 / score -- Ignore weights". She picks Ignore weights.
      The Check card then reads "You did not change: undirected, normalized, for all four". Run batch
      lands on the Runs page with the four runs ticked; Undo reads "Undo: Run batch (4 runs)". Each
      run's page records "unweighted", its direction and options -- the transform that was applied,
      never a field that was typed.
    - **Controls:** 8 presses. Hotbox path: a hold on the shell and the Analyze header's "Run
      several..." replace the first press: 9 acts, 1 on the graph.

5. **Read the four distributions.**
    - **What you do:** On the Runs page, pinch "Read side by side" in the bar for ticked rows.
    - **What you see:** The wide sheet opens in the panel's place and shows four small histograms in
      one row, each with its top three named: Degree and Eigenvector each have three bars alone at
      the top; Closeness is flat; Betweenness has two standouts. Resting on a histogram opens its
      ranking under it; resting on a bar lights its proteins in the graph.
    - **Controls:** 1 press. Hotbox path: the "..." box on a ticked row ("4 runs"), then "Read side
      by side": 2 acts.

6. **Combine them into hub_score.**
    - **What you do:** In the same bar pinch "Combine into a score...". Pick the template "Mean of
      rank scores". Pinch the name field and type "hub_score". Apply.
    - **What you see:** The four ticked runs fill the template's inputs. The formula shows in words
      -- "for each measure, 1 minus (rank minus 1) divided by 390, so the top protein scores 1.0 and
      the last 0; hub_score is the mean over the four; ties take their average rank" -- and as text.
      The template declares "higher is more central", and the preview row shows the current top three
      before Apply: "TP53 0.99, BRCA1 0.98, ATM 0.97". The Check card lists "ties: average rank" and
      "all four weigh the same" as defaults she did not change, each a link to its field. Apply lands
      on "Attribute: hub_score", with its linked reader and "Made from: 4 runs, unweighted".
    - **Controls:** 4 presses, 9 keys.

7. **Keep the top 10 and read them in one table.**
    - **What you do:** On hub_score's page pinch "Select top..." and "10" in its strip. On the page it
      lands on, pinch "Open as table", then "Add columns...", tick "the 4 ticked runs", logFC and
      p_value, and Add.
    - **What you see:** "Select top 10" makes kept rule matches, "hub_score top 10", with a page of
      their own, linked from hub_score's page and listed with the sets on the graph page; it also
      selects the ten, which get the selection mark and, being 20 or fewer, labels. Clearing the
      selection later never touches this page. The table opens on the wide sheet: rank, name,
      hub_score, degree, betweenness, closeness, eigenvector, logFC, p_value, and "in the top 10 of":
      TP53, BRCA1 and ATM are in 4 of 4; UBC is in 3 of 4. This is W23's "agreement visible".
    - **Controls:** 8 presses.

8. **File each one.**
    - **What you do:** On the table pinch "Review these...", pick the pair "Keep / Drop", pinch Start.
      For each row, read its values and press Keep or Drop on the cursor row's second line; on the two
      Drops pick a reason. Then pinch "Keep filed rows as set..." and Save.
    - **What you see:** The cursor lights TP53 and frames it only if it is off view, with a leader
      line from its row; the row reads "TP53 -- hub_score 0.99 -- logFC 1.8 -- p 0.0004 -- in the top
      10 of 4 of 4", and the line under it has Keep at one end, Drop at the other, and "Skip:
      undecided" between them. Each press files and moves on; for 300 ms the new row's values flash
      and its line ignores presses. UBC and HSP90AA1 are Dropped as "well studied, no change in my
      data"; the other eight are Kept. History lists ten review steps with her name and the time, and
      Undo reads "Undo: Reviewed CHEK2: keep". The set form suggests "Kept: hub_score top 10 (8)",
      with "and select them" on; Save makes the set and the selection becomes those 8.
    - **Controls:** Review these, a pair, Start, 10 row actions, 2 reasons, Keep filed rows, Save.
      17 acts, 0 on the graph. Hotbox path: each filing as a held pick on the node's review row, the
      same 17 acts with 10 on the graph; she uses the rows here because her judgment is about the
      row's numbers.

9. **Find the communities.**
    - **What you do:** Pinch the breadcrumb's "DDR network", pinch the suggestion "Groups:
      Communities (Louvain)", read the Check card, Run; on the run page "Color by..." the group
      field, Apply.
    - **What you see:** The Check card reads "scope: working network (391)", so the groups describe
      the network, not her picks. The run page lists "Sets in these groups: Kept: hub_score top 10
      (8) -- 6 in group 2, 2 in group 5", and the graph colors the groups.
    - **Controls:** 5 presses.

10. **Gather the proteins drawn between two groups, and compare them with the hubs.**
    - **What you do:** Turn the graph with a drag until groups 2 and 5 meet in front of her, near
      TP53. Resting the dominant ray on a few proteins in the seam to read their tags, she sweeps the
      seam with her other hand, then pinches one stray off with it. She holds still on one of the
      gathered proteins, slides to "Keep as set..." and lets go, types the name "between 2 and 5"
      and saves. On the set's page she pinches "Compare with..." and picks "Kept: hub_score top 10
      (8)". Then "Note...", Cite, and, typing with one hand, she cites the comparison's overlap fact
      on the page and pinches MDC1 in the graph with the other. Save.
    - **What you see:** The off-hand tip reads "+ select (new)", because the selection is exactly a
      kept set, then counts "+1 -- RNF8 ... +9 -- MDC1". A sweep takes only the nearest protein along
      each ray, never faint ones, so what it takes is what she sees between the two colors, through
      the depth of the layout. One protein sat behind the seam; the tip reads "- PCNA" and she pinches
      it off: "Selection: 8 (new)". No rule says the same thing: "members of group 2 or 5 with ties
      to the other group" is 41 proteins, most of them out of this view. The kept set is marked
      "hand-picked scope", and its page says so. The comparison reads "Overlap: 0 -- each of the 8
      ties to 2 or more kept hubs -- mean logFC 1.1 against 0.3 for the network", with the Check
      card line "one side is hand-picked: this describes your pick, not the network". The note on
      the set reads "These [8 proteins, 0 overlap, ties to 2+ kept hubs] sit between the repair and
      checkpoint groups; [MDC1 -- logFC 2.2] is the strongest."
    - **Controls:** a turn (a view move), an off-hand sweep, an off-hand pinch, a held pick, Save, a
      link, a pick, Note..., Cite, a cited fact, an off-hand pinch on the graph, Save. 12 acts, 4 on
      the graph, and about 50 keys. Page path: none gives the same eight.

11. **See the hubs against her experiment.**
    - **What you do:** Pinch the address bar, type "logfc", Enter. On logFC's page "Color by...",
      choose "Diverging, centered on 0", Apply. Open the kept hubs' set from Places. Pinch "Review
      these...", type the pair "Changed neighbors / Alone", pinch Start, and on the dial under the
      graph pinch "+25". Then for each hub the cursor frames, look at its neighbors, hold still on
      the hub, slide to the review row and let go on one of the pair.
    - **What you see:** The diverging palette is offered as counted choices: centered on zero, gray
      where missing ("6 unmatched: gray"), a symmetric range at the 95th percentile ("clips 4 of
      385"). The color layer sits above the group colors, and the layer list says so. On the kept
      set's review, the dial follows the cursor: each hub is framed with its 25 nearest neighbors at
      full strength in red and blue, the rest faint. The hub's hotbox carries the review row ("Changed
      neighbors -- Skip: undecided -- Alone"); each held pick files the hub and moves the cursor to
      the next. She files five as "Changed neighbors" and three as "Alone". History records eight
      more review steps under the new pair.
    - **Controls:** the address bar, Color by, a choice, Apply, Places, Review these, Start, a dial
      step, 8 held picks on the hubs. 16 acts, 8 on the graph, and about 30 keys. Page path: the
      same 16 with the filings on the rows and 0 on the graph; she files on the hubs because the
      judgment is about what the graph shows around each one.

12. **Simulate removing the top three hubs.**
    - **What you do:** Hold still on TP53, slide to "What if removed...", and in its strip let go on
      "Remove TP53". Hold still on BRCA1 and let go on Again; the same on ATM.
    - **What you see:** TP53 is in the kept set but the selection is now the eight from step 10, so
      the hold targets TP53 alone. The strip reads "Remove TP53: 14 proteins cut off, 1 piece becomes
      5". The result opens the Scenario table; Again, in the first cell of the look-and-keep row,
      reads "Again: What if removed on BRCA1", then on ATM, each adding a row. The cursor row draws
      its removed protein hollow and rings the proteins it cuts off. Nothing in the project changes;
      Undo stays as it was.
    - **Controls:** 3 held picks. 3 acts, 3 on the graph. Page path: the kept set's link, "What if
      removed, one at a time...", "Top 3 by hub_score", Run: 4 acts, 0 on the graph.

13. **Size by hub_score and label only the top 10.**
    - **What you do:** Pinch the address bar, type "hub", Enter. On hub_score's page "Size by...",
      Apply; "Label by...", "Only: top 10" in its strip, Apply.
    - **What you see:** Sizes scale with hub_score; only the top ten carry name labels. Each is a
      style layer with its own page and legend.
    - **Controls:** 6 presses, 3 keys.

14. **Lay the network out around the top hub.**
    - **What you do:** Hold still on TP53 and let go on the Layout header; in its column press
      "Radial around TP53...". Apply.
    - **What you see:** The radial form opens with its Center slot already filled ("Center: TP53,
      from the node you held"). The network rearranges in rings by hops from TP53, the labeled hubs
      mostly in the first two rings, inside the graph where she placed it. Undo reads "Undo: Lay out
      Radial".
    - **Controls:** a held pick, a press, Apply. 3 acts, 1 on the graph. Page path: breadcrumb, "Lay
      out...", "Radial", pinch TP53 to fill the Center slot, Apply: 5 acts, 1 on the graph.

15. **Export the ranked table with every metric.**
    - **What you do:** Pinch the breadcrumb's "DDR network", then "hub_score top 10" under its sets
      and matches; "Export table..."; Export.
    - **What you see:** The CSV form lists every column, including both reviews' decisions and
      reasons as columns, with "Also write a methods file" on: a second file,
      `ddr-hub-top10-methods.csv`, with each run's weighting ("unweighted"), direction and options,
      the score's formula in words, and every review step with its reviewer and time. "Save to: this
      headset".
      **Leaves VR:** moving the two files to her laptop happens outside the immersive session,
      unless she works paired.
    - **Controls:** 4 presses.

16. **Make the figure.**
    - **What you do:** Press Back to the graph page; "Export...", Picture, Save.
    - **What you see:** The Picture form, from one camera between her eyes, legend on (size by
      hub_score, color by logFC, top-10 labels), "Save to: this headset". Taking the picture drops
      one frame; the status line reads "Taking picture".
    - **Controls:** 4 presses.

**Count.** About 109 acts and about 93 keys walked: **16 on the graph (15 percent)**, 1 view move.
Pages only: about 112 acts with 2 on the graph, and step 10 cannot be done at all (a rule takes 41
proteins, not the eight she looked at). The graph path is shorter at steps 12 and 14, the pages
at steps 2, 4 and 5, and they tie elsewhere. Journey 4 is mostly list and table work -- batches,
formulas, rankings, filing -- and this design puts that work on the panel, where it reads best. The
graph carries the two moments a laptop cannot: the gather between two groups in step 10, and
judging each hub against its neighbors in her own data in step 11. Journey 3's file and join steps
took 18 acts and no typing.

### W02 Visual Exploration -- Overview to Detail, on Vision Pro

From `design/designloom/workflows/W02.yaml`; persona **Explorer Elena** (a product manager, novice,
no graph training, who abandons tools whose learning curve feels steep and fears breaking things).
Phases: overview, zoom, filter, details on demand. Elena wears an **Apple Vision Pro**, look and
pinch, seated, headset only. Data: the OpenFlights routes sample (3,214 airports, 36,906 directed
routes weighted by the number of airlines; each airport has a name, city, country, latitude and
longitude).

1. **Open the data.**
    - **What you do:** On Home, look at "OpenFlights airline routes" under "Start with a sample" and
      pinch.
    - **What you see:** The graph page: "3,214 airports, 36,906 routes, directed, weighted by number
      of airlines", with its pieces as a link and the suggestions "Who connects most: Connections
      (degree)" and "Groups: Communities (Louvain)". The whole graph draws, a dense core with a
      scatter around it; with Labels at "focus plus top 50", the 50 busiest airports are named.
    - **Controls:** 1 press.

2. **Overview.**
    - **What you do:** Pinch with both hands and pull the graph closer and larger; pinch-drag beside
      it with either hand to turn it. Pinch "Who connects most", then Run. On the run page pinch
      "Paint...", leave the defaults, Apply.
    - **What you see:** The hairball turns under her hands and stays where she put it. Run lands on
      the ranking beside its very skewed histogram (Log scale in the reader's header straightens it).
      Paint sizes and colors airports by connections, so the hubs stand out.
    - **Controls:** 2 view moves, a link, Run, a button, Apply. 6 acts, 0 on the graph.

3. **Find a pattern.**
    - **What you do:** Pinch the breadcrumb's first item, the graph page; pinch "Groups: Communities
      (Louvain)", read the Check card, Run; on the run page "Color by..." the group field, Apply.
      Then pinch one airport in a colored region and pinch its group link. Press Next group twice.
    - **What you see:** The groups paint the graph in large regions. The airport's page lists "Group
      4". The group page's profile shows its countries are mostly from one part of the world: groups
      follow world regions. Next group walks the others, each lit and framed if off view.
    - **Controls:** the breadcrumb, a link, Run, a button, Apply, a press on the graph, a link, Next
      group twice. 9 acts, 1 on the graph.

4. **Zoom to an area of interest.**
    - **What you do:** Look at the dense knot of European hubs and pinch. Pinch "Frankfurt" on the
      card that opens. On the dial under the graph pinch "+25".
    - **What you see:** Several airports lie within 2 degrees of the ray, so the "which one?" card
      opens at the pinch point: 8 airports with two values each (connections, country) -- Frankfurt,
      Munich, Amsterdam and others -- then More. Each row lights its airport on pinch-down. Frankfurt's
      page opens; it is in view, so the graph does not move. "+25" draws Frankfurt and the 25 airports
      most tied to it at full strength and labeled; the rest stay a faint cloud, and the minimap
      outlines where she is.
    - **Controls:** a press on the graph, a card row, a dial step. 3 acts, 1 on the graph.

5. **Keep this view.**
    - **What you do:** Hold still on the empty space beside Frankfurt and let go on the View header;
      in its column press "Save this view...", then Save.
    - **What you see:** "Save this view..." acts on what she is looking at, so it opens no page first
      and the focus stays. The suggested name is "Frankfurt and 25 around"; the view stores the page,
      the framing, the focus and the time window, never where the graph sits in the room.
    - **Controls:** a held pick on the graph, a press, Save. 3 acts, 1 on the graph.

6. **Filter: what to hide, and what would be lost.**
    - **What you do:** Pinch Places, then "Run: Connections". Pinch "Filter...". Drag the cut handle
      up the histogram until the count reads about a tenth of the airports. Apply.
    - **What you see:** "Connections at least 30: keeps about 1 in 10 airports -- just under: two
      airports at 29" and "In the view 'Frankfurt and 25 around': 3 of 26 would be hidden (link)".
      The airports that would go get dashed rings, so she sees which Frankfurt neighbors drop before
      anything changes. "Hides from view. Later runs still see all 3,214". Apply thins the knot enough
      to read routes between hubs.
    - **Controls:** Places, a row, a button, a drag on the cut handle, Apply. 5 acts.

7. **Details on demand.**
    - **What you do:** Pinch an airport in the graph; pinch a thick route from Frankfurt. Press
      Collect on the Selection chip and drag across four hubs she wants to compare. Hold still on one
      of the four and let go on "Open as table".
    - **What you see:** Each airport lights and shows its tag at pinch-down; sliding off cancels, and
      letting go while the ring fills only reads the tag. A quick pinch with either hand opens a page,
      and a drag with either hand turns the graph, so she never selects by accident; with Collect on
      the mode chip reads "+ select" and her drag sweeps instead. The airport's page lists every
      attribute and its routes as stubs. The route's page reads its two ends and the number of
      airlines. The sweep counts "+4 -- MUC" at the ray tip. The hold opens the selection's page
      (Collect turns off as she leaves the route page) and its table: four rows with connections,
      country and routes to each other, each row lighting its airport.
    - **Controls:** two presses on the graph, Collect, a sweep, a held pick. 5 acts, 4 on the graph.

8. **Return to a previous view.**
    - **What you do:** Pinch the breadcrumb's first item; on the graph page pinch the view "Frankfurt
      and 25 around" and Go.
    - **What you see:** Go restores the saved page, framing and focus, with the filter still on (a
      view is where you look, not what you changed), and leaves the graph where she placed it.
    - **Controls:** the breadcrumb, a link, Go. 3 acts.

9. **Share a picture.**
    - **What you do:** Hold still on the empty space beside Frankfurt and let go on the File header;
      press "Picture of this view...", then Save.
    - **What you see:** The Picture form, from one camera between her eyes, legend on, "Save to: this
      headset". Whether Safari's save to Files completes without suspending the immersive session is
      the shared service's check; if it does not, the picture stays in graphty's storage and "Save to
      Files" is offered on the 2D page after Exit VR, and the re-entry is counted.
      **Leaves VR:** sending it to a colleague (AirDrop, mail) happens in visionOS outside the
      immersive session, because a WebXR page cannot share.
    - **Controls:** a held pick on the graph, a press, Save. 3 acts, 1 on the graph.

10. **Keep what she learned.**
    - **What you do:** Pinch the breadcrumb's first item; pinch "Note...", type "Groups follow world
      regions; start from the Frankfurt view next time." Save. Then Home, Save..., Save.
    - **What you see:** The note on the graph page. The project saves as "OpenFlights -- first look"
      on the headset; its page says Safari may clear it after 7 days unused and offers "Keep a copy
      in Files".
    - **Controls:** 3 presses, about 50 keys, 3 presses. 6 acts.

**Count.** About 44 acts and 50 keys; 8 on the graph (18 percent) and 2 view moves. Like journey
4, exploring a large graph by ranking and filtering leans on the panel. The workflow's success
criteria map to checks: one structural pattern found (step 3), orientation kept (asked to point to
where the Frankfurt view sits in the whole graph), and smooth transitions (comfort ratings).

### The fraud investigation, in short

The fraud ring journey (journey 2, W06) is Findings Inbox's proof journey and is not walked here;
this is how it runs in this design. Sarah opens a case extract whose file name gives the alert
("Start from: ACC-48213"), with its account table offered beside the edge file. She holds on the
account and grows its neighborhood through shared devices and phones with the counted strip; holds
on device D-7731 for "Its 7 accounts: select", a gather recorded as a rule relative to the recipe's
input so it replays on the next alert (a hand sweep is recorded as "a hand pick" and asks during
replay). Dates show absolutely beside their relative form, counted from the graph's "As of", so
"created 19 days before As of" is still true at trial. The Route form says which ties it follows,
with "transfers only, in their direction" and "in time order", its To slot takes a set or rule
("Any known fraudster (12)"), and each hop shows its amount and time. Communities run on the whole
extract, never on a hand-picked selection without the Check card saying "groups describe your
selection, not the data". "Review these..." sets the labels "Ring member / Not involved"; she files
each account with a held pick on it while the cursor frames it, or on its row, reading the
account's values on the row. Her evidence note is mostly citations pinched from the graph and the
pages, not retyped numbers. Report makes the case file (members, the review steps with reviewer and
absolute time, the rule in words, the routes hop by hop, the runs with scope, window and seed, the
cited notes, the picture) as a PDF and a members CSV.

---

## 6. How it grows

Nothing below needs a new control. Every catalog, form and page is generated from graphty-element's
descriptors, and every new entry is reached the same four ways: a page, the address bar, a hotbox
column's "All ... (N)" row, and a link wherever it is mentioned.

- **The algorithm catalog with options.** The Algorithms page lists families with jump links (29
  algorithms today, 60+ in the algorithms package); each algorithm's page states what it does in
  plain words, its cost for this graph and its preconditions. The address bar finds it by plain or
  technical name ("katz" finds "Influence at a distance (Katz)"). Its form is generated from its
  options: steppers with detents, a decade field plus a mantissa for logarithmic values, attribute
  lists filtered to the kinds the option accepts, node slots (pinch a node with either hand, type a
  name, use the selection, pick a row), Advanced folded, the Check card, Sweep with suggested
  values. Each algorithm declares what a weight means to it (a strength, a distance, or not used),
  so the Check card can say when a column is read backwards and offer the transforms. Batches ("Run
  N as a batch") share only the fields their algorithms share and show the rest per algorithm. A
  result field becomes an attribute page read by its kind, so Select top, Filter with a cut, Paint
  and Compare work with no new code.
- **Layouts.** A Layouts page of the 14 named layouts; Apply... opens the engine's generated form
  (ForceAtlas2's options fold under Advanced); a center or focus option is a node slot filled by a
  pinch, or already filled when the layout is chosen from a node's hotbox; a live layout gets a
  named Stop on the status line; "Lay out these..." on a set; Move and pin on a node's hotbox.
- **Styling layers.** Color by, Size by, Label by and Paint on attribute, run, set and selection
  pages each add a layer; every layer is a page with Move up, Move down, Hide, Edit...; the graph
  page lists them in order with grips; Style presets; "Painted by" on every node page explains the
  look. A diverging palette (logFC centered on zero, gray where missing) is one form with counted
  choices.
- **Compare.** Compare with... on run and set pages (rank change table, group overlap table); ticked
  rows as one target; the scenario table for removals; a second network added from a file and
  merged by a form with key columns and match counts. Side by side in two views waits for
  graphty-element to draw two views in one session; until then a Condition switch flips the merged
  graph between conditions in the same positions.
- **History and recipes.** History with step names and review steps; Open as preview; Undo back to
  here keeps the later steps as Redo; recipes turn picked sets into inputs ("a set or a rule"),
  record gathers as rules where they can, use "Ask me during replay" for a person's own pick, and
  always replay into a new project.
- **Import, export and reports.** A file's page shows its first rows and detected format; the
  import form is generated from the reader's descriptor; Add data joins a table with per-column
  match counts and an unmatched-keys page. Every Export form comes from its writer's descriptor (9
  formats today). Report prefills its methods from History's live steps (a run that was undone is
  marked "undone, not in methods"), includes review steps with the reviewer and absolute times, and
  exports as a PDF.
- **Domain pages.** A domain adds list pages that are made of the same parts: for fraud, "Follow
  the money..." (an account's transfers in time order, with the row cursor), "Cycles through
  this..." (money going round, following direction and time order, landing on a route-style page),
  "Timeline..." (each account's creation and first transfers on one axis), and a "Count steps
  between: accounts" option when the graph has several node kinds.
- **Plugins.** A plugin's algorithm, layout, reader, writer or palette appears in the same pages,
  forms, readers, file kinds and hotbox columns from its descriptor. A plugin result that is a table
  opens on a generic table page read by column kind. A new object kind declares a page template
  (facts, verbs with input descriptors and their fixed order, link relations, whether it can be
  selected, how it is drawn as something pickable, and what the graph shows for its page) and
  becomes a page, a hotbox target, an address-bar result, a citation and a note target with no
  hand-made control. An option kind the form generator does not know falls back to a text field
  showing the descriptor's description and default.

**The honest limit.** Everything passes through a page or the hotbox, so reading speed is the
ceiling, not the catalog: about 12 rows on a page, 15 rows by 8 columns on a wide-sheet page. Text
is slow unpaired; citing removes much of it from notes, but a 2,000-character report section
belongs on paired keys. Inputs that are spatial by nature (a camera path drawn by hand, a pattern
drawn as a small graph) fit a form poorly. The twelve hotbox headers are a fixed shape: columns stay
capped by the "All ..." row, but when a whole new area arrives (time series, say) the headers must
be regrouped, which is a design change, not a plugin.

---

## 7. Checks inside the mock

Each is measured while people do the journeys above, never as a separate test. The mock is run in
three arms on the basic journey and journey 4: **pages only** (no holds, no off hand), **all
features, scripted** (the walks above, step by step), and **all features, unscripted** (people get
the goals -- "keep Medici's in-laws as a set and note why only two survive the cut" -- not the
steps, with both paths in front of them).

| Check                                              | Measured during                                                                                                                                                                            | What decides it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is the graph in space used?                        | The unpaired basic journey in each arm; journey 4 and W02                                                                                                                                  | Acts on nodes, edges and regions, view moves and errors, each reported apart. **The shared exit criterion (at least one in four) is decided on the unscripted all-features arm**, from what people choose; the scripted figure (planned 29 percent) and pages only (planned 11 percent) are reported beside it. Journey 4 (planned 15 percent) and W02 (18 percent) are reported as the idea's limit on list work. If people given goals choose the panel, that is the finding                                                                                                                  |
| Does the off-hand selection work?                  | Basic step 9 (citing while typing); journey 4 step 10; W02 step 7 (Collect on Vision Pro); the shared 12-of-400 and 12-of-10,000 pick test                                                 | Nodes meant against nodes taken by a sweep, and sweeps that took a hub or a faint node; turns that became sweeps; sweeps lost to an unintended grab; changes from a resting off hand per 30 minutes; system-gesture triggers on both hands, on Quest and Galaxy XR; on Quest and Galaxy XR, how often a pinch meant to open selected instead; use of Put back. Unintended changes under 1 per 30 minutes and sweeps right first time in 4 of 5, or gathering moves to the Collect switch by default                                                                                             |
| Holds, held picks and the hotbox                   | Every hold in every journey, controllers against hands against Vision Pro                                                                                                                  | Wrong-item rate in first sessions; held picks against latched picks; presses or releases that landed on content that changed in the 300 ms before; pinches released during the ring (looks) and holds that opened the "which one?" card; drags that opened a hotbox and hotboxes wanted but not opened (above all on Vision Pro). Hands keep holds on by default only if their rate matches controllers'. The hold angles, the ring bands, the lookback and the 2.5 cm floor are piloted in week 2 on the five most central nodes of the journey 4 network, not only on the Florentine families |
| Time, head swings and keys saved by the graph path | The basic journey and journey 4, each walked pages-only and with all features                                                                                                              | Time to finish, head swings between panel and graph, and keys, not only acts: the walks plan 35 against 36 acts and 25 against 45 keys on the basic journey, and about 109 against 112 acts on journey 4. Held picks earn their place if they cut time or head swings, or if people choose them unscripted                                                                                                                                                                                                                                                                                      |
| Back against Undo                                  | Basic step 10; every Back within 3 s of a change                                                                                                                                           | How often the hint fires and whether the next act is Undo; how often anyone reports the graph moving when they did not move it (target: never)                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Dense picking                                      | W02 step 4; journey 4 steps 11, 12 and 14; the shared pick test                                                                                                                            | Time and errors to the right node with the nearest-node rule and the "which one?" card, for presses and for holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Panel text, the ray and the graph in one frame     | All journeys, each on its own headset at its own size first (16 nodes on Quest 3, 391 on Galaxy XR, 3,214 nodes and 36,906 edges on Vision Pro), then 10,000 nodes on Quest 3 as a stretch | The panel's widgets at 2 ms a frame on Quest 3 with a 12-row page, hover on, during a scroll; frame time within each headset's budget; 1.3 cm text read aloud correctly from a ranking                                                                                                                                                                                                                                                                                                                                                                                                          |
| Press previews                                     | Every press on a verb button, at each journey's size and at 10,000 nodes                                                                                                                   | Preview latency, measured in week 1. Above about 50 ms the preview shows only the count and draws only the affected nodes                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Text unpaired                                      | Basic step 9; W02 step 10; journey 4 steps 6, 10, 11 and 13                                                                                                                                | Characters per minute and corrections; keys saved by Cite against typing the same names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Files without leaving VR                           | Journey 4 steps 1, 15 and 16; W02 step 9                                                                                                                                                   | The shared service's file check, including whether the picker ends the session on Galaxy XR and whether Safari's save to Files suspends it                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Row cursor and review steps                        | Journey 4 steps 8 and 11                                                                                                                                                                   | Acts per protein filed; which filings were done on the row and which on the node; use of Skip; attempts to press during the 300 ms after a row change; whether History's review steps are understood when read back                                                                                                                                                                                                                                                                                                                                                                             |
| "What the graph shows" and Back                    | Every page change and every Back                                                                                                                                                           | Whether people can say what the lit nodes are for the page they are on, and which nodes are selected; whether Back put back what they expected                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Neck and arm                                       | Every journey, and the shared hour seated                                                                                                                                                  | Head swings between panel and graph per minute (25 degrees each); head pitch while the wide sheet is open (its top row no lower than 15 degrees below eye level); the hotbox within 40 by 30 degrees; comfort over an hour; the beside dock against the below dock                                                                                                                                                                                                                                                                                                                              |
| Paired condition                                   | The basic journey and journey 4 again, paired                                                                                                                                              | The shared service's paired check; acts that no longer leave VR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| First session unaided                              | The basic journey for a newcomer                                                                                                                                                           | Finished without help, and where they hesitated; whether they find holds, held picks and the off hand from the first-use hint alone                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

---

## 8. Why it should work, and known risks

### Why it should work

- **The browser is the most practiced interface there is,** and its navigation has been measured:
  Back was about 41 percent of navigation actions (Catledge and Pitkow, 1995) and 58 percent of
  page visits were revisits (Tauscher and Greenberg, 1997). Graph analysis is mostly revisiting the
  hub and the ranking. An address bar that finds anything and never runs anything on its own
  follows Chrome's omnibox.
- **The hotbox is a measured expert path.** Kurtenbach and colleagues' hotbox (CHI 1999) put every
  menu of a large application one held key away, and it has shipped in Maya for decades; marking
  menus showed that pressing, moving and releasing to choose becomes one fluent gesture with
  practice. Here it carries no new vocabulary: its items are the page's own words, and it opens on
  the object itself.
- **The two hands do different jobs, as in skilled bimanual work.** The off hand makes coarse
  gathers and fills slots while the dominant hand points, reads and types, which is Guiard's
  asymmetric division of labor (1987). Gathering is low-stakes (the selection is not the project),
  so a coarse act fits it.
- **Acting on a selection by acting on one of its members** is how desktop file managers and
  graph tools already work, so "hold on a selected node" needs no teaching for most people, and the
  selection mark and the name tag show it before the hold lands.
- **Reading a threshold against what it cuts** follows Table Lens (Rao and Card, CHI 1994), dynamic
  queries (Ahlberg, Williamson and Shneiderman, CHI 1992) and brushing (Becker and Cleveland, 1987).
- **Overview, then zoom and filter, then details on demand** (Shneiderman, 1996) is the graph page,
  the dial, the filter and the node page, which is why W02 maps onto it step for step.
- **Press, preview, release, slide off to cancel** is the platform's own activation on Vision Pro
  and on the web, and every core act is a standard select event, so the design runs on Safari's
  transient pointer.

### Known risks

| Risk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List-heavy work leaves the graph as context: journey 4 puts 15 percent of its acts on the graph, W02 18 percent. Ranking, batching, formulas and filing read best as lists, and moving them into the graph would abandon the idea of pages                                                                                                                                                                                                                                                                             | Stated, not hidden. The graph carries what only it can do (the gather between groups, judging each hub against its neighbors), and the leader lines and the cut from a node keep the eyes on the graph during list work. If people still stop looking at the graph, this idea is best as one part of a design whose list work happens elsewhere, and that is the finding                                                                                                                                                                                                                       |
| People may not choose the graph path: the basic walk plans it one act and 20 keys shorter, which is a thin margin, and journey 4 is roughly even                                                                                                                                                                                                                                                                                                                                                                       | Decided on the unscripted arm, with time and head swings measured. If people given goals choose the panel and held picks save neither time nor head swings, the design fails the exit criterion and is reported that way; holds are not kept to raise the count                                                                                                                                                                                                                                                                                                                                |
| graphty-element's XR input handler already acts on the same inputs: it drags nodes on a pinch, drives the camera from both thumbsticks, and reads pinches from hand joints, with no option to turn this off and no transient-pointer path. `XRInputConfig` (`graphty-element/src/cameras/config/XRConfig.ts`) offers only `handTracking`, `controllers`, `nearInteraction`, `physics` and the z amplification today                                                                                                    | Week 1, in graphty-element: an additive `XRInputConfig` option for the consumer to own input (node drag off, thumbsticks off, the joint pinch detector off on every device) and a select-event source with a transient-pointer path, so the element only reports picks and every pinch arrives once. Additive, so it needs no owner approval. The pull request opens in week 1 with its API report change stated, and the mock builds against its branch, never waiting for a release                                                                                                          |
| The panel needs a widget toolkit, not just text: buttons, inline links, rows with "..." boxes and ticks, a whole-row scroller, steppers and scrub strips, toggles, choice lists, text fields with a caret, the histogram with its cut handle, the wide sheet, and the hotbox cells and strips, all with the press-preview-release rule. There is no HTML route: WebXR's DOM overlay is for handheld AR only                                                                                                            | Babylon GUI controls on small textures, one per row, toolbar segment, hotbox cell or table block, so a change redraws and uploads about 256 KB, not a 13 MB page; Button, Slider, Checkbox, InputText, StackPanel and ScrollViewer come with it. An inline link is a row of text runs. `@babylonjs/gui` is added to the mock only. Text meshes stay for labels in the graph. One named engineer owns the toolkit in weeks 1 to 4, and widgets no walked journey uses are cut. No quad layer: it would cover the ray, the leader lines and the hands, and is tried only if the text check fails |
| Big graphs on Quest: faint context is still drawn, the minimap is a second render, and a force layout on the headset takes minutes                                                                                                                                                                                                                                                                                                                                                                                     | Precomputed positions; faint context as an opaque blend toward the background color through the element's instance color, never alpha, so instanced nodes need no sorting; the faint cloud as one point mesh with no labels and no edges beyond 10,000 nodes; picking through a CPU spatial index; the minimap a static picture. Each journey's own size is measured first, 10,000 nodes as a stretch that does not gate week 1                                                                                                                                                                |
| Press previews through style layers may take longer than a press (150 to 250 ms on Vision Pro) at 10,000 nodes                                                                                                                                                                                                                                                                                                                                                                                                         | Measured in week 1; above about 50 ms the preview shows only the count and draws only the affected nodes, and the missing element capability (a transient emphasis channel) is recorded as the reason                                                                                                                                                                                                                                                                                                                                                                                          |
| Holds compete with slow presses and drags on hands and Vision Pro, and the hand ray jumps as a pinch closes                                                                                                                                                                                                                                                                                                                                                                                                            | Holds only on the graph, never on panel rows; decided by ray angle with a hand-travel floor and the ray lookback; the ring starts at 0.3 s, a release during it is a look, and the name tag shows at press-down; Commands and "..." boxes open the hotbox with no hold                                                                                                                                                                                                                                                                                                                         |
| Off-hand gathering is new: a resting hand may gather, a pinch meant to open may select, and system gestures share the hands                                                                                                                                                                                                                                                                                                                                                                                            | The off hand sweeps only from inside the graph's bounds and only when tracked; it shows the name it is about to take, takes nothing when ambiguous, never opens anything; removals offer Put back at its tip; Vision Pro gathers only under Collect; the check decides whether Collect becomes the default everywhere                                                                                                                                                                                                                                                                          |
| Vision Pro is the least known device: whether a 3 degree ray threshold separates a hold from a drag when the ray follows the hand, whether `selectend` arrives when a hand leaves view, and how two simultaneous transient pointers behave                                                                                                                                                                                                                                                                             | A one-page probe on a real Vision Pro on day 2; a W02 smoke test (open, press a node, hold, the "which one?" card) in week 3; the design already needs no handedness on Vision Pro. The element's transient-pointer path is tested by hand with a scripted checklist until the emulator supports it                                                                                                                                                                                                                                                                                            |
| Hotbox headers need regrouping as the catalog grows, and the 40 by 30 degree budget pushes verbs behind More                                                                                                                                                                                                                                                                                                                                                                                                           | Columns are generated and capped with an "All ..." row; verb rank per kind of object is chosen so the common verbs stay in the first four; regrouping is a stated design task when a new area arrives                                                                                                                                                                                                                                                                                                                                                                                          |
| Text is slow in the headset alone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Suggested names, part-matching ids, the completion row, Cite by the other hand; the paired condition for long text                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Vision Pro's Safari may clear headset storage after 7 days unused                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The shared service's persistent-storage request, the warning, and "Keep a copy in Files"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Weights are not declared: in graphty's algorithms package, degree, eigenvector and betweenness take no weight, and closeness reads one only as a distance                                                                                                                                                                                                                                                                                                                                                              | The mock shows each algorithm's use of a weight and offers the transforms; descriptors that declare what a weight means, and weight options on the three that lack them, are algorithms and graphty-element work                                                                                                                                                                                                                                                                                                                                                                               |
| graphty-element capabilities this needs: a view-only hide kept apart from filters, a transient emphasis for previews, counts for the commands `session.plan()` does not cover yet, runs and layouts that report their seed, a consumer-owned XR input with a transient-pointer path, a consumer step kind in History for review steps, a node marker on layout options, references (sets, windows, recipe inputs) that store what they resolved to, several graphs loaded with one shown, and two views in one session | The mock draws view-only hides and previews as temporary unsaved layers, stubs the rest as listed in section 2, and files each as a graphty-element issue so every consumer gets it; the first two and the input option must land before a study with real users                                                                                                                                                                                                                                                                                                                               |

---

## 9. What we learn by building it

- **Whether getting around by object pages and links works in a headset.** Every object has a page,
  every mention is a link, the graph shows the page, and Back restores exactly where you were
  without moving the graph you placed. The basic journey, journey 4 and W02 test whether people keep
  their place across dozens of pages and can say what the lit nodes mean, and whether keeping Back
  apart from Undo makes them explore without fear.
- **Whether two hands doing different jobs is worth a headset.** One hand types while the other
  cites; one reads while the other gathers what it sees between two groups. The arms show whether
  people do this unprompted, how often the off hand gathers by accident, and whether people find it
  at all.
- **What a held pick on the thing itself is worth.** Held picks make the graph path as short as the
  page path or shorter; the unscripted arm shows whether people take it, and time and head swings
  show whether it keeps the eyes on the graph.
- **Where a page-based design stops being a VR design.** Journey 4's batches, formulas and table
  filing stay on the panel. How far the gather, the review on the node and the cut from a node keep
  the eyes on the graph during list work says whether this idea can stand alone or belongs inside
  another design.

**Parts shared with other mocks, which the comparison should discount.** The review step is a
floor for all six, and its row cursor is shared with Findings Inbox and Facet Browser. The detented
cut that names who sits just outside is shared with Facet Browser and Prop and Plane. History's
"Open as preview" is close to Cutting Room's playhead. The "which one?" card is shared with Findings
Inbox, and the Check card and counted outcomes with Point and Ask. What is this mock's own: object
pages with links and a Back that never undoes or moves the graph; the hotbox on the held object with
release-to-run, Again and the review row; and two hands with different jobs.

---

## 10. Build plan (three engineers, six weeks)

- **Weeks 1 and 2, a track of its own:** the shared toolkit -- the panel's widget toolkit (one named
  engineer, through week 4), the in-scene keyboard, headset files, Save and Export
  ([shared-text-and-file-service.md](shared-text-and-file-service.md)). Week 1 also opens the element's consumer-owned XR input pull
  request (the mock builds against its branch), probes system gestures and the ray's jump at pinch
  on Quest and Galaxy XR, and measures preview latency and each journey's frame budget. Day 2: the
  Vision Pro probe (target-ray movement during a still pinch and a small drag, two pinches at once,
  one pinch one event, `selectend` when a hand leaves view). The widgets' 2 ms is proved by day 3.
  Week 2: the hold angles, ring bands, lookback and nearest-node radii are piloted, on the journey 4
  hubs as well as the Florentine families.
- **Weeks 3 to 5:** page templates and the "what the graph shows" rule, placement kept apart from
  framing, links, Back, Places and Undo, the off-hand selection and the selection mark, holds, held
  picks and the hotbox, the linked reader, the row cursor with review steps, Cite. A W02 smoke test
  on Vision Pro in week 3. The basic journey and journey 4 are real by the end of week 5.
- **Week 6:** the full W02 walk on Vision Pro.
- **Stubbed:** as listed in section 2 -- "What if removed", k shortest routes and Grow neighbors in a
  worker; the combined score in a worker; review steps in a side log; the layout node slot by hand;
  History preview and recipe replay as precomputed states. Every other count comes from
  `session.plan()`.
- **If week 5 slips, cut in this order,** each keeping the person's interaction whole: Forward and
  Places (Back stays); the wide sheet's column paging (8 columns and "more in Export"); Again; the
  cut handle's detents (the "just under" words stay). Never cut: press-down resolution, the hold and
  the held pick, the off-hand gather, Back apart from Undo, the linked reader, the row cursor with
  review steps.
- **After the headset-only study:** the paired condition, laptop keys and folder first, the phone
  keyboard last.

---

## Review notes

### Round 1

Four reviews: `reviews/r1-paired-browser-1.md` (design), `reviews/r1-paired-browser-2.md`
(design), `reviews/r1-paired-browser-3.md` (the fraud analyst walking W06),
`reviews/r1-paired-browser-4.md` (build feasibility). Severity 3 and 4 findings and what was done:

| Review | Finding                                                                                                                                                                                   | Severity | What was done                                                                                                                                                                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | By an honest count the graph is a display: turns, grabs and empty-space pinches were counted as acts on the graph; the gathered nodes did nothing; no account of what only a headset adds | 4        | Fixed. Holding on a node is now the ordinary path to its verbs; a hold on a selected node acts on the whole selection; the gathered nodes become a kept set that a filter reports on and a note targets; node slots and citations are filled by pinching nodes; turns and grabs are reported as view moves. "What only a headset adds" is in section 1 |
| 1      | Walked W02 and W06, not its own proof journey                                                                                                                                             | 3        | Fixed. Journey 4 is walked on Galaxy XR with hands, step by step, opening with journey 3's file and join steps. W06 is one paragraph. W02 stays as the Vision Pro novice walk                                                                                                                                                                          |
| 1      | "The graph shows whatever page you are on" was defined for 2 of 14 page kinds                                                                                                             | 3        | Fixed. One rule, a "What the graph shows" column for every page kind, and Back restores that state exactly                                                                                                                                                                                                                                             |
| 2      | The exit criterion was passed by counting view turns and detours                                                                                                                          | 4        | Fixed; acts on nodes, edges and regions, view moves and errors are reported apart. A press on a node while a cut handle is live sets the cut                                                                                                                                                                                                           |
| 2      | The wrong proof journey; Again, batch, multi-run targets and the scenario table never exercised                                                                                           | 3        | Fixed. Journey 4 runs the batch, reads the four runs as one target, files the top ten, runs What if removed with Again on the next two hubs and compares them in the scenario table                                                                                                                                                                    |
| 2      | A still pinch had three meanings, and the press preview invited the hold                                                                                                                  | 3        | Fixed. Panel rows, links and buttons never open the hotbox by holding; every object row has a "..." box. Holds apply only to objects in the graph, with the name tag at press-down and the filling ring as the warning                                                                                                                                 |
| 2      | The hotbox had no angular budget                                                                                                                                                          | 3        | Fixed. 40 by 30 degrees; rows of at most four verbs plus More; single-word headers; one header's column at a time; the wide sheet paged by column groups; added to the neck-and-arm check                                                                                                                                                              |
| 2      | Back, the most frequent act, was the farthest target                                                                                                                                      | 3        | Fixed. Back, Forward and Places on the panel's graph-side edge, Undo and Redo at the far end, mirrored by dock                                                                                                                                                                                                                                         |
| 3      | The money trail is never shown and routes do not follow money                                                                                                                             | 3        | Fixed in the design: the Route form names the ties it follows with direction and time-order options, hops show their amounts and times, the To slot takes a set or rule, and "Follow the money..." is a domain page                                                                                                                                    |
| 3      | Communities on a hand-gathered selection is circular evidence                                                                                                                             | 3        | Fixed. The Check card warns when a scope was hand-picked and anything made from it carries "hand-picked scope"                                                                                                                                                                                                                                         |
| 3      | Hand sweeps pick up strays and do not replay                                                                                                                                              | 3        | Fixed. Structural gathers are recorded as rules relative to the recipe's inputs; a sweep is recorded as a hand pick that asks during replay; sweeps take only the nearest node along each ray                                                                                                                                                          |
| 3      | Evidence is retyped from the screen                                                                                                                                                       | 3        | Fixed. Cite, used in the basic journey                                                                                                                                                                                                                                                                                                                 |
| 3      | Nothing leaves graphty that a case system can use                                                                                                                                         | 3        | Fixed. Report makes a case file as a PDF and a members CSV                                                                                                                                                                                                                                                                                             |
| 3      | Time is relative to the clock, not the alert                                                                                                                                              | 3        | Fixed. "As of" on the graph page; dates shown absolutely                                                                                                                                                                                                                                                                                               |
| 3      | One headset session per alert does not survive 50 alerts a day                                                                                                                            | 3        | Answered in round 1 with an Alert queue; removed in round 2 because a queue of cases is Findings Inbox's own idea and belongs to the mock that walks the fraud journey                                                                                                                                                                                 |
| 3      | In this walk the graph is a backdrop                                                                                                                                                      | 3        | Partly fixed in round 1; round 2 adds the gather between groups and the review on the hubs in journey 4 (below)                                                                                                                                                                                                                                        |
| 4      | Scope does not fit six weeks                                                                                                                                                              | 3        | Fixed. Section 10                                                                                                                                                                                                                                                                                                                                      |
| 4      | Input conflict with graphty-element's XR input handler                                                                                                                                    | 3        | Fixed in the plan: an additive consumer-owned input option and transient-pointer path in the element in week 1                                                                                                                                                                                                                                         |
| 4      | The hotbox does not fit in view                                                                                                                                                           | 3        | Fixed, as the budget above                                                                                                                                                                                                                                                                                                                             |
| 4      | The panel renderer is unplanned                                                                                                                                                           | 3        | Fixed in round 1 as a renderer; replaced in round 2 by the widget toolkit (below)                                                                                                                                                                                                                                                                      |
| 4      | 20,000 nodes on Quest                                                                                                                                                                     | 3        | Fixed. Precomputed positions, a point-mesh cloud, a CPU spatial index and a static minimap, with a stated fallback                                                                                                                                                                                                                                     |

### Round 2

Four reviews: `reviews/r2-paired-browser-1.md` (the owner's advocate), `reviews/r2-paired-browser-2.md`
(VR interaction design), `reviews/r2-paired-browser-3.md` (the genomics postdoc walking journey 4),
`reviews/r2-paired-browser-4.md` (WebXR build). None found a severity 4. Severity 3 findings and
what was done:

| Review | Finding                                                                                                                                                             | What was done                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | The 29 percent on the graph came from the script: step 4 swept six families that one page press would select, and the spec said holds stayed "for the graph's sake" | Fixed. Both sentences are gone. A strip cell "1 hop, select them" makes the graph path 3 acts against 5 on the page; the off-hand sweep moved to a gather no page can express (journey 4 step 10). Recounted honestly: 35 acts against 36 for pages only, 10 on the graph (29 percent), 25 keys against 45. The criterion is decided on an unscripted arm in which people get goals, not steps |
| 1      | The one headset-only feature was missing from the proof journey and fed nothing in W02                                                                              | Fixed. Section 1 now claims only two hands at once and gathering by position in space. Journey 4 step 10 sweeps the proteins drawn between two communities, keeps them as a set, compares them with the kept hubs and cites them in a note; basic step 9 cites with the off hand while the other types; W02 step 7 ends in a table of the swept hubs                                           |
| 2      | Every graph act had a cheaper panel twin: on hands the hotbox cost two acts per command; "8 make or change" was overstated; the slip was half counted               | Fixed. Release to run on every device (the held pick), committing the cell lit 100 ms before release, so a hotbox command is one act and the graph path ties or wins. The breakdown now reads 5 that start or make a change, 4 that open, 1 slip; step 10 counts the slip and the stray Back as errors. The unscripted arm decides                                                             |
| 2      | The selection decides what a hold does but was never drawn                                                                                                          | Fixed. A selection mark that uses neither color nor size, labels while 20 or fewer, "in selection (6)" on the name tag at press-down, and the ring naming its target from 0.3 s                                                                                                                                                                                                                |
| 2      | On discard buttons holding committed, while holding is how every other button is read                                                                               | Fixed. Hold-to-skip removed; a press opens the two-choice strip and the far choice commits                                                                                                                                                                                                                                                                                                     |
| 2      | The hotbox changed under the ray on dwell                                                                                                                           | Fixed. Headers open only on a press (or a release while held), strips open in a reserved lane that covers no cell, 30 percent hysteresis at cell boundaries, and the holds check counts presses on content that changed in the 300 ms before                                                                                                                                                   |
| 2      | The file card jumped to each new node, into the cloud, and a quick second pinch could file the next row unread                                                      | Fixed by removing the floating card: row actions sit on the cursor row's second line at opposite ends, presses there are ignored for 300 ms after a move, and filing on the node goes through the hotbox's fixed review row. This also answers review 1's severity 2 that the card was Findings Inbox's idea                                                                                   |
| 2      | Back and Go restored "the framing", which could move a graph the person placed by hand                                                                              | Fixed. Placement belongs to the hands only; Back and Go restore framing (rotation and zoom about the anchor) only when the nodes are off view, defined as outside a 25 degree cone; "Put the graph back where it was" is a named act                                                                                                                                                           |
| 3      | One shared Weight field for four centralities that read weights differently or not at all                                                                           | Fixed. The batch form shows only shared fields and each algorithm's own use of a weight; the Check card names the backwards reading and offers counted transforms; the walk picks "Ignore weights" and every run records "unweighted". The missing weight options and declarations are listed as algorithms and graphty-element work                                                           |
| 3      | The hub_score formula read backwards                                                                                                                                | Fixed. Worded so the top protein scores 1.0, ties take their average rank, the template declares its direction, the preview row shows the top three before Apply, and the Check card lists ties and equal weighting                                                                                                                                                                            |
| 3      | The wide sheet sat near the lap with no budget                                                                                                                      | Fixed. It opens in the panel's place at the panel's tilt, at most 60 by 40 cm, 8 columns by 15 rows; head pitch while it is open is in the neck check; the rule is "more than 6 columns, or widened"                                                                                                                                                                                           |
| 3      | Holds landed in the dense core and the selection was not drawn                                                                                                      | Fixed. The selection mark and labels; an ambiguous hold opens the "which one?" card at once; Labels default to "focus plus top 50" on every headset with hands; holds piloted on the journey 4 hubs                                                                                                                                                                                            |
| 3      | The exported table was not an object                                                                                                                                | Fixed. "Select top 10" makes kept rule matches, "hub_score top 10", with their own page, table and Export, untouched by clearing the selection; step 15 reaches them from the graph page                                                                                                                                                                                                       |
| 3      | The hubs were never shown against her experiment in the graph                                                                                                       | Fixed. Journey 4 step 11 colors by logFC with a diverging palette, walks the kept hubs with the dial at +25, and files a second review pair on each hub from its hotbox: 16 acts, 8 on the graph                                                                                                                                                                                               |
| 4      | The plan budgeted a text renderer but the mock needs a widget toolkit nobody owned                                                                                  | Fixed. Babylon GUI controls on one small texture per row or tile, a named engineer for weeks 1 to 4, unused widgets cut, the quad-layer trial dropped                                                                                                                                                                                                                                          |
| 4      | Journey 4 opened files the page cannot see                                                                                                                          | Fixed. The walk starts in VR with "Add files from this headset...", a multi-select picker that copies both files into graphty's storage, counted, with the re-entry check; getting the files onto the headset is marked "Leaves VR". The shared service's own text should say the same; that file belongs to all six mocks and was not changed here                                            |
| 4      | Vision Pro was first built in week 6 on two unchecked facts                                                                                                         | Fixed. Vision Pro needs no handedness now (both hands mean the same; gathering only under Collect); a day-2 probe and a week-3 smoke test; the transient-pointer path is recorded as tested by hand                                                                                                                                                                                            |

The severity 2 and 1 findings were also applied: one rule for when a selection counts as its set,
named hidden members, and a new selection when a gather starts on a kept set; a hotbox verb on
another object opens its page first, and view commands open none; Vision Pro drags turn with either
hand, and an off-hand drag outside the bounds turns everywhere; the ring bands make pinch, read,
release a pure look; the cut handle is live only on a form, with ties shown at the precision that
separates them; the off hand shows the name it will take, sweeps only focused nodes during a focus,
and takes nothing when ambiguous; a press on empty space does nothing; the two-hand grab starts only
inside the graph's bounds; Again has two fixed slots; the hotbox opens in front of a near graph and
on top, the keyboard docks below the panel, and the panel keeps a 5 degree gap; controllers file
with the trigger, not a stick flick; Skip and Undo for review steps, with corrections kept; the
ray lookback; Vision Pro requests no hand tracking; counts come from `session.plan()`; the score,
review steps and the layout node slot are named stubs; W02's save to Files is a check; system
gestures counted on both hands and on Galaxy XR; small histograms in one row; the row shows the
columns the person added; an unmatched-keys page; a figure step; the graph shell and the minimap
reach the graph's page; the piece as kept rule matches; the join form on the panel; STRING's 13
columns; a methods file instead of a sheet; faint context by opaque blend; whole-row scrolling;
each journey's own size measured first; the picture's dropped frame; W02's missing navigation acts;
step 1 counted as three; Peek removed; Put back at the off-hand tip; Clear is not a discard; the
node's hotbox rows follow the table's order and keep Hide away from Pin; a one-hand Closer and
Farther stepper; the edge-picking rule; the email-triage inspiration and the Alert queue removed,
and the parts shared with other mocks named in section 9. The file keeps its name,
[mock-paired-browser.md](mock-paired-browser.md), because the studio addresses it by that path; its title and [the mock recommendation](../xr-prototype-mocks.md)'s
row can be brought into line when [the mock recommendation](../xr-prototype-mocks.md) is next revised.

OPEN SEVERITY 3+: 0
