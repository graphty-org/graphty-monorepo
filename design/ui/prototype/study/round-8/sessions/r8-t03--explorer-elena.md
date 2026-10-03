# Session: bring in miserables.gexf and check it all arrived -- Explorer Elena

Task as given: "You have never used this program before. A colleague sent you a network file of the
characters in Les Miserables and the chapters they share; you saved it as miserables.gexf in your
Downloads folder. Bring it into the program and, before you do anything else with it, check that
all of it arrived: how many characters, how many connections, and that nothing was dropped on the
way in."

Participant: Explorer Elena (product manager, no graph training, says "dots" and "lines").

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t03--explorer-elena/.

## Step 1 -- start screen (shots/tasks/r8-t03/01.png)

Think-aloud: "A start page with 'Open project or file...' and 'New from data...'. There's a
banner at the bottom asking for usage data. No thanks. I have a file, so 'Open project or file'
is the obvious one. I notice there's also a sample called Les Miserables on the right; I'm
ignoring it, because I want MY file."

## Step 2 -- file picker (02.png)

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-8-sessions/r8-t03--explorer-elena/02.png task:r8-t03 --click "No thanks" --click "Open project or file..."

Think-aloud: "A 'Choose files' box showing Downloads. miserables.gexf, 22 KB, Sep 27. There's
also 'miserables-edited.graphml' -- not what my colleague sent. Tick the gexf, press Open."

## Step 3 -- preview, nodes (03.png)

    ... --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

Think-aloud: "It didn't open the picture, it's showing a table first. Top line says 'Les
Miserables: 77 nodes, 254 edges'. I'm guessing nodes are the characters and edges are the
connections. Columns id, label, group. At the bottom: 'Match report: nodes -- 77 rows; every id
is unique.' That sounds like the check I want, for the characters at least."

## Step 4 -- preview, edges (04.png)

    ... --click "Open" --click "edges"

Think-aloud: "'254 rows; every edge has both ends.' Good, so no line points at nobody. But it
says 'Weight: none (each edge counts 1)' and there's a 'value' column with 1, 8, 10, 6. Is that
number being thrown away? Under it, it says 'Attribute' -- maybe that means kept. Not sure. Also
the top bar already says 'Les Miserables'. Is it in already, or just previewing?"

## Step 5 -- pressed Load (05.png), waited (06.png)

    ... --click "edges" --click "Load"
    ... --click "Load" --hover "Local only"      (tooltip: "Privacy settings")

Think-aloud: "'Reading miserables.gexf -- 77 nodes, 254 edges...' with a progress bar about
halfway. Summary on the right says 'Reading...'. I waited, rested the pointer on something --
still halfway. For 77 characters? That's a tiny file. Is it stuck?"

## Step 6 -- clicked "Everything" (07.png)

    ... --click "Load" --click "Everything"

Think-aloud: "Now a picture: dots and lines, Valjean in the middle, Javert, Cosette, Marius. Right
side: 'Paints 77 nodes, 254 edges'. Same numbers, good. But the left still says 'Reading the
data...', and there's a 'Color: PageRank' box and a 'Louvain' tab at the bottom. I didn't ask for
either and I don't know what they are. Did it open the sample with its 'worked examples'
instead of my file? Did the clicking on 'Everything' make the loading finish, or did it just
finish by itself? I can't tell."

## Step 7 -- Data (08.png)

    ... --click "Everything" --click "Data"     (tool note: "Data" matched the left rail button and a tab; the rail button was clicked)

Think-aloud: "This is the most useful screen so far. Left: Sources -- miserables.gexf, 77 nodes,
254 edges; edges '254 rows, one edge per row'; 'Weight: value, a higher value is a stronger
tie'. Right, Summary: Nodes 77, Edges 254 'each a distinct pair', Connected components 1 --
which I take to mean nobody is cut off on their own.

Two things don't add up. The preview said 'Weight: none', now it says weight is 'value'. Which
is it? And under Results there's PageRank and Louvain, plus 'betweenness' and 'degree', and '1
note' -- I added none of that. Maybe my colleague put it in the file. Maybe it's the sample.
Nothing tells me which. Also there's a 'Density 0.0868' and '4 more readings not computed' --
no idea, skipping."

## Step 8 -- clicked the file under Sources (09.png)

    ... --click "Data" --click "miserables.gexf"

Think-aloud: "Same screen as the preview, now titled 'Edit: miserables.gexf'. Match report: 77
rows, every id unique; green checks next to nodes 77 and edges 254. So this is where the 'did
it all come in' answer lives. I'd Cancel out of here so I don't break anything. I'm done."

## Outcome

- Did I succeed? I think so. 77 characters, 254 connections; the file check said every
  character id was unique and every connection had both ends, with green checks; the loaded
  graph showed the same 77 and 254 and one connected piece.
- What I'm not sure of: nothing ever said in plain words "everything in the file was loaded,
  nothing skipped" -- I'm inferring it from matching numbers. The loading box sat half done and
  the left said "Reading the data..." even after the picture showed. The weight line changed
  between preview ("none") and after loading ("value"). And PageRank, Louvain, betweenness and a
  note appeared that I did not add, so for a moment I wasn't sure it was my file and not the
  sample.
- Single Ease Question: 5 of 7. Opening was easy; being sure took detective work.
- Would I use this instead of my current tool? For this, maybe -- the counts and the "every
  edge has both ends" line are more than Gephi or a spreadsheet would tell me. But the stuck
  loading bar and the extra things I didn't add make me trust it less, and I'd want a single
  "here's what came in, here's what was skipped (nothing)" line I could screenshot for my
  colleague.
