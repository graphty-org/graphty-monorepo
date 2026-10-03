# SonarQube backlog baseline

What SonarQube finds in the graphty monorepo today, measured before the pre-push gate is
switched on. These numbers are the starting line for the burn-down: they say how big the
backlog is, where it lives, and which few rules make up most of it.

## Where the numbers come from

The server is the owner's SonarQube Community Build 26.3.0.120487 (its address is `SONAR_HOST_URL` in `.env`; the repository is public, so it is not written here).

The existing `graphty-monorepo` project was last analyzed on 2026-09-20 from commit
`5ba15bb71` (a release commit). Master has moved 1,922 commits since then, so that project
is stale. A fresh full scan of master at commit `f3786c38a` (2026-10-02) was run into a
scratch project, `graphty-monorepo-baseline-probe`, and every table below measures that
scan unless it says otherwise.

The scan used the same settings as the September scan (the `sonar-project.properties` used
then): all packages and `tools/`; `design/`, docs, Markdown, JSON, build output, fixtures
and screenshots excluded; copy-paste detection tightened to 50 tokens / 5 lines.

Three limits of this scan:

- **Tests are not analyzed.** `sonar.test.inclusions` is set but `sonar.tests` is not, so
  test and story files (`**/test/**`, `*.test.ts`, `*.stories.ts(x)`) are dropped from the
  index entirely. Every issue below is in shipped or tooling code. Adding tests later will
  add issues.
- **No coverage.** No lcov report was supplied, so coverage reads 0.0%. That is "not
  measured", not "untested".
- 107 files sit outside any `tsconfig.json` and were analyzed without type information, so
  type-aware rules may under-report on them.

## Headline

| Measure                                           |                Master today (`f3786c38a`) | September scan (`5ba15bb71`) |
| ------------------------------------------------- | ----------------------------------------: | ---------------------------: |
| Lines of code analyzed                            |                                   258,918 |                      168,081 |
| Files                                             |                                     1,257 |                          994 |
| Open issues                                       |                                     3,477 |                        2,992 |
| Issues per 1,000 lines                            |                                      13.4 |                         17.8 |
| Estimated remediation effort                      | 23,003 min (about 383 h, 48 working days) |                   20,495 min |
| Security hotspots (all "to review")               |                                        99 |                          123 |
| Duplicated lines                                  |    20,796 (5.0%) in 394 blocks, 125 files |                19,447 (7.3%) |
| Coverage                                          |                              not measured |                 not measured |
| Ratings: security / reliability / maintainability |                                 A / D / A |                    A / D / A |
| Security review rating                            |                   E (no hotspot reviewed) |                            E |

The code grew by 54% since September while issue density fell by a quarter. The backlog is
large but shallow: almost all of it is maintainability style, with no security issues at all.

## By software quality and severity

An issue can affect more than one quality, so the quality rows overlap (3,382 + 383 is more
than 3,477).

| Quality         | Blocker | High | Medium |   Low | Info |     Total |
| --------------- | ------: | ---: | -----: | ----: | ---: | --------: |
| Security        |       0 |    0 |      0 |     0 |    0 |     **0** |
| Reliability     |       0 |   63 |    127 |   193 |    0 |   **383** |
| Maintainability |       4 |  532 |  1,369 | 1,461 |   16 | **3,382** |
| All issues      |       4 |  581 |  1,496 | 1,466 |   16 | **3,477** |

By legacy type: 3,408 code smells, 69 bugs, 0 vulnerabilities. By language: TypeScript
3,059, JavaScript 403, HTML 12, CSS 3.

### The four blockers

All four are rule S3516, "a function always returns the same value" -- usually a function
whose every branch returns `true`, which makes its return value meaningless to callers.

| File                                              | Line |
| ------------------------------------------------- | ---: |
| `graphty-element/src/data/GEXFDataSource.ts`      |   54 |
| `graphty-element/src/session/project/graphOps.ts` |  472 |
| `algorithms/src/indexed/delta-pagerank.ts`        |  384 |
| `graph-samples/src/generators/geometric.ts`       |  403 |

### The 63 high-severity reliability issues

