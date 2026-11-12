# Tier 5 repolish round 2: the owner's lens

The selection editor is the outline-and-pane editor that says which nodes a style layer paints
("Which nodes") or what a Data-place filter card keeps. This review judges the build of
`1b8c1045bc84` (graphty/dist rebuilt from HEAD) against every point of the owner's feedback of
2026-11-01 (`owner-feedback-2026-11-01.md`). It was driven with real input through `real.mjs` at
1440 x 900. Screenshots are in the main checkout's `tmp/design-studio/tier5/repolish-2/owner/`:

- `s1`: a style layer on Les Miserables. Step..., Degree min 10, then Or..., name contains Val.
- `s2`: two filter cards on Les Miserables, Degree min 10 and Degree max 3.
- `s3`: a style layer on a generated LFR graph of 50,000 nodes. Steps: While ... has nodes, then
  Louvain: Community.

Every finding below was seen on screen or read in the code.

## Verdict per owner point

| Owner point                         | Verdict                                                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cramped, hard to find what matters  | Better: 11/16 type and one line per row. But the simplest card says its one condition three times, and a collapsed card is back at 9 px with its name cut (findings 4, 5).                                                 |
| Disorganized: buttons, gaps, breaks | Hover is fixed. Clicking is not: selecting a row inserts or removes "Step..." and "Or...", so the rows below jump 32 px on each click (finding 1). The filter card's title pane starts its buttons 130 px in (finding 12). |
| Progressive disclosure              | Advanced is collapsed and holds the algorithm's settings. But Start with, an expert setting that can empty a card in one click, is a primary control on every title and group pane (finding 3).                            |
| "Select", "Filter to", "Filter out" | "Filter to" and "Filter out" are gone. "Select" is still the first word of a style layer's title pane, and the editor now speaks a new vocabulary of 15 terms (finding 2).                                                 |
| The two "+"                         | Fixed: no "+" inside a card or the editor. Every "+" sits in a section header and adds to that section.                                                                                                                    |
| Large graphs                        | Lists are bounded, and Pick on canvas is first. But typing a node's exact id does not find it on 50,000 nodes, and the While row reads "While ... ..." (findings 6, 7).                                                    |
| Would he walk away?                 | Likely still. At rest a two-group layer reads "A / All nodes / Keep Degree min 10 / B / Add name contains Val". That is a program listing, not a description of which nodes are painted (findings 2, 4, 13).               |

## Findings, most severe first

### 1. Major: clicking a row moves every row below it

