# Data flows: what to copy from other tools

Written by the interaction designer and the Figma product designer for the first round of data
mocks. For each flow it says what other tools do well, what to avoid, and what graphty's own model
needs instead. "First screen" means visible with no extra click; "a few clicks away" means one menu
or one disclosure.

graphty's model, in one paragraph, for anyone reading this cold: the graph's look is a stack of
style layers; "which elements" is always one card of conditions that must all hold, with a live
"X of Y" count, ending in a verb (Select, Hide, Style these, Save as set, Run on these); a project
can hold several named graphs; every load is recorded as a source; every data change is one undo
step and one line in the step list, and a saved step list is a recipe. graphty-element computes
every count and match; the app only draws them.

Items the competitor review moved, applied below: a column's type is shown at load, not later;
there is one always-visible way to start a filter; expanding a node comes before "Load more";
refreshing a server source sits beside reopening; applying someone else's recipe is one step in.

## 1. Loading a file and mapping columns

Copy:

- Cytoscape's network-from-table preview: the first rows of the file, a role on each column header
  (source, target, attribute), click the header to change it. The grid is the mapping.
- Tableau's data source page and Power Query: a type icon on every column header, changed from the
  header. Power Query's thin quality bar under each header (valid, error, empty) is the cheapest way
  to show "1 blank" before anything loads.
- Gephi's import report: counts, problems, directed or undirected, and how parallel edges combine,
  on the one screen before the graph is made.
- Figma's drop anywhere: dropping a file on the canvas or the start screen is the main door.

Avoid:

- Multi-page wizards (Gephi's CSV wizard, Cytoscape's stacked dialogs). One page, one Enter.
- Guesses shown per column and still overlooked (Tableau summing ZIP codes, Power BI summing Year).
  Showing every column does not prevent the mistake; naming the risky ones does.

graphty needs instead:

- A confident file collapses the mapping to one sentence that names every role, weight included
  ("From bait, to prey, weighted by confidence as a similarity, directed. Change"), with the
  sample grid still visible under it. An uncertain file opens choices for the uncertain columns
  only.
