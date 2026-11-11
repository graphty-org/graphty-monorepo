# Session r2-s06 -- Maren

Task: use the AI to tell a reviewer (1) which gene most of the connections between other genes go through, (2) how many genes have gal80Rexp above 1.

## Step 1 -- start
Command: real.mjs --start <folder> setup:connected-yeast.txt
Output: drawing still moving; 01.png

## Step 2
Note: Network loaded, 331 nodes, 361 edges, 26 components. "Sends to Google" bottom right makes me wary. Opening Assistant.
Command: --step --click "Assistant"
Output: 02.png

## Step 3
Note: Chat panel with "Ask about this graph", says it can be wrong. Skipping canned questions; asking the reviewer's question in the reviewer's words. (AI question 1)
Command: --step --click "Ask about this graph" --type "Which one gene do most of the connections between the other genes go through? Tell me how you worked it out." --click "Send" --wait 10000
Output: 03.png

## Step 4
Note: Answer: YMR043W (MCM1, plausible), via betweenness. It recoloured my network by Betweenness 0 to 16,124 without being asked. I want to see where the answer came from, so opening "3 steps".
Command: --step --click "3 steps"
Output: 04.png

## Step 5
Note: Steps show Bridges 67 ms, Query data 6 ms, Algorithm results 5 ms, and a chip "5" I can't interpret. Clicking "Open run" to see the actual scores.
Command: --step --click "Open run"
Output: 05.png

## Step 6
Note: Right panel now shows the Betweenness run ("Measure ran Nov 5") with style controls, no per-gene numbers. Trying the Values tab.
Command: --step --click "role=tab:Values"
Output: 06.png

## Step 7
Note: Values tab gives Top 10: YMR043W 16,124; YGL035C 12,500; YNL216W 10,979 ... and "331 of 331 have a value". First fact verified with a count. Asking second question. (AI question 2)
Command: --step --click "Ask about this graph" --type "How many genes have gal80Rexp above 1? Give the count, and how many genes have no gal80Rexp value." --click "Send" --wait 10000
Output: 07.png

## Step 8
Note: Still working: "Sending to Google", Stop button, 5 steps so far. Waiting.
Command: --step --wait 10000
Output: 08.png

## Step 9
Note: Answer: 7 genes above 1, 2 genes with no value. Clicking "Show in table" to see the rows and values before trusting it.
Command: --step --click "Show in table"
Output: 09.png

## Step 10
Note: Right panel: 7 nodes selected, gal80Rexp 1.101 to 3.126, so all seven are above 1. But "Show in table" lists all 331 in loaded order, not my seven. Sorting the column to count for myself.
Command: --step --click-at 924,509
Output: at 924,509: button "gal80Rexp"; 10.png

## Step 11 -- check, then stop
Note: Sorted highest first ("Sorted by gal80Rexp, highest first"). Seven highlighted rows on top: GAL7 3.126, GAL1 2.939, GAL10 2.856, YNL164C 1.345, ADE4 1.202, ICL1 1.147, BAS1 1.101. Next row YDR412W 0.991, not highlighted. Exactly seven, confirmed by eye. Stopping; session left for the facilitator to end.

## End of session (Maren)

Did I finish? Yes, with two AI questions.
- Gene most connections go through: YMR043W, betweenness 16,124, next is YGL035C at 12,500. Checked in the run's Top 10. That it is MCM1 is my own memory; I did not look it up in the table.
- Genes with gal80Rexp above 1: 7. Checked by sorting the column myself; the 8th gene is 0.991.
- The AI also said 2 genes have no gal80Rexp value. I did not check that; I would not repeat it to the reviewer without looking.

Ease: 6 out of 7.

What worked: the answers came with something to check. "Open run", then Values, gave a ranked list with numbers and "331 of 331 have a value". The seven genes stayed highlighted when I sorted the table.

What confused me:
- The step is called "Bridges", the answer says "betweenness centrality", the panel says "Betweenness". Three words; I had to assume they are the same run.
- The chip "5" under the first answer has no label. I still don't know what it counts.
- "Open run" lands on the Style tab, not on the numbers. I had to find Values myself.
- "Show in table" shows all 331 genes in loaded order, with my seven scattered and out of sight. Nothing is highlighted until you sort. I only found them because I sorted.
- The AI recoloured my network by Betweenness without my asking. Undo is there, but I did not ask for a style change, and it stayed on while I worked on the second question.
- "Sends to Google": it does tell me, which is good, but it does not say what is sent. With unpublished data my PI would ask, and I could not answer.

Would I use it? For a quick check like this, yes. It is honest about where a number came from. But a betweenness score is not a biological result, and the paper figure stays in Cytoscape.

## Follow-up

Facilitator: "Someone will check these. Where did each fact come from, how sure are you of each, and what did you look at to be sure?"

Maren (looked at the screen again, 11.png, and back at my 06.png and 10.png; no new AI questions):

Fact 1: YMR043W is the gene most connections go through.
- Where from: the AI named it, by running betweenness. The number is not the AI's sentence: it is in the program's own run record, "Betweenness, ran Nov 5, 10:51:24 PM", on the Values tab.
- What I looked at: the Top 10 there. YMR043W 16,124, then YGL035C 12,500, then YNL216W 10,979. "331 of 331 have a value", so no gene was left out of the ranking.
- How sure: sure that it ranks first on this measure in this file, and the gap to second is not close. Less sure of two things. I did not recompute the score, so I am trusting the program's calculation. And I am assuming "Bridges" in the steps, "betweenness centrality" in the answer and "Betweenness" in the panel are one run; the matching 331 nodes suggests it, nothing says it. Also, the network has 26 components, so this is shortest paths within pieces, not across the whole thing. "Most of the connections" is the reviewer's wording; betweenness is my reading of it. It is the highest score, not proof that more than half of the paths go through it.

Fact 2: 7 genes have gal80Rexp above 1.
- Where from: the AI said 7. I then counted for myself.
- What I looked at: I sorted the gal80Rexp column, highest first. GAL7 3.126, GAL1 2.939, GAL10 2.856, YNL164C 1.345, ADE4 1.202, ICL1 1.147, BAS1 1.101, then YDR412W at 0.991. The selection panel agrees: 7 nodes, 1.101 to 3.126.
- How sure: very. This is the one I would sign, because it comes from the data column and my own count, not from the AI. Nothing sits near the cutoff that rounding could change.

Things I am not vouching for:
- "2 genes have no gal80Rexp value": AI only. I never looked. It does not change the 7, since a blank cannot be above 1, but I would not repeat it.
- YMR043W being MCM1: my memory of yeast genes. I did not read the name column for that row. Check it before it goes in a reply.
- What gal80Rexp means, and whether the file is right: I took the column as it loaded. I did not compare it against the original data.

Short version for whoever checks: open the Betweenness run's Values tab for the first, sort gal80Rexp for the second. The first is a measure I trust on the program's word; the second I counted.
