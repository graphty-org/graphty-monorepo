# Data plan

`kind: "graphty-data-plan"`, version 1. Schema: [data-plan.schema.json](data-plan.schema.json)
(normative for what a writer produces). Shared conventions are in [README.md](README.md).

## Purpose

A data plan says how to read one shape of data: which field is the node id, which fields are an
edge's ends, which is the label, the weight and the time; what a repeated edge or node means; what
each attribute measures; which attribute tables join onto the nodes; and what the data must satisfy.
It belongs to a data source, not to an appearance, and is reused every time a file of that shape
arrives -- the knowledge engineer's entity exports (`design/designloom/workflows/W13.yaml`,
Knowledge Graph Construction), a lab's weekly STRING download with its expression table
(`W20.yaml`), a fraud team's transaction extract (`W06.yaml`).

A data plan **never spends compute**. It carries no algorithm runs. This changes the element API
design, whose `DataPlan` has a `runOnLoad` list (`design/element-api/element-api-design.md`,
section 12): the reason the 1.x template was split was that importing one part "can silently
rewrite column roles, spend compute", and a column-roles document that starts runs reintroduces
it. Load-time runs belong in a recipe ([recipe.md](recipe.md)), as the migration register's
template-split codemod already assumes (`design/element-api/element-api-migration.md`). The
owner's approval of run options on load-time algorithms (2026-09-23: "`{ algorithm:
"graphty:pagerank", style: { size: true } }` ... that's fine, add it") is kept: those options are
the fields of a recipe's `algo.run` step.

## One vocabulary, one structure

Three spellings of the same fields exist: the code's `DataConfig.knownFields`
(`graphty-element/src/config/DataConfig.ts`: `nodeIdPath`, `edgeSrcIdPath`, ...), the design's
`DataPlan.knownFields` (`nodeId`, `edgeSource`, ...), and the design's `ImportPlan` (with
`policies.repeatedEdges` values `keep-all`, `sum-weights`, ...). The repository forbids
"translating between two spellings ... the element never settled" (root `CLAUDE.md`). This format
uses the code's names **and the code's nesting**: `repeatedEdges`, `idCoercion` and
`positionScale` sit inside `knownFields`, as they do in `DataConfig`'s `GraphKnownFields`, and
`directed` sits beside it, so `knownFields` and `directed` are copied into `DataConfig` unchanged.
The repeated-edge policy takes graph-format's values (`DuplicatePolicy`) and roles take
graph-format's `ColumnRole` (`graph-format/src/types/columns.ts`), so no package re-declares
another's vocabulary. The design's two other spellings are withdrawn. The members this format adds
(`nodeTypePath` and the other new fields below) are additions to `DataConfig`, marked NEW.

Two more spellings exist for the endpoint and id fields as import options: graphty-element's
format catalogue (`edgeSource`, `edgeTarget`, `nodeIdPath`, `idColumn`,
`graphty-element/src/catalog/formats.ts`) and graph-io's CSV importer (`sourceColumn`,
`targetColumn`, `idColumn`). In a document, `knownFields` is the only one: a `formatOptions` entry
or an envelope data member `options` entry naming an endpoint or id column is refused with
`E_BAD_COMMAND`, and graphty-element translates `knownFields` into the importer's own options. Which
spelling survives in the published catalogue is open decision 32.

## Data model

```ts
interface DataPlan {
    kind: "graphty-data-plan";
    version: 1;
    id?: string; // stable identity of this plan across its versions
    planVersion?: string; // this plan's own revision; one id and planVersion name one content
    sourceVersion?: string; // NEW: the version of the source's shape it reads, e.g. "STRING 12.0"
    name?: string;
    description?: string;
    fingerprint?: string;
    generator?: { name: string; version: string };
    features?: string[]; // README, "Versioning" rules 7 and 8
    format?: string; // the format id this plan was written for; advisory
    formatOptions?: Record<string, unknown>; // that format's import options, e.g. { delimiter: "\t" }
    knownFields?: {
        // exactly DataConfig's GraphKnownFields, plus NEW members
        nodeIdPath?: string; // default "id"
        nodeLabelPath?: string | null; // default null: readers fall back to the id
        nodeWeightPath?: string | null; // default null
        nodeTimePath?: string | null; // default null
        nodeTypePath?: TypeSource | string | null; // NEW, feature "typed-identity"; default null; a string is { path }
        edgeSrcIdPath?: string | null; // default null: probe source/target, src/dst, from/to
        edgeDstIdPath?: string | null; // default null: as above
        edgeSrcType?: TypeSource | null; // NEW, feature "typed-identity"; default null (see "Node types")
        edgeDstType?: TypeSource | null; // NEW, feature "typed-identity"; default null
        idsQualified?: boolean; // NEW, feature "typed-identity"; default false
        edgeTypePath?: TypeSource | string | null; // NEW; default null: the edge's type or predicate (role `kind`),
        // a column, or a constant for a file holding one predicate
        edgeIdPath?: string | null; // default null: edges carry no identity
        edgeWeightPath?: string | null; // default "weight"
        edgeTimePath?: string | null; // default null
        repeatedEdges?: "keep" | "error" | "first" | "last" | "sum" | "min" | "max"; // default "keep"
        repeatedNodes?: "merge" | "error"; // NEW; default "merge" (graph-format's onDuplicateNode)
        missingEndpoints?: "create" | "report" | "reject"; // NEW; default "create", "report" with types
        positionScale?: number; // default 1; > 0
        idCoercion?: "canonical" | "keep"; // default "canonical"
    };
    directed?: boolean | "auto"; // default "auto": the file header decides
    missingValues?: string[]; // NEW: cell texts meaning "no value" in every column of every input,
    // unless a declaration gives its own (Frictionless puts it at table level)
    types?: { name: string; element?: "node" | "edge"; term?: string }[]; // NEW, informational; term an IRI
    attributes?: AttributeDeclaration[];
    joins?: Join[];
    extensions?: Record<string, unknown>;
}