| Rule                | Count | What it means                                                                                                   |
| ------------------- | ----: | --------------------------------------------------------------------------------------------------------------- |
| S2871 (ts 29, js 5) |    34 | `sort()` without a compare function sorts numbers as strings (`[10, 9, 1]` sorts to `[1, 10, 9]`)               |
| S4335               |    14 | An intersection type that collapses to `never` or to one of its parts -- the type does not say what it seems to |
| S7767               |    12 | Math done with bitwise operators (`x \| 0`, `~~x`) to truncate, which breaks past 32 bits                       |
| S7059               |     2 | A constructor starts an async operation it does not await                                                       |
| S7739               |     1 | An object has a `then` property, so `await` treats it as a promise                                              |

S2871 is the one most likely to be a real bug; each hit needs a look rather than a bulk fix.

## By package

Top-level folders. Effort is SonarQube's remediation estimate in hours.

| Package                 |  Lines | Issues | Per 1k lines | Maintainability | Reliability | Hotspots | Duplication | Effort (h) |
| ----------------------- | -----: | -----: | -----------: | --------------: | ----------: | -------: | ----------: | ---------: |
| graphty-element         | 93,987 |  1,208 |         12.9 |           1,157 |         115 |       15 |        1.3% |        156 |
| graph-io                | 27,842 |    597 |         21.4 |             594 |          98 |        7 |        0.6% |         75 |
| algorithms              | 11,118 |    328 |         29.5 |             328 |          16 |       14 |        3.5% |         31 |
| webgpu-graph-algorithms | 25,717 |    306 |         11.9 |             289 |          37 |       17 |        5.0% |         23 |
| graph-format            | 17,639 |    226 |         12.8 |             221 |          14 |        1 |        1.1% |         27 |
| graphty                 | 25,140 |    177 |          7.0 |             172 |          20 |        3 |        1.0% |         14 |
| graph-samples           | 28,540 |    163 |          5.7 |             163 |          11 |        9 |       44.7% |         12 |
| layout                  |  4,408 |    146 |         33.1 |             146 |          31 |        3 |       10.4% |         12 |
| visual-review           |  9,087 |    137 |         15.1 |             130 |          20 |       15 |        0.6% |         19 |
| remote-logger           |  3,462 |     80 |         23.1 |              74 |          13 |        2 |        0.0% |          6 |
| compact-mantine         |  9,253 |     68 |          7.3 |              68 |           1 |        1 |        0.4% |          6 |
| tools                   |  2,091 |     39 |         18.7 |              38 |           7 |       12 |       11.6% |          5 |
| root config files       |    634 |      2 |           -- |               2 |           0 |        0 |          -- |          0 |

graphty-element holds a third of the backlog, almost all of it under `src/` (1,045 issues);
its `examples/` add 113. graph-io carries the second-largest effort, concentrated in its
importers and exporters.

### Files with the most remediation effort

| File                                                    | Effort (min) |
| ------------------------------------------------------- | -----------: |
| `visual-review/trusted/page/review.js`                  |          658 |
| `graphty-element/examples/xr/xr-pivot-camera-demo.html` |          527 |
| `graph-io/src/formats/json/importer.ts`                 |          404 |
| `graph-io/src/formats/gexf/exporter.ts`                 |          327 |
| `graph-io/src/common/xml.ts`                            |          248 |
| `graph-io/src/common/temporal.ts`                       |          215 |
| `graph-io/src/formats/dot/importer.ts`                  |          206 |
| `graphty-element/src/simple/defineAlgorithm.ts`         |          198 |
| `graph-format/src/columns/column.ts`                    |          192 |
| `graph-io/src/formats/pajek/exporter.ts`                |          188 |

## By rule: the 30 most frequent

The ts and js variants of a rule are counted separately, as SonarQube reports them. These 30
rows cover 2,888 of the 3,477 issues (83%); the first five alone cover 1,603 (46%).

