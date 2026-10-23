# Session r2-s30 -- Grace (returning), task T18, dataset B (Florentine families)

Build: 8f0d5a6f7791 (REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/)
Session folder: design/ui/studio/tier2/rounds/round-2/sessions/r2-s30
Commands are run from design/ui/studio/tier2/rounds/round-2/sessions with T=../../../../tool.

## Start

    REAL_DIST=... $T/with-browser.sh node $T/real.mjs --start r2-s30 setup:florentine-ranked.txt

01.png: "Okay, the Florentine families map is open, and it already has a PageRank ranking on it --
the dots are sized and colored by it. No names on the dots though. I need a message from the
Strozzi to the Pazzi through as few families as possible. First I need to know which dot is which.
I'll type Strozzi into the find box on the left, that's what I used before to look someone up."

## Step 2

    node $T/real.mjs --step r2-s30 --click "Find nodes, edges, values" --type "Strozzi"

02.png: "Good, it found one Strozzi, with 4 ties: Castellani, Peruzzi, Ridolfi, Bischeri. That's
already useful -- like a filter in Excel. Now let me click Strozzi itself so the right-hand side
shows its connections, like I did with a person before."

## Step 3

    node $T/real.mjs --step r2-s30 --click "role=option:Strozzi"

03.png: "There it is -- Strozzi is the dot lowered-left with the yellow glow, degree 4, ranked #3 of
15. Now where are the Pazzi? I'll look them up the same way."

## Step 4

    node $T/real.mjs --step r2-s30 --click "Find nodes, edges, values" --type "Pazzi"

04.png: "Pazzi have only one tie: Salviati. So the message has to end Salviati -> Pazzi. I could trace
the rest by hand but with no names on the dots that's guesswork. Last time the analysis button in
the toolbar had a list of things the program can work out. Let me see if it can find the chain
between two families for me."

## Step 5-6

    node $T/real.mjs --step r2-s30 --key Escape --hover-icon 1
    node $T/real.mjs --step r2-s30 --click-at 680,864

(05: Escape cleared the find box; the first icon is the main menu.) 06.png: "The Analyze list is
open. These are all rankings -- Degree, Betweenness, Closeness... I can't see anything that says
'how two families are linked'. There's a filter box at the top. I'll type 'between' and see what
comes up -- the message goes between two families."

## Step 7

    node $T/real.mjs --step r2-s30 --type "between"

07.png: "Oh, here: 'Find paths and edge sets -- Shortest path, Start here: The fewest steps ... between
two nodes.' 'The fewest steps' is exactly what I want. There's also 'Guided route -- Select 2 nodes
first', greyed out. I'll take Shortest path since it says start here."

## Step 8

    node $T/real.mjs --step r2-s30 --click "Shortest path"

08.png: "Nice, it already filled From with Strozzi because I had them selected. To says 'Where the path
ends'. Weight is None, which is fine -- a marriage is a marriage. I'll click into To and type Pazzi."

## Step 9

    node $T/real.mjs --step r2-s30 --click "Where the path ends" --type "Pazzi"

09.png: "It suggests Pazzi underneath. I'll pick that from the list, then press Find path."

## Steps 10-11

    node $T/real.mjs --step r2-s30 --click "role=option:Pazzi"
    node $T/real.mjs --step r2-s30 --click "Find path"

10.png: Pazzi is in the To box. 11.png: "There it is. The chain is drawn in black on the map, and on
the right: 'Path 5 nodes, 4 edges', and 'Nodes in order': Strozzi 1, Ridolfi 2, Medici 3, Salviati
4, Pazzi 5. That checks out with what I saw in the find box: Ridolfi was one of Strozzi's four ties
and Salviati is the Pazzi's only tie. So the message goes Strozzi -> Ridolfi -> Medici -> Salviati
-> Pazzi, through three families in between. On the left it's listed as 'Shortest path, 4 hops'
-- I'd say '4 handoffs' on a slide, but the right side says it in plain words, so fine. The
'Made with' part even says 'Each edge counts as 1', which is what I wanted."

