# Session: go to Javert, read what is known about him, see who he shares chapters with

Participant: Priya, threat hunter in a corporate SOC (persona file: study/personas/cybersecurity-analyst.md)

Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Go to the police inspector Javert, read what the program knows about him, and see
which characters he shares chapters with."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t12--cybersecurity-analyst/. Every run replays from the start screen.
Below, D stands for that render folder's absolute path.

## 01 -- start screen (shots/tasks/r8-t12/01.png)

Before anything: is this approved, where does it run, does it phone home? Top right says "Local
only", and under Start: "Files are read on this computer and never uploaded." Good, it says it up
front. Then a usage-data banner at the bottom. "We will never see the data you analyze" -- fine, but
I am not sharing usage data from a bank laptop. No thanks. The sample list is clear; Les Miserables,
77 characters, top of the list.

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t12 --click "No thanks" --click "Les Miserables"

That is a lot. Left side is a tree: Selection, Notes, Labels, PageRank, Louvain, Shortest paths,
Density, Link prediction, Top 9 by degree, Watchlist, a folder "For the report"... I did not make
any of this. It's "worked examples", the sample card said. Fine. The graph is colored by PageRank
and there is a legend for it, good. Javert is labeled on the canvas, sitting right next to Valjean.
There is a search box, "Find rows and notes". I'd normally type the name. First I just try the name.

## 03 -- click "Javert"

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Javert"

(Tool: "Javert" matches 2 controls -- "Valjean to Javert" and "Myriel to Javert"; clicked the first.)

I got a path, "Valjean to Javert", not Javert. The label on the canvas isn't something I can hit
by name. The panel on the right is about the path: 2 nodes, 1 edge, "17 shared chapters". Useful
fact, wrong object. I want the character.

## 04 -- open the table

    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table"

Now we're talking. A table, 77 nodes, sorted by degree. Javert is row 4: group 4, degree 17,
rank #4 of 77, PageRank 0.0303, one note. That's what I'd work from. I click the row.

## 05 -- click Javert's row

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert"

Selected. Little label on the canvas, "Javert, 17 connections". The right panel says "Javert,
Node", Style tab open, "Why this look". I don't care why he is orange. I want his data. There's a
Data tab next to Style.

## 06 -- click "Data"

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Data"

(Tool: "Data" matches 2 controls -- the left-rail button and the tab; clicked the first.)

It took me to a whole other screen, "Data, Les Miserables", sources and filters, and the right
panel is now about the whole graph. My Javert selection is gone from the panel. There are two
things called Data on the same screen and I hit the wrong one. (Facilitator note in my own words:
I meant the tab under Javert's name; the tool could not reach it by name, so I never saw his Data
tab.)

## 07 -- try to reach the tab directly

    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "tab Data"

"Nothing on screen is called 'tab Data'." OK. Giving up on that tab. I'll pivot instead: there is a
small toolbar that appeared above the bottom bar when I selected him, icon-only. I need to know what
the icons are.

## 08-09 -- hunting for the pivot control

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --hover "Neighbors"
    (looped:) --hover "Expand" / "Select neighbors" / "Focus" / "Neighborhood", saved to D/09.png

"Neighbors", "Expand", "Select neighbors", "Focus" -- nothing. "Neighborhood" -- tooltip
"Neighborhood G". The first icon, the target. A keyboard shortcut, G. I like that there is a key.
I'd never have guessed "neighborhood" is the word; I say pivot.

## 10 -- click Neighborhood

    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Neighborhood"

Popover: "Neighborhood of Javert", distance 1/2/3 edges away, "Covers: Javert and 17 neighbors."
17 matches the degree. Counts add up so far. Two buttons: "Add as steps" and "Filter to
neighbors". I want the list of 17 names. Filter.

## 11 -- Filter to neighbors

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Neighborhood" --click "Filter to neighbors"

Toast: "Added filter step: Neighbors of Javert, 1 edge away", with Undo. Top bar now says "18 of 77
nodes". The table header says "18 of 77 nodes" -- but right next to it "Rows 1 to 77 of 77", and the
table still lists Valjean, Gavroche, Marius, Javert... the same top four as before. The graph still
shows everything, all 77 dots. And the panel on the right now says Valjean is selected, not Javert.
Which is it? 18 or 77? I didn't click Valjean.

