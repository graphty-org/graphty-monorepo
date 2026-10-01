# The owner's decisions after version 3: what the studio decided

On 2026-10-01 the owner reviewed refined structure B, version 3, and decided four things
(recorded verbatim in `../../owner-feedback.md`): notes become part of graphty-element's API; a
note's author name comes only from Settings and will usually be empty, its time and target are
required and everything else is optional; and three places where version 3 had not yet followed
the owner's earlier decisions must be fixed -- the "+" next to Label starts empty, several data
sources load and join on any key column, and weight is chosen when the data is loaded. The owner
asked for the skeleton when it is ready and for the user studies to start without waiting for a
review.

This page gives the studio's decisions on each, with reasons. The full specification is
`structure-b-refined.md`, now version 4. The notes API a third party would use is
`element-notes-api.md`. Every graphty-element capability the design waits on is in
`element-requirements-4.md`.

How to read the labels:

- **Owner** -- recorded in `owner-feedback.md`. Not reopened.
- **Studio** -- decided by the design studio, reversible with an edit, with its reason.

---

## What "ready" means for this round

The skeleton goes to the owner and to the study only when all of these hold:

1. **Notes in graphty-element** have a written API a third party can use without this repository
   (`element-notes-api.md`), and the note screens version 3 drew as "needs graphty-element" are
   enabled.
2. **No author name is the normal case**: every note screen reads well with no name, and nothing
   asks for one on the way to writing a note.
3. **Labels**: the "+" next to Label adds an empty line that shows nothing until a field is
   picked, and several labels per node are designed, with what the element must add.
4. **Several data sources joined on any key column**: a full Data page where the door-entries
   example works end to end, and a second domain shows the design is general.
5. **Weight** is chosen when data is loaded, shown on the Data page and in the attribute's
   inspector, and used by every run unless the run overrides it.
6. **Every element capability** the design needs is listed, and nothing is done in the app that
   graphty-element should do.
7. **The skeleton** has every route reachable, no dead controls, no console errors, a tooltip on
   every icon-only control, one pattern per job intact, and no blocking problem from the six
   reviewers.

Items 1 to 6 are met by the documents above. Item 7 is checked on the rebuilt skeleton.

---

## 1. Notes are part of graphty-element's API (owner)

**Studio decisions:**

- **The element owns every part of a note** -- storing it, issuing its id, stamping its time and
  author, keeping it with the project, undo, and the `note:changed` event. The app only draws what
  the element publishes. Reason: the project rule that graphty-element owns all graph
  functionality; a third party gets notes by installing the element and nothing else.
- **The API copies the kept sets' shape** (`session.notes.add`, `update`, `remove`, `get`,
  `list`, and a `note:changed` event shaped like `set:changed`). Reason: a consumer who knows sets
  learns nothing new.
- **Targets use the names the element already has** for nodes, edges, sets, runs, style layers
  and the graph, plus filter steps. A group is a run's group (or a set once kept); a path is a
  path set. Reason: a second vocabulary for the same objects would be a second way to name them.
- **A target that disappears keeps its note.** After a reload, the chip is struck through ("Not
  in the current data") and the Data page's match report counts such notes. Reason: deleting
  someone's writing without telling them is data loss.
- **Targets are stored so they survive a reload**: a node by its type and key, an edge by its two
  ends and its row's id. Reason: session ids change when data is loaded again.
- **Styles can read notes** through `notes.count`, `notes.latest` and `notes.latestTime`, so a
  label, a size or a color can use them, and a change to a note repaints.
- **The Notes row becomes ordinary style layers** that select noted elements, added when the
  reader gives the row its first look (graphty-element refuses a layer that writes nothing, so a
  look-less row holds no layer; the Everything row works the same way).
  The reserved notes layer version 3 asked for is withdrawn. Reason: one mechanism serves the app
  and every other consumer, and it follows the owner's rule that styling is left to the user.
- **The skeleton enables every note control**, including a note on a filter step: stable step
  ids are part of the notes proposal, so a filter step waits on the same element release as every
  other note target. One keeps the "needs graphty-element" mark: a note on an edge picked on the
  canvas, because picking edges is a separate capability the element lacks.
- **A cite names a result, not only a run.** A rerun keeps the run's id, so the element stamps each
  cite (and each note about one of a run's groups) with the result it was written against and
  marks it replaced after a rerun. Reason: otherwise "cites an earlier run" could never show, and a
  note about Community 3 would silently move to whatever group is numbered 3 after a rerun.
- **The app's "open notes" badge is deleted.** Notes have no open or resolved status.

## 2. Note metadata, and no name as the normal case (owner)

**The record.** Required (owner): the time and one or more targets. Required by the studio: the
text. Optional: the author, an edited time, and the runs the note cites.

- **Text is required.** Reason: the owner's "mostly options" is about metadata; the text is the
  note. A note with no text only marks something, and marking is a set's job. Making it optional
  later is a compatible change; the reverse is not.
- **Targets are a list.** Reason: "these two are the same person" is a normal note.
- **`edited` is kept.** Reason: a reader must be able to tell that a note changed after others
  read it.
- **`cites` is kept.** Reason: "highest betweenness, 0.57" is true of one run; when that run is
  replaced the note must say so. Citing a run is not the same as being about it: the note above
  must not count on the Betweenness row.
- **Rejected:** tags (sets and search cover them), status and replies (no accounts, no
  multiplayer), canvas pins (they drift with every layout), colors (a look is a style layer), and
  frozen quoted values (no screen needs them yet).

**The author name.**

- **It is the project's author setting in the element** (`author`, one property for notes and
  recipes): set once, stamped on each note added afterwards, saved with the project and one
  undoable step to change. The owner's words decide where it is kept: "the project's author
  setting" (2026-09-28) and "enters it in settings and we store it" (2026-10-01). An earlier draft
  of this page made it a per-person viewer setting; that contradicted those words and is withdrawn.
  Studio reason for stamping rather than an argument on every add: every consumer would have to
  remember to pass it. Risk, not a decision: the name travels with the file, so the next person
  writes under it until they change it (structure-b-refined.md 12.3).
- Settings > General > Your name is the only place it is entered, labeled "Your name (saved with
  this project)", with the help text "Optional. Shown on notes only when a project has notes from
  more than one person."
