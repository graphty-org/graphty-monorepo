# graphty documents, version 2

Status: draft. Version 2 is written and read only with graphty-element's `save-files-v2`
experiment switched on, and may change until it is released; version 1 stays the format
graphty-element writes until then, browser storage (`browserProjects`) included.

**What graphty-element's implementation does not do yet.** The implementation behind the
experiment was written against an earlier draft of this specification (edge references by ends
and row hash, a content fingerprint, a re-key log, four reader-edit sets). It does not yet write
or read the files described here.

This is the normative specification of the files graphty-element saves and opens: what each holds,
how a writer writes it and how a reader reads it. It is written for implementers who have only this
directory: the specification (this file), the JSON Schemas (`schemas/`), the built-ins registry
(`builtins.md`) and the examples (`examples/`). It ships inside the `@graphty/graphty-element` npm
package, so it stays available without the graphty.app website.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in BCP 14 (RFC 2119 and RFC 8174) when, and only when,
they appear in all capitals.

## 1. Overview

A graphty document is I-JSON (RFC 7493): UTF-8, no byte order mark, and no object with a
duplicate member name; a reader MUST refuse a document holding one. Its content is cut into seven
**sections**, each saved and loaded on its own:

| Section    | Kind               | Version | Holds                                                                                                                                         | Refers to data by          |
| ---------- | ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `data`     | `graphty-data`     | 2       | the sources (embedded or referenced), the reader source, the build stamp, the type registry, conversions, issues, the join history, the graph | (is the data)              |
| `style`    | `graphty-style`    | 2       | style layers, palettes, shaders as source text, the style tree, value labels, the assets the layers draw                                      | name only (reusable)       |
| `recipe`   | `graphty-recipe`   | 2       | the ordered commands applied to new data: join steps, filters, algorithm runs, rule sets, the layout                                          | name only (reusable)       |
| `settings` | `graphty-settings` | 1       | project settings no other section holds, and timeline playback                                                                                | name only (reusable)       |
| `results`  | `graphty-results`  | 2       | the record of each run and of the layout: what ran, the seed used, engine versions, the build it ran on, outputs                              | element references (bound) |
| `notes`    | `graphty-notes`    | 2       | people's notes on the graph, its elements, sets and results                                                                                   | element references (bound) |
| `view`     | `graphty-view`     | 1       | the session a file is opened to: camera, selection, pins, sets, visibility, layer order, element-naming layers, run records, the layout       | element references (bound) |

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

| Member                                                                                                      | Required | Meaning                                                                              |
| ----------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `kind`                                                                                                      | yes      | `"graphty-document"`                                                                 |
| `version`                                                                                                   | yes      | `2`: the version of the envelope only                                                |
| `generator`                                                                                                 | yes      | as in the section header (3.1)                                                       |
| `sections`                                                                                                  | yes      | an object of sections keyed by section name; any subset; may be empty                |
| `$schema`, `id`, `name`, `description`, `created`, `modified`, `authors`, `license`, `keywords`, `language` | no       | as in the section header; `id` names the project                                     |
| `extensions`                                                                                                | no       | extension data only, keyed by reverse-domain name; never a section (3, `extensions`) |
| `graphs`                                                                                                    | no       | reserved for a later file that holds several graphs (rule 4); never written today    |

1. **The key decides** what a section is. A key the reader knows holds the section of that name,
   so there is at most one section of each known kind. A section carries its own `kind` in both
   forms. A known key whose value carries another `kind` is skipped and held (8.4), never dropped
   and never a refusal of the file; the check that `kind` equals its key applies only to keys the
   reader knows.
2. `sections` is open. A reader MUST skip a key it does not know, whatever `kind` its value
   carries, report `W_UNKNOWN_KIND` (params `{ section }`), keep the value verbatim and write it
   back on re-save, and load every section it knows. graphty-element adds later sections (version
   history) as new keys; a third party's section goes under `sections`, keyed by
   its reverse-domain kind. Its value has a `kind` and an integer `version`.
3. There is no `requires`: any subset of sections is a valid full file.
4. `graphs` is reserved for a later file that holds several graphs. A file of one graph MUST NOT
   write it. A version 2 reader that finds it MUST hold the file's graph sections (`data`,
   `results`, `notes`, `view`) unchanged (8.4), write them back, and report `W_SECTION_KEPT` with
   `reason` `graphs`.

### 2.3 The byte-for-byte rule

A section is the same JSON in both forms. Cutting a section out of a full file MUST give a valid
section file, and putting a section file into a full file MUST give a valid full file, with no
member added, removed, changed or reordered. Whitespace between tokens is not part of the content.

A section that needs an asset carries it (3.4), so every section file stands alone. Within a full
file the same asset MAY appear in more than one section.

### 2.4 File names and media types

| Form         | Extension                 | Media type                               |
| ------------ | ------------------------- | ---------------------------------------- |
| full file    | `.graphty.json`           | `application/vnd.graphty+json`           |
| section file | `.graphty-<section>.json` | `application/vnd.graphty.<section>+json` |

A reader MUST decide what a section file is from its `kind`, never from its name or media type.
The extensions and media types are published contracts and are never renamed.

## 3. The section header

Every section begins with the same members, in both file forms:

| Member                | Required                              | Meaning                                                                                           |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `$schema`             | no                                    | `https://graphty.app/schema/documents/<kind>/v<version>.json`; advisory (3.2)                     |
| `kind`                | yes                                   | `graphty-<section>`                                                                               |
| `version`             | yes                                   | the section's own major version, an integer (section 9)                                           |
| `id`                  | data: yes; others: no                 | a string naming this section across copies (3.3)                                                  |
| `name`, `description` | no                                    | plain text: a human name, and a sentence of what it is for                                        |
| `created`, `modified` | no                                    | when this section first existed, and when its content last changed (3.5)                          |
| `generator`           | yes                                   | `{ "name", "version" }`: the software that wrote it; for diagnosis only, no reader branches on it |
| `authors`             | no                                    | a list of `{ "name", "uri" }`                                                                     |
| `license`             | no                                    | an SPDX license expression when one applies, else text                                            |
| `keywords`            | no                                    | a list of strings                                                                                 |
| `language`            | no                                    | a BCP 47 tag for the section's human text                                                         |
| `dependencies`        | see 3.6                               | what the section needs from the data and from software                                            |
| `bindsTo`             | results, notes, view: yes; others: no | `{ "data": <data section id> }`: which data the section was written on (6.4)                      |
| `origin`              | no                                    | `{ "from" }`: the URL or file name a copied-in section was taken from, for display only           |
| `extensions`          | no                                    | keyed by reverse-domain names; `graphty` and `graphty.*` are reserved; kept unread on re-save     |

`name`, `description`, `created`, `modified`, `license`, `$schema`, `authors`, `keywords` and
`language` are optional text with no rules attached: no reader acts on them beyond showing them.
There is no `revision`.

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
  the dataset: minted when the project first gets data, and kept through refresh, replace and
  edits.
- On other sections `id` is OPTIONAL. A reverse-domain name (`org.example-lab.card-testing`) or an
  `https:` URL is RECOMMENDED for a section others will copy; any unique string otherwise. A
  copied section keeps its `id`.
