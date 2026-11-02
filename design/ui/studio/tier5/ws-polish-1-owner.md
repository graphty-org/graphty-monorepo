# Selection workspace polish round 1: the owner's lens

The selection workspace is the non-modal editor that opens over the canvas column when the reader
presses Edit on a style layer's "Which nodes" or on a Data filter card. At rest, the sidebar shows a
read-only outline. This review judges the build of `6a37a22344` against two documents:

- every point of the owner's feedback of 2026-11-01 (`owner-feedback-2026-11-01.md`);
- the six fixes from the placement study (`placement-study.md`).

`graphty/dist` was rebuilt from HEAD before the review. The app was driven with real input through
`real.mjs` at 1440 x 900. Screenshots are in the main checkout's
`tmp/design-studio/tier5/ws-polish-1/owner/`:

- `o1`: Les Miserables, a new style layer. The steps were: Edit, Degree min 10, Or..., name
  contains Val, Done, reopen from group B, Clear, Cancel, then Links where shared_chapters min 2.
- `o2`: Les Miserables, Data. Two filter cards: Degree min 10, then Degree max 3.
- `o3`: an LFR graph of 50,000 nodes. A new layer, While 12 has nodes, then community.

Every finding below was seen on screen, or read in the code where a cause is named.

## Verdict per owner point

| Owner point                         | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cramped, hard to find what matters  | The sidebar at rest is calm: one line per row, one Edit, hollow chits (`o1/09.png`). The workspace is not. One count is drawn five to seven times at once (finding 3). A Links tag pushes the condition itself off its row (finding 1).                                                                                                                                                                                               |
| Disorganized: buttons, gaps, breaks | Rows no longer move on hover or select. But Edit opens on an empty 320 x 790 px column. "Condition..." opens its picker 550 px away, in the other column (finding 4). The outline column widens by 40 px mid-edit and moves the whole preview (finding 7). The header mixes five button looks (finding 8).                                                                                                                            |
| Progressive disclosure              | Holds. Start with, Links and Include not measured sit in a collapsed Advanced, and Advanced names a non-default setting on its right ("Links: shared_chapters min 2", `o1/25.png`).                                                                                                                                                                                                                                                   |
| "Select", "Filter to", "Filter out" | Fixed. No filter card shows any of the three. "Select 22" is in the title's "..." menu (`o1/14-pane.png`). New jargon remains: Live, Include not measured, Start with, and Links where ... next to Edge value... (finding 14).                                                                                                                                                                                                        |
| The two "+"                         | Fixed inside the editor: nothing in a card or the workspace draws a "+". The Data place still draws "+" on the node and edge count rows, two rows above "Filters +", with a different meaning (finding 9).                                                                                                                                                                                                                            |
| Large graphs                        | Lists are bounded. Typing "12" lists node 12 first. While reads "While 12 has nodes" whole. But at 50,000 nodes the preview is mostly hidden behind the editor's own columns, and it repaints for over 30 s, drawing a wrong mixed picture meanwhile (finding 6).                                                                                                                                                                     |
| Six study fixes                     | Fix 1, Links in a step: built, but its tag erases the condition (finding 1). Fix 3, Clear: works, and Cancel restores 22 of 77 (`o1/18.png`, `o1/19.png`). Fix 4, Escape: closes the menu, then the pane, then the workspace, keeping work (`o1/15-16.png`). Fix 5, words: Degree's tooltip and aliases are present. Fix 6, mode: By value is a Select. Fix 2, the still checklist: not re-tested here (community on LFR is numeric). |
| Would he walk away?                 | Probably less quickly than on 2026-11-01. The sidebar at rest now reads like a description. The workspace is still where he would quit: the same number in seven places; a filter preview whose 33 matches are not drawn (finding 2); a key that says B has 0 while the row beside it says 1 (finding 5).                                                                                                                             |

## Findings, most severe first

### 1. Major: a Links tag pushes the condition off its own row

- **Evidence:** `o1/24.png`, `o1/25.png` and `o1/26-side.png`. After Links where shared_chapters
  min 2 is set on the Degree min 10 step:
    - in the workspace, the row reads "Degr... [Links: shared_chapters...]";
    - at rest in the sidebar, it reads "Degr... [Links: sh...]".

    "min 10" has gone completely, and the value is cut to four letters. A secondary setting, drawn
    as a bordered chip, now holds the space the condition should have. In the sidebar at rest, that
    chip is also the only box drawn, which acceptance check 32 forbids.