- The type icon and a not-fitting count sit in the grid header from the first screen ("amount,
  number, 1 blank"), because a wrong type silently breaks later sizing and filtering.
- Problem lines only when nonzero, each with its one action (Add, Leave out, Skip these rows).

First screen: grid, one mapping line, type icons, nonzero problems, Load. A few clicks away:
per-column roles, direction, parallel-edge rule, "Read as..." for an unknown file.

## 2. Adding a second file or joining a table

Copy:

- Gephi's per-import choice "new workspace or append": the decision is made at drop time, not in a
  separate menu.
- Airtable's CSV import "merge with existing records on a field": update rows that match, add the
  rest, with counts before commit.
- Power Query's merge dialog: pick the key on each side, and a live line "The selection matches 318
  of 340 rows" before OK; its fuzzy-matching checkbox is the model for "19 more match ignoring case
  [Use]".
- Cytoscape's Import Table: choose the key column, choose which columns come in.

Avoid:

- Tableau's join-type Venn picker (inner, left, outer) on the first screen. Readers want "add these
  columns to my nodes", not set theory.
- A join that commits and then shows blanks. Every tool that skips the preview line gets the "why
  is my column empty" question.

graphty needs instead:

- Three plain verbs, one pre-chosen from how ids and headers match: Add to this graph, Add columns
  to nodes, Replace data. The match line ("shares 14 ids; adds 26 nodes, 62 edges, updates 14")
  is visible before commit.
- The joined table becomes a source and the join a step naming its key columns, so Replace
  re-applies it and a recipe can repeat it.
- Inside a project, "Open as a new graph" becomes "Add as another named graph", a few clicks away.

First screen: the three verbs and the match line, when a file arrives inside a project. A few
clicks away: key column choice, clashing-column rule, edge joins, id mapping tables.

## 3. Connecting to a server and expanding neighbors

Copy:

- Tableau's Start page and Power BI's canvas links: "a file" and "a server" side by side, equal
  weight.
- Cytoscape's network search bar (NDEx, STRING): type a gene or a name, get a list of networks
  with counts, pick one.
- Neo4j Bloom's right-click Expand: by relationship type and direction, with a node limit on the
  expansion itself; "Dismiss" to remove what you do not want. Bloom's search-first start is right
  for a reader whose data is a database.
- A Test button before Load on every connection form (every BI tool has it).

Avoid:

- Bloom's global result limit hidden in a settings drawer: a capped load must say so on screen.
- One hand-built form per source. graphty draws every source's form from its descriptor.
- Reopening a saved file and querying at once. A shared file could run a stored query.

graphty needs instead:

- "Open network data" beside Open on the start screen; one form drawn from the source's fields;
  Test answers "reachable, sign-in accepted" or why not.
- On a node from a source: Expand (depth, direction, relationship, limit) and Collapse, which
  removes only what that expansion added. Each node says whether it has more. One undo step each.
- A capped load says "5,000 of 40,000" with Load more in place.
- A reopened project shows its saved graph offline and lists waiting loads to approve, with
  Refresh beside each, saying whether the source changed.

First screen: the server door, the source form, Expand and Collapse on a node, the capped line.
A few clicks away: writing a query, Load more pages, defining a new web API source.

## 4. Filtering and selecting by condition

Copy:

- Gephi's Filters panel, which has both a Filter and a Select button over the same query: the
  direct precedent for one card ending in Select or Hide.
- Tableau's "Keep only / Exclude" on selected marks: select first, then hide or keep from the
  selection. A reader who clicked nodes should not have to restate them as a rule.
- Neo4j Bloom's slicer and OpenRefine's numeric facet: a range slider over a histogram for a number
  column. The histogram shows where to cut.
- OpenRefine's text facet: every value with its count, tick to keep. The right control for a kind
  or category column.
- Airtable's filter bar with "where field is value" rows.
- Figma's "Select matching layers": one command to select everything like the selected thing.

Avoid:

- Gephi's drag-into-a-query-tree. Ordered trees confuse newcomers; the step list appears only when
  there are two steps.
- Airtable's and/or groups on the first card. All conditions must hold; "or" is a later need.
- Flourish's filter that removes rows for good. Hiding never deletes data.

graphty needs instead:

- One always-visible Filter entry on the toolbar, beside find, that opens the condition card with
  the field list focused. The per-attribute menu (Select where..., Hide where...) stays as a second
  door to the same card.
- The card counts "140 of 900" as conditions change, before the verb.
- The same card targets a style layer, a saved set, an algorithm's scope and an export's scope.
  One pattern, five verbs.

First screen: find, the Filter entry, the card with Select and Hide. A few clicks away: ordered
steps with on and off switches, saved filters and sets, Style these, Run on these.

## 5. Cleaning and duplicates

Copy:

- OpenRefine's clustering: groups of near-identical values ("Acme", "acme ", "ACME"), each with a
  Merge checkbox and the value to keep, approved per group. The best cleanup pattern in any tool.
- Airtable's Dedupe extension: one group at a time, pick the record to keep, choose per field
  which value wins.
- Gephi's merge nodes with a rule per column (sum, first, list), and its import option for how
  parallel edges combine.

Avoid:

- A Cleanup menu on the first screen. Kumu's top FAQ topic is duplicates, but they come from
  importing the same sheet again, which Add and Replace already handle.
- OpenRefine's expression language as the first way in.
- Automatic merging without review.

graphty needs instead:

- Cleanup offers appear in the load report only when found ("1 id has padded spaces", "3 ids
  differ only by case. Review"), each one undo step.
- Duplicate review lists groups the element found, approved per group, with a rule per attribute.

First screen: nothing, unless the file has the problem. A few clicks away: duplicate review, blank
fill, self-loop removal. Expert: similar-name groups (IBM, I.B.M.).

## 6. Column types and roles

Copy:

- Airtable's field header menu: Edit field, a type dropdown, and a warning that names how many
  cells will not convert before it applies.
- Power BI's column quality line (valid, error, empty percent) and Tableau's type icon on the
  column.
- Kumu's lesson: "Size by" offers nothing until a field is a number. The type gates later work, so
  it must be visible early.
- Figma's variable types (color, number, string, boolean) shown as an icon before every name, the
  same everywhere the variable appears.

Avoid:

- A separate schema editor screen. The type is changed on the column, where it is seen.
- Silent conversion. One "N/A" must not turn a number column into text; the reader sees "1 blank".

graphty needs instead:

- The same type icon on a column in the load grid, the table header, the condition card's field
  list and the style field's binding list. One glyph per type, learned once.
- Changing a type or a role after load is one undo step and one recorded step, and says first
  what will not convert. Everything that reads the column follows a rename.
- The weight's meaning (distance, similarity, capacity, unknown) is shown on the weight line and
  never blocks loading.

First screen: type icons and not-fitting counts at load and in the table header. A few clicks
away: change type, change role after load, rename, delete, fill blanks, time spans.

## 7. The steps list and recipes

Copy:

- Power Query's Applied Steps: an ordered list, each step named in plain words, a settings gear to
  edit it, an x to delete it; Refresh replays every step on new data.
- OpenRefine's Undo/Redo history: click a step to go back to it; Extract saves the steps as a file;
  Apply runs them on another project.
- Figma's version history: named moments, a list you can read without opening anything.

Avoid:

- Power Query's step names that are internal function names ("Changed Type1").
- Recipes that bind by column position. Bind by role, then by name.
- A step list on the first screen. Tableau Desktop has none and readers do not miss it at first.

graphty needs instead:

- The step list is the undo history with words: "Loaded sept.csv (900 nodes)", "Joined genes.tsv
  by symbol (318 matched)", "Hid score under 0.7 (760 hidden)". Undo per step.
- "Save as recipe" names columns by role or name, never node ids. Applying a recipe lists every
  column it cannot bind before anything runs ("padj not found"), and one undo reverses it.
- A file whose headers match an earlier mapping maps itself, with one line: "Used your mapping
  from sept.csv. Change".
- The methods paragraph is the step list read as text, for a paper.

First screen: the matched-mapping line when it applies. A few clicks away: the step list, Save as
recipe, Apply a recipe (opening a recipe file goes straight to Apply). Expert: writing recipes.

## 8. Export

Copy:

- Gephi and Cytoscape: export node and edge tables with every computed column.
- Figma's export panel: scope first (this selection, this frame), then format, then one button;
  the scope is read from what is selected.
- Tableau's "Export data" from the current view: what you see is what you get.

Avoid:

- An export that drops columns without saying so. Any loss the format causes is stated before
  writing.
- A long options dialog. Scope and format, then Export.

graphty needs instead:

- Export reads its scope from the condition card: everything, what is shown ("140 of 900"), a
  saved set, or the selection. Default is everything; the scope line appears only when a filter
  or selection exists.
- Columns to leave out, one click away.

First screen: Export in the main menu, always. A few clicks away: scope, leave out columns.

## Across every flow

- Count before commit. Every tool that wins trust shows the number before the button: Power
  Query's match line, Airtable's conversion warning, Gephi's import report. graphty-element
  supplies the numbers; the app only words them.
- Undo instead of confirm. Figma's model: act, show a short receipt, Undo in place. Confirm only for
  irreversible loss.
- One pattern per job. The condition card is the only "which elements" control; the type icon is
  the only type control; the step list is the only history.
- Figma where it solved the problem (drop anywhere, scope-from-selection export, type icons,
  select matching, receipts with Undo). graphty's own model where Figma has nothing: sources,
  named graphs, joins, server expansion, recipes.
