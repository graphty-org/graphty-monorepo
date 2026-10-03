# Session: get a sample on screen -- Grace, nonprofit operations analyst

Task as given: "You have just installed this program to see whether it could help with your work, but your own data is not ready yet. Before you spend time on your own file, you would like to see the program working on something. Get something onto the screen to try it on, and tell us what it is."

Renders: design/ui/prototype/tmp/round-8-sessions/r8-t02--nonprofit-operations-analyst/

## Step 1 -- the start screen (shots/tasks/r8-t02/01.png)

Think-aloud: "OK, three columns. Start, Recent projects, Samples. Samples is exactly what I want -- I don't have my file yet. First, though, this big box at the bottom about usage data. 'We will never see the data you analyze' -- good, and there's the line on the left too, 'Files are read on this computer and never uploaded.' That's the sentence I need for donor names. I'm going to say No thanks to the usage thing anyway; I don't want to explain that to my director.

Which sample? Les Miserables, karate club, proteins, card transactions, IT estate, research network. None of these is people-and-organizations like mine. The karate club is closest to 'who knows who', but Les Miserables says 'Good for a first look' and 'Opens with worked examples', so that's the one meant for someone like me."

## Step 2 -- decline usage data, open Les Miserables

```
timeout 120 node app-b/study.mjs --try .../02.png task:r8-t02 --click "No thanks" --click "Les Miserables"
```

Saw: a network of dots in the middle, all orange-to-brown, some with names (Valjean, Javert, Cosette, Marius, Fantine). A legend in the corner says "Color: PageRank 0.00330 to 0.0754". Left list: Selection, Notes, Labels, PageRank, Louvain 6 groups, Shortest paths, Density, Link prediction, Top 9 by degree, Watchlist, For the report, Betweenness, Everything. Right panel: PageRank, "Paints 77 nodes".

Think-aloud: "Well, it opened fast, and there's definitely something on the screen. These are the characters from the novel, and the lines are who appears with whom. 77 nodes -- the sample card said 77 characters, so that matches. Valjean's in the middle with everything going to him; makes sense, he's the main character.

But wow, a lot is already turned on. PageRank, Louvain, Betweenness, Link prediction, Density -- I don't know what half of those are. PageRank is a Google thing? The color legend is just 'PageRank 0.00330 to 0.0754' -- I could not tell a board what orange versus brown means. 'Louvain 6 groups' I'm guessing is the clusters. 'Top 9 by degree' I'd guess is most connected. This is a lot more than 'seeing it work on something'; it's like opening someone else's finished spreadsheet with every tab full."

## Step 3 -- look at the table underneath

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t02 --click "No thanks" --click "Les Miserables" --click "Table"
```

(The tool noted "Table" matched two controls and clicked the first.)

Saw: a table slid up under the picture. "77 nodes, sorted by degree. Rows 1 to 77 of 77." Columns: label, Notes, group, Degree (full graph), Rank by degree, PageRank. Valjean 36, Gavroche 22, Marius 19, Javert 17. A line above: "Valjean is first on all three measures; Gavroche is in the top 3 on all three."

Think-aloud: "Now THIS I understand. It's a spreadsheet. 77 rows, which matches. Valjean has 36 connections, he's number one. If my file did this -- board members in rows, 'Degree' meaning how many people they're connected to -- that's what my director wants. I'd still want the column to say 'connections' and not 'Degree (full graph)'. And I'd want to know how to copy this back to Excel, but that's for another day.

I'm done. I have something on screen."

## Answer to the moderator

"It's a sample called Les Miserables: the 77 characters of the novel, connected when they appear in the same chapter. Valjean is the most connected. It came with a bunch of analysis already applied -- colors by something called PageRank, groups, paths, notes."

## Debrief

- Succeeded? Yes. Two clicks, and the sample was obviously what to use.
- Single Ease Question: 6 of 7. Getting it on screen was easy. I took one off because what opened was busier than I expected: a dozen analysis rows with jargon names and a color legend in numbers I could not explain.
- Would I use this instead of my current tool (Excel, plus looking at NodeXL I can't install)? Maybe -- I'm interested, not sold. The privacy line ("read on this computer and never uploaded") and the table with 77 of 77 rows are what keep me interested. What would stop me is the vocabulary: PageRank, Louvain, Betweenness, Degree. I need "most connected" and "groups" in plain words before I'd put this in front of my board. And I haven't tried my own file, which is the real test.

## Observations (participant's own words, for the team)

- The start screen made samples easy to find; "Good for a first look" told me which one to pick.
- None of the samples looks like my kind of data (people and organizations from a donor export). A small "board and funders" style example would have been more convincing.
- The sample opens with everything already done. As a first look it is overwhelming; I could not tell what was the data and what was analysis someone added.
- The color legend shows raw numbers ("PageRank 0.00330 to 0.0754"), not what the color means.
- The table is where it clicked for me: row count, names, number of connections.
