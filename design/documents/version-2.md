# graphty document formats, version 2: modular save files

Status: design, not implemented. It changes how the version 1 documents in this directory are
grouped and travel. The section pages (style.md, recipe.md, notes.md, assets.md, sources.md and
container.md's data member) still specify what each part holds, with the changes this page lists;
this page says how the parts are cut, saved, loaded, versioned and kept readable. Where this page
and a version 1 page disagree, this page wins. The data section's model -- source records, types,
ids, the reader source, the build and how saved sections name nodes and edges -- is specified in
design/data/data-store-options.md (sections 4 and 5); this page summarizes it and points there.

## Why version 2

A person saves different things for different reasons, and wants to mix and match them:

1. a style applied to new data, or a personal default style applied to anything opened;
2. a series of algorithms (an analysis) applied to new data;
3. all the data loaded -- from files, online sources, several sources joined -- so the view stays
   the same;
4. the results of algorithms, as a scientific record;
5. only the notes, for a journal; or the data without the notes, to share without exposing them;
6. common starting points for a repeatable process (fraud analysis, say): styles, an analysis,
   settings, so work starts faster and new team members learn faster.

Version 1 as built writes one file with nine members (data, session, arrangement, results, style,
notes, view-state, assets, sources). Its members are cut along implementation lines: the session
member alone holds settings, layout, filters, sets, views, column declarations and more, so none of
the needs above maps to a member a person can save or load on its own.

## Owner decisions (2026-11-14)

- **Both one file and specific files.** One file type, `.graphty.json`, where the reader chooses
  which sections to save into it and which to load from it; and specific file types (for example
  `.graphty-recipe.json`) whose names say what is saved and loaded. "the more specific file types
  would be the exact same as their corresponding sections in the global file type."
- **A recipe is the replayable list of analysis steps** (recipe.md). Today's `session.recipe()`
  snapshot is a defect, not a design.
- **Changes to built-ins are handled by versions.** If a later release changes or removes a named
  built-in (a palette, say), "that should be managed by file versioning and file version
  migration": the release bumps the version and its migration rewrites older files so they keep
  their meaning.
- **Results are optional both ways.** "make it optional to save results to a file; and make it
  optional to re-run when loading a file." This amends the 2026-11-13 rule "do not save the
  results of behaviors, run the behaviors again", which stays the default.
- **Code-backed built-ins are named and defined in this specification**: node shapes, arrowheads,
  line patterns, transitions and the like.
- Which part wins when parts conflict needs no rule of its own: a loaded style adds ordinary layers
  to the layer stack, whose order is already explicit and editable.
- Private or local labels on sections are not a file-format concern; choosing which sections to
  save covers sharing without notes.

## Two file forms, one section shape

- **A section file** is one section, alone: `<name>.graphty-<section>.json`, for example
  `fraud-look.graphty-style.json`. The JSON object is the section itself.
- **A full file** is `<name>.graphty.json`: a thin wrapper whose `sections` object holds any
  subset of sections, keyed by section name: `data`, `style`, `recipe`, `settings`, `results`,
  `notes`, `view`. There is at most one section of each kind.

A section is the same JSON in both forms, byte for byte. Cutting a section out of a full file
gives a valid section file; putting a section file into a full file gives a valid full file. A
section keeps its own `kind` inside a full file, and a reader refuses a value whose `kind`
disagrees with its key. A reader decides what a file is from its `kind`, never from its name
(container.md, "File name and media type").

One section of each kind is enough because a loaded style adds its layers to the one layer stack:
a project's look is one style section, and a kit that offers alternative looks (screen and print)
ships them as separate style files.

**`sections` is open.** A reader skips a key it does not know with `W_UNKNOWN_KIND`, keeps it
verbatim on re-save, and still loads every section it knows. The schema allows additional keys
whose value has a `kind` and an integer `version`. This is how graphty adds its own later sections
(several graphs, version history) without locking out older releases. A third party's section goes
under the wrapper's `extensions`, keyed by its reverse-domain kind.

Media types: `application/vnd.graphty+json` for the full file, and
`application/vnd.graphty.<section>+json` for a section file. File extensions and media types are
published contracts: once shipped, they are never renamed.

## The sections

Two groups, by how a section refers to data.

**Reusable on any data.** These refer to columns, types, sets, results and sources by name and
never to particular nodes or edges, so they apply to data they have never seen through the column
mapping step (README.md, "Applying to new data"). A writer MUST leave out, and report, anything in
them that names an element.

| Section  | File                     | Holds                                                                                                                          | Taken from version 1                                                                                              |
| -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| style    | `.graphty-style.json`    | style layers, palettes, shaders as source text, the style tree, value labels, and the models and images the layers draw        | `graphty-style`, `graphty-assets`, the session's value labels                                                     |
| recipe   | `.graphty-recipe.json`   | the ordered commands: combine steps, filters, algorithm runs, sets defined by a rule, layout (engine, options, 2D or 3D, seed) | the session's layout, visibility filters and rule sets; the commands of `graphty-results`; specified by recipe.md |
| settings | `.graphty-settings.json` | project settings that belong to no other section, including timeline playback                                                  | the session's config and playback                                                                                 |

**Bound to one dataset.** These name particular nodes and edges, and say which data they belong to.

| Section | File                    | Holds                                                                                                                                                                                                                        | Taken from version 1                                                                                                 |
| ------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| data    | `.graphty-data.json`    | the source records (each with its copy embedded, or a reference with its content hash), the reader source, the type registry, data issues, the join history, the re-key log, and the merged graph as NetworkX node-link JSON | `graphty-data`, `graphty-sources`, the session's columns, declarations and issues, file styles, annotations          |
| results | `.graphty-results.json` | the record: each run's outputs, the seed it actually used, engine versions, duration, caveats, and what the data was when it ran                                                                                             | the outputs of `graphty-results`                                                                                     |
| notes   | `.graphty-notes.json`   | notes (notes.md, version 2)                                                                                                                                                                                                  | `graphty-notes`                                                                                                      |
| view    | `.graphty-view.json`    | camera, saved views, selection, hand-placed positions and pins, picked and path sets, rule sets that name elements, the live filter and time window, layers and runs that name elements, view settings, hidden table columns | `graphty-arrangement`, `graphty-view-state`, the session's views, sets, visibility and the runs a recipe cannot hold |

### The cases above, as sections

| Need                                  | Sections                                                             |
| ------------------------------------- | -------------------------------------------------------------------- |
| a style for new data; a default style | style (a default style is a style file applied to everything opened) |
| an analysis for new data              | recipe                                                               |
| all the data, consistent              | data, with each source embedded or referenced, as the reader chooses |
| a scientific record                   | data, recipe, view and results                                       |
| a journal                             | notes, with or without view                                          |
| sharing without notes                 | every section except notes                                           |
| a starting kit                        | style, recipe and settings, no data                                  |

### Placement rules

Each thing a project holds goes in exactly one section. The rules that are easy to get wrong:

- **Sets.** Every set carries a stable `id` (graphty-element's `set_...` form) beside its display
  `name`; notes, style `member` selectors, recipe scopes and rules name a set by that id. A `rule`
  set goes in recipe, as a `set.define` command, only when its rule names no element. A rule with
  an element-naming leaf (a `neighborhood` seed, a `member` of a picked or path set, listed nodes,
  an `item` pinned to one run) goes in view, those leaves written as element references, and the
  recipe writer reports it. `fixed` sets go in view, members as element references, keeping their
  edge reading (`induced` or `listed`). `path` sets (an ordered walk, optional edges, `directed`)
  go in view.
- **Positions.** Positions a layout computed are not saved: the layout reruns (or its output is in
  results, when results are saved). Hand-placed and pinned positions are saved in view.
- **2D or 3D** is what is computed, so it is `dimension` on the recipe's `layout.set`.
- **Filters and time.** The recipe keeps only filters that can be recorded as `graph.filter`
  commands. The live filter the reader is looking at, the time window, `showContext`, the select
  conditions and the nodes hidden from the drawing go in view's `visibility`. Timeline playback
  settings (mode, step, missing, outside, time zone, age fade, results policy) name columns but no
  elements, so they go in settings.
- **Layers that pick elements.** A style layer whose selector names elements -- an `ids` selector,
  a `member` selector naming a picked or path set, or a layer whose run `source` has `params`
  naming a node -- goes in view's `layers`. Saving the style section alone leaves such layers out
  and reports them.
- **Runs a recipe cannot hold** (recipe.md, "Writing a recipe from a session", rules 2 and 3) keep
  their replayable record in view's `runs`: a run with an option naming a node, a run over the
  selection, listed nodes or a picked set, and a run over the visible graph while a time window,
  hidden nodes or a filter with no exact `graph.filter` equivalent narrowed it.
- **Settings.** Every key graphty-element's `config.set` accepts (its `CONFIG_KEYS`) is saved in a
  named section, or listed as deliberately not saved with its reason; a conformance test fails
  when a key has neither. `viewRotation` and `framing` go in view (they say how this drawing is
  shown, and loads set them: Graphviz `rotate`, a file's fit). `layoutTransition` and
  `runPlacement` go in settings. Not saved: `author` (the person writing, stamped on each note,
  not the project's); `startingRows` and `editableBase` (they act when a project is created, and
  the rows they write are saved as plain style rows); `name` (the wrapper's `name`).
- **Column settings.** Renames and type conversions belong to each source's `mapping`, so a
  refresh applies them again. Hidden columns are a table-view choice and go in view.
- **File styles.** The per-element colors, sizes and positions a GEXF `viz:` or Cytoscape.js file
  gave each element are columns of their source in the data section
  (`graphty.style.<namespace>.<kind>.<key>`), embedded or referenced with it. The file-style
  layers stay in style, read those columns by name, and name the source id as their origin.
- **Assets.** A section that needs an asset carries it, so every section file stands alone. Within
  a full file the same asset may appear in two sections; that duplication is the price of the
  byte-for-byte rule.

## Section header

Every section begins with the same fields, in both file forms.

```json
{
    "$schema": "https://graphty.app/schema/documents/graphty-style/v2.json",
    "kind": "graphty-style",
    "version": 2,
    "id": "org.example-bank.fraud-review-style",
    "revision": "3.1.0",
    "name": "Fraud review style",
    "description": "Highlights near-limit gift card payments and ranks accounts by PageRank.",
    "created": "2026-09-02T16:20:00.000Z",
    "modified": "2026-11-14T18:00:00.000Z",
    "generator": { "name": "graphty-element", "version": "3.40.0" },
    "authors": [{ "name": "Fraud analytics team", "uri": "https://example-bank.test/fraud" }],
    "license": "CC-BY-4.0",
    "keywords": ["fraud", "card testing"],
    "language": "en",
    "dependencies": {
        "columns": [{ "name": "amount", "schema": { "type": "number", "measurement": "quantitative", "unit": "USD" } }],
        "types": ["merchant"],
        "results": ["pagerank"],
        "extensions": [{ "name": "com.example.heatmap-shader", "version": 1 }]
    },
    "origin": { "from": "https://example-bank.test/kits/fraud-team-kit.graphty.json" }
}
```

| Field                 | Required                           | Meaning                                                                                        |
| --------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `$schema`             | no                                 | the URL of this kind and version's JSON Schema (see below); advisory                           |
| `kind`                | yes                                | which section: `graphty-<section>`                                                             |
| `version`             | yes                                | the section's own major version (see Versions)                                                 |
| `id`                  | data only                          | a string naming this section across copies; see "Identity"                                     |
| `revision`            | no                                 | a SemVer 2.0.0 string: which edition of that `id` this is                                      |
| `name`, `description` | no                                 | a human name and a sentence of what it is for, for a style or kit shown in a list (plain text) |
| `created`, `modified` | no                                 | when this section first existed, and when its content last changed                             |
| `generator`           | yes                                | the software that wrote it, for diagnosis; no reader branches on it                            |
| `authors`             | no                                 | a list of `{ "name", "uri" }`                                                                  |
| `license`             | no                                 | an SPDX expression when one applies, else text                                                 |
| `keywords`            | no                                 | a list of strings, so a kit can be found in a list                                             |
| `language`            | no                                 | a BCP 47 tag for the section's human text (names, descriptions, notes)                         |
| `dependencies`        | see below                          | `extensions`: every section; `columns`, `types`, `sources`, `results`: reusable sections       |
| `bindsTo`             | dataset-bound sections except data | which data the section was written on (see "Naming nodes and edges")                           |
| `origin`              | no                                 | `{ "from" }`: the URL or file name a copied-in section was taken from, for display             |
| `extensions`          | no                                 | reverse-domain keys, kept unread on re-save (container.md, "Extensions")                       |

**Times** are written as JavaScript's `toISOString()` writes them: UTC, ending `Z`, as notes
already do. One format with no local offsets keeps sorting trivial.

**`$schema`** is `https://graphty.app/schema/documents/<kind>/v<version>.json`, the scheme version
1's schemas already publish (`https://graphty.app/schema/documents/graphty-notes/v1.json`). The
same path sits under the `spec/` directory of the @graphty/graphty-element npm package, so the
schema is findable when the website is gone. `kind` and `version` decide how a section is read;
`$schema` serves editors, which validate and autocomplete from it, and is never fetched. A writer
derives it from `kind` and `version`; a mismatch is reported, never acted on.

### Identity

- `id` is optional except on the data section, the one id other sections quote (`bindsTo.data`).
  A reverse-domain name (`org.example-lab.card-testing`) or an `https:` URL is recommended for a
  kit others will copy; any unique string otherwise.
- The data section's `id` names the dataset: minted when the project first gets data, kept through
  refresh, replace-same-shape and edits, replaced only when the reader loads data in replace mode.
- A copied section keeps its `id`. "A newer copy of this kit exists" is the same `id` with a higher
  `revision` (by SemVer precedence), or, with no revision, a later `modified`.
- There is one id field and one revision field. Version 1's style `id`/`styleVersion` and recipe
  `id`/`recipeVersion` become the header's `id`/`revision` through the version 1 migration.

### Dependencies

`dependencies` says what a section needs from the data and from software before it can work, so a
reader can say what is missing instead of failing.

- **`columns`** drive the column mapping step. Each entry is `{ "name", "schema" }`, or
  `{ "role", "schema" }` for a column known by the role it plays in a source's mapping (`weight`,
  say). `schema` is a fragment in the same JSON Schema dialect the type registry uses, with its
  `measurement` and `unit` keywords: `{ "type": "number", "measurement": "quantitative", "unit":
"USD" }`, `{ "type": "string", "measurement": "categorical" }`, `{ "type": "string", "format":
"date-time", "measurement": "time" }`. Mapping checks a data column against it with one rule
  set.
- **`types`**: the node and edge type names the section names.
- **`sources`**: the source roles the section names, each `{ "role", "columns", "types" }` with
  the columns and types that role supplies. Every source reference in a reusable section (a
  combine step, the rule tree's `source` leaf in a rule set or style selector, the calculated
  source paths) names a role, because a source id belongs to one data section. The caller maps
  roles to the open data's sources as it maps columns (default: the source whose id equals the
  role); an unmapped role is reported like a missing column, and what needs it is skipped.
- **`results`**: the run names (`as`) whose fields the section reads. A result path such as
  `results.pagerank.value` is listed here, never in `columns`, where the mapping step would look
  for a data column that never exists.
- **`extensions`**: software outside graphty-element the section cannot be read without, each
  `{ "name": "<reverse-domain>", "version": <integer> }`. `version` is the major version of the
  data that extension writes, chosen by the extension, never its npm package version; a reader
  lacking it skips the section (Versions rule 8). An extension the section can do without is
  written only under its `extensions` member and not listed. Any section may list extensions: a
  plugin that adds a network source kind changes what a data section builds, and a map frame
  changes what a view's positions mean.

### The wrapper

```json
{
    "$schema": "https://graphty.app/schema/documents/graphty-document/v2.json",
    "kind": "graphty-document",
    "version": 2,
    "id": "9b2f6d0e-3c41-4f7a-8e55-0a1d2c3b4e5f",
    "name": "Card fraud, week 46",
    "created": "2026-11-10T17:02:00.000Z",
    "modified": "2026-11-14T18:00:00.000Z",
    "generator": { "name": "graphty-element", "version": "3.40.0" },
    "sections": {
        "data": { "kind": "graphty-data", "version": 2, "id": "...", "...": "..." },
        "style": { "kind": "graphty-style", "version": 2, "...": "..." },
        "notes": { "kind": "graphty-notes", "version": 2, "...": "..." }
    }
}
```

The wrapper takes the header's optional fields (`$schema`, `id` naming the project, `name`,
`description`, `created`, `modified`, `authors`, `license`, `keywords`, `language`) plus
`sections` and `extensions`. Its `version` covers only this envelope: all content is versioned per
section, so the wrapper is expected never to bump again.

Version 1's `requires` goes away: any subset of sections is a valid file. A section a reader must
not misapply by ignoring it uses a new section major version, or lists the extension it needs in
`dependencies.extensions`.

## Naming nodes and edges

The full rules are in design/data/data-store-options.md, section 5; in short:

- **By record key, in every form.** A section is byte-identical in a full file or alone, so an
  element reference must mean something without the data section beside it. It names the element
  by its record key and nothing else; internal ids live in memory only and are never saved:

    ```jsonc
    { "space": "account", "key": "acct-1002" }                         // a node
    { "from": { "space": "account", "key": "acct-1002" },              // an edge with its own key
      "to": { "space": "merchant", "key": "merch-77" }, "key": "pay-889" }
    { "from": { ... }, "to": { ... }, "h": "sha256:...", "n": 0 }      // an edge without one
    ```

- `key` is always a JSON string, and `space` is always written. A space is named after its
  declared type (`account`, bare), a shared id system the reader named (`shared:<name>`), or, for
  undeclared ids, the source's id in the data section (`source:<id>`); a type name may not contain
  `:`, so the three never collide. A source id survives refresh and replace, so renaming
  `accounts.csv` or moving a URL from `?week=46` to `?week=47` unbinds nothing. Space names and
  keys are compared as exact strings after Unicode NFC normalization, applied when read.
- `h` is `sha256:` plus the hex SHA-256 of the RFC 8785 canonical JSON of the edge's source
  attribute values as read (never reader edits, so an edit never unbinds a reference), leaving out
  reserved `graphty.` and `_source.` columns. `n` is the position, from 0, among edges with the
  same ends and the same `h`, in build order. On an undirected graph, ends match as an unordered
  pair.
- **Binding.** When `bindsTo.data` equals the open data section's `id`, or the caller agrees to
  bind to other data: a node by (space, key); an edge by its ends and `key`, else by its ends and
  `h`, with `n` breaking a tie; the re-key log keeps old keys binding. A reference that binds
  nowhere is kept, never dropped: re-saved unchanged, bound if a refresh brings the element back,
  and reported as `{ code: "W_REFERENCE_UNBOUND", params: { section, pointer, ref } }`. On the
  next save, a reference bound through the re-key log takes the element's current key.
- **Reusable sections never name elements.** Style, recipe and settings refer to columns,
  calculated values (selected, hovered, pinned), types by name, sets by `set_...` id, results by
  run name (`results.<as>`, which applying a recipe rewrites to the run id) and sources by role.
  Dataset-bound sections name results by run id and sources by source id.

**`bindsTo`.** Notes and view carry `"bindsTo": { "data": "<data section id>" }` only: they bind
by key, and a refresh never makes a note or a pin wrong. Results also need to know whether the
data changed since they were computed, so the results section adds:

- `bindsTo.sources`: each source's content hash, by source id, the reader source included. A
  changed hash names the source that changed ("accounts changed").
- `bindsTo.fingerprint`: `sha256:` plus the hex SHA-256 of the RFC 8785 canonical JSON of
  `{ sources, settings, types, kept, joins }`: every input `build()` reads. `sources` is each
  source's content hash, `settings` each source's `format`, `options`, `mapping` and `settings`, by
  source id; `types` the type registry (names, declaring rules, value maps, schemas); `kept` the
  kept repeated-edge pairs; `joins` the join history. Applied fix codes are left out: the graph
  already holds their result.

| Case     | Test                                  | What happens                                                                                                               |
| -------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Match    | Same data `id`, same fingerprint      | Binds; results restore as saved when rerun is off                                                                          |
| Partial  | Same data `id`, different fingerprint | Binds; the report names the sources whose hash differs, or says settings, types or joins changed; results are marked stale |
| No match | Different data `id`, or no data open  | Reported, loaded only if the caller says so, then bound by key; the report names sources sharing a content hash            |

A `fresh` replace means "the same keys now name other things"; a notes or view section saved
before it binds by key to the new elements, and the binding report names the replace (the
source's `replaced` time is after the section's `modified`), so the caller can decline.

## What each section holds

### data

Specified in design/data/data-store-options.md, sections 4.1 to 4.8. Its members:

- **`sources`**: one record per source, with exactly the fields of data-store-options.md 4.5:
  `id` (unique, never reused in the data section), `label`, `kind` (`file`, `url`, `network`,
  `sample`, `derived`, `reader`), `format` and `options` (the reader that parsed it and its parse
  options only), `origin` (size, media type, the `sha256:` content hash, HTTP validators),
  `mapping` (the node key and edge ends, each with its space -- `space`, `sourceSpace`,
  `targetSpace`, always written as the space resolved at load, so a refresh reuses it and never
  asks again -- plus column renames and type conversions), `settings`, `annotations`,
  `metadata`, `license`, `citation`, `copy`, `columns`, `loaded` and `replaced`. A referenced or
  refreshed source is parsed again with exactly its `format` and `options`, never a guessed one.
- **`copy`** is the only field saying where the rows are: the rows (a graph in node-link form, or
  tables as value arrays; tables are named `nodes` and `edges` everywhere outside the node-link
  graph), `"graph"` when the copy equals the merged graph (one graph file, nothing
  joined, no reader rows, so the most common file holds its data once), or absent when
  referenced. `columns`, present exactly when `copy` is, holds each copied table's parsed
  graph-format `ColumnDecl`s, as rebuild and re-export input only, never read for meaning.
- **`path`**: a `file` source's `origin` may carry a POSIX path relative to the saved file's own
  folder, never absolute (absolute paths leak user names) and never above that folder, written
  when the writer knows both locations (Node, or a File System Access directory handle).
- **The reader source**: the reader's cell edits (each edited column with the source value it
  replaced, `was`), added rows, removed rows (`"graphty.removed": true`) and hand merges, as one
  source of kind `reader`: always embedded, first in precedence, at most one per data section,
  its `origin` holding only its hash. "The reader's edit wins" is the ordinary rule that the first
  source wins. A content hash is SHA-256 of the bytes as read; the reader source and a `derived`
  source hash the RFC 8785 canonical JSON of their rows, each list sorted by the canonical JSON of
  its record key or element reference.
