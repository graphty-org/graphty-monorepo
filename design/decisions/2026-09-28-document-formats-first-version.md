# The first version of the graphty document formats: style and recipe, in JSON

Date: 2026-09-28
Decided by: the owner
Changes: `design/documents/` (pull request #573), which specified five document kinds and an
envelope and listed 35 open decisions. This record settles the ones a first version needs and
narrows that first version.

## Scope of the first version

Version 1 specifies the **style** document and the **recipe** document, and the JSON container
that carries them. Data plans, view presets, annotations, several graphs per file and the other
deferred kinds are later versions; their drafts stay in `design/documents/` marked as drafts.

## The decisions

1. **A recipe is a replayed journal of analysis commands.** It records the commands that make up
   a repeatable analysis -- algorithm runs and the other commands specific to analysis workflows --
   and replays them. It does not record one-off actions tied to one dataset (selecting particular
   nodes, dragging positions, moving the camera). It works with data of the same format, not the
   same data: its commands refer to columns and attributes, never to particular node or edge ids,
   and replaying it against data that lacks a column it needs is reported, never guessed. Its
   purpose, in the owner's words: it "supports people on the same team or in the same industry
   sharing analysis techniques, or the same person running the same analysis on new data." This
   replaces the specification's declared-slots model (open decision 7). "The same format" means
   the same columns, whatever the file type: a recipe recorded on a GraphML import replays on a
   CSV, a GEXF or any other file whose import has the columns it needs, because every graph-io
   importer produces the same graph-format snapshot with the same named columns.
2. **JSON only.** Every graphty document is one JSON file: versioned, identified by a fixed magic
   value in a JSON field, and extensible, so one file can carry any mix of member kinds -- styles,
   recipes, the data itself, and kinds added later. There is no zip container (open decision 1).
3. **A style layer that cannot be applied fails alone** (open decision 16). The rest of the style
   applies; the failed layer is added disabled, with its reason.
4. **The specification's recommendations are adopted** for open decisions 2 (`kind` strings, and a
   style with no `kind` read as style version 1), 3 (schemas published at
   `https://graphty.app/schema/documents/<kind>/v<major>.json` and exported from graphty-element),
   6 (the style is its own document), 8 (recipe ids and SemVer versions, namespaced run ids,
   repeat application refused by default, a shipped overview recipe), 9 (load-time runs move from
   the data plan into the recipe), 15 (a carried palette is scoped to the session that applied the
   document), 22 (keep the name "recipe"; the how-to documentation pages are renamed), 29 (the
   document's layer `id` is an authored key stored on the element's layer), 31 (the flat
   attribute-path model graphty-element 2.x implements) and 34 (`session.recipes.apply`).

## Why

The review of the full five-document specification did not converge: three rounds left 29
critical or high problems and 35 open decisions. Style and recipe are the two documents the owner
has asked to share ("where is export style, export recipe? load style?"), so they go first, on a
container simple enough to read and diff as text.

## Further decisions, taken after the version 1 review

5. **Filters are in version 1.** A recipe records a filter over columns (for example "drop edges
   whose confidence is below 0.4") as well as algorithm runs and layouts. This keeps the scope of
   decision 1, which the version 1 draft had narrowed to two commands.
6. **A recipe's weight option names a column.** Each run builds its weights from the column the
   recipe names, so one recipe can weight different runs by different columns.
7. **The recipe names its own endpoint and id columns,** the way it names weights. Where the data
   comes from a table (CSV, a Neo4j export), the recipe states which columns hold an edge's two
   endpoints and a node's id, so recipes do not depend on every importer agreeing on header names.
   Formats that mark endpoints structurally (GraphML, GEXF, GML, DOT, Pajek) need no such mapping.
8. **The file extension is `.graphty.json`, and the media type `application/vnd.graphty+json` is
   reserved for future use.** Nothing uses the media type today: graphty-element returns a
   document as text and never labels a file, and graphty identifies a document by the magic field
   inside it, never by its name or label. The name is reserved so that, if a need appears (an
   operating system associating files with a graphty app, or a server distinguishing graphty
   documents from other JSON), every tool uses the same one.
9. **Documents get their own specific error codes** (`E_UNSUPPORTED_VERSION`,
   `E_UNKNOWN_COMMAND`, `E_REPEAT_APPLICATION` and the others the specification lists).
10. **Exported result columns are named `<run>.<field>`** (for example `groups.group`), and a name
    collision is refused unless the caller supplies names. The extension-point specification uses
    the same form.
