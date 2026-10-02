# Task t04 -- Explorer Elena (first-time graph user, product manager)

Task as given by the moderator: "Look up the character Valjean: what is recorded about him, how he
stands on the measures already worked out, and who appears right around him. Then narrow the whole
picture to him and the characters directly around him, so that every number describes only them."

Start screen: shots/tasks/t04/01.png. Renders: tmp/round-7-sessions/t04--explorer-elena/NN.png.
All commands run from design/ui/prototype, with D=tmp/round-7-sessions/t04--explorer-elena (absolute).

## Session

**Start (01 of shots/tasks/t04).** A network of orange dots. Valjean is the big dark one in the
middle and he's labeled, so I don't need the search box. I'll just click him.

**Step 1 -- 01.png**
`timeout 120 node app-b/study.mjs --try $D/01.png task:t04 --click "Valjean"`
He gets a ring, a chip says "Valjean, 36 connections", and a little bar of icons pops up over the
picture. The right panel says "Valjean, Node" and opens on "Style", with a "Why this look" list
(Notes, PageRank, Degree, Group 2...). That explains the color, but it isn't what's recorded about
him. There's a "Data" tab next to "Style", so I'll try that.

**Step 2 -- 02.png**
`timeout 120 node app-b/study.mjs --try $D/02.png task:t04 --click "Valjean" --click "Data"`
Wrong "Data". I got the big "Data" button on the far left instead. The left side turned into a
files page (miserables.gexf, Sources, Filters, Attributes) and the right panel switched to the whole
graph: 77 nodes, 254 edges, density, "connected components". Valjean isn't selected any more. Two
things side by side both called "Data", doing different things.

**Step 3 -- 03.png**
`timeout 120 node app-b/study.mjs --try $D/03.png task:t04 --click "Valjean" --hover "Valjean, 36 connections"`
Back on Valjean. Pointing at the chip did nothing useful.

**Step 4 -- 04.png**
`timeout 120 node app-b/study.mjs --try $D/04.png task:t04 --click "Valjean" --click "Style" --click "Data"`
Tried the Data tab again and landed on the left "Data" page again. I give up on that tab.

**Step 5 -- 05.png**
`timeout 120 node app-b/study.mjs --try $D/05.png task:t04 --click "Valjean" --click "Table"`
The table is what I wanted. A spreadsheet slides up with Valjean in the top row: group 2,
"Degree (full graph)" 36, "PageRank (full graph)" 0.0754, "Rank by PageRank" 1, "Betweenness (full
graph)" 0.570. Above it a sentence says "Valjean is first on all three measures; Gavroche is in the
top 3 on all three". That's the line I'd actually quote in a meeting. I don't know what PageRank or
betweenness mean, but "first on all three" I understand. So: what's recorded is his name, group 2
and his connection count; the measures say he's number one at everything.

**Step 6 -- 06.png and guesses**
`timeout 120 node app-b/study.mjs --try $D/06.png task:t04 --click "Valjean" --hover "Neighbors"`
-> "nothing on screen is called Neighbors".
Then, in one go, I rested my pointer on the icons while guessing names: "Connections" (it found
something, probably just the chip), "Neighborhood" (found something), "Focus" (nothing).
`for n in "Connections" "Neighborhood" "Focus"; do timeout 120 node app-b/study.mjs --try $D/tmp-hover.png task:t04 --click "Valjean" --hover "$n"; done`
The icons on that bar have no words on them, so I'm guessing what they're called.

**Step 7 -- 07.png**
`timeout 120 node app-b/study.mjs --try $D/07.png task:t04 --click "Valjean" --hover "Neighborhood"`
The target icon's tooltip says "Neighborhood". Good, that's "who's around him".

**Step 8 -- 08.png**
`timeout 120 node app-b/study.mjs --try $D/08.png task:t04 --click "Valjean" --click "Neighborhood"`
A box: "Neighborhood of Valjean", Hops 1 / 2 / 3, "Selected: Valjean and his 36 neighbors."
More names appeared around him (Bamatabois, Thenardier, Claquesous, Montparnasse, Gillenormand,
Mlle.Gillenormand). But the rest of the picture didn't fade, so I can't really see who is in and
who isn't. Two buttons: "Add as steps" (no idea) and "Filter to neighbors" (yes, that one).

