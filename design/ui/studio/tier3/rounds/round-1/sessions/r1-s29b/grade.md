# Grade: r1-s29b (task T41 A, persona Nadia)

Grade: S
False done: no
Wrong turns: 1

Participant model: claude-opus-5-5 (the participant log records Opus, not Sonnet).
Build: 758b8e8081 (graphty@0.8.91), the frozen tier 3 build.
Merged: no -- the file was opened from the landing page as a new graph (24 nodes, 63 edges);
Les Miserables, the starting sample, is gone in `work.json`.

## Against the success definition

- **Exactly the 4 drawn red.** `key.json`'s drawn colors: 4 nodes `#ff0000`, 20 nodes `#6366f1`,
  63 edges `#a9a9a9`. `#ff0000` is the CSS keyword `red`, so `colorWord` gives "red": the asked
  hue holds. The last screenshot (18.png) shows four red dots and the key "Color: Trained, no
  phone, 4 of 24 nodes".
- **One layer, two cards, AND.** Layer "Trained, no phone": `trained: yes, 15 nodes` and
  `phone: no value, 7 nodes`, "4 of 24 nodes" (14.png) -- the stack the answer key counts.
- **Names said match the answer and were on screen.** The participant names Aisha Bello (v03),
  Diego Ruiz (v10), Nora Lindqvist (v14) and Julia Rossi (v20) -- exactly T41 A's answer. The
  layer's Values tab lists the members v03, v10, v14, v20 (16.png), and the table shows each id
  with its name, `trained` Yes and a blank phone: v03 and v10 in 17.png, v14 and v20 in 18.png.
- **Everyone else unchanged.** The other 20 nodes keep the default `#6366f1`; the edges are
  untouched. The layers that went (`styles.json` "gone") are the starting sample's, removed by
  opening the file as a new graph, not by the participant's layer.

## Steps and wrong turns

18 steps (the start included) against the 18-step success path. The route is the success path's
table variant: steps 1-14 match the path one for one (open, Load, "+", Layer, name it, Which
nodes, Add a condition, trained, Add a condition, phone, match menu, Has no value, Done, Fill "+",
`FF0000` instead of `red`), then the table instead of clicking each red dot.

- Wrong turn 1 (step 16): the layer's Values tab, hoping it listed the members by name. It lists
  ids only (v03, v10, v14, v20), so the participant still had to open the table (steps 17-18).
  Not wasted -- the ids let the participant match rows -- but off the success path.

The participant's "done" (after 18.png) is true: the screen shows the four red dots and both
names-bearing table halves were read on screen.

## Problems

All are design problems the answer key already describes for T41 on this build; none is a build
defect, so no repro was scripted.

1. **The layer's member list names nodes by id, not by name** -- severity 2, behavior. Step 16,
   16.png: "Members: v03, v10, v14, v20". To learn who v20 is, the reader must open the table and
   scroll to match ids by eye (steps 17-18). The participant: "That's exactly the
   copy-an-account-number-between-screens busy work I hate." The inspector is also titled by id,
   with the name a row below (answer key).
2. **The table does not mark which rows the layer paints** -- severity 2, behavior. 17.png and
   18.png: no row shows it is one of the four red nodes; the participant matched by `trained`
   and blank `phone` cells. Together with problem 1 this makes "who are they" a cross-screen
   lookup on every task of this shape.
3. **A new text card opens on "Contains" with its text box focused; "Has no value" is only in the
   card's match menu** -- severity 1, behavior. Step 10, 10.png: the participant was unsure
   "whether a blank text box meant 'blank' or 'anything'" and had to think to open the menu
   (step 11). Found it in one try here; the answer key records that typing `missing` there gives
   0 nodes with no warning.
4. **The fill color is a hex text box; no named colors or swatches are offered at the point of
   entry** -- severity 1, opinion. Step 14, 14.png: the box shows `6366F1` selected. The
   participant knew `FF0000`; "a newer volunteer coordinator might not". (The box accepts `red`,
   per the success path, but nothing on screen says so.)
5. **The red dots carry no names, so the picture alone does not say who to call** -- severity 1,
   opinion. 15.png. Labels are a reader's choice through a Text layer; recorded as the persona's
   wish, not a defect.

## Leak check

`leaks.json` (written at `--end`) found the participant's transcript, read 38 tool calls and
lists no leak. Not VOID.