- **Minted ids.** A source id is `src_` plus a ULID, minted by graphty-element, never chosen by
  hand and never reused; the reader source's id is always `reader`. A name the caller gives a
  source goes in its `label`. A set id is `set_` plus a ULID; a note id is `note_` plus a ULID.
  A run id is any string matching `[A-Za-z0-9_.:-]+`, in graphty-element's own minted form
  (`<namespace>__<as>` for a recipe-made run); run ids are restored as saved, and a new one never
  reuses an id a loaded section names.

### 3.4 Assets

A section that draws a 3D model or an image carries it in its own `assets` list, each entry the
files themselves (base64) or a URL it is kept by (`stored: "url"` with `source`). An entry's `id`
(`asset:<sha256>` or `asset:<name>`) is what the section's layers name; `asset:sample/...` is never
written.

### 3.5 Times

Every timestamp MUST be written as JavaScript's `Date.prototype.toISOString()` writes it: UTC,
ending `Z` (`2026-11-14T18:00:00.000Z`).

### 3.6 Dependencies

`dependencies` says what a section needs before it can work, so a reader can say what is missing
instead of failing.

| Member       | Allowed in              | Each entry                                             |
| ------------ | ----------------------- | ------------------------------------------------------ |
| `columns`    | style, recipe, settings | `{ "kind", "name", "schema" }`, and nothing else       |
| `types`      | style, recipe, settings | a node or edge type name                               |
| `sources`    | style, recipe, settings | a source role name                                     |
| `results`    | style, recipe, settings | a run name (`as`) whose fields the section reads       |
| `extensions` | every section           | `{ "name": "<reverse-domain>", "version": <integer> }` |

1. A `columns` entry names a working column as graphty-element's `ColumnRef` does: `kind`
   (`"node"` or `"edge"`, REQUIRED) and `name`. The column mapping step matches it within that
   table only. `schema` is a JSON Schema (draft 2020-12) fragment with graphty's two keywords:
   `measurement` (`categorical`, `ordinal`, `quantitative`, `time`; an open vocabulary) and `unit`
   (text, such as `USD`). An ordinal column lists its values in order in `enum`.
2. A result path (`results.pagerank.value`) MUST be listed under `results`, never under `columns`.
3. Every source reference in a reusable section (a join step, a rule tree's `source` leaf, a
   calculated source path) names a role listed in `sources`. When the section is applied, the
   caller maps roles to the open data's sources as it maps columns. A role maps by default only
   when exactly one open source has that `label`; when none or several do, it is unmapped,
   reported like a missing column, and what needs it is skipped. A writer that would give two
   sources of one recipe the same role MUST refuse that part and report it.
4. **Extensions are must-understand.** `dependencies.extensions` lists the software outside
   graphty-element the section cannot be read without; `version` is the major version of the data
   that extension writes, chosen by the extension, never its package version. A reader that does
   not know a listed extension, or knows it only at a lower version, MUST skip the section whole
   and hold it (8.4), reporting `W_EXTENSION_REQUIRED` (params `{ section, extension }`). An
   extension a section can do without is written only under its `extensions` member and not
   listed.

## 4. The sections

The schemas in `schemas/` are normative for the shape of each section; this section states the
rules a schema cannot. The top level of every section is open: a reader MUST ignore a member it
does not know, report `W_UNKNOWN_MEMBER` (params `{ section, pointer }`) and keep it on re-save.
The closed objects of section 10 are the exceptions. Every default lives in the section's schema
(9 rule 9).

### 4.1 data

| Member          | Required | Holds                                                                                         |
| --------------- | -------- | --------------------------------------------------------------------------------------------- |
| `id`            | yes      | the dataset's id (3.3)                                                                        |
| `build`         | yes      | the build stamp, a ULID (4.1.1)                                                               |
| `directed`      | yes      | the only direction input                                                                      |
| `repeatedEdges` | no       | one value for the whole graph (`keep` default, `error`, `first`, `last`, `sum`, `min`, `max`) |
| `sources`       | yes      | one record per source (4.1.2), the reader source among them (4.1.4)                           |
| `types`         | yes      | the type registry, in registry order (4.1.5)                                                  |
| `conversions`   | no       | type conversions (4.1.6)                                                                      |
| `issues`        | no       | `ignored` and `kept` (4.1.7)                                                                  |
| `joins`         | yes      | the join history (4.1.8)                                                                      |
| `graph`         | yes      | the merged graph as NetworkX node-link JSON (4.1.9)                                           |

#### 4.1.1 The build stamp and direction

A writer that changes a build input -- a source copy, a mapping or setting, a type, a join step, a
kept pair, `directed`, `repeatedEdges`, a conversion, a reader operation -- MUST mint a new
`build`. A save that refuses any part of the data section (8.1 rule 2) MUST write a newly minted
`build` in that file, a part refused when the file was opened included (a source no join step
names, a `repeatedEdges` value built as `keep`): a re-save never keeps the stamp it read when
what it writes differs from what it read. Nothing is canonicalized or hashed to compare builds; a hand-edited section
that keeps its old stamp makes its results look current, which is the accepted cost.

`directed` is always written. Reader-drawn edges follow it; the node-link graph's own `directed` is
written from it and never read. A source file's own direction goes in that source's `metadata`; a
source that disagrees is read under `directed` and reported.

#### 4.1.2 Source records

A source record has exactly these fields: `id`, `label`, `kind`, `format`, `options`, `origin`,
`mapping`, `settings`, `annotations`, `metadata`, `license`, `citation`, `copy`, `columns`,
`loaded`.

| Field                             | Holds                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                              | `src_` plus a ULID (3.3)                                                                                                                                                                                                                                                                                                       |
| `label`                           | display text, including any name the caller gives; also the default role match (3.6 rule 3)                                                                                                                                                                                                                                    |
| `kind`                            | `file`, `url`, `network`, `sample`, `derived` or `reader`                                                                                                                                                                                                                                                                      |
| `format`, `options`               | the parser and its parse options only; never identity or join choices                                                                                                                                                                                                                                                          |
| `origin`                          | `copy`, the copy id (always); plus per kind: file `name`, `size`, `mediaType`, `path`; url `url`, `size`, `mediaType`, `etag`, `lastModified`; network exactly `url`, `credentials` (`{ slot }`), `etag`, `lastModified` and `ledger` (rule 7); sample `dataset` and version, or a generated sample's `generator` and `params` |
| `mapping`                         | per table, graphty-element's `TableMapping` names (4.1.3)                                                                                                                                                                                                                                                                      |
| `settings`                        | closed: `duplicateIds` (`first` default, `merge`, `refuse`) and `unmatched` (`add` default, `leave-out`)                                                                                                                                                                                                                       |
| `annotations`                     | the shapes and text a source draws beside its graph, in the source's frame (y up, its own units), with their scale                                                                                                                                                                                                             |
| `metadata`, `license`, `citation` | the file's own header (its own direction among it), license and citation                                                                                                                                                                                                                                                       |
| `copy`                            | the rows (embedded), or absent (referenced)                                                                                                                                                                                                                                                                                    |
| `columns`                         | graph-format `ColumnDecl`s grouped by table, `{ nodes: { <working name>: decl }, edges: {...} }`; present exactly when `copy` is                                                                                                                                                                                               |
| `loaded`                          | when the current copy was read                                                                                                                                                                                                                                                                                                 |

