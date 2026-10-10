# Session r1-s09 -- Ruth (returning), task T17 prompt A (running club, friends.csv)

Build: 946256efb876, served from `.study-builds/tier2-r1d4-946256efb/`. Setup: `friends-ranked.txt`.

All commands run from `design/ui/studio/tier2` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/` and
`S=rounds/round-1/sessions/r1-s09`.

## Steps

### 01 -- start
`node ../tool/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

Ruth: The club sheet is open, colored and sized by PageRank from last time. Twenty in the PageRank row,
which matches the twenty people. Nothing on screen talks about the run counts in the third column.
I need to get rid of the pairs with fewer than 4 runs. The left side has Selection, PageRank,
Everything. I'll try the Data rail first, since the counts are data.

### 02 -- the Data rail
`node ../tool/real.mjs --step $S --click "Data"` -> 02.png

Ruth: "friends.csv, 20 nodes, 41 edges." That is all of them: 20 runners, 41 rows. Under Edges
there is "weight" -- that must be my run counts, though it's called weight, not runs. There is a
"Filters" row with a plus. Narrowing the map down sounds like a filter. I'll press the plus.

### 03 -- plus next to Filters
`node ../tool/real.mjs --step $S --click-at 276,197` -> 03.png (tool: button "Add filter step")

Ruth: The right side now says "New filter step": Keep [an attribute's value], Attribute [empty], and a
grayed "Add step". "Keep an attribute's value" reads fine. I'll open the Attribute list and look for weight.

### 04 -- Attribute list
`node ../tool/real.mjs --step $S --click "Attribute"` -> 04.png

Ruth: The list has Nodes: id, and Edges: weight. Weight is the only number, so it's the run count.
Choosing it.

### 05 -- weight chosen
`node ../tool/real.mjs --step $S --click-at 1245,295` -> 05.png (tool: option "weight")

Ruth: Now it reads Keep an attribute's value, weight, Is "at least", Value [blank], and a line under it:
"Keeps edges that pass and the nodes at their ends." "At least" is exactly 4-or-more. That note
also tells me runners with no strong pair will drop out, which is what I want. Typing 4.

### 06 -- typed 4
`node ../tool/real.mjs --step $S --click "Value" --type "4"` -> 06.png

Ruth: Value shows 4 and "Add step" turned blue. The drawing hasn't changed yet -- no preview of how many
would go, so I'm committing blind. Pressing Add step.

### 07 -- Add step
`node ../tool/real.mjs --step $S --click "Add step"` -> 07.png

Ruth: The drawing thinned out to short pairs and chains. Top bar now says "19 of 20 nodes"; the left
side lists "weight is at least 4 / 20 to 19 nodes" with a ticked box; the right side reads
"Nodes showing 19 of 20", "Edges showing 12 of 41", and says plainly that the counts below are for
the whole graph. I counted the dots on the drawing myself: 19, and 12 lines. That agrees with the
panel, so I'll write it down: 19 people are still in it, joined by 12 pairs. One runner had no pair
with 4 or more runs. (I'd like to know who without hunting -- nothing names the dropped person.)

Now bring the whole club back. The ticked box next to the step looks like an on/off switch, and I'd
rather switch it off than delete it, in case the club asks again. Unticking it.

### 08 -- untick
`node ../tool/real.mjs --step $S --click-at 273,239` -> 08.png (tool: input "Apply step: weight is at least 4")

Ruth: Everyone is back: the full ring of lines, Nodes 20, Edges 41, the "19 of 20" in the top bar is
gone, and the step reads "weight is at least 4 / off". Done with the first ask: 19 people at 4 or more,
whole club restored.

Facilitator follow-up (given word for word): "Your club now asks the same for pairs who ran together
5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."

Ruth: I kept the step, so I'd rather change its 4 to a 5 than build a new one. I'll click the step's
words to see if they open for editing.

### 09 -- open the step
`node ../tool/real.mjs --step $S --click-at 160,231` -> 09.png (tool: treeitem "weight is at least 4")

Ruth: The right side shows the step again with Value 4 and a button "Save and turn on". Good -- it
remembered everything. I'll replace 4 with 5.

### 10 -- value 5
`node ../tool/real.mjs --step $S --click "Value" --key Control+a --type "5"` -> 10.png

Ruth: Value now 5; the step title still says "at least 4" until I save, which is fair. Pressing
"Save and turn on".

### 11 -- Save and turn on
`node ../tool/real.mjs --step $S --click "Save and turn on"` -> 11.png

Ruth: Top bar "10 of 20 nodes"; step reads "weight is at least 5 / 20 to 10 nodes"; Values says
"Nodes showing 10 of 20", "Edges showing 5 of 41". On the drawing I count four separate pairs-or-
clusters; at the bottom two dots sit right on top of each other, so I can only make out 10 if I take
that blob as two. The panel says 10 and the five lines agree with it. Answer: 10 people at 5 or more.
Now unticking the step to bring the whole club back.

### 12 -- untick again
`node ../tool/real.mjs --step $S --click-at 273,239` -> 12.png (tool: input "Apply step: weight is at least 5")

Ruth: Whole club back: Nodes 20, Edges 41, step "off", no count in the top bar. I'm done.

`node ../tool/real.mjs --end $S`

## End of session, in character

**Finished?** Yes, both. Pairs who ran together 4 or more times: 19 people in the drawing (12 pairs).
5 or more: 10 people (5 pairs). Each time I brought the whole club back (20 people, 41 pairs) by
unticking the step, which I kept so I could reuse it.

**Ease: 6 of 7.**

**What helped.** "Weight" was the only number my file had, so picking it was no guess. "At least" was
already chosen and matched my 4-or-more exactly. The line "Keeps edges that pass and the nodes at
their ends" told me in advance that a runner with no strong pair would vanish. After it ran, three
places agreed on the count (top bar, the step's "20 to 19 nodes", and "Nodes showing 19 of 20"), and
the panel said which counts were for the whole graph -- that saved me a check. Changing 4 to 5 by
clicking the step's words, and switching it off with the box instead of deleting it, worked as I hoped.

**What confused me or slowed me.**
- My third column is run counts, but the program calls it "weight" everywhere. I had to infer that
  it was the same thing because it was the only number.
- I had to commit with "Add step" before seeing what it would do; there was no preview count while
  I typed 4.
- Nothing names the person who dropped out at 4. For a flyer about running partners I'd want to
  know who that is without hunting through the dots.
- At 5 or more, two dots at the bottom sit almost on top of each other, so I could only make the
  drawing agree with "10" by trusting the panel.
- The plus beside "Filters" has no words; I guessed it was the way in. The word "Filters" is what
  made me try it.
