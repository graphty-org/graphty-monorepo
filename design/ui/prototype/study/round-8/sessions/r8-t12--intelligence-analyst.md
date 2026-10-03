# Session: find Javert, read his record, list who he shares chapters with

Participant: Marcus, criminal intelligence analyst (study/personas/intelligence-analyst.md).
Task as given by the moderator: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Go to the police inspector Javert, read what the program knows about him, and see
which characters he shares chapters with."

Renders are in tmp/round-8-sessions/r8-t12--intelligence-analyst/ (prototype root). Every command
was run from design/ui/prototype. From step 12 on, the replay prefix was kept in a small helper,
`go.sh`, in the same folder; it runs:

    timeout 120 node app-b/study.mjs --try <folder>/NN.png task:r8-t12 \
      --click "No thanks" --click "Les Miserables" --click "Valjean to Javert" --click "Javert end" \
      --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" <extra steps>

## Think-aloud

**01 (start screen).** Start page. "Files are read on this computer and never uploaded" and
"Local only" up top -- good, that is the first thing I look for. Then a box at the bottom wants
usage data. Not on a work machine. Samples on the right, Les Miserables is the first one.

**02** `--click "No thanks" --click "Les Miserables"`
Opened. Seventy-seven orange dots, all the same, a handful of names. Not a link chart, but it's a
novel, fine. The left side is a long list: PageRank, Louvain, Shortest paths, Density, Watchlist,
"For the report"... somebody else's work is already loaded in here. I see "Javert" printed on the
chart next to Valjean. I'll click the name.

**03** `... --click "Javert"`
That gave me "Valjean to Javert -- Path from Shortest paths". Not what I clicked. I wanted the
man, not a path. Fine -- on the right it says "To: Javert" in blue. Click that.

**04** `... --click "Javert" --click "Javert"`
Now the right side says **Valjean**. I clicked Javert and got Valjean. Twice now.

**11** `... --click "Valjean to Javert" --click "Javert end"`
Tried the member list on the right, "Javert -- end". Valjean again. Every Javert link on that
panel takes me to Valjean. That's broken.

**05** `... --click "Find rows and notes" --type "Javert"`
Search box top left, "Find rows and notes". Typed Javert. Nothing happened.

**06** `... --key Enter`
Hit Enter. Now I get a list: Nodes -- Javert, 17 neighbors. Rows. Notes. OK, that's what I wanted
in the first place. Why I have to hit Enter for a search box, I don't know.

**07** `... --click "17 neighbors"`
Javert is circled on the chart, and a strip says "Javert, 17 connections". Search said 17
neighbors, strip says 17 connections -- I'll assume same thing. The right panel opened on "Style,
Why this look" -- I don't care what color he is, I want his record. There's a Data tab next to
Style.

**08** `... --click "Data"`
That threw me onto a different screen entirely -- sources, filters, attributes, and the right side
went back to the whole graph. Javert's gone. There were two things called Data on screen (the one
on the far left and the tab); I got the wrong one. (The tool picked the far-left one; I meant the
tab. A real mouse would have hit the tab, so I backed up.)

**09, 10** `--click "tab Data"` -- "nothing on screen is called tab Data". `--hover "Data"` --
no tooltip. I couldn't get at that tab directly from here.

**12** `go.sh 12` (open a path, then search Javert again)
Came at it the long way: once the right side had been on Data for a path, searching Javert again
kept it on Data. Now I have his record:
- From miserables.gexf, id 27, label Javert, group 4.
- PageRank 0.0303, #5 of 77. Degree 17, #4 of 77.
- Under "2 more attributes": betweenness 0.0543, degree 17.
- Memberships: Watchlist, Valjean to Javert, Myriel to Javert, Top 9 by degree, Group 4.
- 1 note.
Questions I'd have: betweenness is sitting in a pile of "more attributes" here, but for Valjean it
was up with the results with a rank. Why does one guy get a rank and the other doesn't? And
"0.0543 of what"? Search showed two notes mentioning Javert; his record says 1 note. Which one is
right? But fine -- that's what it knows about him. Half the job done.

**13, 14** `go.sh 13 --hover-icon 1`, then `go.sh 14 --hover-at X,767` over the five icons above
the bottom toolbar. Icon-only buttons, I had to hover each: Neighborhood, Path between, Create
set, Hide on canvas, Add note. "Neighborhood" -- that's who's around him.

