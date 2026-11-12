# Session r2-s48 -- Nadia (returning), task T23 prompt A (running club, friends.csv)

Commands run from `design/ui/studio/tool` with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`, session folder
`S=../tier2/rounds/round-2/sessions/r2-s48`.

## Start

`node real.mjs --start $S setup:friends-ranked.txt` -> 01.png

01: friends.csv is open, dots colored and sized by PageRank, no names on the dots. Left list: Selection,
PageRank (20), Everything. I need Ava, the people she runs with, and the people they run with. Same as
an alert: type the name into the find box first.

## Step 2

`--step $S --click "Find nodes, edges, values" --type "Ava"` -> 02.png

02: Find shows one node, Ava, and 6 edges: Ava -> Ben, Chloe, Dev; Sana, Theo, Ivan -> Ava. So six
people she runs with. Now I need their people too. I'll click Ava to open her and see if there's
something about people further out.

## Step 3

`--step $S --click "role=option:Ava"` -> 03.png

03: Ava is highlighted (small dot, lower middle), Selection says 1, right panel shows Ava, Degree 6
with an arrow. No list of names here like I remember. Let me try the three dots menu next to Ava's
name on the right to see if there's anything for "people around her".

## Step 4

`--step $S --click-at 1419,73` (button "Node actions") -> 04.png

04: Menu: Neighborhood (G), Path between..., Frame selection, Add note. "Neighborhood" sounds like the
people around her. Trying it.

## Step 5

`--step $S --click "Neighborhood"` -> 05.png

05: Right panel: "Ava and 6 connections", Hops 1/2/3 (1 chosen), Follow Out/In/All (All chosen), a
"Filter to neighbors" button, and a list: Ben 3, Chloe 5, Dev 2, Ivan 1, Sana 1, Theo 1. Seven dots
ringed on the drawing, Selection says 7. "Hops" -- one hop from what? I think 1 is the six she runs
with, so 2 should add the people they run with. Running together goes both ways, so I'll leave
Follow on All. Clicking 2.

## Step 6

`--step $S --click-at 1350,178` (label "2") -> 06.png

06: Heading now "Ava and 14 connections within 2 hops"; list of 14 names (Ben, Chloe, Dev, Eli, Farah,
Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo); Selection says 15, which is 14 plus Ava. So the
answer is 14. The weights are gone from the list at 2, fine. Now "change the drawing so it has only
these": the button "Filter to neighbors" looks like it. I'm a bit worried whether a filter deletes the
other people from the file or just hides them. Clicking it.

## Step 7

`--step $S --click "Filter to neighbors"` -> 07.png

07: The five people outside the group are gone from the drawing; 15 dots left, all ringed. The top bar
now says "15 of 20 nodes" with a filter icon, and the button is blue (on). That tells me the other
five are only hidden, not deleted -- that was my worry. The key says "PageRank on 20 nodes", so the
ranking still counts everyone; fine, I'm not using it here. Done.

`--end $S`

## At the end (in character)

- **Finished?** Yes. Ava's party list is 14 people, not counting Ava (Ben, Chloe, Dev, Eli, Farah, Gus,
  Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo), and the drawing now shows only Ava and those 14.
- **Ease:** 6 of 7. Six steps, about a minute. Much faster than reading six lists of connections and
  writing names down, which is how I would have done it before.
- **What confused me:**
  - The find box and Ava's own panel did not hint that "Neighborhood" exists; I only found it in the
    three-dots menu by poking. If I had not opened that menu I would have gone back to reading lists.
  - "Hops" -- I had to guess that 1 meant the people she runs with directly and 2 meant their people
    too. The heading changing to "Ava and 14 connections within 2 hops" is what confirmed it.
  - "Follow Out / In / All": I left it on All because running together goes both ways, but I am not
    sure what Out or In would have dropped; for a money flow that would matter to me.
  - "Filter to neighbors": I wasn't sure before pressing it whether it removed people from the file.
    The "15 of 20 nodes" in the top bar answered that afterwards, but I'd want to know before.
  - At 2 the weights disappeared from the list, which they had at 1; not a problem for this task.
  - No names on the dots, so for the case file I'd still have to copy the list from the panel.
