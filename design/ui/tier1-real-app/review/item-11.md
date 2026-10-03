# Item 11 review: readable run names

Item 11 in element-api-decisions.md describes PR #726. Before it, a run started without a name
got a hashed id such as `degree_0bkzd1n0p2dnik`. PR #726 gives such a run a readable id instead
(`pagerank`, `louvain_resolution_1_5`), and lets a plugin choose its own id and label through a
`suggestedName(options)` hook.

Code read: origin/master b60fae0ba, which contains the #726 merge (3bbc022d3). The tier 1
worktree's own base does not contain it.

## Verdict: redesign before 3.6.0 is published

PR #726 is merged but has not been released. npm and the git tags stop at graphty-element 3.5.5,
and master's package.json is 3.5.5. Because the merge was a `feat:` commit, the next release
publishes it as 3.6.0. Until that release runs, every door below can still be closed for the
cost of a pull request. After it runs, each one costs a deprecation.

**Hold the graphty-element release until the change below has merged.** Section 11 of the
decision document is wrong to present this as an approval of something "already built". It is a
post-merge correction that has to land before the first release that carries it.

The core defect is that #726 puts a setting's value into the id. Three consequences follow, and
no local patch fixes all three:

- **Tuning a setting adds a run instead of updating one.** Today, in 3.5.x, changing a setting
  re-runs the existing run in place. Under #726, changing a "named setting" starts a new run, with
  its own auto-applied layer, legend block and tree row. A resolution slider stepped ten times
  leaves ten Louvain runs. Nothing evicts them (autoApply.ts:12-15, 285-300; RunsApi.ts mintId at
  about line 991). This is a behavior break shipped as a minor release. It also contradicts tier 1
  itself: tier1-design.md:651-652 says "Rerun revises the same row", and structure-b-refined.md:255
  says "A rerun keeps the run's id".
- **The id stops describing the run.** If the app keeps a row by passing `as: <old id>`, `reuse()`
  retunes that run in place (RunsApi.ts:1128-1132). The names map is written only when a run is
  created (RunsApi.ts:935), so `louvain_resolution_1_5` then holds resolution 2 under the label
  "(resolution 1.5)". A plugin label shows the same staleness (probe P8: "Reach in 3 hops" over
  hops 4).
- **Different values produce the same id.** The `idPart` function (suggestedName.ts:38-43) drops
  sign and punctuation. So Katz alpha -0.05 and alpha 0.05 both become `katz_alpha_0_05`. Since
  the parameters are not part of the run's identity, the second run silently retunes the first
  (probe P9). Separately, `louvain_resolution_2_2` can mean resolution 2.2, or the second run at
  resolution 2.

The fix is mostly deletion. Keep readable, key-based ids, keep 3.5's re-run-in-place behavior,
and drop the parts that put values into ids.

## Revised shape

```ts
// graphty-element, session/runs/types.ts -- the only addition
interface StartOptions {
    // ...existing: as, scope, seed, sample, exact, applySuggestedStyles
    /**
     * Start a second run of the same computation beside the first, under the next free id
     * (`pagerank_2`), instead of re-running the first in place. Ignored when `as:` is given.
     */
    separate?: boolean;
}

// Removed before 3.6.0 (unreleased, so no deprecation):
//   SuggestedName, AlgorithmDescriptor/defineAlgorithm/static `suggestedName`, BUILT_IN_SETTINGS.
```

Naming rule for a run started without `as:`. This replaces the five rules in section 11.

1. **Id.** The id is the algorithm key with each run of non-letters and non-digits replaced by
   an underscore: `pagerank`, `shortest_path`. It never contains a setting's value.
2. **Same computation, re-run in place.** If a run already exists with the same result identity
   (algorithm, scope, sampling and exactness), the new call re-runs that run in place with the
   new parameters and seed. This is the 3.5.x behavior. Every layer bound to the run repaints.
3. **Different computation, numbered id.** If the id is held by a different computation, or the
   caller passed `separate: true`, the new run gets the next free number: `_2`, `_3` and so on.
4. **Numbered ids last only as long as the session and its saved project.** When a run is
   created, its minted id is written into the stored command as `as:`, and `derived: true` is
   recorded on its RunEntry. Restore, undo/redo, replay and reopening a project therefore
   reproduce the same id, and the "same computation" lookup in rule 2 still finds the run. The
   lookup must read dispatcher state, not the private `derivedIds` and `names` maps, which are
   lost on restore. The same number in another session can name a different computation. A
   recipe, template or styles-only document that must bind to a particular run names that run
   with `as:`.
