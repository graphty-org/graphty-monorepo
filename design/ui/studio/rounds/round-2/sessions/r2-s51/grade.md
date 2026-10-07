# Grade: session r2-s51 -- Dana (supply chain risk analyst), T7 "Who matters most", prompt B (running club, friends.csv)

Build 4a7a1a7fbdba (graphty@0.8.53), 1440 x 900, no screen reader.

## Result

**Grade: S (success).**

- **Ranking run from Analyze:** Betweenness, run from the Analyze menu (02.png, 03.png, 04.png).
  Betweenness is one of the rankings the task accepts.
- **Top three, in the order the app shows them:** the Top 10 on the run's Values tab (06.png) lists
  Ava 51.27, Ivan 40.02, Sana 21.35. The reference values for Betweenness ("Bridges") on friends.csv
  are the same: Ava 51.27, Ivan 40.02, Sana 21.35. The participant stated Ava, Ivan, Sana in that
  order.
- **Measure named:** "Betweenness", which also appears on screen in the run's "Made with -- Analysis
  Betweenness" line (06.png). The on-screen run name "Bridges" was noticed as well.
- **Names on screen before stated:** yes, 06.png shows all three names before the participant
  states them.
- Read from the Top 10 itself, not a sorted table, with no detour, so this is S rather than SD.

The last screenshot (06.png) shows the Bridges run selected, its Values tab open, and the Top 10
with the three names and values the participant reported. No files were saved, and the task does
not need any.

## Claims

**False "done": no.** The single "Done" claim (step 6) was made while 06.png showed the Top 10 it
quotes. truth_on_screen does not apply.

## Steps and wrong turns

- **Steps: 5** after setup: Analyze, Betweenness, Run, the "Bridges" row, the Values tab. The
  success path for round 2's build is 7 steps (it also counts opening the sample, already done by
  setup here, and typing a filter into the menu, which this participant did not need).
- **Wrong turns: 0.** Opening the run row on its Style tab and then going to Values is on the path
  for this build, not a wrong turn.

## Problems

| # | Severity | Kind | Where | What | Evidence |
|---|---|---|---|---|---|
| 1 | 2 | behavior | Run result, right panel | After Run, the drawing shows only shades of orange with no names, and nothing points to where the ranked list is. The list is two clicks away (the run row, then Values), and selecting the row opens Style first. The Graph panel was on Values before (04.png), but selecting the run switched it to Style (05.png). The participant found the list but said "nothing pointed me to it". | Step 4 (04.png), step 5 (05.png) |
| 2 | 1 | wording | Left panel run row, legend | The participant ran "Betweenness", but the result came back named "Bridges". They briefly thought they had run the wrong thing, until the "Made with: Betweenness" line at the bottom of Values settled it. | Step 4 (04.png), step 6 (06.png) |
| 3 | 1 | opinion | Analyze menu | The "Start here" tag on PageRank pulls toward a measure the participant felt did not fit "how much the club depends on them". They nearly clicked it out of trust in the tag. This is opinion only, so its severity is held one level down. | Step 2 (02.png) |
| 4 | 1 | accessibility | Analyze menu subtitles; Values summary line | The descriptions under each analysis and the "20 of 20 have a value ..." line are small, low-contrast gray text. The participant had to lean in to read them. | Step 2 (02.png), step 6 (06.png) |
| 5 | 1 | wording | Values tab | The values (51.27, 40.02) have no explanation of what the number means. That is enough for a ranking, but the participant could not explain it to someone else. | Step 6 (06.png) |

No build defect was seen. Every control the participant used did what it said, and the values
match the reference, so no repro script was needed.

## Failure codes

None.