1. **The copy id.** `origin.copy` is `sha256:` plus lower-case hex of the bytes as read for file,
   url and downloaded sample sources, and a ULID minted whenever that copy changes for network,
   derived and reader sources. A generated sample has no bytes: its copy id is a ULID and it is
   always embedded; its `generator` and `params` are only what a refresh runs again. An embedded copy and a referenced one carry the same copy id; a refetch is
   checked against it. Until a writer keeps a log of the reader's edits, removes and merges, a
   source whose rows the reader edited, removed or merged is always embedded, whatever the saver
   asked, and its copy id is a ULID minted for that copy whatever its kind, since its rows are no
   longer the bytes read (the operations it folds in are reported, 8.1 rule 2).
2. **Working column names everywhere.** Every column name in a document is a working name, after
   renames. A column's source name appears only in `mapping.<table>.renamed` and in its
   `ColumnDecl.origin.title`.
3. **Embedded copies are tables**: an object whose only members are `nodes` and/or `edges`, each an
   object of equal-length value arrays keyed by working column name, rows in the order read. An
   unset cell is `null`; a `json` column lists its unset rows as `unset` in its `columns` entry, so
   its `null` is literal. A node-link source is copied as tables, its graph attributes in
   `metadata`. Any other object is an unknown copy form (4.1.10). `columns` is rebuild and
   re-export input only, never read for meaning.
4. Embedding or referencing is the saver's choice per source, whatever its size; the default is
   embedded. A `derived` source and the reader source are always embedded, and so is a `file`
   source whose `path` the writer does not know, since no reference can stand for it (8.1 rule 4).
5. A referenced or refreshed source MUST be parsed again with exactly its `format` and `options`,
   never a guessed one.
6. A `file` source's `origin.path` is a POSIX path relative to the folder of the file being saved,
   never absolute and never above that folder, written only when the writer knows both locations.
   An `origin` member the writer does not know is left out, never invented.
7. **A network source's `origin`** is closed: `copy`, `url`, `credentials` (`{ "slot" }`, the
   credential slot's name, never a secret), `etag`, `lastModified` and `ledger`, the request
   history a refresh replays, written as graphty-element's `SourceLoadRecord` with its `key` set to
   the source id.

#### 4.1.3 The mapping

`nodes` holds `key`, `space`, `weight`, `weightMeaning`, `time`, `timeUnit`, `latitude`,
`longitude`, `coordinates`, `country`, `region`, `city` and `renamed`; `edges` holds `edgeId`,
`source`, `sourceSpace`, `target`, `targetSpace`, `weight`, `weightMeaning`, `time`, `timeUnit` and
`renamed`. Each role is a working column name; `renamed` maps source column name to working name.

1. An absent role means none, never graphty-element's guess. Nothing is read from a column the
   mapping does not name.
2. With `nodes.key` absent every node row is keyless and in the space `source:<source id>`.
   `nodes.space` is written exactly when `nodes.key` is. `sourceSpace` and `targetSpace` are always
   written.
3. A file's own ids (GraphML `n0`, a node-link `id`) are only what graphty-element proposes as the
   key at load time; the chosen column is written to `key` like any other role.
4. A `label` role is saved as a style layer reading that column; a save that cannot write that
   layer refuses the role and reports it.

#### 4.1.4 The reader source

The reader's own changes are one source of kind `reader`, at most one per data section. It has
exactly `id` (`reader`), `label`, `kind`, `origin` (`copy` alone, a ULID minted on every edit),
`copy` and `loaded`; any other field holds the data section. Its copy is
`{ "operations": [...] }`, in the order made, applied in order after the join steps and the
conversions:

| `op`     | Members                                                                                                           | What it does                                                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `merge`  | `into`, `from`: node references                                                                                   | merges `from` into `into`; `into` is kept, with its key                                                                                                                  |
| `remove` | `node` or `edge`: a reference                                                                                     | drops the element; a node takes its edges with it, whatever `unmatched` says                                                                                             |
| `add`    | `node: { space, key }`, or `edge: { "load": "reader", key }` with `from` and `to`; `columns`; `dtypes` (REQUIRED) | adds an element whose `key` is a ULID minted when it is made; `dtypes` gives each column's graph-format dtype, and cells are written and read as a copy's (4.1.2 rule 3) |
| `edit`   | `node` or `edge`: a reference; `column`; `value`; `was`                                                           | sets one cell; `was` is the value it replaced                                                                                                                            |

An operation naming an absent element applies to nothing and is reported. Operations are written
as recorded. An edit to a column a type rule, or a key, end or edge-id role, reads MUST be refused
and never saved. A fix is saved as what it did: `edit` operations or a `conversions` entry.

#### 4.1.5 Types

Each type entry is closed: `name` (no `:`), `kind` (`"node"` or `"edge"`), `plainName` (display
only), `rules` and `schema`.

- `rules` is a list of closed objects `{ source, end, column, values }`. `end` (`"source"` or
  `"target"`, node types only) types the nodes that source's edge rows name at that end; absent,
  the rule reads the source's node rows. Without `column` every row read has the type; with it,
  `values` lists the cell values meaning this type, compared as exact strings after NFC, cells
  turned to text as keys are (11).
- A node has every type whose rules match a row that supplies or names it; an edge takes the first
  matching type in registry order. A row matching no rule has the default type, which has no name
  and no entry: its element writes `"graphty.types": []`, and no selector or scope names it.
- `schema` is a JSON Schema (draft 2020-12) of the working record the type carries, with
  `measurement` and `unit`. It has no role keyword.

#### 4.1.6 Conversions

`conversions` lists `{ kind, name, type }`: graphty-element's `ColumnRef` plus its `ValueType`
(`text`, `number`, `boolean`, `date`, `category`). Each converts the whole working column across
every source; a value that does not convert becomes `null`. The build applies the list after the
join steps and before the reader operations.

#### 4.1.7 Data issues

`issues.ignored` lists `{ code, kind, name }`, exactly the parts of graphty-element's issue id:
`code` its issue code (`padded-space`, `repeated-edge`, ...), `kind` (`"node"` or `"edge"`) always
written, `name` the working column name when the issue has a column. `issues.kept` lists
`{ from, to }` node references, the pairs whose repeated edges the reader kept.

#### 4.1.8 The join history

`joins` lists the steps that built the graph, in order: `{ "op", "source", ...choices }`, naming
sources by id. The shapes are `join.add` (a plain load), `join.merge`, `join.node-values`,
`join.edge-values` (with a REQUIRED `edges` member naming the source whose edge keys the rows
match) and `join.edges`; the choices are graphty-element's `JoinChoices` names `clash`,
`repeated`, `via`, `lookup`, `mapping`, `aggregate`, `unmatchedFrom`, `unmatchedRows`, `compare`,
`membership` and `names`. Where no choice decides, precedence is join step order, then row order.

1. A source no step names is not built, and is reported; a one-source file writes one `join.add`.
2. A join step that makes elements from no row (a link step), connect's "a node per row" form, and
   the choices `keys` onto a graph column, `columns`, `ignoreCase` and `ignoreSpaces` have no
   version 2 spelling: saving one refuses that part and reports it.
