Grade: SD
False done: no
Wrong turns: 1

# Grade: r1-s35 (task T43 A, persona Elena)

Participant model: claude-opus-5-5 (the participant log records Opus in all 78 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (32 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page's "Open a file"; the top bar reads "volunteers").

## Against the success definition

T43 A asks for `volunteers.graphml` opened, node size following `hours` for every node, larger for
more, and the person who gave the most named from the screen.

- Size: bound on Everything, the stack that counts for S. `styles.json`: layer "Everything"
  (`everything_2`) encodes `node.size` by `data.hours`, linear, range 1 to 3, matched 24, no value
  0. Its painted size count is 23 because one node is covered by the layer "v11" (`v11_1`), a
  one-node layer picked by hand, which also encodes `node.size` by `data.hours` over the same range
  1 to 3. So all 24 nodes follow hours on the same scale; v11 (Chen Wei, 14 hours) is sized by
  hours through its own layer.
- Every node, larger for more: yes, as above. The key over the drawing reads "Size: hours, 2 to
  52" with the line "1 node covered by v11" (`key.json`, `15.png`, `16.png`).
- The answer: the participant clicked the largest-looking dot and read the inspector: id v09,
  name Hannah Weiss, role staff, hours 52 (`16.png`), and checked it against the key's top end, 52.
  Hannah Weiss is the answer, read from the screen.
- Final screen (`16.png`): sizes vary by hours, the key reads "Size: hours", the inspector shows
  Hannah Weiss with 52.

Why SD and not S: the participant first bound the size on the clicked dot's own Style tab, which
made the one-node layer "v11" ("Made layer v11 for 1 node", key line "v11: 1 of 24 nodes",
`12.png`). Those two lines on screen showed only one dot had changed, and the participant
recovered by binding Everything. The v11 layer was left in place; it changes no grade because it
reads the same column on the same scale.

## Steps

14 steps against the key's 6. Open a file with the file (1), Load (2), a click on a dot that
looked big, v11 (3, the start of the wrong turn: it opens the dot's own panel and moves the
drawing), the Style tab (4), the "Shape" heading, which does nothing (5), Shape "+" (6), Size (7),
a hover over the link icon to read its tooltip (8, a check), "Node size by attribute" (9),
`hours` (10, end of the wrong turn: only v11 sized), Everything (11), "Node size by attribute"
(12), `hours` (13), a click on the largest dot (14). The tool's ambiguous `--click "Shape"` at
step 6 of the transcript resolved nothing and is no step.

One wrong turn: steps 3 to 10, sizing the clicked dot's own layer instead of every node,
abandoned for Everything. The dead click on the "Shape" heading falls inside it.

## Problems

1. Severity 2, behavior. With a dot clicked, the Style tab belongs to that dot alone. Shape "+" >
   Size and the link icon there bind size for one node, making the layer "v11". The tab does say
   "The first style you set makes a layer for the selected node." in small type above Shape
   (`09.png`), but the participant read the tab as the place to style the graph and only learned
   otherwise from the result, "Made layer v11 for 1 node" (steps 3-10, `04.png`, `09.png`,
   `12.png`).
2. Severity 1, behavior. After recovering, the leftover one-node layer stays above Everything and
   the key keeps the line "1 node covered by v11". The participant could not tell whether it
   mattered for the report (it does not here, because it reads the same column) (step 13,
   `15.png`).
3. Severity 1, behavior. Clicking the section heading "Shape" does nothing; the Size line is
   reached only through the small "+" at the row's right edge (steps 5-6, `07.png`, `08.png`).
4. Severity 1, wording. The size-by-column control is a bare chain-link icon, named only by its
   tooltip "Node size by attribute"; the participant hovered it before trusting it (step 8,
   `10.png`).
5. Severity 1, behavior. Clicking a dot moves the drawing to center on it (the drawing slid left
   at step 3, `04.png`, and swung again at step 14, `16.png`); the participant lost their place
   both times.
6. Severity 1, behavior. Before any sizing, in 3D a dot nearer the camera draws bigger; the
   participant read that as "a lot of hours" and it was not (v11, 14 hours, step 3, `03.png`,
   `04.png`). The key already records that 3D depth makes the biggest dot unclear at a glance.
7. Severity 1, behavior. No names on the drawing: the biggest dot can be named only by clicking it
   (or by the table) (step 14, `15.png`).

No build defect: every behavior above matches what the key says the build does, so no repro was
scripted.
