# Tier 5 repolish round 1: the owner's lens

The selection editor is the outline-and-pane editor that says which nodes a style layer paints
("Which nodes") or what a Data-place filter card keeps. This review judges the build of
`7acb6c4c075c` (graphty/dist rebuilt from HEAD) against every point of the owner's feedback of
2026-11-01 (`owner-feedback-2026-11-01.md`). It was driven with real input through `real.mjs` at
1440 x 900. Screenshots are in the main checkout's `tmp/design-studio/tier5/repolish-1/owner/`:

- `s1`: a style layer on Les Miserables. Keep Degree min 10, then Or, name contains Val.
- `s2`: two filter cards on Les Miserables.
- `s3`: a style layer on a generated LFR graph of 50,000 nodes and 60,493 edges. Steps: While,
  then Except Louvain: Community.

Every finding below was seen on screen or read in the code.

## Verdict per owner point

| Owner point                         | Verdict                                                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cramped, hard to find what matters  | Better at rest. The outline is set in 9 px caption type, smaller and greyer than every control around it, so the recipe is the faintest thing in the panel (finding 2).                                       |
| Disorganized: buttons, gaps, breaks | Calm at rest, but rows appear when you point at the editor. Pointing at a group inserts two rows and pushes everything below it down 32 to 64 px, so the next click lands on a different control (finding 1). |
| Progressive disclosure              | Advanced is collapsed, and "Select N" is in "...". But both segments the editor needs, Start with and Computed on, have no visible label (finding 4).                                                         |
| "Select", "Filter to", "Filter out" | Fixed on the cards: none of the three words appears, and "Select 22" is the first item of the card's "..." menu (`s2/08-crop.png`).                                                                           |
| The two "+"                         | "+" is fixed: it appears only in section headers. The confusion has moved to "Add", which now means three things within 70 px (finding 3).                                                                    |
| Large graphs                        | The lists are bounded: no node row before typing, 8 after, and a checklist of 8 rows with "8 of 4,682". But node search matches hidden columns, and there is no way to pick a node on the canvas (finding 7). |
| Would he walk away?                 | Probably still at the first hover. The rows jump, the same verbs appear twice, segments have no labels, and there is no visible way out of the preview (findings 1, 3, 4, 8).                                 |

## Findings, most severe first

### 1. Blocker: pointing at the editor inserts rows and moves everything under the pointer

- **Evidence:** `s1/rest-hover.png` shows `s1/17.png` at rest, `18.png` pointing at A and `19.png`
  pointing at B. When the pointer is on A, "Add... Keep... Except..." and "Or..." appear. B
  moves down 32 px and Shape moves down 64 px. Moving to where B was drawn (y 334) lands on
  "Keep...", whose tooltip "Keep a step (Intersect)" opens.
- **The reverse also happens:** opening the filter card's own "..." menu removes the Add row. The
  pane moves up 32 px under the open menu (`s2/07.png` against `s2/08.png`).
- **Cause:** `graphty/src/workspace/selection/SelectionEditor.tsx:549-551`. `lit` includes
  `hovered` and `focused`, so `showAdd` changes with the pointer. `showOr` (line 551) changes
  with `inside`.
- **Why it is a blocker:** this is exactly the owner's "why the buttons are where they are, row
  breaks", and spec section 3 promises "rows never move".
- **Fix:** never add or remove a row on hover or focus. Draw the Add row and "Or..." only for the
  selected row's group, and only while a row is selected (the pane is open, so the editor has
  already grown). Pointing changes only the background and the eye. Add a check: the
  bounding boxes of every outline row and of the Shape header are equal before and after hovering
  each row.

### 2. Major: the outline, the thing that matters, is the smallest and faintest text in the panel

- **Evidence:** `s1/08-crop.png` and `s1/03-crop.png`. "Which nodes", "Keep", "Degree" and
  "min 10" are drawn in 9 px type. "Style nodes", the pane's selects and the menu items are 11 px.
  The verb and the test are dimmed. A selected row is grey text on lime ("Keep Degree No test"),
  the lowest-contrast line on screen.
- **Cause:** `SelectionEditor.tsx:669, 679, 759, 764, 838-853, 1148` use `<Text size="xs">`, which
  compact-mantine sets at 9/14 (`compact-mantine/src/theme/components/display.ts:44`). Spec
  section 3 asks for 11/16.