## 12 -- check the edges table

    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Neighborhood" --click "Filter to neighbors" --click "Edges"

254 edges. All of them. The filter that says "18 of 77" did nothing to the edges list. I can see
Javert -- Valjean, 17, with a note, at row 5, because it is one of the heaviest ties in the book.
That is one of his 17 and I had to spot it by eye in an unfiltered list.

## 13-14 -- try the search box instead

    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --key j --key a --key v --key e
    timeout 120 node app-b/study.mjs --try D/14.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --key j --key a --key v --key e --key Enter

Typed "jave": nothing happened in the first render. After Enter, the box shows "Jav" (where did my
"e" go?) and a results list: Rows -- "Valjean to Javert", "Myriel to Javert", "Watchlist, a member:
Javert"; Notes -- "Valjean and Javert land in the same community..." and "Javert follows Valjean
through the whole book...". Every result is something ABOUT Javert. Javert himself is not a result.
If I type a hostname into a search box I expect the host. That is the first thing I do on any tool,
and here it fails. The notes are interesting, at least: somebody wrote that he follows Valjean
through the whole book. That's the closest thing to "what the program knows about him" I've read.

## 15 -- open the "18 of 77 nodes" chip to see my filter

    timeout 120 node app-b/study.mjs --try D/15.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Neighborhood" --click "Filter to neighbors" --click "18 of 77 nodes"

(Tool: "18 of 77 nodes" matched the button and a span; clicked the button.)

Now it says "40 of 77 nodes". The filter list has three steps: "Degree 2 or more", "Degree 5 or
more", "group is not 0". I didn't make any of them. My "Neighbors of Javert" step is not there. The
number in the button changed from 18 to 40 the moment I opened it. That's it for me -- if the filter
I just made disappears and somebody else's filters show up, I can't trust any count on this screen.
I'm stopping here.

## Verdict

Did I succeed? Partly, no. I found Javert (through the table, not the search box) and read his
numbers: group 4, 17 connections, rank 4 of 77 by degree, PageRank 0.0303, one note, and from the
search results that a note says he follows Valjean through the whole book. I know he has 17
neighbors and that he shares 17 chapters with Valjean. I never got the list of the 17 characters he
shares chapters with, and I never saw his own Data tab.

Single Ease Question (1 = very hard, 7 = very easy): 2.

Would I use this instead of my current tool? No, not on this showing. The table sorted by degree
and the "Local only / never uploaded" line are the two things I'd keep. But the search box doesn't
find the entity I type, two different controls are both called "Data", and the neighbor filter said
18 while every list I could see still said 77 and the graph never changed -- then the filter
vanished and three filters I never made took its place. In Splunk a filter I add is the filter I
see. Here I could not tell what was applied, so I could not put any of these numbers in a case.

## Problems, in her words

- "I searched 'Jav' and got paths and notes about him, not him." The find box returns rows that
  mention a name, never the node. Severity high: the first thing she does on any tool.
- "Two things called Data." The left-rail Data button and the inspector's Data tab share a name;
  she hit the rail and lost her selection. Medium.
- "18 of 77 -- or 77 of 77?" After "Filter to neighbors" the top bar and table header say 18 but
  the table pager, the edges table and the canvas still show the full graph. High.
- "I didn't click Valjean." After filtering, the inspector switched to Valjean on its own. Medium.
- "Where did my filter go?" Opening the "18 of 77 nodes" chip showed 40 of 77 and three filter
  steps she never created; her neighbor step was gone. Critical: it ended the session.
- "Neighborhood, not pivot." The neighbor control is icon-only; she needed four guesses at its
  name. The G shortcut is welcome. Low.
- Canvas labels (Javert) cannot be clicked by name; the only names that matched were path rows.
  Medium.
- First typed search did not show results until Enter, and the last typed letter was lost. Low.

## What she liked

- "Local only" and "Files are read on this computer and never uploaded" on the very first screen,
  before she had to ask.
- The nodes table, sorted by degree with rank columns ("#4 of 77"): her Splunk habit, straight away.
- "Covers: Javert and 17 neighbors" matched the degree column. One count that added up.
- The Undo on the "Added filter step" toast.
