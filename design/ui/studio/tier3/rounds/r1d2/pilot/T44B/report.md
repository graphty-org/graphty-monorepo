# Pilot T44B: every volunteer's name on the drawing (volunteers.graphml), targeted re-pilot

Build: 758b8e8081 (served from `.study-builds/tier3-r1d2-758b8e8081`, the build named in
`criteria.md`). Every session started on the empty start screen with clean storage and reached
its file through "Open a file" (and Control+O for a Replace), never by URL. Each route below is
its own session under `758b8e8081/`; the screenshot paths are relative to that folder. The data
stayed each route's own file throughout: volunteers.graphml (24 nodes, 63 edges), sources.graphml
(24 nodes, 59 edges), neighbors.csv (16 nodes, 30 edges).

This pass walks the success path by pointer and the eight routes the last fixes touched. The
keyboard walk and the task's other detours were not part of it.

Result: **reached** by pointer in 8 steps, as the answer key counts. Every fixed route behaves as
`decided.md` now says: a find-box layer takes its conditions before its look, and Undo across a
file opened over itself leaves the drawing as the layers say. One new defect was found: with
nodes selected, the drawing moves when a key first appears (routes 2, 3, 4, 7).

## 1. Success path by pointer (`p2-pointer/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | consent notice closes | p2-pointer/02.png |
| 2 | Open a file, volunteers.graphml | read-the-file page | p2-pointer/03.png |
| 3 | Load | 24 dots, Graph inspector on Values: Nodes 24, Edges 63; private-window notice above the toolbar | p2-pointer/04.png |
| 4 | Everything | Style > Node; Text row with "+" | p2-pointer/05.png |
| 5 | Text "+" | menu Label, Card, Tooltip, Label highlighted | p2-pointer/06.png |
| 6 | Label | picker opens: Find an attribute, Fixed text, Data (name, role, hours, trained, phone), Structure (Node id); nothing highlighted | p2-pointer/07.png |
| 7 | name | every node named; "24 labels, 0 hidden"; "Lucy Grant" drawn small beside her dot | p2-pointer/08.png |
| 8 | Label settings (tooltip "Label settings"), Size box, 96, Enter | every label doubles; "-" reset appears beside Size; count stays "24 labels, 0 hidden" | p2-pointer/09.png, 12.png, 13.png |
| - | Escape | popover closes, focus on the gear; "Lucy Grant" reads clearly at the default framing | p2-pointer/14.png, 15.png |

End state (`p2-pointer/styles.json`): Everything has `node.label` by `data.name`, painted 24 of 24,
`node.labelStyle.sizePx` 96. Data stayed volunteers (24 nodes, 63 edges) throughout.

## 2. Find-box "email" layer, condition edited before its look (`p2-t41b-email/`, sources.graphml)

- Open a file, sources.graphml, Load: 24 nodes, 59 edges (04.png). Find box `email` offers
  "Select the 15 nodes (email: has a value)" (05.png); Enter selects 15 (06.png).
- Right-click on empty canvas, "New layer from selection": layer "email: has a value", 15, Style
  tab open, notice "Made layer email: has a value for 15 nodes" (07-08.png).
- Which nodes: one card `email` "Has a value", 15 nodes (09.png). Its match menu > "Has no value":
  accepted at once, the card reads 9 nodes, the layer is renamed "email: no value", 9 (10-11.png).
  No refusal message.
- Add a condition > on_record: card starts on Yes, 12 nodes; layer "email and 1 more", 4 of 24
  (12-13.png). Done keeps both cards: "email: no value, 9 nodes", "on_record: yes, 12 nodes"
  (14.png).
- Fill "+", `red`, Enter: the four are drawn red; key "Color: email and 1 more, 4 of 24 nodes"
  (16.png). `styles.json`: selector `not email` AND `on_record == true`, `node.color #FF0000`,
  matched 4, painted 4.
- DEFECT: when the key arrived with the first color, the drawing moved right by about 140 px with
  no request (15.png against 16.png); the right-hand cluster now runs under the inspector and one
  red dot sits at its edge (17.png). Decided 2026-10-19: a key that arrives never re-frames.

## 3. Find-box "phone" layer, condition edited before its look (`p2-t41a-phone/`, volunteers.graphml)

- Find `phone`, Enter: 17 selected (05-06.png). Right-click empty canvas > New layer from selection:
  "phone: has a value", 17 (07-08.png). Which nodes: `phone` card "Has a value" (09.png).
