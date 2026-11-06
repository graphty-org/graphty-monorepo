# Session r2-s04 -- Maren (genomics Cytoscape user)

Task: use the AI to make every gene with gal4RGexp below -1 stand out; report how many and how I know.

## Step 1
Command: real.mjs --start <folder> setup:connected-yeast.txt
Output: the drawing is still moving. Screenshot 01.png.

## Step 2
Saw: network loaded, 331 nodes, 361 edges, counts shown. "Sends to Google" in the footer makes me wary, but this is a public demo dataset.
Command: --step --click "Assistant"
Screenshot 02.png.

## Step 3
Saw: chat panel with "It can be wrong" (honest), three suggested questions, Whole graph 331/361 chips, model Gemini 3.8 Flash.
Command: --step --click "Ask about this graph" --type "Make every gene with gal4RGexp below -1 stand out from the rest of the network." --click "Send" --wait 10000
AI question 1 of my ~8. Screenshot 03.png.

## Step 4
Saw: "3 steps", "Sending to Google", Stop button; still working.
Command: --step --wait 10000
Screenshot 04.png.

## Step 5
Saw (04.png): AI says "Found 9 genes with gal4RGexp below -1", sized and colored 9 nodes. Key on canvas "Color: gal4RGexp below -1, 9 of 331 nodes". I count 9 red dots. Red on blue, so no red-green problem. Number still only the AI's word; want to see what it did.
Command: --step --click "5 steps"
Screenshot 05.png.

## Step 6
Saw (05.png): steps show Query data (chip 9), Style x3, Query data (chip 9). No actual filter condition is visible.
Command: --step --click "Open layer"
Screenshot 06.png.

## Step 7
Saw (06.png): layer panel reads "Rule: data.gal4RGexp < -1, 9 nodes", "9 of 331 nodes", size 3, fill FF0055. Correct rule, readable. Want to check it against the raw table myself.
Command: --step --click "Data"
Screenshot 07.png.

## Step 8
Saw (07.png): Data panel lists sources, Attributes, Filters; no table here.
Command: --step --click-at 793,840 (grid icon in the bottom toolbar)
Screenshot 08.png.

## Step 9
Saw (08.png): Table opened: 331 nodes, columns id, name, gal1RGexp, gal4RGexp, gal80Rexp, "In the order loaded".
Command: --step --click-at 737,509 (gal4RGexp header, to sort)
Screenshot 09.png.

## Step 10
Saw (09.png): "Sorted by gal4RGexp, highest first". Need lowest first.
Command: --step --click-at 724,509 (gal4RGexp header again)
Screenshot 10.png.

## Step 11 (no command; read 10.png)
Saw: "Sorted by gal4RGexp, lowest first". Rows below -1: GAL1 -2.406, GAL7 -1.995, GAL10 -1.993, HOM3 -1.321, ADE4 -1.296, HIS7 -1.252, GLN1 -1.06, MET16 -1.034, GAL3 -1.004. Next row RPC19 -0.979 is above the cutoff. Nine rows.

## End of session, in character (Maren)
Did I finish: yes. I stopped here and did not end the session; the facilitator ends it.

Answer: 9 genes stand out (big, FF0055 red, on the blue network).
How I know: I did not take the AI's word. Four things agree:
1. The AI's sentence said 9.
2. The layer's own rule reads "data.gal4RGexp < -1, 9 nodes", "9 of 331 nodes", and the key on the canvas says the same.
3. I sorted the node table by gal4RGexp, lowest first, and counted 9 rows below -1. The tenth, RPC19, is -0.979.
4. I counted 9 red dots on the network.
It also fits the biology: GAL1, GAL7, GAL10 and GAL3 fall in a gal4 deletion. I used 1 AI question of my 8.

Ease: 6 out of 7.

What confused me or could be better:
- "5 steps" says only "Query data" and "Style" with a chip of 9. It does not show the condition it ran. I had to find "Open layer" to see the rule. That is where a skeptic looks first.
- The rule is written as "data.gal4RGexp < -1": readable, but code-like.
- The Data panel on the left has no table. The table is behind an unlabeled grid icon in the bottom toolbar, and I only guessed that. I had expected it under Data.
- The canvas shrinks when the table opens, so the red nodes get small and I cannot see which dot is which gene. Nothing links a table row to its dot unless I go looking, and the red genes are not labeled, so the picture alone does not tell me the names.
- The sort takes two clicks, highest first and then lowest first. Minor; the line above the table says clearly what it is doing.
- "Sends to Google" is in the footer. Fine for a public demo set, but I could not use this on unpublished data without my PI's agreement.

Good: the count is shown as a number everywhere, the key on the canvas came for free, red on blue is safe for my PI, and Undo sits right beside the result.
Would I switch: it is a nice quick look, but this was one filter on a demo network. It proves nothing yet about my gene-list workflow, and the paper figure stays in Cytoscape until I can cite this.
