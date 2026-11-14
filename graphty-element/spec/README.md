# graphty documents, version 2

Status: draft. Version 2 is written and read only with graphty-element's `save-files-v2`
experiment switched on, and may change until it is released; version 1 stays the format
graphty-element writes until then.

This is the normative specification of the files graphty-element saves and opens: what each holds,
how a writer writes it and how a reader reads it. It is written for implementers who have only this
directory: the specification (this file), the JSON Schemas (`schemas/`), the built-ins registry
(`builtins.md`) and the examples (`examples/`). It ships inside the `@graphty/graphty-element` npm
package, so it stays available without the graphty.app website.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in BCP 14 (RFC 2119 and RFC 8174) when, and only when,
they appear in all capitals.

## 1. Overview

A graphty document is plain JSON (RFC 8259, UTF-8, no byte order mark). Its content is cut into
seven **sections**, each saved and loaded on its own:

| Section    | Kind               | Version | Holds                                                                                                                        | Refers to data by          |
| ---------- | ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `data`     | `graphty-data`     | 2       | the sources (embedded or referenced), the reader's edits, the type registry, data issues, the join history, the merged graph | (is the data)              |
| `style`    | `graphty-style`    | 2       | style layers, palettes, shaders as source text, the style tree, value labels, the assets the layers draw                     | name only (reusable)       |
| `recipe`   | `graphty-recipe`   | 2       | the replayable analysis steps: combine steps, filters, algorithm runs, rule sets, the layout                                 | name only (reusable)       |
| `settings` | `graphty-settings` | 1       | project settings no other section holds, and timeline playback                                                               | name only (reusable)       |
| `results`  | `graphty-results`  | 2       | the record of each run: what ran, the seed used, engine versions, duration, caveats, outputs                                 | element references (bound) |
| `notes`    | `graphty-notes`    | 2       | people's notes on the graph, its elements, sets and results                                                                  | element references (bound) |
| `view`     | `graphty-view`     | 1       | camera, saved views, selection, placed positions, sets and layers that name elements, visibility, runs a recipe cannot hold  | element references (bound) |

A **reusable** section never names a particular node or edge, so it applies to data it has never
seen. A **dataset-bound** section names nodes and edges by record key (section 6) and says which
data it was written on (`bindsTo`).

Each section is either a file of its own (a **section file**) or a member of a **full file** that
holds any subset of the sections.

## 2. File forms

### 2.1 Section files

A section file holds one section: the JSON object is the section itself. Its name SHOULD be
`<name>.graphty-<section>.json` (`fraud-look.graphty-style.json`).

### 2.2 The full file

A full file is a wrapper whose `sections` object holds sections keyed by section name. Its name
SHOULD be `<name>.graphty.json`.

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
        "data": { "kind": "graphty-data", "version": 2, "id": "d1a7c0de-...", "...": "..." },
        "style": { "kind": "graphty-style", "version": 2, "...": "..." }
    }
}
```

| Member                                                                                                      | Required | Meaning                                                                                       |
| ----------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `kind`                                                                                                      | yes      | `"graphty-document"`                                                                          |
| `version`                                                                                                   | yes      | `2`: the version of the wrapper only                                                          |
| `generator`                                                                                                 | yes      | as in the section header (3.1)                                                                |
| `sections`                                                                                                  | yes      | an object; any subset of the seven section names, at most one section of each; may be empty   |
| `$schema`, `id`, `name`, `description`, `created`, `modified`, `authors`, `license`, `keywords`, `language` | no       | as in the section header; `id` names the project                                              |
| `extensions`                                                                                                | no       | as in the section header; a third party's section goes here, keyed by its reverse-domain kind |

1. A section in a full file MUST carry its own `kind`, and that `kind` MUST be `graphty-<key>` for
   its key. A reader MUST refuse a section whose `kind` disagrees with its key
   (`E_BAD_DOCUMENT`, params `{ section }`) and load the rest.
2. `sections` is open. A reader MUST skip a key it does not know, report `W_UNKNOWN_KIND` (params
   `{ section }`), keep the value verbatim and write it back on re-save, and load every section it
   knows. A key graphty-element adds later is lower case (`^[a-z][a-z0-9-]*$`) and its value has a
   `kind` and an integer `version`.
3. There is no `requires`: any subset of sections is a valid full file.

### 2.3 The byte-for-byte rule

A section is the same JSON in both forms. Cutting a section out of a full file MUST give a valid
section file, and putting a section file into a full file MUST give a valid full file, with no
member added, removed, changed or reordered. A writer MUST write a section's members in the same
order in both forms, so that serializing either with the same serializer gives identical bytes;
whitespace between tokens is not part of the content.

A section that needs an asset carries it (3.4), so every section file stands alone. Within a full
file the same asset MAY appear in more than one section.

### 2.4 File names and media types

| Form         | Extension                 | Media type                               |
| ------------ | ------------------------- | ---------------------------------------- |
| full file    | `.graphty.json`           | `application/vnd.graphty+json`           |
| section file | `.graphty-<section>.json` | `application/vnd.graphty.<section>+json` |

A reader MUST decide what a file is from its `kind`, never from its name or media type. The
extensions and media types are published contracts and are never renamed.

## 3. The section header

Every section begins with the same members, in both file forms:

| Member                | Required                              | Meaning                                                                                                                                                                |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`             | no                                    | `https://graphty.app/schema/documents/<kind>/v<version>.json`; advisory (3.2)                                                                                          |
| `kind`                | yes                                   | `graphty-<section>`                                                                                                                                                    |
| `version`             | yes                                   | the section's own major version, an integer (section 9)                                                                                                                |
| `id`                  | data: yes; others: no                 | a string naming this section across copies (3.3)                                                                                                                       |
| `revision`            | no                                    | a SemVer 2.0.0 string: which edition of that `id` this is                                                                                                              |
| `name`, `description` | no                                    | plain text: a human name, and a sentence of what it is for                                                                                                             |
| `created`, `modified` | no                                    | when this section first existed, and when its content last changed (3.5)                                                                                               |
| `generator`           | yes                                   | `{ "name", "version" }`: the software that wrote it; for diagnosis only, no reader branches on it                                                                      |
| `authors`             | no                                    | a list of `{ "name", "uri" }`                                                                                                                                          |
| `license`             | no                                    | an SPDX license expression when one applies, else text                                                                                                                 |
| `keywords`            | no                                    | a list of strings                                                                                                                                                      |
| `language`            | no                                    | a BCP 47 tag for the section's human text                                                                                                                              |
| `dependencies`        | see 3.6                               | what the section needs from the data and from software                                                                                                                 |
| `bindsTo`             | results, notes, view: yes; others: no | which data the section was written on (6.4)                                                                                                                            |
| `origin`              | no                                    | `{ "from" }`: the URL or file name a copied-in section was taken from, for display only                                                                                |
| `extensions`          | no                                    | an object keyed by reverse-domain names; `graphty` and `graphty.*` are reserved. A reader MUST NOT interpret an extension it does not know and MUST keep it on re-save |

