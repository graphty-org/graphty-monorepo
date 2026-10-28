# Grade: session r4-s18 -- Grace (tier 1 graduate), Florentine families (T18 B), the fewest families in between

**Grade: S** (success). The main question and the follow-up are both answered correctly, read
off the run's Values. Main question (`08.png`): Path "5 nodes, 4 edges"; Nodes in order Strozzi
1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5; Made with From Strozzi, To Pazzi, Weight None, "Each
edge counts as 1." Grace answered Strozzi, Ridolfi, Medici, Salviati, Pazzi, 4 hops, which is the
key's only chain of that length. Follow-up, on the last screenshot (`13.png`): Path "5 nodes, 4
edges"; Nodes in order Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5; From Peruzzi, To
Ginori, Ran "Oct 11, 3:13:50 AM". Grace answered Peruzzi, Bischeri, Guadagni, Albizzi, Ginori,
the key's follow-up answer. No detour on either.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes colored and
sized by it, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Main chain (right).** `08.png`, as above. The five path nodes and four ties are drawn black on
  the orange drawing; the Graph tree's new row reads "Shortest path 4 hops"; the key adds a black
  "Shortest path" row above the two PageRank rows.
- **Follow-up chain (right).** `13.png`, as above. The first chain is gone from the drawing and
  the tree (still one "Shortest path 4 hops" row), as the key says the second run does.
- **The Castellani overlap trap.** On `13.png` the highlighted Peruzzi-Bischeri tie (about 697,715
  to 720,557) passes straight through Castellani, an orange node not on the path (about 713,604).
  Grace read the chain from the Values list only and never named a node from the drawing, so the
  trap did not apply.
- **Work kept.** `work.json`: the start's PageRank run (label Influence) and its layer are still
  there at the end; the end adds one Shortest path run with its two layers. Nothing gone.

## Measures

- **Route:** Analyze (the flask), typed "shortest" in the filter box, picked "Shortest path",
  typed and picked Strozzi, typed and picked Pazzi, Find path. The key lists "Analyze, Shortest
  path" as a success route. The prompt avoids the words "shortest" and "path"; Grace chose
  "shortest" herself as a filter word ("a route question"). She went to the From field because
  the form opened with focus there, not straight from the prompt's wording.
- **Steps:** main prompt 7 `real.mjs` steps after the start (`02.png` to `08.png`) against the
  key's count of 4; the extra steps are the Analyze list, the filter word, and typing and picking
  as separate steps, which the key notes for the B walk. Follow-up 5 steps (`09.png` to `13.png`),
  starting from the Recent "Shortest path" entry in Analyze.
- **Wrong turns:** 0.
- **False "done":** none. "Done" after step 7 is true on `08.png` (the right chain is listed and
  drawn); "Done" after step 12 is true on `13.png`. truth-on-screen: holds. Her side remark that
  PageRank "didn't wipe it" is true on both screens (the PageRank row and its key rows remain).
- **Silent commit:** none for the run itself. The second run replacing the first is noted in the
  problems.
- **Numbers that disagree:** none. "5 nodes, 4 edges", "4 hops" and the five numbered rows agree
  on both screens.
- **Ease (from the transcript):** 7 of 7 for the main question, 6 of 7 overall. Not used for the
  grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, `session.log` is empty,
  and `leaks.json` shows no leaks over 32 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                          | Evidence                                                                                                                                       |
| --- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | feedback        | A second Shortest path run silently replaces the first: the earlier chain disappears from the drawing, the tree and the Values with no message, and there is no way to keep both. Grace had written the first answer down, so no wrong answer, but she would have wanted both for her board slide. | `08.png` against `13.png` (one "Shortest path 4 hops" row on both; first chain gone); transcript step 12 and debrief: "vanished ... with no word about it" |
| 2   | 1        | visual          | No family names are drawn on the nodes, so the chain can be read only from the side panel, not from the picture itself. On this start the highlighted Peruzzi-Bischeri tie also runs through Castellani, a node not on the path, which the drawing alone cannot disambiguate.         | `13.png` (no labels; tie through the node at about 713,604); debrief: "I could only read the route from the side panel"                    |

Both problems rest on one participant and are not confirmed by this session alone. Problem 1 is
also documented in the answer key as this build's behavior.
