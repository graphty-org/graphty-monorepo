# Tier 5 spec review: red team

Review of `../../selection-groups/spec.md` (as committed at 0679ce250c) against `decided.md`, `../tier4/decided.md`,
`../../framework/decided-doors.md`, `../../framework/glossary.md`, the panel proposals in `panel/`, the published
graphty-element API reports (`graphty-element/api/*.api.md`) and the app source. Only problems checked against a
source are listed. Most severe first.

## Blockers

### 1. The spec keeps unfinished steps; tier 3 and 4 rules that still bind drop them

- **Evidence.** Spec section 1: "Unfinished work is kept as a pending row; the 'Dropped the name condition' toast
  goes", and acceptance 4 keeps a test-less step after closing. `../tier4/decided.md` (carried from tier 3, still
  binding per `decided.md` line "Tier 3 and 4 entries on Escape, Tab, commit and remove buttons still bind"):
  "An unfinished card is dropped when its picker closes, with a notice and no Undo" and "Escape on a just-added
  line or card that holds nothing takes it back, says so, and puts focus on the '+'". `decided.md` removes only the
  toast's words; it records no reversal, which its own header requires ("Reversing one needs a new dated entry
  ... with the reason and the evidence"). The spec also never says what Escape does on the value picker that "+"
  opens at once (section 4) before anything is chosen.
- **Why it matters.** Two binding rules contradict each other, so every dry-run triage can cite either; tier 3 and
  4 already flip-flopped on exactly these rows. A returning analyst who presses "+" then Escape gets a ghost row.
- **Fix.** Add a dated reversal entry to `decided.md`: a step that holds a value but no test is kept as pending; a
  step with no value (picker closed with nothing chosen, by Escape or a click away) is taken back with focus on
  "+", as tier 3 says. State it in spec section 1 and add an acceptance check for "+", Escape.

### 2. Adding "focus" and "so-far" to `Scope` is not additive, and `Scope` is not an open union

- **Evidence.** Spec section 10 item 2: "Scope forms (open union): 'focus' ... and 'so-far'". The published type
  is closed: `export type Scope = "visible" | "graph" | "selection" | "largest-component" | {set} | {where} |
{nodes} | {define}` (`session.api.md` line 4779), `@public`, and it is returned, not only accepted:
  `ResolvedScope.spec`, `StaleNote.scopeSpec`, a run's frozen `spec` (lines 4128, 5931, 4726), and
  `parseScope(value): Scope`. Widening a returned union breaks a consumer's exhaustive switch, which CLAUDE.md
  classes as breaking ("When unsure whether a change breaks a consumer, it is breaking"). A member of a `@public`
  union also cannot be marked `@beta`. "focus" is view state; nothing says what a run's frozen scope holds if one
  is started on it.
- **Fix.** Leave `Scope` unchanged. Add a new `@beta` type for a step's reference, e.g.
  `StepReference = Scope | "hovered-or-selected" | "so-far"`, accepted only inside the `groups` leaf and by
  `node-id` / `node-set` options read there; resolve it to a plain `Scope` (`{ nodes }`) before any run starts, so
  no run ever records it.

## Major

### 3. One value per algorithm is not true once a filter starts a run

- **Evidence.** Spec section 2: the filter's runs are `scope: "graph"`, the style selector's `scope: "visible"`;
  section 6: a picked field "starts the ordinary run Analyze makes"; `decided.md` justifies outside runs with "one
  value per algorithm everywhere". `decided-doors.md`: "Default scope of a run: the filtered graph". The app
  already names sibling runs by scope (`graphty/src/workspace/runWords.ts`, "whole graph" vs "visible"). So a
  filter card that reads community makes a second Louvain run beside Analyze's, and both appear in Results on both
  hosts. In the filter, Analyze's (visible) run must be greyed (section 2: reading the filtered picture is
  circular), and Louvain is no longer in "not yet run" (section 4 item 3) -- the filter picker offers no way to
  get a full-graph Louvain.
- **Fix.** Say it: the filter's Results section lists only full-graph runs; for an algorithm whose only runs are
  on the filtered graph, the filter's "Analyze's categories" section still lists it ("not yet run on the full
  graph") and committing starts the full-graph run. Run titles from a filter always carry the scope word. Drop "one
  value per algorithm everywhere" from `decided.md` or narrow it to one host.

### 4. Start with is derived from the first step, so a reorder can flip a whole group