### 3.1 Generator

`generator.version` is the writing software's version, never a format version. A writer MUST
overwrite it on every save.

### 3.2 `$schema`

`$schema` serves editors, which validate and autocomplete from it. A writer SHOULD write it, derived
from `kind` and `version`. A reader MUST NOT fetch it and MUST decide how to read a section from
`kind` and `version` alone; a `$schema` that disagrees with them is reported
(`W_SCHEMA_MISMATCH`, params `{ section, schema }`) and otherwise ignored. The same schema is
published at `spec/schemas/<kind>/v<version>.json` in the `@graphty/graphty-element` package.

### 3.3 Identity

- `id` is REQUIRED on the data section, the one id other sections quote (`bindsTo.data`). It names
  the dataset: minted when the project first gets data, kept through refresh, same-shape replace
  and edits, and replaced only when data is loaded in replace mode.
- On other sections `id` is OPTIONAL. A reverse-domain name (`org.example-lab.card-testing`) or an
  `https:` URL is RECOMMENDED for a section others will copy.
- A copied section keeps its `id`. A newer edition of a section is the same `id` with a higher
  `revision` by SemVer precedence or, with no `revision` on either, a later `modified`.

### 3.4 Assets

A section that draws a 3D model or an image carries it in its own `assets` list, each entry the
files themselves (base64) or a URL it is kept by (`stored: "url"` with `source`). An entry's `id`
(`asset:<sha256>` or `asset:<name>`) is what the section's layers name; `asset:sample/...` is never
written.

### 3.5 Times

Every timestamp in a document MUST be written as JavaScript's `Date.prototype.toISOString()` writes
it: UTC, ending `Z` (`2026-11-14T18:00:00.000Z`).

### 3.6 Dependencies

`dependencies` says what a section needs before it can work, so a reader can say what is missing
instead of failing.

