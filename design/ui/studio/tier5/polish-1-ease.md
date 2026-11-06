# Tier 5 polish round 1: ease of use

Adversarial walk of the built selection editor, both hosts, on build `7225138fd378` (frozen copy of
`graphty/dist`), Les Miserables sample, 1440 x 900. Screenshots are under the main checkout's
`tmp/design-studio/tier5/polish-1/ease/` (`s1` style layers, `s2` import filter, `s3` landing page).
Personas walked: Explorer Elena (novice, "just show me something"), Analyst Alex and Expert Emma
(repeat analysts), Fraud Detection Analyst (k hops around a suspect). Only verified problems are
listed; each names its evidence and the fix.

## Step counts per task

| Task (persona)                                           | Path that worked                                                                                    | Inputs | Confusion seen                                                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| Simple pick: nodes with degree 10 or more (Elena)        | "+", type "deg", Enter, click the min box, type 10, Enter, Done                                     | 7      | Boxes empty, no range shown; focus lands on the verb button, not the box (finding 4, 5)                                    |
| OR across fields: degree 10+ or name contains Val (Alex) | open Which nodes, Or, "name", Enter, click the box, "Val", Enter, Done                              | 8      | Key says B 1 but nothing draws orange (finding 3); Escape never closes the card (finding 2)                                |
| 2 hops around a picked node (Fraud analyst)              | "+", "hop", Enter, click Reference, type, ArrowDown, Enter, click Hops, type 2                      | 9      | No way to pick the node on the canvas (finding 6); Enter after typing chooses nothing (finding 11)                         |
| Big-graph simplification in the filter (Emma)            | Add filter, "deg", Enter, open the match list, Highest, Filter to, caret, Keep, "larg", Enter, Done | 11     | "top 10" counts 11 with no tie chip (finding 9); By position does not exist (finding 4)                                    |
| Landing-page hover                                       | hover a node on the paused hero graph                                                               | 0      | None: neighbors kept, rest faded, hover away restores a pixel-identical picture (`s3/04.png`, `s3/05.png`, diff bbox None) |

## Findings, most severe first

### 1. Blocker: a new layer's editor says "0 of 77, No nodes" while the layer paints all 77

- Evidence: `s1/01.png` (Layer 1 freshly added: Which nodes "0 of 77", "No nodes" pressed, layer row
  "77"); `s1/40.png` (Layer 3 added, Done with no step: folded row "77 of 77 nodes" and the removed
  sentence "All 77 nodes: add a condition to narrow"; layer row 77); `s1/42.png` (the first step
  drops the layer row from 77 to 0 at once). Source: the folded row for a layer with no union
  selector is still the tier 4 row, `graphty/src/workspace/style/WhichPicker.tsx:552` and `:602`.
- Failure: the editor shows a draft None selection the element does not hold, so the count the reader
  reads is wrong until the first step lands, and then the layer's paint jumps from everything to
  nothing. Acceptance 26 (no removed sentence) also fails.
- Fix: write the new layer's selector as a union with one None group when the layer is made (one undo
  step with the layer), so the element, the layer row, the editor and the folded row read the same
  count; delete the "add a condition to narrow" strings. If a style layer's default must stay "all",
  then the new selection's group must start All and the segment must show it.

### 2. Major: Escape from any box in an open step card never closes the card or ends the preview

- Evidence: `s1/17.png` to `s1/21.png` (name card, focus in the text box: five Escapes, card and
  "Preview: Which nodes" stay); `s1/23.png`, `s1/24-crop.png` (Degree card, focus in the min box: two
  Escapes, card stays). Source: the editor's Escape handler returns early on `event.defaultPrevented`
  (`graphty/src/workspace/selection/SelectionEditor.tsx:352`), and the boxes (Autocomplete,
  NumberBox) prevent Escape whether or not they had anything of their own to close.
- Failure: spec section 3 "Escape closes the innermost thing per press ... close card, end picking";
  acceptance 18 cannot be met from the keyboard. Readers type into a box and then reach for Escape;
  the only ways out are Done or a click.
- Fix: in the boxes, prevent Escape only when it closed a list or reverted a draft; otherwise let it
  bubble. Or in the editor, treat an Escape from a box whose list is closed (`aria-expanded` not
  true) as "close the card", as `WhichPicker.tsx:1020` already does for the old cards.