type TypeSource = { path: string } | { value: string }; // a field of the record, or a constant

interface AttributeDeclaration {
    element: "node" | "edge";
    name: string; // a column key (README, "Paths" rule 3)
    input?: string; // NEW: the named input it describes; default the main input
    types?: string[]; // NEW: applies only to elements of these node or edge types
    rename?: string; // the attribute name to store it under
    include?: boolean; // default true; false leaves the field out of the graph
    type?: "string" | "number" | "integer" | "boolean" | "date" | "list";
    format?: string; // NEW, for type "date": "iso8601" (default), "epoch-ms", "epoch-s"
    delimiter?: string; // NEW, for type "list" in a text cell; default ";"
    role?: ColumnRole; // graph-format's role vocabulary, open
    level?: "categorical" | "ordinal" | "quantitative" | "temporal" | "identifier"; // open
    order?: (string | number)[]; // NEW, for level "ordinal": the categories, lowest first
    weightRole?: "distance" | "similarity"; // open
    signed?: boolean; // only with weightRole "similarity"; default false
    derive?: { from: string; transform: "one-minus" | "reciprocal" | "neg-log" }; // NEW
    term?: string; // NEW, informational: an absolute IRI (http, https or urn), never fetched
    idNamespace?: string; // NEW, informational, with level "identifier": "Entrez", "UniProt"
    origin?: { run: string; field: string; caveat?: "estimated" | "missing" }; // NEW: a result column
    missingValues?: string[]; // cell texts that mean "no value", e.g. "NA", ""
    constraints?: {
        required?: boolean;
        unique?: boolean;
        enum?: (string | number)[];
        minimum?: number;
        maximum?: number;
        pattern?: string;
        onViolation?: "report" | "reject-row" | "fail"; // NEW; default "report"
    };
    description?: string;
    features?: string[];
    extensions?: Record<string, unknown>;
}

