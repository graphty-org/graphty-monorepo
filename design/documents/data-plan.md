# Data plan

`kind: "graphty-data-plan"`, version 1. Schema: [data-plan.schema.json](data-plan.schema.json)
(normative for structure). Shared conventions are in [README.md](README.md).

## Purpose

A data plan says how to read one shape of data: which field is the node id, which fields are an
edge's ends, which is the label, the weight and the time; what a repeated edge means; and what
each attribute measures. It belongs to a data source, not to an appearance, and is reused every
time a file of that shape arrives -- the knowledge engineer's entity exports
(`design/designloom/workflows/W13.yaml`, Knowledge Graph Construction), a lab's weekly STRING
download (`W20.yaml`), a fraud team's transaction extract (`W06.yaml`).

A data plan **never spends compute**. It carries no algorithm runs. This changes the element API
design, whose `DataPlan` has a `runOnLoad` list (`design/element-api/element-api-design.md`,
section 12): the reason the 1.x template was split was that importing one part "can silently
rewrite column roles, spend compute", and a column-roles document that starts runs reintroduces
it. Load-time runs belong in a recipe ([recipe.md](recipe.md)), as the migration register's
template-split codemod already assumes (`design/element-api/element-api-migration.md`). The
owner's approval of run options on load-time algorithms (2026-09-23: "`{ algorithm:
"graphty:pagerank", style: { size: true } }` ... that's fine, add it") is kept: those options are
the fields of a recipe's `algo.run` step.

## One vocabulary

Three spellings of the same fields exist: the code's `DataConfig.knownFields`
(`graphty-element/src/config/DataConfig.ts`: `nodeIdPath`, `edgeSrcIdPath`, ...), the design's
`DataPlan.knownFields` (`nodeId`, `edgeSource`, ...), and the design's `ImportPlan` (with
`policies.repeatedEdges` values `keep-all`, `sum-weights`, ...). The repository forbids
"translating between two spellings ... the element never settled" (root `CLAUDE.md`). This format
uses the code's names, which is what graphty-element parses today, and graph-format's values for
the repeated-edge policy (`DuplicatePolicy`) and column roles (`ColumnRole`,
`graph-format/src/types/columns.ts`), so no package re-declares another's vocabulary. The design's
two other spellings are withdrawn.

## Data model

```ts
interface DataPlan {
  kind: "graphty-data-plan";
  version: 1;
  name?: string;
  description?: string;
  fingerprint?: string;
  generator?: { name: string; version: string };
  format?: string;                    // the format id this plan was written for; advisory
  knownFields?: {
    nodeIdPath?: string;              // default "id"
    nodeLabelPath?: string | null;    // default null: readers fall back to the id
    nodeWeightPath?: string | null;   // default null
    nodeTimePath?: string | null;     // default null
    nodeTypePath?: string | null;     // NEW; default null (see "Node types")
    edgeSrcIdPath?: string | null;    // default null: probe source/target, src/dst, from/to
    edgeDstIdPath?: string | null;    // default null: as above
    edgeIdPath?: string | null;       // default null: edges carry no identity
    edgeWeightPath?: string | null;   // default "weight"
    edgeTimePath?: string | null;     // default null
  };
  directed?: boolean | "auto";        // default "auto": the file header decides
  repeatedEdges?: "keep" | "error" | "first" | "last" | "sum" | "min" | "max";  // default "keep"
  idCoercion?: "canonical" | "keep";  // default "canonical"
  positionScale?: number;             // default 1; > 0
  attributes?: AttributeDeclaration[];
  extensions?: Record<string, unknown>;
}

