# Session r3-s28 transcript (Analyst Alex, returning user)

Task: the Florentine families network is open. The Strozzi want a message carried to the Pazzi, only between families joined by marriage, through as few families as possible. Which families does it pass through, in order?

Every command ran from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and S = this session's folder. The screenshots sit next to this file.

## Step 0 -- start

    node design/ui/studio/tool/real.mjs --start $S setup:florentine-ranked.txt

01.png: Florentine families is open, sized and colored by PageRank (legend 0.03066 to 0.1458). The nodes have no labels, so I can't tell which ball is Strozzi or Pazzi. Toolbar at the bottom: a flask (the analysis button I use every week), a chart icon, 3D, and search. This is a shortest-path question; in NetworkX it's one line. I'll look for it under the analysis button.

## Step 1 -- open the analysis button

    node design/ui/studio/tool/real.mjs --step $S --click-at 679,864

02.png: the "Analyze" popover has a "Filter analyses" box, then Recent (PageRank), then "Rank nodes and edges": Degree, Betweenness, Closeness... The filter box has focus, so I'll type what I want.

## Step 2 -- search for it by name

    node design/ui/studio/tool/real.mjs --step $S --type "shortest path"

03.png: the list narrows to Betweenness, Edge betweenness and All-pairs distance, and under "Find paths and edge sets": "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." That's the one.

## Step 3 -- open Shortest path

    node design/ui/studio/tool/real.mjs --step $S --click "Shortest path"

04.png: a small form with From ("Where the path starts"), To ("Where the path ends"), each with a pick-on-canvas icon, then Weight = None, Advanced (collapsed) and "Find path". Weight None is right, since a marriage is a marriage. I'll type the family names rather than hunt for unlabeled balls.

## Step 4 -- From = Strozzi

    node design/ui/studio/tool/real.mjs --step $S --click "Where the path starts" --type "Strozzi"

05.png: a dropdown suggests "Strozzi".

## Step 5 -- pick Strozzi

    node design/ui/studio/tool/real.mjs --step $S --click "role=option:Strozzi"

06.png: From shows Strozzi, and focus moved to To on its own. That saves a click.

## Step 6 -- To = Pazzi

    node design/ui/studio/tool/real.mjs --step $S --type "Pazzi"

07.png: "Pazzi" is suggested.

## Step 7 -- pick Pazzi, Find path

    node design/ui/studio/tool/real.mjs --step $S --click "role=option:Pazzi" --click "Find path"

08.png: the path is drawn in black on the graph (thick edges, black nodes), and the legend gained a "Shortest path" entry. The left list shows "Shortest path -- 4 hops" above PageRank. In the right panel's Values tab: Summary "Path 5 nodes, 4 edges"; "Nodes in order": Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; "Made with": From Strozzi, To Pazzi, Weight None, "Each edge counts as 1." That's exactly what I needed, and it matches what I'd expect from nx.shortest_path on this graph: Medici in the middle, and Salviati as the only way into the Pazzi.

    node design/ui/studio/tool/real.mjs --end $S

### Wrap-up for the first question (in character)

- Finished: yes. The message goes Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. It passes through Ridolfi, Medici and Salviati, in 4 hops.
- Ease: 6 of 7. It took seven actions: the analysis button, typing "shortest path", picking it, typing Strozzi, picking it, typing Pazzi, then picking it and pressing Find path. Typing the name found it straight away, and the "Nodes in order" list is the sentence I'd put on a slide.
- What confused me, and what I'd want:
  - The nodes have no names on the canvas, so the black path on the picture tells me nothing by itself. I only trust it because of the list on the right. If I'd had to click balls to pick From and To, I'd have been guessing.
  - It doesn't say whether this is the only shortest route or just one of several 4-hop routes. NetworkX has all_shortest_paths for exactly that. If there were a tie, I'd want to know before telling a director "the" route.
  - A small one: after the run, the popover closed and the result went to the right panel. That was fine this time, but for the first second I looked at the canvas, not the panel.

## --end answered with a further request

"The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"

It's the same question with different ends. I'll go back to the analysis button, where Shortest path should now be under Recent.

## Step 8 -- analysis button again

    node design/ui/studio/tool/real.mjs --step $S --click "Analyze"

09.png: the Analyze popover now lists "Shortest path" first under Recent. Good: that's what I want for weekly work.

## Step 9 -- Shortest path from Recent

    node design/ui/studio/tool/real.mjs --step $S --click-at 565,448

10.png: the form again, with From and To empty. It didn't keep Strozzi and Pazzi, which is fine here since both ends change. The old Strozzi path is still drawn and listed on the right.

## Step 10 -- From = Peruzzi

    node design/ui/studio/tool/real.mjs --step $S --click "Where the path starts" --type "Peruzzi"

11.png: "Peruzzi" is suggested.

## Step 11 -- pick Peruzzi, To = Ginori

    node design/ui/studio/tool/real.mjs --step $S --click "role=option:Peruzzi" --type "Ginori"

12.png: From is Peruzzi, and To shows "Ginori" with the suggestion.

## Step 12 -- pick Ginori, Find path

    node design/ui/studio/tool/real.mjs --step $S --click "role=option:Ginori" --click "Find path"

13.png: the new path is drawn in black. The right panel says "Ran 5:43:48 PM" and Path 5 nodes, 4 edges. Nodes in order: Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5. Made with: From Peruzzi, To Ginori, Weight None. Answer: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.

The left list still shows just one "Shortest path -- 4 hops" row, and the Strozzi path is no longer drawn. So the second run replaced the first one instead of sitting next to it. I had already written the first answer down, so no harm done, but if I'd wanted both routes on one slide I'd be stuck.

    node design/ui/studio/tool/real.mjs --end $S

### Wrap-up for the follow-up (in character)

- Finished: yes. Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori. It passes through Bischeri, Guadagni and Albizzi, in 4 hops.
- Ease: 6 of 7. The second time was quicker: Shortest path sat at the top of Recent, and it took five actions.
- Confusion: the second run quietly took the first one's place, both in the list and on the picture. Both runs are called "Shortest path", with no From or To in the row name, so even if both had stayed I couldn't tell them apart without opening each one. The same open question as before: is this the only 4-hop route?

## Overall

- Finished both requests.
- Ease: 6 of 7.
- What confused me: the canvas has no labels, so the drawn path can't be read on its own. Nothing says whether a shortest path is unique. A new path run replaces the previous one without saying so.
