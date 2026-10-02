# Session: export a colleague's ranking scores to a spreadsheet -- Morgan Reyes (screen-reader analyst)

Task as given: "Send the characters' scores from the ranking your colleague made to a
spreadsheet, so you can work on them in Excel. The data on screen is a sample: characters of the
novel Les Miserables, linked when they appear in the same chapter."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t17--screen-reader-analyst/`.

## Start screen (shots/tasks/t17/01.png)

Title says "Les Miserables". There is a list on the left with rows: Selection, Notes 4, PageRank,
Louvain 6 groups, Shortest paths, Watchlist, a folder "For the report" with Group 2, Group 8 and
Betweenness (that one has a crossed-out eye, so hidden), Everything. A legend over the drawing,
a right panel for PageRank, and at the bottom "Table", "Nodes", "Edges", "Louvain".

Think-aloud: "Ranking your colleague made." Which one is the colleague's? PageRank is the row
that is selected. Betweenness is filed under "For the report", which sounds like someone else's
work. Nothing I can hear says who made any of these. I am not going to guess yet; scores go to a
spreadsheet through a table, and a table export usually carries all the columns. I go to the
table first.

## Step 1 -- open the table

    timeout 120 node app-b/study.mjs --try $D/01.png task:t17 --click "Table"

The table opens under the drawing. It says "77 nodes", then a sentence: "Valjean is first on all
three measures; Gavroche is in the top 3 on all three". Columns: label, group, Degree (full
graph), PageRank (full graph), Rank by PageRank, Betweenness (full graph), and one more cut off.

Think-aloud: Good -- a count in words, and a one-line summary before the rows. Column headers say
which graph the number came from. "Rank by PageRank" is a ranking. Maybe that is the colleague's.
Still nothing says who made it. Now where is export? There is a "..." next to "Columns: 7 of 7".

## Step 2 -- find the name of the "..." button

    timeout 120 node app-b/study.mjs --try $D/02.png task:t17 --click "Table" --hover "More"

The tooltip that came up was "More actions (Shift+F10)" -- on the right-hand panel, not the table.

    timeout 120 node app-b/study.mjs --try $D/03.png task:t17 --click "Table" --click "More actions"

That opened a menu for the PageRank row in the left list: Rename, Select top N, Show in table,
Filter to, Lock, Hide in list, Add note, Compare with another row, Delete. No export.

Think-aloud: So there are at least three buttons on this screen that all answer to "More actions"
and I got the wrong one. At my speech rate "more actions, more actions, more actions" is three
identical sounds; I cannot tell them apart without moving around them to find out where I am.
That menu has Delete on it, which I was not trying to reach. Escape out.

## Step 3 -- try the obvious word

    timeout 120 node app-b/study.mjs --try $D/04.png task:t17 --click "Table" --click "Export"

"Nothing on screen is called Export." Fine, it is in a menu somewhere.

    timeout 120 node app-b/study.mjs --try $D/05.png task:t17 --click "Table" --click "Table actions"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t17 --click "Table" --click "More table actions"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t17 --click "Table" --click "Table options"

The first two: nothing called that. "Table options" worked: a small menu with "Time slider -- This
data has no time attribute" (dimmed) and "Export table as CSV...".

Think-aloud: There it is. Third guess at the name, which is about my usual. "Table options" is
a fair name once you know it. Note that while this menu was open the right-hand panel quietly
switched from PageRank to the whole graph's Data summary. I did not ask for that. If my focus had
been over there I would have lost my place.

## Step 4 -- the export dialog

    timeout 120 node app-b/study.mjs --try $D/06.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..."

A dialog titled "Export", with a list on the left (Image, Video, Report, Recipe, Data, Recent
exports) and Data chosen. It says: "Full graph, 77 nodes, 254 edges - every attribute and run
result - CSV". Format CSV, Scope Full graph, Table: Nodes. A warning that the node table holds
nodes only and the 254 edges are not written. A preview:
`id,label,group,degree,betweenness,betweenness_rank,betweenness_tie,results.louvain...` and three
rows. Then a paragraph: a rank is a whole number, 1 is highest, and "Tie" says how many other
nodes share the value, so the column stays numeric in a spreadsheet. At the bottom: "Saved to this
computer only; nothing is uploaded", Cancel, Copy, Export.

