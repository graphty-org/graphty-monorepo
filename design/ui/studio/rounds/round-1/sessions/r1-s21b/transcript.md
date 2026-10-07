# Session r1-s21b: Dev (student with a class project), Florentine families

The task: "Go to the Medici family, read what the program knows about them, and see which
families they married into. Tell us who they are and how many."

Start: the empty app. Commands run from `design/ui/studio`, session folder
`rounds/round-1/sessions/r1-s21b` (written `$S` below).

## Think-aloud and steps

1. `--start $S empty` -> 01.png. The first screen offers Start (Open project or file, New from
   data), Recent projects (empty), and a Samples list. "Florentine families, 15 families" is
   right there, which is what I was told to use. At the bottom there is a box asking whether to
   share usage data. I read it all, as I do with any first screen.
   > "OK, there's the Florence one. First I'll get rid of this data question."

2. `--step $S --click "No thanks"` -> 02.png. The box is gone.

3. `--step $S --click "Florentine families"` -> 03.png. A drawing of 15 blue balls joined by
   lines. On the right, an Overview: Nodes 15, Edges 20, "Undirected, from the file: directed 0",
   Density 0.1905, Components 1, "Edges per n... 1 to 6, mean 2.667". On the left, a search box
   "Find nodes, edges, values", then "Selection" and "Everything".
   > "None of the balls has a name on it. In the tutorial there were labels. Which one is the
   > Medici? There's a search box, I'll just type the name."

4. `--step $S --click "Find nodes, edges, values" --type "Medici"` -> 04.png. Missed: the tool
   found nothing by that name (it is placeholder text), so nothing was typed. (A tool-naming
   miss, not something a person would notice.)

5. `--step $S --click-at 175,90 --type "Medici"` -> 05.png. The box is a "Find" combobox. Under
   it: "Elements: Medici" and "Values: Select where name is Medici (1)".
   > "Two choices. The first one just says Medici, that's what I want."

6. `--step $S --click-at 116,153` -> 06.png. One ball near the middle turns brown with a yellow
   ring. The right panel now says "Medici, Node", with a Summary: id Medici, name Medici,
   Degree 6. A round target button appears above the bottom toolbar.
   > "So that's the Medici. Degree 6, I remember degree from the tutorial: the number of
   > connections. So probably 6 families. But which ones? Still no names on the drawing."

7. `--step $S --hover-at 749,812` -> 07.png. Tooltip: "NeighborhoodG" (the shortcut letter G
   runs into the word).
   > "Neighborhood. That sounds like the people around him."

8. `--step $S --click-at 749,812` -> 08.png. Seven balls now have yellow rings: the Medici and
   six around it. The right panel: "7 nodes, 0 edges, Selection", Nodes 7, Edges 0, "Edges among
   them 7", id "Acciaiuoli (1)", name "Acciaiuoli (1)".
   > "Seven, so Medici plus six. Good, that matches degree 6. But it says Edges 0 and then
   > Edges among them 7? Which is it? And it only shows one name, Acciaiuoli, with a (1). Where
   > are the other five? Maybe if I click that name it opens a list."
   HESITATION: "Edges 0" next to "Edges among them 7" contradicts itself to me, and the name row
   shows one family out of seven.

9. `--step $S --click-at 1380,276` -> 09.png. Clicking the "name Acciaiuoli (1)" row does
   nothing visible.
   > "Nothing. OK. My data is a spreadsheet, so maybe there is a table somewhere. There's a
   > Data button on the left."

10. `--step $S --click-at 28,130` -> 10.png. The left panel changes: Sources, "Florentin... 15
    nodes, 20 edges", "Node t... 15 rows, 15 nodes", "Edge ... 20 rows, 20 edges"; Attributes:
    Nodes: id, name. The names are cut off.
    > "Edge table, 20 rows. That's my list of marriages. I'll open it and look for Medici."

