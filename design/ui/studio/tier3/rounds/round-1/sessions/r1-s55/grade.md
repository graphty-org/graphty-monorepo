Grade: S
False done: no
Wrong turns: 1
Merged: no

# Grade: r1-s55 (task T51 A, persona Nadia)

Participant model: claude-opus-5-5 (the participant log records Opus in all 41 model entries;
"Sonnet" appears only in a tool description, never as the model).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (17 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no. The start page's spinning sample was replaced, not merged: `work.json` ends with one
source, volunteers.graphml, and 24 nodes.

## Against the success definition

T51 A asks the reader to bring in volunteers.graphml, give board, staff and volunteers each their
own color, and say which color the board is.

- Three distinct colors bound to `role`: the Everything node layer carries
  `encode node.color by data.role`, ordinal, Okabe-Ito palette (`styles.json`). `key.json` draws
  16 nodes `#e69f00`, 5 `#56b4e9` and 3 `#009e73` -- the file's 16 volunteers, 5 staff and 3
  board -- so every node of a value is in its value's color.
- The color named: "board is the DARK GREEN (teal) color", read from the key "Color: role" that
  opened at step 8 (`08.png`: volunteer orange, staff light blue, board green). The key lists
  board as `#009e73`; the answer key accepts green or teal. "Dark" is recorded, not graded.
- Ties and every other look unchanged: 63 ties `#a9a9a9` (`key.json`), the edge half of
  Everything still darkgrey, width 8; node size 1 and icosphere kept; `changes.changed` is empty.
  The "gone" and "added" layer lists are the start page's demo replaced by the loaded file.
- Final screen (`08.png`): Everything's Style with Color bound to "role" and three squares under
  it, the key over the drawing, three colors on the canvas. The participant's closing claim
  matches the screen and the style tree.

## Steps

7 steps against the success path's 5. 1. "Open a file" with volunteers.graphml. 2. Load.
3. The Style tab of the graph inspector (wrong turn: it holds the canvas background and labels).
4. Everything. 5. Hover over the link icon (a check of an unlabeled control, not a wrong turn).
6. The link icon, "Node color by attribute". 7. "role, 3 values".

## Problems

1. Severity 2, wording. After Load, the graph inspector's Style tab is about the canvas and
   labels only; a reader looking for "color the dots" goes there first and finds nothing about
   nodes, and must find the Everything layer on the left (step 3, `04.png`).
2. Severity 2, wording. Coloring by a column hides behind a chain-link icon beside Color whose
   meaning shows only on hover ("Node color by attribute"); the participant hovered to learn it
   and said it would not have guessed a link icon means that (steps 5 and 6, `06.png`, `07.png`).
   Recorded in the answer key's success path.
3. Severity 1, wording. "Everything" did not read as "all the dots" until clicked; the row says
   "Everything 24" with no word for nodes (step 4, `05.png`).
4. Severity 1, behavior. The participant counted "about four dark green dots" where 3 are drawn:
   the key opens over the drawing's top-left corner and covers a node (`08.png`, near the key's
   lower edge), so a count of colors on screen is unreliable. The key covering a node is recorded
   in the answer key; the miscount was not part of the answer and changes no grade.
5. Severity 1, wording. Nothing on screen says the binding changes only the look and not the
   data; the participant guessed it from "style layer" (wrap-up).

No build defect beyond what the answer key already records was seen on this route, so no repro
was made.

## What worked

- "Open a file" on the landing page, the preview table showing `role` with its three values, and
  Load brought the file in with no detour (`02.png`, `03.png`).
- Once found, the binding was two clicks: the link icon and "role, 3 values" in a list that gave
  each column's value count (`07.png`).
- The key "Color: role" opened by itself with all three values and colors, and is what the
  participant read the board's color from (`08.png`).
