# Grade: session r3-s36 -- Elena (first-time graph user), "What did I get?", Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
session at 1440 x 900. Graded from the last screenshot (08.png), the transcript and the earlier
screenshots it cites, plus one scripted re-run on the same build. No files were saved (the task
saves none). Not from the participant's rating (6 of 7).

## Grade: SD (success with difficulty)

All four answers are right and each was read off the screen:

1. **77 characters.** The sample card on the start page (01.png) and Overview "Nodes 77" (02.png).
2. **254 connections.** Overview "Edges 254" (02.png), repeated in the Data panel's source row
   "77 nodes, 254 edges" (03.png, 08.png).
3. **One component, so every character can be reached.** Overview "Components 1" (02.png). She
   answered "everyone can reach everyone", which is right, but said it was "a guess at the word;
   nothing confirmed it". Hovering "Components" showed nothing (04.png, 05.png). The answer stands
   because it is correct and drawn from the right figure; the guess is why the grade is SD and not
   S.
4. **Recorded facts.** Data > Attributes lists `id` and `name` under Nodes and `shared_chapters`
   under Edges (03.png, still on screen in 08.png). She named all three. She also opened
   `shared_chapters` and read "From the file", "Has a value 100%", "Range 1 to 31" (08.png).

- **Build-decided:** no.
- **Void:** no. At step 4 the tool reported that "Components" matched two things and hovered the
  first; she then hovered by position. Nothing a person could not do.
- **Failure codes:** none.

## Counts

| | This session | Reference |
|---|---|---|
| Actions (real.mjs, after the start) | 8 (7 clicks or hovers plus "No thanks") | 2-3 |
| Wrong turns | 2 | -- |

- **Wrong turn 1 (step 4, 04.png, 05.png):** two hovers on "Components" looking for a definition.
  Nothing appeared and she abandoned it.
- **Wrong turn 2 (step 6, 07.png):** a click aimed at a hairline edge to read one connection's
  `shared_chapters` value. It landed on empty canvas and deselected Valjean. She abandoned it and
  used the Attributes list instead.
- **Exploration (not counted):** clicking Valjean (step 5, 06.png) to see one character's values,
  and opening `shared_chapters` (step 7, 08.png). Both confirmed answers she already had.
- "No thanks" on the usage card (step 2) is part of the path, not a detour.

## False "done"

None. Her "I'm done" at step 7 matches 08.png: every answer she gave is on the screen she had seen.

One wrong belief is not a "done" claim and is recorded as problem 5: in the wrap-up she says the
cut-off "Edges per ..." row does not show the rest on hover. She never hovered that row; the re-run
shows its tooltip reads "Edges per node".

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. All are seen in this one
participant, so none is confirmed yet. The re-run is `rounds/round-3/repro/r3-s36/repro.sh` (output
in `run/` and `run.log`); it found no build defect.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | "Components 1" is the only on-screen answer to "can everyone reach everyone?", and a first-time user cannot tell what it means. It has no tooltip or plain-words version. She answered right by guessing and said she could not defend it. A user who guesses the other way reports a wrong result. | Step 2 (02.png), step 4 (04.png, 05.png: "tooltip: null"); repro step 4 shows no "Components" explanation. |
| 2 | 2 | wording | "Undirected, from the file: directed 0" cannot be parsed: she could not tell whether the graph is directed or what the zero counts. The line also runs to the panel's right edge with no margin. | Step 2, 02.png. |
| 3 | 2 | behavior | One connection cannot practically be picked by mouse: the edges are hairlines, and a near miss lands on empty canvas and drops the current selection. She gave up on reading one edge's value. | Step 6, 07.png (Valjean deselected, panel back to Overview). |
| 4 | 1 | wording | Valjean's "Degree 36" sits beside `id` and `name` with no sign that the app computed it, while the attribute page marks `shared_chapters` "From the file". She had to infer that Degree is not in the file. | Step 5, 06.png; step 7, 08.png. |
| 5 | 1 | opinion | Truncated text: "Edges per ..." in the Overview and "Les Mis...", "Node t...", "Ed..." in the Data panel's sources. The full text exists as a hover tooltip ("Edges per node", "Les Miserables"), but nothing hints at it and she believed it was unreadable. | 02.png, 03.png; repro steps 3 and 6 (`run/03.png`, `run/06.png`, tooltips in `run.log`). |
| 6 | 0 | opinion | The start card says "characters" while the Overview says "Nodes" and "Edges"; she had to translate. "Density 0.08681" meant nothing to her. | 01.png, 02.png; wrap-up. |

**What worked:** the sample card states "77 characters" before anything is opened; one click
draws the graph and shows the counts in the Overview; the Data rail's Attributes list answers
"what is recorded" in one more click, with type icons; an attribute's own page says "From the
file", how many rows have a value and its range.
