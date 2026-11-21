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
| `results`  | `graphty-results`  | 2       | the record of each run and of the layout: what ran, the seed used, the code that computed it (engine), the build it ran on, outputs           | element references (bound) |
| `notes`    | `graphty-notes`    | 2       | people's notes on the graph, its elements, sets and results                                                                                   | element references (bound) |
| `view`     | `graphty-view`     | 1       | the session a file is opened to: camera, selection, pins, sets, visibility, layer order, element-naming layers, run records, the layout       | element references (bound) |

A **reusable** section never names a particular node or edge, so it applies to data it has never
seen. A **dataset-bound** section names nodes and edges by record key (section 6) and says which
data it was written on (`bindsTo`).

Each section is either a file of its own (a **section file**) or a member of a **full file** that
holds any subset of the sections.

**The smallest working file** is `examples/minimal/minimal-working.graphty.json`: one embedded
CSV source in data, a layer sizing nodes by a pagerank run's `results.rank.value`, the run and a
seeded force layout. What happens when a file opens comes from view (the runs it lists are run
again, its `layout` is drawn and its layers apply) and from style (its layers apply). The recipe
is only what applies to new data (8.2 rule 4), so it repeats the run and the layout for that. A
layer that reads a hand-started run, or any run no recipe step makes, sits in view's `layers`
(5 rule 5).

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
| `graphs`                                                                                                    | no       | the graphs of a file holding two or more, in order (rule 4)                          |

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
4. **Several graphs.** A file holding two or more graphs writes `graphs`, an ordered list of
   `{ "id", "name", "sections" }`; a file of one graph MUST NOT write it. The first graph stays
   where a file of one graph puts it, in the top-level `sections`, and its entry has no
   `sections`: it only names that graph. A graph entry is open: a reader keeps a member it does
   not know and writes it back. Each later entry's `sections` holds that graph's own `data`,
   `view`, `notes` and `results`, each exactly as a top-level section of that key, and, like the
   top-level `sections`, is open: a key the reader does not know is skipped, reported
   `W_UNKNOWN_KIND` (params `{ section, graph }`) and written back. Style, recipe and settings
   belong to the whole file. `id` is `graph_` plus a ULID
   (3.3), unique in the file; `name` is the reader's words. A one-graph project has no graph name:
   its name is the project's. Every graph saves its own sources by their own embed or reference
   choice, so no graph depends on another's. graphty-element opens the first graph and writes the
   later ones back exactly as read, but for their file paths (8.1 rule 4), reporting each of their
   sections `W_SECTION_KEPT` with `reason` `graphs` and `graph` its graph id. A reader cannot read
   `graphs` when it is not a list of two or more objects, when an entry has no string `id` of the
   form `graph_` plus a ULID or no string `name`, when an id repeats, when the first entry has
   `sections`, or when a later entry's `sections` is not an object. It then MUST hold every graph
   section, the top-level ones included (8.4), and write them back with `graphs`, reporting
   `W_SECTION_KEPT` with `reason` `graphs`.
   A writer keeps the graphs a save includes, autosave included.

    ```json
    "graphs": [
      { "id": "graph_01JCC0000000000000000000G1", "name": "People" },
      { "id": "graph_01JCC0000000000000000000G2", "name": "Friends from a file",
        "sections": { "data": { "kind": "graphty-data", "version": 2, "...": "..." } } }
    ]
    ```

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

| Member                | Required                              | Meaning                                                                                                                                                                                        |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`             | no                                    | `https://graphty.app/schema/documents/<kind>/v<version>.json`; advisory (3.2)                                                                                                                  |
| `kind`                | yes                                   | `graphty-<section>`                                                                                                                                                                            |
| `version`             | yes                                   | the section's own major version, an integer (section 9)                                                                                                                                        |
| `id`                  | data: yes; others: no                 | a string naming this section across copies (3.3)                                                                                                                                               |
| `name`, `description` | no                                    | plain text: a human name, and a sentence of what it is for                                                                                                                                     |
| `created`, `modified` | no                                    | when this section first existed, and when its content last changed (3.5)                                                                                                                       |
| `generator`           | yes                                   | `{ "name", "version" }`: the software that wrote it; for diagnosis only, no reader branches on it                                                                                              |
| `authors`             | no                                    | a list of `{ "name", "uri" }`                                                                                                                                                                  |
| `license`             | no                                    | an SPDX license expression when one applies, else text                                                                                                                                         |
| `keywords`            | no                                    | a list of strings                                                                                                                                                                              |
| `language`            | no                                    | a BCP 47 tag for the section's human text                                                                                                                                                      |
| `dependencies`        | see 3.6                               | what the section needs from the data and from software                                                                                                                                         |
| `bindsTo`             | results, notes, view: yes; others: no | `{ "data": <data section id> }`: which data the section was written on (6.4)                                                                                                                   |
| `origin`              | no                                    | `{ "from" }`: the URL or file name a copied-in section was taken from, for display only                                                                                                        |
| `extensions`          | no                                    | keyed by reverse-domain names; `graphty` and `graphty.*` are reserved; kept unread on re-save; the same member, with the same rules, may also sit on any closed object of data and recipe (10) |

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
  source goes in its `label`. A set id is `set_` plus a ULID; a note id is `note_` plus a ULID;
  a graph id (2.2 rule 4) is `graph_` plus a ULID.
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
   listed. The same holds for an extension's data under the `extensions` member of an object
   inside the section (10, "Must-understand members"): a reader ignores it unless the extension
   is listed here, and the listed name is what makes it must-understand.

## 4. The sections

The schemas in `schemas/` are normative for the shape of each section; this section states the
rules a schema cannot. The top level of every section is open: a reader MUST ignore a member it
does not know, report `W_UNKNOWN_MEMBER` (params `{ section, pointer }`) and keep it on re-save.
The closed objects of section 10 are the exceptions. A default the format owns is stated in this
text or as a schema `default` keyword (9 rule 9). Option values, settings and style looks follow 9
rule 10.

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
| `edgeIds`       | no       | each edge's element-assigned id, by load and key (6.2)                                        |
| `graph`         | yes      | the merged graph as NetworkX node-link JSON (4.1.9)                                           |

#### 4.1.1 The build stamp and direction

A writer that changes a build input -- a source copy, a mapping or setting, a type, a join step, a
kept pair, `directed`, `repeatedEdges`, a conversion, a reader operation -- MUST mint a new
`build`. A save that refuses any part of the data section (8.1 rule 2) MUST write a newly minted
`build` in that file, a part refused when the file was opened included (a saved edge id it could
not use): a re-save never keeps the stamp it read when
what it writes differs from what it read. Nothing is canonicalized or hashed to compare builds; a hand-edited section
that keeps its old stamp makes its results look current, which is the accepted cost.

`directed` is always written. Reader-drawn edges follow it; the node-link graph's own `directed` is
written from it and never read. A source file's own direction goes in that source's `metadata`; a
source that disagrees is read under `directed` and reported.

#### 4.1.2 Source records

A source record has exactly these fields: `id`, `label`, `kind`, `format`, `options`, `origin`,
`mapping`, `settings`, `annotations`, `metadata`, `license`, `citation`, `copy`, `columns`,
`loaded`, and the two must-understand slots `extensions` and `ignorable` (10).

| Field                             | Holds                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                              | `src_` plus a ULID (3.3)                                                                                                                                                                                                                                                                                                                                         |
| `label`                           | display text, including any name the caller gives; also the default role match (3.6 rule 3)                                                                                                                                                                                                                                                                      |
| `kind`                            | an open vocabulary: `file`, `url`, `network`, `sample`, `derived`, `reader`, or a reverse-domain kind such as `org.example.cypher` (10)                                                                                                                                                                                                                          |
| `format`, `options`               | `format` is the id of the format that parses the bytes (builtins.md "Formats"; absent, the bytes are recognized as a load with no format recognizes them); `options` holds only the names builtins.md "Parse options" lists for that format (rule 9), never identity, join or direction choices. A network source has neither: its request is in `origin.ledger` |
| `origin`                          | `copy`, the copy id (always); plus per kind: file `name`, `size`, `mediaType`, `path`; url `url`, `size`, `mediaType`, `etag`, `lastModified`; network exactly `url`, `credentials` (`{ slot }`) and `ledger` (rule 7); sample `dataset` and version, or a generated sample's `generator` and `params`                                                           |
| `mapping`                         | per table, graphty-element's `TableMapping` names (4.1.3)                                                                                                                                                                                                                                                                                                        |
| `settings`                        | closed: `duplicateIds` (`first` default, `merge`, `refuse`) and `unmatched` (`add` default, `leave-out`)                                                                                                                                                                                                                                                         |
| `annotations`                     | the shapes and text a source draws beside its graph, in the source's frame (y up, its own units), with their scale                                                                                                                                                                                                                                               |
| `metadata`, `license`, `citation` | the file's own header (its own direction among it), license and citation                                                                                                                                                                                                                                                                                         |
| `copy`                            | the rows (embedded), or absent (referenced)                                                                                                                                                                                                                                                                                                                      |
| `columns`                         | column declarations (`{ name, dtype }` with optional `nullable`, `unset` and `origin`, `dtype` from builtins.md "Column dtypes") grouped by table, `{ nodes: { <working name>: decl }, edges: {...} }`; always with `copy`, and on a referenced source as what an open checks the rows it reads again against                                                    |
| `loaded`                          | when the current copy was read                                                                                                                                                                                                                                                                                                                                   |

1. **The copy id.** `origin.copy` is `sha256:` plus lower-case hex of the bytes as read for file,
   url and downloaded sample sources, and a ULID minted whenever that copy changes for network,
   derived and reader sources. A generated sample has no bytes: its copy id is a ULID and it is
   always embedded; its `generator` and `params` are only what a refresh runs again. A source read
   from more than one file (a node file and an edge file) has no single run of bytes: its copy id
   is a ULID. Two sources that read the same bytes share a copy id. An embedded copy and a referenced one carry the same copy id; a refetch is
   checked against it. Until a writer keeps a log of the reader's edits, removes and merges, a
   source whose rows the reader edited, removed or merged is always embedded, whatever the saver
   asked, and its copy id is a ULID minted for that copy whatever its kind, since its rows are no
   longer the bytes read (the operations it folds in are reported, 8.1 rule 2). A source of a kind
   the reader does not know may have either form, `sha256:` or a ULID.
2. **Working column names everywhere.** Every column name in a document is a working name, after
   renames. A column's source name appears only in `mapping.<table>.renamed` and in its
   column declaration's `origin.title`.
3. **Embedded copies are tables**: an object whose only members are `nodes` and/or `edges`, each an
   object of equal-length value arrays keyed by working column name, rows in the order read. An
   unset cell is `null`; a `json` column lists its unset rows as `unset` in its `columns` entry, so
   its `null` is literal. A node-link source is copied as tables, its graph attributes in
   `metadata`. Any other `copy` object is an unknown copy form, and that source is held (10).
   `columns` is rebuild and
   re-export input only, never read for meaning.
4. Embedding or referencing is the saver's choice per source, whatever its size; the default is
   embedded. A `derived` source and the reader source are always embedded, and so is a `file`
   source whose `path` the writer does not know, since no reference can stand for it (8.1 rule 4).
5. A referenced or refreshed `file`, `url` or `sample` source MUST be parsed again with exactly
   its `format` and `options`, never a guessed one; an absent option takes the absent value
   builtins.md lists for it. `options` includes `styles` and `styleOptions` when the load drew the
   file's styles: they decide which columns the read makes, and every format's reader reads them.
6. A `file` source's `origin.path` is a POSIX path relative to the folder of the file being saved,
   never absolute and never above that folder, written only when the writer knows both locations.
   An `origin` member the writer does not know is left out, never invented. A file may instead be
   referenced by a browser file handle (File System Access), which cannot be written into a file:
   the writer keeps it in the browser's storage, keyed by source id and copy id, and writes the
   referenced source with no `path`. A referenced `file` source with no `path` is read through the
   handle the opening browser keeps for it, else it needs a file (8.3). A source with nothing to
   name, neither path nor handle, is embedded (`W_SOURCE_NO_PATH`, 8.1 rule 4).
