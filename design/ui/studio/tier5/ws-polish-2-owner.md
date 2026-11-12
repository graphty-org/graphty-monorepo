# Selection workspace polish round 2: the owner's lens

The selection workspace is the non-modal editor that opens over the canvas column when the reader
presses Edit on a style layer's "Which nodes" or on a Data filter card. At rest, the sidebar shows a
read-only outline of the rule. This review judges the build of `64cb33f3a6` against:

- every point of the owner's feedback of 2026-11-01 (`owner-feedback-2026-11-01.md`): calm, organized,
  progressive disclosure, words, the "+" signs, large graphs, and whether he would want to walk away;
- the six fixes from the placement study (`placement-study.md`);
- the findings of the previous owner-lens review (`ws-polish-1-owner.md`), to see which held.

`graphty/dist` was rebuilt from HEAD and copied before the review, so no other rebuild could change
it mid-session. The app was driven with real input through `real.mjs` at 1440 x 900. Screenshots are
in the main checkout's `tmp/design-studio/tier5/ws-polish-2/owner/`:

- `o1`: Les Miserables, a new style layer: Edit, Degree min 10, Or..., name contains Val, select
  group B, its "..." menu, Done, reopen, Clear, Cancel, then Advanced > Links where shared_chapters
  min 2, Escape three times.
- `o2`: Les Miserables, Data: two filter cards, Degree min 10 and Degree max 3.
- `o3`: an LFR graph of 50,000 nodes: a new layer, While 12 has nodes, then community.
- `o4`: a 50,000-node GraphML file with a Random layout: a new layer, team, then staff Yes.

Every finding below was seen on screen.

## Verdict per owner point

| Owner point                         | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cramped, hard to find what matters  | Better inside the workspace: the title row, the step pane and the strip no longer repeat the count. But the whole rule is drawn twice on one screen, once in the workspace and once, live and with counts, in the inspector beside it (finding 2).                                                                                                                                                                             |
| Disorganized: buttons, gaps, breaks | A new rule now opens on its step with the picker open: good. Reopening an existing rule still lands on a 320 x 790 px column holding only "Or..." (finding 5). The value picker opens upward over the header and hides Done (finding 7).                                                                                                                                                                                       |
| Progressive disclosure              | Holds. Advanced is collapsed, shows only what applies (no "Include not measured" on Degree) and names a non-default setting on its right ("Links: shared_chapters min 2", `o1/19.png`).                                                                                                                                                                                                                                        |
| "Select", "Filter to", "Filter out" | Renamed, not answered. Every step now leads with "Add / Keep / Except", the same three set operations under new names, in three different forms depending on where the step sits (finding 3).                                                                                                                                                                                                                                  |
| The two "+"                         | No "+" inside the workspace. The Data place still draws four "+" in one column with three meanings (finding 14).                                                                                                                                                                                                                                                                                                               |
| Large graphs                        | Lists are bounded and the reference search now shows why a row matched ("33266 community 12", `o3/11.png`). But the preview still hides a third to more than half of a large graph behind the workspace's own columns, and nothing brings it into view (finding 1).                                                                                                                                                            |
| Six study fixes                     | Links in a step: built, and the tag no longer eats the condition (`o1/19.png`), but it says "links" where the owner's rule is "edges" (finding 4). Clear: returns to the new-layer state, Cancel restores (`o1/13.png`, `o1/14.png`). Escape: closes Advanced, then the pane, then the workspace. Words: tooltips only; "While ... has nodes" still splits apart (finding 10). Still checklist: not testable here (see below). |
| Would he walk away?                 | Less likely than on 2026-11-01, but yes on a large graph: he opens the editor and loses half his graph. On a small one he would stop at "Add / Keep / Except" and ask the same question he asked about "Select" and "Filter to".                                                                                                                                                                                               |

## Findings, most severe first

### 1. Blocker: the preview hides much of the graph, and nothing brings it back

- **Evidence:**
    - `o3/06.png` to `o3/07.png`: the LFR graph spans x 455 to 1030 before Edit. In the workspace,
      the preview is x 297 to 880 and y 80 to 637. The graph's right half lies under the
      properties column. While the layout keeps running it drifts further right (`o3/09.png` to
      `o3/13.png`), until most of it is hidden.
    - `o4/14.png`: the 50,000-node GraphML file spans x 360 to 1130 and y 75 to 840. Its right
      third lies under the properties column and its bottom quarter under the table strip.
    - `o1/05.png`: even on Les Miserables, about 14 of 77 nodes lie under the properties column
      (the right cluster) or under the strip (the bottom fan).
    - The only remedy on screen is the small Fit button at the preview's top right.
