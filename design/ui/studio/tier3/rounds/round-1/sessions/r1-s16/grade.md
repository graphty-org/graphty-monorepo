Grade: S
False done: no
Wrong turns: 0
Route: folder
Token: not touched, the folder's Fill Color field showed "<<Layer>>" with the group swatches and was left alone; every group kept its color

# Grade: r1-s16 (task T47 B, persona Ruth)

Participant model: claude-opus-5-5 (every turn of the participant log records Opus, not Sonnet).
Build: 758b8e8081 (`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), the frozen build.

## Leak check: not a leak

`leaks.json` lists one call, "a path up out of its folder, `..`" (Bash), and a rerun of
`real.mjs --leaks` on the participant's log prints the same VOID line. The call it matched is
the participant writing its own step notes: a `cat >> <its own folder>/transcript.md <<'EOF'`
whose text says "A legend "Color: Louvain" lists Group 1 .. Group 10." The check's pattern
treats any `..` standing between spaces as a path. No call read, listed or opened anything
outside the session's own folder: the 33 calls are the briefing, `real.mjs --start` and
`--step` on its own folder, reads of its own screenshots, and appends to its own
`transcript.md`. The session is graded, not voided. The leak check's pattern should not match
`..` inside a heredoc body or other prose text.

## Against the success definition

T47 B asks for the College football sample, the program's own clusters (each its own color, not
the file's conferences), then every cluster's teams drawn as cubes with the colors kept.

- Last screenshot `16.png`: College football (115 nodes), the Louvain folder open with Group 1 to
  Group 10 (16, 15, 14, 12, 11, 10, 10, 9, 9, 9), Group 10 selected with Shape "Box" and Fill
  Color F99379. Every node on the drawing is a cube, in ten colors. The key reads "Shape: Louvain
  -- Box" above "Color: Louvain -- Group 1 ..." with "3 more below". `15.png`, the step before,
  shows the folder with "Shape: 10 changed" and Undo.
- `styles.json`: the ten group layers the Louvain run made (`results.louvain.group`), each with
  its own `node.color` and `node.shape` `box`, painted counts equal for color and shape: 16, 15,
  14, 12, 11, 10, 10, 9, 9, 9 (115). Everything still sets `icosphere` and paints 0 shapes.
- `key.json` drawn: ten node colors with exactly those counts; the key's ten colors are the
  drawn ones. `styles-steps.jsonl` shows the same ten colors from `09.png` (the run) through
  `16.png`, so no cluster's color changed.
- The clusters are a Louvain run, not the conference column; the group sizes match the answer
  key's reference values for Louvain on College football.
- Stack: the run's folder edited once (Shape "+" > Shape > Box), written to all ten group
  layers: `Route: folder`.

## Steps and wrong turns

Participant: 12 steps from `01.png` to the success state on `15.png`: Samples (the first try,
`Samples#2`, was a tool refusal and is not counted), the College football card, Analyze, `cluster`
typed in the filter, Louvain, Run, open the Louvain folder's arrow, select the folder, Shape "+",
Shape, open the list, Box. One more click (Group 10, `16.png`) checked the result after success.
The hover over the flask (`05.png`) is not a step. The key's path is 11 steps (`answers.md`,
T47); the one extra is opening the folder to read each group's count before selecting it, a
check that was kept, not a wrong turn.

Wrong turns: 0.

False done: no. The participant said done after `16.png`, and the screen, the key and the style
tree agree.

## Problems

1. **The color key scrolls once the shape entry is added, hiding three clusters.** Severity 2,
   kind: behavior. Steps 14-15 (`15.png`, `16.png`): the key shows "Shape: Louvain -- Box" and
   Groups 1 to 7 with "3 more below"; Groups 8 to 10 are out of view and the key covers the left
   edge of the drawing. Already recorded in the answer key's path for this half; seen also in
   another session of T47 B.
2. **The color key gives no count per group.** Severity 1, kind: behavior. Step 8 (`09.png`):
   the participant wanted to check that every team was in a group and could not from the key;
   the counts appear only in the layer tree once the folder is opened (`10.png`).
3. **Nothing names a cube; the reader must guess that Box is one.** Severity 1, kind: wording.
   Step 13 (`14.png`): the shape list has no "Cube"; the participant picked Box from its icon.
   The default reads "Icosphere" (`13.png`), a word the participant did not know.
4. **The "Find groups" methods show only after typing in the filter.** Severity 1, kind:
   behavior. Steps 5-6 (`06.png`, `07.png`): the analysis list opens on "Rank nodes and edges";
   the participant had to think to type `cluster` to reach the grouping methods.
5. **Louvain's Resolution has no plain description.** Severity 1, kind: wording. Step 7
   (`08.png`): the participant left Resolution 1 and Weight None alone without knowing what they
   do, and said she could not explain the choice to someone else.
6. **The purple "<<Layer>>" token reads as jargon.** Severity 1, kind: wording. Step 10
   (`11.png`): the participant understood that each group keeps its color only from the swatches
   beside the token, not from the token's word.
7. **Nothing says beforehand that the folder's Shape line reaches every group and leaves colors
   alone.** Severity 1, kind: wording. Steps 10-14 (`11.png` to `15.png`): the participant was
   unsure whether a shape set on the folder would override the colors; "Shape: 10 changed" and
   the unchanged swatches settled it only afterwards. "10 layers in Louvain" is the only hint
   before the edit.
8. **Two controls on the start page share the name "Samples".** Severity 1, kind:
   accessibility. Step 2 (`02.png`): a button and a link are both named "Samples"; the tool
   refused the ambiguous click, which is a tool event, not reader confusion, but two reachable
   controls with one accessible name are what bar 6 checks for. Recorded here for the
   accessibility walk to measure.

No build defect seen, so no repro.
