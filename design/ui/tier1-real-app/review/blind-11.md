# Blind author review: readable run names (section 11)

What this is: a third-party developer's attempt to use "Readable run names" from the published
material only -- section 11 of `element-api-decisions.md` (treated as the docs page) and
`graphty-element/docs/guide/`. No repository source was read. The example was then type-checked
against graphty-element's built declarations (`dist/`, built from this worktree) with section 11's
one new signature, `suggestedName(options): { id, label }`, stubbed onto `defineAlgorithm`'s
definition type, because the hook is not in the built types.

Example: `review/blind-11.ts`. Scratch (stub, tsconfig, two extra probes):
`tmp/api-review/blind-11/`.

## The task

The most common thing a newcomer does with this feature: run PageRank twice, the default and a
lower damping, and show both side by side -- reading each run's id (for a style or a column) and
its label (for a legend or a picker). A plugin author's version of the same task: make their own
algorithm's runs come out with readable names.

## Result: it does not compile

```
blind-11.ts(10,19): error TS2339: Property 'id' does not exist on type 'RunResult'.
blind-11.ts(10,29): error TS2339: Property 'label' does not exist on type 'RunResult'.
blind-11.ts(10,43): error TS2339: Property 'id' does not exist on type 'RunResult'.
blind-11.ts(10,54): error TS2339: Property 'label' does not exist on type 'RunResult'.
```

The line at fault is `const plain = await element.run("pagerank"); plain.id, plain.label`. That
is exactly what the published guide teaches: `algorithms.md` "Custom Styling with Algorithm
Results" writes `const run = await element.run("degree"); ... results.${run.id}.value`, and
"Accessing Results" writes `run.result.node("node1")`. Both guide snippets fail the same way when
compiled verbatim (`tmp/api-review/blind-11/guide-snippets.ts`):

```
guide-snippets.ts(5,17): error TS2339: Property 'result' does not exist on type 'RunResult'.
guide-snippets.ts(8,29): error TS2339: Property 'id' does not exist on type 'RunResult'.
```

`element.run()` returns a `Run`, which carries `id` and `label`; awaiting it yields a `RunResult`,
which carries `runId` and no label at all. So the whole point of this feature -- a readable name
-- is unreachable from the value a newcomer is taught to hold. The version that compiles
(`tmp/api-review/blind-11/fixed.ts`) keeps the un-awaited `Run`, awaits it separately, and reads
`run.id` / `run.label`, or looks the label up again through `element.session.runs.get(id)?.label`.
Nothing in the guide tells a reader to do that.

The plugin half compiled, but only against a stub whose shape I invented (see guesses 4 to 7).

## Every place I had to guess

1. **What the damped run is called.** Section 11 gives one example id, `louvain_resolution_1_5`,
   and says PageRank names "damping". The guide never lists PageRank's options; the catalog file
   in the package says the option is `dampingFactor`. So is the id `pagerank_damping_0_5`,
   `pagerank_dampingfactor_0_5` or `pagerank_damping_factor_0_5`? How is 0.5 spelled -- `0_5`,
   `05`? Negative numbers? A newcomer cannot write the style path `results.<id>.value` without
   running it first, which defeats "readable".
2. **What the damped run is labeled.** Section 11 only gives "Influence" for the default. The
   `Run.label` doc comment in the published types says the label is "the algorithm's plain name
   on its own while it is the only run of that algorithm, gaining the parameter that differs in
   parentheses the moment a sibling exists". So the default run's label CHANGES from "Influence"
   to something like "Influence (damping 0.85)" the moment I start the second run? Is that
   label then English text that a non-English app has to replace? Section 11 is silent.
