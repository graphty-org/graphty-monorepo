# Grade: session r3-s38 -- Nadia (level-1 alert reviewer), "What did I get?", Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (09.png), the transcript and one scripted re-run on the
same build. No files were saved (no downloads folder), and none were needed. Not graded from the
participant's rating (6 of 7).

## Grade: SD (success with difficulty)

All four answers are right and each was read off the screen:

1. **Characters: 77.** "Nodes 77" in Values > Overview (03.png, still on 09.png), and "77 rows,
   77 nodes" in the Data place (05.png). Right.
2. **Connections: 254.** "Edges 254" (03.png, 09.png) and "254 rows, 254 edges" (05.png). Right.
3. **Every character can reach every other: yes.** "Components 1" (03.png, 09.png). Right, and not
   a confident wrong answer. She said she was about 85 percent sure of what "Components" means,
   because the app never says it in plain words. She backed it with the drawing, which shows no
   loose dot.
4. **Recorded facts:** `id` and `name` for characters, `shared_chapters` for connections, read
   from the Data place's Attributes list (05.png). She also confirmed "From the file" on
   `shared_chapters` (06.png). She correctly said that "Degree" on a character is worked out, not
   recorded, because it is missing from that list. Right.

It is SD, not S, because she took 8 steps where the path takes 3 (4 counting the usage card), and
she could not confirm the meaning of "Components" anywhere in the app. She answered it by
inference.

- **Steps:** 8 (No thanks; open the sample; click Valjean; Data; shared_chapters; click the empty
  canvas; hover "Components"; hover the Components row). Success path: open the sample, read the
  Overview, Data (plus dismissing the usage card).
- **Wrong turns: 2.**
  - Step 3: she clicked a node (Valjean) to find what is recorded per character. She learned
    `id` and `name` there, but the node's panel mixes them with the calculated "Degree", so she
    then had to go to Data anyway.
  - Steps 7-8: two hovers looking for an explanation of "Components". Both returned no tooltip.
  - Step 5 (shared_chapters) and step 6 (back to the Overview) were checks on the path, not wrong
    turns.
- **False "done": none.** She said she was finished (end of step 8 and the debrief). Every answer
  she gave matches the screen, and she stated her doubt about "Components" honestly instead of
  claiming certainty. `truth_on_screen` does not apply.
- **Build-decided:** no. The defects below slowed her but did not change any answer.
- **Void:** no. The tool reported "ambiguous" on the step 7 hover and took the first match; a
  person hovering the word gets the same result (re-run step 4).

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | "Components 1" is the only place the app answers "can everyone reach everyone", and it is a technical word with no plain wording and no tooltip. The participant answered by guessing the word's meaning (85 percent sure) and by looking at the drawing. | Steps 2, 7, 8 (03.png, 08.png, 09.png): both hovers print `tooltip: null`. Reproduced: repro step 4, `tooltip: null` on group "Components 1". |
| 2 | 2 | build-defect | The direction row in the Overview shows only its value, "Undirected, from the file: directed 0", with no label. The value runs to the panel's right edge, and the participant could not tell what "directed 0" counts. | Step 2 (03.png) and 09.png. Reproduced: repro 03.png, the same row with no label. |
| 3 | 1 | build-defect | Labels are cut off with no way to read them in full: "Edges per ..." in the Overview, and "Node t..." and "Ed..." for the two tables under Sources in the Data place. Hovering the cut label shows nothing. The participant guessed "edges per node" and "node table / edge table". | Steps 2 and 4 (03.png, 05.png). Reproduced: repro step 5, hover "Edges per" gives `tooltip: null` (the full text "Edges per node" exists only for assistive technology); repro 06.png shows "Node t..." and "Ed...". |
| 4 | 2 | behavior | A node's Values list "Degree" directly under `id` and `name`, styled the same, with no sign that one is calculated and the others come from the file. The attribute page says "From the file", but the node's panel does not. The participant had to infer the difference by checking what was missing from the Data list. | Step 3 (04.png) against step 5 (06.png). |
| 5 | 0 | opinion | `id` and `name` both read "Valjean", which made her wonder if she was missing something. This is how the dataset is, not the app. Held one level down as an opinion. | Step 3 (04.png). |

## Repro

`design/ui/studio/rounds/round-3/repro/r3-s38/repro.sh` (output in `run/` and `run.log` beside it)
opens the sample, hovers the Components row and "Edges per", then opens Data. On build
b7590f8de22b (graphty 0.8.53) it shows: no tooltip on either hover, the unlabeled direction row,
the cut "Edges per ...", and the cut "Node t..." and "Ed..." source names.
