# Pilot: T6 "What did I get?"

The task asks a first-time user to open the Les Miserables sample and say how many characters and
connections it has, whether every character can be reached from every other, and what facts are
recorded about each character and each connection.

- App under study: commit a1e6b91ff, build 0196d46212aa graphty@0.8.53, `/?next`, 1440 x 900.
- Start: empty. No console errors, script errors or failed requests at any step.

## Result: end state reached in 2 steps

Every answer is on screen after two clicks, with no detour.

| Step | Command | Screenshot | What it shows |
| ---- | ------- | ---------- | ------------- |
| 1 | `--start empty` | `01.png` | Start page. The Les Miserables card says "77 characters". The usage-data card is at the bottom. |
| 2 | `--click "Open the Les Miserables sample"` | `02.png` | Graph drawn. Values > Overview: Nodes 77, Edges 254, Components 1, Density 0.08681. |
| 3 | `--hover "Edges per node"` | `03.png` | No tooltip on the cut-off label. |
| 4 | `--click "Data"` | `04.png` | Attributes: Nodes `id`, `name`; Edges `shared_chapters`. Sources: 77 rows, 254 rows. |
| 5 | `--hover "Undirected"` | `05.png` | No tooltip on the direction line. |
| 6 | `--key Shift+T` | `06.png` | Table: columns `Id` and `name` (Napoleon, Myriel, Mlle Baptistine...). |

The answers: 77 characters, 254 connections, 1 component (so every character can be reached),
`name` (and `id`) recorded for characters, `shared_chapters` for connections. All four match the
answer key.

## Blockers

None stop the task. These could still lower a grade or confuse a participant.

1. **Answer key: it names an attribute the screen does not show.** The key accepts
   `graphty_originalId` as an alternative to `name`. This build lists `id` instead, both under
   Data > Attributes (`04.png`) and as the table's first column (`06.png`). Add `id` to the
   accepted answers. `graphty_originalId` can stay if older builds showed it.
2. **App: the direction line contradicts itself.** Overview reads "Undirected, from the file:
   directed 0" (`02.png`, right panel, y 236). `directed 0` is the raw GML token, quoted
   verbatim by `directionWords` in `graphty/src/workspace/inspector/words.ts`. A first-time
   reader sees "directed" next to "Undirected". The line also runs to the panel's right edge with
   no padding, and it has no tooltip (`05.png`).
3. **graphty-element: arrowheads drawn on an undirected graph.** Every edge has an arrowhead at
   one end (`02.png`, for example the fan into the node at about 631,676), but the Overview says
   the graph is undirected. Arrows suggest one-way connections, which bears directly on the
   reachability question: a participant may doubt "Components 1" or answer that some characters
   cannot be reached. Graded "F" when that answer is confident. The default edge style should
   follow the graph's directedness.
4. **App: "Components" is jargon for the reachability question.** The only reachability signal is
   "Components 1" (`02.png`). Its label has no tooltip or explanation, so a participant who does
   not know the term may fail to link it to "can every character be reached". This is a design
   finding to watch for in the rounds, not a pilot blocker.
5. **App: the truncated label "Edges per ..."** (`02.png`, y 332) has no tooltip (`03.png`). Its
   full name is "Edges per node". It does not affect the task.

## Notes for the study

- The usage-data card disappears from view once the sample opens (`02.png`). The study does not
  measure that card in this task, but check whether opening a sample counts as an answer to it.
- The panel says "Nodes" and "Edges" while the sample card says "characters". The task wording
  uses "characters" and "connections", so a participant has to map one set of words to the other.
  The criteria already allow "connections".
- The study tool worked as documented. A hover on "Edges per node" reported `ambiguous` (the
  group and its label span share the name) and took the first, which is harmless.
