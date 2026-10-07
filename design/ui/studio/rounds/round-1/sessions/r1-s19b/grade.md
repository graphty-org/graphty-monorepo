# Grade: session r1-s19b -- Ruth, Javert and who he shares chapters with (Les Miserables)

- **Grade:** SD (success with difficulty)
- **Failure codes:** none
- **False "done":** no. Ruth said "Partly. I have the number, 17 ... I do not have a list of names
  I could hand to a fact-checker", which matches the screen: no list of names anywhere, only tiny
  labels in the drawing (28.png).
- **Steps:** 28 against a path of 6. The success path (search Javert, Enter, click "Degree 17" on
  Values to get "Javert's 17 connections") was never found; she saw "Degree 17" at step 5 and did
  not try it.
- **Wrong turns:** 9 -- Neighborhood (step 7, which selects but lists no names; the task notes
  call it "not a success path"), the Data tab and its Node table row (8, 10), clicking the name
  value (9), the Selection actions menu (12), Escape plus the Selection row, which lost the
  selection (13), Quick actions "Add label line" (19-20), hovering a dot for its name (21), the
  mouse wheel (25-26) and the Layout button taken for zoom (27).
- **Ease (from the transcript):** 6 on a 1 = very easy, 7 = very hard scale.
- **Usage card:** declined ("No thanks", step 2), no detour.
- **Tool prints:** step 3 missed the search box by its placeholder text (a tool miss, retried by
  position at step 4; not something a person would meet). At steps 16-18 the tool printed each
  toolbar button's tooltip one hover late; 15.png shows no tooltip on screen at all, so this is a
  tool reporting lag, not an app defect, and it did not change what Ruth did. Session not void.
- **Build-decided:** no. The success path exists on this build; she did not find it.

## Why SD

The last screenshot (28.png) shows the 18 selected nodes (Javert and his neighbors) in yellow,
the Everything row's Style tab with a label line bound to `name`, and "77 labels, 7 hidden to
avoid overlap". The names of Javert's neighbors are on screen only as small labels in the
drawing. Ruth read 16 names off them, all of them real neighbors (Fantine, Mme Thenardier, Babet,
Simplice, Gueulemer, Thenardier, Woman 2, Woman 1, Fauchelevent, Claquesous, Montparnasse,
Gavroche, Toussaint, Bamatabois, Valjean, Cosette), and said 17 from "Degree 17" and the 18
selected. She missed Enjolras and offered "Bossuet" for the 17th, flagged as a guess; Bossuet is
not a neighbor. Success A needs Javert selected, one fact read (Degree 17), at least three
neighbors named from the screen and the count 17: met. The answers file grades neighbors "read
... by clicking around the drawing" as SD, and that is what happened here -- no list
"Javert's 17 connections" was ever on screen.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---------|----------|------|----------|
| 1 | Nothing tells a reader that "Degree 17" on a node's Values opens the list of its 17 neighbors. It looks like a plain value row, the same as id and name. Ruth read it, asked "But who are they?", and never tried it; the only list of neighbors the app has stayed hidden all session. | 3 | behavior | Step 5, 05.png: "Degree 17 -- I think that means 17 ties. But who are they?" |
| 2 | With several nodes selected, Values shows only one name, "Babet (1)", for id and name. There is no list of the selected nodes' names and no way from that panel to get one; clicking or hovering the value does nothing. The reader who selects a neighborhood cannot read who is in it. | 3 | behavior | Steps 7, 9, 15; 07.png, 09.png, 15.png: "the only name it shows me is Babet. I need all of them." |
| 3 | Clicking the "Selection" row in the left list while 18 nodes are selected empties the right panel (just the header "Selection", no values), though the 18 stay selected in the drawing and the row still says 18. | 3 | build-defect | Reproduced as a scripted path in `rounds/round-1/repro/r1-s19b/` (`run.sh`): start empty, `--click "No thanks" --click "Les Miserables"`, `--click-at 180,90 --type "Javert" --key ArrowDown --key Enter`, `--click "Neighborhood"` (04.png: panel shows 18 nodes), `--click-at 121,124` (05.png: panel blank, drawing still 18 yellow). |
| 4 | Escape pressed to close the Selection actions menu also cleared the 18-node selection, so Ruth lost what she had found and had to search again. | 3 | behavior | Step 13, 13.png (no yellow dots after `--key Escape` then the Selection row; the repro shows the row click alone keeps the selection, so Escape cleared it): "I lost what I had just found." Not yet reproduced as a script. |
| 5 | "Node table" in the Data tab opens an "Add to Les Miserables" file-loading screen instead of showing the table's rows. A reader looking for a list of characters meets a request for a file. | 3 | build-defect | Step 10, 10.png. Reproduced in `rounds/round-1/repro/r1-s19b/`: after the steps above, `--click-at 28,130` (Data), `--click-at 160,168` (treeitem "Node table") gives the same "Add to Les Miserables" screen (09.png). |
| 6 | Turning the mouse wheel over the drawing does not zoom, so the tiny labels in the crowded middle could not be enlarged. | 3 | build-defect | Steps 25-26; 25.png and 26.png unchanged. Reproduced in `rounds/round-1/repro/r1-s19b/`: `--wheel 750,500,-600` three times leaves 05.png, 06.png and 07.png the same. Also seen in sessions r1-s10b and r1-s11b. |
| 7 | "Edges 0" beside "Edges among them 61" on the selection's Values: two edge counts that read as contradictory. Ruth could not say which to believe. | 2 | wording | Step 7, 07.png: "'Edges 0' next to 'Edges among them 61' -- which one is it?" |
| 8 | "Add label line" in Quick actions is grayed out with no reason given, and clicking it does nothing. | 2 | behavior | Steps 19-20, 20.png. |
| 9 | Hovering a node in the drawing shows nothing, so a reader cannot check who one dot is. | 2 | behavior | Step 21, 21.png. |
| 10 | Labels are drawn tiny, and "7 hidden to avoid overlap" leaves the reader unsure whether a name she needs is among the hidden ones. Ruth read the 17th neighbor wrong ("Bossuet"). | 2 | behavior | Step 24, 24.png and 28.png: "they're tiny, and 7 are hidden. Are any of the hidden ones mine?" |
| 11 | The Layout button's four-arrows icon reads as move or zoom. | 1 | opinion | Step 27, 27.png. |
