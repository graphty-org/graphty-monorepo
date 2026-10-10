# Session r1-s18 -- Nadia (returning), T18 prompt B (Florentine families)

Prompt: "You have used this program a few times. The ready-made network of marriages between the
leading families of Renaissance Florence is already open. The Strozzi want a message carried to
the Pazzi, passed only between families joined by marriage, through as few families as possible.
Which families does it pass through, in order?"

All commands run from design/ui/studio with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ and the
session folder S=tier2/rounds/round-1/sessions/r1-s18.

## Step 1 -- start

`tool/with-browser.sh node tool/real.mjs --start $S setup:florentine-ranked.txt` -> 01.png

Nadia: The Florentine network is open, ranked by PageRank already; no names on the dots. Same as
I do with an alert: type the name in the find box and read who they are tied to. Strozzi first.

## Step 2 -- type Strozzi in the find box

`node tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Strozzi"` -> 02.png

Nadia: It found Strozzi and four marriages: Castellani, Peruzzi, Ridolfi, Bischeri. I'll open
Strozzi itself like I always do, to see its list on the right and whatever else it offers.

## Step 3 -- open Strozzi

`node tool/real.mjs --step $S --click "Strozzi"` (tool: ambiguous name, took the node option) -> 03.png

Nadia: Strozzi is selected, lit up yellow at the lower left. Degree 4 with an arrow -- that's the
list of connections I normally read. I'll open it, same as every time.

## Step 4 -- open Strozzi's list of connections

`node tool/real.mjs --step $S --click "Degree"` -> 04.png

Nadia: "Strozzi's 4 connections": Bischeri, Castellani, Peruzzi, Ridolfi, and they light up on
the drawing. No Pazzi. There's something new above the list, "Hops 1 2 3". One hop from what --
from Strozzi, I guess? If 2 means "connections of connections", maybe Pazzi shows up there.
I'll try 2.

## Step 5 -- Hops 2

`node tool/real.mjs --step $S --click "2"` -> 05.png

Nadia: "Strozzi's 8 connections within 2 hops": Barbadori, Bischeri, Castellani, Guadagni, Medici,
Peruzzi, Ridolfi, Tornabuoni. Still no Pazzi, so it's further out. This list mixes the direct
ones and the second ring together, so it wouldn't tell me the order anyway. Try 3.

## Step 6 -- Hops 3

`node tool/real.mjs --step $S --click "3"` -> 06.png

Nadia: 12 within 3 hops, and still no Pazzi -- it stops at 3. Salviati is in there now, and I
think Pazzi married Salviati, but I'm guessing. This is a list of who's near, not a chain. Before
I go back to reading lists one by one, let me see if the "..." menu next to Strozzi has anything
that works out the chain for me.

## Step 7 -- the "..." menu on the neighborhood view

`node tool/real.mjs --step $S --click-at 1419,74` (button "Neighborhood actions") -> 07.png

Nadia: Only "Frame selection" here. Not it. I'll close this and go back to Strozzi itself; its own
"..." menu might be different.

## Step 8 -- back to Strozzi

`node tool/real.mjs --step $S --key Escape --click "Back to Strozzi"` -> 08.png

Nadia: Back on Strozzi's own page: id, name, Degree 4, PageRank #3 of 15. Open its "..." menu.

## Step 9 -- Strozzi's "..." menu

`node tool/real.mjs --step $S --click-at 1419,74` (button "Node actions") -> 09.png

Nadia: Neighborhood, "Path between...", Frame selection, Add note. "Path between" -- that sounds
like a chain between two families. That's what I want. Click it.

## Step 10 -- "Path between..."

`node tool/real.mjs --step $S --click "Path between..."` -> 10.png

Nadia: A "Shortest path" box over the drawing. From already says Strozzi, To says "Where the path
ends" and looks like it has the cursor. Weight "None" -- marriages have no amount, so leave it.
Type Pazzi in To.

## Step 11 -- type Pazzi in To

`node tool/real.mjs --step $S --click "Where the path ends" --type "Pazzi"` -> 11.png

Nadia: A suggestion "Pazzi" drops down under the box. Pick it so it's really the family and not
just my text.