Think-aloud: This is the best part of the session. It tells me where my file goes before I ask --
that is my first question about any web tool, and it is answered in the footer. "Every attribute
and run result" means whichever ranking my colleague made, its scores are in the file, so I can
stop worrying about which row was theirs. The preview is plain text I can read on the braille
line. The note on rank and ties is exactly the kind of definition I want. A "Copy" button too, so
I could paste straight into Excel.

What I could not check: the preview line is cut off after "results.louvain.", so I cannot hear
whether pagerank and its rank are actually in the columns. I will trust "every attribute" for now
and check the header row in Excel. I also still do not know whether betweenness here is
normalized; the table showed 0.570 for Valjean, which looks normalized, but nothing says so.

## Step 5 -- export

    timeout 120 node app-b/study.mjs --try $D/07.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"

The dialog closed. A message: "Exported les-miserables_nodes.csv to Downloads". The right panel
is back on PageRank.

Think-aloud: Name of the file and where it went, in one sentence. That is the right message.
My worry is that it is a pop-up message: if it is read once and gone, I want to find it again.

## Step 6 -- can I find that fact again?

    timeout 120 node app-b/study.mjs --try $D/08.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export" --click "Table options" --click "Export table as CSV..." --click "Recent exports"

"Recent exports, 4 files, newest first, each was saved to Downloads": a whole-cast PNG (today
10:14), les-miserables_nodes.csv (Data, CSV node table, full graph, today 9:52), a recipe
(yesterday), a video (Sep 28). Each has "Export again". Each says "made from miserables.json".

Think-aloud: Good that there is a place to go back to. But it does not match what just happened.
The newest entry is a PNG from 10:14; the CSV I just exported is not listed as newest, and the
one CSV there is from 9:52. Either my export is not in the list, or the list is out of order.
I cannot tell which, and I will not guess. Also: it says "made from miserables.json", while the
graph panel said the graph is "from miserables.gexf". Two different file names for the same
source. When two things disagree I stop trusting both until someone explains.

I stop here. The file is, by its own message, in Downloads.

## Verdict

- Succeeded? Yes, I believe so: les-miserables_nodes.csv was written to Downloads with every
  attribute and run result, so the colleague's scores are in it. I never found out which ranking
  was the colleague's -- nothing on screen says who made a result -- and I got to the export only
  because the export takes everything. If it had asked me to pick one ranking, I would have been
  stuck.
- Single Ease Question: 5 of 7. Three guesses to name the table's menu button, one wrong menu
  that had Delete on it, then everything after that was clear.
- Would I use this instead of my current tool? For this job, not instead of NetworkX -- `to_csv`
  is one line and I know exactly what columns it writes. But the export dialog is better than most
  tools I have tried: it says where the file goes, it previews the file as text, and it defines
  rank and tie. If someone else built the analysis in this tool, this is how I would get their
  numbers out, and that is a real use.

## Problems, in my words

1. Several buttons all named "More actions"; I opened the wrong one (a row menu with Delete) when
   looking for the table's menu. (severity 3)
2. Export is not reachable by the word "Export" anywhere on the main screen; I had to guess the
   button name "Table options". (severity 2)
3. Nothing tells me who made a result, so "my colleague's ranking" cannot be identified.
   (severity 3)
4. Opening the table menu switched the right-hand panel to a different subject without my asking.
   (severity 2)
5. Recent exports does not show the export I just made as the newest entry. (severity 3)
6. Recent exports says "made from miserables.json"; the graph says "from miserables.gexf".
   (severity 2)
7. The CSV preview header is cut off, so I cannot confirm the PageRank columns are in the file
   before exporting. (severity 2)
8. Betweenness values shown without saying whether they are normalized. (severity 2)
