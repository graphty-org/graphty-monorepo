# Session r1-s28b -- Dev, Florentine families (bigger dots for the families the network depends on)

Participant: Dev, a history undergraduate with no network training who has followed one Gephi
tutorial (layout, statistics, size by degree or betweenness, color, labels, export).

Task as given: practice on the ready-made network of the leading families of Renaissance Florence
and their marriages. Make the drawing show which families the network depends on most -- the more
it depends on a family, the bigger its dot -- then say what the sizes and colors stand for.

## Steps

1. `--start ... empty` -> 01.png
   Think-aloud: "Okay, a start page. Open, New from data... and on the right, Samples. There's
   Florentine families, 15 families, 'good for finding who brokers between groups.' That's the one
   the task means. There's also a box at the bottom asking about usage data. I'll say no thanks."

2. `--step --click "No thanks" --click "Florentine families"` -> 02.png
   Saw: 15 blue dots joined by gray lines, no names. Left panel: Selection, Everything, and at the
   bottom "Analyze (Shift+A) to add results here". Right panel: Overview with Nodes 15, Edges 20,
   density and so on. Toolbar at the bottom with a flask icon.
   Think-aloud: "In the tutorial this is where you run Statistics. The bottom-left hint says
   Analyze. The flask icon looks like the science thing -- try that."

3. `--step --click-at 659,864` (button "Analyze") -> 03.png
   Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
   PageRank (tagged "Start here"), Eigenvector, Katz, HITS, ...
   Think-aloud: "'Depends on most'... the tutorial said betweenness is for who connects the
   others, and the line under it says 'Which nodes sit on the most shortest paths between others.'
   That fits 'depends on.' PageRank says Start here, which makes me second-guess a little, but I'll
   go with what the tutorial taught."
   Hesitation: brief, between PageRank ("Start here") and Betweenness.

4. `--step --click "Betweenness"` -> 04.png
   Saw: a small card, "Betweenness ... Under a second", a Run button.

5. `--step --click "Run"` -> 05.png
   Saw: all dots turned orange, one in the middle dark brown. A key top left, "Color: Bridges,
   0 to 47.5". Left list gained "Bridges 15".
   Think-aloud: "It colored them by itself. But it says Bridges, not Betweenness -- I guess that's
   the same thing in plain words? The dots are all the same size, though, so I still need the size
   part." Also noticed the key box sits on top of a dot in the top-left corner.
   Hesitation: the name changed from Betweenness to Bridges; not sure at first it was the same
   result.

6. `--step --click "Style"` (right panel, graph selected) -> 06.png
   Saw: Canvas background, layout Method "Force - Recommended", Seed. Nothing about dot size.
   Think-aloud: "This is the whole graph's style. No size here. Wrong place." (dead end 1)

7. `--step --click "Bridges"` (left list) -> 07.png
   Saw: right panel now about Bridges: a histogram, "Top 10" -- Medici 47.5, Guadagni 23.17,
   Albizzi 19.33, Salviati 13, Ridolfi 10.33, ... -- and "Made with: Analysis Bridges".
   Think-aloud: "Oh nice, this is the ranking. Medici by a mile. That's my essay sentence."

8. `--step --click "Style"` -> 08.png
   Saw: Nodes / Edges, Fill, Color = Bridges, Shape +, Effects +, Label +, Tooltip +.
   Think-aloud: "Color is already Bridges. Size would be under Shape, I think."

9. `--step --click-at 1419,226` (button "Add to Shape") -> 09.png
   Saw: a menu, Size / Shape.

10. `--step --click "Size"` -> 10.png
    Saw: a Size row with a box saying "1", a little dropdown arrow, and a chain-link icon.
    Nothing changed on the drawing.
    Think-aloud: "It's just a number 1. I want it to follow Bridges, not be one number."

11. `--step --click-at 1352,256` (button "Open list") -> 11.png
    Saw: an empty, tiny dropdown under the box. Nothing in it.
    Think-aloud: "Empty list? Huh." (dead end 2)
    Hesitation: real confusion here; an empty list looks broken.

12. `--step --key Escape --hover-at 1380,256` -> 12.png
    Tool printed: tooltip "Size by attribute".
    Think-aloud: "The chain icon says Size by attribute. That's what I want."

13. `--step --click "Size by attribute"` -> 13.png
    Saw: "Find an attribute" with Bridges, Bridges rank, Bridges percentile, and greyed id and name
    ("Cannot be used: Holds groups, not amounts").

14. `--step --click-at 1188,324` (option "Bridges") -> 14.png
    Saw: the dots changed size. The middle dark one is much the biggest, two others to its right
    are medium-big, the rest small. Size row now reads "1 to 3". The key now has two rows:
    "Size: Bridges 0 to 47.5" and "Color: Bridges 0 to 47.5".
    Think-aloud: "There it is. Big and dark means the network goes through them a lot."

15. `--step --hover-at 700,378` -> 15.png
    Tool printed: node "Medici", tooltip null.
    Think-aloud: "I wanted to see the name pop up when I point at the big one. Nothing showed. I
    know it's Medici from the Top 10 list, but the picture itself has no names."

16. `--end`

## At the end, in character

- **Did I finish?** Yes. The dot sizes follow "Bridges" (the betweenness result) and Medici is by
  far the biggest dot.
- **What the sizes and colors stand for:** both stand for the same thing, "Bridges" -- how often a
  family sits on the shortest chain of marriages between two other families, 0 to 47.5. Bigger
  and darker orange means more of the network runs through that family. Medici is top (47.5),
  then Guadagni, Albizzi, Salviati.
- **How hard (1-7, 7 = hardest):** 3.
- **What confused me:**
  - I picked "Betweenness" but everything afterwards says "Bridges". I guessed they were the same,
    but nothing said so.
  - PageRank was labeled "Start here", which made me doubt my choice for a task about who the
    network depends on.
  - The graph-level Style tab had no size at all; I had to click the result in the left list first
    to find the dot settings.
  - Adding Size gave a plain "1", and its dropdown opened empty. The real control was an unlabeled
    chain icon that I only found by hovering.
  - The size range reads "1 to 3" without saying what the units are.
  - The key box in the top-left corner covers a dot.
  - No names on the drawing and no name on hover, so the figure alone does not say which dot is
    Medici; I had to read it off the Top 10 list.
