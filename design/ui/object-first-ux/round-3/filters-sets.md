# Round 3: filters, sets and paths

This document closes the ten gaps in the "Filters, sets and paths" cluster of the gap register
(`design/ui/object-first-ux/round-3/gaps.md`). Each gap is a key function that the round-2
object-first design (`design/ui/object-first-ux/round-2/revision.md`) named but never drew, so
a reader of the mocks could not see how to do it. For each one this document gives the design,
the graphty-element API it needs, and the mock that now draws it. The mocks are
`design/ui/object-first-ux/mocks/v2/screen-59.png` to `screen-68.png`, generated from
`tmp/object-first/gen/screens/screen-59.mjs` to `screen-68.mjs`.

## Terms used here

- **Set**: a tree row whose members are a list of nodes and edges (a filter result, a path, a
  neighbourhood, a hand-made list). A **rule Set** re-computes its members from a rule; a
  **fixed Set** holds a list the reader made by hand.
- **Armed tool**: a toolbar tool that has been clicked (or its key pressed). It turns blue and
  opens the **secondary bar**, the dark one-line sentence above the toolbar that says what will
  happen, on what, at what cost, and holds the one button that does it. Nothing runs until
  that button (or Enter) is pressed; Escape cancels.
- **Parameters popover**: the 240 px light panel that opens above the toolbar with the tool's
  options. The Filter tool always opens it, because its fields are the whole tool.
- **Dry run**: the element's `session.plan`, which counts what a command would do without doing
  it. It drives every "Matches 23 nodes" count and the canvas preview while a tool is armed.
- **Preview**: while a tool is armed, the canvas draws the would-be members at full strength
  and everything else faded. It is a transient view owned by the element, not a style layer,
  and it disappears when the tool is cancelled or snaps back.
- **Inspector tabs**: every Set has Define (what makes the members), Members (what the members
  are), Style (how they are painted) and Record (provenance and export).
- **Size** in the API column: tiny (under a day), small (days), medium (a week or two), large
  (more).

## Decisions this cluster made

Each is a two-way door: an edit to these documents, or a change inside the app.

| Decision                                                                                                                                   | Reason                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pattern search and All routes each hand back **one** Set (the union of every match or route) with a per-match list, not one Set per match  | 45 triangles or 14 routes as 45 or 14 tree rows would bury the tree; the union paints as one layer, and the list steps through the parts. A row in the list can still become its own Set ("Make a set") |
| **Tab steps through the parts** of a Set that has parts (pattern matches, routes), as it already steps through members (`revision.md` 3.3) | one gesture for "next one", and it needs no new control on the canvas                                                                                                                                   |
| The Neighbours tool gets an **Options popover** like every other tool                                                                      | the round-2 bar had no room for the edge-type choice, the "keep edges" choice or the step-by-step size, and the popover is the design's one home for options                                            |
| **Subtract states its order in words** ("Path minus Group 2") with a Swap link                                                             | round 2 made the result depend silently on row order, which a reader cannot see                                                                                                                         |
| An edge filter has a **"Their nodes"** choice: keep all nodes, or only the endpoints of the kept edges                                     | the two readings of "show me the heavy edges" differ, and the element must be told which                                                                                                                |
| The **rule Set's Define tab is the popover's rows** (same order, same controls)                                                            | a reader who learned the popover already knows how to edit the result                                                                                                                                   |
| A fixed Set's members are edited **in place on its Members tab** (an edit mode), not in a dialog                                           | the canvas selection is the source of additions, so the canvas must stay visible and usable                                                                                                             |

---

## 1. Filter by attribute values