7. **A network source's `origin`** is closed. It holds `copy`; `url`, shown only and never read
   by a refresh; `credentials` (`{ "slot" }`, the credential slot's name, never a secret); and
   `ledger`, the request history, the only member a refresh reads. The ledger is closed (with the
   two slots of 10, "Must-understand members", at its top level only) and holds:
    - `source`: the driver id (`url`, `rest`, `openalex`, ...), an open vocabulary that a
      reader without that driver cannot refresh (the source is then built from its copy, or held
      when referenced);
    - `sourceVersion`: the version of that driver's `params` shape, an integer of at least 1; a
      reader whose driver has another version reads the ledger as the driver says, or cannot
      refresh the source;
    - `endpoint`: the origin and path, or `null` for the source's default;
    - `params`: the source's params, a REST mapping included, without what marks a credential.
      Their shape belongs to the driver: a third party writes them back verbatim and never
      interprets them;
    - `limits` (optional, closed): `maxNodes`, `maxEdges`, `maxBytes`, `maxRequests` and
      `timeoutMs`, each an integer of at least 1;
    - `pages`: at least 1;
    - `next`: an opaque cursor that never holds a credential, or `null`;
    - `validators` (closed): `etag`, `lastModified`, `modified`, `serverVersion` and
      `contentHash`;
    - `expand` (optional, closed): `depth` (absent, 1), `direction` (`out`, `in` or `both`, the
      default), `limit` (absent, none), `relationshipTypes` (absent, all) and `layout` (`continue`,
      the default: nodes an expansion adds join the running layout; `none`: they stay where they
      start); never a trigger, so a received file cannot make a click fetch;
    - `expansions`, in order: each `{ seeds, depth, direction, limit?, at, next, validators }`,
      closed, its `seeds` node references `{ space, key }` (6.2). An expansion's position is its
      identity.

    The ledger holds no time of its own (the record's `loaded` is the time), no counts and no
    credential identity. On write, a seed no node holds is left out, and so is an expansion with no
    seed left. An open restores the ledger as the session's record of that load, keyed by the
    source id, so a refresh of an embedded network source replays the request as a refresh of a
    load the session made does.

8. **A source is referenced only when its rows are its bytes alone.** Otherwise it is embedded,
   whatever the saver asked, and the save reports why (`W_SOURCE_EMBEDDED`, params
   `{ source, reason }`): `edited` (the reader edited, removed or merged its rows), `bytes` (the
   writer kept no digest of the bytes it read), `rows` (another source also supplied one of its
   nodes or edges), `mapping` (its read has no spelling in 4.1.3: several tables read as one, ids
   scoped by kind, or table columns the writer does not know it was read by), `kind` (a kind an
   open does not read again: only `file` and `url` sources are) or `options` (a load option
   builtins.md does not list was left out, so its bytes alone would not read as they were read).
9. **Parse options.** `options` is closed per format: each key is a name builtins.md "Parse
   options" lists for the record's `format`, with a value of the listed type. `options` is read
   only to read the source again, never to build it, so a key that is not listed for the format,
   or a value of another type, fails that source alone (4.1.10): an embedded source is built from
   its copy, is not refreshable and reports `W_UNKNOWN_MEMBER` (pointer
   `/sources/<i>/options/<name>`), and a referenced one is held (`W_SOURCE_UNAVAILABLE`, reason
   `options`).
    - A writer writes only listed options. A load given any other option (graph-io import options,
      an explicit CSV variant, OBO id choices, a Gephi preview choice, a JSON node path, ...) is
      saved without it and reported `W_OPTION_NOT_SAVED` (params `{ source, option }`). A source
      asked to be referenced is then embedded (`W_SOURCE_EMBEDDED`, reason `options`).
    - The load inputs (`data`, `file`, `url` and the node and edge file, URL and data pairs),
      `chunkSize`, `layout`, and the endpoint and id choices the mapping carries are written
      nowhere in `options` and never reported.
    - Conformance cases: a JSON file with `nodes` under `/graph/people`, read with
      `pointer: "/graph/people"`; a workbook's second sheet read by its name; a CSV whose cells
      `N/A` read as unset with `missing: ["N/A"]` and as text without it.

#### 4.1.3 The mapping

`nodes` holds `key`, `space`, `weight`, `weightMeaning`, `time`, `timeUnit`, `timeEnd`,
`timeSpells`, `timeParseZone`, `latitude`, `longitude`, `coordinates`, `country`, `region`, `city`
and `renamed`; `edges` holds `edgeId`, `source`, `sourceSpace`, `target`, `targetSpace`, `weight`,
`weightMeaning`, `time`, `timeUnit`, `timeEnd`, `timeSpells`, `timeParseZone` and `renamed`. Each
role is a working column name; `renamed` maps source column name to working name. `weightMeaning`
(`distance`, `strength`, `capacity`), `timeUnit` (`ms`, `s`, `year`, `ordinal`) and
`timeParseZone` (an IANA zone name, the zone a time column's text reads in when it carries no
offset; absent, UTC) are values, not columns. `timeEnd` names the column saying where each row's
time ends and `timeSpells` the column holding its list of spells.

1. An absent role means none, never graphty-element's guess. Nothing is read from a column the
   mapping does not name.
2. With `nodes.key` absent every node row is keyless and in the space `source:<source id>`.
   With it, a node row whose key cell is null or empty is no node: it is left out and counted
   (`W_KEY_EMPTY`, params `{ source, column, rows }`), and so is an edge row whose `source` or
   `target` cell is null or empty. `nodes.space` is written exactly when `nodes.key` is.
   `sourceSpace` and `targetSpace` are always written.
3. A file's own ids (GraphML `n0`, a node-link `id`) are only what graphty-element proposes as the
   key at load time; the chosen column is written to `key` like any other role.
4. A `label` role is saved as a style layer reading that column; a save that cannot write that
   layer refuses the role and reports it.
5. A referenced source's roles name the columns of its parsed rows; the rows it rebuilds are then
   keyed by graphty-element's own read, as an embedded copy's are.
6. A column a load made from the file's styles is named `<name> (<format>)` when another load took
   `<name>` first, which a read into an empty graph does not repeat. Read again, such a column
   takes the name `columns` saved it under.
7. **Roles belong to sources.** Weight, time and location are each source's own roles, read from
   that source's rows in its own unit; graphty-element's graph-wide `data.knownFields` settings
   (`edgeWeightPath`, `edgeWeightMeaning`, the node and edge time path, unit, end, spells and parse
   zone, and the location paths) are only their view, and no section saves them. A writer writes
   each setting as the role of every source whose table carries the column it names (a value
   role beside its column role), except that a source the writer read keeps the roles its file
   named while their setting is what the read set, and keeps its own when it does not carry a
   column chosen since; a whole-location column read without a kind of place, and a location
   setting no member holds (a narrowing column or country, a removed location), have no role
   and are reported (`W_MEMBER_LEFT_OUT`). A reader sets each setting from the roles of the
   sources a step builds: the value when every source naming the role agrees, else null. When
   they differ the reader reports `W_ROLES_DIFFER` (params `{ table, role, sources }`), and a
   writer that kept them writes each source's role back as read while the setting stays null.
   Conformance case: two sources, one timed by `when` and one by `at`; open, save, and each still
   names its own column.

#### 4.1.4 The reader source

The reader's own changes are one source of kind `reader`, at most one per data section. It has
exactly `id` (`reader`), `label`, `kind`, `origin` (`copy` alone, a ULID minted on every edit),
`copy` and `loaded`; any other field holds the data section. Its copy is
`{ "operations": [...] }`, in the order made, applied in order after the join steps and the
conversions:

| `op`     | Members                                                                                                           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remove` | `node` or `edge`: a reference                                                                                     | drops the element; a node takes its edges with it, whatever `unmatched` says                                                                                                                                                                                                                                                                                                                                                                              |
| `add`    | `node: { space, key }`, or `edge: { "load": "reader", key }` with `from` and `to`; `columns`; `dtypes` (REQUIRED) | adds an element; a node's `key` is its id as the reader gave it (a JSON string, its typed value in `columns.id`), or a ULID when another reader node's id has the same text (6.1), an edge's its edge-id cell when the data has an edge-id role and no other reader edge repeats it, else a ULID minted when it is made and kept from then on; `dtypes` gives each column's graph-format dtype, and cells are written and read as a copy's (4.1.2 rule 3) |
| `edit`   | `node` or `edge`: a reference; `column`; `value`; `was`; `picked`                                                 | sets one cell; `was` is the value it replaced; `picked`, the source whose value a pick or Use took (a typed value has none)                                                                                                                                                                                                                                                                                                                               |

An operation naming an absent element applies to nothing and is reported. Operations are written
as recorded. The `op` `merge` is reserved (10): a writer writes none (a merge the reader made is
folded into the copies it embeds, 4.1.2 rule 1), and a reader meeting one holds the section. `picked` names a source of the section; a pick of a source that is later removed
stays as the reader's own value, written without `picked`. A reader applies a pick like any edit;
a refresh that changes the picked source's value for that cell reports it rather than applying the
old value silently. An edit to a column a type rule, or a key, end or edge-id role, reads MUST be refused
and never saved. A fix is saved as what it did: `edit` operations or a `conversions` entry.

#### 4.1.5 Types

Each type entry is closed: `name` (no `:`), `kind` (`"node"` or `"edge"`), `plainName` (display
only), `rules` and `schema`.

- `rules` is a list of closed objects `{ source, part, end, column, values }`. `end` (`"source"`
  or `"target"`, node types only) types the nodes that source's edge rows name at that end; absent,
  the rule reads the source's node rows. `part` narrows the rule to the `join.edges` step of that
  source carrying that `part` (4.1.8 rule 3): its edges, or with `end` the nodes it names at that
  end; a rule naming a part no step carries types nothing and is kept. Without `column` every row read has the type; with it,
  `values` lists the cell values meaning this type, compared as exact strings after NFC, cells
  turned to text as keys are (11).
- Every node and every edge holds exactly one type. Among the types whose rules match one row of
  one source, a type matched by a rule with `column` and `values` beats a type matched only by a
  rule without `column` (the source's whole-source or whole-end rule, which acts as "others");
  between rules of the same kind, one naming the row's `part` beats one naming none; and among
  those the first in registry order wins. A row's own rules decide its edge's type. When
  rows of several steps would give one node different types (keys of two sources meeting in a
  space), the first step in build order sets it, a source's node rows before its edge ends. A row
  matching no rule gives the default type, which has no name and no entry: its element writes
  `"graphty.types": []`, and no selector or scope names it. `graphty.types` keeps its plural
  spelling and holds at most one name, so several types per element can be added later without
  breaking a file.
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

`joins` lists the steps that build the graph, in order: `{ "op", "source", ...choices }`, naming
sources by id. The build folds the steps in list order over an empty graph; a step sees every
element the earlier steps built and nothing after it. Then the conversions run, then the reader
operations. One source may be named by several steps, so one table can be read several ways: a
flat file's edges once, and each entity it names again. A source has at most one `join.add`.

| `op`               | Reads                                                                                     | Does                                                                                                                                                                                                                                                                                                              | Choices                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `join.add`         | every table of the source, through its mapping                                            | a node per distinct key, an edge per edge row keyed `{ load: <source id>, key }`; an end naming no node follows `settings.unmatched`                                                                                                                                                                              | `clash`, `columns`, `duplicateIds`                                                                                                                                            |
| `join.merge`       | the source's node rows, which an earlier step of the same source built                    | each node 2 folds into the node 1 its field names: node 1 keeps its space, key, type and position and takes node 2's edges, supplying sources and values (by `clash`); node 2's key becomes an alias of node 1; a node 2 naming nothing follows `unmatchedFrom` (`keep`, the default, or `drop` it and its edges) | `read`, `via`, `lookup`, `mapping`, `clash`, `repeated`, `aggregate`, `unmatchedFrom`, `rows`, `except`, `ignoreCase`, `ignoreSpaces`                                         |
| `join.node-values` | one table's rows; builds no node from a row                                               | writes a row's `columns` onto the node its key names; a row naming no node follows `unmatchedRows` (`leave-out`, the default, or `add` a node)                                                                                                                                                                    | `read`, `via`, `lookup`, `mapping`, `clash`, `repeated`, `aggregate`, `names`, `unmatchedRows`, `columns`, `rows`, `except`, `ignoreCase`, `ignoreSpaces`                     |
| `join.edge-values` | as above; `read.edgeId` matched against the keys of the edges `edges` names the source of | writes values onto existing edges and never makes one; a row matching nothing is left out and counted                                                                                                                                                                                                             | as above, plus `edges` (REQUIRED); no `unmatchedRows`                                                                                                                         |
| `join.edges`       | one table's rows, each row one edge                                                       | an edge from the row's `source` cell (in `sourceSpace`) to its `target` cell (in `targetSpace`), keyed under the step's `part`; an end naming no node follows `unmatchedRows` (`add` or `leave-out`; absent, the source's `settings.unmatched`)                                                                   | `read`, `part` (REQUIRED), `via`, `lookup`, `mapping`, `viaEnd`, `repeated`, `aggregate`, `names`, `unmatchedRows`, `columns`, `rows`, `except`, `ignoreCase`, `ignoreSpaces` |

Every step may also carry `off` (rule 8). Where no choice decides, precedence is join step order,
then row order.

1. **A source no step builds is kept.** A source no step names, or whose only steps are `off`, is
   not built: it supplies nothing, it is no build input (a change to it mints no `build`), and it
   is not in any `bindsTo.sources`. A writer MUST write it back with its copy (or its reference)
   and its `off` steps, as read; a reader MUST NOT refuse it, report it as left out or read its
   referenced rows again. Such a source is staged: the spaces its mapping names are only the
   proposal it reopens with, which a later step may change. A one-source file writes one
   `join.add`. Conformance case: a source staged beside a built one; save, reopen, save, and the
   staged record is still there, byte for byte, and the build stamp is unchanged.
2. **The rows a step reads (`read`).** `join.add` reads every table through the source's mapping
   and never carries `read`. Every other step reads one table, `read.table`, else `nodes` for
   `join.merge` and `join.node-values` and `edges` for `join.edge-values` and `join.edges`.
   `read` is closed: `table`, `key`, `space`, `edgeId`, `source`, `sourceSpace`, `target`,
   `targetSpace`, and on `join.edges` only `weight`, `weightMeaning`, `time` and `timeUnit`. Each
   role is a working column name, spelled as a mapping spells it (4.1.3), and holds for this step
   only; a space is written exactly when its column is. An absent `weight` or `time` means the
   source's role; `null` means none.
3. **A step's name (`part`).** Every `join.edges` step carries `part`, a positive integer
   graphty-element mints when it writes the step: unique among the steps of its source, never
   reused after a step is deleted, and never derived from a column name. The file keeps no
   counter, so a writer mints one above every `part` that a step of the source, a type rule, or a
   saved reference to its edges names. No other step carries `part`. A `join.add` keys its edges
   by their plain keys (6.1) and a `join.edges` step keys them under its part, so adding, editing
   or deleting another step never re-keys an existing edge: `<part>/<key>` from the row's edge-id
   cell; `<part>/<from key>|<to key>` when the step reduces its rows to one edge per end pair (by
   `repeated` or `aggregate`), each key with `\` written `\\` and `|` written `\|`, so removing or
   re-sorting rows never re-keys it; else `<part>/<from>|<to>#<n>`, the keyless form of 6.1
   counted over the step's rows. Every row a reduced edge was
   built from keeps its own `{ load, key }` as an alias of that edge (6.1). Conformance cases: two `join.edges` steps
   (parts 1 and 2); delete the first, add another: part 3; save, reopen, and part 2's edge keys
   are unchanged; a `join.edges` step with no edge id whose rows are re-sorted keeps `1/a|b#1`.
4. **Which columns and which rows.** `columns` lists the working columns a step brings besides its
   role columns; absent means every column, and on `join.add` every column no other step of the
   same source moves onto nodes, so moving a column never rewrites the add. `[]` brings none (an
   edge that only connects). `rows: { column, values }` reads only the rows whose cell is listed;
   `except: { column, values }` reads every row but those. Values compare as exact strings after
   NFC, cells turned to text as keys are (11). A row no step reads is no element.
5. **Which end a mapping table translates (`viaEnd`).** On `join.edges` with `via` or `lookup`,
   `viaEnd` (`"target"` default, or `"source"`) names the end whose cell is translated.
6. **Repeated keys.** For `join.add`, its own `duplicateIds` (`first`, `merge`, `refuse`) decides,
   else the source's `settings.duplicateIds`. For every other step, `repeated` (`first` or
   `last`; `both` on `join.edges` only) or `aggregate` decides; `first` is the default on
   `join.merge` and `join.node-values`. On `join.edges` an absent `repeated` leaves repeated end
   pairs to the graph's `repeatedEdges`, whatever that value reaches. Neither `repeated` nor
   `repeatedEdges` ever reduces two edges of different types into one, and repeats whose sources'
   weight meanings differ are reduced only by `first` or `last` (keeping that row's weight and
   meaning), never by a rule that combines weights (`sum`, `min`, `max`, `aggregate`). `join.merge` folds every
   node 2 whose field names a node 1; `repeated` and `aggregate` decide only which values the
   merged node takes. A key another source supplied is a meeting, never a repeat.
7. **Loose matching.** `ignoreCase` and `ignoreSpaces` (both `false` by default) are choices of
   every step but `join.add`: keys match whatever their letter case (both sides lower-cased), and
   with every white space character removed. A `join.add` meets keys in a space exactly (6.1).
8. **Off (`off: true`).** Written only by graphty-element, when a refresh or replace leaves a step
   without a column it reads and the reader chooses Off: the step is kept, listed and written
   back, and is not built until it is turned on again (the member removed). `off` is never
   `false`. An `off` step is kept and written back whatever its `op`, one the reader does not know
   included, and is checked only for `op`, `source` and `off`.
9. **`join.merge` folds.** It no longer adds node 2's rows as nodes of their own: rows that should
   become new nodes are a `join.node-values` with `unmatchedRows: "add"`. With `unmatchedFrom:
"keep"` and the field being node 1's key, a kept node 2 moves into node 1's space, keyed by its
   field value, and its former space and key become its alias.
10. **Refused.** A step that makes elements from no row (a link step, `join.link`), connect's "a
    node per row" form, and the choice `keys` onto a graph column have no version 2 spelling:
    saving one refuses that part and reports it, and a reader meeting one holds the section. The
    step members `compare`, `membership` and `action`, a step `mapping`'s member `many`, and the
    `read` members `latitude`, `longitude`, `coordinates`, `country`, `region`, `city` and
    `renamed` (and `time` and `timeUnit` on a step that makes no edges) are reserved (10): a
    reader meeting one holds the section.
11. **Clashes (`clash`).** When a step's source gives an element a value for a column (by working
    name) that an earlier source already filled, the step's `clash` decides what shows. `clash` is
    one rule for every column the step writes, or an object of rules keyed by working column name
    with `"*"` for the rest (`{ "*": "keep", "amount": "max" }`); absent, and for a column an
    object neither names nor covers with `"*"`, the rule is `keep`. An empty held cell is filled
    and is no clash; equal values are no clash.

    | Rule        | Shows                                                                       |
    | ----------- | --------------------------------------------------------------------------- |
    | `keep`      | the held value: the first source's in step order                            |
    | `overwrite` | the incoming value                                                          |
    | `both`      | the held value, and the incoming one in its clash column (below)            |
    | `min`/`max` | the smallest or largest of the sources' values (numbers, or ISO 8601 dates) |
    | `mean`      | the mean of the sources' values (numbers)                                   |
    | `vote`      | the value most sources hold; a tie keeps the held value                     |

    `min`, `max`, `mean` and `vote` read every supplying source's own value of the cell up to and
    including the step, so the result never depends on which two met first. A cell a number rule
    cannot read (a value that is not a number, or not a date for `min` and `max`) keeps the held
    value, and the reader reports `W_CLASH_RULE_TYPE` (params `{ step, column, rule, cells }`,
    `step` the step's index in `joins`). A rule a reader does not know holds the section. Every
    source's own value stays in its copy whatever shows.

    The clash column of `both` is named `<column> (<source id>)`, and exists whenever the held cell
    is filled, even when the values are equal, so a refresh never deletes a column a saved layer
    reads. When that name is taken too (one source giving two values of one name), ` 2`, ` 3`, ...
    is appended until it is free (`<column> (<source id>) 2`). The source's own key column never
    clashes, since the key is what matched its row to the element. A clash column is no source's
    own value: a reader makes it again on every open, and no copy holds it.
    The names `id` (and on edges `source` and `target`) are held by an element record's own
    fields, so a column added to a copy beside the source's own columns that would take one of
    them is named `<column> (<source id>)` instead; a source's own key and end columns keep their
    names.

12. The recipe's join steps (4.3) share this spelling. Opening a file rebuilds the data from its
    own history; the recipe's steps apply to new data only when the caller asks.

Two sources split by their steps. `T`, a flat transactions file, is read as edges from
`account_id` (space `account`) to `merchant_id` (space `merchant`), and each name column is moved
onto the node it describes. `P`, a payments file whose rows are nodes and whose `counterparty_id`
holds merchants and devices, makes one edge per row to its counterparty, a part per id system;
the device part is off.

```json
"joins": [
  { "op": "join.add", "source": "src_01JZ00000000000000000000T0" },
  { "op": "join.node-values", "source": "src_01JZ00000000000000000000T0",
    "read": { "table": "edges", "key": "account_id", "space": "account" },
    "columns": ["account_name"] },
  { "op": "join.node-values", "source": "src_01JZ00000000000000000000T0",
    "read": { "table": "edges", "key": "merchant_id", "space": "merchant" },
    "columns": ["merchant_name", "category"] },
  { "op": "join.add", "source": "src_01JZ00000000000000000000P0" },
  { "op": "join.edges", "source": "src_01JZ00000000000000000000P0", "part": 1,
    "read": { "table": "nodes", "source": "payment_id", "sourceSpace": "payment",
              "target": "counterparty_id", "targetSpace": "merchant", "weight": null },
    "rows": { "column": "counterparty_kind", "values": ["merchant"] },
    "columns": [], "repeated": "first" },
  { "op": "join.edges", "source": "src_01JZ00000000000000000000P0", "part": 2,
    "read": { "table": "nodes", "source": "payment_id", "sourceSpace": "payment",
              "target": "counterparty_id", "targetSpace": "device", "weight": null },
    "rows": { "column": "counterparty_kind", "values": ["device"] },
    "columns": [], "repeated": "first", "off": true }
]
```

A payment row whose kind is neither is read by no `join.edges` step and makes no edge.

graphty-element today builds only `join.add`, with its own `duplicateIds`, and the graph's
`repeatedEdges` (6.1); it never builds a `join.edges` step, so it writes no `<part>/` key. It holds the data
section (4.1.10) for any other step that is not `off`, for a `join.add` carrying `columns`, and
for a second `join.add` of one source, so such a file is written back exactly as read (8.4).

#### 4.1.9 The merged graph

`graph` is NetworkX node-link JSON holding only the embedded sources' rows, recomputed on open (it
is output, never input to the build):