| Member       | Allowed in              | Each entry                                                                                                                            |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`    | style, recipe, settings | `{ "name", "schema" }`, or `{ "role", "schema" }` for a column known by its role in a source's mapping or settings (`weight`, `time`) |
| `types`      | style, recipe, settings | a node or edge type name                                                                                                              |
| `sources`    | style, recipe, settings | `{ "role", "columns", "types" }`: a source role the section names, and what that role supplies                                        |
| `results`    | style, recipe, settings | a run name (`as`) whose fields the section reads                                                                                      |
| `extensions` | every section           | `{ "name": "<reverse-domain>", "version": <integer> }`                                                                                |

1. A `schema` is a JSON Schema (draft 2020-12) fragment with graphty's two keywords: `measurement`
   (`categorical`, `ordinal`, `quantitative`, `time`; an open vocabulary) and `unit` (text, such as
   `USD`). An ordinal column lists its values in order in `enum`. The column mapping step checks a
   data column against it.
2. A result path (`results.pagerank.value`) MUST be listed under `results`, never under `columns`.
3. Every source a reusable section names (a combine step, a `source` leaf of a rule tree, a
   calculated source path) is named by a role listed in `sources`. When the section is applied, the
   caller maps roles to the open data's sources (by default, to the source whose id equals the
   role). An unmapped role is reported like a missing column, and what needs it is skipped.
4. **Extensions are must-understand.** `dependencies.extensions` lists the software outside
   graphty-element the section cannot be read without; `version` is the major version of the data
   that extension writes, chosen by the extension. A reader that does not know a listed extension,
   or knows it only at a lower version, MUST skip the section whole and hold it (8.5), reporting
   `W_EXTENSION_REQUIRED` (params `{ section, extension }`). An extension a section can do without
   is written only under its `extensions` member and not listed.

## 4. The sections

The schemas in `schemas/` are normative for the shape of each section; this section states the
rules a schema cannot.

The top level of every section is open: a reader MUST ignore a member it does not know, report
`W_UNKNOWN_MEMBER` (params `{ section, pointer }`) and keep it on re-save. The closed objects of
section 10 are the exceptions.

### 4.1 data

The data section holds the sources the graph is built from and the graph built from them.

| Member    | Required | Holds                                                                        |
| --------- | -------- | ---------------------------------------------------------------------------- |
| `sources` | yes      | one record per source, in no meaningful order (4.1.1)                        |
| `types`   | yes      | the type registry, in registry order (4.1.3)                                 |
| `joins`   | yes      | the join history: the steps that built the graph, in order (4.1.4)           |
| `graph`   | yes      | the merged graph as NetworkX node-link JSON (4.1.5)                          |
| `issues`  | no       | `ignored`, `kept` and `fixed` data issues (4.1.6); absent means none         |
| `rekeys`  | no       | the re-key log, oldest first: `{ "space", "was", "key" }`; absent means none |

#### 4.1.1 Source records

| Field                             | Holds                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                              | unique and never reused within the data section; contains no `:`. A writer mints `src_` plus a ULID or keeps an id given by hand                                                            |
| `label`                           | display text                                                                                                                                                                                |
| `kind`                            | `file`, `url`, `network`, `sample`, `derived` or `reader`                                                                                                                                   |
| `format`, `options`               | the reader that parsed the source and its parse options only; never identity or join choices                                                                                                |
| `origin`                          | `hash` (always), plus per kind: file `name`, `size`, `mediaType`, `path`; url `url`, `size`, `mediaType`, `etag`, `lastModified`; network its request record, credentials by slot name only |
| `mapping`                         | `nodes: { key, space, renamed }`, `edges: { edgeId, source, sourceSpace, target, targetSpace, renamed }`                                                                                    |
| `settings`                        | `weight`, `weightMeaning`, `time`, `timeUnit`, `location` or `latitude` and `longitude`, `directed`, `duplicateIds`, `unmatched`, `repeatedEdges`                                           |
| `annotations`                     | the shapes and text a session, XGMML, CX or CX2 file draws beside its graph, in the file's frame (y up, file units), with their scale                                                       |
| `metadata`, `license`, `citation` | the file's own header, license and citation                                                                                                                                                 |
| `copy`                            | where the rows are (4.1.2)                                                                                                                                                                  |
| `columns`                         | per copied table, graph-format `ColumnDecl`s keyed by source column name; present exactly when `copy` is                                                                                    |
| `loaded`, `replaced`              | when the current copy was read, and when the source was last replaced                                                                                                                       |

1. Every column name inside a source record (`mapping`, `settings`, type `rules`) is a source
   column name, before renames. Every column name elsewhere is a working name, after renames.
2. `mapping` is written resolved: every role the build used is named, an absent role means none,
   and `null` is never written. An absent `space` means each row's type space (6.1); an absent
   `sourceSpace` or `targetSpace` means the space this source's node rows, or those of a source
   earlier in join order, gave that key, else `source:<id>`. `renamed` maps source column name to
   working name. Type conversions live in the type's schema.
3. `settings` is written resolved: `duplicateIds` (`first`, `merge`, `refuse`), `unmatched` (`add`,
   `leave-out`) and `repeatedEdges` (`keep`, `error`, `first`, `last`, `sum`, `min`, `max`) always,
   and `directed` on every source once the graph holds an edge. A column role (`weight`, `time`,
   `location`, `latitude`, `longitude`) is a bare source column name.
4. A referenced or refreshed source MUST be parsed again with exactly its `format` and `options`.
5. A `file` source's `origin.path` is a POSIX path relative to the folder of the file being saved,
   never absolute and never above that folder. A writer writes it only when it knows both
   locations.
6. **Content hashes** are `sha256:` plus lower-case hex. A `file` or `url` source hashes the bytes
   as read. A `network` or `derived` source hashes the RFC 8785 canonical JSON of its copy as
   written; its rows are put in record-key order (node rows by the canonical JSON of
   `{ space, key }`, edge rows by that of `{ from, to, key }`, `key` left out when absent, strings
   compared by UTF-16 code units) before its first build. The reader source hashes the canonical
   JSON of its copy with each list sorted by the canonical JSON of its record key or reference.
7. **The reader source** (`kind: "reader"`) holds the reader's own changes. It has exactly `id`,
   `label`, `kind`, `origin` (`hash` only), `copy` and `loaded`; any other member makes the data
   section malformed. At most one exists; it is always embedded and always first in precedence.
   Its `copy` is `{ edits, added, removed, merges }`:
    - `edits`: `{ "node" | "edge": <ref>, "columns": { <working name>: { "value", "was" } } }`, `was`
      the source value it replaced. Rows in `edits` never supply or name an element.
    - `added`: rows with keys of their own, the same shape with plain values in `columns`.
    - `removed`: `{ "node" | "edge": <ref> }`; the build drops each listed element.
    - `merges`: `{ "nodes": [<kept>, <merged>] }`, in that order.

    A reader edit to a column a key, end, edge-id or type rule reads MUST be refused and never saved.

#### 4.1.2 Embedded and referenced sources

`copy` is the only field that says where a source's rows are:

- **embedded**: an object whose only members are `nodes` and/or `edges`, each an object of
  equal-length value arrays keyed by source column name. An unset cell is `null`; a `json` column
  lists its unset rows as `unset` in its `columns` entry, so its `null` is literal.
- `"graph"`: the copy equals the merged graph, which holds it once. A writer MAY write it only when
  there is one graph source, nothing joined, no reader rows, both `renamed` maps empty, no type
  conversion, no row dropped by `duplicateIds`, `repeatedEdges` `keep`, no edge left out by
  `unmatched`, and no column named after a node-link member. It is read back with each node's
  `graphty.key` as its id.
- **absent**: the source is referenced; its rows are fetched again on open and checked against
  `origin.hash`.

Embedding or referencing is the saver's choice per source, whatever its size; the default is
embedded. A `derived` source and the reader source are always embedded.

#### 4.1.3 Types

Each type entry has `name` (no `:`; also its id space), `domain` (`node` or `edge`), `plainName`
(optional, display only), `rules` and `schema`.

- `rules` lists the declaring rules, each `{ "source" }` (every row of that source's table of this
  domain has the type) or `{ "source", "column", "values" }` (rows whose source column value,
  as key text, equals one of `values` after NFC normalization).
- A node row has every type whose rules match; an edge row has the first matching type in registry
  order. A row matching no rule has the domain's default type, which has no entry and saves
  `"graphty.types": []`.
- `schema` is a JSON Schema (draft 2020-12) of the working record the type carries, with
  `measurement` and `unit`. It has no role keyword.

#### 4.1.4 The join history

`joins` lists the steps that built the graph, in order: `{ "op": "join.<shape>", "source": <source
id>, ...choices }`. The shapes of version 2 are `join.add`, `join.merge`, `join.node-values`,
`join.edge-values`, `join.edges` and `join.link`; the choices are `clash`, `repeated`, `via`,
`lookup`, `mapping`, `aggregate`, `link`, `unmatchedFrom`, `unmatchedRows`, `unknownEnds`,
`compare`, `membership` and `names`. A step is written resolved: every choice its shape reads that
has a default carries the value the build used. Every source but the reader source MUST be named by
a step (as `source` or `via`); a single-source file writes one `join.add`.

The recipe's combine steps (4.3) share this spelling. When a data section and a recipe are both
loaded and differ, the data is rebuilt from its own history and the difference is reported
(`W_JOIN_HISTORY_DIFFERS`).

#### 4.1.5 The merged graph

`graph` is NetworkX node-link JSON holding only the embedded sources' rows, recomputed on open
(it is output, never input to the build):

- It always writes `directed`, `multigraph` and `graph` (graph-level attributes, `{}` when none).
  `multigraph` is `true` exactly when two edges share both ends (an unordered pair on an undirected
  graph).
- Each node carries `"graphty.space"`, `"graphty.key"`, `"graphty.types"` (a list) and
  `"_source.loads"` (the source ids that supplied the row; `[]` for a node an edge only named).
- Each edge carries `"graphty.types"` (at most one item) and `"_source.loads"`, and its record key
  as the node-link `key` when it has one that is unique among the edges between its ends.
- The node-link `id`, `source` and `target` are handles unique within the file only.
- Every other member is a user column, by working name. The mapping's key, edge-id and end columns
  are not repeated as attributes, and a user column named after a node-link member (`id` on nodes;
  `source`, `target`, `key` on edges) is never written into the graph.

#### 4.1.6 Data issues

`issues.ignored` lists `{ "code", "source", "column" }` per issue the reader chose to ignore;
`issues.kept` lists `{ "from", "to" }` node references per pair whose repeated edges the reader
kept; `issues.fixed` lists `{ "code", "source", "column", "fixedBy" }`, oldest first, as a record
only. `code` is graphty-element's issue code (`padded-space`, `repeated-edge`, ...), `column` a
`{ "kind", "name" }` working-column reference, `fixedBy` its fix code.

#### 4.1.7 Built whole or not at all

A reader MUST build the data section completely or not at all. A value it does not know in a
vocabulary that shapes the build (a join `op`, a source `kind`, a `copy` form, a space prefix, a
`graphty.` name in a reader-source row), or an unknown member of a closed data object (10), MUST
make it skip the whole data section and hold it (8.5), reporting `W_SECTION_KEPT`.

### 4.2 style

A style section holds `layers` (REQUIRED), `palettes`, `shaders`, `tree`, `valueLabels` and
`assets`.

1. A layer has `id` (REQUIRED, unique in the section), `name`, `target` (`node` or `edge`), `kind`,
   `selector`, and `set` and/or `encode`; optionally `source`, `enabled` and `userData`.
2. `set` maps channel names (`node.color`) to values; `encode` maps channel names to bindings
   (`{ "by": <path>, "scale", "palette", ... }`). A value naming a built-in (a node shape, an
   arrowhead, a line pattern, a label look) MUST be a name from `builtins.md`.
3. Selectors: `everything`, `has` (`path`), `expression` (`where`), `top` (`path`, `n`), `member`
   (`of`: a scope string, `{ "set": <set id> }`, `{ "where" }` or `{ "types" }`), `rule` (`where`:
   a rule tree), `state` (`state`: `selected`, `hovered`, `ghosted`, `pinned`), `hover`, and
   `type` (`types`: matches an element holding any listed type). The `ids` selector never appears
   in a style section.
4. A path reads `data.<column>` or `results.<as>.<field>`: a style section names a run by its name
   (`as`), and applying a recipe rewrites the name to the run id.
5. A style section MUST NOT name an element. A writer MUST leave out, and report
   (`W_ELEMENT_NAMING_LEFT_OUT`, params `{ section, pointer }`), any layer whose selector names
   elements (an `ids` selector, a `member` of a picked or path set, a run source whose `params`
   name a node); a full file with a view section moves such layers to the view's `layers`.
6. **Data built-ins are carried.** Every palette a binding names MUST be in `palettes`, built-in
   palettes included; every shader a layer, encode key or background names MUST be in `shaders` as
   `{ "id", "text" }` with its complete shader text. A reader resolves those names in the section
   only, never against its own catalog.
7. `tree` holds the style tree, bottom first: rows `{ "layer": <layer id> }` or
   `{ "folder", "children" }`, each with optional `pin`, `locked` and `hidden`. Absent, the tree is
   one row per layer in `layers` order.
8. `valueLabels` lists `{ "column", "value", "label" }`: display text for a column's values.
9. Layers that read file-style values name their columns (`graphty.style.<namespace>.<kind>.<key>`)
   and list them in `dependencies.columns`.
10. Loading a style section adds its layers to the layer stack as one undoable step; it never
    replaces existing layers.

### 4.3 recipe

A recipe section holds `commands` (REQUIRED) and `namespace` (the namespace its run ids prefer:
lower-case letters, digits and single underscores, at most 32 characters). The commands, in order:

| `op`           | Members                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph.filter` | `where` (an expression), `on` (`nodes` default, or `edges`), `dropIsolated`, `description`                                                    |
| `algo.run`     | `algorithm`, `as`, `style` (REQUIRED), `params`, `scope`, `seed`, `sample`, `exact`, `recordedCapSeconds`, `recordedPrecision`, `description` |
| `layout.set`   | `id`, `dimension` (`2` or `3`, REQUIRED), `engine`, `options` (the seed among them), `description`                                            |
| `set.define`   | `id` (`set_...`), `name`, `where` (an expression or a rule tree naming no element), `reading`, `description`                                  |
| `join.<shape>` | a combine step (4.1.4), naming sources by role                                                                                                |

