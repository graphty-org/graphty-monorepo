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

## Data model

```ts
interface DataPlan {
  kind: "graphty-data-plan";
  version: 1;
  id?: string;                        // stable identity of this plan across its versions
  planVersion?: string;               // e.g. the source schema version it reads
  name?: string;
  description?: string;
  fingerprint?: string;
  generator?: { name: string; version: string };
  format?: string;                    // the format id this plan was written for; advisory
  formatOptions?: Record<string, unknown>;   // that format's import options, e.g. { delimiter: "\t" }
  knownFields?: {                     // exactly DataConfig's GraphKnownFields, plus NEW members
    nodeIdPath?: string;              // default "id"
    nodeLabelPath?: string | null;    // default null: readers fall back to the id
    nodeWeightPath?: string | null;   // default null
    nodeTimePath?: string | null;     // default null
    nodeTypePath?: string | null;     // NEW; default null (see "Node types")
    edgeSrcIdPath?: string | null;    // default null: probe source/target, src/dst, from/to
    edgeDstIdPath?: string | null;    // default null: as above
    edgeSrcType?: TypeSource | null;  // NEW; default null (see "Node types")
    edgeDstType?: TypeSource | null;  // NEW; default null
    edgeIdPath?: string | null;       // default null: edges carry no identity
    edgeWeightPath?: string | null;   // default "weight"
    edgeTimePath?: string | null;     // default null
    repeatedEdges?: "keep" | "error" | "first" | "last" | "sum" | "min" | "max";  // default "keep"
    repeatedNodes?: "merge" | "error";   // NEW; default "merge" (graph-format's onDuplicateNode)
    missingEndpoints?: "create" | "report" | "reject";   // NEW; default "create"
    positionScale?: number;           // default 1; > 0
    idCoercion?: "canonical" | "keep";   // default "canonical"
  };
  directed?: boolean | "auto";        // default "auto": the file header decides
  attributes?: AttributeDeclaration[];
  joins?: Join[];
  extensions?: Record<string, unknown>;
}

type TypeSource = { path: string } | { value: string };   // a field of the edge record, or a constant

interface AttributeDeclaration {
  element: "node" | "edge";
  name: string;                       // a field path (README, "Paths")
  rename?: string;                    // the attribute name to store it under
  include?: boolean;                  // default true; false leaves the field out of the graph
  type?: "string" | "number" | "integer" | "boolean" | "date" | "list";
  role?: ColumnRole;                  // graph-format's role vocabulary, open
  level?: "categorical" | "ordinal" | "quantitative" | "temporal" | "identifier";
  weightRole?: "distance" | "similarity" | "capacity";
  signed?: boolean;                   // only with weightRole "similarity"; default false
  missingValues?: string[];           // cell texts that mean "no value", e.g. "NA", ""
  constraints?: {
    required?: boolean; unique?: boolean;
    enum?: (string | number)[]; minimum?: number; maximum?: number; pattern?: string;
  };
  description?: string;
  extensions?: Record<string, unknown>;
}

interface Join {
  input: string;                      // a named input of the import (envelope.md, "Several inputs")
  element?: "node";                   // version 1 joins onto nodes only
  key: string;                        // the key column of the joined table (a field path)
  on?: string;                        // the node field it matches; default: the node id
  match?: "exact" | "case-insensitive";   // default "exact"
  onDuplicate?: "error" | "first" | "last";   // a key repeated in the table; default "error"
  columns?: string[];                 // which columns to take; default all but the key
}
```

### Fields

The `knownFields` members and `directed` mean exactly what their declarations in
`graphty-element/src/config/DataConfig.ts` say, with the defaults shown above. A value is a field
path into the incoming record in the restricted grammar of README "Paths": identifiers or quoted
identifiers joined by dots, never a full expression. `null` means "not present in this data" and
turns off any probing the element would otherwise do.

`formatOptions` are the import options of `format`, so a standalone plan for a tab-separated export
can say it is tab-separated rather than rely on sniffing. When a plan is applied to an envelope's
data member, the member's `options` win over the plan's `formatOptions`, member by member. The
same allowlist applies to both (envelope.md, "Options").

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
  read it directly), `similarity` (larger is closer), or `capacity` (a bound, read by flow
  algorithms). `signed: true` declares a similarity that may be negative -- correlation and
  co-expression networks (`W23.yaml`, Hub Gene Identification; `W24.yaml`, Condition Comparison).
  A negative `distance` or `capacity` is a data error, reported at import. The role belongs to the
  attribute, not to each run (the design studio's door 21: a weight's meaning is declared once on
  the attribute and every run reads it). graphty-element publishes a meaning today only on a run,
  as `WeightMeaning { attribute, meaning: "distance" | "strength" }`, and "strength" is ambiguous:
  max-flow records its capacity column as `strength` (`MaxFlowAlgorithm.ts`). So "strength" maps
  per algorithm -- to `capacity` for flow algorithms, to `similarity` for every other -- until the
  element adds `similarity` and `capacity` to `WeightMeaning.meaning`, which is the recommended
  element change.
