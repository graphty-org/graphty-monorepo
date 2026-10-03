# Session: rank the Les Miserables characters by how much the network depends on them

Participant: Ruth, investigations reporter, first time with a graph tool (persona
study/personas/data-journalist.md). Task given by the moderator: "You have never used this
program before. You will practice on the ready-made network of characters from the novel Les
Miserables that comes with the program, not on your own data. Have the program put the characters
in order of how much the whole network depends on them, and tell us the top three, in order, and
what the order was based on."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t07--data-journalist/. The start screen is shots/tasks/r8-t07/01.png.

## Think-aloud

### 01 -- start screen

"OK, a home page. Start, Recent projects, Samples. Les Miserables is right there at the top, 77
characters, and the blurb even says 'who holds the story together', which sounds like my
question. There's a big box at the bottom asking to share usage data. It says nothing is collected
until I answer and 'Local only' is up in the corner -- good, I check that sort of thing. No
thanks. Then the Les Miserables sample."

### 02 -- the sample opens

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t07 --click "No thanks" --click "Les Miserables"

"Whoa, that's busy. A web of dots, a few names on it -- Valjean in the middle, Marius, Gavroche,
Javert. A long list on the left: PageRank, Louvain, Shortest paths, Density, Top 9 by degree,
Watchlist, a folder 'For the report' with a Betweenness in it, crossed-out eye. This sample comes
with someone else's work already done, which is a lot to take in. The legend says the color is
PageRank. I don't know what PageRank is beyond Google. I want a list, not a picture -- I can't
put a picture in front of a fact-checker. There's a 'Table' at the bottom. Let me open that."

### 03 -- the table

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"

"Now this I understand. Rows of characters, sorted by degree: Valjean 36, Gavroche 22, Marius 19,
Javert 17. Degree I can guess -- number of connections. There's even a sentence above it:
'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Which three
measures? It doesn't say right there. Tempting to stop here and say Valjean, Gavroche, Marius by
connections. But the question was how much the WHOLE network depends on someone. Having lots of
friends isn't the same as everybody needing to go through you. In my story the person I care
about is the one who sits in the middle of the chains -- the fixer. So degree feels like the wrong
ruler. Let me see what else the program can measure. There's a flask icon in the toolbar."

### 04 -- hover the flask

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --hover "Analyze"

"'Analyze, Shift+A.' OK."

### 05 -- the Analyze menu

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Analyze"

"A menu with a search box, 'Search, or say what to find'. Under 'Rank nodes and edges': PageRank,
with a little 'Start here' tag; Degree; Total value; Betweenness -- 'Which nodes sit on the most
shortest paths between others'; Closeness; Eigenvector. The 'Start here' tag pulls at me, but
PageRank's line is 'connected to other well-connected nodes' -- that's popularity again.
Betweenness is the one that reads like my question: if lots of the shortest routes between
people pass through you, the network depends on you. I'll pick Betweenness. Though honestly, if
I hadn't already been thinking about chains, I'd probably have clicked 'Start here'."

### 06 -- Betweenness settings

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Analyze" --click "Betweenness Which nodes sit on the most"

(My first try, `--click "Betweenness"`, hit the Betweenness row in the left list and timed out,
because two things on screen were called Betweenness.)

"A settings card. Weight: 'value (loaded weight)'. Higher means: Stronger, Farther, Capacity,
with a line under each. 'All 254 edges have value set; none is left out.' 'Betweenness reads a
weight as distance: it uses 1/value.' I appreciate that it tells me what it does -- that's the
sentence I'd need for an editor -- but I'd have to think about whether 1/value is right. I assume
value is how many chapters two characters share, so more chapters means a closer tie means a
shorter hop. Sounds sensible. Leave the defaults. 'Under a second.' Run."

### 07 -- after Run

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run"

"A new row on the left, 'Betweenness 2', with a spinner and a blue bar under it. The table didn't
change -- still sorted by degree, no new column I can see. The picture didn't change either.
'Under a second' -- it's still spinning."

### 08 -- click the new row

    timeout 120 node app-b/study.mjs --try .../08.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Analyze" --click "Betweenness Which nodes sit on the most" --click "Run" --click "Betweenness 2"

"Clicking it just highlights it. Still spinning, the right panel still shows the graph summary,
nothing about my result. I've no idea whether it's working or stuck. And why '2'? Oh -- there
was already a Betweenness down in 'For the report'. Somebody ran it before me. Let me look at that
one instead of waiting."

### 09 -- the existing Betweenness row

    timeout 120 node app-b/study.mjs --try .../09.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Betweenness"

"The right side shows 'Betweenness, Measure from Analyze'. 'Covered by PageRank for Color',
'Paints 77 nodes, none visible'. Fill: yellow to orange. This is all about coloring the picture.
I don't want a color, I want the list. There's a 'Data' tab next to 'Style'."

