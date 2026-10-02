# Session: t02, marketing analyst (Jordan)

Task as given: "Someone on your team already worked on this project. Work out which five characters their work says matter most to the whole story, in order, and how the drawing shows it."

All commands run from design/ui/prototype. Renders in tmp/round-7-sessions/t02--marketing-analyst/.

## Start screen (shots/tasks/t02/01.png)

Jordan: "OK, a map, a key in the top-left corner -- good, someone actually put a legend on it. Color is PageRank, orange to brown, size is degree. The left list has PageRank, Louvain with six communities, some shortest paths, a watchlist, and a folder called 'For the report' that has Betweenness in it with a crossed-out eye. So which one is 'their work says matters most'? The map says PageRank. The report folder says betweenness. Hmm. First thing I want is the table -- I don't trust a brown blob, I trust a sorted column."

## Step 1 -- open the table

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/01.png task:t02 --click "Table"

Jordan: "There it is. 77 nodes, and somebody wrote a summary line over it: 'Valjean is first on all three measures; Gavroche is in the top 3 on all three.' Nice, that's a slide sentence. But it's sorted by degree, which is the vanity metric -- big is not the same as important. Columns: Degree, PageRank, Rank by PageRank, Betweenness, and one more cut off on the right. Let me sort by the rank."

## Step 2 -- sort by PageRank rank

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/02.png task:t02 --click "Table" --click "Rank by PageRank"

Jordan: "Valjean 1, Myriel 2, Gavroche 3, Marius 4, Javert 5. Myriel at number two with only 10 connections -- that's the whole 'follower count is not influence' thing, fine, I believe it. Valjean I'd have checked first anyway, and he's on top, so the ranking passes my sniff test."

## Step 3 -- read the team's notes

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/03.png task:t02 --click "Notes"

Jordan: "'Their work' -- so what did they write down? Notes: 'Highest betweenness in the book, 0.57. Next is Myriel at 0.177', citing Betweenness. Another one: 'Javert follows Valjean through the whole book. Check whether PageRank ranks them side by side', citing PageRank, with an 'Earlier run' thing I'm not going to touch. So the colleague looked at both. The notes lean on betweenness for 'who matters', but the map is painted by PageRank. Honestly that's my job too -- bridge people versus well-connected people -- but I'd want them to just say which one is the answer."

## Step 4 -- sort by betweenness (two tries)

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/04.png task:t02 --click "Table" --click "Betweenness (full graph)" --click "Betweenness (full graph)"

Jordan: "Ugh, I clicked twice out of habit and got it lowest-first. Napoleon, zeros. Once more."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/05.png task:t02 --click "Table" --click "Betweenness (full graph)"

Jordan: "One click sorts high to low. Valjean 0.570, Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.130. So the top four are the same both ways and number five flips: Javert on PageRank, Fantine on betweenness. Fantine and Marius are basically tied, 0.130 vs 0.132 -- I wouldn't put that gap on a slide."

## Step 5 -- what is the drawing actually painting?

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/06.png task:t02 --click "PageRank"

Jordan: "PageRank's panel: 'Paints 77 nodes (every node with a value). Covers Louvain for Color.' So the communities are there but PageRank paints over them. That's why everything is orange and the six community colors in the list don't show on the map. OK, that's actually useful to know, but I'd never have guessed it from the map alone."

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t02--marketing-analyst/07.png task:t02 --click "Betweenness"

Jordan: "Clicked Betweenness in the report folder -- the row highlights, but the right panel still says PageRank. Did it not take? And the bottom of the list says '1 hidden row still paints'. Hidden but still painting? Is betweenness secretly on the map or not? I'm not going to dig into that. The key on the map says PageRank, the key is what my VP reads, so I'm going with the key."

## My answer

The five that matter most, by the measure the map is painted with (PageRank), in order:

1. Valjean
2. Myriel
3. Gavroche
4. Marius
5. Javert

How the drawing shows it: color is PageRank, light orange to dark brown, so the darker the node, the more it matters -- Valjean is the near-black one in the middle. Node size is degree (number of shared chapters), which is a separate thing. That's why Myriel looks small but is colored dark. Caveat I'd flag: by betweenness, which the colleague's notes and report folder lean on, number five is Fantine, not Javert.

## Debrief

- Succeeded? Mostly. I have a confident top four and a top-five list I can defend by the map's own legend. I'm not sure the colleague meant PageRank rather than betweenness -- the work says both, and nothing on screen says "this is the one we went with".
- Single Ease Question: 4 of 7. The table and the legend were easy. Working out which of their two measures was "the answer" was not, and the hidden-but-still-paints row and the panel that didn't change when I clicked Betweenness made me less sure.
- Would I use it instead of my current tool? Not instead of -- maybe beside Gephi. The legend on the map and a sortable table next to it with a written summary line is better than Gephi, where I'd be pasting the key into PowerPoint. But I'd need to see it open my own 50,000-row mention export and give me a CSV of that sorted table before it replaces anything. And frankly, we already pay for Brandwatch, and their influencer list doesn't even tell me which score it ranks by either -- at least this one does.