11. `--step $S --click-at 157,200` -> 11.png. Instead of a table, a whole page titled "Add to
    Florentine families": "Drop a file here, or choose a file...", Direction "As the file says",
    Cancel, Load (greyed), "Choose a file first".
    > "What? I didn't want to add anything. I wanted to see the table. That's scary, I don't want
    > to break the sample."
    HESITATION / DEAD END: clicking an existing table opens an import page instead of showing
    its rows.

12. `--step $S --click "Cancel"` -> 12.png. Back to the drawing. The seven rings are still
    there, which is a relief.

13. `--step $S --hover-at 753,252` -> 13.png. I hover one ringed ball to see a name. No tooltip
    appears on screen (the tool reports the point is a node, but nothing is shown to me).
    > "No name when I hover either."

14. `--step $S --hover-at 659,864`, `--hover-at 789,864`, `--hover-at 838,864` -> 14-16.png.
    The tooltips I get read "Analyze Shift+A", then "Analyze Shift+A" again on the next button,
    then "Legend L" on the last one, whose name is Quick actions. The tooltip seems to lag one
    button behind.
    > "These little icons are hard. Last one is quick actions, the tutorial said 'add labels',
    > maybe I can search for that."
    HESITATION: tooltips that show the previous button's name.

15. `--step $S --click-at 838,864` -> 17.png. A command box opens: "Search commands", Go to
    Graph / Data, Graph tree: Find, "Add label line" (greyed out), Analyze, Data: New from
    data...

16. `--step $S --type "label"` -> 18.png. Only "Add label line" remains, still greyed out.
    > "There is a label thing but I can't press it. I don't know what a 'label line' is.
    > That's my second wrong try for names."
    DEAD END: the only label command is disabled with no reason given.

17. `--step $S --key Escape --click "Graph"` -> 19.png. Back to the Graph panel. The seven
    rings are still there; "Selection 7" on the left.

18. `--step $S --click-at 121,124` -> 20.png. Clicking "Selection 7" empties the right panel to
    just the word "Selection". No list of who is in it.
    > "Worse. OK, I'll do it the slow way: I saw where the six ringed balls were, I'll click each
    > one and read its name on the right."

19. `--step $S --click-at 753,252` -> 21.png. The rings disappear; only this ball is ringed.
    Right panel: Salviati, Degree 2.
    > "Salviati. The other rings vanished, so I have to remember where they were from the
    > earlier picture."

20. `--step $S --click-at 571,357`, then `697,416`, `584,549`, `791,545`, `913,603` -> 22-26.png.
    The right panel names each one in turn: Acciaiuoli (degree 1), Tornabuoni (3), Ridolfi (3),
    Barbadori (2), Albizzi (3).
    > "That's six with Salviati. Six matches the degree. Done, but that was a lot of clicking."

21. `--end $S`.

## In character, at the end

- **Did I finish?** Yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori,
  Ridolfi, Salviati and Tornabuoni. What the program knows about the Medici: id and name
  "Medici", Degree 6.
- **How hard was it (1 = very easy, 7 = very hard)?** 5. Finding the Medici was easy with the
  search box. Getting the names of the six was the hard part: I had to remember where six dots
  were and click each one.
- **What confused me:**
  - No names on the dots, so I could not see who anyone was, and hovering a dot shows nothing.
  - After "Neighborhood", the summary said "Edges 0" and "Edges among them 7" at once, and the
    name row showed only "Acciaiuoli (1)" instead of the seven names.
  - Clicking the name row, or "Selection 7", never gave me a list of the selected families.
  - Clicking "Edge table" in Data opened an "Add to Florentine families" import page instead of
    showing the table; I was afraid I would change the sample.
  - The only label command, "Add label line", was greyed out with no explanation.
  - Tooltips on the bottom toolbar seemed to show the previous button's name, and
    "NeighborhoodG" ran the shortcut into the word.
  - Clicking one dot dropped the neighborhood highlight, so I could not check off the six as I
    went.