- Match menu > "Has no value": accepted, 7 nodes (10-11.png). Add a condition > trained: Yes, 15;
  layer "phone and trained", 4 of 24 (12-13.png). Done keeps both (14.png).
- Fill red: four red dots, key "Color: phone and trained, 4 of 24 nodes" (16-17.png).
  `styles.json`: `not phone` AND `trained == true`, matched 4, painted 4.
- DEFECT (same as route 2): the drawing jumped right by about 150 px when the key arrived, putting
  two nodes at or under the inspector's edge (14.png against 17.png).
- Note: the same two-card layer is named "phone and trained" here but "email and 1 more" on
  sources (route 2); names differ by rule shape that the reader cannot see.

## 4. Find-box layer whose condition is edited before its look (`p2-t38a-role-edit/`, volunteers.graphml)

- Find `board`: three node rows (v01, v13, v23) and "role is board (3)" (05.png). Clicking the rule
  row selects 3 (06.png). Right-click empty canvas > New layer from selection: "3 nodes", card
  "Picked by hand: 3 nodes, v01, v13, v23", notice "Made a layer for the 3 selected nodes"
  (07-09.png). As the answer key says, the rule row yields a hand-picked layer.
- Add a condition > role: an "Is any of" card with volunteer 16, staff 5, board 3; the layer is
  renamed "Picked by hand: 3 nodes" at once (10-11.png). Ticking staff and board: card 8 nodes,
  layer "Picked and role", 3 (AND) (12-13.png). Removing the hand-picked card: "role: staff,
  board", 8 (14.png). Every edit was accepted before any look.
- Done, Fill blue: 8 blue, key "Color: role: staff, board, 8 of 24 nodes" (15-18.png).
  `styles.json`: categories `data.role` in [staff, board], matched 8, painted 8.
- DEFECT (same as routes 2 and 3): the drawing jumped right about 140 px when the key arrived;
  the top-right node left the canvas behind the inspector (14.png against 18.png).

## 5. "+" layer, both-kinds row (`p2-t41a-plus-layer/`, volunteers.graphml)

- Layers "+" > Layer: "Layer 1", "Node and edge layer", Which nodes open with "Add a condition"
  and no list (05-07.png), as the answer key's step 5.
- trained (Yes, 15), phone > "phone: how to match" > Has no value (7): "4 of 24 nodes"; the row
  turns into "Node layer", "Edge not styled" (08-13.png). Done keeps both (14.png).
- Fill red: four red dots, key "Color: Layer 1, 4 of 24 nodes" (15-17.png). `styles.json`: the
  node row `trained == true` AND `not phone`, matched 4, painted 4; the edge row paints nothing.
  Unchanged from the answer key.
- The drawing did NOT move when the key arrived here (07.png against 17.png): nothing was
  selected. In routes 2 to 4 a selection was live when the key arrived, and the drawing moved.

## 6. One-node label layer from a find-box pick, Control+O > Replace, Control+Z twice, then Everything labeled (`p2-detour-c-label-replace/`)

- Find `Lucy`, Enter: v16 selected, inspector "v16", name Lucy Grant; the camera glides to her
  (05-06.png). Style tab > Text "+" > Label > name: layer "v16", "Picked by hand: 1 node",
  "1 label, 0 hidden", notice "Made layer v16 for 1 node"; only "Lucy Grant" drawn (07-10.png).
- Control+O, volunteers.graphml: "Add to volunteers" with "Replace volunteers.graphml" first and
  Load beside it with its warning (11-12.png); Replace: "Replace: volunteers.graphml, Was 24 nodes,
  63 edges; now 24, 63" (13.png); Replace: the graph redraws framed, v16 layer kept, Lucy Grant's
  label drawn (14.png).
- Control+Z: "Undid changing settings and importing data." (15.png). Control+Z: "Undid adding the
  layer v16."; the v16 layer leaves the tree AND its label leaves the drawing (16.png). Fixed.
- Everything > Text "+" > Label > name: all 24 names drawn, "24 labels, 0 hidden" (17-21.png).
  `styles.json`: Everything `node.label` by `data.name`, painted 24. The tree and the drawing
  agree. Fixed.

## 7. Find-box layer colored, Control+O > Replace, Control+Z twice (`p2-color-replace-undo/`, volunteers.graphml)

