# Grade: session r3-s24 -- Elena (first-time graph user), bigger dots for the characters that matter, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json). Graded from the last
screenshot (12.png), the screenshot where the binding landed (11.png) and the transcript. No files
were saved in this session (the task asks for none). Not from the participant's rating (5 of 7).

## Grade: S (success)

The task's success definition (answers.md, "Bigger dots for the ones that matter", Les Miserables
half) holds in full:

1. **Ranking run.** Steps 5-7 (05.png-07.png): Analyze, PageRank, Run. The outline gained
   "PageRank 77" and the key "Color: PageRank 0.003299 to 0.07543".
2. **Sizes bound to the result.** Steps 8-11 (08.png-11.png): the PageRank row (opens on Style),
   "Add to Shape", Size, then "PageRank" in the from-data list. The Size line reads "1 to 3", the
   dots visibly differ (Valjean largest, Myriel next), and the key gained "Size: PageRank". Still
   so in 12.png.
3. **Meaning stated from the screen.** In the wrap-up: "Size and color both show the same thing,
   PageRank ... Bigger and darker brown means the story leans on them more." That matches the key
   ("Size: PageRank", "Color: PageRank"). Her extra guess that it is "basically how many people
   they're connected to" she flagged herself as unsure, and checked against Myriel (Degree 10,
   #2) on screen; it does not replace the correct answer.

- **Sizing record:** the from-data list was used directly; it was not closed and "Fixed size" was
  not chosen; the chain-link was not needed. She did say, before binding, that running PageRank
  "colored them, it didn't make them bigger" (step 7).
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (the `ambiguous` print at step 8 took the intended
  left-panel row).

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 11 | 8 on the round 3 success path |
| Wrong turns | 0 | -- |

- The three extra steps are exploration, not attempts at the task: step 3 selected Valjean to see
  who he was, step 4 hovered the flask for its tooltip, step 12 selected Myriel to check the second
  big dot. None undid anything.
- Hesitations: at step 5 (which ranking to pick; the "Start here" tag decided it) and at step 8
  (no word "Size" in the Style tab; she guessed "Shape" on the first try).

## False "done"

None. Her closing claim at step 12, "the big dots are the ones that matter", and the wrap-up's
"sized by PageRank, Valjean biggest, Myriel second" match 12.png and its key. `truth_on_screen`:
not applicable.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was met on
this route, so no scripted repro was needed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | "Size" has no line of its own in the Style tab; it sits under "Add to Shape". She looked for the word, did not find it, and guessed "Shape" as the closest. Confirmed: also seen in r3-s02. | Step 8, 08.png; step 9, 09.png. |
| 2 | 1 | behavior | Running PageRank colors the nodes but does not size them; she had to find on her own that the new outline row opens its look on the right. | Step 7, 07.png ("it colored them, it didn't make them bigger"). |
| 3 | 1 | behavior | A selected node's yellow ring hides its fill, so she could not see Valjean's shade while he was selected (11.png shows him olive, not the darkest brown the key gives 0.07543). Confirmed with r3-s02, where the same ring reached the exported picture. | Steps 3 and 11, 03.png, 11.png; corrected only when the selection moved at step 12, 12.png. |
| 4 | 1 | opinion | The Analyze list reads as a wall of method names (Betweenness, Katz, HITS, Eigenvector); she did not know which one means "the network depends on" and trusted the "Start here" tag. | Step 5, 05.png. |
| 5 | 1 | wording | The size list offers "PageRank", "PageRank rank" and "PageRank percentile" with no hint of how they differ. | Step 10, 10.png. |
| 6 | 1 | opinion | The key's raw range (0.003299 to 0.07543) means nothing to her ("Is 0.07 a lot?"); she read importance only through "#1 of 77" in the node panel. | Steps 7 and 11, 07.png, 11.png. |
| 7 | 0 | opinion | "Damping factor" on the PageRank form made her nervous though she left it alone. | Step 6, 06.png. |

What worked: the sample was one click from the start page; the flask's tooltip said "Analyze";
"Start here" on PageRank made the choice; clicking the run row opened its Style tab; the Size "+"
opened the from-data list at once, and one choice gave visible sizes and a "Size: PageRank" line
in the key.
