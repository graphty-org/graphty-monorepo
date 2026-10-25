Grade: S
False done: no
Wrong turns: 0
Route: around
Token: not touched, the Louvain folder and the group layers were never opened, so no field showing the purple "Layer" token was on screen; every group kept its color

# Grade: r1-s17 (task T47 A, persona Alex)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (27 tool calls) and lists no file opened
outside its own folder.

## Against the success definition

T47 A asks for the Les Miserables sample, the program's own circles each in its own color, then
every circle's characters drawn as cubes with each circle's color kept.

- Last screenshot `14.png`: Les Miserables, the Everything layer selected, Style tab, Shape line
  "Box". Every node on the drawing is a cube, in six colors. The key still reads "Color: Louvain
  -- Group 1 ... Group 6", unchanged from `09.png`.
- `styles.json`: the six group layers made by the Louvain run (`results.louvain.group`) each set
  only `node.color` and paint 20, 17, 11, 11, 10 and 8 nodes (77 in all), the answer key's
  reference sizes for Louvain on Les Miserables. The Everything node layer sets `node.shape`
  `box`, painted 77 of 77; its color is covered by the group layers (painted 0).
- `key.json` drawn: six node colors with exactly those counts; `styles-steps.jsonl` shows the
  same six colors from the run (`09.png`) through `14.png`, so no circle's color changed.
- The clusters are the program's (a Louvain run). The shape was set on the Everything layer, not
  on the run's folder or on several group layers: the group layers write only color, so the base
  layer's shape shows. That is a success by the key's `Route: around`; the bulk edit was not
  used, so this session does not count toward the folder-or-several share of bar 1 or toward
  question 3.

## Steps and wrong turns

Participant: 10 steps from `01.png` to `14.png` (Samples, the Les Miserables card, Analyze,
`commun` typed in the filter, Louvain, Run, Everything, open the Shape list, scroll the list up,
Box). The key's folder path is 11 steps; this route skips Shape "+" and Shape because Everything
already shows a Shape line, and adds one scroll. Not counted: a first click on "Samples" the tool
refused as ambiguous (two controls share the name; nothing happened, `02.png`), a hover over the
flask to read its tooltip (`05.png`), and a click on an option named "Cube" that found nothing
(`12.png`, nothing changed).

Wrong turns: 0. Nothing was set and then undone or abandoned.

False done: no. The participant said done on `14.png`, and the screen, the key and the style
tree agree.

## Problems

1. **The Shape list opens scrolled to the current value, with Box out of view above.**
   Severity 2, kind: behavior. Steps 10-12 (`11.png`, `13.png`): the list opens over the
   inspector scrolled to the checked Icosphere, about halfway down; its top rows, Box among them,
   sit above the fold behind a small up arrow. The participant read the visible rows, did not
   find a cube, and had to scroll up to reach Box.
2. **Nothing names a cube; the reader must guess that Box is one.** Severity 1, kind: wording.
   Steps 11-13 (`12.png`, `13.png`): the participant looked for the word "Cube" first and picked
   Box from its icon. Already in the answer key's record of this task.
3. **The run's settings hide a control behind an unlabeled gear.** Severity 1, kind:
   accessibility. Step 7 (`08.png`): the Louvain card shows Resolution, Weight and a small gear
   with no visible label; the participant could not tell whether it held a seed, did not open
   it, and said he could not say whether a rerun gives the same groups.
4. **Two adjacent pairs of group colors read as close.** Severity 1, kind: opinion. Step 8
   (`09.png`): the participant found Group 2 (light blue) against Group 4 (dark blue), and Group
   1 (orange) against Group 5 (dark orange), close enough to worry about on a projector, though
   he could tell them apart on screen.
5. **Two controls are named "Samples".** Severity 1, kind: wording. Step 2 (`02.png`): the top
   bar link and the start page button share the name, so a pick by name is ambiguous. Already in
   the answer key's record of the start page.

No build defect seen, so no repro.
