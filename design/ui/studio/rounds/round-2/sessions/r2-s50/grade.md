# Grade: session r2-s50 -- Dev (class-project student), who matters most, running club (friends.csv)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). The setup opened `friends.csv` before the
first step. Graded from the last screenshot (07.png) and the transcript. No files were downloaded
(the task asks for none).

## Grade: S (success)

- **Success definition met.** A ranking was run from Analyze (Betweenness, step 5), and the last
  screenshot shows its Top 10 on the result's Values tab: Ava 51.27, Ivan 40.02, Sana 21.35. That
  matches the reference for Betweenness ("Bridges") on friends.csv exactly. Dev stated the top three
  in that order after they appeared on screen (07.png), and named the measure both by its method
  ("betweenness centrality") and by its on-screen name ("Bridges"), with "Made with: Analysis
  Betweenness" visible in the same screenshot.
- **Why S, not SD:** one wrong turn (a look inside Advanced that changed nothing), the answer was
  read from the Top 10 (the success path's place), and no tooltip or help was needed.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

|                  | This session                                                                   | Reference                                                                 |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Steps (real.mjs) | 6 after the start (flask, Betweenness, Advanced, Run, Bridges row, Values tab) | 6 from the setup start (Analyze, type, pick, Run, result row, Values tab) |
| Wrong turns      | 1                                                                              | --                                                                        |

Wrong turn:

1. Step 4 (04.png): opened "Advanced" in the Betweenness form looking for a directed/undirected
   choice; it holds only "Sample size: 0". Abandoned; Run pressed next.

Dev picked Betweenness straight from the list instead of typing a name, which saved the typing
step, so the session matched the reference count despite the detour.

## False "done"

None. Dev's closing claim (top three Ava, Ivan, Sana by betweenness) is exactly what 07.png shows.

## Problems

Severity 0-4 (Nielsen); an opinion-only finding is held one level down. Each is seen in this one
session; confirmation needs a second participant. None is a build defect (no crash, no control that
does nothing, no wrong count), so no repro script was written.

| #   | Sev | Kind     | Problem                                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                              |
| --- | --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2   | behavior | A who-knows-whom list is loaded as Directed, and nothing near the ranking says whether direction was used or offers to change it. Dev's course tutorial says to set "Undirected"; he looked for it in the Analyze form's Advanced, found nothing, and left unsure whether his numbers would change. The answer is right for the build as computed, but a student cannot tell whether it is right for his data. | Steps 3-4, 01.png and 05.png (Overview: "Direction Directed"), 04.png (Advanced: only "Sample size"). |
| 2   | 2   | wording  | The run is chosen as "Betweenness" but named "Bridges" everywhere afterward (legend, left row, panel title). Dev briefly thought he had run the wrong thing; only "Made with: Analysis Betweenness" at the foot of Values confirmed it.                                                                                                                                                                        | Steps 5-7, 05.png, 06.png, 07.png.                                                                    |
| 3   | 2   | behavior | Selecting the result row opens its Style tab; the ranked list is on the second tab, Values. Dev found it only because "Values sounded like numbers".                                                                                                                                                                                                                                                           | Steps 6-7, 06.png, 07.png.                                                                            |
| 4   | 1   | opinion  | PageRank carries a "Start here" tag right below Betweenness in the ranking list. Dev ignored it because his slides name betweenness for "who the network depends on", but said a student without the slides would follow the tag and get a different order (PageRank's top three on this file are Farah, Ava, Hana).                                                                                           | Step 2, 02.png.                                                                                       |
| 5   | 1   | wording  | "Sample size" in Betweenness's Advanced, set to 0, has no explanation; Dev did not know what it does and left it.                                                                                                                                                                                                                                                                                              | Step 4, 04.png.                                                                                       |
| 6   | 0   | opinion  | After the run the drawing has colors but no names, so the darkest dot cannot be matched to Ava without the list. Not needed for this task.                                                                                                                                                                                                                                                                     | Step 5, 05.png.                                                                                       |