- **Why it matters:** this was the previous round's finding 6 and it is unchanged. The preview is
  the reason the workspace exists. A reader who opens the editor on a large graph sees half of it,
  and the counts in the key describe nodes he cannot see.
- **Fix:** while the workspace is open, give graphty-element's canvas the preview cell's size
  (lay the outline and properties columns beside the canvas, not over it). The canvas is then the
  frame, as the owner's rule asks, and a fit inside it is a fit of what the reader sees. On open,
  fit once when more than a quarter of the drawn bounds fall outside the preview, and restore the
  camera on close. If the panel's "the graph is never re-framed" must hold, at least start the
  preview with the whole graph inside the cell by sizing the canvas to it.

### 2. Major: the rule is drawn twice, side by side, with its counts

- **Evidence:** `o1/08.png`. The workspace outline shows "A 22, Degree min 10, or B 1, name
  contains Val". Five hundred pixels to the right, the inspector's "Which nodes" block shows the
  same four rows with the same counts, plus "22 of 77". `o2/07.png`: the Data sidebar shows both
  cards with their counts and "Passes none" while the workspace shows the card being edited.
- **Why it matters:** spec section 3.0 makes the header "the one place the result count is drawn
  while the workspace is open". The visible sidebar breaks that, and it is the owner's first
  point: the same information in two places, and the eye has to decide which one to read.
- **Fix:** while the workspace is open, the sidebar's selection block collapses to its title row,
  "Which nodes", marked as being edited, with no outline and no count. A filter card being edited
  does the same; the other cards keep their rows but drop their counts.

### 3. Major: "Add / Keep / Except" is "Select / Filter to / Filter out" under new names

- **Evidence:**
    - `o1/04.png`: the first step of group A shows a segment "Keep | Except".
    - `o1/07.png`: the first step of group B shows no segment, only the word "Add".
    - `o3/13.png`: the second step shows "Add | Keep | Except".
    - `o3/13.png` (sidebar): at rest the step reads "Keep community". The first step has no verb.
- **Why it matters:** the owner did not understand three set operations at the front of a
  filter. The build answers with three other words for the same three operations, drawn three
  different ways depending on the step's position. He will ask the same question.
- **Fix:** narrowing is what nearly every step does, and "Or..." already widens. So:
    - draw no verb for a narrowing step anywhere: Keep is the default and has no word;
    - replace the segment with one "Except" switch (a compact checkbox in the pane, the word
      "Except" before the condition in the row);
    - move Add into the step's "..." menu, since "Or..." covers the common case.

    This is a spec change (sections 3.1, 3.2 and 5).

### 4. Major: the editor says "links" where the owner's rule is "edges"

- **Evidence:** `o1/16.png` to `o1/19.png`. Advanced shows "Links", "All links", "Links where
  ...", and a field "Link value...". The field's picker says "Find edge attributes", and the same
  inspector says "Edge not styled" and "Edit edges". Rows carry the tag "Links".
- **Why it matters:** the owner ruled on 2026-10-20 that the app says "edges", not "links". Two
  words for one thing on one screen is the confusion he flagged with the two "+".
- **Fix:** "Edges", "All edges", "Edges where ...", "Edge value...", the tag "Edges", and the
  Advanced summary "Edges: shared_chapters min 2". Keep "links" only as a search alias.

### 5. Major: reopening a rule lands on an empty column

- **Evidence:** `o1/12.png`. Edit on a layer that has two groups selects the title row. The
  properties column, 320 x 790 px, holds "Or..." and "..." and nothing else. The fix of the
  previous round covers only a rule with no step.
- **Why it matters:** this is the owner's "why are there empty spaces". It is the screen he sees
  every time he comes back to change a rule.
- **Fix:** open on the pane of the step the reader last edited, or on the first step when there
  is no memory of it. Select the title row only for a rule with no group.

### 6. Minor: the sidebar's Edit covers the count it sits on

- **Evidence:** `o4/15.png` reads "5,016 of 5 Edit". `o1/22.png` reads "1( Edit": the 0 of "10" is
  cut. `o2/09.png` reads "33 Edit" on a filter card, with the 3 cut. Crops:
  `crop-o1-22.png`, `crop-o2-09.png`.
- **Fix:** on hover or focus, replace the whole count with Edit, or draw Edit after the count and
  shorten the count to the number alone ("5,016"). Never draw one over the other.

### 7. Minor: the value picker opens upward over the header

- **Evidence:** `o1/03.png` and `o3/08.png`: the picker for the step's value covers y 42 to 142,
  hiding Styled, Table, Clear, Cancel and Done, and the field itself. The Link value picker opens
  below its field (`o1/17.png`).
