# The sources member

`kind: "graphty-sources"`, version 2, a member of a graphty document ([container.md](container.md)).
Schema: [sources.schema.json](sources.schema.json), `$id`
`https://graphty.app/schema/documents/graphty-sources/v2.json`. Edge-case rulings are rows of
[conformance.md](conformance.md), "Sources". The owner's decisions behind this page are in
[../data/data-management-requirements.md](../data/data-management-requirements.md), "Decided by the
owner: what a project file records"; the network sources it records are designed in
[../graph-io/network-sources-design.md](../graph-io/network-sources-design.md).

## Purpose

A project's graph is built by loads: a file the reader picked, a URL, a query to a network source
(a Neo4j database, NDEx, OpenAlex, a SPARQL endpoint), a sample graph, a table joined onto what was
there. The sources member is the one record of every load still in the graph: what was read, with
which mapping and options, when, and into which graph. It lets a reopened project say where each
node and edge came from, refresh a network load, and -- for a project saved without its data --
rebuild the graph by running the loads again.

It never holds a secret. A load that used a credential records only the name of the credential
slot it filled; the credential stays on the reader's machine (rule "What is never stored").

## Data model

```ts
interface SourcesMember {
    kind: "graphty-sources";
    version: 2;
    data?: "embedded" | "steps"; // default "embedded": see "Embedded data and steps only"
    loads: LoadEntry[]; // oldest first; at most 1,000
    extensions?: Record<string, unknown>; // reverse-domain keys (container.md, "Extensions")
}

type LoadEntry = FileLoad | UrlLoad | NetworkLoad | SampleLoad;

interface EntryCommon {
    id: string; // the stable load id: 1 to 64 of [A-Za-z0-9._-], starting with a letter or digit
    kind: "file" | "url" | "source" | "sample"; // open list: a later version may add kinds
    name?: string; // what the reader called the data; 1 to 1,024 characters
    graph?: string; // the id of the data member it loaded into; absent: the file's one graph
    loadedAt: string; // RFC 3339: when the load finished
    mode: "replace" | "merge"; // whether it emptied the graph first
    format?: string; // the data source that read it: "csv", "graphml", "json", ...
    options?: Record<string, unknown>; // the importer's options, as given ("Options")
    mapping?: Record<string, unknown>; // the column roles a table load was given ("Options")
    tables?: string[]; // the tables a multi-table load read, by name
    tableRows?: ("nodes" | "edges")[]; // what each of `tables` held: only with `tables`, as long as it
    joinedOnto?: string; // for a table joined onto an earlier load: that load's id
    join?: Join; // for a joined table: how it was joined ("Joins")
    added: { nodes: number; edges: number }; // how many it added when it ran
    leftOut?: LeftOut; // the edge rows it left out because they named no node (LoadedSource.leftOut)
    total?: { nodes?: number; edges?: number }; // what the source holds for it, when known
    extensions?: Record<string, unknown>;
}

interface FileLoad extends EntryCommon {
    kind: "file";
    file: { name?: string; size?: number; sha256?: string; mediaType?: string }; // size absent: not known; sha256: rule 7
}

interface UrlLoad extends EntryCommon {
    kind: "url";
    url: {
        address: string; // the URL read, as "URLs" rule 1 writes it
        sha256?: string; // the digest of the body read; rule 7
        fetchedAt: string; // RFC 3339
        etag?: string;
        lastModified?: string;
        dropped?: string[]; // query parameter names left out ("URLs" rule 2)
    };
}

interface NetworkLoad extends EntryCommon {
    kind: "source";
    source: {
        id: string; // the registered source id: "neo4j", "neptune", "cypher", "ndex", "openalex", "rest", "sparql"
        sourceVersion: number; // the source descriptor's version when it loaded
        endpoint: string | null; // origin and path only ("Network loads" rule 2); null: the source's default
        params: Record<string, unknown>; // the source's params, a REST mapping included
        credentialSlot?: string; // the slot a credential filled; absent: none was used
        pages: number; // pages read, at least 1, so a refresh reads as many (at most 100)
        next: Record<string, unknown> | null; // where a capped load continues; null: complete
        validators: Validators;
        expand?: ExpandBehavior; // the load's own click-to-expand behavior; a reader never takes its trigger
        expansions: Expansion[]; // in the order they were made; at most 10,000 in the member
    };
}

interface SampleLoad extends EntryCommon {
    kind: "sample";
    sample: { generator: string; params: Record<string, unknown> } | { dataset: string; baseUrl?: string };
}

interface Join {
    shape: string; // what the rows were read as: values for nodes, values for edges, or edges
    choices: Record<string, unknown>; // the join's choices, as given: keys, ignoreCase, columns, clash, ...
    rows: number; // how many rows the table holds
    matched: number; // how many the join matched
    columns: string[]; // the names the join wrote its values under
    table: { name: string; columns: string[]; rows: Record<string, unknown>[] }; // the table as read
    before?: Record<string, Record<string, unknown>>; // for values: what the join wrote over, by id
}

interface Expansion {
    id: string; // "<entry id>/x<n>", n counting from 1 in this entry
    ids: (string | number)[]; // the seed node ids; 1 to 1,000
    depth: number; // 1 to 10
    direction: "out" | "in" | "both";
    limit?: number; // 1 to 10,000
    relationshipTypes?: string[];
    at: string; // RFC 3339
    next: Record<string, unknown> | null;
    validators: Validators;
}

interface Validators {
    etag?: string;
    lastModified?: string;
    modified?: string; // the service's own modification time
    serverVersion?: string;
    contentHash?: string; // 64 lower-case hex digits, opaque: rule 8
}

interface ExpandBehavior {
    trigger?: "none" | "click" | "double-click";
    depth?: number;
    direction?: "out" | "in" | "both";
    limit?: number; // 1 to 10,000
    relationshipTypes?: string[];
    layout?: "continue" | "none";
}
```