interface Join {
    input: string; // a named input of the import (envelope.md, "Several inputs")
    element?: "node"; // version 1 joins onto nodes only
    key: string; // the key column of the joined table; "" names an empty header
    on?: string; // the node column it matches; default the node id; "originalId" with types
    type?: string; // NEW: join onto nodes of this type only
    match?: "exact" | "case-insensitive"; // default "exact"
    onDuplicate?: "error" | "first" | "last"; // a key repeated in the table; default "error"
    columns?: string[]; // which columns to take; default all but the key
    features?: string[];
}
```

### Fields

The `knownFields` members and `directed` mean exactly what their declarations in
`graphty-element/src/config/DataConfig.ts` say, with the defaults shown above. A value is a column
key of the incoming record, written as the column is named (README, "Paths" rule 3): `"node1"`,
`"#node1"`, `"combined.score"`, never an expression. `null` means "not present in this data" and
turns off any probing the element would otherwise do. One exception holds today and is an element
change to remove: with `edgeWeightPath: null` graphty-element still reads a numeric `value` field
as the weight (`resolveEdgeWeight`, `graphty-element/src/data/ingest.ts`, kept "until nothing ships
a `value` key"). Until it is removed, the import report's `fieldsUsed` names `value` whenever that
fallback produced a weight, so the report never claims an unweighted import that was weighted.

A declared attribute with `role: "weight"` overrides a defaulted `edgeWeightPath`: only an
`edgeWeightPath` the plan sets explicitly can conflict with it.

A column whose header is empty has the key `""` (README, "Paths" rule 3): R's `write.csv` of a
DESeq2 or limma table puts the gene symbols there, and a join names it with `key: ""`. Cells equal
to one of the plan's top-level `missingValues` (`["NA", ""]` for R output) are missing in every
column of every input, so an `NA` in a fold-change column does not turn the column into text;
a declaration's own `missingValues` replace the plan's for that column. Columns no declaration
types are typed by inference, reported in the import report's `inferredTypes` (README).

`formatOptions` are the import options of `format`, so a standalone plan for a tab-separated export
can say it is tab-separated rather than rely on sniffing. When a plan is applied to an envelope's
data member, the member's `options` win over the plan's `formatOptions`, member by member. The
same allowlist applies to both (envelope.md, "Options"), and neither may name an endpoint or id
column (above).

A plan's `id` and `planVersion`, like a recipe's, name one immutable content: a changed plan is a
new `planVersion`, and an applier that meets the same pair with a different digest than one already
recorded in the session reports `E_DIGEST_MISMATCH`, naming the plan. `sourceVersion` says which version of the source's shape the
plan reads, which is a different thing from the plan's own revision.

### Attribute declarations

An attribute declaration states what a field means, which is what styles and recipes bind to on
new data:

- `level` is the measurement level. It decides which encodings suit the attribute: a palette of
  distinguishable colours for `categorical`, an ordered palette for `ordinal`, a ramp for
  `quantitative` (diverging when `signed`), a time scale for `temporal`. `identifier` marks a
  field that names an entity outside the graph (a gene symbol, an account number), which is what
  identifier lists match against (the design studio's door 27: an identifier list is matched
  against an attribute declared as an identifier).
- `weightRole` states what an edge weight means: `distance` (smaller is closer; shortest paths
  read it directly) or `similarity` (larger is closer). `signed: true` declares a similarity that
  may be negative -- correlation and co-expression networks (`W23.yaml`, Hub Gene Identification;
  `W24.yaml`, Condition Comparison). A negative `distance` is a data error, reported at import. An
  algorithm whose catalogue entry does not declare that it accepts negative weights refuses a
  signed weight with `E_NEGATIVE_WEIGHT` rather than running on it (recipe.md, "Weights"). The role
  belongs to the attribute, not to each run (the design studio's door 21: a weight's meaning is
  declared once on the attribute and every run reads it). A flow **capacity** is not a weight
  meaning: it is graph-format's own `capacity` role (`graph-format/src/types/columns.ts`), so a
  graph can carry a cost and a capacity at once. graphty-element publishes a meaning today only on
  a run, as `WeightMeaning { attribute, meaning: "distance" | "strength" }`, and "strength" is
  ambiguous: max-flow records its capacity column as `strength` (`MaxFlowAlgorithm.ts`), which it
  reads from a fixed record key rather than from a role. So "strength" maps to `similarity` except
  for flow algorithms, until the element adds `similarity` to `WeightMeaning.meaning` and max-flow
  reads the `capacity` role, which are the recommended element changes.
- `derive` computes this attribute at import from another numeric column with a named transform
  (`one-minus`: 1 - w; `reciprocal`: 1 / w; `neg-log`: -ln w), so an author who wants a distance
  from a similarity such as STRING's `combined_score` states the model once, in the plan, instead
  of the recipe converting silently. Values the transform cannot take (a zero for `reciprocal` or
  `neg-log`) are missing and counted in the import report's `derived` list.
- `role` is graph-format's `ColumnRole`: `weight`, `capacity`, `label`, `position`, `timestamp`,
  `community` and the rest, or any other string. At most one attribute per role per element kind
  **per type**: a declaration with `types` claims the role for those types only, and one without
  claims it for every type that has no typed declaration of its own, so `Person` rows can take
  their label from `fullName` and `Org` rows from `legalName`. graph-format holds one column per
  role, so the element fills that one role column from each type's own column (a coalesced
  column), and the import report names which column filled it for which type. A role here and a
  `knownFields` path the plan sets explicitly MUST agree; if they disagree the plan is refused.
- `type` coerces the field on import. A value that does not coerce is reported per row, never
  silently replaced. `date` reads ISO 8601 unless `format` says `epoch-ms` or `epoch-s`; a locale
  form such as `03/04/2026` is never guessed. `list` splits a text cell on `delimiter` (default
  `;`); a format with native lists (JSON, GraphML's list types) ignores it.
- `level: "ordinal"` takes its category order from `order`; without one, an ordered palette is not
  applied and the binding report says so. `enum` order means nothing.
- `input` names the input a declaration describes (envelope.md, "Several inputs"), so `rename`,
  `type` and `missingValues` can target the `logFC` column of a joined table rather than the main
  input's. Two joined tables that share column names are joined by renaming one table's columns
  through declarations with its `input`.
- `types` restricts a declaration to nodes or edges of those types (with `nodeTypePath` or
  `edgeTypePath`), so "every Person has an email" does not flag every Org.
- `term` and `idNamespace` are informational in version 1: they say what a column means in an
  outside vocabulary, which identifier-namespace mapping (open decision 27) will read. `term` is an
  absolute IRI of any of the schemes `http`, `https` and `urn`, because most vocabularies a
  knowledge engineer maps to (FOAF, Dublin Core, RDF, OWL, SKOS, PROV, OBO) use `http:` IRIs, and
  rewriting one to `https:` makes a different identifier. It is an identifier: never fetched and
  never rendered as a link. **Version 1 has no RDF export:** no graph-io writer puts a `term` where
  a triple store reads it, and a type-qualified id (`account:123`) is graphty's form, not an IRI;
  RDF readers and writers are a named gap (README, open decision 19).
- `origin` marks a column that holds a run's result, written by an export's sidecar plan
  (export-mapping.md), so the column's run, field and caveat never have to be parsed from its name.
- `constraints` are checked at import (the Frictionless Table Schema constraints). `onViolation`
  decides what a violation does: `report` (the default) makes it an import issue with its row;
  `reject-row` drops the record and reports it; `fail` refuses the import. Nothing is silently
  fixed. The members of `constraints` are closed (README, "Unknown members" rule 1): a misspelt
  `onviolation` disables the declaration rather than silently turning a gate into a report.
  They make the quality report of `W18.yaml` (Data Import and Validation) a machine-readable
  result a pipeline can gate on, and the report is kept in a project (envelope.md, "Import
  records"). A `pattern` is an I-Regexp (RFC 9485), matched with a linear-time engine, so every
  reader accepts the same patterns and none can stall the import.

### Joins

A join adds the columns of a second table onto the nodes: the per-gene expression table joined onto
a STRING network (`W20.yaml`), an HR extract joined onto an entity list (`W13.yaml`).

1. Each record of the joined table is matched to the node whose `on` column (default: the id)
   equals the record's `key`, compared after the import's `idCoercion`, and with `match:
"case-insensitive"` without regard to case. With typed identity, the id is the qualified one;
   to join a table keyed by the untyped id, set `on: "originalId"` and, usually, `type`.
2. A key repeated in the table follows `onDuplicate`; the default `error` refuses the join (not the
   import) and reports the repeated keys. A key that matches several nodes (a non-unique `on`
   column) gives each of them the columns and is counted as `multiMatched`.
3. A joined column that has the same name as an existing node attribute is refused, not merged, and
   reported; use an attribute declaration with that `input` and a `rename`.
4. The import report lists, per join, the matched, unmatched, duplicate and multi-matched counts
   and the unmatched keys (README, `ImportReport`). A join never creates nodes.
5. Mapping between identifier namespaces (gene symbol, Entrez, UniProt) is not part of version 1; a
   caller maps them before the join (open decision 27).
6. **Joining after load.** A table can also be joined onto a graph that is already loaded, without
   a re-import, which is how the genomics workflow attaches an expression table after trimming the
   network (`W20.yaml`, phase 3). graphty-element offers this as an operation that takes the table
   and one `Join` and returns the join section of the import report. The join is then part of the
   session's effective data plan, and the table is a named input of the session's data, so a
   project save writes both and reopening re-joins (envelope.md, "Saving").

### Repeated nodes and missing endpoints

`repeatedNodes` is graph-format's `onDuplicateNode`: `merge` overwrites the attributes of a node id
seen before (the builder's default), `error` refuses the import naming the id. `missingEndpoints`
decides what an edge whose end has no node record does: `create` adds an attribute-less node (the
builder's `addMissingNodes`, today's behaviour), `report` creates it and lists it in the import
report, `reject` drops the edge and lists it. A typo'd id is then visible instead of becoming a new,
silent node. With `repeatedNodes: "merge"`, the import report lists, per merged id, the attributes
whose values differed between the records (`nodeConflicts`), so an overwrite is visible.

`repeatedEdges` applies per source-target pair, and per source, target and type when
`edgeTypePath` is set, so a de-duplication never merges two different relationships between the
same pair.

### Node types

When `knownFields.nodeTypePath` is set, every node's identity is qualified by its type, whether or
not the data happens to hold more than one type, so identity never depends on the data. graph-format
has one node id space (its design decision Q27, "no core namespaces"); typed identity is expressed
the way graph-io's Neo4j importer already stores `:ID(Space)` ids
(`graph-io/src/formats/neo4j/importer.ts`): the stored id is `"<type>:<id>"`, the type goes to a
column with the `idSpace` role, and the untyped id to a plain string column named `originalId`
**with no role**. The graph-format `originalId` role is not used: it means "an id an exporter
mangled", graph-io's exporters treat it as structural, and its importers restore it as the node id,
which would merge `account:123` and `device:123` on a round trip. So account `123` and device `123`
are the nodes `account:123` and `device:123`.

1. **The qualified form.** The id is coerced by `idCoercion` first, then qualified. In the type,
   `%` and `:` are percent-encoded (`%25`, `%3A`); the id is written as it is. So the type is
   everything before the first `:`, and `ex:Person` with id `1` (`ex%3APerson:1`) never collides
   with `ex` and id `Person:1` (`ex:Person:1`). An IRI id keeps its colons.
2. **The type.** `nodeTypePath` is a column of the node record or a constant (`{ value: "Person" }`,
   for a file holding one type, such as one entity file per type). A node record whose type is
   empty or missing is rejected and reported, as an edge end already is. Type names are compared
   exactly, case included.
3. **Edge ends.** An edge record must say which type each end is: `edgeSrcType` and `edgeDstType`
   name a field of the edge record holding the type, or a constant (`{ value: "account" }`). An
   edge end whose type cannot be resolved rejects that record and is reported; it is never
   guessed. With `nodeTypePath` set, `missingEndpoints` defaults to `report`, and the import report
   lists the distinct qualified types that edge ends named and no node record had
   (`unmatchedTypes`), so `person` against `Person` is one line, not fifty thousand silent nodes.
4. A node carrying several labels (a Neo4j node) is identified by the type the plan's type path
   reads.
5. **Adopting or renaming a type.** Adding `nodeTypePath` to a plan, or renaming a type, changes
   every node id. A note, a kept set member, an `ids` selector entry or an argument that does not
   bind on a typed graph is bound through the `originalId` column when exactly one node has that
   untyped id, and reported as rebound; with several, it stays unbound and the candidates are
   listed (open decision 13).

6. **Ids already qualified.** `idsQualified: true` says the node ids and the edge ends already hold
   the qualified form: the type is read from the `nodeTypePath` column for nodes and parsed from an
   edge end at its first unescaped `:`, and nothing is qualified again. It is what the data plan
   regenerated for an export of a typed graph writes (`nodeIdPath: "id"`, `nodeTypePath:
"idSpace"`, `idsQualified: true`; export-mapping.md, "Typed node identity"), so the re-import
   keeps the graph typed, its per-type constraints in scope and its typed joins working.
7. **Type versus class.** A type here is a namespace: it changes identity. A knowledge graph whose
   ids are already global (IRIs, UUIDs) and whose types are classes, possibly several per node,
   needs a classification that never changes identity; `types` scoping would read it. That split
   (`nodeClassPath`) and a `typeRenames` map are part of open decision 13, not version 1.

This is the design studio's door 4 recommendation, restated through graph-format's roles, and it is
open decision 13. Until it is decided, **every typed-identity member (`nodeTypePath`,
`edgeSrcType`, `edgeDstType`, `idsQualified`) is reserved behind the feature name
`typed-identity`**: a plan that uses one MUST list the feature, and a reader that does not
implement it refuses the plan with `E_UNSUPPORTED_FEATURE`, rather than silently merge nodes of
different types; inside an envelope the data is then not imported (envelope.md, "Opening"). The
meaning of these members is fixed only when the decision is made, so no file written before then
carries a meaning a later reader must honour.

## Applying

1. A data plan takes effect at an import. The element applies it to the incoming records before
   the graph is built. Applying a data plan to a graph that is already loaded MUST NOT rewrite the
   loaded graph; the applier reports `needsReimport` and applies it at the next import.
2. **A declared field that no record carries refuses the import** with `E_BAD_COMMAND`, naming the
   member and the count of records examined. When the missing field begins with `#` and the
   importer skipped a leading comment line, the refusal says so -- "the importer read the line
   beginning `#node1` as a comment; see the graph-io header option" -- rather than only naming the
   member. Only a member the plan leaves out takes the element's
   default. Otherwise a renamed source column (`emp_id` becoming `employee_id`) would silently key
   the graph on whatever column happens to be called `id`. For `edgeSrcIdPath` and `edgeDstIdPath`
   the rule of `DataConfig` also stands per record: a declared path that one record does not answer
   rejects that record, and the element does not fall back to probing.