- **With no name, the meta line is the time alone** ("2 h ago", the full date in its tooltip).
  No "Anonymous", no "You", no avatar, no empty slot. The name shows only when the project holds
  notes from two or more named people (owner), counted by the element.
- **Nothing asks for a name** on the way to a note: no prompt on the first note, no banner. The
  editor is the target chips, the text, and Save.
- **The fixtures show the normal case**: five of the seven sample notes have no author.

## 3. Labels: "+" starts empty, and several labels per node (owner)

- **"+" adds an empty line and opens the field list at once.** Esc leaves the line empty; it reads
  "Pick a field" and draws nothing. Reason: an empty label has no use until a field is picked, so
  opening the list saves a click; pressing "+" asks for exactly that list.
- **An empty line is a draft, not a write.** It writes nothing until a field is picked. Reason:
  writing empty text would hide a label painted by a row beneath, which the reader never asked
  for.
- **Several labels: one line per position.** The line's name is its position (Above, Below,
  Right...), and the value is its field. A new line takes the first free position in the order
  Above, Below, Right, Left, the corners, Center, so names above and sizes below take two "+"
  presses and no placement step. Reason: the position is what tells two labels on a node apart.
- **Position is keyed, not numbered.** Two rows writing Above and Below both show; two rows writing
  Above follow paint order, like every other property. Reason: numbered slots or one list would
  let a higher row erase every label under it.
- **Position has one home**, the Label popover's grid, moved to the top; positions already used
  are disabled with the reason in the tooltip. One label per position per row; no reordering.
- **Notes in labels are enabled**: Note count and Latest note in the field list.
- **Edges keep one middle label** for now. Reason: they already have head and tail captions, and
  the owner asked about nodes.
- **What graphty-element must add**: labels keyed by position, with today's single label kept as
  the Automatic position so nothing breaks; plain names for the positions; several label meshes
  per node, measured at 10,000 nodes; hiding a node's labels together; empty text drawing nothing;
  and number formatting on text bindings, whose priority rises because sizes below the name is
  the owner's own example.
- **An accessibility fix outside graphty-element**: the shared secondary text color is 3.9:1 on
  white, under the 4.5:1 that "Pick a field" needs as a line's only content. The fix goes in the
  shared kit token, not in this one line.

## 4. Several data sources, joined on any key column (owner: a primary task)

- **The Data page replaces the load dialog for every load**, one table or many. Reason: a dialog
  for one file and a page for several would give one job two homes. A clean single file still
  loads with one Enter.
- **It takes the workspace**, with the rail and header in place, like Version history. Tables on
  the left; a read-only model strip on top ("person (412) --entries (4,212)--> building (9)");
  the sample grid with a role under each column header; the match report at the bottom, always
  visible; Direction, what the weight means, and Load in the footer.
- **Two kinds of table**: each row is a node, or each row is an edge. Reason: "columns by key" is
  just a node table whose type already exists, so a third kind would be a second way to do one
  job. Add columns by key... stops being a command of its own.
- **Keys and links on any column, any name.** A node table chooses its Key; an edge table's From
  and To each name the type they point at and, when it is not that type's Key, the unique column
  they match ("person by badge"). Reason: the owner's example joins on person_id and building_id,
  not on node ids, and two tables may refer to the same people by different columns.
- **Rows can become nodes.** "Each row is: a node" makes each door entry a node linked to its
  person and its building ("Links to" on any number of columns). "An edge" is offered only when
  exactly two columns link to a type.
- **The word is "type", not "kind"**: each node table has a type (by default its name). Reason:
  the conceptual model already calls it node type, and the transfers data has a real `kind`
  column that a built-in "kind" would collide with. A column that sorts a table's nodes into
  kinds takes the **Category** role, not a second "Type": the table's Type is the node's identity,
  and one word must not mean both (`structure-b-refined.md` 11.3).