interface AttributeDeclaration {
  element: "node" | "edge";
  name: string;                       // the field name in the incoming records
  rename?: string;                    // the attribute name to store it under
  include?: boolean;                  // default true; false leaves the field out of the graph
  type?: "string" | "number" | "integer" | "boolean" | "date" | "list";
  role?: ColumnRole;                  // graph-format's role vocabulary, open
  level?: "categorical" | "ordinal" | "quantitative" | "temporal" | "identifier";
  weightRole?: "distance" | "similarity" | "capacity";
  signed?: boolean;                   // only with weightRole "similarity"; default false
  missingValues?: string[];           // cell texts that mean "no value", e.g. "NA", ""
  description?: string;
  extensions?: Record<string, unknown>;
}
```

### Fields

The `knownFields` members and the top-level policies mean exactly what their declarations in
`graphty-element/src/config/DataConfig.ts` say, with the defaults shown above. A value is a field
path into the incoming record. `null` means "not present in this data" and turns off any probing
the element would otherwise do.

### Attribute declarations

An attribute declaration states what a field means, which is what styles and recipes bind to on
new data:

- `level` is the measurement level. It decides which encodings suit the attribute: a palette of
  distinguishable colours for `categorical`, an ordered palette for `ordinal`, a ramp for
  `quantitative` (diverging when `signed`), a time scale for `temporal`. `identifier` marks a
  field that names an entity outside the graph (a gene symbol, an account number), which is what
  identifier lists match against (the design studio's door 27, `design/ui/framework/one-way-doors.md`).
- `weightRole` states what an edge weight means: `distance` (smaller is closer; shortest paths
  read it directly), `similarity` (larger is closer), or `capacity` (a bound, read by flow
  algorithms). `signed: true` declares a similarity that may be negative -- correlation and
  co-expression networks (`W23.yaml`, Hub Gene Identification; `W24.yaml`, Condition Comparison).
  A negative `distance` or `capacity` is a data error, reported at import. The role belongs to the
  attribute, not to each run (the design studio's door 21); graphty-element publishes it today only
  on a run, as `WeightMeaning { attribute, meaning: "distance" | "strength" }`, and "strength" is
  read as `similarity`.
- `role` is graph-format's `ColumnRole`: `weight`, `label`, `position`, `timestamp`, `community`
  and the rest, or any other string. At most one attribute per role per element kind. A role here
  and a `knownFields` path naming the same field MUST agree; if they disagree the plan is refused.
- `type` coerces the field on import. A value that does not coerce is reported per row, never
  silently replaced.

### Node types

`knownFields.nodeTypePath` is new. When it is set and the data declares more than one node type,
node identity is the pair (type, id), so user "123" and item "123" are two nodes; otherwise
identity is the id alone. This is the design studio's door 4 recommendation, and it is an open
decision (README, "Open decisions", identity). Until it is decided, a reader that does not
implement type-qualified identity MUST refuse a plan that sets `nodeTypePath` with
`E_UNSUPPORTED`, rather than silently merge nodes of different types.

## Applying

1. A data plan takes effect at an import. The element applies it to the incoming records before
   the graph is built. Applying a data plan to a graph that is already loaded MUST NOT rewrite the
   loaded graph; the applier reports `needsReimport` and applies it at the next import.
2. A path that names a field no record carries is reported (`unresolvedPaths`) with the count of
   records examined. For `edgeSrcIdPath` and `edgeDstIdPath` the rule of `DataConfig` stands: a
   declared path that a record does not answer rejects that record, and the element does not
   fall back to probing.
3. An attribute declaration that names a field no record carries is reported and ignored.
4. A declaration that fails the schema (an unknown `level`, a `signed` without
   `weightRole: "similarity"`) is reported with `E_BAD_COMMAND` and ignored; the other declarations
   and the fields apply.
5. An unknown `repeatedEdges`, `idCoercion` or `directed` value refuses the whole plan with
   `E_BAD_COMMAND`, because each changes the graph's topology and a guess would build a different
   graph than the author meant.
6. The import report states, in its first lines, what the plan decided: which fields were used,
   how many repeated edges were kept or merged, how many ids coerced, and which declared weight
   role was applied.

## Security

A data plan contains field paths only. It MUST NOT be able to cause a fetch, a run, or a change
outside the import it is applied to. Field paths are data, looked up by the element; they are
never evaluated as code.

## Conformance

| Input | Required result |
|---|---|
| a plan with only `kind` and `version` | accepted; every default applies |
| `repeatedEdges: "sum-weights"` (the withdrawn design spelling) | refused with `E_BAD_COMMAND`, naming the accepted values |
| `edgeWeightPath: "score"` and an attribute `{ element: "edge", name: "score", role: "weight" }` | accepted |
| `edgeWeightPath: "score"` and an attribute `{ element: "edge", name: "cost", role: "weight" }` | refused: two fields claim the weight role |
| an attribute `{ element: "edge", name: "corr", weightRole: "distance" }` where some `corr` < 0 | import reports the negative distances; nothing is silently made positive |
| `runOnLoad` present (an element API design draft field) | ignored as unknown, and reported as "load-time runs belong in a recipe" |
| applied after a graph is loaded | `needsReimport`; the loaded graph is unchanged |

## Worked examples

### A STRING interaction export

The genomics persona's first step (`W20.yaml`): STRING exports a tab-separated edge list with
`node1`, `node2` and a `combined_score` between 0 and 1 that is a confidence, so larger means
closer.

```json
{
  "kind": "graphty-data-plan",
  "version": 1,
  "name": "STRING interactions (TSV export)",
  "format": "csv",
  "knownFields": {
    "edgeSrcIdPath": "node1",
    "edgeDstIdPath": "node2",
    "edgeWeightPath": "combined_score"
  },
  "directed": false,
  "repeatedEdges": "max",
  "attributes": [
    { "element": "edge", "name": "combined_score", "type": "number", "role": "weight",
      "level": "quantitative", "weightRole": "similarity",
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

### A two-mode fraud extract

`W06.yaml` (Fraud Ring Investigation): accounts and devices in one edge list, where account "123"
and device "123" are different entities.

```json
{
  "kind": "graphty-data-plan",
  "version": 1,
  "name": "Account-device links",
  "knownFields": {
    "nodeIdPath": "id",
    "nodeTypePath": "entity_type",
    "edgeSrcIdPath": "account_id",
    "edgeDstIdPath": "device_id",
    "edgeTimePath": "first_seen"
  },
  "directed": false,
  "attributes": [
    { "element": "edge", "name": "first_seen", "type": "date", "level": "temporal", "role": "timestamp" },
    { "element": "node", "name": "risk_score", "type": "number", "level": "quantitative", "missingValues": ["", "NA"] }
  ]
}
```