3. An attribute declaration that names a field no record carries is reported and ignored, and
   counted in the import report's `ignoredDeclarations`, **except a declaration with
   `constraints.required: true`**: it is evaluated even when no record has the field, every record
   in its scope violates it, and its `onViolation` applies -- so `fail` refuses the import. A
   quality gate the author made fatal therefore fails when the column disappears, which is the
   commonest way a source-system change breaks it.
4. A declaration or join that fails its schema (a `signed` without `weightRole: "similarity"`, a
   `derive` naming no column) is reported with `E_BAD_COMMAND` and ignored; one with an unknown
   `level` or `weightRole` (open enumerations) is ignored and reported likewise; the other
   declarations and the fields apply.
5. The plan is refused as a whole with `E_BAD_COMMAND`, naming the accepted values or the nearest
   known member name, for an unknown value of `repeatedEdges`, `repeatedNodes`, `missingEndpoints`,
   `idCoercion` or `directed`, and for an unknown member at the plan's top level or inside
   `knownFields` when the plan lists no feature the reader does not know. Each of these changes the
   graph's topology or identity, and a guess -- including ignoring a misspelt `"repeatedEdge"` --
   would build a different graph than the author meant. Every legitimate addition to those two
   places arrives with a feature name (README, "Versioning" rule 8), so a plan that lists a feature
   the reader does not know is refused with `E_UNSUPPORTED_FEATURE` instead, telling the user to
   upgrade rather than to fix a spelling. This is the exception to README's tolerant-reader rule,
   and it matches graphty-element's own choice to make `DataConfig` a strict object so a
   misspelling fails.
6. The import returns an `ImportReport` (README): which fields were used (including what probing
   chose), how many repeated edges and nodes were merged, ids coerced, coercion failures, missing
   endpoints, constraint violations per declaration, join results, the declared weight roles
   applied, the inferred types, and the versions of the packages that read the bytes.
7. **Trying a plan first.** `data.checkImport(src, { plan, sampleRows })` applies a plan to a file
   and returns the import report and the first `sampleRows` parsed node and edge records, without
   building a graph or replacing the session's one. It is side-effect free and works in Node, so a
   person can see which columns probing picked, the join counts and the constraint violations on
   the first thousand rows of a two-million-row export before loading it (`W18.yaml`, the Preview
   phase).

## Writing

1. A plan written from a session (`saveDocument`, or a data-plan writer) MUST write the effective
   plan the import used: every `knownFields` member as resolved, including the fields probing
   chose (a colleague reopening a file with both `src/dst` and `from/to` columns must get the
   same graph), the attribute declarations the session holds, and every join made after load.
