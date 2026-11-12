# Grade: session r3-s54 -- Dev (history student, first graph tool), T2 "Something to try it on"

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (10.png), the transcript and one scripted re-run on
the same build. No files were saved, and none were needed. Not from the participant's rating (6 of 7).

## Grade: S (success)

- **Sample drawn.** Step 4 (04.png): one click on the "Florentine families" card drew 15 dots and
  20 lines. The title bar reads "Florentine families". The Overview reads Nodes 15, Edges 20,
  Components 1. The drawing is still on screen in 10.png.
- **Said what it is, matching the card and the Overview.** "Marriages between 15 leading families
  of Renaissance Florence, 20 marriage ties, all in one connected piece." This matches the card's
  description ("marriages between the leading families of Renaissance Florence") and the Overview
  (15, 20, 1 component). The extra claim, "the Medici, with 6 ties, the most of any family", matches
  06.png (Degree 6) and the Overview's range "1 to 6".
- **No detour** on the success path: no file chooser, no cancelled dialog.
- **Measure, not graded -- "change it later":** right and checked on screen. After "No thanks"
  she read "Usage data stays off. Change this in Settings > Privacy" (03.png), then went to Main
  menu > Settings... > Privacy (07.png-09.png) and found the "Share usage data" switch, off.
- **Build-decided:** no. **Void:** no. The tool did nothing a person could not.
- **Failure codes:** none.

## Counts

|                                              | This session                                                  | Reference           |
| -------------------------------------------- | ------------------------------------------------------------- | ------------------- |
| Commands to the success state (sample drawn) | 3 (What is collected, No thanks, Florentine families), step 4 | 1 (open any sample) |
| Commands in all                              | 9                                                             | --                  |
| Wrong turns                                  | 1                                                             | 0                   |

- **The wrong turn:** the hover over the middle dot at step 5 (05.png). She expected a name and
  nothing appeared. She clicked instead at step 6, which worked.
- **Not counted as wrong turns:** reading "What is collected" and answering the usage card
  (steps 2-3); clicking the Medici dot to identify it (step 6); the Settings > Privacy check
  (steps 7-10), which answers the task's "change it later" measure.

## False "done"

None. Every claim in the debrief matches the screen: 15 families and 20 ties (Overview, 04.png),
one connected piece (Components 1), Medici with 6 ties (06.png, Degree 6; "1 to 6" range), and the
privacy route (09.png).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects were
reproduced by `rounds/round-3/repro/r3-s54/repro.sh` (output in `run/` and `run.log`), the same on
every run.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                 | Evidence                                                                                                                                          |
| --- | --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | The Overview's direction row shows only a value, "Undirected, from the file: directed 0", with no label. The text runs to the panel's right edge. She could not tell what "directed 0" counts ("Zero what? It reads like a typo"). Also seen in other round 3 sessions. | Step 4, 04.png. Repro: `run/03.png`, the same unlabeled row reaching the edge.                                                                    |
| 2   | 2   | behavior     | The sample draws with no names on the dots, and hovering a dot shows nothing, so she could not tell which family was which until she clicked one. Her tutorial picture had labels. Also seen in another participant on the same sample (the Medici hover).              | Steps 4-6: 04.png against 05.png, identical; the tool reports `node with id "Medici"`, `tooltip: null`. Repro: step 5, `run/05.png`, same result. |
| 3   | 1   | build-defect | The row label "Edges per n..." is cut off, so its value "1 to 6, mean 2.667" has no readable name. Hovering the row shows nothing (the full name "Edges per node" exists only for assistive technology and on the inner text).                                          | Step 4, 04.png. Repro: `run/03.png`; step 4 hover gives `tooltip: null`.                                                                          |
| 4   | 1   | behavior     | The line "Change this in Settings > Privacy" goes away once a sample opens. She read it in time, but a reader who skipped it would have to search the menu. The route was easy to find anyway.                                                                          | 03.png against 04.png; debrief.                                                                                                                   |
| 5   | 1   | opinion      | "A replay of each session" in "What is collected" put her off sharing. She wanted one sentence on what a replay shows.                                                                                                                                                  | Step 2, 02.png; debrief.                                                                                                                          |

**What worked:** samples on the first screen with one-line descriptions she could match to her
own homework; one click drew the graph; the Overview's counts gave her the size at a glance;
clicking a dot showed its name and degree; the usage card's confirmation named the exact route,
and Settings > Privacy was where it said.
