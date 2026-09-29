# The graphty document file

`kind: "graphty-document"`, version 1. Schema: [container.schema.json](container.schema.json), and
[data.schema.json](data.schema.json) for the data member. What the documents are for, the trust
rules and the limits are in [README.md](README.md).

## Purpose

Every graphty document is one JSON file. It carries any mix of members -- styles, recipes, the data
itself, and kinds a later version adds -- so one file can be "our lab's look", "our team's analysis",
"both, as a starting point without our data", or "both, with the data". The file is one JSON text a
person can read, diff and keep in version control. There is no zip form.

## File name and media type

A graphty document is saved as `<name>.graphty.json`: the name says both that it is a graphty
document and that it is JSON a person can read. A plain `.json` would be confused with graph data
in graph-io's JSON dialects in every file picker.

The media type `application/vnd.graphty+json` is reserved for graphty documents and used by nothing
today. graphty-element returns a document as text and never labels a file, and a reader decides
what a file is from the `kind` inside it, never from its name or a label ("Reading a file"). The
name is reserved so that, if a need appears -- an operating system associating files with a graphty
application, a server telling graphty documents from other JSON -- every tool uses the same one.

## Data model

```ts
interface GraphtyDocument {
    kind: "graphty-document"; // the fixed value that identifies the file
    version: 1; // the container's major version
    name?: string;
    description?: string;
    generator?: { name: string; version: string }; // the software that wrote it
    requires?: string[]; // member kinds a reader must know to read this file at all
    members: Member[]; // in the order they were written; at most 64
    extensions?: Record<string, unknown>; // reverse-domain keys; see "Extensions"
}

type Member = StyleMember | RecipeMember | DataMember | { kind: string; version: number };
// StyleMember: style.md. RecipeMember: recipe.md. DataMember: "The data member" below.
```

Every member has a `kind` and an integer `version`. Version 1 defines three kinds:

| `kind`           | Page                   | Holds                                                              |
| ---------------- | ---------------------- | ------------------------------------------------------------------ |
| `graphty-style`  | [style.md](style.md)   | a stack of style layers and the palettes they need                 |
| `graphty-recipe` | [recipe.md](recipe.md) | a journal of analysis commands                                     |
| `graphty-data`   | this page              | a graph embedded in a graph-io JSON dialect, or a reference to one |

Member kinds starting `graphty-` are reserved for graphty-element. Any other kind MUST be a
reverse-domain name (`org.example.notes`), as extension names are, so a third party's kind never
collides with one a later graphty-element release defines. A reader still skips a kind it does not
know however it is spelled (rule 11 below).

A file MAY hold several members of one kind: two styles (a screen look and a print look), several
recipes, a style and a recipe. It holds at most one data member that applies (see "The data
member").

## Reading a file

A reader MUST decide what a JSON text is from its content, never from the file name. `src` is the
file's text, or its bytes as UTF-8.

1. It checks the limits of README "Limits" -- the size, then the nesting depth by one pass over the
   raw text, then member names while parsing -- and refuses the text with `E_TOO_LARGE` or
   `E_BAD_DOCUMENT` when one is exceeded. Member names are compared as decoded strings, after their
   `\u` escapes (escaped surrogate pairs included), so `"\u005f_proto__"` is `__proto__` and two
   spellings of `href` are one name twice. Text that is not JSON is refused with `E_PARSE_FAILED`.
2. A top-level object whose `kind` is `"graphty-document"` is a graphty document.
3. A top-level object with no `kind`, an integer `version` and an array `layers` whose entries are
   all objects, and which is empty or has at least one entry whose `selector` is an object with a
   string `match`, is a style written by graphty-element 2.x or later without its `kind`. The test
   reads only that much: whether each layer is well formed is the style's rules' business, and
   whether the version is one this reader implements is rule 12's. A reader MUST read such a file,
   forever, as a document holding that one style member (as if it had `"kind": "graphty-style"`),
   so a kindless file with one malformed layer paints its other layers, and a kindless style of a
   later version whose layers changed shape is skipped with `E_UNSUPPORTED_VERSION`, not refused
   as an unknown format. Any other shape falls to rule 6, so another tool's file that happens to
   have `version` and `layers` (a MapLibre map style, whose layers have a `type` and no
   `selector`) is never taken for a graphty style.
4. A top-level object with `"graphtyTemplate": true` is a graphty-element 1.x style template. A
   reader converts it as style.md, "Upgrading a 1.x template", says, and reads the result as a
   document. Only what the conversion produced applies. Every other part -- the background, whose
   skybox names an image URL; the data settings, which change how every later import is read; the
   camera; behaviour -- is reported by name and not applied, and is never handed to
   graphty-element's own template input. A caller who wants one sets it through its own API.
5. A top-level object whose `kind` is a string of the member-kind form (`graphty-` and a name, or a
   reverse-domain name) and whose `version` is an integer is read as a document holding that one
   member. So a bare style or recipe opens, and a bare member of a kind this reader does not know
   is skipped with `W_UNKNOWN_KIND` (rule 11) rather than refused as "not a graphty document". A
   writer never writes one.
6. Anything else is not a graphty document and is refused with `E_UNKNOWN_FORMAT`, with
   `details.available` listing the data formats the caller could import it as instead.
7. A document whose `version` is missing or not a positive integer (`"1"`, `1.5`) is refused with
   `E_BAD_DOCUMENT`, as a member with the same defect is (rule 10). One whose `version` is an
   integer the reader does not implement is refused whole with `E_UNSUPPORTED_VERSION` and details
   `{ kind: "graphty-document", found, reads }`. It MUST NOT be guessed at, and MUST NOT be
   reported as an empty document.
8. A document whose `members` is missing or not an array is refused with `E_BAD_DOCUMENT`.
9. A document whose `requires` names a member kind the reader does not know is refused whole with
   `E_UNSUPPORTED`, naming the kind. So is a document in which a member of a required kind is
   skipped for any reason -- a version this reader does not implement, a bad shape -- or is left
   out by the caller's `members` option, naming the kind and the version found. A writer lists a
   kind in `requires` when other members of the file would be misapplied without it (a later
   version's data plan, which renames the columns a recipe binds to).

Then each member is read on its own:

10. A member that is not an object, has no string `kind`, or has a `version` that is not a positive
    integer (`"1"`, `0`, `1.5`, missing) is skipped with `E_BAD_DOCUMENT`, naming what is wrong.
11. A member of a kind the reader does not know is skipped and reported with `W_UNKNOWN_KIND`,
    naming the kind. It is not an error: a later version adds kinds, and a file carrying one is
    still a good file for the members this reader knows.
12. A member whose `version` the reader does not implement for its kind is skipped with
    `E_UNSUPPORTED_VERSION` and details `{ kind, found, reads }`.
13. A member whose own top level fails its schema (a style whose `layers` is not an array, a recipe
    with no `id`) is skipped with `E_BAD_DOCUMENT`, naming the member and the failure.
14. Inside a member that is read, failures are as small as possible: a style layer that fails is
    added switched off (style.md); a recipe command that fails is skipped with the commands that
    depend on it (recipe.md).
15. Any exception raised while one member is applied MUST be caught and turned into that member's
    report entry. One member never fails another.

A skipped member is not lost: see "Writing a file" rule 3.

16. **A document given to a data import.** The reverse of rule 6: graphty-element's data import
    (`data.import`, and every importer the catalogue lists) given JSON text whose top level is one
    of the shapes of rules 2 to 5 -- a bare member of any kind included -- refuses it with
    `E_UNKNOWN_FORMAT`, saying it is a graphty document to open with `openDocument`. It never reads one as graph data, which could find no
    nodes and say nothing useful.

### Unknown object members

A reader MUST ignore an object member it does not know, at any depth outside the places listed
below, and report each one with `W_UNKNOWN_MEMBER` and its JSON pointer (`/members/0/layers/2/colour`),
so a misspelling is seen. The keys of these open maps are never reported, because any key is
valid there: a layer's `userData`, the contents of `extensions` (each extension's own payload
included), a binding's `map`, a recipe command's `params` and a `layout.set`'s `options` (which
recipe.md, "Commands" rule 3 checks against the catalogue instead), and a data member's `options`
(checked against the format's catalogue, "Import options"). Every closed object, and what a reader
does with an unknown member in it:

| Closed object                                  | A reader that meets an unknown member                                                                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a recipe command, its `scope` and its `style`  | skips the command, `E_UNKNOWN_OPTION`, and every later one, `E_DEPENDENCY_SKIPPED` naming it (recipe.md, "Replaying" rule 3)                                                                        |
| a recipe's `table`                             | the commands are unaffected; every table import made for the recipe is refused with `E_UNKNOWN_OPTION` at that member's pointer, never read by the importer's own guesses (recipe.md, "Table data") |
| a data member                                  | skips the data member, `E_BAD_DOCUMENT` ("The data member" rule 6)                                                                                                                                  |
| a style's selectors and bindings               | reports `W_UNKNOWN_MEMBER`, applies the layer and writes the member back on save: the schema refuses the member, so a validator catches the misspelling (`overflw`) the reader only warns about     |
| the keys of a style layer's `set` and `encode` | channel names: style.md, "Reading and applying" rule 3                                                                                                                                              |

The first three change a result when a member is ignored, so they stop; the others do not.

### Versions

1. `version` is the major version, of the container and of each member kind separately. A style
   member at version 2 inside a container at version 1 is valid.
2. Within a major version a change MUST be additive: a new optional member of an open object, a new
   value in an open list, a new member kind. Removing or renaming a member, or changing what a
   value means, needs a new major version. The open lists of version 1 are the member kinds, a
   recipe command's `op` (an old reader stops the replay at an unknown command, recipe.md
   "Replaying" rule 4), algorithm keys, layout ids, palette ids, a data member's format ids and
   JSON dialects, the import option names of a format (its catalogue decides), and a style's
   channel names, selector kinds, scales, layer kinds and the value lists of its enumerated
   channels. A published version 1 schema only ever gains values in these lists: "version 1 is
   fixed" means nothing is removed from it and nothing changes meaning, not that it stops growing.
   A release that adds a value adds it to its copy of the version 1 schema, which graphty-element
   exports; the URL of a schema always serves the newest copy. A reader that does not know a value
   fails that one layer entry, layer or command, never a style or recipe member (style.md,
   "Compatible with graphty-element 2.x" rule 2); a data member is the exception, skipped whole
   for a format, dialect or import option its reader does not know ("The data member" rule 10),
   because reading a file some other way gives other columns. The closed objects -- a recipe
   command, a run's `style` and `scope`, a recipe's `table`, a data member, a style's selectors
   and bindings -- gain members only in a new major version of their kind, because an older
   reader skips or misreads a member it does not know. A writer MUST check the content it
   generates -- every layer, command and member it writes from the session -- against the schema
   of the version it stamps, as of the writer's release, and write the next version when it fails;
   graphty-element's tests run `toDocument()` and the recorder's output through that release's
   version 1 schemas. Content written back as it was read is exempt and never changes the version
   stamped: a refused layer, a channel entry dropped as unknown, an unknown member of a closed
   object, a member skipped whole. So a file a newer release wrote, holding a channel an older
   release does not know, round-trips through the older release still at `version: 1`, the entry
   intact. What a recipe command's `as` means, and where it
   sits -- `commands[*].as` -- never change in any recipe version, and a later member kind that
   names runs lists them at a fixed place of its own, so a reader that skips a newer recipe can
   still tell which `results.` paths belong to it (style.md, "Reading and applying" rule 4).
