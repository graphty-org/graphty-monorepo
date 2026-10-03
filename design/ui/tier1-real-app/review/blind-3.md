# Blind-author review: find without selecting (`session.data.find`)

The reviewer acted as a third-party developer who sees only the published docs: section 3 of
`element-api-decisions.md` (treated as the docs page for the proposed `find`) and the guide
pages in `graphty-element/docs/guide/`. The task chosen as the most common one: a find box that
lists matches as the reader types, and selects and frames the match the reader clicks.

## Verdict

The canonical example does not compile, and neither does the three-line example in section 3
itself. The proposal hands back an id typed `NodeId | EdgeId` (`string | number`) and then
tells the reader to pass it to `selection.apply({ ids })`, which takes `readonly string[]`.
Section 3 even says karate's ids are numbers, so the very dataset it cites is the one the
example cannot type. Every route from a hit to a selection fails to compile without a cast or a
`String(...)`, and the `String(...)` route has runtime behavior the docs never state.

## The example

`design/ui/tier1-real-app/review/blind-3.ts` (22 lines; the find-specific part is 13):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const box = document.querySelector<HTMLInputElement>("#find")!;
const list = document.querySelector<HTMLUListElement>("#hits")!;

box.addEventListener("input", () => {
    const hits = element.session.data.find(box.value, { limit: 10 });
    list.replaceChildren(
        ...hits.elements.map((hit) => {
            const li = document.createElement("li");
            li.textContent = `${hit.label} -- ${hit.matched.path}: ${String(hit.matched.value)}`;
            li.onclick = async () => {
                await element.session.selection.apply({ ids: [hit.id] });
                await element.graph?.zoomToSelection();
            };
            return li;
        }),
    );
    if (hits.total > hits.elements.length) list.append(`and ${hits.total - hits.elements.length} more`);
});
```

## Did it compile

No. Type-checked with `tsc --noEmit --strict` against graphty-element's built types
(`npm run build`), with section 3's `find` and `FindResult` merged into `SessionDataApi` by
module augmentation (scratch: `tmp/api-review/blind-3/stub.ts`, `tsconfig.json`).

| File | Result |
|---|---|
| `blind-3.ts` | `example.ts(15,63): error TS2322: Type 'NodeId' is not assignable to type 'string'. Type 'number' is not assignable to type 'string'.` |
| Section 3's own example, verbatim (`doc-example.ts`) | Same TS2322 at `{ ids: [pick.id] }`. Under `noUncheckedIndexedAccess` (this repo's own setting and a common one) also `TS18048: 'pick' is possibly 'undefined'`. |
| The obvious fix, branching on `kind` (`fixed.ts`) | `hit.kind === "node" ? { nodes: [hit.id] } : { edges: [hit.id] }` fails: `Type 'NodeId[]' is not assignable to type 'readonly string[]'` on `edges`. `kind` does not narrow `id`, because the element type is one object with two unions, not a discriminated union. |
| `{ ids: [String(hit.id)] }` | Compiles. |

Cause, in the built types: `NodeId = string | number`, `EdgeId = string`
(`graphty-element/dist/src/catalog/types.d.ts:40,42`); the `ids` target is
`{ readonly ids: readonly string[] }` (`dist/src/session/selection/targets.d.ts:101-103`);
`ElementIdTarget.edges` is `readonly EdgeId[]` (same file, around line 53).

Fixes, any one of which makes the example compile with no cast:
- Make the hit a discriminated union: `{ kind: "node"; id: NodeId } | { kind: "edge"; id: EdgeId }`.
- Better for the common task: let `selection.apply` take the hit itself, or add a target such as
  `{ hits: FindResult["elements"] }`, so "select what I found" never re-encodes ids.
- Or widen `ids` to `readonly (NodeId | EdgeId)[]`, and document how a number matches.

## Every place I had to guess

1. **How to select a hit.** Section 3 says `ids`; the guide pages never show an `ids` target
   (`javascript-api.md` shows `text`, `where`, `scope`; `data-sources.md:457` shows `edges`;
   `styling.md:98` shows `top`). I copied section 3. It does not compile (above).
2. **Whether `ids: ["1"]` selects numeric node `1`.** After `String(hit.id)` compiles, nothing
   published says a string id matches a number id. Karate is the dataset section 3 names.
3. **Whether `ids` selects a node AND an edge that share an id.** The built types say "a node
   and an edge can share a name" (`targets.d.ts`, `SelectionSearchHit.kind`), and `ids` is "a
   pasted list of ids, which may name nodes, edges, or nothing". Clicking one node hit might
   select an edge too. The hit carries `kind`; the only target that compiles throws it away.
4. **What `label` is.** The guides use `name` in data (`getting-started.md` step 2), and
   "label" only as the style channel `node.label` (`styling.md:172`). Is `label` the drawn label
   text, a `label` column, `name`, or the id when there is no label? For an edge?
5. **Which attributes are searched.** The ranking names only label and id, but `matched.path`
   implies any attribute can match. `selection.apply({ text })` searches "any of its attribute
   values" (`javascript-api.md:314`). Is find the same set? Results? Notes?
6. **What `matched.path` looks like.** `"name"`, `"data.name"`, `"label"`, `"graphty.label"`?
   `Path` is just `string`. I printed it to the reader, which may show internal spelling.
7. **Which match `matched` reports when several attributes match.** Only one is returned.
8. **Case sensitivity.** The selection text search is case-insensitive; find does not say.
9. **Prefixes.** Does `find("exact:Alice")`, `find("id:a17")`, `find("regex:^A")` or
   `find("=data.weight > 5")` work, as they do in `selection.apply({ text })`
   (`javascript-api.md:317-322`)? Two text searches with different grammars in one element is a
   trap; one with the same grammar needs to say so.
10. **What `values` is for.** No sentence and no example uses it. I guessed "distinct matching
    attribute values with counts, for a suggestion row like `type: person (42)`", and left it
    out of the example because I could not tell what clicking one should do.
11. **`find("")`.** Every element, nothing, or an error? The input handler hits it on the first
    backspace.
12. **Default `limit`** when omitted, and whether `limit: 0` returns only `total`.
13. **Default `kinds`.** Both, presumably.
14. **Hidden elements.** `selection.apply({ text })` takes `scope: "visible"`; find takes no scope.
    Section 3 says a later `excludedBy` is additive, so today a hit can be a filtered-out node
    that clicking selects but cannot show. I cannot ask for "visible only".
15. **Staleness.** `nodePage` returns a `revision` (`javascript-api.md:163`); find does not. If
    the graph reloads while the list is open, a click may target an id that is gone.
16. **Cost per keystroke.** "Synchronous, so it can run on every keystroke" gives no size
    bound. `data-sources.md` says the element draws up to 100,000 edges; whether find at that
    size is a keystroke-cost call or needs a debounce is not stated.
17. **How to frame a hit.** Section 3 stops at selecting. The guide's `zoomToSelection()`
    (`camera.md:72`) does not say which object it lives on; I guessed `element.graph?.` (it
    compiled; `element.zoomToSelection()` also exists, unpublished). `zoomToNodes` takes node ids
    only, so an edge hit has no published "go to it".
18. **Where `FindResult` is exported from.** Not stated. `NodeId`, `EdgeId` and `Path` are
    exported from `/session` and `/schema` but not from the package root, so typing a
    `renderHits(result: FindResult)` helper means knowing about a subpath.

## Names that misled me

- **`ids`** (the selection target in section 3's example): reads as "ids of anything", is typed
  as strings only, and does not accept the ids find returns.
- **`kind`** looks like a discriminant and is not one; branching on it narrows nothing.
- **`label`**: the guides' "label" is a style channel the reader may never have switched on.
- **`matched`** vs the selection's `unmatched`: in the selection API `unmatched` is "pasted ids
  that named nothing"; here `matched` is "the attribute that hit". Same word family, unrelated.
- **`values`**: says nothing about being matching attribute values grouped with a count.
- **`kinds`** (input, plural array) vs `kind` (output, single): fine alone, but `kinds: ["node"]`
  versus the selection API's `nodes`/`edges` keys is a third spelling of the same split.
- **`find` on `session.data`** while the other text search is `session.selection.apply({ text })`:
  a reader looking for "search" in the selection docs will not find `find`, and vice versa.

## Internal concepts I had to name

- `session` and `session.data` versus `element.graph` (finding is on the session; framing is on
  the graph, which may be `undefined`). The example needs both halves of the API.
- `Path` (the matched attribute's address) with no published grammar for what a data column's
  path looks like as opposed to a run's `results.<run>.<field>`.
- `NodeId | EdgeId` and the fact that a node id may be a number.
- The `SelectionTarget` shapes (`ids` vs `nodes`/`edges`), to turn a hit into a selection.

## What would make this pass

1. Hits typed as a discriminated union, and a selection target that takes hits directly.
2. Section 3 states: which fields are searched, the `label` fallback, the `matched.path`
   spelling, case rules, whether the `exact:`/`regex:`/`id:`/`=` grammar applies, `find("")`,
   default `limit` and `kinds`.
3. A `scope` option matching `selection.apply({ text, scope })`, so "visible only" is possible now.
4. One sentence and one line of example for `values`, or drop it from the one-way-door keys.
5. A canonical example that frames the hit (node or edge), not only selects it.

Scratch: `tmp/api-review/blind-3/` (`stub.ts`, `example.ts`, `doc-example.ts`, `fixed.ts`,
`tsconfig.json`, `build.log`).
