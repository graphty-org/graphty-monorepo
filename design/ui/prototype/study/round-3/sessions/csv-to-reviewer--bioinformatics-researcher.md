# Session: hand a reviewer the filtered table -- Dr. Chen, computational biologist

Task as given by the moderator: "Hand a reviewer the filtered table of your results so they can check how it was made."

Screens used, in order: the Export dialog (the evidence-file state, then Export table as CSV...), the CSV dialog it opens, and the table under the canvas (the ranked protein table and its own Export table as CSV...).

Renders the participant saw:
- shots/record/r3-chen-csvrev-export-evidence.png -- Export files... opened on a filtered project
- shots/record/r3-chen-csvrev-export-table.png -- the CSV dialog reached from Export, with the methods file beside it
- shots/record/r3-chen-csvrev-table-ranked.png -- the protein table with three measures ranked
- shots/record/r3-chen-csvrev-table-out.png -- the table's own Export table as CSV... dialog

Note: the filtered example in the Export dialog is a bank-transfers case (14 flagged accounts), not a protein network. The participant was asked to treat it as her own filtered gene table.

## Think-aloud

**1. Export files... in the header.**
"Right, top right, Export files... Fine. I'd have looked for File > Export > Table first, because that's where Cytoscape puts it, but this is the obvious button."
The dialog opens. "Scope: Filtered: 14 nodes, 1 step: in Mule ring suspects. OK, so it knows I'm filtered. Good -- that's the first thing I wanted to know, whether it would dump the whole network on me."
She reads down the left list. "Figures, Methods text, Graph data, Tables, Share the setup, Findings report, Project. Tables -- there's no checkbox, it's a button: Export table as CSV... 'opens the table's own export: one table, its row count, and a methods file beside it.' A methods file beside it. That's the line I care about."
She glances at the right. "The Findings report is ticked by default here and it's showing me a report with pages. Boundary, Methods... That's quite nice actually, but it says '(file format: the owner's decision)'. Which owner? Me? Is that asking me something? I don't know what that means, so I'm ignoring it. A reviewer wants a table and the methods, not an HTML booklet." She unticks nothing and goes for the table button.

**2. Export table as CSV...**
"Rows: 14 of 3,000 rows, filtered. From: Nodes; 1 filter step. Order: riskScore, highest first. Columns: 6, hidden ones included. Good. It tells me the count before I write it. Cytoscape never tells you if it's exporting the selected rows or all of them, you find out when you open the file."
She reads the preview. "id first, the file's own ids -- so my gene symbols come out as I put them in, not some internal index. Good. Full precision on the numbers, 0.000378, not rounded to two places. Good."
The header line. "'degree (full graph)', 'pagerank (exact, unweighted, full graph)'. Hm. I like that it says full graph -- that's the point a reviewer will ask about: was degree counted on the 14 or on the whole network? It was the whole network, and it says so in the column. That's the right answer. But read.csv is going to turn that into pagerank..exact..unweighted..full.graph. and I'm going to rename it in the first line of my script. Put the method in the methods file and give me a column name I can type."

**3. The methods file.**
"Beside it: case-acc-233575_nodes-methods.txt. Let me read it properly." She reads every line.
"Rows, the filter step, order. Data: the source file name, 3,000 accounts, 9,113 transfers, directed. Load choices. Weight -- 'amount's meaning not answered, so no measure used it' -- that's a strange sentence, but I get it: nothing was weighted. I'd rather it just said 'unweighted' like the pagerank line does. PageRank, power iteration, damping 0.85, normalized to sum to 1. Seed: none used. graphty-element 2.6.2. OK. That's more than most people put in a supplement."
"What's missing, for me: where the network came from. It gives me a file name. For my data a reviewer's first question is which STRING version and which confidence cut-off. If I imported string_interactions.tsv at 0.7, is 'STRING 12.0, combined score >= 0.7' written here, or just the file name? From this screen I can't tell. If it's just the file name, I'm typing it in by hand again."
"And the filter step. 'In Mule ring suspects, a fixed set of 14 accounts.' A fixed set. For my case that would be 'a fixed set of 14 genes'. A reviewer reads that as 'she picked them'. If I made that set from a rule -- adj.P < 0.05 and degree >= 10 -- I need the rule in here, not 'a fixed set'. If I hand-picked them, fine, it should say that too. As written it's the most suspicious line in the file, and it's the line the reviewer will go to first."