### 10 -- Data

    timeout 120 node app-b/study.mjs --try .../10.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Betweenness" --click "Data"

(The tool warned two things were called Data and clicked the first, the Data button on the far
left, not the tab I meant.)

"This took me to a whole Data page about the file: sources, filters, attributes. Under 'Other
attributes' there's 'betweenness' and 'degree'. So betweenness is a column somewhere. The table
said 'Columns: 9 of 9' -- maybe it's off to the right where I can't see."

### 11 -- the column chooser

    timeout 120 node app-b/study.mjs --try .../11.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Columns: 9 of 9"

"Yes, betweenness is ticked, so it's in the table, just past the edge of the screen. There's no
sideways scroll I can see. I'll untick degree and group to make room."

### 12 -- columns trimmed

    timeout 120 node app-b/study.mjs --try .../12.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Columns: 9 of 9" --click "degree" --click "group" --key Escape

(Unticking group failed: the click went to the table header called group instead.)

"Degree went away, but the caption still says 'sorted by degree'. Rank by degree and PageRank
columns are still there, and I can see the start of 'Betw...' at the right edge. Can I click it?"

### 13 to 15 -- trying to sort by betweenness

    timeout 120 node app-b/study.mjs --try .../13.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Columns: 9 of 9" --click "degree" --key Escape --click "# Betweenness"
      -> nothing on screen is called "# Betweenness"
    timeout 120 node app-b/study.mjs --try .../13.png ... --click "Betw"
      -> clicked "Show Betweenness" (the eye in the left list), not the header
    timeout 120 node app-b/study.mjs --try .../14.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Columns: 9 of 9" --click "degree" --key Escape --click "# Betweenness (full graph)"
      -> nothing on screen is called "# Betweenness (full graph)"
    timeout 120 node app-b/study.mjs --try .../14.png ... --click "betweenness column menu"
    timeout 120 node app-b/study.mjs --try .../15.png ... --click "# Rank by betweenness (full graph)"
      -> nothing on screen is called "# Rank by betweenness (full graph)"
    timeout 120 node app-b/study.mjs --try .../15.png ... --click "Rank by betweenness (full graph) column"

"The little menu on the betweenness column offers 'Add label line', 'Show as groups', 'Place by'
(greyed out, with a long apology about layouts), 'Filter to...', 'Select where...', 'Read as...',
'Edit on the Data page'. No 'Sort'. Every spreadsheet I've ever used has sort in that menu. Same
menu on the 'Rank by betweenness' column. Behind the menu I can see Rank by betweenness: Valjean
#1, Gavroche #3, Marius #4, Javert #7. So somebody is #2 and it's not on screen. Frustrating.
Degree had a little arrow on its header -- maybe clicking the header name itself sorts, like
Excel."

### 16 -- sorted

    timeout 120 node app-b/study.mjs --try .../16.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "Columns: 9 of 9" --click "degree" --key Escape --click "Betweenness (full graph)"

"There. The Betweenness (full graph) header has the down arrow now, and the table reordered:
Valjean 0.570, Myriel 0.177, Gavroche 0.165, Marius 0.132. Myriel! Myriel is only #18 on
connections, so this really is a different answer from degree -- the bishop links his little
group to Valjean and everyone else. That's the sort of thing I'd want to know.

Two things bother me. The caption above still says 'sorted by degree', which is wrong now --
if I'd screenshotted this for the desk, it would be mislabeled. And I don't know for sure which
settings this betweenness was run with. The one I ran myself never finished. I'm reading
numbers from a run somebody else did, and I'm trusting it used the chapter counts the way the
settings card described. I'd want to see 'what was counted' right next to the column before I
printed it."

## Answer given to the moderator

"Top three, in order: Valjean, Myriel, Gavroche (Marius is fourth). The order is betweenness:
how many of the shortest routes between other characters pass through that person, with
characters who share more chapters counted as closer. By plain number of connections it would
be Valjean, Gavroche, Marius instead -- I picked betweenness because the question is about the
network depending on someone, not about how many people they know."

## Debrief

- Do I think I succeeded? Mostly yes. I'm confident about the ranking I read off, less confident
  that the betweenness column was computed the way I'd describe it, because my own run never
  finished and I used one that was already there.
- Single Ease Question: 3 out of 7. Finding Betweenness in the menu was fine and the explanation
  on the settings card was good. Everything after Run was a struggle: a spinner that never
  stopped, a result that showed up as a coloring layer instead of a list, a column off the edge
  of the table, a column menu with no Sort, and a caption that kept saying "sorted by degree".
- Would I use this instead of my current tool? Not yet. Today I'd do this in a spreadsheet with
  NodeXL or hand it to the graphics desk with Gephi. I like that it explains what a measure does
  in plain words and keeps everything on my computer -- that matters for unpublished names. But
  if I can't easily get a sorted list I trust, with what it counted written next to it, I can't
  use the number in a story.
