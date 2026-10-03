# Session: bring in miserables.gexf and check it all arrived -- the Gephi holdout

Participant: Dr. Mara Lindqvist (fictional), associate professor and Gephi user for ten years.

Task as given by the moderator: "You have never used this program before. A colleague sent you a
network file of the characters in Les Miserables and the chapters they share; you saved it as
miserables.gexf in your Downloads folder. Bring it into the program and, before you do anything
else with it, check that all of it arrived: how many characters, how many connections, and that
nothing was dropped on the way in."

Starting screen: shots/tasks/r8-t03/01.png. Renders are in
tmp/round-8-sessions/r8-t03--gephi-holdout/. Every command was run from design/ui/prototype; each
one replays from the start screen.

## Steps

### 1. Start screen, then open the file

Thinking aloud: "A start page. First the consent banner goes away, 'No thanks'. 'Open project or
file...' with Ctrl+O is my File > Open. The samples on the right include a Les Miserables, but
that's not my file, so I'm not touching it."

```
timeout 120 node app-b/study.mjs --try .../01.png task:r8-t03 --click "No thanks" --click "Open project or file..."
```

Result (01.png): a "Choose files" dialog on Downloads listing miserables-edited.graphml,
miserables.gexf, Patent citations 1999-2001.graphty and a grayed-out chapter-notes.docx.
"Fine. The gexf, not the graphml."

### 2. Pick miserables.gexf and open it

```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"
```

Result (02.png): an import screen titled "Open as a new graph". A header reads "Makes Les
Miserables: 77 nodes, 254 edges". On the left are tables for the file, nodes 77 and edges 254,
each with a green check. The node table has id (Key), label (Name, auto) and group (Attribute).
At the bottom it says "Match report: nodes -- 77 rows; every id is unique." Direction is set to
"As the file says".

"Good. This is Gephi's import report, but laid out as a table. 77 and 254 are the numbers for
this dataset, so that matches. Group is typed as text, 'Abc', when it's a number. That's minor.
'As the file says' doesn't tell me WHAT the file says, directed or undirected. Gephi's report
prints the graph type."