- **`types`**: the type registry. Each entry has a `name` (its id and its id space), a `domain`
  (`node` or `edge`), a `plainName`, the rule that declares it (a constant for a whole source, or
  a column with a value map, so "Person" and "people" become one type), and `schema`: a JSON
  Schema (draft 2020-12) of the working record the type carries, with graphty's two keywords
  `unit` and `measurement` (`categorical`, `ordinal`, `quantitative`, `time`). An ordinal column
  lists its values in order in `enum`. There is no role keyword: what a column is for has one
  home, the source's `mapping` and `settings`. A node may have several types, an edge one.
- **`issues`**: ignored data issues, the kept repeated-edge pairs (as element references), and per
  source the fix codes applied (a record only: the graph already holds their result).
- **`joins`**: the join history, in recipe.md's combine step objects, naming sources by id.
  **`rekeys`**: the re-key log (space, old key, new key).
- **`graph`**: the merged graph as NetworkX node-link JSON, holding only embedded sources' rows,
  recomputed on open. It always writes `directed`, `multigraph` and NetworkX's own `graph` member
  (graph-level attributes, `{}` when none). `multigraph` is true exactly when two edges share both
  ends, never a reader choice: NetworkX assumes `true` when it is missing and silently merges
  parallel edges when it is `false`. Each node carries `"graphty.space"`, `"graphty.key"`,
  `"graphty.types"` and `_source.loads`; each keyed edge carries its key as the node-link `key`.
  The node-link `id`, `source` and `target` are handles unique within the file only, since a key
  repeats across spaces (account 12 and merchant 12).

