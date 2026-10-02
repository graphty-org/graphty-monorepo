# Session: bring in a saved network and check it arrived whole -- Jordan, marketing network analyst

Task as given: "A colleague saved the network of characters onto your computer for you. Bring it into graphty, starting from the screen you see, and check it arrived whole."

Renders: design/ui/prototype/tmp/round-7-sessions/t14--marketing-analyst/ (02 to 06; 01 is the start screen in shots/tasks/t14/01.png).

## Step 1 -- start screen (shots/tasks/t14/01.png)

Think-aloud: "Start, Recent projects, Samples. My colleague saved me a file, so it's 'Open project or file...', not the sample on the right, even though that one also says Les Miserables. And good: 'Files are read on this computer and never uploaded' and 'Local only' top right. That's my first question answered before I asked it. Legal stays out of it."

## Step 2 -- open the file (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:t14 --click "Open project or file..."

Result: no file picker appeared. The app went straight into a project called "Les Miserables" with a map, a legend (Color: PageRank, Size: Degree) and a left list already holding PageRank, Louvain, Shortest paths, a Watchlist and a "For the report" folder.

Think-aloud: "Wait, I didn't pick anything. Did it open my colleague's file or the sample? There's no 'you opened X' moment. I guess the colleague saved a whole project with analysis already in it, because there's PageRank and a report folder. Right side says 'Paints 77 nodes'. The sample card said 77 characters, so maybe. But a paint count isn't a load count. I want to know how many came in."

## Step 3 -- look for counts (03.png, 04.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:t14 --click "Open project or file..." --click "Data"
    timeout 120 node app-b/study.mjs --try .../04.png task:t14 --click "Open project or file..." --click "Table"

Data (03): Sources shows "miserables.gexf -- 77 nodes, 254 edges", "nodes . 77 nodes", "edges . 254 rows, 254 edges". The right panel has a Summary: Nodes 77, Edges 254, Undirected, Connected components 1, Weight "value, stronger".

Table (04): "77 nodes", Valjean at the top with degree 36, then Gavroche, Marius, Javert.

Think-aloud: "OK, the Data tab is the one. 254 rows, 254 edges, so nothing dropped between the file and the graph, I think. One component, so nobody's floating off on their own. And Valjean's the top hub, which is who I'd expect, so I believe the table. I'd have liked it to just tell me this the moment the file opened instead of me hunting for a tab called Data."

## Step 4 -- check the source itself (05.png, 06.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf"
    timeout 120 node app-b/study.mjs --try .../06.png task:t14 --click "Open project or file..." --click "Data" --click "miserables.gexf" --click "edges"

05: an "Edit: miserables.gexf" screen. "Makes Les Miserables: 77 nodes, 254 edges". At the bottom: "Match report: nodes -- 77 rows; every id is unique." Cancel and a grayed Apply.
06: edges table. "Match report: edges -- 254 rows; every edge has both ends." The header line says "Weight: none (each edge counts 1)".

Think-aloud: "I clicked the file to see details and landed in an *edit* screen. Slightly nervous, there's an Apply button. I'm not touching that. But the match report at the bottom is exactly the sentence I want: every id unique, every edge has both ends. That's 'arrived whole'.

But this screen says 'Weight: none (each edge counts 1)' and the summary panel a minute ago said 'Weight: value, stronger'. Which is it? That's my whole problem with Talkwalker, the dashboard says one number and the download says another. If the betweenness ranking uses weights on one screen and not the other, I'd want to know before I put a name on a slide. Anyway. Cancel. Done."

Stopped here.

## Outcome

- Did I succeed? Yes, I think so. 77 characters, 254 links, ids unique, every link has both ends, one component. I'm less sure it was my colleague's file and not the sample, because I never saw a picker or a "you opened" confirmation.
- Single Ease Question: 5 of 7. Opening was one click. Checking it was whole took three screens, and the best proof (the match report) sits in an edit screen I'd normally avoid.
- Would I use this instead of my current tool? Maybe, for this part. Gephi's import report tells me the counts right at import; here I had to go looking. The local-only line is better than anything Gephi or Brandwatch tell me. But the two different weight answers would make me double-check every number before it goes in a deck, and I don't have time for that.

## Problems seen

1. No visible file choice or confirmation after "Open project or file..."; I could not tell my colleague's file from the sample of the same name.
2. Nothing says "here is what loaded" at the moment of opening; the counts live in the Data tab and the match report lives inside an edit screen.
3. The weight is reported two ways: "value, stronger" in the summary, "none (each edge counts 1)" in the source edges screen.
4. Clicking a source to inspect it opens it for editing (Apply/Cancel); a read-only look would feel safer.

## What worked

- "Files are read on this computer and never uploaded" on the start screen, before loading.
- "254 rows, 254 edges" in Sources and the plain-words match reports ("every id is unique", "every edge has both ends").
- A known hub (Valjean) on top of the table, so I trusted the rest.
