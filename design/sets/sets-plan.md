# Sets in graphty-element: implementation plan

Status: plan, ready for execution. It implements `design/sets/sets-design.md` (called "the design"
below; "design 6.2" means its section 6.2). Baseline: master at `3e4e04ff`, graphty-element 2.4.1,
graph-format 1.0.0. Packages changed: graph-format (five mask helpers) and graphty-element. The
graphty app gets one consuming change, its style-layer panel naming the new `scope` selector kind
(design 17; phase 28 found it).

---

## 1. How to use this plan

### 1.1 Shape of the work

- **The owner decides the one-way doors first.** Phase 0 gets a yes or no on every item of design
  15.3 before any phase fixes a public name or a persisted format. Phase 28 only confirms nothing
  changed since.
- **One branch, one pull request.** Everything lands on `feat/element-sets` and merges to master
  once, after phase 28 (merging to master releases). Between phases the branch is never released,
  so a type may be declared a phase before everything that honours it, but no phase leaves a
  public member that throws "not implemented".
- **Every phase is one engineer session** and ends with the phase gate (1.3) green. A phase that
  runs long is split at a test boundary, never left red.
- **No phase before 28 claims CI.** Nothing is pushed until phase 28 opens the pull request, so
  every earlier "Done when" is a local run; CI confirmation of anything is collected in phase 28.
- **Phases only look backwards.** Every "Done when" uses only code built in that phase or an
  earlier one. A phase that finds it needs a later phase's code stops and re-orders this plan; it
  never stubs, `it.todo`s or skips the need.
- **Tests first.** Each phase lists its tests before its code. Write them, watch them fail for the
  stated reason, then implement.
- **Each union is widened in the phase that implements it.** `Scope` gains `{ define }` and
  `Filter` gains `scope` in phase 9, `Filter` gains `item` and `threshold` in phase 11, `Selector`
  gains `scope` in phase 16. No exhaustive switch in the element ever needs a "not yet" branch.
- **Commits** are conventional commits made with `tools/commit-changes.sh` (dry run first). Each
  behaviour change to a published verb or value gets its own `fix(graphty-element):` commit whose
  body is the changelog entry, and only that commit may edit the pre-existing tests the change
  breaks. The commit belongs to the phase whose code first changes observable output, so the
  changelog and the code change land together:

    | Behaviour change (design 15.3 item)                                          | Phase | Pre-existing tests it may edit                                                                                                                                                                                                                                                                                                                                                                                                                                      |
    | ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `scope.save` freezes `"selection"` and `"visible"` (15)                      | 10    | `ScopeApi.test.ts` "reports a set as unbound..." (the `chosen` row: saving `"selection"` without a selection now refuses `E_UNSUPPORTED`)                                                                                                                                                                                                                                                                                                                           |
    | `scope.save` never reissues a removed id (17)                                | 10    | `ScopeApi.test.ts` "catches a ring of saved sets..." (the ring is closed by a redefine instead)                                                                                                                                                                                                                                                                                                                                                                     |
    | `selection.promote` keeps the selected edges (18)                            | 10    | the promote cases in `selection-on-session.test.ts` and `SelectionApi.test.ts`                                                                                                                                                                                                                                                                                                                                                                                      |
    | Dijkstra takes the shortest of parallel edges (19)                           | 20    | `accelerated-adapters.test.ts` "dijkstra costs the merged weight and flags every member of the group" (its route over a parallel pair now costs the cheaper edge, 2, not the summed 3)                                                                                                                                                                                                                                                                              |
    | Scoped runs compute over their scope (14)                                    | 19    | none. Surveyed at the start of phase 18: only a `Graph` runs a real algorithm (a session built without one has no executor and refuses, and every session test hands it a fake executor), and no test that runs through a `Graph` or `AlgorithmManager` names a scope other than `"graph"` or sets a visibility filter first (`test/browser/**`, `test/session/run-executor.test.ts`, `test/ai/**`). A test that later fails on the phase 19 change is a regression |
    | Digest strings become `d1:` (16)                                             | 7a    | digest string literals; the three `ScopeApi.test.ts` cases of the id-based `membershipDigest`, which is deleted (their claims move to `digest.test.ts`)                                                                                                                                                                                                                                                                                                             |
    | Session edge ids are never reissued after a Clear or a replacing import (21) | 4     | `data-manager-store.test.ts` "re-declares the element columns..." (the first edge after the Clear takes counter 1, not 0)                                                                                                                                                                                                                                                                                                                                           |

    Any other failing pre-existing test is a regression, fixed in the element.

- **No `git stash`, `checkout`, `reset` or `switch`.** Set work aside with a WIP commit.

### 1.2 What "built now" and "kept possible" mean here

The design's section 20 has two columns. Every row in "Built now" is built by some phase below
(section 3 maps them). For a "Kept possible" row, only the extension point is built: the reserved
name or field exists in the types or the validator, the doors refuse it with `E_BAD_COMMAND` in
door mode, load mode keeps it opaque (design 12.5), and a test pins both behaviours.

### 1.3 The phase gate

Run at the end of every phase, from the worktree root:

```bash
pnpm exec nx run-many -t build -p graph-format graphty-element
pnpm exec nx run-many -t lint -p graph-format graphty-element     # eslint + tsc + strict consumer
cd graphty-element && npx vitest run --project=default --project=mesh --project=contract --project=xr
npx vitest run --project=bench     # alone: its budgets are wall-clock, and sharing the pool with
                                   # three hundred other files measures the contention, not the code
cd .. && ./tools/run-knip.sh --workspace graphty-element
./tools/check-links.sh --offline
```

The four projects are the ones `test:prepush` runs, so a selection or camera change that breaks
WebXR fails in its own phase. Add `npx vitest run --project=browser <files>` when the phase lists
browser tests, and
`npx vitest run --project=storybook <file>` when it adds a story. Phases that touch graph-format
also run `cd graph-format && npx vitest run && npm run typecheck:strict-consumer`. The `bench`
project is run only to show existing budgets still hold; this plan adds no rows to it. Phase 28
runs the full `pnpm run prepush:fast` and every graphty-element shard.

A "Done when" counts only if it would fail were its claim false. A check behind a skip flag the
gate does not set, or one that becomes true for every adapter once phase 19's mask-back lands,
does not count.

### 1.4 Test conventions

- `assert` from vitest, as the package's house style. `expect` only for async matchers and
  whole-array equality.
- **Property tests** use `fast-check` (already a devDependency of both packages) through one shared
  helper that reads `GRAPHTY_FC_SEED` and `GRAPHTY_FC_PATH`, passes them to `fc.assert` as `seed`
  and `path`, and logs the seed before running, so a CI failure reproduces exactly. 200 cases by
  default; bitmap, algebra, identity and model properties run 1,000.
- **Complexity claims are work counts, never wall-clock.** A timing budget in a pass/fail test
  measures the runner, not the code, and cannot tell O(n) from O(delta) at one size (PR #460,
  issue #446). Each claim is a deterministic count in the `default` project, asserted at two sizes
  to show the scaling. Counts come from an internal counters object the sets modules expose to
  tests, counting invocations of leaf primitives: mask-op calls, hash calls, CSR row visits, and
  id-map lookups (the harness wraps the id map in a counting proxy). An O(delta) claim asserts the
  counts are equal at both sizes. The residual risk is an uncounted per-element loop elsewhere
  (an `Array.from` over a bitmap, say); the recorded timings at two sizes are the backstop.
- **Memory budgets** are asserted on the caches' own byte accounting (bitmap cache, derived-input
  cache, identity column byte lengths), never on process heap. That accounting is itself checked:
  each cache, in the phase that creates it, gets one test that walks its live entries and asserts
  the reported bytes equal the sum of `byteLength` over every typed array reachable from them,
  derived snapshots' columns included. A budget over an under-counting accounting proves nothing.
- **Where a test lives decides where it runs.** The `default` project takes `test/**/*.test.ts`
  and excludes `test/browser/**` and a list of named files. Every new test that needs a DOM,
  `DataManager` or `Graph` therefore goes under `test/browser/sets/`, never beside the module it
  tests in `test/managers/` or `test/session/`.
- **Timings are recorded, not asserted**, by two runners, and every recorded row names its
  runner (design 6.5 lists them):
    - **Node:** graph-format's `npm run benchmark` gains a `masks` group, and graphty-element gains
      `benchmarks/run.ts` (`npm run benchmark`, tsx, results appended to `benchmarks/results/`),
      created in phase 3. It covers only the Node-safe modules under `catalog/sets/` and
      `session/sets/` over the store harness.
    - **Browser:** a `bench-browser` vitest project, created in phase 4, for rows that need
      `DataManager`, `Graph` or a run (load completion, `createFrom`, the freeze row, the scoped
      run). Its files are named `test/bench-browser/*.bench-browser.ts`, a suffix no other project
      includes, and the project includes only that pattern. It prints and appends its numbers,
      never asserts, and is excluded from `tools/ci-test-matrix.mjs` and the phase gate.
      Both run 100k-scale rows by default and the 1M and 10M rows only with
      `GRAPHTY_BENCH_SCALE=large`, and never run in CI. Each row prints beside its design 6.5
      projection; a worse number is reported to the owner, not turned into a gate.
- **Benchmark graphs** are seeded Barabasi-Albert graphs, m = 5 (m = 10 for the 10M-edge rows),
  from `@graphty/graph-samples` in the element runner. graph-format uses its own
  `benchmarks/datasets.ts` (graph-samples depends on graph-format).
- **Goldens for published formats are derived independently of the code under test** (phase 3).

### 1.5 New module layout

```
graph-format/src/util/mask.ts                     + maskAnd, maskOr, maskAndNot, maskXor, maskNot
graphty-element/src/catalog/types.ts              public definition types (design 15.2, first block)
graphty-element/src/catalog/sets/canonical.ts     canonical form (design 12.1)             Node-safe
graphty-element/src/catalog/sets/parse.ts         door-mode and load-mode validators        Node-safe
graphty-element/src/catalog/sets/hash.ts          two-lane member hash, member sum, revision Node-safe
graphty-element/src/data/edgeIdentity.ts          edge counter, repeated-edge survivorship,
                                                  and the identity completion pass            Node-safe
graphty-element/src/session/attributes.ts         + writeAttributes, the one attribute writer
graphty-element/src/session/sets/types.ts         ElementSet, SetStatus, SetOffer, SetChange, SetsApi ...
graphty-element/src/session/sets/store.ts         the keyed slice, issued-id register, tombstones
graphty-element/src/session/sets/prepare.ts       pure prepare(records, command) for the five operations
graphty-element/src/session/sets/resolve.ts       synchronous bitmap resolution of every Scope form
graphty-element/src/session/sets/path.ts          path resolution and pathKind
graphty-element/src/session/sets/cache.ts         resolution cache, summary cache, pins, byte accounting
graphty-element/src/session/sets/signature.ts     input signatures and the per-epoch memo
graphty-element/src/session/sets/dependencies.ts  the dependency walk and cycle detection
graphty-element/src/session/sets/notify.ts        internal change notification and re-resolution scheduler
graphty-element/src/session/sets/status.ts        SetStatus derivation
graphty-element/src/session/sets/captures.ts      held-item captures on re-run
graphty-element/src/session/sets/algebra.ts       combine and its edge rule
graphty-element/src/session/sets/offers.ts        offers from result shapes, memberships
graphty-element/src/session/sets/SetsApi.ts       session.sets
graphty-element/src/session/sets/index.ts         barrel
graphty-element/src/algorithms/input/ScopedInput.ts      the input accessor and derivation chain
graphty-element/src/algorithms/input/derivedInputs.ts    reference-counted derived-input cache
graphty-element/src/algorithms/input/maskBack.ts         central mask-back of published values
graphty-element/benchmarks/run.ts                 non-gating Node timing runner
graphty-element/test/bench-browser/*.bench-browser.ts   non-gating browser timing rows
graphty-element/test/browser/sets/                every sets test that needs the browser project
```

Everything under `src/catalog/sets/` and `src/session/sets/` must stay Node-safe
(`test/packaging/node-safe-entries.test.ts`): type-only imports of anything that reaches
Babylon.js, Lit or the DOM.

---

## 2. Phases

### Phase 0. The owner's decisions

**Goal.** A yes or no on every one-way door before anything depends on it.

**Work.** Present to the owner, one line each with its recommendation:

- design 15.3 items 1 to 26 (items 17 to 21 are the never-reissue, promote, Dijkstra,
  source-column and edge-counter decisions; items 22 to 26 are where `ScopeInput` is published,
  the empty-run and unknown-id refusals, the empty-save refusal and canonical undirected ends);
- every new public name checked against the studio glossary (`design/ui/framework/glossary.md`) as
  it stands that day, with each difference and the reason design 19 gives.

Record each answer in design 15.3 beside its item, with the date. A "no" is resolved in the design
before phase 1. If item 20 is "stamp it now", phase 4 stamps `graphty.source` at load completion
and exposes it as a `categories` target.

**Done when.** Every item has a recorded answer.

---

### Phase 1. graph-format: mask algebra

**Goal.** The five word-wise helpers of design 7, exported from the graph-format root.

**Tests first.**

- `graph-format/test/util/mask.test.ts` (extend): each helper on empty, one-word, multi-word and
  non-multiple-of-32 lengths; `maskNot` never sets bits at or above `length`; length mismatch
  throws `E_MASK_LENGTH` through `checkMaskLength`; the result is a fresh array, inputs unchanged;
  an `out` argument, when passed, is written in place and returned.
- `graph-format/test/util/mask.property.test.ts` (new): against a `boolean[]` model, for random
  lengths 0 to 2,000 and random bit patterns, every helper equals the model; De Morgan,
  `andNot(a, b) == and(a, not b)`, `xor(a, b) == andNot(or(a, b), and(a, b))`, and `maskCount`
  after each equals the model's count.
- `graph-format/test/index.test.ts`: the five names are exported from the root.

**Code.** `graph-format/src/util/mask.ts`: `maskAnd(a, b, length, out?)`, `maskOr`, `maskAndNot`,
`maskXor`, `maskNot(a, length, out?)`, each one loop over `bitmapWordCount(length)` words, the tail
word masked. Exported from `graph-format/src/index.ts`, TSDoc citing the packed layout.

