# Session: shortest path from Fantine to Gavroche, played as the Gephi holdout

Participant: Dr. Mara Lindqvist (the Gephi holdout persona, study/personas/gephi-holdout.md).
Task as read to her: "Which characters link Fantine to Gavroche through as few others as possible?
Show it in the drawing. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter."

Start screen: shots/tasks/t12/01.png. Renders: tmp/round-7-sessions/t12--gephi-holdout/01.png to 20.png.
Every command was run from design/ui/prototype; the output path prefix is shortened to `T/` below
(T = tmp/round-7-sessions/t12--gephi-holdout).

## Transcript

**Start.** "Les Miserables, colored by PageRank. On the left there's already a 'Shortest paths'
group with Valjean to Javert and Myriel to Javert. So the tool exists, I need a third one. In Gephi
I'd take the shortest-path tool and click two nodes. What's the flask at the bottom?"

1. `node app-b/study.mjs --try T/01.png task:t12 --hover "Analyze"`
   Tooltip "Analyze (Shift+A)". "That's my Statistics panel, presumably."

2. `--try T/02.png task:t12 --click "Analyze"`
   A list: Recent (Louvain, PageRank, Shortest path), then rankings. The right panel shows Weight:
   "value, stronger". "Shortest path, 'the fewest steps, or the lightest route'. I want steps, not
   weight. I'll check which it uses."

3. `--try T/03.png task:t12 --click "Analyze" --click "Shortest path"`
   A "Path between" dialog: From "Type a name", To "Click to pick", Weight "value (loaded weight)"
   with Stronger / Farther / Capacity, a line "Shortest path reads a weight as distance: it uses
   1/value", Scope "Whole graph, 77 nodes", Find path disabled. Banner at top: "Click a node or set
   for From". "I respect this: it says it runs on the whole graph and what it does with the weight.
   But the default is the wrong question. 'As few others as possible' is hop count. I'll fix the
   weight. First the endpoints -- click Fantine, like the banner says."

4. `--try T/04.png task:t12 --click "Analyze" --click "Shortest path" --click "Fantine" --click "Gavroche"`
   Tool: nothing on screen is called "Fantine" / "Gavroche". Nothing changed. "The banner says
   click a node. I clicked the node. Nothing."

5. `--try T/05.png task:t12 --click "Analyze" --click "Shortest path" --click "Type a name"`
   No visible change, no list of names. "No dropdown, no suggestions."

6. `--try T/06.png task:t12 --click "Analyze" --click "Shortest path" --click "Click to pick"`
   The fields swap: To now says "Type a name", banner says "...for To". "So the fields only toggle
   which end is listening. And the map doesn't listen."

7. `--try T/07.png task:t12 --click "Analyze" --click "Shortest path" --click "Table"`
   Tool: nothing on screen is called "Table". The table strip at the bottom is gone while the
   dialog is open. "Three dead ends on picking two names. In Gephi I'd be done."

8. `--try T/08.png task:t12 --click "Valjean to Jav"`
   The existing path's panel: Size 2 nodes 1 edge, From Valjean, To Javert, Edge value 17 shared
   chapters, Members in path order, "Made with: All at their defaults. All options...". "Decent
   result panel. Path order, start and end. 'Defaults' -- I'd want to know if that's by weight or by
   steps without clicking. Doesn't help me pick my own ends."

9. `--try T/09.png task:t12 --click "Fantine"`
   Tool: nothing on screen is called "Fantine". "Clicking a node on the plain map does nothing either."

10. `--try T/10.png task:t12 --click "Find rows and notes"`
    Search box focused, no suggestions. "I can't get a name into anything from here."

11. `--try T/11.png task:t12 --click "Table"`
    Node table: label, group, "Degree (full graph)", "PageRank (full graph)", "Rank by PageRank",
    "Betweenness (full graph)". "Now that's a Data Lab. And the columns say 'full graph' -- that's the
    question I always ask, answered in the header. Gavroche is row two."

