# Tier 5: settled behaviors

Every dry-run triage reads this file and cites it. A pilot complaint against a behavior listed here is
classed "no change". Reversing one needs a new dated entry below it, with the reason and the evidence;
the old entry stays. The full behavior is in `../../selection-groups/spec.md`; the panel's proposals
are in `panel/`.

## Binding from earlier tiers

Every owner rule for data UI in `../tier4/decided.md` still binds (compact Figma controls, no sentence
where a control will do, the table is view-only, configuration lives in the Data place, every hotkey
has a button showing its key, compact-mantine is locked to Figma, the drawing moves only when the
reader asks). Tier 3 and 4 entries on Escape, Tab, commit and remove buttons still bind.

## Decided by the panel, 2026-10-31 (Design Director)

- **The selection model is mock J's**: groups of ordered Add / Except / Keep steps, the result is the
  union of the groups that are on, each group starts with All or None. Owner-approved direction
  (2026-10-31). It narrows tier 4's "order never matters": order still never matters between filter
  cards or between whole-graph steps; it matters only inside a group, where an order icon shows it.
- **One editor and one value picker in both hosts** (style layer's Which nodes / Which edges, and each
  Data place filter card). Why: all nine walks found the two pickers listing different groupings, Node
  id in different places, and no algorithm output. One test asserts both list the same entries.
- **The filter card header stays as approved** (name, count, remove, Select / Filter to / Filter out,
  on box); its body becomes a selection. The Director's single list-wide "Mark | Hide" effect is
  rejected: it would restyle an owner-approved surface and undo tier 4's 2026-10-30 effect decision.
- **Owner question 1, open the data table automatically while picking: no.** The selection header
  carries the toolbar's Table button; pressed while picking, the table opens on Show only matches with
  a Group column (chit plus name, never a row tint). Count chips select what they count. Why: the
  drawing moves only when asked (tier 3, tier 4 R5, owner 2026-10-24); picking happens on the canvas;
  the table leaves about 330 px of canvas at 1440 x 900; nine of nine panelists said no.
- **Owner question 2, suspend styling and show group colors while picking: yes, on both hosts.** While
  a step card, the value picker or the verb menu is open, every layer is suspended, members draw in
  their group's color, the rest faint (never hidden, labels kept), the ring and hover mark stay, and
  the key's title reads "Preview: ...". A header toggle ("Group colors", on by default) shows the real
  styling. It ends on Done, Escape, a click outside, leaving the place or closing the panel. In a
  filter, the card being edited is held so what it would remove stays visible, faint. graphty-element
  draws it (`styles.preview`), never the app. Why: a commit with no visible effect (the "Val" walk),
  existing community hues make group colors unreadable, Figma's Outline mode is the precedent; eight
  of nine said yes on both hosts, and the toggle covers the Figma designer's style-layer objection.
- **Algorithms run outside the cards.** Picking a not-yet-run field starts the ordinary Analyze run on
  commit (never on highlight), without suggested styles, gated by the element's estimate (live under
  about 50 ms, automatic with Cancel under about 1 s, else "Run (about X)"). No runs list in the
  editor; only So far runs belong to a step. Settings is Analyze's own options form. Why: one value
  per algorithm everywhere (User Advocate); a card-started run that repainted the graph mid-pick
  (Engineer walk, PageRank) is the failure to avoid.
- **The import filter is "pre-load"; the style selector is live.** The filter's whole graph is
  everything loaded and its runs are on the full graph; its references freeze to node ids on commit,
  and Hovered or selected is not offered there. The style selector's whole graph is what the filter
  leaves drawn, and its references follow the reader. Why: a filter reading the filtered picture is
  circular, and a filter following hover or selection would re-lay the graph on every move.
- **Dropdown orders.** Verb menu: Add, Except, Keep (Figma's Union, Subtract, Intersect, with its
  glyphs from lucide; no Exclude). Start with: a segmented "No nodes | All nodes". Value picker: Data,
  Results, Analyze's categories (not yet run), Added, Relative to. Reference: Hovered or selected,
  Selected (N), So far, Sets, a typed node, plus the target button. Tests are visible segments chosen
  by kind; the text card keeps its approved operator select.
- **Rows follow Figma**: groups as Layers rows, steps as one-line Fill rows; the card opens inline, one
  at a time (tier 4 R4; the Interaction Designer's popover is rejected because R4 is binding and a
  popover would cover the next rows in a 240 px panel). Steps switch with an on box, matching the
  filter card's.
- **Words.** No noun for a group on screen (a chit and a letter; "group" is a part of a partition).
  "Focus" is "Hovered or selected"; "picked nodes" is "Selected (N)"; named selections are sets; "this
  group so far" is "So far"; counts read "24 of 77". The sentences "Nodes that pass every condition",
  "All 77 nodes: add a condition to narrow", the "Dropped the name condition" toast and the Hovered
  layer's red "The rule leaves none" go.
- **No compact-mantine change.** HistogramRow's brush, VariablePill, SegmentedControl and the listbox
  cover every control; the verb glyphs are app icons.
- **Not in this build**: hierarchy cuts, several reference nodes in one step, pair-list link scores,
  bounds bound to graph values, filtering while a file is read. Mock J keeps their design.
- **The approved Which nodes card and attribute picker change as the spec says** (the owner asked for
  this redesign). Their reference screenshots are retaken from the first build that holds the spec and
  listed here before the screenshot audit uses them.

## Waiting for the owner

- Retagging bfs `level`, k-core `value` and dfs `value` as ordinal changes what `fieldMeasurement`
  returns (`../owner-decisions.md`, 2026-10-31). The build keeps today's kind for them.