```jsonc
{
    "kind": "graphty-sources",
    "version": 2,
    "loads": [
        {
            "id": "s1",
            "kind": "file",
            "name": "genes.csv",
            "loadedAt": "2026-10-20T09:12:03.120Z",
            "mode": "replace",
            "format": "csv",
            "options": { "edgeSource": "gene_a", "edgeTarget": "gene_b" },
            "added": { "nodes": 412, "edges": 1980 },
            "file": {
                "name": "genes.csv",
                "size": 48211,
                "sha256": "9f2c0000000000000000000000000000000000000000000000000000000000e1",
            },
        },
        {
            "id": "s2",
            "kind": "source",
            "loadedAt": "2026-10-20T09:15:40.002Z",
            "mode": "merge",
            "options": { "existing": "keep", "limits": { "maxNodes": 100 } },
            "added": { "nodes": 100, "edges": 231 },
            "total": { "nodes": 28455 },
            "source": {
                "id": "neo4j",
                "sourceVersion": 1,
                "endpoint": "https://db.example.org/db/neo4j/query/v2",
                "params": { "mode": "all", "labels": ["Gene"] },
                "credentialSlot": "default",
                "pages": 1,
                "next": { "phase": "nodes", "after": 100 },
                "validators": {
                    "serverVersion": "5.24.0",
                    "contentHash": "41ab000000000000000000000000000000000000000000000000000000000007",
                },
                "expansions": [
                    {
                        "id": "s2/x1",
                        "ids": ["BRCA1"],
                        "depth": 1,
                        "direction": "both",
                        "at": "2026-10-20T09:16:02.511Z",
                        "next": null,
                        "validators": {},
                    },
                ],
            },
        },
    ],
}
```

1. **One entry per load still in the graph.** A load undone, replaced by a later `mode: "replace"`
   load, or taken out (`session.data.removeSource`) is not written; neither is an expansion that was
   undone or collapsed away. `loads` lists them in the order they ran, which is the order a rebuild
   runs them.
2. **`id`** is the load's stable id: unique among the entries of the member, compared for equality
   only, and never reused by a later load of the same session. graphty-element writes the key
   `session.data.sources()` lists (`s1`, `s2`, ...), the key a filter's `source` rule names, so a
   saved filter by source still selects the same elements. An expansion's id is its entry's id,
   `/x`, and its position.
