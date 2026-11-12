# Session r1-s47 -- Elena (returning), task T23 prompt A (running club, friends.csv)

Build: frozen build 946256efb876 (`.study-builds/tier2-r1d4-946256efb/`), setup `friends-ranked.txt`.

Prompt: "You have used this program a few times. Your running club's list, friends.csv, is already
open. Ava is planning a party and wants to invite the people she runs with, and the people they run
with. How many people is that, not counting Ava? Then change the drawing so it has only Ava and
those people."

## Steps

### 1. Start

`REAL_DIST=.../tier2-r1d4-946256efb/ with-browser.sh node real.mjs --start rounds/round-1/sessions/r1-s47 setup:friends-ranked.txt` -> 01.png

Seen: the club is drawn as orange balls of different sizes with arrows; no names on the dots. Left
panel has a find box, "Selection", "PageRank 20", "Everything". Right panel shows PageRank style.
Plan (in character): last time I used the find box to jump to a name. I'll type Ava there.

### 2. Type Ava in the find box

`real.mjs --step $S --click "Find nodes, edges, values" --type "Ava"` -> 02.png

Seen: "Nodes 1: Ava" and "Edges 6": Ava -> Ben, Ava -> Chloe, Ava -> Dev, Sana -> Ava, Theo -> Ava,
Ivan -> Ava. So Ava runs with 6 people: Ben, Chloe, Dev, Sana, Theo, Ivan. The drawing did not
change or mark Ava. Plan: click Ava in the list to see her and her list of people on the right.

### 3. Click Ava in the results

`real.mjs --step $S --click "Ava"` -> 03.png (tool: ambiguous, took the first, the node "Ava")

Seen: Ava is lit up in yellow (a small dot near the middle-bottom). Right panel: Ava, Node, Degree 6
with a little arrow, PageRank #20 of 20. Selection now says 1. Plan: last time I read a person's
connections on the right -- click "Degree 6" to open her list.

### 4. Click "Degree 6"

`real.mjs --step $S --click "Degree"` -> 04.png

Seen: the right panel became "Ava -- Neighborhood", "Ava's 6 connections", with rows "Hops 1 2 3",
"Follow Out In All" (All picked) and a "Filter to neighbors" button; a list Ben 3, Chloe 5, Dev 2,
Ivan 1, Sana 1, Theo 1. Seven dots glow yellow; Selection says 7. "Hops" is not my word, but 1/2/3
next to "connections" reads like "how far out". The party is her runners plus their runners, so
two. Plan: click "2".

### 5. Click "2"

`real.mjs --step $S --click "2"` -> 05.png (tool: ambiguous with "Dev 2", took the first, the 2 button)

Seen: "Ava's 14 connections within 2 hops"; list Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada,
Kofi, Quinn, Ravi, Sana, Theo (14). Selection says 15 (Ava plus 14). 15 dots glow; five at the top
right stay plain. "Follow: All" was already on, which I take as "runs with" either way round, which
is what I want -- I did not touch it. So my answer: 14 people, not counting Ava. Plan: now make the
drawing show only them -- "Filter to neighbors" looks like the thing.

### 6. Click "Filter to neighbors"

`real.mjs --step $S --click "Filter to neighbors"` -> 06.png

Seen: the five plain dots at the top right are gone; 15 glowing dots remain, in the same places as
before. The top bar now says "15 of 20 nodes" next to a little filter icon; the "Filter to
neighbors" button is now solid blue. The PageRank row's icon on the left changed to a clock-like
arrow and its 20 stayed 20 -- I don't know what that means, but I ignore it. The drawing has only
Ava and her 14 people, so I am done.

### 7. End

`real.mjs --end $S`

## At the end (in character)

**Did I finish?** Yes. Answer: 14 people, not counting Ava (Ben, Chloe, Dev, Eli, Farah, Gus, Hana,
Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo). The drawing now has only Ava and those 14 ("15 of 20
nodes").

**Ease: 6 of 7.** It took five clicks and I never got lost, because it started from what I already
knew: the find box, then the person's list of connections on the right.

**What confused me or slowed me down:**

- The way in is hidden behind "Degree 6". I only clicked it because it had a little arrow and I
  remembered reading someone's connections on the right last time. "Degree" is not a word I use;
  nothing says "see who Ava runs with" until after I click it.
- "Hops" is jargon. The 1/2/3 buttons next to "Ava's 6 connections" let me guess it means "how many
  people out", and the heading changing to "14 connections within 2 hops" confirmed the guess.
- "Follow: Out / In / All" -- I left it on All without really knowing what Out and In would do. For a
  running club "runs with" goes both ways, so I hoped All was right, but nothing told me.
- Clicking "Ava" in the find results first selected only Ava; the drawing did not move or zoom to
  her, and she is one of the smallest dots, so I would not have spotted her without the yellow ring.
- After filtering, the PageRank row's icon changed to a circular-arrow symbol. I don't know if my
  ranking is now wrong or out of date, or if I need to do something.
- The drawing had no names on the dots the whole time, so I could not check on the picture which dot
  is Chloe or Theo; I had to trust the list.
- Once filtered, I wasn't sure how I'd get the whole club back (the prompt didn't ask, but I'd want
  to know): the blue "Filter to neighbors" button and the "15 of 20 nodes" note at the top are the
  only hints.
