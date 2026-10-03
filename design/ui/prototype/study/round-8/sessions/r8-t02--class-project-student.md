# Session: r8-t02, the class-project student (Dev)

Task given: "You have just installed this program to see whether it could help with your work, but
your own data is not ready yet. Before you spend time on your own file, you would like to see the
program working on something. Get something onto the screen to try it on, and tell us what it is."

## Step 0 -- the start screen (shots/tasks/r8-t02/01.png)

Think-aloud: "OK, reading everything. Top left says graphty. Left column is 'Start': 'Open project or
file...', 'New from data...', drop a file. My spreadsheet isn't ready, so not those. Middle says
'Recent projects', empty, fine. Right side is 'Samples' -- good, that's what I want, I always try the
example first. Les Miserables, 77 characters, 'Good for a first look at communities and who holds the
story together. Opens with worked examples: measures, groups, paths and notes already added.' That's
literally my assignment -- who's central, what the groups are. There's also a karate club one, which
I think our tutorial mentioned, but 'worked examples already added' sounds like it shows me what done
looks like.

There's a big box at the bottom about usage data. I'll just say 'No thanks' so it goes away. It
blocks nothing really but it's in the way."

Command:

    cd /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype
    timeout 120 node app-b/study.mjs --try /home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t02--class-project-student/01.png task:r8-t02 --click "No thanks" --click "Les Miserables"

## Step 1 -- after clicking the sample (tmp/round-8-sessions/r8-t02--class-project-student/01.png)

Think-aloud: "Done, there's a network. Title bar says Les Miserables. It's the characters from the
novel -- I can read Valjean, Javert, Cosette, Fantine, Marius, Gavroche, Eponine, Myriel. Lines are
people who share a chapter, the start screen said. Valjean is in the middle with tons of lines, so I
guess he's the central figure, which makes sense.

All the dots are orange, and a little box at the top says 'Color: PageRank' with numbers 0.00330 to
0.0754. I don't know what PageRank is for people in a novel -- is that the Google thing? Our
tutorial said degree and betweenness. The darker ones are probably the important ones, Valjean is
darkest.

The left list is a lot: Selection, Notes, Labels, PageRank, Louvain 6 groups, Shortest paths, Density,
Link prediction, Top 9 by de..., Watchlist, For the report, Group 2, Group 8, Betweenness, Everything.
I recognize Betweenness and I think Louvain is the 'Modularity' communities thing from the tutorial
because it says 6 groups. But it says 6 groups and everything is one color, so I'm not sure the groups
are on. Honestly I don't know if this list is stuff I did or stuff they did -- the sample said
examples were already added, so I guess they did it. 'Columns: 9 of 9' and a Table at the bottom,
that looks like my spreadsheet would go there.

For the task though: it's on screen. I didn't have to do anything."

I stopped here: the task was to get something on screen and say what it is.

## Answer to the moderator

"It's the Les Miserables sample -- 77 characters from the novel, linked when they appear in the same
chapter. Valjean is in the center. It came with stuff already done to it, like PageRank coloring and
groups."

## Wrap-up

- Did I succeed? Yes. One click on a sample, and the picture had names on it, which is how I judge it.
- Single Ease Question: 7 (very easy). The samples list was the most obvious thing on the page and the
  description told me which one fit my assignment.
- Would I use this instead of my current tool (Gephi, from the tutorial)? Maybe. Getting a picture was
  way faster than Gephi, where you have to import and run a layout before you see anything. But the
  sample opens with a lot already piled on -- PageRank, Louvain, shortest paths, link prediction,
  watchlists -- and I can't tell which of those I'd have to do myself, or what PageRank means for
  people. I'd want to see what happens with my own spreadsheet before switching.

## Things that tripped me up (minor)

- The coloring is PageRank, not the groups, even though the groups are listed right under it with
  colored dots. I expected the groups to be the colors since that's what the sample description led
  with ("communities").
- "PageRank" and "Louvain" are not the words my tutorial used (degree, modularity, betweenness).
- The left list has about 15 rows on first open and some are cut off ("Valjean t...", "Top 9 by
  de...", "Labels show..."). Hard to tell which are steps I'd do and which are leftovers from the
  example.
- The usage-data box at the bottom was the first thing I had to deal with; it covered part of the page.
