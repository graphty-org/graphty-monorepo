# Blind author review: what Analyze shows about each algorithm (#786)

The reviewer acted as a third-party developer who sees only the published docs: section 6 of
`element-api-decisions.md` (the proposal's own text, read as if it were the docs page) and
graphty-element's guide pages under `graphty-element/docs/guide/`. The task chosen as the most
common one: build an algorithm picker where typing "brokers" finds Betweenness under its category
heading with only the options a reader usually changes, then put the one-line sentence under the
legend once the run is painted.

## The example

`design/ui/tier1-real-app/review/blind-6.ts` (20 lines, about 15 of author code):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { catalog } = element.session;

const typed = "brokers";
const matches = catalog.algorithms().filter((a) =>
    [a.plainName, ...a.aliases].some((w) => w.toLowerCase().includes(typed.toLowerCase())));
for (const a of matches) {
    console.log(a.categoryLabel, a.plainName, a.options.filter((o) => o.essential).map((o) => o.plainName));
}

const run = element.run("betweenness");
await run;
await element.session.styles.encode({ run, channel: "node.color" });
const entry = catalog.algorithms().find((a) => a.key === run.record.algorithm);
document.querySelector("#legend-caption")!.textContent = entry?.fields.find((f) => f.name === "value")?.sentence ?? "";
```

## Did it compile

Setup: graphty-element built (`npm run build`), the three section 6 interfaces merged over
`dist/src/catalog/types.d.ts` by module augmentation, `tsc --noEmit --strict`. Scratch in
`tmp/api-review/blind-6/` (`section6-stub.d.ts`, `tsconfig.json`, `probe.ts`, `plugin-compat.ts`).

- **The final example compiles.** It took a second attempt.
- **First attempt failed** with `TS2339: Property 'algorithm' does not exist on type 'RunResult'`.
  The algorithms guide teaches `const run = await element.run("degree")` and then uses `run.id`
  and `run.result...` (algorithms.md, "Accessing Results" and "Custom Styling with Algorithm
  Results"). Those do not compile either: `probe.ts` gives `TS2339` for `id`, `result` and
  `record` on the awaited value. Awaiting a run gives a `RunResult`, which has `runId` and no link
  back to the algorithm key. The only way from a run to its catalog entry is the un-awaited `Run`'s
  `record.algorithm`, which appears in the docs only as `run.record.scope.set` in the scope
  example. Section 6's own snippet hard-codes `"pagerank"` and never shows this step, which is the
  step every real caller needs.
- **Section 6 breaks every existing advanced plugin at compile time.** The custom-algorithms
  guide's descriptor literal (`TIE_STRENGTH_DESCRIPTOR`), pasted unchanged into `plugin-compat.ts`,
  fails with `TS2739: ... is missing the following properties from type 'AlgorithmDescriptor':
  aliases, categoryLabel`. Both are declared required on the type a plugin author writes. Compare
  `scopeInput`, which is also filled by `Algorithm.register` and is therefore optional on the same
  interface (`dist/src/catalog/types.d.ts`, the `scopeInput?` doc comment says "DERIVED, NOT
  AUTHORED ... A plugin leaves it out"). As written this is a breaking change to a published type
  that the section does not call breaking.

## Every place the author had to guess

1. **How to get from a run to its catalog entry.** Not documented; see above. The guess
   `run.algorithm` was wrong.
2. **Which field carries the sentence.** The docs say a metric has "ten descriptors for one
   measured number" (custom-algorithms.md, the `edgeMetricFields` comment) but never list their
   names. Betweenness publishes `value`, `rank`, `percentile` on nodes and seven graph fields
   (`dist/graphty-catalog.json`). Section 6 says "every node or edge field" gets a sentence, so
   there are three per centrality, and the reader has to know that `value` is the one a legend
   wants. `"value"` was a guess from `results.<runId>.value` in the guide.
3. **Which field `encode()` painted.** `encode({ run, channel })` picks a default field the docs do
   not name, so the caption may describe a different field from the one on screen.
4. **Where the legend is.** Section 6's snippet writes `legend.caption = ...`. Nothing in the docs
   has a `legend` object with a `caption`; `session.styles.legend()` returns "blocks" whose shape
   is undocumented. The built type (`dist/src/session/styles/legend.d.ts`) gives a block a `runId`
   and a `field` with `plainName`, `technicalName` and `path`, but no field `name`, no algorithm
   key and no sentence. So a legend renderer goes block -> runId -> `session.runs.get` ->
   `record.algorithm` -> catalog -> fields matched by path. Three hops for one sentence. The
   sentence belongs on the legend block's `field`, where the only consumer that needs it is
   already reading.
5. **Whether aliases are lowercase, and whether `plainName` is searched too.** Section 6 says
   neither. Betweenness's `plainName` is "Bridges centrality", so a search on "betweenness" only
   works if the key or `technicalName` is searched as well; the docs list `betweenness` as the
   name everywhere. The author has to decide which of four strings (key, plainName, technicalName,
   aliases) to match, which is exactly the decision alternative (b), `catalog.search`, would have
   made once.
6. **What `categoryLabel` says for each category.** "The label words of the built-in categories"
   are called a one-way door, but only two of the six are given ("Ranks nodes", "Finds groups").
   `path`, `flow`, `structure` and `prediction` have none. `structure` holds six unlike
   algorithms; no single "Finds ..." verb covers it.
7. **What a simple-tier plugin gets.** `defineAlgorithm` fills `category: "custom"`
   (`dist/src/simple/defineAlgorithm.d.ts` doc comment) and takes no category, alias, sentence or
   essential flag. "custom" is not a built-in category, and section 6 says a plugin with its own
   category supplies the label, so the simple tier has no way to supply it and the required string
   has no defined value. A plugin author following the guide's first example cannot appear under a
   sensible heading, be found by a synonym, or show a sentence.
8. **What happens with no essential option.** Degree, and every plugin whose author does not know
   about `essential`, shows an empty options area. Not stated.

## Names that misled

- **`essential` beside the existing `advanced`.** `OptionDescriptor` already has
  `advanced?: boolean` (`dist/src/catalog/types.d.ts`), set on 39 built-in options. Section 6 never
  mentions it. PageRank's `weight` is `advanced: true` today, and section 6 wants it `essential`, so
  one option would carry both flags. Two booleans give four states for what is one question (shown
  up front or behind "More options"). Either reuse `advanced` (shown up front = `!advanced`) or say
  what the four combinations mean.
- **PageRank "direction".** Section 6 lists weight, damping and direction as PageRank's essential
  options. PageRank's options are `dampingFactor`, `maxIterations`, `tolerance`, `weight` and
  `useDelta` (`dist/graphty-catalog.json`). There is no direction option to mark.
- **`FieldDescriptor { sentence?: string }` shown as a whole interface.** It reads as a new type.
  It is an addition to an existing interface with nine other members. Same for the other two.
- **`sentence` "fits any dataset", but the motivating example is "darker = more central".**
  "Darker" is a property of a color channel with an unreversed sequential palette, not of the
  field. Encoded on `node.size`, or with `reverse: true`, or with a diverging palette, the sentence
  is false. A sentence on the field cannot name the visual encoding; a sentence on the legend
  block could.
- **`categoryLabel` next to `category`.** Two fields, one an id and one display text, with no
  rule for which a consumer should group by. Every other catalog entry uses `plainName` for display
  text; `category` is the only id whose words live on the child.
- **`aliases`** suggests alternative keys `run()` would accept. It is search vocabulary only.

## Internal concepts the example had to name

- `run.record.algorithm`: the run record, to recover the key the caller just passed in.
- Field names (`"value"`): the field list of a metric shape, which the docs never enumerate.
- `catalog` descriptors as a lookup table the consumer joins by hand (`find((a) => a.key === ...)`)
  because the session's catalog has no by-key lookup (`CatalogApi` in
  `dist/src/catalog/types.d.ts` lists only `algorithms()`, `optionsFor()` and other list calls;
  `algorithmByKey` in `/catalog` covers built-ins only). Section 6 uses the `find` pattern itself.
- `catalog.optionsFor(key, scope)` is the documented way to get options with data-dependent bounds
  resolved. Section 6 reads `pr.options` instead and does not say whether `essential` survives
  `optionsFor`, so a form built the bounded way may lose the flag.

## Other problems a third party would hit

- **English only.** `sentence`, `categoryLabel` and `aliases` are display text and search words in
  English, shipped in the element's type. There is no locale field and no key a consumer could
  translate from. Aliases drawn from "readers in the studies" are English-speaker vocabulary; a
  French consumer cannot add "courtiers" for Betweenness without registering the algorithm again.
- **No way to add aliases or sentences to a built-in.** The capability is read-only for every
  consumer except the element's own authors.
- **Sentence wording is called content, not API, but it is matched on.** A consumer that shows the
  sentence in a screenshot test, or a docs page that quotes it, breaks on any release. If wording
  may change in a patch, say so in the docs page, not only in the review document.

## What would make the simple path work

- Put the sentence where it is consumed: `legend()` block `field.sentence`, written for that
  block's channel and palette, and `RunResult.fields` (which already exist on the awaited value).
- Make `aliases` and `categoryLabel` optional on the authored type and filled by `register`, like
  `scopeInput`; let `defineAlgorithm` take `category`, `aliases` and per-option `essential` (or
  `advanced`).
- Reuse `advanced` instead of adding `essential`.
- Ship `catalog.search(text)` returning entries with the matched word, which answers both
  objections in alternative (b): one call, and it says why it matched.
- Fix the algorithms guide so `await element.run(...)` examples compile, and document how to get
  from a run to its catalog entry.