- **Fix:** use `size="sm"` (11/16) for every outline row. Draw the verb and the value in normal
  ink; keep dimmed ink only for state words and "All nodes". Keep normal ink on the selected row.

### 3. Major: "Add" means three different things, stacked within 70 px (the "+" confusion moved, not fixed)

- **Evidence:** `s1/08-crop.png`, top to bottom:
    - "Add" in a row: the step's verb, a union.
    - "Add... Keep... Except...": new-step commands.
    - "Add | Keep | Except": the pane's segment, which changes the selected step's verb.
    - "Keep..." sits right above the "Keep" segment, and "Except..." above "Except".
    - In `s2/07-crop.png`, "Add..." is offered on a filter card whose group starts with All nodes,
      and the segment offers "Add" on its first step (`s1/03.png`). On a group that already holds
      everything, Add changes nothing.
- **The owner's question returns in a new form:** "are they the same thing in two places or do
  they have different meanings?" They have different meanings.
- **Fix:** put each verb on screen once per state.
    - Replace the three new-step words with one trailing row, "Step...". It adds a step with the
      group's default verb (Keep on an All group, Add on a None group), opens the value picker, and
      the pane's segment is the only place to change the verb.
    - Leave out of the segment any verb that cannot change the group: no Add on the first step of
      an All group.

### 4. Major: the two segments the reader has to understand carry no visible label

- **Evidence:**
    - `s2/07-crop.png`: the filter card's title pane shows "No nodes | All nodes" with no caption.
      It reads as "show no nodes or all nodes", not "start with".
    - `s3/19-crop.png`: Advanced opens to "Filtered graph | So far" with no caption.
- **Cause:** the code passes `label="Start with"` (`SelectionEditor.tsx:1176`) and
  `label="Computed on"` (`StepPane.tsx:520`). compact-mantine's `SegmentedControl` uses `label`
  only as the accessible name, or as a caption inside a `FieldRow`
  (`compact-mantine/src/components/SegmentedControl.tsx:4-40`). Neither segment is in a
  `FieldRow`, so neither caption is drawn.
- **Fix:** wrap both segments in compact-mantine's `FieldRow`, so the panel's usual caption
  ("Start with", "Computed on") is drawn. This needs no compact-mantine change.

### 5. Major: filter cards are named only after their value, so cards cannot be told apart, and an empty combination goes unexplained

- **Evidence:** `s2/14.png` shows two collapsed cards that both read "Degree", one "22 of 77" and
  one "33 of 77".
    - Neither card says what it keeps (min 10, and max 3).
    - Together they leave nothing: the canvas is empty and the app bar reads "0 of 77 nodes".
    - In the Filters list, each card still shows its own count and nothing says the cards together
      pass none.
    - The open card repeats itself: "Degree" in the title, then "Keep Degree min 10" (`s2/06.png`).
- **Fix:**
    - Name a new card by its first step's row summary ("Degree min 10"), and follow later edits
      until the reader renames the card.
    - Show the combined count, "0 of 77", on the Filters section header in neutral ink, and mark
      "Passes none" on the header when it is 0.

### 6. Major: "While" is not understood as a value name

- **Evidence:** `s3/ref.png`. The row reads "Keep While No reference", and the pane's value field
  says only "While". Nothing on screen says "has nodes". The owner already named this condition
  as one he could not follow.
- **Fix:** the value is called "While ... has nodes" in the picker, the value field and the row,
  until a reference is chosen. After that the row reads "While | Watchlist has nodes", as spec 3.1
  says.

### 7. Major: on a large graph you cannot reliably find the node you mean

- **Evidence:** `s3/ref.png`, right panel. Typing "1" lists 3445, 3981, 5333, 6055 and 9029
  first, none of which contains a 1, under "Nodes 8 of 34,088". Node 1 itself is not listed. The
  reader cannot tell why these nodes match.
- **Cause:** `graphty/src/workspace/selection/references.ts:36-46` calls `nodePage` with
  `matching: { text }`, which searches every column (here, community). Its "starts-with" pass
  therefore ranks other columns' prefixes above the node's own name.
- **No canvas pick:** there is no "Pick on canvas" item and no target button beside the
  reference field, although spec 4.2 and 4.3 call for both. A grep of `selection/*.tsx` finds no
  armed target. At 50,000 nodes, clicking the node is the only practical way to name it.
- **Fix:**
    - Match references on the node's id and name only. If `nodePage` cannot limit the columns it
      searches, add that as an option in graphty-element (additive, `@beta`); do not filter in the
      app.
    - Put "Pick on canvas" first in the list, and add the 24 px target button beside the field.

