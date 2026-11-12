# Item 4, a node's neighbors with tie strength: security and privacy review

Scope: `session.data.neighbors(id, { direction, weight, sort, offset, limit })` as recommended in
`element-api-decisions.md` section 4, against graphty-element on master. Scratch is in
`tmp/api-review/security-4/` (`path-injection.mjs`, `path-injection.log`).

## 1. `weight` is a `Path`, and a column name from the file becomes expression text (major)

`Path` is "a JMESPath expression over the published result root"
(`graphty-element/src/catalog/types.ts:69`). The column list the app offers for a weight comes from
`AttributeDescriptor.path`, which is built by pasting the raw key from the file with no quoting:
`path: \`data.${name}\`` (`graphty-element/src/session/attributes.ts:154`).

- **Measured** (`path-injection.log`): an edge column named `w || data.secret` yields the path
  `data.w || data.secret`, which evaluates to the `secret` column (999). A column named
  `weight kg` or `a-b` throws a `ParserError`.
- **How it is exploited:** a stranger's file names a column so that, when the reader picks it as the
  tie, the list ranks by a different column than the one shown in the label ("17 shared chapters"
  while the numbers come from elsewhere). An ordinary spreadsheet header with a space or a hyphen
  makes the neighbor panel throw every time it opens.
- **Also inconsistent:** the import's own weight read is a flat key lookup, `record[path]`
  (`graphty-element/src/session/project/ingest.ts:77`), and page sorting is a flat key too
  (`graphty-element/src/session/data.ts:649,660`). The default and an explicit `weight` would
  read two different things.
- **Fix:** `weight` takes an attribute name (the flat key the import and `sort.key` already use),
  not a `Path`. Separately, quote the key in `attributes.ts:154` (`data."<key>"` with escaping), a
  defect every path consumer inherits.

## 2. Nothing bounds `Neighbor.edges`; `limit` caps neighbors, not edges (major)

`repeatedEdges` defaults to `"keep"` (`graphty-element/src/config/DataConfig.ts:67`), and the edge
ceiling is 100,000 (`graphty-element/src/session/limits.ts:84`).

- **How it is exploited:** a file with two nodes and 100,000 parallel edges between them. Clicking
  either node returns a one-row page, `limit: 20` honored, whose single `Neighbor.edges` holds
  100,000 ids, frozen and handed to the app, which renders or serializes them on each click.
  A star of a few hubs gets the same effect across rows.
- **Fix:** return `edgeCount: number` and drop `edges`, or cap it (`edges` the first N plus
  `edgeCount`). The app's "N shared chapters" needs a number, not the ids; `edgePage({ touching })`
  already pages the edges when someone wants them.

## 3. Grouping by neighbor is a prototype-pollution and id-collision trap the item does not rule out (major)

The item says "parallel edges sum into one tie" but not how. The obvious implementation keys a
plain object by neighbor id: `groups[id] ??= { tie: 0 }; groups[id].tie += w`.

- **How it is exploited:** a file with a node whose id is `__proto__`. `groups["__proto__"]` is
  `Object.prototype`, not nullish, so `.tie += w` writes `Object.prototype.tie` for every object
  in the page, including the app's. A node with id `1` and another with id `"1"` share one key and
  merge into one neighbor with both ties summed; the element already depends on keeping them apart
  (`graphty-element/src/session/data.ts:549`).
- **Fix:** state in the contract that grouping is by node row (the CSR index), which makes both
  impossible, and add a test with ids `__proto__`, `constructor`, `1` and `"1"`.

## 4. The cost per click is a full edge scan if it copies `edgePage({ touching })` (minor)

`touching` scans every edge once per distinct request per revision
(`graphty-element/src/session/data.ts:581-590`, its own `ponytail:` note), and the result is cached
in an unbounded map keyed by the options until the revision moves (`data.ts:220,550-555`).
Item 4 is marked "low" effort, which invites reusing that path.

- **Cost:** clicking or hovering through nodes costs O(E) each (100,000 edges at the ceiling), and
  every node visited keeps an order array alive until the next change.
- **Fix:** specify the read as O(degree) over the CSR, as `walkNeighborhood` already does
  (`graphty-element/src/session/selection/targets.ts:493-520`), with the same direction rules so
  the list's `total` always equals the count `selection.apply({ neighborsOf })` selects.

## 5. Weight values a hostile file controls have no stated rule (minor)

With an explicit `weight`, the raw attribute is read, not the import's sanitized weight (which
keeps only finite float32 numbers, `ingest.ts:58-60`). The item does not say what a string `"3"`,
a negative, `NaN` or `1e308` does.

- **How it is exploited:** two `1e308` ties sum to `Infinity`; `Infinity + -Infinity` is `NaN`;
  a `NaN` in the sort comparator makes the order inconsistent, so the "strongest" list differs
  between calls on the same revision.
- **Fix:** the same rule as the import (finite numbers only; otherwise the edge counts as 1, or
  is skipped and counted), absent ties sort last as `isAbsent` does (`data.ts:155-157`), and ties
  break by graph order.

## 6. Hidden neighbors: listed or not is unspecified (minor)

`nodePage` ignores visibility (`data.ts:574-620`); a `neighbors` built the same way lists nodes the
reader has hidden with a filter or Hide on canvas, with their full records.

- **How it matters:** a reader hides sensitive nodes (an informant, a patient) before screen
  sharing; opening the neighbor of a visible node lists the hidden ones by name.
- **Fix:** state the rule. Either a `hidden: boolean` on each `Neighbor` (the app can mark or
  drop them), or honor visibility by default with an opt-in for hidden ones.

Not found: the call writes nothing to a saved file and adds no new format, so item 4 has no
file-format or supply-chain exposure of its own.