The join history and the recipe's combine steps share one spelling with two jobs: the history is
how this data was built, so a data section file rebuilds alone; the recipe's steps apply to new
data. When both are present and differ, the data rebuilds from its own history and the report
names the difference.

**Numbers plain JSON cannot carry**, anywhere in the file: non-finite values are written as the
strings `"Infinity"`, `"-Infinity"` and `"NaN"`, and integers outside +/-(2^53 - 1) as decimal
strings, since JavaScript parses every JSON number as a double and `JSON.stringify` writes
`Infinity` as `null`. A data column holding any such value declares `"type": ["number",
"string"]` (or `["integer", "string"]`) in its type's schema, and a string in it is read back as
the number.

### style

style.md's layers, selectors, encodings and palettes, with these changes:

- Selectors are style.md's kinds (`everything`, `has`, `expression`, `top`, `member`, `rule`,
  `state`, `hover`), plus a new kind, `{ "match": "type", "types": ["merchant"] }`, matching an
  element holding any listed type; the expression language cannot test whether a node's list of
  types holds a value. The `ids` kind never appears in a style section; it lives in view.
- Encodings use `encode` with `by` and `scale`. A result path names the run by `as`
  (`results.pagerank.value`).
- Layers that read file-style values name the data columns (`graphty.style.<namespace>.<kind>.<key>`)
  and list them in `dependencies.columns`.