**Recorded timings.** A `masks` group in `graph-format/benchmarks/run.ts`: `makeMask`, the five ops
and `maskCount` at 100k and 1M nodes, the induced edge mask, and `inducedSubgraph({ mask })` at 50%
and 10% with retained bytes.

**Done when.** The property test passes 1,000 cases; `typecheck:strict-consumer` passes; the
`masks` group prints; the commit is `feat(graph-format): word-wise mask algebra`.

---

### Phase 2. Definition types, canonical form and the door-mode validator

**Goal.** The runtime-free types and the one function that canonicalises every definition
(design 4.1, 4.3 types, 5.1, 12.1, 15.1). Nothing is wired into the session yet.

**Tests first.**

- `test/catalog/sets/canonical.test.ts`: key order; absent optionals omitted; path step `null`
  kept; member sort (numbers before strings, `1` and `"1"` both kept, duplicates dropped); edge
  member sort by (source, target, id, key, ordinal, among), absent before present; path order
  kept, step groups sorted; `all` / `any` operand order kept; a one-leaf expression tree becomes
  the bare query; fixed `"clipped"` becomes `"listed"`; unknown kinds untouched.
- `test/catalog/sets/parse.test.ts`, door mode: every refusal of design 4.3 and 15.2 that does
  not need a graph (malformed kinds, both or neither of `id`/`key`/`ordinal`, `ordinal` without
  `among`, `key` present (reserved), path `edges` length not `nodes.length - 1`, `NaN` and
  infinities, a `within`, a `dataSource`, a `weights`, an unknown kind or field, a session
  `EdgeId` string where a stable member is needed, an `edges` leaf in a rule read `induced`), each
  `E_BAD_COMMAND` with `details.reason` where the design names one. The `threshold` and `item`
  refusals belong to phase 11, which adds those leaves: until then both are unknown leaf kinds,
  refused as such.
- `test/catalog/sets/parse.load.test.ts`, internal load mode: an unknown leaf, a known leaf with an
  unknown field (`range.op`), and a definition with an unknown top-level field each load, are
  flagged opaque with the first unknown kind or field named, and canonicalise value-identical.
  (`ItemKey.op` is pinned in phase 11 with the `item` leaf; unknown top-level fields of the
  stored record, such as `meta`, are carried through by the store and pinned in phase 6.)
- `test/catalog/sets/canonical.property.test.ts`: over generated definitions (fixed, rule trees to
  depth 4, paths, opaque leaves), `canonical(canonical(d)) == canonical(d)`; permuting member
  arrays does not change it; `parse(JSON.parse(JSON.stringify(canonical(d))))` deep-equals it.
- `test/catalog/sets/colon-rule.test.ts`: every built-in leaf kind, definition kind, `Scope`
  keyword and `SetCreatedFrom` kind is colon-free; a `<package>:<kind>` leaf is refused in door
  mode and opaque in load mode.

**Code.**

- `src/catalog/types.ts`: `SetId`, `ScopeId = SetId`, `EdgeReading`, `EdgeMember`, `EdgeRef`,
  `SetDefinition`, `SetDefinitionInput`, `ResultItem`, `ItemKey`, `SetCombine`, `SetCreatedFrom`,
  `SetOperand`, `PathKind`. Each union's TSDoc says "OPEN UNION: kinds may be added in a minor
  release; handle unknown kinds", and each open interface says it may gain optional members.
  `SetDefinition`'s rule arm types `where` as `Query | Filter`, `Filter` imported by type from
  `session/visibility/filter.ts` until it moves in phase 9.
- `src/catalog/sets/canonical.ts`, `src/catalog/sets/parse.ts`: `parseSetDefinition` (door mode,
  exported) and an internal `loadSetDefinition` (load mode, returns `{ definition, opaque?:
{ first: string } }`). One validator with a mode flag.
- Export `parseSetDefinition` and the types from the package-root entry files `catalog.ts`,
  `schema.ts` (types only) and `session.ts`.
- The validator is its own walker, not the visibility filter's `assertFilter`: every refusal here
  is `E_BAD_COMMAND` (the filter uses `E_BAD_QUERY` and `E_OPTION_RANGE` for some), and load mode
  needs to keep unknown content, which `assertFilter` cannot. Phase 9, which moves `Filter` into
  `catalog/types.ts`, is where the two can be unified if the codes are reconciled.

**Done when.** All listed tests pass; `node-safe-entries.test.ts` passes; `parseSetDefinition` is
importable in plain Node from `./catalog`.

---

### Phase 3. Member hashes, the revision and the benchmark runner

**Goal.** The hash functions of design 12.2 and the `r1:` revision, with independently derived
goldens; the element's timing runner.

**Tests first.**

- `test/catalog/sets/hash.golden.test.ts`, derived without `hash.ts`. The test holds its own
  reference FNV-1a-32 loop over a literal `Uint8Array`:
    - the reference loop gives the published FNV-1a-32 vectors ("" is 0x811c9dc5, "a" is
      0xe40c292c);
    - the reference loop is parameterised by basis and multiplier; for an ASCII string id, lane A
      of `hashNodeId` equals it with lane A's basis and multiplier over `0x24` followed by the
      characters, and lane B equals it with lane B's basis and multiplier;
    - a numeric id equals the reference over its tag and eight hand-written little-endian float64
      bytes; `hashNodeId(1) !== hashNodeId("1")`; `1e21` matches its hand-built bytes (a toString
      path would hash "1e+21"); `-0` equals `+0`;
    - an id with a character above 0xFF and a non-BMP character is hashed one step per UTF-16 code
      unit, checked against hand-built unit sequences;
    - edge members (directed and undirected, each discriminator) are checked against the unit
      sequences design 12.2 writes out, built by hand in the test, starting with its worked example;
      the revisions of one fixed, one rule and one path definition against compositions of the
      reference values.
      Only after these pass are the hex values written as frozen literals, with a comment that a change
      bumps the prefix to `r2`.
- `test/catalog/sets/hash.property.test.ts`: the member sum is order-free; adding then removing a
  delta returns the original; `sum(A) + sum(B) == sum(A union B)` for disjoint A, B; the undirected
  edge hash is symmetric in its endpoints and the directed one is not; a revision does not change
  under member permutation or rename. Over at least 10,000 distinct generated memberships of small
  graphs, member sums are pairwise distinct (with 64 bits a collision means a bug), and both lanes
  take more than one value.
- Work count: `revisionOf` of a fixed definition hashes each member once (counter equals k at 1,000
  and 100,000 members).

**Code.** `src/catalog/sets/hash.ts`: `hashNodeId`, `hashEdgeMember(member, directed)`,
`memberSum`, `addToSum`, `subtractFromSum`, `revisionOf(definition)` (canonical JSON with fixed
member arrays replaced by `{"count":k,"sum":"<hex>"}`). Two 32-bit FNV-1a lanes with the constants
of design 12.2, `Math.imul`, little-endian float64 bytes through a shared `DataView`.

`graphty-element/benchmarks/run.ts` and its harness, in the shape of graph-format's; first row:
`revisionOf` at 100k (1M under `GRAPHTY_BENCH_SCALE=large`). graphty-element gains
`@graphty/graph-samples` as a devDependency and a knip entry for `benchmarks/`. No tsconfig
project reference: graphty-element's tsconfig declares none and resolves its workspace
dependencies, graph-format included, through their built `dist`.

**Done when.** Golden, property and work-count tests pass; `npm run benchmark` prints.

---

### Phase 4. Data layer: stable edge identity and hash columns

**Goal.** Edge ids are never reissued, session edges get minted ids, and every row carries its
stable-identity column values (design 4.2, 12.2, 12.3). This phase asserts column values only;
binding members to them needs the store and resolution (phase 7b).

**Tests first.** The identity logic lives in a Node-safe module and runs at `GraphStore` freeze,
so every store gets the columns whoever loads it, and most tests run in the `default` project
against production code; only the `DataManager` wiring needs the browser project.

- `test/data/edgeIdentity.test.ts` (default), over a real `GraphStore`: - The counter survives Clear and a replacing import: the first edge after either gets a counter
  id larger than any issued before (today it restarts, `GraphStore.ts:124`). `resumeEdgeCounter
(n)`, for the future embedded-graph load, continues one past n. A store built without a
  counter object starts at 0, as today. - A standalone `createGraphSession` (its own `GraphStore`, no `DataManager`, `GraphSession.ts:567`)
  with edges added through the session carries all four identity columns after a freeze. - A snapshot without the columns (a raw graph-format or graph-io snapshot) gets its hashes
  computed lazily from its ids on first read, equal to what the completion pass would write. - The survivorship function returns, for each of the seven policies, the decision
  `DataManager.ts:1207-1219` makes today (a table test over (policy, known, record)). - An edge added without a file id reads `graphty:e<n>` as its stable id. - The completion pass fills `graphty.edgeOrdinal` and `graphty.edgeAmong` with, per pair, the
  position among the pair's surviving edges in that load and their count; a pair is unordered
  unless declared directed at ingest; `directed: "auto"` settling later changes nothing; a
  chunked additive load gives the same columns as one chunk. - One test per `repeatedEdges` policy, all seven (`keep`, `error`, `first`, `last`, `sum`,
  `min`, `max`): ordinal and among count surviving edges only (design 12.3), including the three
  merging policies and the `last` path that replaces the edge record. - After a replacing re-import that dropped one of three parallel edges, and after a second Add
  data load touching a pair of the first: the columns hold the values design 12.3 derives, and
  the first load's columns are unchanged. - `graphty.nodeHash` and `graphty.edgeHash` equal `hashNodeId` / `hashEdgeMember` of the row's
  stable identity, for loaded and session-added rows, and survive a freeze unchanged. - Deleting an edge never changes another edge's ordinal. - Byte accounting: identity columns 8 bytes per node and 16 per edge; the pass's transient
  buffers 20 bytes per loaded edge and 4 per node.
- `test/browser/sets/DataManager.identity.test.ts` (browser): after a load of each data source
  kind and after `addNodes` / `addEdges`, the frozen store carries the columns; `DataManager` makes
  its survivorship decisions through the Node-safe function.

**Code.**

- `data/edgeIdentity.ts`:
    - The counter object. `GraphStore.nextEdgeId()` stays the call site (`ingest.ts:163` and
      `graph-store.test.ts` keep calling it), backed by an optional counter passed in through
      `GraphStoreOptions`. `DataManager` and `GraphSession` each own one and pass it to every store
      they build, so it survives `resetStore` (`DataManager.ts:475-482`); `resumeEdgeCounter`.
    - The repeated-edge survivorship decision moved out of `DataManager.ts:1207-1219` as a pure
      function (policy, known, record) returning a decision; the store write stays in
      `DataManager`.
    - The completion pass, run by `GraphStore` at freeze: sort the load's surviving edge rows by
      (pair, counter) in a transient typed array and fill ordinal, among and the hash columns in one
      pass, writing `nodeHash` for new nodes. `DataManager` does not call it.
- Declare the four builder columns in `GraphStore` beside `graphty.edgeId` (`GraphStore.ts:49-53`).
- An internal `stableEdgeMember(row)` that builds an `EdgeMember` from a row's columns.
- The `bench-browser` project (1.4), with its first row.
- The byte-accounting walk (1.4) for the identity columns.

**Recorded timings (browser runner).** Load completion at 100k (1M / 10M large). Measured on the
`GraphStore` a `DataManager` owns, ingested through the same `ingestNode` / `ingestEdge`, because
`DataManager` refuses any load above the render ceiling (`DEFAULT_LIMITS.edgesDrawn`, 100,000
edges); the completion pass and the freeze belong to the store alone.

**Done when.** All tests pass, including every existing `DataManager`, `GraphStore` and
`GraphSession` test unmodified, with the whole browser project's data-source tests run in this
phase; `npx vitest list --project=default` names no file under `test/bench-browser/` or
`test/browser/sets/`.

---

### Phase 5. Attribute revisions, the input tick and execution tokens

**Goal.** The three counters every signature reads (design 5.2, 6.2), and one writer for
attributes so no cache can miss a bump.

**Tests first.**

- `test/session/attributes.revision.test.ts` (the writer alone) and
  `test/browser/sets/attributes.revision.test.ts` (through `Graph` and `DataManager`, which the
  `default` project cannot run; see 1.4): `updateNodes` on both queue paths writing `label`
  bumps the revision of `label` only; writing `data.weight` bumps `weight` only; ingest bumps every
  field it writes; a write that changes no value still bumps.
- `test/session/single-attribute-writer.test.ts`, static, in the style of
  `no-direct-graph-reads`: fails on `Object.assign(<x>.data` or `.data =` anywhere under `src/`
  outside `writeAttributes` and an explicit allowlist with reasons (the `Node` and `Edge`
  constructors, `Node.ts:248` and `Edge.ts:273`; `GraphSession.ts:255`, which assigns session
  parts, not attributes). Two pre-freeze ingest writes need no allowlist entry because neither
  writes `.data`: the merged weight written through `builder.setEdgeWeight` and the `last`
  policy's replacement of a pending record (`known.pending.record`). The browser test shows the
  snapshot serial covers them: a serial read before such a merge differs after the freeze. The other
  branch, `known.edge.data = record` (`DataManager.ts:1218`), replaces a live edge's attributes on
  a later additive load, so it is not allowlisted: it goes through `writeAttributes`, and a test
  shows a second load under `last` bumps the revision of every field it writes.
- `test/session/input-tick.test.ts`: every attribute-revision bump, mask-version bump,
  execution-token mint and freeze advances the session input tick; nothing else does.
- `test/session/runs/execution-token.test.ts`: each execution of each run gets a token distinct
  from every other in the session (1,000 re-runs); a token is a session nonce plus a session-wide
  counter; it is stored on the run's result entry and read back from there; two sessions never mint
  equal tokens.