3. **An addition an old reader would misapply by ignoring it needs a new major version.** A new
   selector member that narrows what a layer matches, or a new command member that changes what a
   run computes, is written as the next major version of that kind, which an old reader refuses by
   version (rule 12 above) instead of ignoring and painting or computing the wrong thing. A new
   member kind that others depend on is listed in `requires` instead (rule 9).
4. A writer MUST write the lowest version of each kind that can express the content, so saving a
   file does not lock out a colleague on an older release. A style whose top layers need a later
   style version SHOULD be written as two members, the lower layers at the lowest version and the
   rest at the later one, so an older reader still draws the lower layers (style.md, "Writing").
5. A reader MUST read every major version of the container and of each kind that a release of
   graphty-element has written, upgrading an older one on read through each version in turn, and
   the report says it was upgraded. A published file -- a recipe cited in a paper -- stays readable
   by every later release. graphty-element's tests keep a file written by each release and read
   them all on every build. Rule 4 then needs the way back: each new major version of a kind ships
   a documented down-conversion to the version below it, which a writer uses whenever the content
   fits the lower version, so a version 1 file opened and saved unchanged by a release that reads
   version 2 is written at version 1, byte for byte as rule 1 of "Writing a file" writes it.

### Extensions

The document and every member MAY carry `extensions`, an object whose member names are
reverse-domain names (`org.example.tool`). The name `graphty` and names starting `graphty.` are
reserved for graphty-element. A reader MUST NOT interpret an extension it does not know and MUST
keep it (see "Writing a file").

One reserved extension is defined now, so authors do not each invent their own: `graphty.provenance`,
on the document or on a member, holds who made it and how to cite it. A later version promotes it to
members and upgrades this extension on read.

```ts
interface Provenance {
    authors?: { name: string; email?: string; orcid?: string }[];
    licence?: string; // an SPDX licence id: "CC-BY-4.0"
    citation?: string; // how to cite it, as text
    doi?: string; // "10.5281/zenodo.1234567"
}
```

## The data member

The graph itself, when a file carries it. graph-io already reads and writes every format graphty
uses, so the data member invents nothing: it embeds a graph in one of graph-io's JSON dialects, or
names a file.

```ts
type DataMember = EmbeddedData | ReferencedData;

interface EmbeddedData {
    kind: "graphty-data";
    version: 1;
    name?: string;
    description?: string;
    format: "json";
    dialect: string; // a graph-io JSON dialect: "node-link", "d3", "jgf", "cytoscape", "graphology", "vis", ...
    graph: object | unknown[]; // the graph, as a JSON value in that dialect
    extensions?: Record<string, unknown>;
}

interface ReferencedData {
    kind: "graphty-data";
    version: 1;
    name?: string;
    description?: string;
    format: string; // a format id of graphty-element's catalogue: json, csv, graphml, gexf, gml, dot, pajek, ...
    href: string; // a path relative to this file, or an https: URL
    options?: Record<string, unknown>; // import options; see "Import options"
    sha256?: string; // lower-case hex SHA-256 of the file's bytes
    extensions?: Record<string, unknown>;
}
```

1. **Embedded.** For a graph that is a list of nodes and a list of links, write
   `"dialect": "node-link"` and `"graph": { "nodes": [...], "links": [...] }`. In general `graph`
   holds the graph as a JSON value in the named graph-io dialect, written with that dialect's own
   member names; a writer SHOULD embed in `node-link`, which every graph-io release reads and
   writes. A node's or link's members other than the dialect's own become
   columns under their own names ("What every importer produces" in README):

    ```jsonc
    {
        "nodes": [
            { "id": "a", "team": "sales" },
            { "id": "b", "team": "ops" },
        ],
        "links": [{ "source": "a", "target": "b", "weight": 2 }],
    }
    ```

    gives the node column `team` and the edge weight 2. Embedded data takes no import options: the
    dialect's own names are the only spelling, and `dialect` is passed to graph-io's JSON importer
    as a forced dialect, never detected (graph-io would detect this bare `nodes` and `links` shape
    as `d3`). The binary wire form of a graph-format snapshot is never embedded, as base64 or
    otherwise.

2. **Referenced.** `href` names the data file; `format` says which importer reads it, so a reader
   never guesses a format from an extension.
