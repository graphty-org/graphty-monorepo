# The import report and errors

Graph files often have problems: a row with a missing cell, a weight that is not a number, an edge
to a node that does not exist. When graph-io meets one, it skips the element it cannot read, keeps
going, and lists the problem in the import report. Anything it changes on the way, such as a value
it rounds or two edges it merges, is listed too.

## Reading the report

Every load returns a `report` next to the snapshot:

<!-- generated:begin example:report/issues -->

```ts
import { importGraph } from "@graphty/graph-io";
import { CSV_ISSUE } from "@graphty/graph-io/csv";

const csv = ["source,target,weight", "a,b,1", "b,c", "c,d,heavy", "d,a,2"].join("\n");

const { snapshot, report } = await importGraph(csv, { format: "csv" });

console.log(
    `${report.counts.nodes} nodes and ${report.counts.edges} edges read, ${report.counts.skippedEdges} skipped`,
);
for (const issue of report.issues) {
    console.log(`${issue.severity} ${issue.code} line ${issue.line ?? "-"}: ${issue.message}`);
}
console.log(`the snapshot holds ${snapshot.edgeCount} edges`);

// The code tables name every code a format can record
const short = report.issues.filter((i) => i.code === CSV_ISSUE.FIELD_COUNT);
console.log(`rows with a missing cell: ${short.map((i) => i.line).join(", ")}`);
```

<!-- generated:end -->

<!-- generated:begin output:report/issues -->

```text
3 nodes and 2 edges read, 2 skipped
error E_CSV_FIELD_COUNT line 3: 2 fields, expected 3
error E_INVALID_WEIGHT line 4: invalid edge weight "heavy"
the snapshot holds 2 edges
rows with a missing cell: 3
```

<!-- generated:end -->

The two bad rows were skipped, and the snapshot holds the two edges that could be read.

The report has these fields:

- `format`: the format the input was read as.
- `counts`: `nodes` and `edges` read from the file, `skippedNodes` and `skippedEdges` left out
  after an error, and `expandedMixed`, the undirected edges stored as two directed edges in a
  [mixed graph](./saving.md#graphs-with-directed-and-undirected-edges).
- `issues`: every problem, in the order it was found.
- `errorCount` and `warningCount`: how many issues are errors and how many are warnings.
- `truncated`: `true` when the import stopped because of the error limit. You only see it on
  `err.report`.
- `lossy`: what the import left out of the snapshot or kept in another form, as
  `{ code, message, column, count }` notes, the same shape `checkExport()` returns for a save. It is
  empty for most files. It has an entry for JSON hyperedges skipped under `hyperedges: "skip"`,
  yEd graphics kept as a JSON tree instead of as XML, GML ids not kept under `nodeIdFrom`, and Neo4j
  `:IGNORE` columns. Parts of a file that graph-io does not read at all, such as the styles of a
  Cytoscape session, are warnings in `issues` (category `unsupported`) instead.
- `durationMs`: how long reading took, in milliseconds.

The counts are taken while reading, so the snapshot can hold fewer edges than `counts.edges`. That
happens when the `duplicateEdges` option keeps one edge of each parallel pair (any value but its
default, `"keep"`: `"first"`, `"last"`, `"sum"`, `"min"` or `"max"`), reported as
`W_EDGES_MERGED`, and when `selfLoops: "drop"` removes loops, reported as `W_SELF_LOOPS_DROPPED`.

A file that holds several graphs, read with `importAllGraphs()`, gives each graph its own report.
Warnings about the file as a whole, such as the skipped entries of a Cytoscape session, are in
every one of them.

## Issues

Each issue has:

- `severity`: `"error"` or `"warning"`. An error means something was skipped: a whole node or edge
  (a node without an id, an edge to a node that does not exist, a CSV row with too few fields, an
  edge whose weight is not a number), or one attribute value, in which case the node or edge is
  kept without it. `counts.skippedNodes` and `counts.skippedEdges` count the nodes and edges
  skipped, and the message says what was. A warning means something was kept, but changed or
  guessed: a value widened to a larger type, two ids merged, an encoding guessed.
- `code`: a stable string to switch on. Error codes start with `E_`, warning codes with `W_`.
- `message`: a sentence in plain English, for people.
- `line`: the 1-based line in the file, or `null` when the format has no lines (a zip file) or the
  line is not known.
- `element`: what the issue is about: a node id, an edge id, an attribute name or an option name.
  An edge without an id of its own is named by its ends, `"a->b"`. It is `null` when the row could
  not be read far enough to tell, such as a CSV row with the wrong number of fields.
- `category`: what the issue is about, for errors and warnings alike. `parse-error` means the
  syntax was wrong, `missing-value` that something required was absent, `validation-error` that a
  value breaks a rule of the format or of an option you passed (an error skips it; a warning keeps
  it as written, like an id with spaces around it, or reports what the option removed, like
  `selfLoops: "drop"`), `unsupported` that the file uses something graph-io
  does not represent, `precision` that a number lost precision, `coercion` that a value changed
  type, and `merged` that two elements became one. To decide what to show a user, sort by
  `severity`; the category does not say how serious an issue is.

An edge to a node the file never declares is not an issue in most formats: they create the node,
because their files often leave nodes undeclared. GEXF, XGMML, CX, CX2 and Cytoscape sessions
must declare every node, and skip such an edge with an `E_UNKNOWN_NODE` error. The
[`addMissingNodes`](./options.md#import-addmissingnodes) option changes this for any format.

A report keeps at most 1000 warnings of one code. The rest are counted in a single
`W_ISSUES_SUPPRESSED` warning, so a file with a million bad rows does not build a million-entry
list.

## The error limit

`errorLimit` (100 by default, exported as `DEFAULT_ERROR_LIMIT`) is the number of errors an import
tolerates. One more error than that stops the import with an `ImportError`, and
`err.report.truncated` is `true`. Pass `errorLimit: 0` to stop at the first error, for input that
must be exactly right. Pass `Infinity` to read as much as possible whatever the file holds.

`err.report.counts` stops one element short: the node or edge whose error went over the limit is
`err.issue` and is in `err.report.issues`, but not in `counts.skippedNodes` or
`counts.skippedEdges`. Count `err.report.errorCount` when you report how many elements failed.

Some problems stop an import at once, whatever the limit: a file that is not valid in its own
syntax (unbalanced XML, an unterminated quote in CSV, a JSON syntax error), invalid bytes in the
file's encoding, an empty input or one that holds only whitespace (`E_EMPTY_INPUT`), and a file no
format recognizes (`E_UNKNOWN_FORMAT`). These are recorded as the last issue of the report, with an
`E_` code, and thrown as an `ImportError`.

## Checking text a user typed or pasted

Text that is not a graph usually fails with `E_UNKNOWN_FORMAT`. A few lines of words are the
exception: "hello world" on two lines has the shape of a CSV edge list, and reads as one
([Format detection](./detection.md#content-beats-names) explains why). The load result's `sniff`
says so: its `content` is below 0.5 when no format recognized the text and it was read by its
shape alone. This function refuses such text, and text that read with errors:

<!-- generated:begin example:report/pasted -->

```ts
import { GraphFormatError, importGraph } from "@graphty/graph-io";

/**
 * Read text a user pasted, refusing text that only looks like a graph by its shape.
 * @param text - what the user pasted
 * @returns a message for the user
 */
async function readPasted(text: string): Promise<string> {
    try {
        const { snapshot, report, format, sniff } = await importGraph(text);
        // content below 0.5: no format recognized the text, it only has the shape of an edge list
        if (sniff !== null && sniff.content < 0.5) {
            return `this looks like plain text, not a graph; choose its format if it is one`;
        }
        if (snapshot.nodeCount === 0 || report.errorCount > 0) {
            return `read as ${format}, but: ${report.issues.map((i) => i.message).join("; ") || "no nodes"}`;
        }
        return `${format}: ${snapshot.nodeCount} nodes`;
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return err.message;
        }
        throw err;
    }
}

console.log(await readPasted("graph { a -- b }"));
console.log(await readPasted("source,target\na,b\nb,c\n"));
console.log(await readPasted("Please find the network attached."));
console.log(await readPasted("hello world"));
console.log(await readPasted("hello world\ngoodbye world\n"));
console.log(await readPasted("source,target\na,b\nc\n"));
```

<!-- generated:end -->

<!-- generated:begin output:report/pasted -->

```text
dot: 2 nodes
csv: 3 nodes
the input is not in a graph format graph-io recognizes; if you know its format, pass it as the format option
the input is not in a graph format graph-io recognizes; if you know its format, pass it as the format option
this looks like plain text, not a graph; choose its format if it is one
read as csv, but: 1 field, expected 2
```

<!-- generated:end -->

It also refuses an edge list without a header row, which has the same shape. To accept those, offer
a format choice next to the text box and pass the user's choice as `format`, which skips detection.

## When the import stops: ImportError

Every error graph-io throws is a `GraphFormatError`, except the reason of a cancelled load.
`ImportError` is the kind you get when the input could not be loaded, and it carries the report:

- `err.code` is always `"E_IMPORT"`.
- `err.issue` is the issue that stopped the import. Switch on `err.issue?.code`: `"E_FETCH"` for a
  failed download, `"E_UNKNOWN_FORMAT"` for a file graph-io does not recognize, and otherwise the
  code of the parse error or of the error that went over the limit.
- `err.report` is the report up to the point the import stopped.
- `err.message` is a sentence you can show to people. For a file refused by the `format` you
  named, it starts with the file and the format (`"notes.txt" could not be read as graphml: ...`)
  and then gives the parser's reason.

<!-- generated:begin example:report/errors -->

```ts
import { GraphFormatError, ImportError, importGraph } from "@graphty/graph-io";

const csv = ["source,target", "a,b", "b", "c,d", "d"].join("\n");

try {
    await importGraph(csv, { format: "csv", errorLimit: 0 }); // stop at the first error
} catch (err) {
    if (err instanceof ImportError) {
        console.log(`${err.code}: ${err.message}`);
        console.log(`stopped by ${err.issue?.code} on line ${err.issue?.line}`);
        console.log(`edges read before it stopped: ${err.report.counts.edges}`);
    } else if (err instanceof GraphFormatError) {
        console.log(`a problem with the call: ${err.code}`);
    } else {
        throw err;
    }
}

// A server error page saved in place of the graph file
try {
    await importGraph("<!DOCTYPE html><html><body>502 Bad Gateway</body></html>", { filename: "graph.graphml" });
} catch (err) {
    if (!(err instanceof ImportError)) {
        throw err;
    }
    switch (err.issue?.code) {
        case "E_UNKNOWN_FORMAT":
            console.log(`not a graph file: ${err.issue.message}`);
            break;
        case "E_FETCH":
            console.log("the download failed");
            break;
        default:
            console.log(err.message);
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:report/errors -->

```text
E_IMPORT: error limit of 0 exceeded: line 3: 1 field, expected 2
stopped by E_CSV_FIELD_COUNT on line 3
edges read before it stopped: 1
not a graph file: the input is not in a graph format graph-io recognizes (filename "graph.graphml"): it is an HTML document (likely an error page saved in place of the file); if you know its format, pass it as the format option
```

<!-- generated:end -->

A `GraphFormatError` that is not an `ImportError` comes from the call itself:

| `err.code`      | When                                                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_UNSUPPORTED` | A `format` no importer or exporter is registered for, an option value that is not allowed (`err.details.option` names it), `downloadGraph()` outside a browser, or a binary format passed to `exportGraphToString()`. |
| `E_INVALID_ID`  | A save, when the format cannot write the node ids (`checkExport()` returned `E_ID_CHARSET` or `E_ID_TEXT_COLLISION`).                                                                                                 |
| `E_DIRECTED`    | A save, when the graph has both edge directions and the format holds one (`E_MIXED_DIRECTION`).                                                                                                                       |
| `E_COLUMN_TYPE` | A save, when an attribute value cannot be written in the format (the `E_` note names the attribute).                                                                                                                  |

`E_COLUMN_TYPE` also comes from imports, as an issue code: a GraphML, GEXF or Neo4j CSV value that
does not parse as the type the file declares for it, such as `"x"` in an integer attribute. It is
in `report.issues`, and when such errors go over the limit it is `err.issue.code`.

An aborted `signal` rejects with the signal's own reason, which is not a `GraphFormatError`;
`isAbortError(err)` recognizes it.

For a failed download, `err.details` also holds `url`, `status` (the HTTP status, or `null` when no
response arrived) and `cause` (the error `fetch()` threw).

## Files with very many attributes

graph-io stores each attribute as a column with one slot per node or per edge. A file in which
every node has a differently named attribute would need nodes times attributes slots: a few hundred
kilobytes of such a file could take gigabytes of memory. So the load functions stop with
`E_TOO_MANY_EMPTY_CELLS` once the columns would hold more than 16,777,216 empty slots. A file in
which most elements have most attributes is never stopped, however large it is. If you trust the
file and have the memory, raise the limit with the `maxEmptyCells` option, or pass `Infinity` to
turn the check off.

## Codes

Every code has a constant, so you do not need to type the strings:

- Each format exports a table of the codes its import can record, such as `CSV_ISSUE` from
  `@graphty/graph-io/csv`, and a table of the codes `checkExport()` can return for it, such as
  `CSV_LOSS`.
  The key is the code without its `E_` or `W_` prefix and without the format name:
  `CSV_ISSUE.FIELD_COUNT` is `"E_CSV_FIELD_COUNT"`.
- Codes that several formats share, such as `E_MISSING_ID` or `W_DUPLICATE_NODE`, are the same
  string in every format's table.

[Issue and loss codes](./codes.md) lists every code with its meaning and the formats that use it,
and each format page lists the codes of that format.