**Step 9 -- 09.png**
`timeout 120 node app-b/study.mjs --try $D/09.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors"`
The far-off characters disappeared. The top bar says "37 of 77 nodes" and a message says "Added
filter step: Neighbors of Valjean, 1 hop" with Undo. So far so good. But the color key in the
corner still says "0.0033 to 0.0754" and size "1 to 36", exactly as before. Were the numbers redone?

**Step 10 -- 10.png**
`timeout 120 node app-b/study.mjs --try $D/10.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Table"`
The table says "77 nodes". Every column still says "(full graph)": Valjean 36, 0.0754, 0.570, the
same numbers. So the picture got smaller, but the numbers are still about all 77 characters. That
is the opposite of "every number describes only them".

**Step 11 -- 11.png**
`timeout 120 node app-b/study.mjs --try $D/11.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "Data"`
I went to the "Data" page because earlier it said "Filters change what is computed; the eye in the
Graph tree only hides." I wanted to see my filter there. Instead the filter was gone: the top bar
says "Full graph", Filters says "No filters", and all 77 dots are back. Did I lose it by changing
pages?

**Step 12 -- 12.png**
`timeout 120 node app-b/study.mjs --try $D/12.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "37 of 77 nodes"`
Clicking "37 of 77 nodes" threw me into a completely different file, "Transfers, March 2026",
3,000 gray hexagons, filters about "amount is at least 1,000". My Les Miserables work just vanished.
On my own customer data I'd have closed the tab here, worried I'd wrecked something. It does show
what a filter step should look like: a list with checkboxes, "Scope: amount on the full graph", and
"This step / Full graph" counts. So I gather my Valjean filter was meant to land in a list like that.

**Step 13 -- 13.png**
`timeout 120 node app-b/study.mjs --try $D/13.png task:t04 --click "Valjean" --click "Neighborhood" --click "Add as steps"`
"Added Neighbors of Valjean, 1 hop: one group per hop", with Undo. Nothing changed that I could
see. I don't know what "steps" or "a group per hop" means.

**Step 14 -- 14.png**
`timeout 120 node app-b/study.mjs --try $D/14.png task:t04 --click "Valjean" --click "Neighborhood" --click "Filter to neighbors" --click "PageRank"`
I wanted to ask the PageRank row whether it now covered only the 37. Clicking it brought back "Full
graph" and all 77 dots again, and the panel says "Paints 77 nodes". The filter keeps disappearing
whenever I touch anything else. I'm stopping.

## Wrap-up

**Did I succeed?** Partly. I found Valjean, read his row (group 2, 36 connections, first on
PageRank, degree and betweenness) and found "Neighborhood" -> "Filter to neighbors", which shrank
the picture to him and his 36 neighbors. But I could not get the numbers to describe only those 37.
The table and the color key kept saying "full graph" and 77 nodes, and the filter disappeared
whenever I went anywhere else. I'd tell my boss "I narrowed the picture, but I don't trust that the
numbers did."

**Single Ease Question: 3 / 7.** The lookup was fine once I found the table. The narrowing was
findable only by guessing an icon's name, and the second half of the job (numbers just for them)
never happened as far as I could see.

**Would I use this instead of my current tool?** Not yet. The table with "Valjean is first on all
three measures" is better than anything I get from a spreadsheet, and "Filter to neighbors" is
exactly the button I wanted. But two buttons called "Data", unlabeled icons, a filter that silently
disappears, and one click that dropped me into someone else's 3,000-row file would make me afraid to
use it on real data in front of anyone.

## Problems noticed (in my words)

- Two "Data" controls next to each other: the left page and the right-panel tab. I hit the wrong
  one twice and lost my selection each time.
- The icon bar over the picture has no words; I only found "Neighborhood" by guessing.
- The Neighborhood preview doesn't fade the non-neighbors, so I couldn't see who was in.
- After "Filter to neighbors", the table still says 77 nodes and "(full graph)", and the color key
  shows the same range. Nothing tells me whether, or how, to get numbers for just these 37.
- The filter vanished when I opened the Data page or clicked a row in the list.
- Clicking "37 of 77 nodes" opened a different file (Transfers, March 2026).
- "Add as steps" and "one group per hop" mean nothing to me and seemed to do nothing.
