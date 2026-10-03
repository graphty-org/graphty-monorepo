# Item 3 review: find without selecting (#783)

The recommendation under review is section 3 of `element-api-decisions.md`. It proposes a
graphty-element method, `session.data.find(text, { limit, kinds })`. The method returns ranked
node and edge hits, plus "value rows" (attribute values that match), and selects nothing. The
graphty app's find box needs it to list matches while the reader types.

## Verdict: redesign the result shape, keep the idea

The element does need a search that reads without selecting. But the shape as proposed has
three problems:

- Its own 3-line example fails to compile.
- In plain JavaScript the same example throws on the dataset it names.
- It locks in a second search engine that disagrees with the existing one.

The revised shape below compiles, and its canonical example is 19 lines.

## Revised shape

```ts
// Exported from "@graphty/graphty-element" and "@graphty/graphty-element/session".
interface GraphSession {
    /**
     * Searches without selecting. Synchronous. The first call after a data change builds a
     * lowercased index (one walk of the graph). Every later call in the same revision reads
     * that index. find("") returns no records and a total of 0.
     */
    find(text: string, options?: FindOptions): FindResult;
}

interface FindOptions {
    readonly limit?: number;   // default 20
    readonly offset?: number;  // default 0
    readonly kinds?: readonly FindHit["kind"][]; // default ["node", "edge"]
    readonly scope?: ScopeInput; // default: the whole graph; hidden hits carry excludedBy
}

interface FindHitBase {
    /** The element's name: the nodeLabelPath value, else String(id). For an edge: "<source name> -> <target name>". Untrusted text. */
    readonly name: string;
    /** The first matching attribute, in attributes() order. */
    readonly match: { readonly path: Path; readonly value: unknown };
    /** Present when the hit is in the graph but a filter hides it. Open: more kinds will be added. */
    readonly excludedBy?: { readonly kind: "filter" };
    /** A ready selection target naming exactly this element. */
    readonly target: SelectionTarget;
}

/** Open union: later releases add kinds (run, layer, note, ...). Switch with a default branch. */
type FindHit =
    | (FindHitBase & { readonly kind: "node"; readonly id: NodeId })
    | (FindHitBase & { readonly kind: "edge"; readonly id: EdgeId });

interface FindValueRow {
    readonly kind: "node" | "edge";
    readonly path: Path;
    readonly value: string | number | boolean;
    /** Exactly how many elements `target` selects in the same scope. */
    readonly count: number;
    /** A where-target the element builds: path equals value. */
    readonly target: SelectionTarget;
}

/** The RecordPage shape, plus the value rows. */
interface FindResult {
    readonly records: readonly FindHit[];
    readonly offset: number;
    readonly total: number;
    readonly revision: string;
    /** At most 3 rows, commonest first. */
    readonly values: readonly FindValueRow[];
    /** Set when the text is a regex: or = query. Find does not run those; selection.apply({ text }) does. */
    readonly notSearchable?: "regex" | "expression";
}
```

The rules that the TSDoc must state:

- **Matching.** Matching ignores case. Find reads the same prefix grammar as `selection.apply({ text })`, and the two share one parser, `searchOf`:
  - plain text is a substring search
  - `exact:` matches a whole value
  - `<attribute>:` (for example `id:` or `type:`) searches one attribute
  - `regex:` and a leading `=` are not run as the reader types. They set `notSearchable` and return no records.
- **What is searched.**
  - A node: its id, its name, and its own attribute values.
  - An edge: its own attribute values only, never its id or its endpoints. Typing "Javert" does not list every edge at Javert.
  - Run results are not searched. To search a run's output, use `{ where }`.
- **Ranking.** Only three things are promised:
  - An exact match on the name or the id comes first.
  - Name and id matches come before attribute-value matches.
  - Ties keep graph order.
  - Any finer order may improve in a minor release.
- **The text target.** `selection.apply({ text, scope })` is redefined to select exactly the node records that `find(text, { scope, kinds: ["node"], limit: all })` returns.

### Canonical example (compiled)

Checked under `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, against the
built types with the stub above. The type check exits 0.

```ts
// A find box: list matches as the reader types, select and frame the one they click.
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const box = document.querySelector<HTMLInputElement>("#find")!;
const list = document.querySelector<HTMLUListElement>("#hits")!;

