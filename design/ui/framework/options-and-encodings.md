# Options and encodings

**Job.** The rules of the one form generated from a schema, for style channels, algorithm and
layout options, import mapping and export: grouping, disclosure tiers, presets, reset, "Mixed",
bound-value rows, encoding kinds, legend rules and the commit rule. **Not here:** the channel list
and the option schema (`element-contract.md` and graphty-element), row templates
(`interface-specification.md`). **Owner:** visual designer, with the interaction designer.
**Ceiling:** 30 KB. **Validated by:** the same rules routed through all five option spaces, none
needing a disclosure rule of its own.

**Status: stub.**

## Received from the conceptual model

- **Encoding kinds follow the attribute's measurement level** (`conceptual-model.md` 3.4, 5.1): a
  constant over a set; categorical through a palette; ordinal through an ordered palette or a ramp
  over ranks, with the legend in rank order; quantitative through a sequential scale, or a
  diverging one with a midpoint for signed values; time through a sequential scale over dates. Binning a quantitative attribute into groups is a scale setting; thresholding it
  makes a rule set. The scales offered are filtered by level.
- **The option schema is the only source of option controls** (`conceptual-model.md` 9). The app
  renders algorithm and layout options from the catalogue entry's `OptionDescriptor`, which already
  carries `group` and `advanced` (`graphty-element/src/catalog/types.ts`). Anything the schema
  lacks (presets, the cost of a specific value) is a graphty-element change recorded in
  `one-way-doors.md`, never an app workaround.

## Starting positions from the studio

- **35 channels are not 35 rows.** A property row exists only when a layer writes that channel;
  sections follow `interface-specification.md`'s property groups; disclosure tiers are set by a
  closed card sort over the 13 node and 15 edge rows, compared with a ranking by channel
  effectiveness (Munzner) and workflow frequency.
- **Arguments, parameters and edge reading are treated differently.** Source nodes and attributes
  are arguments; resolution and damping are parameters; direction (declared on the graph) and the
  weight attribute (whose role is declared on the attribute) are overridable per run.
- **Defaults show as defaults, and a run's record keeps the full resolved options**, not only the
  changed ones, so replay is exact. Only changed values are listed on the run's row.
- **The commit rule**: a cheap edit applies live; an edit estimated over 1 s becomes an explicit
  Run; over 10 s it shows its cost first (Nielsen's response limits).

## Received from the information architecture

Moved out of `information-architecture.md`; full text in
`research/archive/information-architecture-long-form.md` section 4 ("The result editor", "The
other editors").

- **The result editor's input rows.** Scope: the chip's scope by default; the full graph, a set,
  "without" a set, and the list forms Each of... and Without each of... over the groups of a
  partition or categorical attribute, the members of a set or the selection, the windows, the
  graphs, or the two sides of a comparison; non-overlapping items write one column, overlapping
  ones one column per item and, over two, a difference column. Arguments: every node-valued
  argument accepts a click, the selection, a set, a group, a found path or a pasted id list; a
  pair list has Sources and Targets. Direction and Weight default to the graph's declarations,
  with a per-run override named on the state line. Parameters fold to one row.
- **The style-layer editor.** Selector (the one rule editor, so "not in the working set" is an
  ordinary NOT); channels (colour, size, shape, outline colour and width, opacity for nodes; width
  and opacity for edges; label; arrow; group marks); the palette or scale drawn over the bound
  attribute's histogram with draggable endpoints and midpoint; legend; the count of what it
  paints; and for a bound channel a No value row counting elements with no value, with its look
  settable only on a layer the analyst made, never on an automatic one.
- **The Default look's editor** holds the default channels, with no selector.
- **The rule editor** serves a filter step, a rule set's Rule row, a style layer's selector and
  Find's query: predicate with AND, OR, NOT and membership, a Scope row and a Population row
  ("each group of" a partition, for top k per group).
- **Histogram bands as definitions** (5). A band is set by range, percentile or top N, and Save as
  rule set keeps its rule so it re-applies to new data.

## Sources

- `conceptual-model.md` 3.4, 5.1, 9; `document-architecture.md` 3.1 and 7.4
- `graphty-element/src/catalog/types.ts` (`OptionDescriptor`), `src/session/styles/channels.ts`
- Munzner, _Visualization Analysis and Design_, 2014, ch. 5, cited for channel effectiveness