|   # | Rule             | Count | Quality / severity    | What it asks for                                                                 |
| --: | ---------------- | ----: | --------------------- | -------------------------------------------------------------------------------- |
|   1 | typescript:S4782 |   624 | Maint / medium        | Drop `\| undefined` from an optional property already marked `?`                 |
|   2 | typescript:S3776 |   411 | Maint / high          | Cognitive complexity of a function above 15: split it or flatten its branching   |
|   3 | typescript:S1444 |   214 | Maint / low           | Make public `static` fields `readonly`                                           |
|   4 | typescript:S2933 |   196 | Maint / medium        | Mark fields assigned only in the constructor `readonly`                          |
|   5 | typescript:S7748 |   158 | Maint / low           | Write `1` not `1.0`, `0.5` not `0.50`                                            |
|   6 | typescript:S6353 |   105 | Maint / low           | Shorter regex forms (`\d` for `[0-9]`, `{2}` for repeats)                        |
|   7 | typescript:S6582 |    97 | Maint / medium        | Use `a?.b` instead of `a && a.b`                                                 |
|   8 | typescript:S7758 |    89 | Maint, Rel / low      | `codePointAt` / `String.fromCodePoint` instead of the UTF-16 `charCodeAt` family |
|   9 | typescript:S7764 |    76 | Maint / low           | `globalThis` instead of `window` / `self` / `global`                             |
|  10 | typescript:S6759 |    76 | Maint / low           | React props typed as `Readonly<...>`                                             |
|  11 | typescript:S7735 |    71 | Maint / low           | Write `if (x) A else B` rather than `if (!x) B else A`                           |
|  12 | typescript:S7763 |    66 | Maint / low           | `export { x } from "..."` instead of import-then-export                          |
|  13 | typescript:S7755 |    65 | Maint / low           | `arr.at(-1)` instead of `arr[arr.length - 1]`                                    |
|  14 | javascript:S7764 |    58 | Maint / low           | Same as 9, in JavaScript                                                         |
|  15 | javascript:S7772 |    58 | Maint / medium        | Import Node built-ins as `node:fs`, not `fs`                                     |
|  16 | typescript:S7781 |    56 | Maint, Rel / low      | `replaceAll()` instead of `replace()` with a `/g` regex                          |
|  17 | typescript:S7773 |    51 | Maint low, Rel medium | `Number.isNaN` / `Number.parseInt` instead of the coercing globals               |
|  18 | javascript:S3776 |    47 | Maint / high          | Same as 2, in JavaScript                                                         |
|  19 | typescript:S4624 |    47 | Maint / medium        | No template literal nested inside another                                        |
|  20 | javascript:S3358 |    46 | Maint / medium        | No nested ternaries                                                              |
|  21 | typescript:S7772 |    36 | Maint / medium        | Same as 15, in TypeScript                                                        |
|  22 | typescript:S4138 |    34 | Maint / low           | `for...of` instead of an index loop over an iterable                             |
|  23 | typescript:S7778 |    30 | Maint / low           | Combine consecutive `push(a); push(b)` into `push(a, b)`                         |
|  24 | typescript:S2871 |    29 | Rel / high            | `sort()` needs a compare function (see the reliability table)                    |
|  25 | typescript:S1940 |    27 | Maint / low           | `a !== b` instead of `!(a === b)`                                                |
|  26 | javascript:S4624 |    26 | Maint / medium        | Same as 19, in JavaScript                                                        |
|  27 | javascript:S7773 |    26 | Maint low, Rel medium | Same as 17, in JavaScript                                                        |
|  28 | typescript:S107  |    25 | Maint / medium        | Function with more than 7 parameters: take an options object                     |
|  29 | typescript:S2310 |    22 | Rel / medium          | Loop counter reassigned inside the loop body                                     |
|  30 | javascript:S7781 |    22 | Maint, Rel / low      | Same as 16, in JavaScript                                                        |

How the rules sort for a burn-down:

- **Mechanical, safe to bulk-fix** (rules 1, 3, 5, 6, 7, 9, 12, 13, 14, 15, 16, 21, 23, 25,
  30, about 1,700 issues): edits a codemod or an ESLint autofix can make with no change in
  behavior. Rule 1 (S4782) is the exception that needs a decision first: graph-format,
  graph-io, webgpu-graph-algorithms and graphty-element each typecheck their published types
  under `exactOptionalPropertyTypes: true` (`tsconfig.strict-consumer.json`), and under that
  option `prop?: T | undefined` and `prop?: T` mean different things. In public types the
  `| undefined` is deliberate, so S4782 should be turned off (at least for exported types)
  rather than "fixed" -- fixing it would break strict consumers who pass `undefined`.
