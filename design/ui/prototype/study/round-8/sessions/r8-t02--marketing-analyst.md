# Session: get a sample on screen -- Jordan, marketing network analyst

Task as given: "You have just installed this program to see whether it could help with your work,
but your own data is not ready yet. Before you spend time on your own file, you would like to see
the program working on something. Get something onto the screen to try it on, and tell us what it is."

Start screen: shots/tasks/r8-t02/01.png

## Step 0 -- start screen (no command)

Okay. Three columns. "Start" on the left -- Open project or file, New from data, "or drop a file
anywhere". Good, drag and drop, that's what I'd do with my export. And right under it: "Files are
read on this computer and never uploaded." Plus "Local only" up in the corner. That's honestly the
first thing I'd want to know before I put a CRM file in here, so, fine, noted. I'd still want IT
to confirm it, but it's there before I even asked.

Then there's this big box at the bottom asking to share usage data. "Only used by the author of the
application and his Claude Code sessions"? That's a weird sentence to show a stranger. Whatever --
No thanks. It's not in my way much but I'm not opting into anything on day one.

Samples on the right. Les Miserables, karate club, proteins, card transactions, IT estate, a
research network JSON. None of these is a social or mention network, which is what I'd actually
want to see. No "Twitter conversation" or "brand mentions" sample. Closest to my world is maybe
the karate club (a community that split) -- that's basically audience segmentation. But Les Mis
says "Good for a first look at communities and who holds the story together" and "opens with
worked examples: measures, groups, paths and notes already added". Who holds the story together =
who's the influencer. That's the one that sounds like it'll show me the most stuff without me
doing work. Clicking it.

## Step 1 -- dismiss the banner, open Les Miserables

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--marketing-analyst/01.png task:r8-t02 --click "No thanks" --click "Les Miserables"

Render: 01.png

Okay, it opened straight into a map. No import wizard, no schema questions. Good. It's the Les
Miserables characters -- the novel -- 77 of them, linked by appearing in the same chapter (the
title says "Co-appearanc..." cut off, I'm guessing co-appearance). Valjean in the middle, Javert,
Cosette, Marius, Gavroche, Fantine out on top. Colored orange to brown by "PageRank", and there's
a little key in the top-left corner of the map that says what the color is: PageRank 0.0033 to
0.0754. A legend on the map itself. That I like -- that's the "what's purple?" problem.

The left list is a LOT though. Selection, Notes, Labels, PageRank, Louvain 6 groups, Shortest
paths, Density, Link prediction, "Top 9 by de..." (cut off), Watchlist, "For the report" folder,
Betweenness, Everything... I don't know what half of these do yet, and "1 row not listed still
paints. Show rows removed from list view" means nothing to me. But it says "worked examples"
so I guess this is what it's showing off. Louvain = clusters, I know that one from Gephi.
Betweenness = bridges. Fine.

The map itself isn't a hairball, at 77 nodes nothing is. I'd want to see it on 30,000.

## Step 2 -- look for the table

    timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--marketing-analyst/02.png task:r8-t02 --click "No thanks" --click "Les Miserables" --click "Table"

Render: 02.png (tool noted "Table" matched two things and clicked the first)

There's a table. Thank god. 77 nodes, sorted by degree. Label, notes, group, degree, "Rank by
degree #1 of 77", PageRank. And a line above: "Valjean is first on all three measures; Gavroche
is in the top 3 on all three." That is a sentence I could paste into a brief. Valjean being number
one is exactly what I'd expect -- he's the main character -- so that's my sanity check passed. If
he'd been ranked 40th I'd have closed it.

The table squeezed the map up into the top half and the floating toolbar with the icon buttons
(flask, play, cube, list, lightning) now sits in the middle of the graph. No idea what those icons
are. The cube is probably 3D, which I'm not touching.

Okay, I'm done. That's the program working on something.

## What it is

It's the Les Miserables sample: the 77 characters of the novel, connected when they appear in
the same chapter. It opened with the map colored by PageRank (with a key on the map), groups
already found (Louvain, 6 groups), a couple of shortest paths, and a table ranking the characters
-- Valjean first, then Gavroche, Marius, Javert.

## Debrief

- Did I succeed? Yes. Two clicks from the start screen (one was just closing the data-sharing box)
  and I had a graph with a legend and a ranked table.
- Single Ease Question: 6 of 7. Getting something on screen was trivial. I knock one off because
  none of the samples look like my data -- I'd have loved a social-mention or referral sample so
  I could judge the influencer stuff on something that looks like my world -- and because the
  left panel after opening is a wall of things I don't understand yet.
- Would I use this instead of my current tool? Not yet, but it earned a second session. The "never
  uploaded" line on the very first screen, a legend sitting on the map, and a table with a ranked
  sentence above it are three things Gephi doesn't give me. What I haven't seen: whether it opens
  my 40,000-row mention CSV without asking for a schema, whether it chokes on that size, and
  whether I can export the top 40 as a CSV. Our Brandwatch license already does clusters, so it
  has to win on the table and the export, not on looking nice. And honestly the samples tell me
  who this was built for -- novels, proteins, IT hosts, fraud -- not marketers. That's a little
  off-putting.

## Notes for the moderator (in her words)

- "Files are read on this computer and never uploaded" on the start screen answered my data question
  before I asked it.
- The usage-data box mentions "his Claude Code sessions" -- I don't know what that is and it made me
  trust the box less, not more.
- No sample that looks like social or marketing data.
- Left list after opening is overwhelming; several names cut off ("Co-appearanc...", "Top 9 by de...",
  "Labels show...", "Valjean t...").
- "1 row not listed still paints. Show rows removed from list view" -- meaningless to me.
- With the table open, the icon toolbar floats over the middle of the map.
