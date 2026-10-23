# Session r2-s50 -- Ruth (returning), running club (friends.csv)

Task: Ava is planning a party and wants to invite the people she runs with, and the people they run
with. How many people is that, not counting Ava? Then change the drawing so it has only Ava and
those people.

Build: 8f0d5a6f7791 (frozen, tier2-r2d4). Tool: real.mjs.

## Steps

### 01 -- start
Command: `REAL_DIST=<frozen build> node real.mjs --start r2-s50 setup:friends-ranked.txt`

What I see: my running club sheet, friends.csv, open. A PageRank run from before is on the left and
colors the dots. No names on the dots. A find box at the top left, like last time.
Next: type "Ava" into the find box, the way I always start.

### 02 -- find Ava
Command: `--step --click "Find nodes, edges, values" --type "Ava"`

What I see: one node, Ava, and six ties: Ava -> Ben, Chloe, Dev; Sana, Theo, Ivan -> Ava. So her
own runners are six people: Ben, Chloe, Dev, Sana, Theo, Ivan. I write that down.
Next: click Ava to get the right-hand list of who she is tied to, like I did before.

### 03 -- click Ava (missed)
Command: `--step --click "Ava"` -> tool: ambiguous, nothing happened (03.png unchanged). I meant the
node row at the top of the list.
Next: click the Ava node row.

### 04 -- click the Ava row
Command: `--step --click "Ava#1"`

What I see: Ava is selected and glows on the drawing (a small dot near the middle). The right side
says Node Ava, Degree 6 with an arrow. Six matches what the find list showed.
Next: click Degree 6 to get the list of names, which is what I used last time.

### 05 -- open Degree
Command: `--step --click "Degree"`

What I see: a panel "Neighborhood": "Ava and 6 connections", Hops 1 / 2 / 3, Follow Out / In / All
(All is on), a "Filter to neighbors" button, and the names Ben, Chloe, Dev, Ivan, Sana, Theo with
weights. Seven glow on the drawing; Selection on the left says 7 (Ava plus six). Good, names.
"Hops" is not my word, but 1 / 2 next to "Ava and 6 connections" reads like "how far out". Running
together goes both ways, so Follow All is right. Her runners and their runners is 2.
Next: click 2.

### 06 -- click 2 (missed)
Command: `--step --click "2"` -> tool: ambiguous with Dev's weight row, nothing happened.
Next: the 2 next to Hops.

### 07 -- Hops 2
Command: `--step --click "2#1"`

What I see: "Ava and 14 connections within 2 hops". Names: Ben, Chloe, Dev, Eli, Farah, Gus, Hana,
Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo -- I count 14, and Selection on the left says 15 (with
Ava). So my answer is 14. The list no longer says which are her own runners and which are a step
further out, or through whom; the weights went away too. Says who Eli is two away through? I'll
check one.
Next: type Eli in the find box and see if one of his ties is one of Ava's six.

### 08 -- check one: Eli
Command: `--step --click "Find nodes, edges, values" --type "Eli"`

What I see: Eli's ties: Ben -> Eli, Dev -> Eli, Eli -> Farah. Ben and Dev are both Ava's own
runners, so Eli is two away. The link held. The right panel kept Ava's list while I searched,
which I like.
Next: narrow the drawing. "Filter to neighbors" sits right under Hops; that reads like "show only
these". Click it.

### 09 -- Filter to neighbors
Command: `--step --click "Filter to neighbors"`

What I see: the five dots on the upper right are gone. The top bar now says "15 of 20 nodes" with a
filter mark, which is Ava plus 14 -- it agrees with the list. The key now says "PageRank on 20
nodes", and the PageRank row on the left has a little clock-like mark: I take that as the program
telling me the sizes were worked out on the whole club, not on these 15. Good that it says so; I
would have asked. The dots carry no names, so the drawing alone does not prove which 15 they are;
the count and the list on the right are what I trust.
I'm done.

### End
Command: `--end`

## Debrief (in character)

- **Finished:** yes. 14 people, not counting Ava (Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan,
  Jada, Kofi, Quinn, Ravi, Sana, Theo). The drawing shows only those 15, "15 of 20 nodes".
- **Ease:** 6 of 7.
- **What helped:** clicking Ava's Degree number, the place I already knew, opened the very control I
  needed. "Ava and 14 connections within 2 hops" is a sentence I can read back to an editor, and the
  Selection count (15) agreed with it. One check (Eli via Ben and Dev) held.
- **What confused me:**
  - "Hops" is jargon; I guessed it from the 1 / 2 / 3 beside "Ava and 6 connections".
  - At 2 the list lost the weights and does not say who is a direct runner and who is one further
    out, or through whom. I had to search Eli by hand to check a link. I'd want each name marked
    "runs with Ava" or "through Ben, Dev".
  - "Filter to neighbors" -- at 2 they're not all neighbors in my sense; I clicked it because it was
    the only thing there, and it did the right thing.
  - Twice my click on a plain name ("Ava", "2") hit something else first because the same text was
    in several places (the tool refused; nothing harmful happened).
  - No names on the dots, so I can't confirm the drawing's 15 are the list's 15 by looking.
