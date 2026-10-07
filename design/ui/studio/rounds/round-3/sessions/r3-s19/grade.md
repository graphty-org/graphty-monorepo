# Grade: session r3-s19 -- Ruth (the reporter with a contacts sheet), T12 prompt A, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json). Graded from the last
screenshot (07.png), the one before it (06.png) and the transcript. No files were saved, and the
task asks for none. Not graded from the participant's rating (6 of 7).

## Grade: S (success)

Each part of success A holds on screen:

1. **Javert selected.** Step 5 (05.png): the panel title reads "Javert -- Node", "Selection 1" on
   the left, one node ringed.
2. **One fact about him read.** Step 5: the Summary shows id Javert, name Javert, Degree 17. She
   read all three back.
3. **Neighbors listed on screen by name.** Step 6 (06.png), still on screen in 07.png: "Javert's 17
   connections", with the 17 names in alphabetical order. They match the answer key exactly.
4. **She names at least three from that list and says 17.** In her wrap-up she names all 17, spelled
   as on screen, and gives the count 17. She also counted the list by hand against the heading.

- **Route:** the Degree row. She clicked the row's word area (x 1320, the tool reported
  `button "Degree 17"`), not the chevron. In her words, the arrow is why she clicked: "The arrow
  suggests I can open it."
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. At step 3, real.mjs could not find the search box by its placeholder text, and
  nothing was typed. That did not change the screen. At step 4 she clicked the box, which is what
  a person does. The outcome is the same as a person's, so the session stands. The naming gap
  behind it is recorded as problem 5.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs, after the start) | 6 (steps 2-7) | 6 on the documented path (open the sample, `/`, type, Down, Enter, Degree) |
| Steps that moved toward the answer | 4 (steps 2, 4, 5, 6) | -- |
| Wrong turns | 0 | -- |

- Step 2 combined two actions: decline the usage card, and open the sample.
- Step 3 was a tool no-op (see "Void" above). It is not a wrong turn.
- Step 7 (Data) came after the answer was on screen. She went there to confirm what a tie means,
  and found the edge attribute `shared_chapters`. The Javert list stayed on the right. This was
  checking, not a detour from the task, so it is not a wrong turn.
- She clicked the first search result rather than using Down and Enter. That is the same route by
  mouse.

## False "done"

None. Her claim of "17 characters" with the list of names matches 06.png and 07.png word for word.
Her claim that the program knows "an id, a name and a Degree of 17" matches 05.png. She stated
"Selection 18" as an assumption ("him plus his 17, I assume"), not as a fact, and it is correct.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. No build defect was found,
so no repro script was needed.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | wording | "Degree 17" in a node's Summary does not say what it counts. She called it "a math word": "17 of what?" She found the list only because the row had an arrow. A reader who does not click arrows stops at the number. Confirmed: session r3-s02 met the same thing ("Degree 36 ... 36 of what?"). | Step 5, 05.png. |
| 2 | 1 | wording | The neighbor list heading says "connections", and nothing near it says what a connection is in this data (here, sharing a chapter). To be sure, she went to the Data view and read the edge attribute `shared_chapters`. | Steps 6-7, 06.png, 07.png. |
| 3 | 1 | opinion | The neighbor list gives no per-tie value. She could not tell whether Javert shares one chapter with Woman2 or ten with Valjean, which she wanted before quoting it. (Held one level down: the task asks only who and how many.) | Step 6, 06.png. |
| 4 | 1 | wording | "Selection 18" on the left and "17 connections" on the right. Nothing says that the 18 includes Javert himself. She guessed correctly. | Step 6, 06.png. |
| 5 | 1 | accessibility | The search box's accessible name is "Find", while its visible text is the placeholder "Find nodes, edges, values" (`graphty/src/workspace/graph-place/FindBox.tsx`, line 130). A voice-control user who says the visible words does not reach the box. Seen once, through the tool. Not a build defect under the criteria (the box works by click and by `/`). | Step 3 (tool: `nothing on screen is called "Find nodes, edges, values"`), 03.png; step 4 (tool: `combobox "Find"`). |
| 6 | 1 | opinion | The drawing shows no names, so the only way to find a character is the search box. She found it at once, so this cost nothing here. | Step 2, 02.png. |

What worked: the sample was first on the start page. The search box found him with one match and
offered the node itself as the first result. Selecting him put "Degree 17 >" in plain view. One
click opened the named list, and its count matches its length. The Data view answered her question
about what a tie means without losing the list.
