# Grade: session r4-s17 -- Alex (regular analyst), running club (T18 A), the fewest people in between

**Grade: S** (success). Alex named the chain Chloe -> Ava -> Ivan -> Kofi -> Milo and gave the
count as "4 introductions (3 people in between)", which is the answer key's chain and count. Both
were read off the run's Values, not guessed from the drawing: `09.png` shows Summary "Path 5
nodes, 4 edges" and Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5, with Made with From
"Chloe", To "Milo", Follow "All", Weight "None" and the line "Each edge counts as 1; "weight" has
no meaning set." The follow-up was also right: Ben -> Theo -> Ravi -> Pia -> Nora, 4
introductions, which the last screenshot (`14.png`) shows in the same form (Made with From "Ben",
To "Nora", Follow All, Weight None, Ran Oct 11, 3:12:36 AM). No detour and no wrong turn.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (friends.csv loaded, PageRank run, nodes
sized and colored by PageRank, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Chain and count (right).** `09.png`, as above. Alex translated "4 edges" into "4
  introductions" himself and gave "3 people in between" too; both forms are accepted by the key.
- **Follow (right).** Alex left Follow on "All" and said why ("introductions go both ways"). A
  Follow Out run would have been `meaning-wrong`; it was never chosen.
- **Weight (right).** Left at "None"; Alex did not set the run counts as a distance, which the key
  marks wrong for this task.
- **Overlap traps.** On the main chain the Ivan-Kofi line passes through Jada, and on the
  follow-up a chain line passes through Quinn (key, "Known on this build"). Alex never read the
  chain off the drawing and named neither.
- **Follow-up (right).** `14.png`: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges".
- **Work kept.** `work.json`: the end adds one run, "shortest_path Shortest path (label Shortest
  route)", and its two layers; the PageRank run, its "Influence" layer and the source friends.csv
  are still there; nothing gone.

## Measures

- **Route:** Analyze (the flask), filter "path", Shortest path, From Chloe (typed, picked), To
  Milo (typed, picked), Find path. The key lists Analyze, "Shortest path" as a valid opening.
  Picking Chloe moved focus to To on its own, as the key says.
- **Steps:** 8 `real.mjs` steps after the start for the main question (`02.png` to `09.png`),
  because opening Analyze, filtering, typing and picking were each one step. The key's success
  path counts 4 actions with `p`; the extra steps are the Analyze route and split typing and
  picking, not wasted moves. Follow-up: 5 steps (`10.png` to `14.png`), using "Recent" in Analyze.
- **Wrong turns:** 0.
- **False "done":** none. "I'm done" (step 9) and the follow-up's end claims are true on
  `09.png` and `14.png`. truth-on-screen: holds.
- **Silent commit:** none. Find path closed the popover, drew the chain in black and opened the
  run on its Values each time.
- **Numbers that disagree:** none against the key. The tree row reads "4 hops" while the panel
  reads "5 nodes, 4 edges"; both are correct, but they use different units and neither says
  "introductions" (problem 1).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, `session.log` is empty
  (no script, console or request errors), and `leaks.json` shows no leaks over 33 calls.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                       | Evidence                                                                                                                         |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | wording         | The length is given in two units, "4 hops" in the Graph tree and "5 nodes, 4 edges" in the Summary, and neither is in the task's terms. Alex had to translate edges into introductions and said another reader "could answer 5". He did not. | `09.png` (tree row "4 hops"; Summary "Path 5 nodes, 4 edges"); wrap-up: "someone else could answer 5"                            |
| 2   | 2        | workflow        | A second Shortest path run replaces the first: the tree keeps one "Shortest path 4 hops" row and the Chloe-Milo chain is gone from the drawing and the panel. To compare or show both, a reader must rerun or write the first down.         | `09.png` against `14.png` (one tree row; only the Ben-Nora chain drawn); transcript step 15                                      |
| 3   | 1        | visual          | No names are drawn on the nodes, so the black chain on the drawing can only be read through the side panel.                                                                                                                                  | `09.png`, `14.png`; wrap-up: "the black path is only readable through the side panel"                                            |
| 4   | 1        | trust           | Arrowheads on every line made Alex wonder briefly whether Follow "All" was right for a two-way relation; the Follow toggle settled it. The chain runs against two arrowheads (Ava to Chloe, Ivan to Ava).                                    | `09.png` (arrowheads); wrap-up: "The arrows on the edges made me wonder for a second whether 'All' was right"                     |

Problems 1 to 4 rest on one participant and are not confirmed by this session alone. Problem 2 is
the documented behavior in the answer key ("The second run replaces the first").