- **Repeated links: "One edge per: Row | Pair."** Row loses nothing and is the default. Pair
  makes one edge per pair of ends (both directions count as one pair in an undirected graph),
  adds a count column, and lets each column combine: numbers by sum, mean, min or max; times as
  earliest and latest; never first or last for a time, because a log is rarely sorted. This
  replaces version 3's Repeated pairs field.
- **The match report comes from the element** and the app only renders it: rows with both ends,
  unmatched values per column with Add or Leave out (Leave out by default), repeated keys,
  numbers matched as text, keys that differ only by leading zeros (reported, never merged), rows
  merged into pair edges, and notes whose targets went missing.
- **Graph files are tables too.** A GEXF or GraphML file is one row that expands to its node and
  edge tables, with roles set by the file and shown locked.
- **The source inspector is deleted.** Every fact it showed lives on the Data page; a Sources row
  opens the page at that table. Remove on a Sources row waits on the element recording which
  table each record came from.
- **Roles move to the Data page.** An attribute's inspector keeps Read as (Category, Number,
  Time) and shows its roles as read-only tags that link to the page.
- **Version 3's Tableau finding is withdrawn.** It said a graph file leaves nothing to model. The
  owner was right: the reader must say which field holds the ids, and several tables need keys.
  The studio now copies Tableau's Data Source page and its column roles, keeps unmatched values
  visible, and still skips join types, the drawn canvas, blending (owner: out of scope) and live
  sources (owner: issue #643).
- **Door entries end to end in the skeleton**: three tables, roles in the headers, one edge per
  pair with earliest and latest times and count as the weight, the match report, and the same
  entries switched to "each row is a node".
- **Second domain: the March transfers**, already a fixture: accounts and transfers, a link whose
  two ends are the same type, with amount as the weight. Reason: it costs no new fixture and has
  no people or buildings in it; nothing on the page names money. Co-authorship (papers citing
  papers) was checked in text and needed no new control.

## 5. Weight is chosen when the data is loaded (owner)

- **Weight is a role under a column header on the Data page**: an edge table's weight (a column,
  or count under Pair, or none, which reads 1) and a node table's weight. Each edge table names its
  own.
- **What the weight means is set once per graph**, in the page footer beside Direction: "Higher
  weight means: Stronger | Farther | Capacity". Reason: graphty-element stores one weight column,
  so a meaning per table could disagree with itself. The match report warns when two tables'
  weights look like different meanings.
- **Every run uses the loaded weight by default.** Analyze's Weight line reads "Loaded weight:
  count, stronger", in the Data page's own words. A run may override the column or the meaning; the override is that run's
  own setting, recorded in its Made with, and never writes back. An algorithm that reads the
  weight the other way converts it and says so ("Dijkstra used 1/count"). Reason: a count read as
  a distance would make the most-used building the farthest, with no warning.
- **Shown where asked**: under the column header on the Data page, and as a read-only tag in the
  attribute's inspector ("Weight, set when loaded -- every run uses it unless the run picks
  another"), linking to the page.
- **Node weight is chosen, shown and saved, but nothing in graphty-element reads it yet.** The
  inspector says "No measure reads node weight yet", and Analyze shows a node-weight line only for
  entries the element marks as reading it.
- **What graphty-element must add**: a weight per edge table and per node type; the meaning stored
  with the data; a weight option on the built-in algorithms (plugins already have one) that
  defaults to the loaded weight and records what was used.
- **Version 3's "the weight is not a role" is removed.**

---

## Round 7 checks this adds

Worded so the tasks never reuse the words the screens use:

- "Each entry should connect the person to the building." (From and To under the headers?)
- "How many entries pointed at nobody?" (the match report?)
- "Show how often each person used each building." (One edge per Pair with count?)
- "Make each door entry something you can click." (Each row is a node?)
- "Find the shortest chain of shared buildings between Ann and Bo." (Do testers notice how the
  loaded weight was read?)
- "Show each character's name over it and how many notes they have under it." (Two "+" presses,
  no placement step, no name prompt?)
- "Write down why you flagged this account." (Does anyone look for a name field? Is a note with
  no name read as complete?)

---

## Still open

Nothing here needs the owner before the study. Two things are recorded so they are not missed:

- **Names that become permanent when graphty-element ships them**: the note record's fields
  (`time`, `targets`, `text`, `author`, `edited`, `cites`), `author` (the property), the `notes.*` and
  `table.*` paths, the label position channels, the word `type`, and the shape of the load
  description. Each becomes public API in the element release that adds it; until then each is
  reversible with an edit. The studio recommends the owner confirm them on the graphty-element
  pull request that adds them.
- **Type-qualified node identity in kept sets** (`{ type, key }` instead of a bare node id) is a
  breaking change to the sets API that graphty-element publishes today; the additive alternative
  keeps bare ids wherever only one node type holds a key (`element-requirements-4.md` section 3).
  Decide on the graphty-element pull request, not before the study.
- **To confirm with graphty-element**: that changing Name or Time after load re-derives what
  depends on it; that several label meshes per node stay fast at 10,000 nodes.
