# graphty document formats, version 2: modular save files

Status: design, not implemented. It changes how the version 1 documents in this directory are
grouped and travel. The section pages (style.md, recipe.md, notes.md, assets.md, sources.md and
container.md's data member) still specify what each part holds, with the changes this page lists;
this page says how the parts are cut, saved, loaded, versioned and kept readable. Where this page
and a version 1 page disagree, this page wins. The data section's model -- source records, types,
ids, the reader source, the build and how saved sections name nodes and edges -- is specified in
design/data/data-store-options.md (sections 4 and 5); this page summarizes it and points there.
Version 2 stays behind the save-files-v2 experiment, and its single data section is not final: a
later version may let one file hold more than one graph.

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
  results of behaviors, run the behaviors again", which stays the default: results are not saved
  unless the reader asks, and each run reruns on open unless the reader turns that off for it.
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
  `notes`, `view`.

A section is the same JSON in both forms, byte for byte. Cutting a section out of a full file
gives a valid section file; putting a section file into a full file gives a valid full file. A
section keeps its own `kind` inside a full file. A reader decides what a section file is from its
`kind`, never from its name (container.md, "File name and media type").

**The key decides** what a section in a full file is. A key the reader knows holds the section of
that name, and there is one section of each known kind because there is one key for it. A known
key whose value carries another `kind` is skipped and held (see Saving), never dropped and never a
refusal of the file. The check that `kind` equals its key applies only to keys the reader knows.

One section of each kind is enough because a loaded style adds its layers to the one layer stack:
a project's look is one style section, and a kit that offers alternative looks (screen and print)
ships them as separate style files.

**`sections` is open.** A reader skips a key it does not know with `W_UNKNOWN_KIND`, whatever
`kind` its value carries, holds it verbatim for re-save, and still loads every section it knows.
The schema allows additional keys whose value has a `kind` and an integer `version`. This is how
graphty adds its own later sections (several graphs, version history) without locking out older
releases, and a third party's section goes under `sections` too, keyed by its reverse-domain kind.
The wrapper's `extensions` holds only extension data, never a section.

Media types: `application/vnd.graphty+json` for the full file, and
`application/vnd.graphty.<section>+json` for a section file. File extensions and media types are
published contracts: once shipped, they are never renamed.

## The sections

Two groups, by how a section refers to data.

**Reusable on any data.** These refer to columns, types, sets, results and sources by name and
never to particular nodes or edges, so they apply to data they have never seen through the column
mapping step (README.md, "Applying to new data"). A writer MUST leave out, and report, anything in
them that names an element or a dataset.

| Section  | File                     | Holds                                                                                                                                              | Taken from version 1                                                                                              |
| -------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| style    | `.graphty-style.json`    | style layers, palettes, shaders as source text, the style tree, value labels, and the models and images the layers draw                            | `graphty-style`, `graphty-assets`, the session's value labels                                                     |
| recipe   | `.graphty-recipe.json`   | the ordered commands applied to new data: join steps, filters, algorithm runs, sets defined by a rule, layout (algorithm, options, 2D or 3D, seed) | the session's layout, visibility filters and rule sets; the commands of `graphty-results`; specified by recipe.md |
| settings | `.graphty-settings.json` | project settings that belong to no other section, and timeline playback                                                                            | the session's config and playback                                                                                 |

**Bound to one dataset.** These name particular nodes and edges, and say which data they belong to.

| Section | File                    | Holds                                                                                                                                                                                                                                                                              | Taken from version 1                                                                                        |
| ------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| data    | `.graphty-data.json`    | the source records (each with its copy embedded, or a reference with its copy id), the reader source, the build stamp, `directed` and `repeatedEdges`, the type registry, type conversions, data issues, the join history, and the merged graph as NetworkX node-link JSON         | `graphty-data`, `graphty-sources`, the session's columns, declarations and issues, file styles, annotations |
| results | `.graphty-results.json` | the record: each run's outputs and the layout's, the seed each actually used, engine versions, duration, caveats, and which build of the data each ran on                                                                                                                          | the outputs of `graphty-results`                                                                            |
| notes   | `.graphty-notes.json`   | notes (notes.md, version 2)                                                                                                                                                                                                                                                        | `graphty-notes`                                                                                             |
| view    | `.graphty-view.json`    | the session a file is opened to: camera, saved views, selection, pinned positions, every set, the filter in force and the time window, the layer order and the layers that name elements or a dataset, every run record and the layout record, view settings, hidden table columns | `graphty-arrangement`, `graphty-view-state`, the session's views, sets, visibility, runs and layout         |

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

View restores the session; recipe, style and settings are what applies to new data. A recipe
therefore holds its own copies of sets, filters and the layout for new data, and view holds the
ones in force. The rules that are easy to get wrong:

- **Sets.** Every set carries an `id`, `set_` plus a ULID, minted and never chosen by hand, beside
  its display `name`; notes, style `member` selectors, recipe scopes and rules name a set by that
  id. View's `sets` holds every set in force, fixed, path and rule sets alike, whatever a rule
  names. A recipe's `set.define` is the recipe's own copy, for applying to new data only; a rule
  naming an element cannot be a recipe step, so the recipe writer leaves it out and reports it.
  A recipe saves each `set.define` id bare (`set_<ULID>`). Applying it under a namespace writes
  `set_<namespace>.<ULID>` and rewrites every reference in the applied sections, as run ids are
  rewritten; `onRepeat: "replace"` replaces the earlier application's sets. A reusable section
  names a recipe's set by the bare id; dataset-bound sections name the namespaced id. recipe.md's
  "Run ids and namespaces" takes the matching rule.
- **Positions.** Positions a layout computed are not saved by default: on open the layout reruns,
  or its output is restored from results when results are saved. Pinned positions are saved in
  view.
- **2D or 3D** is what is computed, so it is the layout record's `dimension`: view's `layout`
  holds it for the session, and the recipe's `layout.set` holds its own copy for new data.
- **Filters and time.** View's `visibility` holds the filter in force, the time window,
  `showContext`, the keep, exclude and select conditions and the nodes hidden from the drawing.
  The recipe's `graph.filter` commands are its own copies, for new data. Timeline playback
  settings (mode, step, missing, outside, time zone, age fade, results policy) name columns but no
  elements, so they go in settings.
- **Layers that name elements or a dataset** go in view's `layers`: a style layer whose selector
  names elements (an `ids` selector, a `member` selector naming a fixed or path set, a layer whose
  run `source` has `params` naming a node); a layer that reads a run no recipe step makes (through
  a `results.<run id>` path or `source.runId`); a layer that reads a run whose `as`, or a set whose
  bare id, more than one open run or set shares, saved under the run id or the full set id; and a
  file-style layer. Saving the style section alone leaves such layers out and reports them. In a
  style section, `source.runId` holds the run's `as`, as a result path does.
- **Run records.** View's `runs` holds every algorithm run, recipe-made and hand-started alike.
  The recipe's `algo.run` commands are its own copies, for new data.
- **Settings.** Every key graphty-element's `config.set` accepts (its `CONFIG_KEYS`) is saved in a
  named section, or listed as deliberately not saved with its reason; a conformance test fails
  when a key has neither. `viewRotation` and `framing` go in view (they say how this drawing is
  shown, and loads set them: Graphviz `rotate`, a file's fit). `layoutTransition` and
  `runPlacement` go in settings. Not saved: `author` (the person writing, stamped on each note,
  not the project's); `startingRows` and `editableBase` (they act when a project is created, and
  the rows they write are saved as plain style rows); `name` (the wrapper's `name`). No `data.*`
  config key is written to the settings section. Each has its data-section home: `directed`, a
  mapping role, `repeatedEdges`, or the key rule (data-store-options.md 4.3). A key with no home
  (`idCoercion` other than canonical, `positionScale`, the time end, spells and parse-zone paths)
  is refused on save and reported, by the refusal rule (Saving).
- **Column settings.** Renames belong to each source's `mapping`, so a refresh applies them again.
  Type conversions are the data section's `conversions`. Hidden columns are a table-view choice and
  go in view.
- **File styles.** The per-element colors, sizes and positions a GEXF `viz:` or Cytoscape.js file
  gave each element are columns of their source's copy in the data section, embedded or referenced
  with it. A file style is the column `graphty.style.<source id>.<node|edge>.<key>`, read through
  graphty-element's root path of that name, never `data.`; these columns are exempt from the
  reserved-prefix rule and never written into the node-link graph. The layers that paint them name
  a source, so they go in view's `layers`.
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
        "columns": [
            {
                "kind": "edge",
                "name": "amount",
                "schema": { "type": "number", "measurement": "quantitative", "unit": "USD" }
            }
        ],
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

`name`, `description`, `created`, `modified`, `license`, `$schema`, `authors`, `keywords` and
`language` are optional text with no rules attached: no reader acts on them beyond showing them.

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
  kit others will copy; any unique string otherwise. A copied section keeps its `id`.
- The data section's `id` names the dataset: minted when the project first gets data, and kept
  through refresh, replace and edits. A replace keeps it, so a notes or view section saved before
  a replace still binds, by key, to whatever the new data holds (see "Naming nodes and edges").
- **Minted ids.** A source id is `src_` plus a ULID, minted by graphty-element, never chosen by
  hand and never reused; the reader source's is always `reader`. A name the caller gives a source
  goes in its `label`. A set id is `set_` plus a ULID, and a note id `note_` plus a ULID. A run id
  is any string matching `[A-Za-z0-9_.:-]+`, in graphty-element's own minted form (a recipe-made
  run's `<namespace>__<as>`, a hand-started run's id as the element minted or the caller gave it);
  run ids are restored as saved, and a new one never reuses an id a loaded section names. Ids minted from current state (`s<n>`, `set_<slug>`) would reappear after a delete
  and reopen, and kept unbound references would then bind to unrelated things.
- Version 1's style `styleVersion` and recipe `recipeVersion` have no version 2 home: the version 1
  migration drops them and reports it.

### Dependencies

`dependencies` says what a section needs from the data and from software before it can work, so a
reader can say what is missing instead of failing.

- **`columns`** drive the column mapping step. Each entry is `{ "kind", "name", "schema" }` and
  nothing else. `kind` (`"node"` or `"edge"`) is required and `name` is the working column name,
  spelled as graphty-element's `ColumnRef`, as view's `hiddenColumns` are; mapping matches the
  column within that table only, so a style needing the edge column `amount` is never satisfied by
  a node column `amount`. `schema` is a fragment in the same JSON Schema dialect the type registry
  uses, with its `measurement` and `unit` keywords: `{ "type": "number", "measurement":
"quantitative", "unit": "USD" }`, `{ "type": "string", "measurement": "categorical" }`,
  `{ "type": "string", "format": "date-time", "measurement": "time" }`. Mapping checks a data
  column against it with one rule set.
- **`types`**: the node and edge type names the section names.
- **`sources`**: a list of the source role names the section names. Every source reference in a
  reusable section (a join step, the rule tree's `source` leaf in a rule set or style selector,
  the calculated source paths) names a role, because a source id belongs to one data section. The
  caller maps roles to the open data's sources as it maps columns. A role maps by default only
  when exactly one open source has that `label`; when none or several do, it is unmapped and
  reported like a missing column, and what needs it is skipped. A writer that would give two
  sources of one recipe the same role refuses that part and reports it, since two files named
  data.csv, or one feed loaded twice under one name, would otherwise let two readers map the role
  differently.
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
    { "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y", "key": "pay-889" }     // an edge
    { "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y",
      "key": "01JCBQ2F5H7K9M1P3R5T7W9Y2A#3" }                          // a keyless edge row
    ```

- **Keys.** `key` is always a JSON string. An edge's key is its `edgeId` value; repeated ids within
  one source follow `duplicateIds`. A keyless row's key, node or edge, is `"<copy id>#<row from
0>"`; an edge row whose edge-id cell is null or empty is keyless, so the form applies per row.
  `load` names the source that made the edge; `key` is the record key, never NetworkX's multigraph
  key. An edge built from several rows, including an edge two sources both supply, takes the key
  of the first row read, in join step order. The member is `load`, not `source`, because every
  other edge object uses `source` for the node the edge leaves (graphty-element's stored edge
  member, node-link links, a mapping's `edges.source`).
- **Spaces.** A space is an opaque string, always written for the node key, `sourceSpace` and
  `targetSpace`, compared exactly after Unicode NFC normalization (applied when read), never
  inferred and never parsed. A type name (`account`), `shared:<name>` and `source:<id>` are only
  the names a writer proposes by default. Only the node-key column of a `join.add` step asks about
  its space; edge ends and the merge and values steps keep the proposed space, since they name
  existing keys on purpose. When such a node key would add keys to a space that already holds
  another source's keys, the load plan reports the overlap count and the caller chooses merge (keep
  the proposed space) or keep separate (`source:<id>`); an API caller that does not choose keeps
  them separate, with `W_SPACE_OVERLAP`. The mapping records the result as its `space`, and a
  refresh reuses it and asks nothing again. A source id survives refresh and same-shape replace,
  so renaming `accounts.csv` or moving a URL from `?week=46` to `?week=47` unbinds nothing.
- **Binding.** When `bindsTo.data` equals the open data section's `id`, or the caller agrees to
  bind to other data: a node by (space, key), an edge by (load, key). A reference that binds
  nowhere is kept, never dropped: re-saved unchanged, bound if a refresh brings the element back,
  and reported as `{ code: "W_REFERENCE_UNBOUND", params: { section, pointer, ref } }`.
- **Unbound members stay in their container.** An unbound reference is part of its container's
  state. A set, a note's targets, a layer's id selector and the pins keep their unbound members
  through edits; an unbound member leaves only when the reader removes it, and the app can list
  them. The selection is the exception: selecting again replaces it whole.
- **Re-keys and refreshes.** A re-key rewrites the references in every open section at once. A
  section file not open during it keeps those references unbound and reports them. During a live
  refresh, keyless rows may be matched in memory and the open sections' references rewritten; that
  matching is never saved.
- **Reusable sections never name elements.** Style, recipe and settings refer to columns,
  calculated values (selected, hovered, pinned), types by name, sets by `set_...` id, results by
  run name (`results.<as>`) and sources by role. Dataset-bound sections name results by run id
  and sources by source id.

**`bindsTo`.** Notes and view carry `"bindsTo": { "data": "<data section id>" }` only: they bind
by key, and a refresh never makes a note or a pin wrong. Results also need to know whether the
data changed since they were computed, and one project holds runs made at different builds (a run,
a cell edit, another run). So the results section carries only `bindsTo: { data }`, and each run
record, and the layout record, carries its own `bindsTo: { build, sources }`:

- `build`: the data section's build stamp when the run happened, a ULID minted whenever any build
  input changes (see "data"). Equal stamps mean the results are current.
- `sources`: each source's copy id, by source id, the reader source included, so the report can
  say which source changed in words a reader understands ("accounts changed"). A run computed
  while a source was unavailable (`W_SOURCE_UNAVAILABLE`, or a referenced file the reader did not
  pick) leaves that source out of `bindsTo.sources`. The open data's copy ids leave out every
  source that is unavailable now, by the same rule; the test compares the two maps, keys included.

Nothing is canonicalized or sorted for hashing anywhere. A hand-edited data section that keeps its
old stamp makes its results look current; the specification states the MUST on minting, and that
is the accepted cost.

| Case     | Test                                                                                            | What happens                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Match    | Same data `id`, and the run's `build` and `sources` equal to the open data's build and copy ids | Binds; the run restores as saved when its rerun is off                                                                       |
| Partial  | Same data `id`, anything else                                                                   | Binds; the report names the sources whose copy id differs, or says settings, types or joins changed; the run is marked stale |
| No match | Different data `id`, or no data open                                                            | Reported, loaded only if the caller says so, then bound by key; the report names sources sharing a copy id                   |

The test is per run: one results section can restore one run as saved and mark another stale.

## What each section holds

### data

Specified in design/data/data-store-options.md, sections 4.1 to 4.8. Its members, beside the
header:

- **`build`**: the build stamp, a ULID. A writer that changes a build input -- a source copy, a
  mapping or setting, a type, a join step, a kept pair, `directed`, `repeatedEdges`, a conversion,
  a reader operation -- MUST mint a new `build`. So does a save that writes anything other than
  what an open read, a part refused on open included (see Saving): the stamp read is never kept
  for data that differs from it.
- **`directed`**, always written, is the only direction input; reader-drawn edges follow it. The
  node-link graph's `directed` is written from it and never read. A source file's own direction
  goes in that source's `metadata`; a source that disagrees is read under `directed` and reported.
- **`repeatedEdges`**: one value for the whole graph, graphty-element's name, governing repeated
  edges within a source and between sources alike.
- **`sources`**: one record per source, with exactly the fields of data-store-options.md 4.5:
  `id` (`src_` plus a ULID; see "Identity"), `label`, `kind` (`file`, `url`, `network`, `sample`,
  `derived`, `reader`), `format` and `options` (the parser and its parse options only), `origin`,
  `mapping`, `settings`, `annotations`, `metadata`, `license`, `citation`, `copy`, `columns` and
  `loaded`. A referenced or refreshed source is parsed again with exactly its `format` and
  `options`, never a guessed one.
    - `origin.copy` is the copy id: for file, url and sample sources `sha256:<hex>` of the bytes;
      for network, derived and reader sources a ULID minted whenever that copy changes. `origin` also
      holds the file name, size, media type and HTTP validators where they apply.
    - A network source's `origin` is a closed object: `copy`, `url`, `credentials` (`{ "slot" }`,
      the credential slot's name, never a secret), `etag`, `lastModified`, and `ledger`, the request
      history a refresh replays, written as graphty-element's `SourceLoadRecord` with its `key` set
      to the source id.
    - **Working column names everywhere.** Every column name in the file is a working name, after
      renames. A column's source name appears only in `mapping.<table>.renamed` and in its
      `ColumnDecl.origin.title`.
    - `mapping` is, per table, graphty-element's `TableMapping` names, one value per table:
      `nodes: { key, space, weight, weightMeaning, time, timeUnit, latitude, longitude, coordinates,
country, region, city, renamed }` (the location roles are graphty-element's `LocationKind`
      names, one column each) and `edges: { edgeId, source, sourceSpace, target, targetSpace,
weight, weightMeaning, time, timeUnit, renamed }`. With `key` absent, every node row is
      keyless, always in the space `source:<source id>`, and `nodes.space` is written exactly when
      `nodes.key` is; `sourceSpace` and `targetSpace` are always written. Nothing is read from a
      column the mapping does not name. A `label` role is saved as the version 1 migration saves it,
      a style layer reading that column; a save that cannot write that layer refuses the role and
      reports it. A file's own ids (GraphML `n0`, a node-link `id`) are only what graphty-element
      proposes as the key at load time; the chosen column is written to `key` like any other role.
    - `settings` is closed, the per-load choices only, with graphty-element's names:
      `duplicateIds`, `unmatched`.
- **`copy`** is the only field saying where the rows are: the rows (embedded) or absent
  (referenced). An embedded copy is tables: an object whose only members are `nodes` and/or
  `edges`, each an object of equal-length value arrays keyed by working column name. A node-link
  source is copied as tables, its graph attributes in `metadata`. Any other object is an unknown
  copy form and holds the data section. A derived source, like the reader source, is always
  embedded. `columns`, present exactly when `copy` is (never on the reader source), holds each
  copied table's parsed graph-format `ColumnDecl`s grouped by table, as the copy is:
  `{ "nodes": { "<working name>": <decl> }, "edges": { ... } }`. They are rebuild and re-export
  input only, never read for meaning.
- **`path`**: a `file` source's `origin` may carry a POSIX path relative to the saved file's own
  folder, never absolute (absolute paths leak user names) and never above that folder, written
  when the writer knows both locations (Node, or a File System Access directory handle).
- **The reader source** holds the reader's own changes as one source of kind `reader`, at most one
  per data section. It has `id` (`reader`), `label`, `kind`, `origin` (`copy` alone), `copy` and
  `loaded`; any other field holds the data section. Its copy is `{ "operations": [...] }`, in the
  order made, applied in order after the join steps and the conversions:
    - `{ "op": "merge", "into", "from" }`: node references; `into` is kept;
    - `{ "op": "remove", "node" | "edge" }`: a node takes its edges with it, whatever `unmatched`
      says;
    - `{ "op": "add", "node": { "space", "key" } | "edge": { "load": "reader", "key" }, "from",
"to", "columns" }`: its key a minted ULID, since the reader copy id changes on every edit;
    - `{ "op": "edit", "node" | "edge", "column", "value", "was" }`.

    An operation naming an absent element applies to nothing and is reported. Operations are written
    as recorded. An edit to a column a type rule, or a key, end or edge-id role, reads is refused and
    reported. A fix is saved as what it did: `edit` operations or a `conversions` entry.

- **`types`**: the type registry. Each entry is a closed object: `name` (its id in the file),
  `kind` (`"node"` or `"edge"`, as graphty-element's `ColumnRef` spells it), `plainName`, `rules`
  and `schema`. `rules` is a list of closed objects `{ source, end, column, values }`. `end`
  (`"source"` or `"target"`, node types only) types the nodes an edge source names at that end;
  absent, the rule reads the source's node rows. Without `column` every row read has the type; with
  it, `values` lists the cell values meaning this type, so "Person" and "people" become one type. A
  node may match several types; an edge takes the first in registry order. A row matching no rule
  has the default type, which has no name and no entry: its node or edge writes
  `"graphty.types": []`, and no selector or scope names it. `schema` is a JSON Schema (draft
  2020-12) of the working record the type carries, with graphty's two keywords `unit` and
  `measurement` (`categorical`, `ordinal`, `quantitative`, `time`). An ordinal column lists its
  values in order in `enum`. There is no role keyword: what a column is for has one home, the
  source's `mapping`.
- **`conversions`**: a list of `{ kind, name, type }`, graphty-element's `ColumnRef` plus its
  `ValueType` (`text`, `number`, `boolean`, `date`, `category`), as `setType` takes them. Each
  converts the whole working column across every source; a value that does not convert becomes
  `null`. The build applies the list after the join steps and before the reader operations, so an
  edited value is written as given.
- **`issues`**: graphty-element's `IssueState` names. `ignored` is a list of `{ code, kind, name }`,
  exactly the parts of the element's issue id: `kind` is `"node"` or `"edge"` and always written,
  `name` the working column name, written when the issue has a column; this round-trips every
  issue id the element mints. `kept` is a list of `{ from, to }` node references, the pairs whose
  repeated edges the reader kept.
- **`joins`**: the join history, the join steps (see "recipe") naming sources by id. A source no
  step names is not built, and is reported; a one-source file writes one `join.add`. When a step's
  source gives a node a value for a column the node already holds from an earlier source, and the
  two differ, the later value is kept as the column `<column> (<source id>)`.
- **`graph`**: the merged graph as NetworkX node-link JSON, holding only embedded sources' rows,
  recomputed on open. It always writes `directed`, `multigraph` and NetworkX's own `graph` member
  (graph-level attributes, `{}` when none). `multigraph` is true exactly when two edges share both
  ends, never a reader choice: NetworkX assumes `true` when it is missing and silently merges
  parallel edges when it is `false`. Each node carries `"graphty.space"`, `"graphty.key"`,
  `"graphty.types"` and `_source.loads`; each edge carries `"graphty.load"`, `"graphty.key"`,
  `"graphty.types"` (at most one item) and `_source.loads`. Beside them every node and edge
  carries each of its working columns as an attribute, key, end, edge-id and type-rule columns
  included, even one that repeats `"graphty.key"`; only a column named after a node-link member
  (`id` on nodes; `source`, `target` and `key` on edges) and the file-style columns are left out,
  and their source keeps them in its copy. graphty never writes a node-link `key`. The node-link
  `id`, `source` and `target` are handles unique within the file only, since a key repeats across
  spaces (account 12 and merchant 12).
- **`_source.loads`** lists the sources that supplied the row. A node only named by an edge writes
  `[]`, and keeps its key when the file is saved again: it is not a reader addition. `reader` is
  listed only on an element the reader added; an edit does not add it, and a merge keeps the union
  of both nodes' lists. Only the nodes and edges the reader added are written as reader `add`
  operations.

The join history and the recipe's join steps share one spelling with two jobs: the history is how
this data was built, so a data section file rebuilds alone; the recipe's steps apply to new data,
and only when the caller asks. Opening a file rebuilds the data from its own history.

**Numbers plain JSON cannot carry**, anywhere in the file. A finite number is the JSON number
ECMAScript `Number::toString` writes. Non-finite values are the strings `"Infinity"`,
`"-Infinity"` and `"NaN"`, read as numbers exactly where the declared type is number (a type
schema, a `ColumnDecl` dtype, a results field, an option typed number); any other string stays
text. A key is always a string: a number as `Number::toString` writes it, so `34`, `34.0` and
`"34"` are one key; a boolean as `true` or `false`. Cells are turned to text the same way before
matching a rule's `values`. An integer too large to hold exactly (beyond 2^53 - 1 either way) is
written as its decimal string, and read back as a number only where the column's schema declares
`number` or `integer` (its `ColumnDecl` dtype is numeric); anywhere else the string stays text.
Its row is never refused.

### style

style.md's layers, selectors, encodings and palettes, with these changes:

- Selectors are style.md's kinds (`everything`, `has`, `expression`, `top`, `member`, `rule`,
  `state`, `hover`), plus a new kind, `{ "match": "type", "types": ["merchant"] }`, matching an
  element holding any listed type; the expression language cannot test whether a node's list of
  types holds a value. The `ids` kind never appears in a style section; it lives in view.
- Encodings use `encode` with `by` and `scale`. A result path names the run by `as`
  (`results.pagerank.value`), and so does a layer's `source.runId`.
- Every layer has an `id` and no `kind`: there are no special layers, so no member exists to give
  one special behavior.
- `valueLabels` is a list of `{ path, value, label }`, `path` a value path (`data.<column>`,
  `results.<as>.<field>`), as graphty-element keys value labels.

### recipe

recipe.md's `commands` (`graph.filter`, `algo.run` with `params`, `layout.set` with `id`,
`algorithm` and `options`), with these additions, each an additive command or member that recipe.md gains:

- the join steps `join.add`, `join.merge`, `join.node-values`, `join.edge-values` and
  `join.edges`, each `{ op, source, ...choices }` with graphty-element's `JoinShape` and
  `JoinChoices` names, naming sources by role (data-store-options.md 4.1). `join.add` is version
  2's own name for a plain load and for the element's `rows` shape. The element's `endKinds` is
  saved as `end` type rules on the step's source, and `kindIds: "scoped"` as that source's written
  `sourceSpace` and `targetSpace`; `ignore` only silences report warnings, is not saved, and the
  save reports that. A join step that makes elements from no row (a link step), connect's "a node
  per row" form, and the choices `keys` onto a graph column, `columns`, `ignoreCase` and
  `ignoreSpaces` have no version 2 spelling: saving one refuses that part and reports it. A
  clashing column kept twice is named `<column> (<source id>)`. A reader merge stays in the data
  section's reader source;
- `set.define`, for rule sets whose rule names no element, carrying the set's bare `id`, `name`,
  rule and edge reading;
- `dimension` (2 or 3) on `layout.set`.

Type scopes take the same form as the style type selector: `{ "types": ["merchant"] }`. The
algorithm and layout version is recorded only in the engine records of results and view; steps
carry no version. A recipe says what to run, not what ran: `layout.set` names the layout in
`algorithm` and carries no `engine` at all.
Every `algo.run` writes `style` explicitly (see Saving).

### settings

Two members. `settings` is keyed by `CONFIG_KEYS` paths spelled as `config.set` takes them, dotted
(`"layoutBehavior.preSteps"`), holding the values the placement rules put here (`background`,
`selectionStyle`, `pinnedStyle`, `runAlgorithmsOnLoad`, `layoutTransition`, `runPlacement`, and so
on). `playback` sits beside it and holds timeline playback, which is not a config key. Settings
that name columns list them in `dependencies.columns`.

### results

- **`runs`** is an object keyed by run id, in graphty-element's own form: a recipe-made run's id is
  `<namespace>__<as>` (recipe.md, "Run ids and namespaces"), so two recipes, or one applied twice,
  can both name a run `pagerank` and the run id keeps them apart. A recipe-made run keeps
  `namespace` and `as` as fields, so it is matched to its view run record by id and to a style
  layer by `as`. A hand-started run writes neither `namespace` nor `as`; its run id is its only
  name, and binding by `as` considers only runs that carry one.
- Each run holds what actually ran: `algorithm`, `params`, `engine` (graphty-element's
  `EngineVersions`: `element`, `algorithms`, `layout`, and `plugins` when an extension computed
  it), `seed` (the seed it used, the authority), `durationMs`, `bindsTo` (see "Naming nodes and
  edges"), `fields`, and `caveats`. `caveats` is graphty-element's `Caveats` without its
  deprecated `notes` and `partialReason`, whose words are rebuilt from `facts` and `partialCause`
  so no English is frozen into the file, and without `seed`, which a reader takes from the run's
  own `seed`. In results `engine` always means `EngineVersions`.
- **Outputs are columns**: `nodes: { refs, columns }` and `edges: { refs, columns }`, one list of
  element references and one list per field, not one object per element, which would repeat every
  field name and reference at 100,000 nodes; plus `graph`, the graph-level result (modularity,
  component count).
- **`layout`**, beside `runs`, is the layout's record: `id`, the catalogue id; `algorithm`, the
  layout that drew it, as `layout.set` spells it in `algorithm` (as a run's `algorithm` names what
  ran);
  `dimension`; `options`; `seed`, the seed used; `durationMs`; `engine`, graphty-element's
  `EngineVersions`, as every run's; `bindsTo`; and `nodes: { refs, columns: { x, y, z } }`, as
  every run's output. The layout has no run id; one layout is in force at a time.

### notes

notes.md's fields (`id` as `note_` plus a ULID, `targets`, `time`, `edited`, `author`,
`mediaType`, `cites`, `done`), at notes version 2, whose targets take element references:
`{ "graph": true }`; `{ "node": { "space", "key" } }`; `{ "edge": { "load", "key" } }`;
`{ "set": "set_..." }`; `{ "result": "<run id>" }`; and `item` naming the run id. notes.md's
version 1 targets (a bare node id, an edge by `source`, `target` and `ordinal`/`among`) are
migrated.

### view

View is the record a file is opened to.

- **`camera`** and each saved view's camera hold graphty-element's `CameraState` members as they
  are (`graphty-element/src/camera/types.ts`), points as `{ x, y, z }`, except `type`, plus two
  members that record the dimension and the controller separately, so new controllers arrive
  without a new dimension and a new dimension without new controllers:
    - `dimension`: `2` or `3`, a closed value (it follows the layout's dimension).
    - `controller`: which camera controller drove it -- `orbit` and `2d` today; an open vocabulary,
      so `universal`, `fly` or a third party's controller (reverse-domain name) can be added later.
      `controller` is the authority: `CameraState`'s `type` overlaps it and is not written, and a
      reader meeting a `type` that disagrees with `controller` follows `controller`.
    - The pose is the `CameraState` members that controller reads: for the orbit controller
      `position`, `target`, `pivotRotation` and `cameraDistance`; for the 2D controller `zoom`, `pan`
      and `rotation`; and `fov` and the orthographic members where they apply.

    A reader that does not know the controller applies the members its own default controller for
    that dimension reads, and reports it; it never drops the camera.

- **`views`** (saved views, each with a `name` and a `camera`), **`selection`** (nodes and edges as
  element references), `viewRotation`, `framing`, and **`hiddenColumns`**, each a `ColumnRef`
  `{ kind, name }`.
- **`pinned`**: the pinned nodes only, each `{ node, position: { x, y, z } }`. Every other position
  is layout output.
- **`sets`**: every set, rule sets included whatever their rule names, by id. Each set is
  `{ id, name, definition }`, as version 1 writes it; `definition` is graphty-element's set
  definition, its node and edge members written as element references.
- **`visibility`**:
    - `filter`: the filter in force, in one of two forms. One expression on nodes or edges is
      written in the shape of the recipe's `graph.filter` command without its `op` (common schema
      `graphFilter`): `{ "on", "where" }`, `on` being `nodes` or `edges` and `where` an expression.
      Any other filter (a degree rule, one naming members, a group of leaves) is written as a rule
      tree in exactly the shape a rule set's `definition` holds its rule, element-naming leaves as
      element references. A reader tells the two apart by structure, not a tag: a rule tree has a
      `kind`, `graphFilter` has none. No filter in force is dropped;
    - `window`: graphty-element's `TimeWindow`. An instant bound is a `toISOString` string; a raw
      value (a step number, a year, an ordinal) is a JSON number. `attribute`, `end` and `spells` are
      graphty-element's value paths (`data.<working column>`), as `valueLabels.path` is. The window's
      own `missing`, `mode` and `timeZone` win over playback's when both are present. The element's
      `windowRaw` flag is not written;
    - `showContext`;
    - `conditions`: every condition, keep, exclude and select, as one plain list, its element leaves
      written as element references, with no nested `version` (the section's major covers it).
      `steps` is not written;
    - `hidden`: the nodes hidden from the drawing.
- **`timeline`**: `{ "at" }`, the timeline's playhead, spelled as version 1 spells it: a
  `toISOString` string for an instant, a JSON number for a raw value.
- **`order`**: one list of layer ids for the whole stack, bottom first as style.md `layers` and the
  element's `StylesApi.list` list it, style and view layers alike. Ids not found are skipped.
  `order` decides over a style section's own order (see Loading).
- **`layers`**: the layers that name elements or a dataset (see Placement rules). Each is an
  ordinary style.md layer with an `id` and element references in place of ids (edges too, which
  version 1 could not write).
- **`runs`**: the single ordered list of every algorithm run, recipe-made and hand-started alike,
  in the order made. Each record carries its run `id`; a recipe-made run its `namespace` and `as`;
  the reader's `name` for it when it has one; `algorithm`; `params` (element-naming options as
  element references); `seed`; `scope`; and `derived: true` when graphty-element minted the
  run's id, as version 1 records it, so reopening restores the id as the element's own. A view
  run record has no `style` member. Results stays
  the one place for outputs, keyed by the same run id, so a journal or a share without notes never
  gains a results section the reader did not pick.
    - `scope` is one of graphty-element's `Scope` forms: `"graph"`, `"largest-component"`,
      `{ "set": "set_..." }`, `{ "where" }`, `{ "nodes": [<node ref>] }`, `{ "define" }` (its
      element-naming leaves written as element references) or `{ "types": [...] }`. A run over the
      selection is written resolved, as `{ "nodes": [...] }`. Bare `"selection"` and `"visible"` are
      never written.
    - A run narrowed by the visible graph (a filter, a time window, keep or exclude conditions,
      hidden nodes), including a recipe-made run that ran after `graph.filter` commands, is written
      with its own scope and `"replayable": false`, and the save reports that it cannot be replayed
      exactly, since no scope form holds the run's own scope and the narrowing together. A later
      view major can add a narrowing form once graphty-element's `Scope` has one. An unknown scope
      form stops that run's replay and is kept on re-save.
- **`layout`**: the layout record in force: `id`, the catalogue id; `algorithm`, the layout's
  name, as `layout.set` spells it; `options`; `dimension`; and `engine`, graphty-element's
  `EngineVersions`, exactly as in results' `layout` and every run. Version 1's `engine` (the
  layout's name) is migrated to `algorithm`. A layout scope (`layoutScope`) is not saved, and the save reports it.

**Coordinate frame.** Positions and cameras are in graphty-element's scene frame, Babylon.js's
default (left-handed, y up), in layout units; a 2D drawing writes z as 0. Annotations keep their
file frame (y up, file units) and their `scale`. A position without a stated frame is read
mirrored by tools on a right-handed system (three.js, NetworkX's drawing, most GIS); a different
frame later would be a view major version.

## Saving

- The reader picks the sections. graphty-element writes exactly those and reports what each left
  out (an element-naming filter step in a recipe, an element-picking layer in a style saved alone,
  for example). Saving a full file with style and view moves each element-naming layer into view.
- **The refusal rule.** A save that cannot express something refuses that part and reports it.
  Nothing is ever silently simplified. A save that refuses any part of the data section writes a
  newly minted `build` in that file, so every saved run reads as stale (Partial) on reopen. This
  holds for a part refused when the file was opened, too (a source no join step names, a
  `repeatedEdges` value built as `keep`): a re-save never keeps the stamp it read when what it
  writes differs from what it read.
- **Results are optional.** Default: not saved, so opening reruns the behaviors (the 2026-11-13
  rule). A record or archive save includes them.
- **Embed or reference is the reader's choice** (owner, 2026-11-14: "that should be an option for
  the user: embed files or store references"), per source, whatever its size. Embedded: the rows
  are in the data section. Referenced: the source and how it was joined, without the rows, plus its
  copy id so a refetch that returns different data is reported. Default: embedded, so a file stands
  alone. There is no size-based automatic switch. The save report names a referenced file source
  that has no `path`. A referenced network source gets a new copy id on every open, so its keyless
  rows get new keys; when a saved reference or reader operation names one, the save report says it
  will not bind after reopening and suggests embedding the source or mapping an edge id.
- **Re-saving an opened file keeps its choices.** When a project was opened from a file, the save
  defaults are what that file held. Results are written if the file had a results section. Each
  source stays embedded or referenced as its record was, since whether its `copy` is present
  already records the choice. The new-project defaults apply only to sources and sections the file
  did not have.
- **Sections opened from a file.** A recipe section opened from a file is written back as read,
  since opening never applies it; it is rewritten from the session only when the reader asks. A
  style or settings section opened from a file keeps the header fields it was read with; only its
  layers or values come from the session.
- **Every recipe `algo.run` writes `style`**: the run's suggested-style setting, or `false` when
  any saved layer reads the run, in the style section or the view, in the same file or not.
  Otherwise applying the recipe would paint the suggested layer again on top of the saved one, and
  a layer the reader deleted would come back. Conformance case: a project with a personalized
  PageRank and its suggested layer, saved by default, opened, saved and reopened, keeps the same
  layers and the same recipe.
- **A held section is written back unchanged.** A section skipped on load (newer version,
  required extension missing, a known key holding another kind, or a data section with an unknown
  build value; see Loading) is held and written back as it was read. While it is held,
  graphty-element writes no section of that kind on its own, default style rows included; local
  changes to that kind are not saved, and the save report lists them as `{ code:
"W_SECTION_KEPT", params: { section, version, reason } }`. While a section is held, the writer
  keeps every `order` entry that names one of its layers, in the position read; only ids the
  writer actually removed from the stack leave `order`. An optional save option replaces the held
  section on purpose, and the report says so. Mixed releases on one team are the normal case, so
  without this a colleague's newer style would be silently lost on the next save.
- One save call writes either form: one section as a section file, or several as a full file.

## Loading

- The reader picks which sections of a full file to load; a section file loads its one section.
- **Opening a file restores the session.** Data rebuilds from its own join history. Style, sets,
  visibility and run records are restored under their saved ids, the layer stack exactly as saved
  (the starting rows are not written first). When the opened file holds no style section, the
  starting rows are written as for a new project, beneath view's own layers, which `order`
  arranges among themselves. Each run is rerun (the default) or its saved results are restored,
  the reader's choice per run; a run recorded with `"replayable": false` is not rerun, and its
  saved results are restored if present, otherwise it is listed as not run. When both a rerun and
  saved results exist, the report says whether they agree. Opening never paints a suggested
  layer, since the stack is restored.
- **The recipe applies only when the caller asks**, with namespacing. `runAlgorithmsOnLoad` acts
  only when new data is loaded, never when a file is opened. When a full file holds both a recipe
  and a view, the load plan reports that the recipe was not applied and the view restored.
- A results run, or results layout, with no record in an open view is restored as saved, never
  rerun, and reported. A file with neither a view nor results opens with the new-project layout.
- **data** replaces the open data. Adding a data section to open data is refused and reported; the
  reader adds that file's sources instead.
- **Every other section is added** as one undoable step, after a plan the caller can show
  (graphty-element returns the plan as neutral facts; the app words it). The plan lists held
  sections, so an app can warn the reader before an edit.
- **Loading a settings section** onto an open project sets only the keys it holds. An absent key
  means its schema default only when a file is opened as a new session.
- A **reusable section** meeting new data goes through the column mapping step, which maps
  columns and source roles; anything that cannot bind waits and switches on if matching data
  arrives (README.md, "Applying to new data"). A style section's `results.<as>`, `source.runId`
  and bare set id bind to the one open run with that `as`, or the one open set with that id or
  that id under a namespace; when none or several match, the layer is unbound and reported.
- A **dataset-bound section** binds as in "Naming nodes and edges"; one whose `bindsTo` does not
  match the open data is reported, and loads only if the caller says so.
- **Layer order.** View's `order` applies in full only when a file is opened: a stack layer it does
  not name keeps its relative place, above every layer it names, reported. On open, a layer id held
  by both the style section and view's `layers` stays with the view layer, since `order` was
  written with it; the style section's layer gets a newly minted id, is placed as a layer `order`
  does not name, and is reported. When sections are added to an open project, a loaded layer whose
  id the stack already holds gets a newly minted id, reported, written into `order` first; `order`
  then arranges only the loaded layers among themselves, and they go on top of the existing stack.
  Loading a style never replaces existing layers: it adds layers to the stack, where the reader
  orders, mutes or deletes them like any other.
- **Skipped and held sections.** An unknown `sections` key: `W_UNKNOWN_KIND`. A section whose
  version is newer than the reader knows, or that lists an extension the reader lacks (or knows
  only at a lower data major), is skipped whole and held: `{ code: "W_EXTENSION_REQUIRED", params:
{ section, extension } }` for the second. Skipping a data section leaves the sections bound to it
  unbound, which is reported. The rest of the file loads.
- **Referenced sources.** Opening fetches each again, through the usual network consent. A file
  source's `path`, and a relative `url`, resolve against the location of the file being opened,
  when the caller gives one. Otherwise the load plan lists the source as needing a file, with its
  saved name, so the app can ask the reader to pick it; a picked file whose copy id differs is
  treated as a refresh. Only a source still not found reports `{ code: "W_SOURCE_UNAVAILABLE",
params: { source } }`, supplies no elements and leaves references to them unbound.

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
   **Changing any default** is such a change: it bumps the major version of every section that
   can hold the member, view run records included, and the migration writes the old default into
   older files. That covers an algorithm's or layout's option default, written into every older
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
9. **Defaults live in the schemas.** Every default lives in its section's JSON Schema and is frozen
   for that section's major version. An absent member means that default, and an absent mapping
   role means none, never graphty-element's guess (an absent `nodes.key` means keyless rows, never
   the file's own ids).

Rules 1, 7, 8 and 9, the held-section rule and the all-or-nothing data rule below must be in the
first version 2 reader: readers already shipped cannot learn them.

## Open vocabularies and closed objects

An **open vocabulary** may gain values within a major version; an older reader meets a value it
does not know. A **closed object** may not be read by ignoring a member it does not know.

| Section       | Open vocabularies                                                                                 | What an unknown value or member does                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| wrapper       | `sections` keys                                                                                   | skipped with `W_UNKNOWN_KIND`, kept on re-save                                                              |
| every section | `dependencies.extensions` names                                                                   | the section is skipped and held (Versions rule 8)                                                           |
| data          | join step `op`, source `kind`, `copy` form, reader operation `op`                                 | the whole data section is skipped and held (below)                                                          |
| data          | `measurement` values                                                                              | drawing falls back, as container.md does for style channels                                                 |
| style         | channel names, selector kinds (`type` among them), scales, enumerated channel values, palette ids | fails that channel entry or layer alone (container.md, "Versions" rule 2)                                   |
| recipe        | command `op`, algorithm keys, layout ids, the parts of a run's `style`                            | an unknown `op` stops the replay there (recipe.md, "Replaying" rule 4)                                      |
| notes         | target kinds, item key forms                                                                      | the target reads `unsupported`, kept and written back (notes.md, "Targets" rule 6)                          |
| view          | camera controllers                                                                                | the members the default controller for its dimension reads are applied, and it is reported; kept on re-save |
| view          | run `scope` forms                                                                                 | that run's replay stops; the record is kept on re-save                                                      |

**The data section is built whole or not at all.** A value the reader does not know in a
vocabulary that shapes the build, or an unknown member of one of the data section's closed
objects, makes the reader skip the whole data section and hold it unchanged, reported with
`W_SECTION_KEPT`. It is never built in part, so nothing binds to, or saves, a partial graph. The
data section's closed objects are a source's `mapping` and `settings`, a type entry and its rules,
a join step, a reader operation, and a key in `options` that its parser does not read. Ignoring any
of these would build a different graph -- an unknown `settings.directionColumn` would give edges
the wrong direction -- under the same build stamp, so saved results would still count as a match.

The other closed objects are those of container.md, "Unknown object members" (a recipe command
and its `scope`, a style's selectors, bindings and carried palettes, a run's `style` parts), plus
element references, note targets and cites, a view run's `scope` and a set record, which are kept
unbound, `unsupported` or not replayed rather than bound by ignoring part of them.

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
- makes the data one source: a version 1 file becomes one embedded source of kind `derived`
  holding its merged graph as tables, one `join.add`, its node ids as the key column in the space
  `source:<id>`, its types carried as a column under a type rule, and an empty reader source. Its
  `metadata` holds the version 1 `sources` member verbatim (each original source's address or file
  name, credential slot, license and citation), and each node's original `_source.loads` is the
  copy column `version-1-loads`. The graph reopens exactly as saved, with every edit already in it;
- converts the session's `columns` and `issues` members: hidden columns into view; `columns.types`
  into `conversions` entries; each `declarations` entry (keyed `<kind>:<name>`) as `measurement`
  (and, for ordinal, the `enum` order) into the schema of every type of that kind carrying the
  column, and a measurement or unit declared on a column no type carries is reported as dropped,
  since an untyped column has no schema to hold it; ignored issues carry over unchanged, since an
  entry names no source; kept pairs into `issues.kept`;
- turns the `label` role into a style layer reading that column;
- converts each positional edge reference into `{ load, key }` with the key of the edge at that
  position: its id when it has one, else `"<copy id>#<position>"`;
- moves file styles, stored by element id, into `graphty.style.` columns of the migrated source,
  and their layers into view's `layers`. Each version 1 load's namespace maps to the migrated
  source's id, so `graphty.style.gexf.node.color` becomes
  `graphty.style.<source id>.node.color`, in the columns and in every layer path that reads one;
- moves style layers whose selector names elements into view's `layers`, their node ids converted
  to element references against the file's own data, and drops every layer's `kind`;
- moves the session's `visibility` member into view's `visibility` and its playback into settings;
- turns each saved run into a view run record and its outputs into results; the arrangement's
  pinned nodes become `pinned`, its other coordinates the layout's results;
- drops style.md's `styleVersion` and recipe.md's `recipeVersion`, reported, and turns notes
  version 1 targets into element references;
- rewrites positions and results from base64 bytes into plain numbers;
- migrates or drops the snapshot `session.recipe()` writes today.

Reported limitations of the migration: a migrated project cannot refresh one of its original
sources separately, which version 1 could not do either; importing an original source again adds
its nodes in their own space beside the migrated ones, and the migrated source is not refreshed by
it. A version 1 section document migrated without its project file keeps its edge targets unbound
(`W_REFERENCE_UNBOUND`), since the copy id is minted at migration; its node targets bind only when
it is migrated together with its project file.

Version 1 files carry no annotations, so none are migrated.

## What a file carries and what it names

The test: a file must mean the same in any later release, and in a build without the feature.
Versions rule 5 keeps named things honest.

| Kind of thing              | Examples                                                          | In the file                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| data                       | palettes, color scales as stops, label looks, lists, value labels | carried (owner's standing rule 6)                                                                                                       |
| content written as code    | shaders                                                           | carried as source text (self-contained-save-files.md, Part 1)                                                                           |
| assets                     | 3D models and images, sample ones included                        | carried, keyed by sha256 (assets.md)                                                                                                    |
| behaviors                  | algorithms, layouts, edge routes, place lookup                    | named, with options and seed (the engine versions in results); rerun on open unless told otherwise; their outputs in results when saved |
| code-backed drawing basics | node shapes, arrowheads, line patterns, transitions               | named; every name defined in the built-ins registry of this specification; a name is never reused for something else                    |
| large outside data         | basemap tiles, the gazetteer                                      | named, with version; what the graph took from them (looked-up coordinates) is in results when saved                                     |
| third-party extensions     | another package's shader, layout or section                       | the same rules; the extension writes its own data, and `dependencies.extensions` names it when the section cannot be read without it    |

The built-ins registry (to be written, alongside the schemas) lists each named built-in with an
exact definition: a shape's geometry, an arrowhead's outline, a line pattern's dash lengths, a
transition's curve. With it, a file that names a built-in is still readable without graphty.

## Archiving

A file saved today should be recoverable if graphty is gone. The Library of Congress judges
formats for long-term preservation by disclosure, adoption, transparency, self-documentation,
external dependencies and technical protection
(https://www.loc.gov/preservation/digital/formats/sustain/sustain.shtml). Applied here:

- **Transparent**: plain JSON, no zip, no encryption. Every file is I-JSON (RFC 7493): UTF-8 with
  no duplicate member names; a reader refuses an object with a duplicate name, since parsers
  differ on them and `JSON.parse` cannot see them.
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
  `license`. The data, view, results and settings schemas are written before release, with
  `additionalProperties: false` on every closed object (a type entry among them), and checked
  against graphty-element's types (`TableMapping`, `IssueState`, `CameraState`, `EngineVersions`,
  `RunRecord`, `Caveats`, and the set record `ElementSet`). The schemas, not this prose, are the
  home of member names.
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
(which sections, results or not, rerun or not, embed or reference, merge or keep separate on a
space overlap, which file to pick for a missing source) and words the reports.

## Changes from version 1 as built

1. Unknown members and fields are kept on re-save.
2. The nine members are regrouped into seven sections, keyed by name in the full file, each with
   the shared header; the session member is split. The wrapper loses `requires` and gains
   `$schema`, `id`, `created` and `modified`.
3. `session.recipe()` becomes the recipe section of recipe.md (a replayable command list), and the
   snapshot it writes today is migrated or dropped. `styles.toFile()` (`graphty-style`), the notes
   document and the recipe become identical to their sections.
4. Saved references name elements by record key; positional edge references and bare node ids go.
5. The data section gains full source records with copy ids, the reader source as a list of
   operations, a build stamp, one `directed`, a type registry with a JSON Schema per type, type
   conversions, data issues, the join history and annotations.
6. Opening a file restores the session; each run reruns by default, or its saved results are
   restored. Today every saved result is restored without rerunning.
7. Saving can include or leave out any section, and results; loading can pick sections.
8. Nothing the session holds is lost on a default save: every setting has a home (today
   `viewRotation`, `framing`, `runPlacement` and `layoutTransition` are dropped), and every set,
   every run record, the layout record, the layer order, element-picking layers, the filter in
   force and the time window are kept in view.
9. Positions and results are written as plain numbers.

## Open items

- **Settled with the data-store design** (design/data/data-store-options.md, sections 5 and 8):
  the element references, `bindsTo` with the build stamp and copy ids, and the data section's
  members. Its one-way doors are settled together before the data section is built; its "Needs
  the owner" list is open.
- **A narrowing run scope** in graphty-element (a time window, a filter or visibility conditions
  together with the run's own scope), so view runs recorded as not replayable can be replayed (an
  additive option, then a view major that adds the form).
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