1. `as` is unique within the recipe. A run's id is `<namespace>__<as>`.
2. `scope` is `graph`, `largest-component`, `{ "where", "on" }`, `{ "types": [...] }` or
   `{ "set": <set id> }`.
3. `algo.run.style` is `true` (paint the run's suggested style), `false` (paint nothing) or an
   object naming the parts to paint. A writer MUST write `false` when any saved layer reads the run,
   in a style or view section, in the same file or not.
4. Steps carry no algorithm or layout version; the version that ran is recorded in results.
5. `params` and `options` give option values by the names graphty-element's catalog publishes.
6. A recipe never names an element. A command whose options name a node, or that ran over the
   selection, listed nodes or a picked set, is written as a view run record (4.7) instead, and the
   recipe writer reports it.
7. An unknown `op` stops the replay at that command, unless the command says `"narrows": false`,
   when only it and the commands reading its `as` are skipped. An op graphty-element adds has two
   segments in the `graph`, `algo`, `layout`, `column`, `style`, `data`, `set` or `join` family;
   any other op starts with a reverse-domain name.

### 4.4 settings

A settings section holds `settings` (REQUIRED) and `playback`.

1. `settings` is an object keyed by the paths graphty-element's `config.set` accepts, written flat
   (`"layoutBehavior.preSteps"`), with the values it accepts. It holds every such key that belongs
   to no other section; `viewRotation` and `framing` are in view, and `author`, `name`,
   `startingRows` and `editableBase` are never saved. A key a reader does not know is kept.
2. `playback` holds the timeline settings: `mode`, `step`, `missing`, `outside`, `timeZone`,
   `ageFade` and `results`.
3. Settings that name columns list them in `dependencies.columns`.

### 4.5 results

A results section holds `bindsTo` (REQUIRED, 6.4) and `runs` (REQUIRED), an object keyed by run id
(`<namespace>__<as>`); the layout's run is keyed `layout`.

1. An algorithm run holds `namespace`, `as`, `algorithm`, `params` (element-naming options as
   element references), `engine` (`{ "name", "version" }`), `seed` (the seed it actually used, or
   `null`), `durationMs`, `fields` (`{ "name", "domain": "node" | "edge" | "graph", "type" }`),
   `caveats` (including the scope, time window and filter it ran under), `graph` (graph-level
   values), and `nodes` and `edges` outputs.
2. Outputs are columns: `{ "refs": [<element references>], "columns": { <field>: [values] } }`,
   every column as long as `refs`, value `i` belonging to `refs[i]`.
3. The layout run holds `id`, `engine`, `dimension`, `options`, `seed`, `durationMs` and
   `nodes.columns.position`, a list of `[x, y, z]` (section 7).
4. A run is matched to its recipe step or view run record by `namespace` and `as`, never by
   position.

### 4.6 notes

A notes section holds `bindsTo` (REQUIRED) and `notes` (REQUIRED). Each note has `id` (`note_` plus
a ULID), `time`, `targets` (1 to 64), `text`, and optionally `edited`, `done`, `author`,
`mediaType` (default `text/plain`), `cites` and `extensions`.

Targets: `{ "graph": true }`, `{ "node": <node ref> }`, `{ "edge": <edge ref> }`,
`{ "set": "set_..." }`, `{ "result": <run id> }`, and
`{ "item": { "result": <run id>, "key": { "field", "value" } } }`. A target of a kind the reader
does not know reads as unsupported and is kept. A cite is `{ "result": <run id> }`.

### 4.7 view

A view section holds `bindsTo` (REQUIRED) and any of:

| Member          | Holds                                                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `camera`        | the camera: `dimension` (2 or 3), `controller`, and the pose: 3D `position`, `target`, `fov` (radians); 2D `pan`, `zoom`, `rotation`                        |
| `xr`            | the graph's placement in an XR room: pivot `center`, `scale`, `rotation`; never the headset pose                                                            |
| `views`         | saved views: `{ "name", "camera", "xr" }`                                                                                                                   |
| `selection`     | `{ "nodes": [...], "edges": [...] }` element references                                                                                                     |
| `placed`        | hand-placed positions and pins: `{ "node", "position", "pinned" }`                                                                                          |
| `sets`          | fixed sets (`nodes`, `edges`, `reading`), path sets (`nodes`, `edges`, `directed`) and rule sets whose rule names an element, each with its `id` and `name` |
| `visibility`    | `filter` (a rule tree or `null`), `window` (`attribute`, `end`, `spells`, `from`, `to`, `step`, `nodes`), `showContext`, `select`, `hidden`                 |
| `timeline`      | the timeline position, `at`                                                                                                                                 |
| `viewRotation`  | degrees, -360 to 360                                                                                                                                        |
| `framing`       | `{ "extent", "padding" }`, `extent` being `drawn` or `centers`                                                                                              |
| `hiddenColumns` | `{ "kind", "name" }` working columns hidden from the table view                                                                                             |
| `layers`        | style layers that pick elements, each with `after` (7)                                                                                                      |
| `runs`          | keyed by run id: the replayable record of each run a recipe cannot hold                                                                                     |

1. Positions and cameras are in the frame of section 7.
2. A camera controller is an open vocabulary (`orbit`, `2d` today). A reader that does not know the
   controller MUST apply the shared pose with its own default controller for that dimension, report
   `W_CAMERA_CONTROLLER_UNKNOWN`, and keep the camera on re-save. A member named after a controller
   holds what only that controller reads; other controllers ignore and keep it.
3. A view layer is a style layer (4.2) whose selector may be `ids` (`nodes` and/or `edges` as
   element references), whose rule leaves may name elements, and whose run source `params` hold
   element references. `after` is the `id` of the layer it sits directly above, or `"bottom"`. On
   load the layers go into the one layer stack at those places; an `after` naming no layer puts
   the layer on top.
4. A view run record holds `namespace`, `as`, `name` (display), `algorithm`, `params`, `seed`,
   `style` (REQUIRED, rule 3 of 4.3), and `scope`: a scope string, or an object with `nodes`, `set`,
   `window`, `filter` and `hidden` as the run saw them. Its outputs, when saved, are in results
   under the same run id.

## 5. Placement

Each thing a project holds goes in exactly one section:

1. **Sets.** Every set has a stable `id` (`set_` plus a ULID) beside its `name`; everything else
   names a set by `id`. A rule set goes in the recipe, as `set.define`, only when its rule names no
   element; otherwise it goes in view. Fixed and path sets go in view.
2. **Positions** a layout computed are not saved (the layout reruns, or its output is in results).
   Hand-placed and pinned positions go in view.
3. **2D or 3D** is the recipe's `layout.set.dimension`.
4. **Filters.** The recipe keeps filters that are exact `graph.filter` commands. The live filter,
   the time window, `showContext`, the select conditions and the hidden nodes go in view.
   Timeline playback goes in settings.
5. **Layers** whose selector names elements go in view (4.2 rule 5).
6. **Runs** a recipe cannot hold go in view's `runs` (4.3 rule 6), as do runs over the visible
   graph while a time window, hidden nodes or a filter with no exact `graph.filter` narrowed it.
7. **Settings**: every `config.set` key is saved in one named section or listed as never saved
   (4.4).
8. **Column renames and type conversions** belong to each source's `mapping` and its types'
   schemas; hidden columns go in view.
9. **File styles** (per-element colors, sizes and positions a GEXF or Cytoscape.js file gave) are
   columns of their source in data, `graphty.style.<namespace>.<kind>.<key>`; the layers that draw
   them stay in style and read those columns by name.

## 6. Naming nodes and edges

### 6.1 Spaces and keys

Every node has a **record key**: a space and a key. A space is named after the node's declared
type (`account`), a shared id system (`shared:<name>`), the source for undeclared ids
(`source:<source id>`), or a link step's value nodes (`link:<source id>:<column>`). A type name
never contains `:`, so these never collide. Spaces and keys are compared as exact strings after
Unicode NFC normalization, applied when read.

A key is always a JSON string: the source's id as text, a number as ECMAScript `Number::toString`
writes it (so `34`, `34.0` and `"34"` are one key), a boolean as `true` or `false`. An unkeyed
source's rows take the key `"<hex SHA-256 of the copy>#<row from 0>"` in its `source:` space.

### 6.2 Element references

```jsonc
{ "space": "account", "key": "acct-1002" }                               // a node
{ "from": { "space": "account", "key": "acct-1002" },                    // an edge with a key
  "to": { "space": "merchant", "key": "merch-77" }, "key": "pay-889" }
{ "from": { ... }, "to": { ... }, "h": "sha256:...", "n": 0 }            // an edge without one
```

1. A reference names the element by record key and nothing else; no internal id is ever saved.
   It MUST mean the same in a section file and in a full file.
2. An edge reference has `from`, `to` and either `key`, or `h` and `n` (`n` written even when 0).
   Any other shape is unbound.
3. `h` is `sha256:` plus the hex SHA-256 of the RFC 8785 canonical JSON of
   `{ "source": <minting source id>, "row": <row> }`: the edge's row as parsed, by source column
   name, leaving out the mapping's `edgeId`, `source` and `target` columns, unset cells and every
   column whose name begins with `graphty.` or `_source.`; non-finite values take their string
   forms. An edge a `join.link` step made has as its row
   `{ "link": <source column>, "value": <value as key text> }`. Reader edits never count.
4. `n` is the position, from 0, among the minting source's edges with the same ends and the same
   `h`, in build order (join step order, then row order), counting rows before any is dropped.
5. `from` and `to` are the record keys the edge's row names. On an undirected graph ends match as
   an unordered pair.

### 6.3 Binding

When `bindsTo.data` equals the open data section's `id`, or the caller agrees to bind to other
data, a reader binds each reference: a node by (space, key); an edge by its ends and `key`, else by
its ends and `h` with `n` breaking a tie. A live key wins over the re-key log, which is followed
oldest first for a key no element holds.

A reference that binds nowhere MUST be kept, never dropped: written back unchanged, bound if a
refresh brings the element back, and reported as `W_REFERENCE_UNBOUND` (params
`{ section, pointer, ref }`). On the next save a reference bound through the re-key log takes the
element's current key.

### 6.4 `bindsTo` and the fingerprint

Notes and view carry `"bindsTo": { "data": <data section id> }`. Results also carry:

- `bindsTo.sources`: each source's content hash by source id, the reader source included.
- `bindsTo.fingerprint`: `sha256:` plus the hex SHA-256 of the RFC 8785 canonical JSON of
  `{ sources, settings, types, kept, joins }`, where `sources` maps each source id to its content
  hash; `settings` maps each source id but the reader source's to an object of its `format`,
  `options`, `mapping` and `settings` (each left out when the source has none; `{}` for a source
  with none of the four); `types` is the registry in order, each entry as saved without
  `plainName`; `kept` is the kept pairs (an undirected pair's ends sorted, the list sorted); and
  `joins` is the join history. Applied fixes are left out.

| Case     | Test                                  | Result                                                                                                                    |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Match    | same data `id`, same fingerprint      | binds; saved results restore as saved when rerun is off                                                                   |
| Partial  | same data `id`, different fingerprint | binds; `W_DATA_CHANGED` names the sources whose hash differs, or says settings, types or joins changed; results are stale |
| No match | different data `id`, or no data open  | `W_DATA_MISMATCH`; loaded only if the caller agrees, then bound by key; the report names sources sharing a content hash   |

A notes or view section saved before a source's `replaced` time binds by key to the new elements,
and the binding report names the replace (`W_REPLACED_SINCE`, params `{ section, source }`).

## 7. Coordinate frame

Positions and cameras are in graphty-element's scene frame: Babylon.js's default, left-handed,
y up, in layout units. Every position is `[x, y, z]`; a 2D drawing writes z as 0. A reader on a
right-handed system (three.js, NetworkX's drawing, most GIS) mirrors z. Annotations keep their
file's frame (y up, file units) and their `scale`. A different frame would be a new major version
of the view section.

## 8. Saving and loading

### 8.1 Saving

1. The saver chooses the sections. A writer MUST write exactly those and report what each left out,
   with `W_ELEMENT_NAMING_LEFT_OUT`. One save writes either form: one section as a section file,
   or any number as a full file.
2. **Results are optional.** By default results are not saved, and opening reruns the behaviors.
3. **Embed or reference** is chosen per source (4.1.2). The save report names a referenced `file`
   source with no `path` (`W_SOURCE_NO_PATH`, params `{ source }`).
4. **Every run writes `style`** (4.3 rule 3), in recipe commands and view run records alike.
5. **Held sections are written back unchanged** (8.5).

### 8.2 Loading

1. The caller chooses which sections of a full file to load; a section file loads its one section.
2. A data section replaces the open data, or is added as another source.
3. Every other section is added as one undoable step, after a load plan the caller can show: the
   plan lists, as codes and parameters, what will be added, what cannot bind, the held sections and
   the sources that need a file.
4. A reusable section meeting new data goes through the column mapping step (3.6); anything that
   cannot bind waits, and switches on if matching data arrives.
5. A dataset-bound section binds as in 6.3; one whose `bindsTo` does not match the open data is
   reported, and loads only if the caller agrees.
6. A loaded style adds layers; it never replaces them. A view's layers go in at their `after`
   places.

### 8.3 Referenced sources

Opening a data section fetches each referenced source again, through the usual network consent. A
`file` source's `path` and a relative `url` resolve against the location of the file being opened,
when the caller gives one. Otherwise the load plan lists the source as needing a file, with its
saved name. A fetched or picked copy whose hash differs from `origin.hash` is a refresh. A source
still not found reports `W_SOURCE_UNAVAILABLE` (params `{ source }`), supplies no elements and
leaves references to them unbound.

### 8.4 Rerunning

By default the behaviors (layouts, algorithms, edge routes, place lookups) rerun on load: the
recipe's commands, then the view's run records, each under the scope it recorded. Rerunning is the
caller's option:

| Rerun | Results present | Outcome                                                             |
| ----- | --------------- | ------------------------------------------------------------------- |
| on    | either          | the runs rerun; with results, `W_RESULTS_DIFFER` when they disagree |
| off   | yes             | the saved outputs are restored as they are                          |
| off   | no              | the runs are listed as not run (`W_RUN_NOT_RUN`)                    |

A view run recorded under a time window that the reader cannot replay in a window is listed as not
run when no outputs are saved. A run whose `style` is absent paints nothing when any loaded style or
view section holds a layer reading that run.

### 8.5 Skipped and held sections

A reader MUST skip a section whole, and **hold** it, when its `version` is newer than the reader
knows (`W_SECTION_KEPT`, params `{ section, version, reason: "version" }`), when it lists an
extension the reader lacks (`W_EXTENSION_REQUIRED`, and `W_SECTION_KEPT` with
`reason: "extension"`), or when a data section cannot be built whole (4.1.7, `reason: "data"`).
The rest of the file loads. Skipping a data section leaves the sections bound to it unbound, which
is reported.

While a section is held:

1. The writer MUST write it back exactly as it was read.
2. The writer MUST NOT write a section of that kind of its own, default style rows included; local
   changes to that kind are not saved, and the save report lists them as `W_SECTION_KEPT`.
3. A save option MAY replace the held section on purpose, and the report says so.
4. The load plan lists the held sections.

## 9. Versions

1. The wrapper and each section kind have their own integer major version, independent of
   graphty-element's package version. The wrapper's version covers only the envelope.
2. The sections that existed in version 1 start at version 2 (`graphty-data`, `graphty-style`,
   `graphty-recipe`, `graphty-notes`, `graphty-results`); the new kinds start at 1
   (`graphty-settings`, `graphty-view`).
3. Within a major version every change is additive. A reader MUST ignore members and sections it
   does not know and MUST keep them when it writes the file back, except in the closed objects
   (section 10). There are no minor versions: an added optional member is known by its presence.
4. A change of meaning bumps the major version and ships, in one change, a migration from the
   previous version, its JSON Schema and a sample file.
5. **A change to a named built-in is a change of meaning.** Changing what a name in `builtins.md`
   draws, or removing it, bumps the version of every section that can name it, and the migration
   rewrites older files to keep their meaning (by carrying the earlier definition as data, or by a
   new name for it). Changing an algorithm's or layout's option default is such a change: the
   recipe's major version bumps, and its migration writes the old default into every older
   recipe's `params` or `options` that did not give the option.
6. A writer MUST write the lowest version that can express the content.
7. A reader MUST read every version a release of graphty-element has written, upgrading an older
   one on read one step at a time (version 1 to 2 to 3), and report the upgrade
   (`W_SECTION_UPGRADED`, params `{ section, from, to }`).
8. A section whose version is newer than the reader knows is skipped and held (8.5).

### 9.1 Version 1 files

A version 1 file (the nine-member `graphty-document` version 1, or a version 1 document of one kind)
is opened through a migration into the sections above. The migration regroups the members into
sections and splits the session member; derives record keys from each node's per-source
information into the spaces a new load would use and converts positional edge references against
the file's own `links`; moves renames, conversions, hidden columns, load facts, kept pairs and
fixes into their homes; converts `idPrefix`, `kindIds`, `sourceKind` and `targetKind` into spaces
and `joinOn`, `keep`, `existing` and `columnPrefix` into join steps; moves file styles into
columns of their source; moves element-picking layers, visibility, saved runs a recipe cannot hold
and outputs into view and results; turns `id`/`styleVersion` and `id`/`recipeVersion` into
`id`/`revision` and notes version 1 targets into element references; and rewrites base64 positions
and results as plain numbers.

## 10. Open vocabularies and closed objects

An **open vocabulary** may gain values within a major version; a reader meets a value it does not
know. A **closed object** MUST NOT be read by ignoring a member it does not know.

| Section       | Open vocabulary                                                                                                                 | A reader meeting an unknown value                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| wrapper       | `sections` keys                                                                                                                 | skips it with `W_UNKNOWN_KIND`, keeps it on re-save                                              |
| every section | `dependencies.extensions` names                                                                                                 | skips and holds the section (3.6 rule 4)                                                         |
| data          | join `op`, source `kind`, `copy` form, space prefix, `graphty.` names in reader rows                                            | skips and holds the whole data section (4.1.7)                                                   |
| data          | `measurement` values                                                                                                            | draws as with no measurement                                                                     |
| style         | channel names, selector kinds, scales, layer kinds, channel values (the names of `builtins.md`), palette ids, layer source `by` | fails that channel entry or layer alone, keeps it                                                |
| recipe        | command `op`, algorithm keys, layout ids, the parts of a run's `style`                                                          | an unknown `op` stops the replay (4.3 rule 7); an unknown style part is dropped and the run runs |
| notes         | target kinds, item key forms                                                                                                    | the target reads unsupported and is kept                                                         |
| view          | camera controllers                                                                                                              | 4.7 rule 2                                                                                       |
| every section | set `reading` values, rule tree leaf kinds                                                                                      | the set or layer that holds it is not evaluated, and is kept                                     |

Closed objects:

- In data: a source's `mapping` and `settings`, a type entry and its declaring rules, a join step,
  a reader-source row, the reader source itself, and a key in a source's `options` its parser does
  not read. An unknown member holds the whole data section (4.1.7).
- A recipe command and its `scope`: an unknown member skips the command and every later one
  (`E_UNKNOWN_OPTION`).
- A style's selectors, bindings and carried palettes: an unknown member is reported
  (`W_UNKNOWN_MEMBER`), the layer is applied, the member is written back.
- The parts of a run's `style`: an unknown part is dropped (`W_UNKNOWN_MEMBER`); the run runs.
- Element references, note targets and cites: one with an unknown member is kept, unbound or
  unsupported.

The schemas mark closed objects with `unevaluatedProperties: false` and leave open ones open. A
schema is normative for what a writer produces; a reader MUST NOT reject a whole document because
it fails a schema, and acts by the rules above instead.

## 11. Numbers JSON cannot carry

Anywhere in a document, a non-finite number is written as the string `"Infinity"`, `"-Infinity"` or
`"NaN"`, and an integer beyond +/-(2^53 - 1) as its decimal string. A data column holding any such
value declares `"type": ["number", "string"]` (or `["integer", "string"]`) in its type's schema, and
a string in it is read back as the number.

## 12. Archiving

- A document is plain JSON: no compression, no encryption, no undocumented binary. Positions and
  results are plain numbers; only asset files are base64, and only because they are binary files.
- The data section's `graph` is read by NetworkX:
  `networkx.node_link_graph(data, edges="links")` (`link="links"` before NetworkX 3.4). It holds
  only the embedded sources' rows, so an archive save SHOULD embed every source and SHOULD include
  results.
- Every section carries `kind`, `version` and `$schema`; every member has a schema; every named
  built-in is defined in `builtins.md`.

## 13. Codes

graphty-element reports what happened while reading or writing as `{ code, params }`. An
application words them.

| Code                          | When                                                                                    | Params                          |
| ----------------------------- | --------------------------------------------------------------------------------------- | ------------------------------- |
| `E_BAD_DOCUMENT`              | the file is not JSON, has no known `kind`, or a section's `kind` disagrees with its key | `section`                       |
| `E_UNKNOWN_OPTION`            | a recipe command or scope has a member the reader does not know                         | `section`, `pointer`            |
| `W_UNKNOWN_KIND`              | an unknown `sections` key                                                               | `section`                       |
| `W_UNKNOWN_MEMBER`            | an unknown member of an open object, selector, binding, palette or run style            | `section`, `pointer`            |
| `W_SCHEMA_MISMATCH`           | `$schema` disagrees with `kind` and `version`                                           | `section`, `schema`             |
| `W_SECTION_KEPT`              | a section is held, or a local change to a held kind was not saved                       | `section`, `version`, `reason`  |
| `W_EXTENSION_REQUIRED`        | a section lists an extension the reader lacks                                           | `section`, `extension`          |
| `W_SECTION_UPGRADED`          | an older version was migrated on read                                                   | `section`, `from`, `to`         |
| `W_ELEMENT_NAMING_LEFT_OUT`   | a writer left element-naming content out of a reusable section                          | `section`, `pointer`            |
| `W_SOURCE_NO_PATH`            | a referenced file source was saved without `path`                                       | `source`                        |
| `W_SOURCE_UNAVAILABLE`        | a referenced source could not be fetched or picked                                      | `source`                        |
| `W_REFERENCE_UNBOUND`         | an element reference binds nowhere                                                      | `section`, `pointer`, `ref`     |
| `W_DATA_CHANGED`              | same data id, different fingerprint                                                     | `section`, `sources`            |
| `W_DATA_MISMATCH`             | a bound section was written on other data, or no data is open                           | `section`, `data`               |
| `W_REPLACED_SINCE`            | a source was replaced after the bound section was written                               | `section`, `source`             |
| `W_JOIN_HISTORY_DIFFERS`      | a loaded recipe's combine steps differ from the data's join history                     | `section`                       |
| `W_CAMERA_CONTROLLER_UNKNOWN` | a camera names a controller the reader does not know                                    | `section`, `controller`         |
| `W_RUN_NOT_RUN`               | a run was neither rerun nor restored                                                    | `run`                           |
| `W_RESULTS_DIFFER`            | a rerun disagrees with the saved results                                                | `run`                           |
| `W_EDGE_MATCH_AMBIGUOUS`      | a refresh could not match unnamed parallel edges one to one                             | `source`, `from`, `to`, `count` |
| `W_SOURCE_IDS_SEQUENTIAL`     | a source's ids are exactly a 0..n-1 or n0.. sequence                                    | `source`                        |
| `W_SOURCE_UNKEYED`            | a source has no key column and no ids of its own                                        | `source`                        |
| `W_NODE_NAMED_ONLY`           | edges named nodes no source supplies, kept as named-only nodes                          | `source`, `count`               |
| `W_EDGE_END_MISSING`          | edges naming missing nodes were left out                                                | `source`, `count`               |
| `W_COLUMN_WIDENED`            | two types declare one column with different dtypes                                      | `column`                        |

## 14. Files in this directory

| Path                                 | What                                                                  |
| ------------------------------------ | --------------------------------------------------------------------- |
| `README.md`                          | this specification                                                    |
| `builtins.md`                        | the built-ins registry                                                |
| `schemas/graphty-document/v2.json`   | the full file                                                         |
| `schemas/<kind>/v<version>.json`     | each section kind at its version                                      |
| `schemas/common/v2.json`             | definitions the others share (header, element references, rule trees) |
| `examples/card-fraud.graphty.json`   | a worked example holding all seven sections                           |
| `examples/card-fraud.graphty-*.json` | each of its sections as a section file                                |
| `examples/minimal/`                  | the smallest valid file of each form                                  |
