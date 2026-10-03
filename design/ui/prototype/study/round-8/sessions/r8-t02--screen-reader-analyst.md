# Session: get a sample onto the screen -- screen-reader analyst (Morgan Reyes)

Task as given by the moderator: "You have just installed this program to see whether it could
help with your work, but your own data is not ready yet. Before you spend time on your own file,
you would like to see the program working on something. Get something onto the screen to try it
on, and tell us what it is."

Renders are in `tmp/round-8-sessions/r8-t02--screen-reader-analyst/` (01 is the start screen,
`shots/tasks/r8-t02/01.png`). Every command was run from `design/ui/prototype`.

## Step 1 -- the start screen (01)

Think-aloud: "Title says graphty. Headings: Start, Recent projects, Samples. Good, it named its
parts. First thing I want to know is where my file goes. 'Files are read on this computer and
never uploaded', and a 'Local only' at the top. Fine, I'll hold them to that. Then there's a
box at the bottom asking me to share usage data. It's in the way, it's a question, and I don't
answer questions about data on an agency laptop with a yes. Under Samples there's a list. I
don't need to read the descriptions; I know Zachary's karate club from NetworkX. 34 members, 78
edges, split into two factions. That's the one I can check against my own numbers."

## Step 2 -- decline the usage-data prompt (02)

```
timeout 120 node app-b/study.mjs --try .../tmp/round-8-sessions/r8-t02--screen-reader-analyst/02.png task:r8-t02 --click "No thanks"
```

Result: the box went away and a small message said "Usage data stays off", with a Settings
button. Think-aloud: "Told me once. Good. I hope that message doesn't stick around and steal
focus. Moving on."

## Step 3 -- open Zachary's karate club (03)

```
timeout 120 node app-b/study.mjs --try .../03.png task:r8-t02 --click "No thanks" --click "Zachary's karate club"
```

Result: a full project opened -- but the project name at the top is "Les Miserables", the graph
is "Co-appearance...", and the table later says 77 nodes. Think-aloud: "Hold on. I asked for the
karate club. The title says Les Miserables. Did I hit the wrong row? At my speed it's easy to
press Enter on the line above. Let me try again on the description instead of the name."

## Step 4 -- try the karate club again, by its description (04)

```
timeout 120 node app-b/study.mjs --try .../04.png task:r8-t02 --click "No thanks" --click "A club that split in two"
```

Result: identical. Les Miserables again. Think-aloud: "Twice now. That's not me, that's the
program. I picked karate club and it gave me a different data set without saying so. That is the
kind of thing that makes me stop trusting the next thing it tells me. If I hadn't listened to the
title I would be checking Les Mis numbers against karate-club numbers and wondering why
everything was wrong. Fine -- it's put *something* on the screen, which is what you asked for.
Let me find out what this something is."

Also noted on the way in: the screen is busy. A side list with Selection, Notes 4 items, Labels,
PageRank, Louvain 6 groups, Shortest paths, Density, Link prediction, a Watchlist, a folder
called "For the report", Betweenness... and a panel on the right about "Paints 77 nodes". The
sample says it "opens with worked examples already added". For a first look that's a lot of
other people's work to listen through before I find the data. I'd rather start empty and be told
how big it is.

## Step 5 -- open the table to find out how big it is (05)

```
timeout 120 node app-b/study.mjs --try .../05.png task:r8-t02 --click "No thanks" --click "Zachary's karate club" --click "Table"
```

Tool note: "Table" matched two things (a button and a section called Table); the first was used.
Think-aloud: "Two things called Table. I'll take the button. If I'd landed on the other one I
couldn't tell you what the difference is."

Result: a table of nodes. "77 nodes, sorted by degree. Rows 1 to 77 of 77." A line above the
columns: "Valjean is first on all three measures; Gavroche is in the top 3 on all three." Column
headers: label, Notes, group, Degree (full graph), Rank by degree (full graph), PageRank (full
graph), Rank by PageRank. Think-aloud: "Now we're talking. The count is in words, first thing.
Column headers are real words. 77 matches NetworkX's les_miserables_graph. The summary sentence
is nice but I'd want to know what 'all three measures' are and whether that PageRank is
NetworkX's default damping. Later."

## Step 6 -- edges count (06)

```
timeout 120 node app-b/study.mjs --try .../06.png task:r8-t02 --click "No thanks" --click "Zachary's karate club" --click "Table" --click "Edges"
```

Result: "254 edges, sorted by value. Rows 1 to 20 of 254." Columns source, target, Notes, value.
Think-aloud: "254. Same as NetworkX. So it is honestly Les Miserables, 77 characters, 254
co-appearance links weighted by how often they share a chapter. What I didn't get without
running anything is the number of components. I'd still have to go and ask for that. I'm
stopping here; something is on the screen and I know what it is."

## Answer to the moderator

"It's Les Miserables: 77 characters, 254 edges weighted by co-appearance. It is *not* what I
picked. I picked Zachary's karate club, twice, and got Les Miserables both times with nothing
telling me it had swapped."

## Wrap-up

- **Did I succeed?** Partly. Something is on the screen and I can say what it is, with node and
  edge counts I checked against NetworkX. But I did not get the sample I chose, and the program
  never told me that.
- **Single Ease Question (1-7):** 4. Getting *a* graph was one click. Getting the one I asked
  for was impossible, and I only noticed because I listen to titles.
- **Would I use this instead of my current tool?** Not yet. The things that worked -- "files
  never uploaded" stated up front, counts said in words in the table, real column headers -- are
  the right things. But a tool that opens a different data set from the one I chose is a tool I
  have to double-check every time, and my NetworkX scripts never do that. I'd keep going with it
  for a look at an unfamiliar network, not for anything I'd report.

## Problems I'd report

1. Choosing "Zachary's karate club" opened Les Miserables, twice, with no message. Severe: wrong
   data, silently.
2. The sample opens full of somebody else's measures, groups, paths, notes and a watchlist. For a
   first look it's a long list to get through before the data, and I can't tell which of those
   are the program's and which are "example work".
3. Size of the graph only reachable by opening the table; components not given at all without
   running something.
4. Two controls answer to "Table". I can't tell them apart.
5. The usage-data box sits on the start screen as a question before anything else. Answered
   once, fine, but it's the first decision the program asks me for.

Good things, said once: "Files are read on this computer and never uploaded" is right where I
need it; node and edge counts are spoken in words with "Rows 1 to 77 of 77"; the column headers
say what they hold, including "(full graph)".
