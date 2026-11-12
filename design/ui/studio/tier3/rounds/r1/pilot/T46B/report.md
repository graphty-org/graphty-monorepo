# T46 B pilot: one cluster in red (College football)

Build e3c5bca8e6 (frozen, `.study-builds/tier3-r1-e3c5bca8e6`), served by `real.mjs` with `REAL_DIST`.
Every route starts at the empty app. The data stayed College football (115 teams, 613 games) throughout.
Folders: `w3-pointer/`, `w3-detours/`, `w3-keyboard/`. Older folders here are earlier attempts.

## 1. Success path by pointer (w3-pointer/): reached, 12 steps

No thanks (02), College football (03), Analyze (04), `louvain` (05), Enter (06), Run (07: 10 groups,
"Louvain" folder, "Color: Louvain" key; the drawing moved right, center about x 745 to x 890),
find box (08), `Nebraska` (09) Enter (10: inspector titled `74`, Memberships Louvain Group 4),
folder caret (11 tooltip "Expand Louvain", default cursor; 12: Group 1-10 of 16,15,14,12,11,10,10,9,9,9),
Group 4 row (13: "Louvain: Group 4, 12 nodes", "12 of 115 nodes", A1CAF1), color box (14),
`red` Enter (15, 16: FF0000; Group 4 red in drawing, key and row; others unchanged).
`blue` then Escape restores FF0000 and keeps focus (17); Enter on the unchanged value changes nothing (18);
Tab goes to "Node color by attribute" (19); Undo tooltip "Undo changing node color on Group 4 Ctrl+Z" (20).
Answer: 12.

## 2. Detours (w3-detours/)

a. `cluster` in the analysis filter (05): Clustering coefficient highlighted first. Tab (06) closed the
   popover, took nothing and sent focus to the inspector's "From College football" link -- against the
   settled rule that Tab with letters typed takes the highlighted option. Escape clears the text (08), a
   second Escape closes and returns focus to Analyze (09). Enter on `cluster` opens Clustering
   coefficient (11); Run paints every node on an orange scale 0.1111-0.6667 with nothing saying these are
   not groups (12). Louvain picked from the `cluster` list and run gives the same 10 groups (16); the
   earlier layer's icon reads "Painted over by Group 1 ... and Group 10" (20).
b. The "Color: Louvain" key: hover, click, right-click on Group 4 do nothing (17-19).
c. Node's Style tab (23): Fill "+" (24), `red` Enter makes a one-node layer named "74" (the id, not
   "Nebraska"), notice "Made layer 74 for 1 node"; the key grows a scroll with "3 more below" hiding
   Groups 8-10 (25). Undo removes it (26).
d. "Why this look" > "Open layer Louvain / Group 4" (31-32) opens the group layer and expands the folder.
e. Folder (33): chip "Louvain: <<Layer>>" and the purple "<<Layer>>" token. Its Color opens "Color from each
   layer" (34) with counts but not which group holds Nebraska; "Source: <<Layer>>" with "Change source".
   Group 4's swatch (35), `red` Enter: the picker closes at once (the answer key says it stays open),
   "Color: 1 changed" (36). Tab goes to "Hide Layer Group 4" (37); Escape closes, focus on the Color field (39).
   Chain icon (40, tooltip "One value for all: use yellow for all 10 layers"): every group yellow,
   the red one too, "Color: 9 changed" (41); inline Undo restores (42). Folder right-click menu (43)
   offers nothing per group.
f. Right-click on Nebraska (45): Neighborhood, Path between, Frame selection, New layer from selection,
   Add note; nothing reaches its group. Data panel (47): attributes id, label, value only; no group column.
g. Memberships "Group 4" (48-49): default cursor, no tooltip, reads as plain text; click opens the Group 4
   layer, but with the Data panel showing the layer list stays out of sight.

## 3. Keyboard only, screen-reader mode (w3-keyboard/): NOT finished

Each step took about 25 seconds on the loaded machine; the walk reached only the start screen
(`w3-keyboard/tab-walk.txt`): Main menu, Local only, Settings..., Open project or file..., New from data...,
Open the Les Miserables sample, Open the Zachary's karate club sample. No focus fell to the page. The rest
of the keyboard walk (opening College football, Analyze, the run, the find box, the layer tree, the color
box) was not walked on this build and is still owed.
