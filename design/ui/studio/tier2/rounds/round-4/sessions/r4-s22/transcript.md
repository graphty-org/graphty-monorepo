# Session r4-s22 transcript (Ruth, returning)

Task: keep only pairs who share 5 or more chapters, say how many characters remain, then bring every character back.

Session folder: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s22

## Step 0 -- start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:lesmis-ranked.txt

01.png: Les Miserables is open, colored and sized by a PageRank run. Left panel: Selection, PageRank (77), Everything. Bottom toolbar has several icons; one looks like a filter (three narrowing lines). No names drawn on the dots.

## Step 1 -- hover the funnel icon

    --step <session> --hover-at 833,863

02.png: tooltip "Filters". Good, that is what I want.

## Step 2 -- open Filters

    --step <session> --click "Filters"

03.png: Left side switched to Data: Les Miserables, 77 nodes, 254 edges. Node table 77 rows, edge table 254 rows. Written down: 77 characters, 254 ties. A "Filters" section with a plus. Edge attribute "shared_chapters". Right side: "New filter step", Keep "an attribute's value", Attribute (empty), "Add step" greyed out. Next: pick shared_chapters as the attribute.

## Step 3 -- open the Attribute list

    --step <session> --click "Attribute"

04.png: list grouped Nodes (id, name) and Edges (shared_chapters). shared_chapters is the chapter count per tie. Picking it.

## Step 4 -- choose shared_chapters

    --step <session> --click "role=option:shared_chapters"

05.png: now "Is: at least", an empty Value box, and the line "Keeps edges that pass and the nodes at their ends." That matches my question -- pairs with 5 or more, and the characters on them. "at least" is the right reading of "5 or more". Typing 5.

## Step 5 -- type 5

    --step <session> --click "Value" --type "5"

06.png: Value reads 5, "Add step" is now blue. No count of what would remain before I add it. Clicking Add step.

## Step 6 -- Add step

    --step <session> --click "Add step"

07.png: The drawing thinned out. The same count is in three places and they agree: top bar "26 of 77 nodes, 51 of 254 edges"; the filter row "shared_chapters is at least 5 / 77 to 26 nodes, 254 to 51 edges" with a ticked box; right panel Overview "Nodes showing 26 of 77, Edges showing 51 of 254", with the full graph (77, 254) kept beside it. The legend now says "PageRank, full graph", so the colors were not recomputed on the cut-down map -- good, it tells me so. I count about 25 dots by eye; one is probably hidden behind another. I write down: 26 characters remain.
Answer: 26 characters (51 ties) remain with shared_chapters at least 5.
Next: bring everyone back. The tick box on the filter row looks like the on/off switch. Unticking it rather than deleting, so I keep the rule for the editor.

## Step 7 -- untick the filter step

    --step <session> --click-at 273,335    (input "Apply step: shared_chapters is at least 5")

08.png: Full drawing is back, same layout as at the start. Right panel: Nodes 77, Edges 254. The "26 of 77" in the top bar is gone. The legend no longer says "full graph". The filter row stays in the list, marked "off", so I can switch it on again for the editor. Everyone is back. Done.

## Step 8 -- end, and a further request

    --end <session>

The session answered with a further request: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done." Carrying on. I would rather edit my existing rule than add a second one. Clicking the rule's text to see if it opens.

## Step 9 -- open the rule

    --step <session> --click-at 180,320    (treeitem "shared_chapters is at least 5")

09.png: The right panel shows the rule, "Filter step Off", with the same fields and Value 5, and a button "Save and turn on". Changing 5 to 8 in place.

## Step 10 -- change the value to 8

    --step <session> --click "Value" --key Control+a --type "8"

10.png: Value reads 8; the title and the left row still say "at least 5" until saved. Clicking "Save and turn on".

## Step 11 -- Save and turn on

    --step <session> --click "Save and turn on"

11.png: Top bar "17 of 77 nodes, 19 of 254 edges"; filter row "shared_chapters is at least 8 / 77 to 17 nodes, 254 to 19 edges", ticked; right panel "Nodes showing 17 of 77, Edges showing 19 of 254". I count 17 dots on the drawing (14 in the upper group, 3 below). They agree.
Answer: 17 characters (19 ties) remain with shared_chapters at least 8.
Now unticking the row to bring everyone back.

## Step 12 -- untick again

    --step <session> --click-at 273,335    (input "Apply step: shared_chapters is at least 8")

12.png: Full map back: Nodes 77, Edges 254, no "of 77" in the top bar, the rule kept and marked "off". Done. Ending.

## Step 13 -- end

    --end <session>

Session ended.

## In my words, at the end

**Did I finish?** Yes, both parts.
- 5 or more shared chapters: 26 of 77 characters still in the drawing (51 of 254 ties). Everyone brought back by switching the rule off.
- 8 or more shared chapters: 17 of 77 characters (19 of 254 ties). Everyone brought back the same way.

**Ease: 6 of 7.** The Filters button in the bottom toolbar, then one form, and the count was waiting for me in three places that agreed with each other, plus a dot count I could do by eye at 17. The line under the form, "Keeps edges that pass and the nodes at their ends", answered "counted over what?" before I had to ask. The legend saying "PageRank, full graph" told me the colors were not quietly recomputed on the cut-down map. Switching the rule off rather than deleting it, and seeing it stay in the list as "off", is how I want it: I can show the editor the strong-ties version again.

**What slowed or confused me:**
- No count before I commit. I had to press "Add step" to learn it would leave 26. A preview line under the form ("would keep 26 of 77") would save a round trip when I am hunting for the right cut.
- How to change a rule was not obvious. I guessed that clicking the rule's text would open it; it did, but nothing on the row says so. The button then says "Save and turn on", which is clear.
- Editing the rule replaces the 5 version: the "at least 5" rule is gone now. For the essay I might want both kept side by side; I did not see a way to copy a rule.
- The off switch is a small unlabeled tick box at the end of the row; its name ("Apply step") only shows to a screen reader. I found it because it was the only thing there.
- I still cannot read the names of the 17 from what was on screen -- no labels on the dots. The task only asked for a count, so I did not chase it, but for print I would need the list.
