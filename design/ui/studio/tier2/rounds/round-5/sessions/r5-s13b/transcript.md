# Session r5-s13b -- Elena, returning user

Task: keep only running pairs with 4 or more runs together, say how many people are left, then bring the whole club back.

Commands use:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/real.mjs --step /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s13b <action>

## Step 01 (start, already open)
I see my running club as orange balls with arrows, PageRank in the left list (the ranking I did before). 20 next to it -- 20 people? There is a toolbar at the bottom; one icon looks like lines getting shorter, maybe a filter. I'll hover it first.
Command: --hover-at 833,864 -> button "Filters", tooltip "Filters" (02.png)

## Step 02
It says Filters. That's what I want. Clicking it.
Command: --click "Filters" (03.png)

## Step 03
A "New filter step" panel on the right, Keep "an attribute's value", and an empty Attribute box. Left says 20 nodes, 41 edges, and there's an edge thing called "weight" -- that's probably my runs count. I'll open the Attribute box.
Command: --click "Attribute" (04.png)

## Step 04
A list: Nodes id, Edges weight. Weight must be the third column, the run count. Picking weight.
Command: --click "role=option:weight" (05.png)

## Step 05
Now it says "Is at least" and a Value box. That reads like a sentence: weight is at least ... 4. Typing 4.
Command: --click "Value" --type "4" (06.png)

## Step 06
4 is in, and "Add step" turned blue. Nothing changed in the picture yet. Clicking Add step.
Command: --click "Add step" (07.png)

## Step 07
Lots of lines vanished -- nice. Top bar says "19 of 20 nodes, 12 of 41 edges", and the right side says Nodes showing 19 of 20. So 19 people are still in it. Only one runner dropped out? Huh, I expected more gone. Those two dots at the bottom left don't seem to have a line between them anymore but they're still there... maybe their line is hidden behind. I'll trust the 19. Answer: 19 people.
Now to bring everyone back. On the left under Filters there's "weight is at least 4" with a blue tick box. I think unticking it turns it off without deleting it. Trying that.
Command: --click-at 274,247 -> input "Apply step: weight is at least 4" (08.png)

## Step 08
All the lines are back, the right side says Nodes 20, Edges 41, and my filter on the left says "off" -- still there if I want it again. Whole club is back. Done.
Command: --end
(--end answered with a further request: "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done.")

## Step 09
OK, same thing with 5. My old filter is still sitting there turned off. I'll click on its name to see if I can change the 4 to a 5.
Command: --click-at 162,231 -> treeitem "weight is at least 4" (09.png)

## Step 10
My filter opened on the right with the 4 in the Value box and a "Save and turn on" button. I'll swap the 4 for a 5.
Command: --click "Value" --key "Control+a" --type "5" (10.png)

## Step 11
Value says 5 now. Title still says "at least 4" but I haven't saved. Clicking "Save and turn on".
Command: --click "Save and turn on" (11.png)

## Step 12
Way fewer now. Top says "10 of 20 nodes, 5 of 41 edges", right side Nodes showing 10 of 20. So 10 people at 5 or more. Funny, at 4 it was 19 and at 5 it's 10 -- a big jump, but the counts agree everywhere so I'll go with it. That big dark one at the bottom must be the club's most social runner (it's the biggest).
Bringing everyone back again with the tick box.
Command: --click-at 274,247 -> input "Apply step: weight is at least 5" (12.png)

## Step 13
Everyone's back: Nodes 20, Edges 41, filter says off. Done.
Command: --end

## In my own words, at the end
- Did I finish? Yes. 4 or more runs together: 19 people still in the drawing (12 of 41 pairs). 5 or more: 10 people (5 pairs). Both times I brought the whole club back (20 people, 41 pairs) by unticking the filter, which stays in the list as "off".
- Ease: 6 out of 7.
- What confused me: I didn't know "weight" was my runs-together column until I guessed it -- it's the only thing listed under Edges, so it was a safe guess, but my sheet never called it that. At 4 or more only one runner dropped out, which surprised me, and two dots at the bottom left stayed in the picture with no line between them that I could see, so I wasn't sure why they were still there. Then 5 or more cut it to half -- a big jump, but every count on the screen said the same thing, so I believed it. Changing the 4 to a 5 meant clicking the filter's name and retyping; the title still said "at least 4" until I saved, which made me double-check.
