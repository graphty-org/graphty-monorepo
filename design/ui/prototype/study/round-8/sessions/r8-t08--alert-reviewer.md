# Session: find the circles of characters in Les Miserables -- Nadia, level-1 alert reviewer

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program pick out the circles of characters who keep turning up together. Tell us
how many circles it came up with, how big the largest one is, and which character is at its
center."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t08--alert-reviewer/. All commands
were run from design/ui/prototype; D stands for that render folder.

## Step 1 -- start screen (shots/tasks/r8-t08/01.png)

Think-aloud: "OK, a start page. There's a banner at the bottom asking about usage data -- no
thanks, our IT would have a fit. On the right, Samples, and the first one is Les Miserables,
77 characters. The blurb even says 'good for a first look at communities'. Click that."

## Step 2 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t08 --click "No thanks" --click "Les Miserables"

Think-aloud: "Whoa. That's a lot already on the left. PageRank, Louvain six groups, Shortest
paths, Density, Top 9 by de-something, Watchlist, then 'For the report' with Group 2 and Group 8.
So somebody already did stuff to this. Is 'Louvain 6 groups' my answer? I don't know what a
Louvain is. And there's a 'Group 2, 14 nodes' and 'Group 8, 13 nodes' further down, which is
groups too -- so which groups are the groups? The task says have the program pick them out, so
I don't want to just read off what somebody else left lying around. The picture is all orange
dots, there are no circles on it that I can see. The label up top says the colors are PageRank,
whatever that is. The side panel on the right says 'Measure from Analyze', so Analyze is
probably where you make it do things."

## Step 3 -- find Analyze (03.png, 04.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t08 --click "No thanks" --click "Les Miserables" --hover "Analyze"
    (tooltip: "Analyze Shift+A" -- the flask button in the bar at the bottom)
    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze"

Think-aloud: "The flask at the bottom says Analyze. Click it. A list: Recent -- Louvain,
PageRank, Shortest path. Then 'Rank nodes and edges' with PageRank, Degree, Total value,
Betweenness... none of that is groups. Louvain again under Recent, 'last run resolution 1.0'.
That doesn't tell me what it does. I'd guess it's the groups thing because the left side said
'Louvain 6 groups'. I'll try Louvain."

## Step 4 -- choose Louvain (05.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain"
    (the tool said "Louvain" matched four things -- a tab, the left list row, the Recent entry,
    and a second Louvain entry described as "Which nodes form densely connected..." further down
    the list -- and the click on the first one timed out)
    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect"

Think-aloud: "OK, 'Which nodes form densely connected groups.' Good, that's the one -- I wish
the list had just said that first instead of the name. Weight, Higher means Stronger / Farther /
Capacity -- I'm not touching any of that, leave the defaults. Resolution 1.0, leave it. Two
buttons: 'Run as copy' and 'Update Louvain row'. Hm. Does Update overwrite what somebody else
made? It's a practice file, so I don't care. Blue button."

## Step 5 -- run it (06.png)

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect" --click "Update Louvain row"

Think-aloud: "'Updated just now: 6 communities, the same as before.' Fine, so whoever set this up
got the same answer. Right side: Communities 6. Sizes -- Community 1, Hub Gavroche, 25. Then 17,
10, 10, 9, 6. The left side opened up the same list, Community 1 25 nodes. So: six circles,
biggest is 25, and 'Hub' -- I'm taking that to mean the one in the middle, Gavroche.
Modularity 0.565 'strong grouping' -- don't need that.

But the picture didn't change at all. Still all orange. I ran a thing that found six groups and I
can't see a single group on the screen. If I had to put this in a file, I'd be screenshotting a
blob of orange dots and a list on the side."

## Step 6 -- check the biggest one (07.png)

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t08 --click "No thanks" --click "Les Miserables" --click "Analyze" --click "Louvain Which nodes form densely connect" --click "Update Louvain row" --click "Community 1"
    (the tool noted "Community 1" matched two controls -- the left list row and the text in the
    Sizes list -- and clicked the left list row)

Think-aloud: "Click Community 1 to make sure. Size 25 nodes, Hub 'Gavroche, 16 links inside'.
OK, so hub means he's connected to the most people inside the group. That's what I'd call the
center. Still nothing highlighted on the picture, though -- I clicked the group and it didn't
light up. I'd have expected the 25 to go a different color. There's a little eye next to the
row, maybe that does it, but I've got my answer. Done."

## Answer given

- Six circles (the program calls them communities).
- The largest has 25 characters.
- Gavroche is at its center ("Hub", 16 links inside the group).

## Did I succeed?

"I think so. The numbers matched in two places, left and right, and it said 'the same as
before', so I trust it. The only thing I'm not sure of is whether 'hub' is what you meant by
center. And I still don't know if the 'Group 2, 14 nodes' and 'Group 8, 13 nodes' under 'For
the report' were something else -- they don't match any of the six sizes, so I ignored them."

## Single Ease Question

5 out of 7. "Getting to the answer was maybe two minutes. Losing points because the thing is
called Louvain everywhere -- I only found it because I guessed from the left list -- and because
the picture never showed me the groups."

## Would I use this instead of my current tool?

"No, not instead -- I don't have a graph tool, and most of my alerts don't need a picture. And
for the few that do, the export test fails right now: I ran the groups and the screen still
showed the old orange coloring, so a screenshot for the alert file wouldn't show QA anything. If
it colored the groups when I ran it and I could copy that list on the right, Community 1, hub,
25, into my notes, then for a counterparty-ring alert, maybe. That's Sarah's call anyway."

## Problems seen

1. The run of the grouping method left the picture colored by the previous measure (PageRank);
   nothing on the canvas showed the six groups, before or after clicking the biggest group.
2. The grouping method is listed by its technical name ("Louvain") in Recent and in the left
   list; its plain description only appears in a second entry further down the Analyze list.
3. The sample opens with many prior results (two kinds of "group" rows: Louvain communities and
   "For the report" Group 2 / Group 8 with sizes that match none of the communities), so a
   first-time user cannot tell which groups answer the question.
4. "Update Louvain row" versus "Run as copy" did not say whether updating overwrites someone
   else's work.
5. "Hub" was the only word offered for the center; its meaning ("16 links inside") only showed
   after clicking into the group.