- It always writes `directed`, `multigraph` and `graph` (graph-level attributes, `{}` when none).
  `multigraph` is `true` exactly when two edges share both ends (an unordered pair on an
  undirected graph), never a reader choice.
- Each node carries `"graphty.space"`, `"graphty.key"`, `"graphty.types"` (at most one item) and
  `"_source.loads"`: the source ids that supplied it, in step order. A node no source's rows supply
  (only edges name it) is supplied by the sources whose edges reach it, and lists those; it is no
  row of their copies, keeps its key when the file is saved again, and is never a reader addition.
  This is decided after the build, so load order never changes it, and holds for a source read
  from any file format. Once no edge reaches it, or once it holds a value, the save writes it as a
  row of the sources that named it, so a reopen keeps it. `["reader"]` is the list of a
  node the reader added (in the space `source:reader`) and nothing else lists `reader`: an edit to
  another element never adds it, and a merge keeps the union of both nodes' lists.
- Each edge carries `"graphty.load"`, `"graphty.key"`, `"graphty.types"` (at most one item) and
  `"_source.loads"`. graphty never writes a node-link `key`.
- The node-link `id`, `source` and `target` are handles unique within the file only, since a key
  repeats across spaces.
- Every other member is a working column, by working name: every working column is written, key,
  end, edge-id and type-rule columns included, even one that repeats `"graphty.key"`. A column
  named after a node-link handle (`id`, `source`, `target` or `key`) is written as
  `<name> (column)`.

#### 4.1.10 Built whole or not at all

A reader MUST build the data section completely or not at all. It MUST skip the whole data
section and hold it (8.4), reporting `W_SECTION_KEPT`, on any of:

- a join `op` it does not know, on a step that is not `off`;
- a reader operation `op` it does not know;
- an unknown member of a closed data object (10) that is neither `extensions` nor named in that
  object's `ignorable`.

A source `kind` or `copy` form it does not know is a state of that source alone (10), not a reason
to hold the section. So is a source's `options` or a network `origin.ledger` it cannot read
(4.1.2 rules 7 and 9): they are read only to read the source again, so an unknown or ill-typed
member in them fails only that source's refresh. An embedded source is built from its copy and is
not refreshable (`W_UNKNOWN_MEMBER`); a referenced one is held (`W_SOURCE_UNAVAILABLE`, reason
`options` or `ledger`).

### 4.2 style

A style section holds `layers` (REQUIRED), `palettes`, `shaders`, `tree`, `valueLabels` and
`assets`.

1. A layer has `id` (REQUIRED, unique in the section), `name`, `target` (`node` or `edge`),
   `selector`, and `set` and/or `encode`; optionally `source`, `enabled`, `userData` and `row`
   (in style and view alike: the id of the layer that keys its row, shared by the node and edge
   parts of one row, which open again as one row). A layer
   has no `kind`: there are no special layers. `source.by` is `run`, `template` or `plugin`; a
   layer no run, template or plugin made writes no `source`, in style and view alike.
2. `set` maps channel names (`node.color`) to values; `encode` maps channel names to bindings
   (`{ "by": <path>, "scale", "palette", ... }`). Channel names are those `registry/channels.json`
   lists (10.1), and a value `set` gives MUST be of the channel's `accepts` kind and within its
   range; a binding's `scale` is a name `registry/scales.json` lists, defined in builtins.md
   "Scales". A binding with a `map` may carry
   `"unmapped": "skip"`: an element whose value the map holds no entry for is left as the layers
   beneath paint it (absent, the value goes on through the scale); `unmapped` needs a `map`. A value naming a built-in (a node shape, an
   arrowhead, a line pattern, a label look) MUST be a name from `builtins.md`.
3. Selectors: `everything`, `has` (`path`), `expression` (`where`: an expression, 4.8.2), `top`
   (`path`, `n`), `member` (`of`: `graph`, `largest-component`, `{ "set": <set id> }`, `{ "where" }`
   or `{ "types" }`), `rule` (`where`: a rule tree, 4.8.3), `state`, `hover`, and `type` (`types`: matches an element
   holding any listed type). The `ids` selector never appears in a style section.
4. A path is a raw path (4.8.1). A style section names a run by its name (`as`), and so does a
   layer's `source.runId`. A bare set id names a recipe's set. graphty-element today computes none
   of the readable paths per element (4.8.1 rule 3): a style or view layer reading one (or
   `graphty.types`) is kept as read and written back in its place, reported `W_UNKNOWN_MEMBER`
   with `reason` `E_UNKNOWN_ATTRIBUTE` and the layer's pointer, and so is the one view
   `visibility` member (the filter, the window, or one condition) reading it, while the rest of
   `visibility` is applied; a run reading one is not run (`W_RUN_NOT_RUN`) and kept.
