# Round 5 tree test transcript: Dr. Min-ji Kim, knowledge graph engineer, arm A

Simulated participant, played from `../../personas/knowledge-engineer.md`. She saw only the text
outline in `../tree-test.md`, arm A (Results as a section of the right panel), one level at a
time. She gave every answer before the answer key was opened; the key was used only to mark each
answer correct or not and direct or not. Answers were not changed afterwards.

Confidence is on a 1 to 7 scale (7 = certain). Paths use ">" for a step down and "(back)" for a
step back up the tree.

## Summary

| Task | First top-level place opened | Final pick | Confidence | Correct | Direct |
|---|---|---|---:|---|---|
| tt-1 second ranking | Main menu | Main menu > Algorithms > Centrality | 6 | yes | yes |
| tt-2 Valjean's score and place | Right panel, with a node selected | Right panel, with a node selected > Results | 6 | yes | yes |
| tt-3 how a run was set up | Right panel, with nothing selected | Right panel, with a result selected > Details | 5 | yes | no |
| tt-4 whole ranking, highest first | Bottom table | Bottom table > Column header menu (sort) | 6 | yes | yes |
| tt-5 bigger transfer costs more | Data | Data > Sources > Its columns ("Default for new runs") | 4 | yes (counted separately) | no |
| tt-6 picture for the paper | Main menu | Main menu > File > Export... | 6 | yes | yes |
| tt-7 a team's colors and sizes file | Main menu | Data > Recipes | 3 | yes | no |
| tt-8 next month's file | Data | Data > Sources > Update with new data... | 6 | yes | yes |
| tt-9 two colors she cannot tell apart | Canvas | Canvas > Legend > Each entry's menu (Change color...) | 6 | yes | yes |
| tt-10 money in far above money out | Main menu | Main menu > Algorithms > Centrality (Weighted degree) | 5 | yes | yes |
| tt-11 total money along a route | Bottom table | Bottom table > Footer | 6 | yes | yes |
| tt-12 biggest group versus the rest | Right panel, with a set, a group or a path selected | Right panel, with a result selected > Compare with... | 4 | yes | no |
| tt-13 a cleared selection | Main menu | Main menu > Edit > Previous selection | 6 | yes | yes |
| tt-14 remove only the middle filter step | Filter chip | Filter chip > Filter steps | 7 | yes | yes |
| tt-15 has anything left the computer | Data | Data > Sent and saved | 6 | yes | yes |
| tt-16 where money went next, early August | Right panel, with a node selected | Right panel, with a node selected > Header actions (Neighbors) | 5 | yes | yes |

16 of 16 correct, 12 of 16 direct. Task 5 is counted separately: the column default works for
future runs but is not the per-run choice.

## Tasks, in the order she took them

### tt-14 remove only the middle filter step

Path: Filter chip > Filter steps. Stop.

"Each step with turn off, edit, delete. That is the one. Undo history would pull the third step
out with it, so I would not go near Edit for this."

Confidence 7. Correct, direct.

### tt-8 next month's file

Path: Data > Sources > Update with new data... Stop.

"Sources, then Update with new data, under the source it replaces. That is where I would expect
it. I also see it under File. What I want to know is what it does with an entity that vanished
between the two files -- does it say so, or does it quietly drop the node and every note on it?
The tree cannot tell me that."

Confidence 6. Correct, direct.

### tt-2 Valjean's score and place

"Which characters hold the groups together" -- she reads that as betweenness, and says so: "If
someone ran bridges instead, that is a different question."

Path: Right panel, with a node selected > Results. Stop.

"This node's value and rank in each run. Good, rank and value, not only a colour. I would want
the run named next to the number, because 'score' means nothing unless I know which measure."

Confidence 6. Correct, direct.

### tt-6 picture for the paper

Path: Main menu > File > Export... Stop.

"Export. I need SVG, not a screenshot. If this only gives me PNG at screen resolution I am back
in diagrams.net. I also see Export in Data and in the project-name menu; I assume they are the
same dialog."

Confidence 6. Correct, direct.

### tt-10 money in far above money out

Path: Main menu > Algorithms > Centrality. Stop at "Weighted degree: in, out, total".

"Weighted in-degree and out-degree, summed on the amount. Calling that centrality is a stretch,
but fine. What the manager actually wants is in minus out, or in over out. The tree gives me in
and out as two runs; I would run both and put them side by side in the table. If there is no way
to compute the difference I export and do it in pandas."

Confidence 5. Correct, direct.

### tt-3 how a run was set up

Path: Right panel, with nothing selected > Results > Each run, newest first (open it). "Opening
a run -- that is the 'result selected' state further down." (back) (back) > Right panel, with a
result selected > State line. "What it ran on and the weight. Useful, but not enough to repeat
it." > Details. Stop.

"Method, seed, settings. That is the run record. For 'exactly' I also need which version of the
data it ran on -- if the file was updated since, the same settings give a different answer. The
State line says 'what it ran on'; I hope that means the version, not only 'full graph'. I pick
Details."