3. **`graph`** names the data member the load went into, by that member's `id`. Until data members
   carry ids (several named graphs, owner's decision item 1), a writer leaves it out and every
   entry is about the file's one graph.
4. **`loadedAt`**, `fetchedAt`, an expansion's `at`: written as UTC by
   `Date.prototype.toISOString()`. A reader takes the RFC 3339 form
   `YYYY-MM-DDTHH:MM:SS[.fraction]` followed by `Z` or `+HH:MM` / `-HH:MM`, with an upper-case `T`
   and `Z`, naming a day the calendar has (`2026-02-30` is not one); it keeps the value as read and
   compares it as an instant. Any other spelling makes the entry `not-runnable`.
5. **`added`** is what the load added when it ran, which nothing in the graph can recompute later.
   What a load still supplies is worked out from `_source.loads` ("Provenance") and never written.
6. **`total`** is what the source said it holds for this load, when it said: the nodes a complete
   read counted, the count a sample publishes, or a count the source ran because it costs one cheap
   request (a Neo4j count-store lookup). It is a fact about the source at `loadedAt`, so an
   application can show "100 of 28,455"; absent means the source did not say.
7. **Hashes** are SHA-256, written as 64 lower-case hexadecimal digits. A file's `sha256` is over
   its bytes exactly as given, before any decoding; a URL's is over the body after content
   decoding (`Content-Encoding`), as the importer read it. graphty-element writes one for every
   file it loads, and for a URL whose body it read itself; a URL load that names its format is
   read by that format's reader, and its entry has no `sha256`. Inline data
   (`session.data.import({ data })`, text pasted or built in code) is a `file` entry with no
   `name`, its `sha256` over the text's UTF-8 bytes. An entry upgraded from version 1 has none
   ("Reading version 1").
8. **`contentHash`** is opaque: the network source writes it, in its own form, and it is compared
   for equality only, against a value the same source id and `sourceVersion` produced. A writer
   that is not the source copies it as read or leaves it out, and never computes one. Each
   source's form is its own (graph-io's source contract and each source's guide).
9. **`tables` and `tableRows`**: `tableRows` appears only with `tables` and is exactly as long; an
   entry where it is not is `not-runnable`.

## Options

`options` holds what the load was told about how to read its data: a table's column roles and
delimiter, a node-id path, `idPrefix`, `columnPrefix`, `joinOn`, `keep`, `existing` and `limits`
of a network load. It is the importer's own option object, an open map, checked by the importer
when the load runs again (an option it does not know is its `E_UNKNOWN_OPTION`).

`mapping` holds the column roles a table load was given, as given: one table's roles (`rowsAre`,
`key`, `label`, `source`, `target`, `weight`, `time`, `edgeId`), or each table's by id under
`tables`. It is written only when the load was given roles, so a reopened project still says which
column was which; a role left out was the element's own reading. It is an open map, like `options`.

1. It never holds the data or where to read it: `data`, `file` and `url` are the entry's own parts.
2. It never holds `credential`, `write`, `signal`, `fetch`, `cursor` or `retry`: the first two are
   never stored ("What is never stored"); the others belong to one call.
3. A reader that finds any of the names of rules 1 and 2 in `options` reads the entry as
   `not-runnable` ("Reading" rule 4): a file must never be able to switch on a query that writes.

## Joins

