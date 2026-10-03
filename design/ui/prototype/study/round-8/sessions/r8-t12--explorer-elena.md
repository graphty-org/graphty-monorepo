# Session r8-t12 -- Explorer Elena (first-time graph user)

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Go to the police inspector Javert, read what the program knows about him,
and see which characters he shares chapters with."

Start screen: shots/tasks/r8-t12/01.png. Renders: tmp/round-8-sessions/r8-t12--explorer-elena/NN.png.
All commands were run from design/ui/prototype with the prefix
`timeout 120 node app-b/study.mjs --try <render> task:r8-t12`; only the steps are listed below.

## Think-aloud

**01 (start screen).** "OK, a start page. There's a big box at the bottom asking about usage data,
I'll just say no. On the right there's Les Miserables, 77 characters -- that's the one he said.
Click."

**02.** `--click "No thanks" --click "Les Miserables"`
"Ooh, OK, there's the picture. Lots of orange dots. Valjean is the dark one in the middle, so he's
the main guy, makes sense. And right next to him... Javert! Little label. Great, I'll click on
Javert." (Left list is long -- PageRank, Louvain, Shortest paths, Density... I don't know what most
of that is. Skipping it.)

**03.** `... --click "Javert"`
(The tool clicked the left-list row "Valjean to Javert".)
"Hm. It says 'Valjean to Javert', path, 2 nodes, 17 shared chapters. OK so Valjean and Javert are
in 17 chapters together -- that's actually kind of a nice fact. But I wanted Javert himself, not
Valjean-to-Javert. There's a blue 'Javert' on the right. Click that."

**04.** `... --click "Javert" --click "Javert"`
(The tool clicked the link "To Javert".)
"Wait, now it says Valjean. I clicked Javert and it opened Valjean? ... Did I click the wrong line?
Probably me. Anyway this is Valjean: PageRank, Betweenness, Degree 36. No idea what those are.
OK, let me just search for him like a normal person."

**05.** `--click "No thanks" --click "Les Miserables" --click "Find rows and notes"`
"There's a search box, 'Find rows and notes'. Rows? Whatever. Click it."

**06.** `... --type "Javert"`
"Typed Javert. ... Nothing happened. Hm."

**07.** `... --key Enter`
"Oh, there it is after Enter. Nodes: Javert, 17 neighbors. Then a bunch of path things and two
notes -- 'Javert follows Valjean through the whole book'. Cute. Click on Javert, 17 neighbors."

**08.** `... --click "17 neighbors"`
"OK, it's circled on the picture, and there's a little 'Javert, 17 connections' label under it.
The right side says Javert, Node, 'Why this look'... Notes, PageRank, Color, Size. That's about
colors? I don't care about the colors, I want to know about HIM. There's a 'Data' next to 'Style'.
Click Data."

**09.** `... --click "Data"`
(The tool clicked the left rail "Data", not the tab.)
"Whoa, the whole left side changed. Sources, miserables.gexf, Filters, Attributes... and Javert's
gone from the right, it's back to the whole graph. I didn't want that. OK, back up."

**10-11.** `... --click "17 neighbors" --click "tab Data"` (nothing on screen is called that);
then replay with the path row clicked first (`--click "Javert"` before the search) to see if the
right side would remember Data.
"Still on the colors thing. Ugh."

**12.** `... --click "17 neighbors" --click "Javert, 17 connections"`
"Maybe the little label under the picture does something? ... No."

**13-14.** `--hover "Neighbors"`, `--hover "Focus"` -- nothing on screen is called either.
"There's a row of little icons under the label. A target, some squiggle, a checkmark, an eye with a
line, a speech bubble. No words. I'm pointing at things and nothing tells me anything."

**15.** `... --click "17 neighbors" --click "Edges"`
"There's 'Edges' at the bottom, I'll try that. ... A table! source, target, value. Cosette
Valjean 31, Marius Cosette 21... Javert Valjean 17. So 'value' is chapters, I think. But this is
everybody, 254 rows, not just Javert. Is there a way to make it just him? I don't see one."

