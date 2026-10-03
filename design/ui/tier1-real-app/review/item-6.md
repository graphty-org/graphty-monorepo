# Item 6 review: what Analyze shows about each algorithm (#786)

The recommendation under review is section 6 of `element-api-decisions.md`. It proposes four
additions to graphty-element's catalog so the graphty app's Analyze popover and legend never keep
a per-algorithm list: a `sentence` on each result field, required `aliases` and `categoryLabel`
on each algorithm, and an `essential` flag on options.

## Verdict: redesign

The need is real. All four proposed fields are the wrong shape:

- **`categoryLabel` produces the wrong headings.** The tier 1 design groups the popover by what a
  run adds (tier1-design.md:611-614). The element's `category` cuts across that grouping, so a
  label per category cannot produce it.
- **`sentence` is false on many drawings.** "darker = more central" describes an encoding, not a
  field.
- **`aliases` and `categoryLabel` break plugins.** Both are required on the type plugin authors
  write. They break every published plugin and graphty-element's own `defineAlgorithm`.
- **`essential` duplicates `advanced`.** On the section's own PageRank example the two flags
  contradict each other.

The revised shape below compiles against the built types. A plugin descriptor from the published
guide still compiles unchanged. The canonical example is 17 lines and names nothing internal.

## Revised shape

```ts
// Additions to existing interfaces in @graphty/graphty-element (catalog/types.ts, styles/legend.ts).

interface FieldDescriptor {
    /**
     * What a higher value means, with no channel word: "more central", "more of a go-between".
     * Never "darker" or "larger" -- the legend adds those. Built-ins fill it on the primary
     * per-element field ("value") only; rank and percentile carry none.
     */
    higherMeans?: string;
}

interface AlgorithmDescriptor {
    /**
     * Extra words a search matches ("brokers" for betweenness). Search only: run() never accepts
     * them. Optional for authors; absent means none. Algorithm.register refuses a value that is
     * not an array of at most 20 strings of at most 64 characters each.
     */
    searchTerms?: readonly string[];
}

/** OPEN UNION: later releases add groups (#320's question groups). Hide a group with no keys. */
type AlgorithmGroupId = "rank" | "groups" | "paths" | "measure" | (string & {});

interface AlgorithmGroup {
    readonly id: AlgorithmGroupId;
    /** English default heading, "Rank nodes and edges". Content: any release may reword it. */
    readonly plainName: string;
    /** Every registered algorithm whose result shape falls in this group, built-in or plugin. */
    readonly keys: readonly AlgorithmKey[];
    /** The one entry a newcomer should try first, when the element has an opinion. */
    readonly startHere?: AlgorithmKey;
}

interface AlgorithmMatch {
    readonly key: AlgorithmKey;
    /** Why it matched, so a picker can show "matched: brokers". */
    readonly match: {
        /** OPEN UNION. */
        readonly source: "name" | "technicalName" | "key" | "term" | "choice" | (string & {});
        readonly text: string;
        /** For source "choice": the option value that matched, so a form can preselect it. */
        readonly option?: { readonly name: string; readonly value: string };
    };
}

interface CatalogApi {
    /** Same array identity until a registration changes. */
    algorithmGroups(): readonly AlgorithmGroup[];
    /**
     * Case-folded word-start match over plainName, technicalName, key, searchTerms and option
     * choice labels. Ranked: name before term before choice, built-ins before plugins on ties.
     * "" returns []. Indexed once per registration change, so per-keystroke calls are cheap.
     */
    searchAlgorithms(text: string): readonly AlgorithmMatch[];
}

interface LegendBlock {
    /**
     * One finished sentence that is true for THIS drawing: "Darker means more central.",
     * "Larger means more central." Composed from the channel, the palette's measured lightness
     * at each end (after `reversed`) and the field's higherMeans. Absent when the field has no
     * higherMeans or the direction cannot be stated (categorical, diverging, no lightness trend).
     */
    readonly reading?: string;
}
```

Groups are derived from `shape`, which every descriptor already carries:

| Group | Shapes | Built-ins today |
|---|---|---|
| rank | node-metric, edge-metric | the seven centralities, k-core, clustering coefficient, dfs, all-pairs distance, max-flow |
| groups | community, layered-grouping, category-table | louvain, leiden, label propagation, girvan-newman, components, bfs |
| paths | path, node-set, edge-set, pair-list | shortest path, kruskal, prim, bipartite matching, min-cut, link prediction |
| measure | fact, temporal | none today, so the app hides the heading |

Options: no new field. The popover's short form is `!advanced && !internal`, which already exists
(catalog/types.ts:386-388; 19 of the 58 built-in options are not advanced). Two content fixes
travel with this item:

- PageRank's `weight` drops `advanced: true` (PageRankAlgorithm.ts:44-50).
- Every weight-taking option is retyped as `type: "attribute", on: "edge", attributeType:
  "number"`. Today PageRank's `weight` is a free `string`, so the design's "Weight: none /
  <column>" line could not be built without the app scanning columns.

`defineAlgorithm` gains `searchTerms?` and `higherMeans?`. Its group comes from its shape for
free, so a simple-tier score lands under "Rank nodes and edges" with no category to pick.

### Canonical example (compiled)

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { catalog, styles } = element.session;

// The Analyze picker: headings, then what the filter box matched.
const hits = new Set(catalog.searchAlgorithms("brokers").map((m) => m.key));
for (const group of catalog.algorithmGroups()) {
    const keys = group.keys.filter((k) => hits.has(k));
    if (keys.length > 0) console.log(group.plainName, keys);
}
const pagerank = catalog.algorithms().find((a) => a.key === "pagerank")!;
const shortForm = pagerank.options.filter((o) => !o.advanced && !o.internal);

// The legend: one sentence per block, always true for the drawing.
const run = element.run("pagerank");
await run;
await styles.encode({ run, channel: "node.color" });
for (const block of styles.legend()) console.log(block.field?.plainName, block.reading);
console.log(shortForm.map((o) => o.plainName));
```

How it was checked: `tsc --strict` with no errors against the built graphty-element types, with
the shape above merged in as module augmentation (`tmp/api-review/item-6/revised-stub.d.ts`).
The custom-algorithms guide's descriptor, pasted in unchanged (`plugin-compat.ts`), also compiles.
A negative file that reads `o.essential` fails with TS2339, which shows the augmentation is live.

## What changed and why

1. **`categoryLabel` removed, replaced by `algorithmGroups()` derived from `shape`.**
   - Why: the six categories do not map to the design's four headings. Components is
     "structure" but finds groups; max-flow is "flow" but ranks edges; k-core and clustering
     coefficient are "structure" but rank nodes (catalog/algorithms.ts:571, 816, 870, 884). No
     category maps to "Measure the graph".
   - Door 14 (one-way-doors.md:850) renames `category` to `family`, so a field keyed to
     `category` would ship already misnamed.
   - Deriving from `shape` means plugins group correctly with nothing to author, and two plugins
     can never publish conflicting labels.
   - This also removes the layout-side asymmetry for algorithms. graphty's own CATEGORY_LABELS
     table for layouts (graphty/src/data/layoutMetadata.ts:153-161) is the same defect. It
     should get a matching `layoutGroups()` in a follow-up, not in this item.
2. **`sentence` removed, replaced by `FieldDescriptor.higherMeans` plus `LegendBlock.reading`.**
   - Why: a fixed "darker = more central" is false on a size channel and on a reversed palette.
     It is also false on an UNREVERSED viridis or plasma, which run from dark to light
     (config/palettes/sequential.ts:48-51), so the `reversed` flag alone is not enough.
     Only the element knows the channel and the palette stops at legend time.
   - `fieldWordsOf` (GraphSession.ts:1505-1520) already finds the exact FieldDescriptor on
     every legend build, so carrying the phrase through is one property copy.
   - The app no longer hops from the legend block to the run to the algorithm key to the catalog
     field (the blind author's guesses 1, 3 and 4).
3. **`aliases` renamed to optional `searchTerms`, and the element ships the search.**
   - "aliases" reads like alternative run keys, and `legacyKeys` already is one
     (catalog/algorithms.ts:110).
   - The objection to `catalog.search` ("called per keystroke") is unfounded. The table holds
     24 entries, and the composed list keeps its identity until a registration changes
     (session/catalog.ts:65-79), so one index serves every keystroke.
   - Without the element search, every consumer re-derives which strings to match. The blind
     author missed "betweenness" this way, because its plainName is "Bridges".
   - The search covers option choice labels, so "Adamic-Adar" finds link prediction and
     preselects the method (LinkPrediction choices, link-prediction descriptor).
   - "bridges" is dropped as a term. It is already the plainName, and door 14 rules "bridge" out
     as a betweenness word because a bridge is a cut edge (#311).
4. **`essential` removed; `advanced` reused.**
   - Two booleans give four states for a two-state UI.
   - The section's PageRank "direction" option does not exist. PageRank's options are
     dampingFactor, maxIterations, tolerance, weight and useDelta.
   - "Direction only on a directed graph" waits for #313's consistent direction option. A static
     flag could not express it either.
5. **Every authored field is optional.** As written, section 6 is a breaking change: the
   guide's descriptor fails TS2739, and `descriptorOf` in simple/defineAlgorithm.ts:191-206 stops
   compiling. The precedent is `scopeInput`, which is optional and filled by register
   (catalog/types.ts:636-646).
6. **"What this answers" and "Start here".** tier1-design.md:613-616 needs both. "Start here"
   is element data on the group. "What this answers" uses the existing `description` this
   release. That is element text, so it satisfies "never typed". A dedicated `answers` field is
   additive later if the descriptions read badly in the popover.
7. **Catalog text is never serialized.** The project file (item 10) stores algorithm keys and
   field paths only. The legend reading and headings are recomposed from the live catalog on
   open. Otherwise a file from a stranger could plant text in the slot reserved for the
   element's own explanation.

### Findings rejected

- **Generalize `interpretation.summary` instead of adding a phrase** (consistency lens).
  Rejected. `FieldInterpretation` requires `bands` and `source` (catalog/types.ts:283-293), and
  making them optional would break consumers that read `interpretation.bands`. Its summary also
  answers a different question ("what counts as good"). No third sentence source is created:
  `reading()` is unchanged, and the legend reading is composed, not stored.
- **Ship the reading as `{ kind, slots, text }`** (evolution lens). Rejected for now.
  LegendBlock already publishes finished strings in `departures`. A `slots` sibling can be added
  later without breaking anything.
- **`OptionDescriptor.role: "weight" | "direction" | "key"`.** Deferred to #313. The retyped
  weight option (`attribute` on `edge`, numeric) already lets the app find the Weight line
  without hard-coding names.
- **`catalog.algorithm(key)` and `RunResult.algorithm`.** Not needed here: the legend reading
  removes the only consumer hop. The algorithms guide's `await element.run(...)` examples that
  fail TS2339 (`probe.ts`) are a real documentation defect. File it separately, because it is
  not part of this item.
- **Refuse a plugin search term that equals a built-in's name** (security lens). Rejected. A
  plugin can already publish `plainName: "PageRank"` today. The ranking rule (built-ins first on
  ties) covers the confusing case. Shape validation of `searchTerms` is accepted.
- **Prototype-key lookups on file-supplied field names.** Not applicable. Field resolution is by
  path equality (`fieldWordsOf`), not object indexing.
- **Memoize `catalog.metrics()`.** Out of scope for this item. The popover contract is to read
  `metrics()` when it opens and on a graph change, not per keystroke.

## One-way doors

- The method names `algorithmGroups` and `searchAlgorithms`.
- The group ids `rank`, `groups`, `paths` and `measure`, and the `AlgorithmGroup` and
  `AlgorithmMatch` field names.
- The match `source` ids.
- The field names `higherMeans`, `searchTerms` and `LegendBlock.reading`.
- The rule that `higherMeans` never names a channel.
- The shape-to-group mapping. Moving bfs out of `groups` later changes what a consumer sees.

These are NOT doors and the doc comments say so: every English heading, phrase, term and legend
sentence. Any release may change them (the content rule in one-way-doors.md). Consumers key on
ids, never on text.

## Confidence: medium

Why not high:

- The types compile, and the shape-to-group mapping was checked against all 24 built-in shapes.
  But the mapping does not match the refined popover in two places, so the design and the element
  disagree until one of them moves:
  - dfs is a node-metric (visit order), so it lands under Rank. The refined design puts it under
    Find groups.
  - all-pairs distance lands under Rank.
- How the legend composes its reading is specified but not built. "Measured lightness at each
  end" needs a luminance check per palette, which no test pins today.

## Residual risks

- **Top risk: no translation path for any of the new text.** Headings, phrases, terms and the
  legend reading are English only. Search ids and group ids are stable, so a consumer can supply
  its own words for headings. But it cannot translate `higherMeans` or add domain terms
  ("gatekeepers") to built-ins without a `register` extension. Adding that later is additive.
  Until then, a German-language deployment shows English captions.
- **#786 contradicts this revision.** It asks for an alias on every entry, a
  `categoryLabel(...)` function, a PageRank "direction" option, and "groups finds PageRank".
  The issue must be rewritten before anyone implements from it.
- **Effort is medium, not low.** The work covers:
  - two catalog methods with an index
  - the legend composer
  - `higherMeans` on the 12 built-in primary fields
  - `searchTerms` content
  - the weight-option retype through the Zod metadata (optionsFromZod.ts:286-292)
  - the defineAlgorithm additions
- **Measure the graph is empty** until a `fact`-shaped algorithm ships, so the design's fourth
  heading never appears in tier 1.