- **Evidence:** `s1/panes.png` shows `s1/11.png` (title selected), `12.png` (group A selected), `13.png`
  and `14.png` (A's step selected).
    - With the title selected, B is at y 334 and "Or..." follows B.
    - With A selected, "Step..." is inserted under A's step, so B moves down to y 366.
    - A click aimed at B where it was drawn lands on "Step..." instead.
- **Cause:** `graphty/src/workspace/selection/SelectionEditor.tsx:633-636`. `lit` follows the selected
  row, and `showAdd` and `showOr` insert rows inside the outline for that row's group. Repolish 1
  stopped hover from moving rows. Selection still moves them.
- **Why it matters:** this is the owner's "row breaks" point. The outline changes shape every time
  the reader clicks into it.
- **Fix:** take both commands out of the outline. Put "Step..." and "Or..." in the pane's first row,
  next to "..." and Done, where they act on the selected row's group. The outline then holds only
  recipe rows, and selecting changes only the highlight. On an empty selection, keep the single
  "Step..." row it has today.

### 2. Major: the editor's words are still not the reader's words

- **"Select" is still there.** `s1/18.png` at (1250, 435): the style layer's title pane starts with a
  bare "Select" text button, the word the owner said he did not understand. Its meaning ("Select 22
  of 77 nodes") is only in the tooltip (`SelectionEditor.tsx:1404`). The filter card moved the same
  command into "..." as "Select N".
- **A new vocabulary.** One layer shows all of these within 400 px: Step..., Or..., Start with,
  No nodes / All nodes, Add / Keep / Except, Done, By value / By position, Computed on, Filtered
  graph / So far, No test, No reference, Passes none, While ... has nodes, and Include not measured
  (`s1/03-crop.png`, `s1/panes.png`, `s2/17-crop.png`, `s3/17-crop.png`). The tooltips add Figma's
  terms: "Add a step (Union)".
- **"Step" is an implementation noun.** The only way to add a condition is a row that reads
  "Step..." (`s1/01.png`).
- **Fix:**
    - Treat "Select" as the filter card does: "Select 22" goes into the title pane's "...". The title
      pane keeps Preview, Table and Done.
    - Rename "Step..." to "Condition...", the noun the spec already uses for what it adds.
    - Hide Start with (finding 3) and drop the redundant verbs (finding 4). That removes four terms
      from the default view.
    - Before the study, run a word test on the terms that remain: Keep, Except, Or..., So far and No
      test.

### 3. Major: Start with is a primary control, and one click empties a card

- **Evidence:** `s2/16-crop.png` to `s2/17-crop.png`. Selecting a filter card's title shows "Start
  with: No nodes | All nodes" as the pane's only setting. One click on "No nodes" changes the card
  from "33 of 77" to "0 of 77":
    - its step reads "Keep Degree m... Passes none";
    - the Filters header reads "Passes none";
    - the canvas is empty;
    - nothing says why.
      The group pane draws the same segment (`s1/panes.png`, second strip).
- **Cause:** `SelectionEditor.tsx:1422` (title pane) and `:1569` (group pane) draw `StartWith`
  outside any disclosure.
- **Fix:** move Start with into a collapsed Advanced on the group pane, and leave it off the title
  pane. A reader who wants "start from nothing" gets it from the step's verb: Add on a None group is
  what "Or..." already makes. When Start with changes a group to pass none, keep the change but
  show it on the group row, not only on the step.

### 4. Major: the simplest card says its one condition three times

- **Evidence:**
    - `s2/cards.png`, right strip: the "Degree max 3" card at rest reads "Degree max 3 / All nodes /
      Keep Degree max 3". That is three lines, and the condition appears twice.
    - While editing (`s2/08.png`), the same card shows it a third time in the pane (Degree, 10 to 36)
      and a fourth in the canvas key ("Preview: Degree min 10").
    - On a layer (`s1/04.png`), "All nodes" then "Keep Degree min 10" takes two rows to say "Degree
      min 10".
    - "All nodes" and the first step's verb carry no information. A group that starts with All and
      whose first step is Keep is just that step's condition. So is a None group whose first step is
      Add.
- **Fix:**
    - Draw no "All nodes" row unless the group has no step or its first step is Except.
    - Leave the verb column empty on a group's first step when the verb is the group's default.
    - A filter card whose name follows its only step draws no outline at rest: its title row is the
      recipe.

### 5. Major: a collapsed filter card is back at 9 px with its name cut

- **Evidence:** `s2/14.png` and `s2/cards.png`. The collapsed card reads "Degree min..." in 9 px type
  with about 110 px empty to its right. The part that tells cards apart ("min 10" against "max 3")
  is the part cut. Its count "22 of 77" is also 9 px dimmed. The open card's title, directly below,
  is 11 px. Two cards on the same column collapse to the same "Degree min..." or "Degree max...".
- **Cause:** `graphty/src/workspace/data-place/Filters.tsx:558` and `:566` use `size="xs"`, and
  `truncate` cuts the name before the row is full.
- **Fix:** use `size="sm"` for the collapsed card's name and count. Let the name take the row's free
  width, and truncate only once the count would be pushed off the row.

### 6. Major: the While row is unreadable

- **Evidence:** `s3/10-crop.png` and `s3/16-crop.png`. The row reads "Keep While ... ... No
  reference". The pane's field reads "While ... has nodes", but the row (the thing read at rest)
  cuts the condition to "While ...", followed by a second "...". This is the condition the owner
  named.
- **Cause:** the value column truncates before the state word. For a relative step with no
  reference, the words are value "While" plus test "... has nodes" (`words.ts:202-206`). Spec 3.1
  says "the condition never truncates".
- **Fix:** with no reference chosen, write the row as value "While ... has nodes" with no test
  column, and give a relative condition's value column its full width, so the state word wraps
  under it or moves to the tooltip, never the condition.

### 7. Major: on 50,000 nodes, typing a node's id does not find that node

- **Evidence:** `s3/12-crop.png`. Typing "12" in the reference search lists 12084, 12007, 12021,
  12137, 12237, 12301 and 12536 under "Nodes 8 of 2,475". Node 12 itself is not among them. The
  owner's question was exactly this: on a large graph, can you get to the node you mean?
- **Cause:** `graphty/src/workspace/selection/references.ts:40-49`. Both passes sort by degree, and
  an exact match has no priority.
- **Fix:** list an exact id or name match first. If the element cannot look a node up by exact id
  or name, add a `matching.mode: "exact"` to `data.nodePage` in graphty-element (additive,
  `@beta`). Do not filter in the app.

### 8. Major: at rest, nothing says that groups combine with "or"

- **Evidence:** `s1/rest-hover.png`, left strip: "A 22 / All nodes / Keep Degree min 10 / B 1 / Add
  name contains Val". Nothing between A and B says whether B narrows A or adds to it. The title
  says 22, and a reader cannot tell why B's 1 node does not make it 23. (Valjean is in both.)
- **Fix:** write "or" in the verb column of every group row after the first ("or B"). This is the
  same word the reader clicked to make the group, so it is not a sentence.

### 9. Minor: a verb segment with one option

- **Evidence:** `s1/07.png` at (1278, 467). B's first step shows a segment holding only "Add". It
  looks like a button and does nothing.
- **Fix:** when `verbsAt` returns one verb, draw no segment. With finding 4, that verb is unsaid.

### 10. Minor: inert and selected rows draw the value dimmed and cut it

- **Evidence:** `s3/16-crop.png`. "Louvain: Com..." is in dimmed ink and cut, while "No test" keeps
  its full width. Spec 3.1 puts the value in normal ink and dims only the state word.
- **Fix:** keep the value in normal ink in every state. On a selected row, the pane already shows
  the state, so drop the state word there to give the value its width.

### 11. Minor: the checklist is 9 px and says "Group"

- **Evidence:** `s3/16-crop.png`. "Group 1" to "Group 8" are drawn smaller than the pane's other text,
  and "Group" collides with the editor's own groups A and B. This was repolish 1 finding 16 and is
  unchanged.
- **Fix:** use 11/16 rows. When the column is a community, name its values "Community 1"
  (`style/words.ts:742`).

### 12. Minor: the filter card's title pane begins with an empty gap

- **Evidence:** `s2/16-crop.png`. The pane's row is the group-colors icon, Table, "..." and Done,
  starting 130 px from the card's left edge. The palette icon means "Group colors while picking",
  which only the tooltip says.
- **Fix:** left-align the row as the step pane does. Give the colors toggle its word ("Colors") or
  move it into "...".

### 13. Minor: selecting a step still pushes the layer's own controls off screen

- **Evidence:** `s3/16.png`. With a checklist step selected, Fill is at y 868 and Shaders is below
  the window. Unchanged from repolish 1 finding 13.
- **Fix:** findings 1 and 3 shorten the pane. Also, cap the checklist's list box at 8 rows of fixed
  height.

### 14. Minor: two "Degree" ranges side by side

- **Evidence:** `s2/08.png`. The filter's histogram reads Degree 1 to 36, which is on the full graph.
  The Values panel beside it reads Degree 1 to 15, which is on the filtered graph. Same word,
  different numbers, and nothing on screen says which graph each one is from.
- **Fix:** say "Full graph" under the filter's value field, as the base already says in the tooltip.
  Or caption the histogram with its base.

## What holds

- **Hover:** pointing at a row no longer moves anything; only the background and the eye change
  (`s1/rest-hover.png`).
- **Type:** the outline and panes use 11/16 type, and the title row comes first with its count.
- **Done:** a Done button ends picking in one click (`s1/03.png`).
- **Empty results:** "Passes none" shows on the Filters header when the cards together leave nothing
  (`s2/14.png`).
- **"+":** no "+" sits inside a card or the editor.
- **Large graphs:** the reference list shows no node before typing and 8 after, with Pick on canvas
  first (`s3/11.png`). The 4,682-value checklist draws 8 rows with "8 of 4,682".
- **Advanced:** Advanced holds the algorithm's own settings, Resolution and Weight (`s3/17-crop.png`).
