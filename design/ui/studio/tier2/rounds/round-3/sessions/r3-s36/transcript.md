# Session r3-s36 transcript (Analyst Alex, returning user)

Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
Session folder: tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s36 (copied here by --end)

Task: keep only pairs sharing 5 or more chapters, say how many characters remain, then bring every character back.
Follow-up (from --end): the same for 8 or more chapters, then bring every character back.

## Steps

### 01 -- start
Command: `REAL_DIST=... node design/ui/studio/tool/real.mjs --start <session> setup:lesmis-ranked.txt`
Saw: Les Miserables open with a PageRank run (77) in the left list; size and color legend for PageRank. Left list: Selection, PageRank, Everything. No obvious Filters panel like Gephi. Weight lives on edges, so I try Data.

### 02 -- `--step <session> --click "Data"`
Saw: Data tab: Sources (77 nodes, 254 edges -- matches the classic dataset), a "Filters" row with a +, Attributes with edge column shared_chapters. That's the place. Next: the + beside Filters.

### 03 -- `--step <session> --click-at 276,285` (button "Add filter step")
Saw: right panel "New filter step": Keep = an attribute's value, Attribute (empty), Add step (disabled). Next: open Attribute.

### 04 -- `--step <session> --click "Attribute"`
Saw: list grouped Nodes (id, name) and Edges (shared_chapters). Next: pick shared_chapters.

### 05 -- `--step <session> --click "role=option:shared_chapters"`
Saw: Is = "at least" already chosen, Value empty, hint "Keeps edges that pass and the nodes at their ends." Exactly what I want. Next: type 5.

### 06 -- `--step <session> --click "Value" --type "5"`
Saw: Value 5, Add step turned blue. No preview of how many would remain before adding. Next: Add step.

### 07 -- `--step <session> --click "Add step"`
Saw: drawing cut down. Top bar "26 of 77 nodes"; filter row "shared_chapters is at least 5 / 77 to 26 nodes" with a ticked box; right panel Values: Nodes showing 26 of 77, Edges showing 51 of 254. Legend now says "PageRank, full graph", so the sizes are from the whole network -- good to know. Answer: 26 characters.

### 08 -- `--step <session> --click-at 274,327` (input "Apply step: shared_chapters is at least 5")
Saw: all 77 nodes and 254 edges back, same layout and colors; the step stays in the list marked "off". Unticking instead of deleting means I can switch it back on for the essay.

### --end (first)
Answered with a further request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done." Plan: edit my existing step rather than build a new one.

### 09 -- `--step <session> --click-at 180,320` (treeitem "shared_chapters is at least 5")
Saw: right panel opens the step for editing ("Filter step Off"), Value 5, button "Save and turn on". Next: change 5 to 8.

### 10 -- `--step <session> --click "Value" --key Control+a --type "8"`
Saw: Value 8. Next: Save and turn on.

### 11 -- `--step <session> --click "Save and turn on"`
Saw: row now "shared_chapters is at least 8 / 77 to 17 nodes", ticked; top bar "17 of 77 nodes"; Values: Nodes showing 17 of 77, Edges showing 19 of 254. Answer: 17 characters.

### 12 -- `--step <session> --click-at 274,327` (input "Apply step: shared_chapters is at least 8")
Saw: all 77 nodes and 254 edges back, layout and PageRank colors unchanged; step kept, marked "off".

### --end (second)
Session ended.

## Wrap-up (in character)

**Did I finish?** Yes. 5 or more shared chapters: 26 characters (51 ties). 8 or more: 17 characters (19 ties). Everyone back both times -- 77 nodes, 254 edges.

**Ease: 6 of 7.** First time I'd used filters in here and it took six clicks to get the first answer, which is about Gephi's count. Editing the step for 8 was three moves. The count shows up in three places at once (top bar, the filter row's "77 to 26 nodes", the Values panel), so I didn't have to go hunting for it -- that's better than Gephi, where I check the Context panel.

**What confused or slowed me:**
- I went looking under the Graph tab first; Filters live under Data. Once I saw shared_chapters listed there it made sense, but I wouldn't have guessed it.
- The + next to Filters has no label until I hover; I only knew what it was because it sat on the Filters row.
- No preview count before I pressed Add step -- I had to commit to see "26". Not a problem here since unticking is harmless, but on a big graph I'd want to know first.
- Changing the value meant select-all and retype; a little fiddly, fine.
- Small worry, not a blocker: after unticking, the step still says "off" in the list. Good for me, but I'd want to check it gets saved with the project so next month's rerun has it.
