Participant model: sonnet

# T15A, Les Miserables, played as Dev (history student, follows his tutorial order)

Session: design/ui/studio/rounds/round-1/sessions/r1-s04b (screens 01-17, export in downloads/).

## Steps (think-aloud, short)

1. `--start ... empty` (01). Start page: Open project, New from data, Recent projects, Samples. Dev tries a sample first, as his tutorial habit. A privacy banner sits at the bottom.
2. `--click "No thanks" --click "Les Miserables"` (02). Graph on screen, 77 nodes, 254 edges, blue dots, no labels. PART 1 DONE: on screen.
3. `--click "Analyze"` (03). A menu lists analyses under "Rank nodes and edges": Degree, Betweenness, Closeness, PageRank ("Start here"), Eigenvector... Hesitation: the tutorial says Betweenness, the app says start with PageRank. Dev follows the tutorial.
4. `--click "Betweenness"` (04). A small card with a Run button.
5. `--click "Run"` (05). Dots turn orange; a key appears: "Color: Bridges, 0 to 1624". The left list gained a row "Bridges 77". Confusion: Dev picked "Betweenness" but the result is called "Bridges". PART 2 DONE: the program ranked the characters.
6. `--click "Bridges"` (06). Right panel shows a histogram and a Top 10 (Valjean 1,624, Myriel 504, Gavroche 470.6, Marius 376.3, Fantine 369.5...). Dev likes this: names in words he can put in the essay.
7. `--click "Style"` (07). Nodes section: Fill/Color already set to Bridges; Shape, Effects, Label, Tooltip each with a plus.
8. `--click-at 1419,226` (08): plus beside Shape offers "Size" and "Shape". Hesitation: Dev expected a word like "Size" at the top level, not hidden under Shape.
9. `--click "Size"` (09): a Size row showing "1", a dropdown and a chain-link icon. Hesitation: no word says "by measure"; the icon is unlabeled to Dev (its name is "Size by attribute").
10. `--click-at 1381,256` (10): attribute list: Bridges, Bridges rank, Bridges percentile; id and name greyed ("Holds groups, not amounts"). Dev picks plain Bridges.
11. `--click-at 1189,324` (11): Valjean and Myriel and Fantine get bigger; key now has "Size: Bridges" and "Color: Bridges". PART 3 DONE: bigger dots for those who matter more.
12. `--click-at 1419,324` (12): plus beside Label opens an attribute list: id, name, Bridges...
13. `--click-at 1118,455` (13): picked "name". Names appear on the drawing; note says "77 labels, 7 hidden to avoid overlap". PART 4 DONE: names written. Some are tiny and overlap in the middle.
14. `--click-at 24,20` (14): Main menu: New project, Open, Save, Export... (Ctrl+E), Settings, Help.
15. `--click "Export..."` (15): dialog, Image tab, preset "To share -- PNG, 2x", preview shows the key in the corner.
16. `--click "Export#2"` (16): nothing happened (dialog still open, no file). Dead end 1: the name matched something else.
17. `--click-at 1066,750` (17): "a file was saved: les-miserables_current-view.png, 1806 x 1720". Opened the file: it has the key (Size and Color, 0 to 1624), the names, the orange colors and sizes. PART 5 DONE: picture file with its key.
18. `--end`.

## Closing, in character

- Did I finish? Yes, all five parts, one dead end (the second Export click).
- What do the sizes and colors stand for? Both stand for "Bridges": how many shortest routes between other characters run through that character, 0 to 1624. Big and dark brown means a key connector (Valjean, Myriel, Fantine); small and light orange means barely a connector.
- Difficulty: 3 of 7.
- What confused me:
  - I asked for Betweenness and got "Bridges". I had to guess they are the same thing.
  - Size is hidden behind the plus beside "Shape", and the chain-link icon gave me no word saying "size by a measure".
  - The key says "Bridges" with no explanation of what a bridge is; I would need one sentence for my essay.
  - Several names in the middle overlap and are unreadable in the exported picture.
  - Clicking Export by name the second time did nothing and said nothing.