- `role` is graph-format's `ColumnRole`: `weight`, `label`, `position`, `timestamp`, `community`
  and the rest, or any other string. At most one attribute per role per element kind. A role here
  and a `knownFields` path naming the same field MUST agree; if they disagree the plan is refused.
- `type` coerces the field on import. A value that does not coerce is reported per row, never
  silently replaced.
- `constraints` are checked at import (the Frictionless Table Schema constraints): a violation is
  an import issue with its row, never a silent fix. They make the quality report of
  `W18.yaml` (Data Import and Validation) a machine-readable result a pipeline can gate on.

### Joins

A join adds the columns of a second table onto the nodes: the per-gene expression table joined onto
a STRING network (`W20.yaml`), an HR extract joined onto an entity list (`W13.yaml`).

1. Each record of the joined table is matched to the node whose `on` field (default: the id) equals
   the record's `key`, compared after the import's `idCoercion`, and with `match:
   "case-insensitive"` without regard to case.
2. A key repeated in the table follows `onDuplicate`; the default `error` refuses the join (not the
   import) and reports the repeated keys.
3. A joined column that has the same name as an existing node attribute is refused, not merged, and
   reported; use an attribute declaration's `rename` on the joined column.
4. The import report lists, per join, the matched, unmatched and duplicate counts and the unmatched
   keys (README, `ImportReport`). A join never creates nodes.
5. Mapping between identifier namespaces (gene symbol, Entrez, UniProt) is not part of version 1; a
   caller maps them before the join (open decision 27).

### Repeated nodes and missing endpoints

