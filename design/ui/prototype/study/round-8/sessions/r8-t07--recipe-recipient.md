# Session: rank the characters by how much the network depends on them -- Tom, the recipe recipient

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

Renders are in `tmp/round-8-sessions/r8-t07--recipe-recipient/` (start screen:
`shots/tasks/r8-t07/01.png`). All commands run from `design/ui/prototype`.

## Step 1 -- start screen (01.png)

Think-aloud: "OK, nothing to install, good. 'Files are read on this computer and never uploaded'
-- I read that. There's a box at the bottom asking to share usage data. No thanks. On the right,
Samples, Les Miserables, 77 characters. That's the one she said."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t07 --click "No thanks" --click "Les Miserables"

Think-aloud: "Hm. That's a lot. A picture of orange dots, and a list on the left: PageRank,
Louvain, Shortest paths, Density, Link prediction, Betweenness... I don't know what any of those
are, and I'm not learning them at 4 pm. The legend says 'Color: PageRank 0.00330 to 0.0754'.
Darker is more, I guess. Valjean's dot is the darkest. But I can't read an order off a picture.
I want a list. There's 'Table' at the bottom."

## Step 3 -- open the table (first attempt)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table"

(The tool said "Table" matched two things and clicked the first.)

Think-aloud: "Now that's a list. '77 nodes, sorted by degree'. Valjean 36, Gavroche 22, Marius 19,
Javert 17. There's a line above it: 'Valjean is first on all three measures; Gavroche is in the
top 3 on all three.' Which three measures? I see Degree and PageRank columns, the third is cut
off. And is 'degree' the same as how much the network depends on someone? I don't know. Degree
sounds like how many people he's connected to. 'Depends on' sounds like something else. I'm not
sure this is the answer they want."

## Step 4 -- the flask button

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t07 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze"

Think-aloud: "The little flask is called Analyze. It opens a list: 'Rank nodes and edges'.
PageRank, with a 'Start here' tag, 'Which nodes are connected to other well-connected nod...'
-- cut off. Degree, Total value, Betweenness 'Which nodes sit on the most shortest paths
between o...', Closeness, Eigenvector. Six ways to rank and none of them says 'depends on'.
There's a search box, 'Search, or say what to find', but I'd have to know what to call it.
The program says start here, so I'll start there."

## Step 5 -- PageRank, "Start here"

    timeout 120 node app-b/study.mjs --try .../06.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Start here"

(The tool said "Start here" matched four things and clicked the first, PageRank.)

Think-aloud: "Now it asks me questions. Weight, 'value (loaded weight)'. 'Higher means: Stronger,
Farther, Capacity'. Damping 0.85. I don't know. And the button says 'Update PageRank row'. Update
what? Is that going to change her file -- well, the sample. 'Run as copy' sounds safer but I
don't know what I'd get. This is the part where I'd ask the postdoc. I'm not pressing either.
The table already had a PageRank column. I'll just use that."

## Step 6 -- back to the table, sort by PageRank (second attempt)

    timeout 120 node app-b/study.mjs --try .../07.png task:r8-t07 --click "No thanks" --click "Les Miserables" --click "Table" --click "PageRank (full graph)"

Think-aloud: "Clicked the PageRank heading, the little arrow moved there. Now: Valjean 0.0754,
Myriel 0.0428, Gavroche 0.0358, Marius 0.0309. Myriel jumped to second -- he only has 10 in
degree, he was 18th. So the order depends on which column you pick. And it still says 'sorted by
degree' above the table, even though the arrow is on PageRank now. Which is it? The numbers go
down, so I think it's sorted by PageRank and the label is just wrong. That line still says
'Gavroche is in the top 3 on all three', and he's third here, so that fits at least."

"I'll stop here. I picked the one the program told me to start with."

## Answer given

Top three: 1. Valjean, 2. Myriel, 3. Gavroche. Based on PageRank, because the program marked it
"Start here". Not confident that PageRank is what "the whole network depends on them" means; by
degree the order would be Valjean, Gavroche, Marius instead.

## Debrief

- Succeeded? "Partly. I got a top three from the program, but I picked the measure because it
  said 'start here', not because I knew it meant 'depends on'. If you'd asked a different
  person they'd pick a different column and get a different answer. Nothing told me which one
  answers the question."
- Single Ease Question: 3 of 7. "The table was easy once I found it. Choosing what to rank by
  wasn't. Six names and none in English."
- Use instead of current tool? "For this, no. Nobody in my lab asks me to rank things; she'd do
  this. If she sent me the table already sorted with a sentence on top saying what it means, I'd
  read that. I'd probably ask her about the PageRank bit."

## Observations for the moderator (problems seen, in Tom's terms)

1. The ranking measures are listed by technical name (PageRank, Betweenness, Closeness,
   Eigenvector); none is described in the words of the question ("depends on"). The descriptions
   that might have helped are cut off mid-sentence. Tom chose by the "Start here" badge, not by
   meaning.
2. The PageRank panel asks Weight / Higher means / Damping and offers "Update PageRank row" vs
   "Run as copy"; "Update" sounded like changing the file, so Tom backed out.
3. After sorting by the PageRank column the caption still read "sorted by degree", contradicting
   the arrow on the PageRank heading.
4. The summary line "Valjean is first on all three measures" does not say which three; only two
   measure columns were visible.
5. The "Table" button sits at the bottom edge in small text; Tom found it only because he was
   looking for a list.