- **Mechanical but behavior-sensitive** (rules 4, 8, 10, 17, 27): `readonly` and `Readonly<>`
  can break callers that assign; `codePointAt` and `Number.parseInt` differ from what they
  replace on edge inputs. Fix with tests running.
- **Judgment** (rules 2, 18, 19, 20, 26, 28, 29, and S2871): each needs a person to read the
  code. Cognitive complexity alone is 458 issues, most of the 532 high-severity
  maintainability issues.
- **Taste** (rules 11, 22): low value; candidates to disable in a custom quality profile
  rather than fix.

## Security hotspots

99 hotspots, none reviewed (that is what gives the E security review rating). One is high
probability, 48 medium, 50 low.

| Main rules                         | Count | What it flags                                                                                              |
| ---------------------------------- | ----: | ---------------------------------------------------------------------------------------------------------- |
| javascript:S4036 (+ typescript 2)  |    32 | Running an OS command found through `PATH` (`execSync("git ...")`) -- mostly in `tools/` and scripts       |
| typescript:S2245 (+ javascript 6)  |    22 | `Math.random()` used where it might need to be unpredictable -- in graph generators and layouts it is safe |
| javascript:S5852 (+ typescript 11) |    26 | A regex that can backtrack super-linearly on hostile input (denial of service)                             |
| typescript:S5332 (+ javascript 5)  |    14 | A plain `http://` URL                                                                                      |
| Web:S5725                          |     3 | A `<script>` from a CDN without an integrity hash                                                          |
| typescript:S2068                   |     1 | Something that looks like a hard-coded password                                                            |

By package: webgpu-graph-algorithms 17, graphty-element 15, visual-review 15, algorithms 14,
tools 12, graph-samples 9, graph-io 7, graphty 3, layout 3, remote-logger 2, compact-mantine 1,
graph-format 1.

Most of these are reviews, not fixes: marking each "safe" with a reason on the server clears
the E rating. The regex (S5852) hotspots in importers that parse user files are the ones
worth real attention.

## Duplication

20,796 duplicated lines, 5.0% of the code. Two generated dataset files account for 12,883 of
them (62%):

| File                                                          | Duplicated lines |
| ------------------------------------------------------------- | ---------------: |
| `graph-samples/src/datasets/openflights/data.ts`              |            9,886 |
| `graph-samples/src/datasets/political-blogs/data.ts`          |            2,997 |
| `webgpu-graph-algorithms/src/kernels.ts`                      |              382 |
| `webgpu-graph-algorithms/src/layouts/fruchterman-reingold.ts` |              348 |
| `algorithms/stories/utils/graph-generators.ts`                |              335 |
| `layout/stories/utils/graph-generators.ts`                    |              335 |
| `webgpu-graph-algorithms/src/layouts/spring-electrical.ts`    |              320 |
| `graph-samples/src/datasets/celegans-neural/data.ts`          |              307 |
| `graphty/src/components/shell/bindings.ts`                    |              256 |
| `graphty-element/src/session/styles/channels.ts`              |              221 |

Excluding `graph-samples/src/datasets/**` from duplication detection
(`sonar.cpd.exclusions`) would drop the figure to roughly 2%. The two identical
`stories/utils/graph-generators.ts` files in algorithms and layout are a genuine copy.

## Quality gates

Both projects use the default "Sonar way" gate, whose one condition is that new code adds no
new issues (`new_violations = 0`). Both pass today because a first analysis has no "new
code". This is the property the burn-down plan relies on: the gate judges only what changed
since the baseline, so the 3,477 existing issues do not block a push -- as long as the
baseline analysis is kept current and the new-code period is set deliberately.

The Community Build has no branch or pull request analysis, so "new code" is defined by the
project's new-code period (previous version, a number of days, or a reference analysis),
not by the branch being pushed.