`repeatedNodes` is graph-format's `onDuplicateNode`: `merge` overwrites the attributes of a node id
seen before (the builder's default), `error` refuses the import naming the id. `missingEndpoints`
decides what an edge whose end has no node record does: `create` adds an attribute-less node (the
builder's `addMissingNodes`, today's behaviour), `report` creates it and lists it in the import
report, `reject` drops the edge and lists it. A typo'd id is then visible instead of becoming a new,
silent node.

### Node types

When `knownFields.nodeTypePath` is set, every node's identity is qualified by its type, whether or
not the data happens to hold more than one type, so identity never depends on the data. graph-format
has one node id space (its design decision Q27, "no core namespaces"); typed identity is expressed
the way graph-io's Neo4j importer already does it: the stored id is `"<type>:<id>"`, the type goes
to the `kind` role, and the original id to the `originalId` role with the type in `idSpace`. So
account `123` and device `123` are the nodes `account:123` and `device:123`.

An edge record must say which type each end is: `edgeSrcType` and `edgeDstType` name a field of the
edge record holding the type, or a constant (`{ value: "account" }`). With `nodeTypePath` set, an
edge end whose type cannot be resolved rejects that record and is reported; it is never guessed.
A node carrying several labels (a Neo4j node) is identified by the type the plan's type path reads.

This is the design studio's door 4 recommendation, restated through graph-format's roles, and it is
open decision 13. Until it is decided, a reader that does not implement type-qualified identity
MUST refuse a plan that sets `nodeTypePath` with `E_UNSUPPORTED`, rather than silently merge nodes
of different types; inside an envelope the data is then not imported (envelope.md, "Opening").

## Applying

1. A data plan takes effect at an import. The element applies it to the incoming records before
   the graph is built. Applying a data plan to a graph that is already loaded MUST NOT rewrite the
   loaded graph; the applier reports `needsReimport` and applies it at the next import.
2. A path that names a field no record carries is reported (`unresolvedPaths`) with the count of
   records examined. For `edgeSrcIdPath` and `edgeDstIdPath` the rule of `DataConfig` stands: a
   declared path that a record does not answer rejects that record, and the element does not
   fall back to probing.
3. An attribute declaration that names a field no record carries is reported and ignored.
4. A declaration or join that fails its schema (an unknown `level`, a `signed` without
   `weightRole: "similarity"`) is reported with `E_BAD_COMMAND` and ignored; the other declarations
   and the fields apply.
5. The plan is refused as a whole with `E_BAD_COMMAND`, naming the accepted values or the nearest
   known member name, for an unknown value of `repeatedEdges`, `repeatedNodes`, `missingEndpoints`,
   `idCoercion` or `directed`, and for an unknown member at the plan's top level or inside
   `knownFields`. Each of these changes the graph's topology or identity, and a guess -- including
   ignoring a misspelt `"repeatedEdge"` -- would build a different graph than the author meant.
   This is the exception to README's tolerant-reader rule, and it matches graphty-element's own
   choice to make `DataConfig` a strict object so a misspelling fails.
6. The import returns an `ImportReport` (README): which fields were used (including what probing
   chose), how many repeated edges and nodes were merged, ids coerced, coercion failures, missing
   endpoints, constraint violations, join results and the declared weight roles applied.

## Writing

1. A plan written from a session (`saveDocument`, or a data-plan writer) MUST write the effective
   plan the import used: every `knownFields` member as resolved, including the fields probing
   chose (a colleague reopening a file with both `src/dst` and `from/to` columns must get the
   same graph), and the attribute declarations the session holds.
2. A plan written for an exported file describes that file, not the original import
   (export-mapping.md, "graphty's documents beside an export").
3. `id` and `planVersion`, when present, are kept and recorded in the import report, so a run
   record can say which plan version built the graph it ran on.

## Security

A data plan contains field paths and constraint patterns only. It MUST NOT be able to cause a
fetch, a run, or a change outside the import it is applied to. Field paths are looked up by the
element in the restricted grammar; they are never evaluated as code or as full expressions. A
constraint `pattern` is matched with a regular-expression engine that bounds its running time (or
refused beyond 256 characters), so a hostile pattern cannot stall the import.

## Conformance

| Input | Required result |
|---|---|
| a plan with only `kind` and `version` | accepted; every default applies |
| `knownFields: { repeatedEdges: "sum-weights" }` (the withdrawn design spelling) | refused with `E_BAD_COMMAND`, naming the accepted values |
| `"repeatedEdge": "max"` at the top level | refused with `E_BAD_COMMAND`, suggesting `knownFields.repeatedEdges` |
| `knownFields.edgeWeightPath: "score"` and an attribute `{ element: "edge", name: "score", role: "weight" }` | accepted |
| `knownFields.edgeWeightPath: "score"` and an attribute `{ element: "edge", name: "cost", role: "weight" }` | refused: two fields claim the weight role |
| an attribute `{ element: "edge", name: "corr", weightRole: "distance" }` where some `corr` < 0 | import reports the negative distances; nothing is silently made positive |
| an attribute `{ element: "edge", name: "w", signed: true }` | that declaration ignored with `E_BAD_COMMAND`; fails the schema |
| `knownFields.nodeIdPath: "(((id)))"` | refused: not a field path |
| a join on `gene` where 37 genes have no node | 37 unmatched, listed in the import report; no node created |
| `runOnLoad` present (an element API design draft field) | refused as an unknown top-level member, with the reason "load-time runs belong in a recipe" |
| applied after a graph is loaded | `needsReimport`; the loaded graph is unchanged |
| `nodeTypePath` set on a reader without typed identity | refused with `E_UNSUPPORTED` |
| typed identity; an edge row with `account_id: "123"`, `device_id: "123"`, `edgeSrcType: { value: "account" }`, `edgeDstType: { value: "device" }` | two distinct ends, `account:123` and `device:123` |

## Worked examples

### A STRING interaction export

The genomics persona's first step (`W20.yaml`): STRING exports a tab-separated edge list with
`node1`, `node2` and a `combined_score` between 0 and 1 that is a confidence, so larger means
closer.

```json
{
  "kind": "graphty-data-plan",
  "version": 1,
  "id": "org.example-lab.string-tsv",
  "planVersion": "12.0",
  "name": "STRING interactions (TSV export)",
  "format": "csv",
  "formatOptions": { "delimiter": "\t" },
  "knownFields": {
    "edgeSrcIdPath": "node1",
    "edgeDstIdPath": "node2",
    "edgeWeightPath": "combined_score",
    "repeatedEdges": "max"
  },
  "directed": false,
  "attributes": [
    { "element": "edge", "name": "combined_score", "type": "number", "role": "weight",
      "level": "quantitative", "weightRole": "similarity",
      "constraints": { "minimum": 0, "maximum": 1 },
      "description": "STRING combined confidence, 0 to 1" }
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
    { "element": "edge", "name": "weight", "type": "number", "level": "quantitative",
      "weightRole": "similarity", "signed": true },
    { "element": "node", "name": "module", "level": "categorical", "role": "community" }
  ]
}
```

### A two-mode fraud extract (illustrates open decision 13)

`W06.yaml` (Fraud Ring Investigation): accounts and devices in one edge list, where account "123"
and device "123" are different entities. Every reader that exists today refuses this plan with
`E_UNSUPPORTED`; it shows the proposed typed identity.

```json
{
  "kind": "graphty-data-plan",
  "version": 1,
  "name": "Account-device links",
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
    { "element": "node", "name": "risk_score", "type": "number", "level": "quantitative", "missingValues": ["", "NA"] }
  ]
}
```
