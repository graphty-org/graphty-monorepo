Grade: S
False done: no
Wrong turns: 1

# Grade: r1-s34 (task T43 B, persona Dev)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (19 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page's "Open a file"; the top bar reads "sources").

## Against the success definition

T43 B asks for `sources.graphml` opened, node size following `donations` for every node, larger
for more, and the person who gave the most named from the screen.

- Size: bound on Everything, the stack that counts for S. `styles.json`: layer "Everything"
  (`everything_2`) encodes `node.size` by `data.donations`, linear, range 1 to 3, matched 24,
  painted `node.size` 24, no value 0. The Size box shows the chip "donations" with "From 1 to 3"
  (`08.png`), and the key over the drawing reads "Size: donations, 0 to 250,000" (`key.json`,
  `08.png`, `09.png`).
- Every node, larger for more: the binding covers all 24 nodes on the base layer; no other layer
  sets a size. The drawing shows one dot clearly largest and the rest graded (`08.png`).
- The answer: the participant clicked the largest dot and read the inspector: id s01, name Harlan
  Development, kind company, donations 250,000 (`09.png`). Harlan Development is the answer, read
  from the screen. The participant also checked it against the key's top end, 250,000.
- Final screen (`09.png`): sizes vary by donations, the key reads "Size: donations", the
  inspector shows Harlan Development with 250,000. `key.json` draws all 24 nodes `#6366f1` and the
  59 ties `#a9a9a9`, as before.

## Steps

8 steps against the key's 6. Open a file with the file (1), Load (2), the right panel's Style tab
(3, the wrong turn: it styles the canvas, not the nodes, `04.png`), Everything (4), a hover over
the link icon to read its tooltip (5, a check, not a wrong turn), "Node size by attribute" (6),
donations (7), a click on the largest dot (8).

## Problems

1. Severity 2, behavior. With the graph open and nothing picked, the right panel's Style tab
   holds only canvas settings (background, lighting, outline width, labels); nothing there says
   that node size, shape or color live on the layers at the left. The participant, looking for a
   "Ranking" or size control, took the tab first and found the way on by guessing that
   "Everything 24" meant all the nodes (step 3, `04.png`).
2. Severity 1, wording. The control that sizes by a column is a bare chain-link icon beside Size,
   named only by its tooltip "Node size by attribute"; the participant hovered it before trusting
   it (steps 5-6, `05.png`, `06.png`).
3. Severity 1, wording. "From 1 to 3" under the donations chip gives no unit or reference, and the
   participant could not tell what 1 and 3 mean (step 7, `08.png`).
4. Severity 1, behavior. No names on the drawing: the largest dot can be named only by clicking it
   (or opening the table), and a figure for a report would need labels turned on separately
   (step 8, `08.png`).
5. Severity 1, behavior. Clicking a dot moved and zoomed the view toward it, which the participant
   did not expect (step 8, `08.png` to `09.png`).

No build defect: nothing here contradicts what the key says the build does, so no repro was
scripted.
