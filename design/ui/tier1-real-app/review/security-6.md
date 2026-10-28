# Security and privacy review: item 6, what Analyze shows about each algorithm (#786)

Item 6 adds `FieldDescriptor.sentence`, `AlgorithmDescriptor.aliases`,
`AlgorithmDescriptor.categoryLabel` and `OptionDescriptor.essential` to graphty-element's catalog
(design/ui/tier1-real-app/element-api-decisions.md:277-318). The catalog is fed only by code (built-ins
and `Algorithm.register`), never by a data file, so there is no direct injection path from a
stranger's graph. The real risks are where item 6 meets plugins and item 10's project file.

## Major

1. **A plugin built before item 6 crashes every consumer's Analyze search.** `aliases` and
   `categoryLabel` are required on `AlgorithmDescriptor`, the type plugin authors write
   (graphty-element/src/catalog/types.ts:601). `publishAlgorithmDescriptor`
   (graphty-element/src/catalog/registry.ts:115-154) checks only the key and the reserved `runs`
   field, so a JavaScript plugin from npm compiled against today's types registers with
   `aliases === undefined`. The section's own pattern, `a.aliases.some(...)` on every keystroke,
   then throws `TypeError` for the whole list: one third-party package disables algorithm search
   for the app and every other consumer. Fix: make both optional in the authored type, and have
   `register` normalize (`aliases` to `[]`, `categoryLabel` from the category or the category
   string itself) and refuse non-string, non-array or oversized values, the way `scopeInput` is
   already derived there.

2. **A stranger's project file can make the legend's method sentence say the opposite of the
   drawing.** The example sentence "darker = more central" states an encoding direction, but the
   direction comes from the style layer (palette, reversal, channel), which item 10's file
   carries in `styles` from whoever wrote it. Open a file whose PageRank layer uses a reversed
   palette, and the element-authored, authoritative-looking caption is false. Fix: a sentence
   describes the method only (tier1-design.md:151 already does: "A node scores high when
   well-connected nodes link to it"); the direction words come from `styles.legend()`, which
   reads the actual layer. State "no encoding words in a sentence" as a rule of the field.

3. **Persisted sentences would let a file forge catalog text.** Item 10 stores
   `results.<runId>.run` (algorithm, params, label) but item 6 does not say the sentence is
   never written into the project file, the `app` slot or the styles document. If the app or
   the element caches the resolved caption there, a reopened file shows arbitrary text in the
   slot reserved for the element's own explanation. Fix: state that sentences, aliases and
   category labels are never serialized; they are always resolved from the live catalog by
   algorithm key and field name, and a key the reader's catalog lacks (a plugin they do not
   have) yields no sentence plus an `OpenReport.missing` entry, never text from the file.

## Minor

4. **Hidden options on a reopened run.** `essential` hides every other option behind "More
   options". A run restored from a stranger's file can carry non-default hidden settings
   (PageRank `tolerance: 0.1`, `useDelta: false`; graphty-element/src/algorithms/PageRankAlgorithm.ts:31-60)
   that change what the numbers mean, and Revise prefills them invisibly. Zod bounds
   (`maxIterations` max 1000) and the cost gate (session/cost/estimate.ts:773-783) keep this from
   being a hang, so it is integrity, not denial of service. Fix: an option whose value differs
   from its default is shown regardless of `essential` (or the run report lists changed options).

5. **Alias collisions let a plugin answer for a built-in word.** Nothing stops a plugin from
   publishing `aliases: ["pagerank", "betweenness"]`, so a reader typing a built-in's name gets
   the plugin's entry beside or ahead of it with nothing marking it as third-party. Plugins
   already run arbitrary code, so there is no privilege gain, but the confusion is cheap and
   permanent once aliases are public. Fix: `register` refuses an alias equal to another entry's
   key, plainName or technicalName, and search results carry the namespace.

6. **Lookups by field name must not use plain objects.** The legend resolves a sentence by a
   field name that, after item 10, arrives from a file. An implementation that builds
   `sentences[fieldName]` returns `Object.prototype` members for `"constructor"` or
   `"__proto__"`. Fix: specify `Map` or `Object.hasOwn` in the element's resolver, and expose a
   by-key lookup (`catalog.algorithm(key)`) so consumers stop hand-writing it.

## Not a risk

- Per-keystroke cost: filtering about 100 entries by a few aliases each is microseconds. The
  "per keystroke" argument against `catalog.search(text)` in alternative (b) is not a cost
  reason and should not decide the shape.
- Rendering: the element has no HTML sink for catalog text (no `unsafeHTML`; the only
  `innerHTML` is a clear at Graph.ts:471), and the app renders through React.