3. **Which parameter changes make a new run.** The guide (`algorithms.md`, "A run's id names its
   result") says "Parameters and the seed are not part of the id: starting a result again with
   new ones re-runs that result in place ... To keep two parameter settings side by side, name
   them with `as:`." Section 11 says the opposite for one named setting per algorithm: changing
   it "now starts a separate run". So `run("pagerank", { maxIterations: 500 })` replaces the
   default run in place but `run("pagerank", { dampingFactor: 0.5 })` adds a new one. The reader
   has to know, per algorithm, which single parameter is "the named one". It is listed only in
   prose in section 11, and not at all for plugins.
4. **Where `suggestedName` goes.** "An algorithm may define `suggestedName(options)`." On the
   `defineAlgorithm({...})` object? As a static on an `Algorithm` subclass? Both? I put it on
   `defineAlgorithm`.
5. **What `options` holds.** The reader's options only, or with defaults filled in? Checked and
   coerced? Does it see the scope or the seed?
6. **How to say "no suggestion".** The return type is `{ id, label }`, not optional. Built-ins
   name a setting "only when it differs from its default", so a plugin must do the same -- but it
   can only do that by re-typing its own default (`confidence === "confidence"`) and re-typing
   the base id rule 1 would have produced (`acme_confidence_degree`). Can it return `undefined`?
   Must it return the bare key? Guessed: it must return something.
7. **What happens to an id outside the alphabet.** Plugin ids in the guide are hyphenated
   (`acme-confidence-degree`). Section 11 fixes the run id alphabet to lowercase, digits and
   underscore. If `suggestedName` returns `acme-confidence-degree-score` or `Score`, is it
   refused (with what error code), or silently rewritten? If rewritten, my style paths break
   without a message.
8. **How rule 4 numbers runs.** "A different computation under a taken name: `_2`, `_3`."
   Default PageRank over the whole graph is `pagerank`; default PageRank over the selection is
   then `pagerank_2`. Which one is `_2` depends on which ran first, so a saved style that reads
   `results.pagerank_2.value` paints a different run in a session run in another order. How do
   the two show up in a legend if both are labeled "Influence"?
9. **What `as:` does when the name is taken.** Rule 5: "a name passed with `as:` always wins".
   Wins over what -- over a suggested id, or over an existing different run with that id (is
   that run replaced, or is my run renamed `_2` against my explicit wish)?
10. **Algorithm key vs run id.** Rule 1 turns `shortest-path` into the run id `shortest_path`,
    and `label-propagation` into `label_propagation`. The guide's tables still list keys like
    `dijkstra`, `bellman-ford`, `a-star`, `connected-components` that are not keys in the
    shipped catalog (it has `shortest-path`, `components`). So `session.runs.get("shortest-path")`
    returns `undefined` and nothing says why. Which spelling goes where?

## Names that misled me

- **`run`** in the guide names two different things: the `Run` handle (`element.run(...)`) and
  the awaited `RunResult` (`const run = await element.run(...)`). Every guide example binds the
  awaited value to a variable called `run`, then reads members only the handle has.
- **`id` vs `runId`.** The handle has `id`, the result has `runId`, the start option is `as`, the
  style path segment is `<runId>` in one paragraph and `<as name>` in another. One concept, four
  spellings.
- **"suggestedName"** returns an id AND a label, and the id is the part that matters (it becomes
  a result path in saved files). "Name" reads like the display text only.
- **"label"** already means a node's text label throughout the guide (`label: "Node A"`, the label
  overlap rule). A run's `label` is a different thing on the same word.
- **"named setting"** -- section 11 says built-ins "name one setting"; the guide never uses the
  phrase. It is an internal rule surfacing as behavior (re-run in place vs new run).
- **"Influence"** -- the label for PageRank. The guide's own table calls it "pagerank:
  Influence based on incoming links". A reader looking for PageRank in a legend sees a word the
  guide never pairs with it except in a description.

## Internal concepts I had to name

- **Rule numbering 1 to 5** of the naming algorithm, including "the same computation" (algorithm,
  scope, sampling, exactness, suggested name) -- I needed rule 3 vs rule 4 to predict whether my
  call replaces a run or adds one.
- **"Re-run in place"** vs **"separate run"**, which layers repaint, and when.
- **`Run` vs `RunResult`** -- the handle/result split is not explained anywhere in the guide, but
  reading a run's name is impossible without it.
- **`session.runs.get`** -- needed to read a label back after `await`; the guide mentions it only
  in the `algorithmsOnLoad` options table.
- **The id alphabet** and the hyphen-to-underscore rewrite.

## What this means for the one-way door

Section 11 proposes freezing the `suggestedName` hook, its `{ id, label }` return, the id alphabet
and the built-in ids. Before that freeze:

- The published guide must stop teaching `(await element.run(...)).id` / `.result`, or `RunResult`
  must gain `id` and `label` (and `result` or the guide must drop it). As shipped, the canonical
  example of the docs this feature extends fails to compile.
- The guide's "parameters are not part of the id" paragraph and section 11 contradict each other;
  one of them is wrong today.
- The built-in ids for every named setting (PageRank, Katz, Eigenvector, HITS, Louvain, Leiden,
  Components, Shortest path, link prediction) must be listed as a table, with the number
  formatting rule, because they become result paths in saved styles and project files.
- `suggestedName` needs a "no suggestion" return, a stated input (options with defaults filled
  in or not), and a stated behavior for an id outside the alphabet, before plugins depend on it.
- The `_2` rule makes saved result paths depend on run order; a frozen file format should not
  reference ids whose meaning depends on the order a session happened to run things.
- Whether `label` is English display text owned by the element (localization) and whether it
  changes when a sibling run appears needs one sentence each in the docs.