box.addEventListener("input", () => {
    const found = element.session.find(box.value, { limit: 10 });
    list.replaceChildren(...found.records.map((hit) => {
        const li = document.createElement("li");
        li.textContent = `${hit.name} (${hit.match.path}: ${String(hit.match.value)})`;
        li.onclick = async () => {
            await element.session.selection.apply(hit.target);
            await element.zoomToSelection();
        };
        return li;
    }));
    if (found.total > found.records.length) list.append(`and ${found.total - found.records.length} more`);
});
```

A second check, `exhaustive.ts`, confirms two things:

- `switch (hit.kind)` narrows `id` to `NodeId` in the node branch and to `EdgeId` in the edge branch.
- A `default` branch compiles, as the open union requires.

Scratch is in `tmp/api-review/item-3/`: `stub.ts`, `example.ts`, `exhaustive.ts`, `tsconfig.json` and `build.log`.

## What changed and why

1. **Each hit carries a `target`, and the example no longer goes through `{ ids }`.**
   - The `ids` target takes `readonly string[]` (`selection/targets.ts:122`), so section 3's example fails with TS2322 when it passes a hit's id.
   - In plain JavaScript a numeric id reaches `addPastedId`, which calls `raw.trim()` (`targets.ts:427-428`) and throws. Karate's ids are numbers.
   - `addPastedId` also tries every node reading before any edge reading. An edge hit whose id is also a node id would select the node.
   - With `hit.target`, the consumer never touches an id. Value rows get a `target` too, so the app never builds a JMESPath expression from a path and a value. The project rules forbid the app from writing that query logic.
2. **Each hit is a discriminated union.** Before, `kind` did not narrow `id`, so the obvious branching also failed to compile. The union is documented as open, so a later release can add `run`, `layer` and `note` kinds without breaking a consumer who switched with a default branch.
3. **The method moved from `session.data.find` to `session.find`.** Notes, layers and runs are not data. Leaving find on `data` would mean either a second find later or moving this one, and moving it is a breaking change.
4. **`label` became `name`, with one documented rule.**
   - A node's name is the `nodeLabelPath` value (`config/DataConfig.ts:42`), otherwise `String(id)`.
   - An edge's name is built from its endpoints' names, as note status already does (`session/notes/status.ts:160-176`).
   - The name is not the drawn `label.text` style. That can be calculated, and ranking on it would mean resolving styles for every node on every keystroke.
   - The rule must be read from the session's own config, because `algorithms/results/labels.ts` reaches through `Graph` and so is not safe on `./session`.
5. **`matched` became `match`.** The new name no longer reads as the opposite of the selection API's `unmatched`. The rule for which path it reports is now documented: the first matching path, in `attributes()` order.
6. **The result is the `RecordPage` shape.**
   - It gains `offset`, which planned Next/Previous-finding stepping needs.
   - It gains `revision`, so a hit list held across an undo or a load is detectably stale.
   - `elements` became `records`, to match every other page.
7. **Added `scope` and `excludedBy`.**
   - The default scope is the whole graph, because the tier 1 design searches "over the full graph". A hit that a filter hides is marked with `excludedBy` rather than dropped.
   - `excludedBy` is locked now as an object with a `kind`, not the issue's string literal `"filter"`. Collapsed groups, canvas-only hiding and other graphs then fit without a break.
8. **One grammar, one engine.**
   - Find and the text target share `searchOf` and `QueryEngine.find`.
   - `regex:` and `=` are refused while typing rather than run. Two reasons: a half-typed `regex:(` throws `E_BAD_COMMAND` (`query.ts:225-237`), and a backtracking pattern measured 6 s against one 29-character cell (`review/security-3.md`).
   - The commit path, `selection.apply({ text })`, keeps both.
9. **`values` is capped, ordered and given a meaning.**
   - At most 3 rows, commonest first, as `SelectionApi` already caps its distribution.
   - `count` is defined as exactly what `target` selects, so the "Select where <attribute> is <value> (<count>)" row cannot disagree with the selection it makes.
   - Numbers and booleans match only exactly, so typing "0" does not produce a value row for every float.
10. **Cost is designed in, not claimed.**
    - The per-revision lowercased index replaces a per-keystroke scan. Without it, the reviewers measured 43 ms (nodes only, the existing engine) and 140-150 ms (with edges, the full specification) at the ceiling.
    - Edge records are read once per revision rather than on every call, so the allocating `withoutEndpointKeys` path (`data.ts:852-864`) runs once per revision.
11. **Framing edges is an element fix in this item.** `zoomToSelection` (`Graph.ts:5495-5496`) frames only selected nodes. It must also frame selected edges by their endpoints. Without that, the canonical example silently does nothing for an edge hit.
12. **Exports.** `FindHit`, `FindValueRow`, `FindResult` and `FindOptions` are exported from the root entry point and from `/session`. Today `NodeId`, `Path`, `ScopeInput` and `SelectionTarget` are reachable only from `/session`.
13. **Smaller fixes that ship with this item:**
    - The `ids` target throws a `GraphtyError` naming a non-string entry instead of a raw TypeError.
    - Correct the `session/types.ts:374-379` comment, which says search is asynchronous.
    - Check whether #149 ("text search throws E_UNSUPPORTED") still applies, and close it or narrow it.
    - Record a follow-up: route the AI `findNodes` command (`ai/commands/QueryCommands.ts`) through the same engine.

**Tier 1 design change.** Tier 1 drops the "Rows" group (runs, groups, layers) from the find box.
Run, group and layer hits arrive later as new kinds, which the open union allows. Keeping the group
would have meant either the app matching row names itself, which the project rules forbid, or
widening this item's scope. This is a reversible studio decision.

## Findings rejected

- **"Default scope should be visible elements."** Rejected. The tier 1 design and the information architecture both search the full graph and mark the hidden hits. A visible-only find box is still one option away.
- **"Hidden rows leaking through find is a security issue."** Rejected as a find issue, because a filter is a view, not access control. The real point, that a saved project file still carries filtered rows, belongs to item 10.
- **"Make find async from day one."**
  - Rejected because the element enforces `renderCeiling` 50,000 nodes and `edgesDrawn` 100,000 edges as load limits (`session/limits.ts:74-84`, refused in `ingest.ts:358`), so the worst case is bounded.
  - With the index, a synchronous call fits a frame. If the load ceiling is ever separated from the render ceiling, `findAsync` is additive, and the name is reserved now.
- **"Rename `kinds` to `nodes`/`edges` booleans."** Rejected. Booleans do not scale to the run, layer and note kinds the union will gain.
- **"A 10 MB cell is copied into every result."** Rejected. Returning an existing string is a reference, not a copy. The cost that does exist, lowercasing the cell, is paid once per revision in the index.
- **"Find must never trigger a snapshot freeze."** Deferred. Every read freezes a stale store, and `revision` already lets a caller see that a result is stale. This is an internal choice that can change later.
- **"Return every matching path in `match`."** Deferred. The first path in `attributes()` order is documented now. A `matches` array can be added later without a break.
- **"Reserve a node-type field for multi-table projects."** Deferred. An optional field can be added later. Reserving it now names a concept (#299) that does not exist yet.

## One-way doors

- The method name and where it lives: `session.find`.
- The `FindHit` discriminant `kind`, the open-union rule, and the field names `name`, `match`, `target`, `excludedBy` and `id`.
- The result keys: `records`, `offset`, `total`, `revision`, `values` and `notSearchable`.
- The defaults:
  - scope: the whole graph
  - kinds: node and edge
  - limit: 20
  - `values`: at most 3 rows
  - `find("")`: empty
- The `name` rule, and what is searched for each kind (in particular, edges are not searched by id or endpoint).
- The partial ranking promise: exact name or id first, name before value, ties in graph order.
- The shared grammar, the redefinition of the `{ text }` target as "the node records find returns", and refusing `regex:` and `=` while typing.
- That find is synchronous.

## Confidence: medium

**What supports it:**

- The shape type-checks against the real built types under the strictest flags.
- Every blocking finding has a direct fix in it.
- The source lines the reviewers cited were spot-checked and hold (`targets.ts:427`, `Graph.ts:5496`, `types.ts:374-379`, `limits.ts:74-84`).

**Why not high:**

- Nobody has built or timed the per-revision index. The under-a-frame claim is a target, not a measurement.
- Redefining the `{ text }` target as "what find returns" changes existing ranking and matching for current callers. The size of that change has not been checked against the tests.

## Residual risks

1. **Cost is unmeasured.** The index's build time and memory at 50k nodes and 100k edges with wide attribute sets (the design cites 69 attributes) have not been measured. The plan's element tests should hold an acceptance budget: under 8 ms per call after the build, with the build cost stated in the TSDoc. If the index misses that budget, the synchronous promise has to be revisited before release, not after.
2. **The `{ text }` target changes for existing consumers.** The redefinition moves `selection.apply({ text })` onto the shared engine. Graphty-element 2.x consumers may see different matches, and this may need to go through the held breaking-change train.
3. **The name falls back to the id.** `name` is only as good as `nodeLabelPath`. On karate with no label path set, the name is the id, so T12's "typing a label that differs from the id" passes only if the sample loader or item 1's column mapping sets the Name role.
4. **The union is open.** Consumers who switch on `kind` without a default branch will get a compile error when run, layer or note hits ship. Only documentation guards against this.
