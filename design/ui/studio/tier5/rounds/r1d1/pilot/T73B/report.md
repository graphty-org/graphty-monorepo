# T73B pilot (targeted re-walk), build 797a4f6b47

Task: put Cedar Bend and every gauge within two stretches of river of it in orange, and report the
count. Start: `gauges-clean.txt` (gauges.csv joined with flows.csv, the table open). Every walk
started from that setup, by pointer and keys only, never by URL. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier5/r1d1/pilot/T73B/ (not in git).

Result: **reached on every walk**. Each ends with Layer 1 "Within 2 hops of Cedar Bend", 7 of 11
nodes, fill FFA500, and the canvas draws exactly 7 orange gauges (G01, G02, G03, G04, G05, G08,
G11 in the matches strip). The data stayed the task's own 11 gauges and 13 stretches throughout. No
"Covered by Everything" warning appears any more after the fill is set.

## Walks

### success -- the success path by pointer

+ > Layer; Which nodes; type "within"; Enter; Enter (the reference picker opens, its search
focused); type "Cedar"; Enter; Done; Fill's + ("Add to node fill"); type orange; Enter. 12 steps,
as the answer key says.

- 02.png: the workspace opens on the value picker; the main table is replaced by the matches strip.
- 04.png: "Within 2 hops of" with "No reference", Hops 2 by default.
- 05.png: the reference picker opens downward under its field; it no longer covers Done.
- 06.png: header "7 of 11", row "Within 2 hops of Cedar Bend", "No match 4".
- 07.png: after Done, the main table comes back without the editor's Group column.
- 09.png: 7 orange nodes, key card "Color: Layer 1, 7 of 11 nodes", no covered warning.

Folder: .../T73B/success

### touched-6 -- T73B success path (a second session, with the Hops field's keys)

Same path to the reference; then in Hops: 1 and Enter (03.png: "Within 1 hop of Cedar Bend", 4 of
11, the preview and strip follow at once); 2 and Tab (04.png: back to 7 of 11); Escape in Hops
(05.png: focus goes to the outline row, the workspace stays open, nothing is lost). Done, fill
orange: 06.png, 7 orange. Escape in the color field keeps FFA500 (07.png).

Folder: .../T73B/touched-6

### touched-15 -- T73B success path: workspace closed with Escape

Same path to the picked reference (02.png, 7 of 11). Escape once: focus goes to the outline row,
the workspace stays (03.png). Escape again: the workspace closes and keeps the edit -- Layer 1
reads 7, the inspector reads "Within 2 hops of Cedar Bend", focus on Which nodes' Edit (04.png).
Fill orange: 05.png, 7 orange. Matches the decided "Esc is Done".

Folder: .../T73B/touched-15

### touched-29 -- T73B success path: "Cedar" (must still work)

Reference search: "Cedar" then Escape closes the picker with nothing chosen and leaves "No
reference" (02.png). Reopened with Enter, lowercase "cedar" finds Cedar Bend (03.png); Tab from
the search box sends focus to the page's Main menu while the picker stays open (03.png, focus ring
top left). A pointer click on the option picks it: 7 of 11 (04.png; the focus ring stays drawn on
Main menu). Done, fill orange: 05.png, 7 orange.

Folder: .../T73B/touched-29

## Mismatches with the answer key

None that affect grading. The key's "Fill; hex" is, on screen, Fill's + button ("Add to node
fill") and a text field that takes a color name or hex; both reach FFA500.

## Defects

Nothing crashes, blocks the task or spoils its grade. Things a participant could trip over:

1. Tab in the reference picker's search box moves focus out of the workspace to the top bar's Main
   menu, leaving the picker open; after a pointer pick the focus ring stays on Main menu
   (touched-29, 03.png and 04.png).
2. Inside the workspace the preview canvas fills only the top half of the middle column. A blank
   white band runs between it and the matches strip (success, 02.png to 06.png). Only how it
   looks; nothing is hidden.
3. With no reference picked, the header still says "11 of 11" (the step adds no limit until a
   reference is chosen). A participant could read the 11 as the answer before picking Cedar Bend
   (success, 04.png). This is minor: the count changes to 7 as soon as Cedar Bend is picked.

The keyboard-only walk and the detour walks were not asked for in this re-walk.
