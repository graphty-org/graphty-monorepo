# Session r5-s12b -- Analyst Alex (returning user)

Task: keep only ties of 5 or more shared chapters, say how many characters remain, then bring every character back.

Commands use:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step <session folder> ...
(session folder: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s12b)

## 01.png (start)
Les Miserables is open, colored and sized by PageRank, 77 shown next to the PageRank row. Bottom toolbar has an icon that looks like a funnel / filter lines. That is where I'd expect "filter out the small stuff", like Gephi's Filters panel.

## 02 -- `--hover-at 833,863`
Tooltip "Filters". Good, that's the one.

## 03 -- `--click "Filters"`
Data panel opened: 77 nodes, 254 edges (matches what I'd expect for Les Mis). A "New filter step" form on the right: Keep "an attribute's value", Attribute (empty), Add step. Edge attribute shared_chapters exists. I'll pick the attribute.

## 04 -- `--click "Attribute"`
List: Nodes (id, name), Edges (shared_chapters). Picking shared_chapters.

## 05 -- `--click "role=option:shared_chapters"`
Now "Is: at least" and an empty Value box, with a hint "Keeps edges that pass and the nodes at their ends." That's what I want. Type 5.

## 06 -- `--click "Value" --type "5"`
5 is in, Add step turned blue. No preview count of how many it'll keep -- would have liked that. Click Add step.

## 07 -- `--click "Add step"`
Top bar now says "26 of 77 nodes, 51 of 254 edges"; the filter row says "shared_chapters is at least 5, 77 to 26 nodes, 254 to 51 edges"; right panel Nodes showing 26 of 77. Three places agree: **26 characters** left. Legend even says "PageRank, full graph" so I know the colors weren't recomputed on the subset. Good.
Now bring everyone back. There's a checkbox on the filter row -- I'd rather switch it off than delete it, so I can flip it on again for the essay.

## 08 -- `--click-at 273,335` (the step's checkbox, "Apply step: shared_chapters is at least 5")
Everything back: Nodes 77, Edges 254, top-bar count gone, legend no longer says "full graph". Filter row stays, marked "off". Exactly what I wanted -- it's there for next time.

## --end
Answered with a follow-up: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."
I'd rather change my existing step than build a second one. Click on the filter row to see if it opens for editing.

## 09 -- `--click-at 180,320` (the filter row)
The step opened on the right with its settings, Value 5, and a button "Save and turn on". Nice -- I just change 5 to 8.

## 10 -- `--click "Value" --key Control+a --type "8"`
Value now 8. Click "Save and turn on".

## 11 -- `--click "Save and turn on"`
"17 of 77 nodes, 19 of 254 edges" in the top bar, filter row "shared_chapters is at least 8, 77 to 17 nodes, 254 to 19 edges", Nodes showing 17 of 77. **17 characters** at 8+. Now switch it off again.

## 12 -- `--click-at 273,335` (checkbox, "Apply step: shared_chapters is at least 8")
All 77 nodes and 254 edges back, top-bar count gone, step kept but "off".

## --end
Session ended.

## Afterwards, in character
- **Finished?** Yes, both parts. 5 or more shared chapters: 26 characters (51 ties). 8 or more: 17 characters (19 ties). Both times I brought all 77 back.
- **Ease:** 6 out of 7.
- **What took longest / confused me:** Not much. I had to hover the bottom toolbar icon to be sure it was "Filters", since it has no label. When I set up the step there's no preview of how many nodes it'll keep until I click Add step; in Gephi I see the count as I drag the slider. Also, having only one step that I edit means after this the 5-chapter version is gone and I'd have to type 5 again for the essay. I'd rather keep both as saved steps and switch between them, but I didn't try adding a second one.
- **Liked:** The count shows in three places and they agree. The legend says "PageRank, full graph" while filtered, so I know the colors weren't quietly recomputed on the subset. Turning the step off instead of deleting it is the way I want to work -- nothing lost.
