# Session: bring a colleague's network into graphty -- Explorer Elena

Task as given: "A colleague emailed you a network of the characters. Bring it into graphty. The
data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the
same chapter. If that is not your line of work, treat them as your own people or things."

Clock: first contact (short). Renders are in
`tmp/round-7-sessions/t28-lesmis--explorer-elena/`.

## Start screen (shots/tasks/t28-lesmis/01.png)

"OK, a start page. Start, Recent projects, Samples. My colleague emailed me a file, so it's not
one of the recent ones. 'Open project or file...' -- that's the one, it even says Ctrl+O like
everything else. There's also 'New from data...', not sure what the difference is. And there's
a 'Les Miserables' sample over on the right... but the moderator said that's the colleague's
file, so I'm opening a file. Nice that it says files are read on this computer and never
uploaded -- I'd actually care about that with customer data."

## Step 1 -- Open project or file

```
timeout 120 node app-b/study.mjs --try .../t28-lesmis--explorer-elena/01.png task:t28-lesmis --click "Open project or file..."
```

Result (01.png): a full graph, title "Les Miserables", 77 orange dots, the big dark one in the
middle labelled Valjean, a legend top left (Color: PageRank, Size: Degree).

"Oh -- that was fast. It's just... in. No questions about columns. OK, that's kind of nice.
Valjean is the big dark one in the middle, so he's the main character, makes sense."

"But wait. There's a lot already here. PageRank, Louvain '6 groups', 'Shortest paths -- Valjean
to Javert', a 'Watchlist' with a lock on it, 'For the report', 'Group 2', 'Group 8',
'Betweenness'... Did my colleague do all this? Or did the app? I didn't ask for any of it. I
don't know what PageRank is. I don't know what Louvain is. Is this their project or my copy?"

"Everything is orange to brown. The legend says 'Color: PageRank 0.0033 to 0.0754'. Is 0.07
good? No idea. I'll just say darker means more important."

(Misreading, stated confidently: "Javert and Valjean are sitting right on top of each other, so
they must be close -- like allies." The picture places them together because they share many
chapters, not because they are on the same side; nothing on screen says so either way.)

## Step 2 -- second-guessing: was that the right button?

"Let me check the other button, 'New from data', in case Open was wrong and that's how you bring
in a file you got from someone."

```
timeout 120 node app-b/study.mjs --try .../t28-lesmis--explorer-elena/02.png task:t28-lesmis --click "New from data..."
```

Result (02.png): a screen titled "Door entries, March 2026", tables people / buildings / entries,
columns person_id / building_id / time, yellow "Not in people" warnings, a "Match report" with
"25 person_id values are not in people", "Add as people / Leave out", Directed / Undirected, Load.

"Whoa. Door entries? Buildings? That's not my file at all. I didn't pick anything -- where did
this come from? Somebody else's data? And it's full of yellow warnings. 'person_id is Number
here and Category in people: matched as text' -- I have no idea what that means."

"OK, no. I'm backing out of this. Glad I didn't press that first. The Open one gave me the
characters, so Open was right."

## Step 3 -- the sample, just to compare

"Hang on, is what I opened just the sample? The sample also says Les Miserables, 77 characters."

```
timeout 120 node app-b/study.mjs --try .../t28-lesmis--explorer-elena/03.png task:t28-lesmis --click "Les Miserables"
```

Result (03.png): exactly the same screen as step 1.

"It's identical. Same orange, same Valjean, same PageRank thing selected. So... did I open my
colleague's file or the sample? I guess they're the same data, the moderator did say that. But
if this were my real file I'd want to see something that says 'this is your file, from the
email', not the exact same screen the sample gives me. Fine. The title says Les Miserables, the
sample said 77 characters, let me check it's all there."

## Step 4 -- check nothing went missing

```
timeout 120 node app-b/study.mjs --try .../t28-lesmis--explorer-elena/04.png task:t28-lesmis --click "Open project or file..." --click "Table"
```

Result (04.png): a table slides up under the graph. "77 nodes". "Valjean is first on all three
measures; Gavroche is in the top 3 on all three". Columns label, group, Degree (full graph),
PageRank (full graph), Rank by PageRank, Betweenness.

"77. Matches the 77 on the sample card. Good, nothing dropped. And this table is something I can
read -- like a spreadsheet. 'Valjean is first on all three measures' -- OK, that's a sentence I
could paste in Slack, even if I don't know what the three measures are. 'Nodes' -- I guess
that's the characters."

"I think I'm done. It's in."

## Wrap-up

- **Did I succeed?** I think so. I clicked Open, the characters showed up, the count was 77 like
  the sample said. But I'm only fairly sure: the result looked exactly like the sample, with a
  lot of extra stuff (PageRank, Louvain, shortest paths, a watchlist, a report folder) that I
  never made, so I can't tell whether I opened my colleague's file or just a demo.
- **Single Ease Question:** 5 of 7. Getting it in was one click -- that part was a 7. It loses
  points because "New from data" dropped me into somebody's door-entry data full of warnings,
  and because the opened file came pre-loaded with analysis I didn't ask for and couldn't
  explain.
- **Would I use this instead of my current tool?** Maybe, for a first look. It's in the browser,
  nothing to install, it says my files don't get uploaded, and the table with the one-line
  summary is the most useful thing I saw. But I'd want to see my own file come in plain first --
  just my dots and lines -- before it starts coloring things by words like PageRank and Louvain.
  Right now I'd have a hard time explaining this screen to my VP.

## Observations for the study team (moderator notes, not the participant's words)

1. "Open project or file..." loaded a project that was indistinguishable from clicking the
   sample: same title, same pre-applied analysis layers, same selection. The participant could
   not tell whether she had brought in "her" file or opened the demo. Nothing confirmed what
   was opened or from where (no filename, no "opened from" line).
2. The opened file arrived with PageRank coloring, Louvain groups, two shortest paths, a locked
   watchlist, a report folder and a hidden Betweenness row already in place. For a first-timer
   "bring it in" should end at her data, plainly drawn; the pre-made analysis read as someone
   else's work and introduced five unknown terms on the first screen.
3. "New from data..." opened an unrelated dataset ("Door entries, March 2026") with match
   warnings, instead of a file picker or an empty mapping screen. She read it as somebody
   else's data and backed out. The two Start entries are not distinguished by their labels.
4. The table's "77 nodes" plus the one-line summary sentence was what made her trust the import;
   the canvas alone did not.
5. Wrong conclusion stated: proximity of Javert and Valjean read as "allies".