A table joined onto the graph (values matched to nodes or edges by key, or edges between the
graph's nodes) is an entry of its own, after the load it joined onto. It names that load in
`joinedOnto`, the table in `tables` and what its rows were in `tableRows`, and holds `join`.

1. **`join`** is what the join needs to be made again: what the rows were read as (`shape`), the
   choices it was made with (`choices`, an open map the join feature checks), the counts it
   reported, the names it wrote values under (`columns`), the table as read (`table`) and, for
   values, what each element held before the join wrote over it (`before`). With it, a reopened
   project lists the join with its choices, and editing it, or making it again after a refresh or
   a replace, works as in the session that made it.
2. `join` never repeats the entry: the joined table's load is the entry's `id`, and the load it
   joined onto is `joinedOnto` (absent when the graph had no load to join onto).
3. An entry with `join` is listed as a joined table (`data.sources()` kind `"join"`), with or
   without `joinedOnto`.
4. The table's rows are data the join read, not raw bytes: they are kept because the graph holds
   only the values that matched. They count toward the member's 16 MiB.

## URLs

1. `address` is the URL the load read with its user name, password and fragment removed. Its
   origin and path are kept as read.
2. A query parameter whose name marks a credential is removed from `address` and its name listed
   in `dropped`, and the save reports `W_SOURCE_URL_REDACTED` with `{ id, names }`. Compared
   without regard to case, a name marks a credential when it is `key`, `auth`, `sig`, `jwt`,
   `code`, `sid`, `policy` or `key-pair-id`; holds `token`, `secret`, `signature`, `credential`,
   `password`, `passwd`, `session`, `apikey`, `api_key` or `api-key`; or starts with `x-amz-`,
   `x-goog-` or `x-ms-`. The other parameters are kept: they choose the data. Running the entry
   again without them may fail with the server's own answer. A relative URL is written with its
   path as given and the same parameters removed.
3. A URL load never records a credential: a URL that needs one is read through a network source
   (the `rest` source, with a credential slot), never by putting the key in the address.

## Network loads

1. **`source.id`** is the id the source is registered under in graph-io's registry, a public name.
   `sourceVersion` is its descriptor's `version` when it loaded; a reader whose source is at a later
   version runs it through the descriptor's `migrateParams`, and refuses an entry from a later
   version than its own (`E_SOURCE_PARAM`, `reason: "stale-params"`).
2. **`endpoint`** is the origin and path the load read, never a query string or a user name, or
   `null` when it read the source's default endpoint. A reader takes only an absolute `http:`,
   `https:`, `bolt:`, `bolt+s:` or `bolt+ssc:` URL with no user name, password, query or
   fragment; any other value makes the entry `not-runnable`, so a credential lookup never starts
   from a hand-written endpoint. A `rest` load whose `endpoint` is `null` reads its mapping's own
   `endpoint`, and that is the endpoint `pendingSourceLoads()` lists.
3. **`params`** are the source's own params as the load was given them, a REST mapping included.
   A source never takes a secret as a param: one that needs a secret declares a credential slot.
   A writer still leaves out what marks one ("URLs" rule 2, for the names): such query
   parameters of a mapping's `endpoint` and of any URL in the params, and, from each request of a
   mapping, a `query` member or a top-level `body` member with such a name whose value is written
   out rather than filled from a template (`"{work}"` is the load's data). The save reports the
   names with `W_SOURCE_URL_REDACTED`.
4. **`next`** and an expansion's `next` are the source's cursors, opaque JSON a source writes and
   reads back. A source's cursor never holds a credential, a signed URL or a token (graph-io's
   source contract): graph-io removes the query parameter a call's credential was sent in from
   every URL a cursor holds (a next-page link that echoes the key), and a writer removes the
   parameters of rule 3 from them too. `pages` is how many pages the load read.
5. **`validators`** are what tells a later check whether the source changed since the load
   (network-sources-design.md, 16.3).
6. **`expansions`** are the click-to-expand fetches made from this load's nodes, in order. A
   refresh replays them in order after the load.

## Credential slots

A source that takes a credential declares its slots in its descriptor: a name, the credential kind
and whether it is required, and for an API key how it is sent. OpenAlex declares one optional slot,
`api_key`, sent as the `api_key` query parameter as OpenAlex documents. A source that takes a
credential and declares no slot has one slot named `default`.

1. **`credentialSlot`** is the slot a credential filled when the load ran, written only when one
   did. It is a name, never the credential, its kind's secret, a user name or an origin.
2. On a run, refresh, page or expansion from a reopened project, the credential is looked up on the
   reader's machine by the source id, the origin about to be contacted and the slot (graphty-element's
   credential store, `element.credentials`). A file naming another endpoint therefore never receives
   a credential remembered for a different host.
