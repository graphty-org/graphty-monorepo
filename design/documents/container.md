# The graphty document file

`kind: "graphty-document"`, version 1. Schema: [container.schema.json](container.schema.json), and
[data.schema.json](data.schema.json) for the data member. What the documents are for, the trust
rules and the limits are in [README.md](README.md).

## Purpose

Every graphty document is one JSON file. It carries any mix of members -- styles, recipes, the data
itself, and kinds a later version adds -- so one file can be "our lab's look", "our team's analysis",
"both, as a starting point without our data", or "both, with the data". The file is one JSON text a
person can read, diff and keep in version control. There is no zip form.

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
   `E_BAD_DOCUMENT` when one is exceeded. Text that is not JSON is refused with `E_PARSE_FAILED`.
2. A top-level object whose `kind` is `"graphty-document"` is a graphty document.
3. A top-level object with no `kind`, an integer `version` and an array `layers` each of whose
   entries is an object with a `selector` and a `set` or an `encode` (an empty array included) is
   a style written by graphty-element 2.x or later without its `kind`. A reader MUST read it,
   forever, as a document holding that one style member (as if it had `"kind": "graphty-style"`);
   a `version` the reader does not implement is then rule 12, which skips that style, not the
   file. Any other shape falls to rule 6, so another tool's file that happens to have `version`
   and `layers` (a MapLibre map style) is never taken for a graphty style.
4. A top-level object with `"graphtyTemplate": true` is a graphty-element 1.x style template. A
   reader converts it as style.md, "Upgrading a 1.x template", says, and reads the result as a
   document. Only what the conversion produced applies. Every other part -- the background, whose
   skybox names an image URL; the data settings, which change how every later import is read; the
   camera; behaviour -- is reported by name and not applied, and is never handed to
   graphty-element's own template input. A caller who wants one sets it through its own API.
5. A top-level object whose `kind` is a member kind (`"graphty-style"`, `"graphty-recipe"`,
   `"graphty-data"`) is read as a document holding that one member. A writer never writes one.
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
    of the shapes of rules 2 to 5 refuses it with `E_UNKNOWN_FORMAT`, saying it is a graphty
    document to open with `openDocument`. It never reads one as graph data, which could find no
    nodes and say nothing useful.

### Unknown object members

A reader MUST ignore an object member it does not know, at any depth outside the places listed
below, and report each one with `W_UNKNOWN_MEMBER` and its JSON pointer (`/members/0/layers/2/colour`),
so a misspelling is seen. The exceptions:

- the members of a recipe command are closed (recipe.md, "Replaying" rule 3), because ignoring one
  would change a result;
- the members of a data member are closed ("The data member" rule 6), for the same reason;
- the member names of a style layer's `set` and `encode` are channel names, and an unknown one
  follows style.md, "Reading and applying" rule 3, not this rule.

The version 1 schemas also close a style's selectors and bindings, so a validator catches a
misspelling (`overflw`) that a reader only warns about.

### Versions

1. `version` is the major version, of the container and of each member kind separately. A style
   member at version 2 inside a container at version 1 is valid.
2. Within a major version a change MUST be additive: a new optional member of an open object, a new
   value where the schema's list is open, a new member kind. Removing or renaming a member, or
   changing what a value means, needs a new major version. The open lists of version 1 are the
   member kinds, a recipe command's `op` (an old reader stops the replay at an unknown command,
   recipe.md "Replaying" rule 4), algorithm keys, layout ids, palette ids and the import option
   names of a format (its catalogue decides). The closed objects -- a recipe command, a run's
   `style` and `scope`, a data member, a style's selectors and bindings -- gain members only in a
   new major version of their kind, because an older reader skips or misreads a member it does
   not know. A writer MUST check every member it stamps with a version against that version's
   schema, and write the next version when it fails; graphty-element's tests run `toDocument()`
   and the recorder's output through the frozen version 1 schemas. What a recipe command's `as`
   means never changes between recipe versions, so a reader that skips a newer recipe can still
   tell which `results.` paths belong to it (style.md, "Reading and applying" rule 4).
