# Grade: session r1-s37b -- Nadia, who matters most in the running club (friends.csv)

- **Grade:** S (success)
- **Failure codes:** none
- **False "done":** no. Nadia's answer (Farah 0.06608, Ava 0.06423, Hana 0.05883, ordered by
  "Influence", from PageRank) matches the Top 10 on the last screenshot (06.png) word for word.
- **Steps:** 6 actions to the success state (first look, hover the flask, open Analyze, PageRank,
  Run, the Influence row), against a path of 6. The hover only confirmed the tooltip; it is not a
  detour.
- **Wrong turns:** 0.
- **Ease (from the transcript):** 3 of 7.
- **Silent commits:** none. Run colored the drawing and added the Influence row at once (05.png).
- **Tool prints:** none; session.log is empty. The 20-minute wait for a browser slot before the
  first screenshot is the tool, not the app.

## Why S

The task asks for a ranking run from Analyze, the top three in the order the app shows, matching
the reference values, and the measure named. The last screenshot (06.png) shows the Influence run
selected, its Values tab with "20 of 20 have a value, 0.04382 to 0.06608" and a Top 10 headed by
Farah 0.06608, Ava 0.06423, Hana 0.05883 -- the reference values for PageRank on friends.csv. Nadia
named the measure both ways ("Influence", "after I ran PageRank"). The names were on screen before
she stated them. She took the shortest path with no detour, so the hesitation at the list of
measures (step 3) does not lower the grade to SD.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---------|----------|------|----------|
| 1 | The Analyze list does not help choose a measure for the question being asked ("how much the whole club depends on them"). Nadia read Betweenness as the closer fit, then picked PageRank only because it carries "Start here", and said she could not defend the choice. The answer was accepted, but she leaves unable to explain it. | 2 | behavior | Step 3, 03.png; "If the program says start here, I start here." Debrief: "If QA asked me why PageRank and not Betweenness, I couldn't defend it." |
| 2 | After Run, the drawing changes color but nothing points to the ranked list, and the dots carry no names, so the picture alone cannot answer "who". She found the list only by guessing that the new left row was clickable. | 2 | behavior | Step 5, 05.png (right panel still shows the Graph Overview; no names on dots); debrief "nothing told me where the ranked list was". |
| 3 | The method she chose disappears by name: she clicked "PageRank" and every later place says "Influence" -- the legend, the left row, the panel header "Measure from Influence", and even "Made with: Analysis Influence", where the analysis was PageRank. Notes that say "PageRank" cannot be matched to anything on screen later. | 2 | wording | Steps 5-6, 05.png legend "Color: Influence", 06.png "Made with / Analysis: Influence". |
| 4 | "Damping factor" on the PageRank card and in Made with is unexplained jargon; she left it at 0.85 without knowing what it does. It did not block her. | 1 | wording | Step 4, 04.png; 06.png "Damping Factor 0.85". |

No build defect was found: every control she used did what it said, and the counts and values on
screen match the reference values, so no scripted repro was needed.
