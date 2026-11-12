# Session r2-s12 transcript (Dev, student)

Task: a grant reviewer wants to know which genes are essential (a yeast cell dies without them). Use the AI, then say what I would write back.

## Step 1
Command: real.mjs --start <folder> setup:connected-yeast.txt
Note: Okay, opening it. My colleague already loaded the file and connected the AI.

## Step 2
See: network drawn, 331 nodes, 361 edges, Assistant in the left rail, "Sends to Google" at the bottom.
Command: --step --click "Assistant"

## Step 3
See: Assistant panel, "Ask about this graph or change it. It can be wrong.", three suggested questions, Gemini 3.8 Flash.
Command: --step --click "Ask about this graph" --type "Which of these genes are essential, meaning a yeast cell dies without them?" --click "Send" --wait 10000
AI questions asked so far: 1

## Step 4
See: "3 steps", "Sending to Google", Stop button. Still working.
Command: --step --wait 10000

## Step 5
See: now "7 steps", "Sending to Google". Wondering whether each step costs money on the lent key.
Command: --step --wait 10000

## Step 6
See: Answer: "The graph data only contains gene identifiers, names, and expression measurements (gal1RGexp, gal4RGexp, and gal80Rexp), with no essentiality or knockout phenotype attributes recorded. No changes were made. Would you like to import an essentiality dataset or map another attribute?" 8 steps.
Thought: So the file does not say. I want to see what it checked.
Command: --step --click "8 steps"

## Step 7
See: steps list: Query data, Catalog, Sets, Catalog, Notes, Algorithm results, Query data, Query data, each a few ms.
Thought: my slides say centrality finds important nodes, maybe that gives the answer.
Command: --step --click "Ask about this graph" --type "I don't have an essentiality dataset. Can you tell from the network instead? Are the most central genes the essential ones?" --click "Send" --wait 10000
AI questions asked so far: 2

## Step 8
See: the drawing recolored orange, key "Color: Degree" 1 to 18, still "Sending to Google", 3 steps.
Command: --step --wait 10000

## Step 9
See: Answer 2: "Network centrality strongly correlates with essentiality in yeast, but it is not an absolute rule: the top degree hubs include known essential genes like MCM1 and RAP1, as well as non-essential regulators like MIG1 and GAL4. I ran degree centrality across the 331 nodes and styled the network by connectivity." Then "Computed Connections for 331 nodes", Open run, Undo.
Thought: the first answer said the file has no essentiality, so where do these labels come from? I need a list with numbers.
Command: --step --click "Ask about this graph" --type "List the top 10 genes by connections with their numbers, and say which are essential. Is essential or not coming from my file or from somewhere else?" --click "Send" --wait 10000
AI questions asked so far: 3

## Step 10
See: my third question at the bottom, "Sending to Google".
Command: --step --wait 10000

## Step 11
See: Answer 3: "The top 10 genes by connection count are MCM1 (18, essential), RAP1 (17, essential), MIG1 (11, non-essential), GAL4 (10, non-essential), STE11 (9, non-essential), SXM1 (8, non-essential), YDR412W (7, essential), GCN4 (7, non-essential), LSM8 (7, essential), and GCR1 (7, non-essential). These essentiality designations come from external yeast genetics literature (the Saccharomyces Genome Database knockout collection), not from your file, which only contains expression values" (cut off). Two scrollbars next to the panel, and the panel got narrower.
Command: --step --wheel 190,600,800

## Step 12
See: end of answer 3: "...not from your file, which only contains expression values." A chip "10" and "Show in table".
Command: --step --click "Show in table"

## Step 13
See: table opened with all 331 nodes, "In the order loaded", first rows GCN3, NAB2, CRM1. The ten are not visible or marked in the rows I can see. Right panel says 10 nodes selected, Degree 7 to 18. The drawing got small above the table.
Command: --step --click-at 1130,509 (the Degree column header)

## Step 14 (no command, looking at 13.png)
See: sorted by Degree, highest first. The ten selected genes are green at the top and match the AI's numbers: MCM1 18, RAP1 17, MIG1 11, GAL4 10, STE11 9, SXM1 8, LSM8 7, YDR412W 7, GCN4 7, GCR1 7. No essential column in the table: columns are id, name, gal1RGexp, gal4RGexp, gal80Rexp, Degree. So the essential labels exist only in the AI's sentence.
Stopped here. Did not run --end: the facilitator ends the session.

