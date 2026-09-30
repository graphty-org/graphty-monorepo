# Files and recipes

**Job.** Say which files graphty reads and writes, what each one carries, how styles, recipes and
data combine or travel apart, what the overview recipe does when a graph loads, and what an output
holds. It answers two of the owner's questions: which things can be imported and exported, alone or
together, and whether characterizing a graph should be a replaceable recipe.

**Not here.** The objects these files hold (`conceptual-model.md`); the file's published shape,
envelope and version rules (`element-contract.md` 11 and 11.1, and the doors of `one-way-doors.md`,
"Save, notes and recipes"); where the commands live and what they are called (`output-homes.md` 3);
the steps of opening and exporting (`task-flows.md`). **Owner:** information architect, with the
graphty-element API steward. **Ceiling:** the README's table. **Validated by:** the model
teach-back (`research/study-schedule.md`, "Model teach-back"), whose recipe task reads this
document.

Every file here is written and read by **graphty-element**; the **graphty app** only offers the
commands (`CLAUDE.md`, "Architectural Principles").

## 1. Which things can be imported and exported, alone or together?

One file format with optional parts; a kind of file is a choice of parts (door 1, The file's
container and media type; door 19, The recipe profile and how it binds). Each profile answers one of
the owner's cases:

| Profile | Parts | Without the data? |
|---|---|---|
| **Project** | everything | carries it |
| **Recipe** | rule sets, data steps, run specifications, style layers, the Look, layout settings, saved views without positions or camera, notes on definitions, overview readings, declared properties as requirements; optionally a data-source query, mapping and joins | yes, through slots |
| **Style file** | a recipe holding only style layers, palette references and the Look (`conceptual-model.md` 1.1's table), bound by attribute name and measurement level | yes |
| **Data file** | graphs, attributes, data versions; written by graph-io in an interchange format | is the data |

**Styles, recipes and data combine.** A project is all three; a recipe is analysis plus style; a
style file is style alone. So the owner's "load style" and "load recipe" are two commands over one
format, and a community shares a starting point by sharing a recipe or a style file, never its data.

**Notes travel with what they are about.** A note on a definition ("this threshold follows the
lab's convention") travels in a recipe. A note on elements is keyed by element ids, which mean
something only on that data, so it travels in a project. **A notes-only file is not offered**:
annotations shared between two analysts holding the same data travel as a project file, and a notes
profile keyed by element id would be a second, weaker project format. Adding one later is additive
to the one format, so it is not a one-way door.

**A recipe** drops what only its data can mean: fixed sets, notes on elements, positions, pins,
Overrides, the camera, and every binding's data-bound state (a pinned domain, a category map with
no declared vocabulary). **Applying** binds its **slots** (attribute, catalog entry, set, argument,
requirement, source, join) to the recipient's data, always confirms a weight slot, keeps anything
unbound off and listed, and never contacts a source before the analyst confirms the host (door 34,
A shareable URL). What travels, how application namespaces ids, and how **Export recipe...**
extracts a recipe from a project are `element-contract.md` 11.1.

## 2. Should characterizing a graph be a replaceable recipe?

Yes. This section is the one statement of the rule; every other document points here.

**The overview recipe** is what task 1 reads at Load. graphty-element ships **General overview**,
and registers **Flow overview** and **Community overview** as examples, because domains differ:
some care about groups, others about flows. They are listed wherever a recipe is chosen
(`information-architecture.md` 3, "Recipes available").

**Which overview is in force.** A project may name its own overview, embedded in the file with its
id, version and source, and it wins (`decided-doors.md`, "The overview recipe's three levels"). A project that names
none opens under the reader's **default overview**, a reader preference the consumer sets on the
element (the graphty app sets it from Preferences) through an option whose name is door 33,
Choosing the overview recipe. That covers every such project, new or already
saved, and writes nothing to the project, so two readers with different defaults still open the
same file. The commands are **Use as default overview** and **Reset to default**
(`output-homes.md` 3.1).

**What runs at Load.** An overview uses only a recipe's overview-readings part: the rows Statistics
shows. At Load the element fills only the rows it maintains at O(n+m) cost: counts, density,
direction, components, isolates, self-loops, parallel edges, the degree family and, on a directed
graph, reciprocity. Every other row appears **Not computed** with its cost band word, and runs when
the analyst asks: one row by its own click, exactly as a Catalog click would, or every row at once
by **Compute the overview**, which states the combined cost band before the click and runs under the
cost gate (`element-needs.md`, "Compute an overview in one call"). Choosing a default overview is
not a standing request to compute: a preference that started work at every open would spend the
reader's time on graphs they only glanced at.

**An overview never paints.** A color or a size means only what the analyst or an applied recipe
chose (`principles.md` 1). An overview that painted at Load would make a reader preference decide
what a project looks like, so two readers of one file would see two pictures. When the overview's
recipe carries style layers, its row offers **Apply recipe** in one click, and color arrives then.
**General declares no style layers**: the first drawing is the element's neutral grays.

**The floor.** Every overview keeps the readings that expose a broken import: counts, direction,
the weight role, negative weights read against the role, dropped rows, components and isolates,
self-loops and parallel edges and, on a directed graph, reciprocity, whose value near 1 says the
data is probably undirected.

**On screen** the row reads by what it shows, "Overview: General", and the word recipe appears only
behind Replace, so tasks 1 to 4 need no new concept (`conceptual-model.md`, "The concept budget").

## 3. Outputs

**Outputs change nothing** and carry a **methods text** written from their records. Each takes a
scope (full graph, filtered graph, a set or a path), and a set exports by the edges it includes:

- a **figure**: a view with a legend derived from the enabled layers and marks;
- a **table**;
- an **interchange graph**, through graph-io;
- a **findings report**: the saved views in page order, each with its caption and the notes it
  shows, then every other note with its quotes and citations, then the methods text of every run a
  page or a note cites. There is one report; the methods text is a part of it, never a profile of
  its own. Scoped to the current filter step, with that step's members, the report is the
  investigator's **evidence file**.

**The project is live; an export freezes what it wrote.** Re-running changes the project's results,
never a file already written, so the evidence for an investigation is its export.

## Sources

- `conceptual-model.md` (this document was its section 8 until the model needed room for its object
  map); `element-contract.md` 11.1
- The sets design (`design/sets/sets-design.md` at origin/master 9fc948ee) 8, 11
- Figma's library and local styles, as the precedent for sharing style without content
- Open decisions cited (`one-way-doors.md`): 1, The file's container and media type; 19, The recipe
  profile and how it binds; 33, Choosing the overview recipe; 34, A shareable URL
