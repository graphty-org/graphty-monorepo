# Grade: session r3-s56 -- Jordan (regular analyst, returning), Florentine families (T12R B), one family and who they married into

**Grade: S** (success). The last screenshot, `05.png`, shows the Medici Neighborhood view: header
"Medici" over "Neighborhood", "Back to Medici", the heading "Medici and 6 connections", Hops 1/2/3
with 1 chosen, "Filter to neighbors", and the six names Acciaiuoli, Albizzi, Barbadori, Ridolfi,
Salviati, Tornabuoni, with Selection 7 on the left and the six neighbors haloed on the drawing.
Jordan named all six from that list, spelled as on screen, and said 6. Jordan also read facts about
the Medici on the node's Values tab (`04.png`): id and name Medici, Degree 6, PageRank
"0.1458, #1 of 15", all matching the key. Route: the find box, the node row, then the Degree row
(the word "Degree"). This is the key's Degree route, with no detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900, no uncommitted changes. Start: the Florentine ranked setup (PageRank run, nodes
sized and colored by it, no names drawn, `01.png`), as the task specifies. `session.log` and
`setup.log` are empty: no script, console or request errors. No leaks (`leaks.json`: 0 calls).
The graph was not changed (`work.json`: start and end identical, nothing gone). Not void.

## The answer against the key

- **Medici selected (right).** `04.png`: inspector header "Medici / Node", Selection 1, the
  largest dot haloed.
- **A fact read (right).** `04.png`: Degree 6; Results PageRank "0.1458, #1 of 15". Jordan's
  reading "most central family, six ties" holds on screen.
- **The six families by name from the screen (right).** `05.png` lists Acciaiuoli, Albizzi,
  Barbadori, Ridolfi, Salviati, Tornabuoni, exactly the key's six; the debrief repeats them and
  gives 6. Not names from memory, not ids, not a count with no names behind it.
- **Not partial.** The answer was taken from the Neighborhood list. Jordan saw the same six in the
  find box's edge rows first (`02.png`, "Edges 6") but treated that only as a cross-check, so the
  answer does not rest on the list of ties (which the key would grade SD).
- **Traps the key names:** Jordan did not press Down arrow and did not open a tie instead of the
  node.

## Measures

- **Route:** find box clicked and "Medici" typed in one step (`02.png`: "Nodes 1" Medici,
  "Edges 6" with all six ties in view); a click on the text "Medici" refused (`03.png`, identical
  to `02.png`); a click on the node row (`04.png`); "Degree" (`05.png`).
- **Steps:** 4 after the start (`02.png` to `05.png`), one of which did nothing. The key's path is
  4 (`/`, type, Enter, Degree); Jordan's is the same length with the refused step in place of `/`.
- **The step that did nothing (`03.png`) is a tool refusal, not a wrong turn.** `real.mjs` refused
  `--click "Medici"` as ambiguous: the find list held 7 matches for that text (the node row and the
  six tie rows), so nothing was clicked and the screen did not change (`02.png` and `03.png` are
  the same size, 85239 bytes each). A sighted person would click the top row; the tool's
  exact-target rule, not the app, made this a step. Not a void: the run did not fail, and the next
  step reached the node.
- **Wrong turns: 0.**
- **False "done": none.** Every final claim holds on screen: six named families (`05.png`), id and
  name Medici, Degree 6, PageRank 0.1458, #1 of 15 (`04.png`). truth_on_screen: holds.
- **Route recorded for the round comparison:** Degree row, by the word (not the chevron). Jordan
  clicked it because "the little arrow suggested it opened something", that is, the chevron was
  the cue.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.

## Problems

1. **Nothing on the node or its neighbor list says what a connection is. Severity 2.** Evidence:
   `04.png` "Degree 6" and `05.png` "Medici and 6 connections" never name the relation; the task
   asks which families they married into, and Jordan said "The panel doesn't say these connections
   are marriages; I'm relying on knowing the dataset." No wrong conclusion here, so not higher;
   a reader without that outside knowledge could not confirm the answer from the screen.
2. **"Degree" is jargon and its row's purpose is carried only by a chevron. Severity 1.**
   Evidence: `04.png` "Degree 6 >"; Jordan: "network jargon; I only knew to click it because the
   little arrow suggested it opened something. For a VP I'd translate that to 'married into six
   families'." The cue worked here.
3. **The find list mixes the family with every tie containing the name. Severity 1.** Evidence:
   `02.png` "Nodes 1: Medici" over "Edges 6", every row containing "Medici"; Jordan: "the node row
   and the edge rows look alike, and I had to be careful to pick the node itself." Picked
   correctly; the extra step observed here comes from the tool's exact-target rule (see
   Measures), not from the app.

Not studied, as every tier 2 report says: keyboard-only and screen-reader access are untested by
sessions. The participant is simulated; this pass is weak evidence until real people confirm it.