### recipe

recipe.md's `commands` (`graph.filter`, `algo.run` with `params`, `layout.set` with `id`, `engine`
and `options`), with these additions, each an additive command or member that recipe.md gains:

- the combine steps of design/data/multiple-data-sources-analysis.md (add, identity, annotate,
  connect, link, combine graphs), naming sources by role and id spaces by name; a join's `onto`
  is gone, since id spaces replace it. A reader merge stays in the data section's reader source;
- `set.define`, for rule sets whose rule names no element, carrying the set's `id`, `name`, rule
  and edge reading;
- `dimension` (2 or 3) on `layout.set`.

Type scopes take the same form as the style type selector: `{ "types": ["merchant"] }`. The
algorithm and layout version is recorded only in results' engine record; steps carry no version.
Every `algo.run` writes `style` explicitly (see Saving).

### settings

An object of `CONFIG_KEYS` values placed here by the placement rules (`background`,
`selectionStyle`, `pinnedStyle`, `runAlgorithmsOnLoad`, `layoutBehavior`, `layoutTransition`,
`runPlacement`, and so on), plus timeline `playback`. Settings that name columns list them in
`dependencies.columns`.

### results

- **`runs`** is an object keyed by run id, `<namespace>__<as>` (recipe.md, "Run ids and
  namespaces"), the id graphty-element already saves for each run; two recipes, or one applied
  twice, can both name a run `pagerank`, and the run id keeps them apart. The layout run is keyed
  by the reserved name `layout`. Each run keeps `namespace` and `as` as fields, so it is matched
  to its recipe step or view run record by name, never by position.
- Each run holds what actually ran (algorithm, `params`, engine versions, the seed it used,
  duration), `fields`, `caveats` (including the time window and filter scope it ran under), the
  graph-level result (modularity, component count) and edge results as well as node results.
- **Outputs are columns**: one list of element references and one list per field, not one object
  per element, which would repeat every field name and reference at 100,000 nodes. Positions are
  plain number arrays.

### notes

notes.md's fields (`id` as `note_` plus a ULID, `targets`, `time`, `edited`, `author`,
`mediaType`, `cites`, `done`), at notes version 2, whose targets take element references:
`{ "graph": true }`; `{ "node": { "space", "key" } }`; `{ "edge": <edge reference> }`;
`{ "set": "set_..." }`; `{ "result": "<run id>" }`; and `item` naming the run id. notes.md's
version 1 targets (a bare node id, an edge by `source`, `target` and `ordinal`/`among`) are
migrated.

