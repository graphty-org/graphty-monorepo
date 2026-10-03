# Blind-author review: a node's neighbors with tie strength (section 4, issue #784)

The reviewer saw only section 4 of `element-api-decisions.md` (as if it were the published docs
page) and the published guide pages in `graphty-element/docs/guide/`. No repository source was
read. The example was type-checked against graphty-element's built declarations with section 4's
interfaces merged into `SessionDataApi`.

## The task and the example

The most common task for this capability: a reader clicks a node, and a side panel lists that
node's strongest connections with how strong each one is.

`review/blind-4.ts` (17 lines):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const list = document.querySelector("#neighbors")!;

element.addEventListener("graphty-node-click", (e) => {
    const { nodeId } = e.detail; // events.md: detail carries nodeId and data
    const page = element.session.data.neighbors(nodeId, { limit: 10 });
    list.replaceChildren(
        ...page.records.map((n) => Object.assign(document.createElement("li"), {
            textContent: `${String(n.node.label ?? n.node.id)}: ${n.tie}`,
        })),
    );
    list.setAttribute("aria-label", `${page.total} connections`);
});
```

## Did it compile

No. One error, and it is not in section 4's API but blocks every reader who reaches it from a click:

```
example.ts(9,26): error TS2339: Property 'detail' does not exist on type 'Event'.
```

`events.md` lines 155-158 show `e.detail.nodeId` on `graphty-node-click`, but the built types do
not add `graphty-node-click` to `HTMLElementEventMap` (only `HTMLElementTagNameMap` is augmented,
`dist/src/graphty-element.d.ts:2188`). With a cast to `CustomEvent<{ nodeId: string | number }>`
the example compiles (exit 0). The cast is a guess: no published page names the detail type, and
the root entry point exports none of `NodeRecord`, `RecordPage` or the proposed `Neighbor` (0
matches in `dist/index.d.ts`); they come only from `@graphty/graphty-element/session`, which no
guide page tells a reader to import types from.

Probes compiled in `tmp/api-review/blind-4/variants.ts`:

| What a reader writes | Result |
|---|---|
| `neighbors(id, { sort: { key: "tie", descending: true } })` -- the shape `nodePage` taught them | TS2322: `sort` here is `"tie" \| "label"` |
| `neighbors(id, { scope: "selection" })` -- every other page method takes `scope` | TS2353: no `scope` |
| `const s: string = n.node.label` | TS2322: `unknown` |
| `neighbors(id, { weight: "data.knownFields.edgeWeightPath" })` -- a typo or a wrong guess | compiles: `Path` is plain `string`, so any wrong column is accepted silently |

## Where I had to guess

1. **What "label" sorts by.** `sort: "label"` is never defined. The only label setting a guide
   names is `nodeLabelPath` (`web-component.md:45`), which is unset by default. So on a default
   element, does `"label"` sort by `id`, by a `label` key, by `name`, or not at all? Unanswered.
2. **What to show as the neighbor's name.** `Neighbor` carries the raw `NodeRecord`, not the
   resolved display name. To print what the canvas prints, the reader must read `nodeLabelPath`
   from config, walk that path into the record, and fall back to the id -- reimplementing the
   element's own label resolution. The docs example dodges this with `n.node.name`, which only
   works for Les Miserables and is `unknown` in TypeScript. Section 4 should add a resolved
   `label: string` to `Neighbor` (the same rule `sort: "label"` uses), or the "label" sort and the
   displayed text will disagree.
3. **What "the import's weight column" is.** No guide uses that phrase. `layouts.md:320` says the
   weight comes from `data.knownFields.edgeWeightPath`, default `weight`. I assumed they are the
   same; the page should say so in those words.
4. **What happens to edges with no weight, or a non-number weight.** Counted as 1, as 0, skipped,
   or the call throws? A CSV import gives text; is `"3"` a 3?
5. **Direction on an undirected graph.** Is `"out"` an error, ignored, or the same as `"both"`?
6. **Direction `"both"` on a directed graph with A->B and B->A.** One neighbor with tie 2 and two
   edge ids, presumably -- but not stated. Can a caller tell in-ties from out-ties apart without
   two more calls?
7. **Self-loops.** Is a node its own neighbor?
8. **Sort tie-break and ascending order.** Equal ties: what order? (`nodePage` documents "keep the
   order they were added".) There is no way to ask for weakest first.
9. **When to read again.** `RecordPage` has `revision`, so I assumed the `nodePage` re-read
   pattern from `javascript-api.md:172-179` applies; section 4 does not say the neighbor page's
   revision is the same one.
10. **An unknown id.** Empty page, or a coded error? A click on a node removed by undo can hit it.
11. **Cost.** The "hub with thousands of neighbors" alternative argues for paging, but sorting by
    tie needs every neighbor summed first. Is page two O(page) like `nodePage` ("computed once per
    revision") or O(degree) per call?

## Names that misled me

- **`tie`.** Social-network jargon. Every guide page calls the same quantity a *weight*
  (`layouts.md:302-322`, "Edge weights"; the option itself is `weight`). A reader who reads
  `weight: false` then sees `tie` on the result assumes they are different things. `weight` (or
  `strength`) on the result, matching the option, is what a reader would guess.
- **`sort: "tie" | "label"`.** Same name as `nodePage`'s `sort` with a different type (string
  enum versus `{ key, descending }`). One concept, two shapes, in the same `session.data` object.
- **`neighbors(id, options)` positional id versus `edgePage({ touching: id })`.** The guide's
  "edges at one node" call puts the node in options; this one puts it first. A reader who learned
  one form guesses the other wrong.
- **`edges: EdgeId[]`.** Reads as edge records; it is ids, so drawing "via these 3 scenes" needs a
  second `session.data.edge(id)` per id.
- **`direction: "out" | "in" | "both"`.** Fine on its own, but `layouts.md:153` uses `direction`
  for "TB"/"LR"; worth one sentence that this is edge direction.
- **British "neighbour"** in `data-sources.md:495,544` and `web-component.md:99` beside the
  American `neighbors` method name: a search for the method in the guides misses those pages.

## Internal concepts I had to name

- `session` and `session.data` -- acceptable, the guides teach them.
- `RecordPage`, `records`, `total` -- needed to read the result; taught by `javascript-api.md`.
- `@graphty/graphty-element/session` as the types entry point -- not taught anywhere for a
  browser consumer; needed for any typed helper that takes a `Neighbor`.
- `nodeLabelPath` -- needed to print a name, because `Neighbor` has no resolved label.
- The `graphty-` DOM event prefix and an untyped `detail` -- needed to get a node id at all.

## Gaps that make this not "easy things easy"

- The simple path (click, list, show names) cannot be written without a cast and without
  reimplementing label lookup. Both are element defects, not reader errors.
- No `scope`: "this node's neighbors inside the selected set" -- a natural follow-up -- is
  impossible, though every sibling page method supports scope.
- `weight: Path` accepts any string with no validation described: a misspelled column gives every
  tie a silent default instead of a coded error.

## Files

- Example: `design/ui/tier1-real-app/review/blind-4.ts`
- Stub and compile runs: `tmp/api-review/blind-4/` (`pkg/dist/src/session/types.d.ts` has the
  section 4 interfaces appended; `tsconfig.json`, `tsconfig.variants.json`, `tsconfig.cast.json`)
