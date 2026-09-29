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

A file MAY hold several members of one kind: two styles (a screen look and a print look), several
recipes, a style and a recipe. It holds at most one data member that applies (see "Applying a
file").

## Reading a file

A reader MUST decide what a JSON text is from its content, never from the file name:

1. It checks the limits of README "Limits" while parsing, and refuses the text with `E_TOO_LARGE`
   when one is exceeded.
2. A top-level object whose `kind` is `"graphty-document"` is a graphty document.
3. A top-level object with no `kind`, a `version` of 1 and an array `layers` is a style written by
   graphty-element 2.x. A reader MUST read it, forever, as a document holding that one style member
   (as if it had `"kind": "graphty-style"`).
4. A top-level object whose `kind` is a member kind (`"graphty-style"`, `"graphty-recipe"`,
   `"graphty-data"`) is refused with `E_BAD_COMMAND` and a message saying to wrap it in a document:
   a member on its own is not a file.
5. Anything else is not a graphty document and is refused with `E_UNKNOWN_FORMAT`. A caller that
   was handed an unknown `.json` file can then offer it to the data import instead.
6. A document whose `version` the reader does not implement is refused whole with
   `E_UNSUPPORTED_VERSION` and details `{ kind: "graphty-document", found, reads }`. It MUST NOT be
   guessed at, and MUST NOT be reported as an empty document.
7. A document whose `members` is missing or not an array is refused with `E_BAD_COMMAND`.

Then each member is read on its own:

8. A member of a kind the reader does not know is skipped and reported with `W_UNKNOWN_KIND`,
   naming the kind. It is not an error: a later version adds kinds, and a file carrying one is still
   a good file for the members this reader knows.
9. A member whose `version` the reader does not implement for its kind is skipped with
   `E_UNSUPPORTED_VERSION` and details `{ kind, found, reads }`.
10. A member whose own top level fails its schema (a style whose `layers` is not an array, a recipe
    with no `id`) is skipped with `E_BAD_COMMAND`, naming the member and the failure.
11. Inside a member that is read, failures are as small as possible: a style layer that fails is
    added switched off (style.md); a recipe command that fails is skipped with the commands that
    depend on it (recipe.md).
12. Any exception raised while one member is applied MUST be caught and turned into that member's
    report entry. One member never fails another.

A skipped member is not lost: see "Writing a file" rule 3.

### Unknown object members

A reader MUST ignore an object member it does not know, at any depth outside the places listed
below, and report each one with `W_UNKNOWN_MEMBER` and its JSON pointer (`/members/0/layers/2/colour`),
so a misspelling is seen. The exceptions are closed, because ignoring a member there would change a
result: the members of a recipe command (recipe.md, "Replaying" rule 3) and the members of a data
member (below).

### Versions

1. `version` is the major version, of the container and of each member kind separately. A style
   member at version 2 inside a container at version 1 is valid.
2. Within a major version a change MUST be additive: a new optional member, a new value where the
   schema's list is open, a new member kind. Removing or renaming a member, or changing what a value
   means, needs a new major version.
3. **An addition an old reader would misapply by ignoring it needs a new major version.** A new
   selector member that narrows what a layer matches, or a new command member that changes what a
   run computes, is written as the next major version of that kind, which an old reader refuses by
   version (rule 9 above) instead of ignoring and painting or computing the wrong thing.
4. A writer MUST write the lowest version of each kind that can express the content, so saving a
   file does not lock out a colleague on an older release.
5. A reader SHOULD read the current major version and the one before it of each kind, upgrading the
   older one on read. Style version 1 is read forever (rule 3 of "Reading a file").

### Extensions

The document and every member MAY carry `extensions`, an object whose member names are
reverse-domain names (`org.example.tool`). The name `graphty` and names starting `graphty.` are
reserved for graphty-element. A reader MUST NOT interpret an extension it does not know and MUST
keep it (see "Writing a file").

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
   that dialect's own member names (node-link: `nodes`, `links`, `id`, `source`, `target`). A writer
   SHOULD embed in `node-link`, which every graph-io release reads and writes. Embedded data takes
   no import options: the dialect's own names are the only spelling. The binary wire form of a
   graph-format snapshot is never embedded, as base64 or otherwise.
2. **Referenced.** `href` names the data file; `format` says which importer reads it, so a reader
   never guesses a format from an extension. A relative `href` is resolved against the location the
   document was opened from.
3. **Consent to fetch.** A reader MUST NOT read or fetch a referenced file on its own. The caller
   supplies the bytes: `openDocument(src, { resolve })`, where `resolve(href)` returns the file's
   contents or declines. Without a `resolve`, or when it declines, the data member is skipped and
   reported as needing the file, naming `href`; the other members still apply. Only `https:` and
   relative references are ever passed to `resolve`; any other scheme (`file:`, `data:`,
   `javascript:`) skips the member with `E_BAD_COMMAND`.
4. **Integrity.** When `sha256` is present, the reader compares it with the bytes `resolve`
   returned. A difference skips the data member with `E_DIGEST_MISMATCH` unless the caller passed
   `acceptChangedData: true`, in which case it loads and the difference is reported. A digest is an
   integrity check, never a proof of who wrote the file.
5. **Applying.** A data member is imported exactly as the caller importing that file would import
   it, under the same node and edge limits, and replaces the session's graph. A file holding more
   than one data member applies the first one and skips each other with `E_UNSUPPORTED`: several
   graphs in one session file are not in version 1.

### Import options

`options` of a referenced file use the option names graphty-element's format catalogue publishes,
which are the one spelling in a graphty document: `edgeSource` and `edgeTarget` (the fields holding
an edge's two ends, every format), `idColumn`, `delimiter` and `variant` (CSV), `nodeIdPath` (JSON),
and `dialect` (JSON: one of graph-io's JSON dialect names). graphty-element translates them into
graph-io's own option names; a document never uses graph-io's spellings (`sourceColumn`,
`sourceKey`, `nodeIdKey`) directly. An option the named format does not declare, or a value its
descriptor refuses, skips the data member with `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`.

These spellings matter only while the file is read. After import, node ids and edge ends are
structure, not columns, so no style or recipe ever names them (README, "Three things called a file
format").

## Applying a file

1. **What applies.** By default every member the reader can read. The caller MAY choose:
   `openDocument(src, { members: ["graphty-style"] })` applies only the style members.
2. **Order.** Data first, then recipes in file order, then styles in file order. The data must exist
   before anything binds to its columns, and a style that paints a recipe's results must come after
   the recipe.
3. **Recipes do not run unless asked.** Opening binds and plans each recipe; it runs only with
   `run: true` (recipe.md, "Running").
4. **References between members.** A style member that names `results.<as>.<field>`, where `<as>` is
   a run name of a recipe in the same file, is rewritten to the run id that recipe's application
   produced (recipe.md, "Run ids and namespaces"). When two recipes in the file use the same `<as>`,
   the reference is ambiguous: the layer is added switched off with `E_BAD_LAYER`, naming both. A
   layer waiting for a run the file's own recipe has not produced yet (the caller did not ask it to
   run) is added switched off and reported; graphty-element MUST switch it on when that run
   completes.

## Writing a file

1. A writer MUST write `kind` and `version` first, then `name`, `description`, `generator`,
   `members`, `extensions`. Inside a member, the order of its schema. A writer SHOULD write the same
   bytes for the same content, so a file in version control diffs only where something changed.
2. A conforming writer MUST write `generator`, naming itself and its version.
3. **Round trip.** A writer that saves a session opened from a file MUST write back every member it
   skipped or did not change -- an unknown kind, a newer version, a data member it could not fetch --
   verbatim, with its unknown object members and `extensions`. It SHOULD keep the unknown object
   members of a member it changed, too. Opening and saving a file never deletes what a newer release
   put in it.
4. `saveDocument` writes the members the caller asks for: the style (`session.styles.toDocument()`,
   with `kind`), the analysis as a recipe (recipe.md, "Recording"), and the data, embedded
   (node-link) or as a reference the caller names. By default it writes the style and the recipe and
   no data, because a file for sharing a technique should not carry the data by accident.

## The report

`openDocument` resolves with one report entry per member, in file order, so a caller can show what
applied and what did not:

```ts
interface DocumentReport {
    readonly members: readonly MemberReport[];
    /** W_UNKNOWN_MEMBER and other notices about the document's own top level. */
    readonly notices: readonly Problem[];
}

interface MemberReport {
    readonly index: number; // position in `members`
    readonly kind: string;
    readonly version: number | null;
    /** "applied": everything in it took effect; "partial": some layers or commands did not. */
    readonly outcome: "applied" | "partial" | "skipped";
    /** Why the whole member was skipped, when it was. */
    readonly problem?: Problem;
    readonly style?: StyleReport; // style.md, "Reading and applying"
    readonly recipe?: RecipeReport; // recipe.md, "The replay report"
    readonly data?: { readonly format: string; readonly nodes: number; readonly edges: number };
    readonly notices: readonly Problem[];
}

interface Problem {
    readonly what: string; // a JSON pointer, a layer name, a command's `as`
    readonly reason: string; // one sentence a person can act on
    readonly code: GraphtyErrorCode | GraphtyWarningCode;
}
```

## Conformance

A reader conforms when, for each input, it does what the right-hand column says:

| Input                                                                                                   | Required result                                                                        |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `{ "version": 1, "layers": [] }`                                                                        | read as a document holding one empty style                                             |
| `{ "kind": "graphty-style", "version": 1, "layers": [] }` at the top level                              | refused, `E_BAD_COMMAND`, saying to wrap it in a document                              |
| a node-link graph (`{ "nodes": [], "links": [] }`)                                                      | refused, `E_UNKNOWN_FORMAT`; the caller may import it as data                          |
| `"kind": "graphty-document", "version": 2`                                                              | refused whole, `E_UNSUPPORTED_VERSION`, `found: 2`, `reads: [1]`                       |
| a member `{ "kind": "graphty-view", "version": 1, ... }` beside a style                                 | view skipped with `W_UNKNOWN_KIND`; the style applies; the view is kept on save        |
| a style member with `"version": 2` beside a recipe of version 1                                         | style skipped, `E_UNSUPPORTED_VERSION`; the recipe applies                             |
| a style member whose `layers` is a string                                                               | that member skipped, `E_BAD_COMMAND`; the others apply                                 |
| a top-level member `"colour": "red"`                                                                    | ignored, reported `W_UNKNOWN_MEMBER` at `/colour`, written back on save                |
| a member name `__proto__` anywhere                                                                      | the file refused                                                                       |
| a referenced data member, opened with no `resolve`                                                      | data skipped, reported as needing `href`; styles and recipes apply to the graph loaded |
| a referenced data member with `href: "file:///etc/passwd"`                                              | data skipped, `E_BAD_COMMAND`; `resolve` is never called                               |
| a referenced data member whose bytes do not match `sha256`                                              | data skipped, `E_DIGEST_MISMATCH`                                                      |
| a referenced CSV with `options: { "sourceColumn": "from" }`                                             | data skipped, `E_UNKNOWN_OPTION`, naming `edgeSource`                                  |
| two data members                                                                                        | the first applies; the second skipped, `E_UNSUPPORTED`                                 |
| a style layer reading `results.groups.group` and a recipe in the same file with `as: "groups"`, not run | layer added switched off; switched on when the run completes                           |

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
                { "op": "algo.run", "algorithm": "pagerank", "as": "hubs", "params": { "weight": "r" } },
                { "op": "algo.run", "algorithm": "louvain", "as": "modules", "seed": 7 }
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

Opened with a `resolve` that returns a colleague's `coexpression-edges.csv` and with `run: true`,
the CSV is imported, both runs complete under the namespace `coexpression_hubs`, the style's path
`results.hubs.value` is rewritten to `results.coexpression_hubs__hubs.value`, and the size layer
paints. Opened without `resolve`, the data member is reported as needing its file and the recipe and
style apply to whatever graph is already loaded.