## Step 12 -- pick Pazzi

`node tool/real.mjs --step $S --click-at 553,733` (option "Pazzi") -> 12.png

Nadia: From Strozzi, To Pazzi, Weight None. Focus jumped to "Find path". Press it.

## Step 13 -- Find path

`node tool/real.mjs --step $S --click "Find path"` -> 13.png

Nadia: There it is. The chain is drawn in black, and the right side says "Nodes in order":
Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. "5 nodes, 4 edges", and the left list has a
new row "Shortest path, 4 hops". It also writes down how it was made: From Strozzi, To Pazzi,
Weight None, "Each edge counts as 1." That last bit is what QA would ask about.

**Answer to the prompt:** Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. It passes through
Ridolfi, Medici and Salviati (four marriages).

Follow-up given: "The Peruzzi now want a message carried to the Ginori the same way. Which
families does it pass through, in order?"

Nadia: Same thing again. I'll do it the way I found it: find Peruzzi, open its "..." menu, Path
between.

## Step 14 -- find Peruzzi

`node tool/real.mjs --step $S --click "Find nodes, edges, values" --type "Peruzzi"` -> 14.png

Nadia: Peruzzi found, three marriages (Castellani, Strozzi, Bischeri). Open the Peruzzi node.

## Step 15 -- open Peruzzi

`node tool/real.mjs --step $S --click-at 118,153` (option "Peruzzi") -> 15.png

Nadia: Peruzzi is selected at the bottom; the old Strozzi-Pazzi chain is still drawn in black.
"..." menu, then Path between.

## Step 16 -- Peruzzi's "..." menu

`node tool/real.mjs --step $S --click-at 1419,74` (button "Node actions") -> 16.png

Nadia: Same menu. Path between.

## Step 17 -- Path between, from Peruzzi

`node tool/real.mjs --step $S --click "Path between..."` -> 17.png

Nadia: From Peruzzi already filled. Type Ginori in To.

## Step 18 -- type Ginori

`node tool/real.mjs --step $S --click "Where the path ends" --type "Ginori"` -> 18.png

Nadia: Ginori offered. Pick it, then Find path.

## Step 19 -- pick Ginori and Find path

`node tool/real.mjs --step $S --click-at 555,733 --click "Find path"` (option "Ginori") -> 19.png

Nadia: New chain in black: "Nodes in order" Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4,
Ginori 5; 5 nodes, 4 edges; From Peruzzi, To Ginori, Weight None. One thing I notice: the left
list still has just one "Shortest path" row, and the Strozzi-to-Pazzi chain is gone from the
drawing and from the panel. This one replaced it. I'd have wanted to keep both for the file, or
at least be told the first one was being replaced.

**Answer to the follow-up:** Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori. It passes
through Bischeri, Guadagni and Albizzi.

## End

`node tool/real.mjs --end $S`

## In character, at the end

- **Did I finish?** Yes, both. Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi, and Peruzzi ->
  Bischeri -> Guadagni -> Albizzi -> Ginori.
- **Ease: 5 of 7.** Once I found "Path between..." it was quick and exactly what I've been doing
  by hand -- a numbered list in order, plus what it was made with. Writing that into a case file
  is easy. It loses points for how long it took to find.
- **What confused me:**
    - I went to my usual place first, the list of connections, and found "Hops 1 2 3". I tried 2
      and 3 hoping Pazzi would appear; it never did, because it stops at 3, and even if it had, the
      list mixes every ring together alphabetically, so it can't give me an order. Nothing on that
      screen pointed me at the chain tool.
    - The "..." on the connections view only had "Frame selection"; the one that has "Path
      between..." is on the family's own page. I only found it because I went back and tried the
      other "...". Two menus that look the same but hold different things.
    - When I worked out the second chain, the first one disappeared without a word. In my job I
      need both chains on file; I'd have exported the first before running the second if I had
      known.
    - "Hops" -- one hop from what? Here it was clear enough (from Strozzi), but the word still isn't
      mine. The path result also says "4 hops" on the left and "5 nodes, 4 edges" on the right; I'd
      say "4 marriages, 3 families in between".