## End of session, in character (Dev)

Did I finish? Mostly, yes. I got an answer I can send, but the honest answer is "this file can't say that by itself". 3 AI questions used out of about 8.

What I would write back to the reviewer:

"Our network file (331 yeast genes, 361 interactions) records only gene names and three expression measurements, so it does not itself show which genes are essential. The ten most connected genes are MCM1 (18 connections), RAP1 (17), MIG1 (11), GAL4 (10), STE11 (9), SXM1 (8), and LSM8, YDR412W, GCN4 and GCR1 (7 each). According to an AI assistant, citing the Saccharomyces Genome Database knockout collection, MCM1, RAP1, YDR412W and LSM8 are essential and the other six are not. These labels are not from our data and we have not checked them against the database yet. Being highly connected does not prove a gene is essential: six of these ten hubs are listed as non-essential."

I would look the four up in the Saccharomyces Genome Database before sending, or at least leave that last warning in, because the program told me it can be wrong and I can only confirm the connection numbers myself.

Ease: 6 out of 7.

What confused me:
- The first answer said there is no essentiality in the file and offered to import a dataset. Then the second answer named essential genes anyway. Wait, so which is it? I only learned the labels were from outside the file because I asked directly. The second answer says "known essential genes" with no source.
- I do not know if the AI really looked in the Saccharomyces Genome Database or is just remembering it. Nothing on screen let me tell, and there is no link. I did not open the steps of that answer.
- "Show in table" did not show me the ten. It opened all 331 in load order and the first rows were other genes, so for a second I thought it was wrong. I only saw the green rows after I sorted by Degree.
- I never asked it to change the picture, but it recolored the network orange and added a key. I liked it, and there was an Undo, but it surprised me.
- The word "Degree" in the key and table versus "Connections" in the AI's line. I know degree from my slides, but it is two words for one thing.
- Two scrollbars side by side next to the chat, and the panel got narrower after the long answer.
- Steps ticking up (3, 7, 8) while "Sending to Google" made me wonder whether every step costs money on the lent key.
- The drawing shrank a lot when the table opened, and the ten genes are not visibly marked or named in it.

## Follow-up

Facilitator: How far can the reviewer rely on that, and what makes you say so?

Looked again: --step --wait 500 (14.png), then --step --click "3 steps#2" (15.png). The steps of the third answer are Algorithm results, Query data, Query data, 6 to 7 ms each, each with a "10" chip.

Dev: Okay, so it depends which part of it, because it's really two kinds of thing.

The connection numbers, the reviewer can rely on. MCM1 18, RAP1 17, MIG1 11, GAL4 10, STE11 9, SXM1 8, and the four 7s. The program computed those from the file, and I sorted the Degree column in the table myself and they matched the AI's list. Same for "331 genes, 361 interactions" and "the file has no essentiality column": the table columns are just id, name, the three expression ones and Degree, I saw that with my own eyes. One small catch: the row after those, ALPHA2, has 6, so the top ten is clean, it's not cut off in the middle of a tie.

The essential and non-essential labels, the reviewer can't rely on. Not as a finding. Wait, and I just went back and opened the steps for that answer, which I hadn't done before. It's three steps: Algorithm results, Query data, Query data, about 7 milliseconds each. Nothing in there says it went to the Saccharomyces Genome Database. No lookup, no link. So I think it did not check anything; it worked out the ten genes from the graph and then the labels came out of the AI's own memory. It named the database as where that knowledge comes from, but that's not the same as looking it up, and the way I wrote my reply, "citing the Saccharomyces Genome Database", makes it sound stronger than it is. I'd change that to "from the AI's general knowledge, not looked up". I can't say the labels are wrong. Maybe they're right. I just have no way to tell from this screen, and the panel itself says it can be wrong. Also the first answer said there was nothing on essentiality, and the labels only showed up when I pushed it, which doesn't make me trust them more.

Same for "centrality strongly correlates with essentiality": no number behind that at all, nothing it ran tests it, because the file has nothing to compare against. And even taking the labels as given, four of ten is not a pattern, and it's only the ten I asked about, out of 331. So it can't answer the reviewer's actual question, which genes are essential. For the other 321 genes we have nothing.

So: rely on the numbers and on "our file can't answer this". Treat the ten labels as a lead to look up, and don't let anything about essentiality go in the grant until someone has checked the genes in the real database. Honestly I would not send the four names as they stand until I've looked them up.