### 3. Check the edges side

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"
```

Result (03.png): source (From -> node), target (To -> node) and value (number, Attribute). The
header says "Weight: none (each edge counts 1)". The match report says "254 rows; every edge has
both ends."

"Every edge has both ends, so there are no dangling references. That's the check I wanted. But
'Weight: none' while there's a `value` column right there holding 1, 8, 10, 6? In this dataset
that value IS the weight, the number of chapters two characters share. It isn't dropped, since it
comes in as an attribute, but it isn't being used as weight either. If I ran weighted degree
later I'd get the wrong answer and not know why. Gephi reads GEXF `weight` natively. I'd want to
see whether this file stores it as `weight` or as a `value` attribute, and the screen doesn't
say. I also don't see any line about duplicate or parallel edges being merged, which is the
other thing Gephi's report tells you."

### 4. Load

```
timeout 120 node app-b/study.mjs --try .../04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"
```

Result (04.png): a dialog in the middle reads "Reading miserables.gexf, 77 nodes, 254 edges..."
with a progress bar about two thirds of the way. On the right, "Co-appearances, Graph, from
miserables.gexf", and under Data the Summary says "Reading...". On the left, "Reading the
data...".

"It's still loading. Fine, it's a small file."

### 5. Click something so it settles

```
timeout 120 node app-b/study.mjs --try .../05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything"
```

Result (05.png): the graph is drawn, every node colored orange to brown, with a legend reading
"Color: PageRank 0.00330 to 0.0754". The right panel reads "Everything -- Paints 77 nodes, 254
edges, Covered by PageRank for Color on 77 of 77 nodes". At the bottom are tabs Nodes, Edges and
Louvain, plus "Columns: 9 of 9". The left list still says "Reading the data...".

"Wait. PageRank? I said I want to check the import before I do ANYTHING. Who ran PageRank? And
there's a Louvain tab. My colleague's file has no PageRank and no communities in it. Either this
program ran statistics on my data without asking, or this isn't my data. The 77 and 254 still
agree, at least."

### 6. Open the table (my Data Laboratory)

```
timeout 120 node app-b/study.mjs --try .../06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Table"
```

(The tool reported that "Table" matched two controls and clicked the first.)

Result (06.png): the left list is now full: Notes 4 items, "Labels show... 1 node", PageRank,
Louvain 6 groups with 1 note, Shortest paths (Valjean t... 2 nodes, Myriel to... 3 nodes),
Density, Link prediction, Top 9 by degree, a locked Watchlist of 5 nodes, a "For the report"
folder (Group 2 14 nodes, Group 8 13 nodes, Betweenness), and Everything. Below that: "1 row not
listed still paints. Show rows removed from list view". The graph header now reads
"Co-appearanc..." with "1 note". The node table reads "77 nodes, sorted by degree, Rows 1 to 77
of 77", with columns label, Notes, group, Degree (full graph), Rank by degree, PageRank (full
graph) and Rank by PageRank... A caption reads "Valjean is first on all three measures; Gavroche
is in the top 3 on all three".

"No. This is not what I opened. I brought in a plain GEXF, and now I have notes I didn't write, a
watchlist, a folder called 'For the report', shortest paths from Valjean, link prediction. That
is the sample project from the start page, the one that 'opens with worked examples'. Either it
loaded the sample instead of my file, or it poured my file into the sample. Either way, the
question 'did my data arrive intact' just got harder, because I can't tell which rows are mine.
The node count says 77, which is right. But I asked to check the import, and it's showing me a
finished analysis. In Gephi, File > Open gives you a blank workspace with your data and nothing
else."

"And 'Degree (full graph)' -- fine, at least it says what it computed on. I'll give it that."

### 7. Check the edges in the table

```
timeout 120 node app-b/study.mjs --try .../07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Table" --click "Edges"
```

(The tool reported that "Table" and "Edges" each matched two controls and clicked the first.)

Result (07.png): "254 edges, sorted by value, Rows 1 to 20 of 254", with columns source, target,
Notes and value. The top row is Cosette to Valjean 31, then Marius to Cosette 21. The Javert to
Valjean row has 1 note.

"254 edges, and the value column survived, resolved to names, so the edge ends matched up. That
matches what I know of the Les Mis data. Another note I didn't write, on Javert-Valjean."

### 8. Try to reach the graph's own summary

```
timeout 120 node app-b/study.mjs --try .../08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Everything" --click "Co-appearances"
```

Result: "nothing on screen is called 'Co-appearances'". The graph name had been truncated to
"Co-appearanc...".

```
timeout 120 node app-b/study.mjs --try .../08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --hover "Local only" --hover "Local only"
```

Result (08.png): the tooltip reads "Privacy settings". The loading dialog is still at the same
spot and the Summary still says "Reading...".

```
timeout 120 node app-b/study.mjs --try .../09.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "Summary"
```

Result (09.png): the Summary section collapsed, still "Reading...", and the dialog was still at
two thirds.

"The summary of my graph never finished for me. The only way I got past the loading dialog was to
click something in the left list. I never saw a summary that says 'from miserables.gexf: N nodes,
M edges, K attributes, 0 skipped'."

### 9. The "from miserables.gexf" link

```
timeout 120 node app-b/study.mjs --try .../10.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf"
```

Result (10.png): the import screen again, now titled "Edit: miserables.gexf", with the same 77
nodes and 254 edges and the same match report. At the bottom: "Apply is off: Nothing has changed
yet".

"So the link to the source takes me back to the import report. That's useful: I can get back to
'what came out of the file' after loading. I'm stopping here."

## Outcome

**Did I succeed?** Mostly. I can state: 77 characters, 254 connections, every node id unique,
every edge has both ends, and the `value` column came through. That's the check. What I could not
establish:

- Whether anything was merged or skipped. There's no line saying "0 duplicate edges, 0 self
  loops, 0 rows skipped", which is the line I actually look for in Gephi's import report.
- Whether the graph is directed. "As the file says" never tells me what the file says.
- Why the weight is "none" when the file has a value per edge.
- Whether the thing I ended up looking at is my file. After Load I got PageRank coloring, a
  Louvain partition, four notes, a watchlist and a report folder that I never made. Those look
  like the Les Miserables sample's worked examples. That is the most damaging part of this
  session. I came here to confirm nothing was lost, and instead the program added things.

**Single Ease Question (1 = very difficult, 7 = very easy):** 4. The import report itself was
easy and clear, about a 6. Everything after Load cost me the points: a loading dialog that hung
until I clicked elsewhere, a summary that never finished, and an analysis I didn't ask for laid
over my data.

**Would I use this instead of Gephi?** No. The pre-load report, with counts, unique ids, "every
edge has both ends" and a link back to it from the loaded graph, is better than Gephi's import
report, and I'd tell my students so. But my first rule is that a tool shows me my data and
nothing else until I ask. Opening my file and finding PageRank, communities and someone's notes
already on it means I can't trust which numbers are mine. And treating the edge weight as "none"
is exactly the kind of quiet default that gets a wrong weighted degree into a paper. I'd stay on
Gephi.