**4. Export 2 files.**
"Export 2 files. Two loose files in Downloads. The CSV doesn't mention the methods file anywhere, so the day somebody forwards only the CSV, the provenance is gone. I understand why the CSV is clean -- I'd hate comment lines in it too, readr chokes -- but give me the option to zip them, or put the methods file name in the file name, it's nearly there already with the matching prefix. Honestly the matching prefix is probably enough." She clicks Export 2 files.

**5. Checking the other route, from the table.**
"Normally I wouldn't go through a big export dialog, I'd be looking at the table and just want it out." She looks at the ranked protein table. "This is the one I recognise -- MAPK1, TP53, degree, betweenness, pagerank, each with a rank, and the header says 'Betweenness exact, unweighted, full graph'. The line above says they agree on the top two. That's actually useful; that's the study-bias sanity check I'd do by hand."
She clicks Export table as CSV... in the table's tab row. "Rows: All 300: Nodes, full graph. Order, Columns. File name. Export. ... Where's the methods file? From the Export dialog it said 'Export 2 files' and showed me the methods text. From here it says Export, singular, and nothing about a methods file. Is it the same dialog or not? If the methods file only comes when I go the long way round, I'll forget it half the time. It has to be on both, and visible on both."
She notes the preview header here: "'community (Louvain, weighted, seed 7, full graph)'. Seed 7 -- good, the seed is in there, so the modules are reproducible. That's the thing I never get from clusterMaker."

**6. Done.**
"So: yes, I got a filtered table out with a methods file, and I'd hand those two files to a reviewer. The methods file is better than what I write myself on a Friday. But it doesn't record the database version from the screens I've seen, and 'a fixed set' is going to get me an email from Reviewer 2."

## After the task

**Single Ease Question: 5 of 7.** "Finding it was easy. Knowing whether the reviewer gets everything they need was not -- I had to read the methods file line by line to find what's missing, and the table's own export didn't show a methods file at all."

**Would she use it instead of her current tool?** "For this job -- getting a table out with the method attached -- yes, over Cytoscape, whose table export tells you nothing about how the numbers were made. Not over R. In R the script is the methods, and a reviewer can rerun it. This is a prose file a reviewer can read but not run. If the methods file named the STRING version and cut-off, wrote the filter as the rule I used, and the column names were plain, I'd send this to a reviewer without editing it. Until then I'd open it in RStudio, fix the headers and add the database line myself -- which is what I already do."

## Problems observed

1. The table's own Export table as CSV... dialog shows no methods file and a single-file Export button, while the same dialog reached from Export files... writes "2 files" with the methods text shown. She could not tell whether the methods file comes on both routes. (severity 3)
2. The methods file names the source file only; nothing on screen shows it would carry the database and version the network came from (STRING 12.0, confidence cut-off). For a PPI network that is the reviewer's first question. (severity 3)
3. The filter step is recorded as "a fixed set of 14" with no record of how the set was made -- the line a sceptical reviewer reads as cherry-picking. (severity 3)
4. Column headers carry the method in parentheses and commas ("pagerank (exact, unweighted, full graph)"); R's read.csv mangles them and she renames every one. She values the "full graph" information but wants it in the methods file, with plain names in the CSV. (severity 2)
5. "Weight: amount's meaning not answered, so no measure used it." reads as a riddle; she wanted "unweighted". (severity 1)
6. The evidence report row shows "(file format: the owner's decision)" -- she took it as a question addressed to her and ignored the report. (severity 1)
7. The two files leave as loose downloads; the CSV holds no pointer to its methods file. The matching name prefix mostly covers it. (severity 1)
