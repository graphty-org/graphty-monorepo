# Session: bring in miserables.gexf and check it all arrived -- the class-project student

Participant: the student with a class project (study/personas/class-project-student.md), first time in the app.

Task as given: "You have never used this program before. A colleague sent you a network file of the characters in Les Miserables and the chapters they share; you saved it as miserables.gexf in your Downloads folder. Bring it into the program and, before you do anything else with it, check that all of it arrived: how many characters, how many connections, and that nothing was dropped on the way in."

All commands were run from design/ui/prototype. Renders are in tmp/round-8-sessions/r8-t03--class-project-student/.

## Step 1 -- the start screen (shots/tasks/r8-t03/01.png)

Think-aloud: "OK, reading everything. Start: 'Open project or file...', 'New from data...', 'or drop a file anywhere'. Files are read on this computer and never uploaded -- good, my instructor always says that. Recent projects, empty. Samples on the right... there is a Les Miserables sample with 77 characters. Huh. That is the same thing my colleague sent me. I am tempted to click it to see what done looks like, but the task says bring in MY file, so I should not mix them up. And there is a big box at the bottom about usage data. I read it. I don't want to share anything for a class project. No thanks."

"The file is in Downloads, so 'Open project or file...' is the obvious one."

## Step 2 -- dismiss the data box, open the file chooser

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t03 --click "No thanks" --click "Open project or file..."

Render 02: a "Choose files" box listing Downloads: miserables-edited.graphml, miserables.gexf, Patent citations 1999-2001.graphty, and a grayed-out chapter-notes.docx.

Think-aloud: "There are two miserables files. The edited graphml one is newer -- did my colleague send me two? The task says the .gexf, so that one. The .docx is gray, I guess it can't open Word files. Fine."

## Step 3 -- pick miserables.gexf, Open

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

Render 03: an import screen. Banner across the top: "Makes  Les Miserables: 77 nodes, 254 edges". Left: Tables, miserables.gexf with "nodes 77" and "edges 254", each with a green check. Middle: a table with id, label, group -- Myriel, Napoleon, Mlle.Baptistine... "Showing the first 8 of 77 rows." Bottom: "Match report: nodes -- 77 rows; every id is unique." Bottom bar: Direction "As the file says / Directed / Undirected", Cancel, Load.

Think-aloud: "Oh nice, it tells me right away: 77 nodes, 254 edges. Nodes are the characters and edges are the connections, my tutorial used those words. And the names look right, Myriel, Napoleon. 'Every id is unique' -- I think that means no character got doubled. Green checks next to both tables. I want to see the edges side too before I believe 'nothing was dropped'."

"The Direction thing at the bottom -- my course tutorial said pick Undirected. But it says 'As the file says' is already chosen, and I don't know what the file says. I am leaving it alone since the task said not to do anything else yet."

## Step 4 -- look at the edges table

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"

Render 04: the edges table: source, target, value. "Showing the first 8 of 254 rows." Header line: "Each row is an edge: set by the file" and "Weight: none (each edge counts 1)". Match report: "254 rows; every edge has both ends."

Think-aloud: "'Every edge has both ends' -- so no connection points at a character that doesn't exist. That is what 'dropped' would look like, I think, so that is good. 254 rows in, 254 edges in the banner. Hmm, there is a 'value' column with numbers like 8 and 10, but it says 'Weight: none, each edge counts 1'. My guess is value is how many chapters they share. Is it ignoring that? I'm not going to fight it right now. Load."

## Step 5 -- Load

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"

Render 05: a gray empty canvas with a box "Reading miserables.gexf -- 77 nodes, 254 edges..." and a half-full progress bar with Cancel. The right panel "Co-appearances, Graph from miserables.gexf" has Summary "Reading...". The left says "Reading the data..."

Think-aloud: "It's loading. I'll wait. The right side has a Summary, that's probably where the final numbers will be."

## Step 6 -- click Summary while it reads

    timeout 120 node app-b/study.mjs --try .../06.png ... --click "Load" --click "Summary"

