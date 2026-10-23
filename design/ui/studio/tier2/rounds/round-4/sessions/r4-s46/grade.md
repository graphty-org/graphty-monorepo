# Grade: session r4-s46 -- Elena (tier 1 graduate), Florentine families (T23 B), a step or two away

**Grade: S** (success). Both parts of the task are met on the last screen (`08.png`): the count
Elena gives, 11 families besides the Medici, is read from the screen (the neighbor list headed
"Medici and 11 connections" at Hops 2, with Selection 12 beside it), and it is the key's count with
the key's eleven names (Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi,
Ridolfi, Salviati, Strozzi, Tornabuoni). The drawing is narrowed to exactly those families and the
Medici: the header chip reads "12 of 15 nodes", 12 dots are drawn, every one with the selection
halo, and the three left out by the key (Peruzzi, Lamberteschi, Bischeri) are gone. `work.json`
confirms one filter step, a neighborhood of Medici at depth 2. No detour: Hops 1 was only the
list's opening state, and Elena went straight to 2.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (Florentine families open, PageRank
run, sized and colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count (right).** 11, "not counting the Medici", as the task asks; Elena also checked it
  against Selection 12 (11 plus the Medici). `07.png`: "Medici and 11 connections", Hops 2
  selected, the eleven names.
- **Drawing narrowed (right).** `08.png`: chip "12 of 15 nodes", 12 haloed dots, "Filter to
  neighbors" drawn disabled (the key's state once the step is on), the legend titles "Size:
  PageRank, full graph" and "Color: PageRank, full graph" with the whole graph's range 0.03066 to
  0.1458, as the key describes.
- **Work kept.** `work.json`: the PageRank run and all three layers (Node defaults, Edge defaults,
  Influence) are the same at start and end; the only addition is the filter step the task asks
  for.

## Measures

- **Route:** find box, "Medici" (`02.png`); the Medici row in the results (`04.png`); the
  inspector's "..." menu (`05.png`); Neighborhood (`06.png`, Hops 1, "Medici and 6
  connections"); Hops 2 (`07.png`); Filter to neighbors (`08.png`). The key lists the node menu's
  Neighborhood as an equal route.
- **Steps:** 7 `real.mjs` steps after the start (`02.png` to `08.png`), one of them (`03.png`) a
  tool refusal that changed nothing. Six effective steps, against the key's five or six for the
  keyboard path.
- **Wrong turns:** 0. The first move went into the find box, a place Elena's history names, and it
  led on: picking the Medici row selected the node and opened its inspector. Not a broken habit.
- **Tool refusal, not a wrong turn:** `--click "Medici"` matched 7 rows (the node and its six
  edges, whose labels contain the name) and the tool clicked nothing (`03.png`). A person would
  have clicked the node row; Elena did so on the next step. Not counted against the app.
- **False "done":** none. Every end claim (11 families, the eleven names, "12 of 15 nodes", only
  those plus the Medici drawn) is true on `08.png` and in `work.json`. truth-on-screen: holds.
- **Read the disabled "Filter to neighbors" as broken, or pressed it to undo:** no. She read the
  gray as "I guess it's on" and was unsure how to undo it (problem 2).
- **Reran PageRank or read the "full graph" legend as a problem:** no. She did not know what "full
  graph" means and ignored it (problem 3).
- **Read "Medici and 11 connections" as direct ties, or doubted it against Degree 6:** no; she
  read it as within two marriages and cross-checked with Selection 12.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool refusal is the
  tool's ambiguity guard working as designed, and `leaks.json` shows no leaks over 19 calls.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Reaching "the next ring" of a node has no visible control near the node's facts: the find box lists only direct ties (as edges), and the inspector shows the Degree row but no Neighborhood button; Elena found Neighborhood by guessing at the "..." menu by the node's name. She did not see the Degree row's chevron as a way in. | `02.png` (find results: Nodes 1, Edges 6 only), `04.png`/`05.png` (inspector at rest, then the "..." menu); transcript end: "the neighborhood option is tucked behind the little '...' next to the name -- I only found it by guessing" |
| 2   | 2        | feedback        | After "Filter to neighbors" the button turns gray with nothing beside it saying the filter is on or how to turn it off; Elena guessed "it's on" and named only the header's undo arrow as a way back. The way back (the step's checkbox in Filters on the Data page, or the chip) is not shown near the button. | `08.png` (gray button, no state text); transcript step 08 and end: "nothing says so near it, and I'm not sure how to undo it besides the arrow at the top"                                                                       |
| 3   | 1        | wording         | Under the filter the legend titles change to "Size: PageRank, full graph" / "Color: PageRank, full graph"; Elena did not know what "full graph" means and ignored it. It cost nothing on this task.                                                                                                              | `07.png` against `08.png` (titles change); transcript end: "I don't know what that means but I ignored it"                                                                                                                     |

Also seen, not counted as a problem in this session: the find box's edge rows also contain the
searched name, which made the session tool refuse an ambiguous click (`03.png`); on screen the node
row is first and labeled under "Nodes 1", so a person would not meet this.

All three rest on one participant and are not confirmed by this session alone.