Confidence 5. Correct, not direct.

### tt-9 two colors she cannot tell apart

"This is my daily problem. Red and green."

Path: Canvas > Legend. Reads all four children. > Each entry's menu (Change color...). Stop.

"The 'too close' flag is interesting -- if it flags red versus green on its own I would use that.
But I want to choose the colour myself, from the legend entry, not from a layer list. I would not
touch Look; high contrast changes everything, and I only want one group changed."

Confidence 6. Correct, direct.

### tt-1 second ranking

Path: Main menu > Algorithms > Centrality. Stop.

"'Ranking which characters matter' is centrality, and I have to say which one. Betweenness is
presumably done, so PageRank or closeness to check against it. I saw Results > Run a measure in
the right panel afterwards; it sounds like the same list. I would rather have the algorithm names
in front of me."

Confidence 6. Correct, direct.

### tt-15 has anything left the computer

Path: Data > Sent and saved. Stop.

"Every file written and everything sent. That is a log, and IT wants a log. The line under the
project name that says nothing has been sent is reassuring, but a one-line status is not what I
would forward to IT."

Confidence 6. Correct, direct.

### tt-5 bigger transfer counts as more expensive

Path: Data > Sources > Its columns (each numeric edge column: "Default for new runs", Change...).
Stop.

"Whether the amount is a cost or a strength is a property of the amount. It is semantics of the
column, it belongs with the data, like a range on a property. So I set it on the column. 'Default
for new runs' is a bit weak -- I would rather it were simply what the column means -- but it
covers the run I am about to do. I would expect the path tool to show me which way it is set
before it runs; I did not go and look there."

Confidence 4. Correct but not direct (counted separately: the column default rather than the
per-run choice).

### tt-11 total money along a route

Path: Bottom table > Footer. Stop.

"The sum of each numeric column over the selected rows. Like the status bar in a spreadsheet. I
would check that the amount column is summed and not the edge count."

Confidence 6. Correct, direct.

### tt-4 whole ranking, highest first

Path: Bottom table > Nodes tab, Edges tab, and a tab for each opened result. "Nodes, the score
is a column." > Column header menu (sort). Stop.

"Sort descending on the score column. That is what a table is for. I noticed 'Show in table,
sorted' on the result afterwards, which is the same thing from the other end."

Confidence 6. Correct, direct.

### tt-13 a cleared selection

Path: Main menu > Edit. Considers Undo. "In most tools undo does not cover a selection." >
Previous selection. Stop.

"Previous selection. Explicit. Good."

Confidence 6. Correct, direct.

### tt-12 biggest group versus the rest

"'Group' -- a community? Which algorithm? I will assume someone ran Louvain or Leiden."

Path: Right panel, with a set, a group or a path selected > Appearance, Members (count; show in
table), Notes. "Nothing that compares." (back) > Right panel, with a result selected > Compare
with... (another result, or the rest of the graph). Stop.

"Compare with the rest of the graph. I would want to know what it compares: attribute
distributions, density, degree? 'Differs' is vague and the tree is vague back. The row menu in
the table has 'compare this group with the rest' too, but I only saw that afterwards."

Confidence 4. Correct, not direct.

### tt-16 where money went next, early August

Path: Right panel, with a node selected > Header actions: Neighbors (hops, direction, a date
window). Stop.

"Out-neighbours, one hop, date window in early August. The second hop is where it gets
difficult: money that went on has to leave after it arrived. Neighbours of neighbours with the
same window is not the same thing as a time-respecting path. If this treats them as the same, the
answer is wrong and looks right."

Confidence 5. Correct, direct.

### tt-7 a team's colors and sizes file

Path: Main menu > File. "I am looking for Import." Open... is "opens a file as a new project".
"No, I do not want a new project." (back) (back) > Right panel, with nothing selected > Style
stack > Add a layer. "A layer from a file? It does not say." (back) (back) > Data > Recipes (each
one applied here; Apply a recipe...). Stop.

"A recipe. Recipe of what? If a recipe is what they call a style file, then this is it. I am
guessing. If the word were 'Styles' I would have gone straight there. I also want to know,
before I apply it, what it will change -- a preview, not 'applied'."

Confidence 3. Correct, not direct.

## What she said at the end

- "The things that are about the data are under Data and they say what they do. Sent and saved,
  Update with new data, Versions -- good."
- "'Recipe' is the one word I did not understand. I would have found a colour file faster under
  a word that says colour or style."
- "The weight meaning -- cost or strength -- belongs to the column in my head. If you make me
  choose it every run, show me on the run what the column default is, so the two cannot disagree
  without my noticing."
- "Neighbours with a date window is fine for one hop. For where money went next you need time
  ordering across hops, and the tree does not say whether it has it."
- "Details should name the data version. Seed and settings are not enough to repeat a result."
