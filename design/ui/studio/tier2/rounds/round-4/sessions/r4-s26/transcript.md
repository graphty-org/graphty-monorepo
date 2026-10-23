# Session r4-s26 -- Explorer Elena (returning user)

Task: keep only pairs who share 5 or more chapters, say how many characters remain, then bring every character back.

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s26

## Steps

### 01 -- start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start .../r4-s26 setup:lesmis-ranked.txt`
Sees: Les Mis already drawn, dots colored and sized by PageRank, a legend top left, a PageRank panel on the right. Left list says Selection, PageRank 77, Everything. Bottom bar of icons, one looks like a funnel.
Thinking: "I only want the pairs with lots of chapters together. That funnel at the bottom looks like a filter. Let me try it."

### 02 -- clicked the funnel (Filters)
Command: `--click-at 833,864` -> button "Filters"
Sees: right panel "New filter step", Keep "an attribute's value", an empty Attribute box, Add step greyed out. Left side switched to Data: 77 nodes, 254 edges, and under Edges an attribute "shared_chapters".
Thinking: "shared_chapters -- that's the chapters thing. Let me open the Attribute box and pick it."

### 03 -- opened Attribute
Command: `--click "Attribute"`
Sees: a list -- Nodes: id, name; Edges: shared_chapters.
Thinking: "There it is. shared_chapters."

### 04 -- picked shared_chapters
Command: `--click "role=option:shared_chapters"`
Sees: Is "at least" already chosen, an empty Value box, a small line "Keeps edges that pass and the nodes at their ends."
Thinking: "At least 5. That's exactly what I want. Typing 5 in Value."

### 05 -- typed 5
Command: `--click "Value" --type "5"`
Sees: Value 5, Add step now blue. Picture unchanged (no preview).
Thinking: "Nothing changed yet, so I guess I press Add step."

### 06 -- Add step
Command: `--click "Add step"`
Sees: the picture shrank to a few small groups. Top bar: "26 of 77 nodes, 51 of 254 edges". Right panel Values: Nodes showing 26 of 77, Edges showing 51 of 254. Left under Filters: "shared_chapters is at least 5 -- 77 to 26 nodes, 254 to 51 edges" with a ticked box.
Thinking: "26 characters left. Ooh, that big dark one is still in the middle, must be the main guy. (Answer: 26 characters.) Now put everyone back. Last time undo worked for everything -- I'll just hit the back arrow at the top."

### 07 -- Undo
Command: `--click-at 165,20` -> button "Undo"
Sees: the whole picture is back, same layout as before. Notice: 'Undid adding "shared_chapters is at least 5".' Right panel: Nodes 77, Edges 254. Filters list on the left is empty again.
Thinking: "Everyone's back, 77 again, and nothing moved around. Done."

### --end (first try)
Command: `--end` -> further request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."
Thinking: "OK, same again with 8. The funnel at the bottom worked last time."

### 08 -- Filters again
Command: `--click "Filters"`
Sees: the same empty "New filter step" form.
Thinking: "Same as before. Attribute, shared_chapters."

### 09 -- shared_chapters picked
Command: `--click "Attribute" --click "role=option:shared_chapters"`
Sees: shared_chapters, "at least", empty Value.
Thinking: "8 this time, then Add step."

### 10 -- Value 8, Add step
Command: `--click "Value" --type "8" --click "Add step"`
Sees: "17 of 77 nodes, 19 of 254 edges" at the top; Values says Nodes showing 17 of 77. Filters: "shared_chapters is at least 8 -- 77 to 17 nodes, 254 to 19 edges" with a ticked box.
Thinking: "17 characters at 8 or more. (Answer: 17.) That tick box next to the filter -- I bet unticking it brings them back without throwing my filter away. Trying it."

### 11 -- unticked the filter
Command: `--click-at 274,335` -> input "Apply step: shared_chapters is at least 8"
Sees: everyone back in the same places, Nodes 77, Edges 254. The filter row stays, greyed, "shared_chapters is at least 8 -- off".
Thinking: "All back, and the filter is still there if I want it. Nice."

### --end
Command: `--end` -> session ended.

## In character, at the end

- **Did I finish?** Yes. Pairs sharing 5 or more chapters: 26 characters left (51 ties). Undo brought all 77 back. Then 8 or more: 17 characters left (19 ties). Unticking the filter brought all 77 back.
- **Ease:** 6 of 7.
- **What confused me:**
  - The first time I didn't know where filtering lived. I guessed the funnel at the bottom, and it was right.
  - Typing 5 changed nothing in the picture until I pressed Add step. Fine, but I wasn't sure it was taking until I did.
  - "Keeps edges that pass and the nodes at their ends" -- I skipped it. I didn't need it, because the count at the top told me what happened.
  - There were two ways back, undo and the tick box. I didn't know about the tick box before. Both kept the picture in the same place, so nothing jumped around.
  - I said the big dark dot in the middle "must be the main guy". I didn't check what the size meant.