Answer given: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi.

## Follow-up (given word for word)

"The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass
through, in order?"

"Same thing again. The little form went away when it ran, so I'll open Analyze again and pick
Shortest path; it was under Recent probably."

## Step 12

    node $T/real.mjs --step r2-s30 --click "Analyze"

12.png: "Yes, Shortest path is at the top under Recent. Clicking it."

## Step 13

    node $T/real.mjs --step r2-s30 --click "Shortest path#1"

13.png: (tester's note: the name "Shortest path" was shared by the run's row in the left list and the
menu entry; "#1" took the left-list row, which closed the menu -- a driving slip, not something
Grace did.) "The menu closed and I'm back where I was. Let me open Analyze again and click the
Shortest path line at the top of the menu itself."

## Steps 14-15

    node $T/real.mjs --step r2-s30 --click "Analyze"
    node $T/real.mjs --step r2-s30 --click-at 565,448

15.png: "The form is back. From still says Strozzi -- I guess because Strozzi is still selected. I need
Peruzzi there, so I'll clear it with the little x and type Peruzzi."

## Steps 16-17

    node $T/real.mjs --step r2-s30 --click-at 825,648
    node $T/real.mjs --step r2-s30 --click-at 660,648 --type "Peruzzi"

17.png: "Peruzzi suggested. Pick it, then To: Ginori."

## Steps 18-19

    node $T/real.mjs --step r2-s30 --click "role=option:Peruzzi"
    node $T/real.mjs --step r2-s30 --click "Where the path ends" --type "Ginori"

19.png: "From Peruzzi, To Ginori is suggested. Pick it and Find path."

## Steps 20-21

    node $T/real.mjs --step r2-s30 --click "role=option:Ginori"
    node $T/real.mjs --step r2-s30 --click "Find path"

21.png: "Done: 'Nodes in order' -- Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5. 5 nodes,
4 edges. So Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori, three families in between. The
map shows it in black. One thing: the Strozzi-to-Pazzi chain is gone -- the left list still has just
one 'Shortest path, 4 hops' row, and the right side now only shows the Peruzzi one. I'd have liked
to keep both for the slide; I wrote the first one down so it's okay, but I didn't expect the new
run to take the old one's place without saying so. Also the yellow glow is still on Strozzi from
before, which is a bit confusing next to a path that doesn't include them."

Follow-up answer given: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori.

## End

    node $T/real.mjs --end r2-s30

## In character, at the end

- **Did I finish?** Yes, both: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi, and Peruzzi ->
  Bischeri -> Guadagni -> Albizzi -> Ginori.
- **Ease: 6 of 7.** Once I found it, it was quick and the answer is in plain words in order, which
  is what I'd paste into an email.
- **What confused me:**
  - The Analyze list opens on a long list of rankings; nothing near the top says "how two are
    linked". I only found Shortest path because I typed "between" in the filter. "Shortest path"
    sounds like a map app, but the line under it -- "The fewest steps ... between two nodes" -- is
    what told me it was right.
  - "Guided route -- Select 2 nodes first" sat right under it, greyed out; I didn't know how it
    differs from Shortest path and left it alone.
  - The left list says "4 hops"; the right side says "5 nodes, 4 edges". Neither is the word I'd
    use (three families in between, four handoffs), but I could work it out.
  - Running it a second time replaced the first chain without telling me; I expected both to stay.
  - From was pre-filled with whoever I had selected (Strozzi) the second time too, so I had to
    clear it; the old selection's glow stayed on the map.
  - No names on the dots, so I could only check the chain against the right-hand list, not the map.

(The first --end printed the follow-up request; it had already been carried out in steps 14-21, as
recorded above, so --end was run a second time and the session closed.)
