# Security and privacy review: item 2 (default binding by level; one legend rollup, #782)

Probe: tmp/api-review/security-2/probe.ts (run with `npx tsx` from graphty-element/).

## Major

1. **A file can hang the tab through `styles.legend()`, the call item 2 makes the app's one legend.**
   `groupCount` accepts any finite bin count (graphty-element/src/session/styles/scales.ts:312), and
   the legend sweeps `max(256, groups * 8)` samples synchronously (session/styles/legend.ts:388).
   Measured on master: a `node.size` layer with `scale: "bins", bins: 1e6` makes every `legend()`
   call take 753 ms; `bins: 1e7` on 1,000 nodes takes 9.3 s and 2.5 GB of heap per call. A layer is
   persisted in the styles document and in item 10's project file, so a stranger's file carrying
   `bins: 1e9` freezes the app on open and again on every repaint. Fix inside item 2: cap the group
   count a binding may declare (refuse with `E_OPTION_RANGE` above a published ceiling, such as 256)
   and make the legend's sweep bounded by `maxCategories`, not by the binding.

2. **`LegendBlock.other.swatches` is unbounded.** The legend already materializes every category
   before slicing to 12 (legend.ts:436) and puts the whole lumped list in the Other row's value
   (legend.ts:449). Measured: 50,000 distinct labels gave an Other row holding 49,992 names. Item 2
   turns that list into a swatch array, each with a paint call, on every `legend()` read. The
   decision gives no cap. Fix: `other` carries `count` and at most `maxCategories` example swatches
   plus a `hidden` count, and `maxCategories` is validated (integer, 1 to a published ceiling;
   NaN, negatives and Infinity refused -- `slice(0, Infinity)` returns all 50,000 rows to the app).

3. **`defaultBinding(path, channel)` has no cost contract, and its caller calls it per row per
   render.** The From data list disables unsuitable attributes by asking `suitable` for every
   attribute and channel. "Linear or log by its spread" needs a pass over the column: preparing a
   continuous binding walks and sorts it, 3.3 to 4.6 ms at 50,000 values (legend.ts:164). Thirty
   columns times six channels is about 0.7 s per render, on every keystroke in the list's filter.
   Fix: require `defaultBinding` to be answered from the cached `attributes()` descriptor (add the
   one spread statistic it needs there), so it is O(1) per call, and say so in the doc comment.

4. **Declared levels are new persisted input with no validation rule.** `declare` survives into the
   project file (the decision's own reason for rejecting alternative b). Nothing says the reader
   rejects an unknown level name, a path that names no attribute, a `__proto__` key, or a million
   entries. The notes document already refuses `__proto__` and bounds depth
   (session/notes/document.ts:96); the declarations need the same reader, named in the decision, or
   a map keyed by an attacker's path is one assignment from a polluted prototype.

## Minor

5. **Inferred level is steerable by appended rows.** Level comes from distinct-value counts, and the
   counter is abandoned past `ATTRIBUTE_UNIQUE_CAP` (session/attributes.ts:92), after which
   `uniqueCount` is absent. A joined or appended source that adds a few distinct values flips a
   column from category to quantity and silently redraws a palette as a ramp. Fix: a level once
   inferred for a bound column is pinned (`levelSource: "inferred"` becomes "declared" on bind), and
   a flip is reported, not repainted.

6. **The new default can throw where today's does not.** A column inferred as category bound to an
   enum channel (`node.shape`) with more categories than values throws `E_CAP_EXCEEDED`
   (session/styles/encoding.ts, `rangeFor`). The decision promises "Other past the cap" only for
   color. A file with many categories then breaks a binding that drew under the linear default.
   Fix: the default folds on every channel, never throws.

7. **The exported image may print what "Other" hid.** The legend is drawn into exported images by the
   element (tier1-design.md, decision 10). If the Other row's rolled-up swatches are drawn, a
   shared PNG lists every hidden category value (people's names in a people column). State that
   exports draw only the Other row's label and count.