**Screen 59** (entry and main state), **screen 60** (the resulting Set's Define tab).

**Entry points.** The Filter tool (F), whose face on a fresh session is By values; the Filter
flyout row "By values"; a column's "..." > Filter by on the Dataset's Data tab (opens the same
popover with the column chosen); Ctrl+K "Filter by values".

**Main state.** The tool arms, the secondary bar reads
`Filter by values  [Options]  Matches 23 nodes  [Select] [Create] [Create and focus]  Cancel`,
and the popover opens above the Filter button with, top to bottom:

| Row        | Content                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Target     | [Nodes \| Edges] (section 4)                                                                                                                                                   |
| Scope line | "On what is showing, 115 nodes" in secondary text ("In Group 2, 11 nodes" under Focus)                                                                                         |
| Attribute  | a select of every categorical attribute and every Grouping in the tree, the node-type role first (#299)                                                                        |
| Find       | a search field over the values, drawn when there are more than 8 values                                                                                                        |
| Chosen     | "2 of 12 chosen" with All and None                                                                                                                                             |
| Values     | one checkbox per value with its count ("2 (11 nodes)"), sorted by count; the list scrolls after 7 rows; a value's count is 0 in secondary text when the current scope has none |
| Invert     | switch: keep what does not match                                                                                                                                               |
| Count      | "Matches 23 nodes", the dry run, updated on every tick                                                                                                                         |
| Button     | Create                                                                                                                                                                         |

The canvas previews the matches. **Select** makes the matches the element selection and snaps
back (no tree row). **Create** makes a rule Set named from the rule ("value is 2 or 9") and
selects it, opening its Members tab. **Create and focus** also focuses on it.

**The Set's Define tab** (drawn on screen 60): Made by "Filter, by values"; Target; Attribute
[value v]; Values [2, 9 (2 of 12) v] (the same checklist in a dropdown); "+ Rule" (turns the
Set into a By rule Set, section 3, keeping this line); Invert; Within [Everything v]; Advanced;
the word "Live" (under a second, an edit re-filters at once).

**Keyboard.** F arms; Up and Down move through the checklist, Space toggles a value, Ctrl+A
chooses all shown, Enter presses Create, Shift+Enter Create and focus, Escape cancels.

**Errors and empty results.** Nothing chosen: the count reads "Choose at least one value" and
Create is disabled (an empty list constrains nothing in the element, so creating it would be a
Set of everything). Zero matches in the current scope: "Matches 0 nodes" and the empty-results
state of screen 48 (another cluster). An attribute with more than 500 distinct values is not
listed here; its tooltip says "Too many values: use By rule with contains".

**Element API.**

| Need                                                                                                                          | Status                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| The filter itself: `{ kind: "categories", attribute, values }`, plus `not` for Invert                                         | exists (`visibility/filter.ts`)                                                                                  |
| The dry-run count: `session.plan` for the visibility command                                                                  | partial: `plan` covers `algo.run` only (#337)                                                                    |
| **Value counts per attribute, within a scope**: `session.data.distribution(path, { scope })` returning `[{ value, count }]`   | **gap, small**. `AttributeDescriptor` has `uniqueCount` and `sampleValues` but no counts; the app must not count |
| A rule Set as a saved scope: `Scope` gains a filter kind (settled decision S2)                                                | gap, part of S2 (medium)                                                                                         |
| The canvas preview as a transient element view: `session.visibility.preview(filter)` that fades the rest and clears on cancel | **gap, small** (the element has `showContext` for faint drawing; a preview must not touch the reader's mask)     |

## 2. Filter by numeric range over a histogram

**Screen 60.**

**Entry points.** Filter flyout "By range"; the bar's variant select; a number column's "..." >
Filter by; a Measure's Values tab histogram (dragging a band there arms this tool with the
Measure and the band already set).

**Main state.** The popover's rows: Target; scope line; **Of** [attribute or Measure v] (every
numeric attribute and every Measure in the tree, Measures marked "(Measure)"); the histogram
(208 x 40, lin | log); Min | Max fields; Invert; the live count; the note that dragging sets the
band; buttons. Dragging across the histogram draws a tinted band with two handles; the handles
and the fields write each other. Bars inside the band are the brand colour, bars outside grey.

A Measure's range can be Selected today; **Create on a Measure reads "Create (not yet)"**,
disabled, with #192 in its tooltip, until the element can keep a range over a run field as a
Set (round-2 decision in `revision.md` 9.1). The secondary bar's Create is disabled the same way.

**Keyboard.** Tab moves Min, Max; Up and Down step a field by one histogram bin; Shift+Up and
Shift+Down by ten; Enter creates.

**Errors.** Min above Max: the fields swap on blur and the band follows. A non-number: the field
turns red with "Enter a number" under it and the count keeps its last value. An attribute that is
90 percent empty: the scope line adds "A value is missing on 104 of 115 nodes; they never match".

**Element API.**

| Need                                                                                                                                          | Status                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `{ kind: "range", attribute, min, max }` on an attribute                                                                                      | exists                                                      |
| Select over a Measure: the `{ above }` selection target, plus a `{ between: { run, field, min, max } }` target                                | `above` exists; `between` is a gap, small (`revision.md` 8) |
| Create over a Measure (a range over a run field kept as a Set)                                                                                | #192, small                                                 |
| **Histogram bins**: `session.data.distribution(path, { scope, bins, scale })` returning bin edges and counts, for an attribute or a run field | **gap, small** (the same call as section 1)                 |

## 3. Filter by an expression or by several rules (AND, OR, NOT)

**Screen 61.**

**Entry points.** Filter flyout "By rule"; "+ Rule" on any rule Set's Define tab or in the By
values and By range popovers (which converts the popover to By rule, keeping the line);
Ctrl+K "Filter by rule".

**Main state, Build mode.** The popover's rows: Write [Build | Expression]; Target; scope line;
**Match [All | Any]** (All is AND, Any is OR); one **rule line** per condition; "+ Rule"; the
live count; Create. A rule line is one row: the attribute, Measure or Set as the label
("Connections", "Communities"), then the operator and value as one select (">= 5", "is not 2",
"contains ATP", "is in Top 10 by Bridges"), then a remove button. The operator list includes the
negations ("is not", "does not contain"), which is how NOT is written in Build mode.
Nesting (an Any group inside an All group) is written in Expression mode; Build mode shows such
a rule as one read-only line "(any of 3 rules) Edit as expression".

**Expression mode.** One multi-line field with the whole rule as text
(`[Connections] >= 5 and not [Communities] == 2`). Typing a "[" opens autocomplete: attribute
names, Measure and Grouping names, and functions, each with its kind. An error shows under the
field with the character position and a fix ("Unknown name [Comunities] at character 27. Did you
mean [Communities]?"); the count and the canvas keep the last valid rule. Switching Build to
Expression prints the built rule; switching back parses it, or says "This rule has nesting Build
cannot show" and stays in Expression.

**The Set's Define tab** has the same Write switch and the same rows (screen 61 draws an existing
Set "Big hubs" in Expression mode mid-edit, with the error, the suggestions and "Keeps the last
valid rule: 4 nodes"). An expression Set re-filters on Enter, not on each keystroke.

**Keyboard.** In Build mode Ctrl+Enter adds a rule line, Ctrl+Backspace removes the focused one;
in Expression mode Ctrl+Space opens autocomplete, Tab accepts; Enter creates (Shift+Enter inserts
a line break in the field).

**Element API.**

| Need                                                                                                   | Status                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ kind: "all" \| "any" \| "not", of }` combinators and `{ kind: "expression", where }`                | exist in the `Filter` type; `expression` throws `E_UNSUPPORTED` without the query engine (#149, large)                                                           |
| Autocomplete names and functions                                                                       | `catalog.functions()` typed, #332                                                                                                                                |
| Validation with a position                                                                             | `catalog.validate(query, { kind: "filter" })` typed, #335                                                                                                        |
| **Print a filter as expression text and parse text back to a filter** (Build to Expression round trip) | **gap, small**: `catalog.format(filter)` and `catalog.parse(text)`; without it the app would translate between two spellings, which the root `CLAUDE.md` forbids |

## 4. Filter edges rather than nodes

**Screen 62.**

**Entry points.** Target [Edges] at the top of every Filter popover and the flyout; an edge
column's "..." > Filter by on the Data tab (which lists node and edge attributes in two
sections).

**Main state.** With Target Edges, the scope line counts edges, "Of" lists edge attributes only,
the histogram or checklist is over edges, and one extra row appears: **Their nodes [Keep all
nodes v]** (or "Only their endpoints"). The bar says "Matches 35 of 78 edges". The preview draws
kept edges at full strength and the rest faded; nodes are untouched unless "Only their
endpoints" is chosen.

**Result.** An **edge Set** ("weight >= 4"), counted in edges in the tree ("35 edges"), with a
line chip, whose Style tab paints EDGES rows first (Colour, Width) and whose first paint is an
edge Width (the Set kind order Outline, Colour, Glow has no meaning on an edge). Focus on an
edge Set shows the kept edges and, by "Their nodes", all nodes or their endpoints.

**Element API.**

| Need                                                                                              | Status                                  |
| ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Edges by expression `{ kind: "edges", where }`                                                    | exists in the type; needs #149          |
| **Edge categories and edge ranges** (`{ kind: "edges", categories }`, `{ kind: "edges", range }`) | gap, small (`revision.md` 3.4 names it) |
| **An edge filter's node rule** (`nodes: "all" \| "endpoints"`)                                    | **gap, tiny**                           |
| An edge Set as a scope: `Scope` gains `{ edges: EdgeId[] }`                                       | gap, small (`revision.md` 8)            |
| Edge distributions                                                                                | the section 1 call with an edge path    |

## 5. Pattern search

**Screen 63.**

**Entry points.** Filter flyout "Pattern"; the bar's variant select; Ctrl+K "Find pattern".

**Main state while armed.** The bar reads
`Find pattern [Triangle v]  Matches 45  [Options]  [Select] [Create]  Cancel`. The popover is the
**pattern editor**: Template [Triangle v] (Triangle, Star of 3, Chain of 3, Square, Clique of 4,
Custom); a table with one row per slot (a, b, c) and one per slot-to-slot edge (a - b), each
with its constraint ("any node", or [attribute] [is] [value] chosen by clicking the cell);
"+ Slot or edge" (turns the template into Custom); Direction [Any | As drawn] (directed data
only); the live count with the cost ("45 matches, about 20 ms"); Create. The preview draws every
match faintly.

**Result.** One Set "Pattern: Triangle" whose members are the union of all matches, whose
summary reads "45 matches, 32 nodes", and whose Define tab is the pattern editor (so editing a
constraint re-runs on Enter). The dock opens on Table with a **"Matches 45"** sub-tab: one row per
match, one column per slot, plus a column per Grouping ("Group 2" or "mixed"). Clicking a row, or
Tab and Shift+Tab on the canvas, makes that match current: its edges thick, its nodes labelled,
the status bar "Match 3 of 45 (Tab steps)". A row's "..." has "Make a set" and "Zoom to".

**Errors.** A search over the match cap (default 10,000) stops and says "Stopped at 10,000
matches: add a constraint or focus on a smaller part [Raise the cap]". A search estimated over
the cost gate (30 s) lands waiting, as every expensive run does (`revision.md` 4).

**Element API.**

| Need                                                                                                                                                                                              | Status                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Subgraph matching**: `session.data.match(pattern, { scope, direction, limit })` returning `{ matches: [{ nodes, edges }], truncated }`, as a run so it has a cost estimate, a record and cancel | **gap, large, no issue yet** (named "design `data.match`" in `revision.md` 3.4) |
| The union as a run-result Set                                                                                                                                                                     | settled decision S2 (the run-result set kind)                                   |
| The per-match list as a run result the Table reads                                                                                                                                                | part of the same gap                                                            |

## 6. The Neighbours tool

**Screen 64.**

**Entry points.** The Neighbours tool (E); a node's Links tab "Neighbours (E)" button; a node's
right-click "Neighbours"; double-click on a node selects neighbours when no server fetcher is
configured (round-2 decision T6).

**Main state.** The tool arms seeded with the selected node or nodes (with nothing selected the
bar reads "Click a node to start from"). The bar reads
`Neighbours of [BrighamYoung] within [1 v] steps, [All directions v], edges [All types v]
13 nodes  35 edges  [Options]  [Select] [Create] [Create and focus]  Cancel`. The Direction select
is disabled with "Undirected data" on undirected graphs; the edge-type select appears only when
an edge type role is set (#299). Clicking another node re-seeds; Shift+click adds a seed.

The **Options popover** repeats Steps, Direction and Edges, adds **Keep edges [Among all | To
centre]** (all edges among the members, or only the spanning ones back towards the seed), and
shows a small table of the size at 1 and 2 steps ("1 step 13 nodes 35 edges; 2 steps 62 nodes 234
edges") so the reader sees the jump before choosing. The preview shows the members, the kept
edges dark.

**Result.** A Set "Around BrighamYoung" (13 nodes), selected, on its Members tab (whose member
rows show the step, "1", in secondary text). Its Define tab: Of [BrighamYoung] | Within [1 v];
Direction; Edges; Keep edges; Invert; Within [Everything v]; Live.

**Keyboard.** E arms; 1, 2 and 3 set the steps while armed; Enter creates; Shift+Enter creates
and focuses; Escape cancels.

**Errors.** An isolated seed: "Matches 1 node, 0 edges: BrighamYoung has no links in what is
showing [Search everything]" (the empty-results screen 48 owns the drawing).

**Element API.**

| Need                                                                                                             | Status                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Selecting neighbours with depth 1 to 3 and a direction: the `{ neighborsOf, depth, direction }` selection target | exists                                                                                 |
| The neighbourhood as a Set: `{ kind: "neighborhood", seeds, depth }`                                             | exists, but **lacks direction, an edge predicate and the keep-edges rule**: gap, small |
| The size per step without selecting: `scope.count(spec)` per depth                                               | exists (`ScopeApi.count`) once the neighbourhood is a scope kind (S2)                  |
| A node's neighbour list for the Links tab: `session.data.neighbours(id, { direction })`                          | gap, small (`revision.md` 8)                                                           |

## 7. Combine Sets

**Screen 65.**

**Entry points.** Ctrl+click (toggle) or Shift+click (extend) two or more rows in the tree; the
inspector becomes the several-objects inspector. Ctrl+Alt+U, I, S and X combine without the
panel. Ctrl+K "Combine...".

**Main state.** The inspector header reads "Several objects / 2 objects", the summary names them,
and the reading states the overlap ("3 nodes are in both (12, 1, 3)"). One tab, no tab strip:

| Row            | Content                                                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| COMBINE        | a table of the four verbs with their key and the size of each result: Union 14 nodes, Intersect 3, Subtract 3, Exclude 11. Clicking a row creates the combination |
| Subtract order | "Subtract Path minus Group 2 Swap": the order is stated, and Swap flips it                                                                                        |
| Note           | the result is a linked Set placed above both rows; it turns stale when an input changes and frozen if an input is deleted (the round-2 linked-object rule)        |
| Compare        | switch (`revision.md` 6.7, another cluster)                                                                                                                       |
| Focus on these | creates nothing; focuses on the union                                                                                                                             |
| STYLE          | the paint rows the selected objects share, "Mixed" where they differ; editing one writes all                                                                      |
| Bulk           | Hide all, Lock all, Delete (2)                                                                                                                                    |

A Path, an edge Set, contributes its nodes and edges; a node Set its nodes and their induced
edges; the result counts both when both are present. **Disabled state:** with a Measure or a
Grouping among the selected rows, the four verbs are grey and the table's first row reads
"Combine needs Sets or Groups; a Measure is selected". Every other row still works.

**Result.** A Set "Group 2 and Path: 12 -> 30" (Intersect), "... or ..." (Union), "... minus ..."
(Subtract), "... or ..., not both" (Exclude), selected, on its Members tab. Its Define tab is the
round-2 Combination row: [Group 2 >] [and v] [Path: 12 -> 30 >].

**Element API.**

| Need                                                                                              | Status                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Scope combinators** (`{ union \| intersect \| subtract \| exclude: Scope[] }`) with edge halves | gap, part of settled decision S2 (medium)                |
| The result sizes before creating: `scope.count(combinator)`                                       | exists once the combinators exist                        |
| A Group as a scope                                                                                | S2 (#149 today throws `E_UNSUPPORTED` for group queries) |
| Linked-object staleness and freezing                                                              | objects API (settled decision S1)                        |

## 8. The Members tab of a Set, Group or Path

**Screen 66.** (A Group's Members tab is the same rows without Hops and Cost, with Profile
open by default.)

**Entry points.** A Set, Path or Group row: clicking it opens Members when a tool has just
created it, and Group rows always open on Members (round-2 decision P2); the tab strip otherwise.

**Main state.** Rows, top to bottom: **Select, Focus, Locate** as ghost buttons (the tab's verbs;
Locate frames the members); Nodes | Edges; **Inside | Cut** (edges among the members, and edges
with one end inside; each with an (i) that defines it); Density | Weighted; **Hops | Cost** (a
path only; Total weight for a network); the member list, up to 6 rows, in the order the Set
defines: hop order with the running cost for a path, step for a neighbourhood, rank for a Top N,
value for a filter, match for a pattern; "Open all N in table" (the dock's Table, filtered to
this Set); **Profile** (a disclosure, #193) with its summary "Mostly Group 2 (3 of 6)": how the
members split over each Grouping and categorical column, with the expected share and an adjusted
p value when open.

Clicking a member row selects that node and haloes it; Tab steps down the list.

**Element API.**

| Need                                                                          | Status                                                                                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Inside, cut, density without touching the selection: `scope.statistics(spec)` | gap, small (round-2 decision I9)                                                                                     |
| Member order and per-member value (hop, cost, step, rank) from the run        | exists for runs that carry ordered results (path, ranking); the neighbourhood step needs the section 6 filter change |
| Profile (over-representation per Grouping and column)                         | #193                                                                                                                 |

## 9. All routes between two nodes, and endpoints typed by name

**Screen 67.**

**Entry points.** Path flyout "All routes"; the Path bar's variant select; the Path Set's Define
tab Method select.

**Main state.** The bar reads
`All routes from [Navy x] to [Mi|]  within [6 v] steps, at most [20 v] routes  [All routes v]
[Options]  Cancel`. From is pre-filled from the selected node as a removable chip; the To field
takes typing (with the caret) or a canvas click. Typing opens the **match list** above the field:
"9 nodes match by label or id", one row per node with its link count, the first highlighted;
the canvas outlines and labels the matches so the reader can also click one. Up and Down move,
Enter picks, Escape clears. The step and route caps are in the sentence so the cost is bounded
before anything runs; Options adds Weighted and Direction. The same name field is the start
node's field for Shortest route and every other two-node Path row (round-2 decision P3).

**Result.** One Set "Routes: Navy -> Michigan" (the union of the routes), selected, on its
Members tab, whose rows are the **routes** ("Route 3: 5 hops, cost 5.0"), stepped with Tab like
pattern matches, with a line "14 found, 20 allowed" or "20 found, stopped at the cap [Raise]".
A route row's "..." has "Make a set" (a single Path Set).

**Errors.** No route: "No route within 6 steps [Allow 8 steps] [Search everything]" (drawn by
screen 48). A name that matches nothing: the list reads "No node matches Mi" and Enter does
nothing.

**Element API.**

| Need                                                                                                                                                                | Status                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All simple paths with max depth and max count                                                                                                                       | #329 (proposed)                                                                                                                                                          |
| **Find-as-you-type node lookup** that returns candidates without selecting them: `session.data.find(text, { limit, fields })` returning ids, labels and link counts | **gap, small**. The selection's `{ text }` target exists, but it selects, and a list of candidates must not change the selection; the resolver needs a text index (#149) |
| The route list as a run result                                                                                                                                      | part of #329                                                                                                                                                             |

## 10. Edit a hand-made Set's members

**Screen 68.**

**Entry points.** A fixed Set's Define tab "Edit members"; its Members tab "Edit" (the tab's
first row gains it for fixed Sets only); a node's About tab "Member of" chip, which carries an
x for a fixed Set; a node's right-click "Add to [set]" and "Remove from [set]"; the several-elements
inspector's "Add to [set v]".

**Main state (edit mode on the Members tab).** The first row reads "Editing [Add selection (3)]
[Done]"; the count reads "Nodes 12 2 removed" and the next row names them; every member row
carries a remove button (x); the list scrolls; the undo note. The canvas keeps the members'
paint; members just removed stay faded and labelled until Done so the reader can see what went;
the current selection is haloed and "Add selection (N)" adds it. Delete or Backspace removes the
highlighted row. Each removal and each Add is one undo step (Ctrl+Z). Done (or Escape) leaves
edit mode.

A rule, path, neighbourhood or group Set has no Edit: its members come from its definition. Its
Define tab offers "Freeze as fixed set" instead, which copies the members into a fixed Set that
can then be edited.

**Element API.**

| Need                                                                                                                     | Status                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| A fixed Set as a scope of ids                                                                                            | exists (`{ nodes }`); edges need `{ edges }` (section 4)                |
| **Change a saved scope's members** in place: `scope.update(id, spec)` or the objects API's `setMembers(id, add, remove)` | **gap, tiny**: `ScopeApi` has `save`, `list` and `remove` but no update |
| One undo step per edit                                                                                                   | objects API history (settled decision S1)                               |

---

## Element work this cluster adds

In addition to the items already listed in `revision.md` sections 8 and 9.3:

| Item                                                                                                                                                                | Size                   | Needed by                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------- |
| `session.data.distribution(path, { scope, bins, scale })`: value counts for a categorical attribute or bins for a numeric one, node or edge, attribute or run field | small                  | sections 1, 2, 4                        |
| `session.visibility.preview(filter \| scope)`: a transient faded preview that never touches the mask                                                                | small                  | every armed Filter, Neighbours and Path |
| `catalog.format(filter)` and `catalog.parse(text)`: the Build to Expression round trip                                                                              | small                  | section 3                               |
| Edge categories and ranges, and an edge filter's node rule (all nodes or endpoints)                                                                                 | small                  | section 4                               |
| The neighbourhood filter gains direction, an edge predicate and a keep-edges rule                                                                                   | small                  | section 6                               |
| `session.data.match(pattern, ...)` as a run                                                                                                                         | large (needs an issue) | section 5                               |
| `session.data.find(text, { limit })`: candidates without selecting                                                                                                  | small                  | section 9, and the Ctrl+F lookup        |
| `scope.update(id, spec)` (or `setMembers` on the objects API)                                                                                                       | tiny                   | section 10                              |

Two of these are published API members and so one-way doors once built: `distribution` and
`find` are new session members a third party will call. Their shapes above are proposals for the
owner to confirm before the element work starts. Nothing in this cluster asks the app to count
values, bin numbers, walk neighbours, match patterns or search labels: each of those is an
element call.

## Resolution lines for the gap register

For `design/ui/object-first-ux/round-3/gaps.md`, cluster 6, and the matching rows of
`design/ui/object-first-ux/round-2/coverage.md`:

| Gap                                      | Screen                        | Section here |
| ---------------------------------------- | ----------------------------- | ------------ |
| Filter by attribute values               | 59 (and the Define tab on 60) | 1            |
| Filter by numeric range over a histogram | 60                            | 2            |
| Filter by an expression or several rules | 61                            | 3            |
| Filter edges rather than nodes           | 62                            | 4            |
| Pattern search                           | 63                            | 5            |
| Neighbours tool armed                    | 64                            | 6            |
| Combine Sets                             | 65                            | 7            |
| Set, Group or Path Members tab           | 66                            | 8            |
| All routes and endpoints typed by name   | 67                            | 9            |
| Remove or add members of a hand-made Set | 68                            | 10           |

## What the mocks draw

All of these are now drawn: the screen generator was extended once for every cluster (dark menus anchored to any control, insets for a second moment, text fields, radios, charts, the History and Assistant docks, coloured status chips, canvas marks, a split canvas, Present mode). A dark tag above a card or a menu marks a second moment on the same screen. The generator's spec keys are listed in `tmp/object-first/gen/README.md`, "Round 3 additions".

The after-Create states of screens 59, 62, 65 and 67, a Group's Profile (66) and the node About tab's "Member of" x (68) are insets; the histogram band (60), the pattern diagram (63), the rule lines with a Not toggle and the code field with its error and completion (61), and the bars of 62, 64 and 67 (edge units, a removable centre chip, a typed name field) are drawn with their own parts. The armed Pattern popover is still not drawn: screen 63 draws the result, whose Define tab holds the same editor.
