Grade: S
False done: no
Wrong turns: 1

# Grade: r1-s36 (task T43 B, persona Nadia)

Participant model: claude-opus-5-5 (the participant log records Opus in all 48 model entries, not
Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (19 tool calls) and lists no file opened
outside its own folder. No downloads or saved files.
Merged: no (opened from the empty start page's "Open a file"; the top bar reads "sources").

## Against the success definition

T43 B asks for `sources.graphml` opened, node size following `donations` for every node, larger
for more, and the person who gave the most named from the screen.

- Size: bound on Everything, the stack that counts for S. `styles.json`: layer "Everything"
  (`everything_2`) encodes `node.size` by `data.donations`, linear, range 1 to 3, matched 24,
  painted `node.size` 24. The Size box shows the chip "donations" with "From 1 to 3" (`08.png`),
  and the key over the drawing reads "Size: donations, 0 to 250,000" (`key.json`, `08.png`,
  `09.png`).
- Every node, larger for more: the binding covers all 24 nodes on the base layer; no other layer
  sets a size (the only other layers made are the Selected and Hovered state layers). The drawing
  shows one dot clearly largest and the rest graded (`08.png`).
- The answer: the participant clicked the largest dot and read the inspector: id s01, name Harlan
  Development, kind company, donations 250,000 (`09.png`). Harlan Development is the answer, read
  from the screen. The participant had also seen 250,000 for Harlan in the read-the-file preview
  before Load and checked the size picker's top end against it.
- Final screen (`09.png`): sizes vary by donations, the key reads "Size: donations", the
  inspector shows Harlan Development with 250,000, the dot ringed in yellow. `key.json` draws all
  24 nodes `#6366f1` and the 59 ties `#a9a9a9`.

## Steps

9 steps against the key's 6. Start (1), "Open a file" with the file (2), Load (3), the right
panel's Style tab (4, the wrong turn: it styles the canvas, not the nodes), Everything (5), a hover
over the link icon to read its tooltip (6, a check, not a wrong turn), "Node size by attribute"
(7), donations (8), a click on the largest dot (9).

## Problems

1. Severity 2, behavior. With the graph open and nothing picked, the right panel's Style tab
   holds only canvas settings (background, lighting, labels); nothing there says that node size
   lives on the layers at the left. The participant took that tab first looking for a size
   setting and found the way on only by guessing that "Everything 24" meant the dots (step 4,
   `04.png`).
2. Severity 1, wording. The control that sizes by a column is a bare chain-link icon beside Size,
   named only by its tooltip "Node size by attribute"; the participant hovered it before trusting
   it (steps 6-7, `06.png`, `07.png`).
3. Severity 1, behavior. No names on the drawing: the largest dot can be named only by clicking it
   (or opening the table), so one screenshot cannot carry the answer (step 9, `08.png`).
4. Severity 1, behavior. Clicking a dot moved the view toward it, so the picture shifted under
   the pointer (step 9, `08.png` to `09.png`).
5. Severity 1, wording. After the click the layer list showed "Selected 1", and the participant
   could not tell whether the click had changed the graph or only highlighted a dot (step 9,
   `09.png`).
6. Severity 1, opinion. The read-the-file preview already lists every node with its donations,
   but cannot be sorted, so the participant could not answer from it directly (step 2, `02.png`).

No build defect: nothing here contradicts what the key says the build does, so no repro was
scripted.