### 3. Major: the preview key counts overlapping members twice, so its rows do not match the drawing

- Evidence: `s1/17.png` (A 22, B 1, No match 55: 78 of 77; B's only member, Valjean, is drawn in A's
  color, so the key lists an orange row with nothing orange on the canvas); `s1/55.png` (A 34, B 20,
  No match 26: 80 of 77). Source: `graphty/src/workspace/canvas/PreviewKey.tsx:70-86` shows each
  group's own count beside a swatch while the canvas draws first-group-wins.
- Failure: a reader who adds "name contains Val" sees "B 1" and no orange node anywhere and
  concludes the step failed (the very "Val" walk spec section 9 cites as the reason for the preview).
- Fix: the key's per-group number counts what draws in that color (members not in an earlier
  group), read from the element's branch reading; the group's full count stays on its row in the
  editor. Optional: a faint "+3 in A" in the row's tooltip.

### 4. Major: the number card is still the tier 4 card: no By value / By position, no histogram, Has a value / Has no value

- Evidence: `s1/06-crop.png` (Degree: "Between" select, bare slider, two empty boxes); `s2/05-crop.png`
  (options Between, Highest, Has a value, Has no value, on Degree, which always has a value).
  Source: the step card renders the old body, `graphty/src/workspace/style/WhichPicker.tsx:2193`
  (`MatchSelect` with `PRESENCE` from `:1633`), and the sentences at `:2245` ("There are only N, so
  this keeps all of them") and `:2250` ("N have no value and are left out") remain reachable.
- Failure: spec section 5 (segment By value | By position, HistogramRow brush, Not measured chip,
  tie chip) is not built, so "top 10% by betweenness" or "bottom 5" cannot be asked, and two UI
  sentences the spec removed are still on the card.
- Fix: build the kind table of spec section 5 for number and time: a SegmentedControl "By value |
  By position", compact-mantine's HistogramRow with `brush` over the two boxes, "# / %" and top /
  bottom under By position, and the "Not measured: K" chip in place of Has a value / Has no value
  and the two sentences.

### 5. Major: a number card's boxes are empty, so the reader types blind

- Evidence: `s1/06-crop.png` (Degree: both boxes empty, no domain shown); `s1/44.png` (Betweenness:
  typed 0.1 thinking it was 0..1; 34 of 77 pass, i.e. every node above zero); `s1/46.png` (the
  picker itself knows "Betweenness 0 to 1,624"); `s1/49.png` (table values 22.9 to 1,624).
- Failure: Elena and Alex both need the scale before they can type a bound; nothing on the card says
  it, and the bare slider has no tick labels.
- Fix: until a bound is set, show the domain's low and high as the boxes' placeholders (same numbers
  the picker's value summary already shows), and draw the histogram (finding 4) with its end labels.

### 6. Major: no target button, so a Relative to reference cannot be picked on the canvas

- Evidence: `s1/26.png` (Within 1 hop of: Reference select and Hops box, nothing else); clicking
  Valjean on the canvas ended the editor and opened Valjean's inspector (`s1/30.png`). Source:
  `graphty/src/workspace/selection/StepCard.tsx:150-230` renders only the Select and the hops box;
  no "Pick on canvas" control exists in `selection/`.
- Failure: spec section 4 (24 px target button, Figma's eyedropper) and acceptance 16. The fraud
  analyst's natural move, click the suspect, throws away the open card; the workaround (Done, select
  the node, reopen, change the reference to Selected (1)) took 7 extra inputs (`s1/31.png` to
  `s1/38.png`).
- Fix: add the 24 px target ActionIcon beside Reference, as spec section 4 describes; armed, the next
  node click (canvas or table) writes `{ nodes: [id] }` and does not select or end the preview;
  Escape disarms.

### 7. Major: after a value is chosen, focus lands on the verb button, not on the test

- Evidence: real.mjs on `s1/16.png`: `nothing that takes text has focus (focus is on button "Verb:
Add")` right after picking "name"; the same on Degree (a click on the box was needed). Source:
  `graphty/src/workspace/selection/SelectionEditor.tsx:204`, selector
  `[data-step-card] :is(input:not([type=hidden]), button)` matches the verb button first in DOM order.
- Failure: every pick costs an extra click, and a keyboard reader needs two Tabs to reach the box
  they came to fill.
- Fix: focus the card's first input (`input:not([type=hidden])`) and fall back to the first button
  only when the card has none.

### 8. Major: the folded Which row reads its steps as commands ("Add Degree 10 or more")

- Evidence: `s1/10.png` (chip "Add Degree 10 or more" in a bordered box under Which nodes);
  `s1/31.png` ("Add Within 1 hop of Valjean"); `s1/45.png` ("Add Betweenness: Bridging Betweenness
  0.1 or more"). Source: `graphty/src/workspace/selection/StyleSelection.tsx:138`.
- Failure: in a panel full of "+" buttons, a bordered chip that starts with "Add" reads as a button
  that adds degree; on hover it has no tooltip. The betweenness chip also repeats the method.
- Fix: put the verb's lucide glyph in the chip in place of the word (as the step rows do), drop it
  for the first Add of a None group, and build the chip from the row's value and short test so it
  never repeats the method.

### 9. Minor: "top 10" keeps 11 with no tie chip; the summary and row repeat the field

- Evidence: `s2/06.png` (row "Degree top 10 by Degree 11"; card "Highest 10 of all nodes", count 11);
  `s2/16.png` (at rest: "Degree is among the highest 10, keep in the largest component" while 11 show).
- Fix: the tie chip of spec section 5 ("10 asked, 11 kept: tied at 12"); row test "top 10" without
  "by Degree"; and the at-rest union words in `graphty/src/workspace/data-place/filterWords.ts:58-71`
  should read "keep the largest component" (or follow the row's words), not "keep in the largest
  component".

### 10. Minor: missing Relative to presets: "Shares a value with" (Community of) and "On a path between"

- Evidence: `s1/52.png` (typing "comm" lists only algorithm fields); `s1/56.png` ("share" finds only
  the shared_chapters column); `s1/53.png` (Louvain's checklist lists "Group 1, 20 nodes" ... with no
  way to tell which one holds Valjean). Source: the node-side presets in
  `graphty/src/workspace/selection/values.ts:233-253` stop at Is in, Within, Neighbors of selection,
  Connected to, Up/Downstream, While.
- Failure: "color Valjean's community" (a spec dry-run task) needs guessing groups by size.
- Fix: add the two presets of spec section 7 (`same-value`, `measure` of shortest path), aliases
  "community of", "same as", "path"; in a category checklist, name each group by the member the
  element names ("Community of Valjean") per spec section 5.

### 11. Minor: the Reference search neither selects its text nor highlights the first match

- Evidence: `s1/28.png` (typed "Valj", Enter: nothing chosen); `s1/34-crop.png` (clicked the box
  holding "Valjean", typed "Sel": "ValjeanSel", no match).
- Fix: select the box's text on focus and highlight the first option while typing, as the value
  picker does, so Enter takes it.

### 12. Minor: duplicated chrome in an open step and in a filter card

- Evidence: `s1/06-crop.png` (the step row and the open card each show the verb icon, the name, the
  count and an X, stacked); `s2/21-crop.png` (filter card header "11 of 77" and selection header
  "11 of 77" twice in 60 px).
- Fix: while a step's card is open, hide its row (the card's head is the row), and in a filter card
  drop the selection header's count (the approved header chip already says it).

### 13. Minor: the value name is truncated before the test

- Evidence: `s1/42.png` ("Betweenness: Bridgi..." in the card head; row "Betweenness: Bridging N...");
  tooltip "Add (Union), Betweenness: Bridging, Betweenness: any value, ...".
- Fix: spec section 3 "truncate the test, never the value name"; name a single node-side field by its
  method ("Betweenness") and stop the tooltip repeating the name.

## Checked and fine

- Escape on a just-added step with no value takes it back and returns focus to "+" (`s1/47-crop.png`).
- Two Escapes on a new empty filter card remove it (`s2/18-crop.png`).
- The filter's count chip opens the table on its rows with the Group column and Matches only on
  (`s2/23.png`); the style's Table button does the same (`s1/49.png`).
- Live Selected (N) follows the selection: Myriel selected, Layer 2 reads 11 (`s1/38.png`).
- Keep under Add draws the order icon (`s2/14.png`); a Filter to card being edited keeps the removed
  nodes drawn faint (`s2/10.png`).