3. **Where a reference may point.** graphty-element resolves `href` itself, with the WHATWG URL
   parser, against the `base` the caller passed to `openDocument` (the URL the document came from),
   and checks the resolved URL, never the raw text:
    - an absolute `https:` URL with no user name or password is allowed, unless its host is
      `localhost`, a name ending `.localhost`, or an IP literal that is not a public unicast
      address, which is refused unless the caller passes `allowPrivateHosts: true`. The refused
      addresses are every entry of the IANA IPv4 and IPv6 Special-Purpose Address Registries that
      is not marked globally reachable -- those registries, as published when the release was
      built, are the normative list -- and the multicast ranges `224/4` and `ff00::/8` and
      everything above `240/4`. Among them: IPv4 `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`,
      `169.254/16`, `172.16/12`, `192.0.0.0/24`, `192.168/16`, `198.18/15`; IPv6 `::`, `::1`,
      `fc00::/7`, `fe80::/10`. An address that embeds an IPv4 address -- IPv4-mapped
      (`::ffff:0:0/96`), IPv4-compatible (`::/96`), NAT64 (`64:ff9b::/96`) and 6to4 (`2002::/16`)
      -- is judged by the IPv4 address inside it, so `[::ffff:127.0.0.1]` and `[2002:7f00:1::]`
      are refused like `127.0.0.1`. A host name is not looked up here: a name can reach a private
      address (`127.0.0.1.nip.io`). A `resolve` that fetches applies the same check to the address
      it actually connects to, where it can see it; a browser's cannot, and relies on the person's
      consent (rule 4) and the browser's own protection of private networks, where it has one;
    - a relative reference is allowed only when it resolves to the base's scheme and origin, at or
      below the base's directory. A reference starting `/` or `//`, one holding `\`, and one whose
      `..` climbs above the base's directory are refused;
    - without a `base`, a relative reference is resolved against a stand-in base
      (`https://invalid.invalid/root/`) and judged by the rule above, so a percent-encoded `..`
      (`%2e%2e`) is judged after decoding; a segment holding `%2F`, `%5C` or `%00` is refused.
      `resolve` then receives as `href` the normalised path below that root, never the raw text;
    - every other reference is refused, its scheme judged after parsing, so `FILE:///x`,
      `\tfile:///x` and ` javascript:x` are refused like `file:///x`.

    A refused reference skips the data member with `E_BAD_DOCUMENT`, details `{ href, reason }`, and
    `resolve` is never called.

4. **Consent to fetch.** A reader MUST NOT read or fetch a referenced file on its own. The caller
   supplies the bytes: `openDocument(src, { resolve })`, where `resolve({ url, href, crossOrigin })`
   receives the resolved URL (null without a `base`), the checked path of rule 3, and whether the
   URL leaves the base's origin (true for an absolute URL without a `base`), and returns the file's
   contents -- a `ReadableStream` of bytes, bytes, or text -- or declines. A stream is read as it
   arrives, so a large table is read row by row; a `resolve` that fetches returns the response
   body's stream, and stops reading once the decoded body passes the referenced-data limit (README,
   "Limits"), which the reader enforces on whatever it is given. A `resolve` that fetches a URL leaving the base's origin MUST first show
   it to the person; one with no person to ask (a server, a script) MUST check every URL against
   an allowlist of origins, the base's own origin included, because a same-origin path can reach
   an open redirect. A `resolve` that fetches MUST NOT follow a redirect unless it applies rule 3,
   the allowlist and the connected-address check to every hop. A `resolve` for the local file
   system joins `href` below one directory and nothing else, then resolves every symbolic link
   (the real path) and refuses a result outside that directory, so a link shipped beside a
   document (`edges.csv` pointing at `~/.aws/credentials`) is not read. A `resolve` with a person to ask SHOULD show every `href` before the first read
   of a document, the same origin included, unless the caller has chosen to trust the base's
   directory: a document saved in a shared folder can otherwise load any file beside it without
   anyone seeing its name. A `resolve` that fetches a URL leaving the base's origin MUST fetch it
   without credentials (no cookies and no HTTP authentication: `credentials: "omit"`) and without
   a referrer (`referrerPolicy: "no-referrer"`), unless the caller has listed that origin as one to
   send them to, so a document cannot turn the person's login into a request for private data, or
   leak the page's address. Without a `resolve`, or when it declines, the data member is skipped
   and reported as needing the file, naming `href`.
5. **Integrity.** When `sha256` is present, the reader compares it with the bytes `resolve`
   returned, computing the digest as a stream arrives and discarding the import when it differs
   at the end. A difference skips the data member with `E_DIGEST_MISMATCH` unless the caller passed
   `acceptChangedData: true`, in which case it loads and the difference is reported. A digest is an
   integrity check, never a proof of who wrote the file. When the data member is not applied
   because a graph is already loaded (rule 7), and that graph came from a file whose bytes
   graphty-element read, the reader compares the member's `sha256` with those bytes too and reports
   the data as the same, different or unknown (loaded from something other than one file) in the
   report's `data.sameBytes`, so a replay on the caller's own copy says whether it is the copy the
   file names. When they differ the member's report carries `W_DATA_DIFFERS`, and so does the
   report of every recipe of the file.
6. **Closed.** A data member with a member its schema does not list (`encoding`, `sheet`) is skipped
   with `E_BAD_DOCUMENT`, naming it: reading a file under an option the reader ignored would give
   different columns.
7. **Applying.** A data member is imported exactly as the caller importing that file would import
   it, under the same node and edge limits. It replaces the session's graph only when no graph is
   loaded or the caller passed `data: "replace"`; otherwise it is skipped and reported as available,
   and the loaded graph is untouched. A file holding more than one data member applies the first one
   and skips each other with `E_UNSUPPORTED`: several graphs in one session file are not in
   version 1.