3. A clashing column kept twice is named `<column> (<source id>)`: when a step's source gives a
   node a value for a column the node already holds from an earlier source, and the two differ,
   the later value is kept under that name. When that name is taken too (one source giving two
   values of one name), ` 2`, ` 3`, ... is appended until it is free (`<column> (<source id>) 2`).
   The names `id` (and on edges `source` and `target`) are held by an element record's own
   fields, so a column added to a copy beside the source's own columns that would take one of them
   is named `<column> (<source id>)` instead; a source's own key and end columns keep their names.
4. The recipe's join steps (4.3) share this spelling. Opening a file rebuilds the data from its own
   history; the recipe's steps apply to new data only when the caller asks.

#### 4.1.9 The merged graph

`graph` is NetworkX node-link JSON holding only the embedded sources' rows, recomputed on open (it
is output, never input to the build):

- It always writes `directed`, `multigraph` and `graph` (graph-level attributes, `{}` when none).
  `multigraph` is `true` exactly when two edges share both ends (an unordered pair on an
  undirected graph), never a reader choice.
- Each node carries `"graphty.space"`, `"graphty.key"`, `"graphty.types"` and `"_source.loads"`
  (the source ids that supplied the row; `[]` for a node an edge only named, which keeps its key
  when the file is saved again and is never a reader addition). `reader` is listed only on an
  element the reader added; an edit does not add it, and a merge keeps the union of both nodes'
  lists.
- Each edge carries `"graphty.load"`, `"graphty.key"`, `"graphty.types"` (at most one item) and
  `"_source.loads"`. graphty never writes a node-link `key`.
- The node-link `id`, `source` and `target` are handles unique within the file only, since a key
  repeats across spaces.
- Every other member is a working column, by working name: every working column is written, key,
  end, edge-id and type-rule columns included, even one that repeats `"graphty.key"`. A column
  named after a node-link handle (`id`, `source`, `target` or `key`) is written as
  `<name> (column)`.

#### 4.1.10 Built whole or not at all

A reader MUST build the data section completely or not at all. A value it does not know in a
vocabulary that shapes the build (a join `op`, a source `kind`, a `copy` form, a reader operation
`op`), or an unknown member of a closed data object (10), MUST make it skip the whole data section
and hold it (8.4), reporting `W_SECTION_KEPT`.

### 4.2 style

A style section holds `layers` (REQUIRED), `palettes`, `shaders`, `tree`, `valueLabels` and
`assets`.

1. A layer has `id` (REQUIRED, unique in the section), `name`, `target` (`node` or `edge`),
   `selector`, and `set` and/or `encode`; optionally `source`, `enabled` and `userData`. A layer
   has no `kind`: there are no special layers. `source.by` is `run`, `template` or `plugin`; a
   layer no run, template or plugin made writes no `source`, in style and view alike.
2. `set` maps channel names (`node.color`) to values; `encode` maps channel names to bindings
   (`{ "by": <path>, "scale", "palette", ... }`). A value naming a built-in (a node shape, an
   arrowhead, a line pattern, a label look) MUST be a name from `builtins.md`.
3. Selectors: `everything`, `has` (`path`), `expression` (`where`), `top` (`path`, `n`), `member`
   (`of`: `graph`, `largest-component`, `{ "set": <set id> }`, `{ "where" }` or `{ "types" }`),
   `rule` (`where`: a rule tree), `state`, `hover`, and `type` (`types`: matches an element
   holding any listed type). The `ids` selector never appears in a style section.
4. A path reads `data.<column>` or `results.<as>.<field>`: a style section names a run by its name
   (`as`), and so does a layer's `source.runId`. A bare set id names a recipe's set.
5. A style section MUST NOT name an element or a dataset. A writer MUST leave out, and report
   (`W_ELEMENT_NAMING_LEFT_OUT`, params `{ section, pointer }`), every layer section 5 rule 5
   places in view.
6. **Data built-ins are carried.** Every palette a binding names MUST be in `palettes`; every shader
   a layer, encode key or background names MUST be in `shaders` as `{ "id", "text" }`.
7. `tree` holds the style tree, bottom first: rows `{ "layer": <layer id> }` or
   `{ "folder", "children" }`, each with optional `pin`, `locked` and `hidden`.
8. `valueLabels` lists `{ path, value, label }`, `path` a value path (`data.<column>`,
   `results.<as>.<field>`).

### 4.3 recipe

A recipe section holds `commands` (REQUIRED) and `namespace`. The commands, in order:

