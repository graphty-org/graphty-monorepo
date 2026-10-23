# Session r1-s50 -- Nadia, task T23 (Florentine families)

Build: 946256efb876 (frozen copy `.study-builds/tier2-r1d4-946256efb/`). Setup: `florentine-ranked.txt`.

Task as given: the Medici want to know which families are at most two marriages away from them (a
family they married into, or one that married into one of those). How many, not counting the
Medici? Then change the drawing so it has only the Medici and those families.

## Steps

**Start.** `REAL_DIST=... with-browser.sh node real.mjs --start rounds/round-1/sessions/r1-s50 setup:florentine-ranked.txt` -> 01.png

01: The families network is open, already ranked (PageRank, sized and colored). No names on the
balls at all. Like an alert: type the name into the find box first. Next: click the find box, type
"Medici".

**Step 1.** `--step --click "Find nodes, edges, values" --type "Medici"` -> 02.png

02: Found it. One node, Medici, and six marriages listed: Acciaiuoli, Barbadori, Ridolfi,
Tornabuoni, Albizzi, Salviati. That is the first ring, six families. Now I need who THEY married.
I will open Medici itself, like I open an account, and see its list of connections.

**Step 2.** `--step --click "Medici"` (tool: ambiguous, took the first, the node) -> 03.png

03: Medici is picked, glowing yellow, biggest ball. Right side shows Degree 6 with an arrow -- that
is where the list of connections was last time. Clicking it.

**Step 3.** `--step --click "Degree"` -> 04.png

04: "Medici's 6 connections", same six names as the find box. This part is new: "Hops 1 2 3" and a
"Filter to neighbors" button. Hops -- one hop from what? I guess from Medici, and 1 is the six
direct marriages (they glow yellow, Selection says 7). Two marriages away should be 2. Clicking 2.

**Step 4.** `--step --click "2"` -> 05.png

05: "Medici's 11 connections within 2 hops", eleven names listed (Acciaiuoli, Albizzi, Barbadori,
Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni). Selection says 12,
so that is Medici plus 11. Three balls stay dark. My answer: 11 families. I counted the list
myself to be sure; it matches. For QA I would have liked it to say which of the 11 are direct and
which come through someone -- the list is just alphabetical. Now "change the drawing so it has
only those": "Filter to neighbors" looks like it. I am not sure if a filter deletes the other
three or only hides them. Trying it.

**Step 5.** `--step --click "Filter to neighbors"` -> 06.png

06: The three dark balls are gone; twelve are left, all yellow. The top bar now says "12 of 15
nodes" next to a funnel, so it looks like the other three are only hidden, not deleted -- good,
that was my worry. The button turned blue, so it is on. Small thing: the PageRank row on the left
changed its icon to a little clock-arrow and I do not know why. I will hover the "12 of 15 nodes"
to make sure it is only the view.

**Step 6.** `--step --hover "12 of 15 nodes"` -> 07.png. Tooltip: "Showing only: "within 2 hops of
Medici". Click to open Filters, where you can turn it off."

07: That settles it -- it is a view, and I can turn it off. Done.

**End.** `real.mjs --end rounds/round-1/sessions/r1-s50`

## Debrief (in character)

- **Finished:** yes. 11 families, not counting the Medici (Acciaiuoli, Albizzi, Barbadori,
  Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni). The drawing shows
  only those 12, and the top bar says "12 of 15 nodes".
- **Ease:** 6 of 7. Six steps, maybe two minutes. Faster than reading lists one after another.
- **What confused me:**
    - "Hops" -- I had to guess it meant marriages away from Medici. "Within 2 hops" in the heading
      helped once I clicked, but the word itself is not mine; I would have said "steps" or "links".
    - "Filter to neighbors" -- I was not sure if it would delete the other three until I saw
      "12 of 15 nodes" and hovered it. The button does not say it can be undone.
    - The list of 11 is alphabetical, with nothing saying who is a direct marriage and who comes
      through someone. For a case file I need to write HOW they are tied, so I would still have to
      switch back to 1 hop and compare by hand.
    - The PageRank row on the left changed its icon after filtering and nothing said why.
    - Finding the list: the connections are behind "Degree 6 >"; I only knew because I had used it
      before.
