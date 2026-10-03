# Item 3, find without selecting: security and privacy review

Scope: `session.data.find(text, { limit, kinds })` as recommended in
`element-api-decisions.md` section 3, against graphty-element on master. Scratch and the
measurement script are in `tmp/api-review/security-3/` (`bench.mjs`, `bench.log`).

## 1. A typed regular expression can freeze the tab, and the item does not say whether find takes one (blocking)

The search that find would reuse already accepts a `regex:` prefix
(`graphty-element/src/session/selection/targets.ts:363-374`) and compiles the typed text with no
limit (`graphty-element/src/session/query.ts:146-148`, `query.ts:225-237`). It then tests that
pattern against every node and every searchable attribute, synchronously, on the main thread
(`query.ts:160-174`). Item 3 makes this run "on every keystroke" and is silent on whether the
prefix carries over.

- **Measured:** `/^(a+)+$/` against one 29-character cell, `"aaaa...a!"`, took 6,011 ms in Node
  (`bench.log`). Each extra character doubles that.
- **How it is exploited:** a file from a stranger puts that cell in a name column. A reader who
  types any nested-quantifier pattern freezes the page, render loop included. Typing a pattern
  one character at a time also runs every half-finished pattern. A half-typed `regex:(` throws
  `E_BAD_COMMAND` on that keystroke.
- **Fix:** keystroke find matches literal text only, and the documentation says the prefixes
  are not read. Regex stays on the commit path (`selection.apply({ text })`), behind a length
  cap and a step or time budget. Otherwise the element runs it off the main thread and can
  cancel it.

## 2. Nothing bounds `values` or the scan, so the "every keystroke" claim does not hold (major)

`limit` caps `elements` only. `values` has no cap, and `total` and the ranking need a full scan
before the limit can be applied.

- **What one character costs:** typing "e" over a person or address column returns one `values`
  row per distinct value. At the render ceiling (50,000 nodes and 100,000 edges,
  `graphty-element/src/session/limits.ts:77`), with `kinds` covering edges, that is up to 150,000
  rows per keystroke, each holding the raw value.
- **Measured:** 1,000,000 elements by 5 string columns takes about 340 ms per keystroke for the
  scan alone, before sorting or grouping (`bench.log`). The scan lowercases every cell again on
  every call (`query.ts:153-155`), with no index.
- **No size cap:** `matched.value` and `values[].value` are `unknown` and hand back the whole
  cell. One 10 MB string cell in a hostile file is copied into the result list on every keystroke.
- **The section 3 claim is not backed:** "Synchronous, so it can run on every keystroke" rests on
  no size bound. Alternative (b) puts the trouble at a million elements, but the cost appears
  well before that.
- **Fix:**
  - Cap `values` with its own limit and a `valuesTotal`.
  - Truncate the returned values to a documented length.
  - State the cost bound in the documentation.
  - Have the element keep a lowercase index per searchable column, built once per data revision.

## 3. A hit is selected by its id as a string, which can select a different element (major)

The canonical example routes a hit through `selection.apply({ ids: [...] })`.

- **The id is not the element:** `ids` takes `readonly string[]`
  (`graphty-element/src/session/selection/targets.ts:121`). It reads every entry as a pasted id:
  exact text, then the trimmed text, then the number, all as NODE ids first, and edges only after
  that (`targets.ts:427-457`).
- **The collision:** a file whose edge ids are `"1"`, `"2"`, and so on, and whose node ids are the
  numbers 1, 2, and so on, is legal (`NodeId = string | number`, `EdgeId = string`). Karate is
  exactly this shape on the node side.
- **What the reader sees:** clicking the edge hit for `"3"` selects and frames node 3. A node hit
  for the string id `" 7"` can land on node 7.
- **Why it matters:** the next verb (hide, delete, style the selection, export the selection)
  acts on an element the reader did not pick. A crafted file can arrange this on purpose.
- **Fix:** make each hit a discriminated union, and add a selection target that takes hits or
  `{ nodes } | { edges }` directly, so the canonical example never goes through a string.

## 4. A stale hit selects whatever now holds that id (minor)

`FindResult` has no `revision`, although item 3's own conventions give every page one
(`RecordPage`). A result list stays on screen across a dataset swap, an undo or a reload. Ids such
as `1..n` repeat between datasets, so clicking an old hit selects an unrelated element in the new
data, with no error.

- **Fix:** add `revision` to `FindResult` and document that the app drops results whose revision
  is not current.

## 5. Find shows nodes a filter hid, with no way to stop it (minor)

Find has no `scope` option. Text selection has one (`targets.ts:121`), and filters compute
visibility masks (`graphty-element/src/session/visibility/filter.ts`).

- **The leak:** a project shared with a filter that hides sensitive rows still lists those rows'
  labels and values in the find box. Item 10 also inlines all the data, so the filter was never
  redaction.
- **Fix:**
  - Add `scope` (visible by default, like the commit path) and the planned `excludedBy` on each
    hit.
  - State in item 10 that hiding is not removal: a saved project file carries filtered-out rows.

## 6. Values from the file are handed to the page with no contract (minor)

`label`, `matched.value` and `values[].value` are attacker-controlled text from the loaded file.
The documented example builds a list of hits, and a newcomer who renders it with `innerHTML` (or a
non-React consumer) has XSS.

- **What is unspecified:** nothing says these are untrusted, or what `label` is when the
  label column itself holds markup.
- **The lookup reads the prototype chain:** the record lookup uses `record?.[key]`
  (`graphty-element/src/session/styles/sources.ts:580`, `:587`), not an own-property read. With a
  column named `constructor` or `toString`, an element without its own value yields
  `Object.prototype` members. Today only a string or number is tested (`query.ts:170`), so the
  function is skipped. A find that widens `matched.value` to `unknown` and stringifies it would
  match and return `"function Object() { [native code] }"`.
- **Grouping must not use a plain object:** `values` keyed by value in a plain object turns the
  value `"__proto__"` into a lost or wrong count.
- **Fix:**
  - Document all three fields as untrusted text, with `textContent` in the example.
  - Read attributes as own properties.
  - Group with a `Map`, and add a test with the values `__proto__` and `constructor`.