**16.** `... --click "17 neighbors" --click "Style" --key ArrowRight`
(Stands in for clicking the "Data" tab beside "Style", which is what she was aiming for at 08.)
"OK, now the right side shows Javert's data. id 27, label Javert, group 4, PageRank 0.0303, number
5 of 77. Degree 17, #4 of 77. So he's number 4 or 5 of 77 at... something. Is that good? Is
0.0303 a lot? Then he's in Watchlist, Valjean to Javert, Myriel to Javert, Top 9 by degree, Group 4.
So -- fine, that's 'what the program knows about him', I guess. But no names of who he's with,
except Valjean and Myriel. Myriel's the bishop, and Javert's not really with the bishop... oh, it's
a path, through someone. Whatever."

"Weird: when I looked at Valjean the 36 next to Degree was blue and clickable. Javert's 17 is
plain black."

**17.** `... --hover "Neighborhood"` (after guessing names; "Show neighbors", "Select neighbors"
and "Connections" found nothing)
"The target icon says 'Neighborhood G'. G? Neighborhood -- that sounds like who's around him."

**18.** `... --click "Neighborhood"`
"A box: Neighborhood of Javert. Distance 1 2 3 'edge away'. Covers: Javert and 17 neighbors.
'Add as steps' or 'Filter to neighbors'. Filter I understand -- like the dashboard. Blue button.
Click."

**19.** `... --click "Filter to neighbors"`
"Black message: 'Added filter step: Neighbors of Javert, 1 edge away', with Undo. Top says '18 of
77 nodes'. ... But the picture looks exactly the same. All the dots are still there. And now the
right side says Valjean, not Javert. It says it's done, so where is it? Did I do it wrong?"

**20.** `... --click "Table"`
"Let me look at the table. '18 of 77 nodes' at the top... and then 'Rows 1 to 77 of 77' on the
right. So which is it, 18 or 77? It lists Valjean, Gavroche, Marius, Javert... I can't tell if
these are his people or just the top of everybody. The picture still has all 77."

(Stopped here. Answers got shorter; she stopped trying new controls.)

## Did she succeed?

"Half. I found Javert and the stuff about him -- number 5, 17 connections, in a group with some
people. And I know he and Valjean share 17 chapters. But I never got a list of who he shares
chapters with. I pressed the filter and the picture didn't change and the numbers disagree, so I
don't trust it. I couldn't paste 'Javert shares chapters with X, Y and Z' into Slack."

## Single Ease Question (1 = very difficult, 7 = very easy)

**2.**

## Would she use it instead of her current tool?

"No, not yet. The picture is nice and the search worked once I hit Enter. But clicking a name
opened a different person, 'Data' is two different buttons, the useful buttons are icons with no
words, and when I filtered, nothing on the picture changed while the top said 18. In our dashboard
I click a bar and I get the list. Here I clicked the person and got colors."

## Observed problems (for the study team)

1. Search only shows results after Enter; typing alone shows nothing (06 vs 07). Severity 2.
2. Clicking the "To Javert" link in a path's details opened Valjean, not Javert (04). Severity 3.
3. "Data" names two controls: the left rail section and the right-panel tab; the rail took her
   out of the person view and dropped the selection (09). Severity 3.
4. Selecting a person from search opens the right panel on Style ("Why this look"), not on what
   the program knows about him; she wanted Data first (08, 11). Severity 3.
5. The neighbor action is an unlabeled icon; she found it only by guessing a tooltip name; the
   tooltip reads "Neighborhood G" (shortcut letter run on) (13, 14, 17). Severity 3.
6. No list of the person's neighbors (with shared-chapter counts) anywhere in the person's Data
   panel; Degree 17 is a number, and for Javert it is not a link while Valjean's 36 is (16 vs 04).
   Severity 4.
7. After "Filter to neighbors" the toast and the header say 18 of 77, but the picture still shows
   all 77 dots, the table says "Rows 1 to 77 of 77", and the selection jumped from Javert to
   Valjean (19, 20). Severity 4 -- this is where she stopped trusting it.
8. Edges table is not scoped to the selected person (15). Severity 2.
9. Words she did not know on screen at every step: PageRank, Louvain, Betweenness, Degree, node,
   edge, "1 edge away", "rows". Severity 2.

## Delights

- The first picture with names on the biggest dots: "Ooh, Javert's right there next to Valjean."
- "17 shared chapters" on the Valjean-to-Javert line: a plain-English fact she could repeat.
- Search results grouped with "17 neighbors" under the name, and the notes with readable sentences.
- The filter popup's "Covers: Javert and 17 neighbors" told her what would happen before she clicked.
