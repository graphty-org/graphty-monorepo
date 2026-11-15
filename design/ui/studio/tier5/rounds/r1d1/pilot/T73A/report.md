# T73 A pilot -- targeted re-walk on build 797a4f6b47

Task: put everyone within two shifts of James Carter in orange, James included, and report the
count. Start: `volunteers.graphml` open and ranked by PageRank (setup `volunteers.txt`), table open.
Expected: a style layer "Within 2 hops of v02", filled orange, 16 of 24 nodes.

This re-walk covers the pointer success path and the three changed routes that belong to this
task. Screenshots are under
`/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73A/`.

## Result

The task is reached on every route. Each walk ends with one new layer whose rule is "within 2 hops
of v02", filled orange, and showing 16 of 24 in the layer list, the inspector and the legend. Data
stays the task's own 24 people throughout. Nothing crashed or blocked, and no route gives a wrong
count.

## Routes walked

### success -- pointer success path, with the name tried first

Folder `success/`. Replayed the earlier pass's route. Every step matched.

- + > Layer, Which nodes, type "within", Enter, Enter: the reference picker opens with its search
  focused (07.png).
- Typing "James" and then "Carter" now finds the person: the picker lists "v02  name James Carter"
  (08.png, 09.png). On the earlier build this showed "Nodes 0".
- Typing v02 and pressing Enter: "Within 2 hops of v02", 16 of 24, 8 in No match (11.png).
- Done, Add to node fill, FF8C00, Enter: Layer 1 shows 16, and the legend reads "Color: Layer 1, 16
  of 24 nodes" (15.png). The earlier pass's false "Covered by ..." warning does not appear.
- Reopening Which nodes and editing Hops is fine: 1 gives 9 of 24 (18.png); 2 then Tab gives 16
  (19.png); 3 then Escape keeps 3, 24 of 24 (20.png), as decided (Escape never discards work); 2,
  Enter, Escape, Escape returns to 16 of 24 with the orange fill intact (21.png).

### touched-14 -- Hops edited after the layer is reopened

Folder `touched-14/`. Same route, run in a fresh session, and every step matched. Each Hops edit
updates the count at once (1: 9, 2: 16, 3: 24). After closing, the layer still shows 16 with its
fill, and no false covered warning appears (`touched-14/17.png` to `touched-14/21.png`).

### touched-27 -- reference chosen by typing the person's name

Folder `touched-27/`.

- + > Layer, Which nodes, "within", Enter, Enter, type James: the picker lists "v02  name James
  Carter" (02.png).
- Escape closes the picker with nothing chosen and keeps the card, showing "Choose a reference"
  (03.png). This is the decided behavior.
- Clicking "Choose a reference", typing James, then Tab: the picker stays open, but focus jumps to
  the app's main menu button at the top left of the page. The focus ring shows there (04.png).
  See the defects below.
- Clicking the option: "Within 2 hops of v02", 16 of 24 (05.png). Focus stays on the main menu
  button.
- Done, Add to node fill, FF8C00, Enter: Layer 1 at 16, orange (06.png).

### touched-28 -- the full name typed in the reference search, then Enter

Folder `touched-28/`. This is the earlier pass's first detour, replayed. On the earlier build the
search found nothing for "James Carter", and the person went to the find box to read the id.

- Typing "James Carter" now lists "v02  name James Carter" (02.png). Enter picks it: "Within 2
  hops of v02", 16 of 24 (03.png). The replay diverges here because the detour is no longer
  needed.
- Done, Add to node fill, E4572E, Enter: Layer 1 at 16 in that color (04.png).

## Answer key against the screen

- **Name search now works.** The answer key's Path (A) says the reference search does not find
  James Carter by name ("Nodes 0"), and that a participant must read `v02` somewhere else. On this
  build the search finds him by "James", "Carter" or "James Carter", and the option shows "v02  name
  James Carter". Typing the name is now a 12-step route. The 13-step count for "name tried first"
  and the 18-step find-box route no longer apply.
- The finished rule still reads "Within 2 hops of v02", not the name, because the file designates
  no label. This matches the answer key's row text.
- **No false covered warning.** The answer key's notes list one after Hops edits ("Covered by
  PageRank on 5 of 5"). It did not appear on this build: the legend reads "16 nodes covered by
  Layer 1".

## Defects

1. **Tab in the reference picker's search sends focus to the main menu.** On route touched-27,
   typing in the search and pressing Tab moves focus to the app's main menu button at the top left
   of the page, while the picker stays open (`touched-27/04.png`). Clicking an option afterwards
   leaves focus on that button (`touched-27/05.png`). A keyboard user lands outside the workspace
   with the list still open. This does not spoil the grade.
2. **The table still draws inside the workspace**, under the canvas preview, on every route
   (`success/11.png`). This was already known. It does not spoil the grade.