**15** `go.sh 15 --click "Neighborhood"`
Box: "Neighborhood of Javert, Distance 1 edge away, Covers: Javert and 17 neighbors." Buttons
"Add as steps" and "Filter to neighbors". It doesn't actually list the 17. Also the chart shifted
around a bit when the box opened -- everything moved down. I don't like things moving.
"Filter to neighbors" it is.

**16** `go.sh 16 --click "Neighborhood" --click "Filter to neighbors"`
Message: "Added filter step: Neighbors of Javert, 1 edge away." Button at top now says "18 of 77
nodes". OK, Javert plus 17. But the chart still has every single dot on it. I count way more than
18. And the right side flipped to **Valjean** again, on the Style tab. Side panel says 18, screen
shows 77. Which one's lying?

**17** `go.sh 17 ... --click "Table"`
Opened the table. Header: "18 of 77 nodes". Next to it: "Rows 1 to 77 of 77". Same strip, two
different counts. I can see four rows -- Valjean, Gavroche, Marius, Javert -- and that's it, the
table is a sliver at the bottom. Those three might be his people, or might just be the top three
of everybody sorted by degree. I can't tell.

**18** `go.sh 18 ... --click "Edges"`
"Shares chapters" is really the links, so I tried Edges. 254 edges -- the whole book, not his.
Cosette-Valjean 31, Marius-Cosette 21... Javert-Valjean 17 is in there. So one answer: he shares
17 chapters with Valjean. Nothing filtered to him.

**19** `go.sh 19 ... --click "18 of 77 nodes"`
Clicked the counter to see what my filter is. Now it says **40 of 77**, and there are three
filter steps -- degree 2 or more, degree 5 or more, group is not 0 -- that I never made. My
Javert step isn't in the list at all. The chart still shows everything.

That's it. I've been at this past my five minutes, the thing has put me on Valjean three times,
and now the filter I made has vanished and been replaced by somebody else's. I'm done.

## Did I succeed?

Half. I found Javert and read his record (id, group, PageRank #5, degree 17 #4, betweenness, the
sets he's in, one note). I did **not** get a list of who he shares chapters with. All I have is
Valjean (17 chapters, from the full edge table) and a guess that Gavroche and Marius are in the
list. If a sergeant asked me "who does Javert show up with", I couldn't hand him a list from this.

## Single Ease Question

**2 out of 7.**

## Would I use this instead of what I use now?

No. In i2 I'd select him, expand one level, and read the names off the chart. Here the bits that
should be easy kept giving me the wrong person -- clicking Javert's name, clicking "To: Javert",
clicking "Javert -- end", and filtering to his neighbors all landed me on Valjean. Then the
filter said 18 and the chart showed 77, and when I opened the filter it said 40 and listed steps I
never made. A count I can't trust is worse than no count; I'd have to explain that on the stand.
What I did like: it says up front it's local and never uploads, the search found him once I hit
Enter, and his record shows ranks ("#4 of 77"), which is something i2 doesn't give me. If
"Neighborhood" just showed the 17 names with how many chapters each, I'd take another look.

## Problems, worst first

1. Filtering to Javert's neighbors left all 77 nodes on the chart while the header said "18 of 77
   nodes"; the table said "18 of 77" and "Rows 1 to 77 of 77" side by side; and opening the
   counter showed "40 of 77" with three filter steps the participant never made and no Javert step.
2. Every Javert link in the path panel ("To: Javert", "Javert -- end") opened Valjean.
3. "Filter to neighbors" switched the inspector from Javert to Valjean, on the Style tab.
4. The Neighborhood box says "17 neighbors" but never lists them or how many chapters each.
5. Clicking Javert's label on the chart selected the "Valjean to Javert" path instead of Javert.
6. A node opened from search lands on Style ("Why this look"), not the record.
7. The edge table does not follow the neighbor filter (254 edges, whole book).
8. Search needs Enter; typing alone shows nothing.
9. Betweenness is a ranked result for Valjean but a loose "more attribute" for Javert; search
   finds two notes about Javert, his record says 1 note; "17 neighbors" vs "17 connections".
10. The selection toolbar is icon-only; each icon had to be hovered to learn what it does.
11. The chart shifted when the Neighborhood box opened.
