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

## Polish round 2 fixes, 2026-11-01 (studio engineer)

Fixed from the polish round 2 reviews (`polish-2-*.md`):

- **The preview keeps the ring and the hover mark** (spec 9): graphty-element draws every layer of
  the state selected or hovered above the group colors. Pointing at or focusing a group's row marks
  it (`BranchesView.mark`, new, @beta): its members at full strength, the other groups faint.
- **One preview, one description.** An editor that starts picking claims the editing slot, an editor
  at rest keeps it only while nobody else holds it, and each clears only its own claim; another
  editor that starts picking ends this one's picking. The key reads `styles.shownBranches` (new,
  @beta), the view the element draws, and `style:branches-shown-changed` now also tells a view that
  replaces another. The style editor takes focus on its first row when it opens from the folded row.
- **Reversal of spec 4's "else the last step's verb"**: after a group's first step "+" writes Keep.
  Refining narrows; widening is what Or is for (ease walk: Largest component then Degree 2 or more
  grew 249 to 283). The split button draws the verb's glyph and says it as a word beside it; a word
  on the button itself would change compact-mantine's SplitButton (Figma-locked), so it stays beside.
- **A yes-or-no value picked writes nothing**: its untested form is an empty pick, which
  graphty-element reads as inert on any value; its card shows no choice until Yes or No is picked.
- **A data column named rank or percentile is listed**; only a run's rank and percentile companions
  are left out of the picker.
- **A value with no test (Largest component, Isolated, Self-loops, Repeated edges) applies as picked**;
  no card opens to repeat its row, and focus goes to its row.
- **Cards count over the selection's base**: a node step reading an edge value reads only the edges
  the filter left (graphty-element), a category checklist counts and a number card's "no value"
  count are taken over the base, and Degree's range is read over it.
- **A So far step's card** draws its test from the values its own computation gave
  (`StepReading.values`, new, @beta), and the run line says Computing only for a computing reason.
- **An edge step reading a node value** takes Both ends | Either end in its card.
- **Menus speak the style tree's grammar**: the group and step "..." menus are drawn as the tree's
  row menu (icon, words, key, dividers between edit, view and remove), with Show / Hide on
  Shift+Mod+H (Space stays an alias on a row). The card's menu no longer lists Space. The verb menu
  checks the step's own verb. The style tree's rows gain Move up (Mod+[) and Move down (Mod+]).
- **Words**: a filter card's name, remove, undo step and announcements say the selection as its
  rows say it (`selectionWords`), so "a rule" is gone and one filter is spoken one way. In a filter
  the reference list heads its first section "Selection" (nothing in a filter is live) and So far is
  off on a group's first step; the list is capped at the shared 240 px. A single group goes by the
  selection's title in the key and the table. The key's No match row has a faint swatch.
- **Rows**: the step's on box and remove carry their own tooltips with their keys, the row's
  tooltip is on its words only; a step that is off says so in its name; a value is cut short only
  once its test is gone; the new-step placeholder and the run line are 11/16 body text; "Or" then
  Escape takes the new group back; a pending group's chip says "Waits", its last count in the
  tooltip.
- **Focus and contrast**: a text card puts focus in its text box; a pending card keeps focus waiting
  for its first box; a style count chip that selects hands focus to the inspector's heading and
  says how many were selected; the "how to match" select is the 24 px Figma control; the table's
  Matches only is compact-mantine's segment ("Matches only | All"); the value picker draws as
  compact-mantine's listbox (its lit row keeps the menu ink), from `LISTBOX_CLASS_NAMES`, newly
  exported by compact-mantine with no change to its look.
- **Group colors** has its own glyph (Palette), no longer the plain circle the tree's group rows use.

Carried, each with its reason:

- A Select card's effect is still written while its editor is open. Holding the selection until Done
  needs graphty-element's select conditions to defer under a held view and to come back as one undo
  step; that touches the select-condition undo pairing and is a change of its own.
- A new filter card kept on Done still lives in React state until a step applies. Writing it at once
  needs graphty-element to read a condition whose union has no applied step as inert (removes and
  selects nothing) -- a behavior change to a @beta leaf, to be designed with the counts' reason code.
- `watchSteps` still starts session runs, and the render-time peeks remain; the import filter's
  picker still lists filtered-graph runs un-greyed, and two runs of one algorithm are not yet told
  apart by scope. These need graphty-element's `checkStep` to say which run a step reads.
- After reopening a project, a layer with a So far step can count 7 while painting 8 until an undo:
  graphty-element does not restore step-owned computations with the project.
- The reference picker is still Mantine's Select: no option highlighted on open, no
  `aria-activedescendant`; the fix is to build it from the value picker's searchable listbox.
- Rows are still role group (not treeitem with level and expanded); rows now carry
  `aria-keyshortcuts`, and the menus' items say their keys.
- The range slider's raw-number reading was not reproduced: compact-mantine's new accessibility-tree
  test reads the caller's words on both thumbs after mount and after the value changes. The next
  a11y walk re-checks it on the card's own path (keys on a thumb).
- The "With issues" chip's contrast and a compact-mantine Chip theme are compact-mantine changes (see
  `../owner-decisions.md`).
- Minors not taken: the filter host header's two icons, duplicate control names across groups, a
  match count while typing, Degree's summary in the picker, the text card's operators (Matches, Not
  measured chip), the While and Within words in the card head, the legend's and a new layer's row
  denominators.

## Polish round 3 fixes, 2026-11-01 (studio engineer)

Fixed from the polish round 3 reviews (Figma, ease, correctness, accessibility, architecture):

- **Figma's keys**: Mod+] moves a row up (Bring forward), Mod+[ down (Send backward), in the style
  tree, the selection's rows, both "..." menus and `aria-keyshortcuts`; spec check 30 corrected.
- **"+" draws a plus**; the verb it adds sits beside it as its glyph and word, so the button no
  longer looks like the waiting placeholder or an inert step. Its caret menu opens below its start
  and is drawn as the row's verb menu (check column, nothing checked).
- **The value picker** (shared with the approved Add filter picker) cuts a long name with an
  ellipsis (the whole name in its tooltip and accessible name), keeps the fact's width, scrolls
  only up and down in the themed overlay scrollbar (ScrollArea, as every Select), marks a value
  already used with a dimmed check (the words stay in its name) and lights the first unused match.
- **Sizes**: Start with and Ends are default 11/16 segments; a step's remove is the default 24 px
  CloseButton; the step words and folded chips use the 1000 ms tooltip delay; inside a filter card
  the step card draws no second border.
- **Focus**: closing a row's verb or "..." menu hands focus back to the row, so the arrows keep
  walking; Done or Escape on a filter card returns focus to the card's own disclosure.
- **A step's count is a chip in the style host** (it selects what it counts, "so far" in its
  tooltip); in the import filter it stays text, because the table lists a group's members, never a
  step's.
- **Picking stays on until spec 9's events**: a value with no test (Largest component, Isolated)
  applies as picked and the preview stays; closing a card with Escape keeps it (Escape again, with
  nothing smaller open, ends it); the row's verb menu also starts it. "Removed ..." and "No step
  added" are no longer talked over by "Preview ended".
- **The mark draws on top**: pointing at a group draws its members in its color at full strength
  even where an earlier group shares them (graphty-element draws the marked branch last).
