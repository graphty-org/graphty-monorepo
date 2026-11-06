# Tier 5 polish round 3: ease of use

The selection editor is the panel that says which nodes or edges a style layer paints ("Which
nodes") or a Data-place filter card keeps. This walk drove it in both hosts with real input, on
build `7ca4cae647dd` (a frozen copy of `graphty/dist`), at 1440 x 900. Screenshots are under the
main checkout's `tmp/design-studio/tier5/polish-3/ease/`:

- `s1`: a simple pick, then an OR across fields, in a style layer on Les Miserables.
- `s2`: k hops around a node, in a style layer.
- `s3`: a big-graph simplification in the import filter, on the 331-node `yeast-galactose.graphml`.
- `s4`: the landing-page hover.
- `s5`: the landing-page hover's first layer rebuilt in the editor.
- `s6`: a value with no test (Isolated) in a style layer, and the "neighbors" alias.
- `s7`: an OR across two columns in the import filter, and its count chip.

Personas walked: Explorer Elena (novice), Analyst Alex and Expert Emma (repeat analysts), and the
Fraud Detection Analyst (k hops around a suspect). Each finding was seen on screen or read in the
code, and names its evidence and a concrete fix.

## Step counts per task

| Task (persona)                                                         | Path that worked                                                                                                          | Inputs | Confusion seen                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| Simple pick: degree 10 or more (Elena), `s1/02-08`                     | "+ Keep", "deg", Enter, "10", Enter, Done                                                                                 | 6      | None; 22 of 77 is right                                                                                   |
| OR across fields: or name contains Val (Alex), `s1/09-15`              | Which nodes, Or, "name", Enter, "Val", Enter, Escape                                                                      | 7      | Down from 10: focus now lands in the text box. B counts 1, and pointing at B hides its member (finding 1) |
| Within 2 hops of Valjean (Fraud analyst), `s2/02-10`                   | "+", "within", Enter, Escape, click Valjean, Layer 1, the folded chip, the row, Reference, "Valj", Enter, Tab, "2", Enter | 14     | The reference list covers the card (finding 2); clicking the suspect drops the editor (finding 4)         |
| Largest component, keep degree 2 or more, Filter to (Emma), `s3/03-10` | Add filter, "larg", Enter, Filter to, "+ Keep", "deg", Enter, "2", Enter, Done                                            | 10     | Down from 12: "+" now keeps (170). The preview vanished after the first step (finding 3)                  |
| gal1RGexp or gal4RGexp at 1 or more, in a filter (Alex), `s7/02-05`    | Add filter, "gal1", Enter, "1", Enter, Or, "gal4", Enter, "1", Enter                                                      | 10     | A sentence in the card (finding 5); the reader's selection is overwritten mid-edit (finding 6)            |
| Landing-page hover, layer 1 rebuilt (Emma), `s5/02-08`                 | "+", "while", Enter, "Hov", Enter, caret, Except, "within", Enter, "Hov", Enter                                           | 11     | The card head reads only "While" (still open below)                                                       |
| Landing-page hover on the paused hero graph, `s4/02-04`                | hover a node                                                                                                              | 0      | None: neighbors kept, the rest faded, hover away restores a pixel-identical picture                       |

## Findings, most severe first

No blocker was found: every task could be finished, and every count checked was right (degree 10
or more is 22 in `s1/05.png`; A 3, B 4, union 5 with an overlap of 2 in `s7/03.png`).

### 1. Major: pointing at a group's row fades the members it shares with an earlier group, so the "Val" case is still invisible

- Evidence: `s1/14.png` (A: degree 10 or more, 22; B: name contains Val, 1; Valjean at 767,436 drawn
  in A's green, pixel (0, 151, 111)); `s1/15.png` and `s1/crop-15.png` (pointer on B's row, "B, orange,
  1 of 77 nodes"): every node is faint, Valjean included (pixel (174, 179, 178)). B's only member is
  never drawn at full strength, and the key still reads "B 0".
- Cause: `graphty-element/src/session/styles/StylesApi.ts:2591-2611`. `branchLayers` stacks the
  branches last to first so the first wins, and gives every branch but the marked one a faint
  opacity. Valjean is matched by both A's and B's layers; A's (faint) is on top, so it wins.
- Fix (graphty-element): when `view.mark` names a branch, push that branch's layer last, above the
  others, so its members draw in its color at opacity 1 whatever earlier branch also holds them.
  Add an element test on Les Miserables: A Keep degree 10 or more, B Add name contains "Val",
  `mark: B`: Valjean reads B's color at opacity 1, and every other A member reads faint.

### 2. Major: the reference list ignores its 240 px cap and covers the whole panel, the card and its Hops box included

- Evidence: `s2/03.png` (the list opened by the Within pick runs from y 10 to 890, over the card,
  the Hops box, Done and the app bar, "CountessDeLo" lit under a pointer that never moved);
  `s2/11.png` (reopened with Valjean chosen: the same full-height list).
- Cause: `StepCard.tsx:208` passes `maxDropdownHeight={240}`, but compact-mantine's list fields
  default to `withScrollArea: false` (`compact-mantine/src/theme/components/inputs.ts:174`), and
  Mantine applies `maxDropdownHeight` only through its ScrollArea (`OptionsDropdown.mjs:111-114`:
  `mah: maxDropdownHeight` sits inside the `withScrollArea ?` branch). The round 2 cap never takes.
- Fix: in compact-mantine, have the list fields honor a caller's `maxDropdownHeight` without the
  ScrollArea (a max-height and `overflow-y: auto` on the options, the treatment the value picker's
  own `mah={240}` list already has), so every Select that asks for a cap gets one. If the Figma-lock
  check reads that as a behavior change, record it in `../owner-decisions.md` and meanwhile set the
  same max-height on this Select's options through its `styles`, with a comment naming the
  compact-mantine defect. Add a real-input test: open the reference list on Les Miserables and
  assert that the list is at most 240 px tall and the Hops box stays visible.

### 3. Major: picking a value with no test ends the preview while the editor is still open

- Evidence: `s3/04.png` (filter: "Largest component" picked, the key "Preview: New filter" gone,
  the canvas back to its real look with 249 selection glows, Done still showing); `s6/02.png`
  (style layer: "Isolated" picked, the key gone and every node back to the layer's look, Done still
  showing). The step a reader just added is the one moment they most need the group colors.
- Cause: `graphty/src/workspace/selection/SelectionEditor.tsx:154`,
  `picking = openStep !== null || adding !== null`. A value with no test opens no card (the round 2
  fix), so neither is set and picking ends. The verb menu is not counted either, though spec
  section 9 names it.
- Fix: picking begins when the reader adds a step or opens a card, and ends only on spec 9's own
  events: Done, Escape once nothing smaller is open, a click outside the editor, leaving the place
  or closing the panel. A value applied on pick keeps the preview on, with focus on its row. Add a
  real-input test: pick Largest component in a filter and in a layer; the key still reads
  "Preview: ..." and the canvas still draws group colors until Done.

### 4. Major (carried): clicking the suspect on the canvas drops the editor, so "k hops around a picked node" takes 14 inputs

- Evidence: `s2/04.png` (the Within card, reference unchosen, no target button beside the box);
  `s2/05.png` (one click on Valjean: the editor and the preview are gone, the inspector shows
  Valjean). Getting back took Layer 1, the folded chip, the row and Reference before typing
  "Valj" (`s2/06-09`).
- Note: the Pick on canvas target is carried in `decided.md` ("Carried to the next build round").
  It is listed here because it is the Fraud analyst's first move and the costliest step in this walk.
- Fix: spec section 4's 24 px target button (Figma's eyedropper) beside the reference box; armed, the
  next canvas click fills the reference and changes neither the selection nor the preview.

### 5. Major (carried): the number card still says a sentence, and keeps Has a value / Has no value

- Evidence: `s7/02.png` and `s7/03.png` ("2 nodes have no value and are left out." under the
  boxes); `s1/07.png` (the match select: Between, Highest, Has a value, Has no value).
- Rule broken: the owner's data UI rule (no explanatory sentences in the UI; hints go in tooltips).
- Fix: spec section 5's "Not measured: 2" chip with its include toggle, in place of the sentence and
  of Has a value / Has no value; By value | By position as the segment. Carried in `decided.md`
  with the rest of the number card; until it lands, the sentence can become the chip's words alone.

### 6. Major (carried): a new filter card selects while it is still being edited

- Evidence: `s3/04.png` (the first step commits: the inspector becomes "249 nodes selected" with a
  249-name list); `s7/02.png` and `s7/03.png` ("3 nodes selected", then "5 nodes selected", with
  Done still showing).
- Note: carried in `decided.md` (needs graphty-element's select conditions to defer under a held
  view). Still the first thing Emma and Alex see after their first step: the inspector they were
  reading is replaced.
- Fix: as carried: the preview shows a Select card's effect, and the selection is written once, on
  Done, as one undo step, by graphty-element.

### 7. Minor: the value picker scrolls sideways, and a used value reads "(already a condition)" instead of a dimmed check

- Evidence: `s1/03.png`, `s1/10.png`, `s3/03.png` (a horizontal scrollbar under every unfiltered
  list; "Rank nodes and edges" wraps in `s1/10.png`); `s7/06.png` ("gal1RGexp (already a
  condition)" lit first, its summary pushed past the edge, a sideways scrollbar).
- Cause: `graphty/src/workspace/style/WhichPicker.tsx:1489-1490` (the options scroll `overflowY:
auto` with no `overflowX`, and option rows are `nowrap`); `WhichPicker.tsx:1538-1541` appends
  the words to the name.
- Fix: spec section 4: a used value shows a dimmed check (the words stay in its accessible name);
  the name truncates before the summary, and the options never scroll sideways (`overflowX:
hidden`). Highlight the first unused match, not a used one.

### 8. Minor: the text card's suggestion list stays open after Enter commits, over the rows below

- Evidence: `s1/13.png` ("Val" committed, B counts 1, the "Valjean" suggestion still covers the
  card's foot and the "+ Keep" row); it closed only on Escape (`s1/14.png`).
- Fix: close the suggestion list when Enter commits the text (round 2 finding 11's second half).

### 9. Minor: an emptied "Live" section leaves a blank band at the top of the reference list

- Evidence: `s2/09.png` and `s2/crop-09.png` ("Valj" typed: an empty band and a divider above
  "Nodes").
- Fix: hide a section's divider when the search leaves it empty, as the value picker does.

## Still open from round 2, seen again

- The While card head reads only "While" and the row "While Hovered or selecte..." (`s5/04.png`);
  "has nodes" never appears.
- Degree shows no value summary in the picker while the columns do (`s3/03.png`).
- In Les Miserables the built-in Hovered layer paints nothing, so neither the rest picture nor the
  preview marks the hovered node (`s5/crop-08.png`, `s5/crop-10.png`, `s5/11.png`). The round 2
  fix that keeps the hover mark above the group colors has nothing to keep on this sample; the
  landing page draws one (`s4/03.png`).

## Checked and fine

- "+" after a group's first step writes Keep, and the filter goes 249 to 170 (`s3/09.png`).
- A text card puts focus in its box: "Val" typed lands there (`s1/12.png`).
- "neighbors" finds "Neighbors of selection" under Relative to (`s6/03.png`).
- A filter group's count chip opens the table on Matches only with the Group column, focus kept in
  the editor (`s7/05.png`).
- Escape closes the open suggestion list and keeps the card (`s1/14.png`); Done ends the preview
  and styling comes back (`s1/08.png`).
- The landing-page hover restores a pixel-identical picture (`s4/02.png` against `s4/04.png`).