3. With none remembered for a required slot, the run waits and the application is told
   `E_SOURCE_AUTH` with `{ origin, slot, stored: false }`, so it can ask the reader for exactly that
   credential. An optional slot with none remembered runs without one.

## Provenance

Each node and edge record lists the loads that supplied it in the reserved column `_source.loads`:
an array of entry ids and expansion ids, oldest first, each once. An element two loads both
supplied lists both; an element no load supplied (added by hand, by an AI command) has none.

1. In embedded data the column is written in the data member's records like any other column, on
   each node and each link (container.md, "The data member" rule 1), whenever the file holds a
   sources member.
2. A value names an entry of this member whose `graph` is that data member's, or an expansion of
   one. A value naming nothing here is kept as data and is not provenance: it does not make the
   element belong to any load.
3. Removing a load (`session.data.removeSource`) removes its id from every element's column and
   removes the elements no other load supplied; a refresh adds and removes ids as the source's
   answer adds and removes elements. Neither is a special case of the file: the column is saved as
   the session holds it.
4. `_source.loads` is one of the reserved `_source.` columns graphty-element writes as neutral facts
   (network-sources-design.md, 14.4); a reader never styles or hides anything by them on its own.

## Embedded data and steps only

1. **Embedded (the default).** The file holds the graph in its data member and the sources member
   records how it was made. Opening it fetches nothing and needs no network: every entry is
   restored as a record, its elements are already there, and the project opens offline. Private
   data read with a credential is never fetched again by opening.
2. **Steps only (reserved).** `data: "steps"` means the file holds no data member for the graph
   and the graph is rebuilt by running the entries again, in order. A writer that writes it lists
   `graphty-sources` in the document's `requires`, because a reader that skipped the member would
   open an empty graph and misapply the arrangement, results, styles and notes. This release
   never writes it, and refuses a file with `data: "steps"` and no data member whole:
   `E_UNSUPPORTED` with `{ kind: "graphty-sources", data: "steps" }`. The rebuild ("Reopening",
   "Rebuilding a steps-only file") is for a later release.
3. A file with `data: "steps"` and a data member for the same graph is read as embedded: the data
   member applies, and the report carries `W_SOURCE_STEPS_IGNORED` with `{ graph }`, the data
   member's id (`null` for the file's one graph).
4. Autosave always embeds: a recovered session must never depend on the network.

## Reopening

Nothing fetches because a file was opened. Every network entry of an opened file waits until the
application runs it with `session.data.runPendingSourceLoad(id)`, the one way in; that is where
an application asks the reader. Until then a refresh, a next page, a change check and an
expansion of it (`refresh`, `more`, `checkSource`, `expand`) are refused with `E_SOURCE_PENDING`
(`{ id }`) and send nothing, and `more()` with no load passes over it. A reader's "don't ask
again" is stored on the reader's machine, never in a project file.

1. **Embedded entries** are offered for refresh. `session.data.pendingSourceLoads()` lists each
   network entry with its id, source id, the endpoint its requests go to, its params as saved (the
   query or the mapping, so the reader can see what will run), whether those carry a query,
   whether the endpoint is on the reader's own machine or local network, whether the source needs
   a credential, and its credential slot. Running one reads the source again -- as many pages as
   the load had read, at most 100 -- and merges by id, updating what is there; a file entry is
   never refreshed (there is nothing to read it from).
2. **An entry's `expand.trigger` is never taken.** Only the page's own configuration
   (`behavior.expand`) or the load options its code passed turn click-to-expand on, so a received
   file cannot make a click fetch. The rest of `expand` applies once the entry has run.
3. **An endpoint on the reader's own machine or local network** is offered marked as such
   (`isLocalNetwork`), and a reader's "don't ask again" never covers it: each such run is approved
   on its own. That is a loopback, unspecified, private, shared (100.64.0.0/10) or link-local
   address (169.254.0.0/16, the cloud metadata service), in IPv4 or IPv6 (`::`-prefixed forms,
   fc00::/7, fe80::/10), a host name of one label (`localhost`, an intranet name), or a name under
   `.local`, `.localhost`, `.internal`, `.home.arpa` or `.lan`; an endpoint that does not parse
   counts as local.
