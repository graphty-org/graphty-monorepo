Grade: SD
False done: no
Wrong turns: 0
Route: selection

# Grade: r1-s28 (task T38 B, persona Elena)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (27 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.

## Against the success definition

T38 B asks for `sources.graphml` opened as a new graph, how many sources and ties it has, and
the companies and agencies (10) drawn blue with everyone else unchanged.

- Counts: "24 sources, 59 ties", read from the read-the-file page (`02.png`, "sources: 24 nodes,
  59 edges") and the Values overview (`03.png`, Nodes 24, Edges 59). Both said from the screen.
- Last screenshot `13.png`: ten dots in `0077BB` (a mid blue), one of them half under the
  inspector at the right edge, and 14 in the starting indigo. The key reads "Color: 10 nodes",
  "10 of 24 nodes".
- `key.json` drawn: `#0077bb` 10, `#6366f1` 14; edges `#a9a9a9` 59, as they started.
- `styles.json`: one added layer, "10 nodes" (`source.by` user), selector `match: ids` with
  s01, s04, s07, s09, s12, s15, s17, s20, s22, s24 -- the 6 companies and 4 agencies the
  selection summary named in `07.png` ("kind: company (6), agency (4)") -- and only
  `node.color` `#0077BB`. Everything still paints the other 14 in `#6366F1`; nothing else was
  changed.
- Why SD and not S: the layer holds a hand-picked list of node ids ("Picked by hand"), not the
  rule "kind is company or agency". The answer key counts that stack as SD. The right nodes are
  blue and no one else changed.

## Steps and wrong turns

Participant: 12 actions from `01.png` to `13.png`, one of which the tool refused with nothing
done (a click on "Fill", which matched several controls). The rest: "Open a file" with the
file, Load, the find box with `company`, "kind is company (6)", the find box with `agency`,
Shift+click "kind is agency (4)", the Style tab, Fill "+", the color square, the blue swatch,
a click on empty canvas to clear the selection rings. The key's success path (a category card
on `kind`) is 12 steps; this find-box route took 10 effective steps to the blue, plus the
look-only deselect. None led away from the goal.

Wrong turns: 0.

False done: no. She said done on `13.png`; the screen, the key and the style tree agree that the
10 companies and agencies are blue and the 14 people unchanged.

## Problems

1. **Coloring a selection moves the drawing about 130 px right and pushes a cluster under the
   inspector.** Severity 2, kind: build-defect. Steps 12-13 (`11.png` to `13.png`): when the
   first color landed (which also makes the layer and adds the key), every node moved right with
   no input on the canvas; on the last screen one of the ten blue nodes is half under the
   inspector and the right cluster is cut off. She said "the picture slid again" and "part of the
   picture is cut off on the right side now". Reproduced on the frozen build in
   `rounds/round-1/repro/r1-s28/` (`commands.md`): the same six company nodes are at x 604 to 945
   in `07.png` and x 727 to 1074 in `09.png` after `blue` and Enter, the right cluster under the
   inspector. Against `decided.md` (2026-10-19): an arriving key never re-frames the drawing.
   The glide on each selection (`05.png`, `07.png`) is the decided behavior and not counted here.
2. **The find box's value rows read as a rule but make a hand-picked layer.** Severity 2, kind:
   behavior. Steps 5, 7 and 12 (`05.png`, `07.png`, `12.png`): "kind is company (6)" and
   "kind is agency (4)" select nodes, and the color makes a layer of 10 node ids named
   "10 nodes". The layer will not follow the data (a new company stays indigo), and nothing on
   screen says so.
3. **The key names a count, not who is blue.** Severity 2, kind: wording. Step 13 (`13.png`):
   "Color: 10 nodes" -- she said that in a meeting "nobody would know what the blue means". This
   follows from the hand-picked layer: its name is its count.
4. **The starting indigo and the chosen blue look alike.** Severity 1, kind: opinion. Steps 3,
   10 and 13 (`03.png`, `10.png`, `13.png`): she wondered whether every dot was "already blue",
   and at the end said the difference "is not huge".
5. **Find-box rows are titled by id, not name.** Severity 1, kind: wording. Step 4 (`04.png`):
   s01, s04 ... although the read-the-file page showed names such as "Harlan Development".
6. **Nothing says Shift+click adds to the selection.** Severity 1, kind: wording. Steps 6-7
   (`06.png`, `07.png`): she guessed it from spreadsheets; it worked.
7. **Color is under "Fill" and its box shows a hex code.** Severity 1, kind: wording. Steps 8 and
   10 (`08.png`, `10.png`): she looked for "Color", found Fill by analogy with Slides, and read
   `6366F1` as "a code, not a color name"; the picker's swatches got her through.
8. **"Nodes" and "edges" are not tied to the reader's words.** Severity 1, kind: wording. Step 2
   (`02.png`): she had to guess that sources are nodes and ties are edges.