5. **What `as:` does depends on the name.**
   - If the name is free, `as:` creates the run.
   - If the name is held by the same computation, the run re-runs in place.
   - If the name is held by a different computation, the call throws `E_DUPLICATE_ID`.

   This replaces "always wins", which is false (RunsApi.ts:1116-1126; probe P3).
6. **Label.** The label is computed live: the algorithm's plain name, plus a qualifier when a
   sibling run of the same algorithm exists. The qualifier uses each differing option's
   `plainName` from its OptionDescriptor, not the raw key (`dampingFactor`, RunsApi.ts:1597).
   The parameters are read on every access, so a label is never stale after a retune. When a
   sibling is added or removed, a change event fires for each run whose label changed.

Other changes in the same pull request:

- **One alphabet for minted ids.** Minted ids use only `[a-z0-9_]`. `as:` keeps accepting hyphens
  because 3.x already published that. The guide documents the quoted selector form for a
  hyphenated id, and both alphabets are stated in it. Section 11 stops calling "lowercase, digits,
  underscore" the only alphabet.
- **Check option types before naming.** `checkParams` refuses a value whose type differs from the
  declared option type, so an object or a string where a number is expected is rejected. Today an
  object passes and is JSON-stringified into a label (RunsApi.ts about 426-460). Qualifier text
  is capped at about 64 characters.
