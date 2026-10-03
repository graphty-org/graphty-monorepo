# Readable run names (decision item 11): persona review

Item 11 in element-api-decisions.md lets an algorithm suggest a readable name for an unnamed run
(`pagerank`, `louvain_resolution_1_5`) instead of a hash. The code is PR #726, read from the
`fix/readable-run-ids` worktree. Behavior was checked with a probe test over the real run API:
tmp/api-review/personas-11/probe.test.ts (run it from graphty-element on that branch with
`npx vitest run --config <that dir>/vitest.config.ts --root .`).

## The decision is no longer open

PR #726 merged into master at 2026-10-02 23:28 (merge 3bbc022d3) as a `feat:` commit, so the
next release publishes it as graphty-element 3.6.0. The decision document still asks for approval
of the hook, the id alphabet and the built-in ids as a one-way door, and plan.md:143 says "Merge
now". No release has run since the merge, so the door is still open until the release workflow
runs. Anything below that changes an id has to land, or the release has to be held, before then.
The tier 1 worktree's base does not contain the merge.

## Probe results

| Probe | Call | What happens |
| ----- | ---- | ------------ |
| P1 | `start("pagerank")` then `start("pagerank", { weight: "trust" })` | Same run, re-run in place; one run left; label "Influence" says nothing about weight |
| P3 | derived `degree` exists, then `start("degree", {}, { as: "degree", scope: "largest-component" })` | Throws E_DUPLICATE_ID. The docs say `as:` "always wins" |
| P4 | degree over the largest component | `degree_2` in a session that ran whole-graph degree first, `degree` in one that did not |
| P5a | `start("degree", {}, { as: "my-run" })` | Accepted. A suggested id with a hyphen is refused |
| P5b | plugin suggests `acme-reach` | E_BAD_COMMAND on the first run, not when the plugin is defined |
| P5c | plugin suggests `{ id: "pagerank", label: "Influence" }` | Accepted; built-in PageRank then becomes `pagerank_2`, also "Influence" |
| P8 | plugin id `acme_reach`, label `Reach in ${hops} hops`; hops 3 then 4 | Same run re-run with hops 4; label still "Reach in 3 hops" |
| P9 | Katz alpha 0.05 then -0.05 | Both names become `katz_alpha_0_05`: same run, params -0.05, label "Reach (alpha 0.05)" |

## Persona tasks

### Analyst Alex (app)

**Task.** Compare unweighted PageRank against PageRank weighted by `trust`, then export both
columns. His persona file says he "compares algorithm results to validate findings" and "adjusts
algorithm parameters".

**What happens.** PageRank names only one setting, damping. Weight is not part of the name, so the
weighted run replaces the unweighted one (P1). The export holds one `pagerank` column, labeled
"Influence", with weighted values. Nothing tells Alex a result was replaced.

The only way to keep both is `as:`. Tier 1 offers no way to name a run, and even with one, Alex
would have to know that weight is not one of the named settings. "Named setting" appears nowhere in
the guide.

### ML engineer (recommendation systems)

**Task.** A nightly headless job computes degree over the whole graph and over the largest
component, and writes `results.<id>.value` into a feature store, one column per run id.

**What happens.**
- The column names depend on run order (P4). If tomorrow's job starts the largest-component run
  first, the feature called `degree` silently holds different numbers.
- `const r = await element.run(...)` returns a `RunResult`, which has `runId` but no label (see the
  blind author's report). The readable column header is only reachable through
  `session.runs.get(r.runId).label`.

### Knowledge engineer

**Task.** Ship a governed style configuration that colors nodes by
`results.org-communities.group`, and replay it into existing sessions.

**What happens.**
- `as: "org-communities"` is accepted (P5a): `RUN_ID_PATTERN` at session/runs/types.ts:55 allows
  hyphens. But the element's own comment, suggestedName.ts:17, says a selector "names it unquoted,
  so no hyphens". So the run's results cannot be written as an unquoted selector.
- Section 11 calls the alphabet lowercase letters, digits and underscore. The code has two
  alphabets: hyphens are allowed for `as:` and refused for a suggestion.
- Replaying the config into a session where an unnamed run already holds the name throws
  E_DUPLICATE_ID (P3). This contradicts "always wins" in both section 11 and algorithms.md:248.

### Plugin author: data scientist porting a metric

**Task.** Port a reach metric with `suggestedName`. The id is constant and the label carries the
hop count, which is a natural reading of the docs ("label, the words the layer list and the
legend show").

**What happens.**
- The second run with a different hop count re-runs in place, and the label stays "Reach in 3 hops"
  over hop-4 values (P8). The label is stored once, when the run is created
  (RunsApi.ts:934-935), and never recomputed on a re-run.
- The rule that the label must change only when the id changes is unstated. Breaking it gives a
  legend that is wrong.

### Plugin author: domain researcher

**Task.** A one-off lab plugin keyed `lab-score` suggests `` `lab-score_${threshold}` ``, copying
its own key.

**What happens.** The plugin defines without error. The first run with a non-default threshold
throws E_BAD_COMMAND (P5b), possibly in a colleague's session long after development. The check
belongs at `defineAlgorithm` time, and the docs should say "your key with underscores for hyphens"
next to the hook rather than one section earlier.

### Plugin author: graph library author

**Task.** Port a library of algorithms, one of them a PageRank variant whose `suggestedName`
returns `{ id: "pagerank", label: "Influence" }`.

**What happens.** It is accepted (P5c). The built-in PageRank then becomes `pagerank_2`, and the
legend shows two "Influence" rows with no qualifier: `labelOf` compares siblings of the same
algorithm only. Saved styles that meant the built-in now point at the plugin.

Nothing reserves built-in ids or namespaces plugin ids. That is part of the one-way door and is
not mentioned in section 11.

### Plugin author: front-end developer

**Task.** A results dropdown shows each run's label, kept in React state from run-change events.

**What happens.** A run's label changes when a sibling appears (RunsApi.ts:1542-1564). The change
event (`announce`) is sent for the run that changed phase, not for the sibling whose label just
changed (plausible, from reading the code). So a cached label for the first run stays unqualified
while the new run's label is qualified. Section 11 does not say labels are live or how to follow
them.

## Defects in the rule itself

- **Two values, one name (P9).** `idPart` (suggestedName.ts:38-43) drops the sign and the
  punctuation, so -0.05 and 0.05, or `1e-7` and `1e7`, give the same id. The second run then
  silently re-runs the first. Negative Katz alpha is unusual. A plugin option that takes signed
  values, or two strings that differ only in punctuation, is not.
- **Labels use two spellings of one setting.** A suggested label says "damping 0.5"; the sibling
  qualifier at RunsApi.ts:1597 uses the raw option name, "dampingFactor 0.5".
- **One named setting per algorithm is too few.** PageRank's weight, Louvain's weight and
  betweenness normalization all change what the numbers mean, but changing them overwrites the
  previous result. The rule in section 11 ("the one setting worth telling two results apart by")
  is a judgment the element made per algorithm, and becomes frozen ids once released.
- **Freed numbers are taken again.** `mintId` (RunsApi.ts:997-1003) gives `_2` to the first free
  number. After a run is removed, its number goes to the next different computation, so a saved
  `results.degree_2` binds to something else.