8. **When the file's data does not arrive.** When a file's data member was going to apply but did
   not -- no `resolve`, declined, refused, a digest mismatch, a version, format or dialect this
   reader does not implement, a failed import -- a recipe meant for the file's own data never
   spends its budget on whatever graph happened to be there:
    - with a graph loaded (the caller passed `data: "replace"`), the file's recipes are bound to it
      and planned but not run, even with `run: true`, unless the caller also passed
      `runWithoutData: true`;
    - with no graph loaded, the recipes are held, as when a file carries no data ("Applying a
      file" rule 6): they bind and plan when the caller loads data, and run only when the caller
      then calls `run()`.

    A data member skipped only because a graph was already loaded and the caller kept it
    (`data: "keep"`) was not going to apply, so it does not count: the file's recipes bind to the
    loaded graph and run when asked.

9. **Reading options from the recipe.** A referenced table (the `csv` format) is read with the
   `table` and `directed` of the file's first recipe that has a `table`, as `RecipeApplication.import`
   reads one (recipe.md, "Table data"): each as a default the data member's own `options` override,
   a difference reported, and the endpoint and id columns only when the file's first line holds
   them.
10. **Unknown format or dialect.** A data member whose `format` the reader's catalogue does not
    list, or whose embedded `dialect` graph-io does not read, is skipped with `E_UNKNOWN_FORMAT`,
    details `{ format, dialect, available }`, and counts as data that did not arrive (rule 8).

### Import options

`options` of a referenced file use the option names graphty-element's format catalogue publishes
for the named format, which are the one spelling in a graphty document. The list is open: it is
checked against the catalogue of the reading release, so a plugin format's options and an option a
later release adds need no new data version. In version 1:

- every format: `edgeSource` and `edgeTarget` (the fields holding an edge's two ends); `directed`
  (`true` or `false`, overriding what the file says, for a `neo4j`-variant CSV too);
  `repeatedEdges`, what a second edge between the same two nodes becomes: `keep` (the default),
  `first`, `last`, `sum`, `min`, `max` or `error`, graph-format's own words. On an undirected
  import `A B` and `B A` are the same pair. A merge combines only the edge weight (`sum`, `min`,
  `max` over the `weight` of the rows merged); every other column of the merged edge is its first
  row's, or its last row's for `last`, so a merge that must keep the larger of a column other than
  the weight reads that column as the weight;
- CSV: `delimiter`, one character (`","`, `"\t"`, `";"`, `"|"`, `" "`). Without it the importer
  works it out from the first line, choosing among comma, tab, semicolon and pipe, so a
  space-separated file (STRING's bulk downloads) needs `delimiter: " "`. Every occurrence
  separates two columns; a run of spaces is not collapsed. `variant`, the CSV shape (README, "What
  every importer produces"), and `idColumn`, the node table's id column. A neo4j-admin import CSV is
  `"format": "csv"` with `"variant": "neo4j"`;
- JSON: `nodeIdPath`.

`directed` and `repeatedEdges` are graphty-element settings today; publishing them as import
options of every format is a precondition of releasing recipes. graphty-element translates the
options into graph-io's own names; a document never uses graph-io's spellings (`sourceColumn`,
`sourceKey`, `nodeIdKey`) directly. A referenced JSON file's dialect is detected by graph-io.

A data member's options are checked against the options the named format DECLARES, with no
exemption: the keys graphty-element keeps for its own use when a caller imports -- `url`, `data`,
`file`, `format`, `chunkSize`, `errorLimit`, `filename`, `size`, `edgeSrcIdPath`,
`edgeDstIdPath`, and any key a later release adds to that set -- are refused like any other
undeclared name, because each would let a document fetch another address or supply other bytes
than `resolve` returned, which would make the `sha256` check meaningless. A data member's bytes
come only from `resolve`. An option the named format does not declare, or a value its descriptor
refuses, skips the data member with `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`.

`edgeSource`, `edgeTarget`, `idColumn` and `nodeIdPath` in a document are plain field names, at
most 256 characters: each is looked up as an own name of a row or a record, never evaluated. So
`"edgeSource": "to_string(@)"` names a field of that literal name. graphty-element translates them
to graph-io's key options (`sourceKey`, `nodeIdKey`), never to its own expression-valued paths.

Without options, each importer finds endpoints, ids and the weight by the rules of README, "What
every importer produces". An option naming a column the file does not have (`edgeSource:
"protein1"` on a file whose header says `#node1`) fails the import: the data member is skipped with
`E_PARSE_FAILED`, naming the option and the column. When the header was read as one column that
holds the missing name split by a space or another delimiter, the error also names the
`delimiter` that would find it. The catalogue has no option for the weight column, for general
row filtering or for compression; a file needing one cannot be referenced as it is in version 1
(README, "What version 1 does not cover"). A referenced table read for a recipe of the same file
is filtered row by row by that recipe's leading edge filters, as recipe.md, "Table data" rule 4
says.

These spellings matter only while the file is read. After import, node ids and edge ends are
structure, not columns, so no style or recipe ever names them.

## Applying a file

```ts
session.data.openDocument(src: string | Uint8Array, options?: {
    apply?: boolean; // default true; false reads, binds and plans, changes nothing, returns the report
    members?: string[]; // the member kinds to apply; default every kind the reader knows
    data?: "keep" | "replace"; // default "keep": a data member applies only when no graph is loaded
    base?: string; // the URL the document came from
    fileName?: string; // the document's file name, for the template id of its styles
    resolve?: (ref: { url: string | null; href: string; crossOrigin: boolean }) =>
        Promise<ReadableStream<Uint8Array> | Uint8Array | string | null>;
    allowPrivateHosts?: boolean; // default false ("The data member" rule 3)
    preview?: { data?: boolean }; // with apply: false, whether resolve may be called; default false
    acceptChangedData?: boolean; // default false
    columns?: Record<string, string>; // document column name -> data column name, both tables, every style and recipe
    nodeColumns?: Record<string, string>; // the same for the node table only; wins over columns
    edgeColumns?: Record<string, string>; // the same for the edge table only; wins over columns
    run?: boolean; // default false
    runWithoutData?: boolean; // default false ("The data member" rule 8)
    onRepeat?: { recipe?: "refuse" | "replace" | "add"; style?: "replace" | "add" | "refuse" };
    capSeconds?: number; // the per-command cost cap for recipes; default the element's own
    budget?: { totalSeconds?: number }; // one total budget for every recipe of the file; default 300
    openingSeconds?: number; // the opening budget (README "Limits"); default 5
    limits?: { fileBytes?: number; referencedBytes?: number; members?: number; layers?: number; commands?: number }; // README "Limits"
    quoteFetchedData?: boolean; // default false: see rule 9
}): Promise<OpenedDocument>

interface OpenedDocument {
    readonly report: DocumentReport; // "The report"
    /** The application of each recipe member, in file order: run(), cancel() and remove(). */
    readonly recipes: readonly RecipeApplication[];
    /**
     * Removes everything this opening added -- the recipes' runs, colouring, filters and layouts,
     * and the style layers -- and restores what they replaced, as each RecipeApplication.remove()
     * does (recipe.md, "Applying a recipe"). One undoable step.
     */
    remove(): void;
}
```

The promise resolves once the data has applied, the styles are added and the recipes are planned.
With `run: true` it does not wait for the runs: each recipe's `running` is then the run in
progress, which the caller can wait for or cancel (recipe.md, "Applying a recipe").

1. **What applies.** By default every member the reader can read. `members: ["graphty-style"]`
   applies only the style members. `apply: false` applies nothing and returns the report a real
   opening would give, with every recipe in state `planned` and `preview: true` on the report: the
   way to find out what a file will do before it does it. A preview:
    - never calls `resolve`, unless the caller passes `preview: { data: true }`;
    - binds against the graph a real opening with the same options would bind to. With no graph
      loaded, or with `data: "replace"`, that is the file's embedded data, imported into a scratch
      graph the session never sees, or its referenced data when `preview: { data: true }` let
      `resolve` supply it; otherwise the loaded graph. So a caller can see how a colleague's
      recipe would do on the colleague's data before replacing their own;
    - when no graph is available, says the plan is unbound, with every estimate `null`;
    - plans every recipe in full and reports a repeat application as a notice, never a refusal, so
      two versions of a recipe can be compared before choosing `onRepeat`;
    - applies rule 8 as an opening with `run: true` would: when the file's planned total is over
      the budget, every recipe's `wouldStart` is false and carries `E_CAP_EXCEEDED` with that
      total, and the report's own `wouldStart` is false;
    - holds its scratch import to the load ceilings and the opening budget (README, "Limits").
2. **Order.** Data first, then recipes in file order, then styles in file order. The data must exist
   before anything binds to its columns, and a style that paints a recipe's results must come after
   the recipe. A run's own suggested colouring is added when the run completes, above every layer
   present then -- the file's style layers included -- so a file whose style member paints a run's
   result says `style: false` on that run (recipe.md, "Commands" rule 8).
3. **Recipes do not run unless asked.** Opening binds and plans each recipe; it runs only with
   `run: true`, and a recipe held for data only when the caller calls its `run()` (rule 6;
   recipe.md, "Running").
4. **Renames.** `columns` applies to every style and every recipe member of the file, on both
   tables. `nodeColumns` and `edgeColumns` rename on one table only, and win over `columns` there,
   for a name the file uses on both tables with two meanings: `type` as a node's entity type and
   an edge's relationship type, spelled `category` and `predicate` in the data. Each member's
   report records every rename with its table.
5. **References between members.** A style member that names `results.<as>.<field>`, where `<as>`
   is the `as` of a command of a recipe in the same file -- known or of a later `op` -- is
   rewritten to the run id that recipe's application gives the command (recipe.md, "Run ids and
   namespaces"). When the recipe was refused as a repeat, that is the run id of its earlier
   application on this data (recipe.md, "Applying a recipe"). When two recipes in the file use the
   same `<as>`, the reference is ambiguous: the layer is added switched off with `E_BAD_LAYER`,
   naming both. A layer waiting for a run the file's own recipe has not produced yet (the caller
   did not ask it to run) is added switched off in the state `waiting`; graphty-element MUST switch
   it on when that run completes. A layer reading a command that will never run here -- its recipe
   was skipped, left out by `members` or refused by `requires`, or the replay skipped the command
   -- stays switched off, naming the recipe or the command, and never binds to a run of the
   reader's own with the same name (style.md, "Reading and applying" rule 4).
6. **Opened before data.** When no graph is loaded and the file's data does not apply -- it carries
   none, or its data member did not arrive ("The data member" rule 8) -- style layers are added
   switched off and recipes are held. Both bind when the caller next loads data: each held
   recipe's `report` is replaced by its bound plan, with the same fields as a plan made on loaded
   data, before the import's promise resolves. A held recipe never runs by itself, even when the
   opening passed `run: true`: the caller reads the plan and calls `run()` (README, "Applying a
   style and a recipe to new data" rule 5). A table is read for a held recipe only through that
   recipe's `import()`; a plain `data.import` takes nothing from any recipe (recipe.md, "Table
   data").
7. **What counts as new data.** For a recipe's repeat rule, a `data.import` that replaces the graph,
   a `data.apply` that clears it, or a data member that applies starts afresh; merging a file, and
   adding, removing or updating elements, is the same data. Re-checking style layers is decided
   differently: it happens whenever the graph's columns change, a merge included (README,
   "Applying a style and a recipe to new data" rule 5).
8. **One budget for the file.** Every recipe of the file is held to one total budget together,
   `budget.totalSeconds` (300 seconds by default), however it starts. With `run: true`, when the
   planned total of all of them is over it, none starts, and each recipe's report carries
   `E_CAP_EXCEEDED` with the total. A recipe started later with its application's `run()` -- one
   held for data, or one opened without `run: true` -- draws on what the file's earlier runs left
   of that budget, and its `run()` fails with `E_CAP_EXCEEDED` when its planned total is over what
   is left, unless the caller passes a larger `budget` to that `run()`. So a file of many recipes
   cannot spend many budgets, whether they run together or one by one. The report gives the
   file's total, the budget and whether the file would start, in a preview too (rule 1).
9. **What a report reveals about fetched data.** A report reveals the data in two ways: by
   quoting it -- nearest-name suggestions, a column's most frequent values, the columns
   `W_TABLE_COLUMNS_DIFFER` names, the delimiter an `E_PARSE_FAILED` names -- and by counting it:
   every scope's and filter's `matched` and `of`, every column's `withValue`, and which commands
   are skipped with `E_SCOPE_EMPTY`. The counts are a query channel: a document of 1,000 cheap
   commands, each scoped to one threshold on one person's salary, reads the salary back one bit
   per command. For data a document's `href` fetched, a report leaves both out unless the caller
   passes `quoteFetchedData: true`: the quotes are omitted, the counts are `null`, and a notice says
   what was left out. Which commands were skipped still shows, because the report must say what
   ran, and that is still one bit per command: so a service that previews or runs documents
   submitted by others MUST NOT pass `true`, and MUST NOT return a report on data it fetched for
   a document to that document's author. Data the caller
   loaded itself is always quoted and counted. An application whose `resolve` shows each `href` to
   a person, and shows the report to that person, passes `true`.

## Writing a file

```ts
session.data.saveDocument(options?: {
    members?: ("graphty-style" | "graphty-recipe" | "graphty-data")[]; // see rule 4
    name?: string;
    description?: string;
    style?: {
        id?: string;
        styleVersion?: string;
        name?: string;
        description?: string;
        layers?: readonly string[]; // the layers to write, by authored id or LayerId; default every layer
        templateId?: string; // write only the layers one opening added (style.md, "Layer sources")
    };
    keepElementSelectors?: boolean; // default false: see rule 4
    recipe?: RecordOptions; // recipe.md, "Recording"
    data?: false | { embed: true } | { reference: true } | { href: string; format: string; options?: Record<string, unknown>; sha256?: boolean; allowQuery?: boolean };
}): Promise<{ text: string; report: { leftOut: readonly Problem[]; notices: readonly Problem[] } }>
```

1.  A writer MUST write `kind` and `version` first, then `name`, `description`, `generator`,
    `requires`, `members`, `extensions`. Inside a member, the order of its schema. A writer SHOULD
    write the same bytes for the same content, so a file in version control diffs only where
    something changed.
2.  Software that writes a document MUST write `generator`, naming itself and its version. A file
    written by hand needs none.
3.  **Round trip.** Saving a session opened from a file keeps the file's shape, so opening and saving
    never deletes or reorders what a newer release put in it. Every member opened from the file
    keeps its place in `members`. A member that applied is replaced in place by its regenerated
    form, found by its template id (a style) or its `id` (a recipe); a member that was skipped -- an
    unknown kind, a newer version -- stays in place verbatim, with its unknown object members and
    `extensions`; new members are appended. A recipe member opened from the file is written
    back as it was read -- unknown and skipped commands included -- unless the caller records a
    recipe with the same `id` (`recipe.id`). That recording replaces it only when every command of
    the opened recipe ran here, or the caller passes `recipe.dropUnrun: true`; otherwise the
    opened recipe is written back as it was read, and `report.leftOut` lists each command that did
    not run (an unknown `op`, an unknown algorithm, a skipped command) with its reason (recipe.md,
    "Recording" rule 8). Opening a file and saving it never cuts a recipe down to the commands
    this release could run. `requires` is written anew:
    every kind the writer itself requires, and the file's own entries for the kinds of the members
    it wrote back as they were read. A member the caller's `members` option leaves out is listed in
    `report.leftOut`. A writer MUST keep the unknown object members of a member it regenerated: of
    the member itself, and of each style layer (matched by its `id`, else by its position) and of
    the selectors, bindings and palettes inside it. It reports any member it could not place. A
    recipe command is the exception: its members are closed and never gain one within version 1,
    so an unknown member of a version 1 command is a misspelling, which skipped that command
    (recipe.md, "Replaying" rule 3). A regenerated recipe writes each command only as its schema
    allows, and an unknown member of a command it replaced is listed in `report.leftOut`, never
    carried onto another command. A writer does not rewrite references inside members or extensions it does not
    understand; a later kind that refers to a recipe's runs or a layer's `id` MUST report a name
    that no longer resolves and never fail on it. Rule 5 overrides this rule.
4.  **What is written.** `members` chooses. By default:
    - **the style** (`session.styles.toDocument()`, with `kind`), or only the layers `style.layers`
      or `style.templateId` choose, so "our lab's look" can be saved without the colouring an
      analysis added. It leaves out every layer that selects particular elements -- an `ids`
      selector, or a `member` selector of any scope but `{ where }`, in a refused layer too -- and
      lists each in `report.leftOut`, as the recorder leaves out a run on the selection, because a
      file shared with others would otherwise name them. `keepElementSelectors: true` keeps them.
      A layer opened with a `columns` rename is written under the document's own names, and a layer
      reading a namespaced run as the file's recipe names it (style.md, "Writing" rules 4, 12 and
      14);
    - **the analysis as a recipe** (recipe.md, "Recording") when `recipe.id` is given; without one
      the report says the recipe was not written and why;
    - **the data**: never, unless the caller asks. A data member that applied when the file was
      opened is listed in `report.leftOut` instead. A file for sharing a technique or a look does
      not carry the data, or the name of the reader's own data file, by accident -- including
      when the session was opened from a file that carried data.

    The caller asks for data explicitly. `data: { reference: true }` writes a reference to the
    file the graph was imported from -- its base name as `href`, its format, the import options it
    was read with (for a table, the endpoint and id columns it read, even when it found them
    without options), and its SHA-256 -- so a colleague learns how to read their own copy, and a
    replay on the same bytes can say so; the report names the file and the options. A graph built
    by more than one import (a node table, then an edge list merged into it) cannot be one
    reference: no data member is written, and a notice lists each import with its options.
    `data: { embed: true }` embeds the graph in `node-link`, holding its data columns only, never
    run results, which belong to the recipe. `data: { href, format }` writes the reference the
    caller gives, with the SHA-256 of the loaded bytes when `sha256: true`. `members` that include
    `graphty-data` with no `data` option write back the data member the file was opened with, as
    it was read, applied or not. `data: false` writes no data member.

    The report's notices list every literal text a written selector or `where` compares with, and
    every member, layer and extension written back as it was read without being understood (a
    member of an unknown kind or a newer version, a refused layer), with its size, so the author
    sees what the file discloses before sharing it.

5.  **References that leak.** A writer MUST NOT write an `href` holding a user name or password, and
    writes one holding a query or a fragment only when the caller passed `allowQuery: true`, because
    signed URLs carry credentials in their query. It refuses and reports any other reference rule 3
    of "The data member" would refuse on reading, and suggests a relative name. This holds for a
    member written back verbatim too: a data member whose `href` fails is dropped and reported.
6.  **Styles and runs together.** When the style it writes holds a layer painted by a run that the
    recipe it writes records, the writer writes `style: false` on that command, so opening the file
    paints the layer once (recipe.md, "Recording" rule 6).
7.  **Template ids.** A style layer opened from a document is stamped with a template id (style.md,
    "Reading and applying" rule 7): the caller's `templateId` when it passed one (`applyTemplate`);
    else exactly the style member's `id`; else the document's `name`, else `fileName`, else
    `sha256:` and the first 16 hex digits of the SHA-256 of the document's text -- each followed by
    `#` and the member's position among the style members of the file that have no `id` (1 for the
    first). Only an `id`, or the caller's `templateId`, can replace an earlier opening by default,
    and an `id` only when both openings came from the same place -- the same `base` origin and
    directory, or the same `fileName` -- because an `id` is a string anyone can copy from a shared
    file. The other forms are stamps for removing an opening, never a claim that two files are one
    look, so two unrelated files named "Overview" add rather than replace (style.md, "Reading and
    applying" rule 9). A look written as two members (Versions rule 4) gives each its own `id` (the base id,
    and the base id with `/2` appended). `saveDocument` writes the caller's `style.id`, else the `id` the style was
    opened with; without either, the report notes that reopening the file will not replace an
    earlier opening.
8.  **No `__proto__`.** A writer MUST NOT write a member named `__proto__` at any depth, since a
    reader refuses the whole file for one. Data holding a column or attribute of that name is not
    embedded: the data member is refused and reported, naming the column, and the other members are
    written.

## The report

`openDocument`'s report has one entry per member, in file order, so a caller can show what applied
and what did not. The document's own name and description, and each member's, come first, because
they are what the author wrote for the person opening the file: a recipe's `description` is where
its author says what preparation the data needs.

```ts
interface DocumentReport {
    /** True for `apply: false`: nothing in the session changed, and "applied" means "would apply". */
    readonly preview: boolean;
    readonly name?: string;
    readonly description?: string;
    /** What the file says about itself: shown as its claims, never as verified. */
    readonly generator?: { readonly name: string; readonly version: string };
    readonly provenance?: Provenance; // the graphty.provenance extension, when present
    readonly members: readonly MemberReport[];
    /** The graph the members bound to: the caller's, this file's data, or none. */
    readonly graph: {
        readonly source: "loaded" | "document" | "none";
        readonly nodes: number | null; // null when source is "none"
        readonly edges: number | null;
        readonly directed: boolean | "mixed" | null;
    };
    /** The release that wrote the file, from `generator`, and the one reading it. */
    readonly release: { readonly recorded: string | null; readonly running: string };
    /** Every recipe of the file together, against the one budget ("Applying a file" rule 8). */
    readonly recipes: {
        readonly totalEstimateSeconds: number | null; // null when any command has no estimate
        readonly budgetSeconds: number;
        readonly wouldStart: boolean; // false when the total is unknown or over the budget
        readonly wouldStartReason: "ok" | "over-budget" | "unknown-estimate" | "unbound";
    };
    /** W_UNKNOWN_MEMBER, W_RELEASE_DIFFERS and other notices about the document's own top level. */
    readonly notices: readonly Problem[];
}

interface MemberReport {
    readonly index: number; // position in `members`
    readonly kind: string;
    readonly version: number | null;
    /**
     * "applied": everything in it took effect; "partial": some layers or commands did not;
     * "planned": a recipe bound and planned but not run; "skipped": nothing in it applied.
     */
    readonly outcome: "applied" | "partial" | "planned" | "skipped";
    /** One sentence a person can read: "Style 'Screen look': 4 of 5 layers paint; 1 needs data.padj." */
    readonly summary: string;
    /** Why the whole member was skipped, when it was. */
    readonly problem?: Problem;
    readonly style?: StyleReport; // style.md, "Reading and applying"
    readonly recipe?: RecipeReport; // recipe.md, "The replay report"
    readonly data?: {
        readonly format: string;
        readonly href?: string; // a referenced file, as checked; shown before anyone consents to fetch it
        readonly sha256?: string;
        readonly options?: Readonly<Record<string, unknown>>; // its import options
        readonly nodes: number | null; // null when the data was not read
        readonly edges: number | null;
        readonly applied: boolean;
        /** Whether the loaded graph's file has the bytes `sha256` names ("The data member" rule 5). */
        readonly sameBytes: "same" | "different" | "unknown" | null; // null without a sha256 or when it applied
    };
    readonly notices: readonly Problem[];
}

interface Problem {
    readonly what: string; // a JSON pointer, a layer name, a command's `as`
    readonly reason: string; // one sentence a person can act on
    readonly details?: Readonly<Record<string, unknown>>;
    readonly code: GraphtyErrorCode | GraphtyWarningCode;
}
```

When the file's `generator` names graphty-element at a release other than the running one, the
report carries `W_RELEASE_DIFFERS` naming both, because a run may compute differently on another
release (recipe.md, "Same data, same results").

Every string in a report that came from the document or the data -- a name, a column, an `href`,
an unknown member's name inside a JSON pointer -- is text: a consumer shows it as text, never as
HTML. A string the report repeats from the document's own structure (a `where`, a `description`, a
member, layer or command `name`) is given whole, up to its schema limit, because a preview that
cut a filter would misstate what it keeps; a string quoted from the data or from a member this
reader does not know is cut to 256 characters with an ellipsis, so a report stays small whatever
the file holds (README, "Limits"). The codes are listed in README, "Error and warning codes".

