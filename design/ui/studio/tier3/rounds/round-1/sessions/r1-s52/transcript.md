# Session r1-s52 transcript (Dev, the student)

Task: open volunteers-thanks.graphty.json (a colleague's project), find how many people are green and what they have in common that made the project color them green.

## Step 1 -- start
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty`
Screenshot 01.png: landing page. "Analyze any network." Big green "Open a file" button, subtitle "CSV, GraphML, GEXF, Cytoscape, or a saved project". Okay -- "a saved project", that's what my colleague sent. I'll click the biggest thing, Open a file, and give it the file.

## Step 2 -- open the file
Command: `--step <session> --click "Open a file" --upload volunteers-thanks.graphty.json`
Screenshot 02.png: oh nice, it opened right away -- "Opened volunteers-thanks". Network of blue balls with some green ones. Top-left box says "Color: Thank-you cards -- 6 of 24 nodes". Left list "Style layers" has "Thank-you cards 6". So 6 people are green. Wait, but WHY are they green? "Thank-you cards" is just a name. I'll click the "Thank-you cards" layer to see what rule it uses.

## Step 3 -- click the "Thank-you cards" layer
Command: `--step <session> --click "Thank-you cards"`
Screenshot 03.png: right panel now shows the layer. Fill color 008000 (green). Under "Which nodes -- 6 of 24 nodes" there are two chips: "hours 30 to 52, 7 nodes" and "trained: yes, 15 nodes". Wait, 7 and 15 but only 6 total -- so I think it has to be both at once? I want to make sure it's "and" not "or". I'll open the little "Which nodes" arrow.

## Step 4 -- expand "Which nodes"
Command: `--step <session> --click "Which nodes"`
Screenshot 04.png: it opened the rule. It says "Nodes that pass every condition", 6 of 24 nodes. Condition 1: "hours" Between 30 to 52 (7 nodes). Condition 2: "trained" Yes (15 nodes). So it is "and" -- both have to be true. I count 6 green balls on the canvas too, matches. I did not change anything (I'm scared of breaking my colleague's project, so I did not press Done or touch the numbers).

Essay-style answer: "6 of the 24 volunteers are green. They are the ones who are trained (trained = yes) AND put in between 30 and 52 hours -- the layer is called 'Thank-you cards', so I guess those are the people getting a thank-you card."

## End (in character)
- Did I finish? Yes. 6 people are green; what they have in common: trained = yes and hours between 30 and 52 (both conditions).
- Ease: 6 out of 7. Opening the project was one click and it showed "6 of 24 nodes" right on the picture. Clicking the layer name showed me the rule.
- What confused me: at first the two chips "hours 30 to 52, 7 nodes" and "trained: yes, 15 nodes" did not say whether it was "and" or "or" -- I had to do the maths (7 and 15 but 6 total) or open "Which nodes" to see "Nodes that pass every condition". Also, when I opened the rule, the "30" box was highlighted like it was ready for typing, which made me nervous I'd edit the project by accident. The words "Style layers" are not what my tutorial called it (it said "Partition"/"Ranking"), but the layer name matched the legend so I found it.