12. `--try T/12.png task:t12 --click "Table" --click "Gavroche"`
    Gavroche selected and ringed on the map, "Gavroche, 22 connections", right panel shows Gavroche,
    and a small toolbar appears above the main one.

13. `--try T/13.png task:t12 --click "Table" --click "Gavroche" --hover "Path"`
    Second icon's tooltip: "Path between (P)".

14. `--try T/14.png task:t12 --click "Table" --click "Gavroche" --click "Path between"`
    Dialog opens with From **Valjean**, To **Javert**; right panel says "2 nodes". "That's wrong. I
    selected Gavroche. It filled in somebody else's path and changed my selection to two nodes I
    never picked."

15. `--try T/15.png task:t12 --click "Table" --click "Gavroche" --click "Path between" --click "Valjean"`
    Banner "Click a node or set for From". No list. "Listening again, and the map still ignores me."

16. `--try T/16.png task:t12 --click "Table" --click "Gavroche" --click "Path between" --click "value (loaded weight)"`
    Dropdown: None / edges: value. "'None' -- I assume that's hop count. I'd rather it said 'None
    (count steps)'."

17. `--try T/17.png task:t12 --click "Table" --click "Gavroche" --click "Path between" --click "value (loaded weight)" --click "None"`
    Weight None; note "This path only. Loaded weight: value, stronger". Map now rings Valjean and
    Javert. "Good: the override is for this path only, it doesn't rewrite my graph's weight. Still the
    wrong ends."

18. `--try T/18.png task:t12 --click "Table" --click "Fantine"`
    Fantine selected (row 7 by degree, 15 connections), ringed on the map.

19. `--try T/19.png task:t12 --click "Table" --click "Fantine" --click "Path between"`
    Again From Valjean, To Javert. "It ignores the selection entirely."

20. `--try T/20.png task:t12 --click "Table" --click "Fantine" --click "Gavroche" --click "Path between"`
    Same: Valjean to Javert. "Done. I'd have been done in Gephi ten minutes ago."

**Stop.** Gave up. "Looking at the map, Fantine and Gavroche both tie into Valjean, so my guess is
Fantine - Valjean - Gavroche, one in between. But I didn't get the tool to show it, and I'm not
putting a guess from eyeballing a hairball in a figure."

## Verdict

- **Succeeded?** No. I never got Fantine and Gavroche into the From and To fields, so nothing was
  drawn. My eyeball answer is Valjean, unverified.
- **Single Ease Question:** 2 of 7.
- **Use it instead of Gephi?** No. I'd stay on Gephi. Picking two nodes is the whole interaction for
  a shortest path, and here the map didn't take a click, the name field didn't take a name, the
  table disappeared under the dialog, and selecting a node and pressing "Path between" filled in a
  different, older path. The parts around it are better than Gephi -- it says whole graph and 77
  nodes, it says how it reads the weight, the weight override is scoped to this one path, the table
  headers say "full graph", the result lists members in path order -- but none of that matters if I
  can't choose the two ends.

## Problems seen (in her words, with the screen)

1. "Path between" ignores the selection: with Fantine (or Gavroche, or both) selected, it opens with
   From Valjean, To Javert and changes the selection to those two (renders 14, 19, 20). Severity: high,
   blocks the task.
2. The banner says "Click a node or set for From", but clicking a node on the map does nothing
   (renders 04, 09). Severity: high.
3. "Type a name" gives no name list or suggestions on click (render 05). Severity: high.
4. The table strip disappears while the Path between dialog is open, so the table cannot be used to
   pick an end (render 07). Severity: medium.
5. The default weight is the loaded edge value read as 1/value distance; "as few others as possible"
   needs None, and None is not described as "count steps" (renders 03, 16). Severity: medium -- she
   noticed only because she reads weights; a student would get a weighted path and not know.
6. The finished path says "Made with: All at their defaults" without stating which weight that was
   (render 08). Severity: low.

## What she liked

- The dialog states its scope (whole graph, 77 nodes) and how the weight is read (1/value as distance).
- The weight override says "This path only" and leaves the graph's weight alone.
- Table headers say "(full graph)".
- A saved path lists its members in path order with start and end.