**Code.** `session/attributes.ts`: `InputTick`, `AttributeRevisions` (one per element kind,
keyed by top-level field) and `writeAttributes(revisions, data, update, fields)`, the only function
that merges into `.data`, beside `replaceAttributes(revisions, owner, record)` for the `last`
policy's wholesale replacement (it bumps every field of the old and the new record). The counters
are keyed by the object the session is handed as its store (`inputCountersOf(owner)`, a side table,
so the published `SessionGraphStore` gains no member): `DataManager` hands its counters to every
`GraphStore` it builds, as it does the edge counter, and a headless session's `GraphStore` keys its
own. Route through them: `Graph.updateNodes` (both queue paths; `id` is the address and is no
longer written into `data`), the ingest paths (every top-level key of every ingested record, bumped
once per batch) and both branches of the `last` policy (the pending-record branch bumps too, though
it writes no `.data`). The tick is advanced by `AttributeRevisions.bump`, by `GraphStore` at the
freeze commit, by an `onVersion` hook `ElementMask` calls on every version bump (the visibility and
selection masks pass the tick), and by the execution minter. `inputCountersOfSession(session)` reads
a session's counters. The token is minted by `createExecutionMinter` in `session/runs/RunsApi.ts`
when a run's work starts (`RunSurroundings.mintExecution`), held on the run beside its result, and
written onto `ResultsRunEntry.execution`; `resultExecutionOf(results, run)` in
`session/results/ResultsApi.ts` reads it back. All internal.

**Done when.** Tests pass; the existing `bench` project still passes.

---

### Phase 6. The sets store and the synchronous doors (internal)

**Goal.** The slice-shaped store and every write that resolves nothing (design 3, 4.6, 12.4, 13).
Constructed by the session, not yet exposed as `session.sets` (phase 10).

**Tests first.** `test/session/sets/store.test.ts`, `prepare.test.ts`, `store.property.test.ts`:

- Minting: the first mint of a name is byte-identical to today's `ScopeApi` mint (`ScopeApi.ts:
984-993`), pinned against the current function's output for 20 names; `set_<slug>_2`, `_3` skip
  the committed register, live ids and ids pending in the open write group; a slug never contains a
  dot; create, remove and create "Suspects" gives two different ids.
- Names: trimmed, never empty, unique among live sets (case-sensitive), "Set N" picks the smallest
  free N; `list()` sorts by `order`, ties by id; a restored duplicate name is tolerated.
- Records: `get` and `list` return the same frozen object until that record changes; a rename
  keeps the id and `revision`; a redefine that changes only `reading` shares the member arrays with
  the prior record (reference equality); the caller's input is cloned.
- No-ops record and emit nothing: a rename to the same name, a redefine to the same canonical
  definition, `addMembers` of present ids, `removeMembers` of absent ids.
- `removeMembers({ nodes: [u] })` also removes every edge member incident to u.
- `addMembers` / `removeMembers` refuse a non-fixed set (`E_BAD_COMMAND`), an opaque definition
  (`E_UNSUPPORTED`, `opaque-content`), an `EdgeId` the graph does not hold (`E_BAD_COMMAND`), and a
  set holding more than 1M edge members (`E_TOO_LARGE`).
- A door given a session `EdgeId` stores the stable `EdgeMember`; `get()` never returns a counter id.
- Work count: `addMembers` of 3 members makes 3 hash calls and 3 `addToSum` calls on a 500-member
  set and on a 500,000-member set, and the memoised revision equals a from-scratch `revisionOf`.
- Tombstones: removing writes `{ id, name, record }`; an undo-shaped `put` of the record makes the
  tombstone non-authoritative; the record store is byte-capped (by its own accounting) and drops
  oldest first while keeping id and name.
- Unknown top-level record fields survive `rename` untouched.
- `set:changed` plumbing: one event per touched key after the write, with `fields`; none for a
  no-op.
- Property (1,000 random sequences of the five operations and internal put/delete): no id is ever
  issued twice; every live record passes the validator; `order` values are distinct; the register
  only grows.

**Code.** `session/sets/store.ts` (`put`, `delete`, the register, tombstones, a committed-diff
listener), `session/sets/prepare.ts` (pure: validate, clone, canonicalise, deep-freeze, carry
unknown fields; one function per operation `set.create`, `set.rename`, `set.redefine`,
`set.members`, `set.remove`), `session/sets/types.ts`, and the synchronous half of
`session/sets/SetsApi.ts`. A fixed set's edge members are held in typed arrays with interned ids
(design 6.1) and `definition.edges` is materialised on first read. The binding side table
(`WeakMap` from record to `{ store, counterIds }`) is created here, empty until phase 7b.

**Done when.** Tests pass; a test fails if anything outside `session/sets/` imports `store.put` or
`store.delete`.

---

### Phase 7a. Bitmap resolution of nodes, induced sets and the digest

**Goal.** Every existing `Scope` form and every fixed induced set resolves to a node bitmap and an
edge bitmap; `ResolvedScope` becomes lazy; the digest becomes `d1:` (design 4.1, 4.2, 6.1, 6.3,
6.4). **`resolveScope` is synchronous**: the style and visibility passes need an answer in the
pass; the public doors that resolve (`createFrom`, `combine`, `createPath`) wrap it.

**Tests first.**

- `test/session/sets/resolve.test.ts`: `"visible"` and `"selection"` pack the byte masks once per
  mask version; `"visible"` reads clipped; `"largest-component"` is weakly connected, ties to the
  lowest label; `{ nodes }` ignores missing ids and reports them; a fixed induced set derives its
  edges. Every resolution satisfies the endpoint invariant.
- Work counts, at 1,000 and 100,000 nodes: `"graph"` makes zero edge walks; the induced edge
  derivation makes one CSR pass; resolving a fixed set of k ids makes k id-map lookups.
- `test/session/sets/resolve.property.test.ts` (the oracle): on generated graphs up to 300 nodes
  with parallel and reciprocal edges, a naive model (plain `Set`s and loops) and the resolver agree
  for every legacy `Scope` form and fixed induced definitions.
- `test/session/scope/digest.test.ts`: `digest` is `d1:<hex>`, equal for equal memberships reached
  by different specs, distinct for the distinct memberships the oracle generates, not built until
  read, memoised on the resolution.
- `ResolvedScope.nodes` / `.edges` are built on first read only (getter spy) with the same
  contents as before (every existing `ScopeApi.test.ts` case passes unmodified).

**Code.**

- `session/sets/resolve.ts`: `Resolution { nodes: U32; edges: U32; serial; store; missingNodes;
missingEdges }`, `resolveScope(scope, context)` where `context` carries the context snapshot
  (the full graph today; the future `within` evaluates here), the id maps, the masks, the query
  engine and the store. Readings applied once at the root.
- `session/scope/ScopeApi.ts`: `resolveNow` and `count` go through `resolveScope`;
  `membershipOf` (about line 772) builds lazy getters; `membershipDigest` becomes the masked sum
  over the hash columns (`digestOf` in `resolve.ts`, `membershipDigestOf` in `catalog/sets/hash.ts`).
  The run staleness reads (`RunsApi.ts` `shouldReexecute` and `staleOf`) need no change: the
  resolver's frame serves the same resolution until the snapshot or a mask version moves, and the
  digest is memoised on the resolution, so they sum only when the serial or signature changed.
  `{ where }` still re-resolves on every read until phase 8's signatures replace the frame.
  `ResolvedScope` TSDoc says `nodes` and `edges` are lazy.
- The camera path (`applyCameraView(view, { scope })` in `Graph.ts`) reads the bitmap through
  the internal `ScopeResolver.nodeIdsOf`.
- A fixed set read `listed` with edge members refuses with `E_UNSUPPORTED` (internal only) until
  phase 7b builds the binding table; its endpoints-only use (the induced reading) resolves now.
- The `d1:` digest change in its own `fix` commit (section 1.1).

**Recorded timings (Node runner).** `resolveNow({ nodes })` at 50%, a fixed 50% set, the induced
edge pass and the `"visible"` digest, each beside the old `Set`-based cost.

**Done when.** The oracle passes 1,000 cases; every pre-existing scope, run, selection and
visibility test passes unmodified except digest literals (`d1:`).

---

### Phase 7b. Listed edge members, paths, rebind and the re-freeze model

**Goal.** Listed edge members and paths resolve through the binding table, and every stored set
survives any sequence of graph edits and re-freezes (design 4.2, 4.4, 12.3).

**Tests first.**

- `resolve.test.ts` extended: a fixed listed set resolves its edge members through the binding
  table (a linear merge when the edge-id column is monotonic, binary search otherwise, both
  tested); a path resolves distinct nodes and the named edges, a `null` step every edge between the
  pair, `directed: true` only forward edges; a step whose edges are all gone counts missing.
- The oracle extended to listed and clipped readings and paths.
- `test/session/sets/rebind.test.ts`: a replacing import of the same file rebinds edge members by
  stable identity; a replacing import of a different graph with identical counts leaves every
  member missing; and the four binding cases of design 12.3 (re-import dropping one of three
  parallel edges; `edgeIdPath` configured between save and re-import; two Add data loads on one
  pair read `ambiguous-parallel-edge`; a second Add data load leaves the first load's members
  bound).
- The two embedded-graph cases of design 12.3, against a store rebuilt from the saved builder
  columns (edge id, ordinal, among, hash) with the counter resumed, with node order and the order
  of id-bearing edges shuffled by a seeded permutation (order within each parallel pair kept): the
  member binds the same edge with its revision unchanged; the old ordinal member reads missing and
  never binds the new minted edge.
- `test/session/sets/refreeze.model.test.ts`, the stateful model (`fc.commands`, 1,000 sequences,
  `default` project, over the store harness of `ScopeApi.test.ts` calling the production
  `data/edgeIdentity.ts`, survivorship included, so the harness never re-implements which edges
  survive): commands add or remove a node or edge (including parallel and reciprocal edges, and
  deletions in the middle of the id range), freeze, replace import, an additive second load onto
  a shared pair, a change to `edgeIdPath`, a graph declared directed at ingest, create or redefine
  a set, `addMembers`, `removeMembers`; each load draws its `repeatedEdges` policy from all seven.
  After every command, for every live set, the resolution mapped back to ids equals the model's id
  sets, missing counts equal the model's, the endpoint invariant holds, and the digest equals the
  model's masked sum.
- `test/browser/sets/refreeze.model.test.ts`: 100 sequences of the same model driving the real
  `DataManager`, with replace import and the additive second load, the policy drawn per sequence.

**Code.** The binding table on the phase 6 side table; `session/sets/path.ts`: path resolution.

**Recorded timings (Node runner).** First resolution of a large listed set.

**Done when.** The extended oracle and the model pass 1,000 cases each; the browser variant
passes.

**As built.**

- The binding is seeds plus identity (design 4.2): the store keeps, per set id, the counter each
  door-added member entered through, and a member binds that edge while the snapshot holds it,
  else by stable identity. The side table is keyed by the frozen definition, not by record and
  store, because the store a resolution is tagged with is the `DataManager`, which a replacing
  import does not replace, and a session-unique counter needs no store tag. `Resolution` gained
  `ambiguousEdges`; for a path, `missingEdges` counts steps and `missingNodes` distinct walk nodes.
- The model's data layer is `test/session/sets/graphs.ts` (production store, `ingestEdge`,
  `decideRepeat` and door), and the model itself `test/session/sets/refreeze-model.ts`, shared by
  the Node and browser runs through one driver interface. It also re-imports every load of the
  current store (optionally dropping one record) and rebuilds the store from its saved columns,
  because those are where rebinding and ambiguity happen. The browser run draws the policy per
  load, not per sequence, and leaves out the two ops the data manager has no route for yet (an
  embedded-graph load, a declared direction in JSON).
- The model found a data-layer defect, fixed here: `GraphStore` completed a load at the next
  freeze instead of when it closed, so a second load opened before a freeze merged into the first
  and a removal made after a load moved its ordinals. `closeLoad` now completes it (design 12.3).
- Recorded (Node runner, i9-14900, Node 22): first resolution of a listed set of 250k of 500k
  edges, 67 ms by identity and 81 ms seeded; of 1M of 5M edges, 733 ms by identity and 406 ms
  seeded. No projection is stated for this row; it is several times the 85 ms of a 1M fixed node
  set, so it is reported to the owner. By identity repeats its edge pass on every new snapshot
  until phase 8's cache and signatures; seeded repeats only the merge.

---

### Phase 8. The resolution cache and the record round trip

**Goal.** Pull-based caching keyed by exactly what a definition reads (design 6.2, 22 item 7), and
proof that a stored record survives JSON into a fresh session.

**Tests first.**

- `test/session/sets/cache-inputs.test.ts`, the cache audit. One table lists every cache
  (signature memo, resolution, summary, digest; phases 14 and 18 add rows for offer edge counts
  and derived inputs) against its full input list. For each (cache, input) pair one test
  changes only that input and asserts a miss, and one changes an input the entry does not read and
  asserts a hit. Inputs: snapshot serial, store instance, attribute revision of a read and of an
  unread field, visibility and selection mask versions, execution token of a read run, an execution
  token put by internal load (as a file load will), record identity of a named set, a rename of a
  named set (hit), an unrelated set write (hit), an absent-id marker, the configured `edgeIdPath`
  (the re-import that applies it misses the binding; configured alone it reads nothing and hits),
  a reading-only redefine (misses the resolution, shares the member arrays).
- The latent defect of design 1.1 item 5: a saved `{ where }` over `results.pr.*` re-resolves after
  `pr` re-runs with no data change.
- Undo-shaped restore: `put` of the identical frozen record after a redefine hits the cache again.
- Byte accounting: filling past 64 MB evicts unpinned entries oldest first; pinned entries may
  exceed the bound; 16 MB stays available for unpinned entries; the summary cache holds one entry
  per set key under a 10,000-update stream. The accounting walk (1.4) for the resolution and
  summary caches.
- Work count: a diamond of four rule sets over one base walks the base's signature once.
- The stateful model of phase 7b gains one check: every served resolution equals a fresh uncached
  resolution, and no entry from an older serial is ever served.
- `test/session/sets/record-roundtrip.property.test.ts`: build a random session (records including
  opaque ones: an unknown leaf, an unknown field, a `meta`), export them with the store's
  `toLogicalRecords()` (id, name, order, definition with materialised edges, createdFrom, unknown
  fields, the register and tombstones), `JSON.stringify`, `JSON.parse`, and load them with
  `loadLogicalRecords()` (load-mode validation, then `put`) into a new session over the same
  graph loaded with node order and the order of id-bearing edges shuffled by a seeded permutation
  (order within each parallel pair kept, since ordinals depend on it) and the edge counter started
  at a different value. Ids, names, order, canonical definitions and revisions are identical;
  resolutions are equal as id sets, not as bitmaps; the register and tombstones survive. A variant
  configures `edgeIdPath` only in the target session and the ordinal members still bind (design
  12.3 rule 4).

**Code.** `session/sets/signature.ts`, `session/sets/cache.ts`; `resolveScope` consults both. The
old frame cache in `ScopeApi.ts:510-555` and its `isPredicate` bypass are deleted. The internal
`toLogicalRecords()` / `loadLogicalRecords()` on the sets store: the one serialiser the round trip
proves, and the one a project file or an undo slice must use (phase 28 names it in design 13.4).

**Done when.** Every row the audit table has by this phase is filled and every test passes.

**As built.**

- `session/sets/signature.ts` builds `<store>|<serial>|<parts>` and memoises the parts of named
  referents per epoch (store, serial, input tick, and the identity of the saved-scope map and the
  kept-set list). `session/sets/cache.ts` holds `SetsCache` (resolutions, summaries, the memo),
  `resolveSet` (the cached resolver of a kept record) and `countsOf` (counts from the summary).
  `resolveScope` consults the cache when the context carries one.
- Kept sets are keyed by **definition** identity, not record identity: a rename replaces the
  record and keeps the definition, and must hit. Design 6.2 now says so. The signature of a set
  with edge members also carries its seeds' identity and version.
- `edgeIdPath` is not a signature input: the binding reads only the identity columns, which move
  with the serial of the re-import that applies a new path. The audit test pins both halves.
- A `{ where }` is cached only when the context can enumerate what it reads (`pathsOf`, node
  revisions, execution tokens); `QueryEngine` gained the internal `pathsOf`. The session's
  `executionOf` falls back to the result object's identity for a result published without a
  token. Test contexts without those readers resolve every read, as before.
- `ScopeApi` keeps its own `saved` map until phase 10, now replaced on every write (its identity
  is in the epoch) and advancing the tick; a `{ set }` part carries that saved record's identity.
  Each `ScopeApi` builds its own `SetsCache` unless handed one. Phase 10 hands the session's one
  cache to both `session.sets` and the scope API, and when `{ set }` reads the kept-set store its
  part must carry the named set's definition identity (not its record's), so a rename hits.
- A resolution of `"visible"` or `"selection"` copies the packed mask, so no two cache entries
  share a bitmap and the byte accounting is exact.
- A true diamond needs two references in one definition, which only phase 9's `scope` leaf can
  write; today's test is a fan-in (two saved scopes over one base, a third over one of them) and
  phase 9 extends it to the diamond.
- `SetsStore.toLogicalRecords()` returns `{ records, register, tombstones }`;
  `loadLogicalRecords()` loads only into an empty store, validates every record in load mode, and
  commits one group told as `cause: "load"` (the internal `SetChange.cause` gained it). The order
  high-water mark is recovered from the records and the tombstoned records; a tombstone whose record
  the byte cap dropped cannot be restored, so its order needs no keeping.

---

### Phase 9. The scope leaf, `{ define }` and cycle refusal

**Goal.** A rule can name a set, a `Scope` can carry a definition inline, and no chain of
references can recurse, including through the visibility filter (design 4.3, 5.2). Everything the
migration in phase 10 needs.

**Tests first.**

- `test/session/visibility/filter.scope-leaf.test.ts`: the `scope` leaf speaks the node half, and
  the edge half only for a `listed` or `clipped` referent; readings at the root per the design 4.3
  table, including `not { edges: weight < 0.5 }` read `clipped` keeping every node.
- Refusals with `details.reason`: a kept rule reading `"selection"` (`live-selection`); a set
  reaching itself through `scope` leaves (`cycle`, with `through`); a rule read `induced` containing
  an edge-speaking leaf (`induced-edge-leaf`); `visibility.set` of a tree reaching `"visible"` or
  `"search"` through any chain of leaves and kept sets (`cycle`).
- Nothing throws or recurses in a pass: a cycle made later by a redefine resolves to nothing with
  `cycle`, and the visibility pass never reads a half-written mask; a missing referent and an
  opaque leaf resolve to empty.
- `test/session/visibility/filter.identity.property.test.ts`, design 4.3's two identities over
  generated trees of depth 4 on generated graphs, for every leaf kind that exists today: `filter =
