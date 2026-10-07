# Grade: session r1-s30b -- Mara, bigger dots for the families that matter (Florentine families)

- **Grade:** SD (success with difficulty)
- **Failure codes:** none
- **False "done":** no. Mara said "Done" at step 14, and 14.png shows the sizes bound: a Size
  line reading "1 to 3" on the Bridges result's Style tab, dots of visibly different size, and a
  legend with "Size: Bridges 0 to 47.5" above "Color: Bridges 0 to 47.5".
- **Steps:** 14 to the success state (start, decline the usage card, open the sample, Analyze,
  Betweenness, Run, graph Style tab, the Bridges row, its Style tab, Add to Shape, Size, hover the
  link icon, Size by attribute, Bridges), against a path of about 11 commands.
- **Wrong turns:** 1 (step 7, the whole graph's Style tab, which holds only Background, Method
  and Seed). The hover at step 12 is a tooltip check, not a wrong turn.
- **Ease (from the transcript):** 3 of 7.
- **Usage card:** declined ("No thanks"), no detour.
- **Tool prints:** no `ambiguous`, script errors or failed requests (the session log is empty).
  The start waited about 40 minutes for a free browser slot; that is queueing, not a tool fault.

## Why SD

The final screenshot (14.png) meets the success definition: a ranking run (betweenness, shown
on screen as "Bridges"), a Size line bound to that result, dots that visibly differ (the central
dot far larger, leaf families small), and the legend's "Size: Bridges" row. Mara then said what
both encodings mean from what the screen showed: bigger and darker both mean more Bridges, which
she identified as betweenness (more of the network's shortest paths pass through the family),
"both 0 to 47.5". The values she quoted (Medici 47.5, Guadagni 23.17, Albizzi 19.33) were on
screen in 08.png before she stated them. Betweenness is a ranking measure and the on-screen name
counts as naming it, so this is not the "defensible non-ranking" partial.

She got there after a detour and a correction: the graph-level Style tab (07.png) was a dead end,
and she found Size by guessing it sat under Shape (09.png to 11.png) and confirming the link
icon's meaning by its tooltip (12.png). A detour then a correction, plus a tooltip, is SD.

One caveat that does not change the grade: "Medici dominates" names the biggest dot although no
dot is labeled. She inferred it from the top value (47.5) in the ranking and the biggest dot
being the top of the size range, which is sound, but the drawing alone does not name it.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---------|----------|------|----------|
| 1 | The legend that appears after a run is drawn over the top-left of the drawing and hides a node completely. Before the run 03.png shows 15 nodes, one at about (531, 83); after the run 06.png and 14.png show 14, and only that node's edge is visible, running under the legend box. A reader counting or sizing families loses one without being told. | 3 | build-defect | Steps 6 and 14; 03.png vs 06.png and 14.png; "The legend box also sits on top of the node in the top-left corner." Reproduced on the same build (commit 452285142): `rounds/round-1/repro/r1-s30b/` (start empty, No thanks, Florentine families, Shift+A, type Betweenness, Betweenness, Run); its 03.png shows 15 nodes, its 07.png 14 with the top-left node under the legend, identical to the session. |
| 2 | The method chosen as "Betweenness" is renamed "Bridges" everywhere afterwards: the result row, the legend, the inspector heading and "Made with: Analysis Bridges". Nothing on screen links the two names, so an expert had to check the values against NetworkX to trust it was the same measure. | 2 | wording | Steps 5, 6 and 8; 05.png, 06.png, 08.png; "I chose 'Betweenness' and everything afterwards says 'Bridges', including 'Made with'." |
| 3 | The whole graph's Style tab holds only Background, layout Method and Seed; nothing points to the result row or Everything for node appearance. First place looked for node size. | 2 | behavior | Step 7; 07.png; "This is the graph's style, not node appearance. Dead end." Same dead end as session r1-s10b step 3. |
| 4 | Size is filed under "Shape", behind a plus, not beside Color where Fill lives. Found by guess. | 2 | behavior | Steps 9 to 11; 09.png to 11.png; "Size isn't listed. Probably under Shape." |
| 5 | The run card shows no parameters and does not say whether values are normalized or weighted; the expert inferred "unnormalized" only from the top value. | 1 | opinion | Step 5; 05.png; "Normalized or not? Weighted? Nothing to set." |
| 6 | Running the measure recolored every node without being asked. Expected on this build (a ranking's suggested color); noted as a surprise to a Gephi user. | 1 | opinion | Step 6; 06.png; "It colored them; I asked nothing about color." |
| 7 | The Analyze list tags PageRank "Start here", which points away from the right measure for a brokerage question. | 1 | opinion | Step 4; 04.png |
| 8 | No family names on the dots, so the drawing alone cannot say which dot is which family. Outside this task's success path. | 1 | opinion | Step 14; 14.png; debrief item 6. |