2. A plan written for bytes other than the ones the import read -- an exported file, or a project
   save that re-exports the data -- describes those bytes, not the original import: `knownFields`
   name the headers written, `formatOptions` match the writer, there are no renames and no joins
   (joined columns are declared as attributes of the written table), and the original plan's `id`,
   `planVersion` and digest are kept in `derivedFrom` (export-mapping.md, "graphty's documents
   beside an export"; envelope.md, "Saving").
3. `id` and `planVersion`, when present, are kept and recorded in the import report, and a project
   keeps that report (envelope.md, "Import records"), so a run record can say which plan version
   built the graph it ran on.

## Security

A data plan contains field paths and constraint patterns only. It MUST NOT be able to cause a
fetch, a run, or a change outside the import it is applied to. Field paths are looked up by the
element as column keys; they are never evaluated as code or as expressions. A constraint `pattern`
is an I-Regexp (RFC 9485) matched with a linear-time engine (RE2 semantics); a pattern outside
I-Regexp is refused with its declaration. A length limit is not an alternative: a seven-character
pattern such as `^(a|aa)+$` hangs a backtracking engine on a 41-character cell.

A data plan applied while no data is loaded is held for the next import only when the caller asks
(envelope.md, "Opening"), because a plan changes how the next, unrelated file is read.

## Conformance

| Input                                                                                                                                             | Required result                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| a plan with only `kind` and `version`                                                                                                             | accepted; every default applies                                                               |
| `knownFields: { repeatedEdges: "sum-weights" }` (the withdrawn design spelling)                                                                   | refused with `E_BAD_COMMAND`, naming the accepted values                                      |
| `"repeatedEdge": "max"` at the top level                                                                                                          | refused with `E_BAD_COMMAND`, suggesting `knownFields.repeatedEdges`                          |
| `knownFields.edgeWeightPath: "score"` and an attribute `{ element: "edge", name: "score", role: "weight" }`                                       | accepted                                                                                      |
| `knownFields.edgeWeightPath: "score"` and an attribute `{ element: "edge", name: "cost", role: "weight" }`                                        | refused: two fields claim the weight role                                                     |
| an attribute `{ element: "edge", name: "corr", weightRole: "distance" }` where some `corr` < 0                                                    | import reports the negative distances; nothing is silently made positive                      |
| an attribute `{ element: "edge", name: "w", signed: true }`                                                                                       | that declaration ignored with `E_BAD_COMMAND`; fails the schema                               |
| `knownFields.nodeIdPath: "emp_id"` on records that have `employee_id` and a row-counter `id`                                                      | import refused, naming `nodeIdPath`                                                           |
| `edgeWeightPath` left out, and an attribute `{ element: "edge", name: "cost", role: "weight" }`                                                   | accepted; `cost` is the weight                                                                |
| `edgeWeightPath: null` on records with a numeric `value`                                                                                          | graph weighted by `value` today; `fieldsUsed.edgeWeightPath` says `value`                     |
| a top-level `edgeKeyPath` with `features: ["edge-keys"]`, on a reader that does not know the feature                                              | refused with `E_UNSUPPORTED_FEATURE`, not `E_BAD_COMMAND`                                     |
| `formatOptions: { "sourceColumn": "a" }`                                                                                                          | refused: endpoint columns are named only in `knownFields`                                     |
| `constraints: { pattern: "^(a                                                                                                                     | aa)+$" }`and a 41-character cell`aaaa...ab`                                                   | evaluated in linear time; the violation reported |
| `type: "date"` and the cell `03/04/2026`                                                                                                          | coercion failure reported; no month guessed                                                   |
| `derive: { from: "combined_score", transform: "one-minus" }` on `distance`                                                                        | the distance column computed; zero-valued inputs reported only for `reciprocal` and `neg-log` |
| an HR table joined with `on: "originalId"`, `type: "person"`, onto typed nodes `person:E123`                                                      | matched                                                                                       |
| typed identity; types `ex:Person` with id `1` and `ex` with id `Person:1`                                                                         | two nodes, `ex%3APerson:1` and `ex:Person:1`                                                  |
| typed identity; a node record with an empty type                                                                                                  | record rejected and reported                                                                  |
| typed identity; an edge end typed `person` where the node file says `Person`                                                                      | reported under `unmatchedTypes`; no silent node unless `missingEndpoints: "create"` was set   |
| a typed graph exported to each format and re-imported through its regenerated plan (`idsQualified: true`)                                         | equal node counts; `account:123` and `device:123` stay two nodes; the graph is still typed    |
| `repeatedEdges: "first"`, `edgeTypePath: "predicate"`, a pair with `worksFor` and `advises`                                                       | both edges kept                                                                               |
| a STRING TSV whose header line is `#node1<TAB>node2<TAB>...`                                                                                      | the header read as the header, `#node1` a column key (depends on the graph-io change below)   |
| `knownFields.nodeIdPath: "(((id)))"`                                                                                                              | refused: no column has that key                                                               |
| a join on `gene` where 37 genes have no node                                                                                                      | 37 unmatched, listed in the import report; no node created                                    |
| `runOnLoad` present (an element API design draft field)                                                                                           | refused as an unknown top-level member, with the reason "load-time runs belong in a recipe"   |
| applied after a graph is loaded                                                                                                                   | `needsReimport`; the loaded graph is unchanged                                                |
| `nodeTypePath` set, listing the feature `typed-identity`, on a reader without it                                                                  | refused with `E_UNSUPPORTED_FEATURE`                                                          |
| `nodeTypePath` set without listing `typed-identity`                                                                                               | refused with `E_BAD_COMMAND`: the member needs its feature                                    |
| `knownFields.nodeTypePath: null`                                                                                                                  | valid; the documented default                                                                 |
| `edgeTypePath: { "value": "worksFor" }` on a file holding one predicate                                                                           | every edge has type `worksFor`                                                                |
| `{ element: "node", name: "email", types: ["Person"], constraints: { required: true, onViolation: "fail" } }` and no record has `email`           | import refused, every in-scope record violating                                               |
| a declaration naming a missing column, no constraints                                                                                             | ignored; `counts.ignoredDeclarations` 1                                                       |
| `constraints: { onviolation: "fail" }`                                                                                                            | declaration disabled, the member unknown in a closed place                                    |
| `term: "http://purl.org/dc/terms/title"`                                                                                                          | valid; the declaration applies                                                                |
| label declarations `fullName` for `Person` and `legalName` for `Org`, both `role: "label"`                                                        | accepted; one label column filled per type                                                    |
| a join with `key: ""` on an R `write.csv` table                                                                                                   | the empty-header column is the key                                                            |
| plan `missingValues: ["NA"]` and a joined `log2FoldChange` column holding `NA`                                                                    | the column is numeric; `NA` cells missing                                                     |
| a plan carrying `createdAt`                                                                                                                       | valid; shared metadata                                                                        |
| `data.checkImport` on a 2-million-row file with `sampleRows: 1000`                                                                                | report and 1,000 records returned; the session's graph unchanged                              |
| a typed export's regenerated plan (`nodeTypePath: "idSpace"`, `idsQualified: true`) re-imported                                                   | the same typed nodes and edges; per-type constraints still in scope                           |
| typed identity; an edge row with `account_id: "123"`, `device_id: "123"`, `edgeSrcType: { value: "account" }`, `edgeDstType: { value: "device" }` | two distinct ends, `account:123` and `device:123`                                             |

## Worked examples

### A STRING interaction export

The genomics persona's first step (`W20.yaml`): STRING exports a tab-separated edge list whose
header line is `#node1`, `node2`, ... and a `combined_score` between 0 and 1 that is a confidence,
so larger means closer. The column key is `#node1`, written as it is (README, "Paths" rule 3).

graph-io's CSV importer today treats a leading line beginning with `#` or `%` as a comment (the
SNAP and KONECT header convention, `COMMENT_CHARS` in `graph-io/src/formats/csv/importer.ts`), so
it swallows STRING's header and reads the first interaction as the header. **That graph-io change
is a prerequisite of publishing any data plan**: an import option that turns comment lines off, or
recognising a `#`-prefixed line whose fields match the data rows' count as the header. Until then
the import is refused under "Applying" rule 2, with the message that names the skipped comment
line, because no record carries `#node1`.