- **Fix:** open every picker in the properties column below its field.

### 8. Minor: a new step shows "All nodes" above itself

- **Evidence:** `o1/02.png` and `o2/02.png`: the outline shows "All nodes" and then "Keep
  Value...". The two rows say opposite things about the same group.
- **Fix:** hide the All nodes row while a step is being added to it.

### 9. Minor: a yes-or-no value has a blank field, and the row changes its case

- **Evidence:** `o4/11.png`: after picking staff, the second field is an empty dropdown with no
  placeholder. `o4/14.png`: after picking Yes, the field and the table say "Yes", the outline and
  the sidebar say "staff yes".
- **Fix:** give the field the placeholder "Value..." as every other field has, and write the value
  in the row as the data writes it.

### 10. Minor: "While ... has nodes" falls apart in the pane and is cut in the sidebar

- **Evidence:** `o3/12.png`: once a reference is picked, the pane's two fields read "While" and
  "12". "has nodes" is gone, so the pane no longer says what the step does. `o3/09.png`: the
  sidebar row reads "While ... has nodes No ...", cut mid-word.
- **Fix:** keep "While ... has nodes" as the value field's text. In the sidebar row, let the state
  word give way whole, never cut to "No ...".

### 11. Minor: the key draws "No match 0"

- **Evidence:** `o1/02.png`, `o1/13.png`, `o3/07.png`: with every node matching, the key still
  has a "No match 0" row.
- **Fix:** draw the No match row only when it holds a node.

### 12. Minor: "Drawing" stays while the layout runs

- **Evidence:** `o3/07.png` to `o3/13.png`: on the LFR graph the key says "Drawing" for more than
  a minute, because the layout is still moving the nodes. The colors were already drawn.
- **Fix:** have graphty-element report when the group colors have been applied, separately from
  the frame being still, and clear "Drawing" on that.

### 13. Minor: two segments and a slider that do not line up

- **Evidence:** `o1/16.png`: "Keep | Except" spans the column, "All links | Links where ..."
  spans half of it, with an ellipsis inside a segment. `o2/04.png`, `o1/19.png`: each slider's
  thumbs overhang the fields under it by 8 px on both sides.
- **Fix:** every segment in the pane at the column's full width. Inset the slider's track so its
  thumbs line up with the fields' edges.

### 14. Minor: four "+" in the Data column, with three meanings

- **Evidence:** `o2/01.png`: "+" on Data sources, on the node count row "77", on the edge count
  row "254", and on Filters. `decided.md` records keeping the count rows' "+". It is still the
  owner's "+" point, one panel over from the editor.
- **Fix:** move the attribute "+" into the row's "..." menu, or into an Attributes section header.
  Record the choice in `owner-decisions.md` for his review.

### 15. Minor: editing "Which nodes" changes the layer's kind

- **Evidence:** `o1/01.png` to `o1/04.png`: the layer's subtitle goes from "Node and edge layer"
  to "Node layer", its icon changes, and "Edges: nothing set" becomes "Edges: not styled". The
  reader changed only which nodes the layer paints.
- **Note:** `decided.md` records this as a kept decision (a half with a condition counts as
  built). From the owner's seat it reads as the layer changing identity on its own. Put it in
  `owner-decisions.md` as a question for him, rather than leaving it decided silently.

## What holds

- **The Links tag:** a bare dimmed word after the condition; "min 10" is never cut
  (`o1/19.png`, `o1/22.png`).
- **A second filter card's preview:** its 33 matches are drawn over the full graph (`o2/07.png`).
- **A covered group:** the key says "B 1, under A"; selecting B draws Valjean orange and dims A
  (`o1/08.png`, `o1/09.png`).
- **A new rule:** opens on its step with the value picker open (`o1/02.png`, `o2/02.png`).
- **Clear and Cancel:** Clear returns to All nodes, 77 of 77; Cancel restores 22 of 77.
- **One count per place inside the workspace:** no count on the title row; "so far" only where it
  differs ("1 so far" on B, `o1/08.png`); the Group column only with two groups; the Filters total
  only with two cards.
- **The group pane:** name, Color, count, Advanced; its menu has Save as set (`o1/10.png`).
- **The reference search:** node 12 first, then rows that show their matching value.
- **Advanced:** collapsed, offers only what applies, names a set value on its right.
- **The outline column:** keeps its width while Links is added (`o1/18.png`, `o1/19.png`).
- **The still checklist:** not tested. Neither sample nor the 50,000-node file has a node value
  with between three and a few hundred categories; team (2,000 values) opens as text and staff as
  a yes-or-no field. A check needs a file with such a value.