### 8. Major: no visible way out of the preview

- **Evidence:** `s1/02.png` to `s1/11.png`. While a row is selected:
    - every style layer is suspended and the canvas shows group colors;
    - the key reads "Preview: Which nodes";
    - no Done button is drawn anywhere;
    - it took three presses of Escape to get the styling back (`s1/09-11.png`).
      A reader who does not know Escape sees their styles gone.
- **Cause:** `grep '"Done"' graphty/src/workspace/selection/*.tsx` finds nothing, although spec
  section 9 lists Done as a way to end picking.
- **Fix:** put a "Done" text button in the pane's first row, beside "...". It ends picking in one
  click, as Escape does.

### 9. Minor: the verb segment shows two framed segments

- **Evidence:** `s3/18-crop.png`. "Except" is the chosen verb, but "Add" carries the green focus
  frame, so two segments look selected. The "Except" label also touches its own frame, then "50,000"
  follows with no gap.
- **Fix:** after the value picker commits, move focus to the test's first control (here, the
  checklist's search box), never onto the segment.

### 10. Minor: the number test has no histogram

- **Evidence:** `s1/03-crop.png` shows a "Between" select (its other option is "Highest") above a
  bare slider. The reader cannot see where the values lie while choosing "min 10"; the
  distribution is only on the Values tab.
- **Cause:** `graphty/src/workspace/style/WhichPicker.tsx:2271-2277`. Spec section 5 asks for a
  HistogramRow brush and the By value / By position segment.
- **Fix:** use compact-mantine's HistogramRow with `brush` over the two boxes, read from the
  element's binned facts.

### 11. Minor: the same count is shown twice, and one count has no label

- **Evidence:**
    - `s2/07-crop.png`: "22 of 77" on the title row, and again as the first thing in the title
      pane.
    - `s1/03-crop.png`: the step pane's "77" sits after the segment with no word.
- **Fix:** drop the count from the title pane, since the row above already shows it. Keep the
  step's running count only in its tooltip, or write it as "77 so far".

### 12. Minor: counts are formatted two ways

- **Evidence:** `s3/18.png`. The layer list reads "50000" and "Everything 50000"; the editor reads
  "50,000 of 50,000".
- **Fix:** format the layer tree's counts with `formatNumber`.

### 13. Minor: selecting a row pushes the layer's own controls off screen

- **Evidence:** `s3/18.png`. With a checklist step selected, Fill is at y 868 and Shaders below the
  window. A reader who built the selection in order to color it has to scroll to find Fill.
- **Fix:** with the pane at 32 px rows (finding 2) and no Add row (finding 3), the pane gets
  shorter. Also cap the checklist at 8 rows inside a fixed-height list.

### 14. Minor: the value picker runs past the panel and cuts entries

- **Evidence:** `s3/11.png`. The popover reaches x 1434 and "Label propagation: Community size" is
  cut at its right edge.
- **Fix:** keep the dropdown within the panel's width, and cut an entry at its tail with the full
  name in its tooltip.

### 15. Minor: Advanced lacks the algorithm's Settings

- **Evidence:** `s3/19-crop.png`. Advanced for a Louvain step shows only the scope segment. Spec
  3.2 puts the algorithm's Settings there.
- **Fix:** add Analyze's options form for the step's algorithm under Advanced.

### 16. Minor: smaller oddities

- The card's "..." menu reads "Delete" twice: the item, then the key also named Delete
  (`s2/08-crop.png`). Show the key as "Del" or as a key glyph.
- After pressing Escape three times on a new card, its name opened as a rename box
  (`s2/13.png`). Escape should never start a rename.
- Louvain's values read "Group 1" to "Group 8" (`s3/18.png`), while the editor's alternatives
  are also groups (A, B). This is app-wide wording (`style/words.ts:742`), but it collides here.
  Consider "Community 1" when the field is a community.

## What holds

- The rest state is calm: one line per row, no box, button or icon, and the title and its count
  come first (`s1/17.png`).
- No filter card shows "Select", "Filter to" or "Filter out"; "Select 22" is a menu command.
- Every "+" sits in a section header.
- The reference picker lists no node before typing and 8 after. The 50,000-node checklist draws 8
  rows with "8 of 4,682" and a search box (`s3/18.png`).
- The counts are right on Les Miserables: Degree min 10 keeps 22 of 77 (`s1/04.png`).