4. **A source id this release does not have registered** is kept: its elements are there (embedded)
   and the entry is written back, but it is not offered; the report carries
   `W_SOURCE_UNREGISTERED` with `{ id, source }`.

### Rebuilding a steps-only file (reserved)

For a later release, which writes `data: "steps"` ("Embedded data and steps only" rule 2):

1. **Steps-only entries** wait to be run, in order: a file entry for the reader to supply the file,
   a URL, network or sample entry for the reader's approval. A load runs only after every entry
   before it ran, because a `merge` and a `joinedOnto` build on what came before. The arrangement,
   results, styles and notes of the file wait until the last entry ran, and apply then.
2. **A file supplied for a steps-only file entry** is read with the entry's `format` and `options`
   when its SHA-256 is the entry's `sha256`; bytes with another digest are refused, and a URL whose
   body has another digest, or a network load whose `contentHash` differs, is loaded and reported
   as changed. The codes are defined with the release that builds it.

## What is never stored

1. **Credentials.** No secret, token, password, API key, signing key, user name, or origin a
   credential was bound to. Only `credentialSlot`.
2. **Approvals.** No answer the reader gave to a fetch question, and no "don't ask again" choice.
   They live on the reader's machine, so a file cannot grant itself the right to fetch.
3. **Policy and call state.** Not the page's network policy, the `write` flag, a signal, a custom
   fetch, a retry setting, or a source cache.
4. **Raw fetched bytes.** A URL's or a network source's response is never embedded as bytes; what
   was read is in the data member as rows, and only its digest is here.

## Reading

1. **The member is closed.** A member other than `kind`, `version`, `data`, `loads` and
   `extensions`, or a `loads` that is not an array, skips the member, `E_BAD_DOCUMENT` naming the
   pointer; it is kept in place on save (container.md, "Reading a file" rule 13). With
   `data: "steps"` the kind is in `requires`, so that refuses the file.
2. **Each entry is closed and read on its own.** An entry, a kind part (`file`, `url`, `source`,
   `sample`), an expansion, `join` or its `table`, `added`, `total`, `validators` or `expand` with
   a member its schema does not list, a required member missing (`loadedAt`, `mode`, `added`, the
   kind's part, or a part's own required members), or a value of the wrong type or outside its
   bounds ("Limits", field bounds), makes that entry `not-runnable`, reported `E_BAD_DOCUMENT` with
   the pointer of that member: running or refreshing a load under an instruction the reader
   ignored would read other data. `options`, `mapping`, `params`, `next`, a sample's `params`, a
   join's `choices` and `before`, and every `extensions` are open maps and are never reported.
3. **An entry of a `kind` this release does not know** is `not-runnable`, reported
   `W_UNKNOWN_KIND` with `{ pointer, found }` (the kind). Its part is the member named by its kind,
   which this release cannot check; the members every kind shares are still checked as rule 2
   says, so its id, provenance and order hold.
4. **A `not-runnable` entry** is kept: it still counts as a load for provenance, its elements are
   there when the data is embedded, and it is written back exactly as read. It is never offered or
   run. In steps-only mode the rebuild stops before it and the report says so.
5. **Ids.** An entry whose `id` is missing or is not 1 to 64 of `[A-Za-z0-9._-]` starting with a
   letter or digit, two entries with one id, or an expansion id that is not its entry's id and
   `/x` and its position, skip the member, `E_BAD_DOCUMENT` at that id's pointer
   (`/loads/<n>/id`). A `joinedOnto` naming no earlier entry -- none at all, or a later one -- makes
   that entry `not-runnable`.
6. **`graph`** naming a data member the file does not have makes the entry `not-runnable`,
   `E_BAD_DOCUMENT` with `{ id, graph }`.

## Reading version 1

