# Grade: session r2-s53 -- Dana (supply chain risk analyst), circles of characters, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (08.png),
the transcript and 06.png-07.png. No files were downloaded (the task asks for none).

## Grade: S (success)

- **Success definition met.** A community run (Louvain, shown as "Communities") finished. 08.png
  shows the left panel "Communities 6" with Group 1 (20) at the top, and the right panel for
  Group 1: Summary "Size 20, Made by Communities", Members "First 10": MlleBaptistine,
  MmeMagloire, Valjean, Labarre, Marguerite, MmeDeR, Isabeau, Gervais, Fauchelevent, Bamatabois.
  Dana's answer -- 6 groups, the largest Group 1 with 20, members Valjean, Fauchelevent and
  Marguerite -- matches the screen on every part, and every name was on screen before she stated it.
- **Why S:** no wrong turns, and fewer steps than the success path. Reading Group 1's Style tab
  first (07.png) and then going to Values is on the path, as the answer key says.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

|                                           | This session                                                                                                         | Reference                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Steps (real.mjs commands after the start) | 7 commands, 8 actions: decline the usage card, open the sample, Analyze, type "group", Louvain, Run, Group 1, Values | 9 steps on this build (path plus a Values click after each row) |
| Wrong turns                               | 0                                                                                                                    | --                                                              |

Dana skipped selecting the Communities run row; she read the group count and sizes straight from
the left-panel list (06.png), which shows the same numbers.

## False "done"

None. Each claim ("six circles", "largest is Group 1 with 20", "part three done") was true of the
screen when made (06.png, 08.png).

## Problems

Severity 0-4 (Nielsen). One participant each, so none is confirmed. No build defect was found, so
no repro script was needed.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                                    | Evidence                              |
| --- | --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | 2   | behavior      | Clicking a group row opens its Style tab (a fill color, E69F00) instead of who is in it; the member list is one more click away on Values. Dana: "why would clicking a group open its paint color? I expected a member list."                                                                                                                                              | Step 7, 07.png; step 8, 08.png        |
| 2   | 2   | behavior      | The Members list stops at "First 10" of a 20-member group with no visible way to see the rest. The Size row selects the whole group when clicked, but nothing says so. Dana: "for a report I would need the full list, and an export." The cap is in the app (`graphty/src/workspace/inspector/RunValues.tsx`, the Members section slices to 10 and offers no "show all"). | Step 8, 08.png                        |
| 3   | 1   | opinion       | Nothing on the graph screen points to finding groups: the Analyze list opens on rankings (Degree, Betweenness, Katz, HITS), and Dana reached "Find groups" only by guessing the word "group" for the filter. The bottom-left hint naming the flask as Analyze is what got her there.                                                                                       | Steps 2-4, 02.png, 03.png, 04.png     |
| 4   | 1   | opinion       | Seven grouping methods with no reason to choose one over another; "Resolution" is unexplained; nothing says whether a rerun gives the same groups. "Start here" on Louvain carried her past it.                                                                                                                                                                            | Steps 4-5, 04.png, 05.png             |
| 5   | 1   | behavior      | The floating color key at the top left of the drawing covers part of the network, and no dot carries a name, so the drawing itself cannot answer "who is in the biggest group".                                                                                                                                                                                            | Step 6, 06.png; 08.png                |
| 6   | 1   | accessibility | Small gray description text (sample descriptions, analysis one-liners) is hard to read; Dana "had to lean in". Not measured; held one level down as a single report.                                                                                                                                                                                                       | Steps 1, 3, 4, 01.png, 03.png, 04.png |

## Ease and verdict (from the transcript, not graded)

Dana rated it 6 of 7. Her verdict: the grouping was quick and the group table readable; the open
question is whether it means anything on her own supplier data.
