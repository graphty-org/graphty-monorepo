# Grade: session r4-s19 -- Tom (tier 1 graduate), running club (T18 A), the fewest people in between

**Grade: S** (success). The main prompt and the follow-up are both answered right, read off the
run's Values, not guessed from the drawing. Main: after Find path the inspector reads "Path 5
nodes, 4 edges" and "Nodes in order" Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5, with Made with From
Chloe, To Milo, Follow All, Weight None (`09.png`). Tom answered Chloe -> Ava -> Ivan -> Kofi ->
Milo, three people in between, four introductions: the key's chain and count. Follow-up: the last
screen (`14.png`) reads "5 nodes, 4 edges" and Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, Made with
From Ben, To Nora, Ran Oct 11, 3:14:21 AM; Tom answered Ben -> Theo -> Ravi -> Pia -> Nora, four
introductions, again the key's answer. No detour: the route went straight from the Analyze list to
Shortest path and through the form once per question.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, nodes sized and colored
by PageRank, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Main chain (right).** `09.png`, as above. Follow stayed on All, so the chain counts ties both
  ways, as the task needs; Weight stayed None, so the "runs together" numbers were not used as a
  distance.
- **Follow-up chain (right).** `14.png`, as above.
- **Overlap traps.** Tom never read names off the drawing (none are drawn), so neither Jada (main
  chain) nor Quinn (follow-up) entered an answer. He said the black line "told me nothing by
  itself; only the list on the right did".
- **Work kept.** `work.json`: the PageRank run, its three layers and friends.csv are all still
  there at the end; the Shortest path run and its two layers were added; `gone` is empty. The
  first Shortest path result was replaced by the second (one run, as the key describes), which
  is the app's behavior, not something Tom removed.

## Measures

- **Route:** Analyze (the flask), filter "shortest", Shortest path. The word "shortest" is one the
  prompt avoids; Tom supplied it himself in the filter box. He did not go to a From field straight
  after reading the prompt; he reached From only inside the Shortest path form.
- **Steps:** main prompt 8 `real.mjs` steps after the start (`02.png` to `09.png`); the key's
  success path is 4 (with `p`). The extra steps are opening the Analyze list, filtering, and
  typing and picking each name as separate steps; none was a wrong turn. Follow-up 5 steps
  (`10.png` to `14.png`), reusing the Recent "Shortest path" entry.
- **Wrong turns:** 0.
- **False "done":** none. The first end attempt came after `09.png`, which shows the claimed chain
  and count; the final claims match `14.png`. truth-on-screen: holds.
- **Silent commit:** one, noticed. The second Find path replaced the Chloe-to-Milo result with no
  warning (`14.png`: still one "Shortest path 4 hops" row, now Ben to Nora). Tom had written the
  first answer down, so the outcome was not affected.
- **Numbers that disagree:** none in value. Tom had to translate "4 edges" and "4 hops" into four
  introductions himself, and did so correctly.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, `session.log` is empty
  (no script, console or request errors), and `leaks.json` shows no leaks over 34 calls.
- **Scripted exit:** not applicable; Tom finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | silent-commit   | Running Shortest path a second time replaces the first result without a word: the form does not say a new run will replace the old one, and afterwards nothing says the earlier chain is gone. A user who wants both chains side by side has no visible way to keep them. | `11.png` (fresh form, nothing about replacing); `14.png` (one "Shortest path 4 hops" row, Ben to Nora); transcript steps 11 and 14 |
| 2   | 2        | wording         | The result is counted in "nodes", "edges" and "hops", none of which is the task's own language. Tom had to work out that "4 edges" means four introductions, and noticed the row says "4 hops" while the summary says "4 edges" for the same count.                         | `09.png` ("Path 5 nodes, 4 edges"; left row "Shortest path 4 hops"); transcript "What confused me"                                                |
| 3   | 2        | visual          | No names are drawn on the nodes, so the highlighted chain on the drawing cannot be read by itself; only the inspector's list names the people. A reader relying on the picture (for example for a slide) cannot tell who is on the chain.                                  | `09.png`, `14.png` (black chain, no labels); transcript step 01 and "What confused me"                                                           |
| 4   | 1        | discoverability | "Follow: Out / All" is not explained in the form; Tom left it on All only because he did not know what Out would do. Here the default was the right choice, so the outcome was not affected.                                                                              | `04.png`, `08.png` (Follow Out / All, All chosen); transcript step 04                                                                             |

Problems 1 to 4 rest on one participant and are not confirmed by this session alone.