| `op`           | Members                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph.filter` | `where` (an expression), `on` (`nodes` default, or `edges`), `dropIsolated`, `description`                                                    |
| `algo.run`     | `algorithm`, `as`, `style` (REQUIRED), `params`, `scope`, `seed`, `sample`, `exact`, `recordedCapSeconds`, `recordedPrecision`, `description` |
| `layout.set`   | `id`, `dimension` (`2` or `3`, REQUIRED), `algorithm`, `options` (the seed among them), `description`; no `engine`                            |
| `set.define`   | `id` (`set_` plus a ULID, bare), `name`, `where` (an expression or a rule tree naming no element), `reading`, `description`                   |
| `join.<shape>` | a join step (4.1.8), naming sources by role                                                                                                   |

1. `as` is unique within the recipe. A run's id is `<namespace>__<as>`.
2. `scope` is `graph`, `largest-component`, `{ "where", "on" }`, `{ "types": [...] }` or
   `{ "set": <set id> }`.
3. Every `algo.run` writes `style`: the run's suggested-style setting, or `false` when any saved
   layer reads the run, in a style or view section, in the same file or not.
4. Steps carry no algorithm or layout version; the version that ran is recorded in results and
   view. A recipe says what to run, not what ran: `layout.set` names the layout in `algorithm`
   and has no `engine`.
5. A recipe never names an element. A rule naming an element cannot be a recipe step: the writer
   leaves it out and reports it.
6. **Applying under a namespace** writes each `set.define` id as `set_<namespace>.<ULID>` and
   rewrites every reference to it in the applied sections, as run ids are rewritten;
   `onRepeat: "replace"` replaces the earlier application's sets.
7. An unknown `op` (`E_UNKNOWN_COMMAND`) stops the replay at that command.

### 4.4 settings

A settings section holds `settings` and `playback`.

1. `settings` is keyed by the paths graphty-element's `config.set` accepts (its `CONFIG_KEYS`),
   written flat and dotted (`"layoutBehavior.preSteps"`). Every `CONFIG_KEYS` entry is saved in
   one named section or listed as not saved with its reason: `viewRotation` and `framing` are in
   view; `layoutTransition` and `runPlacement` are here; `author`, `startingRows`, `editableBase`
   and `name` are never saved. No `data.*` key is written here: each has its home in the data
   section, and a key with none is refused on save and reported (8.1 rule 2). A key a reader does
   not know is kept.
2. `playback` holds timeline playback: `mode`, `step`, `missing`, `outside`, `timeZone`, `ageFade`
   and `results`.
3. Settings that name columns list them in `dependencies.columns`.
4. Loading a settings section onto an open project sets only the keys it holds; an absent key
   means its schema default only when a file is opened as a new session.

### 4.5 results

A results section holds `bindsTo` (REQUIRED, `{ data }` only), `runs` (REQUIRED) and `layout`.

1. `runs` is an object keyed by run id. A recipe-made run writes `namespace` and `as`; a
   hand-started run writes neither, and its run id is its only name.
2. A run holds what actually ran: `algorithm`, `params` (element-naming options as element
   references), `engine` (graphty-element's `EngineVersions`: `element`, `algorithms`, `layout`,
   and `plugins` when an extension computed it), `seed` (the seed it used, or `null`),
   `durationMs` (absent when the run was not timed, never 0), `bindsTo` (6.4), `fields` (`{ name, kind, type }`, `kind` being `node`, `edge` or
   `graph`), `caveats`, `graph` (graph-level values), and `nodes` and `edges` outputs.
3. `caveats` is graphty-element's `Caveats` without its deprecated `notes` and `partialReason`
   (the words are rebuilt from `facts` and `partialCause`) and without `seed`: the run's own
   `seed` is the authority, and a reader puts it back into the caveats. Its `method` is an
   identifier (the algorithm's key, or a method of its own such as `stoer-wagner`), never
   reader-facing text: an application names it.
4. Outputs are columns: `{ "refs": [<element references>], "columns": { <field>: [values] } }`,
   every column as long as `refs`.
5. `layout` is the layout's record: `id`, the catalogue id; `algorithm`, the layout that drew it,
   as `layout.set` spells it in `algorithm`; `dimension`; `options`; `seed`; `durationMs` (absent
   when the layout was not timed, never 0, as for a run); `engine`
   (`EngineVersions`, as every run's); `bindsTo`; and `nodes: { refs, columns: { x, y, z } }`. It
   has no run id; one layout is in force at a time. In results, `engine` always means
   `EngineVersions`.

### 4.6 notes

A notes section holds `bindsTo` (REQUIRED) and `notes` (REQUIRED). Each note has `id` (`note_` plus
a ULID), `time`, `targets` (1 to 64), `text`, and optionally `edited`, `done`, `author`,
`mediaType` (default `text/plain`), `cites` and `extensions`.

Targets: `{ "graph": true }`, `{ "node": <node ref> }`, `{ "edge": <edge ref> }`,
`{ "set": "set_..." }`, `{ "result": <run id> }`, and
`{ "item": { "result": <run id>, "key": { "field", "value" } } }`. A target of a kind the reader
does not know reads as unsupported and is kept. A cite is `{ "result": <run id> }`.

### 4.7 view

View is the record a file is opened to. It holds `bindsTo` (REQUIRED) and any of:

| Member          | Holds                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `camera`        | graphty-element's `CameraState` members as they are but `type`, points as `{ x, y, z }`, plus `dimension` and `controller` (rule 2) |
| `views`         | saved views: `{ "name", "camera" }`                                                                                                 |
| `selection`     | `{ "nodes": [...], "edges": [...] }` element references                                                                             |
| `pinned`        | the pinned nodes only: `{ "node", "position": { "x", "y", "z" } }`                                                                  |
| `sets`          | every set: `{ "id", "name", "definition" }`                                                                                         |
| `visibility`    | `filter`, `window`, `showContext`, `conditions`, `hidden` (rule 4)                                                                  |
| `timeline`      | `{ "at" }`, the timeline's playhead, as version 1 spells it                                                                         |
| `viewRotation`  | degrees, -360 to 360                                                                                                                |
| `framing`       | `{ "extent", "padding" }`, `extent` being `drawn` or `centers`                                                                      |
| `hiddenColumns` | `{ "kind", "name" }` working columns hidden from the table view                                                                     |
| `order`         | one list of layer ids for the whole stack, bottom first, style and view layers alike                                                |
| `layers`        | the layers that name elements or a dataset (section 5 rule 5)                                                                       |
| `runs`          | the single ordered list of every run record, in the order made (rule 5)                                                             |
| `layout`        | the layout record in force: `{ id, algorithm, options, dimension, engine }` (rule 7)                                                |

1. Positions and cameras are in the frame of section 7. Every other position is layout output.
2. **Camera.** `dimension` (`2` or `3`, closed; it follows the layout's dimension) and
   `controller` (`orbit` and `2d` today; an open vocabulary, a third party's controller by
   reverse-domain name) are recorded separately. The pose is the `CameraState` members that
   controller reads: orbit `position`, `target`, `pivotRotation`, `cameraDistance`; 2D `zoom`,
   `pan`, `rotation`; and `fov` and the orthographic members where they apply. `controller` is the
   authority: `CameraState`'s overlapping `type` is not written, and a reader meeting a `type`
   that disagrees with `controller` follows `controller`. A reader
   that does not know the controller MUST apply the members its own default controller for that
   dimension reads, report `W_CAMERA_CONTROLLER_UNKNOWN`, and keep the camera on re-save.
3. **Sets.** `definition` is graphty-element's set definition (`fixed`, `rule` or `path`), its node
   and edge members written as element references and its source leaves by source id. View holds
   every set in force, rule sets included whatever their rule names.
4. **Visibility.** `filter` is the filter in force, in one of two forms. One expression on nodes
   or edges is written in the shape of a `graph.filter` command without its `op` (common schema
   `graphFilter`): `{ "on", "where" }`, `on` being `nodes` or `edges`. Any other filter (a degree
   rule, one naming members, a group of leaves) is written as a rule tree in exactly the shape a
   rule set's `definition` holds its `where` (common schema `boundRuleTree`), element-naming
   leaves as element references. A reader tells the two apart by structure, not a tag: a rule
   tree has a `kind`, a `graphFilter` has none. No filter is left out. `window` is graphty-element's `TimeWindow`: an instant bound is
   a `toISOString` string, a raw value (a step number, a year) a JSON number; `attribute`, `end`
   and `spells` are value paths (`data.<working column>`); the window's own `missing`, `mode` and
   `timeZone` win over playback's; the element's `windowRaw` flag is not written. `conditions`
   holds every keep, exclude and select condition as one plain list, element leaves as element
   references, with no nested `version`. `hidden` holds the nodes hidden from the drawing.
5. **Run records.** Each carries its run `id`; a recipe-made run its `namespace` and `as`; the
   reader's `name` when it has one; `algorithm`; `params` (element-naming options as element
   references); `seed`; `scope`; `"derived": true` when graphty-element minted the run's id, as
   version 1 records it; and, when it cannot be replayed exactly, `"replayable": false`.
   A view run record has no `style`. `scope` is one of graphty-element's `Scope` forms:
   `"graph"`, `"largest-component"`, `{ "set" }`, `{ "where" }`, `{ "nodes": [<node ref>] }`,
   `{ "define" }` or `{ "types" }`. A run over the selection is written resolved as
   `{ "nodes" }`; bare `"selection"` and `"visible"` are never written. A run narrowed by the
   visible graph (a filter, a time window, keep or exclude conditions, hidden nodes), including a
   recipe-made run that ran after `graph.filter` commands, is written with its own scope and
   `"replayable": false`, and the save reports that it cannot be replayed exactly.
6. **Layers.** A view layer is a style layer (4.2) whose selector may be `ids` (`nodes` and/or
   `edges` as element references), whose `member` may list nodes, whose rule leaves may name
   elements, and whose run source `params` hold element references. A layer reading a run no
   recipe step makes, or a run or set whose name several open ones share, names it by run id or
   full set id.
7. **Layout.** The layout record names the layout in `algorithm`, as `layout.set` spells it, and
   `engine` is graphty-element's `EngineVersions`, exactly as in results' `layout` and every run.
   A layout scope (`layoutScope`) is not saved, and the save reports it.

## 5. Placement

View restores the session; recipe, style and settings are what applies to new data.

1. **Sets.** Every set carries an `id` beside its display `name`; notes, style `member` selectors,
   recipe scopes and rules name a set by that id. View's `sets` holds every set in force. A
   recipe's `set.define` is the recipe's own copy, for new data only. A reusable section names a
   recipe's set by the bare id; dataset-bound sections name the namespaced id.
2. **Positions** a layout computed are not saved by default: on open the layout reruns, or its
   output is restored from results when results are saved. Pinned positions go in view.
3. **2D or 3D** is the layout record's `dimension`: view's `layout` holds it for the session, the
   recipe's `layout.set` its own copy for new data.
4. **Filters and time.** View's `visibility` holds the filter in force, the time window,
   `showContext`, the conditions and the hidden nodes. The recipe's `graph.filter` commands are its
   own copies. Timeline playback goes in settings.
5. **Layers that name elements or a dataset** go in view's `layers`: a layer whose selector names
   elements (an `ids` selector, a `member` naming a fixed or path set, a run `source` whose
   `params` name a node); a layer that reads a run no recipe step makes; a layer that reads a run
   whose `as`, or a set whose bare id, more than one open run or set shares. Saving the style
   section alone leaves them out and reports them; saving a full file with style and view moves
   each into view.
6. **Run records.** View's `runs` holds every algorithm run, recipe-made and hand-started alike.
7. **Settings**: every `config.set` key is saved in one named section or listed as never saved
   (4.4).
8. **Column settings.** Renames belong to each source's `mapping`; type conversions to the data
   section's `conversions`; hidden columns to view.

## 6. Naming nodes and edges

### 6.1 Spaces and keys

A node's **record key** is `(space, key)`; an edge's is `(load, key)`, `load` being the id of the
source whose row made it.

- A **space** is an opaque string, always written for the node key, `sourceSpace` and
  `targetSpace`, compared exactly after Unicode NFC normalization (applied when read), never
  inferred and never parsed. A type name (`account`), `shared:<name>` and `source:<id>` are only
  the names a writer proposes. Only the node-key column of a `join.add` step asks about its
  space: when it would add keys to a space that already holds another source's keys, the load plan
  reports the overlap count and the caller chooses merge (keep the proposed space) or keep
  separate (`source:<id>`); an API caller that does not choose keeps them separate, with
  `W_SPACE_OVERLAP` (params `{ source, space, count }`). The mapping records the result as its
  `space`, and a refresh reuses it and asks nothing again.
- A **key** is always a JSON string (11). An edge's key is its `edgeId` value; repeated ids within
  one source follow `duplicateIds`. A writer whose data holds two edges with one edge id in a
  source that does not `merge` leaves the later row's edge-id cell unset, so that row is keyless,
  and reports it (`W_MEMBER_LEFT_OUT`). A node whose id is empty is written as its keyless row. A keyless row's key, node or edge, is
  `"<copy id>#<row from 0>"`; an edge row whose edge-id cell is null or empty is keyless, so the
  form applies per row. A reader-added element's key is a minted ULID, and a reader-added edge's
  `load` is `reader`. An edge built from several rows takes the key and edge type of the first
  row read, in join step order, then row order. A row whose node-key or edge-end cell is null or
  empty has no key and is left out of the build.

### 6.2 Element references

```jsonc
{ "space": "account", "key": "acct-1002" }                         // a node
{ "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y", "key": "pay-889" }     // an edge
{ "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y",
  "key": "01JCBQ2F5H7K9M1P3R5T7W9Y2A#3" }                          // a keyless edge row