- Find `board` > "role is board (3)" (05-06.png); right-click empty canvas > New layer from
  selection: "3 nodes" (07-08.png); Fill "+" `green` Enter: three green, key "Color: 3 nodes"
  (09-11.png). The drawing jumped right when the key arrived (as in routes 2 to 4).
- A click on the canvas to drop the selection landed on a tie (edge 22) and selected it (12.png).
- Control+O, volunteers.graphml, "Replace volunteers.graphml", Replace: the graph redraws, the
  three stay green, the layer stays (13-17.png).
- Control+Z: undoes the load (18.png). Control+Z: "Undid changing node color on 3 nodes."; the
  three draw indigo again and the key goes; the layer "3 nodes" stays with no look (19-20.png).
  `styles.json`: "3 nodes" ids v01, v13, v23, painted nothing. The drawing and the tree agree.
  Fixed.

## 8. Hand-picked edge layer, Control+O > Replace on neighbors.csv, then Control+Z (`p2-t45a-edges-replace/`)

- neighbors.csv loaded: 16 nodes, 30 edges. Find `family` > "kind is family (8)": "8 edges
  selected", Agnes -> Bruno ... Nils -> Pia (05-06.png). Style > Line "+" > Color, `red`, Enter:
  layer "8 edges", "Picked by hand: 8 edges", key "Edge color: 8 edges, 8 of 30 edges", notice
  "Made a layer for the 8 selected edges" (07-11.png). The drawing did not move here.
- Control+O, neighbors.csv, "Replace neighbors.csv", Replace: the same 8 ties stay red, layer 8
  (12-16.png).
- Control+Z: "Undid changing settings and importing data."; the 8 stay red, the tree and key
  agree (17-18.png). One more Control+Z: "Undid adding the layer 8 edges."; every tie gray
  again, layer gone (19-20.png). Clean.

## 9. First find-box pick after a Replace (`p2-ring-after-replace/`, volunteers.graphml)

- Load, then Control+O, volunteers.graphml, "Replace volunteers.graphml", Replace (02-08.png).
- Find `board` > "role is board (3)": "3 nodes selected", all three draw their gold selection
  ring (09-11.png). Fixed.
- A click on empty canvas, Control+Z ("Undid changing settings and importing data.", 12-13.png),
  then find `Lucy`, Enter: v16 selected, ring drawn, the camera glides to her (14-16.png).

## Where the answer key and the screen differ (success path)

1. After `name` is picked, the count reads "24 labels, 0 hidden" at the default size (p2-pointer/08.png),
   and it stays "24 labels, 0 hidden" at 96 (13.png, 15.png). The answer key says 0 for B, so
   this matches. The key also says Size 96 "announces the count"; this pointer walk cannot hear
   that, so it is not checked here.
2. The Text "+" menu reads Label, Card, Tooltip with Label highlighted (06.png), and the picker
   opens with nothing highlighted: Find an attribute, Fixed text, Data (name, role, hours,
   trained, phone), Structure (Node id) (07.png). This matches the key.
3. The key gives Size with "Size in: Scene units", a link icon and no reset at the default. The
   screen agrees (09.png). After 96 a "-" reset appears beside the box (13.png).
4. No other difference.

## Defects

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | 2, 3, 4, 7 (find-box layer, then its first look) | Nodes are selected, then a look is set, so the key appears for the first time. At that moment the whole drawing slides right by about 140 to 150 px, with no request. The right-hand cluster then runs under the inspector: a red dot sits at its edge, and on volunteers one node goes behind it. `decided.md` (2026-10-19) says a key that arrives never moves the view. This did not happen with no selection (route 5) or with a tie selection (route 8). It does not change any layer or count, but it can hide a painted node that a participant must read (T41's four names). | p2-t41b-email/15.png against 16.png and 17.png; p2-t41a-phone/14.png against 17.png; p2-t38a-role-edit/14.png against 18.png; p2-color-replace-undo/11.png |
| 2 | 2 against 3 | The same two-card layer is named differently: "email and 1 more" on sources, "phone and trained" on volunteers. A reader cannot see why the name changes. Minor. | p2-t41b-email/13.png, p2-t41a-phone/13.png |
| 3 | 7 | After Undo puts the drawing back, it stays shifted right from the frame it had before (Undo never re-frames, as decided), so the right-most node stays near the inspector's edge. This follows from defect 1 and the Replace frame. Recorded only. | p2-color-replace-undo/19.png |

No crash, script error or failed request was printed on any route.
