# Pilot of task T2 ("Something to try it on") on the real app

Build under study: graphty@0.8.53, commit a1e6b91ff, build 0196d46212aa (see `session.json`).
Start: empty (a first-time visitor, clean storage). Screenshots are in this folder.

## Verdict

**The end state is reached in one step, exactly as the answer key says.** Clicking
`"Open the Les Miserables sample"` on the start screen draws the sample (77 nodes, 254 edges, one
component) with the Overview open on the right. No script error, console error or failed request
was printed at any step. The "change it later" measure works too: the header chip "Local only"
opens Settings > Privacy with the "Share usage data" switch, matching the answer key.

Nothing blocks the task. The issues below would color what a participant says, and the graders
should know about them before round 1.

## Steps

| Step | Command                                    | Screenshot | What was seen                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `--start ... empty`                        | `01.png`   | Start screen: Start column (Open project or file..., New from data...), Recent projects (empty), Samples (Les Miserables 77 characters, Zachary's karate club 34 members, College football 115 teams, Florentine families 15 families), each with a one-line description. The privacy question ("Your data is yours, but please help us", Share usage data / No thanks) sits at the bottom. Header chip: "Local only". |
| 2    | `--click "Open the Les Miserables sample"` | `02.png`   | The graph is drawn and settled. Header names "Les Miserables". Right panel: Overview with Nodes 77, Edges 254, "Undirected, from the file: directed 0", Density 0.08681, Components 1, "Edges per ..." 1 to 36, mean 6.597. No console output.                                                                                                                                                                         |
| 3    | `--hover "Local only"`                     | `03.png`   | `tooltip: null`                                                                                                                                                                                                                                                                                                                                                                                                        |
| 4    | `--click "Local only"`                     | `04.png`   | Settings opens on Privacy: "Share usage data" switch (off), the same explanation as the start-screen question, "Usage data: off. Nothing is sent."                                                                                                                                                                                                                                                                     |
| 5    | `--click "Done"`                           | `05.png`   | Settings closes.                                                                                                                                                                                                                                                                                                                                                                                                       |
| 6    | `--hover "Edges per"`                      | `06.png`   | The full name is "Edges per node"; `tooltip: null`.                                                                                                                                                                                                                                                                                                                                                                    |
| 7    | `--click "From Les Miserables"`            | `07.png`   | The Data page: one source "Les Mis..." 77 nodes, 254 edges; node attributes `id`, `name`; edge attribute `shared_chapters`.                                                                                                                                                                                                                                                                                            |

## Issues found (none blocks the task)

1. **Arrowheads on an undirected graph (graphty-element, likely).** The Overview says
   "Undirected", and the sample file says `directed 0`, but every edge is drawn with a small
   arrowhead (visible at 2x zoom on `02.png`, top-left cluster). A participant asked "what are
   the lines" may say "who points to whom", which is wrong for this sample. The app sets no arrow
   style for samples (it only exposes `edge.arrowHead` as a Style control), so the default arrow
   for an undirected graph appears to come from graphty-element. Not traced further.
2. **"Undirected, from the file: directed 0" (app defect, wording).** The Overview row repeats the
   file's raw token (`directed 0`) to a reader who has never seen a GML file, and the row has no
   label and runs to the right edge of the panel (`02.png`, the third Overview row). The words come
   from `directionWords` in `graphty/src/workspace/inspector/words.ts`, which appends
   graphty-element's `directednessSource.statedBy` verbatim. "Undirected (the file says so)" would
   say the same thing.
3. **The sample's description disappears once it is opened (app, design).** "Characters who share
   a chapter of the novel" is on the start screen card only. After loading, the screen says
   "Les Miserables", "Nodes 77" and "Edges 254"; nodes have no drawn labels, and the Data page shows
   only `name` and `shared_chapters`. A participant who did not read the card before clicking must
   infer "characters" and "shared chapters" from the title and the attribute name. The answer key
   accepts a description matching "the sample's description or Overview", so this is gradable, but
   expect weaker answers from participants who clicked without reading.
4. **The privacy question vanishes unanswered (app, design; affects the measure).** Opening a
   sample removes the start-screen question without an answer; usage data stays off. The only way
   back is the header chip "Local only", which has no tooltip (step 3) and whose name says nothing
   about privacy or usage data. The measure's right answer (the chip, or Settings > Privacy) is
   reachable and matches the screen, but a participant has to guess that a lock labelled "Local
   only" is where it lives.
5. **"Edges per ..." is truncated with no tooltip (app, minor).** The full name, "Edges per node",
   is only in the accessible name (step 6).

## Study tool, task wording, answer key

- **Study tool:** no defect. Every step ran, printed what it should, and saved its screenshot;
  `--hover` on an ambiguous name said so and took the first match.
- **Task wording:** fine. "Get something onto the screen to try it on, and tell us what it is" is
  answered by any sample; the last sentence about "what the program may send back to its makers"
  maps to the privacy chip and Settings > Privacy.
- **Answer key:** correct. `"Open the Les Miserables sample"` is the card's accessible name (its
  visible text is "Les Miserables" with "77 characters"); the click count of 1 holds. The reference
  description for grading: 77 characters of the novel, linked when they share a chapter, 254 links.