Version 1 of `graphty-sources` was the experimental shape graphty-element 3.x wrote for network
loads only. A reader reads it forever (container.md, "Versions" rule 5) and upgrades it on read;
the report says it was upgraded. A writer never writes it again.

```ts
interface SourcesMemberV1 {
    kind: "graphty-sources";
    version: 1;
    loads: {
        key: string; // "load-1"; what _source.loads named
        source: string;
        version: number; // the descriptor version
        config: Record<string, unknown>;
        endpoint: string | null;
        options: Record<string, unknown>;
        loadedAt: string;
        pages: number;
        next: Record<string, unknown> | null;
        validators: Validators;
        credential: { kind: string; origin: string; username?: string } | null;
        expansions: {
            key: string;
            ids: (string | number)[];
            depth: number;
            direction: string;
            limit?: number;
            at: string;
            next: Record<string, unknown> | null;
            validators: Validators;
        }[];
        total?: number;
        expand?: ExpandBehavior;
    }[];
}
```

Files that carry a version 1 member also carry, in their data member, three fields graphty-element
3.x wrote there: `source` (the last load's description), `sources` (one entry per load, each with
its `key`, `kind`, `added` and the description's `type`, `name`, `size` and `config`) and
`provenance` (each load's node ids and edge positions, by key). The upgrade joins the two:

1. **Every item of the data member's `sources`** becomes an entry with that item's `key` as its
   `id`: `kind` `"file"` gives a file entry whose `file` holds `name` and `size` and no `sha256`
   (the bytes were never hashed); `"server"` gives a network entry; `"sample"` a sample entry with
   the item's `name` as its dataset or generator; `"join"` a file entry with `joinedOnto`. `type`
   becomes `format`; `config`, without `url`, becomes `options`, and a `url` in it makes a URL entry
   with no `sha256`. Its `added` is kept; its `loadedAt` is the version 1 record's, else the time
   of opening.
2. **A version 1 record** joins the network item whose provenance nodes carry its `key` in
   `_source.loads`, the first such item: `source` becomes `source.id`, `version` `sourceVersion`,
   `config` `params`, and `endpoint`, `pages`, `next`, `validators`, `expansions` and `expand` are
   kept. Its `options` split into the entry's `mode` and `options`. A `credential` that is not null
   becomes `credentialSlot: "default"`; its `kind`, `origin` and `username` are dropped. `total`
   becomes `total.nodes`.
3. **A version 1 record no item claims** becomes an entry of its own, with its `key` as its `id`.
4. **Provenance.** A `_source.loads` value naming a version 1 key, or that key and `/x<n>`, is read
   as naming the entry that record joined and its expansion n. The data member's `provenance` adds
   each listed element's entry id to its `_source.loads`.
5. **An upgraded file or URL entry has no `sha256`**, and is written at version 2 without one: the
   bytes were never hashed, and a writer never invents a digest. A refresh of an upgraded network
   entry works as before.
6. When a file holds a version 2 sources member, a data member's `source`, `sources` and
   `provenance` are ignored.
7. **The details of the join**, so two readers upgrade one file to the same entries:
    - The join walks the items in order; each `"server"` item takes the first version 1 record, in
      the record list's order, that no earlier item took and whose `key` one of the item's
      provenance nodes carries in `_source.loads`.
    - A record's `options.mode`, when it is `"replace"` or `"merge"`, becomes the entry's `mode`; the
      rest of its `options` become the entry's `options`. An item with no record, or a record with
      no `mode`, gets `"replace"` when it is the first entry and `"merge"` after.
    - A `"server"` item no record claims becomes a network entry from its own description: `id`
      its `type` without `source:`, `sourceVersion` 1, `endpoint` `null`, `params` its `config`,
      `pages` 1, `next` `null`, no validators and no expansions.
    - A record no item claims (rule 3) gets `added` from the records that carry its key: the node
      and link records whose `_source.loads` holds it.
    - A `"sample"` item naming a generator becomes `{ generator, params }` with `params` the
      item's `config` without `url`, so running it again gives the same graph; any other name is a
      `{ dataset }`.
    - A file item's `size` is kept when it is a number and left out when it is not: unknown, never 0.
    - A `url` in a file item's `config` becomes the URL entry's `address`, redacted as "URLs" rules
      1 and 2 write one, with the names it left out in `dropped`.
    - `loadedAt` is the record's, else the time of opening; an entry upgraded without a time of its
      own is therefore written with that time.
    - A version 1 expansion's `direction` that is not `"out"`, `"in"` or `"both"`, or any other
      value version 2 does not take, makes the upgraded entry `not-runnable` ("Reading" rule 2).
    - The version 1 member's records and the data member's `sources` are each held to 1,000
      before the join: past that the member is skipped, `E_TOO_LARGE` naming the entry limit.

## Writing

1. A writer writes the member's `kind`, `version`, `data` (only when `"steps"`), `loads` and
   `extensions` in that order; inside an entry `id`, `kind`, `name`, `graph`, `loadedAt`, `mode`,
   `format`, the kind part, `options`, `mapping`, `tables`, `tableRows`, `joinedOnto`, `join`,
   `added`, `leftOut`, `total`, `extensions`; inside a part and inside `join`, the order of the data model
   above. The same session gives the same
   bytes.
2. A writer writes the member whenever the session holds a load, and only then.
3. An entry it read and could not run is written back exactly as read; an upgraded version 1 entry
   is written at version 2.
4. Through graphty-element 3.x a project file's data member still carries the legacy `source`,
   `sources` and `provenance` fields beside the version 2 member, so a colleague on an earlier 3.x
   release still sees where the data came from (container.md, "Versions" rule 4). Their
   configurations are written with the same secrets left out as the member's ("Network loads"
   rule 3). The next graphty-element major stops writing them; a reader accepts them, and
   ignores them beside a version 2 member, for as long as the data member is version 1.
5. A plain graphty document -- a technique shared without its project, such as
   `session.styles.toDocument()` or `session.notes.toDocument()` -- never holds the member: where
   private data came from is not part of a technique. Opening a plain document (one with no
   `graphty-session` member) that holds one anyway applies none of it and reports
   `E_UNSUPPORTED` with `{ kind: "graphty-sources" }`.
6. Autosave writes the member with the others, so a recovered session keeps its source records, and
   the reassembled parts are exactly the text `session.project.save()` writes.

## Later versions

1. **New entry kinds** are additions: the `kind` of an entry is an open list (container.md,
   "Versions" rule 2). A new kind's part is the member named by its kind, and it carries every
   member the kinds share ("Data model"). An older reader keeps a new kind's entry and never runs
   it, and the schema of version 2 accepts it.
2. **New optional members** of an entry or a part are not additions: entries are closed, so a
   member an older reader would ignore is a new entry kind, or sources version 3.
3. The limits are fixed for version 2.

## Limits

Fixed for version 2 (README, "Limits"). String lengths count Unicode code points.

**Member limits.** A member past one is skipped, `E_TOO_LARGE` naming the limit (`entries`,
`expansions`, `seeds`, `options`, `extensions` or `bytes`); in steps-only mode that refuses the
file:

- 1,000 entries per member; 10,000 expansions in the whole member, over every entry (the schema
  also holds each entry to 10,000); 1,000 seed ids per expansion;
- the member at most 16 MiB saved as JSON; an entry's `options` and `mapping`, a network part's `params`, each
  `next` and a sample's `params` at most 262,144 bytes (256 KB) each; every `extensions` at most
  65,536 bytes (64 KB), 32 levels deep.

**Field bounds.** A value past one makes its entry `not-runnable`, `E_BAD_DOCUMENT` at the
field's pointer ("Reading" rule 2):

- `name` 1 to 1,024 characters, `format` and a source id 1 to 128, `address` and `endpoint` 1 to
  8,192, `credentialSlot` 1 to 64, each validator 0 to 1,024;
- `added`, `total` and `size` integers from 0, `pages` and `sourceVersion` from 1, all at most
  2^53 - 1; `depth` 1 to 10; an expansion's or `expand`'s `limit` 1 to 10,000.
