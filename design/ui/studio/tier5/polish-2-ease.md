# Tier 5 polish round 2: ease of use

The selection editor is the panel that says which nodes or edges a style layer paints ("Which
nodes") or a Data-place filter card keeps. This walk drove it in both hosts with real input, on
build `d231869fd585` (a frozen copy of `graphty/dist`), at 1440 x 900. Screenshots are under the
main checkout's `tmp/design-studio/tier5/polish-2/ease/`:

- `s1`: a simple pick, then an OR across fields, in a style layer on Les Miserables.
- `s2`: k hops around a node, in a style layer.
- `s3`: a big-graph simplification in the import filter, on the 331-node `yeast-galactose.graphml`.
- `s4`: the landing-page hover.
- `s5`: the landing-page hover rebuilt as a layer in the editor.
- `s6`: hops around a selected node, in the import filter.

Personas walked: Explorer Elena (novice), Analyst Alex and Expert Emma (repeat analysts), and the
Fraud Detection Analyst (k hops around a suspect). Each finding below was seen on screen or read in
the code, and names its evidence and a concrete fix. Items the round 1 fixes already carried to the
next build (the number card's By position and histogram, the tie chip, the Pick on canvas target
button, the Shares a value with preset) are not repeated here.

## Step counts per task

| Task (persona)                                                        | Path that worked                                                                           | Inputs | Confusion seen                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| Simple pick: degree 10 or more (Elena), `s1/02-06`                    | "+", "deg", Enter, "10", Enter, Done                                                       | 6      | None: focus lands in the min box and the domain shows as placeholders                                    |
| OR across fields: or name contains Val (Alex), `s1/07-15`             | Which nodes, Or, "name", Enter, Escape, click the text box, "Val", Enter, Escape, Escape   | 10     | Typing went into the operator select (finding 1); B counts 1 but nothing on the canvas shows (finding 4) |
| Within 2 hops of Valjean (Fraud analyst), `s2/02-07`                  | "+", "hop", Enter, "Valj", Enter, Tab, "2", Enter                                          | 8      | Clicking the suspect on the canvas drops the editor (carried target button)                              |
| Largest component and degree 2 or more, Filter to (Emma), `s3/05-17`  | Add filter, "larg", Enter, Filter to, "+", "deg", Enter, "2", Enter, verb icon, Keep, Done | 12     | The second "+" widened 249 to 283 (finding 2); the first step selected 249 nodes (finding 3)             |
| Filter within 2 hops of the selected node (Fraud analyst), `s6/03-07` | select Valjean, Data, Add filter, "within", Enter, "Sel", Enter, Tab, "2", Enter, Done     | 11     | The step replaced the reader's selection of Valjean with 75 nodes (finding 3)                            |
| Landing-page hover, layer 1 rebuilt in the editor (Emma), `s5/02-11`  | "+", "while", Enter, "Hov", Enter, caret, Except, "within", Enter, "Hov", Enter            | 11     | The hovered node is drawn with no mark (finding 5); the list covers the card (finding 6)                 |
| Landing-page hover on the paused hero graph, `s4/04-06`               | hover a node                                                                               | 0      | None: neighbors kept, rest faded, hover away restores a pixel-identical picture                          |

## Findings, most severe first

No blocker was found: every task above could be finished, and every count checked was right
(Valjean's 36 neighbors plus himself is 37 in `s2/06.png`; 77 minus 37 is 40 in `s5/11.png`).

### 1. Major: a text card focuses the operator select, so the reader's typing goes nowhere

- Evidence: `s1/09.png` (name picked: focus ring on "Contains", the text box empty); `s1/10.png`
  ("Val" typed: the operator list opens, the text box still empty). The step stays "No test" until
  the reader clicks the box (`s1/12.png`).
- Cause: `graphty/src/workspace/selection/SelectionEditor.tsx:1087-1094`. `cardFocus` skips
  `[role=combobox]` inputs to reach "the first box to type in", but the text box is an Autocomplete
  (a combobox), and the read-only operator Select's input is not marked as one. So the select wins.
- Fix: mark the text card's text box `data-first-focus` (the selector the reference box already
  uses), or skip `input[readonly]` in the second selector. Add a real-input test: pick "name",
  type "Val", and assert that the box holds "Val".

### 2. Major: a second "+" on a None group adds (widens), so refining a filter makes it bigger

- Evidence: `s3/11.png` (the "+" tooltip under Largest component reads "Add a step: Add");
  `s3/13.png` (Degree 2 or more: the card goes from 249 to 283 of 331); `s3/15.png` and `s3/16.png`
  (verb icon, Keep: 170). Both rows draw near-identical square glyphs, and no word says Add or Keep.
- Cause: `graphty/src/workspace/selection/model.ts:47-53` returns the last step's verb, as spec
  section 4 says.
- Failure: Emma's "keep the main component, drop the leaves" is the commonest simplification. She
  reads "+" as "another condition", gets the union, and the only signal is a count that went up. A
  Filter to card then keeps 113 more nodes than she asked for, and nothing tells her.
- Fix (spec section 4 changes): after a group's first step, "+" defaults to Keep, because widening
  is what "Or" is for. And the split button shows its verb as a word ("+ Keep"), so the default is
  never hidden in a tooltip. Acceptance 9 gains a check: "+" under one Add step writes Keep.

### 3. Major: a new filter card's default effect, Select, overwrites the reader's selection while the card is still open

- Evidence: `s6/04.png` (Valjean selected, inspector open); `s6/06.png` (the first step commits:
  the inspector becomes "75 nodes selected", and Valjean's selection is gone while the card is still
  open); `s3/07.png` (Largest component: "249 nodes selected", with a 249-name list in the right
  panel mid-edit).
- Failure: the Fraud analyst selects the suspect and builds "within 2 hops of Selected". The
  reference freezes correctly ("Within 2 hops of Valjean"). But the selection the reader was working
  from is replaced before Done, the inspector they were reading is swapped out, and the preview's
  group colors already show the same members. Spec section 9 says the preview is "never saved".
- Fix: while a Select card's editor is open, its effect is shown only by the preview, and the
  canvas selection is written once, on Done (one undo step). This is graphty-element's filter
  visibility (`Select` applies at commit), so the app does not hold the write back.

### 4. Major: hovering a group row or its count chip marks nothing on the canvas

- Evidence: `s1/15.png` and `s1/17.png` (pointer on group B's row, then on its "1 of 77" chip): the
  canvas area is pixel-identical (diff bounding box None). No hover handler exists under
  `graphty/src/workspace/selection/` (grep for onMouseEnter, onPointerEnter: none).
- Failure: spec sections 3 and 8 ("Hover marks its members"). This is the "Val" case spec section 9
  was written for. B's only member, Valjean, is also in A, so the preview draws him in A's color and
  the key reads "B 0" (`s1/13.png`). The reader has no way to see where B's member is except by
  clicking the chip, which changes the selection.
- Fix: on a group row's or count chip's pointer enter (and focus), ask graphty-element to mark that
  group's members, as the table's row hover does, and clear the mark on leave. The element owns the
  mark; the app only passes the group.

### 5. Major: the hover mark is missing during the preview, so a Hovered-or-selected rule cannot be watched

- Evidence: `s5/11.png` and `s5/crop-11.png` (pointer on Valjean while editing "Except within 1
  hop of Hovered or selected"). The Hovered layer counts 1, and the rule follows him (A 40), but
  Valjean is drawn faint with no hover mark.
- Failure: spec section 9 says "the Selected ring and the hover mark stay on top". Rebuilding the
  landing page's hover, or any live rule, is done by hovering, and the reader cannot see which node
  drives what they see.
- Fix: in graphty-element's branch preview (`styles.showBranches`), keep drawing the built-in
  Hovered and Selected layers' marks above the group colors, as it already keeps labels.

### 6. Minor: the reference list opens at full window height over the card it fills, with nothing highlighted

- Evidence: `s5/03.png` and `s5/09.png` (the list runs from y 10 to 890 over the whole right panel
  and the app bar, hiding the step row and the Hops box); `s6/05.png` (the same over the Data
  place). With nothing typed, Enter chooses nothing (`s5/04.png`), and the option under a
  stationary pointer shows the highlight ("CountessDeLo").
- Fix: cap the dropdown at the listbox's standard height (about 240 px, the value picker's), and
  highlight the first option when it opens, not only while typing.

### 7. Minor: the "While has nodes" and "Within hops of" presets lose their words in rows and card heads

- Evidence: `s5/02.png` (the picker entry "While has nodes"); `s5/05.png` (the row reads "While No
  reference"); `s5/06.png` (the row reads "While Hovered or selecte...", and the card head reads
  only "While", so "has nodes" never appears); `s2/02.png` ("Within hops of", with no k). The source
  is `graphty/src/workspace/selection/values.ts:236,253`.
- Fix: write the reference into the words, "While Hovered or selected has nodes", with the inert
  form "While ... has nodes", and the picker entry "Within k hops of". Truncate the reference, never
  "has nodes".

### 8. Minor: in the import filter, the reference list heads Selected (1) with "Live" and offers So far on a first step

- Evidence: `s6/05.png` (the filter card's list: "Live", then "Selected (1)" and "So far"). A
  filter freezes Selected (N) on commit, as the frozen row "Within 2 hops of Valjean" in `s6/06.png`
  shows. And So far on a None group's first step is always empty.
- Fix: in the filter host, head the group "Selection" (or give it no heading). Disable So far,
  with its reason in the tooltip, when the step is its group's first.

### 9. Minor: value names are cut short before the test is

- Evidence: `s3/07.png` (the card head reads "Largest comp..." beside "249"); `s3/19.png` (the row
  reads "Largest compon..." though it has no test); `s3/13.png` (the filter header reads "Largest
  component...").
- Fix: spec section 3, "truncate the test, never the value name". Give the name its full width,
  and drop the count chip's "of N" in a row before cutting the name.

### 10. Minor: a step with no controls (Largest component, Isolated) opens an empty card that repeats its row

- Evidence: `s3/07.png` (row "Largest component" and, under it, a card holding only its head: name,
  249, "...", X).
- Fix: a value with no test applies on pick and does not open a card. Its "..." stays on the row.

### 11. Minor: the text card keeps Has a value and Has no value and lacks Matches; its list stays open after Enter

- Evidence: `s1/10.png` (operators Contains, Starts with, Ends with, Is exactly, Has a value, Has
  no value); `s1/13.png` (after Enter commits "Val", the suggestion list stays open over "+").
  The source is `graphty/src/workspace/style/WhichPicker.tsx:1633`.
- Fix: spec section 5. For text, the operators are Contains, Starts with, Is, Matches. Has a value
  becomes the Not measured chip. Close the suggestion list when Enter commits.

### 12. Minor: Degree shows no value summary in the picker, while columns do

- Evidence: `s3/05.png` (gal1RGexp shows "-2.426 to 2.058", but Degree shows nothing, though the
  graph panel reads 1 to 18).
- Fix: show Degree's range from the element's degree reading, as for a column (spec section 4,
  "value summary right").

## Checked and fine

- The simple pick takes 6 inputs: focus goes to the min box, the domain's ends are placeholders,
  and the folded chip reads "Degree 10 or more" (`s1/04.png` to `s1/06.png`).
- Escape closes the open list, then the card, then ends the preview, and styling comes back
  (`s1/14.png`, `s1/15.png`).
- A Keep below an Add draws the order icon (`s3/16.png`).
- The filter freezes Selected to "Valjean" in its row and folded chip (`s6/06.png`, `s6/07.png`).
- A live Hovered-or-selected rule follows the pointer (`s5/06.png`: A 0; `s5/07.png`: A 77).
- The landing-page hover restores a pixel-identical picture (`s4/04.png` against `s4/06.png`).
