# T47 B pilot on build 758b8e8081 (targeted re-pilot)

Build: 758b8e8081 (`.study-builds/tier3-r1d2-758b8e8081`), the frozen build named in `criteria.md`.
Prompt B: College football, the program's own clusters in their colors, then every team drawn as a
cube without changing any cluster's color.

This pass walks only the success path by pointer and the routes the fixes touched that belong to
this task. None of the touched routes belongs to T47 B (see "Not walked"), so the success path is
the only walk.

## Success path by pointer -- reached

Session: `758r-pointer/` (screenshots `01.png` to `13.png`).

1. Start screen (`01.png`). `Samples` is shared by the top bar's link and the start card's button;
   the card's button was clicked (`03.png`).
2. The card "Conferences fall out of who played whom" opens College football: 115 nodes, 613 edges,
   Everything 115 (`04.png`). A private-window notice shows over the canvas and is gone by the next
   screenshot.
3. Analyze, type `louvain`, Enter: the Louvain card with Resolution 1 and Weight None (`05.png` to
   `07.png`).
4. Run: a Louvain folder in the tree, ten group colors, the color key "Color: Louvain" with Group 1
   to Group 10 over the top left; the drawing stays put (`08.png`).
5. The Louvain folder: "10 layers in Louvain. Layers added later are not changed.", Which nodes
   "Louvain: <<Layer>>", 115 of 115 nodes, the Color line with the purple Layer token (`09.png`).
6. Shape "+" opens a menu of Shape and Size (`10.png`); Shape adds an italic, unset "Icosphere"
   line (`11.png`).
7. The list opens as one column of 36 shapes over the inspector, the row under the pointer
   (Pentagonal prism) drawn highlighted (`12.png`).
8. Box: "Shape: 10 changed" with Undo; every node a cube in its own cluster color; the key gains
   "Shape: Louvain / Box" and scrolls with "3 more below" (`13.png`).

Data check: the source at the end is College football only; the end `styles.json` has each of the
ten group layers with its own `node.color` (unchanged from the run) and `node.shape: box`, matched
counts 16, 15, 14, 12, 11, 10, 10, 9, 9, 9 = 115.

Mismatches with the answer key: none.

Defects: none that crash, block the task, or spoil its grading.

## Not walked

Every route listed for this pass belongs to another task and is not part of T47 B:

- T41 B find box "email" > New layer from selection > Has no value + on_record Yes > Fill red (T41)
- T41 A the same with "phone" and trained (T41)
- T38 A or T51 A find-box layer whose condition is edited before its look (T38, T51)
- T41 A success path, "+" layer both-kinds row (T41)
- T44 B detour c, one-node label layer, Control+O > Replace, Control+Z twice, label Everything (T44)
- T51 A, T41 A or T38 A find-box layer colored, Control+O > Replace, Control+Z twice (T51, T41, T38)
- T45 A Control+O > Replace on neighbors.csv after a hand-picked edge layer, Control+Z (T45)
- T38 A first find-box pick after Replace (T38)

As a targeted re-pilot, the round 1 detours and the keyboard walk were not repeated.
