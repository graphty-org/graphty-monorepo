Grade: S
False done: no
Wrong turns: 0
Route: folder

# Grade: r1-s20 (task T48 B, persona Nadia)

Participant model: claude-opus-5-5 (the participant log records Opus in every turn, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.
Leaks: none. `leaks.json` read the participant's log (34 tool calls) and lists no file opened
outside its own folder.

## Against the success definition

T48 B asks for `sources.graphml`, the program's own clusters each in its own color, the cluster
color kept only on sources who are on the record, and how many still carry a cluster color.

- Last screenshot `12.png`: the Louvain folder selected; Which nodes "12 of 24 nodes" with chips
  "Louvain: <<Layer>>" and "on_record: yes, 12 nodes"; the key "Color: Louvain" with Group 1 to 3
  and "12 of 24 nodes". The drawing shows orange, light blue and green dots, the rest indigo.
- `styles.json`: the three group layers of the Louvain run (`results.louvain.group` 0, 1, 2),
  each now `all` of its group and `data.on_record` exact `true`, each matching and painting 4
  nodes in its own color (`#e69f00`, `#56b4e9`, `#009e73`). Everything still sets `#6366F1` and
  paints 12 nodes.
- `key.json` drawn: `#6366f1` 12, `#e69f00` 4, `#56b4e9` 4, `#009e73` 4. The three cluster colors
  are the ones the run drew in `07.png` (`styles-steps.jsonl`), so no cluster's color changed, and
  the starting color (`#6366f1`, `03.png`) is the one on the other 12.
- Answer: "12 sources still have a cluster color", read from "12 of 24 nodes" on the key and on
  Which nodes, both on screen at `11.png` and `12.png`. It matches the key (12).
- Stack: one `on_record` card added on the folder's Which nodes, written to all three group
  layers: `Route: folder`.

## Steps and wrong turns

Participant: 11 steps from `01.png` to `12.png` ("Open a file" with the file, Load, Analyze,
`cluster` typed in the filter, Louvain, Run, the Louvain folder, Which nodes, "Add a condition",
`on_record`, Done). The key's path is 11 steps (`answers.md`, T48); typing `cluster` and
clicking Louvain stands in for `louvain` and Enter, the same count.

Wrong turns: 0. The filter's highlighted first hit, "Clustering coefficient", was read and passed
over without being opened (`05.png`).

False done: no. The participant said done on `12.png`, and the screen, the key and the style tree
agree.

## Problems

1. **The color key covers a colored node, so the dots cannot be counted to 12.** Severity 2,
   kind: behavior. Steps 6-11 (`07.png` to `12.png`): the key box at the top left hides one
   Group 3 node; the drawing shows 3 green dots where the style tree paints 4. The participant
   counted 11 and had to trust the number. Already in the answer key's record of this path.
2. **The analysis filter's `cluster` highlights "Clustering coefficient", a ranking, first.**
   Severity 2, kind: wording. Step 4 (`05.png`): the participant "nearly took it"; a run of it
   would have been F. Only the heading "Find groups" steered her away.
3. **The Analyze button is an unlabeled flask icon.** Severity 1, kind: wording. Step 3
   (`03.png`): the start page's demo offered "Communities" in words; inside the workspace the
   participant guessed the flask.
4. **Nothing helps choose among six grouping methods or their settings.** Severity 1, kind:
   behavior. Steps 5-6 (`05.png`, `06.png`): Louvain was picked "on faith" as the first entry;
   Resolution and Weight were left alone without knowing what they do.
5. **The new condition picks a value on its own.** Severity 1, kind: behavior. Step 10
   (`11.png`): the `on_record` card starts on Yes and the drawing changes at once; the
   participant had to check that it was not No, and said a reviewer would ask which was chosen.
6. **"Layers added later are not changed." does not say whether the data or only the look
   changed.** Severity 1, kind: wording. Steps 7-11 (`08.png` to `12.png`): the participant did
   not understand the line and assumed the edit changed only the view.

No build defect seen, so no repro.