- **Evidence.** Section 1: "Start with, until chosen, is None when the first step is Add and All otherwise";
  section 10: `start?` is optional in the saved form; section 3: steps reorder by drag and keys. Group "Add degree
  6 to 10; Except staff" (None start) becomes, after moving Except to the top, All start: everyone not staff plus
  degree -- the opposite answer, from a move the spec treats as cosmetic. Section 4's "+" verb (Add after None,
  Keep after All) also depends on Start with, which on an empty group depends on the first verb: circular for a
  fresh layer (the study's "from a fresh layer" re-test).
- **Fix.** Write `start` explicitly when the group is created ("+" Or and the first "+" on an empty selection
  start None, so the first step is Add; a converted tier 4 card writes All). Never derive it afterwards; make
  `start` required in the `groups` leaf while it is `@beta`.

### 5. Step counts and the order rules contradict each other

- **Evidence.** Section 1: step rows show "what passes so far" (cumulative); acceptance 5: "Moving a whole-graph
  step changes no count and draws no order icon". With two whole-graph Keep steps, swapping them changes both step
  rows' cumulative counts. Section 1 also says "Whole-graph steps are order-free" in the same bullet that says "an
  Add below a Keep or Except" depends on order; both can be whole-graph. Tier 4's fix pass found two bases side by
  side confused readers (problem 16), and the step tooltip "Keep, degree 6 to 10, 24 of 77 nodes" does not say
  whether 24 is the card's matches or the group so far.
- **Fix.** Decide one meaning: the step chip counts the group after that step (so far), and acceptance 5 asserts
  only the group and total counts. Replace "Whole-graph steps are order-free" with "a run of whole-graph Keep and
  Except steps, or of whole-graph Add steps, is order-free". Make the tooltip say "so far".

### 6. A pending step blanks the layer or filter indefinitely, and what it draws is unspecified

- **Evidence.** Section 1: pending "makes its group and the total pending: no count, no table mark", shown "as a
  dashed outline" (a preview-only drawing); acceptance 4 keeps a pending step after closing. Nothing says what a
  style layer paints, or what a Filter to / Filter out card removes, while its selection is pending at rest. With
  no sentences at rest, a returning analyst sees a layer with no count and no reason.
- **Fix.** At rest a pending step is skipped for painting and filtering (the group's last ready result applies),
  and the step row shows its reason code's short word ("No test") with the full words in the tooltip. Add an
  acceptance check for the canvas and the count at rest.

### 7. The approved filter picker's Largest component and Neighbors of selection have no home

- **Evidence.** Tier 4 R2 put a Structure group in the filter picker: Data source, Largest component, Neighbors of
  selection, Time window (`graphty/src/style/WhichPicker.tsx` lines 1217-1263; `DataPlace.stories.tsx` adds
  "Largest component" and "Neighbors of selection" cards). Spec section 4 keeps only Data source and Time window;
  Largest component appears in no section, and Neighbors of selection only by implication (a "within 1 hop of
  Selected" preset). Saved tier 4 cards of these kinds open (acceptance 6) with no picker entry to make another.
  The attribute picker is an owner-approved surface (bar 6).
- **Fix.** List them: Largest component under Relative to as "is in largest component" (a reference preset), and
  "Neighbors of selection" as the Relative to preset "within 1 hop of Selected (N)", keeping its existing word as a
  search alias. Add both to acceptance 6.

### 8. The chit's color means nothing at rest, and the Figma row analogy says it is the paint

- **Evidence.** Section 8: colors are used by the preview and the table's Group column, both only while picking.
  Section 3 draws the group row as a Figma Layers row and the step as a Figma Fill row, where a swatch IS the paint.
  At rest a style layer paints its own style, so group A's teal chit sits beside a layer that paints red; in a
  filter card the chit matches nothing on the canvas. The Figma panelist named the risk ("Group colors as canvas
  hue breaks the recorded departure", `panel/figma.md` Risks).
- **Fix.** Show the chit only while previewing (at rest the group is its letter), or draw it hollow at rest and
  filled while the preview is on. Either keeps "the only color in the editor is the chit" true where it is meant.

### 9. Count-chip selection and canvas clicks fight the import filter's Select cards and end the preview

- **Evidence.** Section 8: "Count chips select what they count"; section 4: the target button fills a reference
  from "the next click on a node in the canvas"; section 9: the preview ends on "a click outside the selection".
  `../tier4/decided.md`: "A hand selection change switches select conditions off" and a Select card owns the
  selection. So in a filter, clicking a group's chip (or a canvas node to build "Selected (N)") switches every on
  Select card off, including the one being edited; a canvas click while the target is armed is outside the
  selection editor and ends the preview. Six of nine panelists proposed the chip open the table on its rows
  instead (`panel/advocate.md`, `content.md`, `director.md`, `engineer.md`, `figma.md`, `ia.md`).
- **Fix.** State that an armed target's click is part of picking (no preview end, no selection change). In the
  import filter, the chip opens the table on Show only matches (the panel's door) rather than selecting, or say
  that a chip click is not a hand change. Add both as acceptance checks.

### 10. The saved leaf is named `groups`, which the glossary reserves for partition parts

- **Evidence.** Section 10 item 1: `{ kind: "groups"; groups: ... }`, which becomes a file format once released.
  `glossary.md` line 90: **group** is "one part of a partition ... Never a container or a command", API `group`,
  `groupSize`, `groupCount`. The app already has value groups (`graphty/src/workspace/style/Groups.tsx`,
  `ValueGroup`, `LayerGroup`). The spec itself bans the noun on screen for that reason (section 11).
- **Fix.** Name the leaf and its members for what they are, e.g. `{ kind: "union", branches: [...] }` with `steps`,
  before the first release; keep "group" in the spec's prose only.

## Minor

### 11. Hotkeys say "Control" and add a reorder key the layer tree does not have

- **Evidence.** Section 3: "Control+D duplicates", "Control+] / [ reorders". The app's keymap is `Mod`
  (`graphty/src/workspace/graph-place/commands.ts`: `"Mod+D"`; `decided-doors.md`: "Mod for Cmd or Ctrl"). The
  layer tree's rows have no reorder key, so groups would reorder by a key layers do not. The owner rule "every
  hotkey has a visible button that shows its key" needs the group and card "..." items to show F2, Mod+D, Delete
  and the move keys (`MenuShortcut`, as `Groups.tsx` line 853 does); the spec does not say so.
- **Fix.** Write `Mod+D`, `Mod+]`, `Mod+[`; add the reorder keys to the layer tree's row commands too, or drop them
  here; require `MenuShortcut` on every "..." item that has a key.

### 12. "Same entries in both pickers" contradicts the filter-only Time window

- **Evidence.** Section 4 item 1: Time window "in the import filter only"; acceptance 7 and `decided.md`: "both
  list the same entries in the same order".
- **Fix.** Acceptance 7: "the same entries in the same order, except Time window (filter only)".

### 13. Three spellings for the two scopes

- **Evidence.** Section 4: Computed on reads "Filtered graph | So far" and "Full graph | So far"; run names say
  "whole graph" and "visible" (`runWords.ts` `scopeWords`); section 2 says "Whole graph". A reader matching a
  card's Computed on to its run in Analyze sees different words for the same scope.
- **Fix.** One pair of words, in the glossary, used by Computed on and by run names.

### 14. "Show only matches" is a new table control, named with a rejected phrase

- **Evidence.** Section 8 relies on the table's "Show only matches"; no such control exists in `graphty/src`.
  `glossary.md` lines 152 and 235 reject "Show only" for filtering, and in the import filter it sits beside
  "Filter to".
- **Fix.** List it as new app work in section 10's "the app renders" list, and name it without "Show only"
  (e.g. "Matches only").

### 15. The preview vote overstates the Figma designer's agreement

- **Evidence.** Section 9: "Eight of nine panelists said yes on both hosts; the Figma designer's 'no in a style
  layer' is covered by the toggle". `panel/figma.md` asks for group colors in a style layer "only when the reader
  toggles them", i.e. the toggle off by default there; the spec turns it on by default on both hosts.
- **Fix.** Say "eight of nine; the Figma designer wanted it off by default in a style layer", and make the default
  per host a dry-run check.

### 16. So far run names collide across hosts

- **Evidence.** Section 6: a So far run is listed "<Method> (A, step 2)". Every layer and filter card has a group
  A; in the simple case no letter is drawn at all (section 1).
- **Fix.** Name it by host too: "<Method> (<layer or card name>, A, step 2)".

### 17. The kind fact named is internal

- **Evidence.** Section 5 reads "`fieldMeasurement(field, shape)`"; it lives in
  `graphty-element/src/session/results/types.ts` and is in no API report. Its `Measurement` values are four
  (categorical, quantitative, time, ordinal); the table has seven kinds (number, time, ordered, category, tags,
  flag, text).
- **Fix.** Name the published fact (descriptor `measurement` plus section 10's `valueKind`) and say which element
  fact yields flag and text, so the app never derives a kind.
