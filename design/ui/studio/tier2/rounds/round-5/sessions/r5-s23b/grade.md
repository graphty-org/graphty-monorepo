# Grade: session r5-s23b -- Elena (tier 1 graduate), running club (T18 A), the fewest people in between

**Grade: S** (success), main prompt and follow-up. The main chain screen (`10.png`) shows the Shortest
path run open on its Values: Summary "Path 5 nodes, 4 edges", Nodes in order Chloe 1, Ava 2, Ivan 3,
Kofi 4, Milo 5; Made with From "Chloe", To "Milo", Follow "All", Weight "None" with "Each edge counts
as 1; "weight" has no meaning set." under it; the Graph tree row reads "Shortest path 4 hops". That
is the key's chain, the only one of that length. The last screenshot (`18.png`) shows the follow-up
run: Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges", From "Ben", To "Nora", Follow "All",
Weight "None", Ran "Oct 11, 10:20:55 AM" (the first run read 10:19:51 AM). That is the key's
follow-up chain. Elena answered both in order with the counts (three people in between, four
introductions), read off the Values list, not the drawing.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `753bae997bc6` with no uncommitted changes. Start: the
`friends-ranked.txt` setup (friends.csv loaded, PageRank run, nodes sized and colored by PageRank).

## The answer against the key

- **Main chain (right).** Chloe, Ava, Ivan, Kofi, Milo; 4 introductions, 3 people in between, read
  from Nodes in order (`10.png`).
- **Follow-up chain (right).** Ben, Theo, Ravi, Pia, Nora; 4 introductions (`18.png`).
- **Follow (right).** Left on All both times. Elena did not know what Out / All meant and kept All
  because "friends go both ways"; she did not doubt the chain over the arrowheads that point back
  along it.
- **Weight.** Left at None both times; no weight was set.
- **Overlaps.** She named no node off the drawing; neither Jada (main chain) nor Quinn (follow-up)
  entered an answer.
- **Work kept.** `work.json`: the PageRank run and its three layers are still there at the end; the
  only additions are one Shortest path run and its two layers. Nothing gone. The second run replaced
  the first, as the key says it does.

## Measures

- **Route:** the Analyze (beaker) list, filtered by typing "path", then "Shortest path" -- one of the
  key's routes. Not `p` and not a node's menu. She did not remember a path tool; she guessed the
  beaker because she had ranked people there before.
- **From field:** prefilled with Chloe because Chloe was the selected node (`07.png`). She did not go
  to a From field from the prompt's wording; she reached the form through the list.
- **Steps, main prompt:** 9 `real.mjs` steps after the start (find box and type, a refused ambiguous
  click, click the node row, Analyze, filter, pick, type Milo, pick, Find path). The key's success
  path is 4; the extra steps are the find-box detour to select Chloe (which is what prefilled From),
  the tool's refusal, and typing and picking as separate steps.
- **Steps, follow-up:** 8 (Analyze, Recent "Shortest path", type Nora, pick, clear From, type Ben,
  pick, Find path).
- **Wrong turns:** 0 that changed the outcome. Step 2's click on "Chloe" was refused by the tool as
  ambiguous and changed nothing (`03.png` identical in size to `02.png`); that is a target the
  participant named loosely, not a wrong turn in the app.
- **False "done":** none. Both "That's my answer" claims are true on `10.png` and `18.png`;
  truth-on-screen holds. Her closing remark that the first chain "is gone from the picture" is also
  true.
- **Silent commit:** none.
- **Numbers that disagree:** none, though "5 nodes, 4 edges" (inspector) and "4 hops" (tree) name the
  same thing in two ways and she had to reconcile them.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Eighteen screenshots for seventeen steps plus the start;
  `leaks.json` shows no leaks over 39 calls; `session.log` empty.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                 | Evidence                                                                                                                       |
| --- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | findability  | A returning user who never used the path tool could not find it by looking. The Analyze list opens on ranking entries (Degree, Betweenness, Katz, HITS ...) whose descriptions say "shortest paths"; "Shortest path" itself is not in the first screen, and she reached it only by typing "path" into the filter. | `05.png` (list without Shortest path in view), `06.png` (after typing "path"); transcript step 4 and "What confused me"          |
| 2   | 2        | stale input  | On the follow-up the From field came back filled with Chloe, the node still selected from the first question, so she had to clear it before typing Ben. A participant who did not look at From would have run Chloe to Nora.                                    | `12.png` (From "Chloe", Selection 1), `15.png` (cleared); transcript steps 11-14                                                |
| 3   | 2        | lost work    | Running the second path removes the first from the drawing and the tree (one "Shortest path 4 hops" row) with no warning; there is no visible way to keep both. Expected by the key, but she "wasn't expecting that".                                            | `18.png` (one Shortest path row, only Ben-Nora drawn); `work.json` (one shortest_path run at the end); transcript step 17        |
| 4   | 1        | wording      | "Follow: Out / All" carries no explanation she could read; she guessed All was right for friends.                                                                                                                                                                      | `07.png` (Follow row, no hint); transcript step 6 and "What confused me"                                                       |
| 5   | 1        | wording      | The result is stated as "5 nodes, 4 edges" in the inspector and "4 hops" in the tree; nothing names the number of steps between the ends in the reader's terms, so she counted to reconcile them.                                                                   | `10.png`, `18.png`; transcript "What confused me"                                                                              |
| 6   | 1        | findability  | In the find box results, a person's own row and her tie rows all carry her name, so a click on "Chloe" is ambiguous; the node row is not set apart from the tie rows beneath it.                                                                                     | `02.png`; transcript step 2 (tool refusal) and "What confused me"                                                              |