### view

- **`camera`** and each saved view's camera record the dimension and the controller separately,
  so new controllers arrive without a new dimension and a new dimension without new controllers:
    - `dimension`: `2` or `3`, a closed value (it follows the layout's dimension).
    - `controller`: which camera drove it -- `orbit` and `2d` today; an open vocabulary, so `universal`,
      `fly` or a third party's controller (reverse-domain name) can be added later.
    - The pose, in fields every controller of that dimension can read: for 3D `position`, `target`
      and `fov` (radians); for 2D `pan`, `zoom` and `rotation`.
    - Anything only one controller understands goes in a member named after it
      (`"orbit": { ... }`), which other controllers ignore and keep.

    A reader that does not know the controller applies the shared pose with its own default
    controller for that dimension and reports it; it never drops the camera.

- **XR and VR** save the graph's placement in the room, never the headset pose (that is where the
  reader's head was, which no file should restore): `xr` holds the pivot `center`, `scale` and
  `rotation` the XR pivot controller uses, for immersive VR and AR alike. Whether a session is VR or
  AR passthrough is the reader's device choice, not saved. A saved view may carry an `xr` placement
  beside its screen camera, so entering XR from that view places the graph the same way.
- **`views`**, **`selection`** (nodes and edges as element references), **`placed`** (hand-placed
  positions and pins), the timeline position, `viewRotation`, `framing`, and hidden table columns.
- **`sets`**: fixed and path sets, and rule sets whose rule names an element, each with its `id`.
- **`visibility`**: the live filter rule tree (element leaves as element references, source leaves
  by source id), the time window (`attribute`, `end`, `spells`, `from`, `to`, `step`, `nodes`),
  `showContext`, the select conditions, and the nodes hidden from the drawing.
- **`layers`**: the style layers that pick elements. Each is an ordinary style.md layer with
  element references in place of ids (edges too, which version 1 could not write), plus `after`:
  the `id` of the style-section layer it sits directly above, or `"bottom"`. On load they go into
  the one layer stack at those places.
- **`runs`**: keyed by run id, the replayable record of each run a recipe cannot hold: `namespace`,
  `as`, the reader's name for it, algorithm, `params` (element-naming options as element
  references), seed, `style`, and the scope it ran under as written (element references or a
  `set_...` id, the window bounds, the filter rule tree and hidden nodes). Results stays the one
  place for outputs, keyed by the same run id, so a journal or a share without notes never gains
  a results section the reader did not pick.