## Conformance

A reader conforms when, for each input, it does what the right-hand column says:

| Input                                                                                                                                                                                    | Required result                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ "version": 1, "layers": [] }`                                                                                                                                                         | read as a document holding one empty style                                                                                                                                              |
| `{ "version": 2, "layers": [] }` on a reader of style version 1                                                                                                                          | that style skipped, `E_UNSUPPORTED_VERSION`, `kind: "graphty-style"`                                                                                                                    |
| `{ "kind": "graphty-recipe", "version": 1, "id": "x", "commands": [] }` at the top level                                                                                                 | read as a document holding that recipe                                                                                                                                                  |
| `{ "graphtyTemplate": true, "majorVersion": "1", ... }`                                                                                                                                  | converted (style.md, "Upgrading a 1.x template"); the parts not converted reported by name                                                                                              |
| a node-link graph (`{ "nodes": [], "links": [] }`)                                                                                                                                       | refused, `E_UNKNOWN_FORMAT`, `details.available` listing the data formats                                                                                                               |
| `"kind": "graphty-document", "version": 2`                                                                                                                                               | refused whole, `E_UNSUPPORTED_VERSION`, `found: 2`, `reads: [1]`                                                                                                                        |
| a document with no `members`                                                                                                                                                             | refused, `E_BAD_DOCUMENT`                                                                                                                                                               |
| `"requires": ["graphty-data-plan"]` on a reader that does not know that kind                                                                                                             | refused whole, `E_UNSUPPORTED`, naming `graphty-data-plan`                                                                                                                              |
| a member `{ "kind": "graphty-view", "version": 1, ... }` beside a style                                                                                                                  | view skipped with `W_UNKNOWN_KIND`; the style applies; the view is kept on save                                                                                                         |
| members `{ "kind": 7 }`, `{ "kind": "graphty-style", "version": "1" }`, `{ "kind": "x" }` with no `version`                                                                              | each skipped, `E_BAD_DOCUMENT`; the others apply                                                                                                                                        |
| a style member with `"version": 2` beside a recipe of version 1                                                                                                                          | style skipped, `E_UNSUPPORTED_VERSION`; the recipe applies                                                                                                                              |
| a style member whose `layers` is a string                                                                                                                                                | that member skipped, `E_BAD_DOCUMENT`; the others apply                                                                                                                                 |
| a top-level member `"colour": "red"`                                                                                                                                                     | ignored, reported `W_UNKNOWN_MEMBER` at `/colour`, written back on save                                                                                                                 |
| a member name `__proto__` anywhere                                                                                                                                                       | the file refused, `E_BAD_DOCUMENT`                                                                                                                                                      |
| embedded JGF whose nodes are keyed `constructor` and `prototype`                                                                                                                         | read; two nodes with those ids                                                                                                                                                          |
| 64 MB of `[` characters                                                                                                                                                                  | refused, `E_TOO_LARGE`, before the text is parsed                                                                                                                                       |
| a referenced data member, opened with no `resolve` and no graph loaded                                                                                                                   | data skipped, reported as needing `href`; style layers and recipes held until the caller loads data                                                                                     |
| `href` `/etc/passwd`, `../../../x` (from base `https://h/a/doc.json`), `//host/x`, `FILE:///x`, `\tfile:///x`, `https://u:p@h/x`                                                         | data skipped, `E_BAD_DOCUMENT`; `resolve` is never called                                                                                                                               |
| a referenced data member whose bytes do not match `sha256`                                                                                                                               | data skipped, `E_DIGEST_MISMATCH`                                                                                                                                                       |
| a referenced CSV with `options: { "sourceColumn": "from" }`                                                                                                                              | data skipped, `E_UNKNOWN_OPTION`, naming `edgeSource`                                                                                                                                   |
| a referenced CSV with `edgeSource: "protein1"` whose header has no `protein1`                                                                                                            | data skipped, `E_PARSE_FAILED`, naming `edgeSource` and `protein1`                                                                                                                      |
| a data member with an extra member `"encoding": "latin1"`                                                                                                                                | data skipped, `E_BAD_DOCUMENT`, naming `encoding`                                                                                                                                       |
| a data member of `version: 2` and a recipe, opened with `run: true` over a loaded graph with `data: "replace"`                                                                           | data skipped, `E_UNSUPPORTED_VERSION`; the recipe planned on the loaded graph, not run                                                                                                  |
| a style and embedded data, opened with defaults while a graph is loaded                                                                                                                  | the loaded graph untouched; data reported available; the style applies to the loaded graph                                                                                              |
| the same, with `data: "replace"`                                                                                                                                                         | the file's graph replaces the loaded one; `graph.source` is `"document"`                                                                                                                |
| any file, opened with `apply: false`                                                                                                                                                     | nothing in the session changes; the report is the one a real opening would give                                                                                                         |
| two data members                                                                                                                                                                         | the first applies; the second skipped, `E_UNSUPPORTED`                                                                                                                                  |
| a style layer reading `results.groups.group` and a recipe in the same file with `as: "groups"`, not run                                                                                  | layer added switched off; switched on when the run completes                                                                                                                            |
| a recipe opened without `run: true`                                                                                                                                                      | its member outcome is `"planned"`                                                                                                                                                       |
| a file opened with a referenced data member that applied, then saved with defaults                                                                                                       | no data member written; it is listed in `leftOut`                                                                                                                                       |
| saving with `data: { href: "https://b.s3.example/x.csv?X-Amz-Signature=..." }`                                                                                                           | refused and reported unless `allowQuery: true`                                                                                                                                          |
| a file whose `generator` is graphty-element 3.0.0, opened on 3.2.0                                                                                                                       | `W_RELEASE_DIFFERS` naming both                                                                                                                                                         |
| `{ "version": 8, "layers": [{ "id": "water", "type": "fill" }] }` (a MapLibre map style)                                                                                                 | refused, `E_UNKNOWN_FORMAT`: not a graphty style                                                                                                                                        |
| `"kind": "graphty-document"` with `"version": "1"`, `1.5` or no `version`                                                                                                                | refused, `E_BAD_DOCUMENT`                                                                                                                                                               |
| `"requires": ["graphty-style"]` with a style member of `"version": 2`, on a reader of style version 1                                                                                    | refused whole, `E_UNSUPPORTED`, naming `graphty-style` and version 2                                                                                                                    |
| `"requires": ["graphty-recipe"]`, opened with `members: ["graphty-style"]`                                                                                                               | refused whole, `E_UNSUPPORTED`                                                                                                                                                          |
| a member of kind `org.example.notes`                                                                                                                                                     | skipped, `W_UNKNOWN_KIND`; kept in place on save                                                                                                                                        |
| a 1.x template whose `graph.background` is a skybox with an `http:` image URL                                                                                                            | nothing fetched; the background reported by name and not applied                                                                                                                        |
| a 1.x template with `data.knownFields` (`repeatedEdges`, `edgeWeightPath`)                                                                                                               | the element's import settings unchanged; reported by name                                                                                                                               |
| an object `{ "href": "a.csv", "href": "https://x.example/b.csv" }`                                                                                                                       | the file refused, `E_BAD_DOCUMENT`, naming `/members/0/href`                                                                                                                            |
| `href` `%2e%2e/%2e%2e/etc/passwd` or `..%2F..%2Fetc%2Fpasswd`, with no `base`                                                                                                            | data skipped, `E_BAD_DOCUMENT`; `resolve` is never called                                                                                                                               |
| `href` `https://127.0.0.1/x`, `https://[::1]/x`, `https://10.0.0.1/x`, `https://localhost/x`                                                                                             | data skipped, `E_BAD_DOCUMENT`, unless `allowPrivateHosts: true`                                                                                                                        |
| a referenced data member and a recipe, opened with `run: true` while a graph is loaded                                                                                                   | data reported available; the recipe binds to the loaded graph and runs                                                                                                                  |
| a referenced data member, opened with `apply: false` and a `resolve`, no graph loaded                                                                                                    | `resolve` not called; the recipe plan unbound, estimates `null`; `data.href` in the report                                                                                              |
| an unknown member at `/members/0/layers/0/encode/node.color/overflw`                                                                                                                     | ignored, `W_UNKNOWN_MEMBER` with that pointer; the layer applies                                                                                                                        |
| the text of a graphty document given to `data.import` as JSON                                                                                                                            | refused, `E_UNKNOWN_FORMAT`, naming `openDocument`                                                                                                                                      |
| members [style, unknown kind, recipe], opened and saved                                                                                                                                  | written in the same order; the unknown member verbatim in the middle                                                                                                                    |
| members [style version 1, style version 2] opened by a reader of version 1 only, saved                                                                                                   | [version 1 regenerated, version 2 verbatim], in that order; `requires` kept                                                                                                             |
| a file whose data member was only reported available, saved with defaults                                                                                                                | no data member written; a notice names it                                                                                                                                               |
| a file whose data `href` holds `user:pass@` (refused on reading), saved                                                                                                                  | that data member dropped and reported                                                                                                                                                   |
| a session with an `ids` highlight layer, saved with defaults                                                                                                                             | that layer left out, listed in `leftOut`; kept with `keepElementSelectors: true`                                                                                                        |
| a graph with a `__proto__` column, saved with `data: { embed: true }`                                                                                                                    | the data member refused and reported; the other members written                                                                                                                         |
| a session loaded from `links.txt` with `delimiter: " "`, saved with `data: { reference: true }`                                                                                          | a data member `{ "href": "links.txt", "format": "csv", "options": { "delimiter": " ", ... }, "sha256": ... }`                                                                           |
| a session loaded from `links.txt`, saved with defaults and a recipe id                                                                                                                   | no data member; the recipe carries `table` with the endpoint columns the import read                                                                                                    |
| a session built from a node table and a merged edge list, saved with `data: { reference: true }`                                                                                         | no data member; a notice lists both imports and their options                                                                                                                           |
| a session holding a Louvain colouring and three layers of an opened look, saved with `style: { templateId }`                                                                             | only the look's three layers written                                                                                                                                                    |
| two style members with no `id` in a document named `Looks`, opened                                                                                                                       | template ids `Looks#1` and `Looks#2`; neither replaces the other                                                                                                                        |
| edition 2 of a file adds a data member before a style whose `id` is `org.example.look`, opened with the same `fileName` over edition 1                                                   | the new layers replace edition 1's                                                                                                                                                      |
| edition 2 of a file holding a recipe and a style reading `results.reach.value`, opened with defaults over edition 1 on the same data                                                     | the recipe refused, `E_REPEAT_APPLICATION`; the style's layers replace edition 1's and paint from edition 1's `reach` run                                                               |
| a recipe with commands [`algo.run`, `column.compute`, `algo.run`], opened on a reader that does not know `column.compute`, saved with defaults                                           | the recipe written back as it was read, all three commands                                                                                                                              |
| a recipe opened without `run: true`, saved with defaults                                                                                                                                 | the recipe written back unchanged                                                                                                                                                       |
| a layer carrying an unknown member `legend`, opened and saved                                                                                                                            | `legend` written back on that layer                                                                                                                                                     |
| a style layer reading `results.diff.value` where `diff` is the `as` of a command of a later `op`, on a reader that does not know it                                                      | the layer switched off, naming the command; a session run `diff` is not painted                                                                                                         |
| `{ "kind": "graphty-view", "version": 1 }` as a whole file, given to `openDocument`                                                                                                      | read as a document holding that member; skipped, `W_UNKNOWN_KIND`                                                                                                                       |
| the same text given to `data.import`                                                                                                                                                     | refused, `E_UNKNOWN_FORMAT`, naming `openDocument`                                                                                                                                      |
| `{ "members": [{ "kind": "graphty-data", "version": 1, "format": "csv", "href": "a.csv", "hr\u0065f": "https://x.example/b.csv" }] }`                                                    | the file refused, `E_BAD_DOCUMENT`: `href` twice after decoding                                                                                                                         |
| an extension member named `"\u005f_proto__"`                                                                                                                                             | the file refused, `E_BAD_DOCUMENT`                                                                                                                                                      |
| `href` `https://0.0.0.0/x`, `https://[::]/x`, `https://[::ffff:127.0.0.1]/x`, `https://[64:ff9b::a9fe:a9fe]/x`, `https://100.101.102.103/x`                                              | data skipped, `E_BAD_DOCUMENT`, unless `allowPrivateHosts: true`                                                                                                                        |
| two recipes planned at 200 s each, opened with `run: true` and the default budget                                                                                                        | neither starts; each report carries `E_CAP_EXCEEDED` with the total of 400 s                                                                                                            |
| `openDocument(text, { run: true })` with no graph loaded and a referenced data member but no `resolve`, then the caller imports a file                                                   | the data member reported as needing its file; the recipes held, then bound and planned, each `report` replaced by the bound plan before the import resolves; nothing runs until `run()` |
| the same with a graph loaded and `data: "replace"`                                                                                                                                       | the recipes planned on the loaded graph, not run                                                                                                                                        |
| a referenced data member with `sha256`, opened with defaults over a graph loaded from a file with other bytes                                                                            | data reported available, `sameBytes: "different"`, `W_DATA_DIFFERS` on the data member and on every recipe                                                                              |
| a report quoting an unknown member whose name is 500,000 characters of markup                                                                                                            | the name cut to 256 characters, shown as text                                                                                                                                           |
| a referenced data member with `options: { "url": "https://169.254.169.254/latest/meta-data/" }`                                                                                          | data skipped, `E_UNKNOWN_OPTION`, naming `url`; nothing fetched                                                                                                                         |
| a referenced data member with `options: { "data": "{...}" }` and a matching `sha256`                                                                                                     | data skipped, `E_UNKNOWN_OPTION`, naming `data`                                                                                                                                         |
| a referenced JSON file with `options: { "nodeIdPath": "to_string(@)" }`                                                                                                                  | the node id read from a field named `to_string(@)`; nothing evaluated                                                                                                                   |
| a data member with `"format": "parquet"` on a reader whose catalogue lacks it, and a recipe, opened with `run: true` and no graph loaded                                                 | data skipped, `E_UNKNOWN_FORMAT` with `{ format, dialect, available }`; the recipe held, as for data that did not arrive                                                                |
| embedded data with a `dialect` graph-io does not read                                                                                                                                    | data skipped, `E_UNKNOWN_FORMAT`                                                                                                                                                        |
| two recipes planned at 200 s each, opened with `apply: false`                                                                                                                            | each recipe `wouldStart: false` with `E_CAP_EXCEEDED` and 400 s; `recipes.wouldStart` false                                                                                             |
| a `resolve` that fetches, given `href` `go?to=http://127.0.0.1/` that the server answers with a 302 to `http://127.0.0.1/`                                                               | the redirect not followed, or refused at the checked hop; nothing read from `127.0.0.1`                                                                                                 |
| a `resolve` with no person to ask and no allowlist entry for the base's own origin, given a same-origin `href`                                                                           | declined; the data member reported as needing its file                                                                                                                                  |
| a recipe reading a missing column, over data a document's `href` fetched, opened without `quoteFetchedData`                                                                              | `E_UNKNOWN_ATTRIBUTE`; no suggestions, and a notice saying they were left out                                                                                                           |
| a file holding embedded data, a recipe and a style, saved with `members: ["graphty-style"]` and a style `id`                                                                             | only the style written; the data member and the recipe listed in `leftOut`                                                                                                              |
| a recipe with commands [`algo.run`, `column.compute`, `algo.run`], opened and run on a reader that does not know `column.compute`, then saved with `recipe: { id: <the same id> }`       | the recipe written back as read, all three commands; `leftOut` lists the two commands that did not run; with `dropUnrun: true`, replaced by the recorded recipe                         |
| a recipe whose `table` holds an unknown member `edgeWeight`, then `recipe.import(...)`                                                                                                   | the import refused, `E_UNKNOWN_OPTION` at `/members/0/table/edgeWeight`; the commands unaffected                                                                                        |
| a binding carrying an unknown member `legendTitle`, opened and saved                                                                                                                     | `legendTitle` written back on that binding                                                                                                                                              |
| a recipe whose third `algo.run` carries an unknown member `"sed": 7`, opened, run, then its third run re-run by hand with seed 7 and recorded under the same `id` with `dropUnrun: true` | the recorded command written with `seed: 7` and without `sed`; `sed` listed in `report.leftOut`                                                                                         |
| a style whose `id` is `org.example-lab.expression-overlay`, opened from another file after the lab's own file with that `id`                                                             | its layers added above the lab's, which stay; `W_ID_COLLISION` naming the id; `onRepeat: { style: "replace" }` replaces them                                                            |
| a file written by a newer release whose style layer sets a channel this release does not know, opened and saved                                                                          | written at `version: 1`, the unknown channel entry intact                                                                                                                               |
| a kindless `{ "version": 1, "layers": [...] }` of five layers, one with no `set` or `encode`                                                                                             | read as a style; four layers paint; that one refused, `E_BAD_LAYER`                                                                                                                     |
| a kindless `{ "version": 2, "layers": [{ "selector": { "match": "everything" }, "paint": {} }] }` on a reader of style version 1                                                         | that style skipped, `E_UNSUPPORTED_VERSION`                                                                                                                                             |
| a version 1 file opened and saved unchanged by a release that reads style version 2                                                                                                      | written at `version: 1`                                                                                                                                                                 |
| `userData: { "author": "x" }` on a layer and `extensions: { "org.example.tool": { "k": 1 } }`                                                                                            | no `W_UNKNOWN_MEMBER` for either                                                                                                                                                        |
| `href` `https://[2002:7f00:1::]/x`, `https://198.18.0.5/x`, `https://192.0.0.8/x`                                                                                                        | data skipped, `E_BAD_DOCUMENT`, unless `allowPrivateHosts: true`                                                                                                                        |
| a file-system `resolve` given `edges.csv`, a symbolic link to a file outside the chosen directory                                                                                        | declined; the data member reported as needing its file                                                                                                                                  |
| a `resolve` that returns a stream decoding past 256 MB                                                                                                                                   | the import stopped and refused, `E_TOO_LARGE`, naming the limit                                                                                                                         |
| a document of recipes scoped to thresholds over data its `href` fetched, opened with `preview: { data: true }` and without `quoteFetchedData`                                            | every `matched`, `of` and `withValue` `null`; no quoted values or columns; a notice saying so                                                                                           |
| three recipes held for data, then data loaded, then `run()` on each, each planned at 150 s                                                                                               | the first two start; the third fails, `E_CAP_EXCEEDED`, naming what is left of the file's 300 s                                                                                         |

## Worked example

A lab shares its expression analysis without its patients' data: one recipe, one style, and a
reference to the file each colleague supplies from their own study.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "name": "Co-expression hubs",
    "generator": { "name": "graphty-element", "version": "3.0.0" },
    "members": [
        {
            "kind": "graphty-data",
            "version": 1,
            "format": "csv",
            "href": "coexpression-edges.csv",
            "options": { "edgeSource": "gene_a", "edgeTarget": "gene_b" }
        },
        {
            "kind": "graphty-recipe",
            "version": 1,
            "id": "org.example-lab.coexpression-hubs",
            "recipeVersion": "1.2.0",
            "table": { "edgeSource": "gene_a", "edgeTarget": "gene_b" },
            "commands": [
                {
                    "op": "algo.run",
                    "algorithm": "pagerank",
                    "as": "hubs",
                    "params": { "weight": "weight" },
                    "style": false
                },
                { "op": "algo.run", "algorithm": "louvain", "as": "modules" }
            ]
        },
        {
            "kind": "graphty-style",
            "version": 1,
            "layers": [
                {
                    "id": "hub-size",
                    "name": "Size by hub score",
                    "selector": { "match": "has", "path": "results.hubs.value" },
                    "encode": { "node.size": { "by": "results.hubs.value", "scale": "sqrt", "range": [1, 3] } }
                }
            ]
        }
    ]
}
```

Opened with a `base`, a `resolve` that returns a colleague's `coexpression-edges.csv`, no graph
loaded and `run: true`, the CSV is imported, read with the data member's options (its weight column, whatever its case, is the column
`weight`), both runs complete under the namespace `coexpression_hubs`, the style's path
`results.hubs.value` is rewritten to `results.coexpression_hubs__hubs.value`, and the size layer
paints. PageRank's own colouring is off, because the style paints its result. Opened without
`resolve` and with no graph loaded, the data member is reported as needing its file, and the
style's layer and the recipe wait for data. When the colleague then imports their own copy with
`opened.recipes[0].import({ type: "csv", config: { file } })`, the import reads each edge's ends
from `gene_a` and `gene_b`, as the recipe's `table` says, the recipe binds and plans, and the runs
start when the colleague calls `opened.recipes[0].run()`.
