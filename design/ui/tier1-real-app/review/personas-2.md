# Personas review: default binding from what a column measures, and the legend rollup

Subject: section 2 of design/ui/tier1-real-app/element-api-decisions.md (issue #782). File and line
references are to graphty-element/src on this worktree.

## The section's own premise is half wrong

The section says "a binding with no scale is linear for every column, so color by a group number
draws a ramp". That is true of a layer written with `styles.add` (encoding.ts:943-945,
`defaultScaleFor` returns "linear" for every color or number channel). It is NOT true of
`styles.encode` on a run: EncodingSpec.ts:172-197 already picks "ordinal" for the primary field of
a community, layered-grouping or category-table result. The section's canonical example,
`defaultBinding("results.louvain.group", ...)` followed by `encode({ run: "louvain", ... })`, shows
the one case that already works. Section 2 adds a second defaulting rule (attribute level) beside
the existing one (result shape) and says nothing about which wins for a run field.

## Persona tasks

### Marcus, data scientist porting a metric (plugin-author-data-scientist)
Task: register his weekly "influence tier" (integers 1 to 5) with `defineAlgorithm({ node })` and
see it colored like the built-ins. `defineAlgorithm` maps `node` to the "node-metric" shape
(simple/defineAlgorithm.ts:69-74), so encode reads it linearly. Section 2 gives him only
`session.data.declare`, a per-session call by whoever hosts the element; a plugin cannot ship the
level with its field (FieldDescriptor, catalog/types.ts:296-307, has no level). His dashboard
colleague must know to call declare. Also: level is inferred "from type and distinct values", so
his 30-node validation graph (few distinct scores) may infer category while the production graph
infers quantity -- the same plugin draws differently on the two graphs he compares by eye.

### Tomasz, researcher with a lab TSV (plugin-author-domain-researcher)
Task: in a single HTML file, color by the lab's "essentiality class" and size by "replicate count"
(1 to 3). He writes `styles.add` with no scale, reloads, reads one error line. Section 2 never says
what happens when a binding is unsuitable (`suitable: false`): does `styles.add` refuse with an
error naming the column, paint nothing, or paint the linear ramp? He will not call
`defaultBinding` first; the only path he takes is the one with no specified failure.

### Sofia, front-end developer (plugin-author-frontend-developer)
Task: render the element's legend in the product's own React legend, in the company's languages.
From the .d.ts she sees three overlapping things: the existing bucket row inside `swatches`
(legend.ts:440-451, label "other: K groups", `value` an array), `overflow.hidden` (legend.ts:140-143),
and the new `other` with its own label, count and swatches. Nothing says whether the new `other`
replaces the bucket row or appears beside it, so she can render "Other" twice. Both labels are
English sentences built in the element, which she cannot translate. And her upgrade contract
breaks silently: a binding with no scale repaints differently in a minor release, which her
compile step cannot catch.

### Ines, graph library author (plugin-author-graph-library-author)
Task: publish a community-detection plugin for 1M-node graphs. She asks: what does inferring a
level cost? Inference needs a distinct count per column; `uniqueCount` is optional on
AttributeDescriptor today (catalog/types.ts:814). Section 2 does not say whether inference runs
for every column at load, on every data change, or lazily, nor that the repaint (prepareRule,
encoding.ts:1415) must now consult session attribute state it does not read today. She also
finds two declaration channels for "this field is a grouping" (result shape and level) with no
precedence rule.

### Chris, ML engineer (ml-engineer-recsys)
Task: on a bipartite user-item graph, color by a k-means embedding cluster (integers 0 to 63) and
size by a predicted score in [0, 1]. Clusters: 64 distinct integers among 1M nodes -- the
inference threshold is unstated, so he must declare. Then 56 of 64 clusters are one grey (overflow
"other" at 8, EncodingSpec.ts:87-92), and `maxCategories` on the legend does not change that.
Score: "linear or log by its spread" is unspecified; log is wrong for a probability and any zero
becomes "not plottable" (encoding.ts:125-127). He needs the rule to predict the picture.

### Dr. Kim, knowledge engineer (knowledge-engineer)
Task: color entities by ontology class (about 40 classes) and filter by a creation date. Where is a
declared level stored -- the styles document, the project file of section 10, or nowhere once the
session ends? Can an import carry it from the file (GraphML attribute types, a CSV header) so her
ETL output arrives declared? Neither is said. "time" has no stated default for any channel, and
"text" versus "category" for IRI-like strings is not defined.

### Alex, analyst (analyst-alex)
Task: color incidents by severity (Low, Medium, High, Critical) and reopen the same analysis next
month. The only category scale, "ordinal", orders values largest group first
(encoding.ts:660-673), so Critical can get the first palette color because it is rarest or most
common, not because it is most severe. There is no ordered-category level. And with inference by
distinct count, next month's file can cross the threshold and the saved layer (no scale written)
repaints as a ramp.

## Other defects found

- The legend cap already cuts the bucket row: with a 12-color named palette and overflow "other",
  the "other: K groups" row is swatch 13 and `slice(0, SWATCH_CAP)` drops it (legend.ts:664, 681).
  Section 2 adds a parallel field instead of fixing this.
- `legend({ maxCategories })` is a per-call argument, so the cap still "lives nowhere the app and a
  later exported legend can share": each caller passes its own number. The stated problem is not
  solved.