**Coordinate frame.** Positions and cameras are in graphty-element's scene frame, Babylon.js's
default (left-handed, y up), in layout units; a 2D drawing writes z as 0. Annotations keep their
file frame (y up, file units) and their `scale`. A position without a stated frame is read
mirrored by tools on a right-handed system (three.js, NetworkX's drawing, most GIS); a different
frame later would be a view major version.

## Saving

- The reader picks the sections. graphty-element writes exactly those and reports what each left
  out (an element-naming filter step in a recipe, an element-picking layer in a style saved alone,
  for example). Saving a full file with style and view moves each element-naming layer into view.
- **Results are optional.** Default: not saved, so opening reruns the behaviors (the 2026-11-13
  rule). A record or archive save includes them.
- **Embed or reference is the reader's choice** (owner, 2026-11-14: "that should be an option for
  the user: embed files or store references"), for any source, whatever its size. Embedded: the
  rows are in the data section. Referenced: the source and how it was joined, without the rows,
  plus a content hash so a refetch that returns different data is reported. Default: embedded, so
  a file stands alone. There is no size-based automatic switch. The save report names a
  referenced file source that has no `path`.
- **Every run writes `style`**, in recipe commands and in view run records: the run's
  suggested-style setting, or `false` when any saved layer reads the run, in the style section or
  the view, in the same file or not. Otherwise each open would paint the suggested layer again on
  top of the saved one, and a layer the reader deleted would come back. Conformance case: a
  project with a personalized PageRank and its suggested layer, saved by default, reopened and
  saved again, keeps the same number of layers.
- **A held section is written back unchanged.** A section skipped on load (newer version,
  required extension missing, or a data section with an unknown build value; see Loading) is held
  and written back as it was read. While it is held, graphty-element writes no section of that
  kind on its own, default style rows included; local changes to that kind are not saved, and the
  save report lists them as `{ code: "W_SECTION_KEPT", params: { section, version, reason } }`. An
  optional save option replaces the held section on purpose, and the report says so. Mixed
  releases on one team are the normal case, so without this a colleague's newer style would be
  silently lost on the next save.
- One save call writes either form: one section as a section file, or several as a full file.

## Loading

- The reader picks which sections of a full file to load; a section file loads its one section.
- **data** replaces the open data, or is added as another source, exactly as loading data does
  today.
- **Every other section is added** as one undoable step, after a plan the caller can show
  (graphty-element returns the plan as neutral facts; the app words it). The plan lists held
  sections, so an app can warn the reader before an edit.
- A **reusable section** meeting new data goes through the column mapping step, which maps
  columns and source roles; anything that cannot bind waits and switches on if matching data
  arrives (README.md, "Applying to new data").
- A **dataset-bound section** binds as in "Naming nodes and edges"; one whose `bindsTo` does not
  match the open data is reported, and loads only if the caller says so.
- **Skipped and held sections.** An unknown `sections` key: `W_UNKNOWN_KIND`. A section whose
  version is newer than the reader knows, or that lists an extension the reader lacks (or knows
  only at a lower data major), is skipped whole and held: `{ code: "W_EXTENSION_REQUIRED", params:
{ section, extension } }` for the second. Skipping a data section leaves the sections bound to it
  unbound, which is reported. The rest of the file loads.
- **Referenced sources.** Opening fetches each again, through the usual network consent. A file
  source's `path`, and a relative `url`, resolve against the location of the file being opened,
  when the caller gives one. Otherwise the load plan lists the source as needing a file, with its
  saved name, so the app can ask the reader to pick it; a picked file whose hash differs is treated
  as a refresh. Only a source still not found reports `{ code: "W_SOURCE_UNAVAILABLE", params:
{ source } }`, supplies no elements and leaves references to them unbound.
- **Rerunning is optional.** Default: behaviors (layouts, algorithms, edge routes, place lookups)
  rerun: the recipe's commands, then the view's run records, each under the scope it recorded, not
  the view state loaded. A view run recorded under a time window can be replayed only once
  graphty-element's run scope accepts a window (an additive option); until then, with no saved
  outputs, it is listed as not run. With rerun off and results present, the saved outputs are
  restored as they are; with rerun off and no results, the runs are listed as not run. When both a
  rerun and saved results exist, the report says whether they agree.
- **What a rerun paints.** A run with `style` absent paints nothing when any loaded style or view
  section holds a layer reading that run (recipe.md "Commands" rule 8, widened to view and to
  sections loaded from other files).
- Loading a style never replaces existing layers: it adds layers to the stack, where the reader
  orders, mutes or deletes them like any other. A view's layers go in at their `after` places.

## Versions

container.md, "Versions" stays in force, with these changes:

1. Each section and the wrapper have their own integer major version, independent of
   graphty-element's package version. The wrapper's version covers only the envelope (`kind`,
   `version`, `id`, `name`, `generator`, `sections`, `extensions` and the optional header fields).
2. **Starting numbers.** Every section kind that existed in version 1 starts at version 2:
   `graphty-data`, `graphty-style`, `graphty-recipe`, `graphty-notes`, `graphty-results`. A new
   kind starts at 1: `graphty-settings`, `graphty-view`. Otherwise a reader could not tell a
   version 1 document from a version 2 section of the same kind and version.
3. Within a major version changes are additive. A reader MUST ignore fields and sections it does
   not know **and keep them when it writes the file back** (version 1 as built drops unknown
   members on re-save; that is fixed first). This does not apply to the closed objects listed
   under "Open vocabularies and closed objects". There are no minor versions: an added optional
   field is known by its presence.
4. A change of meaning bumps the major version and ships with a migration from the previous one,
   its JSON Schema, and a sample file, in one change.
5. **A change to a named built-in is a change of meaning.** Changing what a named palette, shape,
   arrowhead or other built-in looks like, or removing it, bumps the version of every section that
   can name it, and the migration rewrites older files so they keep their meaning -- by replacing
   the name with the built-in's earlier definition carried as data, or with a new name for it.
   **Changing an algorithm's or layout's option default** is such a change: the release bumps the
   recipe section's major version, and its migration writes the old default into every older
   recipe's `params` or `options` where the option was not given, so a recipe never depends on a
   default across versions. recipe.md "Commands" rule 3 no longer judges changed defaults against
   `generator`, which every writer overwrites on save. An extension's own options follow the same
   rule under its data major.
6. A writer writes the lowest version that can express the content (container.md, "Versions" rule
   4), so a save does not lock out a colleague on an older release.
7. A section whose version is newer than the reader knows is skipped with a coded warning and
   held (Saving); the rest of the file loads.
8. **Extensions must be understood.** A section listing an extension in
   `dependencies.extensions` that the reader does not know, or knows only at a lower data major, is
   skipped and held. A third party cannot bump graphty's section versions, so this is how an
   extension that changes meaning avoids being silently misapplied (glTF 2.0's
   `extensionsRequired` does the same).

Rules 1, 7 and 8, the held-section rule and the all-or-nothing data rule below must be in the first
version 2 reader: readers already shipped cannot learn them.

## Open vocabularies and closed objects

An **open vocabulary** may gain values within a major version; an older reader meets a value it
does not know. A **closed object** may not be read by ignoring a member it does not know.

| Section       | Open vocabularies                                                                                              | What an unknown value or member does                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| wrapper       | `sections` keys                                                                                                | skipped with `W_UNKNOWN_KIND`, kept on re-save                                                         |
| every section | `dependencies.extensions` names                                                                                | the section is skipped and held (Versions rule 8)                                                      |
| data          | join and combine step `op`, source `kind`, `copy` form, space prefix, `graphty.` names in reader rows          | the whole data section is skipped and held (below)                                                     |
| data          | `measurement` values                                                                                           | drawing falls back, as container.md does for style channels                                            |
| style         | channel names, selector kinds (`type` among them), scales, layer kinds, enumerated channel values, palette ids | fails that channel entry or layer alone (container.md, "Versions" rule 2)                              |
| recipe        | command `op`, algorithm keys, layout ids, the parts of a run's `style`                                         | an unknown `op` stops the replay there (recipe.md, "Replaying" rule 4)                                 |
| notes         | target kinds, item key forms                                                                                   | the target reads `unsupported`, kept and written back (notes.md, "Targets" rule 6)                     |
| view          | camera controllers                                                                                             | the shared pose is applied with the default controller for its dimension and reported; kept on re-save |

**The data section is built whole or not at all.** A value the reader does not know in a
vocabulary that shapes the build, or an unknown member of one of the data section's closed
objects, makes the reader skip the whole data section and hold it unchanged, reported with
`W_SECTION_KEPT`. It is never built in part, so nothing binds to, or saves, a partial graph. The
data section's closed objects are a source's `mapping` and `settings`, a type's declaring rule and
value map, a join or combine step, and a key in `options` that its parser does not read. Every
`graphty.` name in a reader-source row is reserved as a marker (`graphty.removed` today), so an
unknown one triggers the skip instead of being read as a column value. Ignoring any of these would
build a different graph -- an unknown `settings.directionColumn` would give edges the wrong
direction -- while the fingerprint, which hashes them as written, still counted saved results as a
match.

The other closed objects are those of container.md, "Unknown object members" (a recipe command
and its `scope`, a style's selectors, bindings and carried palettes, a run's `style` parts), plus
element references and note targets and cites, which are kept unbound or `unsupported` rather than
bound by ignoring part of them.

## Backwards compatibility

- Every version a release has written is read forever: older files are upgraded on read, one step
  at a time (v1 to v2 to v3), and the report says so. Only the newest reader exists; older versions
  live only as small migrations.
- **A frozen sample corpus**: each released version leaves sample files that are never edited, and
  CI checks that every one still opens and gives the same result. The existing saved-format checks
  and the older-file tests are the start of it.

Version 1 files (the nine-member layout, and version 1 section documents) open through a migration
into the sections above; autosave and browser-stored projects are migrated the same way. The
migration:

- regroups the nine members into the seven sections and splits the session member;
- derives record keys from each node's per-source information (`_source.loads` or `provenance`,
  plus each source's mapping) into the spaces a new load would use, strips `kind:` respellings,
  and converts positional edge references against the file's own `links` list;
- converts the session's `columns` and `issues` members: renames and conversions into each
  source's `mapping`, hidden columns into view, load facts, kept pairs and fixes into `issues`; and
  writes each `declarations` entry (keyed `<kind>:<name>`) as `measurement` (and, for ordinal, the
  `enum` order) into the schema of every type of that domain carrying the column;
- copies each version 1 source's `format`, file `size`, `mediaType` and parse options, and
  converts, never copies, its identity and join options: `idPrefix` and `kindIds` become spaces,
  `sourceKind` and `targetKind` fill `sourceSpace` and `targetSpace`, `joinOn`, `keep`, `existing`
  and `columnPrefix` become join-history steps, and the `label` role becomes a style layer reading
  that column; one choice never gets two homes;
- moves file styles, stored by element id, into columns of their source, and points each
  file-style layer's origin at the source id instead of `importId`;
- moves style layers whose selector names elements into view's `layers`, their node ids converted
  to element references against the file's own data;
- moves the session's `visibility` member into view's `visibility` and its playback into settings;
- turns each saved run into a recipe command where recipe.md can hold it, else a view run record,
  and its outputs into results;
- turns style.md's `id`/`styleVersion` and recipe.md's `id`/`recipeVersion` into `id`/`revision`,
  and notes version 1 targets into element references;
- rewrites positions and results from base64 bytes into plain numbers;
- migrates or drops the snapshot `session.recipe()` writes today.

Version 1 files carry no annotations, so none are migrated.

## What a file carries and what it names

The test: a file must mean the same in any later release, and in a build without the feature.
Versions rule 5 keeps named things honest.

| Kind of thing              | Examples                                                          | In the file                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| data                       | palettes, color scales as stops, label looks, lists, value labels | carried (owner's standing rule 6)                                                                                                      |
| content written as code    | shaders                                                           | carried as source text (self-contained-save-files.md, Part 1)                                                                          |
| assets                     | 3D models and images, sample ones included                        | carried, keyed by sha256 (assets.md)                                                                                                   |
| behaviors                  | algorithms, layouts, edge routes, place lookup                    | named, with options and seed (the engine version in results); rerun on load unless told otherwise; their outputs in results when saved |
| code-backed drawing basics | node shapes, arrowheads, line patterns, transitions               | named; every name defined in the built-ins registry of this specification; a name is never reused for something else                   |
| large outside data         | basemap tiles, the gazetteer                                      | named, with version; what the graph took from them (looked-up coordinates) is in results when saved                                    |
| third-party extensions     | another package's shader, layout or section                       | the same rules; the extension writes its own data, and `dependencies.extensions` names it when the section cannot be read without it   |

The built-ins registry (to be written, alongside the schemas) lists each named built-in with an
exact definition: a shape's geometry, an arrowhead's outline, a line pattern's dash lengths, a
transition's curve. With it, a file that names a built-in is still readable without graphty.

## Archiving

A file saved today should be recoverable if graphty is gone. The Library of Congress judges
formats for long-term preservation by disclosure, adoption, transparency, self-documentation,
external dependencies and technical protection
(https://www.loc.gov/preservation/digital/formats/sustain/sustain.shtml). Applied here:

- **Transparent**: plain JSON, no zip, no encryption.
- **Recoverable with ordinary tools**: the data section's graph stays NetworkX node-link JSON, so
  `networkx.node_link_graph` reads it when passed `edges="links"` (`link="links"` before NetworkX
  3.4; recent releases warn that their default will change to `edges`); CI tests that it does. It
  holds only the embedded sources' rows: a referenced source is recoverable only while its origin
  still answers, so an archive save should embed. Notes are plain text; the recipe is a readable
  list of steps; style is readable rules.
- **No undocumented binary**: positions and results are written as plain numbers (version 1
  writes them as base64 float64). Binary appears only for assets that are binary files anyway, and
  its encoding is specified.
- **Self-documenting**: every section and the wrapper carry `kind`, `version` and `$schema`;
  every field has a schema; every named built-in is defined in the registry. Sources carry their
  file's own `metadata`, `license` and `citation`, and any section may carry `authors` and
  `license`.
- **The specification outlives the website**: the specification, schemas and registry ship inside
  the graphty-element npm package. The version 1 schemas move from design/documents/ into
  graphty-element/spec/, and graphty-element's package.json `files` lists `spec/` (today it
  publishes only `dist/`). npm tarballs are widely mirrored and never deleted; the public
  repository is archived by Software Heritage (https://www.softwareheritage.org/); and each
  specification version may be deposited on Zenodo for a permanent DOI (https://zenodo.org/).
- **External dependencies are the weak point**: a file holding a recipe without results means
  nothing once no software can run it. A record or archive save includes results for that reason.

## Ownership

graphty-element owns all of this: the sections, saving and loading either form, the plan, mapping,
binding, migration, rerun, held sections and the reports. The graphty app only offers the choices
(which sections, results or not, rerun or not, embed or reference, which file to pick for a missing
source) and words the reports.

## Changes from version 1 as built

1. Unknown members and fields are kept on re-save.
2. The nine members are regrouped into seven sections, keyed by name in the full file, each with
   the shared header; the session member is split. The wrapper loses `requires` and gains
   `$schema`, `id`, `created` and `modified`.
3. `session.recipe()` becomes the recipe section of recipe.md (a replayable command list), and the
   snapshot it writes today is migrated or dropped. `styles.toFile()` (`graphty-style`), the notes
   document and the recipe become identical to their sections.
4. Saved references name elements by record key; positional edge references and bare node ids go.
5. The data section gains full source records, the reader source, a type registry with a JSON
   Schema per type, data issues, the join history, the re-key log and annotations.
6. Results are restored only when rerun is off; by default the behaviors rerun. Today every saved
   result is restored without rerunning.
7. Saving can include or leave out any section, and results; loading can pick sections.
8. Nothing the session holds is lost on a default save: every setting has a home (today
   `viewRotation`, `framing`, `runPlacement` and `layoutTransition` are dropped), and
   element-picking layers, runs a recipe cannot hold, the live filter and the time window are
   kept in view.
9. Positions and results are written as plain numbers.

## Open items

- **Settled with the data-store design** (design/data/data-store-options.md, sections 5 and 8):
  the element references, `bindsTo` and the fingerprint, and the data section's members. Its
  one-way doors are settled together before the data section is built; its "Needs the owner" list
  is open.
- **The combine step spellings** (their `op` names and members) are to be written into recipe.md
  before the first version 2 release; they appear in every saved data section's join history.
- **A time-window run scope** in graphty-element, so view runs recorded in a window can be
  replayed (an additive option).
- **Sorting the remaining settings** between settings, style, recipe and view, one `CONFIG_KEYS`
  entry at a time, under the conformance test in the placement rules.
- **Reconciling with the "carry small, name large" exceptions work** (issues #6500-#6519 and
  self-contained-save-files.md): with built-in changes handled by versions and migrations, some of
  those issues (carrying a named palette instead of naming it) may no longer be needed. Each is to
  be re-checked against Versions rule 5 before it is worked.
- **Several graphs in one file** (#828) and **version history** (#825): not in version 2. A later
  version adds them as new `sections` keys without breaking it; `sections.data` stays the primary
  graph older readers open, and every bound section already names its data through `bindsTo.data`.
- **A preview image** for file browsers: additive later, as an optional wrapper field naming an
  asset, when a surface shows one.