- **Cause:** `graphty/src/workspace/selection/selection.css:52-84`. The test shrinks with weight
  1000, so it goes first. The tag shrinks with weight 100, but its long text gives it a large flex
  basis, so it keeps its width while the value is cut. Spec 3.1 asks for this order ("tags ...
  never truncate"), so the spec needs the fix too.
- **Fix:**
    - On the row, draw the tag as the bare word "Links", in dimmed text, with no border. The full
      "Links: shared_chapters min 2" stays in the row's tooltip and on Advanced's right.
    - Make the tag give way before the test (shrink weight above 1000).
    - Revise spec 3.1: the condition (value and test) never gives way to a tag.

### 2. Major: editing a second filter card, its matches are not drawn at all

- **Evidence:** `o2/07.png`. The card being edited, "Degree max 3", reports 33 matches in three
  places: the header, the key ("Degree max 3 33") and the strip, which lists Napoleon,
  MlleBaptistine and others. Not one node is drawn in the group color. The canvas shows only the 22
  faint nodes that the first card, "Degree min 10", leaves drawn. The 33 low-degree nodes are hidden
  by the other card, so the preview of this card is blank. The Filters header says "Passes none",
  and nothing on screen explains why the preview is empty.
- **Why it matters:** the preview is the reason the workspace exists ("the canvas is the preview").
  A filter card is computed on the Full graph (spec section 2), so its preview must draw on the full
  graph as well.
- **Fix:** while a filter card is being edited, ask graphty-element to draw the preview on the
  card's own base. Other cards' removals are lifted for the preview, and nodes that other cards
  hide are drawn faint. Spec 9 already does this for the card's own removals ("the card being
  edited is held"); extend it to every card. If the element cannot do this, the fix belongs in
  graphty-element (`styles.showBranches` with a base), not in the app.

### 3. Major: the same number is drawn five to seven times at once

- **Evidence:**
    - `o1/05.png`: "22" appears in the header ("22 of 77"), the outline's title row ("22 of 77"),
      the key ("Which nodes 22"), the step pane ("22 so far") and the sidebar ("22 of 77").
    - `o2/04.png`: seven copies: the top bar ("22 of 77 nodes"), the workspace header, the title
      row, the key, "22 so far", the Filters header ("22 of 77") and the card ("22 of 77").
    - The strip adds a Group column that repeats "Which nodes" or "Degree min 10" on every row
      (`o1/02.png`, `o2/04.png`).
    - This is the owner's first point: "a lot of information ... hard to find and focus on what
      actually matters".
- **Fix:**
    - The header carries the result count. The workspace's outline title row drops its count
      while the workspace is open.
    - The step pane shows "so far" only when it differs from the result.
    - The strip draws its Group column only when there are two groups or more.
    - The Filters header draws its total only when two or more cards are on.

### 4. Major: Edit opens on an empty column, and "Condition..." opens far from itself

- **Evidence:**
    - `o1/02.png`: Edit on a fresh layer selects the title row. The properties column, 320 x 790
      px, holds only "Condition...", "Or..." and "...". The same is true whenever the title row is
      selected (`o1/13.png`). This is the owner's "why are there empty spaces".
    - `o1/03.png`: clicking "Condition..." at (928, 100) in the properties column opens the value
      picker at (61-380, 184-284), in the outline column. That is 550 px to the left of the click,
      and the picker covers the preview key.
    - The same happens on a filter card (`o2/02.png`).
- **Fix:**
    - When the selection has no step, Edit opens the workspace with the new step's pane already
      selected and its value field focused. Then the first thing in the properties column is the
      control the reader needs.
    - Anchor the value picker to the pane's value field, so it opens where the reader clicked. The
      outline's new row only reflects the choice.

### 5. Major: the key and the outline disagree about group B

- **Evidence:** `o1/10.png`. B, "name contains Val", holds Valjean, who is also in A:
    - the outline's B row says 1;
    - B's pane says "1 of 77";
    - the key says "B 0".

    No node is ever drawn orange, so the group the reader is editing never shows on the canvas.
    Selecting or focusing B does not dim A's members either: all 22 stay at full strength. Spec 9
    says "pointing at or focusing a group's row marks it".

- **Why it matters:** the key follows spec 8 ("the first group wins"), but two numbers for one
  group on one screen look like a bug to the owner. The study's readers checked counts this way.
- **Fix:**
    - While a group row is selected, draw that group's members in its color, on top of every
      other group, and dim the other groups (`BranchesView.mark`). The canvas then shows B's
      Valjean.
    - In the key, write a group whose members all draw in an earlier color as "B 1, under A"
      (the words in the row's tooltip), never as 0.

### 6. Major: on a large graph the preview is mostly hidden and slow to settle

- **Evidence:**
    - `o3/10.png`: on 50,000 nodes, the drawing at open is cut at x 880 by the properties column
      and at y 637 by the strip. About half of the visible graph is behind the workspace's own
      columns.
    - `o1/02.png`: even on Les Miserables, about 8 nodes lie under the properties column and
      about 10 under the strip.
    - The tool reported "a style repaint is still being applied in batches" for 30 s after Edit
      and again after picking While (`o3/09.png`, `o3/10.png`). Meanwhile, the key says "Which
      nodes 50,000" while blue, unpainted nodes are scattered among the green ones (`o3/10.png`).
    - The canvas-is-the-frame rule keeps the camera still, so nothing brings the graph into the
      preview unless the reader finds Fit.
- **Fix:**
    - Keep the camera, but frame the preview's visible rectangle on open when the drawn graph's
      bounds fall more than a quarter outside it. This is one camera move, undoable, and it
      matches what Fit does. Otherwise, show Fit as a labelled button, not an unlabelled corner
      control.
    - Have graphty-element draw the group colors as one batch for the preview, or keep the key
      marked "Computing" until the repaint has settled, so the key never states a picture that is
      not yet drawn.

### 7. Minor: the outline column widens in the middle of an edit

- **Evidence:** `o1/22.png` to `o1/24.png`. When the Links tag appears, the outline grows from
  240 to 280 px. The preview, its key, Fit and the strip all move 40 px to the right.
- **Cause:** `selection.css:205` sets `fit-content(280px)`, so the column follows its longest row
  at every edit.
- **Fix:** set the outline's width when the workspace opens: the longest row or the covered panel,
  capped at 280 px. Keep that width until the workspace closes.

### 8. Minor: the workspace header draws six controls in five styles

- **Evidence:** `o3/18-header.png`:
    - "Group colors | Styled" is a segment with smaller type than the other buttons;
    - Table is a light-green toggle;
    - Clear is a text button;
    - Cancel is outlined;
    - Done is filled green.

    The title row's "..." repeats two of them, as "Hide table" and "Hide group colors"
    (`o1/14-pane.png`).

- **Fix:** use one subtle style for Table, Clear and Cancel, keep Done filled, and draw the
  segment at the 11/16 type of the other controls. Drop "Hide table" and "Hide group colors" from
  the "..." menu, since the header holds both.

### 9. Minor: a "+" with a third meaning sits two rows above "Filters +"

- **Evidence:** `o2/01.png`. On the Data place, a "+" is drawn at the end of the node count row
  ("77") and the edge count row ("254"); they are named "Add to node attributes" and "Add to edge
  attributes". These rows are not section headers, and their "+" adds something else again. This
  is the owner's "+" point, one panel over from the editor.
- **Fix:** move the attribute "+" into the Attributes section header, or into the row's "...".

### 10. Minor: the open filter card's name is cut where the collapsed card's is not

- **Evidence:** `o2/08.png`:
    - the collapsed card reads "Degree min 10 22 of 77" in full;
    - the open card reads "Degree ma... 33 of 77 Edit".

    The part that tells the two cards apart is the part that is cut.

- **Fix:** draw the open card's Edit only on hover and focus, or move it under the name, so the
  name keeps the row's width.

### 11. Minor: "Condition..." is drawn as a row under "All nodes", and there are two empty states

- **Evidence:**
    - `o1/01.png` (the sidebar at rest) and `o1/02.png`: a fresh layer shows "All nodes" and then a
      "Condition..." row, while the pane also has a "Condition..." button. Spec 3.1 draws the
      Condition row "only on an empty selection, where it is the only row".
    - A new layer starts as "77 of 77, All nodes", but Clear leaves "0 of 77" with no rows
      (`o1/18.png`). Starting over is not the same as starting.
- **Fix:**
    - Drop the Condition row when the group has an "All nodes" row.
    - Make Clear return a style layer to the state a new layer starts in, or start new layers
      empty. Pick one and write it in spec 3.0.

### 12. Minor: reference search rows do not show why they matched

- **Evidence:** `o3/12-13.png`. On 50,000 nodes, typing "12" lists 12 first (fixed). The rows after
  it are 33266, 26638, 39771, 29515, 8811, 4039 and 4630, and none of them shows a "12".
- **Fix:** when the match is not in the shown label, add the matching value in dimmed text (for
  example "community 12"). Otherwise, match only on the label that the row shows.

### 13. Minor: the properties column has no right gutter on a filter card

- **Evidence:**
    - `o2/04.png`: the fields end at x 1432 and the slider's right thumb touches the window edge at 1440.
    - `o1/23.png`: the Links value list runs 8 px past the workspace into the inspector. Check 37
      says no list extends past the workspace.
- **Fix:** keep 8 px of padding at the column's right in every host, and keep popovers inside the
  workspace.

### 14. Minor: words a reader will guess at

- **Evidence:**
    - "Live", the heading of Pick on canvas, Hovered or selected and Selected (`o3/12-13.png`).
    - "Include not measured", on Degree, where every node is measured (`o1/21.png`).
    - "Links where ..." followed by a field reading "Edge value..." (`o1/22.png`). Two words for
      one thing.
    - "Type the text to match", a sentence used as a placeholder (`o1/07.png`).
- **Fix:**
    - Drop the "Live" heading; its rows read on their own.
    - Show "Include not measured" only when the value has unmeasured nodes.
    - Name the field "Link value...".
    - Change the placeholder to "Text".

### 15. Minor: the group pane lacks Color and Save as set

- **Evidence:** `o1/11-pane.png` and `o1/12-pane.png`. The group pane holds the name, the count and
  Advanced. Its "..." menu holds Rename, Turn off, Duplicate, Move up, Move down and Delete. Spec
  3.2 also lists Color in the pane and "Save as set" in the menu.
- **Fix:** add both as spec 3.2 lists them.

### 16. Minor: pointing at a sidebar row at rest marks nothing

- **Evidence:** spec 3.0 says "pointing at a row marks its members on the canvas".
  `decided.md` records this as not built.
- **Fix:** build it, since the outline at rest is now the reader's main view of a rule. Otherwise,
  take the sentence out of spec 3.0.

### 17. Minor: editing Which nodes changes the layer's description

- **Evidence:**
    - `o1/02.png` to `o1/04.png`: once Degree is picked, the inspector's subtitle changes from
      "Node and edge layer" to "Node layer", and "Edge" gains "not styled".
    - The same change happens on 50,000 nodes (`o3/10.png` to `o3/11.png`).
    - The reader edited only which nodes the layer paints. The cause was not traced.
- **Fix:** find what writes the edge side when a node selection changes. Leave the layer's edge
  side untouched.

## What holds

- **The sidebar at rest:** one line per row, hollow chits, "or" before B, and only Edit as a
  control (`o1/09.png`).
- **Rows stay still:** selecting or hovering a row adds no row.
- **Escape:** closes the menu, then returns focus to the outline, then closes as Done (`o1/15-16.png`).
- **Clear and Cancel:** Clear empties the selection, and Cancel restores 22 of 77 (`o1/18.png`,
  `o1/19.png`).
- **The camera:** it is unchanged on open and on close (node positions match in `o1/01.png` and
  `o1/02.png`).
- **The exact id:** typing "12" on 50,000 nodes lists node 12 first.
- **While:** the row reads "While ... has nodes", then "While 12 has nodes", never cut.
- **Collapsed filter card:** 11/16 type, with the full name.
- **No effect word:** no filter card shows "Select", "Filter to" or "Filter out".
- **Links:** Links where scopes Degree: the histogram's range becomes 0 to 22 and the count drops
  to 10 (`o1/25.png`).
