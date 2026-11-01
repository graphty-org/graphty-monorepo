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

## Revised after the spec reviews, 2026-10-31 (Design Director)

Three reviews of the spec (`spec-review-redteam.md`, `spec-review-architecture.md`,
`spec-review-completeness.md`) found blockers in it. These entries narrow or reverse entries above;
the entries above stay as the record. The graphty-element contract moved to
`../../selection-groups/element-api.md`.

- **Reversal of tier 3 / tier 4 "an unfinished card is dropped when its picker closes" and "Escape on
  a just-added line that holds nothing takes it back, says so".** A step that has a value is kept;
  while its test is untouched it is _inert_ (changes nothing, its row reads "No test"). A step with
  no value is taken back when its value picker closes with nothing chosen (Escape or a click away),
  focus returns to its "+", and only the screen reader hears it (no toast: no sentences at rest).
  Why: tier 5's card is several controls (value, test, computed on), and dropping a step the reader
  chose a value for loses work; a step with no value holds nothing to lose. The red team showed the
  two old rules and the spec contradicting each other with no dated reversal.
- **Step states are applied, inert or pending.** An untouched test, an unchosen reference or several
  nodes in a one-node option make a step inert, never pending, so an unfinished step never blanks a
  layer. Pending is only about runs (computing, waiting for Run, paused while hovering, failed,
  stale). A pending group keeps its last ready result; a group never ready yet contributes nothing,
  at rest and while picking. A chosen reference that is empty now matches nothing, and a Keep or
  Except step whose input is empty is applied with nothing. Why: the hover recipe must draw the
  resting graph when nothing is hovered (completeness B2), and an untested step must not wipe a
  layer's paint.
- **Start with is written when a group is made and never derived.** New selections and "+ Or" groups
  start None; converted tier 4 cards start All. Why: deriving it from the first verb let a reorder
  flip a whole group's answer, and made "+"'s verb circular (red team 4).
- **Order and counts.** A step's chip counts the group so far, and says so in its tooltip and name;
  a run of base Keep and Except steps, or of base Add steps, is order-free. Narrows "order never
  matters between whole-graph steps" above, which an Add below a Keep contradicted (red team 5).
- **Runs: one run per algorithm, settings and scope**, shared by every reader of that scope. Narrows
  "one value per algorithm everywhere": a filter reads full-graph runs and a style layer
  filtered-graph runs, so Louvain can have two runs, told apart by their scope word. In the import
  filter, filtered-graph runs are greyed (circular) and the algorithm stays startable on the full
  graph (red team 3, completeness B4).
- **Every algorithm step saves as a `measure` step; graphty-element starts, gates and keeps consent
  for its runs.** Run limits are element options, unset by default; the app sets 50 ms live and 1 s
  ask. Consent holds until the step's definition changes; the "within twice the consented estimate"
  rule is dropped (it needed estimate history and no evidence asked for it). Why: as written the app
  would have compared estimates and sequenced runs, which CLAUDE.md forbids (architecture 2).
- **So far and live-reference computations are the step's own and are not listed in Analyze**
  (reverses "listed in Analyze as <Method> (A, step 2)"). Why: every layer and card has an A, so the
  names collided (red team 16), and the title was English the element would have had to write.
- **The picker keeps the approved Structure section, in both hosts** (Largest component, Isolated,
  Self-loops, Repeated edges); "Neighbors of selection" is an alias of "within 1 hop of Selected".
  Degree is listed under Data, read with no run.
- **Both pickers list the same entries in the same order, except Time window (filter only); states
  may differ by host.** Narrows "One test asserts both list the same entries".
- **A count chip's click.** Style selector: selects what it counts (task-flows 4.3, as everywhere in
  graphty). Import filter: opens the table on its rows, never selects, because a hand selection change
  switches every Select card off (tier 4), including the one being edited. An armed target button's
  click is part of picking: it never changes the selection and never ends the preview.
- **The chit is hollow at rest and filled while group colors show**, so it is never read as a
  layer's paint (red team 8, `panel/figma.md` risks).
- **Group colors are written into the group when it is made** (first free palette color) and never
  change on delete or reorder; the palette never wraps, so "+ Or" is disabled when it is used up.
- **Owner question 2, corrected count.** Eight of nine said yes; the Figma designer wanted group colors
  off by default in a style layer. The default stays on in both hosts, and the dry run asks style-layer
  readers which default they want. The element method is `styles.showBranches`, because
  `styles.preview` is a public binding preview since 3.26.0.
