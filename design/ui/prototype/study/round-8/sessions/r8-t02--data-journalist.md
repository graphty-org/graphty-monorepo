# Session: try the program on something before using your own data -- the reporter with a contacts sheet (Ruth)

Task as given: "You have just installed this program to see whether it could help with your work,
but your own data is not ready yet. Before you spend time on your own file, you would like to see
the program working on something. Get something onto the screen to try it on, and tell us what it is."

Start screen: shots/tasks/r8-t02/01.png

## Step 1 -- the start screen (01.png)

"OK, three columns. Start: 'Open project or file...', 'New from data...'. My data is not ready, so
not those. Recent projects is empty, fine. Then on the right, 'Samples' -- that is exactly what I
want. Little pictures and a line about each one. Les Miserables, 77 characters, 'Good for a first
look at communities and who holds the story together... measures, groups, paths and notes already
added.' Who holds the story together -- that is my question about board members, really. I'll take
that one.

But first there is a big box at the bottom: 'Your data is yours, but please help us.' It wants to
collect how I use the app. It says nothing is collected until I answer, and 'Files are read on this
computer and never uploaded' on the left -- good, I checked for that. Still, I am not sending usage
data from a newsroom laptop. 'No thanks'.

Also noted: 'Local only' with a padlock top right. Reassuring, if it is true."

Command:

```
timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--data-journalist/02.png task:r8-t02 --click "No thanks" --click "Les Miserables"
```

## Step 2 -- the sample opens (02.png)

"There it is. A network of dots and lines in the middle, names on the bigger ones: Valjean in the
middle, Javert next to him, Cosette, Fantine, Marius, Gavroche, Eponine. The title top left says
'Les Miserables'. So: the characters of Les Miserables, linked when they share a chapter. Valjean
is the hub, which is what I would expect -- it's his book.

Everything is orange-to-brown and a little box says 'Color: PageRank 0.00330 to 0.0754'. I don't
know what PageRank means here beyond 'Google thing'. How do I know what those numbers counted? The
panel on the right says 'Paints 77 nodes (every node with a value)' and 'Measure from Analyze' --
'nodes' I can translate to 'characters'. Not explained yet, but I didn't ask for that today.

The left list is a lot: PageRank, Louvain, Shortest paths, Density, Link prediction, 'Top 9 by
de...', Watchlist, 'For the report', Betweenness, Everything. Half the names are cut off. 'Louvain'
is a museum to me. 'Shortest paths -- Valjean t...' -- that one I understand, and it's my goal number
two, so it's nice to see it's possible. 'For the report' with groups in it -- someone has already
done what I want to do with my story. 'Notes 4 items' -- notes, good.

But for the task: something is on the screen and I can say what it is. Done."

## Outcome

- Succeeded? Yes. The sample is the Les Miserables network: 77 characters from the novel, joined
  when they appear in the same chapter, colored by a score called PageRank, with Valjean at the
  center.
- Single Ease Question: 7 of 7. The samples were right there with plain descriptions; one click
  after closing the usage-data box.
- Would I use this instead of my current tool? Not yet, and I don't really have one -- I have a
  spreadsheet. Getting a picture up was painless, much easier than what I've read about Gephi. But
  the open sample throws a lot of jargon at me at once (PageRank, Louvain, Density, Link
  prediction, a decimal range for a color), and I can't yet tell what any of those numbers counted.
  Before I trust it with my story I need to load my own sheet and see every name arrive, and see
  that I can explain the numbers to an editor.

## Observations for the record (in character)

- The usage-data box covers the bottom of the start screen; I dealt with it first. Its wording made
  me check privacy, and the "never uploaded" line answered it.
- The sample's description told me in advance what I'd see, so the graph made sense immediately.
- The opened sample is dense with pre-made analysis rows, many truncated, and most named with
  technical terms. For someone just "seeing it work", that's a wall.
- The color legend shows raw PageRank decimals with no plain-words meaning.