- **So far steps** (graphty-element): a step's own values are part of what `watchSteps` reports as
  changed, so an untested So far step's card shows its two boxes; two groups with the same So far
  step each read their own computation; a live layer repainted outside a command (a run, a filter's
  base or a step's computation landing) publishes `project:derived`, so the key's count follows a
  filter change for a layer with a So far step.
- **A new filter card is written with its first step**, so it outlives a switch of place.
  graphty-element now reads a keep or exclude condition whose selection has no step with a test
  (every step untested, off, or no step) as removing nothing; a select one already selected nothing.
- **Groups keep their names**: once there are several, each group holds its letter, written when it
  is made, moved or copied, so a move never renames one; a copy takes the next free letter and
  color; a lone group goes back to the selection's title.
- **Words**: an edge step on Either end says "either end" on its row and folded chip; an off step or
  group says "off" in the folded summary and is drawn dimmed; an open card's row says "open" in its
  name (Chromium drops `aria-expanded` on a group); "Or" then Escape says "B not added".
- **The import filter speaks its own count** once typing pauses; the selection's and the filter's
  status lines stay quiet while an editor is open.
- **The table's Shown | All** presses All and waits, its reason in the tooltip, while Matches only
  lists a selection over the whole graph (a filter's): Shown could not narrow those rows.
- **The range thumbs** use compact-mantine's RangeSlider, which puts the caller's value text on each
  thumb: a Closeness thumb is spoken as its box shows it.
- **Lists**: the text card's suggestions close when Enter commits; a reference list section the
  search empties goes with its heading; the reference list is capped at 240 px on the list itself
  (compact-mantine's lists ignore `maxDropdownHeight`: `../owner-decisions.md`, 2026-11-01).
- **A number card's "no value" sentence** is a "Not measured: N" chip, its meaning in the tooltip.

Carried, each with its reason:

- The include-not-measured toggle and By value | By position on the number card, and Has a value /
  Has no value leaving the match select: the card model has no include flag yet (the element's
  range leaf already takes `missing: "include"`); a rebuild of the card, not a fix.
- The Pick on canvas target: an armed canvas click that fills the reference and changes neither the
  selection nor the preview is a canvas control, so graphty-element needs a one-shot pick mode first.
- A Select card's effect is still written while its editor is open (the select-condition undo
  pairing, as before).
- `watchSteps` still starts runs and the render-time peeks remain; the import filter's picker still
  lists filtered-graph runs un-greyed; `checkStep`'s typed codes and details, the rank and
  percentile role on `FieldDescriptor`, and a `stepValuePath` helper: one graphty-element change to
  how a step names the run it reads, not a polish fix.
- After reopening a project a never-ready So far group still counts as nothing until it computes:
  the key now re-reads when the painter repaints, but restoring step-owned computations with the
  project is still to do. The count reason code for an inert filter condition is not added.
- Rows as treegrid rows with level and expanded (the "open" word stands in), group names in every
  control's name, the open card repeating its row, the table's row-count line while picking, focus
  on the first box after a run finishes, and Escape from a count chip's selection back to its layer.
- Disabled menu items skipped by the arrow keys are compact-mantine's (`../owner-decisions.md`,
  2026-11-01); the step's on box stays 12 px until the eye toggle replaces it.

## Owner feedback 2026-11-01 (Design Director)

The owner reviewed the built cards (`owner-feedback-2026-11-01.md`): cramped, disorganized, no
progressive disclosure, "Select", "Filter to" and "Filter out" not understood, two "+" that look
alike, "While has nodes" listing every node, "they make me want to walk away from using graphty".
Three concepts were mocked from first principles (main checkout `tmp/selection-redesign/`: sentence,
outline, wizard-light) and judged by four lenses (owner's eyes, personas, Figma consistency, 50,000
nodes). **The outline won** (8, 4, 8 and 7 of 10; the personas' 4 was for verbs drawn as glyphs,
fixed below), grafted with the sentence's search-first pickers, "Check N" and one-token references,
and wizard-light's result-first rest state. The model and every decided behavior not named here
stand. Each entry reverses or narrows an entry above; those stay as the record.

- **Reversal of "the card opens inline, one at a time" (tier 4 R4, panel entry "Rows follow
  Figma").** The outline shows the recipe; ONE property pane under it holds the selected row's
  controls. Why: inline cards moved and wrapped the rows under them and left gaps, which is the
  owner's "row breaks, empty spaces"; Figma's Layers panel over its Design panel, and graphty's own
  Style tab, are the precedent. The 240 px popover objection to the Interaction Designer's proposal
  does not apply: the pane is in the panel, not over it.
- **Reversal of the step row's anatomy** (verb icon menu, on box, count chip, remove X, order icon).
  At rest a step row is a verb WORD in a 40 px column, the value, the test and tags for non-default
  settings; no control, count or icon. The count is in the pane and the tooltip; turn off, duplicate,
  move and delete are in the pane's "..." (and Delete, Mod+D, Mod+] / Mod+[); "So far" is a tag on
  the row instead of the order icon. Why: "very hard to find and focus on what actually matters";
  the personas read glyph-only verbs as "both apply" (`judge-personas.md`). The decided.md polish
  note "the step's on box stays 12 px until the eye toggle replaces it" is superseded: steps have no
  on control at rest.
- **Reversal of "the filter card header stays as approved (Select / Filter to / Filter out)".** A
  filter card has no effect word: its selection is what stays (All nodes, then Keep and Except).
  Select becomes the one-time command "Select N" in the card's "..."; Filter to and Filter out stay
  commands on a selection, row, legend entry or band that create a card. Saved tier 4 cards convert:
  Filter to -> All + Keep, Filter out -> All + Except, Select -> All + Keep, turned off. Why: the
  owner does not understand the three words; with the effect gone, "Filter out ... Except" (the
  double negative the spec sent to the dry run) cannot occur. The conversion is a two-way door:
  tier 5 cards are unreleased and tier 4 cards hold one condition each. The glossary's "filter step"
  loses its outcome (`../../framework/glossary.md`).
- **Reversal of "+" at a group's foot (split button) and "+ Or".** "+" appears only in section
  headers and adds an item to that list (a style layer, a filter card). Inside a selection, a step is
  added by its verb word ("Add...", "Keep...", "Except...", only those that can change the group),
  a group by "Or...". These rows appear on hover or selection, never at rest. Why: the owner could
  not tell the card "+" from the filter "+"; now each "+" has one meaning.
- **Narrowing of "Card '...'" and the visible test segment.** Advanced, collapsed in the step pane
  on every selection and naming non-defaults on its right, holds Computed on, Edge ends, Not
  measured and Settings. Start with moves to the group (or title) pane. Why: progressive disclosure;
  none of tasks 1 to 3 needs Advanced.
- **New: every list is bounded** (spec 4.3). The reference picker lists no node until typed, then at
  most 8 by prefix and degree; sets are capped at 8; checklists draw 8 rows in all, checked first,
  with "Check N" for a search's matches; rows summarize values ("1, 3 and 2,083 more"); a reference
  is one token. Why: "While has nodes" listed every node; the scale judge found uncapped ticked lists
  in two concepts.
- **New: "Passes none" is drawn at rest** on the step that empties its group (neutral ink). Why: the
  scale judge reached "0 of 50,000" with no signal.
- **Kept against judges' suggestions.** Group letters A, B (the personas disliked them; decided
  above, and the owner did not object). The verbs Add, Keep, Except (the personas proposed "and /
  but not / or"; that reads as a sentence, which the owner's data UI rules forbid). New style layers
  start None (already decided). Hops default 2.
- **compact-mantine is unchanged.** Every control is an existing one; no Figma look change is
  needed, so nothing goes to `../owner-decisions.md`.

### Built 2026-11-01 (studio engineer)

- The outline and pane are built in both hosts; the style host draws the outline always (the
  folded Which row is gone). A new filter card shows its title pane (Nodes | Edges) while its
  first value is picked; Escape in that picker takes the card back, a click elsewhere keeps it.
- graphty-element, additive and @beta: `scope.asUnion(rule, { effect: "exclude" })` reads a
  Filter out card as what stays (All + Except); a node page sorts by `graphty.degree`. A tier 4
  card is shown in that form and written as effect keep on its first edit (a Select card off).
- The reference picker searches with `data.nodePage` (the find box's matching: id or any value),
  starts-with first, then the most connected, 8 at most. Hops default 2.
- Not built: the "Pick on canvas" target (graphty-element has no armed one-click pick that leaves
  the selection alone), the group pane's Color, Settings in Advanced, and the HistogramRow brush
  (the number test keeps the approved range card).

### Repolish 1 fixes (2026-11-01, studio engineer)

- **Pointing never adds a row.** The Add row and Or... are drawn only for the selected row's group
  while a row is selected (and on an empty selection); hover changes the background, the eye and
  the canvas marking. Opening a "..." menu no longer moves the pane. Why: a hovered group grew two
  rows and moved everything under the pointer.
- **One way to add a step: "Step..."**, a tree item in the value column, with the group's default
  verb (Keep in an All group, Add in a None group). The pane's verb segment is the only verb chooser
  and offers only the verbs that change the group at that step. Or... is a tree item at the chit's
  x. Why: "Add" meant three things within 70 px, and buttons inside the tree failed axe.
- **11/16 type everywhere in the outline and panes**, verb, value and test in normal ink; dimmed only
  for state words and All nodes; 600 only on the title. Focus ring: Figma's 1 px
  `--cm-border-selected`.
- **Captions** on Start with, Computed on and Edge ends (compact-mantine's FieldRow under
  PanelLabelsProvider). **Done** ends picking in one click from any pane's first row.
- **Counts:** the title pane draws no second count (a style layer's pane has Select, its count in
  the tooltip; a filter card's has the Table button only); a step pane reads "77 so far"; counts
  outside the editor (filter chip, layer rows, the Which row) carry thousands separators.
- **Filter cards** are named by their first step as its row says it ("Degree min 10") and follow
  edits; the Filters header shows what the cards leave together or "Passes none"; the open card's on
  box takes no Tab stop (Space on the title row, "Use <name>"); its Duplicate shows and takes Mod+D.
  A resting card's focus ring goes round the row, never the name alone.
- **Words:** "While ... has nodes" until a reference is chosen; an untouched test (text, a date)
  leaves the test column empty; a long list keeps "and N more" and cuts the names before it; a long
  value cuts before its tags and state word; a tier 4 degree leaf reads "Degree min 5"; menu keys
  draw Delete as "Del"; Move up and Move down at an end are greyed with no second line.
- **Large graphs:** the reference search matches a node's id and name only
  (`data.nodePage({ matching: { names: true } })`, graphty-element, additive, @beta); "Pick on
  canvas" is the list's first item and a 24 px target beside the field (the next node clicked);
  every community value is named by its rank (`RunResult.groupRanks()`, additive, @beta); the step
  pane and the outline read their words once per reading; the value picker's lists are read only
  while it is open; a checklist keeps the two largest unchecked values in its 8 rows.
- **Number test:** a step's test is a By value | By position segment and compact-mantine's
  HistogramRow with its brush over the Min and Max boxes, bins from `scope.histogram` over the
  step's base.
- **Runs:** a measure step with no test reads Computing or Run while its values are not there
  (graphty-element now says so in its reason); a run with no cost estimate on a scope of more than
  10,000 nodes and edges waits for Run while `askAboveMs` is set.
- **Saved cards:** a tier 4 Filter to card on an edge value stays read-only (graphty-element's
  `asUnion` has no union form for it: an edges selection would keep every node); a removing card
  no editor reads counts what stays; a saved Select card's box reads on while it still selects.
- **Not done here:** the preview's paint on 50,000 nodes (each node is repainted one by one; drawing
  the preview as a per-instance color write is renderer work), a Hovered-or-selected hops step
  pausing while the pointer moves, the filter commit's element-side cost, the layer row's count
  after reopening a project, the algorithm's Settings under Advanced, the group's Color row, a fixed
  8-row checklist height, log bar heights on a skewed histogram. Three element changes that alter
  existing results wait for the owner (`../owner-decisions.md`, 2026-11-01).

### Repolish 2 fixes (2026-11-01, studio engineer)

- **Selecting never moves a row.** "Condition..." (was "Step...") and "Or..." left the outline:
  they are words at the left of every pane's first row, acting on the selected row's group. The
  outline holds only recipe rows; an empty selection keeps its one "Condition..." row. One header
  order in every pane: add actions at the left, icon buttons, "..." and Done at the right; the
  pane's main control (verb segment, group name, Nodes | Edges) is its second row. Why: selecting
  group A pushed group B down 32 px under the pointer. The Figma review's "main control at the
  left" is changed to "add actions at the left" so the owner's "first row beside '...' and Done"
  holds in every pane.
- **Fewer words on screen.** Select N, Table and Group colors moved into the title pane's "..." (no
  bare "Select", no unlabeled palette icon; a 200 px filter card has no room for a third icon
  beside Condition..., Or..., "..." and Done). Start with left the title pane and is collapsed under a
  group pane's Advanced; a group that Start with empties says "Passes none" on its row. The
  "Add a step (Union)" tooltip is gone. A pending row says "Run"; the estimate is in its tooltip
  and on the Run button.
- **A condition is said once.** "All nodes" is drawn only for an All group with no step or a first
  Except; a group's first step at its default verb leaves the verb column empty ("Degree max 3").
  A filter card named after its only step draws no outline: its title row is the recipe and its
  title pane holds the step's controls (headless step pane) under the card's own.
- **Groups read "or"**: every group row after the first writes "or" in its verb column.
- **Rows:** the test gives way long before the value (flex-shrink 1000 against 1), so a value keeps
  its first word; a relative condition is never cut, its reference and state word give way with an
  ellipsis; While with no reference reads "While ... has nodes" with no test column; values keep
  normal ink in every state; a selected row drops its state word.
- **Pane controls** are the default size (24 px, 11/16): every SegmentedControl, the text box, the
  Hops box (now with a "hops" suffix); the value and reference fields are the compact Select's
  trigger (InputBase as a button with Combobox.Chevron, aria-hidden), text cut with an ellipsis. A
  lone verb is written as a word, not a segment of one; each verb radio's name carries Figma's word
  (", Intersect") so keyboard focus hears it. The step pane draws "N so far" beside the verb.
- **Keys and boxes:** F2 on any outline row but a group's is the outline's (never the project
  rename); leaving the text box by Tab commits its text.
- **A click outside ends picking on the click, not the press:** closing the pane on the press moved
  the next filter card's row out from under the pointer, so the click never opened it.
- **Filter cards:** a collapsed card is 11/16 like the open one, the whole row (but the on box)
  opens it, and focus lands on its title row, so the next Space switches its on box instead of
  adding a card. A card whose first step removes, or a removing card no editor reads, is named with
  "Except". A saved Select card is read-only, "Select <condition>", counting all of it ("77 of 77"),
  until the owner decides on the element rewriting it.
- **Checklist:** a step's checklist rows are 11/16 and its list holds the height of 8 rows while
  searched; a Keep or Except step's checklist counts each value over the step's input (an Add
  step's over the base, where what it adds comes from).
- **Large graphs, graphty-element:** `data.nodePage({ matching: { names: true } })` on a graph with
  no label column reads every value (a "name" column is found; `data.name` is unchanged); the
  reference search lists an exact id or name match first (`mode: "exact"`, which the element
  already had) and says "Nodes 0" when nothing matches. A hops, touching or same-value step on
  Hovered or selected waits (`run-paused`) over `liveMs` while the pointer is on a node, estimated
  from its base size and hop limit. Girvan-Newman's estimate charges a betweenness pass per round
  up to `maxIterations` (4,000 nodes and 8,000 edges: minutes, not 6 seconds), and it computes in
  the element's Worker so the page and Cancel stay live (a cancelled run is abandoned there).
- **Not fixed this round, with the reason:**
    - The preview's and the filter's paint on 50,000 nodes (blockers): each node is still repainted
      through the layer pipeline in 128-node slices. Drawing the preview and filter visibility as a
      per-instance color and alpha write on the instance buffers is renderer work in UpdateManager
      and the mesh cache, and skipping a repaint whose member set is unchanged needs the per-layer
      member sets the paint does not keep. Both stay open for the next engineering pass.
    - A step's own automatic rerun writes an undo entry, and reruns on a changed scope pile up as
      separate runs: both need a run the element starts for a step to be its own exempt command (or
      to replace the stale run under its id), a change to the run dispatcher.
    - A checked community saved as a raw id drifts when Louvain reruns, and a filter re-computes a
      community step's partition: saving "the community of <member>" needs the checklist to write a
      same-value step and the element to keep a step's partition fixed until Run.
    - The step-local run's estimate calibration ("about 8 seconds" that took 60 to 86 s).
    - The histogram's hairlines on whole-number columns (waits for the owner:
      `../owner-decisions.md`, 2026-11-01), the "Full graph" caption on the step histogram, log bar
      heights, the tie chip, and naming community values
      "Community N" (the name is shared by the key, table and legend).

## Placement 2026-11-01 (Design Director)

Evidence: the placement study (`placement-study.md`: nine simulated participants, three
placements, five tasks; no measurable difference in success, overwhelm or ease between the sidebar
outline, a bottom drawer and a near full-screen workspace; every session hit the same editor
problems) and the designer panel (main checkout `tmp/selection-redesign/study/panel.md`: the
calm the owner saw in the workspace comes from width, not modality; recommends a hybrid). The owner
prefers the workspace; with the data tied, his preference and the panel's reasons decide. Two-way
door: the tier 5 editor is unreleased. Full behavior: spec 3.0 and 3.5; checks 39 to 47. Each entry
narrows or reverses an entry above; those stay as the record.

- **The sidebar shows a read-only outline at rest.** One line per step, no pane, no control but the
  title row's Edit (and a filter card's on box). Edit, a click or Enter on any row opens the
  workspace on that row. Narrows "Owner feedback 2026-11-01": the property pane moves out of the
  sidebar; the outline's rows, words and caps are unchanged.
- **One non-modal workspace edits every rule**: a style layer's Which nodes and Which edges and every
  Data filter card, titled with its owner ("Which nodes -- Style layer 1", "Strong core --
  Filters"). It covers the canvas column; the right sidebar stays visible and usable; no scrim, no
  focus trap. Its center is the main canvas, drawing the preview; it is an overlay, so the main
  drawing is never re-framed (Fit frames on request). Layout: outline column sized to content (200
  to 280 px), preview with a matches table strip under it (columns sized to content), properties
  column 320 px. Header: title, count, Group colors | Styled, Table, Clear, Cancel, Done. Why: the
  panel; NN/g on modals for decisions that need other sources; the owner's "the canvas is the frame".
- **Esc is Done; Cancel restores.** Escape closes the innermost open thing first and, on the
  workspace, keeps every edit. Cancel restores the selection as it was at open, as one undo step.
  Why: 5 of 9 lost their place to an Escape that closed the editor.
- **The drawer is dropped.** It costs half the canvas, re-frames it on every move and takes the
  table's bottom edge. Its one advantage, being non-modal, is kept by the workspace.
- **A preview's table is the workspace's strip.** Narrows 8a: the main table still never opens by
  itself; the strip under the preview is shown by default, hidden by the workspace's Table button.
- **The study's editor fixes** (spec 3.5):
    1. A step computed from links has **Links** in Advanced ("All links" or "Links where ..."): the
       step reads only the links that pass, the row carries "Links: weight min 2". graphty-element
       adds `UnionStep.links` (additive, @beta, `../../selection-groups/element-api.md` section 4).
       Why: 9 of 9 looked for "ignore weak links" in the editor; 3 never found the Data filter.
    2. A checklist never re-sorts under the cursor: its order is set on open and on search only.
       Why: 6 of 9 ticked the wrong value.
    3. Clear in the workspace header, with undo; after a delete no row is selected and the outline
       keeps its shape under the pointer. Why: 4 of 9 deleted the wrong row.
    4. Escape closes the innermost thing first and never discards work (above).
    5. Tooltips and search aliases for Degree ("links at a node"), Core number and "While ... has
       nodes"; no sentence drawn. Why: 3 of 9 guessed at them.
    6. The number and time test's mode is a Select showing its current mode, not a segment beside
       the histogram; By position starts untouched. Why: an accidental click switched a step to
       "top 10". Narrows section 5's "Segment" for number and time.
- **Accessibility of the non-modal workspace**: a named region landmark, F6 / Shift+F6 cycling with
  the sidebar, open and close announced once, Cancel, Clear and Done in the header's Tab order,
  focus returned to what opened it.
- **compact-mantine is unchanged**: Select, Button and the existing controls; no Figma look change,
  so nothing goes to `../owner-decisions.md`.
- **To check before the study** (from the panel): a first-click test that readers find Edit from the
  sidebar outline, and task 4 at 1280 x 800.
- **The build follows.** The in-sidebar pane built and polished on 2026-11-01 (including the
  unverified round in 4a3ed7cf1e) is superseded by the workspace; its rows, pickers, caps and pane
  contents carry over into the workspace's columns.

### Workspace built (2026-11-01, studio engineer)

Two-way doors decided while building spec 3.0 and 3.5 (the record of what changed is in the commits):

- **Which panel it covers depends on the host.** The app edits a layer's Which nodes in the
  inspector and filter cards in the left panel, where the mock had one sidebar for both. A style
  layer's workspace covers the left panel and the canvas; a filter card's covers the canvas and
  the inspector, so the sidebar holding the selection always stays. The covered panel is inert
  (F6 skips it), and the outline and properties columns widen to cover it, so the transparent
  preview never shows a panel through it. Spec 3.0 says so.
- **Switching** happens where the other owner is reachable: a click on another filter card's row
  switches the one workspace to that card; leaving the place (the rail) closes it as Done, after
  which another place's owner opens it. A style layer's other layers sit under its workspace.
- **Clear** writes the host's empty state: a layer's one None group with no step, a card's one All
  group with no step (its name and on box kept).
- **Search words come from the catalog** where it has them (an algorithm's keywords and technical
  name, so "k-core" and "core" find Core number); Degree's "links", "connections" and its tooltip
  words are the app's.
- **Links** is offered on steps whose value is computed from the links (an algorithm's field,
  Degree, hops, touching). Its edge condition is one value and its test; the row's tag and
  Advanced say "Links: <column> <test>". graphty-element computes such a step as the step's own
  (never a run in Analyze), and its degree bars are drawn from the scoped count.
- **At 1280 x 800 the preview is 424 px wide, not 440** (check 39): 1280 less the 56 px rail,
  the 240 px inspector beside a style layer's workspace and the 320 px properties column leaves no
  more, whatever the outline's width (it covers the left panel). Narrowing the properties column
  to 300 px at that width would reach 440; it stays 320 as the spec says until the owner prefers
  otherwise.
- **Not built:** pointing at a sidebar row at rest marks nothing on the canvas (the preview is the
  workspace's); `watchSteps` reports no links count (the row says the rule, not how many links
  pass).

## Waiting for the owner

- Retagging bfs `level`, k-core `value` and dfs `value` as ordinal changes what `fieldMeasurement`
  returns (`../owner-decisions.md`, 2026-10-31). The build keeps today's kind for them.
- A filter condition `member of "selection"` is accepted today and silently goes stale when the
  selection changes. Refusing it, or making it follow the selection, changes an existing API
  (`../owner-decisions.md`, 2026-10-31). The app never writes it; `union` leaves freeze it.
- The split button's chevron is 16 px wide and the range thumbs 10 px, under the 24 px target:
  both are compact-mantine's Figma look (`../owner-decisions.md`, 2026-11-01). The build keeps them.

### Workspace polish 1 (2026-11-01, studio engineer)

Two-way doors decided while fixing the workspace polish 1 reviews (`ws-polish-1-*.md`):

- **A filter card is drawn over the full graph.** `styles.showBranches` takes `base: "full"`
  (graphty-element, additive, @beta): every filter condition's removals are lifted while the view
  is shown, what they hide is drawn faint as ghosts, and the branches are drawn over the ghosts,
  so a card's own matches show in its color even when another card hides them. The filter host
  always passes it.
- **A view that draws what is drawn repaints nothing.** graphty-element keeps a branch layer, the
  same object, when it draws what the shown one draws; a branch's selector leaves out the steps
  that change nothing (off, or no test yet). A step added with no test, a rename, or the same rule
  handed again costs no repaint.
- **A slow frame gives the repaint a share of it.** The renderer's repaint budget is a quarter of
  the last frame, at least 16 ms and at most 250 ms: at a frame every 1.5 s (a software GPU, 50,000
  nodes) 16 ms a frame left a preview minutes from the screen.
- **The key says "Drawing"** while the element's frame is not stable after a view change.
- **A selection with no step opens on its new step's pane**, value field focused; a step being
  added has a pane of its own whose value field anchors the picker. The outline lights a "Value..."
  row for it.
- **Clear starts where a new layer does** (one All group, no step), so Clear and a new layer show
  one empty state; a group that draws All nodes draws no Condition row.
- **One count per place**: the workspace's title row drops its count, "so far" only where it
  differs, the strip's Group column only with two groups, the Filters total only with two cards on.
- **Tags are bare dimmed words**; a Links tag reads "Links". A list of more than nine values reads
  as its count ("1,898 values").
- **The outline column is measured once** when the workspace opens and kept until it closes.
- **The header** draws Table, Clear and Cancel subtle, the segment at 11/16; the title menu drops
  Table and Group colors.
- **The canvas toolbar is hidden and inert** under the workspace (owner-decisions.md, 2026-11-01).
- **Sidebar Edit** is drawn on hover or focus over the title row's end.
- **Group pane** has Color (the compact color field) and Save as set (`sets.createFrom`).
- **A cancelled or removed step run keeps its estimate** on Run (graphty-element), and a cancelled
  or failed run draws no empty table column.
- **Words**: no Live heading; "Link value..."; "Text" placeholder; "Include not measured" only
  when the value has elements with no value; a reference row shows the value that matched;
  "Keep (Intersect)" as the radio's name; "Table of matches" as the header toggle's name.
- **Edge "not styled" after a node condition** (the owner review's subtitle finding) was traced: nothing writes the
  edge side. The layer's kind follows `builtParts` (graph-place/rows.ts), which counts a half with
  a condition as built, an earlier decision; it is kept, and the owner may ask for kinds by what a
  layer writes only.
- **Not fixed this round** (graphty-element run lifecycle, each a change of its own): a filter's
  25 s freeze at 50,000 nodes and label propagation's 70 to 120 s run (both need a profile at
  that size); a community step re-run on a filtered graph changing its groups, and a ticked group
  saved as a raw id; a step run's undo entry and its stale duplicate run; a Links-scoped step's
  own values in the strip; the tie value in By position's line (the app says "6 asked, 7 kept:
  tied" on a group's first step from the step's count; "at 15" needs the element); pointing at
  a sidebar row at rest marks nothing (spec 3.0 no longer promises it); the Data place's attribute
  "+" stays on the count rows.

### Workspace polish 2 fixes (2026-11-01, studio engineer)

From `ws-polish-2-owner.md`, `ws-polish-2-scale.md`, `ws-polish-2-correctness.md` and
`ws-polish-2-figma-a11y.md`. The commit `4a3ed7cf1e` named by the round brief is the first polish
round's work in progress; later commits (`cb77e6425f`, `64cb33f3a6`) finished it and the four
reviews above judged their build, so nothing of it was left unverified.

- **The canvas is the frame while the workspace is open.** graphty-element's canvas takes the
  preview cell's box (the editor writes `--sel-preview-inset` on `.ws-canvas`); on open the graph is
  framed once when the cell holds under three quarters of the nodes the canvas drew
  (`nodesInRect`); on close the camera is put back (owner-decisions.md).
- **The rule is drawn once.** While the workspace is open the sidebar keeps its title row, "Editing",
  with no outline and no count; the other filter cards and the Filters header drop their counts.
- **A narrowing step says no verb.** Keep is never written; a step pane has one compact Except switch;
  "..." holds Add instead / Narrow instead; a new step's pane and row say no verb; filter card names
  drop "keep" (owner-decisions.md).
- **Edges, not links**, in Advanced, its tag and Degree's words; "links" stays a search alias.
  Captioned segments (Computed on, Edges, Edge ends, Start with) take the column's full width; the
  brush is inset 8 px so its thumbs end at the boxes' edges.
- **Reopening** selects the step last edited, else the first step; the title only with no step.
- **Sidebar Edit** hides the count while it is drawn. Long counts read short ("200k of 200k"); a
  title keeps at least 8 characters; a relative row keeps its condition whole, its reference gives
  way, and no state word is cut (the scale review asked the condition to give way first; the
  owner's review asked it whole, which is kept). The workspace outline's rows keep their state word when
  selected.
- **Pickers under fields never flip** up over the header. While a step is added, All nodes is
  hidden and only the new row is lit (the row selected before comes back if nothing is picked).
- **Yes/No** fields say "Value..." when empty and rows write "Yes"/"No" as the table does; "While
  ... has nodes" stays whole in its field; the key draws No match only when it holds a node, and
  "Drawing" clears on `styles.settled()`, not on a still frame.
- **Keys.** Escape closes an open Advanced; a new filter card's first Escape goes to its title row;
  Escape on a new card's picker says "Filter not added"; Nodes | Edges stays drawn over a new card's
  picker, and switching side reopens it on the other side's values.
- **Search** matches words in any order, a colon read as a space, and finds a result by its field
  ("label propagation: comm").
- **Histogram**: 32 bins; log(1 + count) heights when the element suggests it or the tallest bin is
  over 20 times the median non-empty one; a non-empty bin is never flat (`style/barHeights.ts`).
- **Redo** names the filter as it comes back.
- **Speed on 50,000 nodes** (a profile of one checklist tick, `tmp/design-studio/tier5/ws-polish-3/`):
  the matches strip read `layout.locationColumns()` on every render (760 ms), now cached by
  graphty-element per graph snapshot; the style tree's counts (560 ms) are kept while the workspace
  covers it; the canvas key's legend (630 ms) and the size-bound legend read (330 ms) wait for the
  workspace to close. One tick went from 4.9 s to 2.6 s settled (under the profiler); the rest is the element's
  repaint of 50,000 nodes and 200,000 edges and the inspector's agreement read.
- **Not fixed this round**, each an element change of its own: a step's run taking an undo step of
  its own (tried: starting it as a deferred member of the newest step, `transaction(..., { after })`,
  keeps Undo on the reader's edit, but a Redo of a filter step that carried a rerun put the run back
  "queued" and it never ran, so it was taken out; the dispatcher's redo of an amended deferred run
  needs looking at first) and its duplicate runs; a filter card reusing a run made on the filtered
  graph while no filter is on (tried: resolving "visible" from inside a filter's own evaluation
  recurses, so the element needs a "no filter on" fact first); running step-local algorithms in the
  Worker and calibrating the estimate from the first iteration; keeping a community step's
  partition, or saving a checked group as "the group of X", across a filter change; per-step
  computed values for the strip (Degree and Links-scoped columns); a GraphML file's node names
  (owner-decisions.md); sharing one `watchSteps` evaluation between watchers. The Data place's
  count-row "+" and the layer kind are owner questions (owner-decisions.md).

## Workspace polish round 3 (ws-polish-3-*.md)

- **No key over the preview**: the outline's last row is No match (dimmed, faint chit, count) while
  group colors are drawn; "1, under A" is a group row's tooltip; "Drawing" follows the header's
  count until graphty-element's `waitForPainted()` (new, @beta) resolves, which waits for the last
  repaint batch where `styles.settled()` does not.
- **The Filters header keeps its total** ("Passes none", "41 of 77") while a card is edited.
- **A new or cleared rule opens on its value picker**, the search focused; a letter typed on a
  closed value field opens the picker with it. The picker is always its field's width
  (`width="target"`), and the value fields say `aria-expanded` and `aria-haspopup="dialog"`.
- **A click on the preview canvas never closes the workspace**: the inspector ignores canvas clicks
  and selection changes while it is open, and follows the selection once it closes.
- **Both hosts say the count** as it changes (WCAG 4.1.3), not the filter only.
- **A new card's side switch** keeps focus on Nodes | Edges, the picker shut, nothing said; the
  new step's Value field waits under it, and Enter or a click opens its picker.
- **Rows**: no "No test" word; an Edges tag only once its condition tests; a picked edge value goes
  on to its Min box; a cut test keeps an ellipsis and a tag the width of "Edges"; with two or more
  groups the outline's levels are 1, 2, 3; a filter card's title row keeps its state word while
  selected; a collapsed card's name is "title, N of M nodes[, off]". Match case is in Advanced; "so
  far" sits on the value row with no switch above. A picker option cuts the algorithm's name, never
  the field's. The sidebar outline is not indented. F6 goes workspace, preview ("Preview: ..."),
  side panel. Spec 3.0's 1280 x 800 minimum is 423 px.
- **Speed on 50,000 nodes**: graphty-element's edge repaint updated every edge on each frame of a
  repaint spread over many frames (about 200 walks of 200,000 edges); each frame now updates only
  the edges it painted and walks all of them once, on the frame that empties the queue.
- **graphty-element**: a project with filter conditions and no steps list (tier 4's) opens with no
  "parts did not come back" notice (`W_FILTER_STEPS_DIFFER` only when the file holds steps).
- **Not fixed this round** (element work of its own): disposing and rebuilding node meshes when a
  filter changes what is visible (`DataManager.setAsideAndDispose`, 3.3 s a tick); deferring the
  count and repaint off the main thread; members drawn above faint non-members in 3D (needs an
  on-top render group for a layer's elements); step-local runs in the Worker with Cancel, and a
  filter reusing the full-graph run; a step's run writing no undo step and replacing its stale run
  per scope; per-step computed values for the strip; saving a ticked community as "the group of X";
  GraphML node names (owner question). Fit after the Table toggles was not reproduced on Les
  Miserables (see the round's check).

## Dry run pass 1, 2026-11-02 (Design Director)

From the triage of the round 1 pilots on baac78342b (`dry-run-r1-1.md`). Each entry narrows an entry
above; none reverses one.

- **How the dry run classes a known severity 3 candidate.** A candidate `criteria.md` item 8 names
  (the false "covered" claim, two count bases for one layer, the data table and the matches strip
  drawn together, a 50,000-node edit with no sign of work) is fixed in the dry run even where it
  blocks no single step: item 8 refuses every session while one is open. A 50,000-node edit that
  blocks input with nothing on screen is treated as a frozen app ("Large graphs": a reader takes it
  for a hang). Why: the dry run's rule fixes only crashes, blocks and spoiled grades, and item 8 is
  the gate the round cannot pass with these open.
- **The data table never takes an editor's selection.** While a workspace is open the data table is
  not drawn and is inert (no Tab stop, no F6 stop); the matches strip is the only table under the
  preview, on the selection's own side (Nodes or Edges), its header and first column whole. Adding a
  layer, selecting a layer or a filter card, or a hover never switches the data table to Matches only
  or adds a Group column. After Done or Cancel the data table is as it was before the workspace
  opened. Narrows "Owner question 1" and "A preview's table is the workspace's strip" (placement):
  the main table's Group column and Matches only were the preview's, and the strip took that job.
  Why: after Done the table kept the last card's matches (T75 A listed 549 while 112 were drawn; T71 B
  and T77 B listed 3 while 1 was), so a reader counting from it reports a wrong answer; and two tables
  under one preview is a severity 3 candidate in `criteria.md` item 8.
- **A test's mode is the step's own.** The number test's By value | By position and the date test's
  Before | After | Between are kept by the step from the moment they are picked, before any bound is
  typed (an untouched step is inert, as decided); reopening the step shows the mode picked. Changing
  a date test's mode keeps the date already typed: Before and After share one date, Between takes
  Before's date as its "to" and After's as its "from". Narrows placement editor fix 6 ("By position
  starts untouched"). Why: By position on a Results value emptied the step (T74 A and B success
  paths), and the date mode select fell back to Before and dropped the typed date (T72 B), because
  the mode was not held by the step; dropping a typed date loses work (spec reviews reversal: a
  step's work is never dropped).
- **Cancel on a new filter card takes the card away**, as the selection was at open: there was no
  card. Focus returns to what opened the workspace; the screen reader hears "Filter not added" (the
  words Escape on a new card's picker already says). Narrows placement "Cancel restores". Why: the
  empty card stayed switched on and saved (T70 B, T79 A), and T71, T77 and T79 grade the number of
  filter cards.
- **Every count in the style host reads over the style selector's base**, the graph the filter
  leaves drawn: a layer's row, Everything's pane ("styles all N"), the Which nodes header and the
  canvas key's "of N". Narrows the panel entry "The style selector's whole graph is what the filter
  leaves drawn", which the key and the rows did not follow ("two bases, a known finding" in
  `answers.md`). graphty-element offers the count over that base additively; what it returns today
  is unchanged. Why: one layer read "24", "10 of 10" and "of 24" at once (T72 A, T72 B, T77 A); a
  count over a base nobody can tell is severity 3 (`criteria.md`).
- **A field is said to be covered only when the canvas draws another layer's paint on it.** The Fill
  row's "Covered by" and the key's "covered by" are read after a preview ends and after a selector
  write's repaint settles, from graphty-element's own reading. Why: the key and the drawing never
  disagree; eight pilots read "covered by" a lower layer while the canvas drew the layer's color.
- **An edit that blocks input shows that it is working first.** Opening the workspace, a tick, Done
  and a new card on a large graph draw the header's "Drawing" (workspace polish rounds 1 and 3) in
  the frame of the click or key that started them, before the blocking work, until
  `waitForPainted()` resolves. Why: on 50,000 nodes each edit blocked input 3 to 17 s with nothing on
  screen (T79 B), which `criteria.md` "Large graphs" calls a hang.

## Dry run pass 2, 2026-11-02 (Design Director)

From the triage of the re-walks on 797a4f6b47 (`dry-run-r1-2.md`). Each entry narrows an entry above;
none reverses one.

- **Focus after a new filter card goes** (Cancel, Escape on its empty value picker, Done with no
  step): to the control that opened the card when that control opens filters and is still on screen
  (the canvas toolbar's Filters, Add filter, an attribute's Filter to...), else to Add filter; never
  to the page body, Quick actions or Main menu. Cancel and Escape read the same record. Narrows the
  placement entry "focus returned to what opened it" and pass 1's "Cancel on a new filter card takes
  the card away": a card made from Quick actions has no opener left on screen once the palette
  closes. Why: pass 1's fix recorded whatever held focus and sent it to Main menu
  (`rejected-fixes.md`, cancel-new-card); Escape on a card opened from the toolbar's Filters landed on
  the sidebar's "+" (T75 B detour-4, T77 B touched-34).
- **Opening the workspace on a large graph** is an edit that blocks input (pass 1, "An edit that
  blocks input shows that it is working first"), including right after a new layer is added, while
  its name field is open: the workspace or "Drawing" is on screen within 1 s of the click. A reading
  of the style stack that nothing has changed since the last read is answered from what
  graphty-element already holds. The frame that says "Drawing" shows the input's own result (a ticked
  box ticked), so nobody clicks again. Why: opening Which nodes on 50,000 nodes drew nothing for 1.3 s
  (T79 B touched-40), a hang by `criteria.md` "Large graphs"; and a box drawn empty for 20 s after its
  click invites a second click that unticks it.
- **The blank band under the workspace preview is the hidden data table's place**, not a second table:
  item 8's "the data table and the matches strip drawn together" is closed on 797a4f6b47. The band is
  cosmetic and goes to the backlog, first in line for bar 9's calm-first check. Why: pass 1's
  main-table fix hides the table and keeps its place so the canvas is not resized; the one table drawn
  under the preview is the matches strip (the engineer's re-walk of 1c02b8a883).

## Dry run pass 3, 2026-11-02 (Design Director)

From the triage of the re-walks on 47c95a09fc (`dry-run-r1-3.md`). Each entry narrows an entry above;
none reverses one.

- **Cancel on a new filter card leaves no undo step.** The history after it is the history before the
  card was asked for: the card's first tick, its later edits and its removal leave no step, Undo
  names and undoes what came before the card, and Redo never brings the card back. The same holds for
  every way a new card goes (Escape on its empty value picker, Done with no step). The screen reader
  hears "Filter not added" and nothing that suggests a card still exists ("Filter off"). Narrows pass 1's
  "Cancel on a new filter card takes the card away" ("there was no card") and the placement entry
  "Cancel restores ... as one undo step", which stays for an existing card. Why: on 47c95a09fc Cancel
  writes the removal as a new step, so Undo reads "Undo deleting a filter condition", a deletion nobody
  made, and brings the cancelled card back switched on (T79 A touched-32: dept Grants on, 1,076 of
  50,000 drawn, a filter card T79 grades as not success; T70 B touched-2, T72 B touched-1).
- **Done, Cancel and Escape on a large graph keep "Drawing" on screen until the result is painted.**
  The workspace stays open with its header's "Drawing" through the blocking work and closes on the
  painted result (`waitForPainted()`), so the canvas never shows the preview look (the picks marked,
  every other node dimmed) without "Drawing" beside it. On a graph where the work does not block, the
  workspace closes as today. Narrows pass 1's "An edit that blocks input shows that it is working
  first" (which names Done); its fix (f6ab091f47) drew "Drawing" for one frame and then closed the
  workspace before the work. Why: on 50,000 nodes the workspace closed in its first frame and the canvas kept the preview
  look for 13 to 15 s with no sign of work (T79 B touched-13 09-glance.png), which `criteria.md` "Large
  graphs" calls a hang and a reader can take for the result; keeping the sign where the reader already
  saw it on open and on the tick adds nothing new to the screen (calm first).

## Dry run pass 4, 2026-11-02 (Design Director)

From the triage of the re-walks on c3100058ab (`dry-run-r1-4.md`). Each entry narrows an entry above
or settles what one leaves open; none reverses one.

- **A history move reaches every reading of the filter.** After Undo, Redo, or a new card taken back
  to the step before it, the data table's rows and its count, the matches strip, the top bar and the
  canvas all show the filter as the history left it, from the same frame; graphty-element's record
  pages follow a history move as they follow a command. Narrows pass 1's "The data table never takes
  an editor's selection" ("after Done or Cancel the data table is as it was before the workspace
  opened"). Why: after Cancel on a new card that matched one gauge, the table kept "Shown 1 of 11
  nodes" and the row G09 while the top bar showed 7 of 11 (T77 B touched-2 03.png), and after Undo
  of a Cancel the table listed 7 rows while 0 were drawn (T76 B touched-6 08.png); a reader counting
  from the table reports a wrong answer.
- **A study start has no undo history.** A setup's steps are the colleague's or the person's own
  saved work: when the session begins, Undo is off ("Nothing to undo"), as when a saved project is
  reopened. This is the study tool's, not the product's. Why: every start is a saved project
  (`roster.md` line 200), and Undo right after Cancel on a new card, the decided behavior (pass 3),
  undid the setup's last step: the colleague's orange on Staff (T77 A touched-1 09.png, orange count 0) and on Oldest (T77 B touched-1 04.png), which T77 grades.
- **Undo right after Cancel on an existing card undoes the Cancel.** The placement entry "Cancel
  restores the selection as it was at open, as one undo step" (line 586) makes the Cancel a step:
  the first Undo brings the cancelled edit back, and the workspace's own edits stay as steps under
  it. Not changed in the dry run; whether readers expect it is for the sessions (record every session
  that presses Undo after Cancel). Why: T71 A touched-6 and T76 B touched-6 found it; the count and
  the card agree with the history at every step, and the toast's words are a backlog item.
- **A new card left with only an untested step stays, inert.** Done on a new card whose one step has
  its attribute and no value keeps the card (it is written with its first step, line 332) and the
  card removes nothing (line 333); it is graded as no change (`answers.md` T77). Taking such a card
  away like a card with no step is a backlog question. Why: T77 A touched-7 84.png ("trained pick yes
  or no", 24 of 24); no count moves.

## Dry run pass 5, 2026-11-02 (Design Director)

From the triage of the re-walks on f0a9a014cb (`dry-run-r1-5.md`). Each entry narrows an entry above;
none reverses one.

- **A fix-now unit stays open until a build carries it.** A unit a triage sends to fix is not closed
  by a later triage that found nothing new: when the next frozen build does not carry the unit's
  fix, its rows are carried into that triage as fix now, origin repeat. Where the build's code is the
  code those rows were walked on (`git diff --stat <earlier> <frozen>` touches nothing the route
  reaches), their walks stand and need no re-walk before the fix. Why: f0a9a014cb's code is
  c3100058ab's (only `design/` changed), so pass 4's two units (setup-history, table-after-history)
  were never built, and this pass's targeted re-pilots walked only the routes of pass 1's units; T71 A
  and T71 B still start with undo history (`r1d1/pilot/T71A/touched-31 04.png`,
  `r1d1/pilot/T71B/keyboard 04.png`).
- **A spoken count reads over the same base as the count on screen.** The live status that speaks
  the Which nodes count (and every count the style host announces) names the same "of N" the
  workspace header shows: the graph the filter leaves drawn. Narrows pass 1's "Every count in the
  style host reads over the style selector's base" to the spoken count. Why: with a filter card on,
  the screen read 7 of 7 and 2 of 7 while the status spoke "7 of 11 nodes" and "2 of 11 nodes"
  (T70 B keyboard, `r1d1/pilot/T70B/keyboard 65.png`, `66.png`). Backlog, first for the accessibility
  walk: no round session runs with a screen reader.

## Dry run pass 6, 2026-11-02 (Design Director)

From the triage of the re-walks on d3fda9f2b6 (`dry-run-r1-6.md`). Each entry settles what the entries
above leave open; none reverses one. All three are keyboard or screen-reader behaviors, so they go to
the backlog and the decide-and-fix loop builds them; none blocks a session.

- **When Undo or Redo takes away the control that held focus, focus goes to that control's section.**
  A filter card that goes sends focus to Filters' Add filter; a layer row that goes, to the Style
  section's add control; never to the status bar, the page body or the first Tab stop. A control that
  survives the history move keeps focus. Why: Ctrl+Z on the adding of a filter card left focus on the
  status bar's "Local only", far from Filters (T71 B touched-5 21.png); pass 2's rule for a new card's
  Cancel already sends focus to Add filter, and a history move is the same disappearance.
- **Ctrl+Z and Ctrl+Shift+Z with nothing to undo or redo say what the disabled button says**
  ("Nothing to undo", "Nothing to redo") in the live status, and change nothing. Why: the chord was
  silent while Enter on the disabled Undo button spoke "Nothing to undo" (T71 B touched-5 05.png
  against 22.png to 24.png; T75 A touched-14 61.png, 64.png); one command, one answer, whichever way
  it is reached.
- **The status spoken after Undo and after Redo uses one wording**, the one a command's own change
  speaks, with each count's "of N" as the screen shows it ("112 of 549 nodes, 896 of 2,084 edges").
  Extends pass 5's "A spoken count reads over the same base as the count on screen". Why: after
  Ctrl+Z the status spoke "Filter on: 549 of 549 nodes, 2,084 edges", after Ctrl+Shift+Z "112 of 549
  nodes, 896 edges", while the screen read "896 of 2,084 edges" (T75 A touched-14 59.png, 60.png).

## Dry run pass 7, 2026-11-02 (Design Director)

From the triage of the round 1 pilots on 0c163f54bf (`dry-run-r1-7.md`). Each entry narrows an entry
above; none reverses one.

- **A just-added color line shows no color until one is picked.** The line "+" adds (Fill's Color,
  and every color line the style host adds the same way) draws an empty swatch and an empty hex box,
  named "<property>, not set"; the picker opens at the color drawn there when one color is in force,
  else at the element's starting color; Enter or Tab with nothing typed writes nothing and leaves the
  line waiting. Narrows the style host's "'+' starts a property from what the layers beneath paint"
  (`row.ts` `beneathOf`), which fell back to the element's starting color, 6366F1, whenever the
  layers beneath vary. Why: `criteria.md` item 8 names this repro; on every start with PageRank's
  colors beneath (T70 A, T73 A, T74 A) the box showed 6366F1 and an indigo swatch while no node is
  drawn indigo, and a rating-check participant named it as the moment of least certainty ("the new
  color didn't show on any dot"); Enter on the untouched box committed 6366F1 (pass 5 T72B.p5.3), a
  value nobody chose.
- **Closing the workspace hands focus back only if the reader has not moved on.** When the workspace
  closes (Done, Cancel, Escape, including a busy Done that closes on the painted result), focus goes
  to its opener as decided only while focus is still inside the workspace or on nothing (the page
  body); a control the reader moved to outside the workspace keeps focus and every key typed there.
  Narrows the placement entry "focus returned to what opened it" and pass 3's "Done, Cancel and
  Escape on a large graph keep 'Drawing' on screen until the result is painted". Why: on 50,000 nodes
  the reader clicked the Fill box while Done was still drawing; the close then sent focus to the
  Which nodes row, so the typed E4572E went to page shortcuts (E reopened the workspace, 2 switched
  the view to 2D) and the color was never set (T79 A detour-4, `r1/pilot/T79A/detour-4-0c163f54bf
04.png` to `06.png`; `answers.md`, "Can spoil the fill").

## Dry run pass 8, 2026-11-03 (Design Director)

From the triage of the pilots on 1e123d7d33 (`dry-run-r1-8.md`). Each entry applies the framework's
key table (`../../framework/interaction-patterns.md`, the table under "This table and 3.8's charts are
the normative statement", line 702) to the style host's value boxes, or narrows an entry above; none
reverses one. All three go to the backlog: none crashes, blocks or spoils a grade.

- **Escape in a just-added line.** In the box of a line "+" just added, Escape with text typed and not
  committed reverts the text and keeps focus in the box (the key table: "a field with a pending edit:
  the field reverts, stays"); only an Escape with nothing typed takes the line back, as tier 3 and 4
  decided ("Escape on a just-added line that holds nothing takes it back"). Why: one Escape after
  typing E4572E took the whole Color line away and sent focus to Fill "+" (T70 A
  `touched-1 14.png`; T76B.p7.7), so the innermost thing (the typed text) and the line went at once.
- **Escape in a value box with nothing typed leaves the box.** In a style host's value box (a color, a
  number) with no pending edit, Escape is not swallowed: inside the workspace it is the workspace's
  Escape (Done); in the inspector focus goes to the box's section heading (the key table: "a field
  with no pending edit: rung 1 in an overlay ...; else focus to its section's heading"). Why: Escape
  in a color box holding a committed value, or with nothing typed, did nothing (T73 A
  `touched-5 72.png`, T79 A `touched-7b-1e123d7d33 38.png`, T73B.p7.7).
- **A commit keeps focus in its box, also while a busy close finishes.** Enter in a value box commits
  and stays (the key table); when the workspace's close ends after that commit and finds focus on
  nothing because the box re-rendered, it gives focus back to the box the reader was in, not to the
  opener. Narrows pass 7's "Closing the workspace hands focus back only if the reader has not moved
  on": the close reads where the reader went outside the workspace while it was closing, not only
  where focus is at its end. Why: Done on 50,000 nodes, then at once Fill "+", E4572E, Enter set the
  color, but focus ended on the Which nodes row (T79 A `touched-9-1e123d7d33 04.png`, `06.png`), so a
  correction typed next would reach the row and its shortcuts.

## Speed on 50,000 nodes, round 2, 2026-11-02 (graphty-element engineer)

The first blocker of `ws-polish-3-scale.md` (every edit locks the page 13 to 38 s), after the edge
fix of round 3 above. Profiles and walks: `tmp/design-studio/tier5/scale-fix/` in the main checkout.

- **Cause left after the edge fix.** A frame of a node repaint that rebuilt meshes (a node going
  faint or full strength changes its source mesh, since opacity is per source mesh) still forced
  the walk of all 200,000 edges, and each batch of 128 nodes paid a teardown that passes over every
  scene list (`disposeReleased`, about 28 ms at 50,000 nodes): a 50,000-node repaint made about 390
  of them and took about 375 frames.
- **Fixed in graphty-element (`UpdateManager`).**
    - A frame takes one node batch, so it pays one teardown at most. The batch is what the last
      batch's speed says fits in the frame's budget, and never less than a 32nd of the graph
      (`REPAINT_FRAMES`), so the teardown is paid at most 32 times however large the graph; edges
      take the same 32nd floor. Labels a batch drops are released together.
    - A frame places only the edges of the nodes whose size or shape changed; a mesh rebuilt at the
      same size and shape moves no edge end. Every edge is still walked once, when the queue empties.
- **Tests (counted work, both fail before the fix).** `test/browser/node-repaint-teardowns.test.ts`:
  at most one teardown a frame (before: 13 in one frame), and edge updates during a node repaint
  split across frames below six per edge (before: 3,570 for 119 edges). Bench:
  `test/browser/style-repaint-50k.bench.test.ts` (`browser-bench`, `GRAPHTY_BROWSER_GPU=nvidia`).
- **Bench, 50,000 nodes and 200,000 edges, RTX 4070, until `waitForPainted()`:**

    | Step                                          | Before             | After            |
    | --------------------------------------------- | ------------------ | ---------------- |
    | everything faint, one group full (preview on) | 22.4 s, 86 frames  | 7.5 s, 36 frames |
    | the three layers removed (preview off)        | 30.1 s, 108 frames | 6.8 s, 36 frames |
    | most teardowns in one frame                   | 14                 | 1                |

- **Walk with `real.mjs`, `big-50k.graphml`, layout Random, the style host's workspace.** Input
  delay, then busy (`route.jsonl` `act` and `settleDom`), on the build before (786f76466b) and after:

    | Action                         | Before       | After       |
    | ------------------------------ | ------------ | ----------- |
    | open the workspace (All nodes) | 0.9 + 16.6 s | 1.0 + 7.2 s |
    | commit Contains T0001          | 4.2 + 9.9 s  | 7.1 + 0.4 s |
    | Styled                         | 0.7 + 16.6 s | 1.9 + 5.8 s |
    | Group colors                   | 0.9 + 15.5 s | 2.3 + 4.0 s |
    | Clear                          | 5.6 + 10.0 s | 7.1 + 3.3 s |
    | Done                           | 1.4 + 17.1 s | 2.7 + 6.3 s |

- **The trade.** With the 32nd floor a repaint frame on 50,000 nodes runs about 200 ms instead of
  16 ms plus a 28 ms teardown, so the repaint ends in about 32 frames instead of about 375. Input
  delay rose 1 to 3 s on some steps while the busy time fell by half to nine tenths. With the budget
  alone (no floor) the same walk measured busy times of 7.7 s for Styled and 10.4 s for Done.
- **`styles.settled()`** still resolves when the passes end; `waitForPainted()` (added in round 3,
  @beta) is the wait for the last batch, and the key's "Drawing" uses it. Not changed.
- **Left.**
    - The input delay of 5 to 7 s on choosing a value column, committing a test and Clear: in the
      Clear profile, the app's re-render (1.3 s: `WhichPicker`, `RowStyle`) and its reads of
      `StylesApi.counts` (0.6 s) and the agreement (0.25 s) on every edit, the app half of the
      blocker.
    - The node rebuild itself: about 60 microseconds a node, because opacity lives on the source
      mesh. A per-instance alpha would remove the rebuild but puts every instance in the blended
      pass, where an unsorted faint instance in front writes depth and hides a member behind it.
    - Members drawn above faint non-members (item 3): not built. The faint nodes are blended, drawn
      after the opaque members, and on 50,000 nodes in 3D the layers in front add up. It needs a
      drawing order for translucent nodes (a rendering group, or a stencil test that the highlight
      layer's use of the stencil leaves free), which changes how every graph with mixed opacity is
      drawn, so it should be an element option, not a default.

## After round 1 (void), 2026-11-03 (studio engineer)

- **Only the open workspace says a count.** While a selection workspace is open, in either host, the
  inspector's Which row says nothing; its count settles quietly and is not said when the workspace
  closes either. Why: round 1's accessibility walk heard the workspace's count, then the covered
  inspector row's count over another base ("15 of 24" then "4 of 24 nodes" in the filter host), a
  count nothing on screen showed (severity 3, `rounds/round-1-void/insights.md`, insight 1). Built in
  `graphty/src/workspace/style/WhichPicker.tsx` with a real-input test in
  `SelectionWsPolish3.real-element.test.tsx`. **The frozen build 1e123d7d33 does not carry it**: a
  session on that build still hears the second count, and it counts against bar 4 until the build is
  refrozen with this fix.

## Reference screenshots of the approved surfaces, 2026-11-03 (studio engineer)

The owner-approved Which nodes card and attribute picker (tier 4, bar 6) changed as
`../../selection-groups/spec.md` section 13 says, at the owner's request, so tier 4's references
for them no longer apply. The screenshot audit judges "restyled" against these, taken on the frozen
build 1e123d7d33 at 1440 x 900 in the default color scheme, from the round's `volunteers.txt` setup
(the volunteers network with PageRank run), by replaying the T70 A success walk. The walk is the main
checkout's `tmp/design-studio/tier5/reference/walk-1e123d7d33/`; the images are beside it and are
never committed. A fix may add to these surfaces but never removes or restyles them other than as
the spec's section 13 allows.

| Surface                                                                                                                                 | Reference                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| The attribute picker, opened from a new layer's Which nodes (search, Data with kind glyphs and value summaries, Results)                | `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/reference/style-which-nodes-picker.png`       |
| The Which nodes workspace on a step (outline, Except, the attribute box, the value checklist with counts)                               | `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/reference/style-which-nodes-step.png`         |
| A filter card in the workspace (the Data place host, its outline and step pane)                                                         | `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/reference/filter-card-workspace.png`          |
| Both read-only outlines at rest: the layer's Which nodes row ("4 of 15", "role staff") and the filter card header ("trained Yes", Edit) | `/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/reference/which-nodes-and-filter-outline.png` |

## After round 1, the fix pass, 2026-11-03 (studio engineer)

Each item below cites its insight in `rounds/round-1/insights.md` and is proved by a real-input test
in `graphty/src/workspace/selection/__tests__/SelectionRound1Fixes.real-element.test.tsx` unless
another test is named.

- **A step picked from a run's results stays bound to that run** (insight 2, severity 3). A
  graphty-element `measure` leaf may name `scope`, the scope of the run it reads (additive, `@beta`
  in `MeasureLeaf`): the step reads the newest listed run with that algorithm, params and scope as
  the run left it, and starts one only when none is listed. The app writes `scope` only when the
  run covered another part of the graph than the step's base, and words the picker's entry with it:
  "Connected components (112 showing)". Why: the entry described one run and the step read a new
  whole-graph run ("Group 1, 549" under "112 of 549"). graphty-element already reported a run's
  scope (`run.scope.spec`, `nodeCount`); what was missing was a way for a step to stay on it. Element
  test: `test/session/scope/watch-steps.test.ts` ("a measure that names its run's scope ...").
- **By position says which end and in what** (insight 4, bar 9). Its row is "Top | Bottom" (the
  outline's own words, "top 5", "bottom 5"), the box, then "nodes | % of nodes"; the rule is graphty-element's `threshold` with `from` and
  `percentile`, which it already had. The step keeps the end and unit before a count is typed (its
  mode, "top low percent"). A refused count on an untouched step says "The step keeps everything until a
  count is typed." (true in both hosts) instead of naming "the highest 10", a default the step never applied.
- **"Is exactly" takes on an empty text step** (insight 6). The empty rule cannot hold a match, so
  the step keeps it as its mode, as By position keeps its own, and the text typed after it is
  matched exactly.
- **Clear then Escape, or Clear then Done, keeps a reopened filter card** (insight 7). Only a card
  made in this opening goes when it is left empty, the same check Cancel makes; a saved card emptied
  by Clear stays at All nodes, and Undo brings its steps back.
- **The empty Fill color box says what it takes and its picker stays open over the first pick**
  (insight 5). The box's placeholder is "Pick or type" (the row already says Color) (compact-mantine's existing
  `emptyText`, no look change); the waiting box is now the same field as a set color, so the first
  pick no longer swaps the field and closes the picker. A pick is written at once, as on a set
  color: the change is that the reader can keep adjusting. Owner item, not built: if the owner wants
  the first click on an empty box to commit nothing at all, that is compact-mantine's picker
  behavior, which is Figma-locked.
- **A new Or group is calm** (insight 3, bar 9). Its row and its untouched step show no count ("0 so far"), and say none, until one of
  its steps has a test; an untouched range step lights no bar. compact-mantine's brush still draws
  its two thumbs at the ends (Figma-locked; recorded for the owner, not changed).
- **"Condition..." is now "And..." in a group that starts with everything, and "Add..." in one that
  starts with nothing; "Or..." stays** (insight 3, bar 9). Why: three sessions on three halves read
  neither "Condition..." nor "Or..." as "and" or "or else"; the button now says what its step does to
  the group, as the step's own verb does (Keep, Add). Two-way door: round 2 checks it. The empty
  selection's add row follows the same words.
- **The workspace header is reachable** (bar 9, accessibility finding 3). It is its own F6 stop, before
  the outline and pane; Tab past the workspace's last control goes to the header, not the status bar;
  Shift+Tab from the header's first control leaves the workspace as before (no trap). Done's tooltip
  says "Done (Escape)", the key Escape already had.
- **Study setup** (insights, "About the study"). T73's prompt now asks that people or gauges added
  later turn orange too, the one thing only a rule gives, with no control named; a correct picked set
  is P under the new wording, and round 1's picked-set answers are not re-graded. T70's follow-up
  ends "Did what you saw change what you did next?" in place of "Would you rather it had shown
  something else?", which invited a wish.

### After the fix pass's three walks, 2026-11-03 (studio engineer)

The walks on build 22a87a0679 are `fixpass-interaction.md`, `fixpass-content.md` and
`fixpass-calm-first.md` in this folder. Changed after them, in the same pass:

- **By position reads "Top | Bottom"**, the outline's own words ("top 5", "bottom 5"); "Highest" and
  "Lowest" were cut to "Hig..." and "Low..." and disagreed with the outline. The unit select is wide
  enough for "% of nodes".
- **The run's scope says "showing"** ("Connected components (112 showing)"), the word the rest of the
  screen uses for what is visible.
- **The Fill box's cue is "Pick or type"**: the row already says Color, and the longer cue was cut.
- **By position's refusal says "The step keeps everything until a count is typed."**, true in both
  hosts ("Nothing is cut" was wrong in a style layer, which cuts nothing).
- **A group that starts with nothing shows no count while its steps have no test or no reference**:
  no "0" on the group, no "0 so far" on the step row or in its pane, for a range step and a
  "Within hops of" step alike.
- **A layer's Which row says its count over what is showing**, as the row draws it ("4 of 15" under
  a filter); it said "4 of 24 nodes" after an Undo with the workspace closed (interaction walk,
  severity 3).
- **The colleague setup `volunteers-thanks.txt` says And...**: it named the old button.

Not changed, with the reason:

- **"And..." stays** (the content designer suggested "Keep..."): round 2 is the test the report
  asked for; one change at a time.
- **Three counts of one layer at rest** (the layer row, the inspector's Which row, the canvas key):
  a calm-first severity 3 candidate. The layer row and the Which row are owner-approved surfaces
  (tier 4), so no count is removed without the owner; it goes to the next report's owner questions.
- **Forward Tab no longer leaves the workspace** (it goes to the header, then on through it); Shift+Tab
  leaves it, F6 and Escape too. Kept: it is what the accessibility walk asked for. The style host's
  preview has no Tab stop (F6 reaches it), as before.
- **compact-mantine's brush track is lit across an untouched range**: Figma-locked, an owner item.

## Decided by the design team, 2026-11-03

- **The Which nodes / Which edges outline says no count at rest** (reverses "Three counts of one layer
  at rest" above, as a team decision: a reversible change to a surface new in tier 5). A style layer's
  count showed three times at rest: on its layer row, on the Which outline's title row and in the
  canvas key. The layer row and the canvas key are owner-approved surfaces and keep it; the Which
  outline row is new in tier 5, so it drops it, visibly and in its accessible name. The open workspace
  still says the count in its header, and a Data place filter card keeps its count (it has no other).
  Why: the calm-first walk's severity 3 candidate; one number said three times is noise, and the
  outline is the recipe, not the result.
