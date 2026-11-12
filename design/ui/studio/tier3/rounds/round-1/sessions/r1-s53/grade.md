Grade: SD
False done: no
Wrong turns: 1

# Grade: r1-s53 (task T51 A, persona Elena)

Participant model: claude-opus-5-5 (the participant log records Opus in all 59 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (25 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page with "Open a file"; the end tree's only source is
volunteers.graphml).

## Against the success definition

T51 A asks for volunteers.graphml brought in, board, staff and volunteers drawn in three different
colors, and the board's color said.

- Three colors on `role`: the Everything node layer ends with Color bound to `role` (the Color
  line reads "role" with three squares, `12.png`). `key.json` draws 16 nodes `#e69f00`
  (volunteer, orange), 5 `#56b4e9` (staff, sky blue), 3 `#009e73` (board, green); every node of a
  value is in its value's color, and the key reads "Color: role" with volunteer, staff and board.
- The board's color was named "green" at step 12, the step the key first showed it ("board" with a
  green square, `12.png`). The drawn value `#009e73` is the reference value; the key accepts green
  or teal. Read from the key, so not "from the drawing alone".
- Ties and other looks unchanged: 63 ties `#a9a9a9` (darkgrey, the default); node size 1 and
  shape icosphere as at the start.
- One leftover: a one-node layer "v22" (Mei Tanaka) with its own Color bound to `role`, made by the
  wrong turn below. It paints v22 orange, the same color Everything gives a volunteer, so the
  drawing and the key are unaffected; the Everything Color line says "Covered by v22 on 1 of 24".
  That changes no look, so it does not fail "every other look unchanged".

Why SD and not S: the success came after a wrong turn, and the screen's notice after it ("Made
layer v22 for 1 node", `09.png`) is what sent the participant to Everything. Not F: the end state
is the key's success state (Everything bound to `role`), not the one-node layer alone.

## Steps and wrong turns

The key's path is 5 steps. The participant took 10 (a hover not counted):

1. "Open a file" with volunteers.graphml (`02.png`).
2. Load (`03.png`).
3. Clicked a node, v22 Mei Tanaka (`04.png`): the inspector switched to that node. Start of the
   wrong turn.
4. Style tab (`05.png`).
5. "+" beside Fill (`06.png`).
6. (hover on the link icon: tooltip "Node color by attribute", `07.png`) then the link icon
   (`08.png`).
7. `role` (`09.png`): only v22 turned orange, a layer "v22" was made, the key read "volunteer,
   v22: 1 of 24 nodes". End of the wrong turn; the participant abandoned it.
8. Everything in the layer list (`10.png`).
9. The link icon beside Color (`11.png`).
10. `role` (`12.png`): three colors, the key with three lines.

Wrong turns: 1 (steps 3 to 7, a color by `role` put on the clicked node's own layer instead of
Everything). The participant said "Done" only once the screen showed the success state: no false
"done".

## Problems

| # | Severity | Kind | Problem | Evidence |
| --- | --- | --- | --- | --- |
| 1 | 3 | behavior | With a node clicked, the inspector's Style tab styles that one node: "Color by role" on it makes a one-node layer named by the node's id, and the participant only learns so after the change ("Made layer v22 for 1 node"). A "color by a column" act on one node is a contradiction the panel does not flag before it happens. The answer key already lists this route (a node's own Style tab bound to `role`), so it is a known detour; confirmed on this half by this session, to be counted with other halves for a design finding. | Steps 3 to 7, `04.png` to `09.png`; transcript: "Nothing told me up front that the color would only go on the one I had clicked" |
| 2 | 2 | behavior | The wrong turn leaves a stray layer "v22" in the tree that the participant did not understand and did not remove; the Everything Color line then reads "Covered by v22 on 1 of 24". Harmless here only because the stray color equals Everything's color for a volunteer. | `12.png` (layer list, Color line); transcript: "an extra 'v22' thing in the left list I don't know what to do with" |
| 3 | 2 | wording | "Color by" is reachable only through an unlabeled link icon beside Color; the participant found it by hovering for the tooltip ("Node color by attribute"), and "attribute" had to be guessed to mean the column. | Step 6, `06.png`, `07.png` |
| 4 | 1 | opinion | Clicking a node moves the drawing right, leaving part of it under the inspector to the end; the participant asked "why did everything move?". The camera gliding to center a pick is decided behavior (`decided.md`); recorded, not graded. | `04.png`, `12.png` |
| 5 | 0 | opinion | The participant guessed the three clusters of the layout were the three roles; the colors showed they are not. A reader's guess, no defect. | `03.png`, `12.png` |

No build defect: every behavior above is what the key describes for this build, so no repro was
written.