Render 06: same loading box; I just folded the Summary section shut. Still "Reading...".

Think-aloud: "Oops, that closed it. Still reading. Let me look somewhere else -- the Data button on the left, since this is about the data."

## Step 7 -- Data

    timeout 120 node app-b/study.mjs --try .../07.png ... --click "Load" --click "Data"

(The tool noted "Data" matched three controls and clicked the first, the Data button on the left rail.)

Render 07: the drawing is there now, all orange dots with names (Valjean, Javert, Cosette, Marius, Fantine...). A legend top left: "Color: PageRank 0.00330 to 0.0754". Left panel, Data: Sources -- miserables.gexf, 77 nodes, 254 edges; nodes "node . 77 nodes"; edges "254 rows, one edge per row; Weight: value, a higher value is a stronger tie". Attributes include betweenness, degree, and Results: Louvain, PageRank. Right panel Summary: Nodes 77, Edges "254 edges, each a distinct pair", Direction Undirected, Weight "value, stronger", Density 0.0868, Connected components 1, Average degree 6.60, Highest degree 36, a degree chart. Notes: "1 note -- Open in Notes". Bottom tabs: Table, Nodes, Edges, Louvain.

Think-aloud: "OK there's the picture, and it has names on it, so it worked. The Summary says 77 nodes, 254 edges, each a distinct pair. The left side says the same, 77 and 254. Same as what the import screen said before I pressed Load. Connected components 1 -- I think that means nobody got cut off by themselves? Good."

"But wait. I didn't do anything yet, and it's already colored by 'PageRank', there's a 'Louvain' tab at the bottom, betweenness and degree are already there, and there's already '1 note'. I never made a note. The Les Miserables sample on the first screen said it 'opens with worked examples: measures, groups, paths and notes already added.' Did it open the sample instead of my colleague's file? The top left just says 'Les Miserables', same as the sample. The right panel does say 'from miserables.gexf', so... probably mine? I'm not sure."

"Also it said 'Weight: none' on the import screen and now it says 'Weight: value, a higher value is a stronger tie'. And Direction: I left it on 'As the file says' and now it says Undirected, which is what my tutorial wanted anyway, so fine."

"For the assignment question -- how many characters, how many connections, anything dropped -- the answer is 77 characters, 254 connections, and both ends of every connection were found and every id was unique. The numbers matched before and after loading. I'm calling it done."

## Outcome

Did I succeed? I think so. 77 characters, 254 connections, and the import screen said every id is unique and every edge has both ends, and the numbers after loading matched. I am a little unsure whether what I'm looking at is really my file or the sample, because it came in already colored and with a note I didn't write.

Single Ease Question (1-7): 6. Getting the file in and seeing the counts was really easy, the counts were basically handed to me. I took one point off for the loading screen I had to click away from and the "where did PageRank and the note come from?" moment.

Would I use this instead of my current tool? For this part, yes. In Gephi I have to go find the counts in the overview, and our tutorial warned that imports quietly drop relations without telling you. Here it just said "every edge has both ends" before I even pressed Load. But if it adds things to my graph I didn't ask for, I'd worry about turning in an analysis I didn't actually run.

## What I noticed (in my own words)

- The import screen answered the whole task before Load: "77 nodes, 254 edges", "every id is unique", "every edge has both ends". That was the best part.
- Two different stories about weight: "Weight: none (each edge counts 1)" on the import screen, "Weight: value, a higher value is a stronger tie" after loading. Which is it?
- After loading, my fresh file showed PageRank coloring, a Louvain tab, betweenness, degree and 1 note that I never made. It looks like the sample, and the name in the corner is the same as the sample's. I could not tell if my own file came in clean.
- The loading box sat there half-full; I clicked Summary to wait and only folded it shut by accident.
- The words "nodes" and "edges" are what my tutorial uses, so I was fine, but the task said "characters" and "connections" and the app only said those in the sample card.
- "Direction: As the file says" -- I had no way to know what the file says until after loading, when it said Undirected.
- Two miserables files in Downloads (an edited .graphml and the .gexf) made me double-check which one to pick.