3. **An addition an old reader would misapply by ignoring it needs a new major version.** A new
   selector member that narrows what a layer matches, or a new command member that changes what a
   run computes, is written as the next major version of that kind, which an old reader refuses by
   version (rule 12 above) instead of ignoring and painting or computing the wrong thing. A new
   member kind that others depend on is listed in `requires` instead (rule 9).
4. A writer MUST write the lowest version of each kind that can express the content, so saving a
   file does not lock out a colleague on an older release. A style whose top layers need a later
   style version SHOULD be written as two members, the lower layers at the lowest version and the
   rest at the later one, so an older reader still draws the lower layers (style.md, "Writing").
5. A reader SHOULD read the current major version and the one before it of each kind, upgrading the
   older one on read. Style version 1 is read forever (rule 3 of "Reading a file").

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
    dialect: "node-link" | "d3" | "jgf" | "cytoscape" | "graphology" | "vis";
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

1. **Embedded.** `graph` holds the graph as a JSON value in the named graph-io dialect, written with
   that dialect's own member names. A writer SHOULD embed in `node-link`, which every graph-io
   release reads and writes. A node's or link's members other than the dialect's own become
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
      `localhost` or an IP literal in a loopback, private, link-local or unique-local range
      (`127.0.0.1`, `[::1]`, `10.0.0.1`, `169.254.169.254`, `[fd00::1]`), which is refused unless
      the caller passes `allowPrivateHosts: true`. A host name is not looked up here, so a
      `resolve` that fetches applies its own check to the address a name reaches;
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
   contents or declines. A `resolve` that fetches a URL leaving the base's origin MUST first show
   it to the person; one with no person to ask (a server, a script) MUST check it against an
   allowlist of origins. A `resolve` for the local file system joins `href` below one directory
   and nothing else. Without a `resolve`, or when it declines, the data member is skipped and
   reported as needing the file, naming `href`.
5. **Integrity.** When `sha256` is present, the reader compares it with the bytes `resolve`
   returned. A difference skips the data member with `E_DIGEST_MISMATCH` unless the caller passed
   `acceptChangedData: true`, in which case it loads and the difference is reported. A digest is an
   integrity check, never a proof of who wrote the file.
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
   not -- no `resolve`, declined, refused, a digest mismatch, a version this reader does not
   implement, a failed import -- the file's recipes are bound and planned but not run, even with
   `run: true`, unless the caller also passed `runWithoutData: true`. A recipe meant for the file's
   own data never spends its budget on whatever graph happened to be loaded. A data member skipped
   only because a graph was already loaded and the caller kept it (`data: "keep"`) was not going to
   apply, so it does not count: the file's recipes bind to the loaded graph and run when asked.

### Import options

`options` of a referenced file use the option names graphty-element's format catalogue publishes
for the named format, which are the one spelling in a graphty document. The list is open: it is
checked against the catalogue of the reading release, so a plugin format's options and an option a
later release adds need no new data version. In version 1:

- every format: `edgeSource` and `edgeTarget` (the fields holding an edge's two ends); `directed`
  (`true` or `false`, overriding what the file says); `repeatedEdges`, what a second edge between
  the same two nodes becomes: `keep` (the default), `first`, `last`, `sum`, `min`, `max` or
  `error`, graph-format's own words. On an undirected import `A B` and `B A` are the same pair;
- CSV: `delimiter`, one character (`","`, `"\t"`, `";"`, `"|"`, `" "`). Without it the importer
  works it out from the first line, choosing among comma, tab, semicolon and pipe, so a
  space-separated file (STRING's bulk downloads) needs `delimiter: " "`. Every occurrence
  separates two columns; a run of spaces is not collapsed. `variant`, the CSV shape (README, "What
  every importer produces"), and `idColumn`, the node table's id column;
- JSON: `nodeIdPath`.

`directed` and `repeatedEdges` are graphty-element settings today; publishing them as import
options of every format is a precondition of releasing recipes. graphty-element translates the
options into graph-io's own names; a document never uses graph-io's spellings (`sourceColumn`,
`sourceKey`, `nodeIdKey`) directly. A referenced JSON file's dialect is detected by graph-io. An
option the named format does not declare, or a value its descriptor refuses, skips the data member
with `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`.

Without options, each importer finds endpoints, ids and the weight by the rules of README, "What
every importer produces". An option naming a column the file does not have (`edgeSource:
"protein1"` on a file whose header says `#node1`) fails the import: the data member is skipped with
`E_PARSE_FAILED`, naming the option and the column. The catalogue has no option for the weight
column, for filtering rows or for compression; a file needing one cannot be referenced as it is in
version 1 (README, "What version 1 does not cover").

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
    resolve?: (ref: { url: string | null; href: string; crossOrigin: boolean }) => Promise<string | Uint8Array | null>;
    allowPrivateHosts?: boolean; // default false ("The data member" rule 3)
    preview?: { data?: boolean }; // with apply: false, whether resolve may be called; default false
    acceptChangedData?: boolean; // default false
    columns?: Record<string, string>; // document column name -> data column name, every style and recipe
    run?: boolean; // default false
    runWithoutData?: boolean; // default false ("The data member" rule 8)
    onRepeat?: { recipe?: "refuse" | "replace" | "add"; style?: "replace" | "add" | "refuse" };
    capSeconds?: number; // the per-command cost cap for recipes; default the element's own
    budget?: { totalSeconds?: number }; // each recipe's total budget
    openingSeconds?: number; // the opening budget (README "Limits"); default 5
}): Promise<DocumentReport>
```

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
      two versions of a recipe can be compared before choosing `onRepeat`.
2. **Order.** Data first, then recipes in file order, then styles in file order. The data must exist
   before anything binds to its columns, and a style that paints a recipe's results must come after
   the recipe. A run's own suggested colouring is added when the run completes, above every layer
   present then -- the file's style layers included -- so a file whose style member paints a run's
   result says `style: false` on that run (recipe.md, "Commands" rule 8).
3. **Recipes do not run unless asked.** Opening binds and plans each recipe; it runs only with
   `run: true` (recipe.md, "Running").
4. **Renames.** `columns` applies to every style and every recipe member of the file, and each
   member's report records it.
5. **References between members.** A style member that names `results.<as>.<field>`, where `<as>` is
   a run name of a recipe in the same file, is rewritten to the run id that recipe's application
   produced (recipe.md, "Run ids and namespaces"). When two recipes in the file use the same `<as>`,
   the reference is ambiguous: the layer is added switched off with `E_BAD_LAYER`, naming both. A
   layer waiting for a run the file's own recipe has not produced yet (the caller did not ask it to
   run) is added switched off and reported; graphty-element MUST switch it on when that run
   completes.
6. **Opened before data.** When no graph is loaded and the file carries no data that applies, style
   layers are added switched off and recipes are held; both bind when data is loaded (README,
   "Applying a style and a recipe to new data" rule 5).
7. **What counts as new data.** A `data.import` that replaces the graph, a `data.apply` that clears
   it, or a data member that applies starts afresh. Merging a file, and adding, removing or updating
   elements, is the same data.

## Writing a file

```ts
session.data.saveDocument(options?: {
    members?: ("graphty-style" | "graphty-recipe" | "graphty-data")[]; // see rule 4
    name?: string;
    description?: string;
    style?: { id?: string; styleVersion?: string; name?: string; description?: string };
    keepElementSelectors?: boolean; // default false: see rule 4
    recipe?: RecordOptions; // recipe.md, "Recording"
    data?: false | { embed: true } | { href: string; format: string; options?: Record<string, unknown>; sha256?: boolean; allowQuery?: boolean };
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
    `extensions`; new members are appended. `requires` is written as the file's own list together
    with every kind the writer itself requires. A member the caller's `members` option leaves out is
    listed in `report.leftOut`. A writer SHOULD keep the unknown object members of a member it
    regenerated, too. A writer does not rewrite references inside members or extensions it does not
    understand; a later kind that refers to a recipe's runs or a layer's `id` MUST report a name
    that no longer resolves and never fail on it. Rule 5 overrides this rule.
4.  **What is written.** `members` chooses. By default: - **the style** (`session.styles.toDocument()`, with `kind`), leaving out every layer that
    selects particular elements -- an `ids` selector, or a `member` selector of any scope but
    `{ where }` -- and listing each in `report.leftOut`, as the recorder leaves out a run on the
    selection, because a file shared with others would otherwise name them. `keepElementSelectors:
true` keeps them. A layer opened with a `columns` rename is written under the document's own
    names (style.md, "Writing" rule 12); - **the analysis as a recipe** (recipe.md, "Recording") when `recipe.id` is given; without one
    the report says the recipe was not written and why; - **the data**: the data member the session's graph came from, when it applied; else, when the
    graph was imported from a file, a reference to that file -- its base name as `href`, its
    format and the import options it was read with (for a CSV, the endpoint columns it found are
    written as `edgeSource` and `edgeTarget` even when they were found without options, so the
    reference does not depend on the candidate lists), and no `sha256` -- so a colleague learns how
    to read their own copy, and the report names those options; else nothing. A data member
    that was only reported available (a graph was already loaded) or was skipped is written
    only when the caller's `members` or `data` asks for it, and a notice names it. `data: false`
    writes no data member. `data: { embed: true }` embeds the graph in `node-link`, holding its
    data columns only, never run results, which belong to the recipe; `data: { href, format }`
    writes a reference, with the SHA-256 of the loaded bytes when `sha256: true`. Nothing embeds
    data by default, because a file for sharing a technique should not carry the data by
    accident.

                    The report's notices list every literal text a written selector or `where` compares with, so the
                    author sees what the file discloses before sharing it.

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
    first). Only an `id` makes a corrected edition of a file replace the earlier opening: the other
    forms change when the file is renamed or edited, and then reopening adds rather than replaces. A
    look written as two members (Versions rule 4) gives each its own `id` (the base id, and the base
    id with `/2` appended). `saveDocument` writes the caller's `style.id`, else the `id` the style was
    opened with; without either, the report notes that reopening the file will not replace an
    earlier opening.
8.  **No `__proto__`.** A writer MUST NOT write a member named `__proto__` at any depth, since a
    reader refuses the whole file for one. Data holding a column or attribute of that name is not
    embedded: the data member is refused and reported, naming the column, and the other members are
    written.

## The report

`openDocument` resolves with one report entry per member, in file order, so a caller can show what
applied and what did not:

```ts
interface DocumentReport {
    /** True for `apply: false`: nothing in the session changed, and "applied" means "would apply". */
    readonly preview: boolean;
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
    };
    readonly notices: readonly Problem[];
}

interface Problem {
    readonly what: string; // a JSON pointer, a layer name, a command's `as`
    readonly reason: string; // one sentence a person can act on
    readonly code: GraphtyErrorCode | GraphtyWarningCode;
}
```

When the file's `generator` names graphty-element at a release other than the running one, the
report carries `W_RELEASE_DIFFERS` naming both, because a run may compute differently on another
release (recipe.md, "Same data, same results").

## Conformance

A reader conforms when, for each input, it does what the right-hand column says:

| Input                                                                                                                            | Required result                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `{ "version": 1, "layers": [] }`                                                                                                 | read as a document holding one empty style                                                             |
| `{ "version": 2, "layers": [] }` on a reader of style version 1                                                                  | that style skipped, `E_UNSUPPORTED_VERSION`, `kind: "graphty-style"`                                   |
| `{ "kind": "graphty-recipe", "version": 1, "id": "x", "commands": [] }` at the top level                                         | read as a document holding that recipe                                                                 |
| `{ "graphtyTemplate": true, "majorVersion": "1", ... }`                                                                          | converted (style.md, "Upgrading a 1.x template"); the parts not converted reported by name             |
| a node-link graph (`{ "nodes": [], "links": [] }`)                                                                               | refused, `E_UNKNOWN_FORMAT`, `details.available` listing the data formats                              |
| `"kind": "graphty-document", "version": 2`                                                                                       | refused whole, `E_UNSUPPORTED_VERSION`, `found: 2`, `reads: [1]`                                       |
| a document with no `members`                                                                                                     | refused, `E_BAD_DOCUMENT`                                                                              |
| `"requires": ["graphty-data-plan"]` on a reader that does not know that kind                                                     | refused whole, `E_UNSUPPORTED`, naming `graphty-data-plan`                                             |
| a member `{ "kind": "graphty-view", "version": 1, ... }` beside a style                                                          | view skipped with `W_UNKNOWN_KIND`; the style applies; the view is kept on save                        |
| members `{ "kind": 7 }`, `{ "kind": "graphty-style", "version": "1" }`, `{ "kind": "x" }` with no `version`                      | each skipped, `E_BAD_DOCUMENT`; the others apply                                                       |
| a style member with `"version": 2` beside a recipe of version 1                                                                  | style skipped, `E_UNSUPPORTED_VERSION`; the recipe applies                                             |
| a style member whose `layers` is a string                                                                                        | that member skipped, `E_BAD_DOCUMENT`; the others apply                                                |
| a top-level member `"colour": "red"`                                                                                             | ignored, reported `W_UNKNOWN_MEMBER` at `/colour`, written back on save                                |
| a member name `__proto__` anywhere                                                                                               | the file refused, `E_BAD_DOCUMENT`                                                                     |
| embedded JGF whose nodes are keyed `constructor` and `prototype`                                                                 | read; two nodes with those ids                                                                         |
| 64 MB of `[` characters                                                                                                          | refused, `E_TOO_LARGE`, before the text is parsed                                                      |
| a referenced data member, opened with no `resolve`                                                                               | data skipped, reported as needing `href`; styles apply; recipes planned, not run even with `run: true` |
| `href` `/etc/passwd`, `../../../x` (from base `https://h/a/doc.json`), `//host/x`, `FILE:///x`, `\tfile:///x`, `https://u:p@h/x` | data skipped, `E_BAD_DOCUMENT`; `resolve` is never called                                              |
| a referenced data member whose bytes do not match `sha256`                                                                       | data skipped, `E_DIGEST_MISMATCH`                                                                      |
| a referenced CSV with `options: { "sourceColumn": "from" }`                                                                      | data skipped, `E_UNKNOWN_OPTION`, naming `edgeSource`                                                  |
| a referenced CSV with `edgeSource: "protein1"` whose header has no `protein1`                                                    | data skipped, `E_PARSE_FAILED`, naming `edgeSource` and `protein1`                                     |
| a data member with an extra member `"encoding": "latin1"`                                                                        | data skipped, `E_BAD_DOCUMENT`, naming `encoding`                                                      |
| a data member of `version: 2` and a recipe, opened with `run: true`                                                              | data skipped, `E_UNSUPPORTED_VERSION`; the recipe planned, not run                                     |
| a style and embedded data, opened with defaults while a graph is loaded                                                          | the loaded graph untouched; data reported available; the style applies to the loaded graph             |
| the same, with `data: "replace"`                                                                                                 | the file's graph replaces the loaded one; `graph.source` is `"document"`                               |
| any file, opened with `apply: false`                                                                                             | nothing in the session changes; the report is the one a real opening would give                        |
| two data members                                                                                                                 | the first applies; the second skipped, `E_UNSUPPORTED`                                                 |
| a style layer reading `results.groups.group` and a recipe in the same file with `as: "groups"`, not run                          | layer added switched off; switched on when the run completes                                           |
| a recipe opened without `run: true`                                                                                              | its member outcome is `"planned"`                                                                      |
| a file opened with a referenced data member that applied, then saved with defaults                                               | the data member is written back as it was                                                              |
| saving with `data: { href: "https://b.s3.example/x.csv?X-Amz-Signature=..." }`                                                   | refused and reported unless `allowQuery: true`                                                         |
| a file whose `generator` is graphty-element 3.0.0, opened on 3.2.0                                                               | `W_RELEASE_DIFFERS` naming both                                                                        |
| `{ "version": 8, "layers": [{ "id": "water", "type": "fill" }] }` (a MapLibre map style)                                         | refused, `E_UNKNOWN_FORMAT`: not a graphty style                                                       |
| `"kind": "graphty-document"` with `"version": "1"`, `1.5` or no `version`                                                        | refused, `E_BAD_DOCUMENT`                                                                              |
| `"requires": ["graphty-style"]` with a style member of `"version": 2`, on a reader of style version 1                            | refused whole, `E_UNSUPPORTED`, naming `graphty-style` and version 2                                   |
| `"requires": ["graphty-recipe"]`, opened with `members: ["graphty-style"]`                                                       | refused whole, `E_UNSUPPORTED`                                                                         |
| a member of kind `org.example.notes`                                                                                             | skipped, `W_UNKNOWN_KIND`; kept in place on save                                                       |
| a 1.x template whose `graph.background` is a skybox with an `http:` image URL                                                    | nothing fetched; the background reported by name and not applied                                       |
| a 1.x template with `data.knownFields` (`repeatedEdges`, `edgeWeightPath`)                                                       | the element's import settings unchanged; reported by name                                              |
| an object `{ "href": "a.csv", "href": "https://x.example/b.csv" }`                                                               | the file refused, `E_BAD_DOCUMENT`, naming `/members/0/href`                                           |
| `href` `%2e%2e/%2e%2e/etc/passwd` or `..%2F..%2Fetc%2Fpasswd`, with no `base`                                                    | data skipped, `E_BAD_DOCUMENT`; `resolve` is never called                                              |
| `href` `https://127.0.0.1/x`, `https://[::1]/x`, `https://10.0.0.1/x`, `https://localhost/x`                                     | data skipped, `E_BAD_DOCUMENT`, unless `allowPrivateHosts: true`                                       |
| a referenced data member and a recipe, opened with `run: true` while a graph is loaded                                           | data reported available; the recipe binds to the loaded graph and runs                                 |
| a referenced data member, opened with `apply: false` and a `resolve`, no graph loaded                                            | `resolve` not called; the recipe plan unbound, estimates `null`; `data.href` in the report             |
| an unknown member at `/members/0/layers/0/encode/node.color/overflw`                                                             | ignored, `W_UNKNOWN_MEMBER` with that pointer; the layer applies                                       |
| the text of a graphty document given to `data.import` as JSON                                                                    | refused, `E_UNKNOWN_FORMAT`, naming `openDocument`                                                     |
| members [style, unknown kind, recipe], opened and saved                                                                          | written in the same order; the unknown member verbatim in the middle                                   |
| members [style version 1, style version 2] opened by a reader of version 1 only, saved                                           | [version 1 regenerated, version 2 verbatim], in that order; `requires` kept                            |
| a file whose data member was only reported available, saved with defaults                                                        | no data member written; a notice names it                                                              |
| a file whose data `href` holds `user:pass@` (refused on reading), saved                                                          | that data member dropped and reported                                                                  |
| a session with an `ids` highlight layer, saved with defaults                                                                     | that layer left out, listed in `leftOut`; kept with `keepElementSelectors: true`                       |
| a graph with a `__proto__` column, saved with `data: { embed: true }`                                                            | the data member refused and reported; the other members written                                        |
| a session loaded from `links.txt` with `delimiter: " "`, saved with a recipe id                                                  | a data member `{ "href": "links.txt", "format": "csv", "options": { "delimiter": " ", ... } }`         |
| two style members with no `id` in a document named `Looks`, opened                                                               | template ids `Looks#1` and `Looks#2`; neither replaces the other                                       |
| edition 2 of a file adds a data member before a style whose `id` is `org.example.look`, opened over edition 1                    | the new layers replace edition 1's                                                                     |

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
loaded and `run: true`, the CSV is imported (its weight column, whatever its case, is the column
`weight`), both runs complete under the namespace `coexpression_hubs`, the style's path
`results.hubs.value` is rewritten to `results.coexpression_hubs__hubs.value`, and the size layer
paints. PageRank's own colouring is off, because the style paints its result. Opened without
`resolve`, the data member is reported as needing its file, the style's layer waits for its run, and
the recipe is planned but not run.
