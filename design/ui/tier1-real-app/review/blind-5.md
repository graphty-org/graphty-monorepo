# Blind author review: result values as table columns (section 5, issue #785)

Reviewer role: a third-party developer who sees only the published docs -- section 5 of
`element-api-decisions.md` (Recommended block and example only) and
`graphty-element/docs/guide/*.md`. No repository source was read to write the example. The task
chosen is the capability's most common one: a node table with a PageRank column, highest first.

## The example

`design/ui/tier1-real-app/review/blind-5.ts` (second attempt, 11 lines of code):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const run = element.run("pagerank");
await run;
const path = `results.${run.id}.value`;

const page = element.session.data.nodePage({ columns: [path], sort: { key: path, descending: true }, limit: 10 });
const ranks = page.columns[path] ?? [];

page.records.forEach((node, i) => console.log(node.id, ranks[i]));
```

## Did it compile

Checked with `tsc --noEmit` (strict, ES2022, bundler resolution) against graphty-element's built
`dist/` types with section 5's three signature changes patched into
`dist/src/session/types.d.ts`. Run twice: plain `strict`, and `strict` plus
`noUncheckedIndexedAccess` (the flag graphty-element's own `tsconfig.strict-consumer.json` uses).
Scratch and log: `tmp/api-review/blind-5/proj/`, `tmp/api-review/blind-5/tsc.log`.

| File | strict | + noUncheckedIndexedAccess |
| --- | --- | --- |
| First attempt (followed the guide: `const run = await element.run(...)`, `run.id`) | FAIL: TS2339 `Property 'id' does not exist on type 'RunResult'` | FAIL: TS2339, plus TS2532 `Object is possibly 'undefined'` on `page.columns[path][i]` |
| Final `blind-5.ts` | pass | pass |
| Section 5's own example, verbatim | pass | FAIL: TS2532 on `page.columns[path][i]` |
| The guide's pattern in `algorithms.md` "Custom Styling with Algorithm Results" (`(await element.run("degree")).id`) | FAIL: TS2339 | FAIL: TS2339 |
| Four misuses (below) | pass -- none caught | pass -- none caught |

## Findings

1. **The run id the path needs is not reachable the way the docs show.** Section 5 builds the
   path from a run id; the guide (`docs/guide/algorithms.md`, "Custom Styling with Algorithm
   Results") shows `const run = await element.run("degree")` then `results.${run.id}.value`.
   Awaiting a run yields `RunResult`, which has `runId`, not `id`
   (`dist/src/session/results/types.d.ts:658-660`); only the un-awaited `Run` has `id`
   (`dist/src/session/runs/types.d.ts:461-463`). A newcomer's first try fails to compile. This is
   a published-guide defect today, and section 5 inherits it as its only way to spell a column.
   Fix the guide, and give `RunResult` an `id` (or one name on both objects).

2. **Section 5's example hard-codes `"results.pagerank.value"`, which is probably not the id of a
   default `element.run("pagerank")`.** The guide says the element *derives* a run's id from the
   algorithm, exact-or-sampled, and the scope, including the filter and selection frozen at start
   (`algorithms.md`, "A run's id names its result"). Nothing published says the default id is
   the bare algorithm name. If it is not, the documented example asks for a column no run
   published -- and section 5 does not say what happens then (error? `undefined` array? column of
   missing values sorted last, i.e. a silently unsorted table?). Whichever it is, the canonical
   example must take the id from the run, and an unknown result path should be refused with a
   `GraphtyError`, not degrade silently.

3. **I had to guess the field name `value`.** Section 5 never says which fields a run publishes.
   The guide shows `.value` for degree; PageRank's field name is a guess. `RunResult.fields[]`
   carries a `path: Path` (`dist/src/catalog/types.d.ts:179-189`), which is exactly what a
   column wants, but no doc connects the two, and I cannot tell whether that `path` is the full
   `results.<run>.<field>` or relative. The obvious API -- `columns: [run.fields[0].path]` or
   `columns: [run.column("value")]` -- is not offered. Today the reader must hand-assemble a
   string from three internal concepts (the `results` root, the run id, the field name).

4. **`page.columns[path]` is `readonly unknown[] | undefined` under strict-consumer settings,
   and `unknown` everywhere.** The documented example does not compile under
   `noUncheckedIndexedAccess`, which graphty-element itself requires of consumers
   (`graphty-element/tsconfig.strict-consumer.json`). Section 5 also does not say whether an
   asked-for path is always present in `columns` (so `!` is safe) or can be absent. The values
   are `unknown`, so formatting a PageRank number needs a cast or a `typeof` check per cell. An
   ordered array keyed by the same string you passed in is the shape that forces both problems;
   returning `columns` as an array parallel to the `columns` option, or typing it through a
   generic over the asked paths, would not.

5. **`Path` is `string`, so the types catch nothing.** `Path` is `export type Path = string`
   (`dist/src/catalog/types.d.ts:54-55`), documented as "a JMESPath expression over the
   published result root". All of these compiled with no error (`proj/misuse.ts`):
   `columns: ["pagerank"]` (bare run id), `columns: ["data.weight"]` (an imported attribute in
   path spelling), ``columns: ["results.pagerank.value > `0.1`"]`` (a whole expression -- legal
   if `Path` really is JMESPath), and `sort: { key: "data.weight" }`. Section 5 says only
   "result paths"; it does not say whether `data.*` paths or expressions are accepted, refused,
   or silently empty. `RecordSort.key: string | Path` is literally `string | string`: the
   signature documents an intent the compiler cannot see.

6. **One parameter, two spelling conventions.** The existing `RecordSort.key` takes a bare
   record key (`sort: { key: "weight" }`, `javascript-api.md` "Reading records a page at a
   time"). The style language spells the same attribute `data.weight` (`styling.md`, "A
   record's own fields live under `data.`"). Section 5 makes `key` take `results.x.y` too. So
   `"weight"` and `"results.pr.value"` are accepted, while `"data.weight"` is -- unknown: a
   record key literally named `data.weight`, or the path? The section claims columns "can never
   collide with an imported attribute of the same spelling", but the sort key reintroduces the
   collision: an imported attribute literally named `results.pagerank.value` (CSV headers with
   dots are common) and the result path are the same string in `sort.key`. The project's own rule
   lists "two spellings the element never settled" as a defect. Pick one: either `sort.key`
   becomes a path everywhere (`data.weight`, `results.r.value`), or result sorts get their own
   field (`sort: { result: run, field: "value" }`).

7. **Staleness is undefined for result columns.** The guide's re-read recipe compares
   `page.revision` and listens to `project:changed` and `selection:changed`; `revision` is
   documented to change on record edits, undo, load, selection and set membership
   (`dist/src/session/types.d.ts:101-108`) -- not on a run finishing or re-running. The guide
   also says the sort order "is computed once per revision". Re-running a result "in place" with
   new parameters (`algorithms.md`) would then leave a table sorted by the old values, with no
   event telling it to re-read. Section 5 must say that a run completing (or being removed)
   changes `revision`, and which event to listen to; otherwise the "sort by PageRank" table is
   wrong after the first re-run.

8. **Missing values and scoped runs are under-specified.** A scoped run gives values only to
   nodes in its scope (`algorithms.md`, "Only the scope's elements get values"). Section 5 says
   missing sorts last, but not what the cell holds (`undefined`? absent index?), nor whether
   `scope` on `nodePage` and the run's scope interact. A table whose bottom half is "no value"
   needs to know.

9. **`limit` was a guess from section 5.** Section 5 shows no paging; I only knew `limit`
   because `javascript-api.md` documents `nodePage`. The section's example omits it, so a
   copy-paster gets the silent default page of 100 rows and may believe the table is complete.

10. **Every existing page gains `columns: {}`.** For readers who never asked, that is a new
    always-present key on a public result object; harmless at runtime, but it is a new member
    every mock, test double and `satisfies RecordPage<...>` in a consumer must now supply -- a
    breaking change for anyone who constructs a `RecordPage` (test fakes do). Make it optional or
    only present when asked.

## Places I had to guess

- That a default run's id is not the bare algorithm name (finding 2), so I took it from `run.id`.
- That `run.id` exists only on the un-awaited `Run` (learned from a compile error, not the docs).
- The field name `value` for PageRank.
- Whether an asked-for column can be missing from `page.columns` (I wrote `?? []`).
- That `limit` is how to ask for the top N.
- What happens to the table when the run is re-run or removed.

## Names that misled me

- `run.id` in the guide, which is `runId` on the object `await` actually gives.
- `Path` -- reads like a validated type; it is `string`, and documented as a JMESPath expression,
  which suggests expressions are accepted in `columns`.
- `columns` -- the same word is already `RunResult.column(field)` returning a numeric view; here
  it is a map of `unknown[]`. Two `column` concepts with different shapes.
- `key: string | Path` -- looks like a discriminated choice; it is `string | string`.

## Internal concepts a newcomer must name

- The `results` root of the published-results tree.
- The run id, and how the element derives it.
- The per-algorithm field name (`value`).
- JMESPath-style dotted paths, and the `data.` versus bare-key spelling split.

None of these appear in the task "add a PageRank column to my node table". A simple path that
names none of them would be `nodePage({ columns: [run], sort: { key: run, descending: true } })`,
taking a `Run` (or `RunResult`, or a field descriptor) and defaulting to its primary field, with the
string path kept as the hard-things-possible form.