- **Old hashed ids.** On load, an id of the old hashed form (`<key>_<14-char digest>`) is
  recorded as derived, so rule 2 reuses it instead of growing a duplicate plain-named run
  (run-names.test.ts:202-209 shows today's duplication).
- **Fix stale comments.** In runs/types.ts, update the comment at line 667, which says ids are
  "never from an execution counter", and Run.label's comment that the label is "never by the
  consumer". Implement the `E_UNSTABLE_RUN_ID` refusal that the SessionRunsApi comment at
  RunsApi.ts:266 promises, or delete the promise. Today `isDerivedId` is never called and the
  code is never thrown.
- **Fix the guide.**
  - Replace "always wins" in algorithms.md:248 with rule 5.
  - Remove "named setting".
  - Add a table generated from the catalog listing each key and its default id.
  - Drop the keys the catalog does not ship (`dijkstra`, `bellman-ford`, `connected-components`).
  - Fix the two snippets that fail to compile, `run.result.node` and `results.${run.id}`, and
    move the guide snippets into the type-checked docs/examples.

## Canonical example (compiled)

Checked with `tsc --noEmit` (strict) against graphty-element's built types plus a three-line stub
adding `separate` (tmp/api-review/item-11/: canonical.ts, stub.d.ts, tsconfig.json). It exits 0.
Without the stub it fails only on `separate` (TS2353), so `separate` is the only API the example
needs that does not already exist.

```ts
import type { Graphty } from "@graphty/graphty-element";

const element = document.querySelector("graphty-element") as Graphty;

const influence = element.run("pagerank"); // id "pagerank", label "Influence"
await influence;
console.log(influence.id, influence.label);

// Change a setting: the same run re-runs in place, and every layer bound to it repaints.
await element.run("pagerank", { dampingFactor: 0.5 });

// Keep both side by side: ask for a separate run. Its id is "pagerank_2"; both labels gain
// what tells them apart: "Influence (Damping Factor 0.5)", "Influence (Damping Factor 0.85)".
const damped = element.run("pagerank", { dampingFactor: 0.85 }, { separate: true });
await damped;
await element.session.styles.encode({ run: damped, channel: "node.size" });
```

The example keeps the `Run` handle and awaits it. It does not keep the awaited `RunResult`,
which has `runId` and no label. This is deliberate. The label is live and the result is a
snapshot, so putting the label on both would give two values that drift apart. Adding `id` and
`label` to RunResult later would be additive.

## What changed and why

| Change | Why |
| ------ | --- |
| Setting values never enter the id; tuning re-runs in place | Restores 3.5.x behavior, so 3.6.0 is not a hidden break. It also fixes the run pile-up from sliders, the "id says 1.5 but holds 2" mismatch, sign and exponent collisions, and the `_2` ambiguity, and it matches tier 1's "Rerun revises the same row" |
| `suggestedName` hook and `BUILT_IN_SETTINGS` removed | With no value in the id, the hook has nothing left to decide. Removing it also removes several defects: English label text in the plugin API, runtime-only hyphen refusals, a plugin able to claim `pagerank` and push the built-in to `pagerank_2` (probe P5c), and the crash on keys like `constructor` that are Object.prototype members. It can come back later as an additive hook if a real plugin needs it |
| `separate: true` | Without it the element has no way to start a second, side-by-side run, and the app would have to invent free ids, which is a workaround. Needed by Analyst Alex's weighted-versus-unweighted comparison, by Run as copy, and by seed-stability checks (#807) |
| Minted id persisted as `as:` plus `derived: true` | Today the private maps are cleared and never refilled, so reopening a project and running `pagerank` again mints `pagerank_2` with a second layer. This must land before item 10 freezes the project-file format |
| Rule 5 restated | "Always wins" is false. A governed config replayed into a live session throws |
| Qualifier uses option `plainName` | Gives the legend one vocabulary. Section 11 never names the reader's word for each setting, and the code prints `dampingFactor 0.5` |
| Option type check and length cap | Untrusted project files can put arbitrarily large text into labels |
| Guide fixes compiled in CI | Two published snippets do not compile today |

## Rejected or narrowed findings

- **"Put the scope in the id instead of a counter" (`degree_largest_component`).** Narrowed. It
  only works for named scopes. Selection, visible-with-a-filter and inline `where` scopes still
  collide, so the counter stays. Persisting the minted id (rule 4) makes it stable wherever a
  project file carries it. Cross-session binding goes through `as:`.
- **"Put source and target, and weight, into the identity or the name."** Rejected. Under the
  revised rule, a new route or a new weight re-runs that run in place, which is the Update-row
  semantics tier 1 wants. Keeping both side by side is `separate: true`. This also takes the #313
  weight and direction options out of the one-way door: adding an option never changes an id.
- **"Give suggestedName a context argument", "rename it resultName", "plainName instead of
  label", "reserve built-in ids", "validate suggestions in defineAlgorithm".** All moot, because
  the hook is removed.
- **"Legacy alias table that recomputes the old digest for saved hashed selectors."** Rejected.
  The claim behind it, that saved hashed selectors match no run, is wrong for a reopened file:
  restored runs come back under their stored hashed id. Treating that id as derived (above) is
  enough.
- **"Reserve `results.<id>@<execution>` now, for #805."** Deferred. An execution id on the run
  record can be added later without changing the published `results.<id>.<field>` path.
- **"Cap the run count in a project file" and "labelOf is O(n^2)".** Moved to item 10 and to a
  cache follow-up. At tier 1 scale this costs under 1 ms at 50 runs, and no render-loop hook was
  added.
- **"An imported project retunes the reader's run."** Moved to item 10. Opening or merging a
  project into a live session is that item's contract, not the naming rule's.

## One-way doors (closing when 3.6.0 publishes)

1. **Built-in default ids.** The default id is the key with underscores (`pagerank`,
   `shortest_path`). These become `results.<id>` paths in saved styles and project files.
2. **The `_N` suffix.** Its format, and the rule that a minted id is persisted and never reused
   within a project.
3. **The `separate` option.** Its name and its meaning.
4. **The `as:` resolution rule**, now that it is documented.

Not a door any more: `suggestedName` and its `{ id, label }` return. They are removed before
release.

## Confidence: medium

The main change is high confidence: values out of ids, 3.5 retune-in-place, and the hook
removed. It is mostly deletion, it restores published behavior, and the compiled example shows
only `separate` is new.

Medium overall for two reasons. First, the persistence fix (rule 4) and loading old hashed ids as
derived have not been probed against a real save-and-reopen. Item 10's project file does not
exist yet, so the assertion "reopen, run pagerank, still `pagerank` with one layer" is a required
test, not an observed fact. Second, I have not checked whether any code on master, or the app,
already depends on `suggestedName`. A grep before deletion is required.

## Residual risks

- **Releasing before the change lands.** Top risk. master auto-releases after CI. If a release
  runs before this merges, 3.6.0 publishes value-bearing ids and the `suggestedName` hook. Undoing
  that is then a deprecation cycle, and saved files containing `louvain_resolution_1_5` must load
  forever.
- **Numbered ids are session-local.** Without `as:`, a styles-only document (#674) or a recipe
  that references `results.degree_2.value` can bind to a different computation in another
  session, with no error until `E_UNSTABLE_RUN_ID` is actually enforced.
- **Visible scope.** The default scope, 'visible', is frozen to the filter in force at start. So
  after a filter change, re-analyzing makes `degree_2` rather than revising the row. Tier 1's
  "Update row" needs a way to re-run an existing run over a new scope, which no element verb
  offers yet.
- **Renaming a run (#829).** This still needs a stored label override on RunEntry. The live label
  rule must yield to that override.
- **The tier 1 worktree is stale.** It does not contain #726. Items 5, 8 and 10 were designed
  against the hashed ids and must be re-checked after a rebase.
