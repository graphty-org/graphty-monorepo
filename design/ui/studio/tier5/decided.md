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