```json
{
    "kind": "graphty-data-plan",
    "version": 1,
    "id": "org.example-lab.string-tsv",
    "planVersion": "2",
    "sourceVersion": "STRING 12.0",
    "name": "STRING interactions (TSV export)",
    "format": "csv",
    "formatOptions": { "delimiter": "\t" },
    "knownFields": {
        "edgeSrcIdPath": "#node1",
        "edgeDstIdPath": "node2",
        "edgeWeightPath": "combined_score",
        "repeatedEdges": "max"
    },
    "directed": false,
    "attributes": [
        {
            "element": "edge",
            "name": "combined_score",
            "type": "number",
            "role": "weight",
            "level": "quantitative",
            "weightRole": "similarity",
            "constraints": { "minimum": 0, "maximum": 1 },
            "description": "STRING combined confidence, 0 to 1"
        }
    ]
}
```

### A co-expression network with signed weights

`W24.yaml` (Condition Comparison): correlations between -1 and 1, where a negative weight is
anti-correlation and must not be folded into correlation.

```json
{
    "kind": "graphty-data-plan",
    "version": 1,
    "name": "WGCNA co-expression edges",
    "knownFields": { "edgeSrcIdPath": "fromNode", "edgeDstIdPath": "toNode", "edgeWeightPath": "weight" },
    "directed": false,
    "attributes": [
        {
            "element": "edge",
            "name": "weight",
            "type": "number",
            "level": "quantitative",
            "weightRole": "similarity",
            "signed": true
        },
        { "element": "node", "name": "module", "level": "categorical", "role": "community" }
    ]
}
```

### A two-mode fraud extract (illustrates open decision 13)

`W06.yaml` (Fraud Ring Investigation): accounts and devices in one edge list, where account "123"
and device "123" are different entities. Every reader that exists today refuses this plan with
`E_UNSUPPORTED_FEATURE`, because it lists `typed-identity`; it shows the proposed typed identity. (With a node table per type and no type
column, `nodeTypePath` would be a constant per input, which needs the per-input mapping of open
decision 27.)

```json
{
    "kind": "graphty-data-plan",
    "version": 1,
    "name": "Account-device links",
    "features": ["typed-identity"],
    "knownFields": {
        "nodeIdPath": "id",
        "nodeTypePath": "entity_type",
        "edgeSrcIdPath": "account_id",
        "edgeSrcType": { "value": "account" },
        "edgeDstIdPath": "device_id",
        "edgeDstType": { "value": "device" },
        "edgeIdPath": "login_id",
        "edgeTimePath": "first_seen",
        "missingEndpoints": "report"
    },
    "directed": false,
    "attributes": [
        { "element": "edge", "name": "first_seen", "type": "date", "level": "temporal", "role": "timestamp" },
        {
            "element": "node",
            "name": "risk_score",
            "type": "number",
            "level": "quantitative",
            "missingValues": ["", "NA"]
        }
    ]
}
```