T` equals `filter = { scope: { define: rule T clipped } }`; replacing a leaf with an equivalent
  `scope` inside `any`, `all` and `not` gives identical masks.
- `{ define }` accepted at every write position that takes `ScopeInput`: run options, selection
  targets, `scope.resolve`, `scope.count`, camera framing. `parseScope` door-mode tests.
- Derived run ids: `{ define: fixed induced nodes }` gets the same id as `{ nodes }`, a rule over
  one query the same as `{ where }` (`session/runs/runId.ts:268-289`); every existing
  `runId.test.ts` id is unchanged.
- `test/session/sets/dependencies.test.ts`: the design 5.2 walk for the `scope` leaf and every
  existing leaf kind; paths come from the compiled expression; the visibility filter and the
  selection are nodes of the dependency graph.

**Code.** Move `Filter` from `session/visibility/filter.ts:62-77` to `catalog/types.ts` (the old
module re-exports it; declared open) and add the `scope` leaf; `compileOne` (about
`filter.ts:868-907`) calls `resolveScope` through the context. `Scope` gains `{ define:
SetDefinition }` (declared open) and `ScopeInput`; every `switch` over `Scope` handles it.
`session/sets/dependencies.ts` with cycle detection. `parseScope` exported from `./catalog`.
`"search"` is reserved: refused in door mode, opaque in load mode.

**Done when.** The identity property passes 1,000 cases; every existing `filter.test.ts` and
`VisibilityApi.test.ts` case passes unmodified.

**As built.**

- `Filter` and `FilterDirection` live in `catalog/types.ts`; `session/visibility/filter.ts`
  re-exports them. The one pre-existing test edit is `colon-rule.test.ts`, whose leaf-kind record
  is typed by the union so that it must grow with it.
- Rule trees resolve: `resolveRule` (`session/sets/resolve.ts`) runs the visibility compiler's own
  `compileFilter` and applies the reading at the root. A `scope` leaf reaches `resolveScope`'s
  machinery through `FilterSources.scope`, which returns the node bitmap and, for a `listed` or
  `clipped` referent, the edge bitmap. `{ set }` now names a kept set as well as a saved scope
  (saved first). `ResolveContext` gained `matchEdges`, `values` and `edgeRevisions`, wired by the
  session, so `range`, `categories` and `edges` leaves resolve outside the visibility filter.
- A definition that cannot be evaluated (a ring of kept sets, a missing referent, a capability
  the session lacks) throws `E_BAD_COMMAND` (`details.reason: "cycle"`, `through`) at a door
  (`scope.resolve`, `scope.count`, a run); a pass resolves it quietly to nothing, and the
  `Resolution` carries the refusal as `problem` for phase 12's status. `resolveSet` is quiet and
  never caches a resolution with a problem. An opaque referent resolves to nothing and its
  referrer sees an empty set.
- Rule trees have input signatures now, leaf by leaf (`rulePart` in `signature.ts`): `edges` is
  keyed on the edge attribute revisions, `range` and `categories` on their field, topology leaves
  on the serial, `scope` on its scope's part. The diamond test of phase 8 runs over rule sets.
- `session/sets/dependencies.ts`: `dependenciesOf`, `setCycle`, `visibilityCycle`,
  `selectionChain`, `referentReading`. The session builds one `DependencySources` (saved scope,
  then kept set; the visibility filter; the query engine's paths) and hands it to the set doors
  and to the visibility API. The set doors refuse `live-selection`, `cycle` and, through a named
  set, `induced-edge-leaf`; `parseSetDefinition` refuses the inline and `"visible"` cases on its
  own. `visibility.set` refuses a filter reaching `"visible"` or `"search"`; a pass compiles
  before it clears the masks, and a `scope` leaf that reaches either speaks nothing.
- A `scope` leaf the visibility pass cannot resolve (a missing or looping referent) speaks nothing
  for that leaf, so `not { scope: gone }` shows everything; in a kept rule the whole definition
  resolves to nothing. Phase 17, which makes the filter follow sets, decides whether a detached
  filter should instead show nothing, and records it in design 5.3.
- `ScopeInput` is accepted by `scope.resolve` and `scope.count`, which turn session `EdgeId`s in
  an inline definition into stable members. Run options, selection targets, camera framing and
  `visibility.set` accept `{ define }` in stable form (their types say `Scope`); each is widened to
  `ScopeInput` by the phase that normalises its getter: layer selectors in 16, `visibility.set` in
  17, run options in 18, `setLayout` and `layoutScope` in 25, selection targets and camera
  framing in 27.
- `legacyScope` in `runId.ts` canonicalises `{ define }` before hashing, so equal inline
  definitions share an id and the two older-form equivalents keep theirs.

---

### Phase 10. Publish session.sets and migrate ScopeApi and SelectionApi

**Goal.** `session.sets` goes live; the saved-scope verbs delegate (design 2.2, 15.2, 16).

**Tests first.**

- `test/session/sets-on-session.test.ts`: every synchronous door through `session.sets`;
  `session.scope.resolve({ set: id })` and `count({ set: id })` for each kind; `count` reports
  `missingNodes` / `missingEdges`; `count` of a tombstoned id returns zeros and never throws; an id
  never issued refuses.
- `RunScopeRecord.set` holds `{ id, revision }` for a `{ set }` scope, and `.reading`.
- Migration (`scope-on-session.test.ts`, `ScopeApi.test.ts`, otherwise unmodified): `scope.save`
  returns the same id as before for the first mint, stores a copy, maps each spec form to the
  design 16 definition (`"graph"`, `"largest-component"` and `{ set }` to a rule with one `scope`
  leaf); `scope.list()` projects back to `SavedScope` including `bound`; `scope.remove` removes. A
  standalone `createScopeApi({ snapshot })` creates its own sets store when none is passed.
- The three behaviour changes of section 1.1 assigned to this phase, each in its own commit with
  exactly the listed test edits: saving `"selection"` or `"visible"` freezes current members;
  saving after a remove never reissues the removed id (the ring test now closes its ring by
  redefining `first` and still expects `E_BAD_COMMAND`); `selection.promote` keeps the selected
  edges, induced when nodes are selected, listed for edges alone.
- `test/session/entry-point.test.ts`: `session.ts` exports every design 15.3 item 2 type name that
  exists by this phase, and `set:changed` is in `SessionEventMap`.

**Code.** `session/GraphSession.ts` gains `readonly sets: SetsApi` and emits `set:changed`.
`ScopeApi.save`, `list`, `remove` delegate, with `@deprecated` TSDoc linking `sets.create`,
`sets.list`, `sets.remove`; `SelectionApi.promote` (about line 696) dispatches `set.create`
directly, `@deprecated` in plain text naming `sets.createFrom("selection")` (the link is added in
phase 13, when the target exists). `describeScope` (`RunsApi.ts:253-277`) labels a set by name.

**Done when.** The full default and browser suites pass with only the listed test edits; the
graphty app type-checks against the branch (`pnpm exec nx run graphty:lint`); the three `fix`
commits exist with changelog bodies.

**As built.**

- Four commits, each green: the `feat` publishing `session.sets`, then the three `fix` commits in
  the order freeze, never-reissue, promote. The freeze lands first, on the old saved-scope map,
  because the delegation cannot keep a live `"selection"` (a kept rule reading it is refused). The
  never-reissue commit IS the delegation of `save`, `list` and `remove` to the sets store, since
  the store's register is what stops the reissue; `promote` moves to the store in that commit with
  nodes only, and the promote commit adds the edges.
- `ScopeResolver` exposes `sets` (the doors it delegates to); `specOf` and the saved-scope map are
  gone. `createScopeApi` builds its own `SetsApi` when none is passed, reading edges off the
  snapshot alone. The session hands its one `SetsApi` to the resolver, whose cache is the
  session's one resolution cache; no set door resolves yet, so phase 13's resolving doors must
  read through the resolver (or be handed its cache) rather than build a second one.
- `ResolveContext.saved` and the saved-scope branches in `resolve.ts` and `signature.ts` are no
  longer reached by the session; `cache-inputs.test.ts` still drives them directly, so they stay
  until a phase that may edit that test removes them.
- `createSetAs` (internal, `SetsApi.ts`) is `set.create` with a `createdFrom`; `promote` records
  `{ kind: "selection" }`. `scope.save` records `user`.
- `scope.save` of `"visible"` stores `induced` when no edge was hidden (design 16 now says so).
  `count` fills `missingNodes`/`missingEdges` for kept fixed and path sets only; an inline
  `{ define }` count keeps its shape, which a phase 9 test pins (design 15.2 now says so).
- `RunsApiOptions` gained `scopeFacts` and `setName`; `RunSurroundings` gained `scopeFacts`. Every
  run records `scope.reading`; a `{ set }` run records `scope.set` from the live record.
- `./session` exports `SetsApi`, `ElementSet` and `SetChange`; the other 15.3 item 2 names it
  already exported. `SetsApi.addMembers` and `removeMembers` take the member object inline, so no
  unexported name appears in the published type.

---

### Phase 11. Rule leaves: item and threshold

**Goal.** The two remaining leaves, evaluated exactly as the visibility filter evaluates (design
4.3, 5.2).

**Tests first.**

- `test/session/visibility/filter.leaves.test.ts`: `item` with and without `execution`, array
  containment, `onPath` speaking both halves; `threshold` `top` with the `TopRanking` tie policy
  over the population carrying the value, `above`, over `data.*` and `results.*`; `all [degree >=
5, edges: weight > 0.5]` read `listed`.
- Refusals: a follow-mode `item` on a partition group; a `threshold` with zero or two cuts, or
  with a reserved field (`percentile`, `z`, `population`), and `NaN` or an infinity in a cut; an
  `ItemKey` with a reserved `op`. Load mode keeps a reserved `threshold` field and an `ItemKey.op`
  opaque, with the first one named (`test/catalog/sets/parse.load.test.ts` extended). A `component`
  leaf beyond the current count and a missing run resolve to empty, never throw.
- The phase 9 identity property extended to `item` and `threshold`.
- `dependencies.test.ts` extended: follow versus hold recorded for `item`.

**Code.** The two leaves in `catalog/types.ts` and `compileOne`. `ResultItem` normalisation: a door
passed a `Run` or `RunResult` stores its `RunId`. `within`, `percentile`, `z`, `population` are
reserved: refused in door mode, opaque in load mode.

**Done when.** The extended identity property passes 1,000 cases; existing filter and visibility
tests pass unmodified.

**As built.**

- The leaves compile in `compileOne` (`compileItem`, `compileThreshold`). They read a run through a
  new `FilterSources.result(run)` (internal type `FilterRunResult`: the current execution token,
  the published fields with their kinds, and per-index node and edge values), which the session
  builds from `runs.get(run).result` and hands to the visibility API and, through `ScopeSources`
  and `ResolveContext`, to rule resolution. Absent `result`, both leaves over `results.*` refuse
  `E_UNSUPPORTED`, as `range` without values does.
- `top` ranks with the results module's own `rankEntries` and `topOfRanking`, so the tie policy is
  the one `TopRanking` documents. `above` is strict. A data threshold speaks each half that carries
  the field and ranks each half on its own. Design 4.3 now says so.
- A held item whose execution is no longer current holds nothing (marked `ponytail:` in
  `filter.ts`); phase 12's captures replace that with the captured members.
- Signatures: an `item` is keyed on its run's execution token whether it follows or holds; a
  `threshold` over `results.*` on the token, over `data.*` on both the node and the edge revision
  of its field.
- `DependencySources` gained `shapeOf` and `fieldKinds`. The set doors and `visibility.set` refuse a
  follow-mode item on a `community` `group` with `details.reason: "follow-group"` (added to design
  15.2's reason union, a one-way door already covered by item 8 of 15.3), found inside inline
  definitions too. The set doors also refuse an induced rule whose item or threshold names a field
  edges carry (`induced-edge-leaf`); `parseSetDefinition`, which has no session, cannot know that
  and accepts it.
- A door passed a `Run` or `RunResult` in `item.run` stores the run's id: `canonicalSetDefinition`
  replaces the handle (`runIdOfRef`), and the door-mode validator accepts it. `ResultItem.run`
  stays typed `RunId`: a TypeScript caller passes `run.id`; widening the input type is left to the
  phase that types `FilterInput`, if one is wanted. `visibility.set` stores its filter as given, so
  the compiler reads a handle's id too.
- Reserved and refused in door mode, opaque in load mode: `threshold.percentile`, `threshold.z`,
  `threshold.population`, `itemKey.op`, and the key forms `itemKey.smallestNode`, `itemKey.edges`,
  `itemKey.binds`. A threshold whose only cut is a reserved one loads.
- The one pre-existing test edit is `colon-rule.test.ts`'s leaf-kind record, typed by the union so
  that it must grow with it. `test/session/visibility/results.ts` builds hand-made run results for
  tests that need a run's values.

---

### Phase 12. Status, path kind, Used by, and held-item captures

**Goal.** Everything derived on read about a set, and the one piece of run state sets need
(design 4.4, 5.2, 5.3, 3.4).

**Tests first.**

- `test/session/sets/status.test.ts`: one test per row of the design 5.3 table, in order, each
  asserting freshness, reasons, `earlierRuns` and what the set resolves to. Rows for sets that only
  `createFrom(offer)` makes (phase 14) are built through the internal `store.put` with an explicit
  `createdFrom: { kind: "result", item, execution }`; plus
  `revision-unknown` for another version prefix, and `input` for a set whose input set is out of
  date.
- Work count: 200 `status` calls on a panel's sets never resolve.
- A stateful model with run, re-run, run removal, set create, remove and restore, and redefine
  commands (`test/session/sets/status.model.test.ts`; its own model, because the re-freeze model
  of phase 7b drives no runs); after each, every set's status equals the model's freshness,
  earlier runs and `values-not-kept`.
- The record round trip gains statuses.
- `test/session/sets/pathKind.test.ts`: simple, trail, cycle, walk; A-e1-B-e2-A over two distinct
  parallel edges is a cycle; A-e1-B-e1-A is a walk; a `null` step keys on its pair.
- `test/session/sets/captures.test.ts`: before a run re-executes in place (`RunsApi.ts:713`), each
  item held by a kept rule is captured as a sorted id list on the new run entry under its
  execution; the holding rule then resolves to the capture and reports the run in `earlierRuns`;
  the capture is carried forward only while live state still holds that execution; with no capture
  the rule resolves to nothing with `values-not-kept`.
- `usedBy` lists sets naming the id and runs whose scope names it (`RunScopeRecord.set`); layers,
  the filter and the layout join in phases 16, 17 and 25.

**Code.** `session/sets/status.ts`, `pathKind` in `session/sets/path.ts`, `session/sets/
captures.ts` (called from the re-execute path in `RunsApi.ts`), `SetsApi.status`, `pathKind`,
`usedBy`.

**Done when.** Every row of the design 5.3 table has a passing test; the model passes 1,000
sequences.

---

### Phase 13. Set algebra and the materialising doors

**Goal.** `combine`, `createFrom` of a scope, and `createPath("selection")` (design 7, 13.3,
15.2).

**Tests first.**

- `test/session/sets/algebra.test.ts`: every operand induced gives an induced result; otherwise
  edge-first; `difference` is the first minus the union of the rest; the result is a fixed set with
  `createdFrom: { kind: "combine", op, of }` holding references, `{ inline }` sizes for member lists.
  One example test per law edge-first gives up (design 7): the Kruskal-versus-Prim difference keeps
  differing edges and their shared endpoints, so `(A - B) intersect B` is not empty; and design
  7's counterexample, where nesting a union across readings changes the result.
- `test/session/sets/algebra.property.test.ts`, 1,000 cases: (a) a naive `Set`-based model of the
  design 7 edge rule over operands of mixed readings, compared bit for bit, over both flat n-ary
  calls and nested calls; (b) each law exactly where design 7 claims it: commutativity,
  idempotence, intersection associativity and the endpoint invariant for any nesting; union
  associativity only within one call or one regime; n-ary `symmetric-difference` equal to the
  odd-count definition; (c) for all-induced or all-listed operands,
  `combine` and the equivalent rule over `scope` leaves resolve identically.
- `test/session/sets/createFrom.test.ts`: the design 15.2 defaults (a selection with nodes stores
  nodes and edges and reads induced; edges alone read listed; `"visible"` freezes to listed; an
  explicit `reading` wins); a defaulted listed result equal to the induced one is stored induced
  with no edges and gains an edge added later between members, while an explicit `"listed"` does
  not; `createFrom("largest-component")` stores no edges; an empty source refuses `E_SCOPE_EMPTY`.
- Concurrency, deterministic: the resolve step is injectable (a deferred promise), and each
  interleaving is forced once: two `createFrom` calls with one name that both resolve and then both
  commit, and one that commits while the other is pending, give distinct ids or refuse the second
  with `E_DUPLICATE_ID`, never the same id twice.
- Work count: the synchronous commit of `createFrom` does no resolution and interns O(k) members.
- `test/session/sets/createPath.test.ts`: an unambiguous chain of selected edges becomes a path in
  order; an ambiguous one refuses, saying why.

**Code.** `session/sets/algebra.ts`; the asynchronous half of `SetsApi` (`createFrom`, `combine`,
`createPath`): resolve, build every listed edge member's stable parts and hashes, then in one
synchronous tick re-check, mint, name and dispatch `set.create`. The `promote` deprecation gains
its `{@link}`.

**Recorded timings (Node runner, groups `doors` and `algebra`).** `createFrom("visible")` with no
filter, `createFrom` of a large listed scope and its commit, the four ops on two large sets. A
session over a store is Node-safe, so these rows need no browser.

**Done when.** Every listed test passes.

---

### Phase 14. Offers and Memberships

**Goal.** Results offer sets on demand, by shape (design 8, 15.2 `containing`).

**Tests first.**

- `test/session/sets/offers.test.ts`: one test per row of the design 8.2 shape table, using the
  built-in algorithm of each shape; `limit` and `more`; `edges` present only when the execution's
  edge-count pass is cached, and `offers` never runs it; the pass counts an edge once per group in
  the intersection of its endpoints' memberships (an overlapping-community case); a components
  run's first offer is the largest component; an unknown run refuses `E_UNKNOWN_RUN`.
- Using `{ define: offer.definition }` as a scope writes nothing.
- `createFrom(offer)` stores a fixed set created from `{ kind: "result", item }` with the
  execution; `createFrom(offer, { follow: true })` stores a rule without it and is refused for a
  partition group; `createPath(offer)` stores the path in order with each step's on-path edge
  group. Stale offers, deterministic through the injectable resolve step: refused before the
  resolve, and refused when a re-run executes between the resolve and the commit.
- One end-to-end status test: a set kept through `createFrom(offer)` reads the design 5.3 row that
  phase 12 built through `store.put`.
- `test/session/sets/containing.test.ts`: a node's kept sets and partition items with labels; a
  fixed set answered by binary search without resolving; an element-local rule evaluated on the
  one element; a rule with a `top` leaf resolved once and cached; an edge's row from `Edge.index`.

**Code.** `session/sets/offers.ts`; the per-execution edge-count pass adds its row to the cache
audit.
`SetsApi.offers`, `containing`.

**Done when.** Every shape row has a passing test; the audit table's offer row exists and is
filled.

**As built.**

- `session/sets/offers.ts` holds `createOffering` (offers, the edge-count pass, the path order
  and Memberships); the session builds one and hands it to `session.sets` and to the
  materialiser. `SetOffer.nodes` became optional (design 8.2): a `listed` offer's nodes include
  its edges' endpoints, so they come from the edge-count pass like its edges. Node counts come
  from one cached pass over the node values, not the summary groups, which stop at ten.
- The offer counts are one `SetsCache.offers` entry per run, valid for one (execution, store,
  serial); the pass is filled into the entry. The audit table has the row.
- No built-in algorithm publishes `category-table`, `node-set` or `temporal`; their rows use a
  hand-built result. The other rows run the element's own algorithms in Node through
  `test/session/sets/algorithms.ts` (`builtInRuns`), which a later phase can reuse.
- The stale check runs before the resolve and again after it, before the commit. `createSetsApi`
  gained an `executionOf` dependency for it. `Materialiser.from` and `.path` accept an offer.
- Memberships: a rule is tested at the one element when every leaf is element-local, by
  compiling it with the pass's compiler and calling its tests at one index. An `expression`,
  `edges` or `threshold above` leaf still evaluates over the graph at compile time (the query
  engine and the threshold compiler have no single-element form), and a node's membership of a
  rule read `listed` is resolved in full, because it needs the incident edges. The binary search
  serves a fixed set of nodes alone; one with edge members is resolved (cached), because its node
  half includes its edges' endpoints and a member binds through seeds and identity.
  `SetsCache.peek` reads a cached resolution without counting a hit or a miss.

---

### Phase 15. Change notification and the re-resolution scheduler

**Goal.** The internal machinery that tells live users of a set when to re-resolve, and spreads
re-resolution after a freeze across frames (design 6.2, 11).

**Tests first.**

- `test/session/sets/notify.test.ts`: the notification fires from each of six hooks: the store's
  committed diff, a selection mask change, a visibility mask change, a run commit, an attribute
  write, a snapshot replacement. It carries which inputs moved; it runs before `set:changed` is
  delivered; a subscriber whose signature did not change is not asked to re-resolve.
- `test/session/sets/scheduler.test.ts`, driven by hand through an injected frame source: after a
  freeze, work is split across frames within a per-frame work budget (counted, not timed); a
  subscriber keeps its previous resolution until its new one is ready; a second freeze mid-way
  adds no work twice (an unfinished subscriber resolves once, against the newest snapshot; a
  finished one resolves again only if its signature moved again, which the serial makes the usual
  case); dispose cancels.

**Code.** `session/sets/notify.ts`: subscribe by signature, the six hooks wired in, the scheduler
with an injectable frame source (production uses the render loop's frame callback).

**Done when.** Tests pass.

**As built.**

- `SetsNotifier` takes a `SetWatch`: `signature()`, `resolve()`, `ready(resolution, moved)` and
  `cost()`, the elements one resolution walks as the watch estimates them. The per-frame budget is
  1,000,000 such elements (internal, a guess until the freeze row is recorded); the first watch of
  a frame always runs, so one over-budget watch cannot starve. A watch whose signature did not move
  is skipped and costs nothing. A throwing watch keeps its previous resolution and is retried on
  the next input.
- Same-snapshot inputs resolve synchronously; a snapshot replacement only queues. A queued watch
  is not resolved by a later same-snapshot input: it waits for its frame and is handed every input
  since, oldest first.
- The hooks: `SetsStore.onCommit` (new: one call per group, before the per-key listeners that
  publish `set:changed`); the selection and visibility `onChange` callbacks in `GraphSession`,
  before their public events (not `onMaskVersion`, which fires inside mask loops and mid-operation);
  the runs `onChange` at `queued` (a re-run clears the result) and `end`, plus a new
  `RunsApiOptions.onRemoved`; and two announcements on the store owner's `InputTick`
  (`announce`/`listen`, new), which every session over that store hears: `GraphStore.publish`
  announces `snapshot` once a freeze is delivered, and `writeUpdates` (new, `session/attributes.ts`,
  which `Graph.updateNodes` now calls) announces `attributes` once per batch. Ingest bumps
  revisions but announces nothing: the freeze that follows re-queues everything, and announcing
  would force a freeze per ingested chunk.
- The session builds one notifier, reachable internally through `setsNotifierOfSession`, and
  disposes it with the session. Its default frame source is a zero timer; `Graph` hands it the
  render loop's `onBeforeRenderObservable`, so a held frame holds the re-resolution too.
- Nothing subscribes yet: phases 16 and 17 add the style layers and the visibility filter.

---

### Phase 16. Style layers name sets

**Goal.** `Selector { match: "scope", scope }`, repainting only what moved (design 11).

**Tests first.**

- `test/session/styles/selector.scope.test.ts`: both declarations accept the kind
  (`catalog/types.ts:482-492`, `session/styles/selector.ts:57`, `SELECTOR_KINDS`); malformed
  refuses `E_BAD_SELECTOR`; a detached or invalid scope paints nothing and the pass continues; a
  layer naming `{ set }` of a removed set, then a new set of the same name, stays detached;
  importing a style document whose layer names an unknown `{ set }` keeps the layer and reports it
  detached, never drops it.
- `test/session/styles/repaint.sets.test.ts`: a redefine on the same snapshot repaints exactly the
  XOR of old and new bitmaps (dirty-set spy; a 3-node delta on 50,000 nodes dirties 3); across a
  freeze each layer keeps its paint until its resolution is ready, then repaints only the rows
  where its carried old members and the new resolution differ (none when no member moved); a
  rename repaints nothing; a layer over a rule on
  `results.pr` repaints after a re-run of `pr` with no data change.
- Pins: a live layer's resolution is pinned and survives budget pressure.
- `usedBy` lists the layer; held items named by a layer are captured on re-run.
- Browser: `test/browser/sets/style-layer.test.ts` renders a graph, adds a layer colouring
  `{ set }`, redefines the set, and reads node colours back through the element to check only the
  XOR changed.

**Code.** The two `Selector` declarations; `CompiledSelector.match` gets a bit test by index; the
style manager subscribes to the notification with each scope's signature.

**Story.** `stories/Sets.stories.ts`, title `Sets/Kept Sets`: `ColorASet`, `CombineTwoSets` (union,
intersection and difference, each painted) and `RuleSetFollowsData` (the play function updates the
attribute and the paint follows). Ids added to `stories/story-roster.json`; play functions assert
colours through the element.

**Done when.** Tests, the browser test and the storybook project for `Sets.stories.ts` pass; new
Chromatic snapshots are left for the owner to accept.

**As built.**

- `SelectorSource.scope(scope)` (optional; absent refuses `E_UNSUPPORTED`, like `ids` and `top`)
  hands the compiler a `LiveScope` with `bits(target)` and `problem()`; the compiled test is one
  `maskTest` per element. `CompiledSelector` gains an optional `problem()`, which `unboundLayers`
  reads, so an import reports a layer naming an unknown set in `TemplateReport.unbound` as
  detached (kept, and disabled like every other unbound layer). A malformed scope is
  `E_BAD_SELECTOR` wrapping `parseScope`'s reason. Session edge ids inside a selector's
  `{ define }` are not converted yet (stable members only); `ScopeInput` in selectors is additive
  later.
- `session/sets/layers.ts`: one live entry per canonical scope, shared by every layer naming it.
  It subscribes to the notifier on its first read by a pass (so `styles.validate` never
  subscribes), pins its cache key (the kept set's definition, else the canonical scope, re-pinned
  on each resolution), and is dropped on the next style change that leaves no layer naming it.
  On the same snapshot `ready` repaints the XOR through the new `RepaintEngine.repaintElements`
  (outside the op queue; the engine's own pass chain serialises it). Across a freeze it carries
  its old members to the new rows by id, once per snapshot, and repaints the carried bitmap XOR
  the new resolution; until its frame, the same carry answers every pass, so the element's
  whole-graph pass after a removal keeps the paint.
- `SetsDependencies.users` feeds `usedBy` (layers today); the run capture holders include every
  layer scope.
- Defect found and fixed: the input tick advanced when a token was minted, at the start of the
  work, but not when the result it stamps was published or cleared, so a signature memoised in
  between kept reading "no result" and a kept rule over `results.<run>` resolved one execution
  behind. The session now advances the tick whenever a run's result is not the one it last
  announced (design 6.2 updated); `input-tick.test.ts` pins the new counts.
- `selector.test.ts` "refuses a match this union does not contain" lists `scope` among the kinds.

---

### Phase 17. The visibility filter follows sets

**Goal.** A filter naming a kept set updates when the set changes (design 4.3, 11). Refusal and
cycle safety already hold from phase 9.

**Tests first.**

- `test/session/visibility/VisibilityApi.sets.test.ts`: redefining a set the filter names moves
  the visible mask; removing a set the filter and a layer both name throws nowhere.
- The studio's "without S" (design 4.3) as a rule: S's nodes and every edge touching them removed,
  whatever S's reading.
- `usedBy` lists the filter; held items named by the filter are captured on re-run, and the
  filter's own compile reads them (`FilterSources.captured`, which only the scope resolver wires
  today).

**Code.** The visibility pass subscribes to the notification with its scopes' signatures.

**Story.** `FilterToASet` in `Sets/Kept Sets`.

**Done when.** Tests and the story pass.

**As built.**

- `VisibilitySources.watch` (`subscribe`, `signature`, `pin`) is how the model follows its sets.
  The filter's signature is the scope signatures of its `scope` leaves (outermost only; each
  scope's own signature covers what it reads), leaving out a leaf that reaches `"visible"` or
  `"search"`: it speaks nothing whatever moves, and its signature moves with the masks the
  filter writes, so following it would re-evaluate for ever.
- The model watches only while the filter in force names a set, and pins those scopes' cache
  entries; a filter naming none subscribes nothing and pins nothing. Each evaluation records the
  signature it compiled under, so the watch's resolve is a no-op when a read already
  re-evaluated (after a freeze the watch waits for the notifier's frame, and `sync()` may get
  there first). An evaluation the watch caused announces `visibility:changed` with the filter's
  kind; a re-evaluation because the snapshot moved still announces nothing, as before.
- An asynchronous `visibility.set` pass compares the signature it compiled under with the one at
  commit and re-evaluates synchronously when a named set moved while it was walking.
- A detached `scope` leaf keeps speaking nothing for that leaf; the whole filter is not blanked
  (recorded in design 5.3).
- The session hands the filter's compile `captured` (through the scope resolver's context, which
  turns a capture into bitmaps over the current snapshot), adds the filter tree to the run
  capture holders, and lists the filter once in `usedBy` as `{ kind: "filter", label:
"Visibility filter" }` (`SetsDependencies.users` now takes a scope or a filter tree).
- Not done: `visibility.set` does not yet turn session `EdgeId`s inside a leaf's `{ define }`
  into stable members (stable members only), as for layer selectors. Accepting `ScopeInput`
  there needs a filter input type, a new public name, so it is left for when a consumer needs
  it.
- `stories/assertions.ts`: `DrawnNode.enabled` and `assertNodesShown`, which the story uses.

---

### Phase 18. Scoped runs, part one: the input accessor and derived inputs

**Goal.** The machinery a scoped run reads its input through (design 10.1, 10.3, 10.4), the two
existing seams routed through it, and the per-algorithm declaration that decides what the seams
hand over. No run's output changes in this phase.

**Why a declaration.** Whether an algorithm honours its scope is a fact about the algorithm at
runtime, not about which file reads what. 25 files under `src/algorithms/` read topology through
the two seams (`Algorithm.algorithmGraph`, which calls `toAlgorithmGraph`, and
`Algorithm.accelerated`), all eight `MetricAlgorithm` subclasses among them, while most of them
still enumerate nodes, and some edges (`edges.values()` in Kruskal, Prim, bipartite matching,
min cut, the route marking of Dijkstra and Bellman-Ford, and the two utils), straight from the
`DataManager`. Routing the seams unconditionally would scope their topology while their node
lists stay whole: Degree would publish 0 for every non-member. So each built-in class carries an
internal `static scopeInput` (phase 24 makes it the public descriptor field). The seams hand over
the scoped input only when the running class declares it; otherwise they return the whole
snapshot. No built-in declares it in this phase.

**First task.** Grep the existing tests for runs with a `scope` other than `"graph"` or with a
visibility filter active, and write that list into section 1.1's table in its own commit. Only
those tests may change, and only in the phase 19 `fix` commit.

**Tests first.**

- `test/algorithms/input/scopedInput.test.ts`: the chain is declared, then `inducedSubgraph(node
bitmap)`, then `filterEdges(edge bitmap)` only when the edge bitmap is not the induced one, then
  `toUndirected` if asked, then `simplified` by the asked policy; a `"visible"` scope with isolated
  nodes keeps them; the whole-graph shortcut returns the snapshot unchanged and uses the store's
  undirected cache (`GraphStore.ts:289-294`); a reciprocal pair with halves weighted 0.1 and 0.9,
  only the 0.9 half in scope, gives the undirected input weight 0.9. Work count: one CSR pass per
  derivation.
- `test/algorithms/input/derivedInputs.test.ts`: keyed by (serial, resolution signature,
  orientation, simplification); both orientations share the declared intermediate; reference counts
  hold an input until publish or abort; eviction, a freeze and dispose only mark a held input;
  release runs on the last holder; a derivation that does not fit waits for another run's holder or
  refuses `E_TOO_LARGE`, and a run never waits on itself. Byte accounting within max(256 MB, 1.5 x
  snapshot bytes), with the accounting walk (1.4) over derived snapshots. It adds its row to the
  cache audit, filled.
- `test/algorithms/input/declaration.test.ts`: a test algorithm declaring `scopeInput` receives
  the scoped input from both seams; the same algorithm without it receives the whole snapshot
  under a scoped run.
- Every test on the first task's list passes unmodified and its run output is identical to
  master's (a recorded fixture of each run's published values, written from master in the first
  task's commit).
- `test/algorithms/input/device-release.test.ts` (default project), with the shared fake
  accelerator (`src/testing/fakeAccelerator.ts`), extended to record every snapshot handed to it
  for upload beside the `release` list it keeps today, through a test algorithm calling
  `accelerated()`: after repeated scoped runs, re-freezes, two overlapping scoped runs and a freeze
  during a run, the uploaded set equals the released set. A real-device variant in the browser
  project runs under `skipIf(!GPU_LANE)` and is not part of any phase's Done-when.

**Code.** `algorithms/input/ScopedInput.ts` (`Algorithm.input(orientation, options?)`),
`algorithms/input/derivedInputs.ts`. `Algorithm.accelerated()` (`Algorithm.ts:338-372`) and
`toAlgorithmGraph` (`utils/snapshotGraph.ts:50-65`) route through `input`, which returns the
whole-graph shortcut unless the running class declares `scopeInput`. `AlgorithmManager.compute`
(`AlgorithmManager.ts:340-356`) passes the run's resolution.

**Done when.** Tests pass locally, the device-release test and the master-identical outputs among
them.

---

### Phase 19. Scoped runs, part two: mask-back, caveats and the planner

**Goal.** Every published value outside the scope reads missing, whatever path computed it; an
algorithm that does not declare `scopeInput` says it computed on the whole graph. This is the
phase where scoped runs first change observable output, so it carries that behaviour change's
commit.

**Tests first.**

- `test/algorithms/input/maskBack.test.ts`: every node value outside the node bitmap and every edge
  value outside the edge bitmap reads missing and is excluded from rankings, histograms and
  summaries; Dijkstra's `Infinity` / `onPath: false` defaults and the many-to-one `edgeRemap`
  (`Algorithm.ts:187-212`) are masked; under a listed scope, edge values outside the listed edges
  are masked though both endpoints are members.
- An algorithm without the `scopeInput` declaration (every built-in, in this phase) receives the
  whole snapshot from both seams, is masked back, and carries the caveat "computed on the whole
  graph; values kept for the scope only", decided from the declaration at run time (the same path
  a plugin without `scopeInput` takes); the planner estimates and refuses it over the whole graph.
- Node options outside the scope refuse `E_OPTION_RANGE` with `outside-scope`.
- The caveat text for `induced` and for `listed` / `clipped`; `RunScopeRecord.reading`.
- `test/algorithms/no-direct-graph-reads.test.ts`: static; fails when a file under
  `src/algorithms/` calls `getDataManager()` or `getSnapshot()` outside `src/algorithms/input/`.
  Its allowlist starts at the 26 files matching today and has two parts: permanent entries, each
  with its reason (the seams `Algorithm.ts` and `utils/snapshotGraph.ts`; `results/labels.ts`,
  which reads labels, not topology), and entries to migrate, which must each still match (the list
  only shrinks). It is a secondary guard only; which algorithms are scoped is decided by the
  declaration and proved by the registry test of phase 20.
- The planner's derivation model a + b(N + E) + c(kept edges) (`session/planning.ts:233-241`).

**Code.** `algorithms/input/maskBack.ts` called from every publish path (`Algorithm.publishResult`,
`Algorithm.ts:465`; `DeclaredAlgorithm.publishResult`, `results/DeclaredAlgorithm.ts:154`;
`MetricAlgorithm.publishResult`, `metrics/MetricAlgorithm.ts:70`); the caveat; the planner model.

**Behaviour change.** The `fix(graphty-element): scoped runs compute over their scope` commit
(design 10.5, 15.3 item 14), editing only the tests listed in phase 18, with a changelog body
stating that runs over a scope smaller than the graph, including default runs over `"visible"`
with a filter active, now report values for the scope only. Phases 20 to 23 change only how
in-scope values are computed.

**Done when.** Tests pass; a PageRank over a 20-node set reports 20 values, carries the caveat, and
its scope record (`RunScopeRecord`) says 20 nodes. Its `measured` counts still read the whole
graph until phase 20.

**As built.**

- `Algorithm.publishResult` refuses in the base class, so the publish paths are the two
  `createRunResult` call sites, `DeclaredAlgorithm.computeRun` and `MetricAlgorithm.measureRun`;
  both build from `maskBack(this, init)`. No protected helper was added to `Algorithm`, because a
  protected member of an exported class is public API. A third party that subclasses `Algorithm`
  directly and overrides `publishResult` is therefore not masked; `DeclaredAlgorithm` is the
  published base. Phase 24 decides whether that route is masked too.
- The fields a result fills from its published population (`groupSize`, `levelSize`, ranks and
  histograms) are counted over the scope, because masking happens before the result is built.
  `ResultSummary.count` reads `measured`, so it too reads the whole graph until phase 20.
- The caveat notes are sentences, like every other note: "Computed on the whole graph; values kept
  for the scope only.", "Computed on the induced subgraph of N nodes." and "Computed on the
  subgraph of N nodes and the M edges in scope." The reading comes from the scope resolver, which
  now records it beside the bitmaps it hands a run.
- The node-option check runs in `AlgorithmManager.compute` before any work, against every option
  of catalogue type `node-id` or `node-set`. An id the graph does not hold is left to the
  algorithm's own `E_OPTION_RANGE`.
- The planner learns which classes declare `scopeInput` through an internal session hook the
  element fills (`declareScopedInputs`), because the Node-safe session cannot see the classes.
  Phase 24 replaces the hook with the public descriptor field. The derivation model's
  coefficients are fitted to design 6.5 (about 0.5 ms + 9 ns per element of the whole graph +
  170 ns per kept edge); phase 26's timing runners re-fit them.

---

### Phase 20. Adapters: the base classes, the metric family, the accelerated five and the GPU

**Goal.** The two base classes read their node list and counts from the input. Seven
`MetricAlgorithm` subclasses (Degree, HITS, Katz, KCore, Closeness, Betweenness, PageRank) and
Dijkstra, BFS, connected components and Kruskal read only `this.input`, and declare `scopeInput`.
The phase may be split at an adapter boundary (1.1).

**How an adapter migrates.** In one commit: remove its direct node enumeration and direct edge
reads (for Kruskal, `edges.values()`; for Dijkstra, the route marking), read them from the input,
flip its `scopeInput` declaration on, and move its row in the registry test's expected table.
Eigenvector, the eighth `MetricAlgorithm` subclass, reads the graph directly and keeps its
declaration off until phase 23. The adapter set is drawn from `grep extends` and the declaration
table, not from a list of names.

**First task.** `MetricAlgorithm.measureRun` (`metrics/MetricAlgorithm.ts:82-83`) takes its node
list from the input and `measured` from the resolution; `DeclaredAlgorithm`'s `measured`
(`results/DeclaredAlgorithm.ts:201`) likewise.

**Tests first.**

- `test/algorithms/scoped/registry.test.ts`, behavioural, over every registered algorithm from
  this phase on. An expected table in the test gives each algorithm's declaration; it only moves
  from off to on, and the test fails if the runtime declaration differs from it. One shared
  discriminating fixture: a scope that cuts a component, where a shortest path through a
  non-member is shorter than any inside, and where PageRank mass flows through non-members;
  algorithms that need options (sources, sinks) take them from a table in the test. For every
  algorithm declared scoped:
    1. the run record carries no "computed on the whole graph" caveat;
    2. the in-scope values equal those of the same algorithm run on an induced subgraph built by
       hand in snapshot row order (the test asserts its node and edge insertion order equals
       `snapshot.inducedSubgraph`'s, since seeded partition algorithms depend on iteration order);
    3. the whole-graph run gives different in-scope values on this fixture, which proves the
       fixture tells the two apart;
    4. during the run, the algorithm's graph handle records any topology read (`getDataManager()`
       node or edge enumeration, `getSnapshot()` topology) that goes around `input()`, and the test
       fails on one. Metadata reads such as `getSnapshot().directed` are not topology.
       For partition-shaped results (Louvain, Leiden, label propagation, components), checks 2 and 3
       compare after canonicalising labels by first appearance in row order; a test shows a pure
       relabelling is judged equal, and the fixture is one where the scoped and whole-graph partitions
       still differ after canonicalising. An algorithm the shared fixture cannot discriminate gets its
       own fixture in the table. Every algorithm declared off must carry the caveat.
- One `test/algorithms/scoped/<Name>.scoped.test.ts` per adapter for the cases the registry test
  does not cover: a listed-scope run equals a run on a hand-built graph of exactly the listed
  edges; a multigraph case. For the accelerated five (PageRank, Dijkstra, BFS, connected
  components, Kruskal), scopes are also generated with fast-check.
- Connected components over `"visible"` after an edge-weight filter: each isolate is its own
  component. A scoped Dijkstra with no source defaults to the scope's first and last nodes. A
  scoped PageRank's `measured` says 20 nodes on the phase 19 case.
- The phase 18 device-release test re-run through the five real adapters.

**Code.** The two base classes, then the adapters, each in its own commit as above.

**Separate fix.** Dijkstra asks for `simplify: "min"` (design 10.2) in its own
`fix(graphty-element): Dijkstra uses the shortest of parallel edges` commit, tested on a weighted
multigraph, scoped and unscoped.

**Done when.** The eleven declarations are on; seven allowlist entries are gone (the two base
classes, PageRank, Dijkstra, BFS, connected components, Kruskal; the six other metric subclasses
never had one); the registry test and the device-release tests pass locally.

**As built.**

- An adapter lists what it publishes through two helpers in `algorithms/input/ScopedInput.ts`:
  `scopeNodeIds(input)` (the input's nodes in declared row order, which is the compact snapshot's
  order) and `scopeEdges(input)` (its declared edges in row order, each with its session id and the
  row an `edgeRemap` is indexed by). Published values are therefore listed in snapshot row order,
  where they were listed in the data manager's insertion order; no existing test depended on it.
- The built-ins declare `static scopeInput: ScopeInputDeclaration = "subgraph"`, typed rather than
  a literal, so a subclass (a plugin extending a built-in, or a test) can set `"none"`.
- The merge policy is a class static, `static parallelEdges?: SimplifyPolicy` on `Algorithm`
  (internal, like `scopeInput`), read by `Algorithm.input` for both seams and by the run's
  multigraph caveat, which now names the policy ("keeping the lowest weight" for Dijkstra) where it
  said "with weights summed" for every algorithm. Phase 24 decides whether it joins the descriptor.
  The fix commit's subject is lower case (`dijkstra uses ...`), because commitlint refuses a
  capitalised subject.
- Undirected adapters derive through a declared intermediate that is cached beside their input and
  released with it, though never uploaded. The real accelerator's `release` is a no-op for a
  snapshot it never saw, so the adapter device-release test asserts every upload is released
  exactly once and nothing twice, rather than released equals uploaded. The shared fake lacks
  `sssp`, `breadthFirstSearch` and `minimumSpanningTree`; the test supplies them from the CPU port
  and records their uploads. The real-device browser variant still drives only its test algorithm.
- The mask-back and declaration tests of phases 18 and 19 now run built-ins with their declaration
  taken off (`WholePageRank` and the others in `test/algorithms/input/harness.ts`), so they keep
  testing the whole-graph route as built-ins migrate.
- Shared test machinery for phases 21 to 23 is in `test/algorithms/scoped/harness.ts`:
  `describeScopedAdapter(name, build)` (the listed and multigraph cases, the listed one also
  asserting it differs from the induced run), `assertOverGeneratedScopes(build)` (fast-check) and
  `assertComputesOverScope`. The registry test's `OPTIONS` table holds per-algorithm options.
- Two packaging tests (`node-safe-entries.test.ts` "loads in a plain Node import" and
  `exports-map.test.ts` "publishes the catalogue tables") time out at 30 s when the four gate
  projects run together and pass alone (about 9 s). Each transforms every Node-safe entry
  point's module graph inside the test; the same timeout is recorded on master-based runs from
  2026-09-24 on, before this phase. Not addressed here.

---

### Phase 21. Adapters: community

**Scope.** Louvain, Leiden, Girvan-Newman, strongly connected components, label propagation, and
`utils/communityUtils.ts` (including its `edges.values()` reads). An algorithm that reads through
the util declares `scopeInput` only once the util reads the input; check 4 of the registry test
fails otherwise.

**Tests first.** A scoped test per adapter with the listed and multigraph cases of phase 20; the
registry test covers each adapter once its declaration flips.

**Done when.** These declarations are on, their allowlist entries are gone, and the registry test
passes.

**As built.**

- No adapter read through `utils/communityUtils.ts`. Its two graph-reading functions,
  `getTotalEdgeWeight` and `getNodeDegree`, had no caller in `src/` and the utils barrel is not in
  the exports map, so they were deleted with their unit tests rather than ported; the util now holds
  only the two pure partition helpers.
- Each adapter takes its node list from `scopeNodeIds(this.input(...))` in the orientation its
  `algorithmGraph` reads (declared for strongly connected components, undirected for the rest).
- The shared registry fixture is acyclic, so strongly connected components cannot tell a scope from
  the whole graph on it: the registry test gained a `FIXTURES` table, and strongly connected
  components runs on a cycle that closes only through a non-member.
- Label propagation groups the shared listed fixture identically listed or induced, so
  `describeScopedAdapter` takes an optional `ListedFixture`; label propagation's is a four-node
  clique whose listed edges are two disjoint pairs.

---

### Phase 22. Adapters: paths and flow

**Scope.** Floyd-Warshall, Prim, Bellman-Ford, DFS, bipartite matching, max flow, min cut,
including the direct `edges.values()` reads in Prim, bipartite matching, min cut and Bellman-Ford's
route marking.

**Tests first.** As phase 21. Floyd-Warshall gets only the equality tests on a 10-node graph; its
coverage is not raised (the repository's floyd-warshall note).

**Done when.** These declarations are on, their allowlist entries are gone, and the registry test
passes.

**As built.**

- `scopeEdges` also gives each edge's source and target ids (declared orientation), so an adapter
  that matches an `@graphty/algorithms` answer back by node pair needs no second read.
- Max flow's capacity was first read from the edge record by id, since the snapshot did not carry
  it. The store now keeps it in an edge column written at ingestion, so the adapter reads no
  record and the by-id read is gone.
- Min cut now reads its weights from the input (the element's edge weight, reciprocal pairs one
  edge, parallel edges summed), where it read the record's `value` key alone and kept the last of
  a group of parallel edges. Its caveat already named the `weight` attribute.
- Two whole-graph failures a scope made common were fixed rather than fixtured round: Prim threw
  "Graph is not connected" on a graph in several pieces (it now spans each piece, as Kruskal
  does, the start node's piece grown from it), and max flow threw on parallel edges (their
  capacities now add on one arc, and each of them publishes the pair's flow and capacity).
- Floyd-Warshall has only the listed and multigraph cases (at most six nodes) and its registry row.

---

### Phase 23. Adapters: what is left

**Scope.** Eigenvector centrality, link prediction and `utils/graphUtils.ts` (including its
`edges.values()` reads).

**Tests first.** As phase 21, one file per adapter. Link prediction's pairs stay within the scope
and are never written into the graph.

**Done when.** Every built-in declares `scopeInput`, the expected table has no row off, the
allowlist holds only its permanent entries, and the registry test passes.

**As built.**

- Eigenvector reads whether the graph is directed from `this.input("declared").graph.directed`, a
  metadata read of the input, where it read the data manager's snapshot.
- Link prediction pairs the input's nodes over the input's edges, so a pair never names a
  non-member. The pairs are rows of the result only; a test asserts the graph's edges are
  unchanged after a run.
- A pair list publishes nothing on an element, so the registry test's "the fixture tells the two
  runs apart" check compares a pair list's graph-level rows as well as its element values. Other
  shapes are still told apart by element values alone, because a graph-level summary such as a
  range differs between the two runs whatever the values do.
- `utils/graphUtils.ts`'s `buildAdjacencyList` and `buildWeightedAdjacencyList` had no caller in
  `src/`, so they were deleted with their tests rather than ported; the file kept `edgePairKey`
  and `requireNodeOption`. `edgePairKey` was deleted later, when its last callers (max flow, min
  cut, bipartite matching) moved onto the indexed ports. The `utils/index.ts` barrel, imported only by that test and not in the
  exports map, went with it.
- With every file migrated, the static guard's to-migrate list and its "only shrinks" test are
  gone; the guard holds only its three permanent entries. Both "declared off" and "declared on"
  registry suites run only when they have a row, so the registry test still runs with no row off.

---

### Phase 24. The plugin contract and the planner's suggestions

**Goal.** Third-party algorithms learn their scope (design 10.2, 10.4).

**Tests first.**

- `test/browser/extensions/algorithm-extension.test.ts` (extend): a plugin declaring
  `scopeInput: "subgraph"` calls `context.input("undirected", { simplify: "min" })` and sees only
  the scope; a plugin without `scopeInput` gets the phase 19 whole-graph path and caveat.
- `test/packaging/extension-points.test.ts`: `ScopedInput`, `ScopedInputOptions` and graph-format's
  `GraphSnapshot`, `NodeMask`, `EdgeMask` types are importable from `./extend`.
- `test/session/cost/estimate.test.ts` (extend): a refused run's suggestions include kept sets that
  fit, smallest first after the largest component.
- `RunOptions.scopeAs` is refused with `E_BAD_COMMAND` (reserved).

**Code.** `AlgorithmRunContext.input` (`algorithms/results/types.ts:113-126`),
`AlgorithmDescriptor.scopeInput`, derived from the internal `static scopeInput` of phase 18 (one
declaration, read by the seams, the caveat and the descriptor alike), the `extend.ts` exports, `session/cost/estimate.ts:995-1060`
suggestions. The "scope ... not forwarded to compute" paragraph of `graphty-element/CLAUDE.md`
(Extension Points) says what now reaches `compute`.

**Done when.** The extension parity test and the all-extension-points test pass.

**As built.**

- One declaration: a plugin writes `static scopeInput = "subgraph" as const` on its class, as the
  built-ins do. `Algorithm.register` publishes it as `descriptor.scopeInput` (`"none"` when absent)
  and refuses with `E_BAD_COMMAND` an authored descriptor that states a different value. The
  published copy is cached per authored descriptor, so re-registering the same class hands the
  registry the same object and stays a no-op. The built-in table derives the field from the
  classes; a folded key is `"subgraph"` only when every class behind it declares it.
- The planner reads `descriptor.scopeInput` and the internal `declareScopedInputs` hook, with
  `AlgorithmManager.declaresScopedInput`, is gone. The per-parameter probe is no longer needed:
  a folded key's classes agree.
- `parallelEdges` does not join the descriptor. A plugin states its merge policy per call, as
  `context.input(orientation, { simplify })`; the class static stays internal to the built-ins.
- `AlgorithmRunContext` gains `input`, bound by `DeclaredAlgorithm.computeRun` to the algorithm it
  runs; `publishResult` and `computeRun` now take the context without `input`
  (`RunControls`). Code that builds an `AlgorithmRunContext` by hand to call `compute` directly
  must now supply `input`: a type-level change to that one use, recorded in the design's public
  contract. The element's own detached context supplies one that throws, because the built-ins
  read their input through the algorithm.
- `scopeAs` is refused at run time by `runs.start` (and so `graph.run`) with `E_BAD_COMMAND` and
  `details.reason: "reserved"`; it is not added to the `StartOptions` type, so accepting it later
  adds a member rather than changing one.
- The suggestions test is in `test/session/cost/gate.test.ts`, beside the other suggestion tests,
  not in `estimate.test.ts`. The order is: the largest connected piece, then the kept sets that
  fit, smallest first, each counted exactly and charged its derivation. No scope is suggested for
  an algorithm whose descriptor is not `"subgraph"`, because no scope changes what it costs; that
  was a latent fault of the largest-component suggestion since phase 19.
- The suggestions reach `gateRun`'s refusal `details.scopes`, and `session.plan` discards them:
  `PlanBlock` carries only a code and a reason. Publishing them (a `details` member on
  `PlanBlock`) is a public-contract change left for the owner.

---

### Phase 25. Layouts over a set

**Goal.** `setLayout(type, opts, { scope })`, simulation engines only, members frozen at start
(design 11).

**Tests first.**

- `test/layout/scoped.test.ts`: `static scoped` is false on `LayoutEngine` and true on
  `SimulationLayoutEngine`, `NGraphLayoutEngine` and `D3GraphLayoutEngine`; `LayoutEngine.register`
  derives `LayoutDescriptor.scoped`; `AuthoredLayoutDescriptor` omits it (a type test compiles a
  third-party registration without `scoped`); a scope on a static engine refuses `E_UNSUPPORTED`.
- The hold: `writeNodePosition` (`LayoutEngine.ts:449`) never moves a held node; each built-in
  engine also pins held nodes natively (`SimulationLayoutEngine.pinnedMask`, d3 `fx`/`fy`, ngraph
  `pinNode`), and for each a member's final position equals a run where the held nodes are pinned
  natively by hand; the hold is never written to `graphty.pinned`; unpinning a non-member does not
  release it. The simulation bridge cannot run without a graph, so its comparison with a
  hand-pinned ForceAtlas2 run lives in the browser file below; d3 and ngraph are driven directly.
- `test/browser/sets/LayoutManager.scope.test.ts` (browser): the carry rule (explicit sets it,
  `"graph"` clears it, absent keeps it); changing `layoutConfig` keeps non-members held; switching
  layouts through the assistant command (`ai/commands/LayoutCommands.ts:52`) keeps `layoutScope`
  and the hold in agreement; removing the set a running layout names throws nothing and the layout
  runs unscoped; a click, a filter change and an attribute edit do not move the hold; a node added
  after start is held.
- The default layout path (`Graph.ts:651`) follows the same carry rule as the setters and the
  assistant command.
- The element: `layoutScope` property and `layout-scope` attribute (JSON) read and write through;
  an unscoped layout reads `undefined`; a setter never produces an unhandled rejection.
- `test/browser/extensions/layout-extension.test.ts` (extend): a third-party engine declaring
  `static scoped = true` receives the hold mask.
- `usedBy` lists the layout.

**Code.** `LayoutEngineStatics.scoped`, `LayoutEngine.scoped`, `catalog/layouts.ts`
`LayoutDescriptor.scoped` (mirroring `honoursWeights`, `LayoutEngine.ts:133-211`, `685-690`),
`SetLayoutOptions`, the scope owned by `managers/LayoutManager.ts`, `Graph.setLayout`
destructuring `scope` before spreading queue options (`Graph.ts:1655`), native pinning in the d3
and ngraph engines, and the element property. The `static scoped` TSDoc states the contract: a
scoped engine must treat held nodes as fixed in its own state, not only skip their writes.

**Story.** `LayoutOneSet` in `Sets/Kept Sets`; the play function asserts non-members did not move.

**Done when.** Tests, the layout extension test and the story pass.

---

### Phase 26. Scale: byte budgets and recorded timings

**Goal.** The design 6.5 memory budget asserted, and its timings measured at scale.

**Tests** (`default` project, byte accounting and work counts at 100k; every accounting they read
is the one its phase's walk (1.4) already checked):

- A freeze with live sets (five layers over expression rules, five over fixed sets, add one node):
  re-resolution resolves each live scope exactly once, and a following 200-row `scope.count` panel
  resolves nothing further.
- Bitmap cache within 64 MB plus pins; derived-input cache within max(256 MB, 1.5 x snapshot
  bytes); identity columns 8 bytes per node and 16 per edge; no `EdgeIdIndex` built by the sets
  code (spy); summary cache entries of fixed size per set.
- Definition member storage: about 8 bytes per node member, 24 per edge member in numeric and in
  ordinal form, plus the interned string per string-id edge member; captures 8 bytes per captured
  member.

**Recorded timings.** With `GRAPHTY_BENCH_SCALE=large` on the owner's machine, each row on the
runner design 6.5 names: the freeze row (browser runner: first repaint of an unaffected layer,
all layers repainted), one 50% scoped run needing both orientations (browser runner), and the
earlier phases' rows. The measured numbers are written into design 6.5 beside the projections.
Any number worse than its projection is reported to the owner; for the freeze row, building the
freeze-carry of design 6.2 is then the owner's design decision, not a tuning task.

**Done when.** The tests pass and every design 6.5 row has a measured number beside its
projection.

---

### Phase 27. Documentation and stories

**Goal.** A third party reaches a working set without reading this repository.

**Work.**

- New `graphty-element/docs/guide/sets.md`, in the sidebar after Algorithms
  (`docs/.vitepress/config.ts`): what a set is; creating one (ids, a query, the selection, an
  offer); readings, with a picture of induced, listed and clipped; kept versus inline
  (`{ define }`); using a set in a run, a layout, a style layer, the visibility filter, the
  selection and the camera; counting and reading members; status and each freshness; algebra;
  paths and `pathKind`; `set:changed`; the deprecations and their replacements.
- Updates: `algorithms.md` (scoped runs, the caveat, the behaviour change), `layouts.md`,
  `styling.md`, `events.md`, `javascript-api.md`, `web-component.md` (`layout-scope`),
  `extending/custom-algorithms.md` (`context.input`, `scopeInput`), `extending/custom-layouts.md`
  (`static scoped` and the hold contract).
- TSDoc on every new public member, `@deprecated` on the four migrated verbs.
- `test/documentation/guide-calls-a-real-method.test.ts` extended to check `session.sets.` and
  `session.scope.` calls in the guides against `SetsApi` and `ScopeApi`.
- Stories: `KeepACommunity` (Louvain, offers, keep community 3) and `ShortestPathAsASet`
  (Dijkstra, `createPath(offer)`, the path painted in order). Roster updated.

**Done when.** `npm run docs:build` passes (it fails on a broken `{@link}`);
`tools/check-links.sh --offline` passes; the extended documentation test and the storybook project
for `Sets.stories.ts` pass.

---

### Phase 28. The app check and the merge gate

**Goal.** Prove the app needs no change, and open the pull request.

**Work.**

- Build, lint and test the graphty app against the branch
  (`pnpm exec nx run-many -t build,lint,test -p graphty`). The design expects no change
  (design 17). If anything fails, the fix goes in graphty-element, never in the app.
- Full gates: `pnpm run prepush:fast`, every graphty-element shard (`default`, `browser`,
  `storybook`, `interactions`, `xr`, `bench`) and graph-format's tests; once the pull request is
  open, CI green on every shard, the device-release test included.
- Write the undo port notes into design 13.4 as a checklist against the final code: the five
  `prepare` functions, the store's `put` / `delete`, `toLogicalRecords()` / `loadLogicalRecords()`
  as the only serialiser of set state, the register and pending list, the execution
  token location, the captures location, the layout scope in `LayoutManager`. No undo code is
  imported.
- Confirm with the owner that no phase 0 answer changed and that the studio glossary has not moved
  under a published name since phase 0; any difference is decided before merge.

**Done when.** Every gate is green, locally and in CI, and the pull request is open with the
behaviour-change commits of section 1.1 named in its description.

---

## 3. Coverage of the design's "Built now" column

| Design section 20 row                                                            | Built in phase                                                                                                                                    | Extension point only (refused at doors, opaque on load)                                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Kept sets, readings, created from, status, algebra, offers, memberships, Used by | 6, 7a, 7b, 10, 12, 13, 14                                                                                                                         | --                                                                                                                                     |
| Ordered filter steps                                                             | 9 (the `scope` leaf, cycles refused), 17                                                                                                          | --                                                                                                                                     |
| Rule scope                                                                       | 7a (context snapshot)                                                                                                                             | `within` (11)                                                                                                                          |
| Search graph                                                                     | --                                                                                                                                                | `"search"` keyword (9)                                                                                                                 |
| File parallel-edge keys                                                          | --                                                                                                                                                | `EdgeMember.key` (2)                                                                                                                   |
| Population-scoped runs                                                           | 19 (mask-back), 24 (masks on `ScopedInput`)                                                                                                       | `scopeAs` (24)                                                                                                                         |
| Relative thresholds                                                              | 11 (`threshold` top / above)                                                                                                                      | `percentile`, `z`, `population` (11)                                                                                                   |
| Item comparisons, keyed items                                                    | 2 (open `ItemKey`)                                                                                                                                | `op`, other key forms (2)                                                                                                              |
| Carrying groups across re-runs                                                   | 12 (captures, `earlierRuns`)                                                                                                                      | --                                                                                                                                     |
| Extending a path                                                                 | 6 (`redefine`)                                                                                                                                    | --                                                                                                                                     |
| Restoring a removed set                                                          | 6 (tombstones keep the record)                                                                                                                    | --                                                                                                                                     |
| Carrying resolutions across a freeze                                             | 7a (serial and store tags), 15 (scheduler), 26 (the freeze row)                                                                                   | --                                                                                                                                     |
| Dirty-row rule re-evaluation                                                     | 5 (per-field attribute revisions, one writer)                                                                                                     | --                                                                                                                                     |
| Members in undo history                                                          | 6 (whole values, size cap)                                                                                                                        | --                                                                                                                                     |
| Provenance by source                                                             | 4, only if the owner says so in phase 0                                                                                                           | `EdgeMember.dataSource` (2)                                                                                                            |
| Comparison                                                                       | 1 (bitmaps, popcount)                                                                                                                             | --                                                                                                                                     |
| Faster scoped simulation, static layouts                                         | 25 (hold mask, native pinning; static engines refuse)                                                                                             | --                                                                                                                                     |
| Collapse, library across projects                                                | 6 (stable ids; namespaced id grammar accepted in load mode)                                                                                       | --                                                                                                                                     |
| Neighbourhood of a set, groups of an attribute                                   | existing `neighborhood.seeds`, `categories` rules                                                                                                 | --                                                                                                                                     |
| Live combinations                                                                | 9, 13 (rules over `scope` leaves)                                                                                                                 | --                                                                                                                                     |
| External codec                                                                   | 2 (internal load mode), 8 (record round trip)                                                                                                     | --                                                                                                                                     |
| Cross-session digests                                                            | 7a (`d1:`)                                                                                                                                        | --                                                                                                                                     |
| Assistant commands                                                               | 2 (`parseSetDefinition`), 9 (`parseScope`)                                                                                                        | --                                                                                                                                     |
| Plugin rule leaves                                                               | 2 (opaque round trip, colon rule)                                                                                                                 | --                                                                                                                                     |
| GPU kernels with an alive mask                                                   | 24 (masks on `ScopedInput`)                                                                                                                       | `scopeInput: "mask"` (open union, 24)                                                                                                  |
| Undo                                                                             | 6 (store, `prepare`, five operations)                                                                                                             | --                                                                                                                                     |
| Project file                                                                     | 2 (validator), 4 (counter resume), 6 (record shape), 7b (embedded-graph rebind), 8 (`toLogicalRecords` / `loadLogicalRecords` and the round trip) | --                                                                                                                                     |
| Export, `meta`, `compare`, `extendPath`, attribution, two graphs                 | --                                                                                                                                                | not built; each is additive to an open type (`restore` is built, and no `sets` root is reserved: design section 15.3, items 33 and 36) |

## 4. Risks to the schedule

1. **The adapter phases are the largest.** Most adapters already read topology through the two
   seams; the per-adapter work is their direct node enumeration and the direct edge reads listed
   in phase 18. Design 10.1 must say this (it currently says most adapters bypass the seams); the
   design owner corrects it before phase 18. Scoping is a per-algorithm runtime declaration, so an
   adapter half-migrated in its file cannot silently change output: until its declaration flips,
   the seams hand it the whole graph and its run carries the caveat. The registry test, keyed to
   the declaration and watching for reads around `input()`, is the proof; the file allowlist is a
   secondary guard.
2. **Phase 4 changes ingest.** The identity pass moves into `GraphStore` freeze so every store,
   headless sessions included, gets the columns. Run every data-source test in the browser project
   in that phase.
3. **Existing tests could quietly change.** Only the tests section 1.1 names may be edited, each
   only in its `fix` commit; the phase 18 list is written before any scoped-run code and used by
   the phase 19 commit. Any other
   failing pre-existing test is a regression to fix in the element.
4. **Phase order.** A phase that finds it needs later code stops and re-orders this plan (section
   1.1), because a stub or a skipped test would let every gate stay green over a gap.
5. **Attribute writers.** A cache keyed on an attribute revision is only as sound as the least
   disciplined writer; the phase 5 static test keeps every write going through `writeAttributes`.
6. **The studio's framework is final** (design 19). Every difference from it is settled in
   `design/sets/reconciliation.md`, and the code changes those settlements needed, made after this
   plan's phases, are listed with their tests in design section 24.
