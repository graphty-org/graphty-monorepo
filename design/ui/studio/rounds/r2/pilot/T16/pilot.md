# Pilot: First look (friends.csv)

Build under study: commit b7590f8de, graphty 0.8.53, no uncommitted changes, opened empty at
`/?next`, 1440 x 900. This task has no success path and no grade. The pilot walked the likely
newcomer route: decline the usage card, open their own file, run the analysis marked "Start here",
read who came out on top, then put names on the drawing.

## Recorded measures

| Measure                           | Value                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usage card                        | Declined ("No thanks"); a one-line note "Usage data stays off. Change this in Settings > Privacy" replaced it (02.png)                                                                                                                                                    |
| Data used                         | friends.csv, not a sample                                                                                                                                                                                                                                                 |
| Steps from start to first drawing | 2 (No thanks; Open project or file... with the upload). 1 if the card is ignored                                                                                                                                                                                          |
| Analysis run without being asked  | Yes: PageRank, marked "Start here" in Analyze (04.png), run with its default damping 0.85 and Weight None (05-06.png). The run is now named "PageRank" everywhere: the key "Color: PageRank", the list row, the node's Results line                                       |
| Result read correctly             | Yes. Top 10: Farah 0.06608, Ava 0.06423, Hana 0.05883 (09.png); range 0.04382 to 0.06608 in the key (06.png) and the value strip (09.png). All equal the reference values. Ava reads "0.06423, #2 of 20", degree 6 (07.png); Farah "0.06608, #1 of 20", degree 4 (10.png) |
| Names on the drawing              | Not by default. Reachable in 3 steps: Everything, the "+" beside Label ("Add label line"), "id" (11-13.png). Then "20 labels, 1 hidden" with a "Show all labels" box; ticking it reads "20 labels" and draws the hidden one, Chloe (14.png)                               |
| Verdict a newcomer could reach    | Probably "keep using it": the file drew at once, the overview (20 nodes, 41 edges, Directed, 1 component) is right, the ranking is easy to read and names can be added. The likely reason against is unchanged: the first drawing shows no names                          |

## Step by step

1. 01.png: the empty start page: Start, Recent projects, four samples, the usage card.
2. 02.png: "No thanks"; the card becomes a one-line note.
3. 03.png: friends.csv opened. 20 nodes and 41 arrows; Overview says 20 nodes, 41 edges,
   Directed, density 0.1079, 1 component, 3 to 6 edges per node (mean 4.1). No names drawn. The
   same two pairs overlap at the bottom as on the previous build (about 568,758 / 583,753 and
   716,744 / 734,744): the layout is the same drawing on every load.
4. 04.png: Shift+A opens Analyze; PageRank carries "Start here".
5. 05.png: PageRank's form: Damping factor 0.85, Weight None, Advanced, "Under a second", Run.
6. 06.png: Run. Nodes on an orange scale, key "Color: PageRank 0.04382 to 0.06608", a
   "PageRank 20" row in the list. No "drawing is still moving" report.
7. 07.png: clicking the darkest node in the middle (640,578): Ava, PageRank 0.06423, #2 of 20,
   Degree 6.
8. 08.png: selecting the PageRank row opens it on its Style tab (Color bound to PageRank).
9. 09.png: its Values tab: the value strip, "20 of 20 have a value, 0.04382 to 0.06608, median
   0.04736", Top 10 (Farah, Ava, Hana, Ivan, Gus, Jada, Theo, Sana, Ravi, Quinn), Made with
   (PageRank, Oct 7, damping 0.85, Weight None).
10. 10.png: Farah in the Top 10 selects Farah (#1 of 20, degree 4), the node at 734,744, half
    behind Chloe.
11. 11.png: Everything's Style: Label shows only a "+".
12. 12.png: the "+" ("Add label line") opens a Label pop-out: id, then PageRank, PageRank rank,
    PageRank percentile.
13. 13.png: "id": names drawn above the nodes, "20 labels, 1 hidden", an unticked "Show all
    labels" box. Chloe (716,744) is the one hidden, beside Farah.
14. 14.png: "Show all labels" ticked: "20 labels"; Chloe's name is drawn, touching Farah's
    ("ChloeFarah" reads as one word).
15. 15.png: clicking the node at 716,744 confirms it is Chloe (PageRank 0.04534, #18 of 20).

No script errors, console errors or failed requests were printed in the session.

## Findings

1. **friends.csv still draws with no names on screen** (03.png through 12.png). The names are
   the `id` column and the app titles each node by it, but the first drawing shows 20 anonymous
   balls. Names are now 3 steps away and every one can be shown, which is better than before, but
   a newcomer has to think of the Label row under Everything. Whether to draw names by default is
   a presentation choice, so it is the app's. The most likely reason a newcomer says "not useful".
2. **The top-ranked node is half hidden** (10.png): Farah, #1, sits behind Chloe; with all labels
   shown their names run together (14.png). Eli and Dev overlap the same way at 568,758. The
   drawing is the same on every load, so every participant meets this overlap. A layout overlap;
   minor.
3. **Names are drawn across arrows** (13-14.png): Sara, Theo, Ben and Dev each have an arrow
   running through the label text. Minor legibility.
4. **Two names now give "ambiguous" in the tool** (08.png, 14.png): "PageRank" matches the list
   row and the node summary's "Summary values" group; "Show all labels" matches the checkbox
   and its label. The first match was the intended one both times, so no step went wrong.

## End state

Reached: data drawn in 2 steps, an analysis run unprompted, its result read correctly against the
reference values, and names put on the drawing in 3 more steps. Nothing blocks the task. Finding 1
remains the one most likely to change the verdict.