5. A style section MUST NOT name an element or a dataset. A writer MUST leave out, and report
   (`W_ELEMENT_NAMING_LEFT_OUT`, params `{ section, pointer }`, the writer's own `layer` id when it has one, and `movedTo: "view"` when the same save writes the view section that carries the layer), every layer section 5 rule 5
   places in view.
6. **Data built-ins are carried.** Every palette a binding names MUST be in `palettes`; every shader
   a layer, encode key or background names MUST be in `shaders` as `{ "id", "text" }`.
7. `tree` holds the style tree, bottom first: rows `{ "layer": <layer id> }` or
   `{ "folder", "children" }`, each with optional `pin`, `locked` and `hidden`.
8. `valueLabels` lists `{ path, value, label }`, `path` a value path (`data.<column>`,
   `results.<as>.<field>`).
9. **Unset channels.** A channel no layer sets is drawn with the renderer's own look. That look is
   informative, not part of the file's meaning, and may change with no version change. A file that
   wants a fixed look sets the channel in a layer; the starting rows a new project writes are such
   layers.

### 4.3 recipe

A recipe section holds `commands` (REQUIRED) and `namespace`. The commands, in order:

| `op`           | Members                                                                                                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph.filter` | `where` (an expression, 4.8.2), `on` (`nodes` default, or `edges`), `dropIsolated`, `description`                                                                                                                 |
| `algo.run`     | `algorithm`, `as`, `style` (REQUIRED), `params`, `scope`, `seed`, `sample`, `exact`, `recordedCapSeconds`, `recordedPrecision`, `description`                                                                     |
| `layout.set`   | `id` (an arrangement, REQUIRED), `dimension` (`2` or `3`, REQUIRED), `options` (the arrangement's options, by the names the layout registry gives them, the seed among them), `drawnBy` (5 rule 9), `description` |
| `set.define`   | `id` (`set_` plus a ULID, bare), `name`, `where` (an expression or a rule tree (4.8.3) naming no element), `reading`, `description`                                                                               |
| `join.<shape>` | a join step (4.1.8), naming sources by role                                                                                                                                                                       |

Every command MAY also carry `narrows` (only `false` is ever written), `extensions` and
`ignorable` (10). A reader that knows the command's `op` ignores `narrows`.

1. `as` is unique within the recipe. A run's id is `<namespace>__<as>`.
2. `scope` is `graph`, `largest-component`, `{ "where", "on" }`, `{ "types": [...] }` or
   `{ "set": <set id> }`.
3. Every `algo.run` writes `style`: the run's suggested-style setting, or `false` when any saved
   layer reads the run, in a style or view section, in the same file or not.
4. Steps carry no algorithm or layout version; the version that ran is recorded in results and
   view. A recipe says what to run, not what ran: `layout.set` names the arrangement in `id`,
   never the engine that draws it, and records no versions. The engine its author's session drew
   it with is provenance in `drawnBy` (5 rule 9). `params` on `algo.run` and `options` on `layout.set` hold the value used
   for every option the implementation declares with a default (9 rule 10). A hand-written command
   may leave options out, and the reader applies its own current defaults. A recipe's seed (on
   `algo.run`, or in `layout.set`'s `options`) asks for a seeded run; which code it seeds is
   recorded where the run is recorded (4.5 rule 6), never in the recipe.
5. A recipe never names an element. A rule naming an element cannot be a recipe step: the writer
   leaves it out and reports it.
6. **Applying under a namespace** writes each `set.define` id as `set_<namespace>.<ULID>` and
   rewrites every reference to it in the applied sections, as run ids are rewritten;
   `onRepeat: "replace"` replaces the earlier application's sets. A rename edits paths, never other
   text: it rewrites the raw path of each path member (4.8.1 rule 2) and the paths inside
   expressions by token, never inside a string literal, and quotes a renamed name that is not a
   plain name.
7. An unknown `op` (`E_UNKNOWN_COMMAND`) stops the replay at that command, unless the command
   carries `narrows: false`. A reader then skips that command and every command that reads its
   `as` (each `algo.run` among them reported `W_RUN_NOT_RUN`) and goes on. A writer writes
   `narrows: false` only on an op that adds without filtering, never on `graph.filter` or
   `set.define`. A third party's op is its reverse-domain name plus a word
   (`org.example.motif-census`). A recipe written back as read (8.1 rule 5) keeps the command as read.
8. An `algo.run`'s `algorithm` is a key `registry/algorithms.json` lists, or an extension's key
   (10.1 rule 4); its `params` are named by that entry's options. A former key or option name is
   read as its current one (10.1 rule 2). A `layout.set`'s `id` and `options` follow
   `registry/layouts.json` (5 rule 9).

### 4.4 settings

A settings section holds `settings` and `playback`.

1. `settings` holds the settings in the table below, by the table's names. The names belong to
   this spec, not to graphty-element's config paths, and a reader maps them to its own settings. A
   graphty name never contains a dot. A third party's setting is `<reverse-domain>.<name>`. A
   reader keeps a key it does not know and writes it back.

    | Name                    | Value                                                                                                                                                                                                                                       | Meaning                                                                                                                               |
    | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
    | `runAlgorithmsOnLoad`   | boolean                                                                                                                                                                                                                                     | Whether the on-load algorithms run when new data is loaded (never when a file opens, 8.2 rule 4).                                     |
    | `runPlacement`          | `"beneath"` or `"top"`                                                                                                                                                                                                                      | Where a finished run's layer lands: beneath the lowest written layer that drives the same property, or on top of the unpinned layers. |
    | `layoutTransition`      | `{ transition, seconds?, hold?, params? }`, `seconds` 0 to 30, `hold` 0 to 1                                                                                                                                                                | How nodes move to a new layout.                                                                                                       |
    | `layoutStepsBeforeDraw` | number >= 0                                                                                                                                                                                                                                 | Layout iterations before the first drawing.                                                                                           |
    | `layoutStepsPerFrame`   | number > 0                                                                                                                                                                                                                                  | Layout iterations per drawn frame.                                                                                                    |
    | `layoutSettleDelta`     | number >= 0                                                                                                                                                                                                                                 | The largest move in a round of iterations below which the layout counts as settled and stops; 0 means it never settles early.         |
    | `background`            | `{ backgroundType: "color", color?, darkColor?, shader? }` or `{ backgroundType: "skybox", data, projection?, color?, darkColor?, shader? }`, where `shader` is `{ id, params? }` resolved against the style section's shaders (4.2 rule 6) | What the graph is drawn against.                                                                                                      |
    | `selectionStyle`        | look: `{ color, scale, opacity, edgeColor, edgeScale, edgeOpacity }`                                                                                                                                                                        | The look of the Selected starting row.                                                                                                |
    | `pinnedStyle`           | look                                                                                                                                                                                                                                        | The look of the Pinned starting row.                                                                                                  |
    | `timelineHiddenLook`    | `"hidden"` or `"ghost"`                                                                                                                                                                                                                     | How the Timeline Hidden starting row starts.                                                                                          |
    | `minMarkSize`           | `{ node?, edge? }`, numbers >= 0                                                                                                                                                                                                            | The smallest a node is drawn (`node.size` units) and an edge (`edge.width` units).                                                    |

    The following are never settings; a reader reports one found here (`W_UNKNOWN_MEMBER`) and
    drops it:
    - `viewRotation` and `framing` (view holds them);
    - `author` and `name`;
    - `startingRows` and `editableBase`;
    - `timelineHiddenAdded` and `startingCamerasWritten` (per-project bookkeeping, worked out on
      open, 8.2 rule 2);
    - any `data.*` name. Each has its home in the data section, and one with no home is refused on
      save and reported (8.1 rule 2).

2. `playback` holds timeline playback: `mode`, `step`, `missing`, `timeZone`, `ageFade` and
   `results`. How what lies outside the time window draws is held by the style layers that select
   it, never here.
3. Settings that name columns list them in `dependencies.columns`.
4. Loading a settings section onto an open project sets only the keys it holds. An absent key
   means the reader's own default, and only when a file is opened as a new session. A writer
   writes every key this section holds that has a value in force (9 rule 10).

### 4.5 results

A results section holds `bindsTo` (REQUIRED, `{ data }` only), `runs` (REQUIRED) and `layout`.

1. `runs` is an object keyed by run id. A recipe-made run writes `namespace` and `as`; a
   hand-started run writes neither, and its run id is its only name.
2. A run holds what actually ran: `algorithm`, `params` (every declared option's value as it ran,
   9 rule 10, with element-naming options as element references), `engine` (the code that
   computed it, rule 6), `seed` (the seed it used, or `null`),
   `durationMs` (absent when the run was not timed, never 0), `bindsTo` (6.4), `fields` (`{ name, kind, type }`, `kind` being `node`, `edge` or
   `graph`; a field's name, kind and type as `registry/algorithms.json` lists it for the run's
   algorithm), `caveats`, `graph` (graph-level values), and `nodes` and `edges` outputs.
3. `caveats` is graphty-element's `Caveats` without its deprecated `notes` and `partialReason`
   (the words are rebuilt from `facts` and `partialCause`), without `seed` and without
   `accelerator`: the run's own `seed` and `engine.accelerator` are the authority, and a reader
   puts them back into the caveats. Its `method` is an
   identifier (the algorithm's key, or a method of its own such as `stoer-wagner`), never
   reader-facing text: an application names it.
4. Outputs are columns: `{ "refs": [<element references>], "columns": { <field>: [values] } }`,
   every column as long as `refs`.
5. `layout` is the layout's record: `id`, the arrangement; `dimension`; `options`; `drawnBy`
   (5 rule 9), the options of both holding every declared option's value as it drew; `seed`; `durationMs` (absent
   when the layout was not timed, never 0, as for a run); `engine` (rule 6); `bindsTo`; and
   `nodes: { refs, columns: { x, y, z } }`. It has no run id; one layout is in force at a time.
   When `options` also hold a seed, the record's own `seed` wins.
6. **Engine.** Every record of something that ran holds `engine`: each results run and the
   results `layout`. The view `layout` and a view run record with a seed hold it when the writer
   drew those positions or computed that run, or restored them from a record that held one; a
   file naming a layout or a seeded run that has not run yet leaves it out, since a writer never
   writes a version it did not read. A reader treats an absent `engine` as one it cannot compare.
   It holds:
    - `packages` (REQUIRED, at least one member): an open map from package name to the version
      that ran. It lists every package whose code could have changed the numbers and whose
      version the writer read from the package itself. A writer never writes a version it did not
      read; it MAY list a package that took no part. A bundled or depended-on library is covered
      by the listing package's version. For a run, graphty-element lists itself,
      `@graphty/algorithms`, the attached accelerator's package
      (`@graphty/webgpu-graph-algorithms`) and any extension that declares a version, under its
      catalog key. For a layout, it lists itself, `@graphty/layout` and the attached
      accelerator's package.
    - `accelerator`: `cpu`, or the backend that computed it (`webgpu`). An open vocabulary,
      absent when unknown (as in a record migrated from version 1).
    - `method`: written only when the code that consumed the seed is not what the record names
      (`drawnBy.engine` for a layout, `caveats.method` for a run).

    A seed reproduces a drawing or a result only under the same engine. A reader compares
    `packages` by key, ignores `engine` members it does not know and keeps them. `engine` records
    what ran, never the reader's versions: a restored record is written back with its saved
    `engine` until that run or layout runs again. For example, a run on the GPU holds
    `"@graphty/webgpu-graph-algorithms": "0.6.69"` among its `packages`, with `"accelerator":
 "webgpu"`.

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

| Member          | Holds                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `camera`        | the pose the file opens at: `dimension`, the pose for that dimension, and optionally `controller` and `controllers` (rule 2)         |
| `views`         | saved views: `{ "name", "camera", "follows", "key", "filters", "layers", "hidden", "positions", "legend" }`, `camera` or `follows`   |
| `selection`     | `{ "nodes": [...], "edges": [...] }` element references                                                                              |
| `pinned`        | the pinned nodes only: `{ "node", "position": { "x", "y", "z" } }`                                                                   |
| `groups`        | the collapsed groups, in the order they are collapsed again: `{ "groupBy", "group", "position", "pinned", "edges" }` (rule 8)        |
| `sets`          | every set: `{ "id", "name", "definition" }`                                                                                          |
| `visibility`    | `filter`, `window`, `showContext`, `conditions`, `hidden` (rule 4)                                                                   |
| `timeline`      | `{ "at" }`, the timeline's playhead, as version 1 spells it                                                                          |
| `viewRotation`  | degrees, -360 to 360: the project setting a new or reset 2D view starts at. The turn in force is the 2D camera's `rotation` (rule 2) |
| `framing`       | `{ "extent", "padding" }`, `extent` being `drawn` or `centers`                                                                       |
| `hiddenColumns` | `{ "kind", "name" }` working columns hidden from the table view                                                                      |
| `order`         | one list of layer ids for the whole stack, bottom first, style and view layers alike                                                 |
| `layers`        | the layers that name elements or a dataset (section 5 rule 5)                                                                        |
| `runs`          | the single ordered list of every run record, in the order made (rule 5)                                                              |
| `layout`        | the layout record in force: `{ id, options, dimension, drawnBy, engine }` (rule 7; `engine` 4.5 rule 6)                              |

1. Positions and cameras are in the frame of section 7. Every other position is layout output.
2. **Camera.** A camera is one neutral pose per dimension, in the frame of section 7, and every
   controller reads it. `dimension` is REQUIRED: `2` or `3`, closed, following the layout's
   dimension. A saved view's `camera` has the same shape.
    - In 3D:
        - `position` (REQUIRED) is the eye and `target` (REQUIRED) the point looked at; the two
          MUST differ.
        - `up` is OPTIONAL, default `{ "x": 0, "y": 1, "z": 0 }`. It may be any vector not
          parallel to the line of sight: a reader uses only its part perpendicular to the line of
          sight and treats a parallel `up` as absent.
        - `fov` is OPTIONAL: the vertical field of view in radians, in (0, pi). Absent, the
          reader's default applies. A 3D camera is always perspective.
    - In 2D:
        - `center` `{ "x", "y" }` (REQUIRED) is the world point at the view's center.
        - `halfWidth` (REQUIRED, greater than 0) is the world units from `center` to the left and
          right edges; the vertical extent follows the reader's aspect ratio.
        - `rotation` is OPTIONAL, default 0: the radians the drawing is turned counterclockwise on
          screen about `center`.
    - `controller` is OPTIONAL: `orbit` (3D) and `2d` (2D) today (builtins.md, "Camera
      controllers"). It is an open vocabulary, and a third party uses a reverse-domain name.
      Absent, the reader's default controller for the dimension applies. It never changes what
      the pose means.
    - `controllers` is OPTIONAL: an object of controller name to object, holding state a
      controller keeps beyond the pose. A reader reads only the entries it knows and keeps every
      entry on re-save. An entry MUST NOT contradict the pose; where the two disagree, the pose
      wins.
    - A writer converts its controller's state into the pose and never writes renderer or
      controller members (orbit angles, Euler pivots, distances, zoom factors, frustum edges)
      beside it. The pose is the camera with no viewport insets.
    - A reader that does not know `controller` applies the pose with its default controller for
      the dimension, reports `W_CAMERA_CONTROLLER_UNKNOWN`, and keeps the camera, `controllers`
      included, on re-save.
    - When a 2D file holds both `viewRotation` and a camera `rotation`, the reader applies
      `viewRotation` first and then the camera, so the camera's `rotation` is the turn the file
      opens at.
3. **Sets.** `definition` is graphty-element's set definition (`fixed`, `rule` or `path`), its node
   and edge members written as element references and its source leaves by source id. View holds
   every set in force, rule sets included whatever their rule names.
4. **Visibility.** `filter` is the filter in force, in one of two forms. One expression on nodes
   or edges is written in the shape of a `graph.filter` command without its `op` (common schema
   `graphFilter`): `{ "on", "where" }`, `on` being `nodes` or `edges`. Any other filter (a degree
   rule, one naming members, a group of leaves) is written as a rule tree in exactly the shape a
   rule set's `definition` holds its `where` (common schema `boundRuleTree`), element-naming
   leaves as element references. A reader tells the two apart by structure, not a tag: a rule
   tree has a `kind`, a `graphFilter` has none (expressions 4.8.2, rule trees 4.8.3). No filter is
   left out. `window` is graphty-element's `TimeWindow`: a bound is an instant,
   written as a `toISOString` string (a JSON number read there is milliseconds since 1970); `attribute`, `end`
   and `spells` are value paths (`data.<working column>`); the window's own `missing`, `mode` and
   `timeZone` win over playback's; no `windowRaw` flag is written. `conditions`
   holds every keep, exclude and select condition as one plain list, element leaves as element
   references, with no nested `version`. `hidden` holds the nodes hidden from the drawing.
5. **Run records.** Each carries its run `id`; a recipe-made run its `namespace` and `as`; the
   reader's `name` when it has one; `algorithm`; `params` (every declared option's value as it
   ran, 9 rule 10; element-naming options as element references: a node as `{ "space", "key" }`);
   `seed`; with a seed, its `engine` when it ran (4.5 rule 6); `scope`; `"derived": true` when graphty-element minted the run's id, as
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
7. **Layout.** The layout record names the arrangement in `id` and its engine only in `drawnBy`,
   as `layout.set` and results' `layout` do (5 rule 9); `engine` (4.5 rule 6), written when the
   positions in force were drawn, is the engine that drew them, and when those are the positions a results `layout` restored, it
   is that record's `engine`. Its `options` and
   `drawnBy.options` hold every declared option's value (9 rule 10).
   A layout scope (`layoutScope`) is not saved, and the save reports it.
8. **Collapsed groups.** A collapse replaces a group's members with one node standing in for them;
   it is the reader's decision, not data. The data section holds the graph expanded: every member,
   its edges and, in `pinned` and results' `layout`, its pin and coordinates; never the node or
   edges standing in. `groups` lists each collapse as `groupBy` (the node path the members were
   grouped by, `data.<column>` or `results.<run id>.<field>`), `group` (their value at it, a string,
   number or boolean), `position` (where the node standing in stood, when placed) and
   `"pinned": true` (when it was pinned). A collapse of collapsed groups comes after the groups it
   holds, and after every group an end of an edge it holds stands in for. A reader collapses each
   again in order, once the sets and runs are back, places the node standing in at `position` and
   pins it; one it cannot make is reported as `E_BAD_DOCUMENT` and the rest go on. An edge the reader added to a node standing in is a reader-added element (6.1: load
   `reader`, keyed as any reader-added edge) that no data row can hold. Its collapse entry lists it
   in `edges`, each as `{ edge, from, to, columns, dtypes }` exactly as a reader `add` (4.1.4),
   except that an end standing in for a group is written `{ groupBy, group }` naming its collapse.
   Each edge goes on the latest collapse among the ones its ends stand in for, and a collapse that
   hid an end comes later. A reader adds the entry's edges right after making that collapse, and makes a set naming one
   once the collapses are made. An end naming a collapse not yet made, or a node bound but no longer
   in the graph, and an edge whose `key` another reader edge has (in `data` or in any collapse), are
   reported `E_BAD_DOCUMENT`; an end bound to nothing is `W_REFERENCE_UNBOUND` (6.3). Each such edge
   is skipped and the rest go on.

### 4.8 Paths, expressions and rule trees

Selectors, filters, sets, run scopes, time windows and recipe commands read values through three
small languages, defined here once.

#### 4.8.1 Paths

1. A path is `<root>.<rest>`. There are four roots:
    - `data.<column>`: the whole rest is the working column name, which may contain dots
      (`data.el.load` reads the column `el.load`);
    - `results.<run>.<field>`: `<run>` runs to the first `.` after `results.`; a run's `as` and its
      id never contain `.`;
    - `graphty.<value>`: a value graphty-element computes (rule 3);
    - `_source.loads`, exactly.

    Any other first segment names nothing: a writer MUST NOT write one, and a reader reads null.
    The `text` leaf's `reads` also accepts `"id"`, the node's id.

2. A path member holds the raw path, never quoted: `"path": "data.amount (usd)"`. The path members
   are a selector's `path`, a binding's `by`, `valueLabels[].path`, the leaf members `attribute`,
   `path` and `reads`, the window's `attribute`, `end` and `spells`, and a collapse's `groupBy`.
3. **Computed values.** graphty-element computes these for every node or edge:

    | Path                                                       | Reads                                                                                  |
    | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
    | `graphty.degree`                                           | a node's number of edges                                                               |
    | `graphty.inDegree`, `graphty.outDegree`                    | a node's edges in and out, on a directed or mixed graph; no value on an undirected one |
    | `graphty.notes.count`                                      | how many notes the element has                                                         |
    | `graphty.notes.latest`, `graphty.notes.latestTime`         | the text and time of its newest note                                                   |
    | `graphty.source.<node path>`, `graphty.target.<node path>` | on an edge, a node path read at its source or target end                               |

    The **readable paths** are values graphty-element will compute for every node or edge, read by
    their bare names, in styles, filters, time windows and runs alike:

    | Path                           | Reads                                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------------------------- |
    | `graphty.type`                 | the element's one type (4.1.5)                                                                |
    | `graphty.load`                 | the first source in `_source.loads`                                                           |
    | `_source.loads`                | every source that supplied it, in step order (4.1.9)                                          |
    | `graphty.space`, `graphty.key` | its record key (6.1)                                                                          |
    | `graphty.time`                 | its resolved time, from its sources' time roles (4.1.3)                                       |
    | `graphty.weight`               | an edge's own weight, never rescaled, from the step that made it                              |
    | `graphty.draft`                | while a draft is displayed: `new`, `changed`, `merged`, `removed` or `unchanged`; never saved |

    A readable path, and any other `graphty.` path a reader does not know, is kept and reported as
    4.2 rule 4 says (`W_UNKNOWN_MEMBER`, `reason` `E_UNKNOWN_ATTRIBUTE`). `graphty.types`, the
    saved graph's plural, is reserved and is never a path.

#### 4.8.2 Expressions

1. A `where` is a **graphty expression**. It borrows JMESPath's syntax for paths, literals,
   comparisons, `&&`, `||`, `!` and parentheses, and adds arithmetic. The grammar and the rules
   below alone define what an expression means; it is not JMESPath, and an expression JMESPath
   also accepts may mean something else here. Three differences: the bare words `true`, `false`
   and `null` are values (JMESPath reads them as field names); a path is one raw path (4.8.1), so
   `data.el.load` reads the column `el.load` where JMESPath would walk nested keys; and two strings
   are ordered (JMESPath leaves that undefined). An expression is at most 1024 characters.
2. The grammar:

    ```
    expression := or
    or         := and ( "||" and )*
    and        := comparison ( "&&" comparison )*
    comparison := sum ( ( "==" | "!=" | "<" | "<=" | ">" | ">=" ) sum )?
    sum        := product ( ( "+" | "-" ) product )*
    product    := unary ( ( "*" | "/" ) unary )*
    unary      := "!" unary | "-" unary | operand
    operand    := literal | path | "(" expression ")"
    path       := name ( "." name )*
    ```

    Comparisons do not chain.

3. Tokens:
    - Whitespace separates tokens.
    - A `name` is `[A-Za-z_][A-Za-z0-9_]*`, or a JSON double-quoted string, which MUST NOT
      contain `.`.
    - A literal is a single-quoted raw string (only `\'` and `\\` are escapes), JSON between
      backticks (`` \` `` escapes a backtick), or a bare `true`, `false` or `null` that does not
      follow `.` and is not followed by `.` or `(`.
    - A path's names joined by `.` give its raw path (4.8.1): `data."amount (usd)"` reads
      `data.amount (usd)`, and `results."min-cut".value` reads `results.min-cut.value`.
4. Refused:
    - a bare number (write it between backticks: `` data.age > `30` ``);
    - `[`, `]`, `{`, `}`, `,`, `@`, `:`, a single `|` or `&`, the wildcard `*`, and function calls;
    - `-` between two names with no spaces (`a-b`: quote a hyphenated name, or put spaces round
      the minus);
    - `!` before a path of more than one name (write `!(data.a)`);
    - an expression that reads no path.
5. Values:
    - A missing value reads null.
    - `false`, null, `""`, `[]` and `{}` are false; everything else is true, `0` included.
    - `==` and `!=` are deep equality with no coercion: `` `1` `` is not `'1'`.
    - An ordering compares two numbers numerically and two strings by Unicode code point; any
      other pair is null. A string is never read as a time: compare times with a `range` leaf with
      `"as": "time"`.
    - Arithmetic takes numbers only; any other operand, and a result that is not finite (dividing
      by zero), is null.
    - `a && b` is `a` when `a` is false, else `b`; `a || b` is `a` when `a` is true, else `b`;
      `!a` negates truthiness.
    - An element matches when the expression's value is true.
6. **A refused expression fails only its holder**: a layer, a set, one `visibility` member (the
   filter, the window or one condition) or a run's scope. The holder is kept as written, written
   back, and reported `W_UNKNOWN_MEMBER` with `reason` `E_BAD_SELECTOR` and the pointer of the
   `where`. A recipe command holding one is a command with an unknown member: `E_UNKNOWN_OPTION`,
   and the replay stops.
7. Making a refused expression valid is additive. Changing what an accepted expression matches is a
   change of meaning (9 rule 4) and bumps style, recipe and view together.

#### 4.8.3 Rule trees

1. `all` (`of`: a list), `any` (`of`: a list) and `not` (`of`: one rule) combine; every other kind
   is a leaf.
2. A leaf speaks about nodes, edges or both. `all` and `any` fold only the halves that speak, and
   `not` negates only those. An empty group constrains nothing.
3. The leaves. The required members come before the `;`, the optional ones after it; a leaf
   with no `;` has only required members:

    | Kind            | Members                                                                                                                              | Matches                                                                                                                                                          | Speaks                                                      |
    | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
    | `expression`    | `where`                                                                                                                              | the nodes whose expression (4.8.2) is true                                                                                                                       | nodes                                                       |
    | `edges`         | `where`                                                                                                                              | the edges whose expression is true                                                                                                                               | edges                                                       |
    | `range`         | `attribute`; `min`, `max`, `as` (`"time"`), `nodes` (`all`, `ends`, `none`), `missing` (`include`, `exclude`)                        | the values in `[min, max]`; with `"as": "time"` the bounds are epoch milliseconds and an ISO time with no zone is UTC                                            | the halves carrying the attribute                           |
    | `categories`    | `attribute`, `values`; `nodes`, `missing`, `match` (`any`, `all`)                                                                    | the values among `values`; with `match`, a list value holding any or all of them                                                                                 | the halves carrying the attribute                           |
    | `degree`        | ; `min`, `max`, `direction` (`in`, `out`, `all`)                                                                                     | the nodes whose number of edges is in `[min, max]`                                                                                                               | nodes                                                       |
    | `component`     | `id`                                                                                                                                 | one connected component. Components are found ignoring edge direction and numbered from 0 in the order of each one's first node in the merged graph's node order | nodes                                                       |
    | `neighborhood`  | `seeds`, `depth`                                                                                                                     | the nodes at most `depth` hops from the seeds; in a bound section only                                                                                           | nodes                                                       |
    | `isolated`      |                                                                                                                                      | the nodes with no edge to another node                                                                                                                           | nodes                                                       |
    | `self-loop`     |                                                                                                                                      | the edges whose two ends are one node                                                                                                                            | edges                                                       |
    | `repeated-edge` |                                                                                                                                      | the edges after the first between one pair of nodes, in edge order                                                                                               | edges                                                       |
    | `state`         | `state` (`selected`, `hovered`, `ghosted`, `outsideWindow`, `pinned`)                                                                | the elements in a reader's state now; live, so a set or a visibility filter refuses it                                                                           | nodes and edges                                             |
    | `member`        | `of` (a scope form)                                                                                                                  | the members of a scope, usually a set                                                                                                                            | nodes and edges                                             |
    | `item`          | `item`                                                                                                                               | the elements one item of a result holds; in a bound section only                                                                                                 | the halves the result publishes                             |
    | `threshold`     | `path`; exactly one of `top`, `above` or `percentile`, plus `ties`, `from` (`high`, `low`), `missing`, `within` (`graph`, `visible`) | the elements whose value passes one cut: the top `n`, those above a value, or a share                                                                            | each half carrying the path                                 |
    | `text`          | `reads`, `mode` (`substring`, `exact`, `starts-with`, `ends-with`, `regex`), `text`; `caseSensitive`, `nodes`                        | the elements whose text passes a text test; case, accents and runs of spaces are folded unless `caseSensitive`                                                   | the halves carrying the value; `"reads": "id"` speaks nodes |
    | `source`        | `sources`; `side` (`nodes`, `edges`)                                                                                                 | the nodes and edges those sources supplied                                                                                                                       | `side`, or both                                             |
    | `union`         | `side`, `within`, `branches`; `sources`                                                                                              | everything in any branch that is on, each branch folded from `start` (`all` or `none`) by its ordered `add`, `keep` and `except` steps                           | `side`                                                      |
    | `hops`          | ; `of`, `max`, `direction`                                                                                                           | the nodes at most `max` hops from a reference; inside a union step only                                                                                          | nodes                                                       |
    | `touching`      | `ends` (`either`, `both`, `one`); `of`                                                                                               | the edges with that many ends in a reference; inside a union step only                                                                                           | edges                                                       |
    | `nonempty`      | ; `of`                                                                                                                               | everything while a reference holds a node, else nothing; inside a union step only                                                                                | nodes and edges                                             |
    | `same-value`    | `path`; `as`                                                                                                                         | the elements sharing a value for `path` with a reference node; inside a union step only                                                                          | the halves carrying the path                                |
    | `by-size`       | `path`; `min`, `max`, `top`, `from`, `ties`                                                                                          | the elements whose category for `path` has a member count in `[min, max]`, or is among the `top` categories by size                                              | the halves carrying the path                                |
    | `measure`       | `algorithm`, `field`; `params`, `bind`, `test`, `scope`                                                                              | the elements whose value of an algorithm's field passes `test`; inside a union step only                                                                         | the halves the field measures                               |

4. **Absent members.** An optional member left out means, as a format default (9 rule 9):
    - `min`, `max` (range, degree, by-size): no bound on that side; `as` (range): numbers.
    - `nodes` (range, categories, text): `all`, the leaf is silent about nodes when its value lives
      on edges; `ends` keeps only the ends of a passing edge; `none` holds no nodes at all.
    - `missing` (range, categories, threshold): `exclude`, an element with no value fails.
    - `match` (categories): a value is read as one category.
    - `direction` (degree, hops): `all`.
    - `ties` (threshold, by-size): `fewer`, the tie group a `top` cut falls in is left out; `all`
      takes it whole.
    - `from` (threshold, by-size): `high`, count from the highest values or largest categories.
    - `within` (threshold): `graph`, rank the whole column.
    - `caseSensitive` (text): false, case, accents and runs of spaces are folded.
    - `side` (source): both halves.
    - `sources` (union): every source's elements.
    - `of` (hops, touching, nonempty), `as` (same-value): no reference, so the step matches
      nothing.
    - `max` (hops): every node the reference reaches.
    - `params` (measure): every option at its default; `bind`: no option bound; `test`: every
      element the field measures passes; `scope`: the step's base.
5. **Union branches, steps and references.**
    - A union's `branches` are, in order, objects `{ start, steps }` with optional `id`, `name`,
      `autoName`, `color` and `on`. `start` is `all` (all of `side` within the base) or `none`.
      `on` false keeps the branch and leaves it out; absent, it is on. `id`, `name`, `autoName`
      and `color` are the writer's and never change what a branch matches.
    - A step is `{ op, rule }` with optional `id`, `on` (absent, on), `computedOn` (`base`, the
      default, or `so-far`, the branch before this step), `links` (a rule tree on edges: the step
      reads only the edges that pass it), `ends` (on an edge branch, how a node leaf is read:
      `both`, the default, or `either`), `frozenFrom` and `mode`. `op` `add` adds the matches to
      the branch so far, `keep` keeps only them and `except` removes them. A `union` is refused as
      a step's `rule`. `mode` is the writer's and never read.
    - A step's reference (`of`, `as` and each `bind` value) is a scope form (4.3 rule 2), or one of
      two strings valid only in a step: `hovered-or-selected` (the hovered node, else a lone
      selected node) and `so-far` (the step's input). A reference holding no node matches nothing.
    - `measure`'s `bind` maps the algorithm's node options to references. Its `test` is the body
      of a `range`, `threshold`, `categories`, `text`, `by-size` or `same-value` leaf, with that
      leaf's `kind` and without its path member (`attribute`, `path` or `reads`) and its `nodes`.
6. Leaf kinds are an open vocabulary, and each known leaf is closed. An unknown kind, or an unknown
   member of a known leaf, fails its holder as 4.8.2 rule 6 says. A leaf has no `extensions` or
   `ignorable` slot.

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
7. **Settings**: the settings table (4.4) is the whole list of what settings saves. A project
   setting not in it is saved in another named section or not at all.
8. **Column settings.** Renames belong to each source's `mapping`; type conversions to the data
   section's `conversions`; hidden columns to view.
9. **Layouts.** A layout record (recipe `layout.set`, results' `layout`, view's `layout`) names an
   arrangement, never the software that draws it.
    - `id` is an arrangement in the layout registry (10.1).
    - `options` holds only that arrangement's options, by the registry's names. `dimension` is the
      record's own member, never an option.
    - `drawnBy` is provenance: `{ "engine": <registered engine name>, "options": { ... } }`. Its
      `options` hold every option the engine was given that the arrangement does not list, by the
      engine's own name. `drawnBy` is optional and open.
    - A writer writes `drawnBy` whenever it knows the engine.
    - A reader MAY draw with `drawnBy.engine` when it can draw the arrangement with it, applying
      `options` then `drawnBy.options`. graphty-element does, so a seeded layout reopens as the
      same drawing.
    - Otherwise the reader draws with its default engine, applies `options` only, and reports
      `W_LAYOUT_ENGINE_UNAVAILABLE` (never an error).
    - An option the arrangement does not list, or that the drawing engine does not take, is left
      out and reported `W_LAYOUT_OPTION_NOT_APPLIED`.
    - An unknown arrangement fails the layout as before (`E_BAD_DOCUMENT` in a recipe).
    - Resolved values (9 rule 10) are split the same way: the options the arrangement lists go in
      `options`, the rest in `drawnBy.options`.

## 6. Naming nodes and edges

### 6.1 Spaces and keys

A node's **record key** is `(space, key)`; an edge's is `(load, key)`, `load` being the id of the
source whose row made it.

- A **space** is an opaque string, always written for the node key, `sourceSpace` and
  `targetSpace`, compared exactly after Unicode NFC normalization (applied when read), never
  inferred and never parsed. Names beginning `graph:` are reserved (10): a reader meeting one holds
  the data section. A type name (`account`), `shared:<name>` and `source:<id>` are only
  the names a writer proposes. Only the node-key column of a `join.add` step asks about its
  space: when it would add keys to a space that already holds another source's keys, the load plan
  reports the overlap count and the caller chooses merge (keep the proposed space) or keep
  separate (`source:<id>`); an API caller that does not choose keeps them separate, with
  `W_SPACE_OVERLAP` (params `{ source, space, count }`). The mapping records the result as its
  `space`, and a refresh reuses it and asks nothing again.
- A **key** is always a JSON string (11). An edge's key is its `edgeId` value; repeated ids within
  one source follow `duplicateIds`. A writer whose data holds two edges with one edge id in a
  source that does not `merge` leaves the later row's edge-id cell unset, so that row is keyless,
  and reports it (`W_MEMBER_LEFT_OUT`). A keyless row is keyed by its content, never by a copy id
  or its position, and the form applies per row:
    - An edge row whose edge-id cell is null or empty is keyed `<from>|<to>#<n>`. `<from>` and
      `<to>` are the key texts (11), after NFC, of its source and target cells as read, before any
      `via` or lookup, each with `\` written `\\` and `|` written `\|`. `n` counts from 1, in row
      order, over the rows of that source's table that have no edge id and the same ordered pair (on
      an undirected graph too), skipping any number whose key some row's edge id already holds. A
      `join.edges` step puts `<part>/` in front and counts over its `read.table` by its own read
      roles, every row whether or not the step reads it (4.1.8 rule 3).
    - A node row of a source whose mapping names no key column is keyed `<digest>#<n>`. `<digest>`
      is the first 32 lowercase hex digits of the SHA-256 of the UTF-8 bytes of the RFC 8785
      canonical JSON of an object holding the row's non-null cells, by working column name. Each
      cell is first written as section 11 writes it: a non-finite number as `"NaN"`, `"Infinity"`
      or `"-Infinity"`, an integer beyond 2^53 - 1 either way as its decimal string, and a `json`
      cell as its value; `n` counts rows with the same digest, from 1, in
      row order. A writer MAY then write these keys as a key column; graphty-element does, writing
      every node table with key column `id`, so the key holds after the first save.
    - Conformance cases: re-sorting or appending rows leaves every key unchanged; two rows from `a`
      to `b` are `a|b#1` and `a|b#2`; a row from `a|x` to `b` is `a\|x|b#1`; a re-sorted keyless
      node table keeps its keys; a node row `{ "big": 2^60, "score": NaN }` is hashed from
      `{"big":"1152921504606846976","score":"NaN"}`.

    A reader-added node is keyed by its id exactly as a source row is (its
    typed id in the `add`'s `columns.id`), so its id is the same after a save and a reopen; when
    another reader node's id has the same text (`1` and `"1"`), the later is keyed by a ULID minted
    once and kept, its typed id still in `columns.id`; a
    reader-added edge is keyed by its edge-id value when it has one no other reader edge repeats,
    else by a ULID minted once and kept, and its `load` is `reader`. A row whose node-key or
    edge-end cell is null or empty names no node: it is left out of the build and counted
    (`W_KEY_EMPTY`), as a load leaves it out.

- **Repeated edges.** `repeatedEdges` (`keep` when absent, whatever the session that opens the
  file held before) decides what becomes of edges between
  one pair of nodes (an unordered pair on an undirected graph), within one step or across sources:
  `keep` holds every one; `first` keeps the first and `last` the last row's values (but the first
  row's edge-id cell, so its key); `sum`, `min`
  and `max` keep the first with the reduced weight (an edge with no weight weighs 1); `error`
  refuses the build. Edges of different types are never reduced into one, and edges whose sources'
  weight meanings differ only by `first` or `last`. A reduced edge keeps the key and `load` of the
  first row read, in join step order and then row order (a `join.edges` step's own reduction keys
  it by its end pair, 4.1.8 rule 3); `_source.loads` lists every source it was reduced from, and
  every contributing row's `{ load, key }` is an alias of it, so a reference naming that row binds
  to it (6.3). Each source's copy keeps every row as read, the folded rows in their places, so
  saving and reopening reduces them again to the same edge.

### 6.2 Element references

```jsonc
{ "space": "account", "key": "acct-1002" }                         // a node
{ "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y", "key": "pay-889" }     // an edge
{ "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y", "key": "acct-1002|dev-9f3#1" } // a keyless edge row: the first from acct-1002 to dev-9f3
{ "load": "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y", "key": "2/acct-7|m\\|3" } // part 2's edge from acct-7 to m|3
```

A reference names the element by record key and nothing else; it never names an element-assigned
id. It MUST mean the same in a section file and in a full file, and references bind edges by
(load, key).

An edge's element-assigned id (the decimal counter graphty-element gives every edge) is kept across
a save and reopen, for every edge alike, by the data section's `edgeIds` member: an object keyed by
the edge's `load`, each value an object from the edge's `key` to its id, every edge in graph order,
an edge added to a node standing in for a group included (under `reader`). A writer writes every
edge; a source that could not be fetched keeps the ids it was read with. A reader gives each edge
the id saved for its (load, key) and continues its counter past the largest id the member names
(those of a source it could not fetch included) before any edge gets a fresh one, so no new edge
reuses one. An id the member names a second time, and a value that is not a decimal id below
2147483648 (2^31), are not used, and that edge gets a fresh id; both are reported as `W_MEMBER_LEFT_OUT` (pointer
`/edgeIds/<load>/<key>`). A file without `edgeIds`, or an edge it does not name, gets fresh ids.
The id is never the edge's own id from its file (its `edgeId` column), which stays its key. An edge reference never names its ends:
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
   it keeps those references unbound and reports them. A keyless row whose content a refresh
   keeps keeps its key (6.1). These get a new key, and their references stay unbound: a keyless
   edge whose end texts changed; a later keyless edge between the same ends after an earlier one
   is removed (its number moves down); a keyless node row any of whose cells changed.
4. A source id survives refresh and same-shape replace, so renaming a file or moving a URL unbinds
   nothing. No key depends on a copy id, so a new copy that holds the same rows binds every
   reference as before.

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
right-handed system (three.js, NetworkX's drawing, most GIS) mirrors z in every point, `up`
included. A 2D rotation is counterclockwise as seen on screen and does not change with handedness.
Annotations keep their file's frame (y up, file units) and their `scale`. A different frame would
be a new major version of the view section.

## 8. Saving and loading

### 8.1 Saving

1. The saver chooses the sections. A writer MUST write exactly those and report what each left
   out. One save writes either form: one section as a section file, or several as a full file.
2. **The refusal rule.** A save that cannot express something refuses that part and reports it
   (`W_MEMBER_LEFT_OUT`). Nothing is ever silently simplified.
3. **Results are optional.** By default results are not saved, and opening reruns the behaviors.
   A record or archive save includes them.
4. **Embed or reference** is chosen per source (4.1.2 rule 4); the default is embed and there is
   no size-based switch. A source graphty-element's own source references refuse is embedded
   instead, and the save report names it (`W_SOURCE_NO_PATH`, params `{ source, reason }`), with the
   reason `data.copies()` gives: `file` for a `file` source the saver asked to reference whose
   `path` is not known and that has no browser file handle, `inline` for rows handed over with no
   file, `join` for a joined table, `secret-url` for an address or network source read with a
   secret or credential a file never holds, `relative-url` for an address that is not absolute, and
   `no-seed` for a sample with nothing recorded to make it again. A source read from a file keeps
   what that file said of it. A source the session keeps as a reference (`data.setCopy`) is saved
   referenced when the saver asks nothing else. Every `path` written, also
   one written back as read (a held source's, a later graph's, a data section held whole), is
   resolved against the file the project was opened from and written relative to the file being
   saved (graphty-element's `location` save option). A path is written only when both locations
   are known: with no `location`, or a file outside that folder, it is lost, reported
   `W_SOURCE_NO_PATH`: a built source is embedded, a source that is already a copy (a later
   graph's, a data section held whole) stays a copy with no `path`, and a held reference or a later
   graph's reference, which this writer has no rows for, is written with no `path`, so reopening
   asks for the file.
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
   project, beneath view's own layers. Opening never paints a suggested layer. Two things a
   project gets only once are not saved, and are worked out when a file opens as a new project:
    - the Timeline Hidden row counts as already written when the file carries a style section, held
      or loaded;
    - the starting views count as already written when the file carries a view section.

    A section loaded onto an open project changes neither.

3. **Runs.** Each run is rerun (the default) or its saved results are restored, the caller's
   choice per run. A run recorded `"replayable": false` is not rerun: its saved results are
   restored if present, otherwise it is listed as not run (`W_RUN_NOT_RUN`). When both a rerun and
   saved results exist, the report says whether they agree (`W_RESULTS_DIFFER`). A results run or
   layout with no record in an open view is restored as saved, never rerun, and reported. A file
   with neither a view nor results opens with the new-project layout. When a run or layout whose
   record holds a seed and an `engine` (4.5 rule 6) is rerun and the rerun's engine differs, the
   reader reports `W_ENGINE_CHANGED` once per difference. A difference is a package version that
   differs or is on one side only, the accelerator, or the effective method (`method`, else what
   the record names). A layout is compared when it starts, so its accelerator is not compared.
   Unseeded reruns are not compared.
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
   several match, the layer is unbound and reported. Binding a run edits paths, never other text,
   as 4.3 rule 6 says.
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

Opening fetches each referenced `file` and `url` source again, through the usual network consent,
before the data section is built, and parses it with its `format`, `options` and roles. A file the
caller picked for a source is read in its place. A `file` source's `path` and a relative `url`
resolve against the location of the file being opened (graphty-element's `location` open option),
when the caller gives one. A `file` source with no `path` is read through the browser file handle
the opening browser keeps for it (4.1.2 rule 6); an open only checks the handle's read permission
and never prompts, so one that needs permission is held (`needs-permission`) until a refresh asks
during the reader's click. Otherwise the load plan lists the source as needing a file, with its
saved name.

Nothing a file names is fetched without the caller's consent (graphty-element's `fetchSources`
open option, `ownWork` by default), nor for a data section the open does not build, and each
source is read no further than the open's size limit.

1. The rows read again are built as an embedded copy's are. Each saved `columns` name the rows
   lack is reported (`W_MEMBER_LEFT_OUT`, pointer `/sources/<i>/columns/<table>/<name>`).
2. A source that cannot be read, or whose copy changed, is **held**: it reports
   `W_SOURCE_UNAVAILABLE` (params `{ source, reason }`: `not-found` when its fetch failed,
   `needs-file` when nothing says where it is, `read` when its bytes could not be parsed,
   `too-large` when they pass the open's size limit, `needs-permission` when the caller did not let
   the open fetch it, `copy-changed`, with the new byte count `size`, when a fetched or picked copy
   has another copy id than saved, `kind` for a kind this reader does not fetch, a referenced
   source of a kind it does not know among them, `copy-form` for an embedded copy whose form this
   reader cannot read, whose record and copy are written back verbatim, `options` for parse
   options this reader cannot read, and `ledger` for a network `origin.ledger` it cannot read,
   4.1.2 rules 7 and 9). A referenced
   `network` source gets a new copy on every read, so it is always held as `copy-changed`. A held
   source's join steps are not built and it supplies no elements; the graph is built without it.
   It keeps the edge ids its `edgeIds` names, and its record is written back exactly as read on the
   next save. A reader operation naming what it supplies (an `edit`, its `was` included, a
   `remove`, a `merge`, or an `add` of an edge to its nodes) is kept as read, not reported unbound,
   and written back. A held source stays in the open data as a load with no elements, kept as a
   reference (graphty-element's `data.copies()` lists it so), so the reader can supply it later. The
   file never marks a source held: there is no `held` member, and a held source reopens with
   `W_SOURCE_UNAVAILABLE` and a reason again.
3. A held source is built only when the reader asks (graphty-element's `data.refresh(source)`,
   whose call is the permission to fetch): its new bytes are read with its `format`, `options` and
   roles (a `network` source: its request replayed from `origin.ledger`, 4.1.2 rule 7) and built as
   rule 1 says, the reader operations kept for it are applied, and the build
   gets a new stamp (4.1.1), so a run on the old copy reports `W_DATA_CHANGED`. A refresh that
   parses but lacks a column its `mapping` names supplies no rows. A refresh that still cannot read
   the source leaves it held.

### 8.4 Skipped and held sections

A reader MUST skip a section whole, and **hold** it, when its `version` is newer than the reader
knows (`W_SECTION_KEPT`, params `{ section, version, reason }`), when it lists an extension the
reader lacks (`W_EXTENSION_REQUIRED`), when a known key holds another `kind`, when a data
section cannot be built whole (4.1.10), or, for a graph section, when the wrapper carries a `graphs` it cannot read
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
   (section 10), where only `extensions` and the members listed in `ignorable` are ignored. A
   writer adding a member to a closed object lists it in `ignorable` exactly when a reader that
   ignores it builds the same graph from the same sources (data) or runs the same command with the
   same result (recipe); otherwise the member is must-understand. graphty-element writes
   experimental content only under `extensions["graphty.experimental.<name>"]`; promoting it to a
   core member is an ordinary additive change. There are no minor versions.
4. A change of meaning bumps the major version and ships, in one change, a migration from the
   previous version, its JSON Schema and a sample file.
5. **Built-ins are immutable.** A name in `builtins.md` always means its normative definition. It
   is never changed, reused or removed; a retired name is listed as deprecated and still drawn. A
   different drawing gets a new name (`sinewave-2`), which is additive: an older reader fails that
   channel entry alone (10). A row's informative part (segment, point, subdivision and particle
   counts, and the mesh builder) may change in any release. An ordered list (the overflow
   sequences, and a channel's list that a binding without choices walks) only gains names at its
   end.
6. A writer MUST write the lowest version that can express the content.
7. A reader MUST read every version a release of graphty-element has written, upgrading an older
   one on read one step at a time, and report the upgrade (`W_SECTION_UPGRADED`, params
   `{ section, from, to }`).
8. A section whose version is newer than the reader knows is skipped and held (8.4).
9. **Who owns a default.**
    - A **format default** is one this specification or builtins.md states for a member it
      defines, in text or as a schema `default` keyword. Among them: `repeatedEdges`, a source's
      settings, the join step members of 4.1.8, a mapping's `timeParseZone` (absent, UTC: 4.1.3),
      `graph.filter`'s `on`, a note's `mediaType`, a view run's `replayable`, a 3D camera's `up` and
      a 2D camera's `rotation` (4.7 rule 2), a parse option's absent value where builtins.md states
      one, the absent value of each optional rule tree leaf member (4.8.3 rule 4), and every
      parameter default a built-in's Definition states in builtins.md: a binding's range `[0, 1]`,
      the scale options (`pow` `exponent` 1, `bins` `bins` 5, `quantile` `bins` 4, `reverse` false)
      and the transition parameters (`glide` `easing`, `stagger` 0.5 and the rest). It is frozen for
      the section's major version. Changing it is a change of meaning (rule 4), and that version's
      migration writes the old default into older files. An absent mapping role means none.
    - Every **other default** belongs to code the format does not version: algorithm and layout
      option defaults (the algorithms and layout packages, or a plugin), the settings defaults
      (graphty-element's `CONFIG_KEYS`; an absent `layoutTransition` or `pinnedStyle` is the
      reader's own, 4.4 rule 4), parser defaults (the `errorLimit` parse option's "the
      reader's default" among them), and the renderer's look for unset
      channels. Changing one never bumps a version and needs no migration.
10. **Writers save resolved values.** A writer MUST write the value used for every option that a
    run's algorithm or a layout's engine declares with a default: `algo.run` `params`, `layout.set`
    `options`, results run `params` and `layout.options`, view run records and view
    `layout.options`. It leaves out the options an engine derives from `dimension`, and a layout
    option whose declared default is null (off unless asked), unless they were asked for. A run's
    seed goes where 4.3 and 4.5 put it. A settings writer writes every key it holds that has a value
    in force. A reader meeting an absent option or setting applies its own current default, and the
    results it writes record the value used. Style is the exception (4.2 rule 9): a style writer
    need not write a scale or transition option whose format default it uses.

### 9.1 Version 1 files

A version 1 file (the nine-member `graphty-document` version 1, or a version 1 document of one
kind) is opened through a migration into the sections above:

- the nine members are regrouped into the seven sections and the session member is split;
- the data becomes one embedded source of kind `derived` holding the merged graph as tables, one
  `join.add`, its node ids as the key column in the space `source:<id>`, its types carried as a
  column under a type rule, and an empty reader source; its `metadata` holds the version 1
  `sources` member verbatim, and each node's original `_source.loads` is the copy column
  `version-1-loads`; the per-element values a session member's `fileStyles` (or `styleValues`)
  holds outside the data are carried into the derived copy as ordinary columns, named as a load
  names them (`<key>`, or `<key> (<format>)` beside a column the data already holds), and every
  layer path that read them (`graphty.style.<set>.<kind>.<key>`) reads that column; an element the
  data lacks, or a malformed column, is left out and reported (`W_MEMBER_LEFT_OUT`, pointer
  `/fileStyles/<i>/columns/<j>[/ids/<k>]`);
- a timed file saved before what lies outside the time window had a state of its own (no
  `outsideByLayers` mark, a time field, and a playback or a window saved) reads `"outsideWindow"`
  where its layers and rule sets read `"ghosted"`, and its playback's `outside` is written to the
  layers selecting that state (a new layer for a kind none selects), never to `playback`;
- hidden columns go into view, `columns.types` into `conversions`, declared measurements and
  ordinal orders into the type schemas (one on a column no type carries is reported as dropped),
  ignored issues unchanged, kept pairs into `issues.kept`;
- the `label` role becomes a style layer reading that column;
- each positional edge reference becomes `{ load, key }` with the key of the edge at that
  position: its id when it has one, else its row's keyless key (6.1), counted over the version 1
  links in order;
- element-naming layers go into view's `layers`, and every layer's `kind` is dropped;
- the session's visibility goes into view and its playback into settings; each saved run becomes a
  view run record and its outputs results; pinned nodes become `pinned`, other coordinates the
  layout's results;
- the session's `groups` (version 1) go into view's `groups`, the data member already holding the
  graph expanded; its `added` edges go into the `edges` of the latest collapse their ends stand in
  for, each keyed by a ULID derived from it under load `reader`; one whose ends stand in for no
  collapse is dropped, reported;
- every version 1 expression is rewritten as a version 2 expression (4.8.2): each bare number goes
  between backticks, and `data.` goes before each path whose first segment is not a root
  (`padj < 0.05` becomes ``data.padj < `0.05` ``); every rootless path member (4.8.1 rule 2) gets
  `data.`, version 1's bare column, except a layer source's `by`; an expression that still does not
  parse is carried as written and refused on load (4.8.2 rule 6);
- version 1 layouts (the session's layout, a recipe's `layout.set`) are written as 5 rule 9: an
  `id` that is an engine name or a deprecated name (`ngraph`, `force-2d`) is read as the
  arrangement that engine draws; the engine (version 1's `engine`, or the one the name stood for)
  goes in `drawnBy.engine`; options the arrangement does not list move to `drawnBy.options`; a
  version 1 layout naming no engine writes no `drawnBy`;
- `styleVersion` and `recipeVersion` are dropped, reported; notes version 1 targets become element
  references; base64 positions and results become plain numbers.

A migrated project cannot refresh one of its original sources separately. A version 1 section
document migrated without its project file keeps its edge targets unbound, since it does not hold the edges its positions name.

## 10. Open vocabularies and closed objects

An **open vocabulary** may gain values within a major version. A **closed object** MUST NOT be read
by ignoring a member it does not know.

| Section             | Open vocabulary                                                                                                                                     | A reader meeting an unknown value                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| wrapper             | `sections` keys                                                                                                                                     | skips it with `W_UNKNOWN_KIND`, keeps it on re-save                                                                                                                    |
| every section       | `dependencies.extensions` names                                                                                                                     | skips and holds the section (3.6 rule 4)                                                                                                                               |
| data                | source `kind`                                                                                                                                       | an embedded source is built from its copy and is not refreshable; a referenced one is held (`W_SOURCE_UNAVAILABLE`, reason `kind`); its record is written back as read |
| data                | `copy` form                                                                                                                                         | that source alone is held (reason `copy-form`)                                                                                                                         |
| data                | join step `op`, reader operation `op`                                                                                                               | skips and holds the whole data section (4.1.10); an `off` join step is kept and not built                                                                              |
| data                | `measurement` values                                                                                                                                | draws as with no measurement                                                                                                                                           |
| style               | channel names and scales beyond the registries (10.1), selector kinds, enumerated channel values, palette ids                                       | fails that channel entry or layer alone, keeps it                                                                                                                      |
| recipe              | command `op`, algorithm keys and layout ids beyond the registries (10.1), layout option names, `drawnBy` engine names, the parts of a run's `style` | an unknown `op` stops the replay unless the command says `narrows: false` (4.3 rule 7); layouts as 5 rule 9                                                            |
| results             | layout ids, layout option names, `drawnBy` engine names                                                                                             | 5 rule 9                                                                                                                                                               |
| notes               | target kinds, item key forms                                                                                                                        | the target reads unsupported and is kept                                                                                                                               |
| view                | camera controller names and `controllers` entries                                                                                                   | 4.7 rule 2                                                                                                                                                             |
| view                | run `scope` forms                                                                                                                                   | that run's replay stops; the record is kept on re-save                                                                                                                 |
| view                | layout ids, layout option names, `drawnBy` engine names                                                                                             | 5 rule 9                                                                                                                                                               |
| style, recipe, view | rule tree leaf kinds                                                                                                                                | fails the holder alone (4.8.2 rule 6)                                                                                                                                  |

Closed objects:

- In data: a source's `mapping` and `settings`, a type entry and its rules, a join step and its
  `read`, `rows` and `except`, a reader
  operation, the reader source itself, a source record and a network source's `origin`. An unknown member that `ignorable`
  does not name holds the whole data section (4.1.10): ignoring one would build another graph
  under the same build stamp. Also closed, but failing only their source (4.1.10): a source's
  `options` (closed per format, builtins.md "Parse options") and a network `origin.ledger` with
  its `limits`, `validators`, `expand` and each expansion.
- A recipe command and its `scope` (a `layout.set`'s `options` and `drawnBy` are not closed: their
  keys are open vocabularies, 5 rule 9): an unknown member that `ignorable` does not name skips the
  command and every later one (`E_UNKNOWN_OPTION`).
- A style's selectors, bindings and carried palettes: an unknown member fails that channel entry
  or layer alone, reported (`W_UNKNOWN_MEMBER`) and written back.
- The parts of a run's `style`.
- A known rule tree leaf (4.8.3): an unknown member fails its holder alone (4.8.2 rule 6).
- Element references, note targets and cites, a view run's `scope` and a set record: one with an
  unknown member is kept, unbound, unsupported or not replayed.

**Reserved names.** These have no shape yet, so a later version can give them one without breaking
a saved file; a reader refuses each today, as the rule for its object says: space names beginning
`graph:`; `graphty.types` as a style, filter or scope path (the saved graph still writes it,
4.1.9); the members `match` and `named` on a `{ types }` scope and on a `source` leaf (a
selector's own `match` is unaffected); the join step members `action`, `membership` and
`compare`; the `read` members of 4.1.8 rule 10; a step `mapping`'s `many`; and the reader
operation `merge`.

**Closed for writers only.** The schemas also close objects this list does not name: in view,
`selection`, `pinned` items, `groups` items and their `edges`, `timeline`, `framing`, a saved
view's `positions` and `layout`; in results, a run's `bindsTo`, its `fields` items, its `nodes` and
`edges` outputs, and `layout` with its `bindsTo`, `nodes` and `columns`; in data, `conversions`
items, `issues` and its `ignored` and `kept` items; in style, `shaders` and `valueLabels` items;
and `position`, `asset` and `assetFile` everywhere. A writer writes no member the schema does not
list in one of these, and a later version may add one only as an additive change. A reader reads
them as open objects (9 rule 3): it ignores a member it does not know and keeps it on re-save.

The schemas mark closed objects with `unevaluatedProperties: false` and leave open ones open. A
schema is normative for what a writer produces; a reader MUST NOT reject a whole document because
it fails a schema, and acts by the rules above instead.

### 10.1 Registries

A vocabulary the format owns is written by hand in this specification and checked against
graphty-element's code: the settings (4.4), and the parse options and drawing built-ins of
`builtins.md`. A vocabulary that other code owns -- the algorithms, the layouts, the style
channels and the scales -- is generated from graphty-element's catalog into `registry/` and
checked for staleness. Its names are still named built-ins and never reused. Algorithm keys and
algorithm option names are renamed only through former names (rule 2). Layout ids, layout option
names, channel names and scale names have no former names: within a major version they are never
renamed, and a retired one stays listed as deprecated (9 rule 5). The files are never edited by
hand.

| File                       | Each entry                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry/algorithms.json` | `key`, `formerKeys`, `shape`, `scopeInput`, `weightMeaning`, `requires`, `approximable` (`method`, `defaultSample`, `seeded`), `options`, `fields`                                                                                                                                                                                           |
| `registry/layouts.json`    | `id` (the arrangement), `maxDimensions`, `options` (the arrangement's saved options as option objects, 5 rule 9), `engines` (`[{ engine, options }]`, `options` the option objects of the extra options that engine takes: the `drawnBy` vocabulary). An option the engine works out from the dimension carries `"derivedFrom": "dimension"` |
| `registry/channels.json`   | `channel`, `target`, `accepts`, `values`, `min`, `exclusiveMin`, `max`, `integer`, `step`, `perWorldUnit`, `experimental`                                                                                                                                                                                                                    |
| `registry/scales.json`     | `name`, `domainKind`, `options` (the definitions are in builtins.md "Scales")                                                                                                                                                                                                                                                                |

Each file holds `registry` (its name), `version` (the shape of the file, now 1), `$generated` (a
note that it is generated) and the list, named as the file is. An option is `{ name, type, default, min, max, step, values, on, attributeType, formerNames, derivedFrom }`, `type`
being one of `number`, `integer`, `boolean`, `string`, `enum`, `seed`, `node-id`, `node-set`,
`edge-set`, `attribute`, `partition`, `ordering`, `color` or `unknown`; a `min` or `max` may be a
bound measured on the graph, such as `graph.nodeCount`. A field is `{ name, kind, type, unit,
normalization, measurement, directedOnly, domain, polarity, order, missing, unstable }`, read as
`results.<as>.<name>`.

1. The names are named built-ins: 9 rule 5 applies, except as rule 2 says.
2. **Renames are additive.**
    - A key is renamed by listing the old key in the entry's `formerKeys` as `{ key, params }`; an
      option by listing its old name in `formerNames`.
    - A reader that meets a former key in a recipe `algo.run`, a results run, a view run record or
      a layer `source` reads it as the current key, with the former key's `params` laid over the
      file's params.
    - A former option name is read as the current one; when both are present the current one wins
      and the former is dropped.
    - Each upgrade is reported `W_NAME_UPGRADED` (params `{ section, pointer, from, to }`).
    - A writer writes only current names. A former name is never given to another entry. Result
      fields have no former names: renaming one is a change of meaning.
3. An algorithm or layout option's `default` is informative: it is a package-owned default (9
   rule 9), and writers save resolved values (9 rule 10). A scale option's `default` in
   `registry/scales.json` is a copy of the format default builtins.md "Scales" states, and the
   staleness check keeps the two equal.
4. A key, layout id or channel in no registry, as a current or a former name, belongs to an
   extension and is open (10). An extension's algorithm or layout key SHOULD be reverse-domain
   (`org.example.leiden`), and no built-in key is.
5. Within a major version a registry only gains entries, options, fields and former names.
6. An option of type `node-id`, `node-set` or `edge-set` holds element references (6.2) wherever
   params are written.
7. An option marked `"derivedFrom": "dimension"` (an engine's `dim`) is worked out from the layout
   record's `dimension`. A writer writes it only when it was asked for a value the dimension does
   not give (a flat force drawing in a 3D view); otherwise `dimension` says it.

### Must-understand members

These closed objects may carry two optional slots: a join step and its `read`, `rows` and
`except`; a source record and its `mapping`, `mapping.nodes`, `mapping.edges` and `settings`; a
network source's `origin` and the top level of its `ledger`; a type entry and its rules; the
reader source and each reader operation; a recipe command and the object forms of its `scope`.
Neither slot is allowed on a `copy`, on `credentials`, on `options` or on the ledger's
sub-objects.

```json
{
    "op": "algo.run",
    "algorithm": "pagerank",
    "as": "rank",
    "style": true,
    "accelerator": "any",
    "ignorable": ["accelerator"],
    "extensions": { "org.example.audit": { "ticket": 42 } }
}
```

1. `extensions` works as in the section header (3): keyed by reverse-domain name, `graphty` and
   `graphty.*` reserved. A reader that does not know a name never reads it and never reports it.
   One a reader cannot do without is listed in the section's `dependencies.extensions` (3.6 rule
   4).
2. `ignorable` is a list of distinct member names of this object. A member the reader does not
   know that it names is ignored, reported `W_UNKNOWN_MEMBER` (params `{ section, pointer }`) and
   kept. A name the reader knows is read as usual. A member the reader does not know that it does
   not name is must-understand: in data it holds the section (4.1.10), and in a recipe it is
   `E_UNKNOWN_OPTION` and skips this command and every later one.
3. A malformed `extensions` (not an object keyed by reverse-domain names) or `ignorable` (not a
   list of distinct non-empty strings) counts as an unknown must-understand member.
4. Neither slot, nor any member `ignorable` names, is a build input (4.1.1): a change to them alone
   mints no new build.
5. On re-save the writer writes both slots, and every member it ignored, back on the object they
   were read on, while that object is still written: a source by its id, its `mapping` and
   `settings` by source and table, join steps and type entries as read, a recipe command kept as
   read. An object no longer written takes them with it. One the writer cannot place is reported
   `W_MEMBER_LEFT_OUT`.

## 11. Numbers and keys

- A finite number is the JSON number ECMAScript `Number::toString` writes. Non-finite values are
  the strings `"Infinity"`, `"-Infinity"` and `"NaN"`, read as numbers exactly where the declared
  type is number (a type schema, a numeric column dtype (builtins.md "Column dtypes"), a results field, an option typed number);
  any other string stays text.
- A key is always a string: a number as `Number::toString` writes it, so `34`, `34.0` and `"34"`
  are one key; a boolean as `true` or `false`. Cells are turned to text the same way before
  matching a type rule's `values`.
- An integer too large to hold exactly (beyond 2^53 - 1 either way) is written as its decimal
  string, and read back as a number only where the column's schema declares `number` or `integer`
  (a numeric column dtype); anywhere else it stays text. Its row is never refused.
- The prefixes `graphty.` and `_source.` are reserved in column names.

## 12. Archiving

- A document is plain JSON: no compression, no encryption, no undocumented binary. Positions and
  results are plain numbers; only asset files are base64, and only because they are binary files.
- The data section's `graph` is read by NetworkX:
  `networkx.node_link_graph(data, edges="links")` (`link="links"` before NetworkX 3.4). It holds
  only the embedded sources' rows, so an archive save SHOULD embed every source and SHOULD include
  results.
- Every section carries `kind`, `version` and `$schema`; every member has a schema; every named
  built-in is defined in `builtins.md` or in `registry/*.json`.

## 13. Codes

graphty-element reports what happened while reading or writing as `{ code, params }`. An
application words them.

| Code                          | When                                                                                                                      | Params                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `E_BAD_DOCUMENT`              | the file is not I-JSON, or has no known `kind`                                                                            | `section`                                                                                                  |
| `E_UNKNOWN_OPTION`            | a recipe command or scope has a member the reader does not know                                                           | `section`, `pointer`                                                                                       |
| `E_UNKNOWN_COMMAND`           | a recipe command's `op` the reader does not know                                                                          | `section`, `pointer`                                                                                       |
| `W_UNKNOWN_KIND`              | an unknown `sections` key, top level or in a later graph                                                                  | `section`, `graph`                                                                                         |
| `W_UNKNOWN_MEMBER`            | an unknown member of an open object, selector, binding, palette or run style, or one a closed object lists in `ignorable` | `section`, `pointer`                                                                                       |
| `W_SCHEMA_MISMATCH`           | `$schema` disagrees with `kind` and `version`                                                                             | `section`, `schema`                                                                                        |
| `W_SECTION_KEPT`              | a section is held, or a local change to a held kind was not saved                                                         | `section`, `version`, `reason`, `graph`                                                                    |
| `W_EXTENSION_REQUIRED`        | a section lists an extension the reader lacks                                                                             | `section`, `extension`                                                                                     |
| `W_SECTION_UPGRADED`          | an older version was migrated on read                                                                                     | `section`, `from`, `to`                                                                                    |
| `W_ELEMENT_NAMING_LEFT_OUT`   | a writer left element-naming content out of a reusable section                                                            | `section`, `pointer`, `layer`, `movedTo`                                                                   |
| `W_MEMBER_LEFT_OUT`           | a save, or a version 1 migration, could not carry something over                                                          | `kind` or `section`, `field` or `pointer`                                                                  |
| `W_SOURCE_NO_PATH`            | a source has nothing to read it again by: embedded, or written with no `path`                                             | `source`, `reason`                                                                                         |
| `W_SOURCE_UNAVAILABLE`        | a referenced source is held: not read, or its copy changed (8.3)                                                          | `source`, `reason`, `size`                                                                                 |
| `W_SOURCE_EMBEDDED`           | a source asked to be referenced was embedded: its rows are not its bytes                                                  | `source`, `reason`                                                                                         |
| `W_OPTION_NOT_SAVED`          | a load option builtins.md does not list was left out of the saved record                                                  | `source`, `option`                                                                                         |
| `W_SPACE_OVERLAP`             | a node key would add keys to a space another source already holds                                                         | `source`, `space`, `count`                                                                                 |
| `W_REFERENCE_UNBOUND`         | an element reference binds nowhere                                                                                        | `section`, `pointer`, `ref`                                                                                |
| `W_DATA_CHANGED`              | same data id, but a run's build or copy ids differ                                                                        | `section`, `sources`                                                                                       |
| `W_DATA_MISMATCH`             | a bound section was written on other data, or no data is open                                                             | `section`, `data`                                                                                          |
| `W_CAMERA_CONTROLLER_UNKNOWN` | a camera names a controller the reader does not know                                                                      | `section`, `controller`                                                                                    |
| `W_RUN_NOT_RUN`               | a run was neither rerun nor restored                                                                                      | `run`                                                                                                      |
| `W_RESULTS_DIFFER`            | a rerun disagrees with the saved results                                                                                  | `run`                                                                                                      |
| `W_ENGINE_CHANGED`            | a seeded run or layout was rerun under other code than its record names                                                   | `run` (run id or `layout`), `key` (package name, `accelerator` or `method`), `was`, `now` (string or null) |
| `W_SOURCE_UNKEYED`            | a source has no key column                                                                                                | `source`                                                                                                   |
| `W_NODE_NAMED_ONLY`           | nodes only edges name, kept, supplied by those edges' sources                                                             | `source`, `count`                                                                                          |
| `W_KEY_EMPTY`                 | rows whose key or end cell is null or empty were left out                                                                 | `source`, `column`, `rows`                                                                                 |
| `W_EDGE_END_MISSING`          | edges naming missing nodes were left out                                                                                  | `source`, `count`                                                                                          |
| `W_COLUMN_WIDENED`            | two types declare one column with different dtypes                                                                        | `column`                                                                                                   |
| `W_ROLES_DIFFER`              | built sources name a weight, time or location role differently                                                            | `table`, `role`, `sources`                                                                                 |
| `W_CLASH_RULE_TYPE`           | a number clash rule met a cell it cannot read; the held value stays                                                       | `step`, `column`, `rule`, `cells`                                                                          |
| `W_LAYOUT_ENGINE_UNAVAILABLE` | a layout's `drawnBy` names an engine the reader cannot draw that arrangement with; its default engine drew it             | `section`, `layout`, `engine`                                                                              |
| `W_LAYOUT_OPTION_NOT_APPLIED` | a layout option the arrangement or the drawing engine does not take was left out                                          | `section`, `layout`, `engine`, `option`                                                                    |
| `W_NAME_UPGRADED`             | a former algorithm key or option name was read as its current name (10.1)                                                 | `section`, `pointer`, `from`, `to`                                                                         |

## 14. Files in this directory

| Path                                                                                                                                                                             | What                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`                                                                                                                                                                      | this specification                                                                                                                               |
| `builtins.md`                                                                                                                                                                    | the built-ins registry                                                                                                                           |
| `registry/algorithms.json`, `registry/layouts.json`, `registry/channels.json`, `registry/scales.json`                                                                            | the generated registries (10.1); regenerate them with `npm run spec:registry` in graphty-element                                                 |
| `schemas/graphty-document/v2.json`                                                                                                                                               | the full file                                                                                                                                    |
| `schemas/<kind>/v<version>.json`                                                                                                                                                 | each section kind at its version                                                                                                                 |
| `schemas/common/v2.json`                                                                                                                                                         | definitions the others share (header, ids, element references, rule trees, layers, join steps)                                                   |
| `schemas/graphty-document/v1.json` and the version 1 kinds (`graphty-data`, `graphty-style`, `graphty-recipe`, `graphty-notes`, `graphty-assets` at v1, `graphty-sources` at v2) | the version 1 files the migration in 9.1 reads                                                                                                   |
| `conformance/expressions.json`                                                                                                                                                   | cases for the expression language (4.8.2): an expression, the values one element holds and whether it matches, or that the expression is refused |
| `examples/card-fraud.graphty.json`                                                                                                                                               | a worked example holding all seven sections                                                                                                      |
| `examples/card-fraud.graphty-*.json`                                                                                                                                             | each of its sections as a section file                                                                                                           |
| `examples/minimal/`                                                                                                                                                              | the smallest valid file of each form                                                                                                             |
| `examples/minimal/minimal-working.graphty.json`                                                                                                                                  | the smallest file that draws something on open: one embedded CSV, a run, a layer reading it and a layout (section 1)                             |
| `examples/minimal/minimal-graphs.graphty.json`                                                                                                                                   | a full file holding two graphs, the second referencing a file by its path                                                                        |
| `examples/minimal/minimal-referenced.graphty-data.json`                                                                                                                          | a data section holding one referenced source                                                                                                     |
