# Session r1-s15 -- Nadia (returning), T17 prompt A (running club, friends.csv)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Setup: friends-ranked.txt.
Tool: `node design/ui/studio/tool/real.mjs` run from `design/ui/studio/tier2`, session folder `rounds/round-1/sessions/r1-s15`.

Task as given: "You have used this program a few times. Your running club's list of who runs with whom, friends.csv, is already open; its third column counts how many runs each pair did together last month. For a flyer about running partners you care only about pairs who ran together 4 or more times. Change the drawing so it has only those pairs, tell us how many people are still in it, and then bring the whole club back."

## Steps

### 01 -- start
Command: `REAL_DIST=.../.study-builds/tier2-r1d4-946256efb/ with-browser.sh node ../tool/real.mjs --start rounds/round-1/sessions/r1-s15 setup:friends-ranked.txt`
Screen: friends.csv is open, ranked by PageRank (sizes and orange colors, a key at top left). Left panel: find box, Selection, PageRank (20), Everything. Right panel: PageRank's Style and Values. Toolbar at the bottom: flask, chart, 3D, magnifier.
Nadia: "OK, it's the club file, already ranked. I need only the pairs with 4 or more runs. I've never hidden part of a network before. The numbers live in the spreadsheet, so I'll look at Data on the left first."

### 02 -- `--step ... --click "Data"`
Screen: Data panel: Sources (friends.csv, 20 nodes, 41 edges), a "Filters" row with a +, Attributes: Nodes (id), Edges (weight).
Nadia: "Filters -- that sounds like what I want. The runs column must be 'weight' under Edges. I'll press the + next to Filters."

### 03 -- `--step ... --click-at 276,197` (the + by Filters; tool: button "Add filter step")
Screen: right panel now "New filter step". Keep: "an attribute's value". Attribute: an empty dropdown. "Add step" button, greyed.
Nadia: "Keep an attribute's value -- fine. Attribute is empty; I'll open it and look for weight."

### 04 -- `--step ... --click "Attribute"`
Screen: list opens: Nodes -- id; Edges -- weight.
Nadia: "weight, under Edges. That's the runs."

### 05 -- `--step ... --click-at 1245,295` (option "weight")
Screen: Attribute weight; "Is" already says "at least"; an empty Value box; a hint "Keeps edges that pass and the nodes at their ends."; Add step still grey.
Nadia: "At least -- exactly '4 or more'. And it keeps the people at the ends. I'll type 4."

### 06 -- `--step ... --click "Value" --type "4"`
Screen: Value shows 4; "Add step" is now blue. Drawing unchanged (no preview).
Nadia: "No preview yet, so it waits for the button. Add step."

### 07 -- `--step ... --click "Add step"`
Screen: drawing thinned out: many lines gone, a few people sit in short chains. Top bar now shows a funnel icon and "19 of 20 nodes". Left: Filters lists "weight is at least 4 / 20 to 19 nodes" with a ticked box. Right panel switched to Graph > Values: "Nodes showing 19 of 20", "Edges showing 12 of 41", then a note "The counts below are for the whole graph." with Nodes 20, Edges 41.
Nadia: "It worked: 12 of the 41 pairs ran 4 or more times, and 19 people are still in it. That surprised me a little -- only one person drops out -- but the hint said it keeps the people at both ends, and three places say 19. The answer is 19. Now bring everyone back: I'll untick the box by the filter rather than delete it, in case they ask again."

### 08 -- `--step ... --click-at 273,239` (tool: checkbox "Apply step: weight is at least 4")
Screen: whole club back, all lines drawn, top bar back to "friends ... Local only" with no count. Filter row reads "weight is at least 4 / off". Values: Nodes 20, Edges 41.
Nadia: "Everyone's back, and the filter is kept, switched off. First part done: 19 people."

Answer given for the prompt: 19 people are still in the drawing (12 of the 41 pairs ran together 4 or more times). The whole club is back.

Follow-up (given word for word): "Your club now asks the same for pairs who ran together 5 or more times. How many people are in the drawing then? Bring the whole club back when you are done."
Nadia: "Same filter, change 4 to 5. I'll click the filter's name to open it."

### 09 -- `--step ... --click-at 163,231` (tool: treeitem "weight is at least 4")
Screen: right panel shows the filter, "Filter step Off", same fields with Value 4, and a blue "Save and turn on" button.
Nadia: "Good, it opens for editing. Replace 4 with 5, then Save and turn on."

### 10 -- `--step ... --click "Value" --key Control+a --type "5"`
Screen: Value now 5; heading and left row still say "at least 4" (not saved yet).
Nadia: "Save and turn on."

### 11 -- `--step ... --click "Save and turn on"`
Screen: five separate pairs left on the drawing (one pair overlaps at the bottom). Top bar "10 of 20 nodes". Filter row "weight is at least 5 / 20 to 10 nodes", ticked. Values: Nodes showing 10 of 20, Edges showing 5 of 41.
Nadia: "Five pairs, ten people -- and I can count them on the drawing, it matches. Answer: 10. Untick to bring the club back."

### 12 -- `--step ... --click-at 273,239` (tool: checkbox "Apply step: weight is at least 5")
Screen: whole club back, 20 nodes / 41 edges; filter row "weight is at least 5 / off".
Nadia: "Everyone's back. Done."

Answer given for the follow-up: 10 people (5 pairs ran together 5 or more times). The whole club is back.

### end -- `node ../tool/real.mjs --end rounds/round-1/sessions/r1-s15`

## Debrief (in character)

- **Finished?** Yes, both parts. 4 or more runs: 19 people still in the drawing (12 of 41 pairs). 5 or more: 10 people (5 pairs). The whole club brought back both times by unticking the filter.
- **Ease:** 6 of 7.
- **What went well:** I had never hidden part of a network, but "Filters" with a + sat right in Data, next to the weight column I was thinking about. "Keep an attribute's value / weight / at least / 4" read like the sentence in my head, and "at least" was already chosen. The count showed in three places at once (top bar "19 of 20 nodes", the filter row "20 to 19 nodes", and "Nodes showing 19 of 20"), so I did not have to count balls. The second time was quick: click the filter, change 4 to 5, "Save and turn on". Keeping the filter switched off instead of deleting it is what I would want for a case file.
- **What confused me / small doubts:**
  - It took me a moment to find the + by "Filters": in the Data panel it is a small grey + with nothing saying it adds a filter until you press it. I guessed right because the word "Filters" was there.
  - 19 of 20 felt surprisingly high for "only the strong pairs" -- the drawing still looked full of people. The hint "Keeps edges that pass and the nodes at their ends" explained it, but only because I read it; I would not have known which one person dropped out without hunting for them.
  - "weight" is the spreadsheet's word, not "runs"; I knew it was the third column only because it was the only number on the edges.
  - Nothing on the drawing itself says a filter is on except the small funnel and count in the top bar; the PageRank key in the corner still shows the full range, which made me wonder whether it is describing the whole club or the shown part.
  - After "Add step" the right panel jumped from the filter to "Graph / Values". That turned out useful (it had the counts), but it was a surprise.
- **Implementation issues hit:** none. Every click did what I expected and nothing errored or stalled.