- **Words.** Scopes are Filtered graph and Full graph everywhere, run titles included (the app's
  "visible" and "whole graph" change). The table toggle is "Matches only" (the glossary rejects "Show
  only"). Keys are written Mod+D, Mod+] and Mod+[; the style layer tree's rows gain the same reorder
  keys, and every "..." item with a key shows it.
- **Element API shape** (`element-api.md`): the leaf is `union` with `branches` (the glossary keeps
  "group" for partition parts); `Scope` is unchanged and step references are a new `StepReference`;
  new leaves `measure`, `hops`, `touching`, `nonempty`, `same-value`, `by-size`; `watchSteps`,
  `asUnion`, `checkStep`, `allowRun`, `cancelRun`; live references freeze inside filters and sets;
  `valueKind` on descriptors.

### Review findings rejected or changed, with the reason

- **Red team 6, "skip a pending step so the group's last ready result applies".** Changed: a pending
  group keeps its last ready result, but a group that was never ready contributes nothing, and the
  later steps are not applied past a pending one. Applying a partial rule would paint or filter
  elements the reader's rule has not decided.
- **Red team 7, "Largest component as a Relative to preset".** Changed: the approved picker's
  Structure section keeps it (an owner-approved surface; Largest component takes no reference).
- **Architecture 2, `allowRun` returning a `Run`.** Changed to `allowRun` and `cancelRun` returning
  nothing, state read from `watchSteps`: a So far computation is not a session run, so one handle type
  would not fit both.
- **Architecture 3, `scope?` on the `measure` leaf.** Changed: the scope is the `union` leaf's
  required `within`, and `measure` is valid only inside a `union` step in this build, so one leaf
  cannot disagree with its group.
- **Architecture 6, refusing live view-state scopes in every filter condition.** Narrowed: inside a
  `union` leaf the element freezes them on write. Refusing today's accepted `member of "selection"`
  in a filter would change an existing API; it goes to the owner (below).
- **Completeness M1, extending `neighborhood` with a Scope and a direction.** Changed to the new
  `hops` and `touching` leaves: making `neighborhood.seeds` optional would change a type the element
  returns. "Linked to at least N of" moves to Not in this build.
- **Completeness M2, `whole?: Scope` on the leaf.** Changed to a required `within: "graph" |
"visible"`: only the two bases exist, and a required member keeps the default from being anyone's
  preference.
- **Completeness M3, mock J's Except default "edges only (nodes stay)" on a node step.** Rejected: in
  this spec a selection has one side, so on the node side it would change nothing. Node steps read
  edge values as nodes touching for every verb; edge steps keep mock J's both-ends / either-end chip.
- **Completeness M4, By value for named ordered levels.** Dropped: Pick is By value for levels, and
  `range.as` cannot be widened without changing a returned type; By position uses `threshold.as:
"order"`.

## Polish round 1 fixes, 2026-11-01 (studio engineer)

Fixed from the polish round 1 reviews (`polish-1-*.md`):

- **A layer of every node reads as one group of All with no step**, not as an empty None group. The
  layer paints every node, so its row, the folded Which row and the editor now read one count
  (77 of 77), and "+" starts with Keep. The reviewers asked instead to write a None group when a
  layer is made; that would leave a new layer painting nothing after its first fill until a step is
  added, and a layer row paints nodes and edges from one shared selector, so a side's union cannot
  be written at creation. "Start with is written when a group is made" still holds for new filter
  cards and "+ Or" groups. "Add a condition to narrow" is gone from every row.
- **A new filter card whose only step has no test yet is kept, folded**, when Done closes it; its
  X takes it away. Nothing is written until a step applies, as before.
- **The two hosts fold to the same chips**: per step the verb's glyph (none on a None group's first
  Add), the value and the short test, the group's letter first when there are several, the whole
  step in the chip's tooltip.
- **Keyboard**: Space on a group or step row switches it on or off and says so; Enter on a group
  row is its count chip; both are also in the group's and the card's "..." menus. The card takes
  Mod+[, Mod+], Mod+D and Delete outside a text box. Escape in a step card's box closes the card
  (the text is kept) unless the box's list is open. A value picked focuses the card's first box.
  Delete and duplicate are announced, and so are the preview's start and end.
- **Rename** is compact-mantine's InlineRename: the name preselected, a click away keeps it.
- **Counts**: the editor header's count chip is the style host's only (a filter card's header
  already counts it) and a Tab stop. A step that waits on a run shows no number. The preview key
  counts what each group draws (the first group wins) and leaves off a group that is off, so its
  rows and No match add up to the base. "Or" is off, with its reason in the tooltip, once the
  groups use the whole palette.
- **Number boxes** show a few digits at rest and the whole number when focused, the domain's ends
  as placeholders until a bound is set, at the default 24 px; the range slider speaks each thumb
  as the boxes show it.
- **Smaller**: card and row text is 11/16 body (names and the card's value at 600), a step's remove
  is shown at rest, the value is cut short only after the test, the verb and "..." menus say they
  are open (TargetTooltip), Computed on is two radio items, the group row's name says its color,
  the table's Group chits fill only while the preview draws them, and the reference search selects
  its text on focus and highlights the first match.

Fixed in graphty-element: a layer edited while the preview suspends it keeps its legend and is never
read as painted over; a converted "has a value" step is applied, not inert; a step over the
filtered graph walks (hops, touching) and counts degree (step, histogram) over the filtered graph
only; a filter card's measure step is written (the visibility compiler reads the step runs);
`StepsReading.branchesLeft`, `BranchReading.drawn` and `StepReading.waiting` are new (@beta); `DEFAULT_BRANCH_PALETTE` is @beta.

Carried to the next build round (each a rebuild of a control, not a fix): the number and time tests
of spec section 5 (By value or By position, the HistogramRow brush, the Not measured chip, the tie
chip), the rows as compact-mantine Tree items with the eye toggle and ColorSwatch, Which nodes as a
ControlSection header, the Pick on canvas target, card Settings, group Color and Save as set, the
value picker's shared listbox look (which also fixes its white-on-lime highlight), the new filter card's approved header from the start, the
Shares a value with and On a path between presets, the element reading `valueKind` and `checkStep`
in the picker, and `watchSteps` starting no run until a write.

## Waiting for the owner

- Retagging bfs `level`, k-core `value` and dfs `value` as ordinal changes what `fieldMeasurement`
  returns (`../owner-decisions.md`, 2026-10-31). The build keeps today's kind for them.
- A filter condition `member of "selection"` is accepted today and silently goes stale when the
  selection changes. Refusing it, or making it follow the selection, changes an existing API
  (`../owner-decisions.md`, 2026-10-31). The app never writes it; `union` leaves freeze it.
- The split button's chevron is 16 px wide and the range thumbs 10 px, under the 24 px target:
  both are compact-mantine's Figma look (`../owner-decisions.md`, 2026-11-01). The build keeps them.
