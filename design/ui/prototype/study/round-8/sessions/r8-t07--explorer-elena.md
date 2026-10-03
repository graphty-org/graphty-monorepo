# Session: rank the Les Miserables characters by how much the network depends on them -- Explorer Elena

Participant: Explorer Elena (first-time graph user, product manager, no graph vocabulary).

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Have the program put the characters in order of how much the whole network depends
on them, and tell us the top three, in order, and what the order was based on."

Start screen: shots/tasks/r8-t07/01.png. Renders: tmp/round-8-sessions/r8-t07--explorer-elena/.
All commands run from design/ui/prototype.

## Steps

### 1. Start screen (01.png)

Think-aloud: "A start page. Open, New from data... and Samples on the right. Les Miserables is the
first one, 77 characters. There's a big 'please help us' banner at the bottom. No thanks."

### 2. Open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t07 --click "No thanks" --click "Les Miserables"

Saw: a graph with a dark dot in the middle labeled Valjean, a "Color: PageRank 0.00330 to 0.0754" box
at the top, a long list on the left (PageRank, Louvain, Shortest paths, Density, Link prediction,
Top 9 by de..., Watchlist, For the report, Betweenness, Everything), and a panel on the right about
PageRank colors.

Think-aloud: "Whoa, there's already a lot going on. Somebody's been in here. The dark one in the
middle is Valjean, so I'd bet he's number one -- he's in the middle of everything. But the task
says 'put them in order'. That sounds like a list. There's a 'Table' at the bottom. Let me try
that."

### 3. Open the table (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"

(The tool reported "Table" matched two controls and clicked the first, the button.)

Saw: a table of 77 nodes "sorted by degree": Valjean 36, Gavroche 22, Marius 19, Javert 17. A line
above it: "Valjean is first on all three measures; Gavroche is in the top 3 on all three". Columns
Degree, Rank by degree, PageRank, Rank by Page... (cut off).

Think-aloud: "Oh, a list. Valjean, Gavroche, Marius, Javert. And it says Valjean is first on 'all
three measures'. Which three? It says 'sorted by degree'. I don't know what degree is. Is that how
much the network depends on them? Let me rest on the column name and see if it explains."

### 4. Hover the Degree column (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --hover "Degree (full graph)"

Tooltip: "77 values, 1 to 36".

Think-aloud: "'77 values, 1 to 36.' OK... that doesn't tell me what it is. And the task said to
HAVE the program put them in order, and this was already sorted before I got here. The panel on
the right says 'Measure from Analyze'. Maybe there's an Analyze thing that does the ordering. That
flask button at the bottom looks science-y."

### 5. Hover the flask (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --hover "Analyze"

Tooltip: "Analyze Shift+A". "Yep, that's it."

### 6. Open Analyze (06.png)

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"

Saw: an Analyze box with "Search, or say what to find", Recent (Louvain, PageRank, Shortest path),
and "Rank nodes and edges": PageRank (marked "Start here"), Degree, Total value, Betweenness,
Closeness, Eigenvector, each with a one-line description, some cut off.

Think-aloud: "'Rank nodes and edges' -- rank, that's ordering. Good. A bunch of names I don't know.
Betweenness, closeness, eigenvector... no. PageRank says 'Start here', so I'll do what it tells me.
'Which nodes are connected to other well-connected nodes' -- that sort of sounds like what
everybody depends on."

(She read the PageRank line and the badge. She did not read the Betweenness line to the end; it was
cut off and the word put her off.)

### 7. Pick PageRank (07.png)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here"

Saw: PageRank options: Weight "value (loaded weight)", "Higher means" Stronger / Farther / Capacity
with explanations, Damping 0.85, buttons "Run as copy" and "Update PageRank row" (blue), "Under a
second".

Think-aloud: "Weight, damping, capacity... no idea, I'll leave whatever it picked. The blue button
says 'Update PageRank row'. I guess it already did this once? 'Run as copy' -- a copy of what? Fine,
the blue one."

### 8. Run it (08.png)

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here" --click "Update PageRank row"

Saw: right panel now shows PageRank, a bar chart, and "Top 10": 1 Valjean 0.0754, 2 Myriel 0.0428,
3 Gavroche 0.0358, 4 Marius 0.0309, 5 Javert 0.0303 ... and "Made with ... Ran Sep 28, on the CPU".

Think-aloud: "Oh nice, 'Top 10'. That's exactly what I wanted. Valjean, Myriel, Gavroche. Wait,
the list before had Gavroche second and Marius third. Now Myriel jumped to second? OK -- that one was
'degree', this is PageRank, different things I guess. And it says 'Ran Sep 28'. Today isn't Sep 28.
Did my click even do anything? The picture looks the same as before. Whatever, the numbers are
here. I'll go with this one, it's the one the program told me to start with."

Stopped here.

## Answer given

"Top three: Valjean, then Myriel, then Gavroche. It's based on PageRank -- which characters are
connected to other well-connected characters. Valjean's way ahead, 0.075, the next one is about
half that."

## Debrief

- Succeeded? "I think so. I got a top three out of the program. I'm not 100 percent sure PageRank
  is the 'depends on them' one -- there were like six of those ranking things, and the table had a
  different order. I took the one that said Start here."
- Single Ease Question (1-7): 5. "Finding the list was easy. Picking which ranking was a guess."
- Would she use this instead of her current tool? "Maybe, for a first look. The Top 10 box is what
  I'd paste in Slack. But I'd want it to just tell me which ranking answers my question in plain
  words, because I'd have to explain to my VP why Myriel is second on one list and not on the
  other, and I can't."

## Observations for the study team

- She found an ordered list twice, by two routes: the bottom Table (already sorted by degree before
  she touched anything) and the Analyze -> PageRank -> Top 10 panel. The two orders disagree on
  places 2 and 3 (Gavroche, Marius vs Myriel, Gavroche); she noticed and could not explain it.
- "Start here" on PageRank decided her choice of measure. She never considered Betweenness, whose
  description ("Which nodes sit on the most shortest paths between o...") is truncated and whose
  name is jargon to her. If the task's intended measure is the one about the network depending on a
  character as a go-between, the badge steered her to a different one.
- After "Update PageRank row" nothing visible changed on the canvas and the panel said "Ran Sep 28";
  she was unsure her run happened.
- The Degree column tooltip ("77 values, 1 to 36") did not tell her what degree means.
- The sample opened already full of prior work (measures, groups, notes, a folder "For the report"),
  so "have the program put them in order" was ambiguous: it was already in order.
- The Analyze dialog's options (Weight, Higher means, Damping) were skipped unread, as expected.