```

A reference names the element by record key and nothing else; internal ids are never saved. It
MUST mean the same in a section file and in a full file. An edge reference never names its ends:
`key` is the record key, never NetworkX's multigraph key.

### 6.3 Binding

When `bindsTo.data` equals the open data section's `id`, or the caller agrees to bind to other
data, a reader binds a node by (space, key) and an edge by (load, key).

1. A reference that binds nowhere MUST be kept, never dropped: written back unchanged, bound if a
   refresh brings the element back, and reported as `W_REFERENCE_UNBOUND` (params
   `{ section, pointer, ref }`).
2. An unbound reference stays in its container: a set, a note's targets, a layer's id selector
   and the pins keep their unbound members through edits; one leaves only when the reader removes
   it. The selection is the exception: selecting again replaces it whole.
3. A re-key rewrites the references in every open section at once; a section file not open during
   it keeps those references unbound and reports them. During a live refresh, keyless rows may be
   matched in memory and the open sections' references rewritten; that matching is never saved.
4. A source id survives refresh and same-shape replace, so renaming a file or moving a URL unbinds
   nothing. A referenced network source gets a new copy id on every open, so its keyless rows get
   new keys; when a saved reference or reader operation names one, the save report says it will
   not bind after reopening.

### 6.4 `bindsTo` and staleness

Notes, view and results carry `"bindsTo": { "data": <data section id> }` only. Each results run,
and the results layout, carries its own `bindsTo: { build, sources }`:

- `build`: the data section's build stamp when the run happened.
- `sources`: each source's copy id, by source id, the reader source included. A source that was
  unavailable when the run happened is left out. The open data's copy ids leave out every source
  unavailable now, by the same rule; the test compares the two maps, keys included.

| Case     | Test                                                                                  | Result                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Match    | same data `id`, and the run's `build` and `sources` equal the open build and copy ids | binds; the run restores as saved when its rerun is off                                                                      |
| Partial  | same data `id`, anything else                                                         | binds; `W_DATA_CHANGED` names the sources whose copy id differs, or says settings, types or joins changed; the run is stale |
| No match | different data `id`, or no data open                                                  | `W_DATA_MISMATCH`; loaded only if the caller agrees, then bound by key; the report names sources sharing a copy id          |

The test is per run: one results section can restore one run as saved and mark another stale.

## 7. Coordinate frame

Positions and cameras are in graphty-element's scene frame: Babylon.js's default, left-handed,
y up, in layout units. A point is `{ "x", "y", "z" }`; a 2D drawing writes z as 0. A reader on a
right-handed system (three.js, NetworkX's drawing, most GIS) mirrors z. Annotations keep their
file's frame (y up, file units) and their `scale`. A different frame would be a new major version
of the view section.

## 8. Saving and loading

### 8.1 Saving

1. The saver chooses the sections. A writer MUST write exactly those and report what each left
   out. One save writes either form: one section as a section file, or several as a full file.
2. **The refusal rule.** A save that cannot express something refuses that part and reports it
   (`W_MEMBER_LEFT_OUT`). Nothing is ever silently simplified.
3. **Results are optional.** By default results are not saved, and opening reruns the behaviors.
   A record or archive save includes them.
4. **Embed or reference** is chosen per source (4.1.2 rule 4); the default is embed and there is
   no size-based switch. A `file` source the saver asked to reference but whose `path` is not known
   is embedded instead, and the save report names it (`W_SOURCE_NO_PATH`, params `{ source }`).
5. **Re-saving an opened file keeps its choices**: results are written if the file had a results
   section, and each source stays embedded or referenced as its record was. A recipe section
   opened from a file is written back as read unless the reader asks to rewrite it from the
   session; a style or settings section opened from a file keeps its header fields.
6. **Held sections are written back unchanged** (8.4).

### 8.2 Loading

1. The caller chooses which sections of a full file to load; a section file loads its one section.
2. **Opening a file restores the session.** Data rebuilds from its own join history. Style, sets,
   visibility and run records are restored under their saved ids, the layer stack exactly as
   saved. When the file holds no style section, the starting rows are written as for a new
   project, beneath view's own layers. Opening never paints a suggested layer.
3. **Runs.** Each run is rerun (the default) or its saved results are restored, the caller's
   choice per run. A run recorded `"replayable": false` is not rerun: its saved results are
   restored if present, otherwise it is listed as not run (`W_RUN_NOT_RUN`). When both a rerun and
   saved results exist, the report says whether they agree (`W_RESULTS_DIFFER`). A results run or
   layout with no record in an open view is restored as saved, never rerun, and reported. A file
   with neither a view nor results opens with the new-project layout.
4. **The recipe applies only when the caller asks**, with namespacing. `runAlgorithmsOnLoad` acts
   only when new data is loaded, never when a file is opened. When a full file holds both a recipe
   and a view, the load plan reports that the recipe was not applied and the view restored.
5. **data** replaces the open data. Adding a data section to open data is refused and reported; the
   reader adds that file's sources instead.
6. **Every other section is added** as one undoable step, after a load plan the caller can show
   (neutral facts: what will be added, what cannot bind, the held sections, space overlaps, the
   sources that need a file).
7. A reusable section meeting new data goes through the column mapping step (3.6), which maps
   columns and source roles; anything that cannot bind waits and switches on if matching data
   arrives. A style section's `results.<as>`, `source.runId` and bare set id bind to the one open
   run with that `as`, or the one open set with that id or that id under a namespace; when none or
   several match, the layer is unbound and reported.
8. A dataset-bound section binds as in 6.3; one whose `bindsTo` does not match the open data is
   reported, and loads only if the caller agrees.
9. **Layer order.** View's `order` applies in full only when a file is opened: a stack layer it does
   not name keeps its relative place, above every layer it names, reported. On open, a layer id
   held by both the style section and view's `layers` stays with the view layer; the style
   section's layer gets a newly minted id and is placed as a layer `order` does not name, reported.
   When sections are added to an open project, a loaded layer whose id the stack already holds gets
   a newly minted id, reported, written into `order` first; `order` then arranges only the loaded
   layers among themselves, and they go on top of the existing stack. Loading a style never
   replaces existing layers.

### 8.3 Referenced sources

Opening fetches each referenced source again, through the usual network consent. A `file`
source's `path` and a relative `url` resolve against the location of the file being opened, when
the caller gives one. Otherwise the load plan lists the source as needing a file, with its saved
name. A fetched or picked copy whose copy id differs is a refresh. A source still not found reports
`W_SOURCE_UNAVAILABLE` (params `{ source }`), supplies no elements and leaves references to them
unbound.

### 8.4 Skipped and held sections

A reader MUST skip a section whole, and **hold** it, when its `version` is newer than the reader
knows (`W_SECTION_KEPT`, params `{ section, version, reason }`), when it lists an extension the
reader lacks (`W_EXTENSION_REQUIRED`), when a known key holds another `kind`, when a data
section cannot be built whole (4.1.10), or, for a graph section, when the wrapper carries `graphs`
(2.2 rule 4). Skipping a data section leaves the sections bound to it
unbound, which is reported. The rest of the file loads.

While a section is held:

1. The writer MUST write it back exactly as it was read.
2. The writer MUST NOT write a section of that kind of its own, default style rows included; local
   changes to that kind are not saved, and the save report lists them as `W_SECTION_KEPT`.
3. The writer keeps every `order` entry that names one of its layers, in the position read; only
   ids the writer actually removed from the stack leave `order`.
4. A save option MAY replace the held section on purpose, and the report says so.
5. The load plan lists the held sections.

## 9. Versions

1. The wrapper and each section kind have their own integer major version, independent of
   graphty-element's package version. The wrapper's version covers only the envelope.
2. The sections that existed in version 1 start at version 2 (`graphty-data`, `graphty-style`,
   `graphty-recipe`, `graphty-notes`, `graphty-results`); the new kinds start at 1
   (`graphty-settings`, `graphty-view`).
3. Within a major version every change is additive. A reader MUST ignore members and sections it
   does not know and MUST keep them when it writes the file back, except in the closed objects
   (section 10). There are no minor versions.
4. A change of meaning bumps the major version and ships, in one change, a migration from the
   previous version, its JSON Schema and a sample file.
5. **A change to a named built-in is a change of meaning.** Changing what a name in `builtins.md`
   draws, or removing it, bumps the version of every section that can name it, and the migration
   rewrites older files to keep their meaning. **Changing any default** is such a change: it bumps
   the major version of every section that can hold the member, view run records included, and the
   migration writes the old default into older files (an algorithm's or layout's option default
   into every older recipe's `params` or `options` that did not give it).
6. A writer MUST write the lowest version that can express the content.
7. A reader MUST read every version a release of graphty-element has written, upgrading an older
   one on read one step at a time, and report the upgrade (`W_SECTION_UPGRADED`, params
   `{ section, from, to }`).
8. A section whose version is newer than the reader knows is skipped and held (8.4).
9. **Defaults live in the schemas**, frozen for that section's major version. An absent member
   means that default; an absent mapping role means none.

### 9.1 Version 1 files

A version 1 file (the nine-member `graphty-document` version 1, or a version 1 document of one
kind) is opened through a migration into the sections above:

- the nine members are regrouped into the seven sections and the session member is split;
- the data becomes one embedded source of kind `derived` holding the merged graph as tables, one
  `join.add`, its node ids as the key column in the space `source:<id>`, its types carried as a
  column under a type rule, and an empty reader source; its `metadata` holds the version 1
  `sources` member verbatim, and each node's original `_source.loads` is the copy column
  `version-1-loads`; values the session member holds per element by id are columns of that
  source like any other, named by 4.1.8 rule 3 when a column of that name is already taken, and
  every path that reads them, in a layer, a set rule, a condition or a filter, reads
  `data.<column>`; each layer reading them is an ordinary layer (4.2 rule 1);
- hidden columns go into view, `columns.types` into `conversions`, declared measurements and
  ordinal orders into the type schemas (one on a column no type carries is reported as dropped),
  ignored issues unchanged, kept pairs into `issues.kept`;
- the `label` role becomes a style layer reading that column;
- each positional edge reference becomes `{ load, key }` with the key of the edge at that
  position: its id when it has one, else `"<copy id>#<position>"`;
- element-naming layers go into view's `layers`, and every layer's `kind` is dropped;
- the session's visibility goes into view and its playback into settings; each saved run becomes a
  view run record and its outputs results; pinned nodes become `pinned`, other coordinates the
  layout's results;
- `styleVersion` and `recipeVersion` are dropped, reported; notes version 1 targets become element
  references; base64 positions and results become plain numbers.

A migrated project cannot refresh one of its original sources separately. A version 1 section
document migrated without its project file keeps its edge targets unbound, since the copy id is
minted at migration.

## 10. Open vocabularies and closed objects

An **open vocabulary** may gain values within a major version. A **closed object** MUST NOT be read
by ignoring a member it does not know.

| Section       | Open vocabulary                                                               | A reader meeting an unknown value                      |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| wrapper       | `sections` keys                                                               | skips it with `W_UNKNOWN_KIND`, keeps it on re-save    |
| every section | `dependencies.extensions` names                                               | skips and holds the section (3.6 rule 4)               |
| data          | join step `op`, source `kind`, `copy` form, reader operation `op`             | skips and holds the whole data section (4.1.10)        |
| data          | `measurement` values                                                          | draws as with no measurement                           |
| style         | channel names, selector kinds, scales, enumerated channel values, palette ids | fails that channel entry or layer alone, keeps it      |
| recipe        | command `op`, algorithm keys, layout ids, the parts of a run's `style`        | an unknown `op` stops the replay (4.3 rule 7)          |
| notes         | target kinds, item key forms                                                  | the target reads unsupported and is kept               |
| view          | camera controllers                                                            | 4.7 rule 2                                             |
| view          | run `scope` forms                                                             | that run's replay stops; the record is kept on re-save |

Closed objects:

- In data: a source's `mapping` and `settings`, a type entry and its rules, a join step, a reader
  operation, the reader source itself, and a key in a source's `options` its parser does not read.
  An unknown member holds the whole data section (4.1.10): ignoring one would build another graph
  under the same build stamp.
- A recipe command and its `scope`: an unknown member skips the command and every later one
  (`E_UNKNOWN_OPTION`).
- A style's selectors, bindings and carried palettes: an unknown member fails that channel entry
  or layer alone, reported (`W_UNKNOWN_MEMBER`) and written back.
- The parts of a run's `style`.
- Element references, note targets and cites, a view run's `scope` and a set record: one with an
  unknown member is kept, unbound, unsupported or not replayed.

The schemas mark closed objects with `unevaluatedProperties: false` and leave open ones open. A
schema is normative for what a writer produces; a reader MUST NOT reject a whole document because
it fails a schema, and acts by the rules above instead.

## 11. Numbers and keys

- A finite number is the JSON number ECMAScript `Number::toString` writes. Non-finite values are
  the strings `"Infinity"`, `"-Infinity"` and `"NaN"`, read as numbers exactly where the declared
  type is number (a type schema, a `ColumnDecl` dtype, a results field, an option typed number);
  any other string stays text.
- A key is always a string: a number as `Number::toString` writes it, so `34`, `34.0` and `"34"`
  are one key; a boolean as `true` or `false`. Cells are turned to text the same way before
  matching a type rule's `values`.
- An integer too large to hold exactly (beyond 2^53 - 1 either way) is written as its decimal
  string, and read back as a number only where the column's schema declares `number` or `integer`
  (a numeric `ColumnDecl` dtype); anywhere else it stays text. Its row is never refused.
- The prefixes `graphty.` and `_source.` are reserved in column names.

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

| Code                          | When                                                                         | Params                                    |
| ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| `E_BAD_DOCUMENT`              | the file is not I-JSON, or has no known `kind`                               | `section`                                 |
| `E_UNKNOWN_OPTION`            | a recipe command or scope has a member the reader does not know              | `section`, `pointer`                      |
| `E_UNKNOWN_COMMAND`           | a recipe command's `op` the reader does not know                             | `section`, `pointer`                      |
| `W_UNKNOWN_KIND`              | an unknown `sections` key                                                    | `section`                                 |
| `W_UNKNOWN_MEMBER`            | an unknown member of an open object, selector, binding, palette or run style | `section`, `pointer`                      |
| `W_SCHEMA_MISMATCH`           | `$schema` disagrees with `kind` and `version`                                | `section`, `schema`                       |
| `W_SECTION_KEPT`              | a section is held, or a local change to a held kind was not saved            | `section`, `version`, `reason`            |
| `W_EXTENSION_REQUIRED`        | a section lists an extension the reader lacks                                | `section`, `extension`                    |
| `W_SECTION_UPGRADED`          | an older version was migrated on read                                        | `section`, `from`, `to`                   |
| `W_ELEMENT_NAMING_LEFT_OUT`   | a writer left element-naming content out of a reusable section               | `section`, `pointer`                      |
| `W_MEMBER_LEFT_OUT`           | a save, or a version 1 migration, could not carry something over             | `kind` or `section`, `field` or `pointer` |
| `W_SOURCE_NO_PATH`            | a file source asked to be referenced was embedded: its `path` is not known   | `source`                                  |
| `W_SOURCE_UNAVAILABLE`        | a referenced source could not be fetched or picked                           | `source`                                  |
| `W_SPACE_OVERLAP`             | a node key would add keys to a space another source already holds            | `source`, `space`, `count`                |
| `W_REFERENCE_UNBOUND`         | an element reference binds nowhere                                           | `section`, `pointer`, `ref`               |
| `W_DATA_CHANGED`              | same data id, but a run's build or copy ids differ                           | `section`, `sources`                      |
| `W_DATA_MISMATCH`             | a bound section was written on other data, or no data is open                | `section`, `data`                         |
| `W_CAMERA_CONTROLLER_UNKNOWN` | a camera names a controller the reader does not know                         | `section`, `controller`                   |
| `W_RUN_NOT_RUN`               | a run was neither rerun nor restored                                         | `run`                                     |
| `W_RESULTS_DIFFER`            | a rerun disagrees with the saved results                                     | `run`                                     |
| `W_SOURCE_UNKEYED`            | a source has no key column                                                   | `source`                                  |
| `W_NODE_NAMED_ONLY`           | edges named nodes no source supplies, kept as named-only nodes               | `source`, `count`                         |
| `W_EDGE_END_MISSING`          | edges naming missing nodes were left out                                     | `source`, `count`                         |
| `W_COLUMN_WIDENED`            | two types declare one column with different dtypes                           | `column`                                  |

## 14. Files in this directory

| Path                                                                                                                                                                             | What                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `README.md`                                                                                                                                                                      | this specification                                                                             |
| `builtins.md`                                                                                                                                                                    | the built-ins registry                                                                         |
| `schemas/graphty-document/v2.json`                                                                                                                                               | the full file                                                                                  |
| `schemas/<kind>/v<version>.json`                                                                                                                                                 | each section kind at its version                                                               |
| `schemas/common/v2.json`                                                                                                                                                         | definitions the others share (header, ids, element references, rule trees, layers, join steps) |
| `schemas/graphty-document/v1.json` and the version 1 kinds (`graphty-data`, `graphty-style`, `graphty-recipe`, `graphty-notes`, `graphty-assets` at v1, `graphty-sources` at v2) | the version 1 files the migration in 9.1 reads                                                 |
| `examples/card-fraud.graphty.json`                                                                                                                                               | a worked example holding all seven sections                                                    |
| `examples/card-fraud.graphty-*.json`                                                                                                                                             | each of its sections as a section file                                                         |
| `examples/minimal/`                                                                                                                                                              | the smallest valid file of each form                                                           |
