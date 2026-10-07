# Pilot: First look (friends.csv)

Build under study: commit 452285142, graphty 0.8.53, no uncommitted changes, opened empty at
`/?next`, 1440 x 900. This task has no success path and no grade. The pilot walked the likely
newcomer route: decline the usage card, open their own file, run the analysis marked "Start here",
and look up who came out on top.

## Recorded measures

| Measure | Value |
|---|---|
| Usage card | Declined ("No thanks"); a one-line note "Usage data stays off. Change this in Settings > Privacy" replaced it (02.png) |
| Data used | friends.csv, not a sample |
| Steps from start to first drawing | 2 (No thanks; Open project or file... with the upload). 1 if the card is ignored |
| Analysis run without being asked | Yes: PageRank, marked "Start here" in Analyze (05.png), run with its default damping 0.85 (06-07.png). Shown on screen as "Influence" |
| Result read correctly | Yes. Top 10: Farah 0.06608, Ava 0.06423, Hana 0.05883 (11.png); range 0.04382 to 0.06608 in the key (07.png). All equal the reference values. Ava's node reads "0.06423, #2 of 20" (08.png), Farah's "0.06608, #1 of 20" (14.png) |
| Verdict a newcomer could reach | Probably "keep using it": the file drew at once, the overview (20 nodes, 41 edges, Directed, 1 component) is right, and the ranking is easy to read. The likely reason against: no one's name is drawn on the picture |

## Step by step

1. 01.png: the empty start page: Start, Recent projects, four samples, the usage card.
2. 02.png: "No thanks"; the card becomes a one-line note.
3. 03.png: friends.csv opened. 20 nodes and 41 arrows; Overview says 20 nodes, 41 edges,
   Directed, density 0.1079, 1 component, 3 to 6 edges per node (mean 4.1). No names are drawn on
   any node. Two pairs of nodes overlap at the bottom (about 568,758 / 583,753 and 716,744 /
   734,744).
4. 04.png: the menu button's tooltip, "Main menu: open, save, export, settings".
5. 05.png: Shift+A opens Analyze; PageRank carries "Start here".
6. 06.png: PageRank's form (damping 0.85, "Under a second", Run). No "drawing is still moving"
   report this time.
7. 07.png: Run. Nodes on an orange scale, key "Color: Influence 0.04382 to 0.06608", an
   "Influence 20" row in the list.
8. 08.png: clicking the darkest node in the middle: Ava, Influence 0.06423, #2 of 20, degree 6.
9. 09-10.png: a pilot misstep: the selector `role=button:Influence` matched the row's eye button
   (named "Hide Influence") and hid the coloring. Not something a participant would do by name.
10. 11.png: the Influence row: value strip, "20 of 20 have a value, 0.04382 to 0.06608, median
    0.04736", Top 10 (Farah first), Made with (damping 0.85).
11. 12-13.png: the eye button, now drawn as a crossed-out eye, still has the tooltip and name
    "Hide Influence" while the row is hidden; pressing it shows the coloring again (13.png).
12. 14.png: Farah in the Top 10 selects Farah (#1 of 20, degree 4), the node at about 734,744,
    half behind a neighbor.
13. 15.png: Everything's Style: Label shows only a "+"; no label is set.

No script errors, console errors or failed requests were printed in the session.

## Findings

1. **friends.csv draws with no names on screen** (03.png through 15.png). The names are the `id`
   column, and the app already titles each node by it ("Ava", "Farah"), but labels are off, so a
   newcomer sees 20 anonymous balls and must click each one. Whether to draw names by default is a
   presentation choice, so it is the app's to make. Unchanged from the previous build. Not a
   blocker for this ungraded task, but the most likely reason a newcomer says "not useful".
2. **The top-ranked node is half hidden** (14.png): Farah, #1, sits behind a neighbor at the
   bottom, so the darkest node a reader notices is Ava. Another pair overlaps at 568,758. A layout
   overlap; minor.
3. **The eye button's tooltip says "Hide Influence" while the row is already hidden** (12.png).
   The button is a pressed toggle (its pressed state flips), so a screen reader hears the state;
   a sighted reader sees a crossed-out eye labeled "Hide". Minor.

## End state

Reached: data drawn in 2 steps, an analysis run unprompted, its result read correctly against the
reference values. Nothing blocks the task; finding 1 is the one most likely to change the verdict.
