# T75 B pilot (dry run pass 1 re-pilot): the yeast network made readable

Build 797a4f6b47 (`.study-builds/tier5-r1d1-797a4f6b47`), setup `yeast.txt`, 1440 x 900.
Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T75B/
(not in git). Every walk was replayed from the round 1 walk of the same name on build baac78342b and
matched it at every check point (rewalk.json in that folder); every screenshot named below was
looked at again on this build.

Result: **reached**. The success path ends on "24 of 331 nodes, 4 of 361 edges", the answer key's
count, with the graph's own 331 nodes and 361 edges unchanged (nothing deleted).

None of the routes the fixes touched belongs to T75 B (the list names T70 to T79 routes, T75 A only
for its own half), so no touched route was walked for this half.

## 1. Success path, pointer (success/)

Data; Add filter; type "largest"; Enter (249 of 331); Condition...; "degree"; Enter; 2; Enter
(170 of 331, success/10.png); Condition...; "gal80"; Enter; 0.5; Enter (24 of 331,
success/15.png); Done. The card "Largest component" lists its three steps and the top bar reads
"24 of 331 nodes, 4 of 361 edges" (success/16.png). Matches the answer key; no mismatch.

## 2. Detours (the four walked in round 1)

- **detour-1, two cards** (Degree 2 and gal80Rexp 0.5 in one card, Done, then a second card
  Largest component): the Filters header reads 24 of 331, the first card 25 of 331 on its own
  (detour-1/07.png). Correct count.
- **detour-2, steps in the other order** (gal80Rexp, Degree, Largest component): 24 of 331
  (detour-2/05.png, 06.png). Correct; order does not change B's count, as the key says.
- **detour-3, a style layer** (Layer 1 with the three steps, then Everything's Show: Hidden): the
  layer counts 24 and 24 nodes draw, but the edges of the hidden nodes still draw faint
  (detour-3/13.png). This is the key's "Not success" route (the network still holds them); no new
  defect.
- **detour-4, canvas toolbar Filters, then the Graph panel's Largest component**: the toolbar opens
  a new filter card on its value picker (detour-4/03.png); Escape takes it back, but focus lands on
  the sidebar Filters "+", not on the toolbar's Filters button that opened it (detour-4/07.png).
  Clicking "Largest component 249 nodes" in the Graph panel selects the 249; the selection's "..."
  menu offers Neighborhood, Path between..., Frame selection, New layer from selection and Add note,
  but no Filter to (detour-4/10.png), so the selection cannot become a filter card from there.

## 3. Keyboard (keyboard/, started keyboard-only)

Reached the end: Tab to "Add filter", Enter, "largest", Enter, Tab to the workspace's Condition...,
Enter, "degree", Enter, 2, Enter, Shift+Tab back to Condition..., Enter, "gal80", Enter, 0.5,
Enter (live: "24 of 331 nodes"); Escape (to the step row), Escape (live: "Done, 24 of 331", focus on
the card's own row). Final data 24 nodes, 4 edges. Fields: Enter commits the bound, Tab goes from
"from" to "to", Escape leaves the box for its step row, then closes the workspace (as decided).

- After Enter picks Largest component in the new card's picker, focus leaves the workspace for the
  sidebar's "Add filter" button (keyboard/25.png); the workspace's Condition... is 12 Tabs away,
  through the separator, the preview, the header, Done, the tree and the strip's "id" header
  (keyboard/26.png to 37.png). Nothing falls to the page body.
- Names heard: every control had a name; none duplicated on the route.

## Defects

1. Keyboard: picking a value with no test (Largest component) in a new card's picker sends focus to
   the sidebar's "Add filter", out of the workspace (keyboard/25.png). Does not block.
2. Detour 4: Escape on a new card opened from the canvas toolbar's Filters returns focus to the
   sidebar Filters "+", not the toolbar button (detour-4/07.png). Does not block.
3. Detour 4: a selection's "..." menu has no Filter to, though the settled behaviors keep Filter to
   as a command on a selection (detour-4/10.png). Blocks that detour only; the Data place path
   remains.
