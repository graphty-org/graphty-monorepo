# Session r5-s10b -- Grace, returning

Task: keep only pairs sharing 5 or more chapters, say how many characters remain, then bring every character back.

All commands: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs <args> tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s10b ...` (run from the studio worktree).

## Step 01 (already started)
Les Miserables is open. Left list says PageRank 77 -- so 77 characters to start. Dots are colored and sized by PageRank. Down at the bottom there's a toolbar; the icon with the narrowing lines looks like a filter. That's where I'd look to keep only the strong ties.

## Step 02
`--hover-at 833,864` -> button "Filters". Good, that's the one. Clicking it.

## Step 03
`--click "Filters"` -> it jumped me to Data: 77 nodes, 254 edges. Right side has "New filter step": Keep "an attribute's value", Attribute (empty). Edges have "shared_chapters" -- that's my chapter count. Opening the Attribute list.

## Step 04
`--click "Attribute"` -> list opened: Nodes (id, name), Edges (shared_chapters). Picking shared_chapters.

## Step 05
`--click "role=option:shared_chapters"` -> now "Is: at least" and a Value box, with the line "Keeps edges that pass and the nodes at their ends." That's exactly what I want: at least 5. Typing 5.

## Step 06
`--click "Value" --type "5"` -> Value says 5, "Add step" turned blue. No preview of how many will stay, but fine. Clicking Add step.

## Step 07
`--click "Add step"` -> Top bar: "26 of 77 nodes, 51 of 254 edges". Filter row: "shared_chapters is at least 5 -- 77 to 26 nodes, 254 to 51 edges". Right panel agrees: Nodes showing 26 of 77. So 26 characters are still in it. The legend even says "PageRank, full graph" so my colors didn't silently change. Nice.
Now to bring everyone back: there's a checkbox next to the filter step. Unticking it should switch the filter off without throwing it away.

## Step 08
`--click-at 273,335` (the checkbox "Apply step: shared_chapters is at least 5") -> the filter row now says "off", the count in the top bar is gone, and the right panel says Nodes 77, Edges 254. Same drawing as I started with, same PageRank colors and sizes. Everyone's back, and the filter is still there if I want it for the slide again. Done.

## --end (first try)
Answered with a further request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."

## Step 09
I'd rather change the step I already have than make a new one. Clicking the filter row to see if I can edit its number.

## Step 10
`--click-at 180,320` -> the step opened on the right, marked "Off", with Value 5 and a button "Save and turn on". Good, I can just change the number. Selecting the 5 and typing 8.

## Step 11
`--click "Value" --key Control+a --type "8"` -> Value now 8 (title still says "at least 5" until I save, which makes sense). Clicking "Save and turn on".

## Step 12
`--click "Save and turn on"` -> Top bar: "17 of 77 nodes, 19 of 254 edges". Filter row: "shared_chapters is at least 8 -- 77 to 17 nodes, 254 to 19 edges". Right panel: Nodes showing 17 of 77. So 17 characters at 8 or more chapters. Unticking the step again to bring everyone back.

## Step 13
`--click-at 273,335` (checkbox "Apply step: shared_chapters is at least 8") -> step says "off", panel shows Nodes 77, Edges 254, full drawing back with the same PageRank look. Ending.

## --end (second try)
Session ended.

## In my own words, at the end
- **Did I finish?** Yes. At 5 or more shared chapters, 26 characters stay in the drawing (51 of 254 ties). At 8 or more, 17 characters (19 ties). Both times I brought all 77 characters and 254 ties back by unticking the filter step.
- **Ease: 6 of 7.** The Filters button on the toolbar took me straight there, the form read like a sentence ("Keep an attribute's value, shared_chapters, is at least 5"), and the line "Keeps edges that pass and the nodes at their ends" told me what would happen before I pressed it. The counts showed up in three places (top bar, the filter row's "77 to 26 nodes", the right panel) and all agreed, so I trusted them. Changing 5 to 8 was just editing the same step, and "Save and turn on" said exactly what it would do.
- **What confused me, a little:**
  - Clicking Filters on the toolbar moved the whole left side from Graph over to Data without warning. I found my way, but I'd been on Graph.
  - The form gives no idea how many ties or characters a value will keep before I add it; I had to add the step to find out.
  - The attribute name is the raw column name "shared_chapters"; fine for me, since it's my column, but I couldn't put that on a slide.
  - "Nodes" and "edges" in the counts -- I know they mean characters and ties now, but I still translate in my head.
  - Unticking a small checkbox to get everyone back works, and keeping the step for next time is nice, but I only guessed that the box meant "on/off"; its "off" label only appears after you untick it.
